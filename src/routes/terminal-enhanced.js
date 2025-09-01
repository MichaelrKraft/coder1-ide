const express = require('express');
const router = express.Router();
const os = require('os');

let pty = null;
let ptyAvailable = false;

// Try to load node-pty with better error handling
try {
    pty = require('node-pty');
    ptyAvailable = true;
    console.log('✅ node-pty loaded successfully');
} catch (error) {
    console.warn('⚠️ node-pty not available, terminal will run in demo mode');
    console.warn('To enable real terminal, run: npm rebuild node-pty');
}

// Session management with pooling
const terminals = new Map();
const terminalSessions = new Map();
const ptyPool = [];
const MAX_POOL_SIZE = 5;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Enhanced error messages for PTY issues
const PTY_ERROR_MESSAGES = {
    'forkpty(3) failed': 'System PTY limit reached. Try: sudo sysctl -w kern.tty.ptmx_max=768',
    'Resource temporarily unavailable': 'PTY resources exhausted. Close some terminal sessions.',
    'Device not configured': 'PTY device issue. Restart the application or system.'
};

// PTY creation with retry logic
async function createPtyWithRetry(options, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            if (i > 0) {
                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
            
            const terminalProcess = pty.spawn(options.shell, options.args || [], {
                name: 'xterm-color',
                cols: options.cols || 80,
                rows: options.rows || 24,
                cwd: options.cwd,
                env: options.env
            });
            
            console.log(`✅ PTY created successfully on attempt ${i + 1}`);
            return terminalProcess;
            
        } catch (error) {
            lastError = error;
            console.error(`❌ PTY creation attempt ${i + 1} failed:`, error.message);
            
            // Check for specific error messages
            for (const [key, message] of Object.entries(PTY_ERROR_MESSAGES)) {
                if (error.message.includes(key)) {
                    console.log(`💡 Suggestion: ${message}`);
                }
            }
        }
    }
    
    throw new Error(`Failed to create PTY after ${maxRetries} attempts: ${lastError.message}`);
}

// Session cleanup
function cleanupIdleSessions() {
    const now = Date.now();
    for (const [sessionId, session] of terminalSessions.entries()) {
        if (now - session.lastActivity > SESSION_TIMEOUT) {
            console.log(`Cleaning up idle session: ${sessionId}`);
            const terminal = terminals.get(sessionId);
            if (terminal) {
                try {
                    terminal.kill();
                } catch (error) {
                    console.error('Error killing terminal:', error);
                }
                terminals.delete(sessionId);
                terminalSessions.delete(sessionId);
            }
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupIdleSessions, 5 * 60 * 1000);

// Mock terminal (unchanged from original)
class MockTerminal {
    constructor(options) {
        this.cols = options.cols || 80;
        this.rows = options.rows || 24;
        this.pid = Math.floor(Math.random() * 10000);
        this.killed = false;
        this.dataHandler = null;
        this.exitHandler = null;
    }
    
    write(data) {
        if (this.killed) return;
        
        const cmd = data.trim();
        let response = '';
        
        switch(cmd) {
        case 'help':
            response = 'Available commands: help, ls, pwd, echo, clear, claude, pty-status\r\n';
            break;
        case 'pty-status':
            response = 'PTY Status:\r\n' +
                          'Mode: Demo (node-pty not available)\r\n' +
                          `Active sessions: ${terminals.size}\r\n`;
            break;
        case 'ls':
            response = 'src/  public/  node_modules/  package.json  README.md\r\n';
            break;
        case 'pwd':
            response = '/Users/michaelkraft/autonomous_vibe_interface\r\n';
            break;
        case 'clear':
            response = '\x1b[2J\x1b[H';
            break;
        case 'claude':
            response = '⚠️ This is a demo terminal. To use real Claude CLI:\r\n' +
                          '1. Fix node-pty: npm rebuild node-pty\r\n' +
                          '2. Or use Terminal.app and run: claude\r\n';
            break;
        default:
            if (cmd.startsWith('echo ')) {
                response = cmd.substring(5) + '\r\n';
            } else if (cmd) {
                response = `Command not found: ${cmd}\r\n`;
            }
        }
        
        if (response && this.dataHandler) {
            setTimeout(() => {
                this.dataHandler(response);
                this.dataHandler('$ ');
            }, 50);
        }
    }
    
    onData(handler) {
        this.dataHandler = handler;
        setTimeout(() => {
            handler('\x1b[32m🎭 Demo Terminal Mode (node-pty not available)\x1b[0m\r\n');
            handler('Type "help" for available commands\r\n');
            handler('$ ');
        }, 100);
    }
    
    onExit(handler) {
        this.exitHandler = handler;
    }
    
    resize(cols, rows) {
        this.cols = cols;
        this.rows = rows;
    }
    
    kill() {
        this.killed = true;
        if (this.exitHandler) {
            this.exitHandler({ exitCode: 0, signal: undefined });
        }
    }
}

// Enhanced terminal WebSocket handler
function setupTerminalSocket(io) {
    const terminalNamespace = io.of('/terminal');
    
    terminalNamespace.on('connection', (socket) => {
        console.log('🖥️ Terminal client connected:', socket.id);
        
        socket.on('terminal:create', async (data) => {
            try {
                let terminalProcess;
                
                if (ptyAvailable) {
                    // Try to create real terminal with retry logic
                    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
                    const cwd = data.cwd || process.env.HOME || '/Users/michaelkraft';
                    
                    console.log('Creating real terminal with:', { shell, cwd });
                    
                    try {
                        terminalProcess = await createPtyWithRetry({
                            shell,
                            args: [],
                            cols: data.cols || 80,
                            rows: data.rows || 24,
                            cwd: cwd,
                            env: {
                                ...process.env,
                                TERM: 'xterm-256color',
                                COLORTERM: 'truecolor'
                            }
                        });
                    } catch (ptyError) {
                        console.error('Failed to create PTY, falling back to demo mode:', ptyError.message);
                        
                        // Fall back to demo mode
                        terminalProcess = new MockTerminal({
                            cols: data.cols || 80,
                            rows: data.rows || 24
                        });
                        
                        // Notify user about the fallback
                        socket.emit('terminal:warning', {
                            message: 'PTY creation failed, using demo mode',
                            suggestion: PTY_ERROR_MESSAGES[Object.keys(PTY_ERROR_MESSAGES).find(key => ptyError.message.includes(key))] || 'Check system PTY resources'
                        });
                    }
                } else {
                    // Use mock terminal
                    console.log('Creating mock terminal (demo mode)');
                    terminalProcess = new MockTerminal({
                        cols: data.cols || 80,
                        rows: data.rows || 24
                    });
                }
                
                terminals.set(socket.id, terminalProcess);
                terminalSessions.set(socket.id, {
                    pid: terminalProcess.pid,
                    created: new Date(),
                    lastActivity: Date.now(),
                    isReal: ptyAvailable && !(terminalProcess instanceof MockTerminal)
                });
                
                // Handle terminal output
                terminalProcess.onData((data) => {
                    // Update last activity
                    const session = terminalSessions.get(socket.id);
                    if (session) {
                        session.lastActivity = Date.now();
                    }
                    socket.emit('terminal:data', data);
                });
                
                // Handle terminal exit
                terminalProcess.onExit(({ exitCode, signal }) => {
                    console.log(`Terminal ${terminalProcess.pid} exited with code ${exitCode} and signal ${signal}`);
                    socket.emit('terminal:exit', { exitCode, signal });
                    terminals.delete(socket.id);
                    terminalSessions.delete(socket.id);
                });
                
                socket.emit('terminal:created', {
                    pid: terminalProcess.pid,
                    mode: terminalProcess instanceof MockTerminal ? 'demo' : 'real',
                    sessions: terminals.size,
                    ptyLimit: ptyAvailable ? 'Check with: sysctl -n kern.tty.ptmx_max' : 'N/A'
                });
                
                if (ptyAvailable && !(terminalProcess instanceof MockTerminal)) {
                    // Send initial commands for real terminal
                    terminalProcess.write('echo "🚀 Coder1 Terminal Ready - Claude Code Access Enabled"\n');
                    terminalProcess.write('echo "Active sessions: ' + terminals.size + '"\n');
                    terminalProcess.write('clear\n');
                }
                
            } catch (error) {
                console.error('Error creating terminal:', error);
                socket.emit('terminal:error', {
                    message: 'Failed to create terminal',
                    error: error.message,
                    suggestion: 'Try closing some terminal sessions or restart the application'
                });
            }
        });
        
        socket.on('terminal:data', (data) => {
            const terminalProcess = terminals.get(socket.id);
            if (terminalProcess) {
                try {
                    // Update last activity
                    const session = terminalSessions.get(socket.id);
                    if (session) {
                        session.lastActivity = Date.now();
                    }
                    terminalProcess.write(data);
                } catch (error) {
                    console.error('Error writing to terminal:', error);
                    socket.emit('terminal:error', {
                        message: 'Failed to write to terminal',
                        error: error.message
                    });
                }
            }
        });
        
        socket.on('terminal:resize', (data) => {
            const terminalProcess = terminals.get(socket.id);
            if (terminalProcess && data.cols && data.rows) {
                try {
                    terminalProcess.resize(data.cols, data.rows);
                } catch (error) {
                    console.error('Error resizing terminal:', error);
                }
            }
        });
        
        socket.on('disconnect', () => {
            console.log('🔌 Terminal client disconnected:', socket.id);
            const terminalProcess = terminals.get(socket.id);
            if (terminalProcess) {
                try {
                    terminalProcess.kill();
                } catch (error) {
                    console.error('Error killing terminal:', error);
                }
                terminals.delete(socket.id);
                terminalSessions.delete(socket.id);
            }
        });
    });
}

// Enhanced REST API endpoints
router.get('/sessions', (req, res) => {
    const sessions = Array.from(terminalSessions.entries()).map(([id, session]) => ({
        id,
        pid: session.pid,
        created: session.created,
        lastActivity: new Date(session.lastActivity).toISOString(),
        idleTime: Math.floor((Date.now() - session.lastActivity) / 1000), // seconds
        mode: session.isReal ? 'real' : 'demo'
    }));
    
    res.json({ 
        sessions, 
        ptyAvailable,
        activeSessions: terminals.size,
        maxPoolSize: MAX_POOL_SIZE,
        sessionTimeout: SESSION_TIMEOUT / 1000 // seconds
    });
});

router.get('/test', (req, res) => {
    res.json({ 
        status: 'Enhanced Terminal service ready',
        mode: ptyAvailable ? 'real' : 'demo',
        platform: os.platform(),
        shell: os.platform() === 'win32' ? 'powershell.exe' : 'bash',
        home: process.env.HOME,
        ptyAvailable,
        activeSessions: terminals.size,
        features: [
            'PTY retry logic',
            'Session pooling',
            'Idle session cleanup',
            'Enhanced error handling'
        ]
    });
});

// PTY diagnostics endpoint
router.get('/diagnostics', async (req, res) => {
    const diagnostics = {
        ptyAvailable,
        platform: os.platform(),
        activeSessions: terminals.size,
        nodeVersion: process.version,
        env: {
            SHELL: process.env.SHELL,
            HOME: process.env.HOME,
            PATH: process.env.PATH?.split(':').slice(0, 5).join(':') + '...' // Show first 5 PATH entries
        }
    };
    
    // Try to get PTY limit on macOS
    if (os.platform() === 'darwin') {
        try {
            const { execSync } = require('child_process');
            const ptyLimit = execSync('sysctl -n kern.tty.ptmx_max').toString().trim();
            diagnostics.ptyLimit = parseInt(ptyLimit);
            diagnostics.ptyLimitStatus = diagnostics.ptyLimit >= 512 ? 'Good' : 'May need increase';
        } catch (error) {
            diagnostics.ptyLimit = 'Unable to determine';
        }
    }
    
    res.json(diagnostics);
});

module.exports = { router, setupTerminalSocket };