require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const { rateLimit, anthropicRateLimit, openaiRateLimit, socketConnectionLimit } = require('./middleware/rate-limiter');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Apply rate limiting to Socket.IO connections
io.use(socketConnectionLimit);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiting to all routes
app.use(rateLimit);

// Serve static files from CANONICAL directory
app.use(express.static(path.join(__dirname, '../CANONICAL')));
app.use(express.static(path.join(__dirname, '../CANONICAL/ide-build')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API routes with specific rate limiting
app.use('/api/anthropic', anthropicRateLimit, require('./routes/anthropic'));
app.use('/api/openai', openaiRateLimit, require('./routes/openai'));
app.use('/api/agent', require('./routes/agent-simple'));
app.use('/api/voice', require('./routes/voice'));

// Socket.IO connection handling with cleanup
const connectedClients = new Map();

io.on('connection', (socket) => {
    console.log(`Voice client connected: ${socket.id}`);
    connectedClients.set(socket.id, { 
        connectedAt: Date.now(),
        sessionId: null 
    });
    
    // Clean up old sessions periodically
    if (connectedClients.size > 100) {
        const now = Date.now();
        for (const [id, client] of connectedClients.entries()) {
            if (now - client.connectedAt > 3600000) { // 1 hour
                connectedClients.delete(id);
            }
        }
    }
    
    socket.on('voice:join_session', (data) => {
        if (data.sessionId) {
            socket.join(`session:${data.sessionId}`);
            const client = connectedClients.get(socket.id);
            if (client) {
                client.sessionId = data.sessionId;
            }
            socket.emit('voice:session_joined', { sessionId: data.sessionId });
        }
    });
    
    socket.on('disconnect', () => {
        console.log(`Voice client disconnected: ${socket.id}`);
        connectedClients.delete(socket.id);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Default route - serve homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../CANONICAL/homepage.html'));
});

// IDE route
app.get('/ide', (req, res) => {
    res.sendFile(path.join(__dirname, '../CANONICAL/ide-react.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Autonomous Vibe Interface running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🎤 Voice API: http://localhost:${PORT}/api/voice/*`);
    console.log(`🔊 Socket.IO: Voice real-time communication enabled`);
    console.log(`🛡️ Rate limiting enabled to prevent excessive API calls`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };