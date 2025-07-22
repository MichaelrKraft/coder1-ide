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

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

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

// Default route is handled by static files in public directory
// app.get('/', ...) removed - will serve public/index.html automatically

// IDE route
app.get('/ide', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/ide.html'));
});

// Start server
const PORT = process.env.PORT || 10000; // Render uses port 10000
const HOST = '0.0.0.0'; // Important for Render

server.listen(PORT, HOST, () => {
    console.log(`🚀 Autonomous Vibe Interface running on port ${PORT}`);
    console.log(`📊 Health check: /health`);
    console.log(`🎤 Voice API: /api/voice/*`);
    console.log(`🔊 Socket.IO: Voice real-time communication enabled`);
    console.log(`🛡️ Rate limiting enabled to prevent excessive API calls`);
    
    if (process.env.RENDER) {
        console.log(`🌐 Running on Render at https://${process.env.RENDER_EXTERNAL_HOSTNAME}`);
    }
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