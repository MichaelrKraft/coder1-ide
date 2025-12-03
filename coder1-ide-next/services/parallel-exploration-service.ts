/**
 * Parallel Exploration Service
 * 
 * Main orchestration service that coordinates:
 * - Claude Skills for strategy generation
 * - ClaudeCLIPuppeteer for REAL agent execution via Claude CLI
 * - File-based completion detection
 * - Evaluation and ranking of results
 */

import { EventEmitter } from 'events';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';

// Import ClaudeCLIPuppeteer for real agent execution
const { getPuppeteerService } = require('./claude-cli-puppeteer.js');

// Types
export interface ParallelExplorationConfig {
  task: string;
  count: number; // Number of variations (2-5)
  budget: 'cost-optimized' | 'balanced' | 'quality-optimized';
  domain?: string; // Optional: pre-detected domain
  userId: string;
  projectId?: string;
}

export interface ExplorationStrategy {
  id: string;
  name: string;
  primaryDimension: {
    axis: string;
    value: string;
  };
  secondaryDimension: {
    axis: string;
    value: string;
  };
  distinctiveElements: string[];
  targetAudience: string;
  resources: string[];
}

export interface AgentExecution {
  agentId: string;
  sandboxId: string;
  strategy: ExplorationStrategy;
  status: 'spawning' | 'researching' | 'implementing' | 'evaluating' | 'completed' | 'failed';
  progress: number; // 0-100
  startedAt: Date;
  completedAt?: Date;
  result?: VariationResult;
  error?: string;
  workTreePath?: string;
}

export interface VariationResult {
  agentId: string;
  strategy: string;
  output: {
    files: Array<{ path: string; content: string }>;
    previewUrl?: string;
  };
  selfEvaluation: {
    quality: number;
    uniqueness: number;
    feasibility: number;
    bestPractices: number;
    totalScore: number;
  };
  orchestratorEvaluation?: {
    quality: number;
    uniqueness: number;
    feasibility: number;
    bestPractices: number;
    totalScore: number;
  };
}

export interface ExplorationSession {
  id: string;
  config: ParallelExplorationConfig;
  detectedDomain: string;
  domainConfidence: number;
  strategies: ExplorationStrategy[];
  agents: AgentExecution[];
  status: 'initializing' | 'generating-strategies' | 'spawning-agents' | 'executing' | 'evaluating' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  results?: VariationResult[];
  error?: string;
  workTreeRoot?: string;
}

export class ParallelExplorationService extends EventEmitter {
  private sessions: Map<string, ExplorationSession> = new Map();
  private anthropicClient: Anthropic;
  private puppeteerService: any;
  private isPuppeteerInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  // Base directory for exploration work trees
  private readonly WORK_TREE_BASE = '/tmp/coder1-explorations';

  // Model selection by budget
  private modelByBudget = {
    'cost-optimized': 'claude-3-5-haiku-20241022',
    'balanced': 'claude-3-5-haiku-20241022',
    'quality-optimized': 'claude-3-5-haiku-20241022'
  };

  constructor(providedApiKey?: string) {
    super();
    
    // Support provided API key, environment API key, or OAuth token
    const apiKey = providedApiKey || process.env.ANTHROPIC_API_KEY;
    const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    
    if (apiKey) {
      console.log('[ParallelExplorationService] 🔑 Using Anthropic API key:', providedApiKey ? 'provided' : 'from env');
      this.anthropicClient = new Anthropic({ apiKey });
    } else if (oauthToken) {
      console.log('[ParallelExplorationService] 🔑 Using Claude Code OAuth token');
      this.anthropicClient = new Anthropic({ authToken: oauthToken });
    } else {
      throw new Error('No authentication found. Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN');
    }

    // Initialize ClaudeCLIPuppeteer for real agent execution
    this.puppeteerService = getPuppeteerService();
    // Store the promise so we can await it before processing requests
    this.initializationPromise = this.initializePuppeteer();
  }

  /**
   * Initialize the Claude CLI Puppeteer service
   */
  private async initializePuppeteer(): Promise<void> {
    try {
      await this.puppeteerService.initialize();
      this.isPuppeteerInitialized = true;
      console.log('[ParallelExplorationService] ✅ ClaudeCLIPuppeteer initialized for real agent execution');
    } catch (error) {
      console.warn('[ParallelExplorationService] ⚠️ ClaudeCLIPuppeteer initialization failed:', error);
      console.warn('[ParallelExplorationService] Will use fallback mock mode');
      this.isPuppeteerInitialized = false;
    }
  }

  /**
   * Start a parallel exploration session
   */
  async explore(config: ParallelExplorationConfig): Promise<ExplorationSession> {
    // Ensure puppeteer is initialized before processing (fixes race condition)
    if (this.initializationPromise) {
      await this.initializationPromise;
      this.initializationPromise = null; // Clear after first await
    }

    const sessionId = `explore_${Date.now()}_${uuidv4().slice(0, 8)}`;

    // Create work tree root for this session
    const workTreeRoot = path.join(this.WORK_TREE_BASE, sessionId);
    await fs.mkdir(workTreeRoot, { recursive: true });

    // Create session
    const session: ExplorationSession = {
      id: sessionId,
      config,
      detectedDomain: '',
      domainConfidence: 0,
      strategies: [],
      agents: [],
      status: 'initializing',
      createdAt: new Date(),
      workTreeRoot
    };

    this.sessions.set(sessionId, session);
    this.emit('session:created', session);

    try {
      // Step 1: Detect domain (if not provided)
      session.status = 'generating-strategies';
      const { domain, confidence } = await this.detectDomain(config.task, config.domain);
      session.detectedDomain = domain;
      session.domainConfidence = confidence;

      this.emit('domain:detected', { sessionId, domain, confidence });

      // Step 2: Warm cache with common context (for API-based strategy generation)
      await this.warmCache(config.task, domain);

      // Step 3: Generate N distinct strategies
      const strategies = await this.generateStrategies({
        task: config.task,
        domain,
        count: config.count,
        budget: config.budget
      });

      session.strategies = strategies;
      this.emit('strategies:generated', { sessionId, strategies });

      // Step 4: Spawn agents with real Claude CLI
      session.status = 'spawning-agents';
      const agents = await this.spawnAgents(session);
      session.agents = agents;

      session.status = 'executing';
      this.emit('session:executing', { sessionId, agentCount: agents.length });

      // Agents execute asynchronously, session status updated via events
      return session;

    } catch (error) {
      session.status = 'failed';
      session.error = error instanceof Error ? error.message : String(error);
      this.emit('session:failed', { sessionId, error: session.error });
      throw error;
    }
  }

  /**
   * Detect domain using heuristics
   */
  private async detectDomain(task: string, providedDomain?: string): Promise<{ domain: string; confidence: number }> {
    if (providedDomain) {
      return { domain: providedDomain, confidence: 1.0 };
    }

    const taskLower = task.toLowerCase();

    if (taskLower.match(/landing page|homepage|website|ui|interface|pricing/)) {
      return { domain: 'frontend-ui-design', confidence: 0.85 };
    } else if (taskLower.match(/api|backend|server|architecture/)) {
      return { domain: 'backend-architecture', confidence: 0.80 };
    } else if (taskLower.match(/database|schema|data model/)) {
      return { domain: 'database-design', confidence: 0.75 };
    }

    return { domain: 'general-software-engineering', confidence: 0.5 };
  }

  /**
   * Warm prompt cache with shared context
   */
  private async warmCache(task: string, domain: string): Promise<void> {
    const warmingPrompt = `You are helping with parallel exploration of: ${task}
    
Domain: ${domain}

This is a cache-warming request. The actual work will be done by specialized agents.
Each agent will have access to this shared context via prompt caching.

Task understanding and domain context will be cached here for 90% cost reduction on subsequent requests.`;

    try {
      await this.anthropicClient.messages.create({
        model: this.modelByBudget['balanced'],
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: warmingPrompt
        }],
        system: [
          {
            type: 'text',
            text: 'System context for parallel exploration',
            cache_control: { type: 'ephemeral' }
          }
        ]
      });

      console.log('[Parallel Exploration] Cache warmed for session');
    } catch (error) {
      console.error('[Parallel Exploration] Cache warming failed:', error);
    }
  }

  /**
   * Generate N distinct exploration strategies using Claude API
   */
  private async generateStrategies(params: {
    task: string;
    domain: string;
    count: number;
    budget: string;
  }): Promise<ExplorationStrategy[]> {
    const model = this.modelByBudget[params.budget as keyof typeof this.modelByBudget];

    const prompt = `Generate ${params.count} distinct exploration strategies for this task:

Task: "${params.task}"
Domain: ${params.domain}

Requirements:
- Each strategy must differ by >30% on key dimensions
- Provide specific, actionable approaches
- Include distinctive elements that make each unique
- Assign 2-3 curated resources per strategy

Return ONLY valid JSON array:
[
  {
    "name": "Strategy Name",
    "primaryDimension": { "axis": "dimension-name", "value": "specific-value" },
    "secondaryDimension": { "axis": "dimension-name", "value": "specific-value" },
    "distinctiveElements": ["element1", "element2", "element3"],
    "targetAudience": "who this approach is best for",
    "resources": ["url1", "url2", "url3"]
  }
]`;

    try {
      console.log('[Parallel Exploration] 📤 Calling Claude API with model:', model);
      
      const response = await this.anthropicClient.messages.create({
        model,
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      console.log('[Parallel Exploration] 📥 Claude API response received');

      const textBlock = response.content.find(block => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      const strategiesData = JSON.parse(textBlock.text);

      return strategiesData.map((s: any, index: number) => ({
        id: `strategy_${index + 1}`,
        ...s
      }));

    } catch (error) {
      console.error('[Parallel Exploration] Strategy generation failed:', error);
      throw new Error(`Failed to generate strategies: ${error}`);
    }
  }

  /**
   * Spawn agents using ClaudeCLIPuppeteer for REAL execution
   */
  private async spawnAgents(session: ExplorationSession): Promise<AgentExecution[]> {
    const agents: AgentExecution[] = [];

    for (const strategy of session.strategies) {
      const agentId = `agent_${uuidv4().slice(0, 8)}`;
      const workTreePath = path.join(session.workTreeRoot!, strategy.id);

      const agent: AgentExecution = {
        agentId,
        sandboxId: `cli_${agentId}`,
        strategy,
        status: 'spawning',
        progress: 0,
        startedAt: new Date(),
        workTreePath
      };

      agents.push(agent);

      // Execute agent asynchronously
      this.executeAgentReal(session.id, agent).catch(error => {
        console.error(`[Parallel Exploration] Agent ${agentId} failed:`, error);
        agent.status = 'failed';
        agent.error = error.message;
        this.emit('agent:failed', { sessionId: session.id, agentId, error: error.message });
      });
    }

    return agents;
  }

  /**
   * Build strategy-specific prompt for agent execution
   */
  private buildStrategyPrompt(session: ExplorationSession, agent: AgentExecution): string {
    const { task } = session.config;
    const { strategy } = agent;

    return `## Task
Create a complete implementation for: "${task}"

## Your Assigned Strategy: ${strategy.name}

### Primary Focus
- ${strategy.primaryDimension.axis}: ${strategy.primaryDimension.value}

### Secondary Focus  
- ${strategy.secondaryDimension.axis}: ${strategy.secondaryDimension.value}

### Distinctive Elements to Include
${strategy.distinctiveElements.map(e => `- ${e}`).join('\n')}

### Target Audience
${strategy.targetAudience}

## Instructions
1. Create all necessary files for a complete, working implementation
2. Focus on your unique strategy approach - make it distinctively different
3. Use modern best practices and clean code
4. Include any necessary CSS/styling inline or in separate files
5. Make the implementation production-ready

## Important
- Create ACTUAL FILES using the Write tool - do not just describe what you would create
- Your implementation should be immediately runnable
- Focus on quality over quantity - but be comprehensive

Start creating the files now.`;
  }

  /**
   * Execute agent using REAL Claude CLI via ClaudeCLIPuppeteer
   */
  private async executeAgentReal(sessionId: string, agent: AgentExecution): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check if puppeteer is available
    if (!this.isPuppeteerInitialized) {
      console.warn(`[Parallel Exploration] Puppeteer not available, using fallback for ${agent.agentId}`);
      return this.executeAgentFallback(sessionId, agent);
    }

    try {
      // Phase 1: Spawn agent with Claude CLI
      agent.status = 'spawning';
      agent.progress = 10;
      this.emit('agent:progress', { sessionId, agentId: agent.agentId, status: 'spawning', progress: 10 });

      console.log(`[Parallel Exploration] 🤖 Spawning real Claude CLI agent: ${agent.agentId}`);
      
      // Use strategy.id as role so files are created at workTreeRoot/strategy_N
      // This matches our expected agent.workTreePath
      await this.puppeteerService.spawnAgent(
        agent.agentId,
        agent.strategy.id, // Use strategy ID as role (creates workTreeRoot/strategy_1, etc.)
        session.config.task, // Context
        session.workTreeRoot! // Work tree root
      );

      // Phase 2: Send task to agent (researching + implementing)
      agent.status = 'researching';
      agent.progress = 20;
      this.emit('agent:progress', { sessionId, agentId: agent.agentId, status: 'researching', progress: 20 });

      console.log(`[Parallel Exploration] 📤 Sending task to agent ${agent.agentId}`);

      const taskPrompt = this.buildStrategyPrompt(session, agent);
      
      // Update status to implementing (the agent will be creating files)
      agent.status = 'implementing';
      agent.progress = 40;
      this.emit('agent:progress', { sessionId, agentId: agent.agentId, status: 'implementing', progress: 40 });

      // Send task and wait for completion (file-based detection)
      // This can take several minutes - the puppeteer uses 30-second file stability detection
      const response = await this.puppeteerService.sendToAgent(
        agent.agentId,
        taskPrompt,
        10 * 60 * 1000 // 10 minute timeout
      );

      console.log(`[Parallel Exploration] ✅ Agent ${agent.agentId} completed task`);

      // Phase 3: Collect generated files
      agent.status = 'evaluating';
      agent.progress = 80;
      this.emit('agent:progress', { sessionId, agentId: agent.agentId, status: 'evaluating', progress: 80 });

      const files = await this.collectGeneratedFiles(agent.workTreePath!);

      // Phase 4: Evaluate results
      const evaluation = this.evaluateResult(files, agent.strategy);

      // Complete
      agent.status = 'completed';
      agent.progress = 100;
      agent.completedAt = new Date();
      agent.result = {
        agentId: agent.agentId,
        strategy: agent.strategy.name,
        output: {
          files
        },
        selfEvaluation: evaluation
      };

      this.emit('agent:completed', { sessionId, agentId: agent.agentId });

      // Check if all agents complete
      if (session.agents.every(a => a.status === 'completed' || a.status === 'failed')) {
        await this.completeSession(sessionId);
      }

      // Cleanup: Stop the agent
      try {
        await this.puppeteerService.stopAgent(agent.agentId);
      } catch (cleanupError) {
        console.warn(`[Parallel Exploration] Agent cleanup warning: ${cleanupError}`);
      }

    } catch (error) {
      console.error(`[Parallel Exploration] Agent ${agent.agentId} execution failed:`, error);
      agent.status = 'failed';
      agent.error = error instanceof Error ? error.message : String(error);
      
      // Try to cleanup
      try {
        await this.puppeteerService.stopAgent(agent.agentId);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  /**
   * Fallback mock execution when puppeteer is not available
   */
  private async executeAgentFallback(sessionId: string, agent: AgentExecution): Promise<void> {
    console.log(`[Parallel Exploration] ⚠️ Using fallback mock mode for ${agent.agentId}`);

    // Simulate phases with realistic timing
    agent.status = 'researching';
    agent.progress = 20;
    this.emit('agent:progress', { sessionId, agentId: agent.agentId, status: 'researching', progress: 20 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    agent.status = 'implementing';
    agent.progress = 60;
    this.emit('agent:progress', { sessionId, agentId: agent.agentId, status: 'implementing', progress: 60 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    agent.status = 'evaluating';
    agent.progress = 90;
    this.emit('agent:progress', { sessionId, agentId: agent.agentId, status: 'evaluating', progress: 90 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    agent.status = 'completed';
    agent.progress = 100;
    agent.completedAt = new Date();
    agent.result = {
      agentId: agent.agentId,
      strategy: agent.strategy.name,
      output: {
        files: [
          { path: 'index.html', content: `<!-- Mock: ${agent.strategy.name} variation -->` }
        ]
      },
      selfEvaluation: {
        quality: 70 + Math.random() * 20,
        uniqueness: 60 + Math.random() * 30,
        feasibility: 75 + Math.random() * 20,
        bestPractices: 65 + Math.random() * 25,
        totalScore: 70
      }
    };

    this.emit('agent:completed', { sessionId, agentId: agent.agentId });

    const session = this.sessions.get(sessionId);
    if (session && session.agents.every(a => a.status === 'completed' || a.status === 'failed')) {
      await this.completeSession(sessionId);
    }
  }

  /**
   * Collect all generated files from agent's work directory
   */
  private async collectGeneratedFiles(workTreePath: string): Promise<Array<{ path: string; content: string }>> {
    const files: Array<{ path: string; content: string }> = [];

    try {
      const entries = await fs.readdir(workTreePath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden files and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        const fullPath = path.join(workTreePath, entry.name);

        if (entry.isFile()) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            files.push({
              path: entry.name,
              content
            });
          } catch (readError) {
            console.warn(`[Parallel Exploration] Could not read file ${fullPath}:`, readError);
          }
        } else if (entry.isDirectory()) {
          // Recursively collect from subdirectories
          const subFiles = await this.collectFilesRecursive(fullPath, entry.name);
          files.push(...subFiles);
        }
      }

      console.log(`[Parallel Exploration] Collected ${files.length} files from ${workTreePath}`);
      return files;

    } catch (error) {
      console.error(`[Parallel Exploration] Error collecting files from ${workTreePath}:`, error);
      return files;
    }
  }

  /**
   * Recursively collect files from a directory
   */
  private async collectFilesRecursive(dirPath: string, relativePath: string): Promise<Array<{ path: string; content: string }>> {
    const files: Array<{ path: string; content: string }> = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        const fileRelativePath = path.join(relativePath, entry.name);

        if (entry.isFile()) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            files.push({
              path: fileRelativePath,
              content
            });
          } catch (readError) {
            // Skip binary files or unreadable files
          }
        } else if (entry.isDirectory()) {
          const subFiles = await this.collectFilesRecursive(fullPath, fileRelativePath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      // Ignore directory read errors
    }

    return files;
  }

  /**
   * Evaluate the generated result
   */
  private evaluateResult(files: Array<{ path: string; content: string }>, strategy: ExplorationStrategy): {
    quality: number;
    uniqueness: number;
    feasibility: number;
    bestPractices: number;
    totalScore: number;
  } {
    // Basic heuristic evaluation based on file count and content
    const fileCount = files.length;
    const totalSize = files.reduce((sum, f) => sum + f.content.length, 0);
    const hasHTML = files.some(f => f.path.endsWith('.html'));
    const hasCSS = files.some(f => f.path.endsWith('.css'));
    const hasJS = files.some(f => f.path.endsWith('.js') || f.path.endsWith('.ts') || f.path.endsWith('.tsx'));

    // Calculate scores
    let quality = 50;
    if (fileCount >= 3) quality += 20;
    if (totalSize > 1000) quality += 15;
    if (hasHTML && hasCSS) quality += 15;

    let uniqueness = 60 + Math.random() * 30; // Strategy differentiation is hard to measure automatically

    let feasibility = 60;
    if (hasHTML) feasibility += 20;
    if (hasCSS) feasibility += 10;
    if (hasJS) feasibility += 10;

    let bestPractices = 50;
    // Check for semantic HTML, CSS organization, etc.
    const htmlFiles = files.filter(f => f.path.endsWith('.html'));
    for (const htmlFile of htmlFiles) {
      if (htmlFile.content.includes('<!DOCTYPE html>')) bestPractices += 10;
      if (htmlFile.content.includes('<meta')) bestPractices += 5;
      if (htmlFile.content.includes('aria-')) bestPractices += 10;
    }

    // Cap scores at 100
    quality = Math.min(100, quality);
    uniqueness = Math.min(100, uniqueness);
    feasibility = Math.min(100, feasibility);
    bestPractices = Math.min(100, bestPractices);

    const totalScore = (quality + uniqueness + feasibility + bestPractices) / 4;

    return {
      quality: Math.round(quality),
      uniqueness: Math.round(uniqueness),
      feasibility: Math.round(feasibility),
      bestPractices: Math.round(bestPractices),
      totalScore: Math.round(totalScore)
    };
  }

  /**
   * Complete session and evaluate results
   */
  private async completeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'evaluating';

    // Gather results
    const results = session.agents
      .filter(a => a.result)
      .map(a => a.result!);

    session.results = results;
    session.status = 'completed';
    session.completedAt = new Date();

    this.emit('session:completed', { sessionId, results });
  }

  /**
   * Get session status
   */
  getSession(sessionId: string): ExplorationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Stop a running exploration session
   */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Stop all agents
    for (const agent of session.agents) {
      try {
        await this.puppeteerService.stopAgent(agent.agentId);
      } catch (error) {
        console.error(`[Parallel Exploration] Error stopping agent ${agent.agentId}:`, error);
      }
    }

    session.status = 'failed';
    session.error = 'Stopped by user';
    this.emit('session:stopped', { sessionId });
  }
}

// Singleton instance
let instance: ParallelExplorationService | null = null;

export function getParallelExplorationService(): ParallelExplorationService {
  if (!instance) {
    instance = new ParallelExplorationService();
  }
  return instance;
}
