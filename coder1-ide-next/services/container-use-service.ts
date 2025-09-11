/**
 * Container-Use Service for Coder1 IDE
 * Manages containerized AI agent environments via the container-use CLI
 * 
 * Features:
 * - Spawn isolated containers for AI agents
 * - Git branch management per container
 * - Terminal connections to containers
 * - Resource monitoring and cleanup
 * - Integration with existing Agent Dashboard
 */

import { EventEmitter } from 'events';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { logger } from '../lib/logger';

const execAsync = promisify(exec);

export interface ContainerSession {
  id: string;
  name: string;
  agentType: string;
  branch: string;
  status: 'spawning' | 'running' | 'idle' | 'stopped' | 'error';
  startTime: Date;
  lastActivity?: Date;
  resources?: {
    cpu: number;
    memory: number;
    disk: number;
  };
  terminal?: any;
  mcpEndpoint?: string;
}

export interface AgentConfig {
  type: string;
  personality: string;
  tools: string[];
  memory: string;
  cpu: string;
}

export class ContainerUseService extends EventEmitter {
  private activeContainers: Map<string, ContainerSession> = new Map();
  private containerCounter = 0;
  private isEnabled = false;

  constructor() {
    super();
    this.isEnabled = process.env.ENABLE_CONTAINERS === 'true' || false;
    logger.debug(`🐳 ContainerUseService initialized (enabled: ${this.isEnabled})`);
  }

  /**
   * Check if container-use is available and working
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('container-use --version');
      logger.debug(`✅ Container-use available: ${stdout.trim()}`);
      return true;
    } catch (error) {
      logger.error('❌ Container-use not available:', error);
      return false;
    }
  }

  /**
   * Spawn a new container for an AI agent
   */
  async spawnAgentContainer(
    agentType: string, 
    config?: Partial<AgentConfig>
  ): Promise<ContainerSession> {
    if (!this.isEnabled) {
      throw new Error('Container mode is disabled. Set ENABLE_CONTAINERS=true to enable.');
    }

    const containerId = `agent-${agentType}-${++this.containerCounter}`;
    const branchName = `agent/${agentType}/${Date.now()}`;
    
    logger.debug(`🚀 Spawning container for ${agentType}...`);
    
    const session: ContainerSession = {
      id: containerId,
      name: `${agentType} Agent`,
      agentType,
      branch: branchName,
      status: 'spawning',
      startTime: new Date(),
    };

    this.activeContainers.set(containerId, session);
    this.emit('container-spawning', session);

    try {
      // Create container environment
      // Note: container-use manages the git branch creation automatically
      const command = `cd /Users/michaelkraft/autonomous_vibe_interface && container-use apply ${containerId}`;
      
      logger.debug(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        logger.warn(`Container spawn warning: ${stderr}`);
      }

      // Update session status
      session.status = 'running';
      session.lastActivity = new Date();
      
      logger.debug(`✅ Container ${containerId} spawned successfully`);
      logger.debug(`📋 Output: ${stdout}`);
      
      this.emit('container-ready', session);
      return session;

    } catch (error) {
      logger.error(`❌ Failed to spawn container ${containerId}:`, error);
      session.status = 'error';
      this.emit('container-error', { session, error });
      throw error;
    }
  }

  /**
   * Connect to container's terminal
   */
  async attachToContainer(containerId: string): Promise<any> {
    const session = this.activeContainers.get(containerId);
    if (!session) {
      throw new Error(`Container ${containerId} not found`);
    }

    if (session.status !== 'running') {
      throw new Error(`Container ${containerId} is not running (status: ${session.status})`);
    }

    try {
      logger.debug(`🔌 Attaching to container ${containerId} terminal...`);
      
      // Start terminal connection to container
      const terminalProcess = spawn('container-use', ['terminal', containerId], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      session.terminal = terminalProcess;
      session.lastActivity = new Date();

      this.emit('terminal-attached', { session, terminal: terminalProcess });
      
      return terminalProcess;

    } catch (error) {
      logger.error(`❌ Failed to attach to container ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Start MCP server for container integration
   */
  async startMCPServer(containerId: string): Promise<string> {
    const session = this.activeContainers.get(containerId);
    if (!session) {
      throw new Error(`Container ${containerId} not found`);
    }

    try {
      logger.debug(`🔌 Starting MCP server for container ${containerId}...`);
      
      // container-use stdio provides MCP server functionality
      const mcpProcess = spawn('container-use', ['stdio'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, CONTAINER_ENV: containerId }
      });

      const mcpEndpoint = `stdio://localhost:${mcpProcess.pid}`;
      session.mcpEndpoint = mcpEndpoint;

      logger.debug(`✅ MCP server started for ${containerId} at ${mcpEndpoint}`);
      
      this.emit('mcp-server-started', { session, endpoint: mcpEndpoint });
      
      return mcpEndpoint;

    } catch (error) {
      logger.error(`❌ Failed to start MCP server for ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Get container status and resource usage
   */
  async getContainerStatus(containerId: string): Promise<ContainerSession | null> {
    const session = this.activeContainers.get(containerId);
    if (!session) return null;

    try {
      // Get container activity status
      const { stdout } = await execAsync(`container-use log ${containerId} --format json`);
      
      // Parse activity to determine if container is idle or active
      session.lastActivity = new Date(); // Simplified for now
      
      // Mock resource usage (container-use doesn't expose this yet)
      session.resources = {
        cpu: Math.random() * 100, // 0-100%
        memory: Math.random() * 512, // 0-512MB
        disk: Math.random() * 1024 // 0-1GB
      };

    } catch (error) {
      logger.warn(`Could not get detailed status for ${containerId}:`, error);
    }

    return session;
  }

  /**
   * List all active containers
   */
  async listContainers(): Promise<ContainerSession[]> {
    const sessions = Array.from(this.activeContainers.values());
    
    // Update status for each container
    for (const session of sessions) {
      await this.getContainerStatus(session.id);
    }
    
    return sessions;
  }

  /**
   * Stop and remove a container
   */
  async destroyContainer(containerId: string): Promise<void> {
    const session = this.activeContainers.get(containerId);
    if (!session) {
      logger.warn(`Container ${containerId} not found for destruction`);
      return;
    }

    try {
      logger.debug(`🗑️ Destroying container ${containerId}...`);
      
      // Stop terminal if attached
      if (session.terminal) {
        session.terminal.kill();
      }

      // Delete the container environment
      await execAsync(`container-use delete ${containerId}`);
      
      // Remove from tracking
      this.activeContainers.delete(containerId);
      
      logger.debug(`✅ Container ${containerId} destroyed`);
      this.emit('container-destroyed', session);

    } catch (error) {
      logger.error(`❌ Failed to destroy container ${containerId}:`, error);
      session.status = 'error';
      throw error;
    }
  }

  /**
   * Reset container to fresh state
   */
  async resetContainer(containerId: string): Promise<ContainerSession> {
    logger.debug(`🔄 Resetting container ${containerId}...`);
    
    const oldSession = this.activeContainers.get(containerId);
    if (!oldSession) {
      throw new Error(`Container ${containerId} not found`);
    }

    // Destroy old container
    await this.destroyContainer(containerId);
    
    // Spawn new container with same configuration
    const newSession = await this.spawnAgentContainer(oldSession.agentType);
    
    logger.debug(`✅ Container reset complete: ${oldSession.id} → ${newSession.id}`);
    
    return newSession;
  }

  /**
   * Apply container work to main branch
   */
  async mergeContainerWork(containerId: string): Promise<void> {
    const session = this.activeContainers.get(containerId);
    if (!session) {
      throw new Error(`Container ${containerId} not found`);
    }

    try {
      logger.debug(`🔀 Merging work from container ${containerId}...`);
      
      // Use container-use merge command
      await execAsync(`cd /Users/michaelkraft/autonomous_vibe_interface && container-use merge ${containerId}`);
      
      logger.debug(`✅ Successfully merged work from container ${containerId}`);
      this.emit('container-merged', session);

    } catch (error) {
      logger.error(`❌ Failed to merge container ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Get diff of what container changed
   */
  async getContainerDiff(containerId: string): Promise<string> {
    const session = this.activeContainers.get(containerId);
    if (!session) {
      throw new Error(`Container ${containerId} not found`);
    }

    try {
      const { stdout } = await execAsync(`container-use diff ${containerId}`);
      return stdout;
    } catch (error) {
      logger.error(`❌ Failed to get diff for container ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup all containers
   */
  async cleanup(): Promise<void> {
    logger.debug('🧹 Cleaning up all containers...');
    
    const containerIds = Array.from(this.activeContainers.keys());
    
    for (const containerId of containerIds) {
      try {
        await this.destroyContainer(containerId);
      } catch (error) {
        logger.error(`Failed to cleanup container ${containerId}:`, error);
      }
    }
    
    logger.debug('✅ Container cleanup complete');
  }

  /**
   * Enable/disable container mode
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    logger.debug(`🐳 Container mode ${enabled ? 'enabled' : 'disabled'}`);
    
    if (!enabled) {
      // Cleanup all containers when disabling
      this.cleanup();
    }
  }

  /**
   * Check if container mode is enabled
   */
  get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get container statistics
   */
  getStats() {
    return {
      totalContainers: this.activeContainers.size,
      runningContainers: Array.from(this.activeContainers.values()).filter(c => c.status === 'running').length,
      enabled: this.isEnabled,
      containers: Array.from(this.activeContainers.values())
    };
  }
}

// Singleton instance
export const containerService = new ContainerUseService();