/**
 * Coder1 Bridge Manager Service
 * Manages connections between web IDE and local bridge CLI instances
 */

import { Socket } from 'socket.io';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { queuePendingLivingFileWrite, getPendingLivingFileWrites, deletePendingLivingFileWrite } from '../lib/johnny5-db';

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

interface LivingFilesCacheEntry {
  files: Record<string, string>;
  loadedAt: number;
}

interface PendingLivingFilesSync {
  resolve: (files: Record<string, string>) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class BridgeManager extends EventEmitter {
  private bridges: Map<string, BridgeConnection> = new Map();
  private userBridges: Map<string, Set<string>> = new Map();
  private pairingCodes: Map<string, PairingCode> = new Map();
  private pendingCommands: Map<string, PendingCommand> = new Map();
  private pendingFileRequests: Map<string, PendingFileRequest> = new Map();
  private livingFilesCache: Map<string, LivingFilesCacheEntry> = new Map();
  private writeQueues: Map<string, Promise<void>> = new Map();
  private pendingLivingFilesSync: Map<string, PendingLivingFilesSync> = new Map();

  // Configuration
  private readonly PAIRING_CODE_LENGTH = 6;
  private readonly PAIRING_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 4 * 30 * 1000; // 4 missed heartbeats = 120s (aligned with Socket.IO pingTimeout)
  // FIXED (Feb 13, 2026): Increased from 120s to 300s for complex Johnny5/Claude prompts
  private readonly DEFAULT_COMMAND_TIMEOUT = 300 * 1000; // 5 minutes
  private readonly DEFAULT_FILE_TIMEOUT = 30 * 1000; // 30 seconds for file operations
  private readonly MAX_COMMANDS_PER_BRIDGE = 5;
  private readonly LIVING_FILES_CACHE_TTL = 60 * 1000; // 60 seconds
  private readonly LIVING_FILES_SYNC_TIMEOUT = 10 * 1000; // 10 seconds
  
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

    // Living files sync from bridge (on connect or on-demand refresh)
    socket.on('livingfiles:sync', (data: { files: Record<string, string> }) => {
      const bridge = this.bridges.get(bridgeId);
      if (bridge) {
        const userId = bridge.userId;
        this.livingFilesCache.set(userId, {
          files: data.files,
          loadedAt: Date.now(),
        });
        console.log(`[BridgeManager] Living files cached for user ${userId} (${Object.keys(data.files).length} files)`);

        // Resolve any pending sync requests
        const pending = this.pendingLivingFilesSync.get(userId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingLivingFilesSync.delete(userId);
          pending.resolve(data.files);
        }

        // Flush any pending writes for this user
        this.flushPendingWrites(userId, bridgeId);
      }
    });

    // Living files write acknowledgment from bridge
    socket.on('livingfiles:write-ack', (data: { filename: string; success: boolean; error?: string }) => {
      const bridge = this.bridges.get(bridgeId);
      if (bridge && !data.success) {
        // Write failed on bridge side — invalidate cache to force re-fetch
        const cached = this.livingFilesCache.get(bridge.userId);
        if (cached) {
          cached.loadedAt = 0;
        }
        console.error(`[BridgeManager] Living file write failed: ${data.filename} - ${data.error}`);
      }
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
    // P0 fix: Only use bridge for the specific user — never fall back to another
    // user's bridge for file operations (prevents reading wrong user's files)
    const bridgeId = this.findAvailableBridge(userId);
    const bridge = bridgeId ? this.bridges.get(bridgeId) : null;

    if (!bridge) {
      throw new Error('No bridge connected for your account. Please connect Coder1 Bridge CLI.');
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
    return !!(userBridgeIds && userBridgeIds.size > 0);
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
   * Cancel a running command and signal the Bridge CLI to kill the process.
   * Called on timeout to prevent zombie CLI processes.
   */
  cancelCommand(commandId: string): void {
    const command = this.pendingCommands.get(commandId);
    if (!command) return;

    console.log(`[BridgeManager] Cancelling command ${commandId}`);

    // Signal the Bridge CLI to kill the process
    const bridge = this.bridges.get(command.bridgeId);
    if (bridge?.socket.connected) {
      bridge.socket.emit('claude:cancel', { commandId });
    }

    // Clean up
    if (command.timeoutHandle) {
      clearTimeout(command.timeoutHandle);
    }
    this.pendingCommands.delete(commandId);

    this.emit('command:cancelled', {
      commandId,
      bridgeId: command.bridgeId,
      sessionId: command.request.sessionId,
      error: 'Command cancelled due to timeout',
    });
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

    // Clean up pending living files sync requests (keep cache for stale-while-revalidate)
    const pendingSync = this.pendingLivingFilesSync.get(bridge.userId);
    if (pendingSync) {
      clearTimeout(pendingSync.timeout);
      this.pendingLivingFilesSync.delete(bridge.userId);
      pendingSync.reject(new Error('Bridge disconnected'));
    }

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

  // ============================================================================
  // Living Files Methods
  // ============================================================================

  /**
   * Get cached living files for a user.
   * Returns cached files if fresh (<60s), otherwise requests a refresh from the bridge.
   * Falls back to stale cache if bridge is unavailable.
   */
  async getLivingFilesContext(userId: string): Promise<Record<string, string> | null> {
    const cached = this.livingFilesCache.get(userId);

    // Return fresh cache
    if (cached && (Date.now() - cached.loadedAt) < this.LIVING_FILES_CACHE_TTL) {
      return cached.files;
    }

    // Try to refresh from bridge
    const bridgeId = this.findAvailableBridge(userId);
    if (!bridgeId) {
      return cached?.files || null; // Stale cache or null
    }

    const bridge = this.bridges.get(bridgeId);
    if (!bridge || !bridge.socket.connected) {
      return cached?.files || null;
    }

    // Request fresh files and wait for livingfiles:sync response
    return new Promise<Record<string, string> | null>((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingLivingFilesSync.delete(userId);
        console.warn(`[BridgeManager] Living files sync timeout for user ${userId}`);
        resolve(cached?.files || null);
      }, this.LIVING_FILES_SYNC_TIMEOUT);

      this.pendingLivingFilesSync.set(userId, {
        resolve: (files) => resolve(files),
        reject: () => resolve(cached?.files || null),
        timeout,
      });

      bridge.socket.emit('livingfiles:request');
    });
  }

  /**
   * Write to a living file on the user's machine via bridge.
   * Uses per-user write queue for serialization (prevents concurrent MEMORY.md races).
   * If no bridge is connected, queues the write to DB for later flush.
   */
  async writeLivingFile(
    userId: string,
    filename: string,
    content: string,
    mode: 'write' | 'append'
  ): Promise<void> {
    // Serialize writes per user
    const current = this.writeQueues.get(userId) || Promise.resolve();
    const next = current.then(
      () => this.doWriteLivingFile(userId, filename, content, mode),
      () => this.doWriteLivingFile(userId, filename, content, mode)
    );
    this.writeQueues.set(userId, next);
    return next;
  }

  /**
   * Internal: perform a single living file write
   */
  private async doWriteLivingFile(
    userId: string,
    filename: string,
    content: string,
    mode: 'write' | 'append'
  ): Promise<void> {
    const bridgeId = this.findAvailableBridge(userId);
    const bridge = bridgeId ? this.bridges.get(bridgeId) : null;

    if (!bridge || !bridge.socket.connected) {
      // No bridge connected — queue to DB for later flush
      queuePendingLivingFileWrite(userId, filename, content, mode);
      console.log(`[BridgeManager] Queued pending living file write: ${filename} for user ${userId}`);
      return;
    }

    // Optimistically update cache before sending to bridge
    const cached = this.livingFilesCache.get(userId);
    if (cached) {
      if (mode === 'write') {
        cached.files[filename] = content;
      } else if (mode === 'append') {
        const existing = cached.files[filename] || '';
        cached.files[filename] = existing.endsWith('\n')
          ? existing + '\n' + content
          : existing + '\n\n' + content;
      }
      cached.loadedAt = Date.now();
    }

    // Send write to bridge
    bridge.socket.emit('livingfiles:write', { filename, content, mode });
  }

  /**
   * Flush pending living file writes from DB to a newly connected bridge.
   * Called when livingfiles:sync is received (bridge just connected and synced).
   */
  private async flushPendingWrites(userId: string, bridgeId: string): Promise<void> {
    try {
      const pending = getPendingLivingFileWrites(userId);
      if (pending.length === 0) return;

      const bridge = this.bridges.get(bridgeId);
      if (!bridge || !bridge.socket.connected) return;

      console.log(`[BridgeManager] Flushing ${pending.length} pending living file writes for user ${userId}`);

      for (const write of pending) {
        bridge.socket.emit('livingfiles:write', {
          filename: write.filename,
          content: write.content,
          mode: write.mode,
        });
        // Delete after send — accepts small risk of duplicate on reconnect vs data loss
        deletePendingLivingFileWrite(write.id);
      }

      console.log(`[BridgeManager] Flushed ${pending.length} pending writes for user ${userId}`);
    } catch (error) {
      console.error(`[BridgeManager] Failed to flush pending writes for user ${userId}:`, error);
    }
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

// Export singleton instance using globalThis to prevent multiple instances
// across different module contexts (server.js vs Next.js API routes)
// This is a common Next.js pattern for singletons that need to survive hot-reloads

const BRIDGE_MANAGER_KEY = '__coder1_bridge_manager__' as const;

declare global {
  // eslint-disable-next-line no-var
  var __coder1_bridge_manager__: BridgeManager | undefined;
}

if (!globalThis[BRIDGE_MANAGER_KEY]) {
  globalThis[BRIDGE_MANAGER_KEY] = new BridgeManager();
  console.log('[BridgeManager] Created new global singleton instance');
} else {
  console.log('[BridgeManager] Reusing existing global singleton instance');
}

export const bridgeManager = globalThis[BRIDGE_MANAGER_KEY];