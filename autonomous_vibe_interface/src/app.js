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

const app = express();
const server = http.createServer(app);
const licenseManager = new LicenseManager();
const io = socketIO(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "*"],
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ['websocket', 'polling']
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

// Friend access authentication gate (skip in Docker mode)
app.use((req, res, next) => {
    // In Docker mode, skip friend auth and use license system instead
    if (BYPASS_FRIEND_AUTH) {
        return next();
    }
    
    // Bypass auth during development/testing or for public paths
    const publicPaths = ['/', '/health', '/beta-access', '/api/beta-access', '/invite', '/api/market-insights', '/api/intelligence', '/api/analytics', '/ide', '/hooks', '/welcome', '/api/license', '/tmux-lab', '/api/experimental'];
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
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' ws: wss: http: https: localhost:3000; " +
      "frame-src 'self' data:;"
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

// Serve public directory files (including logos and images)
app.use('/public', express.static(path.join(__dirname, '../public')));

// Welcome page route (for licensing flow)
app.get('/welcome', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/welcome.html'));
});

// Licensing API Routes (public, for Docker version)
app.use('/api/license', require('./routes/licensing'));

// API routes with specific rate limiting
app.use('/api/anthropic', anthropicRateLimit, require('./routes/anthropic'));
app.use('/api/openai', openaiRateLimit, require('./routes/openai'));
app.use('/api/agent', require('./routes/agent-simple'));
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
app.use('/api/error-doctor', require('./routes/error-doctor'));  // AI Error Doctor
app.use('/api/claude/coaching', require('./routes/vibe-coach'));  // VibeCoach AI Dashboard
app.use('/api/hooks', require('./routes/hooks'));  // Claude Code Hooks Management
app.use('/api/vibe-hooks', require('./routes/vibe-hooks'));  // Vibe Hooks Pattern-based Automation
app.use('/api/github', require('./routes/github-push'));  // Educational GitHub Push
app.use('/api/github/cli', require('./routes/github-cli'));  // GitHub CLI integration (PRs, issues, workflows)
app.use('/api/project-pipeline', require('./routes/project-pipeline'));  // Project Pipeline Management
app.use('/api/repository', require('./routes/repository-intelligence'));  // Repository Intelligence for IDE
app.use('/api/repository-admin', require('./routes/repository-admin'));  // Repository Admin endpoints
app.use('/api/sessions', require('./routes/sessions'));  // Session and Checkpoint Management
app.use('/api/templates', require('./routes/templates'));  // Templates Hub API
app.use('/api/claude-file-activity', require('./routes/claude-file-activity'));  // Claude File Activity Tracking
app.use('/api/docs', require('./routes/documentation'));  // Documentation Intelligence System
app.use('/api/claude/session-doc', require('./routes/claude-session-doc'));  // Claude Session Documentation System
app.use('/api/workflows', require('./routes/workflows'));  // Revolutionary Workflow Automation System
app.use('/api/mcp-prompts', require('./routes/mcp-prompts'));  // MCP Ambient Prompt Display System
app.use('/api', require('./routes/prettier-config'));
// Remove duplicate terminal-rest route - using terminal-rest-api.js instead
// app.use('/api/terminal-rest', require('./routes/terminal-rest'));

// EXPERIMENTAL: Tmux Orchestrator Lab (isolated test environment)
app.use('/api/experimental', require('./routes/experimental/orchestrator'));

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

// Vibe Dashboard route - NEW dashboard for vibe coders and newer developers
app.get('/vibe-dashboard', (req, res) => {
    // Add aggressive no-cache headers to prevent browser caching of old versions
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString(),
        'ETag': 'W/"no-cache-' + Date.now() + '"'
    });
    res.sendFile(path.join(__dirname, '../CANONICAL/vibe-dashboard.html'));
});

// Natural Commands route - serve the natural commands page
app.get('/natural-commands', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/natural-commands.html'));
});

// Beta Access route - serve the friend access page
app.get('/beta-access', (req, res) => {
    res.sendFile(path.join(__dirname, '../CANONICAL/beta-access.html'));
});

// Hooks Management route - serve the hooks manager page
app.get('/hooks', (req, res) => {
    // Add aggressive no-cache headers to prevent browser caching
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString(),
        'ETag': '"' + Date.now() + '"'
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
    res.sendFile(path.join(__dirname, '../public/templates-hub.html'));
});

// Documentation route - serve with no-cache headers
app.get(['/features', '/docs', '/documentation'], (req, res) => {
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

// IDE route - serve from coder1-ide directory
app.get(['/ide', '/ide/'], (req, res) => {
    console.log('[IDE Route] Handling request for:', req.path);
    if (process.env.VERCEL) {
        // On Vercel, serve the rewritten HTML directly with correct file names
        const cacheBuster = 'header-height-fix-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        /* ⚠️⚠️⚠️ CRITICAL FOR ALL AGENTS - MUST READ ⚠️⚠️⚠️
         * 
         * THIS HTML IS HARDCODED AND MUST BE UPDATED AFTER EVERY BUILD!
         * 
         * When you build the React IDE app:
         * 1. Run: npm run build (in coder1-ide/coder1-ide-source)
         * 2. Check the new hash: ls build/static/js/main.*.js
         * 3. UPDATE THE HASH BELOW from main.893bdb43.js to main.NEWHASH.js
         * 4. Also check CSS hash if changed: ls build/static/css/main.*.css
         * 5. Copy build files: cp -r build/* ../../public/ide/
         * 6. Restart the server for changes to take effect
         * 
         * WHY THIS EXISTS: The server serves hardcoded HTML instead of reading from
         * the index.html file. This was done to fix path issues but means manual
         * updates are required after each build.
         * 
         * SYMPTOMS IF NOT UPDATED: Your changes won't appear in the IDE even after
         * building and copying files. The browser will load the old JavaScript.
         * 
         * CURRENT BUILD: main.d50cf9a1.js with main.f26c6e31.css (Updated: Aug 26 - FINAL FIX: Documentation Panel Tokyo Night Theme)
         */
        console.warn('⚠️ SERVING HARDCODED HTML: main.d50cf9a1.js with main.f26c6e31.css - FINAL FIX: Documentation Panel Tokyo Night Theme');
        const htmlContent = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><link rel="icon" href="/ide/favicon.ico"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#000000"/><meta name="description" content="Coder1 IDE - Development Environment"/><link rel="apple-touch-icon" href="/ide/logo192.png"/><link rel="manifest" href="/ide/manifest.json"/><title>Coder1 IDE</title><link rel="stylesheet" href="/ide/static/css/xterm.css"/><script src="/ide/static/lib/xterm.js"></script><script src="/ide/static/lib/addon-fit.js"></script><script src="/ide/static/lib/xterm-loader.js"></script><script defer="defer" src="/ide/static/js/main.d50cf9a1.js?cb=${cacheBuster}"></script><link href="/ide/static/css/main.f26c6e31.css?cb=${cacheBuster}" rel="stylesheet"></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div></body></html>`;
        
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
        const indexPath = path.join(__dirname, '../public/ide/index.html');
        let html = fs.readFileSync(indexPath, 'utf8');
        
        // Add cache-busting timestamp to all assets
        const timestamp = Date.now();
        html = html.replace(/href="\/static\/css\/([^"]+)"/g, `href="/ide/static/css/$1?v=${timestamp}"`);
        html = html.replace(/src="\/static\/js\/([^"]+)"/g, `src="/ide/static/js/$1?v=${timestamp}"`);
        
        // Rewrite remaining absolute paths to work under /ide (but not already processed ones)
        html = html.replace(/href="\/(?!ide\/)/g, 'href="/ide/');
        html = html.replace(/src="\/(?!ide\/)/g, 'src="/ide/');
        
        // Inject XTerm.js and related scripts BEFORE the main React script
        const xtermScripts = `
    <link rel="stylesheet" href="/ide/static/css/xterm.css"/>
    <script src="/ide/static/lib/xterm.js"></script>
    <script src="/ide/static/lib/addon-fit.js"></script>
    <script src="/ide/static/lib/xterm-loader.js"></script>`;
        html = html.replace('</head>', `${xtermScripts}\n</head>`);
        
        // Removed AI navigation script injection - React app now handles AI button
        // html = html.replace('</body>', '<script src="/static/ai-navigation.js"></script></body>');
        
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
// Add no-cache headers for CSS files to prevent stale styles
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
app.use('/ide', express.static(path.join(__dirname, '../coder1-ide/ide-build'), {
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

// Add REST API for terminal session creation
const { router: terminalRestRouter } = require('./routes/terminal-rest-api');
app.use('/api/terminal-rest', terminalRestRouter);

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

// Repository Pre-loader for competitive advantage
const { getInstance: getRepositoryPreloader } = require('./services/repository-preloader');

// Claude Code Usage Monitor integration for real usage tracking
const claudeUsageBridge = require('./services/claude-usage-bridge');

let globalVibeCoachWebSocket;
let globalVibeCoachService;

try {
    globalVibeCoachService = new VibeCoachService();
    globalVibeCoachWebSocket = new VibeCoachWebSocket(io);
    globalVibeCoachWebSocket.connectToVibeCoach(globalVibeCoachService);
    
    // Make services globally available for route integration
    global.vibeCoachService = globalVibeCoachService;
    global.vibeCoachWebSocket = globalVibeCoachWebSocket;
    
    console.log('🎯 [VIBECOACH] WebSocket service initialized for real-time coaching updates');
} catch (error) {
    console.warn('⚠️ [VIBECOACH] Failed to initialize WebSocket service:', error.message);
}

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
        
        const preloader = getRepositoryPreloader();
        const initialized = await preloader.initialize();
        
        if (!initialized) {
            console.warn('⚠️ [PRELOADER] Failed to initialize pre-loader');
            return;
        }
        
        // Make preloader globally available for monitoring
        global.repositoryPreloader = preloader;
        
        // Wait before starting pre-load to let server stabilize
        const delay = preloaderConfig.settings.preloadDelay || 30000;
        console.log(`⏱️ [PRELOADER] Waiting ${delay/1000}s before starting pre-load...`);
        
        setTimeout(async () => {
            console.log('🚀 [PRELOADER] Starting background repository pre-loading...');
            
            // Use test repositories in development
            const isDevelopment = process.env.NODE_ENV === 'development' || process.env.TEST_PRELOAD === 'true';
            if (isDevelopment && preloaderConfig.testRepositories) {
                preloader.preloadQueue = [...preloaderConfig.testRepositories];
                console.log('🧪 [PRELOADER] Using test repository list (3 repos)');
            }
            
            // Start pre-loading in background (non-blocking)
            preloader.startPreloading({
                batchSize: isDevelopment ? 1 : 3,
                maxConcurrent: isDevelopment ? 1 : 2,
                delayBetweenBatches: isDevelopment ? 5000 : 15000
            }).then(() => {
                console.log('✅ [PRELOADER] Background pre-loading complete');
            }).catch(error => {
                console.error('❌ [PRELOADER] Background pre-loading failed:', error);
            });
            
            // Set up event listeners for monitoring
            preloader.on('preload:progress', (data) => {
                const percent = Math.round((data.processed / data.total) * 100);
                console.log(`📊 [PRELOADER] Progress: ${percent}% (${data.successful} successful, ${data.failed} failed)`);
            });
            
        }, delay);
        
    } catch (error) {
        console.error('❌ [PRELOADER] Failed to initialize repository pre-loader:', error);
        // Don't throw - pre-loading failure shouldn't affect server startup
    }
}

// Start server
const PORT = process.env.PORT || 3000; // Main server runs on port 3000
const HOST = '0.0.0.0'; // Important for Render

server.listen(PORT, HOST, async () => {
    console.log(`🚀 Autonomous Vibe Interface running on port ${PORT}`);
    console.log(`📊 Health check: /health`);
    console.log(`🎤 Voice API: /api/voice/*`);
    console.log(`🖥️ Terminal API: /api/terminal/*`);
    console.log(`🔊 Socket.IO: Voice & Terminal real-time communication enabled`);
    console.log(`🛡️ Rate limiting enabled to prevent excessive API calls`);
    console.log(`💡 Terminal WebSocket: ws://127.0.0.1:${PORT}/terminal`);
    console.log(`🤖 Supervision System: Initialized and ready`);
    
    if (process.env.RENDER) {
        console.log(`🌐 Running on Render at https://${process.env.RENDER_EXTERNAL_HOSTNAME}`);
    }
    
    // Initialize Claude Code Usage Monitor Bridge (non-blocking)
    try {
        const usageInitialized = await claudeUsageBridge.initialize();
        if (usageInitialized) {
            claudeUsageBridge.startWatching(5000); // Watch for changes every 5 seconds
            console.log('📊 [USAGE-BRIDGE] Claude Code Usage Monitor integration active');
        } else {
            console.log('📊 [USAGE-BRIDGE] Claude Code Usage Monitor not detected - using mock data');
        }
    } catch (error) {
        console.warn('⚠️ [USAGE-BRIDGE] Failed to initialize usage monitoring:', error.message);
    }
    
    // Initialize Repository Pre-loader (non-blocking background process)
    initializeRepositoryPreloader();
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