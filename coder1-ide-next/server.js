/**
 * Next.js Custom Server with Integrated Terminal Support
 * 
 * This unified server replaces the dual-server architecture:
 * - Handles Next.js pages and API routes
 * - Provides WebSocket support via Socket.IO
 * - Manages terminal PTY sessions
 * - Integrates tmux orchestration
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const pty = require('node-pty');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const path = require('path');
const fs = require('fs');
const express = require('express');

// Environment detection
const isDevelopment = process.env.NODE_ENV !== 'production';

// Memory Optimizer with environment-aware limits - Updated for 2GB Standard plan
const { getMemoryOptimizer } = require('./services/memory-optimizer');
const memoryOptimizer = getMemoryOptimizer({
  maxHeapMB: isDevelopment ? 2048 : (parseInt(process.env.NODE_OPTIONS?.match(/--max-old-space-size=(\d+)/)?.[1]) || 1500),
  warningThresholdMB: isDevelopment ? 1500 : 1200,  // 80% of 1500MB
  panicThresholdMB: isDevelopment ? 1800 : (parseInt(process.env.MEMORY_PANIC_THRESHOLD_MB) || 1800),
  checkIntervalMs: isDevelopment ? 60000 : 30000  // Check less frequently in dev
});

// Enhanced tmux service
let EnhancedTmuxService;
try {
  EnhancedTmuxService = require('./services/enhanced-tmux-service').EnhancedTmuxService;
} catch (error) {
  console.warn('⚠️ Enhanced tmux service not available:', error.message);
  EnhancedTmuxService = null;
}

// WebSocket Event Bridge for Claude Code Bridge Service (JavaScript version)
let WebSocketEventBridge;
try {
  const bridgeModule = require('./services/websocket-event-bridge.js');
  WebSocketEventBridge = bridgeModule.getWebSocketEventBridge();
} catch (error) {
  console.warn('⚠️ WebSocket Event Bridge not available:', error.message);
  WebSocketEventBridge = null;
}

// Agent Terminal Manager for Phase 2: Interactive Agent Terminals
let agentTerminalManager;
try {
  const { getAgentTerminalManager } = require('./services/agent-terminal-manager');
  agentTerminalManager = getAgentTerminalManager();
} catch (error) {
  console.warn('⚠️ Agent Terminal Manager not available:', error.message);
  agentTerminalManager = null;
}

// Conductor system removed - using simple multi-Claude tabs instead
// Multi-Claude tabs will be handled through the terminal UI directly

// Broadcast team status updates periodically
setInterval(() => {
  if (agentTerminalManager && io) {
    const stats = agentTerminalManager.getStats();
    
    if (stats.totalSessions > 0) {
      const agents = stats.sessions.map(session => ({
        agentId: session.agentId,
        role: session.role,
        status: session.bufferSize > 0 ? 'working' : 'idle',
        bufferSize: session.bufferSize
      }));
      
      // Broadcast to all connected clients
      io.emit('team:status:update', { agents });
    }
  }
}, 3000); // Update every 3 seconds

// Agent Coordinator for multi-agent workflows with terminal integration
let agentCoordinator;
try {
  const { getCoordinatorService } = require('./services/agent-coordinator');
  agentCoordinator = getCoordinatorService();
  console.log('🎭 Agent Coordinator initialized');
} catch (error) {
  console.warn('⚠️ Agent Coordinator not available:', error.message);
  agentCoordinator = null;
}

// Test PTY compatibility on startup
const testPtyCompatibility = () => {
  try {
    const testPty = pty.spawn('echo', ['test'], {});
    testPty.kill();
    console.log('✅ PTY COMPATIBILITY: Working on this environment');
    return true;
  } catch (error) {
    console.error('❌ PTY COMPATIBILITY: Failed -', error.message);
    console.error('  This means terminal sessions will NOT work!');
    console.error('  Potential fix: npm rebuild node-pty --update-binary');
    return false;
  }
};
const ptyCompatible = testPtyCompatibility();

// Environment validation
let envValidator;
try {
  envValidator = require('./lib/env-validator').envValidator;
  // Check environment variables on startup
  if (!envValidator.isValid()) {
    console.error('\n🚨 Environment Variable Validation Failed!\n');
    console.error(envValidator.getReport());
    process.exit(1);
  } else {
    console.log('\n✅ Environment variables validated successfully');
    if (envValidator.getWarnings().length > 0) {
      console.warn('\n⚠️  Environment warnings:');
      envValidator.getWarnings().forEach(warn => console.warn(`  - ${warn}`));
    }
  }
} catch (error) {
  console.warn('⚠️ Environment validator not available, skipping validation');
}

// Environment configuration
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0'; // Bind to all interfaces for Render
const port = parseInt(process.env.PORT || '3001', 10);

// Alpha deployment configuration
const isAlphaMode = process.env.ALPHA_MODE_ENABLED === 'true';
const alphaInviteCode = process.env.ALPHA_INVITE_CODE;
const maxAlphaUsers = parseInt(process.env.MAX_ALPHA_USERS || '10');
const deploymentMode = process.env.DEPLOYMENT_MODE || 'standard';

// Track active alpha sessions
const alphaActiveSessions = new Map();

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Terminal session storage
const terminalSessions = new Map();
const sessionMetadata = new Map();

// Context capture integration
const terminalDataBuffers = new Map(); // Buffer terminal data for context capture
const contextSessions = new Map(); // Map terminal sessions to context sessions

// Initialize enhanced tmux service
let tmuxService;
if (EnhancedTmuxService) {
  try {
    tmuxService = new EnhancedTmuxService();
    // REMOVED: // REMOVED: // REMOVED: console.log('🚀 Enhanced tmux service initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize tmux service:', error.message);
    tmuxService = null;
  }
} else {
  tmuxService = null;
}

// Session management
class TerminalSession {
  constructor(id, userId = 'default') {
    this.id = id;
    this.userId = userId;
    this.created = new Date();
    this.lastActivity = new Date();
    
    try {
      // Create PTY process
      const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
      // Use current working directory in production, specific path in development
      const workingDir = process.env.NODE_ENV === 'production' 
        ? process.cwd() 
        : path.join(process.env.HOME || process.cwd(), 'autonomous_vibe_interface');
      
      // Ensure working directory exists
      const finalWorkingDir = fs.existsSync(workingDir) ? workingDir : process.cwd();
      
      console.log(`[Terminal] Creating PTY session ${id} with shell: ${shell}, cwd: ${finalWorkingDir}`);
      
      // Ensure PATH includes common locations for Claude CLI
      const enhancedPath = [
        '/opt/homebrew/bin',
        '/usr/local/bin', 
        '/usr/bin',
        '/bin',
        '/usr/sbin',
        '/sbin',
        process.env.PATH
      ].filter(Boolean).join(':');
      
      this.pty = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: finalWorkingDir,
        env: {
          ...process.env,
          PATH: enhancedPath,
          CODER1_IDE: 'true',
          TERMINAL_SESSION_ID: id
        }
      });
      
      // Critical diagnostic: Verify PTY was actually created
      console.log(`🎯 PTY SPAWN TEST: ${this.pty ? '✅ SUCCESS' : '❌ FAILED'} for session ${id}`);
      if (this.pty) {
        console.log(`[Terminal] PTY session ${id} created successfully with PID: ${this.pty.pid}`);
      } else {
        console.error(`[Terminal] PTY is null after spawn for session ${id}!`);
        throw new Error('PTY spawn returned null');
      }
      
      // Set a cleaner prompt after terminal starts (overrides .bashrc)
      const isProduction = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production' || process.env.PORT === '10000';
      if (isProduction) {
        setTimeout(() => {
          // Export a cleaner PS1 prompt
          this.pty.write('export PS1="\\[\\033[01;32m\\]coder1\\[\\033[00m\\]:\\[\\033[01;34m\\]\\W\\[\\033[00m\\]$ "\r');
          // Clear the screen and show welcome message
          this.pty.write('clear\r');
          this.pty.write('Coder1 Terminal Ready\r\n');
          this.pty.write('Type \'claude\' to start AI-assisted coding\r\n');
          this.pty.write('──────────────────────────────────────────────\r\n');
        }, 100);
      }
    } catch (error) {
      console.error(`[Terminal] Failed to create PTY session ${id}:`, error);
      throw new Error(`Failed to create terminal session: ${error.message}`);
    }
    
    // REMOVED: // REMOVED: // REMOVED: console.log(`[Terminal] Created session ${id} with PID ${this.pty.pid}`);
  }
  
  write(data) {
    this.lastActivity = new Date();
    if (this.pty) {
      this.pty.write(data);
    }
  }
  
  resize(cols, rows) {
    if (this.pty) {
      this.pty.resize(cols, rows);
    }
  }
  
  destroy() {
    if (this.pty) {
      // REMOVED: // REMOVED: // REMOVED: console.log(`[Terminal] Destroying session ${this.id}`);
      try {
        this.pty.kill();
      } catch (error) {
        console.error(`[Terminal] Error killing PTY:`, error);
      }
      this.pty = null;
    }
  }
}

// Helper to get or create terminal session
function getOrCreateSession(sessionId, userId = 'default') {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${uuidv4().slice(0, 8)}`;
  }
  
  if (!terminalSessions.has(sessionId)) {
    const session = new TerminalSession(sessionId, userId);
    terminalSessions.set(sessionId, session);
    
    // Set up PTY exit handler only (data handler will be set up in socket connection)
    session.pty.onExit(({ exitCode, signal }) => {
      // REMOVED: // REMOVED: // REMOVED: console.log(`[Terminal] Session ${sessionId} exited with code ${exitCode}`);
      terminalSessions.delete(sessionId);
    });
  }
  
  return terminalSessions.get(sessionId);
}

// Helper function for health check endpoint
function handleHealthCheck(req, res) {
  const stats = memoryOptimizer.getStats();
  
  // Get Socket.IO stats if available
  let socketStats = {
    available: false,
    connectedClients: 0,
    transport: 'unknown',
    ptyCompatible: false
  };
  
  if (global.io) {
    socketStats = {
      available: true,
      connectedClients: global.io.engine?.clientsCount || 0,
      transports: global.io.engine?.transports || [],
      ptyCompatible: ptyCompatible || false,
      activeSessions: terminalSessions.size,
      namespace: '/'
    };
  }
  
  const health = {
    status: stats.status,
    uptime: Date.now() - (global.serverStartTime || Date.now()),
    memory: {
      used: stats.heapUsedMB,
      limit: 400,
      percentage: stats.percentage
    },
    socketio: socketStats,
    sessions: {
      terminal: terminalSessions.size,
      alpha: alphaActiveSessions.size,
      max: maxAlphaUsers
    },
    alpha: {
      enabled: isAlphaMode,
      mode: deploymentMode,
      slotsAvailable: maxAlphaUsers - alphaActiveSessions.size
    },
    pty: {
      compatible: ptyCompatible || false,
      platform: os.platform(),
      shell: os.platform() === 'win32' ? 'powershell.exe' : 'bash'
    },
    timestamp: new Date().toISOString()
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(health));
}

// Helper function for alpha validation
function validateAlphaAccess(req, res) {
  if (!isAlphaMode) return true;
  
  const parsedUrl = parse(req.url, true);
  const providedCode = req.headers['x-alpha-code'] || 
                      parsedUrl.query.alphaCode ||
                      parsedUrl.query.invite;
  
  if (providedCode !== alphaInviteCode) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Invalid alpha invite code',
      message: 'This is a private alpha. Please contact the team for access.'
    }));
    return false;
  }
  
  if (alphaActiveSessions.size >= maxAlphaUsers) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Alpha capacity reached',
      message: `All ${maxAlphaUsers} alpha slots are currently in use. Please try again later.`,
      slotsAvailable: 0
    }));
    return false;
  }
  
  return true;
}

// Main server initialization
app.prepare().then(() => {
  global.serverStartTime = Date.now();
  
  // Create HTTP server with enhanced error handling
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;
    
    // Add CORS headers for API routes when in development
    if (dev && pathname?.startsWith('/api/')) {
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
    }
    
    // Health check endpoint
    if (pathname === '/api/health' || pathname === '/health') {
      return handleHealthCheck(req, res);
    }
    
    // Alpha validation for protected routes
    if (isAlphaMode && (pathname === '/' || pathname === '/ide' || pathname?.startsWith('/api/claude'))) {
      if (!validateAlphaAccess(req, res)) {
        return;
      }
    }
    
    // Enhanced error handling and smart CSS/JS serving
    const handleWithFallback = async () => {
      try {
        // Smart asset serving: Handle CSS/JS files with any query parameters from Next.js static serving
        // This preserves image preloading while fixing CSS/JS 404 errors
        const isCSSOrJS = pathname?.endsWith('.css') || pathname?.endsWith('.js');
        const hasQueryParams = req.url.includes('?');
        const isNextStaticAsset = pathname?.startsWith('/_next/static/');
        
        if (isCSSOrJS && hasQueryParams && isNextStaticAsset) {
          console.log(`🎯 Smart asset serving: ${pathname} with query params`);
          
          // Strip ALL query parameters that break CSS/JS serving (not just ?v=)
          const cleanUrl = req.url.split('?')[0];
          const cleanParsedUrl = parse(cleanUrl, true);
          
          // Set proper headers for static assets
          if (pathname.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (pathname.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
          
          // Handle request with cleaned URL to fix query parameter issues
          await handle(req, res, cleanParsedUrl);
          
        } else {
          // Handle all other requests normally (preserves image preloading)
          await handle(req, res, parsedUrl);
        }
        
      } catch (error) {
        console.error(`❌ Request handling error for ${pathname}:`, error.message);
        
        // CSS serving fallback
        if (pathname?.includes('css') || req.headers.accept?.includes('text/css')) {
          console.log('🔄 Attempting CSS fallback...');
          res.writeHead(200, { 'Content-Type': 'text/css' });
          res.end(`
            /* CSS Fallback - Basic Dark Theme */
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #0a0a0a; 
              color: #ffffff; 
              height: 100vh; 
              overflow: hidden;
            }
            .error-notice {
              position: fixed;
              top: 20px;
              right: 20px;
              background: rgba(255, 87, 87, 0.9);
              color: white;
              padding: 12px 16px;
              border-radius: 6px;
              z-index: 10000;
              font-size: 14px;
            }
            .loading-notice {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
            }
          `);
          return;
        }
        
        // IDE page fallback
        if (pathname === '/ide' || pathname?.startsWith('/ide')) {
          console.log('🔄 Serving IDE fallback page...');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Coder1 IDE - Loading...</title>
              <style>
                body { 
                  font-family: system-ui, sans-serif; 
                  background: #0a0a0a; 
                  color: #fff; 
                  margin: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  flex-direction: column;
                }
                .loader { 
                  border: 4px solid #333; 
                  border-top: 4px solid #00d9ff; 
                  border-radius: 50%; 
                  width: 40px; 
                  height: 40px; 
                  animation: spin 2s linear infinite; 
                  margin-bottom: 20px;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .message { text-align: center; max-width: 500px; line-height: 1.6; }
                .retry { 
                  margin-top: 20px; 
                  padding: 10px 20px; 
                  background: #00d9ff; 
                  color: #000; 
                  border: none; 
                  border-radius: 4px; 
                  cursor: pointer;
                }
              </style>
            </head>
            <body>
              <div class="loader"></div>
              <div class="message">
                <h2>Coder1 IDE is loading...</h2>
                <p>The server is initializing. This page will automatically refresh when ready.</p>
                <button class="retry" onclick="window.location.reload()">Refresh Now</button>
              </div>
              <script>
                console.log('IDE fallback page loaded - server may be restarting');
                setTimeout(() => window.location.reload(), 5000);
              </script>
            </body>
            </html>
          `);
          return;
        }
        
        // Generic error fallback
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>Coder1 - Server Error</title></head>
            <body style="font-family: system-ui; background: #0a0a0a; color: #fff; padding: 40px; text-align: center;">
              <h1>🔧 Server Error</h1>
              <p>The server encountered an error processing your request.</p>
              <p><button onclick="window.location.reload()" style="padding: 10px 20px; background: #00d9ff; color: #000; border: none; border-radius: 4px;">Retry</button></p>
            </body>
            </html>
          `);
        }
      }
    };
    
    // Execute with fallback handling
    handleWithFallback().catch(error => {
      console.error('❌ Critical request handling error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    });
  });
  
  // Track command buffers globally for all sessions
  const commandBuffers = new Map();
  
  // Track socket-to-session relationships for cleanup
  const socketToSession = new Map();
  
  // Initialize Socket.IO with Render-specific configuration
  const io = new Server(server, {
    cors: {
      origin: dev 
        ? [
            `http://localhost:${port}`,
            'http://localhost:3000',
            'http://localhost:3001'
          ]
        : process.env.NODE_ENV === 'production'
          ? ['https://*.onrender.com', process.env.RENDER_EXTERNAL_URL || '*']
          : true,
      credentials: true
    },
    path: '/socket.io/',
    transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
    allowEIO3: true, // Support older clients
    pingTimeout: 60000, // Increase for Render's proxy (default is 20000)
    pingInterval: 25000, // How often to ping (default is 25000)
    upgradeTimeout: 30000, // Time to wait for upgrade from polling to websocket
    allowUpgrades: true, // Allow upgrade from polling to websocket
    perMessageDeflate: false, // Disable compression for better reliability on Render
    httpCompression: false // Disable HTTP compression for better reliability
  });

  // Add WebSocket authentication middleware (if available)
  try {
    const { createSocketAuthMiddleware } = require('./lib/websocket-auth');
    io.use(createSocketAuthMiddleware());
    console.log('🔐 WebSocket authentication middleware enabled');
  } catch (error) {
    console.warn('⚠️ WebSocket authentication not available (development mode):', error.message);
    // Continue without authentication for development/backwards compatibility
  }

  // Connect WebSocket Event Bridge to Socket.IO server for Claude Code Bridge events
  if (WebSocketEventBridge) {
    try {
      WebSocketEventBridge.connectToSocketServer(io);
      // REMOVED: // REMOVED: // REMOVED: console.log('🔗 WebSocket Event Bridge connected for Claude Code Bridge events');
    } catch (error) {
      console.warn('⚠️ Failed to connect WebSocket Event Bridge:', error.message);
    }
  }

  // Initialize Agent Terminal Manager with Socket.IO instance
  if (agentTerminalManager) {
    try {
      agentTerminalManager.setSocketIO(io);
      console.log('🤖 Agent Terminal Manager initialized for Phase 2');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Agent Terminal Manager:', error.message);
    }
  }
  
  // Connect Agent Coordinator to Agent Terminal Manager for output routing
  if (agentCoordinator && agentTerminalManager) {
    try {
      agentCoordinator.setAgentTerminalManager(agentTerminalManager);
      console.log('🔌 Agent Coordinator connected to Agent Terminal Manager');
    } catch (error) {
      console.warn('⚠️ Failed to connect Agent Coordinator to Terminal Manager:', error.message);
    }
  }

  // Initialize Coder1 Bridge Manager for local Claude CLI connections
  let bridgeManager;
  try {
    const { bridgeManager: manager } = require('./services/bridge-manager');
    bridgeManager = manager;
    
    // Set up bridge namespace
    const bridgeNamespace = io.of('/bridge');
    
    // Bridge authentication middleware
    bridgeNamespace.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'coder1-bridge-secret-2025';
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.userId;
        socket.bridgeMetadata = {
          version: decoded.version,
          platform: decoded.platform,
          claudeVersion: decoded.claudeVersion
        };
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
    
    // Bridge connection handler
    bridgeNamespace.on('connection', (socket) => {
      console.log(`🌉 Bridge connected: User ${socket.userId}, Platform: ${socket.bridgeMetadata.platform}`);
      
      // Register bridge with manager
      const bridgeId = bridgeManager.registerBridge(
        socket,
        socket.userId,
        socket.bridgeMetadata
      );
      
      // Send connection confirmation
      socket.emit('connection:accepted', {
        bridgeId,
        capabilities: ['claude', 'files', 'git']
      });
      
      // Handle command output from bridge
      socket.on('claude:output', (data) => {
        // Forward output to the terminal session
        io.emit('terminal:data', {
          id: data.sessionId,
          data: data.data
        });
      });
      
      // Handle command completion from bridge
      socket.on('claude:complete', (data) => {
        // Notify terminal session that command is complete
        io.emit('terminal:data', {
          id: data.sessionId,
          data: `\r\n✅ Command completed (exit code: ${data.exitCode})\r\n`
        });
      });
      
      // Handle file operations from bridge
      socket.on('file:response', (data) => {
        // Forward file operation responses
        bridgeManager.emit('file:response', data);
      });
      
      // Handle heartbeat from bridge
      socket.on('heartbeat', (data) => {
        bridgeManager.updateHeartbeat(bridgeId);
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 Bridge disconnected: ${bridgeId}`);
        bridgeManager.unregisterBridge(bridgeId);
      });
      
      // Listen for bridge manager events and forward to appropriate destinations
      bridgeManager.on('command:output', (data) => {
        // Forward to terminal session
        const terminalSocket = io.sockets.sockets.get(data.sessionId);
        if (terminalSocket) {
          terminalSocket.emit('terminal:data', {
            id: data.sessionId,
            data: data.data
          });
        }
      });
      
      bridgeManager.on('command:complete', (data) => {
        // Forward completion to terminal session
        const terminalSocket = io.sockets.sockets.get(data.sessionId);
        if (terminalSocket) {
          terminalSocket.emit('claude:complete', data);
        }
      });
      
      console.log(`✅ Coder1 Bridge registered: ${bridgeId}`);
    });
    
    // Make bridge manager globally available for API routes
    global.bridgeManager = bridgeManager;
    console.log('🌉 Coder1 Bridge Manager initialized');
    
  } catch (error) {
    console.warn('⚠️ Bridge Manager not available:', error.message);
    bridgeManager = null;
  }

  // Make Socket.IO server available globally for Express routes compatibility
  global.io = io;
  
  // Socket.IO connection handling
  io.on('connection', (socket) => {
    // Comprehensive connection logging for debugging
    console.log(`🔌 PRODUCTION SOCKET CONNECTED: ${socket.id}`);
    console.log('  Transport:', socket.conn.transport.name);
    console.log('  Remote IP:', socket.handshake.address);
    console.log('  User-Agent:', socket.handshake.headers['user-agent']);
    console.log('  PTY Compatible:', ptyCompatible);
    
    // Test echo to verify bidirectional communication
    socket.emit('test:echo', { time: Date.now() });
    socket.on('test:echo:response', (data) => {
      console.log('✅ Socket bidirectional test passed:', data);
    });
    
    let currentSessionId = null;
    
    // Handle terminal creation
    socket.on('terminal:create', async (data) => {
      console.log('📟 TERMINAL CREATE REQUEST:', {
        sessionId: data?.id,
        transport: socket.conn.transport.name,
        socketId: socket.id,
        ptyCompatible,
        timestamp: new Date().toISOString()
      });
      
      try {
        const { id, cols = 80, rows = 30, workingDirectory } = data || {};
        
        // Check memory before creating new session (environment-aware threshold)
        const memStats = memoryOptimizer.getMemoryUsage();
        const memoryThreshold = isDevelopment ? 1500 : 350;
        if (memStats.heapUsedMB > memoryThreshold) {
          socket.emit('terminal:error', { 
            message: 'System under memory pressure. Please try again in a moment.' 
          });
          return;
        }
        
        // Use passed session ID or create new one
        const sessionId = id || `session_${Date.now()}_${uuidv4().slice(0, 8)}`;
        
        let session;
        try {
          session = getOrCreateSession(sessionId);
          currentSessionId = sessionId;
        } catch (error) {
          console.error(`[Terminal] Failed to create/get session ${sessionId}:`, error);
          socket.emit('terminal:error', { 
            message: `Failed to create terminal session: ${error.message}` 
          });
          return;
        }
        
        // Register session with memory optimizer
        memoryOptimizer.registerSession(sessionId, {
          type: 'terminal',
          socketId: socket.id,
          createdAt: Date.now()
        });
        
        // Resize if needed
        session.resize(cols, rows);
        
        // PHASE 1 FIX: Initialize context session DISABLED for memory stability
        // - Auto-initializing context for every terminal session causes memory exhaustion
        // - Results in 1,673+ sessions created, causing server crashes (exit code 137)
        // PRESERVED: Original code for Phase 2 restoration:
        // await initializeContextSession(sessionId);
        
        // Set up data forwarding for this socket with context capture
        // Track connected sockets for this session
        if (!session.connectedSockets) {
          session.connectedSockets = new Set();
        }
        session.connectedSockets.add(socket);
        
        // Only set up PTY data handler once per session to avoid duplicates
        if (!session.dataHandlerSetup) {
          session.pty.onData((data) => {
            // Forward to all connected sockets for this session
            session.connectedSockets.forEach(connectedSocket => {
              if (connectedSocket.connected) {
                connectedSocket.emit('terminal:data', { id: sessionId, data });
              }
            });
            // Buffer for context capture
            bufferTerminalData(sessionId, 'terminal_output', data);
          });
          session.dataHandlerSetup = true;
        }
        
        // Clean up socket reference when it disconnects
        socket.on('disconnect', () => {
          if (session.connectedSockets) {
            session.connectedSockets.delete(socket);
          }
          
          // Clean up command buffer for this session
          const sessionId = socketToSession.get(socket.id);
          if (sessionId && commandBuffers.has(sessionId)) {
            commandBuffers.delete(sessionId);
            if (process.env.NODE_ENV === 'production') {
              console.log(`[Memory] Cleaned up command buffer for session: ${sessionId}`);
            }
          }
          
          // Clean up socket-to-session mapping
          socketToSession.delete(socket.id);
        });
        
        // Track socket-to-session relationship for cleanup
        socketToSession.set(socket.id, sessionId);
        
        socket.emit('terminal:created', { 
          sessionId, 
          pid: session.pty.pid 
        });
        
        // REMOVED: // REMOVED: // REMOVED: console.log(`[Terminal] Session created for socket ${socket.id}: ${sessionId}`);
      } catch (error) {
        console.error('[Terminal] Error creating session:', error);
        socket.emit('terminal:error', { 
          message: error.message || 'Failed to create terminal session' 
        });
      }
    });
    
    // Handle terminal input with Conductor command detection
    socket.on('terminal:input', async ({ id, data, selectedClaudeModel }) => {
      console.log(`⌨️ TERMINAL INPUT: Session ${id}, Data length: ${data?.length}, Model: ${selectedClaudeModel || 'default'}`);
      
      const sessionId = id || currentSessionId;
      
      // Conductor slash commands removed - multi-Claude tabs handle this differently
      
      const session = terminalSessions.get(sessionId);
      if (session) {
        // Build up command buffer BEFORE writing to terminal
        if (!commandBuffers.has(sessionId)) {
          commandBuffers.set(sessionId, '');
        }
        
        let buffer = commandBuffers.get(sessionId);
        
        // Check if Enter is being pressed (command complete)
        if (data.includes('\r') || data.includes('\n')) {
          const command = buffer.trim().toLowerCase();
          console.log('[Terminal] Command completed:', command);
          
          // ALWAYS intercept claude commands, even if bridgeManager fails to load
          // This prevents "claude: command not found" errors on the server
          // BUT - for local development, let claude commands pass through normally
          const isLocalDevelopment = process.env.NODE_ENV === 'development' || 
                                     process.env.PORT === '3001' || 
                                     process.env.PORT === '3002';
          
          if ((command === 'claude' || command.startsWith('claude ')) && !isLocalDevelopment) {
            console.log('[Terminal] Claude command intercepted, bridgeManager:', !!bridgeManager);
            
            // Check if bridgeManager exists and if a bridge is connected
            if (!bridgeManager) {
              console.log('[Terminal] BridgeManager not available - showing help message');
              // Jump straight to help message
            } else {
              // Get user ID from socket or session (simplified for now)
              const userId = session.userId || 'default';
              const bridgeStatus = bridgeManager.getBridgeStatus?.(userId);
            
              if (bridgeStatus?.connected) {
              // Bridge is connected! Route command through bridge
              console.log('[Terminal] Routing claude command through bridge');
              
              // Clear bash's input buffer
              const backspaces = '\b'.repeat(buffer.length);
              session.write(backspaces);
              
              // Clear the line visually
              socket.emit('terminal:data', {
                id: sessionId,
                data: '\r\x1b[K'
              });
              
              // Show command execution indicator
              socket.emit('terminal:data', {
                id: sessionId,
                data: `\r\n🤖 Executing: ${buffer.trim()}\r\n`
              });
              
              // Execute command through bridge
              const commandRequest = {
                sessionId,
                commandId: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                command: buffer.trim(),
                context: {
                  workingDirectory: process.cwd(),
                  currentFile: null,
                  selection: null,
                  selectedClaudeModel: selectedClaudeModel || 'claude-4-sonnet-20250510'
                },
                timestamp: new Date()
              };
              
              bridgeManager.executeCommand(userId, commandRequest)
                .then(result => {
                  if (!result.success) {
                    socket.emit('terminal:data', {
                      id: sessionId,
                      data: `\r\n❌ Error: ${result.error}\r\n`
                    });
                  }
                })
                .catch(error => {
                  socket.emit('terminal:data', {
                    id: sessionId,
                    data: `\r\n❌ Bridge error: ${error.message}\r\n`
                  });
                });
              
              // Clear command buffer and exit early
              commandBuffers.set(sessionId, '');
              return;
              }
            }
            
            // No bridge connected OR bridgeManager not available - show help message
            console.log('[Terminal] No bridge connected, showing help instead');
            
            // CRITICAL: Clear bash's input buffer by sending backspaces
            // Send one backspace for each character that was typed
            const backspaces = '\b'.repeat(buffer.length);
            session.write(backspaces);
            
            // Clear the line visually in the terminal display
            socket.emit('terminal:data', {
              id: sessionId,
              data: '\r\x1b[K'  // Clear the line in the display
            });
            
            // Show help message immediately
              const helpMessage = [
                '\r\n',
                '╔═══════════════════════════════════════════════════════════════════╗\r\n',
                '║                    🌉 Connect Claude Code                          ║\r\n',
                '╠═══════════════════════════════════════════════════════════════════╣\r\n',
                '║                                                                     ║\r\n',
                '║  Quick Setup:                                                      ║\r\n',
                '║  1. Click the "🌉 Connect Bridge" button in the status bar         ║\r\n',
                '║  2. Follow the popup instructions                                  ║\r\n',
                '║  3. Type "claude" to start AI-assisted coding                     ║\r\n',
                '║                                                                     ║\r\n',
                '║  Alternative: Run Locally                                         ║\r\n',
                '║  git clone https://github.com/MichaelrKraft/coder1-ide            ║\r\n',
                '║  cd coder1-ide/coder1-ide-next && npm install && npm run dev      ║\r\n',
                '║                                                                     ║\r\n',
                '╚═══════════════════════════════════════════════════════════════════╝\r\n',
                '\r\n'
              ].join('');
              
            socket.emit('terminal:data', { 
              id: sessionId, 
              data: helpMessage 
            });
            
            // Show a clean prompt after the help message
            socket.emit('terminal:data', {
              id: sessionId,
              data: 'coder1:coder1-ide-next$ '
            });
            
            // Clear the command buffer 
            commandBuffers.set(sessionId, '');
            return; // Exit early - don't send anything to PTY
          }
          
          // Clear buffer after command
          commandBuffers.set(sessionId, '');
          
          // Send the Enter key to execute the command (not intercepted)
          session.write(data);
        } else {
          // For non-Enter keys, build buffer AND send to PTY
          buffer += data;
          commandBuffers.set(sessionId, buffer);
          
          // Send to PTY for normal command processing
          session.write(data);
        }
        
        // Buffer user input for context capture
        bufferTerminalData(sessionId, 'terminal_input', data);
      } else {
        console.warn(`[Terminal] Session not found: ${sessionId}`);
        socket.emit('terminal:error', { 
          message: 'Terminal session not found' 
        });
      }
    });
    
    // Handle terminal resize
    socket.on('terminal:resize', ({ id, cols, rows }) => {
      const session = terminalSessions.get(id || currentSessionId);
      if (session) {
        session.resize(cols, rows);
        // REMOVED: // REMOVED: // REMOVED: console.log(`[Terminal] Resized session ${id} to ${cols}x${rows}`);
      }
    });
    
    // Handle terminal destruction
    socket.on('terminal:destroy', ({ id }) => {
      const session = terminalSessions.get(id || currentSessionId);
      if (session) {
        session.destroy();
        terminalSessions.delete(id || currentSessionId);
        socket.emit('terminal:destroyed', { id: id || currentSessionId });
      }
    });
    
    // Agent Terminal Handlers (Phase 2: Interactive Agent Terminals)
    if (agentTerminalManager) {
      // Create agent terminal session
      socket.on('agent:terminal:create', ({ agentId, teamId, role }) => {
        try {
          console.log(`🤖 Creating agent terminal: ${agentId} (${role})`);
          const session = agentTerminalManager.createAgentTerminalSession(agentId, teamId, role);
          socket.emit('agent:terminal:created', { 
            agentId, 
            teamId, 
            role,
            isInteractive: session.isInteractive 
          });
        } catch (error) {
          console.error(`❌ Failed to create agent terminal: ${error.message}`);
          socket.emit('agent:terminal:error', { 
            agentId,
            message: error.message 
          });
        }
      });
      
      // Connect to existing agent terminal
      socket.on('agent:terminal:connect', ({ agentId }) => {
        try {
          const connected = agentTerminalManager.connectSocket(agentId, socket);
          if (connected) {
            socket.emit('agent:terminal:connected', { agentId });
          } else {
            socket.emit('agent:terminal:error', { 
              agentId,
              message: 'Agent terminal session not found' 
            });
          }
        } catch (error) {
          console.error(`❌ Failed to connect to agent terminal: ${error.message}`);
          socket.emit('agent:terminal:error', { 
            agentId,
            message: error.message 
          });
        }
      });
      
      // Handle agent terminal input (Phase 2: currently read-only)
      socket.on('agent:terminal:input', ({ agentId, data }) => {
        try {
          agentTerminalManager.handleAgentInput(agentId, data);
        } catch (error) {
          console.error(`❌ Failed to handle agent input: ${error.message}`);
          socket.emit('agent:terminal:error', { 
            agentId,
            message: error.message 
          });
        }
      });
      
      // Clean up agent terminal
      socket.on('agent:terminal:destroy', ({ agentId }) => {
        try {
          agentTerminalManager.cleanupSession(agentId);
          socket.emit('agent:terminal:destroyed', { agentId });
        } catch (error) {
          console.error(`❌ Failed to destroy agent terminal: ${error.message}`);
        }
      });
    }
    
    // Enhanced tmux handlers
    if (tmuxService) {
      // Create sandbox
      socket.on('tmux:create-sandbox', async (data) => {
        try {
          const { userId, projectId, baseFrom, maxCpu, maxMemory } = data;
          const sandbox = await tmuxService.createSandbox({
            userId: userId || 'default',
            projectId: projectId || 'default',
            baseFrom,
            maxCpu,
            maxMemory
          });
          
          socket.emit('tmux:sandbox-created', sandbox);
          // REMOVED: // REMOVED: // REMOVED: console.log(`[Tmux] Sandbox created: ${sandbox.id}`);
        } catch (error) {
          console.error('[Tmux] Error creating sandbox:', error);
          socket.emit('tmux:error', { 
            message: error.message || 'Failed to create sandbox' 
          });
        }
      });
      
      // List sandboxes
      socket.on('tmux:list-sandboxes', async (data) => {
        try {
          const { userId } = data;
          const sandboxes = tmuxService.getUserSandboxes(userId || 'default');
          socket.emit('tmux:sandboxes-listed', sandboxes);
        } catch (error) {
          console.error('[Tmux] Error listing sandboxes:', error);
          socket.emit('tmux:error', { 
            message: error.message || 'Failed to list sandboxes' 
          });
        }
      });
      
      // Connect to sandbox
      socket.on('tmux:connect-sandbox', async (data) => {
        try {
          const { sandboxId } = data;
          const connection = await tmuxService.connectToSandbox(sandboxId);
          socket.emit('tmux:sandbox-connected', connection);
          // REMOVED: // REMOVED: // REMOVED: console.log(`[Tmux] Connected to sandbox: ${sandboxId}`);
        } catch (error) {
          console.error('[Tmux] Error connecting to sandbox:', error);
          socket.emit('tmux:error', { 
            message: error.message || 'Failed to connect to sandbox' 
          });
        }
      });
      
      // Stop sandbox
      socket.on('tmux:stop-sandbox', async (data) => {
        try {
          const { sandboxId } = data;
          await tmuxService.stopSandbox(sandboxId);
          socket.emit('tmux:sandbox-stopped', { id: sandboxId });
          // REMOVED: // REMOVED: // REMOVED: console.log(`[Tmux] Sandbox stopped: ${sandboxId}`);
        } catch (error) {
          console.error('[Tmux] Error stopping sandbox:', error);
          socket.emit('tmux:error', { 
            message: error.message || 'Failed to stop sandbox' 
          });
        }
      });
    }
    
    // Team Status Handlers for Conductor System
    socket.on('team:status:request', () => {
      if (agentTerminalManager) {
        const stats = agentTerminalManager.getStats();
        
        const agents = stats.sessions.map(session => ({
          agentId: session.agentId,
          role: session.role,
          status: session.bufferSize > 0 ? 'working' : 'idle',
          bufferSize: session.bufferSize
        }));
        
        socket.emit('team:status:update', { agents });
      } else {
        socket.emit('team:status:update', { agents: [] });
      }
    });
    
    // Clean up on disconnect
    socket.on('disconnect', () => {
      // REMOVED: // REMOVED: // REMOVED: console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      
      // Clean up command buffer for this socket's session
      const sessionId = socketToSession.get(socket.id);
      if (sessionId && commandBuffers.has(sessionId)) {
        commandBuffers.delete(sessionId);
        if (process.env.NODE_ENV === 'production') {
          console.log(`[Memory] Cleaned up command buffer for session: ${sessionId} (socket: ${socket.id})`);
        }
      }
      
      // Clean up socket-to-session mapping
      socketToSession.delete(socket.id);
      
      // Note: We keep terminal session alive for reconnection
      // Sessions are only destroyed explicitly or on timeout
    });
  });
  
  // Enhanced session cleanup with queue system to prevent memory cascades
  const cleanupQueue = [];
  const MAX_SESSIONS = 10; // Limit total sessions
  const CLEANUP_BATCH_SIZE = 2; // Process 2 cleanups at a time
  const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour
  const activeCleanups = new Set(); // Track active cleanup operations
  
  // Process cleanup queue gradually to prevent cascades
  setInterval(() => {
    // Process queued cleanups
    if (cleanupQueue.length > 0 && activeCleanups.size < CLEANUP_BATCH_SIZE) {
      const batch = cleanupQueue.splice(0, CLEANUP_BATCH_SIZE - activeCleanups.size);
      batch.forEach(sessionId => {
        if (!activeCleanups.has(sessionId)) {
          activeCleanups.add(sessionId);
          
          const session = terminalSessions.get(sessionId);
          if (session) {
            try {
              session.destroy();
              terminalSessions.delete(sessionId);
              sessionMetadata.delete(sessionId);
              console.log(`♻️ Session cleaned up: ${sessionId}`);
            } catch (error) {
              console.error(`⚠️ Error cleaning session ${sessionId}:`, error.message);
            }
          }
          
          // Remove from active cleanups after a delay
          setTimeout(() => {
            activeCleanups.delete(sessionId);
          }, 1000);
        }
      });
    }
    
    // Check for sessions that need cleanup
    const now = Date.now();
    
    // First, enforce maximum session limit
    if (terminalSessions.size > MAX_SESSIONS) {
      const sortedSessions = Array.from(terminalSessions.entries())
        .sort((a, b) => a[1].lastActivity.getTime() - b[1].lastActivity.getTime());
      
      const sessionsToRemove = sortedSessions.slice(0, terminalSessions.size - MAX_SESSIONS);
      sessionsToRemove.forEach(([id]) => {
        if (!cleanupQueue.includes(id) && !activeCleanups.has(id)) {
          cleanupQueue.push(id);
          console.log(`🧹 Queueing session for cleanup (max limit): ${id}`);
        }
      });
    }
    
    // Then check for timeout sessions
    for (const [id, session] of terminalSessions.entries()) {
      if (now - session.lastActivity.getTime() > SESSION_TIMEOUT) {
        if (!cleanupQueue.includes(id) && !activeCleanups.has(id)) {
          cleanupQueue.push(id);
          console.log(`⏰ Queueing session for cleanup (timeout): ${id}`);
        }
      }
    }
    
    // Log memory status if sessions are accumulating
    if (terminalSessions.size > 5 || cleanupQueue.length > 3) {
      console.log(`📊 Session status: Active: ${terminalSessions.size}, Queued for cleanup: ${cleanupQueue.length}`);
    }
  }, 10 * 1000); // Check every 10 seconds (more frequent for better control)
  
  // Start memory optimizer monitoring
  memoryOptimizer.startMonitoring();
  
  // Set up memory optimizer event handlers
  memoryOptimizer.on('cleanup-start', ({ level, usage }) => {
    console.log(`🧹 Memory cleanup started (${level}): ${usage.heapUsedMB}MB / 400MB`);
    
    if (level === 'panic') {
      // In panic mode, stop accepting new terminal sessions
      io.sockets.emit('system:memory-pressure', {
        level: 'critical',
        message: 'System under heavy load. New sessions temporarily disabled.'
      });
    }
  });
  
  memoryOptimizer.on('cleanup-end', ({ level, usage }) => {
    console.log(`✅ Memory cleanup complete (${level}): ${usage.heapUsedMB}MB / 400MB`);
    
    if (level === 'panic' && usage.heapUsedMB < 300) {
      io.sockets.emit('system:memory-recovered', {
        message: 'System resources recovered. Normal operation resumed.'
      });
    }
  });
  
  memoryOptimizer.on('request-restart', () => {
    console.error('💀 Memory critical - initiating graceful restart');
    
    // Notify all clients
    io.sockets.emit('system:restart-imminent', {
      message: 'Server will restart in 30 seconds due to memory pressure.'
    });
    
    // Start graceful shutdown
    setTimeout(() => {
      gracefulShutdown('memory-critical');
    }, 30000);
  });
  
  memoryOptimizer.on('memory-stats', (stats) => {
    // Emit memory stats to connected clients for monitoring
    if (stats.percentage > 75) {
      io.sockets.emit('system:memory-stats', stats);
    }
  });
  
  // Graceful shutdown handling
  const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    // Close Socket.IO server
    io.close(() => {
      console.log('🔌 Socket.IO server closed');
    });
    
    // Close all terminal sessions
    for (const [id, session] of terminalSessions.entries()) {
      try {
        session.destroy();
        console.log(`💻 Closed terminal session: ${id}`);
      } catch (error) {
        console.error(`❌ Error closing session ${id}:`, error.message);
      }
    }
    
    // Close HTTP server
    server.close((err) => {
      if (err) {
        console.error('❌ Error closing server:', err);
        process.exit(1);
      }
      console.log('🎯 Server closed successfully');
      process.exit(0);
    });
    
    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('⏰ Graceful shutdown timeout. Force exiting.');
      process.exit(1);
    }, 10000);
  };
  
  // Register shutdown handlers
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
  
  // Unhandled error handling
  process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    gracefulShutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't crash on unhandled promise rejections, just log them
  });
  
  // Start server
  server.listen(port, (err) => {
    if (err) throw err;
    
    if (isAlphaMode) {
      console.log('╔══════════════════════════════════════════════════╗');
      console.log('║          Coder1 IDE - Alpha Deployment           ║');
      console.log('╚══════════════════════════════════════════════════╝');
      console.log();
      console.log(`🚀 Server: http://${hostname}:${port}`);
      console.log(`📊 Mode: ${deploymentMode} (Alpha)`);
      console.log(`💾 Memory Limit: 400MB`);
      console.log(`👥 Max Users: ${maxAlphaUsers}`);
      console.log(`🔒 Invite Code: ${alphaInviteCode ? '✓ Set' : '⚠️ Not Set'}`);
      console.log();
      console.log('Features:');
      console.log('✅ Memory Optimizer Active');
      console.log('✅ Health Monitoring at /api/health');
      console.log('✅ Session Persistence');
      console.log(WebSocketEventBridge ? '✅ Claude CLI Puppeteer Ready' : '⚠️ CLI Puppeteer Unavailable');
      console.log();
      console.log(`Alpha Access URL: http://localhost:${port}/ide?invite=${alphaInviteCode || 'YOUR_CODE'}`);
    } else {
      console.log('🚀 Coder1 IDE - Unified Server Started');
      console.log('=====================================');
      console.log(`📍 Server: http://${hostname}:${port}`);
      console.log(`🔌 Socket.IO: ws://${hostname}:${port}`);
      console.log(`💻 Terminal: Integrated with PTY`);
      console.log(`🏠 Environment: ${dev ? 'Development' : 'Production'}`);
      console.log();
      console.log(`IDE Interface: http://localhost:${port}/ide`);
    }
    console.log('');
  });

// Helper functions for context capture integration
const initializeContextSession = async (terminalSessionId) => {
  try {
    const response = await fetch(`http://localhost:${port}/api/context/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: '/Users/michaelkraft/autonomous_vibe_interface',
        sessionId: terminalSessionId
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      contextSessions.set(terminalSessionId, data.sessionId);
      // REMOVED: // REMOVED: // REMOVED: console.log(`[Context] Linked terminal session ${terminalSessionId} to context session`);
      return data.sessionId;
    }
  } catch (error) {
    console.warn(`[Context] Failed to initialize context session:`, error.message);
  }
  return null;
};

const bufferTerminalData = (sessionId, type, content) => {
  if (!terminalDataBuffers.has(sessionId)) {
    terminalDataBuffers.set(sessionId, []);
  }
  
  const buffer = terminalDataBuffers.get(sessionId);
  buffer.push({
    timestamp: Date.now(),
    type,
    content,
    sessionId
  });
  
  // Keep buffer size manageable (last 100 chunks)
  if (buffer.length > 100) {
    buffer.splice(0, buffer.length - 100);
  }
};

const flushContextData = async (sessionId) => {
  const buffer = terminalDataBuffers.get(sessionId);
  if (!buffer || buffer.length === 0) return;
  
  try {
    const chunks = [...buffer]; // Copy buffer
    terminalDataBuffers.set(sessionId, []); // Clear buffer
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`http://localhost:${port}/api/context/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chunks,
        sessionId,
        projectPath: '/Users/michaelkraft/autonomous_vibe_interface'
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      // REMOVED: // REMOVED: // REMOVED: console.log(`[Context] Flushed ${chunks.length} terminal chunks, captured ${data.totalConversations || 0} conversations`);
    }
  } catch (error) {
    console.warn(`[Context] Failed to flush context data:`, error.message);
  }
};

// Periodically flush buffered terminal data with safeguards
let isFlushingContext = false;
setInterval(async () => {
  // Prevent concurrent flushes (safeguard against loops)
  if (isFlushingContext) {
    console.log('[Context] Skipping flush - previous flush still in progress');
    return;
  }
  
  isFlushingContext = true;
  
  try {
    for (const [sessionId] of terminalDataBuffers) {
      // Only flush if buffer has significant data
      const buffer = terminalDataBuffers.get(sessionId);
      if (buffer && buffer.length > 5) { // Only flush if we have more than 5 chunks
        await flushContextData(sessionId);
      }
    }
  } catch (error) {
    console.error('[Context] Error during flush:', error);
  } finally {
    isFlushingContext = false;
  }
}, 30000); // Flush every 30 seconds instead of 5 seconds
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    // REMOVED: // REMOVED: // REMOVED: console.log('[Server] SIGTERM received, shutting down gracefully...');
    
    // Clean up all terminal sessions
    for (const [id, session] of terminalSessions.entries()) {
      session.destroy();
    }
    terminalSessions.clear();
    
    // Close Socket.IO
    io.close(() => {
      // REMOVED: console.log('[Server] Socket.IO closed');
    });
    
    // Close HTTP server
    server.close(() => {
      // REMOVED: console.log('[Server] HTTP server closed');
      process.exit(0);
    });
  });
});

// Export for potential testing
module.exports = { terminalSessions, getOrCreateSession };