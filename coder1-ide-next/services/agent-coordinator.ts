/**
 * Agent Coordinator Service
 *
 * High-level orchestration and coordination of multiple AI agents working together.
 * Handles workflows, task distribution, inter-agent communication, and result synthesis.
 *
 * Key Features:
 * - Workflow-based task orchestration
 * - Dynamic agent role assignment
 * - Inter-agent communication and collaboration
 * - Progress tracking and reporting
 * - Error handling and recovery
 * - Result synthesis and integration
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import { promises as fs } from 'fs';
import type { Server as SocketIOServer } from 'socket.io';

// Import services - these need TypeScript definitions
// Using require for JavaScript modules that don't have .d.ts files
const { getPuppeteerService } = require('./claude-cli-puppeteer');
const { CLIOutputParser } = require('./cli-output-parser');
const { getPromptGenerator } = require('./prompts/prompt-generator');

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Agent role identifiers */
export type AgentRoleId = 'frontend' | 'backend' | 'fullstack' | 'testing' | 'devops' | 'architect';

/** Workflow execution mode */
export type PhaseMode = 'sequential' | 'parallel';

/** Workflow status */
export type WorkflowStatus = 'starting' | 'running' | 'completed' | 'failed' | 'stopping' | 'stopped';

/** Phase status */
export type PhaseStatus = 'starting' | 'running' | 'completed' | 'failed';

/** Agent role definition with persona and capabilities */
export interface AgentRoleDefinition {
  name: string;
  description: string;
  capabilities: string[];
  persona: string;
  defaultPrompts: {
    analyze: string;
    implement: string;
    review: string;
  };
}

/** Workflow phase definition */
export interface WorkflowPhase {
  name: string;
  agents: AgentRoleId[];
  mode: PhaseMode;
  tasks: string[];
}

/** Workflow template definition */
export interface WorkflowTemplate {
  name: string;
  description: string;
  phases: WorkflowPhase[];
  estimatedTime: number; // minutes
  agents?: AgentRoleId[]; // Flattened list for spawning
}

/** Agent session */
export interface AgentSession {
  agentId: string;
  role: AgentRoleId;
  status: string;
  workTreePath: string;
  branchName?: string;
  currentTask?: string;
  progress?: number;
}

/** Phase result */
export interface PhaseResult {
  name: string;
  status: PhaseStatus;
  outputs: TaskResult[];
  agents: string[];
  startTime: Date;
  endTime: Date | null;
  error?: string;
}

/** Task result */
export interface TaskResult {
  agent: AgentRoleId;
  agentId: string;
  task: string;
  prompt: string;
  output?: string;
  parsed?: ParsedContent;
  error?: string;
  success: boolean;
  executionTime: number;
  timestamp: Date;
}

/** Parsed content from CLI output */
export interface ParsedContent {
  text: string;
  codeBlocks?: Array<{ language: string; code: string }>;
  files?: Array<{ path: string; operation: string }>;
  errors?: Array<{ message: string }>;
}

/** Workflow error structure */
export interface WorkflowError {
  message: string;
  timestamp: Date;
  phase?: string;
}

/** Workflow results */
export interface WorkflowResults {
  outputs: TaskResult[];
  files: Array<{ path: string; operation: string }>;
  errors: WorkflowError[];
  summary: string;
}

/** Workflow progress tracking */
export interface WorkflowProgress {
  overall: number;
  phases: PhaseResult[];
}

/** Workflow session options */
export interface WorkflowSessionOptions {
  workTreeRoot: string;
  timeout: number;
  sessionId?: string;
  detailedRequirements?: Record<string, unknown>;
}

/** Workflow session state */
export interface WorkflowSession {
  sessionId: string;
  workflowId: string;
  template: WorkflowTemplate;
  requirement: string;
  detailedRequirements?: Record<string, unknown>;
  status: WorkflowStatus;
  currentPhase: WorkflowPhase | null;
  currentPhaseIndex: number;
  retryCount: number;
  phaseRetries: Map<string, number>;
  progress: WorkflowProgress;
  results: WorkflowResults;
  agents: Map<AgentRoleId, AgentSession>;
  startTime: Date;
  endTime: Date | null;
  options: WorkflowSessionOptions;
}

/** Coordinator options */
export interface CoordinatorOptions {
  maxConcurrentWorkflows?: number;
  defaultTimeout?: number;
  retryAttempts?: number;
  workTreeRoot?: string;
  enableLogging?: boolean;
  io?: SocketIOServer;
}

/** Coordinator statistics */
export interface CoordinatorStats {
  totalWorkflows: number;
  totalTasksCompleted: number;
  totalAgentHours: number;
  averageWorkflowTime: number;
  successRate: number;
  activeWorkflows?: number;
  availableTemplates?: number;
  availableRoles?: number;
  puppeteerStats?: Record<string, unknown>;
}

/** Workflow analysis result */
export interface WorkflowAnalysisResult {
  workflowId: string;
  template: WorkflowTemplate;
  confidence: number;
  reasoning: string;
  alternatives: Array<{
    id: string;
    score: number;
    reasoning: string;
  }>;
}

/** Workflow status response */
export interface WorkflowStatusResponse {
  sessionId: string;
  workflowId: string;
  template: string;
  requirement: string;
  status: WorkflowStatus;
  progress: WorkflowProgress;
  currentPhase?: string;
  agents: Array<{
    agentId: string;
    role: AgentRoleId;
    status: string;
    currentTask?: string;
    progress?: number;
  }>;
  executionTime: number;
}

/** Workflow execution result */
export interface WorkflowExecutionResult {
  sessionId: string;
  status: WorkflowStatus;
  results: WorkflowResults;
  executionTime: number;
  agents: AgentSession[];
}

/** Synthesized results */
export interface SynthesizedResults {
  summary: string;
  totalOutputs: number;
  totalFiles: number;
  executionTime: number;
  phases: number;
}

/** Available workflow info */
export interface AvailableWorkflow {
  id: string;
  name: string;
  description: string;
  estimatedTime: number;
  phases: number;
  agents: AgentRoleId[];
}

/** Call counters for recursion detection */
interface CallCounters {
  executeWorkflow: number;
  executePhase: number;
  executeTasksSequentially: number;
  executeTasksInParallel: number;
  executeAgentTask: number;
}

/** Agent terminal manager interface */
interface AgentTerminalManager {
  createAgentTerminalSession(agentId: string, sessionId: string, roleId: string): unknown;
  appendToAgentTerminal(agentId: string, output: string): void;
}

/** Fatal error with phase data */
interface FatalError extends Error {
  isFatalError: boolean;
  phaseData?: {
    phaseName: string;
    agents: AgentRoleId[];
    tasks: string[];
    mode: PhaseMode;
    outputsReceived: number;
  };
}

// ============================================================================
// AGENT COORDINATOR CLASS
// ============================================================================

export class AgentCoordinator extends EventEmitter {
  // Circuit breaker constants
  private readonly MAX_PHASE_RETRIES = 3;
  private readonly MAX_WORKFLOW_RETRIES = 2;

  // Configuration
  private options: Required<Omit<CoordinatorOptions, 'io'>> & { io: SocketIOServer | null };

  // Services
  private puppeteer: ReturnType<typeof getPuppeteerService>;
  private outputParser: InstanceType<typeof CLIOutputParser>;
  private promptGenerator: ReturnType<typeof getPromptGenerator>;

  // State management
  private activeWorkflows: Map<string, WorkflowSession>;
  private workflowTemplates: Map<string, WorkflowTemplate>;
  private agentRoleDefinitions: Map<AgentRoleId, AgentRoleDefinition>;
  private stoppingWorkflows = new Set<string>(); // Lock: prevents concurrent stopWorkflow re-entrance

  // Performance tracking
  private stats: CoordinatorStats;

  // Recursion detection
  private callCounters: CallCounters;

  // External references
  private agentTerminalManager: AgentTerminalManager | null;
  private io: SocketIOServer | null;

  constructor(options: CoordinatorOptions = {}) {
    super();

    // Configuration with defaults
    this.options = {
      maxConcurrentWorkflows: options.maxConcurrentWorkflows || 2,
      defaultTimeout: options.defaultTimeout || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 3,
      workTreeRoot: options.workTreeRoot || path.join(process.cwd(), '.claude-parallel-dev'),
      enableLogging: options.enableLogging !== false,
      io: options.io || null
    };

    // Initialize services
    this.puppeteer = getPuppeteerService({
      maxConcurrentAgents: 5,
      responseTimeout: 180000 // 3 minutes for complex tasks
    });

    this.outputParser = new CLIOutputParser({
      preserveCodeBlocks: true,
      extractMetadata: true,
      verbose: this.options.enableLogging
    });

    this.promptGenerator = getPromptGenerator();

    // State management
    this.activeWorkflows = new Map();
    this.workflowTemplates = new Map();
    this.agentRoleDefinitions = new Map();

    // Performance tracking
    this.stats = {
      totalWorkflows: 0,
      totalTasksCompleted: 0,
      totalAgentHours: 0,
      averageWorkflowTime: 0,
      successRate: 0
    };

    // Recursion detection
    this.callCounters = {
      executeWorkflow: 0,
      executePhase: 0,
      executeTasksSequentially: 0,
      executeTasksInParallel: 0,
      executeAgentTask: 0
    };

    // External references
    this.agentTerminalManager = null;
    this.io = options.io || null;

    // Initialize roles and templates
    this.initializeAgentRoles();
    this.initializeWorkflowTemplates();

    // Setup puppeteer listeners
    this.setupPuppeteerListeners();

    // Auto-cleanup completed/failed workflows after 5 minutes
    setInterval(() => {
      const now = Date.now();
      Array.from(this.activeWorkflows.entries()).forEach(([sessionId, workflow]) => {
        if (workflow.status === 'completed' || workflow.status === 'failed') {
          const age = now - (workflow.endTime?.getTime() || now);
          if (age > 300000) {
            console.log(`🧹 Auto-cleaning old ${workflow.status} workflow: ${sessionId} (age: ${Math.round(age / 1000)}s)`);
            this.activeWorkflows.delete(sessionId);
          }
        }
      });
    }, 60000);

    console.log('🎭 Agent Coordinator initialized');
  }

  /**
   * Setup listeners for puppeteer output events
   */
  private setupPuppeteerListeners(): void {
    console.log(`🔧 [COORDINATOR] setupPuppeteerListeners called`);
    console.log(`   puppeteer exists: ${!!this.puppeteer}`);

    if (this.puppeteer) {
      console.log(`✅ [COORDINATOR] Attaching 'agentOutput' event listener to puppeteer`);
      this.puppeteer.on('agentOutput', ({ agentId, output, timestamp }: { agentId: string; output: string; timestamp: Date }) => {
        try {
          if (this.agentTerminalManager) {
            console.log(`📺 Routing output from ${agentId} to terminal manager (${output?.length || 0} chars)`);

            if (output && output.trim().length > 0) {
              this.agentTerminalManager.appendToAgentTerminal(agentId, output);
            } else {
              console.warn(`⚠️ Skipping empty/null output for ${agentId}`);
            }
          }

          this.emit('agentOutput', { agentId, output, timestamp });
        } catch (error) {
          console.error(`❌ Error routing output for ${agentId}:`, (error as Error).message);
        }
      });
    }
  }

  /**
   * Set the agent terminal manager for output routing
   */
  setAgentTerminalManager(manager: AgentTerminalManager): void {
    this.agentTerminalManager = manager;
    console.log('🔌 Agent terminal manager connected to coordinator');
  }

  /**
   * Helper method to list files in a directory
   */
  private async listDirectoryFiles(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name);
    } catch (error) {
      console.log(`📁 Directory ${dirPath} not accessible: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Initialize agent role definitions with capabilities and personas
   */
  private initializeAgentRoles(): void {
    const roles: Record<AgentRoleId, AgentRoleDefinition> = {
      frontend: {
        name: 'Frontend Developer',
        description: 'Expert in React, TypeScript, CSS, and modern frontend development',
        capabilities: ['ui-components', 'styling', 'state-management', 'routing', 'testing'],
        persona: 'You are an expert Frontend Developer specializing in React, TypeScript, and modern UI/UX. You create beautiful, responsive, and accessible user interfaces with clean, maintainable code.',
        defaultPrompts: {
          analyze: 'Analyze this frontend requirement and create a component architecture plan',
          implement: 'Implement the frontend components with React and TypeScript',
          review: 'Review this frontend code for best practices and improvements'
        }
      },
      backend: {
        name: 'Backend Developer',
        description: 'Expert in Node.js, APIs, databases, and server-side architecture',
        capabilities: ['api-design', 'database-modeling', 'authentication', 'performance', 'security'],
        persona: 'You are an expert Backend Developer specializing in Node.js, API design, and scalable server architecture. You build robust, secure, and performant backend systems.',
        defaultPrompts: {
          analyze: 'Analyze this backend requirement and design the API and data architecture',
          implement: 'Implement the backend API with Node.js and proper error handling',
          review: 'Review this backend code for security, performance, and best practices'
        }
      },
      fullstack: {
        name: 'Full-Stack Developer',
        description: 'Expert in both frontend and backend development with system integration skills',
        capabilities: ['system-integration', 'deployment', 'testing', 'architecture', 'optimization'],
        persona: 'You are an expert Full-Stack Developer with deep knowledge of both frontend and backend technologies. You excel at system integration and end-to-end application development.',
        defaultPrompts: {
          analyze: 'Analyze this full-stack requirement and create a comprehensive system design',
          implement: 'Implement both frontend and backend components with proper integration',
          review: 'Review the complete application for integration, performance, and architecture'
        }
      },
      testing: {
        name: 'QA Engineer',
        description: 'Expert in automated testing, quality assurance, and test strategy',
        capabilities: ['unit-testing', 'integration-testing', 'e2e-testing', 'performance-testing', 'accessibility'],
        persona: 'You are an expert QA Engineer specializing in comprehensive testing strategies. You ensure code quality through thorough testing and quality assurance practices.',
        defaultPrompts: {
          analyze: 'Analyze the codebase and create a comprehensive testing strategy',
          implement: 'Implement unit tests, integration tests, and end-to-end tests',
          review: 'Review the testing coverage and suggest improvements'
        }
      },
      devops: {
        name: 'DevOps Engineer',
        description: 'Expert in deployment, CI/CD, infrastructure, and monitoring',
        capabilities: ['deployment', 'ci-cd', 'monitoring', 'containerization', 'scaling'],
        persona: 'You are an expert DevOps Engineer specializing in deployment automation and infrastructure. You create reliable, scalable deployment pipelines and monitoring systems.',
        defaultPrompts: {
          analyze: 'Analyze the deployment requirements and design the infrastructure',
          implement: 'Implement CI/CD pipelines, deployment scripts, and monitoring',
          review: 'Review the deployment strategy and infrastructure for reliability'
        }
      },
      architect: {
        name: 'Software Architect',
        description: 'Expert in system design, architecture patterns, and technical leadership',
        capabilities: ['system-design', 'architecture-patterns', 'scalability', 'integration', 'strategy'],
        persona: 'You are an expert Software Architect with deep knowledge of system design and architecture patterns. You make high-level technical decisions and guide implementation strategies.',
        defaultPrompts: {
          analyze: 'Analyze the system requirements and create a comprehensive architecture',
          implement: 'Design the system architecture with proper patterns and integrations',
          review: 'Review the overall architecture for scalability, maintainability, and best practices'
        }
      }
    };

    Object.entries(roles).forEach(([key, role]) => {
      this.agentRoleDefinitions.set(key as AgentRoleId, role);
    });

    console.log(`📋 Loaded ${this.agentRoleDefinitions.size} agent role definitions`);
  }

  /**
   * Initialize workflow templates for different types of projects
   */
  private initializeWorkflowTemplates(): void {
    const templates: Record<string, WorkflowTemplate> = {
      'simple-component': {
        name: 'Simple Component Development',
        description: 'Create a single React component with styling',
        phases: [
          {
            name: 'analysis',
            agents: ['frontend'],
            mode: 'sequential',
            tasks: ['analyze requirements', 'design component architecture']
          },
          {
            name: 'implementation',
            agents: ['frontend'],
            mode: 'sequential',
            tasks: ['implement component', 'add styling', 'create documentation']
          }
        ],
        estimatedTime: 10
      },
      'full-stack-feature': {
        name: 'Full-Stack Feature Development',
        description: 'Complete feature with frontend, backend, and database',
        phases: [
          {
            name: 'planning',
            agents: ['architect'],
            mode: 'sequential',
            tasks: ['analyze requirements', 'design system architecture', 'create technical specification']
          },
          {
            name: 'parallel-development',
            agents: ['frontend', 'backend'],
            mode: 'parallel',
            tasks: ['implement frontend', 'implement backend API', 'design database schema']
          },
          {
            name: 'integration',
            agents: ['fullstack'],
            mode: 'sequential',
            tasks: ['integrate frontend with backend', 'test integration', 'optimize performance']
          },
          {
            name: 'quality-assurance',
            agents: ['testing'],
            mode: 'sequential',
            tasks: ['create test suite', 'run comprehensive tests', 'validate functionality']
          }
        ],
        estimatedTime: 45
      },
      'api-development': {
        name: 'API Development',
        description: 'Backend API with database integration',
        phases: [
          {
            name: 'design',
            agents: ['backend'],
            mode: 'sequential',
            tasks: ['design API endpoints', 'model database schema', 'plan authentication']
          },
          {
            name: 'implementation',
            agents: ['backend'],
            mode: 'sequential',
            tasks: ['implement API routes', 'add database integration', 'implement authentication']
          },
          {
            name: 'testing',
            agents: ['testing'],
            mode: 'sequential',
            tasks: ['create API tests', 'test error handling', 'validate security']
          }
        ],
        estimatedTime: 30
      },
      'ui-dashboard': {
        name: 'UI Dashboard Development',
        description: 'Complex UI dashboard with charts and data visualization',
        phases: [
          {
            name: 'design',
            agents: ['frontend'],
            mode: 'sequential',
            tasks: ['design dashboard layout', 'plan component hierarchy', 'select visualization libraries']
          },
          {
            name: 'implementation',
            agents: ['frontend'],
            mode: 'sequential',
            tasks: ['create dashboard components', 'implement data visualization', 'add responsive design']
          },
          {
            name: 'enhancement',
            agents: ['frontend'],
            mode: 'sequential',
            tasks: ['add interactions', 'optimize performance', 'improve accessibility']
          }
        ],
        estimatedTime: 35
      },
      'deployment-setup': {
        name: 'Deployment and CI/CD Setup',
        description: 'Complete deployment pipeline with monitoring',
        phases: [
          {
            name: 'planning',
            agents: ['devops'],
            mode: 'sequential',
            tasks: ['analyze deployment requirements', 'design CI/CD pipeline', 'plan infrastructure']
          },
          {
            name: 'implementation',
            agents: ['devops'],
            mode: 'sequential',
            tasks: ['setup deployment scripts', 'configure CI/CD', 'implement monitoring']
          },
          {
            name: 'testing',
            agents: ['devops', 'testing'],
            mode: 'parallel',
            tasks: ['test deployment process', 'validate monitoring', 'create documentation']
          }
        ],
        estimatedTime: 25
      }
    };

    Object.entries(templates).forEach(([key, template]) => {
      this.workflowTemplates.set(key, template);
    });

    console.log(`🔄 Loaded ${this.workflowTemplates.size} workflow templates`);
  }

  /**
   * Analyze requirement and suggest appropriate workflow
   */
  analyzeRequirement(requirement: string): WorkflowAnalysisResult {
    const req = requirement.toLowerCase();

    const workflows = [
      {
        id: 'simple-component',
        score: this.calculateScore(req, ['component', 'react', 'simple', 'ui element']),
        reasoning: 'Single component development workflow'
      },
      {
        id: 'full-stack-feature',
        score: this.calculateScore(req, ['full stack', 'feature', 'frontend', 'backend', 'database', 'complete']),
        reasoning: 'Complete feature requiring frontend and backend'
      },
      {
        id: 'api-development',
        score: this.calculateScore(req, ['api', 'backend', 'server', 'database', 'endpoint']),
        reasoning: 'Backend API development workflow'
      },
      {
        id: 'ui-dashboard',
        score: this.calculateScore(req, ['dashboard', 'chart', 'visualization', 'admin panel', 'analytics']),
        reasoning: 'Dashboard or data visualization interface'
      },
      {
        id: 'deployment-setup',
        score: this.calculateScore(req, ['deploy', 'ci/cd', 'pipeline', 'infrastructure', 'hosting']),
        reasoning: 'Deployment and infrastructure setup'
      }
    ];

    workflows.sort((a, b) => b.score - a.score);

    const bestMatch = workflows[0];
    const template = this.workflowTemplates.get(bestMatch.id);

    const allAgents = template?.phases
      ? Array.from(new Set(template.phases.flatMap(phase => phase.agents))) as AgentRoleId[]
      : [];

    return {
      workflowId: bestMatch.id,
      template: {
        ...template!,
        agents: allAgents
      },
      confidence: bestMatch.score,
      reasoning: bestMatch.reasoning,
      alternatives: workflows.slice(1, 3)
    };
  }

  /**
   * Calculate score for workflow matching
   */
  private calculateScore(requirement: string, keywords: string[]): number {
    let score = 0;
    const words = requirement.split(/\s+/);

    keywords.forEach(keyword => {
      if (requirement.includes(keyword)) {
        score += 0.2;
      }
      words.forEach(word => {
        if (word.includes(keyword) || keyword.includes(word)) {
          score += 0.1;
        }
      });
    });

    return Math.min(score, 1.0);
  }

  /**
   * Execute a workflow with the specified requirement
   */
  async executeWorkflow(
    workflowId: string,
    requirement: string,
    options: Partial<WorkflowSessionOptions> = {}
  ): Promise<WorkflowExecutionResult> {
    // Recursion detection
    this.callCounters.executeWorkflow++;
    const currentCallCount = this.callCounters.executeWorkflow;
    console.log(`🚨 [RECURSION-DETECT] executeWorkflow call #${currentCallCount}`);

    if (currentCallCount > 5) {
      console.error(`🚨🚨🚨 INFINITE LOOP DETECTED! executeWorkflow called ${currentCallCount} times!`);
      throw new Error(`Infinite loop detected: executeWorkflow called ${currentCallCount} times`);
    }

    // Clean up existing agents
    console.log('🧹 [CLEANUP] Stopping all existing agents before new workflow...');
    try {
      if (this.puppeteer && typeof this.puppeteer.emergencyStopAll === 'function') {
        await this.puppeteer.emergencyStopAll();
        console.log('✅ [CLEANUP] All previous agents stopped successfully');
      }
    } catch (cleanupError) {
      console.warn('⚠️ [CLEANUP] Error stopping previous agents:', (cleanupError as Error).message);
    }

    const template = this.workflowTemplates.get(workflowId);
    if (!template) {
      console.error('❌ [COORDINATOR] Workflow template not found:', workflowId);
      throw new Error(`Workflow template '${workflowId}' not found`);
    }

    const sessionId = options.sessionId || `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    console.log(`🆔 Coordinator using sessionId: ${sessionId}`);

    const workflowSession: WorkflowSession = {
      sessionId,
      workflowId,
      template,
      requirement,
      detailedRequirements: options.detailedRequirements || undefined,
      status: 'starting',
      currentPhase: null,
      currentPhaseIndex: 0,
      retryCount: 0,
      phaseRetries: new Map(),
      progress: {
        overall: 0,
        phases: []
      },
      results: {
        outputs: [],
        files: [],
        errors: [],
        summary: ''
      },
      agents: new Map(),
      startTime: new Date(),
      endTime: null,
      options: {
        workTreeRoot: path.join(this.options.workTreeRoot, sessionId),
        timeout: typeof options.timeout === 'number' ? options.timeout : this.options.defaultTimeout,
        sessionId: options.sessionId,
        detailedRequirements: options.detailedRequirements
      }
    };

    this.activeWorkflows.set(sessionId, workflowSession);
    this.stats.totalWorkflows++;

    console.log(`🚀 Starting workflow: ${template.name}`);
    console.log(`📋 Requirement: ${requirement}`);
    console.log(`⏱️ Estimated time: ${template.estimatedTime} minutes`);

    try {
      // Initialize puppeteer service
      if (!this.puppeteer.isInitialized) {
        console.log(`🔧 Initializing CLI Puppeteer service...`);
        try {
          await Promise.race([
            this.puppeteer.initialize(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Puppeteer init timeout')), 5000))
          ]);
          console.log(`✅ CLI Puppeteer service initialized`);
        } catch (initError) {
          console.warn(`⚠️ Puppeteer initialization timeout/error:`, (initError as Error).message);
          this.puppeteer.isInitialized = true;
        }
      }

      // Create work tree directory
      await fs.mkdir(workflowSession.options.workTreeRoot, { recursive: true });

      // Execute phases sequentially
      for (let i = 0; i < template.phases.length; i++) {
        const phase = template.phases[i];
        workflowSession.currentPhase = phase;
        workflowSession.currentPhaseIndex = i;

        const phaseKey = `${i}-${phase.name}`;
        const phaseRetryCount = workflowSession.phaseRetries.get(phaseKey) || 0;

        if (phaseRetryCount >= this.MAX_PHASE_RETRIES) {
          throw new Error(`Phase "${phase.name}" exceeded retry limit (${this.MAX_PHASE_RETRIES} attempts)`);
        }

        console.log(`📍 Phase ${i + 1}/${template.phases.length}: ${phase.name}`);

        try {
          const phaseResult = await this.executePhase(workflowSession, phase);
          workflowSession.phaseRetries.set(phaseKey, 0);
          workflowSession.progress.phases.push(phaseResult);
          workflowSession.progress.overall = ((i + 1) / template.phases.length) * 100;

          this.emit('phaseCompleted', {
            sessionId,
            phaseIndex: i,
            phase,
            result: phaseResult
          });
        } catch (phaseError) {
          const error = phaseError as FatalError;
          if (error.isFatalError) {
            throw error;
          }

          const newRetryCount = phaseRetryCount + 1;
          workflowSession.phaseRetries.set(phaseKey, newRetryCount);

          if (newRetryCount >= this.MAX_PHASE_RETRIES) {
            throw phaseError;
          } else {
            // Abort retry if stopWorkflow was called while this phase was running
            if (workflowSession.status === 'stopping') {
              throw new Error('Workflow stopped by user');
            }
            console.warn(`🔄 Retrying phase "${phase.name}" (attempt ${newRetryCount + 1}/${this.MAX_PHASE_RETRIES})...`);
            i--;
            continue;
          }
        }
      }

      // Synthesize final results
      const finalResult = await this.synthesizeResults(workflowSession);

      workflowSession.status = 'completed';
      workflowSession.endTime = new Date();
      workflowSession.results.summary = finalResult.summary;

      console.log(`✅ Workflow completed: ${sessionId}`);

      this.emit('workflowCompleted', workflowSession);

      await this.cleanupWorkflowAgents(sessionId);
      this.activeWorkflows.delete(sessionId);

      return {
        sessionId,
        status: 'completed',
        results: workflowSession.results,
        executionTime: workflowSession.endTime.getTime() - workflowSession.startTime.getTime(),
        agents: Array.from(workflowSession.agents.values())
      };
    } catch (error) {
      console.error(`❌ Workflow failed: ${sessionId}`, error);

      workflowSession.status = 'failed';
      workflowSession.endTime = new Date();
      workflowSession.results.errors.push({
        message: (error as Error).message,
        timestamp: new Date(),
        phase: workflowSession.currentPhase?.name
      });

      this.emit('workflowFailed', { sessionId, error });

      await this.cleanupWorkflowAgents(sessionId);

      throw error;
    }
  }

  /**
   * Execute a single phase of the workflow
   */
  private async executePhase(workflowSession: WorkflowSession, phase: WorkflowPhase): Promise<PhaseResult> {
    this.callCounters.executePhase++;
    const currentCallCount = this.callCounters.executePhase;

    if (currentCallCount > 10) {
      throw new Error(`Infinite loop detected: executePhase called ${currentCallCount} times`);
    }

    const { sessionId, requirement, options } = workflowSession;
    const phaseResult: PhaseResult = {
      name: phase.name,
      status: 'starting',
      outputs: [],
      agents: [],
      startTime: new Date(),
      endTime: null
    };

    try {
      console.log(`🔄 Starting phase: ${phase.name}`);

      const activeAgents: AgentSession[] = [];

      for (const roleId of phase.agents) {
        let agent = workflowSession.agents.get(roleId);

        if (!agent) {
          const agentId = `${sessionId}-${roleId}`;
          const roleDefinition = this.agentRoleDefinitions.get(roleId);

          if (!roleDefinition) {
            throw new Error(`Role definition not found for '${roleId}'`);
          }

          const agentContext = `${requirement}\n\nPhase: ${phase.name}`;

          if (this.agentTerminalManager) {
            this.agentTerminalManager.createAgentTerminalSession(agentId, workflowSession.sessionId, roleId);
          }

          try {
            agent = await this.puppeteer.spawnAgent(
              agentId,
              roleId,
              agentContext,
              options.workTreeRoot
            );

            if (!agent || !agent.agentId || !agent.workTreePath) {
              throw new Error(`spawnAgent returned invalid agent object`);
            }

            console.log(`✅ Agent ${agentId} spawned successfully`);

            if (this.io) {
              this.io.emit('agent:spawn', {
                teamId: workflowSession.sessionId,
                agents: [{
                  id: agentId,
                  name: roleDefinition.name,
                  role: roleId,
                  status: 'spawned',
                  workTreePath: agent.workTreePath
                }]
              });
            }
          } catch (spawnError) {
            console.error(`❌ Failed to spawn ${roleId} agent:`, (spawnError as Error).message);
            throw new Error(`Agent spawn failed for ${roleId}: ${(spawnError as Error).message}`);
          }

          workflowSession.agents.set(roleId, agent);
        }

        activeAgents.push(agent!);
        phaseResult.agents.push(agent!.agentId);
      }

      if (!activeAgents || activeAgents.length === 0) {
        throw new Error(`Phase "${phase.name}" has no active agents`);
      }

      // Ensure phase has tasks
      if (!phase.tasks || !Array.isArray(phase.tasks) || phase.tasks.length === 0) {
        console.warn(`🔧 [FALLBACK] Generating default task for phase "${phase.name}"...`);
        const defaultTask = `Complete the ${phase.name.toLowerCase()} work for this project.`;
        phase.tasks = [defaultTask];
      }

      if (phase.mode === 'parallel') {
        phaseResult.outputs = await this.executeTasksInParallel(activeAgents, phase.tasks, requirement, workflowSession);
      } else {
        phaseResult.outputs = await this.executeTasksSequentially(activeAgents, phase.tasks, requirement, workflowSession);
      }

      if (!phaseResult.outputs || phaseResult.outputs.length === 0) {
        const error = new Error(`Phase "${phase.name}" failed: No successful outputs`) as FatalError;
        error.isFatalError = true;
        error.phaseData = {
          phaseName: phase.name,
          agents: phase.agents,
          tasks: phase.tasks,
          mode: phase.mode,
          outputsReceived: 0
        };
        throw error;
      }

      phaseResult.status = 'completed';
      phaseResult.endTime = new Date();

      return phaseResult;
    } catch (error) {
      console.error(`❌ Phase failed: ${phase.name}`, error);

      phaseResult.status = 'failed';
      phaseResult.endTime = new Date();
      phaseResult.error = (error as Error).message;

      throw error;
    }
  }

  /**
   * Execute tasks in parallel across multiple agents
   */
  private async executeTasksInParallel(
    agents: AgentSession[],
    tasks: string[],
    context: string,
    workflowSession: WorkflowSession | null = null
  ): Promise<TaskResult[]> {
    console.log(`⚡ [PARALLEL-EXEC] Tasks: ${tasks?.length}, Agents: ${agents?.length}`);

    const taskPromises = agents.map((agent, index) => {
      const task = tasks[index] || tasks[0];
      const roleDefinition = this.agentRoleDefinitions.get(agent.role);

      let prompt: string;
      if (workflowSession?.detailedRequirements) {
        prompt = this.promptGenerator.generate(
          agent.role,
          workflowSession.detailedRequirements,
          {
            workTreePath: agent.workTreePath || workflowSession.options.workTreeRoot,
            branchName: agent.branchName || 'main',
            currentTask: task
          }
        );
      } else {
        prompt = `Task: ${task}\nContext: ${context}\nRole: ${roleDefinition?.persona || 'Expert'}\n\nPlease complete this task with your expertise.`;
      }

      return new Promise<TaskResult>(resolve => {
        const delayMs = index * 3000;
        setTimeout(async () => {
          const result = await this.executeAgentTask(agent, prompt, task);
          resolve(result);
        }, delayMs);
      });
    });

    const results = await Promise.all(taskPromises);
    return results.filter(result => result.success);
  }

  /**
   * Execute tasks sequentially, passing results between agents
   */
  private async executeTasksSequentially(
    agents: AgentSession[],
    tasks: string[],
    context: string,
    workflowSession: WorkflowSession | null = null
  ): Promise<TaskResult[]> {
    console.log(`🔄 [SEQUENTIAL-EXEC] Tasks: ${tasks?.length}, Agents: ${agents?.length}`);

    const results: TaskResult[] = [];
    let previousResult: TaskResult | null = null;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const agent = agents[i % agents.length];
      const roleDefinition = this.agentRoleDefinitions.get(agent.role);

      let prompt: string;
      if (workflowSession?.detailedRequirements) {
        prompt = this.promptGenerator.generate(
          agent.role,
          workflowSession.detailedRequirements,
          {
            workTreePath: agent.workTreePath || workflowSession.options.workTreeRoot,
            branchName: agent.branchName || 'main',
            currentTask: task
          }
        );
      } else {
        prompt = `Task: ${task}\nContext: ${context}\nRole: ${roleDefinition?.persona || 'Expert'}`;
        if (previousResult && previousResult.success && previousResult.output) {
          prompt += `\n\nPrevious work completed: ${previousResult.output.substring(0, 1000)}`;
        }
        prompt += `\n\nPlease complete this task with your expertise.`;
      }

      const result = await this.executeAgentTask(agent, prompt, task);
      results.push(result);

      if (result.success) {
        previousResult = result;
      }
    }

    return results;
  }

  /**
   * Execute a single task with an agent
   */
  private async executeAgentTask(agent: AgentSession, prompt: string, taskName: string): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      console.log(`📤 Sending task to ${agent.role} agent (${agent.agentId}): "${taskName}"`);

      const response = await this.puppeteer.sendToAgent(agent.agentId, prompt);

      console.log(`📥 Received response from ${agent.role} agent (${response?.length || 0} chars)`);

      const parsed = this.outputParser.parseContent(response);
      const executionTime = Date.now() - startTime;

      console.log(`✅ ${agent.role} completed: ${taskName} (${executionTime}ms)`);

      const workTreePath = agent.workTreePath;
      try {
        const files = await this.listDirectoryFiles(workTreePath);
        console.log(`📁 Files in agent work tree: ${files.length} files`);
      } catch (fileError) {
        console.log(`⚠️ Could not check agent work tree files`);
      }

      return {
        agent: agent.role,
        agentId: agent.agentId,
        task: taskName,
        prompt,
        output: response,
        parsed,
        success: true,
        executionTime,
        timestamp: new Date()
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      console.error(`❌ ${agent.role} failed: ${taskName}`, error);

      return {
        agent: agent.role,
        agentId: agent.agentId,
        task: taskName,
        prompt,
        error: (error as Error).message,
        success: false,
        executionTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Synthesize results from all phases into final summary
   */
  private async synthesizeResults(workflowSession: WorkflowSession): Promise<SynthesizedResults> {
    console.log(`🔬 Synthesizing results for workflow: ${workflowSession.sessionId}`);

    const allOutputs: TaskResult[] = [];
    const allFiles: Array<{ path: string; operation: string }> = [];

    workflowSession.progress.phases.forEach(phase => {
      if (phase.outputs) {
        phase.outputs.forEach(output => {
          if (output.success) {
            allOutputs.push(output);
            if (output.parsed && output.parsed.files) {
              allFiles.push(...output.parsed.files);
            }
          }
        });
      }
    });

    let summary = `Workflow completed: ${workflowSession.template.name}

Requirement: ${workflowSession.requirement}

Phases executed:
${workflowSession.progress.phases.map((phase, i) =>
  `${i + 1}. ${phase.name} - ${phase.status}`
).join('\n')}

Total outputs: ${allOutputs.length}
Files modified: ${allFiles.length}
Execution time: ${((workflowSession.endTime || new Date()).getTime() - workflowSession.startTime.getTime()) / 1000}s`;

    try {
      const architectAgent = Array.from(workflowSession.agents.values())
        .find(agent => agent.role === 'architect' || agent.role === 'fullstack');

      if (architectAgent) {
        const summaryPrompt = `Please provide a comprehensive summary of this completed workflow:

Original requirement: ${workflowSession.requirement}
Workflow: ${workflowSession.template.name}

Key outputs:
${allOutputs.slice(0, 3).map(output =>
  `- ${output.task}: ${output.output?.substring(0, 200) || 'No output'}...`
).join('\n')}

Please provide:
1. What was accomplished
2. Key technical decisions made
3. Files and components created
4. Next steps or recommendations
5. Overall assessment`;

        const detailedSummary = await this.puppeteer.sendToAgent(architectAgent.agentId, summaryPrompt);
        summary = detailedSummary;
      }
    } catch (error) {
      console.warn('Failed to generate detailed summary, using basic summary');
    }

    workflowSession.results.outputs = allOutputs;
    workflowSession.results.files = allFiles;

    return {
      summary,
      totalOutputs: allOutputs.length,
      totalFiles: allFiles.length,
      executionTime: (workflowSession.endTime || new Date()).getTime() - workflowSession.startTime.getTime(),
      phases: workflowSession.progress.phases.length
    };
  }

  /**
   * Get workflow status and progress
   */
  getWorkflowStatus(sessionId: string): WorkflowStatusResponse | null {
    const workflow = this.activeWorkflows.get(sessionId);
    if (!workflow) {
      return null;
    }

    const agents = Array.from(workflow.agents.values()).map(agent => ({
      agentId: agent.agentId,
      role: agent.role,
      status: agent.status,
      currentTask: agent.currentTask,
      progress: agent.progress
    }));

    return {
      sessionId: workflow.sessionId,
      workflowId: workflow.workflowId,
      template: workflow.template.name,
      requirement: workflow.requirement,
      status: workflow.status,
      progress: workflow.progress,
      currentPhase: workflow.currentPhase?.name,
      agents,
      executionTime: workflow.endTime
        ? workflow.endTime.getTime() - workflow.startTime.getTime()
        : Date.now() - workflow.startTime.getTime()
    };
  }

  /**
   * Stop a workflow and cleanup resources.
   *
   * Race-condition safe:
   * - stoppingWorkflows Set prevents concurrent re-entrance
   * - try/finally guarantees lock is always released even if cleanup throws
   * - cleanupWorkflowAgents deletes from the map before any await so concurrent
   *   callers see null and short-circuit — no agent gets stopAgent called twice
   */
  async stopWorkflow(sessionId: string): Promise<void> {
    if (this.stoppingWorkflows.has(sessionId)) return; // already stopping — skip
    const workflow = this.activeWorkflows.get(sessionId);
    if (!workflow) return;

    this.stoppingWorkflows.add(sessionId);
    workflow.status = 'stopping';
    console.log(`🛑 Stopping workflow: ${sessionId}`);

    try {
      await this.cleanupWorkflowAgents(sessionId);
      workflow.status = 'stopped';
      workflow.endTime = new Date();
      // Note: activeWorkflows entry already deleted inside cleanupWorkflowAgents
    } finally {
      // Always release lock — even if cleanupWorkflowAgents throws
      this.stoppingWorkflows.delete(sessionId);
    }

    // Emit outside try block so lock is fully released before any listener fires
    this.emit('workflowStopped', { sessionId });
  }

  /**
   * Cleanup agents for a specific workflow.
   *
   * Deletes from activeWorkflows BEFORE awaiting stopAgent calls so that any
   * concurrent caller (e.g. executeWorkflow success path + stopWorkflow racing)
   * sees null on its map lookup and returns immediately — preventing double stopAgent.
   */
  private async cleanupWorkflowAgents(sessionId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(sessionId);
    if (!workflow) {
      return; // Already cleaned up by a concurrent caller — safe to skip
    }

    // Delete synchronously before any await to prevent concurrent callers from
    // snapshotting the same agents and calling stopAgent twice
    this.activeWorkflows.delete(sessionId);
    console.log(`🧹 Workflow removed from active map: ${sessionId}`);

    const stopPromises = Array.from(workflow.agents.values()).map(agent =>
      this.puppeteer.stopAgent(agent.agentId)
    );

    await Promise.all(stopPromises);
  }

  /**
   * Get available workflow templates
   */
  getAvailableWorkflows(): AvailableWorkflow[] {
    return Array.from(this.workflowTemplates.entries()).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description,
      estimatedTime: template.estimatedTime,
      phases: template.phases.length,
      agents: Array.from(new Set(template.phases.flatMap(p => p.agents))) as AgentRoleId[]
    }));
  }

  /**
   * Get coordinator statistics
   */
  getStats(): CoordinatorStats {
    return {
      ...this.stats,
      activeWorkflows: this.activeWorkflows.size,
      availableTemplates: this.workflowTemplates.size,
      availableRoles: this.agentRoleDefinitions.size,
      puppeteerStats: this.puppeteer.getStats()
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let coordinatorInstance: AgentCoordinator | null = null;

// Global registry for cross-module stability
declare global {
  // eslint-disable-next-line no-var
  var __AGENT_COORDINATOR__: AgentCoordinator | undefined;
}

export function getCoordinatorService(options: CoordinatorOptions = {}): AgentCoordinator {
  // Check global registry first (survives module reloads)
  if (global.__AGENT_COORDINATOR__) {
    console.log('✅ Using existing AgentCoordinator from global registry');
    coordinatorInstance = global.__AGENT_COORDINATOR__;
    return coordinatorInstance;
  }

  // Create new instance if none exists
  if (!coordinatorInstance) {
    coordinatorInstance = new AgentCoordinator(options);
    global.__AGENT_COORDINATOR__ = coordinatorInstance;
    console.log('🌍 Registered AgentCoordinator in global registry');
  }

  return coordinatorInstance;
}

// Default export
export default AgentCoordinator;
