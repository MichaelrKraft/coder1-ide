const pty = require('node-pty');
const os = require('os');
const { EnhancedTerminalCommands } = require('../integrations/enhanced-terminal-commands');

// Store terminal sessions by sessionId
const terminalSessions = new Map();

// Initialize enhanced terminal commands
const enhancedCommands = new EnhancedTerminalCommands();

// WebSocket handler for terminal connections
function setupTerminalWebSocket(server) {
    const WebSocket = require('ws');
    const wss = new WebSocket.Server({ noServer: true });
    
    // Handle upgrade requests for /terminal/:sessionId pattern
    server.on('upgrade', (request, socket, head) => {
        const match = request.url.match(/^\/terminal\/([a-f0-9-]+)$/);
        
        if (!match) {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
        }
        
        const sessionId = match[1];
        console.log('[TERMINAL WS] Upgrade request for session:', sessionId);
        
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request, sessionId);
        });
    });
    
    wss.on('connection', (ws, request, sessionId) => {
        console.log('[TERMINAL WS] New connection for session:', sessionId);
        
        // Get the existing terminal session created by REST API
        const session = terminalSessions.get(sessionId);
        
        if (!session) {
            console.error('[TERMINAL WS] Session not found:', sessionId);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Terminal session not found'
            }));
            ws.close();
            return;
        }
        
        // Store WebSocket reference
        session.ws = ws;
        
        // Send existing output if any
        if (session.output.length > 0) {
            ws.send(JSON.stringify({
                type: 'output',
                data: session.output.join('')
            }));
        }
        
        // Handle PTY output
        const outputHandler = (data) => {
            console.log('[TERMINAL WS] PTY output received:', data.length, 'bytes');
            console.log('[TERMINAL WS] PTY output preview:', data.substring(0, 50));
            console.log('[TERMINAL WS] WebSocket readyState:', ws.readyState, '(1=OPEN)');
            
            if (ws.readyState === WebSocket.OPEN) {
                const message = JSON.stringify({
                    type: 'output',
                    data: data
                });
                console.log('[TERMINAL WS] Sending output to frontend, message length:', message.length);
                ws.send(message);
            } else {
                console.error('[TERMINAL WS] Cannot send output, WebSocket not open');
            }
        };
        
        session.pty.onData(outputHandler);
        
        // Handle WebSocket messages
        ws.on('message', (message) => {
            try {
                console.log('[TERMINAL WS] Raw message received:', message);
                const msg = JSON.parse(message);
                console.log('[TERMINAL WS] Parsed message:', msg);
                
                if (msg.type === 'input') {
                    console.log('[TERMINAL WS] Input data:', msg.data);
                    console.log('[TERMINAL WS] Input char codes:', msg.data.split('').map(c => c.charCodeAt(0)));
                    console.log('[TERMINAL WS] Session PTY exists:', !!session.pty);
                    console.log('[TERMINAL WS] PTY pid:', session.pty.pid);
                    
                    // Check if this is an Enter key press (carriage return)
                    if (msg.data === '\r') {
                        // Check if the current line buffer contains an enhanced command
                        const currentLine = session.lineBuffer || '';
                        console.log('[TERMINAL WS] Checking command:', currentLine);
                        
                        if (enhancedCommands.isEnhancedCommand(currentLine)) {
                            console.log('[TERMINAL WS] Enhanced command detected:', currentLine);
                            
                            // Handle enhanced command
                            enhancedCommands.executeEnhancedCommand(currentLine, session.pty)
                                .then(handled => {
                                    if (handled) {
                                        console.log('[TERMINAL WS] Enhanced command handled successfully');
                                        // Clear line buffer
                                        session.lineBuffer = '';
                                        // Send new prompt
                                        session.pty.write('\r\n$ ');
                                    } else {
                                        // Fallback to normal PTY handling
                                        session.pty.write(msg.data);
                                    }
                                })
                                .catch(error => {
                                    console.error('[TERMINAL WS] Enhanced command error:', error);
                                    // Fallback to normal PTY handling
                                    session.pty.write(msg.data);
                                });
                            
                            // Clear line buffer after processing
                            session.lineBuffer = '';
                            return;
                        } else {
                            // Regular command, clear buffer and pass through
                            session.lineBuffer = '';
                        }
                    } else if (msg.data === '\x7f' || msg.data === '\b') {
                        // Backspace - remove last character from buffer
                        if (session.lineBuffer && session.lineBuffer.length > 0) {
                            session.lineBuffer = session.lineBuffer.slice(0, -1);
                        }
                    } else if (msg.data.charCodeAt(0) >= 32 && msg.data.charCodeAt(0) <= 126) {
                        // Printable character - add to buffer
                        session.lineBuffer = (session.lineBuffer || '') + msg.data;
                    }
                    
                    // Try to write to PTY (normal flow)
                    try {
                        const writeResult = session.pty.write(msg.data);
                        console.log('[TERMINAL WS] PTY write result:', writeResult);
                        
                        // Also check PTY process status
                        console.log('[TERMINAL WS] PTY process running:', session.pty.process);
                    } catch (ptyError) {
                        console.error('[TERMINAL WS] PTY write error:', ptyError);
                    }
                }
            } catch (error) {
                console.error('[TERMINAL WS] Message error:', error);
            }
        });
        
        // Handle WebSocket close
        ws.on('close', () => {
            console.log('[TERMINAL WS] Connection closed for session:', sessionId);
            session.ws = null;
            // Remove the output handler (node-pty uses removeListener, not off)
            if (session.pty && typeof session.pty.removeListener === 'function') {
                session.pty.removeListener('data', outputHandler);
            } else if (session.pty && typeof session.pty.off === 'function') {
                session.pty.off('data', outputHandler);
            }
        });
        
        // Handle WebSocket error
        ws.on('error', (error) => {
            console.error('[TERMINAL WS] WebSocket error:', error);
        });
    });
    
    console.log('[TERMINAL WS] WebSocket server setup complete');
}

// Export functions to manage sessions
function addTerminalSession(sessionId, ptyProcess) {
    terminalSessions.set(sessionId, {
        id: sessionId,
        pty: ptyProcess,
        output: [],
        ws: null,
        lineBuffer: '' // Buffer for current command line
    });
}

function removeTerminalSession(sessionId) {
    const session = terminalSessions.get(sessionId);
    if (session) {
        if (session.ws) {
            session.ws.close();
        }
        terminalSessions.delete(sessionId);
    }
}

function getTerminalSession(sessionId) {
    return terminalSessions.get(sessionId);
}

module.exports = {
    setupTerminalWebSocket,
    addTerminalSession,
    removeTerminalSession,
    getTerminalSession
};