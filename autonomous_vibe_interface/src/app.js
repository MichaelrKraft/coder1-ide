require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const { rateLimit, anthropicRateLimit, openaiRateLimit, socketConnectionLimit } = require('./middleware/rate-limiter');
const { router: terminalRouter, setupTerminalSocket } = require('./routes/terminal-safe');

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

// Health check endpoint - BEFORE rate limiting so frontend can check backend status
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Rate limit reset endpoint for development
app.post('/admin/clear-rate-limit', (req, res) => {
    const { clearRateLimit } = require('./middleware/rate-limiter');
    clearRateLimit(); // Clear all rate limits
    res.json({ message: 'Rate limits cleared' });
});

// Apply general rate limiting to all routes AFTER health check
app.use(rateLimit);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API routes with specific rate limiting
app.use('/api/anthropic', anthropicRateLimit, require('./routes/anthropic'));
app.use('/api/openai', openaiRateLimit, require('./routes/openai'));
app.use('/api/agent', require('./routes/agent-simple'));
app.use('/api/voice', require('./routes/voice'));
app.use('/api/infinite', require('./routes/infinite'));
app.use('/api/hivemind', require('./routes/hivemind'));
app.use('/api/files', require('./routes/files'));
app.use('/api/terminal', terminalRouter);
// Remove duplicate terminal-rest route - using terminal-rest-api.js instead
// app.use('/api/terminal-rest', require('./routes/terminal-rest'));

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

// IDE route - serve from coder1-ide directory
app.get(['/ide', '/ide/'], (req, res) => {
    if (process.env.VERCEL) {
        // On Vercel, serve the rewritten HTML directly
        const htmlContent = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><link rel="icon" href="/ide/favicon.ico"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#000000"/><meta name="description" content="Web site created using create-react-app"/><link rel="apple-touch-icon" href="/ide/logo192.png"/><link rel="manifest" href="/ide/manifest.json"/><title>React App</title><script defer="defer" src="/ide/static/js/main.0c23d652.js"></script><link href="/ide/static/css/main.39b2d4d2.css" rel="stylesheet"></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div></body></html>`;
        res.send(htmlContent);
    } else {
        // Local development - serve with path rewriting
        const fs = require('fs');
        const indexPath = path.join(__dirname, '../coder1-ide/ide-build/index.html');
        let html = fs.readFileSync(indexPath, 'utf8');
        
        // Rewrite absolute paths to work under /ide
        html = html.replace(/href="\//g, 'href="/ide/');
        html = html.replace(/src="\//g, 'src="/ide/');
        
        res.send(html);
    }
});

// Serve IDE static files from the ide-build directory
app.use('/ide', express.static(path.join(__dirname, '../coder1-ide/ide-build')));

// Setup SafePTYManager WebSocket handler for terminal connections
// NOTE: Disabled old terminal handler to prevent conflicts
// setupTerminalSocket(io);
const { setupTerminalWebSocket } = require('./routes/terminal-websocket-safepty');
setupTerminalWebSocket(io);

// Add REST API for terminal session creation
const { router: terminalRestRouter } = require('./routes/terminal-rest-api');
app.use('/api/terminal-rest', terminalRestRouter);

// Start server
const PORT = process.env.PORT || 3000; // Main server runs on port 3000
const HOST = '0.0.0.0'; // Important for Render

server.listen(PORT, HOST, () => {
    console.log(`🚀 Autonomous Vibe Interface running on port ${PORT}`);
    console.log(`📊 Health check: /health`);
    console.log(`🎤 Voice API: /api/voice/*`);
    console.log(`🖥️ Terminal API: /api/terminal/*`);
    console.log(`🔊 Socket.IO: Voice & Terminal real-time communication enabled`);
    console.log(`🛡️ Rate limiting enabled to prevent excessive API calls`);
    console.log(`💡 Terminal WebSocket: ws://127.0.0.1:${PORT}/terminal`);
    
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