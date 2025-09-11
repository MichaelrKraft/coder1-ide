/**
 * Agent Runtime Service - Manages AI agents in sandboxed environments
 * 
 * Integrates with Enhanced tmux Service to provide:
 * - Isolated agent workspaces
 * - Resource management per agent
 * - Agent lifecycle management
 * - Communication channels between agents
 */

import { EventEmitter } from 'events';
import { getEnhancedTmuxService, SandboxSession } from './enhanced-tmux-service';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger';

// Agent types based on the system
export type AgentType = 
  | 'frontend'
  | 'backend'
  | 'architect'
  | 'optimizer'
  | 'debugger'
  | 'implementer';

export interface AgentConfig {
  type: AgentType;
  name: string;
  expertise: string[];
  maxCpu?: number;
  maxMemory?: number;
  maxDisk?: number;
  timeLimit?: number;
  claudeFlags?: string[]; // Additional flags for Claude CLI
}

export interface AgentSession {
  id: string;
  type: AgentType;
  name: string;
  sandboxId: string;
  sandbox: SandboxSession;
  status: 'initializing' | 'ready' | 'working' | 'idle' | 'stopped' | 'error';
  startTime: Date;
  lastActivity: Date;
  tasksCompleted: number;
  currentTask: string | null;
  output: string[];
}

export interface AgentTask {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string; // Agent ID
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

// Agent configurations
const AGENT_CONFIGS: Record<AgentType, Omit<AgentConfig, 'type'>> = {
  frontend: {
    name: 'Frontend Specialist',
    expertise: ['React', 'UI/UX', 'Tailwind', 'TypeScript', 'Responsive Design'],
    maxCpu: 40,
    maxMemory: 2048,
    maxDisk: 3072,
    claudeFlags: ['--context=frontend', '--framework=react']
  },
  backend: {
    name: 'Backend Specialist',
    expertise: ['Node.js', 'APIs', 'Databases', 'Authentication', 'Security'],
    maxCpu: 50,
    maxMemory: 3072,
    maxDisk: 5120,
    claudeFlags: ['--context=backend', '--framework=express']
  },
  architect: {
    name: 'System Architect',
    expertise: ['System Design', 'Architecture', 'Patterns', 'Documentation'],
    maxCpu: 30,
    maxMemory: 1024,
    maxDisk: 2048,
    claudeFlags: ['--context=architecture', '--mode=planning']
  },
  optimizer: {
    name: 'Performance Optimizer',
    expertise: ['Performance', 'Memory Management', 'Optimization', 'Profiling'],
    maxCpu: 60,
    maxMemory: 4096,
    maxDisk: 2048,
    claudeFlags: ['--context=performance', '--mode=analysis']
  },
  debugger: {
    name: 'Debug Specialist',
    expertise: ['Debugging', 'Testing', 'Error Analysis', 'Edge Cases'],
    maxCpu: 40,
    maxMemory: 2048,
    maxDisk: 2048,
    claudeFlags: ['--context=debugging', '--mode=diagnostic']
  },
  implementer: {
    name: 'Core Implementer',
    expertise: ['Implementation', 'Business Logic', 'Integration', 'Features'],
    maxCpu: 50,
    maxMemory: 2048,
    maxDisk: 4096,
    claudeFlags: ['--context=implementation', '--mode=coding']
  }
};

export class AgentRuntimeService extends EventEmitter {
  private agents: Map<string, AgentSession> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private tmuxService = getEnhancedTmuxService();
  private userId: string;

  constructor(userId: string = 'default-user') {
    super();
    this.userId = userId;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen to sandbox events
    this.tmuxService.on('sandbox:limit-exceeded', ({ sandboxId, type }) => {
      const agent = this.getAgentBySandbox(sandboxId);
      if (agent) {
        logger.warn(`Agent ${agent.name} exceeded ${type} limit`);
        this.emit('agent:limit-exceeded', { agentId: agent.id, type });
      }
    });
  }

  /**
   * Spawn a new AI agent in an isolated sandbox
   */
  async spawnAgent(type: AgentType, projectId: string = 'default'): Promise<AgentSession> {
    const config = AGENT_CONFIGS[type];
    if (!config) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    // Create sandbox for the agent
    const sandbox = await this.tmuxService.createSandbox({
      userId: this.userId,
      projectId: `agent_${type}_${projectId}`,
      maxCpu: config.maxCpu,
      maxMemory: config.maxMemory,
      maxDisk: config.maxDisk,
      timeLimit: config.timeLimit
    });

    // Create agent session
    const agentId = `agent_${type}_${uuidv4().slice(0, 8)}`;
    const agent: AgentSession = {
      id: agentId,
      type,
      name: config.name,
      sandboxId: sandbox.id,
      sandbox,
      status: 'initializing',
      startTime: new Date(),
      lastActivity: new Date(),
      tasksCompleted: 0,
      currentTask: null,
      output: []
    };

    this.agents.set(agentId, agent);

    // Initialize Claude in the sandbox
    await this.initializeClaudeAgent(agent, config);

    agent.status = 'ready';
    this.emit('agent:spawned', agent);

    return agent;
  }

  /**
   * Initialize Claude CLI in the agent's sandbox
   */
  private async initializeClaudeAgent(agent: AgentSession, config: Omit<AgentConfig, 'type'>): Promise<void> {
    // Build Claude command with flags
    const claudeFlags = [
      '--dangerously-skip-permissions', // Required for autonomy
      '--no-interactive',                // Non-interactive mode
      '--json-output',                   // Structured output
      ...(config.claudeFlags || [])
    ];

    const claudeCommand = `claude ${claudeFlags.join(' ')}`;

    // Start Claude in the sandbox
    try {
      await this.tmuxService.runInSandbox(
        agent.sandboxId,
        `echo "Initializing ${agent.name}..." && ${claudeCommand} --version`
      );

      // Set up agent workspace
      await this.tmuxService.runInSandbox(
        agent.sandboxId,
        `mkdir -p workspace && cd workspace && echo "Agent ${agent.name} ready in $(pwd)"`
      );

      agent.output.push(`Agent ${agent.name} initialized successfully`);
    } catch (error) {
      agent.status = 'error';
      agent.output.push(`Failed to initialize: ${error}`);
      throw error;
    }
  }

  /**
   * Assign a task to an agent
   */
  async assignTask(agentId: string, task: Omit<AgentTask, 'id' | 'assignedTo' | 'status'>): Promise<AgentTask> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status !== 'ready' && agent.status !== 'idle') {
      throw new Error(`Agent ${agent.name} is not available (status: ${agent.status})`);
    }

    const taskId = `task_${uuidv4().slice(0, 8)}`;
    const agentTask: AgentTask = {
      id: taskId,
      ...task,
      assignedTo: agentId,
      status: 'assigned'
    };

    this.tasks.set(taskId, agentTask);
    agent.currentTask = taskId;
    agent.status = 'working';
    agent.lastActivity = new Date();

    // Execute task in sandbox
    this.executeTask(agent, agentTask).catch(error => {
      logger.error(`Task execution failed for ${agent.name}:`, error);
      agentTask.status = 'failed';
      agentTask.error = error.message;
      agent.status = 'idle';
      agent.currentTask = null;
    });

    this.emit('task:assigned', { agent, task: agentTask });
    return agentTask;
  }

  /**
   * Execute a task in the agent's sandbox
   */
  private async executeTask(agent: AgentSession, task: AgentTask): Promise<void> {
    task.status = 'in_progress';
    this.emit('task:started', { agent, task });

    try {
      // Build Claude command for the task
      const claudeCommand = [
        'claude',
        '--dangerously-skip-permissions',
        '--task', `"${task.description}"`,
        '--context', agent.type,
        '--priority', task.priority
      ].join(' ');

      // Execute in sandbox
      const result = await this.tmuxService.runInSandbox(
        agent.sandboxId,
        claudeCommand
      );

      // Parse and store results
      task.result = result;
      task.status = 'completed';
      agent.tasksCompleted++;
      agent.output.push(`Task completed: ${task.description}`);

      this.emit('task:completed', { agent, task, result });
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      agent.output.push(`Task failed: ${task.description} - ${task.error}`);
      
      this.emit('task:failed', { agent, task, error });
      throw error;
    } finally {
      agent.status = 'idle';
      agent.currentTask = null;
      agent.lastActivity = new Date();
    }
  }

  /**
   * Broadcast a task to all available agents
   */
  async broadcastTask(task: Omit<AgentTask, 'id' | 'assignedTo' | 'status'>): Promise<AgentTask[]> {
    const availableAgents = Array.from(this.agents.values()).filter(
      a => a.status === 'ready' || a.status === 'idle'
    );

    if (availableAgents.length === 0) {
      throw new Error('No agents available for task');
    }

    // Find best agent for the task based on expertise
    const bestAgent = this.selectBestAgent(availableAgents, task.description);
    
    if (bestAgent) {
      const assignedTask = await this.assignTask(bestAgent.id, task);
      return [assignedTask];
    }

    throw new Error('Could not find suitable agent for task');
  }

  /**
   * Select best agent for a task based on expertise
   */
  private selectBestAgent(agents: AgentSession[], taskDescription: string): AgentSession | null {
    // Simple keyword matching for now
    const keywords = taskDescription.toLowerCase();
    
    for (const agent of agents) {
      const config = AGENT_CONFIGS[agent.type];
      const expertiseMatch = config.expertise.some(exp => 
        keywords.includes(exp.toLowerCase())
      );
      
      if (expertiseMatch) {
        return agent;
      }
    }

    // Return first available if no specific match
    return agents[0] || null;
  }

  /**
   * Get agent output/logs
   */
  getAgentOutput(agentId: string): string[] {
    const agent = this.agents.get(agentId);
    return agent ? agent.output : [];
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.status = 'stopped';
    
    // Destroy the sandbox
    await this.tmuxService.destroySandbox(agent.sandboxId);
    
    // Remove from tracking
    this.agents.delete(agentId);
    
    this.emit('agent:stopped', agent);
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentSession[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentSession | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get agent by sandbox ID
   */
  private getAgentBySandbox(sandboxId: string): AgentSession | undefined {
    return Array.from(this.agents.values()).find(a => a.sandboxId === sandboxId);
  }

  /**
   * Test agent in sandbox
   */
  async testAgent(agentId: string): Promise<{ passed: boolean; results: any }> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return await this.tmuxService.testSandbox(agent.sandboxId);
  }

  /**
   * Promote agent's work to main workspace
   */
  async promoteAgentWork(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    await this.tmuxService.promoteSandbox(agent.sandboxId);
    this.emit('agent:work-promoted', agent);
  }

  /**
   * Shutdown all agents
   */
  async shutdown(): Promise<void> {
    for (const id of Array.from(this.agents.keys())) {
      await this.stopAgent(id);
    }
  }
}

// Singleton management
const instances: Map<string, AgentRuntimeService> = new Map();

export function getAgentRuntimeService(userId: string = 'default-user'): AgentRuntimeService {
  if (!instances.has(userId)) {
    instances.set(userId, new AgentRuntimeService(userId));
  }
  return instances.get(userId)!;
}