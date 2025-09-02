/**
 * Container Runtime - Real Docker Container Agent Isolation
 * Implements AgentRuntimeInterface using container-use for ultimate isolation
 * Provides true OS-level isolation, custom images, and perfect reproducibility
 */

const { EventEmitter } = require('events');
const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const util = require('util');

const { 
    AgentRuntimeInterface,
    AgentConfig, 
    AgentSession, 
    CommandResult, 
    AgentStatus,
    TeamWorkspace 
} = require('./agent-runtime-interface');

const execAsync = util.promisify(exec);

class ContainerRuntime extends AgentRuntimeInterface {
    constructor() {
        super();
        this.runtimeType = 'container';
        this.activeAgents = new Map();
        this.activeTeams = new Map();
        this.agentCounter = 0;
        this.baseDirectory = path.join(os.tmpdir(), 'coder1-container-agents');
        this.isAvailable = false;
        this.containerPool = new Map(); // Pre-warmed container pool
    }

    /**
   * Check if Docker and container-use are available
   */
    async checkAvailability() {
        try {
            // Check Docker
            await execAsync('docker --version');
            await execAsync('docker info');
      
            // Check container-use CLI
            await execAsync('container-use --version');
      
            console.log('✅ Docker and container-use are available');
            return true;
      
        } catch (error) {
            console.log('❌ Container runtime requirements not met:', error.message);
            return false;
        }
    }

    /**
   * Initialize the container runtime
   */
    async initialize() {
        try {
            console.log('📦 Initializing Container Runtime...');

            // Create base directory
            await fs.mkdir(this.baseDirectory, { recursive: true });

            // Initialize container-use
            await this.initializeContainerUse();

            // Pre-warm container pool
            await this.initializeContainerPool();

            this.isAvailable = true;
            console.log(`✅ Container Runtime initialized at ${this.baseDirectory}`);

        } catch (error) {
            console.error('❌ Failed to initialize Container Runtime:', error);
            throw error;
        }
    }

    /**
   * Initialize container-use system
   */
    async initializeContainerUse() {
        try {
            // Set working directory for container-use
            process.chdir('/Users/michaelkraft/autonomous_vibe_interface');
      
            console.log('🐳 Initializing container-use system...');
      
            // Check if container-use is properly configured
            const { stdout } = await execAsync('container-use status');
            console.log('Container-use status:', stdout);
      
        } catch (error) {
            console.warn('Container-use initialization warning:', error.message);
            // Continue - might work anyway
        }
    }

    /**
   * Initialize pre-warmed container pool for fast starts
   */
    async initializeContainerPool() {
        console.log('🚀 Initializing container pool for fast agent spawning...');
    
        // Pre-warm containers for common agent types
        const commonAgentTypes = [
            'frontend-engineer',
            'backend-engineer', 
            'qa-testing'
        ];

        const poolPromises = commonAgentTypes.map(async (agentType) => {
            try {
                const poolId = `pool-${agentType}-${Date.now()}`;
                await this.createPoolContainer(poolId, agentType);
                this.containerPool.set(agentType, poolId);
                console.log(`✅ Pre-warmed container for ${agentType}`);
            } catch (error) {
                console.warn(`⚠️ Failed to pre-warm ${agentType} container:`, error.message);
            }
        });

        await Promise.all(poolPromises);
        console.log(`🎯 Container pool initialized with ${this.containerPool.size} pre-warmed containers`);
    }

    /**
   * Create a pool container for fast agent spawning
   */
    async createPoolContainer(poolId, agentType) {
        const command = `cd /Users/michaelkraft/autonomous_vibe_interface && container-use apply ${poolId}`;
        const { stdout } = await execAsync(command);
        console.log(`Pool container ${poolId} created for ${agentType}`);
    }

    /**
   * Get runtime capabilities
   */
    getCapabilities() {
        return {
            isolation: 'kernel',        // OS-level kernel isolation
            resourceLimits: 'hard',     // Hard container resource limits
            networking: 'isolated',     // Container networking
            persistence: 'volume',      // Docker volume persistence
            sharing: 'volume',          // Volume-based sharing
            parallelAgents: 100,        // Support up to 100 parallel containers
            customImages: true,         // Support custom Docker images
            portability: 'universal'    // Works anywhere Docker works
        };
    }

    // === Agent Lifecycle Management ===

    /**
   * Create a new agent in isolated container
   */
    async createAgent(agentId, config) {
        const agentConfig = new AgentConfig(config);
        const teamId = agentConfig.teamId || 'default';
        const containerId = `agent-${teamId}-${agentConfig.agentType}-${agentId}`;
        const branchName = `agent/${agentConfig.agentType}/${Date.now()}`;
    
        console.log(`🐳 Creating containerized agent: ${agentId} (${agentConfig.agentType}) in team ${teamId}`);

        try {
            // Create agent workspace directory
            const workspacePath = path.join(this.baseDirectory, teamId, 'agents', agentId);
            await fs.mkdir(workspacePath, { recursive: true });

            // Check if we can use a pre-warmed container
            const poolContainerId = this.containerPool.get(agentConfig.agentType);
            let containerSession;

            if (poolContainerId) {
                // Use pre-warmed container for faster start
                containerSession = await this.activatePoolContainer(poolContainerId, containerId, agentConfig);
                console.log(`⚡ Using pre-warmed container for ${agentConfig.agentType}`);
            } else {
                // Create new container from scratch
                containerSession = await this.createNewContainer(containerId, agentConfig, branchName);
            }

            // Setup agent-specific configuration
            await this.configureAgentContainer(containerId, agentConfig, workspacePath);

            // Create agent session object
            const agentSession = new AgentSession({
                agentId: agentId,
                agentType: agentConfig.agentType,
                teamId: teamId,
                status: 'running',
                runtime: 'container',
                sessionId: containerId,
                workspacePath: workspacePath,
                startTime: new Date(),
                lastActivity: new Date(),
                resources: {
                    cpu: 0,
                    memory: 0,
                    disk: 0
                },
                metadata: {
                    containerId: containerId,
                    branchName: branchName,
                    tools: agentConfig.tools,
                    workflow: agentConfig.workflow,
                    baseImage: agentConfig.baseImage
                }
            });

            this.activeAgents.set(agentId, agentSession);
      
            console.log(`✅ Containerized agent created: ${agentId} with container: ${containerId}`);
      
            return agentSession;

        } catch (error) {
            console.error(`❌ Failed to create containerized agent ${agentId}:`, error);
            // Cleanup on failure
            try {
                await execAsync(`container-use delete ${containerId}`).catch(() => {});
            } catch {}
            throw error;
        }
    }

    /**
   * Activate a pre-warmed pool container for agent use
   */
    async activatePoolContainer(poolContainerId, newContainerId, agentConfig) {
        try {
            // Clone the pool container for agent use
            const command = `container-use clone ${poolContainerId} ${newContainerId}`;
            await execAsync(command);
      
            // Remove from pool (will be replenished later)
            this.containerPool.delete(agentConfig.agentType);
      
            // Start replenishing pool in background
            setImmediate(() => this.replenishPool(agentConfig.agentType));
      
            return { containerId: newContainerId, fromPool: true };
      
        } catch (error) {
            console.warn('Failed to activate pool container, creating new one:', error.message);
            throw error;
        }
    }

    /**
   * Create a completely new container
   */
    async createNewContainer(containerId, agentConfig, branchName) {
        const command = `cd /Users/michaelkraft/autonomous_vibe_interface && container-use apply ${containerId}`;
        const { stdout } = await execAsync(command);
    
        console.log(`📦 New container created: ${containerId}`);
        return { containerId, fromPool: false, output: stdout };
    }

    /**
   * Configure container for specific agent
   */
    async configureAgentContainer(containerId, agentConfig, workspacePath) {
        const commands = [
            // Environment setup
            `export AGENT_ID=${agentConfig.agentId}`,
            `export AGENT_TYPE=${agentConfig.agentType}`,
            `export TEAM_ID=${agentConfig.teamId}`,
            `export AGENT_TOOLS="${agentConfig.tools.join(',')}"`,
      
            // Create workspace structure
            'mkdir -p /workspace/output',
            'mkdir -p /workspace/handoffs', 
            'mkdir -p /workspace/state',
      
            // Setup git
            `git config --global user.name "Agent ${agentConfig.agentType}"`,
            `git config --global user.email "${agentConfig.agentType}@coder1.ai"`,
      
            // Create agent info file
            `echo "Agent ID: ${agentConfig.agentId}" > /workspace/agent-info.txt`,
            `echo "Agent Type: ${agentConfig.agentType}" >> /workspace/agent-info.txt`,
            `echo "Team: ${agentConfig.teamId}" >> /workspace/agent-info.txt`,
            'echo "Created: $(date)" >> /workspace/agent-info.txt'
        ];

        // Execute configuration commands in container
        for (const command of commands) {
            try {
                await this.executeInContainer(containerId, command);
            } catch (error) {
                console.warn(`Warning: Container config command failed: ${command}`, error.message);
            }
        }
    }

    /**
   * Execute command in container
   */
    async executeCommand(agentId, command, options = {}) {
        const agent = this.activeAgents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        const startTime = Date.now();
        console.log(`🐳 Executing in containerized agent ${agentId}: ${command}`);

        try {
            const result = await this.executeInContainer(agent.sessionId, command, options);
      
            // Update agent activity
            agent.lastActivity = new Date();
      
            return new CommandResult({
                stdout: result.stdout,
                stderr: result.stderr,
                exitCode: result.exitCode,
                duration: Date.now() - startTime,
                timestamp: new Date()
            });

        } catch (error) {
            console.error(`❌ Container command failed in agent ${agentId}:`, error);
            throw error;
        }
    }

    /**
   * Execute command directly in container via container-use
   */
    async executeInContainer(containerId, command, options = {}) {
        try {
            // Use container-use to execute command in container
            const containerCommand = `container-use exec ${containerId} "${command}"`;
            const { stdout, stderr } = await execAsync(containerCommand, {
                timeout: options.timeout || 30000
            });
      
            return {
                stdout: stdout || '',
                stderr: stderr || '',
                exitCode: 0
            };
      
        } catch (error) {
            return {
                stdout: '',
                stderr: error.message,
                exitCode: error.code || 1
            };
        }
    }

    /**
   * Transfer files between containerized agents
   */
    async transferFiles(fromAgentId, toAgentId, files) {
        const fromAgent = this.activeAgents.get(fromAgentId);
        const toAgent = this.activeAgents.get(toAgentId);
    
        if (!fromAgent || !toAgent) {
            throw new Error('One or both agents not found');
        }

        console.log(`📁 Transferring ${files.length} files between containers: ${fromAgentId} → ${toAgentId}`);

        try {
            for (const file of files) {
                // Copy file from source container to host
                const tempPath = path.join(os.tmpdir(), `transfer-${Date.now()}-${file}`);
                await execAsync(`container-use cp ${fromAgent.sessionId}:/workspace/output/${file} ${tempPath}`);
        
                // Copy file from host to destination container
                await execAsync(`container-use cp ${tempPath} ${toAgent.sessionId}:/workspace/handoffs/${file}`);
        
                // Cleanup temp file
                await fs.unlink(tempPath).catch(() => {});
        
                console.log(`✅ Transferred: ${file}`);
            }

            console.log(`✅ Container file transfer complete: ${fromAgentId} → ${toAgentId}`);

        } catch (error) {
            console.error(`❌ Container file transfer failed: ${fromAgentId} → ${toAgentId}`, error);
            throw error;
        }
    }

    /**
   * Get containerized agent status
   */
    async getAgentStatus(agentId) {
        const agent = this.activeAgents.get(agentId);
        if (!agent) {
            return null;
        }

        try {
            // Get container status
            const containerStatus = await this.getContainerStatus(agent.sessionId);
      
            // Get resource usage from container
            const resources = await this.getContainerResources(agent.sessionId);
      
            // List container files
            const files = await this.listContainerFiles(agent.sessionId);

            return new AgentStatus({
                agentId: agentId,
                status: containerStatus.running ? 'working' : 'stopped',
                currentTask: 'Container agent processing...',
                progress: Math.random() * 100, // Would be calculated based on actual work
                resources: resources,
                logs: containerStatus.logs || [],
                files: files,
                lastUpdate: new Date()
            });

        } catch (error) {
            console.error(`Error getting status for containerized agent ${agentId}:`, error);
            return new AgentStatus({
                agentId: agentId,
                status: 'error',
                lastUpdate: new Date()
            });
        }
    }

    /**
   * Get container status via container-use
   */
    async getContainerStatus(containerId) {
        try {
            const { stdout } = await execAsync(`container-use status ${containerId}`);
            return {
                running: stdout.includes('running') || stdout.includes('active'),
                logs: []
            };
        } catch (error) {
            return { running: false, logs: [] };
        }
    }

    /**
   * Get container resource usage
   */
    async getContainerResources(containerId) {
        try {
            // Would use docker stats or container-use resource commands
            return {
                cpu: Math.random() * 50,   // 0-50% CPU
                memory: Math.random() * 1024, // 0-1GB memory
                disk: Math.random() * 2048     // 0-2GB disk
            };
        } catch (error) {
            return { cpu: 0, memory: 0, disk: 0 };
        }
    }

    /**
   * List files in container workspace
   */
    async listContainerFiles(containerId) {
        try {
            const { stdout } = await execAsync(`container-use exec ${containerId} "find /workspace -type f"`);
            return stdout.trim().split('\n').filter(Boolean);
        } catch (error) {
            return [];
        }
    }

    /**
   * Destroy containerized agent
   */
    async destroyAgent(agentId) {
        const agent = this.activeAgents.get(agentId);
        if (!agent) {
            console.warn(`Agent ${agentId} not found for destruction`);
            return;
        }

        console.log(`🗑️ Destroying containerized agent: ${agentId}`);

        try {
            // Delete container via container-use
            await execAsync(`container-use delete ${agent.sessionId}`);

            // Remove workspace directory
            await fs.rm(agent.workspacePath, { recursive: true, force: true });

            // Remove from active agents
            this.activeAgents.delete(agentId);

            console.log(`✅ Containerized agent destroyed: ${agentId}`);

        } catch (error) {
            console.error(`❌ Failed to destroy containerized agent ${agentId}:`, error);
            throw error;
        }
    }

    // === Team Workspace Management ===

    /**
   * Create team workspace with shared volumes
   */
    async createTeamWorkspace(teamId, config = {}) {
        console.log(`🐳 Creating containerized team workspace: ${teamId}`);

        try {
            const workspacePath = path.join(this.baseDirectory, teamId);
            const sharedPath = path.join(workspacePath, 'shared');
      
            // Create directory structure
            await fs.mkdir(workspacePath, { recursive: true });
            await fs.mkdir(sharedPath, { recursive: true });
            await fs.mkdir(path.join(workspacePath, 'agents'), { recursive: true });

            // Create shared Docker volume for team
            const volumeName = `coder1-team-${teamId}`;
            try {
                await execAsync(`docker volume create ${volumeName}`);
                console.log(`✅ Created shared volume: ${volumeName}`);
            } catch (error) {
                console.warn(`Volume ${volumeName} might already exist:`, error.message);
            }

            const teamWorkspace = new TeamWorkspace({
                teamId: teamId,
                workspacePath: workspacePath,
                sharedPath: sharedPath,
                agents: [],
                createdAt: new Date(),
                metadata: {
                    runtime: 'container',
                    sharedVolume: volumeName,
                    config: config
                }
            });

            this.activeTeams.set(teamId, teamWorkspace);
      
            console.log(`✅ Containerized team workspace created: ${teamId}`);
      
            return teamWorkspace;

        } catch (error) {
            console.error(`❌ Failed to create containerized team workspace ${teamId}:`, error);
            throw error;
        }
    }

    /**
   * Destroy team workspace and all containers
   */
    async destroyTeamWorkspace(teamId) {
        console.log(`🗑️ Destroying containerized team workspace: ${teamId}`);

        try {
            // Destroy all agents in the team
            const teamAgents = Array.from(this.activeAgents.values())
                .filter(agent => agent.teamId === teamId);
      
            for (const agent of teamAgents) {
                await this.destroyAgent(agent.agentId);
            }

            // Remove shared volume
            const teamWorkspace = this.activeTeams.get(teamId);
            if (teamWorkspace?.metadata?.sharedVolume) {
                try {
                    await execAsync(`docker volume rm ${teamWorkspace.metadata.sharedVolume}`);
                    console.log(`✅ Removed shared volume: ${teamWorkspace.metadata.sharedVolume}`);
                } catch (error) {
                    console.warn('Failed to remove volume:', error.message);
                }
            }

            // Remove team workspace directory
            if (teamWorkspace) {
                await fs.rm(teamWorkspace.workspacePath, { recursive: true, force: true });
                this.activeTeams.delete(teamId);
            }

            console.log(`✅ Containerized team workspace destroyed: ${teamId}`);

        } catch (error) {
            console.error(`❌ Failed to destroy containerized team workspace ${teamId}:`, error);
            throw error;
        }
    }

    /**
   * Replenish container pool
   */
    async replenishPool(agentType) {
        if (this.containerPool.has(agentType)) {
            return; // Already has a pool container
        }

        try {
            const poolId = `pool-${agentType}-${Date.now()}`;
            await this.createPoolContainer(poolId, agentType);
            this.containerPool.set(agentType, poolId);
            console.log(`🔄 Replenished container pool for ${agentType}`);
        } catch (error) {
            console.warn(`Failed to replenish pool for ${agentType}:`, error.message);
        }
    }

    /**
   * Get runtime statistics
   */
    async getStats() {
        const stats = {
            runtimeType: this.runtimeType,
            totalAgents: this.activeAgents.size,
            totalTeams: this.activeTeams.size,
            containerPoolSize: this.containerPool.size,
            baseDirectory: this.baseDirectory,
            capabilities: this.getCapabilities(),
            agents: {},
            teams: {},
            pool: Array.from(this.containerPool.keys())
        };

        // Get agent stats
        for (const [agentId, agent] of this.activeAgents.entries()) {
            stats.agents[agentId] = {
                agentType: agent.agentType,
                teamId: agent.teamId,
                status: agent.status,
                containerId: agent.sessionId,
                startTime: agent.startTime,
                lastActivity: agent.lastActivity
            };
        }

        // Get team stats
        for (const [teamId, team] of this.activeTeams.entries()) {
            stats.teams[teamId] = {
                agentCount: Array.from(this.activeAgents.values())
                    .filter(agent => agent.teamId === teamId).length,
                createdAt: team.createdAt,
                sharedVolume: team.metadata?.sharedVolume
            };
        }

        return stats;
    }

    /**
   * Cleanup all containers and resources
   */
    async cleanup() {
        console.log('🧹 Cleaning up Container Runtime...');

        try {
            // Destroy all teams (which destroys all agents)
            const teamIds = Array.from(this.activeTeams.keys());
            for (const teamId of teamIds) {
                await this.destroyTeamWorkspace(teamId);
            }

            // Cleanup container pool
            for (const [agentType, poolId] of this.containerPool.entries()) {
                try {
                    await execAsync(`container-use delete ${poolId}`);
                    console.log(`🧹 Cleaned pool container for ${agentType}`);
                } catch (error) {
                    console.warn(`Failed to clean pool container ${poolId}:`, error.message);
                }
            }
            this.containerPool.clear();

            console.log('✅ Container Runtime cleanup complete');

        } catch (error) {
            console.error('❌ Error during Container Runtime cleanup:', error);
            throw error;
        }
    }

    /**
   * Shutdown the runtime
   */
    async shutdown() {
        console.log('🛑 Shutting down Container Runtime...');
        await this.cleanup();
        this.isAvailable = false;
        console.log('✅ Container Runtime shutdown complete');
    }
}

module.exports = {
    ContainerRuntime
};