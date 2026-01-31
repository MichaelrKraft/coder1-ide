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
import { EventEmitter } from 'events';
import type { MoltbotConfig, MoltbotConnectionStatus, MoltbotMessage, MoltbotSession, MoltbotResponse } from '../../types/johnny5';
export interface MoltbotBridgeState {
    config: MoltbotConfig;
    status: MoltbotConnectionStatus;
    sessions: Map<string, MoltbotSession>;
    pendingMessages: Map<string, {
        resolve: (value: MoltbotResponse) => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
    }>;
}
export interface MoltbotBridgeEvents {
    connected: () => void;
    disconnected: (reason: string) => void;
    message: (message: MoltbotMessage) => void;
    'session-update': (session: MoltbotSession) => void;
    error: (error: Error) => void;
    'connection-status': (status: MoltbotConnectionStatus) => void;
}
declare class MoltbotBridgeService extends EventEmitter {
    private state;
    private ws;
    private reconnectTimer;
    private pingTimer;
    private reconnectAttempts;
    private authenticated;
    private runIdToMessageId;
    private agentResponses;
    private readonly PING_INTERVAL_MS;
    private readonly MESSAGE_TIMEOUT_MS;
    constructor(config?: Partial<MoltbotConfig>);
    /**
     * Connect to the Moltbot gateway
     */
    connect(gatewayUrl?: string): Promise<void>;
    /**
     * Disconnect from the Moltbot gateway
     */
    disconnect(): void;
    /**
     * Reconnect to the gateway (with optional new URL)
     */
    reconnect(gatewayUrl?: string): Promise<void>;
    private handleConnectionOpen;
    private handleConnectionClose;
    private handleConnectionError;
    private scheduleReconnect;
    private startHeartbeat;
    private sendPing;
    private handlePong;
    /**
     * Check if connected and authenticated to the gateway
     */
    isConnected(): boolean;
    /**
     * Get current connection status
     */
    getStatus(): MoltbotConnectionStatus;
    private handleMessage;
    private handleConnectChallenge;
    private handleMoltbotResponse;
    private handleResponse;
    /**
     * Handle agent events (streamed content from Moltbot agent)
     */
    private handleAgentEvent;
    /**
     * Handle chat events (streaming content and final state)
     */
    private handleChatEvent;
    private handleIncomingMessage;
    private handleSessionUpdate;
    private handleErrorEvent;
    /**
     * Send a message to Moltbot and wait for response
     * First tries sessions.list to find available sessions, then routes message
     */
    sendMessage(sessionId: string, message: string): Promise<MoltbotResponse>;
    /**
     * Query available sessions from Moltbot
     */
    listSessions(): Promise<any>;
    /**
     * Handle message in fallback mode (direct Claude API)
     */
    private handleFallbackMessage;
    private clearPendingMessages;
    /**
     * Get all known sessions
     */
    getSessions(): Promise<MoltbotSession[]>;
    /**
     * Get a specific session by ID
     */
    getSession(sessionId: string): Promise<MoltbotSession | null>;
    /**
     * Create a new session
     */
    createSession(name?: string): Promise<MoltbotSession>;
    /**
     * Get current configuration
     */
    getConfig(): MoltbotConfig;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<MoltbotConfig>): void;
    private updateStatus;
}
declare global {
    var __moltbotBridgeInstance: MoltbotBridgeService | undefined;
}
/**
 * Get the singleton Moltbot Bridge instance
 * Uses globalThis to share instance across CommonJS and ES module systems
 */
export declare function getMoltbotBridge(): MoltbotBridgeService;
/**
 * Create a new Moltbot Bridge instance (for testing or custom configs)
 */
export declare function createMoltbotBridge(config?: Partial<MoltbotConfig>): MoltbotBridgeService;
export { MoltbotBridgeService };
export default getMoltbotBridge;
