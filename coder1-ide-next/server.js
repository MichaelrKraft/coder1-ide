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
      
      this.pty = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: finalWorkingDir,
        env: {
          ...process.env,
          CODER1_IDE: 'true',
          TERMINAL_SESSION_ID: id
        }
      });
      
      console.log(`[Terminal] PTY session ${id} created successfully with PID: ${this.pty.pid}`);
      
      // Set a cleaner prompt after terminal starts (overrides .bashrc)
      const isProduction = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production' || process.env.PORT === '10000';
      if (isProduction) {
        setTimeout(() => {
          // Export a cleaner PS1 prompt
          this.pty.write('export PS1="\\[\\033[01;32m\\]coder1\\[\\033[00m\\]:\\[\\033[01;34m\\]\\W\\[\\033[00m\\]$ "\r');
          // Clear the screen to remove the ugly default prompt
          this.pty.write('clear\r');
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
    
    // Set up PTY event handlers
    session.pty.onData((data) => {
      // Will emit to socket clients in WebSocket setup
      session.lastData = data;
    });
    
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
  const health = {
    status: stats.status,
    uptime: Date.now() - (global.serverStartTime || Date.now()),
    memory: {
      used: stats.heapUsedMB,
      limit: 400,
      percentage: stats.percentage
    },
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
    
    // Enhanced error handling and CSS serving fallback
    const handleWithFallback = async () => {
      try {
        // CSS serving monitoring - DISABLED: This was breaking Next.js image preloading
        // The query parameter stripping caused resource.src undefined errors
        // if (pathname?.startsWith('/_next/static/css/') || pathname?.startsWith('/_next/static/js/')) {
        //   // Strip version query parameters that break asset serving
        //   const cleanUrl = req.url.split('?')[0];
        //   const cleanParsedUrl = parse(cleanUrl, true);
        //   
        //   // Log CSS/JS asset requests for monitoring
        //   const startTime = Date.now();
        //   
        //   // Set proper headers for static assets
        //   if (pathname.endsWith('.css') || cleanUrl.endsWith('.css')) {
        //     res.setHeader('Content-Type', 'text/css');
        //     res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        //   } else if (pathname.endsWith('.js') || cleanUrl.endsWith('.js')) {
        //     res.setHeader('Content-Type', 'application/javascript');
        //     res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        //   }
        //   
        //   // Handle request with cleaned URL to fix version query parameter issue
        //   await handle(req, res, cleanParsedUrl);
        //   
        //   const duration = Date.now() - startTime;
        //   if (duration > 1000) {
        //     console.warn(`⚠️ Slow asset serving: ${pathname} took ${duration}ms`);
        //   }
        //   
        // } else {
        //   // Handle all other requests normally
        //   await handle(req, res, parsedUrl);
        // }
        
        // Let Next.js handle all requests normally without modification
        await handle(req, res, parsedUrl);
        
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
  
  // Initialize Socket.IO with authentication middleware
  const io = new Server(server, {
    cors: {
      origin: [
        `http://localhost:${port}`,
        'http://localhost:3000',
        'http://localhost:3001'
      ],
      credentials: true
    },
    path: '/socket.io/'
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

  // Make Socket.IO server available globally for Express routes compatibility
  global.io = io;
  
  // Socket.IO connection handling
  io.on('connection', (socket) => {
    // REMOVED: // REMOVED: // REMOVED: console.log(`[Socket.IO] Client connected: ${socket.id}`);
    
    let currentSessionId = null;
    
    // Handle terminal creation
    socket.on('terminal:create', async (data) => {
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
        session.pty.onData((data) => {
          // Forward to client
          socket.emit('terminal:data', { id: sessionId, data });
          // Buffer for context capture
          bufferTerminalData(sessionId, 'terminal_output', data);
        });
        
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
    
    // Track command buffer per session
    const commandBuffers = new Map();
    
    // Handle terminal input
    socket.on('terminal:input', ({ id, data }) => {
      const sessionId = id || currentSessionId;
      const session = terminalSessions.get(sessionId);
      if (session) {
        // Write the user input to terminal
        session.write(data);
        
        // Build up command buffer
        if (!commandBuffers.has(sessionId)) {
          commandBuffers.set(sessionId, '');
        }
        
        let buffer = commandBuffers.get(sessionId);
        buffer += data;
        
        // Check if Enter was pressed (command complete)
        if (data.includes('\r') || data.includes('\n')) {
          const command = buffer.trim().toLowerCase();
          console.log('[Terminal] Command completed:', command);
          
          // Check if user typed 'claude'
          if (command === 'claude' || command.startsWith('claude ')) {
            console.log('[Terminal] Claude command detected, showing help message');
            // Show help message after a short delay (after "command not found" appears)
            setTimeout(() => {
              const helpMessage = [
                '\r\n',
                '╔═══════════════════════════════════════════════════════════════════╗\r\n',
                '║                    🤖 Claude Bridge Required                       ║\r\n',
                '╠═══════════════════════════════════════════════════════════════════╣\r\n',
                '║                                                                     ║\r\n',
                '║  Claude CLI runs on your local machine, not the cloud server.     ║\r\n',
                '║                                                                     ║\r\n',
                '║  To use Claude with Coder1 IDE:                                   ║\r\n',
                '║                                                                     ║\r\n',
                '║  1. Visit https://coder1-ide-alpha-v2.onrender.com/alpha          ║\r\n',
                '║  2. Download the Coder1 Bridge for your OS                        ║\r\n',
                '║  3. Run the Bridge on your local machine                          ║\r\n',
                '║  4. Your local Claude CLI will connect to this IDE!               ║\r\n',
                '║                                                                     ║\r\n',
                '╚═══════════════════════════════════════════════════════════════════╝\r\n',
                '\r\n'
              ].join('');
              
              socket.emit('terminal:data', { 
                id: sessionId, 
                data: helpMessage 
              });
            }, 500); // Wait for "command not found" to appear first
          }
          
          // Clear buffer after command
          commandBuffers.set(sessionId, '');
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
    
    // Clean up on disconnect
    socket.on('disconnect', () => {
      // REMOVED: // REMOVED: // REMOVED: console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      
      // Note: We keep terminal session alive for reconnection
      // Sessions are only destroyed explicitly or on timeout
    });
  });
  
  // Session cleanup (remove inactive sessions after 1 hour)
  setInterval(() => {
    const now = Date.now();
    const timeout = 60 * 60 * 1000; // 1 hour
    
    for (const [id, session] of terminalSessions.entries()) {
      if (now - session.lastActivity.getTime() > timeout) {
        // REMOVED: // REMOVED: // REMOVED: console.log(`[Terminal] Cleaning up inactive session: ${id}`);
        session.destroy();
        terminalSessions.delete(id);
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
  
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