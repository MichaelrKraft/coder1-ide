/**
 * Companion Client - Web IDE Bridge to Local Companion Service
 * 
 * Provides seamless integration between the web-based Coder1 IDE 
 * and the local companion service running Claude Code
 */

import { EventEmitter } from 'events';

export interface CompanionConnectionInfo {
  version: string;
  port: number;
  pid: number;
  startTime: string;
  security: {
    allowedOrigins: string[];
  };
}

export interface CompanionStatus {
  connected: boolean;
  installed: boolean;
  version?: string;
  port?: number;
  lastCheck: number;
  error?: string;
}

export interface ClaudeCommandResult {
  type: 'simple' | 'complex';
  command: string;
  result: any;
  duration: number;
  success: boolean;
  sessionId: string;
}

export interface FileSyncChange {
  projectPath: string;
  timestamp: string;
  changes: Array<{
    type: 'added' | 'modified' | 'deleted' | 'dir_added' | 'dir_deleted';
    path: string;
    size?: number;
    mtime?: number;
  }>;
}

export class CompanionClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private status: CompanionStatus = {
    connected: false,
    installed: false,
    lastCheck: 0
  };
  private connectionInfo: CompanionConnectionInfo | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor() {
    super();
    this.checkInstallation();
  }

  /**
   * Check if companion service is installed and running
   */
  async checkInstallation(): Promise<CompanionStatus> {
    this.status.lastCheck = Date.now();

    try {
      // Try to detect connection file
      const response = await fetch('/api/companion/detect', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        this.connectionInfo = await response.json();
        this.status.installed = true;
        this.status.version = this.connectionInfo.version;
        this.status.port = this.connectionInfo.port;

        // Try to establish WebSocket connection
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          await this.connect();
        }

        this.emit('status-changed', this.status);
        return this.status;
      }

      // Not installed or not running
      this.status.installed = false;
      this.status.connected = false;
      this.status.error = 'Companion service not detected';
      
    } catch (error) {
      this.status.installed = false;
      this.status.connected = false;
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.emit('status-changed', this.status);
    return this.status;
  }

  /**
   * Connect to companion service WebSocket
   */
  async connect(): Promise<void> {
    if (!this.connectionInfo) {
      throw new Error('Companion service not detected');
    }

    return new Promise((resolve, reject) => {
      const wsUrl = `ws://localhost:${this.connectionInfo!.port}/ws`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.status.connected = true;
        this.status.error = undefined;
        
        this.startHeartbeat();
        this.emit('connected');
        this.emit('status-changed', this.status);
        
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        this.status.connected = false;
        this.clearHeartbeat();
        this.emit('disconnected');
        this.emit('status-changed', this.status);
        
        // Attempt reconnection
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        this.status.connected = false;
        this.status.error = 'WebSocket connection failed';
        this.emit('error', new Error('WebSocket connection failed'));
        reject(new Error('WebSocket connection failed'));
      };

      // Connection timeout
      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Initialize project with companion service
   */
  async initProject(projectPath: string, sessionId: string): Promise<void> {
    this.ensureConnected();
    
    return this.sendMessage({
      type: 'init',
      data: { projectPath, sessionId }
    });
  }

  /**
   * Execute Claude Code command through companion
   */
  async executeClaudeCommand(command: string, options: {
    workDir?: string;
    sessionId?: string;
    timeout?: number;
  } = {}): Promise<ClaudeCommandResult> {
    this.ensureConnected();

    const requestId = this.generateRequestId();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Command execution timeout'));
      }, options.timeout || 300000); // 5 minute default timeout

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      this.ws!.send(JSON.stringify({
        type: 'claude-command',
        requestId,
        data: {
          command,
          workDir: options.workDir,
          sessionId: options.sessionId
        }
      }));
    });
  }

  /**
   * Sync files with local file system
   */
  async syncFiles(files: Array<{
    path: string;
    content?: string;
    action: 'write' | 'delete' | 'read';
  }>): Promise<void> {
    this.ensureConnected();

    return this.sendMessage({
      type: 'file-sync',
      data: { files }
    });
  }

  /**
   * Update session metadata
   */
  async updateSession(sessionData: any): Promise<void> {
    this.ensureConnected();

    this.ws!.send(JSON.stringify({
      type: 'session-update',
      data: sessionData
    }));
  }

  /**
   * Get current status
   */
  getStatus(): CompanionStatus {
    return { ...this.status };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnect from companion service
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.clearHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.status.connected = false;
    this.emit('disconnected');
    this.emit('status-changed', this.status);
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'connected':
        // Initial connection acknowledgment
        break;

      case 'claude-result':
        this.handleCommandResult(message.requestId, message.data);
        break;

      case 'claude-error':
        this.handleCommandError(message.requestId, message.error);
        break;

      case 'claude-progress':
        this.emit('claude-progress', message.requestId, message.data);
        break;

      case 'file-changes':
        this.emit('file-changes', message.data as FileSyncChange);
        break;

      case 'sync-complete':
        this.emit('sync-complete', message.data);
        break;

      case 'sync-error':
        this.emit('sync-error', new Error(message.error));
        break;

      case 'error':
        this.emit('error', new Error(message.error));
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.warn('Unknown message type from companion:', message.type);
    }
  }

  private handleCommandResult(requestId: string, result: any): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
      pending.resolve(result);
    }
  }

  private handleCommandError(requestId: string, error: string): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
      pending.reject(new Error(error));
    }
  }

  private sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to companion service'));
        return;
      }

      try {
        this.ws!.send(JSON.stringify(message));
        resolve(undefined);
      } catch (error) {
        reject(error);
      }
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.ws!.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30 second heartbeat
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      
      if (!this.isConnected()) {
        this.checkInstallation();
      }
    }, 5000); // Reconnect after 5 seconds
  }

  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('Not connected to companion service');
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

// Singleton instance for global use
let companionClient: CompanionClient | null = null;

export function getCompanionClient(): CompanionClient {
  if (!companionClient) {
    companionClient = new CompanionClient();
  }
  return companionClient;
}

export default CompanionClient;