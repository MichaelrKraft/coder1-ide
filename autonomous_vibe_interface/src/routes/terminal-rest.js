const express = require('express');
const pty = require('node-pty');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { addTerminalSession, removeTerminalSession, getTerminalSession } = require('./terminal-websocket');

const router = express.Router();

// Track additional metadata not stored in websocket module
const sessionMetadata = new Map();

// Create a new terminal session
router.post('/sessions', (req, res) => {
    try {
        const sessionId = uuidv4();
        // Use the user's preferred shell from environment, fallback to zsh on macOS
        let shell = process.env.SHELL || '/bin/zsh';
        if (os.platform() === 'win32') {
            shell = 'powershell.exe';
        }
        
        const cwd = req.body.cwd || process.env.HOME || '/Users/michaelkraft';
        
        console.log('[BACKEND] Creating terminal session:', { sessionId, shell, cwd });
        
        // Create PTY process
        const ptyOptions = {
            name: 'xterm-color',
            cols: req.body.cols || 80,
            rows: req.body.rows || 24,
            cwd: cwd,
            env: {
                ...process.env,
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor'
            }
        };
        
        console.log('[BACKEND] Creating PTY with options:', ptyOptions);
        
        let ptyProcess;
        try {
            // Start with simplest approach - use /bin/sh first
            console.log('[BACKEND] Attempting to spawn /bin/sh...');
            ptyProcess = pty.spawn('/bin/sh', [], {
                name: 'xterm-color',
                cols: req.body.cols || 80,
                rows: req.body.rows || 24,
                cwd: cwd,
                env: process.env // Use full environment
            });
            console.log('[BACKEND] PTY created with /bin/sh, PID:', ptyProcess.pid);
        } catch (shError) {
            console.error('[BACKEND] Failed to spawn /bin/sh:', shError);
            try {
                // Try with node-pty default settings
                console.log('[BACKEND] Attempting with default shell...');
                ptyProcess = pty.spawn(process.env.SHELL || '/bin/bash', [], {
                    name: 'xterm-color',
                    cols: req.body.cols || 80,
                    rows: req.body.rows || 24,
                    cwd: cwd
                });
                console.log('[BACKEND] PTY created with default shell, PID:', ptyProcess.pid);
            } catch (defaultError) {
                console.error('[BACKEND] All PTY spawn attempts failed:', defaultError);
                console.error('[BACKEND] Shell path tried:', shell);
                console.error('[BACKEND] CWD:', cwd);
                console.error('[BACKEND] Environment keys:', Object.keys(process.env).slice(0, 10));
                throw new Error(`Failed to create terminal process: ${defaultError.message}`);
            }
        }
        
        // Force echo on for the terminal
        setTimeout(() => {
            console.log('[BACKEND] Sending stty echo command to enable terminal echo');
            ptyProcess.write('stty echo\n');
        }, 100);
        
        // Add session to shared storage
        addTerminalSession(sessionId, ptyProcess);
        
        // Track additional metadata
        sessionMetadata.set(sessionId, {
            pid: ptyProcess.pid,
            created: new Date(),
            shell: shell
        });
        
        // PTY output handler will be attached in WebSocket connection
        // Store initial output until WebSocket connects
        let initialOutput = [];
        ptyProcess.onData((data) => {
            console.log('[BACKEND] PTY initial output for session', sessionId, ':', data.length, 'bytes');
            console.log('[BACKEND] PTY initial output preview:', data.substring(0, 50).replace(/\n/g, '\\n').replace(/\r/g, '\\r'));
            
            const session = getTerminalSession(sessionId);
            if (session) {
                session.output.push(data);
                // Keep only last 1000 output chunks
                if (session.output.length > 1000) {
                    session.output = session.output.slice(-1000);
                }
            }
        });
        
        // Handle PTY exit
        ptyProcess.onExit(({ exitCode, signal }) => {
            console.log(`[BACKEND] Terminal ${ptyProcess.pid} exited with code ${exitCode} and signal ${signal}`);
            removeTerminalSession(sessionId);
            sessionMetadata.delete(sessionId);
        });
        
        res.json({
            sessionId,
            pid: ptyProcess.pid,
            shell,
            cwd
        });
        
    } catch (error) {
        console.error('[BACKEND] Error creating terminal session:', error);
        res.status(500).json({
            error: 'Failed to create terminal session',
            message: error.message
        });
    }
});

// Write to terminal
router.post('/sessions/:sessionId/write', (req, res) => {
    const { sessionId } = req.params;
    const { data } = req.body;
    
    const session = getTerminalSession(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    try {
        session.pty.write(data);
        res.json({ success: true });
    } catch (error) {
        console.error('[BACKEND] Error writing to terminal:', error);
        res.status(500).json({ error: 'Failed to write to terminal' });
    }
});

// Get terminal output
router.get('/sessions/:sessionId/output', (req, res) => {
    const { sessionId } = req.params;
    
    const session = getTerminalSession(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    // Return output and clear buffer
    const output = session.output.join('');
    session.output = [];
    
    res.json({
        output,
        pid: session.pty.pid
    });
});

// List all sessions
router.get('/sessions', (req, res) => {
    const sessions = Array.from(sessionMetadata.entries()).map(([id, metadata]) => ({
        id,
        pid: metadata.pid,
        created: metadata.created,
        shell: metadata.shell
    }));
    
    res.json({ sessions });
});

// Close terminal session
router.delete('/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    const session = getTerminalSession(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    try {
        session.pty.kill();
        removeTerminalSession(sessionId);
        sessionMetadata.delete(sessionId);
        res.json({ success: true });
    } catch (error) {
        console.error('[BACKEND] Error closing terminal:', error);
        res.status(500).json({ error: 'Failed to close terminal' });
    }
});

// Test endpoint
router.get('/test', (req, res) => {
    res.json({
        status: 'Terminal REST API ready',
        platform: os.platform(),
        shell: os.platform() === 'win32' ? 'powershell.exe' : 'bash',
        home: process.env.HOME,
        claudeAvailable: !!process.env.PATH?.includes('claude')
    });
});

// Test PTY functionality
router.post('/test-pty', async (req, res) => {
    try {
        const testShell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        console.log('[TEST PTY] Creating test PTY with shell:', testShell);
        
        const testPty = pty.spawn(testShell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: process.env.HOME,
            env: process.env
        });
        
        console.log('[TEST PTY] Created with PID:', testPty.pid);
        
        let output = '';
        testPty.onData((data) => {
            console.log('[TEST PTY] Output received:', data);
            output += data;
        });
        
        // Send a simple echo command
        const testCommand = 'echo "PTY TEST OK"\n';
        console.log('[TEST PTY] Writing command:', testCommand);
        testPty.write(testCommand);
        
        // Wait for output
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Clean up
        testPty.kill();
        
        res.json({
            success: true,
            pid: testPty.pid,
            command: testCommand,
            output: output,
            outputLength: output.length
        });
        
    } catch (error) {
        console.error('[TEST PTY] Error:', error);
        res.status(500).json({
            error: 'PTY test failed',
            message: error.message
        });
    }
});

module.exports = router;