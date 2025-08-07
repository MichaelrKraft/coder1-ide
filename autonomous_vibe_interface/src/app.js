require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
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

// Session management for friend access control
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production-' + Date.now(),
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: false // Set to true in production with HTTPS
    }
}));

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

// BYOK Friend Access System
const BYPASS_FRIEND_AUTH = process.env.BYPASS_FRIEND_AUTH === 'true';
const VALID_INVITE_CODES = {
    'FRIEND2024': 'Friend',
    'FAMILY': 'Family Member', 
    'BETA2024': 'Beta Tester',
    'CLAUDE2024': 'Claude Code User'
};

// Magic invite routes
app.get('/invite/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    if (VALID_INVITE_CODES[code]) {
        req.session.pendingInvite = {
            code,
            userType: VALID_INVITE_CODES[code],
            timestamp: Date.now()
        };
        res.redirect('/beta-access');
    } else {
        res.redirect('/beta-access?error=invalid');
    }
});

// Beta access API endpoint  
app.post('/api/beta-access', (req, res) => {
    const { code, name, apiKey } = req.body;
    const upperCode = code ? code.toUpperCase() : null;
    
    if (!VALID_INVITE_CODES[upperCode]) {
        return res.status(401).json({
            success: false,
            error: 'Invalid invite code. Contact Michael for beta access!'
        });
    }
    
    // Determine access type
    const accessType = apiKey && apiKey.trim() ? 'byok' : 'demo';
    
    // Create session
    req.session.hasAccess = true;
    req.session.userName = name || VALID_INVITE_CODES[upperCode];
    req.session.userType = VALID_INVITE_CODES[upperCode];
    req.session.accessType = accessType;
    req.session.joinedAt = Date.now();
    req.session.lastActivity = Date.now();
    
    if (accessType === 'byok') {
        req.session.anthropicKey = apiKey.trim();
        req.session.credits = 'unlimited';
    } else {
        req.session.credits = 50;
        req.session.creditsUsed = 0;
    }
    
    req.session.usageHistory = [];
    
    res.json({ 
        success: true, 
        message: `Welcome ${req.session.userName}!`,
        accessType,
        credits: req.session.credits
    });
});

// Friend access authentication gate
app.use((req, res, next) => {
    // Bypass auth during development/testing or for public paths
    const publicPaths = ['/', '/health', '/beta-access', '/api/beta-access', '/invite', '/api/market-insights', '/api/intelligence', '/api/analytics', '/ide'];
    const isPublicPath = publicPaths.some(path => req.path.startsWith(path)) || 
                        req.path.startsWith('/static/') || 
                        req.path.startsWith('/ide/static/') ||
                        req.path.includes('favicon.ico') ||
                        req.path.includes('.css') ||
                        req.path.includes('.js') ||
                        req.path.includes('.png') ||
                        req.path.includes('.svg');
    
    if (BYPASS_FRIEND_AUTH || isPublicPath) {
        return next();
    }
    
    // Check for friend access
    if (req.session.hasAccess) {
        // Update last activity
        req.session.lastActivity = Date.now();
        return next();
    }
    
    // Redirect to beta access page
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        res.status(401).json({
            error: 'Access required',
            redirectTo: '/beta-access'
        });
    } else {
        res.redirect('/beta-access');
    }
});

// Apply general rate limiting to all routes AFTER health check and auth
app.use(rateLimit);

// ⚠️ FIXED: Now serving from /CANONICAL/ which contains working implementations
// Previous issue: served from /public/ which had broken wireframes/personas
// See CLAUDE.md for full details
// Serve static files from CANONICAL directory (working versions)
app.use(express.static(path.join(__dirname, '../CANONICAL')));

// Serve static files from public/static directory for AI navigation and other scripts
app.use('/static', express.static(path.join(__dirname, '../public/static')));

// API routes with specific rate limiting
app.use('/api/anthropic', anthropicRateLimit, require('./routes/anthropic'));
app.use('/api/openai', openaiRateLimit, require('./routes/openai'));
app.use('/api/agent', require('./routes/agent-simple'));
app.use('/api/voice', require('./routes/voice'));
app.use('/api/infinite', require('./routes/infinite'));
app.use('/api/hivemind', require('./routes/hivemind'));
app.use('/api/files', require('./routes/files'));
app.use('/api/terminal', terminalRouter);
app.use('/api/claude', require('./routes/claude-buttons'));
app.use('/api/commands', require('./routes/natural-commands'));
app.use('/api/personas', require('./routes/personas'));
app.use('/api/prd', require('./routes/prd'));
app.use('/api/wireframes', require('./routes/wireframes'));
app.use('/api/market-insights', require('./routes/market-insights'));
app.use('/api/intelligence', require('./routes/intelligence'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api', require('./routes/prettier-config'));
// Remove duplicate terminal-rest route - using terminal-rest-api.js instead
// app.use('/api/terminal-rest', require('./routes/terminal-rest'));

// Socket.IO connection handling with cleanup
// NOTE: Moved to terminal-websocket-safepty.js to fix duplicate handler issue
// The global io.on('connection') was preventing terminal events from being handled
// All Socket.IO connections are now managed in setupTerminalWebSocket
const connectedClients = new Map();

// IMPORTANT: This handler has been disabled to fix WebSocket connection issues
// Voice and terminal events are now handled in terminal-websocket-safepty.js
/*
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
*/

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

// AI Monitor route - serve the AI monitor page
app.get('/ai-monitor', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/ai-monitor.html'));
});

// Natural Commands route - serve the natural commands page
app.get('/natural-commands', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/natural-commands.html'));
});

// Beta Access route - serve the friend access page
app.get('/beta-access', (req, res) => {
    res.sendFile(path.join(__dirname, '../CANONICAL/beta-access.html'));
});

// IDE route - serve from coder1-ide directory
app.get(['/ide', '/ide/'], (req, res) => {
    if (process.env.VERCEL) {
        // On Vercel, serve the rewritten HTML directly with correct file names
        const cacheBuster = Date.now() + Math.random().toString(36);
        const htmlContent = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><link rel="icon" href="/ide/favicon.ico"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#000000"/><meta name="description" content="Coder1 IDE - AI-Powered Development Environment with Enhanced Live Preview"/><link rel="apple-touch-icon" href="/ide/logo192.png"/><link rel="manifest" href="/ide/manifest.json"/><title>Coder1 IDE v2 - Live Preview</title><script defer="defer" src="/ide/static/js/main.c9ecf8b9.js?cb=${cacheBuster}"></script><link href="/ide/static/css/main.e43e0e88.css?cb=${cacheBuster}" rel="stylesheet"></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div><script src="/static/ai-navigation.js"></script></body></html>`;
        
        // Set aggressive no-cache headers
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Last-Modified': new Date().toUTCString(),
            'ETag': 'W/"tooltip-fix-' + cacheBuster + '"'
        });
        
        res.send(htmlContent);
    } else {
        // Local development - serve with path rewriting and aggressive cache busting
        const fs = require('fs');
        const indexPath = path.join(__dirname, '../coder1-ide/ide-build/index.html');
        let html = fs.readFileSync(indexPath, 'utf8');
        
        // Add cache-busting timestamp to all assets
        const timestamp = Date.now();
        html = html.replace(/href="\/static\/css\/([^"]+)"/g, `href="/ide/static/css/$1?v=${timestamp}"`);
        html = html.replace(/src="\/static\/js\/([^"]+)"/g, `src="/ide/static/js/$1?v=${timestamp}"`);
        
        // Rewrite remaining absolute paths to work under /ide (but not already processed ones)
        html = html.replace(/href="\/(?!ide\/)/g, 'href="/ide/');
        html = html.replace(/src="\/(?!ide\/)/g, 'src="/ide/');
        
        // Inject AI navigation script
        html = html.replace('</body>', '<script src="/static/ai-navigation.js"></script></body>');
        
        // Add no-cache headers for development
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        res.send(html);
    }
});

// Serve IDE static files from multiple locations (order matters - more specific first)
app.use('/ide', express.static(path.join(__dirname, '../public/ide')));
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