"use strict";
/**
 * Coder1 Bridge Manager Service
 * Manages connections between web IDE and local bridge CLI instances
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bridgeManager = exports.BridgeManager = void 0;
const crypto_1 = require("crypto");
const events_1 = require("events");
class BridgeManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.bridges = new Map();
        this.userBridges = new Map();
        this.pairingCodes = new Map();
        this.pendingCommands = new Map();
        // Configuration
        this.PAIRING_CODE_LENGTH = 6;
        this.PAIRING_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes
        this.HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
        this.HEARTBEAT_TIMEOUT = 3 * 30 * 1000; // 3 missed heartbeats
        this.DEFAULT_COMMAND_TIMEOUT = 60 * 1000; // 60 seconds
        this.MAX_COMMANDS_PER_BRIDGE = 5;
        this.startHeartbeatMonitor();
        this.startCodeCleanup();
    }
    /**
     * Generate a new pairing code for a user
     */
    generatePairingCode(userId) {
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
    validatePairingCode(code) {
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
    registerBridge(socket, userId, metadata) {
        const bridgeId = `bridge_${Date.now()}_${(0, crypto_1.randomBytes)(4).toString('hex')}`;
        const connection = {
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
        this.userBridges.get(userId).add(bridgeId);
        // Set up socket event handlers
        this.setupSocketHandlers(bridgeId, socket);
        console.log(`[BridgeManager] Registered bridge ${bridgeId} for user ${userId}`);
        this.emit('bridge:connected', { bridgeId, userId });
        return bridgeId;
    }
    /**
     * Set up event handlers for a bridge socket
     */
    setupSocketHandlers(bridgeId, socket) {
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
    async executeCommand(userId, request) {
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
        const pendingCommand = {
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
    async requestFileOperation(userId, operation, path, options) {
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
        const requestId = `file_${Date.now()}_${(0, crypto_1.randomBytes)(4).toString('hex')}`;
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
    findAvailableBridge(userId) {
        const userBridgeIds = this.userBridges.get(userId);
        if (!userBridgeIds || userBridgeIds.size === 0) {
            return null;
        }
        // Find bridge with least active commands
        let bestBridge = null;
        let minCommands = Infinity;
        for (const bridgeId of userBridgeIds) {
            const bridge = this.bridges.get(bridgeId);
            if (!bridge)
                continue;
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
    handleCommandTimeout(commandId) {
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
    unregisterBridge(bridgeId) {
        const bridge = this.bridges.get(bridgeId);
        if (!bridge)
            return;
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
    startHeartbeatMonitor() {
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
    startCodeCleanup() {
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
    detectCapabilities(metadata) {
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
    getBridgeStatus(userId) {
        const userBridgeIds = this.userBridges.get(userId);
        if (!userBridgeIds || userBridgeIds.size === 0) {
            return { connected: false, bridges: [] };
        }
        const bridges = Array.from(userBridgeIds)
            .map(id => this.bridges.get(id))
            .filter(Boolean)
            .map(bridge => ({
            id: bridge.id,
            connectedAt: bridge.pairedAt,
            platform: bridge.platform,
            version: bridge.version,
            stats: bridge.stats
        }));
        return {
            connected: bridges.length > 0,
            bridges
        };
    }
    /**
     * Broadcast a message to all bridges for a user
     */
    broadcastToUser(userId, event, data) {
        const userBridgeIds = this.userBridges.get(userId);
        if (!userBridgeIds)
            return;
        userBridgeIds.forEach(bridgeId => {
            const bridge = this.bridges.get(bridgeId);
            if (bridge) {
                bridge.socket.emit(event, data);
            }
        });
    }
}
exports.BridgeManager = BridgeManager;
// Export singleton instance
exports.bridgeManager = new BridgeManager();
