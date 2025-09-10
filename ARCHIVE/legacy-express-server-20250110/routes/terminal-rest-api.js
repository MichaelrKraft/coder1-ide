const express = require('express');
const router = express.Router();
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Import WebSocket session management
const { addTerminalSession, removeTerminalSession, getTerminalSession } = require('./terminal-websocket');

// Import node-pty if available
let pty = null;
try {
    pty = require('node-pty');
    console.log('[TERMINAL REST] node-pty loaded successfully');
} catch (error) {
    console.warn('[TERMINAL REST] node-pty not available for REST API');
}

// REST endpoint to create a terminal session
router.post('/sessions', (req, res) => {
    try {
        const { cols, rows, cwd } = req.body;
        
        if (!pty) {
            return res.status(503).json({ 
                error: 'Terminal service not available',
                message: 'node-pty is not loaded'
            });
        }
        
        // Generate a unique session ID
        const sessionId = uuidv4();
        
        // Create a real PTY session with proper fallback mechanism
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        const workingDir = cwd || process.env.HOME || '/Users/michaelkraft';
        
        console.log(`[TERMINAL REST] Creating PTY session ${sessionId} with shell ${shell} in ${workingDir}`);
        
        let terminalProcess;
        try {
            // Try bash with interactive flag first (critical for macOS)
            console.log('[TERMINAL REST] Attempting to spawn bash -i...');
            terminalProcess = pty.spawn('bash', ['-i'], {
                name: 'xterm-color',
                cols: cols || 80,
                rows: rows || 24,
                cwd: workingDir,
                env: {
                    ...process.env,
                    TERM: 'xterm-256color',
                    COLORTERM: 'truecolor'
                }
            });
            console.log(`[TERMINAL REST] PTY created with bash -i, PID: ${terminalProcess.pid}`);
        } catch (bashError) {
            console.error('[TERMINAL REST] Failed to spawn bash -i:', bashError);
            try {
                // Fallback to /bin/sh
                console.log('[TERMINAL REST] Attempting fallback to /bin/sh...');
                terminalProcess = pty.spawn('/bin/sh', [], {
                    name: 'xterm-color',
                    cols: cols || 80,
                    rows: rows || 24,
                    cwd: workingDir,
                    env: process.env
                });
                console.log(`[TERMINAL REST] PTY created with /bin/sh, PID: ${terminalProcess.pid}`);
            } catch (shError) {
                console.error('[TERMINAL REST] Failed to spawn /bin/sh:', shError);
                throw new Error(`Failed to create terminal process: ${shError.message}`);
            }
        }
        
        console.log(`[TERMINAL REST] PTY created with PID ${terminalProcess.pid}`);
        
        // CRITICAL FIX: Force echo on for the terminal (macOS bash has echo disabled by default)
        setTimeout(() => {
            console.log('[TERMINAL REST] Sending stty echo command to enable terminal echo');
            terminalProcess.write('stty echo\n');
        }, 100);
        
        // Register the session with WebSocket handler
        addTerminalSession(sessionId, terminalProcess);
        
        // Store initial output until WebSocket connects
        const outputHandler = (data) => {
            console.log('[TERMINAL REST] PTY output received:', data.length, 'bytes');
            console.log('[TERMINAL REST] PTY output preview:', data.substring(0, 50));
            
            const session = getTerminalSession(sessionId);
            if (session && session.output) {
                session.output.push(data);
                // Keep only last 1000 output chunks
                if (session.output.length > 1000) {
                    session.output = session.output.slice(-1000);
                }
            }
        };
        
        // Attach output handler
        terminalProcess.onData(outputHandler);
        
        // Handle PTY exit
        terminalProcess.onExit(({ exitCode, signal }) => {
            console.log(`[TERMINAL REST] Terminal ${sessionId} exited with code ${exitCode}, signal ${signal}`);
            removeTerminalSession(sessionId);
        });
        
        // Send success response
        res.json({
            sessionId,
            pid: terminalProcess.pid,
            shell: shell,
            cwd: workingDir
        });
        
        console.log(`[TERMINAL REST] Session ${sessionId} created successfully`);
        
    } catch (error) {
        console.error('[TERMINAL REST] Error creating terminal session:', error);
        res.status(500).json({ 
            error: 'Failed to create terminal session',
            message: error.message 
        });
    }
});

// Get session info (for debugging)
router.get('/sessions/:id', (req, res) => {
    const { getTerminalSession } = require('./terminal-websocket');
    const session = getTerminalSession(req.params.id);
    
    if (session) {
        res.json({
            id: session.id,
            hasPty: !!session.pty,
            hasWebSocket: !!session.ws,
            outputBufferSize: session.output.length
        });
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

module.exports = {
    router
};