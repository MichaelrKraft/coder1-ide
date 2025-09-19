const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import voice services
const STTService = require('./voice/stt-service');
const TTSService = require('./voice/tts-service');
const VoiceCommandProcessor = require('./voice/voice-commands');
const sessionManager = require('./voice/session-manager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Initialize voice services
const sttService = new STTService();
const ttsService = new TTSService();
const voiceProcessor = new VoiceCommandProcessor();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Define routes BEFORE static middleware to ensure they take precedence
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Main route - serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'homepage.html'));
});

// IDE route - serve React IDE
app.get('/ide', (req, res) => {
    res.sendFile(path.join(__dirname, 'ide-react.html'));
});

// Static middleware (after routes)
app.use(express.static(path.join(__dirname, 'static')));

// Serve IDE static assets
app.use('/ide/static', express.static(path.join(__dirname, 'static')));

// Voice API endpoints
app.post('/api/voice/stt', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const sessionId = req.body.sessionId || req.headers['x-session-id'];
        const options = {
            language: req.body.language || 'en'
        };

        // Transcribe audio
        const result = await sttService.transcribeAudio(req.file.buffer, options);
        
        if (result.success) {
            // Process wake word detection
            const wakeWordResult = await sttService.detectWakeWord(result.text);
            
            // Process voice commands if wake word detected or in active session
            let commandResult = null;
            if (wakeWordResult.detected || (sessionId && sessionManager.getSession(sessionId))) {
                commandResult = voiceProcessor.processCommand(
                    wakeWordResult.command || result.text,
                    sessionManager.getSession(sessionId)?.context
                );
            }

            // Update session if exists
            if (sessionId) {
                sessionManager.addToHistory(sessionId, {
                    type: 'user_speech',
                    content: result.text,
                    metadata: { wakeWord: wakeWordResult, command: commandResult }
                });
                sessionManager.updateStats(sessionId, { messagesProcessed: 1 });
            }

            res.json({
                ...result,
                wakeWord: wakeWordResult,
                command: commandResult,
                sessionId
            });
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('STT Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/voice/tts', async (req, res) => {
    try {
        const { text, voice, speed } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        const sessionId = req.body.sessionId || req.headers['x-session-id'];
        const options = { voice, speed };

        const result = await ttsService.generateSpeech(text, options);
        
        if (result.success) {
            // Update session if exists
            if (sessionId) {
                sessionManager.addToHistory(sessionId, {
                    type: 'ai_response',
                    content: text,
                    metadata: { voice, duration: result.duration, demo: result.demo }
                });
                sessionManager.updateStats(sessionId, { audioGenerated: 1 });
            }

            if (result.demo) {
                // Return JSON response for demo mode so frontend can use browser TTS
                res.json({
                    success: true,
                    demo: true,
                    text: result.text,
                    voice: result.voice,
                    duration: result.duration,
                    message: result.message || 'Demo mode: Use browser speech synthesis'
                });
            } else {
                // Set appropriate headers for real audio
                res.set({
                    'Content-Type': result.format === 'wav' ? 'audio/wav' : 'audio/mpeg',
                    'Content-Length': result.audio.length,
                    'X-Audio-Duration': result.duration,
                    'X-Voice-Used': result.voice
                });
                
                res.send(result.audio);
            }
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/voice/session', (req, res) => {
    try {
        const { userId } = req.body;
        const session = sessionManager.createSession(userId);
        
        res.json({
            sessionId: session.id,
            created: session.startTime,
            preferences: session.context.preferences
        });
    } catch (error) {
        console.error('Session Creation Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/voice/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = sessionManager.getSession(sessionId);
        
        if (session) {
            res.json({
                sessionId: session.id,
                context: session.context,
                stats: session.stats,
                lastActivity: session.lastActivity
            });
        } else {
            res.status(404).json({ error: 'Session not found' });
        }
    } catch (error) {
        console.error('Session Retrieval Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/voice/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const deleted = sessionManager.deleteSession(sessionId);
        
        res.json({ deleted, sessionId });
    } catch (error) {
        console.error('Session Deletion Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/voice/commands', (req, res) => {
    try {
        const commands = voiceProcessor.getAllCommands();
        res.json({ commands });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/voice/stats', (req, res) => {
    try {
        const stats = sessionManager.getSessionStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Socket.IO for real-time voice communication
io.on('connection', (socket) => {
    console.log('Voice client connected:', socket.id);
    
    socket.on('voice:join_session', (data) => {
        const { sessionId } = data;
        socket.join(`voice:${sessionId}`);
        socket.sessionId = sessionId;
        
        const session = sessionManager.getSession(sessionId);
        if (session) {
            socket.emit('voice:session_joined', { session: session.context });
        }
    });
    
    socket.on('voice:audio_chunk', async (data) => {
        // Handle real-time audio streaming if needed
        // This could be used for continuous listening
        console.log('Received audio chunk:', data.length);
    });
    
    socket.on('voice:command_executed', (data) => {
        if (socket.sessionId) {
            sessionManager.addToHistory(socket.sessionId, {
                type: 'command',
                content: data.command,
                metadata: data.result
            });
            sessionManager.updateStats(socket.sessionId, { commandsExecuted: 1 });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Voice client disconnected:', socket.id);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Autonomous Vibe Interface running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🎤 Voice API: http://localhost:${PORT}/api/voice/*`);
    console.log(`🔊 Socket.IO: Voice real-time communication enabled`);
});

module.exports = app;