/**
 * Coder1 Bridge Manager Service
 * Manages connections between web IDE and local bridge CLI instances
 */

import { Socket } from 'socket.io';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';

interface BridgeConnection {
  id: string;
  socket: Socket;
  userId: string;
  pairedAt: Date;
  lastHeartbeat: Date;
  version: string;
  platform: string;
  claudeVersion?: string;
  capabilities: string[];
  stats: {
    commandsExecuted: number;
    uptime: number;
    memoryUsage: number;
  };
}

interface PairingCode {
  code: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

interface CommandRequest {
  sessionId: string;
  commandId: string;
  command: string;
  context: {
    workingDirectory: string;
    currentFile?: string;
    selection?: string;
    envVars?: Record<string, string>;
  };
  timestamp: Date;
  timeout?: number;
}

interface PendingCommand {
  request: CommandRequest;
  bridgeId: string;
  startedAt?: Date;
  timeoutHandle?: NodeJS.Timeout;
}

interface PendingFileRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  operation: string;
  path: string;
}

export class BridgeManager extends EventEmitter {
  private bridges: Map<string, BridgeConnection> = new Map();
  private userBridges: Map<string, Set<string>> = new Map();
  private pairingCodes: Map<string, PairingCode> = new Map();
  private pendingCommands: Map<string, PendingCommand> = new Map();
  private pendingFileRequests: Map<string, PendingFileRequest> = new Map();

  // Configuration
  private readonly PAIRING_CODE_LENGTH = 6;
  private readonly PAIRING_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 3 * 30 * 1000; // 3 missed heartbeats
  // FIXED (Dec 10, 2025): Increased from 60s to 120s for long-running Claude commands
  private readonly DEFAULT_COMMAND_TIMEOUT = 120 * 1000; // 120 seconds
  private readonly DEFAULT_FILE_TIMEOUT = 30 * 1000; // 30 seconds for file operations
  private readonly MAX_COMMANDS_PER_BRIDGE = 5;
  
  constructor() {
    super();
    this.startHeartbeatMonitor();
    this.startCodeCleanup();
  }

  /**
   * Generate a new pairing code for a user
   */
  generatePairingCode(userId: string): string {
    // Clean up any existing codes for this user
    this.pairingCodes.forEach((code, key) => {
      if (code.userId === userId) {
        this.pairingCodes.delete(key);
      }
    });

    // Generate new 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    this.pairingCodes.set(code, {
      code,
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.PAIRING_CODE_EXPIRY)
    });

    console.log(`[BridgeManager] Generated pairing code ${code} for user ${userId}`);
    return code;
  }

  /**
   * Validate pairing code and return user ID
   */
  validatePairingCode(code: string): string | null {
    const pairing = this.pairingCodes.get(code);
    
    if (!pairing) {
      console.log(`[BridgeManager] Invalid pairing code: ${code}`);
      return null;
    }

    if (pairing.expiresAt < new Date()) {
      console.log(`[BridgeManager] Expired pairing code: ${code}`);
      this.pairingCodes.delete(code);
      return null;
    }

    // Code is valid, remove it (one-time use)
    this.pairingCodes.delete(code);
    console.log(`[BridgeManager] Validated pairing code for user ${pairing.userId}`);
    return pairing.userId;
  }

  /**
   * Register a new bridge connection
   */
  registerBridge(
    socket: Socket,
    userId: string,
    metadata: {
      version: string;
      platform: string;
      claudeVersion?: string;
    }
  ): string {
    const bridgeId = `bridge_${Date.now()}_${randomBytes(4).toString('hex')}`;
    
    const connection: BridgeConnection = {
      id: bridgeId,
      socket,
      userId,
      pairedAt: new Date(),
      lastHeartbeat: new Date(),
      version: metadata.version,
      platform: metadata.platform,
      claudeVersion: metadata.claudeVersion,
      capabilities: this.detectCapabilities(metadata),
      stats: {
        commandsExecuted: 0,
        uptime: 0,
        memoryUsage: 0
      }
    };

    // Store bridge
    this.bridges.set(bridgeId, connection);
    
    // Track user bridges
    if (!this.userBridges.has(userId)) {
      this.userBridges.set(userId, new Set());
    }
    this.userBridges.get(userId)!.add(bridgeId);

    // Set up socket event handlers
    this.setupSocketHandlers(bridgeId, socket);

    console.log(`[BridgeManager] Registered bridge ${bridgeId} for user ${userId}`);
    this.emit('bridge:connected', { bridgeId, userId });

    return bridgeId;
  }

  /**
   * Set up event handlers for a bridge socket
   */
  private setupSocketHandlers(bridgeId: string, socket: Socket): void {
    // Heartbeat
    socket.on('heartbeat', (data) => {
      const bridge = this.bridges.get(bridgeId);
      if (bridge) {
        bridge.lastHeartbeat = new Date();
        if (data.stats) {
          bridge.stats = data.stats;
        }
      }
    });

    // Claude command output
    socket.on('claude:output', (data) => {
      const command = this.pendingCommands.get(data.commandId);
      if (command) {
        this.emit('command:output', {
          ...data,
          bridgeId
        });
      }
    });

    // Claude command complete
    socket.on('claude:complete', (data) => {
      const command = this.pendingCommands.get(data.commandId);
      if (command) {
        // Clear timeout
        if (command.timeoutHandle) {
          clearTimeout(command.timeoutHandle);
        }

        // Update stats
        const bridge = this.bridges.get(bridgeId);
        if (bridge) {
          bridge.stats.commandsExecuted++;
        }

        // Remove from pending
        this.pendingCommands.delete(data.commandId);

        this.emit('command:complete', {
          ...data,
          bridgeId
        });
      }
    });

    // Claude command error - forwards errors to terminal for user visibility
    socket.on('claude:error', (data) => {
      console.log(`[BridgeManager] Claude error for command ${data.commandId}: ${data.error}`);
      this.emit('command:error', {
        ...data,
        bridgeId
      });
    });

    // File operation responses
    socket.on('file:response', (data) => {
      // Resolve pending file request Promise
      const pending = this.pendingFileRequests.get(data.requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingFileRequests.delete(data.requestId);

        if (data.error) {
          pending.reject(new Error(data.error));
        } else {
          pending.resolve(data.result);
        }
      }

      // Also emit event for other listeners
      this.emit('file:response', {
        ...data,
        bridgeId
      });
    });

    // Errors
    socket.on('error', (error) => {
      console.error(`[BridgeManager] Bridge ${bridgeId} error:`, error);
      this.emit('bridge:error', { bridgeId, error });
    });

    // Disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[BridgeManager] Bridge ${bridgeId} disconnected: ${reason}`);
      this.unregisterBridge(bridgeId);
    });
  }

  /**
   * Execute a Claude command through a bridge
   */
  async executeCommand(
    userId: string,
    request: CommandRequest
  ): Promise<{ success: boolean; error?: string }> {
    // Try user-specific bridge first, then fall back to any connected bridge
    let bridgeId = this.findAvailableBridge(userId);

    // Fallback: find any connected bridge (for alpha testing)
    // This handles the case where terminal session has userId='default'
    // but bridge is registered with a different userId from JWT auth
    if (!bridgeId) {
      const fallbackBridge = this.findAnyConnectedBridge();
      if (fallbackBridge) {
        bridgeId = fallbackBridge.id;
        console.log(`[BridgeManager] Using fallback bridge ${bridgeId} for command execution`);
      }
    }

    if (!bridgeId) {
      return {
        success: false,
        error: 'No bridge connected. Please connect Coder1 Bridge CLI.'
      };
    }

    const bridge = this.bridges.get(bridgeId);
    if (!bridge) {
      return {
        success: false,
        error: 'Bridge connection lost'
      };
    }

    // Check if bridge is at capacity
    const activeBridgeCommands = Array.from(this.pendingCommands.values())
      .filter(cmd => cmd.bridgeId === bridgeId).length;
    
    if (activeBridgeCommands >= this.MAX_COMMANDS_PER_BRIDGE) {
      return {
        success: false,
        error: 'Bridge at maximum command capacity'
      };
    }

    // Store pending command
    const pendingCommand: PendingCommand = {
      request,
      bridgeId,
      startedAt: new Date()
    };

    // Set timeout
    const timeout = request.timeout || this.DEFAULT_COMMAND_TIMEOUT;
    pendingCommand.timeoutHandle = setTimeout(() => {
      this.handleCommandTimeout(request.commandId);
    }, timeout);

    this.pendingCommands.set(request.commandId, pendingCommand);

    // FIXED (Dec 10, 2025): Validate socket is still connected before emit
    // If bridge disconnected right before emit, command would be lost silently
    if (!bridge.socket.connected) {
      // Clean up pending command since we can't send it
      if (pendingCommand.timeoutHandle) {
        clearTimeout(pendingCommand.timeoutHandle);
      }
      this.pendingCommands.delete(request.commandId);
      return {
        success: false,
        error: 'Bridge connection lost. Please reconnect and try again.'
      };
    }

    // Send command to bridge
    bridge.socket.emit('claude:execute', {
      sessionId: request.sessionId,
      commandId: request.commandId,
      command: request.command,
      context: request.context
    });

    console.log(`[BridgeManager] Sent command ${request.commandId} to bridge ${bridgeId}`);
    return { success: true };
  }

  /**
   * Request a file operation through a bridge
   * Returns a Promise that resolves with the file operation result
   */
  async requestFileOperation(
    userId: string,
    operation: 'read' | 'write' | 'list' | 'exists',
    path: string,
    options?: any
  ): Promise<any> {
    // Try user-specific bridge first, then fall back to any connected bridge
    let bridgeId = this.findAvailableBridge(userId);
    let bridge = bridgeId ? this.bridges.get(bridgeId) : null;

    // Fallback: find any connected bridge (for alpha testing)
    if (!bridge) {
      const fallbackBridge = this.findAnyConnectedBridge();
      if (fallbackBridge) {
        bridgeId = fallbackBridge.id;
        bridge = this.bridges.get(bridgeId);
        console.log(`[BridgeManager] Using fallback bridge ${bridgeId} for file operation`);
      }
    }

    if (!bridge) {
      throw new Error('No bridge connected. Please connect Coder1 Bridge CLI.');
    }

    const requestId = `file_${Date.now()}_${randomBytes(4).toString('hex')}`;

    return new Promise((resolve, reject) => {
      // Set timeout for file operation
      const timeout = setTimeout(() => {
        this.pendingFileRequests.delete(requestId);
        reject(new Error(`File operation timed out: ${operation} ${path}`));
      }, this.DEFAULT_FILE_TIMEOUT);

      // Track the pending request
      this.pendingFileRequests.set(requestId, {
        resolve,
        reject,
        timeout,
        operation,
        path
      });

      // Send request to bridge
      bridge!.socket.emit('file:request', {
        requestId,
        operation,
        path,
        ...options
      });

      console.log(`[BridgeManager] Sent file request ${requestId}: ${operation} ${path}`);
    });
  }

  /**
   * Check if any bridge is connected for a user
   */
  hasBridgeForUser(userId: string): boolean {
    const userBridgeIds = this.userBridges.get(userId);
    if (userBridgeIds && userBridgeIds.size > 0) {
      return true;
    }
    // Fallback: check if any bridge is connected
    return this.bridges.size > 0;
  }

  /**
   * Get bridge for a specific user (or any connected bridge as fallback)
   */
  getBridgeForUser(userId: string): BridgeConnection | null {
    const bridgeId = this.findAvailableBridge(userId);
    if (bridgeId) {
      return this.bridges.get(bridgeId) || null;
    }
    // Fallback: return any connected bridge
    const fallback = this.findAnyConnectedBridge();
    return fallback ? this.bridges.get(fallback.id) || null : null;
  }

  /**
   * Get bridge by ID (Dec 10, 2025: Added for interactive Claude session input routing)
   */
  getBridge(bridgeId: string): BridgeConnection | null {
    return this.bridges.get(bridgeId) || null;
  }

  /**
   * Find an available bridge for a user
   */
  private findAvailableBridge(userId: string): string | null {
    const userBridgeIds = this.userBridges.get(userId);
    if (!userBridgeIds || userBridgeIds.size === 0) {
      return null;
    }

    // Find bridge with least active commands
    let bestBridge: string | null = null;
    let minCommands = Infinity;

    for (const bridgeId of userBridgeIds) {
      const bridge = this.bridges.get(bridgeId);
      if (!bridge) continue;

      const activeCommands = Array.from(this.pendingCommands.values())
        .filter(cmd => cmd.bridgeId === bridgeId).length;
      
      if (activeCommands < minCommands) {
        minCommands = activeCommands;
        bestBridge = bridgeId;
      }
    }

    return bestBridge;
  }

  /**
   * Handle command timeout
   */
  private handleCommandTimeout(commandId: string): void {
    const command = this.pendingCommands.get(commandId);
    if (command) {
      console.log(`[BridgeManager] Command ${commandId} timed out`);
      this.pendingCommands.delete(commandId);
      
      this.emit('command:timeout', {
        commandId,
        bridgeId: command.bridgeId
      });
    }
  }

  /**
   * Unregister a bridge connection
   */
  private unregisterBridge(bridgeId: string): void {
    const bridge = this.bridges.get(bridgeId);
    if (!bridge) return;

    // Clean up user bridges
    const userBridgeIds = this.userBridges.get(bridge.userId);
    if (userBridgeIds) {
      userBridgeIds.delete(bridgeId);
      if (userBridgeIds.size === 0) {
        this.userBridges.delete(bridge.userId);
      }
    }

    // Cancel pending commands
    // FIXED (Dec 10, 2025): Include sessionId and error message so server can notify terminal
    this.pendingCommands.forEach((cmd, commandId) => {
      if (cmd.bridgeId === bridgeId) {
        if (cmd.timeoutHandle) {
          clearTimeout(cmd.timeoutHandle);
        }
        this.pendingCommands.delete(commandId);
        // Emit with full context so server can route error to terminal
        this.emit('command:cancelled', {
          commandId,
          bridgeId,
          sessionId: cmd.request.sessionId,
          error: 'Bridge disconnected while command was executing. Please reconnect and try again.'
        });
      }
    });

    // Remove bridge
    this.bridges.delete(bridgeId);
    
    console.log(`[BridgeManager] Unregistered bridge ${bridgeId}`);
    this.emit('bridge:disconnected', { bridgeId, userId: bridge.userId });
  }

  /**
   * Monitor heartbeats and remove dead connections
   */
  private startHeartbeatMonitor(): void {
    setInterval(() => {
      const now = new Date();
      const timeout = this.HEARTBEAT_TIMEOUT;

      this.bridges.forEach((bridge, bridgeId) => {
        const timeSinceHeartbeat = now.getTime() - bridge.lastHeartbeat.getTime();
        
        if (timeSinceHeartbeat > timeout) {
          console.log(`[BridgeManager] Bridge ${bridgeId} heartbeat timeout`);
          bridge.socket.disconnect();
          this.unregisterBridge(bridgeId);
        }
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Clean up expired pairing codes
   */
  private startCodeCleanup(): void {
    setInterval(() => {
      const now = new Date();
      
      this.pairingCodes.forEach((code, key) => {
        if (code.expiresAt < now) {
          console.log(`[BridgeManager] Cleaning up expired pairing code ${key}`);
          this.pairingCodes.delete(key);
        }
      });
    }, 60 * 1000); // Every minute
  }

  /**
   * Detect bridge capabilities based on metadata
   */
  private detectCapabilities(metadata: any): string[] {
    const capabilities = ['claude']; // Always support Claude
    
    // Add capabilities based on version and platform
    if (metadata.claudeVersion) {
      capabilities.push('claude-cli');
    }
    
    // All bridges support file operations
    capabilities.push('files');
    
    // Platform-specific capabilities
    if (metadata.platform === 'darwin' || metadata.platform === 'linux') {
      capabilities.push('unix-commands');
    }
    
    return capabilities;
  }

  /**
   * Get bridge status for a user
   */
  getBridgeStatus(userId: string): {
    connected: boolean;
    bridges: Array<{
      id: string;
      connectedAt: Date;
      platform: string;
      version: string;
      stats: any;
    }>;
  } {
    const userBridgeIds = this.userBridges.get(userId);
    
    if (!userBridgeIds || userBridgeIds.size === 0) {
      return { connected: false, bridges: [] };
    }

    const bridges = Array.from(userBridgeIds)
      .map(id => this.bridges.get(id))
      .filter(Boolean)
      .map(bridge => ({
        id: bridge!.id,
        connectedAt: bridge!.pairedAt,
        platform: bridge!.platform,
        version: bridge!.version,
        stats: bridge!.stats
      }));

    return {
      connected: bridges.length > 0,
      bridges
    };
  }

  /**
   * Find ANY connected bridge (fallback for alpha when userId doesn't match)
   * This is a temporary fix for the userId mismatch bug in terminal sessions
   */
  findAnyConnectedBridge(): {
    id: string;
    userId: string;
    connectedAt: Date;
    platform: string;
    version: string;
  } | null {
    if (this.bridges.size === 0) {
      return null;
    }

    // Get the first available bridge
    const firstBridge = Array.from(this.bridges.values())[0];
    if (!firstBridge) {
      return null;
    }

    console.log(`[BridgeManager] Fallback: Found bridge ${firstBridge.id} for user ${firstBridge.userId}`);

    return {
      id: firstBridge.id,
      userId: firstBridge.userId,
      connectedAt: firstBridge.pairedAt,
      platform: firstBridge.platform,
      version: firstBridge.version
    };
  }

  /**
   * Broadcast a message to all bridges for a user
   */
  broadcastToUser(userId: string, event: string, data: any): void {
    const userBridgeIds = this.userBridges.get(userId);
    if (!userBridgeIds) return;

    userBridgeIds.forEach(bridgeId => {
      const bridge = this.bridges.get(bridgeId);
      if (bridge) {
        bridge.socket.emit(event, data);
      }
    });
  }
}

// Export singleton instance
export const bridgeManager = new BridgeManager();