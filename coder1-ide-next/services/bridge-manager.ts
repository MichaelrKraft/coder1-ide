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

export class BridgeManager extends EventEmitter {
  private bridges: Map<string, BridgeConnection> = new Map();
  private userBridges: Map<string, Set<string>> = new Map();
  private pairingCodes: Map<string, PairingCode> = new Map();
  private pendingCommands: Map<string, PendingCommand> = new Map();
  
  // Configuration
  private readonly PAIRING_CODE_LENGTH = 6;
  private readonly PAIRING_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 3 * 30 * 1000; // 3 missed heartbeats
  private readonly DEFAULT_COMMAND_TIMEOUT = 60 * 1000; // 60 seconds
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

    // File operation responses
    socket.on('file:response', (data) => {
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
    // Find an available bridge for this user
    const bridgeId = this.findAvailableBridge(userId);
    
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
   */
  async requestFileOperation(
    userId: string,
    operation: 'read' | 'write' | 'list' | 'exists',
    path: string,
    options?: any
  ): Promise<{ success: boolean; error?: string }> {
    const bridgeId = this.findAvailableBridge(userId);
    
    if (!bridgeId) {
      return {
        success: false,
        error: 'No bridge connected'
      };
    }

    const bridge = this.bridges.get(bridgeId);
    if (!bridge) {
      return {
        success: false,
        error: 'Bridge connection lost'
      };
    }

    const requestId = `file_${Date.now()}_${randomBytes(4).toString('hex')}`;
    
    bridge.socket.emit('file:request', {
      requestId,
      operation,
      path,
      ...options
    });

    return { success: true };
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
    this.pendingCommands.forEach((cmd, commandId) => {
      if (cmd.bridgeId === bridgeId) {
        if (cmd.timeoutHandle) {
          clearTimeout(cmd.timeoutHandle);
        }
        this.pendingCommands.delete(commandId);
        this.emit('command:cancelled', { commandId, bridgeId });
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