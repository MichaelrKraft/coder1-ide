"use strict";
/**
 * Moltbot Bridge Service
 *
 * CRITICAL service that connects Coder1 IDE to a Moltbot daemon running on a
 * separate laptop. Provides robust WebSocket connectivity with:
 * - Automatic reconnection with exponential backoff
 * - Health monitoring via ping/pong heartbeat
 * - Session management and message routing
 * - Graceful degradation when Moltbot is unavailable
 *
 * "No disassemble!" - Johnny5
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoltbotBridgeService = void 0;
exports.getMoltbotBridge = getMoltbotBridge;
exports.createMoltbotBridge = createMoltbotBridge;
const events_1 = require("events");
// ============================================================================
// WebSocket Import (Node.js 'ws' package)
// ============================================================================
let WebSocket = null;
// Dynamically import 'ws' package for server-side usage
async function loadWebSocket() {
    if (WebSocket)
        return WebSocket;
    try {
        // Dynamic import for server-side Node.js environment
        const wsModule = await Promise.resolve().then(() => __importStar(require('ws')));
        WebSocket = wsModule.default;
        console.log('[MoltbotBridge] WebSocket (ws) package loaded successfully');
        return WebSocket;
    }
    catch (error) {
        console.warn('[MoltbotBridge] WebSocket (ws) package not available. Install with: npm install ws');
        console.warn('[MoltbotBridge] Moltbot bridge will operate in fallback mode');
        return null;
    }
}
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_CONFIG = {
    gatewayUrl: process.env.MOLTBOT_GATEWAY_URL || 'ws://localhost:8765',
    enabled: true,
    reconnectInterval: parseInt(process.env.MOLTBOT_RECONNECT_INTERVAL || '5000', 10),
    maxRetries: parseInt(process.env.MOLTBOT_MAX_RETRIES || '10', 10),
    connectionTimeout: parseInt(process.env.MOLTBOT_CONNECTION_TIMEOUT || '30000', 10),
    fallbackToDirect: process.env.MOLTBOT_FALLBACK_TO_DIRECT === 'true',
};
// ============================================================================
// Moltbot Bridge Service Class
// ============================================================================
class MoltbotBridgeService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.ws = null;
        this.reconnectTimer = null;
        this.pingTimer = null;
        this.reconnectAttempts = 0;
        this.authenticated = false; // Track if connect handshake completed
        this.runIdToMessageId = new Map(); // Track runId -> messageId for async responses
        this.agentResponses = new Map(); // Accumulate streamed content
        this.PING_INTERVAL_MS = 30000; // 30 seconds
        this.MESSAGE_TIMEOUT_MS = 60000; // 60 seconds
        this.state = {
            config: { ...DEFAULT_CONFIG, ...config },
            status: {
                connected: false,
                gatewayUrl: null,
                lastPingAt: null,
                lastPongAt: null,
                reconnectAttempts: 0,
                error: null,
                fallbackActive: false,
            },
            sessions: new Map(),
            pendingMessages: new Map(),
        };
        console.log('[MoltbotBridge] Service initialized', {
            gatewayUrl: this.state.config.gatewayUrl,
            enabled: this.state.config.enabled,
        });
    }
    // -------------------------------------------------------------------------
    // Connection Management
    // -------------------------------------------------------------------------
    /**
     * Connect to the Moltbot gateway
     */
    async connect(gatewayUrl) {
        const url = gatewayUrl || this.state.config.gatewayUrl;
        console.log(`[MoltbotBridge] Connecting to ${url}...`);
        // Load WebSocket package
        const WS = await loadWebSocket();
        if (!WS) {
            const error = new Error('WebSocket (ws) package not available');
            this.handleConnectionError(error);
            throw error;
        }
        // Clean up existing connection
        if (this.ws) {
            this.disconnect();
        }
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                const error = new Error(`Connection timeout after ${this.state.config.connectionTimeout}ms`);
                this.handleConnectionError(error);
                reject(error);
            }, this.state.config.connectionTimeout);
            try {
                this.ws = new WS(url);
                this.ws.on('open', () => {
                    clearTimeout(timeoutId);
                    this.handleConnectionOpen(url);
                    resolve();
                });
                this.ws.on('message', (data) => {
                    this.handleMessage(data);
                });
                this.ws.on('close', (code, reason) => {
                    this.handleConnectionClose(code, reason.toString());
                });
                this.ws.on('error', (error) => {
                    clearTimeout(timeoutId);
                    this.handleConnectionError(error);
                    reject(error);
                });
                this.ws.on('pong', () => {
                    this.handlePong();
                });
            }
            catch (error) {
                clearTimeout(timeoutId);
                this.handleConnectionError(error);
                reject(error);
            }
        });
    }
    /**
     * Disconnect from the Moltbot gateway
     */
    disconnect() {
        console.log('[MoltbotBridge] Disconnecting...');
        // Reset authentication state
        this.authenticated = false;
        // Stop reconnection attempts
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        // Stop ping timer
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        // Close WebSocket
        if (this.ws) {
            try {
                this.ws.close(1000, 'Client disconnect');
            }
            catch (error) {
                console.warn('[MoltbotBridge] Error during disconnect:', error);
            }
            this.ws = null;
        }
        // Update status
        this.updateStatus({
            connected: false,
            error: null,
        });
        // Clear pending messages
        this.clearPendingMessages('Connection closed');
        this.emit('disconnected', 'Client initiated disconnect');
    }
    /**
     * Reconnect to the gateway (with optional new URL)
     */
    async reconnect(gatewayUrl) {
        console.log('[MoltbotBridge] Reconnecting...');
        this.disconnect();
        await this.connect(gatewayUrl);
    }
    // -------------------------------------------------------------------------
    // Private Connection Handlers
    // -------------------------------------------------------------------------
    handleConnectionOpen(url) {
        console.log(`[MoltbotBridge] Connected to ${url}`);
        this.reconnectAttempts = 0;
        this.updateStatus({
            connected: true,
            gatewayUrl: url,
            error: null,
            reconnectAttempts: 0,
            fallbackActive: false,
        });
        // Start ping/pong heartbeat
        this.startHeartbeat();
        this.emit('connected');
        this.emit('connection-status', this.state.status);
    }
    handleConnectionClose(code, reason) {
        console.log(`[MoltbotBridge] Connection closed (code: ${code}, reason: ${reason})`);
        // Stop heartbeat
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        this.updateStatus({
            connected: false,
        });
        this.emit('disconnected', reason || `Connection closed with code ${code}`);
        this.emit('connection-status', this.state.status);
        // Attempt reconnection if not a clean close
        if (code !== 1000) {
            this.scheduleReconnect();
        }
    }
    handleConnectionError(error) {
        console.error('[MoltbotBridge] Connection error:', error.message);
        this.updateStatus({
            connected: false,
            error: error.message,
        });
        this.emit('error', error);
        this.emit('connection-status', this.state.status);
        // Schedule reconnection
        this.scheduleReconnect();
    }
    scheduleReconnect() {
        if (this.reconnectTimer) {
            return; // Already scheduled
        }
        if (this.reconnectAttempts >= this.state.config.maxRetries) {
            console.log('[MoltbotBridge] Max reconnection attempts reached');
            if (this.state.config.fallbackToDirect) {
                console.log('[MoltbotBridge] Activating fallback mode');
                this.updateStatus({
                    fallbackActive: true,
                });
            }
            return;
        }
        // Exponential backoff: base * 2^attempts (capped at 60 seconds)
        const delay = Math.min(this.state.config.reconnectInterval * Math.pow(2, this.reconnectAttempts), 60000);
        this.reconnectAttempts++;
        console.log(`[MoltbotBridge] Scheduling reconnection attempt ${this.reconnectAttempts}/${this.state.config.maxRetries} in ${delay}ms`);
        this.updateStatus({
            reconnectAttempts: this.reconnectAttempts,
        });
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            try {
                await this.connect();
            }
            catch (error) {
                // Error handler will schedule next reconnect
            }
        }, delay);
    }
    // -------------------------------------------------------------------------
    // Heartbeat / Health Monitoring
    // -------------------------------------------------------------------------
    startHeartbeat() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
        }
        this.pingTimer = setInterval(() => {
            this.sendPing();
        }, this.PING_INTERVAL_MS);
        // Send initial ping
        this.sendPing();
    }
    sendPing() {
        if (!this.ws || this.ws.readyState !== 1) { // 1 = OPEN
            return;
        }
        try {
            this.ws.ping();
            this.updateStatus({
                lastPingAt: new Date(),
            });
            console.log('[MoltbotBridge] Ping sent');
        }
        catch (error) {
            console.warn('[MoltbotBridge] Failed to send ping:', error);
        }
    }
    handlePong() {
        this.updateStatus({
            lastPongAt: new Date(),
        });
        console.log('[MoltbotBridge] Pong received');
    }
    /**
     * Check if connected and authenticated to the gateway
     */
    isConnected() {
        return this.state.status.connected && this.ws?.readyState === 1 && this.authenticated;
    }
    /**
     * Get current connection status
     */
    getStatus() {
        return { ...this.state.status };
    }
    // -------------------------------------------------------------------------
    // Message Handling
    // -------------------------------------------------------------------------
    handleMessage(data) {
        try {
            const raw = typeof data === 'string' ? data : data.toString('utf-8');
            // Debug: Log raw message to understand Moltbot protocol
            console.log(`[MoltbotBridge] Raw message received (first 200 chars): ${raw.substring(0, 200)}`);
            const parsed = JSON.parse(raw);
            // Moltbot uses nested event format: {"type":"event","event":"...", "payload": {...}}
            // Handle both direct events and nested event format
            let eventType = parsed.type;
            let payload = parsed.payload;
            if (parsed.type === 'event' && parsed.event) {
                // Nested event format from Moltbot
                eventType = parsed.event;
                console.log(`[MoltbotBridge] Received Moltbot event: ${eventType}`);
                // Handle Moltbot-specific events
                switch (eventType) {
                    case 'connect.challenge':
                        // Respond to challenge to complete authentication
                        this.handleConnectChallenge(payload);
                        return;
                    case 'connect.success':
                        console.log('[MoltbotBridge] Authentication successful');
                        return;
                    case 'message':
                    case 'response':
                        // Handle message/response from Moltbot
                        this.handleMoltbotResponse(payload);
                        return;
                    case 'error':
                        this.handleErrorEvent(payload);
                        return;
                    case 'agent':
                        // Agent events contain streamed content
                        this.handleAgentEvent(payload);
                        return;
                    case 'chat':
                        // Chat events contain final response state
                        this.handleChatEvent(payload);
                        return;
                    default:
                        console.log(`[MoltbotBridge] Unhandled Moltbot event: ${eventType}`);
                        return;
                }
            }
            console.log(`[MoltbotBridge] Received event: ${eventType}`);
            switch (eventType) {
                case 'res':
                    // Handle response to our requests
                    // Log full response for debugging available methods
                    console.log(`[MoltbotBridge] Full response: ${JSON.stringify(parsed).substring(0, 2000)}`);
                    this.handleResponse(parsed);
                    break;
                case 'message':
                    this.handleIncomingMessage(payload);
                    break;
                case 'session_update':
                    this.handleSessionUpdate(payload);
                    break;
                case 'tool_call':
                    // Tool call updates are part of messages
                    if (parsed.sessionId) {
                        this.emit('message', {
                            id: `tool-${Date.now()}`,
                            sessionId: parsed.sessionId,
                            role: 'assistant',
                            content: '',
                            timestamp: new Date(),
                            toolCalls: [payload],
                        });
                    }
                    break;
                case 'error':
                    this.handleErrorEvent(payload);
                    break;
                case 'pong':
                    this.handlePong();
                    break;
                default:
                    console.log(`[MoltbotBridge] Unknown event type: ${eventType}`);
            }
        }
        catch (error) {
            console.error('[MoltbotBridge] Failed to parse message:', error);
        }
    }
    handleConnectChallenge(payload) {
        console.log('[MoltbotBridge] Responding to connect challenge...');
        // Get auth token from environment (configured by user)
        const authToken = process.env.MOLTBOT_AUTH_TOKEN || '';
        // Exact format - Moltbot requires protocol 3
        const response = {
            type: 'req',
            id: '1',
            method: 'connect',
            params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                    id: 'gateway-client',
                    version: '1.0.0',
                    platform: 'darwin',
                    mode: 'backend',
                },
                auth: {
                    token: authToken,
                },
            },
        };
        if (this.ws && this.ws.readyState === 1) {
            const responseJson = JSON.stringify(response);
            console.log('[MoltbotBridge] Sending auth response:', responseJson.substring(0, 150));
            this.ws.send(responseJson);
            console.log('[MoltbotBridge] Auth response sent');
        }
        else {
            console.warn('[MoltbotBridge] Cannot send auth response - WebSocket not ready');
        }
    }
    handleMoltbotResponse(payload) {
        console.log('[MoltbotBridge] Received Moltbot response:', JSON.stringify(payload).substring(0, 200));
        // Extract message content from Moltbot response
        const message = {
            id: payload.id || payload.messageId || `msg-${Date.now()}`,
            sessionId: payload.sessionId || payload.session_id || 'default',
            role: 'assistant',
            content: payload.content || payload.text || payload.message || '',
            timestamp: new Date(),
            toolCalls: payload.toolCalls || payload.tool_calls,
            thinking: payload.thinking,
            tokenUsage: payload.usage || payload.tokenUsage,
        };
        this.handleIncomingMessage(message);
    }
    handleResponse(response) {
        console.log(`[MoltbotBridge] Response received for id=${response.id}, ok=${response.ok}`);
        // Check if this is the connect handshake response (id="1")
        if (response.id === '1' && response.ok) {
            this.authenticated = true;
            console.log('[MoltbotBridge] Authentication complete - ready for chat');
            this.emit('authenticated');
        }
        // Check if this is a response to a pending request
        const pending = this.state.pendingMessages.get(response.id);
        if (pending) {
            if (response.ok && response.payload) {
                // Check if this is an async chat response (has runId and status)
                if (response.payload.runId && response.payload.status === 'started') {
                    // This is the initial acknowledgment - DON'T resolve yet
                    // Track runId -> messageId so we can resolve when chat event arrives
                    const runId = response.payload.runId;
                    console.log(`[MoltbotBridge] Async chat started, runId=${runId}, waiting for completion...`);
                    this.runIdToMessageId.set(runId, response.id);
                    this.agentResponses.set(runId, { content: '', sessionKey: '' });
                    // Keep the pending message - we'll resolve when chat event with state:"final" arrives
                    return;
                }
                // Synchronous response - resolve immediately
                clearTimeout(pending.timeout);
                this.state.pendingMessages.delete(response.id);
                const moltbotResponse = {
                    text: response.payload.content || response.payload.text || response.payload.message || JSON.stringify(response.payload),
                    toolCalls: response.payload.toolCalls,
                    thinking: response.payload.thinking,
                    sessionId: response.payload.sessionId || 'default',
                    messageId: response.id,
                    tokenUsage: response.payload.usage,
                };
                pending.resolve(moltbotResponse);
            }
            else if (response.error) {
                // Error response
                clearTimeout(pending.timeout);
                this.state.pendingMessages.delete(response.id);
                pending.reject(new Error(response.error.message || 'Unknown Moltbot error'));
            }
            else {
                clearTimeout(pending.timeout);
                this.state.pendingMessages.delete(response.id);
                pending.reject(new Error('Invalid response from Moltbot'));
            }
        }
        else {
            console.log(`[MoltbotBridge] No pending request for id=${response.id}`);
        }
    }
    /**
     * Handle agent events (streamed content from Moltbot agent)
     */
    handleAgentEvent(payload) {
        const runId = payload.runId;
        if (!runId)
            return;
        console.log(`[MoltbotBridge] Agent event: runId=${runId}, stream=${payload.stream}, phase=${payload.data?.phase}`);
        // Track session key
        if (payload.sessionKey && this.agentResponses.has(runId)) {
            const resp = this.agentResponses.get(runId);
            resp.sessionKey = payload.sessionKey;
        }
        // Accumulate streamed content if present
        if (payload.data?.content || payload.data?.text) {
            const resp = this.agentResponses.get(runId);
            if (resp) {
                resp.content += payload.data.content || payload.data.text || '';
            }
        }
    }
    /**
     * Handle chat events (streaming content and final state)
     */
    async handleChatEvent(payload) {
        const runId = payload.runId;
        if (!runId)
            return;
        console.log(`[MoltbotBridge] Chat event: runId=${runId}, state=${payload.state}, sessionKey=${payload.sessionKey}`);
        // Handle streaming delta events
        if (payload.state === 'delta' && payload.message) {
            const messageId = this.runIdToMessageId.get(runId);
            if (messageId) {
                const resp = this.agentResponses.get(runId);
                if (resp) {
                    // Delta contains the full accumulated content so far
                    resp.content = typeof payload.message === 'string'
                        ? payload.message
                        : (payload.message.text || payload.message.content || '');
                    console.log(`[MoltbotBridge] Chat delta: content length=${resp.content.length}`);
                }
            }
            return;
        }
        // Handle error state
        if (payload.state === 'error') {
            const messageId = this.runIdToMessageId.get(runId);
            if (messageId) {
                const pending = this.state.pendingMessages.get(messageId);
                if (pending) {
                    clearTimeout(pending.timeout);
                    this.state.pendingMessages.delete(messageId);
                    pending.reject(new Error(payload.errorMessage || 'Chat error'));
                    this.runIdToMessageId.delete(runId);
                    this.agentResponses.delete(runId);
                }
            }
            return;
        }
        // Handle aborted state
        if (payload.state === 'aborted') {
            const messageId = this.runIdToMessageId.get(runId);
            if (messageId) {
                const pending = this.state.pendingMessages.get(messageId);
                if (pending) {
                    clearTimeout(pending.timeout);
                    this.state.pendingMessages.delete(messageId);
                    pending.reject(new Error('Chat was aborted'));
                    this.runIdToMessageId.delete(runId);
                    this.agentResponses.delete(runId);
                }
            }
            return;
        }
        // When state is "final", try to get response content
        if (payload.state === 'final') {
            const messageId = this.runIdToMessageId.get(runId);
            if (!messageId) {
                console.log(`[MoltbotBridge] No messageId found for runId=${runId}`);
                return;
            }
            const pending = this.state.pendingMessages.get(messageId);
            if (!pending) {
                console.log(`[MoltbotBridge] No pending request for messageId=${messageId}`);
                return;
            }
            const sessionKey = payload.sessionKey || this.agentResponses.get(runId)?.sessionKey || 'webchat-test';
            // Get accumulated response from delta events
            const accumulatedResponse = this.agentResponses.get(runId) || { content: '', sessionKey };
            let responseText = accumulatedResponse.content || payload.summary || payload.content || '';
            // If no content from deltas, try fetching history
            if (!responseText && this.ws) {
                console.log(`[MoltbotBridge] No delta content, fetching chat.history for sessionKey=${sessionKey}`);
                try {
                    const historyId = `history-${Date.now()}`;
                    const historyPayload = {
                        type: 'req',
                        id: historyId,
                        method: 'chat.history',
                        params: { sessionKey, limit: 10 },
                    };
                    this.ws.send(JSON.stringify(historyPayload));
                    // Wait briefly for response
                    responseText = await new Promise((resolve) => {
                        const timeout = setTimeout(() => {
                            this.ws?.off('message', handler);
                            resolve('');
                        }, 2000);
                        const handler = (data) => {
                            try {
                                const raw = typeof data === 'string' ? data : data.toString('utf-8');
                                const parsed = JSON.parse(raw);
                                if (parsed.type === 'res' && parsed.id === historyId && parsed.ok) {
                                    clearTimeout(timeout);
                                    this.ws?.off('message', handler);
                                    const messages = parsed.payload?.messages || [];
                                    console.log(`[MoltbotBridge] History returned ${messages.length} messages`);
                                    // Get last assistant message
                                    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
                                    if (lastAssistant) {
                                        // Check for error
                                        if (lastAssistant.errorMessage || lastAssistant.stopReason === 'error') {
                                            const error = lastAssistant.errorMessage || 'Unknown error';
                                            console.log(`[MoltbotBridge] Agent error: ${error}`);
                                            resolve(`[Moltbot Error] ${error}`);
                                        }
                                        else if (lastAssistant.content) {
                                            // Content might be array or string
                                            const content = Array.isArray(lastAssistant.content)
                                                ? lastAssistant.content.map((c) => c.text || c).join('')
                                                : lastAssistant.content;
                                            console.log(`[MoltbotBridge] Found assistant message: ${content.substring(0, 100)}`);
                                            resolve(content || '');
                                        }
                                        else {
                                            resolve('');
                                        }
                                    }
                                    else {
                                        resolve('');
                                    }
                                }
                            }
                            catch { /* ignore */ }
                        };
                        this.ws?.on('message', handler);
                    });
                }
                catch (err) {
                    console.error('[MoltbotBridge] History fetch error:', err);
                }
            }
            // Build the response
            const response = {
                text: responseText || '[Moltbot] Agent completed but no response content was captured. The response may have been sent to configured messaging channels.',
                sessionId: sessionKey,
                messageId: messageId,
                thinking: payload.thinking,
                toolCalls: payload.toolCalls,
                tokenUsage: payload.usage,
            };
            // Resolve the pending promise
            clearTimeout(pending.timeout);
            this.state.pendingMessages.delete(messageId);
            pending.resolve(response);
            // Cleanup tracking
            this.runIdToMessageId.delete(runId);
            this.agentResponses.delete(runId);
            console.log(`[MoltbotBridge] Chat completed for runId=${runId}, response length=${response.text.length}`);
        }
    }
    handleIncomingMessage(message) {
        console.log(`[MoltbotBridge] Message received for session ${message.sessionId}`);
        // Check if this is a response to a pending request
        const pending = this.state.pendingMessages.get(message.id);
        if (pending) {
            clearTimeout(pending.timeout);
            this.state.pendingMessages.delete(message.id);
            const response = {
                text: message.content,
                toolCalls: message.toolCalls,
                thinking: message.thinking,
                sessionId: message.sessionId,
                messageId: message.id,
                tokenUsage: message.tokenUsage,
            };
            pending.resolve(response);
        }
        // Emit the message event
        this.emit('message', message);
    }
    handleSessionUpdate(session) {
        console.log(`[MoltbotBridge] Session updated: ${session.id}`);
        this.state.sessions.set(session.id, session);
        this.emit('session-update', session);
    }
    handleErrorEvent(error) {
        console.error(`[MoltbotBridge] Error from gateway: ${error.message}`);
        this.emit('error', new Error(error.message));
    }
    // -------------------------------------------------------------------------
    // Message Sending
    // -------------------------------------------------------------------------
    /**
     * Send a message to Moltbot and wait for response
     * First tries sessions.list to find available sessions, then routes message
     */
    async sendMessage(sessionId, message) {
        if (!this.isConnected()) {
            // Check fallback mode
            if (this.state.status.fallbackActive) {
                return this.handleFallbackMessage(sessionId, message);
            }
            throw new Error('Not connected to Moltbot gateway');
        }
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return new Promise((resolve, reject) => {
            // Set up timeout
            const timeout = setTimeout(() => {
                this.state.pendingMessages.delete(messageId);
                reject(new Error(`Message timeout after ${this.MESSAGE_TIMEOUT_MS}ms`));
            }, this.MESSAGE_TIMEOUT_MS);
            // Store pending message
            this.state.pendingMessages.set(messageId, { resolve, reject, timeout });
            // Use chat.send method discovered from web UI JavaScript
            // Parameters: sessionKey, message, deliver, idempotencyKey (required)
            const payload = {
                type: 'req',
                id: messageId,
                method: 'chat.send',
                params: {
                    sessionKey: sessionId,
                    message: message,
                    deliver: false,
                    idempotencyKey: messageId,
                },
            };
            try {
                const payloadStr = JSON.stringify(payload);
                console.log(`[MoltbotBridge] Sending via chat.send: ${payloadStr.substring(0, 200)}`);
                this.ws.send(payloadStr);
                console.log(`[MoltbotBridge] Message sent: ${messageId}`);
            }
            catch (error) {
                clearTimeout(timeout);
                this.state.pendingMessages.delete(messageId);
                reject(error);
            }
        });
    }
    /**
     * Query available sessions from Moltbot
     */
    async listSessions() {
        if (!this.isConnected()) {
            throw new Error('Not connected to Moltbot gateway');
        }
        const requestId = `req-${Date.now()}`;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.state.pendingMessages.delete(requestId);
                reject(new Error('sessions.list timeout'));
            }, 10000);
            this.state.pendingMessages.set(requestId, {
                resolve: (r) => resolve(r),
                reject,
                timeout
            });
            const payload = {
                type: 'req',
                id: requestId,
                method: 'sessions.list',
                params: {},
            };
            console.log(`[MoltbotBridge] Querying sessions.list`);
            this.ws.send(JSON.stringify(payload));
        });
    }
    /**
     * Handle message in fallback mode (direct Claude API)
     */
    async handleFallbackMessage(sessionId, message) {
        console.log('[MoltbotBridge] Using fallback mode for message');
        // In fallback mode, we return a response indicating the limitation
        return {
            text: '[Moltbot Unavailable] The Moltbot daemon is not connected. Message was not sent. Please ensure the Moltbot daemon is running on your local machine.',
            sessionId,
            messageId: `fallback-${Date.now()}`,
            thinking: 'Fallback mode active - Moltbot daemon unreachable',
        };
    }
    clearPendingMessages(reason) {
        const error = new Error(reason);
        const entries = Array.from(this.state.pendingMessages.entries());
        for (const [id, pending] of entries) {
            clearTimeout(pending.timeout);
            pending.reject(error);
        }
        this.state.pendingMessages.clear();
    }
    // -------------------------------------------------------------------------
    // Session Management
    // -------------------------------------------------------------------------
    /**
     * Get all known sessions
     */
    async getSessions() {
        if (!this.isConnected()) {
            // Return cached sessions
            return Array.from(this.state.sessions.values());
        }
        // Request sessions from gateway
        return new Promise((resolve, reject) => {
            const requestId = `req-${Date.now()}`;
            const timeout = setTimeout(() => {
                reject(new Error('Session list request timeout'));
            }, 10000);
            // One-time listener for response
            const handleResponse = (data) => {
                try {
                    const raw = typeof data === 'string' ? data : data.toString('utf-8');
                    const event = JSON.parse(raw);
                    if (event.type === 'session_list') {
                        clearTimeout(timeout);
                        this.ws?.off('message', handleResponse);
                        const sessions = event.payload;
                        // Update cache
                        for (const session of sessions) {
                            this.state.sessions.set(session.id, session);
                        }
                        resolve(sessions);
                    }
                }
                catch {
                    // Ignore parse errors, wait for correct response
                }
            };
            this.ws?.on('message', handleResponse);
            // Send request
            const payload = {
                type: 'list_sessions',
                payload: { requestId },
                timestamp: new Date(),
            };
            try {
                this.ws.send(JSON.stringify(payload));
            }
            catch (error) {
                clearTimeout(timeout);
                this.ws?.off('message', handleResponse);
                reject(error);
            }
        });
    }
    /**
     * Get a specific session by ID
     */
    async getSession(sessionId) {
        // Check cache first
        const cached = this.state.sessions.get(sessionId);
        if (cached) {
            return cached;
        }
        if (!this.isConnected()) {
            return null;
        }
        // Request from gateway
        const sessions = await this.getSessions();
        return sessions.find(s => s.id === sessionId) || null;
    }
    /**
     * Create a new session
     */
    async createSession(name) {
        if (!this.isConnected()) {
            throw new Error('Not connected to Moltbot gateway');
        }
        return new Promise((resolve, reject) => {
            const requestId = `req-${Date.now()}`;
            const timeout = setTimeout(() => {
                reject(new Error('Session creation timeout'));
            }, 10000);
            // One-time listener for response
            const handleResponse = (data) => {
                try {
                    const raw = typeof data === 'string' ? data : data.toString('utf-8');
                    const event = JSON.parse(raw);
                    if (event.type === 'session_created') {
                        clearTimeout(timeout);
                        this.ws?.off('message', handleResponse);
                        const session = event.payload;
                        this.state.sessions.set(session.id, session);
                        resolve(session);
                    }
                }
                catch {
                    // Ignore parse errors
                }
            };
            this.ws?.on('message', handleResponse);
            // Send request
            const payload = {
                type: 'create_session',
                payload: { requestId, name },
                timestamp: new Date(),
            };
            try {
                this.ws.send(JSON.stringify(payload));
            }
            catch (error) {
                clearTimeout(timeout);
                this.ws?.off('message', handleResponse);
                reject(error);
            }
        });
    }
    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.state.config };
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.state.config = { ...this.state.config, ...config };
        console.log('[MoltbotBridge] Configuration updated:', this.state.config);
    }
    // -------------------------------------------------------------------------
    // Status Helper
    // -------------------------------------------------------------------------
    updateStatus(updates) {
        this.state.status = { ...this.state.status, ...updates };
    }
}
exports.MoltbotBridgeService = MoltbotBridgeService;
/**
 * Get the singleton Moltbot Bridge instance
 * Uses globalThis to share instance across CommonJS and ES module systems
 */
function getMoltbotBridge() {
    if (!globalThis.__moltbotBridgeInstance) {
        globalThis.__moltbotBridgeInstance = new MoltbotBridgeService();
        console.log('[MoltbotBridge] Created new global singleton instance');
    }
    return globalThis.__moltbotBridgeInstance;
}
/**
 * Create a new Moltbot Bridge instance (for testing or custom configs)
 */
function createMoltbotBridge(config) {
    return new MoltbotBridgeService(config);
}
// Default export is the singleton getter
exports.default = getMoltbotBridge;
