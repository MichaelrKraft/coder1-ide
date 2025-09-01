/**
 * AI Agent Orchestrator Service
 * Coordinates multi-agent workflows with real Claude API integration
 * Builds on existing Claude API service with agent templates and memory system
 */

import fs from 'fs';
import path from 'path';
import { claudeAPI, ClaudeMessage, ClaudeResponse } from './claude-api';
import type { AIProjectContext } from '@/types/session';

export interface AgentDefinition {
  name: string;
  description: string;
  color: string;
  model: string;
  instructions: string;
  tools: string[];
  templates: Record<string, AgentTemplate>;
}

export interface AgentTemplate {
  pattern: string;
  dependencies: string[];
  relatedAgents: string[];
  crossReferences: string[];
  commonIssues: string[];
  bestPractices: string[];
  workflow?: string;
}

export interface WorkflowTemplate {
  name: string;
  description: string;
  category: string;
  agents: string[];
  sequence: WorkflowStep[];
  commonIssues: string[];
  bestPractices: string[];
}

export interface WorkflowStep {
  agent: string;
  task: string;
  dependencies: string[];
  deliverables: string[];
}

export interface AgentSession {
  sessionId: string;
  teamId: string;
  agentId: string;
  agentName: string;
  status: 'initializing' | 'thinking' | 'working' | 'waiting' | 'completed' | 'error';
  currentTask: string;
  progress: number;
  output: string[];
  files: GeneratedFile[];
  dependencies: string[];
  completedDeliverables: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'component' | 'service' | 'config' | 'test' | 'documentation';
  agent: string;
  timestamp: Date;
}

export interface TeamSession {
  teamId: string;
  sessionId: string;
  projectRequirement: string;
  workflow: string;
  agents: AgentSession[];
  status: 'spawning' | 'planning' | 'executing' | 'integrating' | 'completed' | 'error';
  startTime: Date;
  files: GeneratedFile[];
  context: AIProjectContext;
}

class AIAgentOrchestrator {
  private agentDefinitions: Map<string, AgentDefinition> = new Map();
  private workflowTemplates: Map<string, WorkflowTemplate> = new Map();
  private activeTeams: Map<string, TeamSession> = new Map();
  private agentsPath: string;
  private outputDirectory: string;

  constructor() {
    this.agentsPath = path.join(process.cwd(), '.coder1', 'agents');
    this.outputDirectory = path.join(process.cwd(), 'generated');
    this.loadAgentDefinitions();
    this.loadWorkflowTemplates();
  }

  /**
   * Load agent definitions from .coder1/agents/ directory
   */
  private loadAgentDefinitions() {
    try {
      const agentFiles = fs.readdirSync(this.agentsPath)
        .filter(file => file.endsWith('.json') && file !== 'templates.json');

      for (const file of agentFiles) {
        const filePath = path.join(this.agentsPath, file);
        const agentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const agentId = file.replace('.json', '');
        this.agentDefinitions.set(agentId, agentData);
      }

      console.log(`✅ Loaded ${this.agentDefinitions.size} agent definitions`);
    } catch (error) {
      console.error('❌ Error loading agent definitions:', error);
    }
  }

  /**
   * Load workflow templates from templates.json
   */
  private loadWorkflowTemplates() {
    try {
      const templatesPath = path.join(this.agentsPath, 'templates.json');
      const templatesData = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
      
      for (const [workflowId, workflow] of Object.entries(templatesData.workflows)) {
        this.workflowTemplates.set(workflowId, workflow as WorkflowTemplate);
      }

      console.log(`✅ Loaded ${this.workflowTemplates.size} workflow templates`);
    } catch (error) {
      console.error('❌ Error loading workflow templates:', error);
    }
  }

  /**
   * Parse project requirements and determine appropriate workflow
   */
  parseProjectRequirement(requirement: string): AIProjectContext {
    const context: AIProjectContext = {
      requirement,
      projectType: 'web-application',
      framework: 'react',
      features: [],
      constraints: []
    };

    // Analyze requirement text to extract context
    const reqLower = requirement.toLowerCase();

    // Detect project type
    if (reqLower.includes('todo') || reqLower.includes('task')) {
      context.projectType = 'crud-application';
      context.features = ['create', 'read', 'update', 'delete', 'persistence'];
    } else if (reqLower.includes('dashboard') || reqLower.includes('admin')) {
      context.projectType = 'dashboard';
      context.features = ['authentication', 'data-visualization', 'crud'];
    } else if (reqLower.includes('landing') || reqLower.includes('website')) {
      context.projectType = 'static-site';
      context.features = ['responsive-design', 'seo'];
    }

    // Detect framework preferences
    if (reqLower.includes('vue')) context.framework = 'vue';
    else if (reqLower.includes('angular')) context.framework = 'angular';
    else if (reqLower.includes('svelte')) context.framework = 'svelte';
    else context.framework = 'react'; // default

    // Extract features
    const featureKeywords = {
      'auth': ['login', 'signup', 'authentication', 'user'],
      'database': ['save', 'store', 'persist', 'database'],
      'api': ['api', 'backend', 'server'],
      'responsive': ['mobile', 'responsive', 'device'],
      'styling': ['beautiful', 'styled', 'design', 'ui']
    };

    for (const [feature, keywords] of Object.entries(featureKeywords)) {
      if (keywords.some(keyword => reqLower.includes(keyword))) {
        context.features.push(feature);
      }
    }

    return context;
  }

  /**
   * Determine appropriate workflow based on project context
   */
  selectWorkflow(context: AIProjectContext): string {
    const { projectType, features } = context;

    // Authentication required
    if (features.includes('auth')) {
      return 'auth-full-stack';
    }

    // CRUD application
    if (projectType === 'crud-application' || features.includes('database')) {
      return 'crud-with-ui';
    }

    // Component-focused
    if (projectType === 'component-library') {
      return 'component-library';
    }

    // Performance-focused
    if (features.includes('performance') || features.includes('optimization')) {
      return 'performance-audit';
    }

    // Default to CRUD with UI for most web applications
    return 'crud-with-ui';
  }

  /**
   * Spawn AI team for project requirement
   */
  async spawnTeam(requirement: string): Promise<TeamSession> {
    const teamId = `team-${Date.now()}`;
    const sessionId = `session-${Date.now()}`;

    // Parse requirement and select workflow
    const context = this.parseProjectRequirement(requirement);
    const workflowId = this.selectWorkflow(context);
    const workflow = this.workflowTemplates.get(workflowId);

    if (!workflow) {
      throw new Error(`❌ Workflow '${workflowId}' not found`);
    }

    console.log(`🚀 Spawning AI team for: ${requirement}`);
    console.log(`📋 Using workflow: ${workflow.name}`);
    console.log(`👥 Agents needed: ${workflow.agents.join(', ')}`);

    // Create agent sessions based on workflow
    const agents: AgentSession[] = [];
    for (const agentId of workflow.agents) {
      const agentDef = this.agentDefinitions.get(agentId);
      if (!agentDef) {
        console.warn(`⚠️ Agent definition not found: ${agentId}`);
        continue;
      }

      agents.push({
        sessionId,
        teamId,
        agentId,
        agentName: agentDef.name,
        status: 'initializing',
        currentTask: 'Waiting for workflow coordination',
        progress: 0,
        output: [],
        files: [],
        dependencies: [],
        completedDeliverables: []
      });
    }

    // Get memory context from existing memory system
    context.memoryContext = await this.getMemoryContext(requirement);

    const teamSession: TeamSession = {
      teamId,
      sessionId,
      projectRequirement: requirement,
      workflow: workflowId,
      agents,
      status: 'spawning',
      startTime: new Date(),
      files: [],
      context
    };

    this.activeTeams.set(teamId, teamSession);

    // Start workflow execution
    this.executeWorkflow(teamId);

    return teamSession;
  }

  /**
   * Execute workflow with sequential agent coordination
   */
  private async executeWorkflow(teamId: string) {
    const team = this.activeTeams.get(teamId);
    if (!team) return;

    const workflow = this.workflowTemplates.get(team.workflow);
    if (!workflow) return;

    team.status = 'planning';
    console.log(`📋 Executing workflow: ${workflow.name}`);

    try {
      // Execute workflow steps in sequence
      for (const step of workflow.sequence) {
        const agent = team.agents.find(a => a.agentId === step.agent);
        if (!agent) continue;

        // Check dependencies
        const unmetDependencies = step.dependencies.filter(dep => 
          !agent.completedDeliverables.includes(dep)
        );

        if (unmetDependencies.length > 0) {
          console.log(`⏸️ Agent ${agent.agentName} waiting for dependencies: ${unmetDependencies.join(', ')}`);
          agent.status = 'waiting';
          continue;
        }

        // Execute agent task
        await this.executeAgentTask(teamId, agent.agentId, step);
      }

      team.status = 'completed';
      console.log(`✅ Team ${teamId} completed workflow`);

    } catch (error) {
      team.status = 'error';
      console.error(`❌ Team ${teamId} workflow failed:`, error);
    }
  }

  /**
   * Execute individual agent task with real Claude API
   */
  private async executeAgentTask(teamId: string, agentId: string, step: WorkflowStep) {
    const team = this.activeTeams.get(teamId);
    const agent = team?.agents.find(a => a.agentId === agentId);
    if (!team || !agent) return;

    const agentDef = this.agentDefinitions.get(agentId);
    if (!agentDef) return;

    agent.status = 'thinking';
    agent.currentTask = step.task;
    console.log(`🤖 ${agent.agentName} starting: ${step.task}`);

    try {
      // Prepare context for agent
      const context = this.buildAgentContext(team, agent, step);
      
      // Create specialized prompt for agent
      const prompt = this.buildAgentPrompt(agentDef, team.context, step, context);

      agent.status = 'working';
      agent.progress = 25;

      // Send to Claude API with agent-specific instructions
      const response = await claudeAPI.sendMessage(prompt, context);
      
      agent.progress = 75;
      
      // Process agent response
      const files = await this.processAgentResponse(team, agent, response, step);
      
      agent.files.push(...files);
      team.files.push(...files);
      agent.completedDeliverables.push(...step.deliverables);
      agent.status = 'completed';
      agent.progress = 100;

      console.log(`✅ ${agent.agentName} completed: ${step.task}`);
      console.log(`📁 Generated ${files.length} files`);

    } catch (error) {
      agent.status = 'error';
      agent.output.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(`❌ ${agent.agentName} failed:`, error);
    }
  }

  /**
   * Build agent context from team state and dependencies
   */
  private buildAgentContext(team: TeamSession, agent: AgentSession, step: WorkflowStep): string {
    const contextParts = [
      `Project Requirement: ${team.context.requirement}`,
      `Project Type: ${team.context.projectType}`,
      `Framework: ${team.context.framework}`,
      `Features: ${team.context.features.join(', ')}`,
      ''
    ];

    // Add memory context if available
    if (team.context.memoryContext) {
      contextParts.push('Memory Context:', team.context.memoryContext, '');
    }

    // Add completed work from other agents
    const completedWork = team.agents
      .filter(a => a.status === 'completed' && a.files.length > 0)
      .map(a => `${a.agentName}: ${a.files.map(f => f.path).join(', ')}`);

    if (completedWork.length > 0) {
      contextParts.push('Completed Work:', ...completedWork, '');
    }

    // Add current task context
    contextParts.push(
      `Current Task: ${step.task}`,
      `Expected Deliverables: ${step.deliverables.join(', ')}`,
      `Dependencies: ${step.dependencies.join(', ')}`
    );

    return contextParts.join('\n');
  }

  /**
   * Build specialized prompt for agent based on their role
   */
  private buildAgentPrompt(
    agentDef: AgentDefinition, 
    context: AIProjectContext, 
    step: WorkflowStep,
    agentContext: string
  ): string {
    return `${agentDef.instructions}

## Current Assignment
${step.task}

## Project Context
${agentContext}

## Expected Output
Please provide:
1. Brief analysis of the requirements
2. Implementation approach
3. Complete code files for: ${step.deliverables.join(', ')}
4. Any setup instructions or dependencies

Generate production-ready code that follows best practices for ${context.framework} development.
Focus on: ${context.features.join(', ')}.

Respond with clear file paths and complete file contents in code blocks.`;
  }

  /**
   * Process agent response and extract generated files
   */
  private async processAgentResponse(
    team: TeamSession, 
    agent: AgentSession, 
    response: ClaudeResponse,
    step: WorkflowStep
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];
    
    // Extract code blocks from response
    const codeBlocks = this.extractCodeBlocks(response.content);
    
    for (const block of codeBlocks) {
      if (block.filename && block.content) {
        const file: GeneratedFile = {
          path: block.filename,
          content: block.content,
          type: this.determineFileType(block.filename),
          agent: agent.agentId,
          timestamp: new Date()
        };

        // Write file to output directory
        await this.writeGeneratedFile(file);
        files.push(file);
      }
    }

    // Store agent output
    agent.output.push(response.content);

    return files;
  }

  /**
   * Extract code blocks with filenames from Claude response
   */
  private extractCodeBlocks(content: string): { filename: string; content: string; language: string }[] {
    const blocks: { filename: string; content: string; language: string }[] = [];
    const codeBlockRegex = /```(\w+)?\s*(?:\/\/\s*(.+))?\n([\s\S]*?)```/g;
    
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const [, language = '', filename = '', code] = match;
      
      // Look for filename in comment or extract from context
      let actualFilename = filename;
      if (!actualFilename) {
        // Try to extract filename from surrounding text
        const beforeBlock = content.substring(Math.max(0, match.index - 100), match.index);
        const filenameMatch = beforeBlock.match(/(?:file:|path:|create\s+)([^\n\s]+\.[a-z]+)/i);
        if (filenameMatch) {
          actualFilename = filenameMatch[1];
        }
      }

      if (actualFilename && code.trim()) {
        blocks.push({
          filename: actualFilename,
          content: code.trim(),
          language: language || this.detectLanguage(actualFilename)
        });
      }
    }

    return blocks;
  }

  /**
   * Determine file type from filename
   */
  private determineFileType(filename: string): GeneratedFile['type'] {
    if (filename.includes('.test.') || filename.includes('.spec.')) return 'test';
    if (filename.endsWith('.md') || filename.includes('README')) return 'documentation';
    if (filename.includes('config') || filename.endsWith('.json') || filename.endsWith('.js') && filename.includes('.config.')) return 'config';
    if (filename.includes('service') || filename.includes('api') || filename.includes('util')) return 'service';
    return 'component';
  }

  /**
   * Detect programming language from filename
   */
  private detectLanguage(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.css': 'css',
      '.html': 'html',
      '.json': 'json',
      '.md': 'markdown'
    };
    return langMap[ext] || 'text';
  }

  /**
   * Write generated file to output directory
   */
  private async writeGeneratedFile(file: GeneratedFile): Promise<void> {
    try {
      const fullPath = path.join(this.outputDirectory, file.path);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      fs.mkdirSync(dir, { recursive: true });
      
      // Write file
      fs.writeFileSync(fullPath, file.content, 'utf-8');
      
      console.log(`📁 Generated: ${file.path}`);
    } catch (error) {
      console.error(`❌ Failed to write file ${file.path}:`, error);
    }
  }

  /**
   * Get memory context from existing memory system
   */
  private async getMemoryContext(requirement: string): Promise<string> {
    try {
      // This would integrate with the existing ChromaDB memory system
      // For now, return basic context
      return `Previous project patterns and best practices for similar requirements`;
    } catch (error) {
      console.warn('⚠️ Memory context unavailable:', error);
      return '';
    }
  }

  /**
   * Get team session status
   */
  getTeamStatus(teamId: string): TeamSession | null {
    return this.activeTeams.get(teamId) || null;
  }

  /**
   * Get all active teams
   */
  getAllTeams(): TeamSession[] {
    return Array.from(this.activeTeams.values());
  }

  /**
   * Send input to specific agent
   */
  async sendAgentInput(teamId: string, agentId: string, input: string): Promise<boolean> {
    const team = this.activeTeams.get(teamId);
    const agent = team?.agents.find(a => a.agentId === agentId);
    
    if (!team || !agent) return false;

    try {
      // Process agent input with context
      const context = this.buildAgentContext(team, agent, {
        agent: agentId,
        task: agent.currentTask,
        dependencies: agent.dependencies,
        deliverables: agent.completedDeliverables
      });

      agent.status = 'working';
      const response = await claudeAPI.sendMessage(input, context);
      
      agent.output.push(`User: ${input}`, `Agent: ${response.content}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to send input to ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Emergency stop - clean up all active teams
   */
  emergencyStop(): void {
    console.log(`🚨 Emergency stop - cleaning up ${this.activeTeams.size} teams`);
    this.activeTeams.clear();
  }
}

// Export singleton instance
export const aiOrchestrator = new AIAgentOrchestrator();
export default aiOrchestrator;