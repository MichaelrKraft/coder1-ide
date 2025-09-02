const express = require('express');
const router = express.Router();

let pty = null;
let ptyAvailable = false;

// Try to load node-pty, but don't fail if it's not available
try {
    pty = require('node-pty');
    ptyAvailable = true;
    console.log('✅ node-pty loaded successfully');
} catch (error) {
    console.warn('⚠️ node-pty not available, terminal will run in demo mode');
    console.warn('To enable real terminal, run: npm rebuild node-pty');
}

const os = require('os');
const terminals = new Map();
const terminalSessions = new Map();

// Import ErrorPatternMemory for capturing error→fix patterns
const { ErrorPatternMemory } = require('../services/memory/ErrorPatternMemory');
const errorMemory = ErrorPatternMemory.getInstance();

// Track terminal context for error capturing
const terminalContext = new Map();

// Mock terminal for when node-pty isn't available
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
        
        // Simple command handling for demo
        const cmd = data.trim();
        let response = '';
        
        switch(cmd) {
        case 'help':
            response = 'Available commands: help, ls, pwd, echo, clear, claude\r\n';
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
        // Send initial prompt
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

// Terminal WebSocket handler
function setupTerminalSocket(io) {
    const terminalNamespace = io.of('/terminal');
    
    terminalNamespace.on('connection', (socket) => {
        console.log('🖥️ Terminal client connected:', socket.id);
        
        socket.on('terminal:create', (data) => {
            try {
                let terminalProcess;
                
                if (ptyAvailable) {
                    // Use real terminal
                    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
                    const cwd = data.cwd || process.env.HOME || '/Users/michaelkraft';
                    
                    console.log('Creating real terminal with:', { shell, cwd });
                    
                    terminalProcess = pty.spawn(shell, [], {
                        name: 'xterm-color',
                        cols: data.cols || 80,
                        rows: data.rows || 24,
                        cwd: cwd,
                        env: {
                            ...process.env,
                            TERM: 'xterm-256color',
                            COLORTERM: 'truecolor'
                        }
                    });
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
                    isReal: ptyAvailable
                });
                
                // Initialize context for this terminal
                terminalContext.set(socket.id, {
                    lastCommands: [],
                    workingDirectory: data.cwd || process.env.HOME,
                    sessionId: socket.id,
                    currentErrorId: null,
                    outputBuffer: ''
                });
                
                // Handle terminal output with error detection
                terminalProcess.onData(async (outputData) => {
                    socket.emit('terminal:data', outputData);
                    
                    // Analyze output for errors
                    const context = terminalContext.get(socket.id) || {};
                    context.outputBuffer = (context.outputBuffer + outputData).slice(-1000); // Keep last 1000 chars
                    
                    // Detect common error patterns
                    const errorPatterns = [
                        /command not found/i,
                        /permission denied/i,
                        /cannot find module/i,
                        /syntaxerror/i,
                        /typeerror/i,
                        /referenceerror/i,
                        /ENOENT/i,
                        /EACCES/i,
                        /Error:/i,
                        /failed/i,
                        /unable to/i
                    ];
                    
                    const hasError = errorPatterns.some(pattern => pattern.test(outputData));
                    
                    if (hasError) {
                        // Capture the error
                        const result = await errorMemory.captureError(outputData, {
                            lastCommands: context.lastCommands,
                            workingDirectory: context.workingDirectory,
                            sessionId: socket.id
                        });
                        
                        if (result.matched && result.pattern && result.pattern.solution) {
                            // Found a matching pattern with solution!
                            const suggestion = '\n\x1b[33m💡 Memory: This looks similar to a previous error.\x1b[0m\n' +
                                            `\x1b[32mPrevious fix: ${result.pattern.solution.fix}\x1b[0m\n`;
                            
                            // Send suggestion to terminal
                            setTimeout(() => {
                                socket.emit('terminal:data', suggestion);
                            }, 100);
                            
                            console.log(`✨ Error pattern matched with confidence: ${result.confidence}`);
                        } else if (!result.matched) {
                            // New error, store ID for potential fix capture
                            context.currentErrorId = result.errorId;
                            terminalContext.set(socket.id, context);
                        }
                    } else if (context.currentErrorId && outputData.length > 2) {
                        // Check if this might be a fix for the recent error
                        // Simple heuristic: if no error in output and it's substantial, might be a fix
                        const possibleFix = context.outputBuffer;
                        
                        // Don't capture prompts or empty output as fixes
                        if (possibleFix.length > 10 && !possibleFix.match(/^\$|^>/)) {
                            await errorMemory.captureFix(possibleFix, context.currentErrorId, {
                                sessionId: socket.id
                            });
                            context.currentErrorId = null;
                            terminalContext.set(socket.id, context);
                        }
                    }
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
                    mode: ptyAvailable ? 'real' : 'demo'
                });
                
                if (ptyAvailable) {
                    // Send initial commands for real terminal
                    terminalProcess.write('echo "🚀 Coder1 Terminal Ready - Claude Code Access Enabled"\n');
                    terminalProcess.write('clear\n');
                }
                
            } catch (error) {
                console.error('Error creating terminal:', error);
                socket.emit('terminal:error', {
                    message: 'Failed to create terminal',
                    error: error.message
                });
            }
        });
        
        socket.on('terminal:data', (data) => {
            const terminalProcess = terminals.get(socket.id);
            if (terminalProcess) {
                try {
                    // Track commands for context
                    const context = terminalContext.get(socket.id);
                    if (context && data.includes('\r')) {
                        // User pressed enter, likely a command
                        const command = data.replace(/\r|\n/g, '').trim();
                        if (command) {
                            context.lastCommands.push(command);
                            // Keep only last 10 commands
                            if (context.lastCommands.length > 10) {
                                context.lastCommands.shift();
                            }
                            terminalContext.set(socket.id, context);
                        }
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
                terminalContext.delete(socket.id); // Clean up context
            }
        });
    });
}

// REST API endpoints
router.get('/sessions', (req, res) => {
    const sessions = Array.from(terminalSessions.entries()).map(([id, session]) => ({
        id,
        pid: session.pid,
        created: session.created,
        mode: session.isReal ? 'real' : 'demo'
    }));
    res.json({ sessions, ptyAvailable });
});

router.get('/test', (req, res) => {
    res.json({ 
        status: 'Terminal service ready',
        mode: ptyAvailable ? 'real' : 'demo',
        platform: os.platform(),
        shell: os.platform() === 'win32' ? 'powershell.exe' : 'bash',
        home: process.env.HOME,
        ptyAvailable
    });
});

module.exports = { router, setupTerminalSocket };