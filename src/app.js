const memoize = (fn) => { const cache = {}; return (...args) => { const key = JSON.stringify(args); return cache[key] || (cache[key] = fn(...args)); }; };
const debounce = (func, delay) => { let timeoutId; return (...args) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => func(...args), delay); }; };
const performanceMonitor = { start: (label) => console.time(label), end: (label) => console.timeEnd(label) };

// Memory monitoring
const memoryMonitor = {
    lastCheck: Date.now(),
    threshold: 500 * 1024 * 1024, // 500MB threshold
    checkInterval: 30000, // Check every 30 seconds
    
    check: function() {
        const usage = process.memoryUsage();
        const heapUsed = usage.heapUsed / 1024 / 1024;
        const heapTotal = usage.heapTotal / 1024 / 1024;
        const rss = usage.rss / 1024 / 1024;
        
        console.log(`💾 Memory: RSS ${rss.toFixed(2)}MB, Heap ${heapUsed.toFixed(2)}/${heapTotal.toFixed(2)}MB`);
        
        if (usage.heapUsed > this.threshold) {
            console.warn(`⚠️ High memory usage detected: ${heapUsed.toFixed(2)}MB`);
            // Force garbage collection if available
            if (global.gc) {
                console.log('🧹 Running garbage collection...');
                global.gc();
            }
        }
        
        return usage;
    },
    
    startMonitoring: function() {
        setInterval(() => this.check(), this.checkInterval);
        console.log('📊 Memory monitoring started');
    }
};

// Load environment variables - .env.local takes priority over .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const { rateLimit, anthropicRateLimit, openaiRateLimit, socketConnectionLimit } = require('./middleware/rate-limiter');
const { router: terminalRouter, setupTerminalSocket } = require('./routes/terminal-safe');
const LicenseManager = require('./licensing/license-manager');

// 🚨 CRITICAL PORT VALIDATION SYSTEM - PREVENTS TERMINAL SESSION LOSS
// This validation prevents the recurring issue where PORT=3001 npm run dev 
// is run from the main directory, causing Express backend to conflict with Next.js
console.log('🔍 Validating port configuration...');

const EXPECTED_EXPRESS_PORT = 3000;
const EXPECTED_NEXTJS_PORT = 3001;
const PORT_ENV = process.env.PORT;

// Check if someone is trying to run Express backend on port 3001 (Next.js port)
if (PORT_ENV === '3001' || PORT_ENV === 3001) {
    console.error('❌ CRITICAL ERROR: Express backend cannot run on port 3001!');
    console.error('');
    console.error('🚨 ROOT CAUSE: This is the #1 cause of terminal session loss');
    console.error('');
    console.error('✅ CORRECT STARTUP:');
    console.error('   1. Express Backend (Main Directory): PORT=3000 npm run dev');
    console.error('   2. Next.js Frontend: cd coder1-ide-next && npm run dev (uses port 3001)');
    console.error('');
    console.error('❌ WRONG (What you just tried):');
    console.error('   - PORT=3001 npm run dev  ← This breaks everything!');
    console.error('');
    console.error('🔧 TO FIX: Run this command instead:');
    console.error('   PORT=3000 npm run dev');
    console.error('');
    console.error('📚 Port Assignment:');
    console.error('   - Express Backend: 3000 (APIs, WebSocket, Terminal)');
    console.error('   - Next.js Frontend: 3001 (IDE Interface)');
    console.error('');
    process.exit(1);
}

// Warn if no PORT is set, but allow default fallback
if (!PORT_ENV) {
    console.log('⚠️  No PORT environment variable set');
    console.log(`🔧 Using default Express backend port: ${EXPECTED_EXPRESS_PORT}`);
}

// Log the correct configuration
const finalPort = PORT_ENV || EXPECTED_EXPRESS_PORT;
console.log(`✅ Port validation passed: Express backend will run on port ${finalPort}`);

// Additional validation for common mistakes
if (finalPort == EXPECTED_NEXTJS_PORT) {
    console.error('❌ CRITICAL ERROR: Port conflict detected!');
    console.error(`Express backend cannot run on port ${EXPECTED_NEXTJS_PORT} (Next.js port)`);
    process.exit(1);
}

const app = express();
const server = http.createServer(app);

// Track connections for graceful shutdown
server.on('connection', (connection) => {
    activeResources.connections.add(connection);
    connection.on('close', () => {
        activeResources.connections.delete(connection);
    });
});

const licenseManager = new LicenseManager();
const io = socketIO(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', '*'],
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    transports: ['websocket', 'polling']
});

// Apply rate limiting to Socket.IO connections
io.use(socketConnectionLimit);

// CORS configuration to allow Next.js IDE (localhost:3001) to access Express backend (localhost:3002)
app.use(cors({
    origin: [
        'http://localhost:3001',  // Next.js IDE (actual port)
        'http://localhost:3002',  // Express backend (same-origin)  
        'http://localhost:3000',  // Alternative port
        'http://127.0.0.1:3001',  // Alternative localhost format
        'http://127.0.0.1:3002',  // Alternative localhost format
        'http://127.0.0.1:3000'   // Alternative localhost format
    ],
    credentials: true,  // Allow cookies/auth if needed
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-user-id']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session management with file store to prevent memory leaks
const FileStore = require('session-file-store')(session);
app.use(session({
    store: new FileStore({
        path: './sessions',
        ttl: 86400, // 24 hours
        retries: 2,
        logFn: function() {} // Suppress verbose logging
    }),
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

// Waitlist API endpoint for landing page
app.post('/api/waitlist', (req, res) => {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
        return res.status(400).json({
            success: false,
            error: 'Valid email address is required'
        });
    }
    
    // In a real application, you would save this to a database
    // For now, we'll just log it and return success
    console.log(`📧 Waitlist signup: ${email} at ${new Date().toISOString()}`);
    
    // You could integrate with services like:
    // - Airtable
    // - ConvertKit
    // - Mailchimp
    // - Your database
    
    res.json({
        success: true,
        message: 'Successfully joined the waitlist! We\'ll be in touch soon.',
        email
    });
});

// Friend access authentication gate (skip in Docker mode)
app.use((req, res, next) => {
    // In Docker mode, skip friend auth and use license system instead
    if (BYPASS_FRIEND_AUTH) {
        return next();
    }
    
    // Bypass auth during development/testing or for public paths
    const publicPaths = ['/', '/health', '/beta-access', '/api/beta-access', '/api/waitlist', '/invite', '/api/market-insights', '/api/intelligence', '/api/analytics', '/ide', '/hooks', '/welcome', '/api/license', '/tmux-lab', '/api/experimental', '/vibe-dashboard', '/workflow-dashboard', '/agent-dashboard'];
    const isPublicPath = publicPaths.some(path => req.path.startsWith(path)) || 
                        req.path.startsWith('/static/') || 
                        req.path.startsWith('/ide/static/') ||
                        req.path.includes('favicon.ico') ||
                        req.path.includes('.css') ||
                        req.path.includes('.js') ||
                        req.path.includes('.png') ||
                        req.path.includes('.svg');
    
    if (isPublicPath) {
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

// License authentication for Docker/commercial version
if (BYPASS_FRIEND_AUTH) {
    app.use(licenseManager.middleware());
}

// Apply general rate limiting to all routes AFTER health check and auth
app.use(rateLimit);

// Add CSP middleware to allow scripts for IDE and development
app.use((req, res, next) => {
    if (req.path.startsWith('/ide') || req.path.startsWith('/test') || req.path.startsWith('/component-studio')) {
        res.setHeader('Content-Security-Policy', 
            'default-src \'self\'; ' +
      'script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https://unpkg.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net blob:; ' +
      'worker-src \'self\' blob:; ' +
      'style-src \'self\' \'unsafe-inline\' https://unpkg.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://fonts.googleapis.com; ' +
      'font-src \'self\' data: https://fonts.gstatic.com https://fonts.googleapis.com https://unpkg.com; ' +
      'img-src \'self\' data: https:; ' +
      'connect-src \'self\' ws: wss: http: https: localhost:3000; ' +
      'frame-src \'self\' data:;'
        );
    }
    next();
});

// ✅ Serving from /CANONICAL/ - contains the correct, updated PRD generator
// Note: /public/ was temporarily used but had wrong PRD generator version with misplaced supervision
// CANONICAL has the working wireframes/personas and correct PRD generator
// Serve static files from CANONICAL directory (correct PRD generator, no supervision elements)
// Add cache-busting headers to prevent browser caching
app.use(express.static(path.join(__dirname, '../CANONICAL'), {
    setHeaders: (res, path) => {
        // Add aggressive no-cache headers for HTML files
        if (path.endsWith('.html')) {
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Last-Modified': new Date().toUTCString(),
                'ETag': 'W/"no-cache-' + Date.now() + '"'
            });
        }
        // Cache static assets but with shorter expiry
        else if (path.endsWith('.css') || path.endsWith('.js')) {
            res.set({
                'Cache-Control': 'public, max-age=300', // 5 minutes
                'Last-Modified': new Date().toUTCString()
            });
        }
    }
}));

// Serve static files from public/static directory for AI navigation and other scripts
app.use('/static', express.static(path.join(__dirname, '../public/static')));

// Serve static files for Component Studio with cache control
app.use('/studio-assets', express.static(path.join(__dirname, '../public/studio-assets'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Last-Modified': new Date().toUTCString()
            });
        }
    }
}));

// Serve CANONICAL directory files (including correct logos and working files)
app.use('/public', express.static(path.join(__dirname, '../public')));

// Serve CSS and JS files directly from public directory for dashboard assets
app.use('/css', express.static(path.join(__dirname, '../public/css')));
app.use('/js', express.static(path.join(__dirname, '../public/js')));

// Welcome page route (for licensing flow)
app.get('/welcome', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/welcome.html'));
});

// Licensing API Routes (public, for Docker version)
app.use('/api/license', require('./routes/licensing'));

// API routes with specific rate limiting
app.use('/api/anthropic', anthropicRateLimit, require('./routes/anthropic'));
app.use('/api/openai', openaiRateLimit, require('./routes/openai'));
app.use('/api/agent', require('./routes/agent-simple'));  // Re-enabled with memory optimizations
app.use('/api/voice', require('./routes/voice'));
app.use('/api/infinite', require('./routes/infinite'));
app.use('/api/hivemind', require('./routes/hivemind'));
app.use('/api/task-delegation', require('./routes/task-delegation'));
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
app.use('/api/vibe-flow', require('./routes/vibe-flow'));  // Vibe Flow analytics and budget tracking
app.use('/api/magic', require('./routes/magic'));  // AI Magic component generation
app.use('/api/component-ai', require('./routes/component-ai'));  // Component Studio AI Integration
app.use('/api/error-doctor', require('./routes/error-doctor'));  // AI Error Doctor - ENABLED
app.use('/api/claude/coaching', require('./routes/vibe-coach'));  // VibeCoach AI Dashboard
app.use('/api/hooks', require('./routes/hooks'));  // Claude Code Hooks Management
app.use('/api/vibe-hooks', require('./routes/vibe-hooks'));  // Vibe Hooks Pattern-based Automation
app.use('/api/github', require('./routes/github-push'));  // Educational GitHub Push
app.use('/api/github/cli', require('./routes/github-cli'));  // GitHub CLI integration (PRs, issues, workflows)
app.use('/api/project-pipeline', require('./routes/project-pipeline'));  // Project Pipeline Management
app.use('/api/checkpoints', require('./routes/checkpoints').router);  // Checkpoint Management System
app.use('/api/dashboard', require('./routes/dashboard').router);  // Dashboard Metrics API
app.use('/api/ai-coach', require('./routes/ai-coach').router);  // AI Coach Integration
app.use('/api/repository', require('./routes/repository-intelligence'));  // Repository Intelligence for IDE
app.use('/api/repository-admin', require('./routes/repository-admin'));  // Repository Admin endpoints
app.use('/api/sessions', require('./routes/sessions'));  // Session and Checkpoint Management
app.use('/api/ai-team', require('./routes/ai-team'));  // AI Team Management
app.use('/api/containers', require('./routes/containers'));  // Container Management (Docker/tmux)
app.use('/api/sandbox', require('./routes/sandbox'));  // Sandbox Environment Management
app.use('/api/sharing', require('./routes/session-sharing'));  // Session Sharing System - Slash Commands

// Terminal session status API for debugging timeout issues
app.get('/api/terminal/sessions/status', (req, res) => {
    try {
        const sessions = global.safePTYManager ? global.safePTYManager.sessions : new Map();
        const now = Date.now();
        const sessionData = [];
        
        for (const [sessionId, session] of sessions) {
            const inactiveTime = now - (session.lastActivity || session.createdAt);
            sessionData.push({
                id: sessionId,
                createdAt: new Date(session.createdAt).toISOString(),
                lastActivity: session.lastActivity ? new Date(session.lastActivity).toISOString() : 'Never',
                inactiveMinutes: Math.round(inactiveTime / 60000),
                inactiveHours: Math.round(inactiveTime / 3600000 * 10) / 10,
                claudeDetected: session.claudeDetected || false,
                processAlive: session.process && !session.process.killed,
                socketConnected: session.socketId ? true : false
            });
        }
        
        const config = {
            sessionTimeout: process.env.TERMINAL_SESSION_TIMEOUT || 28800000,
            cleanupInterval: process.env.TERMINAL_CLEANUP_INTERVAL || 1800000,
            infiniteMode: process.env.TERMINAL_INFINITE_MODE === 'true',
            cleanupLogging: process.env.TERMINAL_CLEANUP_LOGGING !== 'false'
        };
        
        res.json({
            totalSessions: sessions.size,
            config: {
                ...config,
                sessionTimeoutHours: config.sessionTimeout / 3600000,
                cleanupIntervalMinutes: config.cleanupInterval / 60000
            },
            sessions: sessionData.sort((a, b) => b.inactiveMinutes - a.inactiveMinutes)
        });
    } catch (error) {
        console.error('Error getting session status:', error);
        res.status(500).json({ error: 'Failed to get session status', details: error.message });
    }
});
app.use('/api/templates', require('./routes/templates'));  // Templates Hub API
app.use('/api/claude-file-activity', require('./routes/claude-file-activity'));  // Claude File Activity Tracking
app.use('/api/docs', require('./routes/documentation'));  // Documentation Intelligence System
app.use('/api/codebase', require('./routes/codebase-search'));  // Codebase Wiki Search System
app.use('/api/claude/session-doc', require('./routes/claude-session-doc'));  // Claude Session Documentation System
app.use('/api/agents-context', require('./routes/agents-context'));  // AGENTS.md Context Integration for Claude Code
// app.use('/api/workflows', require('./routes/workflows'));  // Revolutionary Workflow Automation System - TEMPORARILY DISABLED
app.use('/api/mcp-prompts', require('./routes/mcp-prompts'));  // MCP Ambient Prompt Display System
app.use('/api', require('./routes/prettier-config'));
// Remove duplicate terminal-rest route - using terminal-rest-api.js instead
// app.use('/api/terminal-rest', require('./routes/terminal-rest'));

// Temporary test routes for error handling verification
if (process.env.NODE_ENV === 'development') {
    app.use('/api/test-errors', require('./routes/test-errors'));
}

// EXPERIMENTAL: Tmux Orchestrator Lab (isolated test environment)
app.use('/api/experimental', require('./routes/experimental/orchestrator'));
app.use('/api/agents', require('./routes/agent-dashboard').router);  // Multi-Agent Observability Dashboard
app.use('/api/memory-metrics', require('./routes/memory-metrics'));  // Memory Performance Monitoring

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

// AI Dashboard route - NEW dashboard for AI development (cache-bust fix)
app.get('/ai-dashboard', (req, res) => {
    // Force fresh content by reading and sending directly
    const fs = require('fs');
    const dashboardPath = path.join(__dirname, '../CANONICAL/vibe-dashboard.html');
    
    // Read the file fresh each time
    fs.readFile(dashboardPath, 'utf8', (err, content) => {
        if (err) {
            console.error('Error reading vibe-dashboard.html:', err);
            return res.status(500).send('Dashboard temporarily unavailable');
        }
        
        // Add cache busting and aggressive headers
        res.set({
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '-1',
            'X-Content-Type-Options': 'nosniff',
            'Last-Modified': new Date().toUTCString(),
            'ETag': '"' + Date.now() + '-' + Math.random().toString(36).substr(2, 9) + '"'
        });
        
        // Inject cache-busting meta tag and add timestamp to assets
        const cacheBuster = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const timestamp = Date.now();
        
        // Add cache busters to CSS and JS files
        content = content.replace(/href="\/css\/(.*?)"/g, `href="/css/$1?v=${timestamp}"`);
        content = content.replace(/src="\/js\/(.*?)"/g, `src="/js/$1?v=${timestamp}"`);
        
        content = content.replace('</head>', `<meta name="cache-version" content="${cacheBuster}">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="-1">
</head>`);
        
        res.send(content);
    });
});

// Keep the old route for backwards compatibility, but redirect to new route
app.get('/vibe-dashboard', (req, res) => {
    res.redirect(301, '/ai-dashboard');
});

// Natural Commands route - serve the natural commands page
app.get('/natural-commands', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/natural-commands.html'));
});

// Beta Access route - serve the friend access page
app.get('/beta-access', (req, res) => {
    res.sendFile(path.join(__dirname, '../CANONICAL/beta-access.html'));
});

// Hooks Management route - serve the hooks manager page (v2 with 32 hooks and 3D effects)
app.get(['/hooks', '/hooks.html'], (req, res) => {
    // Serving hooks-v2-backup which has 32 hooks and the proper 3D effect
    const filePath = path.join(__dirname, '../CANONICAL/hooks-v2-backup.html');
    
    // Add aggressive no-cache headers to prevent browser caching
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString(),
        'ETag': '"' + Date.now() + '"'
    });
    res.sendFile(filePath);
});

// Diagnostic route with enhanced logging
app.get('/hooks-diagnostic', (req, res) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Diagnostic': 'true'
    });
    res.sendFile(path.join(__dirname, '../CANONICAL/hooks-diagnostic.html'));
});

// Test route for hooks with timestamp to bypass ALL caching
app.get('/hooks-test', (req, res) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString(),
        'ETag': '"test-' + Date.now() + '"',
        'X-Test-Time': new Date().toISOString()
    });
    res.sendFile(path.join(__dirname, '../CANONICAL/hooks-v3.html'));
});

// Component Studio route - NEW visual component development environment
app.get('/component-studio', (req, res) => {
    // Add aggressive no-cache headers to prevent browser caching of old versions
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString(),
        'ETag': 'W/"no-cache-' + Date.now() + '"'
    });
    res.sendFile(path.join(__dirname, '../CANONICAL/component-studio.html'));
});

// Serve static files for orchestrator site with proper MIME types
app.use('/orchestrator', express.static(path.join(__dirname, '../orchestrator-standalone'), {
    setHeaders: (res, filePath) => {
        // Set proper MIME types based on file extension
        if (filePath.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript; charset=UTF-8');
        } else if (filePath.endsWith('.css')) {
            res.set('Content-Type', 'text/css; charset=UTF-8');
        } else if (filePath.endsWith('.html')) {
            res.set('Content-Type', 'text/html; charset=UTF-8');
        }
    }
}));

// Standalone Orchestrator Site main page - AI Mastermind Expert Consultation
app.get('/orchestrator', (req, res) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString(),
        'ETag': 'W/"orchestrator-' + Date.now() + '"'
    });
    res.sendFile(path.join(__dirname, '../orchestrator-standalone/index.html'));
});

// Templates Hub route - serve with no-cache headers
app.get(['/templates-hub', '/templates-hub.html'], (req, res) => {
    // Add aggressive no-cache headers to prevent browser caching
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString(),
        'ETag': 'W/"no-cache-' + Date.now() + '"'
    });
    res.sendFile(path.join(__dirname, '../CANONICAL/templates-hub.html'));
});

// PRD Generator route - serve with no-cache headers  
app.get(['/prd-generator-v2-test', '/prd-generator-v2-test.html'], (req, res) => {
    // Add aggressive no-cache headers to prevent browser caching
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString(),
        'ETag': 'W/"no-cache-' + Date.now() + '"'
    });
    res.sendFile(path.join(__dirname, '../CANONICAL/prd-generator-v2-test.html'));
});

// Workflow Dashboard route - serve with no-cache headers
app.get(['/workflow-dashboard', '/workflow-dashboard.html'], (req, res) => {
    // Add aggressive no-cache headers to prevent browser caching
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString(),
        'ETag': 'W/"no-cache-' + Date.now() + '"'
    });
    res.sendFile(path.join(__dirname, '../CANONICAL/workflow-dashboard.html'));
});

// Agent Dashboard route - Multi-Agent Observability Dashboard
app.get(['/agent-dashboard', '/agent-dashboard.html'], (req, res) => {
    // Add no-cache headers for real-time dashboard updates
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString(),
        'ETag': 'W/"agent-dashboard-' + Date.now() + '"'
    });
    
    performanceMonitor.start('agent-dashboard-load');
    res.sendFile(path.join(__dirname, '../CANONICAL/agent-dashboard.html'));
    performanceMonitor.end('agent-dashboard-load');
});

// CoderOne Landing Page route - serve with no-cache headers
app.get(['/landing', '/coderone-landing', '/coderone-landing.html'], (req, res) => {
    // Add aggressive no-cache headers to prevent browser caching
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString(),
        'ETag': 'W/"no-cache-' + Date.now() + '"'
    });
    res.sendFile(path.join(__dirname, '../public/coderone-landing.html'));
});

// Features route (formerly documentation) - serve with no-cache headers
app.get('/features', (req, res) => {
    // Add aggressive no-cache headers to prevent browser caching
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString(),
        'ETag': 'W/"3d-fix-v2-' + timestamp + '-' + random + '"',
        'Vary': 'Accept-Encoding',
        'X-Cache-Buster': timestamp + '-' + random
    });
    
    // Read file and inject cache buster directly into content
    const fs = require('fs');
    let content = fs.readFileSync(path.join(__dirname, '../CANONICAL/documentation.html'), 'utf8');
    
    // Inject cache buster into the HTML content itself
    content = content.replace('</head>', `<meta name="cache-buster" content="${timestamp}-${random}">\n</head>`);
    
    res.send(content);
});

// Documentation route - points to features page
app.get('/documentation', (req, res) => {
    // Serve the documentation page
    res.sendFile(path.join(__dirname, '../public/documentation.html'));
});

// Document Management Console route
app.get('/docs-manager', (req, res) => {
    // Create a simple document management interface
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Management Console - Coder1 IDE</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0a;
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: #1a1a1a;
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .header h1 {
            font-size: 24px;
            background: linear-gradient(135deg, #8b5cf6, #06b6d4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .container {
            flex: 1;
            padding: 40px;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
        }
        .section {
            background: #141414;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            border: 1px solid rgba(139, 92, 246, 0.2);
        }
        .section h2 {
            color: #8b5cf6;
            margin-bottom: 20px;
        }
        .button-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .btn {
            background: linear-gradient(135deg, #8b5cf6, #06b6d4);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);
        }
        .doc-list {
            margin-top: 20px;
        }
        .doc-item {
            background: #1a1a1a;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .doc-item:hover {
            background: #202020;
        }
        .status {
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
        }
        .status.active { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .status.cached { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
        #addDocForm {
            display: none;
            margin-top: 20px;
            padding: 20px;
            background: #1a1a1a;
            border-radius: 8px;
        }
        #addDocForm input {
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            background: #0a0a0a;
            border: 1px solid rgba(255,255,255,0.1);
            color: white;
            border-radius: 4px;
        }
        .search-box {
            margin-bottom: 20px;
        }
        .search-box input {
            width: 100%;
            padding: 12px;
            background: #1a1a1a;
            border: 1px solid rgba(139, 92, 246, 0.3);
            color: white;
            border-radius: 8px;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div style="display: flex; align-items: center; justify-content: space-between; position: relative;">
            <button onclick="goBack()" style="
                background: rgba(139, 92, 246, 0.1);
                border: 1px solid rgba(139, 92, 246, 0.3);
                color: #8b5cf6;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
                position: absolute;
                left: 20px;
            " onmouseover="this.style.background='rgba(139, 92, 246, 0.2)'; this.style.transform='translateY(-2px)'" 
               onmouseout="this.style.background='rgba(139, 92, 246, 0.1)'; this.style.transform='translateY(0)'">
                ← Back
            </button>
            <div style="flex: 1; text-align: center;">
                <h1>📚 Document Management Console</h1>
                <p style="color: #a0a0a0; margin-top: 5px;">AI-powered documentation system for enhanced context</p>
            </div>
            <div style="width: 80px;"></div> <!-- Spacer to balance the layout -->
        </div>
    </div>
    
    <div class="container">
        <div class="section">
            <h2>Quick Actions</h2>
            <div class="button-grid">
                <button class="btn" onclick="toggleAddForm()">➕ Add Documentation</button>
                <button class="btn" onclick="searchDocs()">🔍 Search Docs</button>
                <button class="btn" onclick="refreshList()">🔄 Refresh List</button>
                <button class="btn" onclick="checkHealth()">💚 System Health</button>
            </div>
            
            <div id="addDocForm">
                <h3 style="margin-bottom: 15px;">Add Documentation</h3>
                
                <!-- Drag and Drop Area -->
                <div id="dropZone" style="
                    border: 2px dashed #8b5cf6;
                    border-radius: 12px;
                    padding: 40px;
                    text-align: center;
                    background: rgba(139, 92, 246, 0.05);
                    margin-bottom: 20px;
                    transition: all 0.3s ease;
                    cursor: pointer;
                " ondragover="handleDragOver(event)" 
                   ondragleave="handleDragLeave(event)"
                   ondrop="handleDrop(event)"
                   onclick="document.getElementById('fileInput').click()">
                    <div style="pointer-events: none;">
                        <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                        <p style="color: #8b5cf6; font-weight: 600; margin-bottom: 5px;">
                            Drag & Drop files here
                        </p>
                        <p style="color: #666; font-size: 14px;">
                            or click to browse
                        </p>
                        <p style="color: #666; font-size: 12px; margin-top: 10px;">
                            Supported: PDF, MD, TXT, HTML files
                        </p>
                    </div>
                    <input type="file" id="fileInput" style="display: none;" 
                           accept=".pdf,.md,.txt,.html" 
                           onchange="handleFileSelect(this.files)">
                </div>
                
                <!-- OR Divider -->
                <div style="text-align: center; margin: 20px 0; color: #666;">
                    <span style="background: #141414; padding: 0 15px;">OR</span>
                </div>
                
                <!-- URL Input -->
                <h4 style="margin-bottom: 10px; color: #8b5cf6;">Add from URL</h4>
                <input type="url" id="docUrl" placeholder="Enter documentation URL...">
                <input type="text" id="docCategory" placeholder="Category (optional)">
                <button class="btn" onclick="addDocumentation()">Add Documentation</button>
            </div>
        </div>
        
        <div class="section">
            <h2>Search Documentation</h2>
            <div class="search-box">
                <input type="text" id="searchQuery" placeholder="Search docs... (leave empty to show all)" onkeypress="if(event.key==='Enter') performSearch()">
            </div>
            <div id="searchResults"></div>
        </div>
        
        <div class="section">
            <h2>Stored Documentation</h2>
            <div id="docList" class="doc-list">
                <p style="color: #666;">Loading documentation list...</p>
            </div>
        </div>
    </div>
    
    <script>
        // Load documentation list on page load
        window.onload = () => {
            loadDocumentationList();
        };
        
        // Back button function
        function goBack() {
            // Check if the referrer is from port 3001 (Next.js IDE)
            if (document.referrer && document.referrer.includes('localhost:3001')) {
                // Always go back to the IDE page specifically, not just the domain
                window.location.href = 'http://localhost:3001/ide';
            } else if (document.referrer && document.referrer !== '') {
                // For other referrers, go back to them
                window.location.href = document.referrer;
            } else {
                // If no referrer, go to IDE on port 3001 as fallback
                window.location.href = 'http://localhost:3001/ide';
            }
        }
        
        function toggleAddForm() {
            const form = document.getElementById('addDocForm');
            form.style.display = form.style.display === 'none' ? 'block' : 'none';
        }
        
        async function loadDocumentationList() {
            try {
                const response = await fetch('/api/docs/list');
                const docs = await response.json();
                
                const listEl = document.getElementById('docList');
                if (docs.length === 0) {
                    listEl.innerHTML = '<p style="color: #666;">No documentation stored yet. Add some documentation to get started!</p>';
                } else {
                    listEl.innerHTML = docs.map(doc => \`
                        <div class="doc-item">
                            <div>
                                <strong>\${doc.title || 'Untitled'}</strong>
                                <br>
                                <small style="color: #666;">\${doc.url}</small>
                            </div>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <span class="status cached">Cached</span>
                                <button onclick="removeDoc('\${doc.id}')" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Remove</button>
                            </div>
                        </div>
                    \`).join('');
                }
            } catch (error) {
                document.getElementById('docList').innerHTML = '<p style="color: #ef4444;">Failed to load documentation list</p>';
            }
        }
        
        async function addDocumentation() {
            const url = document.getElementById('docUrl').value;
            const category = document.getElementById('docCategory').value;
            
            if (!url) {
                alert('Please enter a URL');
                return;
            }
            
            try {
                const response = await fetch('/api/docs/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, category })
                });
                
                if (response.ok) {
                    alert('Documentation added successfully!');
                    document.getElementById('docUrl').value = '';
                    document.getElementById('docCategory').value = '';
                    toggleAddForm();
                    loadDocumentationList();
                } else {
                    alert('Failed to add documentation');
                }
            } catch (error) {
                alert('Error adding documentation: ' + error.message);
            }
        }
        
        async function removeDoc(id) {
            if (confirm('Remove this documentation?')) {
                try {
                    const response = await fetch('/api/docs/' + id, { method: 'DELETE' });
                    if (response.ok) {
                        loadDocumentationList();
                    }
                } catch (error) {
                    alert('Failed to remove documentation');
                }
            }
        }
        
        async function performSearch() {
            const query = document.getElementById('searchQuery').value;
            const resultsEl = document.getElementById('searchResults');
            
            // If no query, show all documents
            if (!query) {
                try {
                    const response = await fetch('/api/docs/list');
                    const data = await response.json();
                    
                    if (data.docs && data.docs.length > 0) {
                        resultsEl.innerHTML = '<h3>All Documents (' + data.docs.length + '):</h3>' + 
                            data.docs.map(doc => \`
                                <div class="doc-item">
                                    <div>
                                        <strong>\${doc.name || doc.title}</strong>
                                        <br>
                                        <small style="color: #06b6d4;">Words: \${doc.wordCount || 0}</small>
                                        <br>
                                        <small style="color: #a0a0a0;">\${doc.url}</small>
                                        <br>
                                        <p style="margin-top: 10px; color: #a0a0a0;">\${doc.description || 'No description available'}</p>
                                    </div>
                                </div>
                            \`).join('');
                    } else {
                        resultsEl.innerHTML = '<p style="color: #666;">No documents stored. Add some documentation to get started!</p>';
                    }
                } catch (error) {
                    resultsEl.innerHTML = '<p style="color: #ef4444;">Failed to load documents</p>';
                }
                return;
            }
            
            // If query exists, perform search
            try {
                const response = await fetch('/api/docs/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, maxTokens: 2000 })
                });
                
                const results = await response.json();
                
                if (results.chunks && results.chunks.length > 0) {
                    resultsEl.innerHTML = '<h3>Search Results:</h3>' + results.chunks.map(chunk => \`
                        <div class="doc-item">
                            <div>
                                <strong>\${chunk.docTitle}</strong>
                                <br>
                                <small style="color: #8b5cf6;">Relevance: \${(chunk.relevance * 100).toFixed(0)}%</small>
                                <br>
                                <p style="margin-top: 10px; color: #a0a0a0;">\${chunk.content.substring(0, 200)}...</p>
                            </div>
                        </div>
                    \`).join('');
                } else {
                    resultsEl.innerHTML = '<p style="color: #666;">No results found</p>';
                }
            } catch (error) {
                resultsEl.innerHTML = '<p style="color: #ef4444;">Search failed</p>';
            }
        }
        
        function searchDocs() {
            document.getElementById('searchQuery').focus();
        }
        
        function refreshList() {
            loadDocumentationList();
        }
        
        // Drag and Drop handlers
        function handleDragOver(e) {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
            e.currentTarget.style.borderColor = '#06b6d4';
        }
        
        function handleDragLeave(e) {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)';
            e.currentTarget.style.borderColor = '#8b5cf6';
        }
        
        function handleDrop(e) {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)';
            e.currentTarget.style.borderColor = '#8b5cf6';
            
            const files = e.dataTransfer.files;
            handleFileSelect(files);
        }
        
        async function handleFileSelect(files) {
            if (files.length === 0) return;
            
            const file = files[0];
            const allowedTypes = ['.pdf', '.md', '.txt', '.html'];
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!allowedTypes.includes(fileExtension)) {
                alert('Please upload a PDF, Markdown, Text, or HTML file.');
                return;
            }
            
            // Show loading state
            const dropZone = document.getElementById('dropZone');
            const originalContent = dropZone.innerHTML;
            dropZone.innerHTML = '<div style="padding: 20px; color: #8b5cf6;"><div style="font-size: 24px; margin-bottom: 10px;">⏳</div>Processing file...</div>';
            
            try {
                // Create FormData for file upload
                const formData = new FormData();
                formData.append('files', file); // Note: 'files' not 'file' to match server expectation
                
                // Upload file to server
                const response = await fetch('/api/docs/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('Failed to upload file');
                }
                
                const result = await response.json();
                
                // Reset drop zone
                dropZone.innerHTML = originalContent;
                
                // Show success message
                alert(\`✅ Successfully added: \${file.name}\`);
                
                // Refresh the document list
                loadDocumentationList();
                
                // Hide the form
                toggleAddForm();
                
            } catch (error) {
                console.error('File upload error:', error);
                dropZone.innerHTML = originalContent;
                alert(\`❌ Failed to upload file: \${error.message}\`);
            }
        }
        
        async function checkHealth() {
            try {
                const response = await fetch('/api/docs/health');
                const health = await response.json();
                alert('System Status: ' + health.status + '\\nDocuments: ' + health.documentsCount);
            } catch (error) {
                alert('Health check failed');
            }
        }
    </script>
</body>
</html>
    `);
});

// AI Consultation route
app.get('/ai-consultation', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/ai-consultation.html'));
});

// IDE route - redirect to Next.js IDE running on port 3001  
app.get(['/ide', '/ide/'], (req, res) => {
    console.log('[IDE Route] Redirecting to Next.js IDE on port 3001');
    res.redirect('http://localhost:3001/ide');
});

// Logo routes removed - no longer needed after cleanup

// OLD IDE STATIC FILES - REMOVED (Now using Next.js IDE on port 3002)
// Serve IDE static files from ide directory
// Add no-cache headers for CSS files to prevent stale styles
// COMMENTED OUT - Old IDE removed in favor of Next.js version
/*
app.use('/ide', express.static(path.join(__dirname, '../public/ide'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
        }
    }
}));
*/

// EXPERIMENTAL: Tmux Orchestrator Lab route (isolated test environment)
app.get('/tmux-lab', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/labs/tmux-orchestrator/index.html'));
});

// Serve static files for lab directories
app.use('/labs', express.static(path.join(__dirname, '../public/labs')));

// Setup SafePTYManager WebSocket handler for terminal connections
// NOTE: Disabled old terminal handler to prevent conflicts
// setupTerminalSocket(io);
const { setupTerminalWebSocket } = require('./routes/terminal-websocket-safepty');
setupTerminalWebSocket(io);

// Setup Claude File Activity WebSocket handler for real-time file tracking
const { setupFileActivityWebSocket } = require('./routes/claude-file-activity');
setupFileActivityWebSocket(io);

// Setup Agent Dashboard WebSocket handler for real-time agent observability
const { agentObserver } = require('./routes/agent-dashboard');
io.on('connection', (socket) => {
    if (socket.handshake.url && socket.handshake.url.includes('agent-dashboard')) {
        console.log('🤖 Agent Dashboard client connected');
        agentObserver.addWebSocketClient(socket);
        
        socket.on('disconnect', () => {
            console.log('🤖 Agent Dashboard client disconnected');
        });
    }
    
    // Orchestrator Socket.IO event handlers
    setupOrchestratorSocketHandlers(socket);
    
    // Terminal WebSocket Proxy: Forward terminal connections from port 3000 to port 3005
    if (PORT == 3000 && (socket.handshake.url?.includes('terminal') || socket.handshake.headers?.origin?.includes('ide'))) {
        console.log('🔄 [TERMINAL-PROXY] Proxying terminal WebSocket connection to port 3005');
        setupTerminalProxy(socket);
    }
});

// Terminal WebSocket Proxy Function
function setupTerminalProxy(clientSocket) {
    const { io: ioClient } = require('socket.io-client');
    
    try {
        // Create connection to terminal server on port 3005
        const terminalServerSocket = ioClient('ws://127.0.0.1:3005/terminal', {
            transports: ['websocket']
        });
        
        // Proxy events from client to terminal server
        const eventsToProxy = [
            'terminal:create', 'terminal:input', 'terminal:resize', 
            'terminal:join', 'terminal:leave', 'voice:join_session',
            'conversation:start', 'conversation:user-message'
        ];
        
        eventsToProxy.forEach(event => {
            clientSocket.on(event, (data) => {
                console.log(`🔄 [PROXY] ${event} -> port 3005`);
                terminalServerSocket.emit(event, data);
            });
        });
        
        // Proxy events from terminal server back to client
        const eventsFromServer = [
            'terminal:created', 'terminal:output', 'terminal:error',
            'terminal:resize', 'voice:session_joined', 'conversation:started'
        ];
        
        eventsFromServer.forEach(event => {
            terminalServerSocket.on(event, (data) => {
                console.log(`🔄 [PROXY] ${event} <- port 3005`);
                clientSocket.emit(event, data);
            });
        });
        
        // Handle disconnections
        clientSocket.on('disconnect', () => {
            console.log('🔄 [PROXY] Client disconnected, closing proxy connection');
            terminalServerSocket.close();
        });
        
        terminalServerSocket.on('disconnect', () => {
            console.log('🔄 [PROXY] Terminal server disconnected');
            clientSocket.disconnect();
        });
        
        console.log('✅ [TERMINAL-PROXY] WebSocket proxy established between ports 3000 ↔ 3005');
        
    } catch (error) {
        console.error('❌ [TERMINAL-PROXY] Failed to setup proxy:', error);
        clientSocket.emit('error', { message: 'Terminal proxy connection failed' });
    }
}

// Orchestrator Socket.IO Event Handlers
function setupOrchestratorSocketHandlers(socket) {
    console.log(`🎭 [ORCHESTRATOR] Client connected: ${socket.id}`);
    
    // Start conversation event
    socket.on('conversation:start', async (data) => {
        try {
            console.log(`🎭 [ORCHESTRATOR] Starting conversation for ${socket.id}:`, data);
            
            const { query, uploadedFiles } = data;
            if (!query || !query.trim()) {
                socket.emit('conversation:error', { 
                    message: 'Query is required to start consultation' 
                });
                return;
            }
            
            // Start orchestrator session
            const session = await conversationOrchestrator.startSession(
                socket.id, // userId 
                query.trim(), // initialQuery
                { 
                    maxExperts: data.options?.minAgents || 3,
                    includeUserInCollaboration: true
                }
            );
            
            // Emit conversation started event
            socket.emit('conversation:started', {
                sessionId: session.sessionId,
                query: query.trim(),
                agents: session.selectedExperts || [],
                phase: session.phase,
                orchestratorMessage: session.orchestratorMessage
            });
            
            console.log(`🎭 [ORCHESTRATOR] Conversation started: ${session.sessionId}`);
            
        } catch (error) {
            console.error('🎭 [ORCHESTRATOR] Error starting conversation:', error);
            socket.emit('conversation:error', { 
                message: 'Failed to start consultation. Please try again.' 
            });
        }
    });
    
    // Send user message during consultation
    socket.on('conversation:user-message', async (data) => {
        try {
            const { sessionId, message } = data;
            console.log(`🎭 [ORCHESTRATOR] User message for ${sessionId}:`, message);
            
            // Create emit callback function for real-time communication
            const emitCallback = (eventName, eventData) => {
                socket.emit(eventName, eventData);
            };
            
            await conversationOrchestrator.handleUserMessage(sessionId, message, emitCallback);
            
        } catch (error) {
            console.error('🎭 [ORCHESTRATOR] Error handling user message:', error);
            socket.emit('conversation:error', { 
                message: 'Failed to process your message. Please try again.' 
            });
        }
    });
    
    // Generate Claude Code prompt
    socket.on('conversation:generate-claude-code', async (data) => {
        try {
            const { sessionId } = data;
            console.log(`🎭 [ORCHESTRATOR] Claude Code prompt request: ${sessionId}`);
            
            const session = conversationOrchestrator.getSession(sessionId);
            if (!session || !session.synthesis) {
                socket.emit('conversation:error', { 
                    message: 'Session not found or synthesis not complete' 
                });
                return;
            }
            
            socket.emit('conversation:claude-code-ready', {
                sessionId,
                claudeCodePrompt: session.claudeCodePrompt || session.synthesis.content,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('🎭 [ORCHESTRATOR] Claude Code generation error:', error);
            socket.emit('conversation:error', { 
                message: 'Failed to generate Claude Code prompt' 
            });
        }
    });
    
    // Export conversation results
    socket.on('conversation:export', async (data) => {
        try {
            const { sessionId, exportType } = data;
            console.log(`🎭 [ORCHESTRATOR] Export request: ${sessionId} (${exportType})`);
            
            const session = conversationOrchestrator.getSession(sessionId);
            if (!session) {
                socket.emit('conversation:error', { 
                    message: 'Session not found' 
                });
                return;
            }
            
            const exportData = {
                sessionId: session.sessionId,
                query: session.userContext.projectDescription,
                phase: session.phase,
                experts: session.selectedExperts,
                messages: session.messages,
                synthesis: session.synthesis,
                claudeCodePrompt: session.claudeCodePrompt,
                timestamp: Date.now()
            };
            
            socket.emit('conversation:export-ready', {
                sessionId,
                exportType,
                data: exportData,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('🎭 [ORCHESTRATOR] Export error:', error);
            socket.emit('conversation:error', { 
                message: 'Failed to export conversation. Please try again.' 
            });
        }
    });
    
    // Clean up on disconnect
    socket.on('disconnect', () => {
        console.log(`🎭 [ORCHESTRATOR] Client disconnected: ${socket.id}`);
        // TODO: Implement proper session cleanup
    });
}

// Add REST API for terminal session creation
const { router: terminalRestRouter } = require('./routes/terminal-rest-api');
app.use('/api/terminal-rest', terminalRestRouter);

// Add REST API for orchestrator functionality (fallback when Socket.IO not available)
const orchestratorRouter = require('./routes/orchestrator');
app.use('/api/orchestrator', orchestratorRouter);

// Initialize Supervision System globally
const { IntegratedSupervisionSystem } = require('./services/supervision/IntegratedSupervisionSystem');
const { SupervisionEngine } = require('./services/supervision/SupervisionEngine');
const globalSupervisionSystem = new IntegratedSupervisionSystem();

// Set global supervision engine immediately for terminal integration
global.supervisionEngine = globalSupervisionSystem.supervisionEngine;
global.supervisionSystem = globalSupervisionSystem;
console.log('🌍 [SUPERVISION] Global supervision engine initialized on startup');

// Initialize VibeCoach WebSocket service for real-time dashboard updates
const VibeCoachWebSocket = require('./services/vibe-coach/VibeCoachWebSocket');
const VibeCoachService = require('./services/vibe-coach/VibeCoachService');

// Initialize Conversation Orchestrator for AI expert consultation
// Use shared singleton instance to maintain sessions across all handlers
const conversationOrchestrator = require('./services/conversation-orchestrator-singleton');

// Repository Pre-loader for competitive advantage - TEMPORARILY DISABLED FOR MEMORY
// const { getInstance: getRepositoryPreloader } = require('./services/repository-preloader');

// Claude Code Usage Monitor integration for real usage tracking - TEMPORARILY DISABLED FOR MEMORY  
// const claudeUsageBridge = require('./services/claude-usage-bridge');

// TEMPORARILY DISABLED FOR MEMORY ISSUES
// let globalVibeCoachWebSocket;
// let globalVibeCoachService;

// try {
//     globalVibeCoachService = new VibeCoachService();
//     globalVibeCoachWebSocket = new VibeCoachWebSocket(io);
//     globalVibeCoachWebSocket.connectToVibeCoach(globalVibeCoachService);
    
//     // Make services globally available for route integration
//     global.vibeCoachService = globalVibeCoachService;
//     global.vibeCoachWebSocket = globalVibeCoachWebSocket;
    
//     console.log('🎯 [VIBECOACH] WebSocket service initialized for real-time coaching updates');
// } catch (error) {
//     console.warn('⚠️ [VIBECOACH] Failed to initialize WebSocket service:', error.message);
// }

/**
 * Initialize Repository Pre-loader
 * Non-blocking background process that pre-loads strategic repositories
 * Creates instant AI intelligence for users with zero wait time
 */
async function initializeRepositoryPreloader() {
    try {
        const preloaderConfig = require('./config/preload-repositories.json');
        
        // Check if auto-preload is enabled
        if (!preloaderConfig.settings.autoPreloadOnStartup) {
            console.log('📋 [PRELOADER] Auto pre-loading disabled in config');
            return;
        }
        
        // Skip pre-loading in development mode if specified
        if (process.env.SKIP_PRELOAD === 'true') {
            console.log('📋 [PRELOADER] Skipping pre-load (SKIP_PRELOAD=true)');
            return;
        }
        
        // const preloader = getRepositoryPreloader();
        // const initialized = await preloader.initialize();
        const initialized = false; // Temporarily disabled
        
        if (!initialized) {
            console.warn('⚠️ [PRELOADER] Failed to initialize pre-loader');
            return;
        }
        
        // Make preloader globally available for monitoring
        // global.repositoryPreloader = preloader;
        
        // Wait before starting pre-load to let server stabilize
        // const delay = preloaderConfig.settings.preloadDelay || 30000;
        // console.log(`⏱️ [PRELOADER] Waiting ${delay/1000}s before starting pre-load...`);
        
        // setTimeout(async () => {
        //     console.log('🚀 [PRELOADER] Starting background repository pre-loading...');
            
        //     // Use test repositories in development
        //     const isDevelopment = process.env.NODE_ENV === 'development' || process.env.TEST_PRELOAD === 'true';
        //     if (isDevelopment && preloaderConfig.testRepositories) {
        //         preloader.preloadQueue = [...preloaderConfig.testRepositories];
        //         console.log('🧪 [PRELOADER] Using test repository list (3 repos)');
        //     }
            
        //     // Start pre-loading in background (non-blocking)
        //     preloader.startPreloading({
        //         batchSize: isDevelopment ? 1 : 3,
        //         maxConcurrent: isDevelopment ? 1 : 2,
        //         delayBetweenBatches: isDevelopment ? 5000 : 15000
        //     }).then(() => {
        //         console.log('✅ [PRELOADER] Background pre-loading complete');
        //     }).catch(error => {
        //         console.error('❌ [PRELOADER] Background pre-loading failed:', error);
        //     });
            
        //     // Set up event listeners for monitoring
        //     // preloader.on('preload:progress', (data) => {
        //         const percent = Math.round((data.processed / data.total) * 100);
        //         console.log(`📊 [PRELOADER] Progress: ${percent}% (${data.successful} successful, ${data.failed} failed)`);
        //     });
            
        // }, delay);
        
    } catch (error) {
        console.error('❌ [PRELOADER] Failed to initialize repository pre-loader:', error);
        // Don't throw - pre-loading failure shouldn't affect server startup
    }
}

// Start server - Use validated port from startup validation
const PORT = finalPort; // Port validated at startup (3000 by default)
const HOST = '0.0.0.0'; // Important for Render

server.listen(PORT, HOST, async () => {
    console.log(`🚀 Autonomous Vibe Interface running on port ${PORT}`);
    console.log('📊 Health check: /health');
    console.log('🎤 Voice API: /api/voice/*');
    console.log('🖥️ Terminal API: /api/terminal/*');
    console.log('🔊 Socket.IO: Voice & Terminal real-time communication enabled');
    console.log('🛡️ Rate limiting enabled to prevent excessive API calls');
    console.log(`💡 Terminal WebSocket: ws://127.0.0.1:${PORT}/terminal`);
    console.log('🤖 Supervision System: Initialized and ready');
    
    // Start memory monitoring
    memoryMonitor.startMonitoring();
    
    if (process.env.RENDER) {
        console.log(`🌐 Running on Render at https://${process.env.RENDER_EXTERNAL_HOSTNAME}`);
    }
    
    // Initialize Claude Code Usage Monitor Bridge (non-blocking)
    try {
        // const usageInitialized = await claudeUsageBridge.initialize();
        // if (usageInitialized) {
        //     claudeUsageBridge.startWatching(5000); // Watch for changes every 5 seconds
        console.warn('⚠️ [USAGE-BRIDGE] Failed to initialize usage monitoring: claudeUsageBridge is not defined');
        //     console.log('📊 [USAGE-BRIDGE] Claude Code Usage Monitor integration active');
        // } else {
        //     console.log('📊 [USAGE-BRIDGE] Claude Code Usage Monitor not detected - using mock data');
        // }
    } catch (error) {
        console.warn('⚠️ [USAGE-BRIDGE] Failed to initialize usage monitoring:', error.message);
    }
    
    // Initialize Repository Pre-loader (non-blocking background process) - TEMPORARILY DISABLED
    // initializeRepositoryPreloader();
});

// Track active resources for cleanup
const activeResources = {
    timers: new Set(),
    connections: new Set(),
    sessions: new Map()
};

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    
    // Stop accepting new connections and wait for proper closure
    const serverClosePromise = new Promise((resolve) => {
        server.close(() => {
            console.log('Server closed');
            resolve();
        });
    });
    
    // Clean up WebSocket connections and wait for proper closure
    const ioClosePromise = new Promise((resolve) => {
        if (io) {
            io.close(() => {
                console.log('WebSocket server closed');
                resolve();
            });
        } else {
            resolve();
        }
    });
    
    // Wait for server and WebSocket to close properly
    try {
        await Promise.all([serverClosePromise, ioClosePromise]);
        console.log('Network services stopped gracefully');
    } catch (error) {
        console.error('Error closing network services:', error);
    }
    
    // Clean up PTY sessions
    if (global.safePTYManager) {
        try {
            // Check if this is a restart (SIGUSR2) vs shutdown
            const isRestart = signal === 'SIGUSR2';
            const forceAll = !isRestart;  // Only force cleanup on actual shutdown
            
            await global.safePTYManager.cleanupAll(forceAll);
            
            if (!forceAll && process.env.TERMINAL_SESSION_PROTECTION === 'true') {
                console.log('PTY sessions cleaned up (protected sessions preserved for restart)');
            } else {
                console.log('PTY sessions cleaned up');
            }
        } catch (error) {
            console.error('Error cleaning PTY sessions:', error);
        }
    }
    
    // Clean up MCP connections
    if (global.mcpClient) {
        try {
            await global.mcpClient.disconnect();
            console.log('MCP client disconnected');
        } catch (error) {
            console.error('Error disconnecting MCP:', error);
        }
    }
    
    // Force close any remaining connections
    if (activeResources.connections.size > 0) {
        console.log(`Closing ${activeResources.connections.size} remaining connections...`);
        activeResources.connections.forEach(connection => {
            try {
                connection.destroy();
            } catch (error) {
                console.error('Error destroying connection:', error);
            }
        });
        activeResources.connections.clear();
    }
    
    // Clear all timers
    activeResources.timers.forEach(timer => clearInterval(timer));
    activeResources.timers.clear();
    
    // Force exit after 10 seconds
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000).unref();
    
    process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));  // PM2 reload signal

// Setup comprehensive error handling middleware
// This MUST be added after all routes are defined
const { setupErrorHandling } = require('./middleware/error-handler');
setupErrorHandling(app);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit on unhandled rejections, just log them
});

module.exports = { app, server, io };