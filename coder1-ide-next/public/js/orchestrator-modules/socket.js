/**
 * Orchestrator Socket Module
 * Handles WebSocket connections and real-time communication
 */

// Ensure global namespace exists
window.OrchestratorModules = window.OrchestratorModules || {};

class OrchestratorSocket {
    constructor(core) {
        this.core = core;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
        this.messageQueue = [];
    }

    /**
     * Connect to WebSocket server
     */
    async connect() {
        if (this.socket && this.socket.connected) {
            console.log('[Socket] Already connected');
            return;
        }

        if (this.isConnecting) {
            console.log('[Socket] Connection already in progress');
            return;
        }

        this.isConnecting = true;

        try {
            // Dynamic import of socket.io-client to reduce initial bundle
            if (!window.io) {
                await this.loadSocketIO();
            }

            const socketUrl = window.location.origin;
            console.log('[Socket] Connecting to:', socketUrl);

            this.socket = window.io(socketUrl, {
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay,
                transports: ['websocket', 'polling']
            });

            this.setupSocketListeners();
            
            // Wait for connection
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);

                this.socket.once('connect', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                this.socket.once('connect_error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            console.log('[Socket] Connected successfully');
            this.isConnecting = false;
            this.reconnectAttempts = 0;

            // Process queued messages
            this.processMessageQueue();

        } catch (error) {
            console.error('[Socket] Connection failed:', error);
            this.isConnecting = false;
            this.handleConnectionError(error);
        }
    }

    /**
     * Load Socket.IO library dynamically
     */
    async loadSocketIO() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/socket.io/socket.io.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Socket.IO'));
            document.head.appendChild(script);
        });
    }

    /**
     * Setup socket event listeners
     */
    setupSocketListeners() {
        if (!this.socket) return;

        // Connection events
        this.socket.on('connect', () => {
            console.log('[Socket] Connected with ID:', this.socket.id);
            this.core.dispatchEvent('socketConnected', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
            this.core.dispatchEvent('socketDisconnected', reason);
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
            this.core.dispatchEvent('socketReconnected', attemptNumber);
        });

        // Session events
        this.socket.on('session:created', (session) => {
            console.log('[Socket] Session created:', session);
            this.core.session = session;
            this.core.dispatchEvent('sessionCreated', session);
        });

        this.socket.on('session:error', (error) => {
            console.error('[Socket] Session error:', error);
            this.core.dispatchEvent('sessionError', error);
        });

        // Message events
        this.socket.on('message', (message) => {
            this.handleMessage(message);
        });

        this.socket.on('message:stream:start', (data) => {
            this.core.startStreamingMessage(data.messageId, data.content);
        });

        this.socket.on('message:stream:chunk', (data) => {
            this.core.updateStreamingMessage(data.messageId, data.content);
        });

        this.socket.on('message:stream:end', (data) => {
            const finalContent = this.core.endStreamingMessage(data.messageId);
            if (finalContent) {
                this.core.addMessage({
                    id: data.messageId,
                    role: data.role,
                    agent: data.agent,
                    content: finalContent
                });
            }
        });

        // Agent events
        this.socket.on('agent:joined', (agent) => {
            console.log('[Socket] Agent joined:', agent);
            this.core.addJoinedAgent(agent.id);
        });

        this.socket.on('agent:typing', (agent) => {
            this.core.addTypingIndicator(agent.id);
        });

        this.socket.on('agent:stopped-typing', (agent) => {
            this.core.removeTypingIndicator(agent.id);
        });

        // Phase events
        this.socket.on('phase:changed', (phase) => {
            console.log('[Socket] Phase changed:', phase);
            const phaseData = this.core.phases.find(p => p.key === phase.key);
            if (phaseData) {
                this.core.setPhase(phaseData);
            }
        });

        // Plan events
        this.socket.on('plan:ready', (plan) => {
            console.log('[Socket] Plan ready:', plan);
            this.core.plan = plan;
            this.core.dispatchEvent('planReady', plan);
        });

        // Error events
        this.socket.on('error', (error) => {
            console.error('[Socket] Error:', error);
            this.handleError(error);
        });
    }

    /**
     * Handle incoming message
     */
    handleMessage(message) {
        // Add to core
        this.core.addMessage(message);
    }

    /**
     * Send message
     */
    sendMessage(content, metadata = {}) {
        if (!this.socket || !this.socket.connected) {
            console.log('[Socket] Queueing message - not connected');
            this.messageQueue.push({ content, metadata });
            this.connect(); // Try to reconnect
            return;
        }

        const message = {
            content,
            timestamp: new Date().toISOString(),
            sessionId: this.core.session?.id,
            ...metadata
        };

        this.socket.emit('message', message);
    }

    /**
     * Start consultation
     */
    startConsultation(query, files = []) {
        if (!this.socket || !this.socket.connected) {
            console.error('[Socket] Cannot start consultation - not connected');
            this.core.dispatchEvent('consultationError', 'Not connected to server');
            return;
        }

        const data = {
            query,
            files,
            timestamp: new Date().toISOString()
        };

        this.socket.emit('consultation:start', data);
    }

    /**
     * Request specific agent
     */
    requestAgent(agentId) {
        if (!this.socket || !this.socket.connected) {
            console.error('[Socket] Cannot request agent - not connected');
            return;
        }

        this.socket.emit('agent:request', { agentId });
    }

    /**
     * Process queued messages
     */
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const { content, metadata } = this.messageQueue.shift();
            this.sendMessage(content, metadata);
        }
    }

    /**
     * Handle connection error
     */
    handleConnectionError(error) {
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[Socket] Max reconnection attempts reached');
            this.core.dispatchEvent('connectionFailed', error);
            return;
        }

        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        console.log(`[Socket] Retrying connection in ${delay}ms...`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Handle socket error
     */
    handleError(error) {
        console.error('[Socket] Socket error:', error);
        this.core.dispatchEvent('socketError', error);

        // Show user-friendly error
        let message = 'Connection error occurred';
        if (error.message) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }

        this.core.dispatchEvent('userError', message);
    }

    /**
     * Disconnect socket
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Check connection status
     */
    isConnected() {
        return this.socket && this.socket.connected;
    }

    /**
     * Reconnect
     */
    reconnect() {
        this.disconnect();
        this.reconnectAttempts = 0;
        return this.connect();
    }
}

// Register module
window.OrchestratorModules.socket = {
    OrchestratorSocket
};

// Export for ES modules
export { OrchestratorSocket };