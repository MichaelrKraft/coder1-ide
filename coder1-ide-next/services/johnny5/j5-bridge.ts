/**
 * J5 Bridge Service
 *
 * CRITICAL service that connects Coder1 IDE to a J5 daemon running on a
 * separate laptop. Provides robust WebSocket connectivity with:
 * - Automatic reconnection with exponential backoff
 * - Health monitoring via ping/pong heartbeat
 * - Session management and message routing
 * - Graceful degradation when J5 is unavailable
 *
 * "No disassemble!" - Johnny5
 */

import { EventEmitter } from 'events';
import type {
  J5Config,
  J5ConnectionStatus,
  J5Message,
  J5Session,
  J5Response,
  J5GatewayEvent,
} from '../../types/johnny5';

// ============================================================================
// WebSocket Import (Node.js 'ws' package)
// ============================================================================

let WebSocket: typeof import('ws').default | null = null;

// Dynamically import 'ws' package for server-side usage
async function loadWebSocket(): Promise<typeof import('ws').default | null> {
  if (WebSocket) return WebSocket;

  try {
    // Dynamic import for server-side Node.js environment
    const wsModule = await import('ws');
    WebSocket = wsModule.default;
    console.log('[J5Bridge] WebSocket (ws) package loaded successfully');
    return WebSocket;
  } catch (error) {
    console.warn(
      '[J5Bridge] WebSocket (ws) package not available. Install with: npm install ws'
    );
    console.warn('[J5Bridge] J5 bridge will operate in fallback mode');
    return null;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface J5BridgeState {
  config: J5Config;
  status: J5ConnectionStatus;
  sessions: Map<string, J5Session>;
  pendingMessages: Map<string, {
    resolve: (value: J5Response) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>;
}

export interface J5BridgeEvents {
  connected: () => void;
  disconnected: (reason: string) => void;
  message: (message: J5Message) => void;
  'session-update': (session: J5Session) => void;
  error: (error: Error) => void;
  'connection-status': (status: J5ConnectionStatus) => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: J5Config = {
  gatewayUrl: process.env.J5_GATEWAY_URL || 'ws://localhost:18789',
  enabled: true,
  reconnectInterval: parseInt(process.env.J5_RECONNECT_INTERVAL || '5000', 10),
  maxRetries: parseInt(process.env.J5_MAX_RETRIES || '10', 10),
  connectionTimeout: parseInt(process.env.J5_CONNECTION_TIMEOUT || '30000', 10),
  fallbackToDirect: process.env.J5_FALLBACK_TO_DIRECT === 'true',
};

// ============================================================================
// J5 Bridge Service Class
// ============================================================================

class J5BridgeService extends EventEmitter {
  private state: J5BridgeState;
  private ws: InstanceType<typeof import('ws').default> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private authenticated = false; // Track if connect handshake completed
  private runIdToMessageId = new Map<string, string>(); // Track runId -> messageId for async responses
  private agentResponses = new Map<string, { content: string; sessionKey: string }>(); // Accumulate streamed content
  private readonly PING_INTERVAL_MS = 30000; // 30 seconds
  private readonly MESSAGE_TIMEOUT_MS = parseInt(process.env.JOHNNY5_MESSAGE_TIMEOUT || '180000', 10); // 3 minutes default (Claude can be slow)
  // Relay mode: bridge CLI acts as transparent WS tunnel to ManusLive
  private relayMode = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private bridgeManagerRef: any = null;

  /**
   * Safely extract text content from various payload formats.
   * Handles strings, objects with text/content properties, and arrays.
   */
  private extractTextContent(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value.map(item => this.extractTextContent(item)).join('');
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      // Try common text properties
      if (typeof obj.text === 'string') return obj.text;
      if (typeof obj.content === 'string') return obj.content;
      if (typeof obj.message === 'string') return obj.message;
      // Nested text content (common in Claude/Anthropic format)
      if (Array.isArray(obj.content)) {
        return obj.content.map(item => this.extractTextContent(item)).join('');
      }
      // Last resort - don't stringify to avoid [object Object]
      console.warn('[J5Bridge] Unable to extract text from:', JSON.stringify(obj).substring(0, 200));
      return '';
    }
    return String(value);
  }

  constructor(config?: Partial<J5Config>) {
    super();

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

    console.log('[J5Bridge] Service initialized', {
      gatewayUrl: this.state.config.gatewayUrl,
      enabled: this.state.config.enabled,
    });
  }

  // -------------------------------------------------------------------------
  // Relay Mode (bridge CLI acts as transparent tunnel to ManusLive)
  // -------------------------------------------------------------------------

  /**
   * Enable relay mode: swaps the direct WebSocket to ManusLive for a tunnel
   * through the coder1-bridge CLI's Socket.IO connection. All existing Moltbot
   * protocol parsing, pending message correlation, and timeout logic is kept.
   * Only the transport layer changes.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enableRelayMode(bridgeMgr: any): void {
    this.relayMode = true;
    this.bridgeManagerRef = bridgeMgr;

    // ManusLive handshake completed via bridge → mark as connected + authenticated
    bridgeMgr.on('j5:relay:authenticated', () => {
      this.authenticated = true;
      this.state.status.connected = true;
      this.state.status.gatewayUrl = `ws://127.0.0.1:${process.env.MANUSLIVE_PORT || '18789'}/dashboard`;
      this.emit('authenticated'); // Unblocks j5/chat route's 5s wait
      this.emit('connected');     // Triggers johnny5:j5-connected broadcast in server.js
      console.log('[J5Bridge] Relay mode: ManusLive connected via bridge');
    });

    // ManusLive disconnected (bridge disconnect or ManusLive crash)
    bridgeMgr.on('j5:ws:status', (data: { connected: boolean; error?: string }) => {
      if (!data.connected) {
        this.authenticated = false;
        this.state.status.connected = false;
        // Fail fast: reject all pending messages instead of waiting for timeout
        for (const [, pending] of this.state.pendingMessages) {
          clearTimeout(pending.timeout);
          pending.reject(new Error('ManusLive disconnected: ' + (data.error || 'unknown')));
        }
        this.state.pendingMessages.clear();
        this.emit('disconnected', data.error || 'ManusLive disconnected'); // Triggers j5-disconnected
        console.log('[J5Bridge] Relay mode: ManusLive disconnected —', data.error || '');
      }
    });

    // Incoming raw Moltbot messages from ManusLive via bridge tunnel
    bridgeMgr.on('j5:ws:message', (data: { payload: string }) => {
      try {
        this.handleMessage(data.payload);
      } catch { /* ignore parse errors */ }
    });

    console.log('[J5Bridge] Relay mode enabled — ManusLive connection managed by bridge CLI');
  }

  // -------------------------------------------------------------------------
  // Connection Management
  // -------------------------------------------------------------------------

  /**
   * Connect to the J5 gateway
   */
  async connect(gatewayUrl?: string): Promise<void> {
    // In relay mode the bridge CLI manages the ManusLive WebSocket — nothing to do here
    if (this.relayMode) {
      console.log('[J5Bridge] Relay mode: connect() is a no-op — bridge manages ManusLive connection');
      return;
    }
    const url = gatewayUrl || this.state.config.gatewayUrl;

    console.log(`[J5Bridge] Connecting to ${url}...`);

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
        // Connect to /dashboard path for J5 protocol (auth via connect handshake)
        const dashboardUrl = url.replace(/\/?$/, '/dashboard');
        this.ws = new WS(dashboardUrl);

        this.ws.on('open', () => {
          clearTimeout(timeoutId);
          this.handleConnectionOpen(url);
          resolve();
        });

        this.ws.on('message', (data: Buffer | string) => {
          this.handleMessage(data);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          this.handleConnectionClose(code, reason.toString());
        });

        this.ws.on('error', (error: Error) => {
          clearTimeout(timeoutId);
          this.handleConnectionError(error);
          reject(error);
        });

        this.ws.on('pong', () => {
          this.handlePong();
        });

      } catch (error) {
        clearTimeout(timeoutId);
        this.handleConnectionError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the J5 gateway
   */
  disconnect(): void {
    console.log('[J5Bridge] Disconnecting...');

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
      } catch (error) {
        console.warn('[J5Bridge] Error during disconnect:', error);
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
  async reconnect(gatewayUrl?: string): Promise<void> {
    console.log('[J5Bridge] Reconnecting...');
    this.disconnect();
    await this.connect(gatewayUrl);
  }

  // -------------------------------------------------------------------------
  // Private Connection Handlers
  // -------------------------------------------------------------------------

  private handleConnectionOpen(url: string): void {
    console.log(`[J5Bridge] Connected to ${url}`);

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

    // Auto-authenticate after 2 seconds if no challenge received
    // This handles ManusLive with auth mode "none" which doesn't send connect.challenge
    setTimeout(() => {
      if (!this.authenticated && this.state.status.connected) {
        console.log('[J5Bridge] No auth challenge received, auto-authenticating (auth mode: none)');
        this.authenticated = true;
        this.emit('authenticated');
      }
    }, 2000);
  }

  private handleConnectionClose(code: number, reason: string): void {
    console.log(`[J5Bridge] Connection closed (code: ${code}, reason: ${reason})`);

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

  private handleConnectionError(error: Error): void {
    console.error('[J5Bridge] Connection error:', error.message);

    this.updateStatus({
      connected: false,
      error: error.message,
    });

    this.emit('error', error);
    this.emit('connection-status', this.state.status);

    // Schedule reconnection
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    // After max retries, continue with longer interval (never give up)
    const pastMaxRetries = this.reconnectAttempts >= this.state.config.maxRetries;

    if (pastMaxRetries) {
      if (this.state.config.fallbackToDirect && !this.state.status.fallbackActive) {
        console.log('[J5Bridge] Activating fallback mode (will keep trying to reconnect)');
        this.updateStatus({
          fallbackActive: true,
        });
      }
    }

    // Exponential backoff: base * 2^attempts (capped at 60 seconds)
    // After max retries, use fixed 60-second interval and keep trying indefinitely
    const delay = pastMaxRetries
      ? 60000
      : Math.min(
          this.state.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
          60000
        );

    this.reconnectAttempts++;

    const attemptDisplay = pastMaxRetries
      ? `${this.reconnectAttempts} (persistent mode)`
      : `${this.reconnectAttempts}/${this.state.config.maxRetries}`;

    console.log(
      `[J5Bridge] Scheduling reconnection attempt ${attemptDisplay} in ${delay}ms`
    );

    this.updateStatus({
      reconnectAttempts: this.reconnectAttempts,
    });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        // Error handler will schedule next reconnect
      }
    }, delay);
  }

  // -------------------------------------------------------------------------
  // Heartbeat / Health Monitoring
  // -------------------------------------------------------------------------

  private startHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }

    this.pingTimer = setInterval(() => {
      this.sendPing();
    }, this.PING_INTERVAL_MS);

    // Send initial ping
    this.sendPing();
  }

  private sendPing(): void {
    if (!this.ws || this.ws.readyState !== 1) { // 1 = OPEN
      return;
    }

    try {
      this.ws.ping();
      this.updateStatus({
        lastPingAt: new Date(),
      });
      console.log('[J5Bridge] Ping sent');
    } catch (error) {
      console.warn('[J5Bridge] Failed to send ping:', error);
    }
  }

  private handlePong(): void {
    this.updateStatus({
      lastPongAt: new Date(),
    });
    console.log('[J5Bridge] Pong received');
  }

  /**
   * Check if connected and authenticated to the gateway
   */
  isConnected(): boolean {
    if (this.relayMode) {
      return this.state.status.connected && this.authenticated;
    }
    return this.state.status.connected && this.ws?.readyState === 1 && this.authenticated;
  }

  /**
   * Get current connection status
   */
  getStatus(): J5ConnectionStatus {
    return { ...this.state.status };
  }

  // -------------------------------------------------------------------------
  // Message Handling
  // -------------------------------------------------------------------------

  private handleMessage(data: Buffer | string): void {
    try {
      const raw = typeof data === 'string' ? data : data.toString('utf-8');

      // Debug: Log raw message to understand J5 protocol
      // Log more chars for agent/chat events to capture content
      const isAgentOrChat = raw.includes('"event":"agent"') || raw.includes('"event":"chat"');
      console.log(`[J5Bridge] Raw message received (first ${isAgentOrChat ? 1000 : 200} chars): ${raw.substring(0, isAgentOrChat ? 1000 : 200)}`);

      const parsed = JSON.parse(raw);

      // J5 uses nested event format: {"type":"event"|"evt","event":"...", "payload": {...}}
      // Handle both direct events and nested event format
      let eventType = parsed.type;
      let payload = parsed.payload;

      // Johnny5 sends type: "evt", J5 sends type: "event"
      if ((parsed.type === 'event' || parsed.type === 'evt') && parsed.event) {
        // Nested event format from J5
        eventType = parsed.event;
        console.log(`[J5Bridge] Received J5 event: ${eventType}`);

        // Handle J5-specific events
        switch (eventType) {
          case 'connect.challenge':
            // Respond to challenge to complete authentication
            this.handleConnectChallenge(payload);
            return;

          case 'connect.success':
            console.log('[J5Bridge] Authentication successful');
            return;

          case 'message':
          case 'response':
            // Handle message/response from J5
            this.handleJ5Response(payload);
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

          case 'chat.done':
            // ManusLive sends this when chat is complete
            this.handleChatDoneEvent(payload);
            return;

          case 'chat.running':
            // ManusLive sends this when chat starts
            console.log(`[J5Bridge] chat.running: runId=${payload?.runId}, sessionKey=${payload?.sessionKey}`);
            return;

          case 'chat.error':
            // ManusLive sends this on error
            this.handleChatErrorEvent(payload);
            return;

          default:
            console.log(`[J5Bridge] Unhandled J5 event: ${eventType}`);
            return;
        }
      }

      console.log(`[J5Bridge] Received event: ${eventType}`);

      switch (eventType) {
        case 'res':
          // Handle response to our requests
          // Log full response for debugging available methods
          console.log(`[J5Bridge] Full response: ${JSON.stringify(parsed).substring(0, 2000)}`);
          this.handleResponse(parsed);
          break;

        case 'message':
          this.handleIncomingMessage(payload as J5Message);
          break;

        case 'session_update':
          this.handleSessionUpdate(payload as J5Session);
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
              toolCalls: [payload as any],
            });
          }
          break;

        case 'error':
          this.handleErrorEvent(payload as { message: string; code?: string });
          break;

        case 'pong':
          this.handlePong();
          break;

        default:
          console.log(`[J5Bridge] Unknown event type: ${eventType}`);
      }

    } catch (error) {
      console.error('[J5Bridge] Failed to parse message:', error);
    }
  }

  private handleConnectChallenge(payload: { nonce: string; ts: number }): void {
    console.log('[J5Bridge] Responding to connect challenge...');
    console.log('[J5Bridge] Challenge payload:', JSON.stringify(payload));

    // Get auth token from environment (configured by user)
    // Try multiple env var sources for Next.js compatibility
    const authToken =
      process.env.J5_AUTH_TOKEN ||       // Standard server env
      process.env.NEXT_PUBLIC_J5_AUTH_TOKEN ||  // Client-accessible env
      '';  // Fallback to empty string for auth mode "none"

    // Exact format - J5 requires protocol 3
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
      console.log('[J5Bridge] Sending auth response:', responseJson.substring(0, 150));
      this.ws.send(responseJson);
      console.log('[J5Bridge] Auth response sent');
    } else {
      console.warn('[J5Bridge] Cannot send auth response - WebSocket not ready');
    }
  }

  private handleJ5Response(payload: any): void {
    console.log('[J5Bridge] Received J5 response:', JSON.stringify(payload).substring(0, 200));

    // Extract message content from J5 response using helper to avoid [object Object]
    const message: J5Message = {
      id: payload.id || payload.messageId || `msg-${Date.now()}`,
      sessionId: payload.sessionId || payload.session_id || 'default',
      role: 'assistant',
      content: this.extractTextContent(payload.content || payload.text || payload.message),
      timestamp: new Date(),
      toolCalls: payload.toolCalls || payload.tool_calls,
      thinking: payload.thinking,
      tokenUsage: payload.usage || payload.tokenUsage,
    };

    this.handleIncomingMessage(message);
  }

  private handleResponse(response: { id: string; ok?: boolean; result?: any; payload?: any; error?: any }): void {
    // ENHANCED DEBUG LOGGING
    console.log('[J5Bridge] ===== RESPONSE DEBUG =====');
    console.log('[J5Bridge] Response ID:', response.id);
    console.log('[J5Bridge] Response OK:', response.ok);
    console.log('[J5Bridge] Response Result:', response.result ? 'Present' : 'None');
    console.log('[J5Bridge] Response Payload:', response.payload ? 'Present' : 'None');
    console.log('[J5Bridge] Response Error:', response.error);
    console.log('[J5Bridge] Full Response:', JSON.stringify(response, null, 2).substring(0, 500));
    console.log('[J5Bridge] =========================');

    // Johnny5 returns "result" while J5 uses "ok"
    const success = response.ok === true || !!response.result;
    console.log(`[J5Bridge] Response received for id=${response.id}, success=${success}`);
    if (!success && response.error) {
      console.error(`[J5Bridge] Error details:`, JSON.stringify(response.error));
    }

    // Check if this is the connect handshake response (id="1")
    if (response.id === '1') {
      // Accept both ok=true OR result with any content
      const authSuccess = response.ok === true || !!response.result;
      if (authSuccess) {
        this.authenticated = true;
        console.log('[J5Bridge] Authentication complete - ready for chat');
        this.emit('authenticated');
      } else {
        console.error('[J5Bridge] Authentication failed. Response:', JSON.stringify(response));
      }
    }

    // Check if this is a response to a pending request
    const pending = this.state.pendingMessages.get(response.id);
    const responsePayload = response.result || response.payload;
    if (pending) {
      if (success && responsePayload) {
        // Check if this is an async chat response (has runId - Johnny5 doesn't send status)
        if (responsePayload.runId) {
          // This is the initial acknowledgment - DON'T resolve yet
          // Track runId -> messageId so we can resolve when chat event arrives
          const runId = responsePayload.runId;
          console.log(`[J5Bridge] Async chat started, runId=${runId}, waiting for completion...`);
          this.runIdToMessageId.set(runId, response.id);
          this.agentResponses.set(runId, { content: '', sessionKey: '' });
          // Keep the pending message - we'll resolve when chat event with state:"final" arrives
          return;
        }

        // Synchronous response - resolve immediately
        clearTimeout(pending.timeout);
        this.state.pendingMessages.delete(response.id);
        const extractedText = this.extractTextContent(
          responsePayload.content || responsePayload.text || responsePayload.message
        );
        const j5Response: J5Response = {
          text: extractedText || 'Response received but no text content found.',
          toolCalls: responsePayload.toolCalls,
          thinking: responsePayload.thinking,
          sessionId: responsePayload.sessionId || 'default',
          messageId: response.id,
          tokenUsage: responsePayload.usage,
        };
        pending.resolve(j5Response);
      } else if (response.error) {
        // Error response
        clearTimeout(pending.timeout);
        this.state.pendingMessages.delete(response.id);
        pending.reject(new Error(response.error.message || 'Unknown J5 error'));
      } else {
        clearTimeout(pending.timeout);
        this.state.pendingMessages.delete(response.id);
        pending.reject(new Error('Invalid response from J5'));
      }
    } else {
      console.log(`[J5Bridge] No pending request for id=${response.id}`);
    }
  }

  /**
   * Handle agent events (streamed content from J5 agent)
   *
   * NOTE: J5 can send either incremental deltas OR cumulative content.
   * To avoid duplication, we detect cumulative content (when new text starts with
   * or contains our existing content) and replace instead of append.
   */
  private handleAgentEvent(payload: any): void {
    const runId = payload.runId;
    if (!runId) return;

    // Log agent event data for debugging
    console.log(`[J5Bridge] Agent event: runId=${runId}, stream=${payload.stream}, data=${JSON.stringify(payload.data || {}).substring(0, 300)}`);

    // Track session key
    if (payload.sessionKey && this.agentResponses.has(runId)) {
      const resp = this.agentResponses.get(runId)!;
      resp.sessionKey = payload.sessionKey;
    }

    // Initialize response tracking if not exists
    if (!this.agentResponses.has(runId)) {
      this.agentResponses.set(runId, { content: '', sessionKey: payload.sessionKey || '' });
    }

    const resp = this.agentResponses.get(runId)!;

    // Helper to update content, detecting cumulative vs incremental
    const updateContent = (newText: string) => {
      if (!newText) return;

      // If new text is longer and starts with our existing content, it's cumulative - replace
      if (newText.length > resp.content.length && newText.startsWith(resp.content)) {
        resp.content = newText;
        console.log(`[J5Bridge] Cumulative update: ${resp.content.length} chars`);
      }
      // If new text is shorter but our content starts with it, ignore (stale data)
      else if (resp.content.startsWith(newText)) {
        console.log(`[J5Bridge] Ignoring stale data (already have longer content)`);
      }
      // If new text doesn't overlap, it's incremental - append
      else if (!resp.content.includes(newText)) {
        resp.content += newText;
        console.log(`[J5Bridge] Incremental append: ${resp.content.length} chars`);
      }
      // Already have this exact text, skip
      else {
        console.log(`[J5Bridge] Skipping duplicate content`);
      }
    };

    // Text stream contains assistant responses (J5 format)
    if (payload.stream === 'text' && payload.data) {
      const text = payload.data.text || payload.data.content || payload.data.delta || '';
      updateContent(text);
    }

    // Also check for content in data object directly (J5 format)
    if (payload.data?.content || payload.data?.text) {
      const text = payload.data.content || payload.data.text || '';
      updateContent(text);
    }

    // Johnny5 format: payload.type='delta' with payload.delta.text
    if (payload.type === 'delta' && payload.delta) {
      const text = payload.delta.text || payload.delta.content || '';
      if (text) {
        updateContent(text);
        console.log(`[J5Bridge] Johnny5 delta: ${text.length} chars`);
      }
    }

    // Johnny5 format: payload.type='done' with payload.content (final response)
    if (payload.type === 'done' && payload.content) {
      // Done event has the full response - replace
      resp.content = payload.content;
      console.log(`[J5Bridge] Johnny5 done: ${resp.content.length} chars`);

      // Resolve pending message if we have one
      const messageId = this.runIdToMessageId.get(runId);
      if (messageId) {
        const pending = this.state.pendingMessages.get(messageId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.state.pendingMessages.delete(messageId);
          this.runIdToMessageId.delete(runId);

          const j5Response: J5Response = {
            text: resp.content,
            sessionId: resp.sessionKey || 'dashboard:main',
            messageId: messageId,
          };
          pending.resolve(j5Response);
          console.log(`[J5Bridge] Resolved message ${messageId} with ${resp.content.length} chars`);
        }
      }
    }

    // Check for response in lifecycle end event (J5 format)
    if (payload.stream === 'lifecycle' && payload.data?.phase === 'end') {
      // Sometimes the final response is in the end event
      if (payload.data.response || payload.data.result || payload.data.output) {
        const text = payload.data.response || payload.data.result || payload.data.output || '';
        if (text && typeof text === 'string') {
          // Lifecycle end is authoritative - always replace
          resp.content = text;
          console.log(`[J5Bridge] Lifecycle end response: ${resp.content.length} chars`);
        }
      }
    }
  }

  /**
   * Handle chat events (streaming content and final state)
   */
  private async handleChatEvent(payload: any): Promise<void> {
    const runId = payload.runId;
    if (!runId) return;

    console.log(`[J5Bridge] Chat event: runId=${runId}, state=${payload.state}, sessionKey=${payload.sessionKey}`);

    // Handle streaming delta events
    if (payload.state === 'delta' && payload.message) {
      const messageId = this.runIdToMessageId.get(runId);
      if (messageId) {
        // Reset timeout on each streaming chunk so long responses don't time out
        const pending = this.state.pendingMessages.get(messageId);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.timeout = setTimeout(() => {
            this.state.pendingMessages.delete(messageId);
            pending.reject(new Error(`Message timeout after ${this.MESSAGE_TIMEOUT_MS}ms`));
          }, this.MESSAGE_TIMEOUT_MS);
        }

        const resp = this.agentResponses.get(runId);
        if (resp) {
          // Delta contains the full accumulated content so far - use helper to safely extract text
          const newContent = this.extractTextContent(payload.message);
          if (newContent) {
            resp.content = newContent;
            console.log(`[J5Bridge] Chat delta: content length=${resp.content.length}`);
          }
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
        console.log(`[J5Bridge] No messageId found for runId=${runId}`);
        return;
      }

      const pending = this.state.pendingMessages.get(messageId);
      if (!pending) {
        console.log(`[J5Bridge] No pending request for messageId=${messageId}`);
        return;
      }

      const sessionKey = payload.sessionKey || this.agentResponses.get(runId)?.sessionKey || 'webchat-test';

      // Get accumulated response from delta events
      const accumulatedResponse = this.agentResponses.get(runId) || { content: '', sessionKey };
      // Use accumulated content first, or try payload fields with safe extraction
      let responseText = accumulatedResponse.content ||
        this.extractTextContent(payload.summary) ||
        this.extractTextContent(payload.content) ||
        '';

      // If no content from deltas, try using agent.wait to get the response
      if (!responseText && this.ws) {
        console.log(`[J5Bridge] No delta content, trying agent.wait for runId=${runId}`);
        try {
          const waitId = `wait-${Date.now()}`;
          const waitPayload = {
            type: 'req',
            id: waitId,
            method: 'agent.wait',
            params: { runId },
          };

          this.ws.send(JSON.stringify(waitPayload));

          // Wait for response - agent.wait may not return content, try sessions.preview instead
          const previewId = `preview-${Date.now()}`;
          const previewPayload = {
            type: 'req',
            id: previewId,
            method: 'sessions.preview',
            params: { keys: [sessionKey] },  // API requires 'keys' array
          };

          this.ws.send(JSON.stringify(previewPayload));

          responseText = await new Promise<string>((resolve) => {
            const timeout = setTimeout(() => {
              this.ws?.off('message', handler);
              console.log(`[J5Bridge] sessions.preview timeout`);
              resolve('');
            }, 5000);

            const handler = (data: Buffer | string) => {
              try {
                const raw = typeof data === 'string' ? data : data.toString('utf-8');
                const parsed = JSON.parse(raw);
                if (parsed.type === 'res' && parsed.id === previewId) {
                  clearTimeout(timeout);
                  this.ws?.off('message', handler);
                  console.log(`[J5Bridge] sessions.preview response: ${JSON.stringify(parsed).substring(0, 1000)}`);
                  if (parsed.ok && parsed.payload) {
                    // Extract content from preview response using helper
                    const p = parsed.payload;
                    // Check for lastMessage or messages
                    if (p.lastMessage) {
                      const content = this.extractTextContent(p.lastMessage);
                      if (content) {
                        resolve(content);
                        return;
                      }
                    }
                    if (p.messages && Array.isArray(p.messages)) {
                      const lastMsg = [...p.messages].reverse().find((m: any) => m.role === 'assistant');
                      if (lastMsg?.content) {
                        const text = this.extractTextContent(lastMsg.content);
                        resolve(text);
                        return;
                      }
                    }
                    resolve('');
                  } else if (parsed.error) {
                    console.log(`[J5Bridge] sessions.preview error: ${parsed.error.message}`);
                    resolve('');
                  } else {
                    resolve('');
                  }
                }
              } catch { /* ignore */ }
            };

            this.ws?.on('message', handler);
          });
        } catch (err) {
          console.error('[J5Bridge] agent.wait error:', err);
        }
      }

      // If still no content, try fetching history as last resort
      if (!responseText && this.ws) {
        console.log(`[J5Bridge] Still no content, fetching chat.history for sessionKey=${sessionKey}`);
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
          responseText = await new Promise<string>((resolve) => {
            const timeout = setTimeout(() => {
              this.ws?.off('message', handler);
              resolve('');
            }, 2000);

            const handler = (data: Buffer | string) => {
              try {
                const raw = typeof data === 'string' ? data : data.toString('utf-8');
                const parsed = JSON.parse(raw);
                if (parsed.type === 'res' && parsed.id === historyId && parsed.ok) {
                  clearTimeout(timeout);
                  this.ws?.off('message', handler);
                  const messages = parsed.payload?.messages || [];
                  console.log(`[J5Bridge] History returned ${messages.length} messages`);
                  // Get last assistant message
                  const lastAssistant = [...messages].reverse().find((m: any) => m.role === 'assistant');
                  if (lastAssistant) {
                    // Check for error
                    if (lastAssistant.errorMessage || lastAssistant.stopReason === 'error') {
                      const error = lastAssistant.errorMessage || 'Unknown error';
                      console.log(`[J5Bridge] Agent error: ${error}`);
                      resolve(`[J5 Error] ${error}`);
                    } else if (lastAssistant.content) {
                      // Use extractTextContent to safely handle all formats (array, object, string)
                      const content = this.extractTextContent(lastAssistant.content);
                      console.log(`[J5Bridge] Found assistant message: ${content.substring(0, 100)}`);
                      resolve(content || '');
                    } else {
                      resolve('');
                    }
                  } else {
                    resolve('');
                  }
                }
              } catch { /* ignore */ }
            };

            this.ws?.on('message', handler);
          });
        } catch (err) {
          console.error('[J5Bridge] History fetch error:', err);
        }
      }

      // Build the response
      const response: J5Response = {
        text: responseText || '[J5] Agent completed but no response content was captured. The response may have been sent to configured messaging channels.',
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

      console.log(`[J5Bridge] Chat completed for runId=${runId}, response length=${response.text.length}`);
    }
  }

  private handleIncomingMessage(message: J5Message): void {
    console.log(`[J5Bridge] Message received for session ${message.sessionId}`);

    // Check if this is a response to a pending request
    const pending = this.state.pendingMessages.get(message.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.state.pendingMessages.delete(message.id);

      const response: J5Response = {
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

  private handleSessionUpdate(session: J5Session): void {
    console.log(`[J5Bridge] Session updated: ${session.id}`);
    this.state.sessions.set(session.id, session);
    this.emit('session-update', session);
  }

  private handleErrorEvent(error: { message: string; code?: string }): void {
    console.error(`[J5Bridge] Error from gateway: ${error.message}`);
    this.emit('error', new Error(error.message));
  }

  /**
   * Handle chat.done event from ManusLive
   * This is sent when a chat request completes successfully
   */
  private handleChatDoneEvent(payload: { runId: string; sessionKey: string; finalState?: string }): void {
    const { runId, sessionKey } = payload;
    console.log(`[J5Bridge] chat.done: runId=${runId}, sessionKey=${sessionKey}, finalState=${payload.finalState}`);

    const messageId = this.runIdToMessageId.get(runId);
    if (!messageId) {
      console.log(`[J5Bridge] chat.done: No messageId found for runId=${runId}`);
      return;
    }

    const pending = this.state.pendingMessages.get(messageId);
    if (!pending) {
      console.log(`[J5Bridge] chat.done: No pending request for messageId=${messageId}`);
      return;
    }

    // Get accumulated response from agent events
    const accumulated = this.agentResponses.get(runId);
    const responseText = accumulated?.content || 'Response completed but no content captured.';

    console.log(`[J5Bridge] chat.done: Resolving with ${responseText.length} chars`);

    clearTimeout(pending.timeout);
    this.state.pendingMessages.delete(messageId);
    this.runIdToMessageId.delete(runId);
    this.agentResponses.delete(runId);

    pending.resolve({
      text: responseText,
      sessionId: sessionKey,
      messageId: messageId,
    });
  }

  /**
   * Handle chat.error event from ManusLive
   * This is sent when a chat request fails
   */
  private handleChatErrorEvent(payload: { runId: string; error?: string; message?: string }): void {
    const { runId } = payload;
    const errorMessage = payload.error || payload.message || 'Unknown chat error';
    console.error(`[J5Bridge] chat.error: runId=${runId}, error=${errorMessage}`);

    const messageId = this.runIdToMessageId.get(runId);
    if (!messageId) return;

    const pending = this.state.pendingMessages.get(messageId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.state.pendingMessages.delete(messageId);
    this.runIdToMessageId.delete(runId);
    this.agentResponses.delete(runId);

    pending.reject(new Error(errorMessage));
  }

  // -------------------------------------------------------------------------
  // Message Sending
  // -------------------------------------------------------------------------

  /**
   * Send a message to J5 and wait for response
   * First tries sessions.list to find available sessions, then routes message
   */
  async sendMessage(sessionId: string, message: string): Promise<J5Response> {
    if (!this.isConnected()) {
      // Check fallback mode
      if (this.state.status.fallbackActive) {
        return this.handleFallbackMessage(sessionId, message);
      }
      throw new Error('Not connected to J5 gateway');
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
      // NOTE: deliver=true enables content streaming via events
      const payload = {
        type: 'req',
        id: messageId,
        method: 'chat.send',
        params: {
          sessionKey: sessionId,
          message: message,
          deliver: true,  // Enable content streaming
          idempotencyKey: messageId,
        },
      };

      try {
        const payloadStr = JSON.stringify(payload);
        console.log(`[J5Bridge] Sending via chat.send: ${payloadStr.substring(0, 200)}`);
        if (this.relayMode) {
          // Route through bridge CLI tunnel instead of direct WebSocket
          this.bridgeManagerRef!.sendJ5WsMessage(payloadStr);
        } else {
          this.ws!.send(payloadStr);
        }
        console.log(`[J5Bridge] Message sent: ${messageId}`);
      } catch (error) {
        clearTimeout(timeout);
        this.state.pendingMessages.delete(messageId);
        reject(error);
      }
    });
  }

  /**
   * Query available sessions from J5
   */
  async listSessions(): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Not connected to J5 gateway');
    }

    const requestId = `req-${Date.now()}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.state.pendingMessages.delete(requestId);
        reject(new Error('sessions.list timeout'));
      }, 10000);

      this.state.pendingMessages.set(requestId, {
        resolve: (r: J5Response) => resolve(r),
        reject,
        timeout
      });

      const payload = {
        type: 'req',
        id: requestId,
        method: 'sessions.list',
        params: {},
      };

      console.log(`[J5Bridge] Querying sessions.list`);
      this.ws!.send(JSON.stringify(payload));
    });
  }

  /**
   * Handle message in fallback mode (direct Claude API)
   */
  private async handleFallbackMessage(
    sessionId: string,
    message: string
  ): Promise<J5Response> {
    console.log('[J5Bridge] Using fallback mode for message');

    // In fallback mode, we return a response indicating the limitation
    return {
      text: '[J5 Unavailable] The J5 daemon is not connected. Message was not sent. Please ensure the J5 daemon is running on your local machine.',
      sessionId,
      messageId: `fallback-${Date.now()}`,
      thinking: 'Fallback mode active - J5 daemon unreachable',
    };
  }

  private clearPendingMessages(reason: string): void {
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
  async getSessions(): Promise<J5Session[]> {
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
      const handleResponse = (data: Buffer | string) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString('utf-8');
          const event: J5GatewayEvent = JSON.parse(raw);

          if (event.type === 'session_list') {
            clearTimeout(timeout);
            this.ws?.off('message', handleResponse);
            const sessions = event.payload as J5Session[];
            // Update cache
            for (const session of sessions) {
              this.state.sessions.set(session.id, session);
            }
            resolve(sessions);
          }
        } catch {
          // Ignore parse errors, wait for correct response
        }
      };

      this.ws?.on('message', handleResponse);

      // Send request
      const payload: J5GatewayEvent = {
        type: 'list_sessions' as any,
        payload: { requestId },
        timestamp: new Date(),
      };

      try {
        this.ws!.send(JSON.stringify(payload));
      } catch (error) {
        clearTimeout(timeout);
        this.ws?.off('message', handleResponse);
        reject(error);
      }
    });
  }

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<J5Session | null> {
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
  async createSession(name?: string): Promise<J5Session> {
    if (!this.isConnected()) {
      throw new Error('Not connected to J5 gateway');
    }

    return new Promise((resolve, reject) => {
      const requestId = `req-${Date.now()}`;
      const timeout = setTimeout(() => {
        reject(new Error('Session creation timeout'));
      }, 10000);

      // One-time listener for response
      const handleResponse = (data: Buffer | string) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString('utf-8');
          const event: J5GatewayEvent = JSON.parse(raw);

          if (event.type === 'session_created' as any) {
            clearTimeout(timeout);
            this.ws?.off('message', handleResponse);
            const session = event.payload as J5Session;
            this.state.sessions.set(session.id, session);
            resolve(session);
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.ws?.on('message', handleResponse);

      // Send request
      const payload: J5GatewayEvent = {
        type: 'create_session' as any,
        payload: { requestId, name },
        timestamp: new Date(),
      };

      try {
        this.ws!.send(JSON.stringify(payload));
      } catch (error) {
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
  getConfig(): J5Config {
    return { ...this.state.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<J5Config>): void {
    this.state.config = { ...this.state.config, ...config };
    console.log('[J5Bridge] Configuration updated:', this.state.config);
  }

  // -------------------------------------------------------------------------
  // Status Helper
  // -------------------------------------------------------------------------

  private updateStatus(updates: Partial<J5ConnectionStatus>): void {
    this.state.status = { ...this.state.status, ...updates };
  }
}

// ============================================================================
// Global Singleton Instance
// ============================================================================
// Using globalThis to ensure the same instance is shared across CommonJS (server.js)
// and ES modules (Next.js API routes). This is critical because they would otherwise
// create separate instances with different connection states.

declare global {
  // eslint-disable-next-line no-var
  var __j5BridgeInstance: J5BridgeService | undefined;
}

/**
 * Get the singleton J5 Bridge instance
 * Uses globalThis to share instance across CommonJS and ES module systems
 */
export function getJ5Bridge(): J5BridgeService {
  if (!globalThis.__j5BridgeInstance) {
    globalThis.__j5BridgeInstance = new J5BridgeService();
    console.log('[J5Bridge] Created new global singleton instance');
  }
  return globalThis.__j5BridgeInstance;
}

/**
 * Create a new J5 Bridge instance (for testing or custom configs)
 */
export function createJ5Bridge(
  config?: Partial<J5Config>
): J5BridgeService {
  return new J5BridgeService(config);
}

// Export the class for testing and type inference
export { J5BridgeService };

// Default export is the singleton getter
export default getJ5Bridge;
