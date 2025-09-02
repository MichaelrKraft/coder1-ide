/**
 * Agent Runtime Manager - Intelligent Runtime Selection and Management
 * Auto-detects available runtimes and provides seamless switching
 * between tmux and container-based agent isolation
 */

const { EventEmitter } = require('events');
const { AgentRuntimeInterface } = require('./agent-runtime-interface');

class AgentRuntimeManager extends EventEmitter {
    constructor() {
        super();
        this.availableRuntimes = new Map();
        this.activeRuntime = null;
        this.preferredRuntime = 'auto'; // 'auto', 'container', 'tmux'
        this.fallbackChain = ['container', 'tmux'];
        this.runtimeCache = new Map();
        this.initialized = false;
    }

    /**
   * Initialize the runtime manager and detect available runtimes
   */
    async initialize() {
        if (this.initialized) return;

        console.log('🚀 Initializing Agent Runtime Manager...');
    
        try {
            // Register available runtime implementations
            await this.registerRuntimes();
      
            // Detect which runtimes are available
            await this.detectAvailableRuntimes();
      
            // Select the best runtime
            await this.selectActiveRuntime();
      
            this.initialized = true;
            console.log(`✅ Runtime Manager initialized with ${this.availableRuntimes.size} available runtimes`);
            console.log(`🎯 Active runtime: ${this.activeRuntime?.getRuntimeType() || 'none'}`);
      
            this.emit('initialized', {
                availableRuntimes: Array.from(this.availableRuntimes.keys()),
                activeRuntime: this.activeRuntime?.getRuntimeType()
            });
      
        } catch (error) {
            console.error('❌ Failed to initialize Runtime Manager:', error);
            throw error;
        }
    }

    /**
   * Register all available runtime implementations
   */
    async registerRuntimes() {
        try {
            // Register Container Runtime (when available)
            try {
                const { ContainerRuntime } = require('./container-runtime');
                const containerRuntime = new ContainerRuntime();
                this.availableRuntimes.set('container', containerRuntime);
                console.log('📦 Registered Container Runtime');
            } catch (error) {
                console.log('⚠️  Container Runtime not available:', error.message);
            }

            // Register Tmux Runtime (fallback)
            try {
                const { TmuxAgentRuntime } = require('./tmux-agent-runtime');
                const tmuxRuntime = new TmuxAgentRuntime();
                this.availableRuntimes.set('tmux', tmuxRuntime);
                console.log('🖥️  Registered Tmux Runtime');
            } catch (error) {
                console.error('❌ Failed to register Tmux Runtime:', error);
                throw error; // Tmux is required fallback
            }

        } catch (error) {
            console.error('❌ Failed to register runtimes:', error);
            throw error;
        }
    }

    /**
   * Detect which registered runtimes are actually available
   */
    async detectAvailableRuntimes() {
        const detectionPromises = [];
    
        for (const [runtimeType, runtime] of this.availableRuntimes.entries()) {
            detectionPromises.push(
                runtime.checkAvailability()
                    .then(available => {
                        if (available) {
                            console.log(`✅ ${runtimeType} runtime is available`);
                            runtime.isAvailable = true;
                        } else {
                            console.log(`❌ ${runtimeType} runtime is not available`);
                            runtime.isAvailable = false;
                        }
                        return { runtimeType, available };
                    })
                    .catch(error => {
                        console.error(`❌ Error checking ${runtimeType} runtime:`, error);
                        runtime.isAvailable = false;
                        return { runtimeType, available: false };
                    })
            );
        }

        const results = await Promise.all(detectionPromises);
    
        // Remove unavailable runtimes
        for (const { runtimeType, available } of results) {
            if (!available) {
                this.availableRuntimes.delete(runtimeType);
            }
        }

        if (this.availableRuntimes.size === 0) {
            throw new Error('No agent runtimes are available on this system');
        }
    }

    /**
   * Select the best available runtime based on preferences
   */
    async selectActiveRuntime(preference = this.preferredRuntime) {
        console.log(`🎯 Selecting active runtime (preference: ${preference})...`);

        if (preference === 'auto') {
            // Use fallback chain to find best available runtime
            for (const runtimeType of this.fallbackChain) {
                const runtime = this.availableRuntimes.get(runtimeType);
                if (runtime && runtime.isAvailable) {
                    this.activeRuntime = runtime;
                    break;
                }
            }
        } else {
            // Use specific preference
            const runtime = this.availableRuntimes.get(preference);
            if (runtime && runtime.isAvailable) {
                this.activeRuntime = runtime;
            } else {
                console.warn(`⚠️ Preferred runtime '${preference}' not available, using fallback`);
                // Fall back to auto selection
                return this.selectActiveRuntime('auto');
            }
        }

        if (!this.activeRuntime) {
            throw new Error('Failed to select any available runtime');
        }

        // Initialize the selected runtime
        await this.activeRuntime.initialize();
    
        console.log(`✅ Selected runtime: ${this.activeRuntime.getRuntimeType()}`);
        console.log('🎯 Runtime capabilities:', this.activeRuntime.getCapabilities());

        this.emit('runtime-selected', {
            runtimeType: this.activeRuntime.getRuntimeType(),
            capabilities: this.activeRuntime.getCapabilities()
        });

        return this.activeRuntime;
    }

    /**
   * Switch to a different runtime
   */
    async switchRuntime(runtimeType) {
        if (!this.initialized) {
            throw new Error('Runtime Manager not initialized');
        }

        const runtime = this.availableRuntimes.get(runtimeType);
        if (!runtime || !runtime.isAvailable) {
            throw new Error(`Runtime '${runtimeType}' is not available`);
        }

        if (this.activeRuntime?.getRuntimeType() === runtimeType) {
            console.log(`Already using ${runtimeType} runtime`);
            return this.activeRuntime;
        }

        console.log(`🔄 Switching from ${this.activeRuntime?.getRuntimeType() || 'none'} to ${runtimeType}...`);

        // Shutdown current runtime if exists
        if (this.activeRuntime) {
            await this.activeRuntime.shutdown();
        }

        // Switch to new runtime
        this.activeRuntime = runtime;
        await this.activeRuntime.initialize();

        console.log(`✅ Switched to ${runtimeType} runtime`);
    
        this.emit('runtime-switched', {
            fromRuntime: this.activeRuntime?.getRuntimeType(),
            toRuntime: runtimeType,
            capabilities: this.activeRuntime.getCapabilities()
        });

        return this.activeRuntime;
    }

    /**
   * Get the current active runtime
   */
    getActiveRuntime() {
        if (!this.initialized) {
            throw new Error('Runtime Manager not initialized');
        }
        return this.activeRuntime;
    }

    /**
   * Get all available runtimes
   */
    getAvailableRuntimes() {
        return Array.from(this.availableRuntimes.keys());
    }

    /**
   * Get runtime information
   */
    getRuntimeInfo() {
        return {
            initialized: this.initialized,
            activeRuntime: this.activeRuntime?.getRuntimeType() || null,
            availableRuntimes: this.getAvailableRuntimes(),
            capabilities: this.activeRuntime?.getCapabilities() || null,
            preferredRuntime: this.preferredRuntime
        };
    }

    /**
   * Set runtime preference
   */
    setPreference(runtimeType) {
        this.preferredRuntime = runtimeType;
        console.log(`🎯 Runtime preference set to: ${runtimeType}`);
    
        this.emit('preference-changed', {
            preference: runtimeType
        });
    }

    /**
   * Check system requirements for a specific runtime
   */
    async checkRuntimeRequirements(runtimeType) {
        const runtime = this.availableRuntimes.get(runtimeType);
        if (!runtime) {
            return {
                available: false,
                reason: 'Runtime not registered'
            };
        }

        try {
            const available = await runtime.checkAvailability();
            return {
                available,
                reason: available ? 'Requirements met' : 'System requirements not met',
                capabilities: available ? runtime.getCapabilities() : null
            };
        } catch (error) {
            return {
                available: false,
                reason: error.message,
                error: error
            };
        }
    }

    /**
   * Get comprehensive system status
   */
    async getSystemStatus() {
        const status = {
            initialized: this.initialized,
            activeRuntime: this.activeRuntime?.getRuntimeType() || null,
            runtimes: {},
            systemInfo: {
                platform: process.platform,
                nodeVersion: process.version,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            }
        };

        // Check each registered runtime
        for (const [runtimeType, runtime] of this.availableRuntimes.entries()) {
            try {
                const stats = await runtime.getStats();
                status.runtimes[runtimeType] = {
                    available: runtime.isAvailable,
                    capabilities: runtime.getCapabilities(),
                    stats: stats
                };
            } catch (error) {
                status.runtimes[runtimeType] = {
                    available: false,
                    error: error.message
                };
            }
        }

        return status;
    }

    /**
   * Cleanup all runtimes and shutdown
   */
    async shutdown() {
        console.log('🛑 Shutting down Runtime Manager...');

        try {
            // Cleanup all runtimes
            const cleanupPromises = [];
            for (const [runtimeType, runtime] of this.availableRuntimes.entries()) {
                cleanupPromises.push(
                    runtime.cleanup()
                        .then(() => console.log(`✅ Cleaned up ${runtimeType} runtime`))
                        .catch(error => console.error(`❌ Error cleaning up ${runtimeType}:`, error))
                );
            }

            await Promise.all(cleanupPromises);

            // Shutdown active runtime
            if (this.activeRuntime) {
                await this.activeRuntime.shutdown();
            }

            this.initialized = false;
            this.activeRuntime = null;
      
            console.log('✅ Runtime Manager shutdown complete');
            this.emit('shutdown');

        } catch (error) {
            console.error('❌ Error during Runtime Manager shutdown:', error);
            throw error;
        }
    }

    // === Proxy methods to active runtime ===

    /**
   * Proxy methods to the active runtime for convenience
   */
    async createAgent(agentId, config) {
        return this.getActiveRuntime().createAgent(agentId, config);
    }

    async executeCommand(agentId, command, options) {
        return this.getActiveRuntime().executeCommand(agentId, command, options);
    }

    async destroyAgent(agentId) {
        return this.getActiveRuntime().destroyAgent(agentId);
    }

    async getAgentStatus(agentId) {
        return this.getActiveRuntime().getAgentStatus(agentId);
    }

    async createTeamWorkspace(teamId, config) {
        return this.getActiveRuntime().createTeamWorkspace(teamId, config);
    }

    async destroyTeamWorkspace(teamId) {
        return this.getActiveRuntime().destroyTeamWorkspace(teamId);
    }
}

// Singleton instance
const runtimeManager = new AgentRuntimeManager();

module.exports = {
    AgentRuntimeManager,
    runtimeManager
};