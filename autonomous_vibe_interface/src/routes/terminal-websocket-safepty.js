// SafePTYManager Integration for Main Server
// Replaces terminal-websocket.js with Socket.IO compatible implementation

const os = require('os');

// SafePTYManager - Production-ready PTY session management
class SafePTYManager {
    constructor() {
        this.sessions = new Map();
        this.sessionCount = 0;
        this.maxSessions = 5;
        this.lastSessionCreation = 0;
        this.minSessionInterval = 1000; // 1 second rate limit
        this.telemetry = {
            sessionsCreated: 0,
            sessionsDestroyed: 0,
            rateLimitHits: 0,
            errors: 0
        };
        
        console.log('[SafePTYManager] Initialized with rate limiting and session management');
    }
    
    // Rate limiting to prevent PTY exhaustion
    canCreateSession() {
        const now = Date.now();
        const timeSinceLastCreation = now - this.lastSessionCreation;
        
        if (timeSinceLastCreation < this.minSessionInterval) {
            this.telemetry.rateLimitHits++;
            return false;
        }
        
        if (this.sessionCount >= this.maxSessions) {
            this.telemetry.rateLimitHits++;
            return false;
        }
        
        return true;
    }
    
    // Create new PTY session with Claude Code detection
    createSession(socketId, options = {}) {
        if (!this.canCreateSession()) {
            throw new Error(`Rate limited: Max ${this.maxSessions} sessions, min ${this.minSessionInterval}ms interval`);
        }
        
        try {
            let pty;
            try {
                pty = require('node-pty');
            } catch (error) {
                throw new Error('node-pty not available - terminal features disabled');
            }
            
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
            const cwd = options.cwd || process.env.HOME;
            
            // Enhanced environment for Claude Code CLI
            const env = {
                ...process.env,
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor',
                // Ensure Claude Code CLI is in PATH
                PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
                // Claude-specific optimizations
                CLAUDE_CLI_MODE: '1',
                CLAUDE_TERMINAL_INTEGRATION: '1'
            };
            
            console.log(`[SafePTYManager] Creating session: ${sessionId}`);
            console.log(`[SafePTYManager] Shell: ${shell}, CWD: ${cwd}`);
            
            const ptyProcess = pty.spawn(shell, ['-l'], {
                name: 'xterm-256color',
                cols: options.cols || 80,
                rows: options.rows || 24,
                cwd: cwd,
                env: env
            });
            
            const session = {
                id: sessionId,
                process: ptyProcess,
                socketId: socketId,
                createdAt: Date.now(),
                claudeDetected: false,
                commandHistory: []
            };
            
            // Claude Code CLI detection
            ptyProcess.onData((data) => {
                // Look for Claude Code CLI prompts or responses
                if (data.includes('claude') && (data.includes('>', '<') || data.includes('$'))) {
                    if (!session.claudeDetected) {
                        session.claudeDetected = true;
                        console.log(`[SafePTYManager] Claude Code CLI detected in session ${sessionId}`);
                    }
                }
            });
            
            // Store session
            this.sessions.set(sessionId, session);
            this.sessionCount++;
            this.lastSessionCreation = Date.now();
            this.telemetry.sessionsCreated++;
            
            console.log(`[SafePTYManager] Session created: ${sessionId} (${this.sessionCount}/${this.maxSessions})`);
            
            return session;
            
        } catch (error) {
            this.telemetry.errors++;
            console.error('[SafePTYManager] Session creation failed:', error);
            throw error;
        }
    }
    
    // Get session by ID
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    
    // Destroy session and cleanup
    destroySession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            try {
                session.process.kill();
                this.sessions.delete(sessionId);
                this.sessionCount--;
                this.telemetry.sessionsDestroyed++;
                console.log(`[SafePTYManager] Session destroyed: ${sessionId} (${this.sessionCount}/${this.maxSessions})`);
            } catch (error) {
                console.error(`[SafePTYManager] Error destroying session ${sessionId}:`, error);
            }
        }
    }
    
    // Get telemetry data
    getTelemetry() {
        return {
            ...this.telemetry,
            activeSessions: this.sessionCount,
            maxSessions: this.maxSessions,
            rateLimitEffectiveness: this.telemetry.rateLimitHits / (this.telemetry.sessionsCreated + this.telemetry.rateLimitHits)
        };
    }
    
    // Cleanup disconnected sessions
    cleanup() {
        for (const [sessionId, session] of this.sessions) {
            const age = Date.now() - session.createdAt;
            if (age > 3600000) { // 1 hour timeout
                console.log(`[SafePTYManager] Cleaning up old session: ${sessionId}`);
                this.destroySession(sessionId);
            }
        }
    }
}

// Global SafePTYManager instance
const safeptyManager = new SafePTYManager();

// Socket.IO terminal integration (compatible with frontend)
function setupTerminalWebSocket(io) {
    console.log('[SafePTYManager] Setting up Socket.IO terminal integration...');
    
    io.on('connection', (socket) => {
        console.log(`[SafePTYManager] Client connected: ${socket.id}`);
        
        // Handle terminal creation requests
        socket.on('terminal:create', (options = {}) => {
            try {
                const session = safeptyManager.createSession(socket.id, options);
                
                // Send success response
                socket.emit('terminal:created', {
                    id: session.id,
                    pid: session.process.pid
                });
                
                // Forward terminal output to client
                session.process.onData((data) => {
                    socket.emit('terminal:data', {
                        id: session.id,
                        data: data
                    });
                });
                
                // Handle terminal exit
                session.process.onExit((exitCode, signal) => {
                    console.log(`[SafePTYManager] Session ${session.id} exited: code=${exitCode}, signal=${signal}`);
                    socket.emit('terminal:exit', {
                        id: session.id,
                        exitCode: exitCode,
                        signal: signal
                    });
                    safeptyManager.destroySession(session.id);
                });
                
            } catch (error) {
                console.error('[SafePTYManager] Terminal creation error:', error);
                socket.emit('terminal:error', {
                    message: error.message
                });
            }
        });
        
        // Handle terminal input
        socket.on('terminal:data', ({ id, data }) => {
            const session = safeptyManager.getSession(id);
            if (session && session.process) {
                session.process.write(data);
                
                // Track command history for Claude detection
                if (data.includes('\r') || data.includes('\n')) {
                    session.commandHistory.push(data.trim());
                    if (session.commandHistory.length > 100) {
                        session.commandHistory = session.commandHistory.slice(-50);
                    }
                }
            } else {
                socket.emit('terminal:error', {
                    message: `Terminal session ${id} not found`
                });
            }
        });
        
        // Handle terminal resize with debouncing to prevent ResizeObserver loops
        const resizeTimeouts = new Map();
        socket.on('terminal:resize', ({ id, cols, rows }) => {
            const session = safeptyManager.getSession(id);
            if (session && session.process) {
                // Clear previous resize timeout
                if (resizeTimeouts.has(id)) {
                    clearTimeout(resizeTimeouts.get(id));
                }
                
                // Debounce resize events to prevent loops
                const timeout = setTimeout(() => {
                    try {
                        session.process.resize(cols, rows);
                        console.log(`[SafePTYManager] Terminal ${id} resized to ${cols}x${rows}`);
                    } catch (error) {
                        console.error(`[SafePTYManager] Resize error for ${id}:`, error);
                    } finally {
                        resizeTimeouts.delete(id);
                    }
                }, 100); // 100ms debounce
                
                resizeTimeouts.set(id, timeout);
            }
        });
        
        // Handle client disconnect
        socket.on('disconnect', () => {
            console.log(`[SafePTYManager] Client disconnected: ${socket.id}`);
            
            // Clean up sessions for this socket
            for (const [sessionId, session] of safeptyManager.sessions) {
                if (session.socketId === socket.id) {
                    safeptyManager.destroySession(sessionId);
                }
            }
        });
    });
    
    // Periodic cleanup
    setInterval(() => {
        safeptyManager.cleanup();
    }, 300000); // 5 minutes
    
    console.log('[SafePTYManager] Socket.IO terminal integration ready');
}

// Export telemetry endpoint
function getTerminalTelemetry() {
    return safeptyManager.getTelemetry();
}

module.exports = {
    setupTerminalWebSocket,
    getTerminalTelemetry
};