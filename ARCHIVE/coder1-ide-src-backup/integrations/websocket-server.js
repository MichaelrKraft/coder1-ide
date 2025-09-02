/**
 * WebSocket Server
 * 
 * Handles real-time communication between frontend terminals and backend processes
 * Manages terminal sessions and message routing
 */

const WebSocket = require('ws');
const { getTerminalManager } = require('./terminal-manager');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.terminalManager = getTerminalManager();
        this.connections = new Map(); // sessionId -> websocket
        
        this.setupWebSocketHandlers();
        console.log('🔌 WebSocket server initialized');
    }
    
    setupWebSocketHandlers() {
        this.wss.on('connection', (ws, req) => {
            console.log('🔗 New WebSocket connection');
            
            // Check if this is a terminal output connection
            if (req.url === '/terminal-output') {
                this.handleTerminalOutputConnection(ws);
                return;
            }
            
            let currentSessionId = null;
            
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    console.log('📨 WebSocket message:', data.type);
                    
                    switch (data.type) {
                        case 'create_session':
                            const result = await this.handleCreateSession(ws, data);
                            currentSessionId = result.sessionId;
                            break;
                            
                        case 'start_claude_code':
                            await this.handleStartClaudeCode(ws, data);
                            break;
                            
                        case 'terminal_input':
                            this.handleTerminalInput(data);
                            break;
                            
                        case 'get_status':
                            this.handleGetStatus(ws, data);
                            break;
                            
                        case 'terminate_session':
                            await this.handleTerminateSession(ws, data);
                            break;
                            
                        default:
                            console.warn('⚠️ Unknown message type:', data.type);
                    }
                    
                } catch (error) {
                    console.error('❌ WebSocket message error:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: error.message
                    }));
                }
            });
            
            ws.on('close', () => {
                console.log('🔌 WebSocket connection closed');
                if (currentSessionId) {
                    this.connections.delete(currentSessionId);
                }
            });
            
            ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
            });
            
            // Send welcome message
            ws.send(JSON.stringify({
                type: 'connected',
                message: 'WebSocket connection established'
            }));
        });
    }
    
    async handleCreateSession(ws, data) {
        const { userId, projectData } = data;
        
        console.log(`📝 Creating terminal session for user: ${userId}`);
        
        const result = await this.terminalManager.createSession(userId, projectData);
        
        if (result.success) {
            this.connections.set(result.sessionId, ws);
            
            ws.send(JSON.stringify({
                type: 'session_created',
                sessionId: result.sessionId,
                projectName: result.projectName,
                projectPath: result.projectPath
            }));
            
            console.log(`✅ Session created: ${result.sessionId}`);
        } else {
            ws.send(JSON.stringify({
                type: 'error',
                error: result.error
            }));
        }
        
        return result;
    }
    
    async handleStartClaudeCode(ws, data) {
        const { sessionId } = data;
        
        console.log(`🚀 Starting Claude Code for session: ${sessionId}`);
        
        const result = await this.terminalManager.startClaudeCode(sessionId, ws);
        
        ws.send(JSON.stringify({
            type: 'claude_code_started',
            success: result.success,
            sessionId: sessionId,
            pid: result.pid,
            error: result.error
        }));
    }
    
    handleTerminalInput(data) {
        const { sessionId, input } = data;
        
        console.log(`⌨️ Terminal input for session ${sessionId}: ${input.substring(0, 50)}...`);
        
        const success = this.terminalManager.sendInput(sessionId, input);
        
        if (!success) {
            const ws = this.connections.get(sessionId);
            if (ws) {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: 'Failed to send input to terminal'
                }));
            }
        }
    }
    
    handleGetStatus(ws, data) {
        const { sessionId } = data;
        
        const status = this.terminalManager.getSessionStatus(sessionId);
        
        ws.send(JSON.stringify({
            type: 'status_update',
            sessionId: sessionId,
            ...status
        }));
    }
    
    async handleTerminateSession(ws, data) {
        const { sessionId } = data;
        
        console.log(`🛑 Terminating session: ${sessionId}`);
        
        const result = await this.terminalManager.terminateSession(sessionId);
        
        ws.send(JSON.stringify({
            type: 'session_terminated',
            sessionId: sessionId,
            success: result.success,
            error: result.error
        }));
        
        // Remove connection
        this.connections.delete(sessionId);
    }
    
    /**
     * Broadcast message to all connected clients
     */
    broadcast(message) {
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
    
    /**
     * Send message to specific session
     */
    sendToSession(sessionId, message) {
        const ws = this.connections.get(sessionId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }
    
    /**
     * Get connection statistics
     */
    getStats() {
        return {
            totalConnections: this.wss.clients.size,
            activeConnections: Array.from(this.wss.clients).filter(
                client => client.readyState === WebSocket.OPEN
            ).length,
            sessionConnections: this.connections.size
        };
    }
    
    // Handle terminal output connections for real-time Claude Code output
    handleTerminalOutputConnection(ws) {
        console.log('🖥️ Terminal output connection established');
        
        // Send initial connection message
        ws.send(JSON.stringify({
            type: 'connection',
            message: 'Connected to real-time Claude Code output'
        }));
        
        // Listen for terminal output events from the global emitter
        const outputListener = (data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'claude-output',
                    text: data.data,
                    taskId: data.taskId
                }));
            }
        };
        
        // Set up the listener
        if (global.terminalEmitter) {
            global.terminalEmitter.on('terminal-output', outputListener);
        }
        
        // Clean up listener when connection closes
        ws.on('close', () => {
            console.log('🖥️ Terminal output connection closed');
            if (global.terminalEmitter) {
                global.terminalEmitter.removeListener('terminal-output', outputListener);
            }
        });
        
        ws.on('error', (error) => {
            console.error('🖥️ Terminal output WebSocket error:', error);
            if (global.terminalEmitter) {
                global.terminalEmitter.removeListener('terminal-output', outputListener);
            }
        });
    }
}

let websocketServerInstance = null;

function initializeWebSocketServer(server) {
    if (!websocketServerInstance) {
        websocketServerInstance = new WebSocketServer(server);
    }
    return websocketServerInstance;
}

function getWebSocketServer() {
    return websocketServerInstance;
}

module.exports = {
    WebSocketServer,
    initializeWebSocketServer,
    getWebSocketServer
};