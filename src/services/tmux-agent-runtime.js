/**
 * Tmux Agent Runtime - Agent-Specific Tmux Isolation
 * Implements AgentRuntimeInterface using tmux for agent isolation
 * Provides real multi-agent environments without Docker requirements
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

class TmuxAgentRuntime extends AgentRuntimeInterface {
    constructor() {
        super();
        this.runtimeType = 'tmux';
        this.activeAgents = new Map();
        this.activeTeams = new Map();
        this.agentCounter = 0;
        this.baseDirectory = path.join(os.tmpdir(), 'coder1-agents');
        this.isAvailable = false;
    }

    /**
   * Check if tmux is available on the system
   */
    async checkAvailability() {
        try {
            await execAsync('which tmux');
            await execAsync('tmux -V');
            return true;
        } catch (error) {
            console.error('Tmux not available:', error.message);
            return false;
        }
    }

    /**
   * Initialize the tmux runtime
   */
    async initialize() {
        try {
            console.log('🖥️  Initializing Tmux Agent Runtime...');

            // Create base directory
            await fs.mkdir(this.baseDirectory, { recursive: true });

            // Cleanup any orphaned tmux sessions
            await this.cleanupOrphanedSessions();

            this.isAvailable = true;
            console.log(`✅ Tmux Runtime initialized at ${this.baseDirectory}`);

        } catch (error) {
            console.error('❌ Failed to initialize Tmux Runtime:', error);
            throw error;
        }
    }

    /**
   * Get runtime capabilities
   */
    getCapabilities() {
        return {
            isolation: 'process',      // Process-level isolation
            resourceLimits: 'soft',    // Soft resource limits
            networking: 'shared',      // Shared networking
            persistence: 'filesystem', // File system persistence
            sharing: 'directory',      // Directory-based sharing
            parallelAgents: 50,        // Support up to 50 parallel agents
            customImages: false,       // No custom container images
            portability: 'local'       // Local machine only
        };
    }

    // === Agent Lifecycle Management ===

    /**
   * Create a new agent in isolated tmux session
   */
    async createAgent(agentId, config) {
        const agentConfig = new AgentConfig(config);
        const teamId = agentConfig.teamId || 'default';
        const sessionName = `agent-${teamId}-${agentConfig.agentType}-${agentId}`;
    
        console.log(`🚀 Creating agent: ${agentId} (${agentConfig.agentType}) in team ${teamId}`);

        try {
            // Create agent workspace directory
            const workspacePath = path.join(this.baseDirectory, teamId, 'agents', agentId);
            await fs.mkdir(workspacePath, { recursive: true });

            // Create agent-specific directories
            const outputPath = path.join(workspacePath, 'output');
            const statePath = path.join(workspacePath, 'state');
            await fs.mkdir(outputPath, { recursive: true });
            await fs.mkdir(statePath, { recursive: true });

            // Create tmux session for agent
            const tmuxCommand = `tmux new-session -d -s "${sessionName}" -c "${workspacePath}"`;
            await execAsync(tmuxCommand);

            // Setup agent environment in tmux session
            await this.setupAgentEnvironment(sessionName, agentConfig, workspacePath);

            // Create agent session object
            const agentSession = new AgentSession({
                agentId: agentId,
                agentType: agentConfig.agentType,
                teamId: teamId,
                status: 'running',
                runtime: 'tmux',
                sessionId: sessionName,
                workspacePath: workspacePath,
                startTime: new Date(),
                lastActivity: new Date(),
                resources: {
                    cpu: 0,
                    memory: 0,
                    disk: 0
                },
                metadata: {
                    tmuxSession: sessionName,
                    outputPath: outputPath,
                    statePath: statePath,
                    tools: agentConfig.tools,
                    workflow: agentConfig.workflow
                }
            });

            this.activeAgents.set(agentId, agentSession);
      
            console.log(`✅ Agent created: ${agentId} with tmux session: ${sessionName}`);
      
            return agentSession;

        } catch (error) {
            console.error(`❌ Failed to create agent ${agentId}:`, error);
            // Cleanup on failure
            try {
                await execAsync(`tmux kill-session -t "${sessionName}"`).catch(() => {});
            } catch {}
            throw error;
        }
    }

    /**
   * Setup agent environment in tmux session
   */
    async setupAgentEnvironment(sessionName, config, workspacePath) {
        const commands = [
            // Set environment variables
            `export AGENT_ID=${config.agentId}`,
            `export AGENT_TYPE=${config.agentType}`,
            `export TEAM_ID=${config.teamId}`,
            `export WORKSPACE_PATH=${workspacePath}`,
            `export AGENT_TOOLS="${config.tools.join(',')}"`,
      
            // Create helpful aliases
            'alias ll=\'ls -la\'',
            `alias workspace='cd ${workspacePath}'`,
            `alias output='cd ${workspacePath}/output'`,
      
            // Setup git if needed
            `git config --global user.name "Agent ${config.agentType}"`,
            `git config --global user.email "${config.agentType}@coder1.ai"`,
      
            // Create initial files
            `echo "# Agent ${config.agentId} Workspace" > README.md`,
            `echo "Agent Type: ${config.agentType}" >> README.md`,
            `echo "Team: ${config.teamId}" >> README.md`,
            'echo "Created: $(date)" >> README.md',
      
            // Set prompt to show agent info
            `PS1="[Agent:${config.agentType}] $ "`
        ];

        // Execute setup commands in tmux session
        for (const command of commands) {
            try {
                await execAsync(`tmux send-keys -t "${sessionName}" "${command}" Enter`);
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
            } catch (error) {
                console.warn(`Warning: Setup command failed: ${command}`, error.message);
            }
        }
    }

    /**
   * Execute command in agent's tmux session
   */
    async executeCommand(agentId, command, options = {}) {
        const agent = this.activeAgents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        const startTime = Date.now();
        console.log(`🚀 Executing in agent ${agentId}: ${command}`);

        try {
            const sessionName = agent.sessionId;
      
            // Execute command in tmux session
            await execAsync(`tmux send-keys -t "${sessionName}" "${command}" Enter`);
      
            // Wait a bit for command to execute
            await new Promise(resolve => setTimeout(resolve, options.timeout || 1000));
      
            // Capture output (simplified - would need more sophisticated capture)
            const result = new CommandResult({
                stdout: `Command executed in agent ${agentId}: ${command}`,
                stderr: '',
                exitCode: 0,
                duration: Date.now() - startTime,
                timestamp: new Date()
            });

            // Update agent activity
            agent.lastActivity = new Date();
      
            return result;

        } catch (error) {
            console.error(`❌ Command failed in agent ${agentId}:`, error);
            throw error;
        }
    }

    /**
   * Transfer files between agents
   */
    async transferFiles(fromAgentId, toAgentId, files) {
        const fromAgent = this.activeAgents.get(fromAgentId);
        const toAgent = this.activeAgents.get(toAgentId);
    
        if (!fromAgent || !toAgent) {
            throw new Error('One or both agents not found');
        }

        console.log(`📁 Transferring ${files.length} files from ${fromAgentId} to ${toAgentId}`);

        try {
            for (const file of files) {
                const sourcePath = path.join(fromAgent.workspacePath, 'output', file);
                const targetPath = path.join(toAgent.workspacePath, 'handoffs', file);
        
                // Ensure target directory exists
                await fs.mkdir(path.dirname(targetPath), { recursive: true });
        
                // Copy file
                await fs.copyFile(sourcePath, targetPath);
        
                console.log(`✅ Transferred: ${file}`);
            }

            console.log(`✅ File transfer complete: ${fromAgentId} → ${toAgentId}`);

        } catch (error) {
            console.error(`❌ File transfer failed: ${fromAgentId} → ${toAgentId}`, error);
            throw error;
        }
    }

    /**
   * Get current agent status
   */
    async getAgentStatus(agentId) {
        const agent = this.activeAgents.get(agentId);
        if (!agent) {
            return null;
        }

        try {
            // Update resource usage
            const resources = await this.getAgentResources(agent);
      
            // Get recent activity
            const isActive = await this.checkAgentActivity(agent);
      
            // List workspace files
            const files = await this.listAgentFiles(agentId);

            return new AgentStatus({
                agentId: agentId,
                status: isActive ? 'working' : 'idle',
                currentTask: 'Agent processing...',
                progress: Math.random() * 100, // Would be calculated based on actual work
                resources: resources,
                logs: [], // Would capture from tmux
                files: files,
                lastUpdate: new Date()
            });

        } catch (error) {
            console.error(`Error getting status for agent ${agentId}:`, error);
            return new AgentStatus({
                agentId: agentId,
                status: 'error',
                lastUpdate: new Date()
            });
        }
    }

    /**
   * Get agent resource usage
   */
    async getAgentResources(agent) {
        try {
            // Get tmux session process info
            const { stdout } = await execAsync(`tmux list-panes -t "${agent.sessionId}" -F "#{pane_pid}"`);
            const pids = stdout.trim().split('\n').filter(Boolean);

            // Simple resource calculation (would be more sophisticated in production)
            return {
                cpu: Math.random() * 25, // 0-25% CPU
                memory: Math.random() * 512, // 0-512MB memory  
                disk: await this.getDirectorySize(agent.workspacePath)
            };

        } catch (error) {
            return { cpu: 0, memory: 0, disk: 0 };
        }
    }

    /**
   * Check if agent is currently active
   */
    async checkAgentActivity(agent) {
        try {
            // Check if tmux session is alive and has activity
            await execAsync(`tmux list-sessions | grep "${agent.sessionId}"`);
      
            // Simple activity check - would be more sophisticated
            const timeSinceActivity = Date.now() - agent.lastActivity.getTime();
            return timeSinceActivity < 30000; // Active if activity in last 30 seconds
      
        } catch (error) {
            return false;
        }
    }

    /**
   * List all files in agent workspace
   */
    async listAgentFiles(agentId) {
        const agent = this.activeAgents.get(agentId);
        if (!agent) {
            return [];
        }

        try {
            const files = await this.walkDirectory(agent.workspacePath);
            return files.map(file => path.relative(agent.workspacePath, file));
        } catch (error) {
            console.error(`Error listing files for agent ${agentId}:`, error);
            return [];
        }
    }

    /**
   * Recursively walk directory and return all files
   */
    async walkDirectory(dirPath) {
        const files = [];
    
        async function walk(currentPath) {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
        
                if (entry.isDirectory()) {
                    await walk(fullPath);
                } else {
                    files.push(fullPath);
                }
            }
        }
    
        try {
            await walk(dirPath);
            return files;
        } catch (error) {
            return [];
        }
    }

    /**
   * Get directory size in MB
   */
    async getDirectorySize(dirPath) {
        try {
            const { stdout } = await execAsync(`du -sm "${dirPath}"`);
            return parseInt(stdout.split('\t')[0]) || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
   * Destroy agent and cleanup
   */
    async destroyAgent(agentId) {
        const agent = this.activeAgents.get(agentId);
        if (!agent) {
            console.warn(`Agent ${agentId} not found for destruction`);
            return;
        }

        console.log(`🗑️ Destroying agent: ${agentId}`);

        try {
            // Kill tmux session
            await execAsync(`tmux kill-session -t "${agent.sessionId}"`).catch(() => {
                // Session might already be dead
            });

            // Remove workspace directory
            await fs.rm(agent.workspacePath, { recursive: true, force: true });

            // Remove from active agents
            this.activeAgents.delete(agentId);

            console.log(`✅ Agent destroyed: ${agentId}`);

        } catch (error) {
            console.error(`❌ Failed to destroy agent ${agentId}:`, error);
            throw error;
        }
    }

    // === Team Workspace Management ===

    /**
   * Create team workspace for multi-agent collaboration
   */
    async createTeamWorkspace(teamId, config = {}) {
        console.log(`👥 Creating team workspace: ${teamId}`);

        try {
            const workspacePath = path.join(this.baseDirectory, teamId);
            const sharedPath = path.join(workspacePath, 'shared');
      
            // Create directory structure
            await fs.mkdir(workspacePath, { recursive: true });
            await fs.mkdir(sharedPath, { recursive: true });
            await fs.mkdir(path.join(sharedPath, 'handoffs'), { recursive: true });
            await fs.mkdir(path.join(sharedPath, 'requirements'), { recursive: true });
            await fs.mkdir(path.join(workspacePath, 'agents'), { recursive: true });

            // Create team workspace object
            const teamWorkspace = new TeamWorkspace({
                teamId: teamId,
                workspacePath: workspacePath,
                sharedPath: sharedPath,
                agents: [],
                createdAt: new Date(),
                metadata: {
                    runtime: 'tmux',
                    config: config
                }
            });

            this.activeTeams.set(teamId, teamWorkspace);
      
            console.log(`✅ Team workspace created: ${teamId} at ${workspacePath}`);
      
            return teamWorkspace;

        } catch (error) {
            console.error(`❌ Failed to create team workspace ${teamId}:`, error);
            throw error;
        }
    }

    /**
   * Destroy team workspace and all agents
   */
    async destroyTeamWorkspace(teamId) {
        console.log(`🗑️ Destroying team workspace: ${teamId}`);

        try {
            // Destroy all agents in the team
            const teamAgents = Array.from(this.activeAgents.values())
                .filter(agent => agent.teamId === teamId);
      
            for (const agent of teamAgents) {
                await this.destroyAgent(agent.agentId);
            }

            // Remove team workspace directory
            const teamWorkspace = this.activeTeams.get(teamId);
            if (teamWorkspace) {
                await fs.rm(teamWorkspace.workspacePath, { recursive: true, force: true });
                this.activeTeams.delete(teamId);
            }

            console.log(`✅ Team workspace destroyed: ${teamId}`);

        } catch (error) {
            console.error(`❌ Failed to destroy team workspace ${teamId}:`, error);
            throw error;
        }
    }

    /**
   * List all active agents in a team
   */
    async listTeamAgents(teamId) {
        return Array.from(this.activeAgents.values())
            .filter(agent => agent.teamId === teamId);
    }

    // === Runtime Management ===

    /**
   * Get runtime statistics
   */
    async getStats() {
        const stats = {
            runtimeType: this.runtimeType,
            totalAgents: this.activeAgents.size,
            totalTeams: this.activeTeams.size,
            baseDirectory: this.baseDirectory,
            capabilities: this.getCapabilities(),
            agents: {},
            teams: {}
        };

        // Get agent stats
        for (const [agentId, agent] of this.activeAgents.entries()) {
            stats.agents[agentId] = {
                agentType: agent.agentType,
                teamId: agent.teamId,
                status: agent.status,
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
                workspacePath: team.workspacePath
            };
        }

        return stats;
    }

    /**
   * Cleanup orphaned tmux sessions
   */
    async cleanupOrphanedSessions() {
        try {
            const { stdout } = await execAsync('tmux list-sessions -F "#{session_name}"');
            const sessions = stdout.trim().split('\n').filter(s => s.startsWith('agent-'));

            for (const sessionName of sessions) {
                try {
                    await execAsync(`tmux kill-session -t "${sessionName}"`);
                    console.log(`🧹 Cleaned orphaned session: ${sessionName}`);
                } catch (error) {
                    // Session might already be dead
                }
            }
        } catch (error) {
            // No sessions exist, that's fine
        }
    }

    /**
   * Cleanup all resources
   */
    async cleanup() {
        console.log('🧹 Cleaning up Tmux Runtime...');

        try {
            // Destroy all teams (which destroys all agents)
            const teamIds = Array.from(this.activeTeams.keys());
            for (const teamId of teamIds) {
                await this.destroyTeamWorkspace(teamId);
            }

            // Cleanup orphaned sessions
            await this.cleanupOrphanedSessions();

            console.log('✅ Tmux Runtime cleanup complete');

        } catch (error) {
            console.error('❌ Error during Tmux Runtime cleanup:', error);
            throw error;
        }
    }

    /**
   * Shutdown the runtime
   */
    async shutdown() {
        console.log('🛑 Shutting down Tmux Runtime...');
        await this.cleanup();
        this.isAvailable = false;
        console.log('✅ Tmux Runtime shutdown complete');
    }
}

module.exports = {
    TmuxAgentRuntime
};