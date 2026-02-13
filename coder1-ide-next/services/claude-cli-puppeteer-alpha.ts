/**
 * Claude CLI Puppeteer Service - Alpha Deployment Version
 *
 * Optimized for Render Starter Plan (512MB RAM, $7/month)
 * Supports 5-10 alpha users with strict memory management
 *
 * Key Constraints:
 * - MAX 1 concurrent team (sequential processing)
 * - MAX 2 agents per team (not parallel)
 * - Aggressive memory cleanup
 * - Process pooling with queue management
 */

import { spawn, IPty } from 'node-pty';
import { EventEmitter } from 'events';
import path from 'path';
import { promises as fs } from 'fs';
import { getMemoryOptimizer, MemoryOptimizer } from './memory-optimizer';

// Types
interface AlphaConfig {
  claudeCliPath: string;
  maxConcurrentTeams: number;
  maxAgentsPerTeam: number;
  processPoolSize: number;
  processTimeout: number;
  idleTimeout: number;
  outputBufferSize: number;
  responseTimeout: number;
  queueEnabled: boolean;
  maxQueueSize: number;
  alphaMode: boolean;
}

interface AgentSession {
  agentId: string;
  role: string;
  context: string;
  workTreePath: string;
  status: 'initializing' | 'ready' | 'stopped';
  outputBuffer: string;
  responseBuffer: string;
  lastActivity: number;
  pty: IPty | null;
  isWaitingForResponse?: boolean;
  conversationHistory?: unknown[];
}

interface TeamSession {
  teamId: string;
  requirement: string;
  agentRoles: string[];
  workTreeRoot: string;
  status: 'spawning' | 'ready' | 'error';
  agents: AgentSession[];
  createdAt: number;
  lastActivity: number;
  idleCheckInterval?: ReturnType<typeof setInterval>;
}

interface QueueItem {
  teamId: string;
  requirement: string;
  agentRoles: string[];
  workTreeRoot: string;
  resolve: (value: TeamSession) => void;
  reject: (reason: Error) => void;
  queuedAt: number;
}

interface ProcessPoolEntry {
  pty: IPty;
  lastActivity: number;
}

interface AlphaStats {
  totalRequests: number;
  completedRequests: number;
  queuedRequests: number;
  memoryCleanups: number;
  errors: number;
  startTime: number;
  activeTeam: string | null;
  queueLength: number;
  memory: ReturnType<MemoryOptimizer['getStats']>;
  uptime: number;
  alphaMode: boolean;
}

export class ClaudeCLIPuppeteerAlpha extends EventEmitter {
  private config: AlphaConfig;
  private memoryOptimizer: MemoryOptimizer;
  private activeTeam: TeamSession | null = null;
  private processPool: Map<string, ProcessPoolEntry> = new Map();
  private requestQueue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private stats: {
    totalRequests: number;
    completedRequests: number;
    queuedRequests: number;
    memoryCleanups: number;
    errors: number;
    startTime: number;
  };

  constructor(options: Partial<AlphaConfig> = {}) {
    super();

    // Strict Alpha Configuration (from .env.production.alpha)
    this.config = {
      claudeCliPath:
        options.claudeCliPath || process.env.CLAUDE_CLI_PATH || '/opt/homebrew/bin/claude',
      maxConcurrentTeams: parseInt(process.env.MAX_CONCURRENT_TEAMS || '1'),
      maxAgentsPerTeam: parseInt(process.env.MAX_AGENTS_PER_TEAM || '2'),
      processPoolSize: parseInt(process.env.PROCESS_POOL_SIZE || '1'),
      processTimeout: parseInt(process.env.PROCESS_TIMEOUT_MS || '300000'), // 5 minutes
      idleTimeout: parseInt(process.env.IDLE_TIMEOUT_MS || '60000'), // 1 minute
      outputBufferSize: 5000, // Reduced from 10000
      responseTimeout: 300000, // 5 minutes
      queueEnabled: process.env.SESSION_QUEUE_ENABLED === 'true',
      maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE || '5'),
      alphaMode: process.env.ALPHA_MODE_ENABLED === 'true',
    };

    // Memory optimizer integration
    this.memoryOptimizer = getMemoryOptimizer({
      maxHeapMB: 400,
      warningThresholdMB: 300,
      panicThresholdMB: 380,
    });

    // Statistics
    this.stats = {
      totalRequests: 0,
      completedRequests: 0,
      queuedRequests: 0,
      memoryCleanups: 0,
      errors: 0,
      startTime: Date.now(),
    };

    // Initialize memory monitoring
    this.setupMemoryManagement();

    console.log('🚀 Claude CLI Puppeteer Alpha initialized');
    console.log(
      `📊 Config: ${this.config.maxConcurrentTeams} team, ${this.config.maxAgentsPerTeam} agents max`
    );
  }

  /**
   * Set up memory management and monitoring
   */
  private setupMemoryManagement(): void {
    // Start memory monitoring
    this.memoryOptimizer.startMonitoring();

    // Register this service for cleanup
    this.memoryOptimizer.registerDisposable(this);

    // Listen for memory events
    this.memoryOptimizer.on('cleanup-start', ({ level }: { level: string }) => {
      console.log(`🧹 Memory cleanup triggered (${level})`);
      if (level === 'panic') {
        this.handleMemoryPanic();
      }
    });

    this.memoryOptimizer.on('request-restart', () => {
      console.error('💀 Memory critical - requesting restart');
      this.emergencyShutdown();
    });
  }

  /**
   * Handle memory panic - aggressive cleanup
   */
  private async handleMemoryPanic(): Promise<void> {
    console.log('🚨 Memory panic - killing all processes');

    // Kill active team if exists
    if (this.activeTeam) {
      await this.forceStopTeam();
    }

    // Kill all pooled processes
    for (const [id, process] of this.processPool) {
      try {
        if (process.pty) {
          process.pty.kill();
        }
      } catch (error) {
        console.error(`Failed to kill process ${id}:`, error);
      }
    }
    this.processPool.clear();

    // Clear queue
    this.requestQueue = [];

    // Clear buffers
    if (this.activeTeam && this.activeTeam.agents) {
      this.activeTeam.agents.forEach((agent) => {
        agent.outputBuffer = '';
        agent.responseBuffer = '';
        agent.conversationHistory = [];
      });
    }

    this.stats.memoryCleanups++;
  }

  /**
   * Request team spawn - adds to queue if busy
   */
  async requestTeamSpawn(
    teamId: string,
    requirement: string,
    agentRoles: string[] = ['frontend', 'backend'],
    workTreeRoot: string
  ): Promise<TeamSession> {
    this.stats.totalRequests++;

    // Check memory before accepting request (environment-aware threshold)
    const memUsage = this.memoryOptimizer.getMemoryUsage();
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const memoryThreshold = isDevelopment ? 1500 : 350;
    if (memUsage.heapUsedMB > memoryThreshold) {
      throw new Error('System under memory pressure. Please try again in a few minutes.');
    }

    // Check if we're at capacity
    if (this.isProcessing) {
      if (!this.config.queueEnabled) {
        throw new Error('System busy. Only 1 team can be active at a time in alpha mode.');
      }

      if (this.requestQueue.length >= this.config.maxQueueSize) {
        throw new Error(`Queue full (${this.config.maxQueueSize} max). Please try again later.`);
      }

      // Add to queue
      return new Promise<TeamSession>((resolve, reject) => {
        const queueItem: QueueItem = {
          teamId,
          requirement,
          agentRoles,
          workTreeRoot,
          resolve,
          reject,
          queuedAt: Date.now(),
        };

        this.requestQueue.push(queueItem);
        this.stats.queuedRequests++;

        console.log(`📋 Request queued: ${teamId} (position ${this.requestQueue.length})`);

        // Set timeout for queued request
        setTimeout(
          () => {
            const index = this.requestQueue.indexOf(queueItem);
            if (index > -1) {
              this.requestQueue.splice(index, 1);
              reject(new Error('Request timeout while in queue'));
            }
          },
          parseInt(process.env.QUEUE_TIMEOUT_MS || '300000')
        );
      });
    }

    // Process immediately
    return this.spawnTeam(teamId, requirement, agentRoles, workTreeRoot);
  }

  /**
   * Spawn a team with sequential agent processing (not parallel)
   */
  private async spawnTeam(
    teamId: string,
    requirement: string,
    agentRoles: string[],
    workTreeRoot: string
  ): Promise<TeamSession> {
    if (this.activeTeam) {
      throw new Error('A team is already active. Alpha mode supports only 1 team at a time.');
    }

    // Limit agents per team
    if (agentRoles.length > this.config.maxAgentsPerTeam) {
      console.warn(
        `⚠️ Limiting agents from ${agentRoles.length} to ${this.config.maxAgentsPerTeam}`
      );
      agentRoles = agentRoles.slice(0, this.config.maxAgentsPerTeam);
    }

    this.isProcessing = true;

    console.log(`🚀 Spawning team: ${teamId} (Alpha mode - sequential)`);
    console.log(`📋 Requirement: ${requirement.substring(0, 100)}...`);
    console.log(`👥 Agents: ${agentRoles.join(', ')}`);

    const teamSession: TeamSession = {
      teamId,
      requirement,
      agentRoles,
      workTreeRoot,
      status: 'spawning',
      agents: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.activeTeam = teamSession;

    // Register team with memory optimizer
    this.memoryOptimizer.registerSession(teamId, teamSession);

    try {
      // Spawn agents SEQUENTIALLY (not parallel) to save memory
      for (const role of agentRoles) {
        const agent = await this.spawnAgent(`${teamId}-${role}`, role, requirement, workTreeRoot);
        teamSession.agents.push(agent);

        // Small delay between spawns
        await this.delay(1000);
      }

      teamSession.status = 'ready';
      console.log(`✅ Team ${teamId} ready with ${teamSession.agents.length} agents`);

      this.emit('teamSpawned', teamSession);

      // Set idle timeout
      this.setupIdleTimeout(teamSession);

      return teamSession;
    } catch (error) {
      console.error(`❌ Failed to spawn team ${teamId}:`, error);
      teamSession.status = 'error';

      // Cleanup
      await this.forceStopTeam();

      throw error;
    }
  }

  /**
   * Spawn a single agent (reuse process from pool if available)
   */
  private async spawnAgent(
    agentId: string,
    role: string,
    context: string,
    workTreeRoot: string
  ): Promise<AgentSession> {
    console.log(`🤖 Spawning agent: ${agentId} (${role})`);

    const agentWorkTree = path.join(workTreeRoot, role);
    await fs.mkdir(agentWorkTree, { recursive: true }).catch(() => {});

    const agentSession: AgentSession = {
      agentId,
      role,
      context,
      workTreePath: agentWorkTree,
      status: 'initializing',
      outputBuffer: '',
      responseBuffer: '',
      lastActivity: Date.now(),
      pty: null,
    };

    try {
      // Try to reuse process from pool
      let pty = this.getPooledProcess();

      if (!pty) {
        // Create new process
        pty = await this.createClaudeProcess(agentWorkTree);

        // Wait for initialization
        await this.waitForReady(pty, agentSession);
      }

      agentSession.pty = pty;

      // Set up minimal PTY handlers
      this.setupMinimalPTY(agentSession);

      // Send role context
      await this.sendToAgent(agentSession, this.getRolePrompt(role, context));

      agentSession.status = 'ready';

      // Register process with memory optimizer
      this.memoryOptimizer.registerProcess(agentId, { pty, agentSession });

      return agentSession;
    } catch (error) {
      console.error(`❌ Failed to spawn agent ${agentId}:`, error);

      if (agentSession.pty) {
        agentSession.pty.kill();
      }

      throw error;
    }
  }

  /**
   * Create a new Claude CLI process
   */
  private async createClaudeProcess(cwd: string): Promise<IPty> {
    const pty = spawn(this.config.claudeCliPath, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24, // Smaller terminal to save memory
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-color',
        CLAUDE_NO_INTERACTIVE: '1',
      },
    });

    return pty;
  }

  /**
   * Get a pooled process if available
   */
  private getPooledProcess(): IPty | null {
    // In alpha mode, we don't pool to save memory
    return null;
  }

  /**
   * Set up minimal PTY handlers (reduced memory footprint)
   */
  private setupMinimalPTY(agentSession: AgentSession): void {
    const { pty } = agentSession;
    if (!pty) return;

    pty.onData((data: string) => {
      const output = data.toString();

      // Keep minimal buffer
      agentSession.outputBuffer = (agentSession.outputBuffer + output).slice(
        -this.config.outputBufferSize
      );

      if (agentSession.isWaitingForResponse) {
        agentSession.responseBuffer += output;
      }

      agentSession.lastActivity = Date.now();

      // Update activity for memory optimizer
      this.memoryOptimizer.updateProcessActivity(agentSession.agentId);
    });

    pty.onExit(({ exitCode }: { exitCode: number }) => {
      console.log(`🔌 Agent ${agentSession.agentId} exited with code ${exitCode}`);
      agentSession.status = 'stopped';
    });
  }

  /**
   * Send message to agent with timeout
   */
  private async sendToAgent(agentSession: AgentSession, message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        agentSession.isWaitingForResponse = false;
        reject(new Error('Response timeout'));
      }, this.config.responseTimeout);

      agentSession.isWaitingForResponse = true;
      agentSession.responseBuffer = '';

      try {
        agentSession.pty?.write(message + '\n');

        // Simple response detection
        const checkInterval = setInterval(() => {
          if (
            agentSession.responseBuffer.length > 50 &&
            (agentSession.responseBuffer.includes('\n') ||
              Date.now() - agentSession.lastActivity > 2000)
          ) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            agentSession.isWaitingForResponse = false;
            resolve(agentSession.responseBuffer.trim());
          }
        }, 500);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Wait for Claude process to be ready
   */
  private async waitForReady(pty: IPty, agentSession: AgentSession): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Claude initialization timeout'));
      }, 30000);

      const checkReady = (): void => {
        if (
          agentSession.outputBuffer.includes('Claude') ||
          agentSession.outputBuffer.includes('>')
        ) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkReady, 1000);
        }
      };

      checkReady();
    });
  }

  /**
   * Get role-specific prompt
   */
  private getRolePrompt(role: string, context: string): string {
    const prompts: Record<string, string> = {
      frontend: `You are a Frontend Developer. Focus on UI/UX. Context: ${context}`,
      backend: `You are a Backend Developer. Focus on APIs and data. Context: ${context}`,
      testing: `You are a QA Engineer. Focus on testing. Context: ${context}`,
    };

    return prompts[role] || `You are a ${role} developer. Context: ${context}`;
  }

  /**
   * Set up idle timeout for team
   */
  private setupIdleTimeout(teamSession: TeamSession): void {
    const checkIdle = setInterval(() => {
      const idleTime = Date.now() - teamSession.lastActivity;

      if (idleTime > this.config.idleTimeout) {
        console.log(`⏰ Team ${teamSession.teamId} idle for ${idleTime}ms - cleaning up`);
        clearInterval(checkIdle);
        this.forceStopTeam();
      }
    }, 10000); // Check every 10 seconds

    teamSession.idleCheckInterval = checkIdle;
  }

  /**
   * Force stop the active team
   */
  async forceStopTeam(): Promise<void> {
    if (!this.activeTeam) return;

    const team = this.activeTeam;
    console.log(`🛑 Stopping team: ${team.teamId}`);

    // Clear idle check
    if (team.idleCheckInterval) {
      clearInterval(team.idleCheckInterval);
    }

    // Kill all agent processes
    team.agents.forEach((agent) => {
      if (agent.pty) {
        agent.pty.kill();
      }
    });

    // Deactivate in memory optimizer
    this.memoryOptimizer.deactivateSession(team.teamId);

    this.activeTeam = null;
    this.isProcessing = false;

    this.stats.completedRequests++;

    // Process next in queue
    this.processQueue();
  }

  /**
   * Process next request in queue
   */
  private async processQueue(): Promise<void> {
    if (this.requestQueue.length === 0 || this.isProcessing) {
      return;
    }

    const next = this.requestQueue.shift();
    if (!next) return;

    console.log(`📤 Processing queued request: ${next.teamId}`);

    try {
      const result = await this.spawnTeam(
        next.teamId,
        next.requirement,
        next.agentRoles,
        next.workTreeRoot
      );
      next.resolve(result);
    } catch (error) {
      next.reject(error as Error);
    }
  }

  /**
   * Emergency shutdown
   */
  async emergencyShutdown(): Promise<void> {
    console.log('💀 Emergency shutdown initiated');

    // Stop active team
    await this.forceStopTeam();

    // Clear queue
    this.requestQueue.forEach((item) => {
      item.reject(new Error('Emergency shutdown'));
    });
    this.requestQueue = [];

    // Kill all processes
    for (const [_id, process] of this.processPool) {
      if (process.pty) {
        process.pty.kill();
      }
    }
    this.processPool.clear();

    // Stop memory monitoring
    this.memoryOptimizer.stopMonitoring();

    this.emit('shutdown');
  }

  /**
   * Get service statistics
   */
  getStats(): AlphaStats {
    const memStats = this.memoryOptimizer.getStats();

    return {
      ...this.stats,
      activeTeam: this.activeTeam ? this.activeTeam.teamId : null,
      queueLength: this.requestQueue.length,
      memory: memStats,
      uptime: Date.now() - this.stats.startTime,
      alphaMode: true,
    };
  }

  /**
   * Dispose method for memory optimizer
   */
  dispose(): void {
    this.emergencyShutdown();
  }

  /**
   * Utility delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton
let instance: ClaudeCLIPuppeteerAlpha | null = null;

export function getAlphaPuppeteerService(
  options: Partial<AlphaConfig> = {}
): ClaudeCLIPuppeteerAlpha {
  if (!instance) {
    instance = new ClaudeCLIPuppeteerAlpha(options);
  }
  return instance;
}

export default {
  ClaudeCLIPuppeteerAlpha,
  getAlphaPuppeteerService,
};
