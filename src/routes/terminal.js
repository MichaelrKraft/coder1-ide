const express = require('express');
const pty = require('node-pty');
const os = require('os');

const router = express.Router();
const terminals = new Map();
const terminalSessions = new Map();

// Terminal WebSocket handler
function setupTerminalSocket(io) {
    const terminalNamespace = io.of('/terminal');
    
    terminalNamespace.on('connection', (socket) => {
        console.log('🖥️ Terminal client connected:', socket.id);
        
        socket.on('terminal:create', (data) => {
            try {
                const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
                const cwd = data.cwd || process.env.HOME || '/Users/michaelkraft';
                
                console.log('Creating terminal with:', { shell, cwd });
                
                // Create PTY process
                const ptyProcess = pty.spawn(shell, [], {
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
                
                terminals.set(socket.id, ptyProcess);
                terminalSessions.set(socket.id, {
                    pid: ptyProcess.pid,
                    created: new Date(),
                    shell: shell
                });
                
                // Handle PTY output
                ptyProcess.onData((data) => {
                    socket.emit('terminal:data', data);
                });
                
                // Handle PTY exit
                ptyProcess.onExit(({ exitCode, signal }) => {
                    console.log(`Terminal ${ptyProcess.pid} exited with code ${exitCode} and signal ${signal}`);
                    socket.emit('terminal:exit', { exitCode, signal });
                    terminals.delete(socket.id);
                    terminalSessions.delete(socket.id);
                });
                
                socket.emit('terminal:created', {
                    pid: ptyProcess.pid,
                    shell: shell
                });
                
                // Send initial prompt
                ptyProcess.write('echo "🚀 Coder1 Terminal Ready - Claude Code Access Enabled"\n');
                ptyProcess.write('echo "Type \\"claude\\" to use Claude Code CLI"\n');
                ptyProcess.write('clear\n');
                
            } catch (error) {
                console.error('Error creating terminal:', error);
                socket.emit('terminal:error', {
                    message: 'Failed to create terminal',
                    error: error.message
                });
            }
        });
        
        socket.on('terminal:data', (data) => {
            const ptyProcess = terminals.get(socket.id);
            if (ptyProcess) {
                try {
                    ptyProcess.write(data);
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
            const ptyProcess = terminals.get(socket.id);
            if (ptyProcess && data.cols && data.rows) {
                try {
                    ptyProcess.resize(data.cols, data.rows);
                } catch (error) {
                    console.error('Error resizing terminal:', error);
                }
            }
        });
        
        socket.on('disconnect', () => {
            console.log('🔌 Terminal client disconnected:', socket.id);
            const ptyProcess = terminals.get(socket.id);
            if (ptyProcess) {
                try {
                    ptyProcess.kill();
                } catch (error) {
                    console.error('Error killing terminal:', error);
                }
                terminals.delete(socket.id);
                terminalSessions.delete(socket.id);
            }
        });
    });
    
    // Cleanup dead terminals periodically
    setInterval(() => {
        for (const [socketId, session] of terminalSessions.entries()) {
            const age = Date.now() - session.created.getTime();
            if (age > 3600000) { // 1 hour
                const ptyProcess = terminals.get(socketId);
                if (ptyProcess) {
                    try {
                        ptyProcess.kill();
                    } catch (error) {
                        // Already dead
                    }
                }
                terminals.delete(socketId);
                terminalSessions.delete(socketId);
            }
        }
    }, 300000); // Every 5 minutes
}

// REST API endpoints for terminal info
router.get('/sessions', (req, res) => {
    const sessions = Array.from(terminalSessions.entries()).map(([id, session]) => ({
        id,
        pid: session.pid,
        created: session.created,
        shell: session.shell
    }));
    res.json({ sessions });
});

router.get('/test', (req, res) => {
    res.json({ 
        status: 'Terminal service ready',
        platform: os.platform(),
        shell: os.platform() === 'win32' ? 'powershell.exe' : 'bash',
        home: process.env.HOME
    });
});

module.exports = { router, setupTerminalSocket };