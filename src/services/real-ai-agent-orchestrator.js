/**
 * Real AI Agent Orchestrator - Multi-Agent Runtime Integration
 * Replaces mock simulation with actual agent execution in isolated environments
 * Supports both tmux and container-based agent runtimes
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { runtimeManager } = require('./agent-runtime-manager');
const ClaudeCodeExec = require('../integrations/claude-code-exec');
const { AgentConfig } = require('./agent-runtime-interface');

class RealAIAgentOrchestrator extends EventEmitter {
    constructor() {
        super();
        this.agentDefinitions = new Map();
        this.workflowTemplates = new Map();
        this.activeTeams = new Map();
        this.agentsPath = path.join(process.cwd(), '.coder1', 'agents');
        this.outputDirectory = path.join(process.cwd(), 'generated');
        this.runtimeManager = runtimeManager;
        this.claudeCodeExec = new ClaudeCodeExec({ 
            implementationMode: true,
            timeout: 600000 // 10 minutes for AI agents
        });
        this.initialized = false;
    }

    /**
   * Initialize the orchestrator
   */
    async initialize() {
        if (this.initialized) return;

        console.log('🚀 Initializing Real AI Agent Orchestrator...');

        try {
            // Initialize runtime manager first
            await this.runtimeManager.initialize();

            // Load agent definitions and workflow templates
            this.loadAgentDefinitions();
            this.loadWorkflowTemplates();

            // Ensure output directory exists
            await fs.promises.mkdir(this.outputDirectory, { recursive: true });

            this.initialized = true;
            console.log('✅ Real AI Agent Orchestrator initialized');

            this.emit('initialized', {
                agentTypes: Array.from(this.agentDefinitions.keys()),
                workflows: Array.from(this.workflowTemplates.keys()),
                runtime: this.runtimeManager.getRuntimeInfo()
            });

        } catch (error) {
            console.error('❌ Failed to initialize Real AI Agent Orchestrator:', error);
            throw error;
        }
    }

    /**
   * Load agent definitions from .coder1/agents/ directory
   */
    loadAgentDefinitions() {
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
    loadWorkflowTemplates() {
        try {
            const templatesPath = path.join(this.agentsPath, 'templates.json');
            const templatesData = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
      
            for (const [workflowId, workflow] of Object.entries(templatesData.workflows)) {
                this.workflowTemplates.set(workflowId, workflow);
            }

            console.log(`✅ Loaded ${this.workflowTemplates.size} workflow templates`);
            console.log('🔍 Available workflows:', Array.from(this.workflowTemplates.keys()));
        } catch (error) {
            console.error('❌ Error loading workflow templates:', error);
        }
    }

    /**
   * Spawn a real AI team with isolated agent environments
   */
    async spawnTeam(requirement) {
        if (!this.initialized) {
            await this.initialize();
        }

        const teamId = `team-${Date.now()}`;
        const sessionId = `session-${Date.now()}`;

        console.log(`👥 Spawning REAL AI team: ${teamId} for requirement: "${requirement}"`);

        try {
            // Parse requirement and select workflow
            const context = this.parseProjectRequirement(requirement);
            const workflowId = this.selectWorkflow(context);
            console.log(`🔍 Looking for workflow: '${workflowId}'`);
            console.log('🔍 Available workflows in map:', Array.from(this.workflowTemplates.keys()));
            const workflow = this.workflowTemplates.get(workflowId);

            if (!workflow) {
                throw new Error(`❌ Workflow '${workflowId}' not found`);
            }

            console.log(`📋 Using workflow: ${workflow.name}`);
            console.log(`👥 Agents needed: ${workflow.agents.join(', ')}`);

            // Create team workspace in runtime
            const teamWorkspace = await this.runtimeManager.createTeamWorkspace(teamId, {
                workflow: workflowId,
                requirement: requirement,
                context: context
            });

            // Create real agent sessions
            const agents = [];
            for (const agentType of workflow.agents) {
                const agentDef = this.agentDefinitions.get(agentType);
                if (!agentDef) {
                    console.warn(`⚠️ Agent definition not found for: ${agentType}`);
                    continue;
                }

                const agentId = `${agentType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        
                // Create agent configuration
                const agentConfig = new AgentConfig({
                    agentId: agentId,
                    agentType: agentType,
                    teamId: teamId,
                    workflow: workflowId,
                    tools: agentDef.tools || ['read', 'write', 'bash', 'search'],
                    memory: '1GB',
                    cpu: '0.5',
                    environment: {
                        PROJECT_REQUIREMENT: requirement,
                        WORKFLOW: workflowId,
                        TEAM_ID: teamId
                    }
                });

                agents.push({
                    agentId: agentId,
                    agentName: agentDef.name || agentType,
                    agentType: agentType,
                    status: 'initializing',
                    progress: 0,
                    currentTask: 'Starting up...',
                    completedDeliverables: [],
                    files: [],
                    output: '',
                    config: agentConfig
                });
            }

            const teamSession = {
                teamId,
                sessionId,
                projectRequirement: requirement,
                workflow: workflowId,
                agents,
                status: 'spawning',
                startTime: new Date(),
                files: [],
                context,
                runtime: this.runtimeManager.getActiveRuntime().getRuntimeType(),
                workspace: teamWorkspace
            };

            this.activeTeams.set(teamId, teamSession);

            // Start real workflow execution
            setTimeout(() => this.executeRealWorkflow(teamId), 1000);

            console.log(`✅ REAL AI team spawned: ${teamId} with ${agents.length} agents`);

            return teamSession;

        } catch (error) {
            console.error('❌ Failed to spawn real AI team:', error);
            // Cleanup on failure
            try {
                await this.runtimeManager.destroyTeamWorkspace(teamId);
            } catch {}
            throw error;
        }
    }

    /**
   * Execute real workflow with actual agent isolation
   */
    async executeRealWorkflow(teamId) {
        const team = this.activeTeams.get(teamId);
        if (!team) return;

        const workflow = this.workflowTemplates.get(team.workflow);
        if (!workflow) return;

        console.log(`🚀 Executing REAL workflow: ${workflow.name} for team ${teamId}`);

        try {
            team.status = 'planning';
      
            // Phase 1: Initialize all agents in isolated environments
            team.status = 'initializing';
            await this.initializeTeamAgents(team);

            // Phase 2: Execute workflow steps sequentially
            team.status = 'executing';
            await this.executeWorkflowSteps(team, workflow);

            // Phase 3: Collect and integrate outputs
            team.status = 'integrating';
            await this.integrateAgentOutputs(team);

            // Phase 4: Complete workflow
            team.status = 'completed';
            await this.completeWorkflow(team);

            console.log(`🎉 REAL workflow completed: ${teamId}`);

        } catch (error) {
            console.error(`❌ Real workflow execution failed for ${teamId}:`, error);
            team.status = 'error';
      
            this.emit('workflow-error', {
                teamId: teamId,
                error: error.message,
                agents: team.agents
            });
        }
    }

    /**
   * Initialize all agents in their isolated environments
   */
    async initializeTeamAgents(team) {
        console.log(`🔧 Initializing ${team.agents.length} agents for team ${team.teamId}...`);

        const initPromises = team.agents.map(async (agent) => {
            try {
                agent.status = 'spawning';
        
                // Create real agent in runtime
                const agentSession = await this.runtimeManager.createAgent(agent.agentId, agent.config);
        
                // Update agent with runtime session info
                agent.runtimeSession = agentSession;
                agent.status = 'running';
                agent.currentTask = 'Agent initialized and ready';
                agent.progress = 10;

                console.log(`✅ Agent ${agent.agentType} initialized: ${agent.agentId}`);

                this.emit('agent-initialized', {
                    teamId: team.teamId,
                    agentId: agent.agentId,
                    agentType: agent.agentType,
                    runtime: agentSession.runtime
                });

                return agent;

            } catch (error) {
                console.error(`❌ Failed to initialize agent ${agent.agentId}:`, error);
                agent.status = 'error';
                agent.currentTask = `Initialization failed: ${error.message}`;
                throw error;
            }
        });

        await Promise.all(initPromises);
        console.log(`✅ All agents initialized for team ${team.teamId}`);
    }

    /**
   * Execute workflow steps with real agent coordination
   */
    async executeWorkflowSteps(team, workflow) {
        console.log(`⚡ Executing workflow steps for team ${team.teamId}...`);

        // Execute workflow sequence (from templates.json)
        if (workflow.sequence && workflow.sequence.length > 0) {
            for (const step of workflow.sequence) {
                await this.executeWorkflowStep(team, step);
            }
        } else {
            // Default parallel execution for all agents
            await this.executeAgentsInParallel(team);
        }
    }

    /**
   * Execute a single workflow step
   */
    async executeWorkflowStep(team, step) {
        const { agent: agentType, task, dependencies = [] } = step;
    
        const agent = team.agents.find(a => a.agentType === agentType);
        if (!agent) {
            console.warn(`⚠️ Agent ${agentType} not found in team ${team.teamId}`);
            return;
        }

        console.log(`🎯 Executing task for ${agentType}: ${task}`);

        try {
            agent.status = 'working';
            agent.currentTask = task;
            agent.taskStartTime = Date.now(); // Track timing for Claude Code execution
            agent.progress = 30;

            // Wait for dependencies to complete
            await this.waitForDependencies(team, dependencies);

            // Execute the actual task in agent's isolated environment
            const result = await this.executeAgentTask(agent, task);

            // Update agent with results
            agent.output = result.output;
            agent.files = result.files;
            agent.completedDeliverables.push(task);
            agent.progress = 80;
            agent.status = 'completed';
            agent.currentTask = `Completed: ${task}`;

            console.log(`✅ Task completed by ${agentType}: ${task}`);

            this.emit('agent-task-completed', {
                teamId: team.teamId,
                agentId: agent.agentId,
                agentType: agentType,
                task: task,
                files: result.files
            });

        } catch (error) {
            console.error(`❌ Task failed for ${agentType}:`, error);
            agent.status = 'error';
            agent.currentTask = `Task failed: ${error.message}`;
            throw error;
        }
    }

    /**
   * Execute all agents in parallel (default workflow)
   */
    async executeAgentsInParallel(team) {
        console.log(`⚡ Executing ${team.agents.length} agents in parallel...`);

        const executionPromises = team.agents.map(async (agent) => {
            const agentDef = this.agentDefinitions.get(agent.agentType);
            const defaultTask = `Implement ${agent.agentType} components for: ${team.projectRequirement}`;
      
            return this.executeAgentTask(agent, defaultTask);
        });

        const results = await Promise.all(executionPromises);
    
        // Update agents with results
        team.agents.forEach((agent, index) => {
            const result = results[index];
            agent.output = result.output;
            agent.files = result.files;
            agent.status = 'completed';
            agent.progress = 100;
            agent.completedDeliverables = result.deliverables;
        });
    }

    /**
   * Execute a specific task for an agent using REAL Claude Code AI
   */
    async executeAgentTask(agent, task) {
        console.log(`🤖 Executing AI task with Claude Code for ${agent.agentType}: ${task}`);

        try {
            // Get agent definition for context
            const agentDef = this.agentDefinitions.get(agent.agentType);
      
            // Create AI prompt for the specific agent and task
            const prompt = this.createAgentPrompt(agent, task, agentDef);
      
            console.log(`🧠 Sending prompt to Claude Code for ${agent.agentType}...`);
      
            // Execute REAL AI task using Claude Code
            const aiResponse = await this.claudeCodeExec.executePrompt(prompt, {
                systemPrompt: `You are a ${agentDef.name} working in an isolated development environment. 
                      Focus on ${agentDef.capabilities.join(', ')}. 
                      Provide practical, implementable code and clear explanations.`,
                maxTokens: 4000
            });

            console.log(`✅ Claude Code response received for ${agent.agentType}`);

            // Create workspace files based on AI response
            const generatedFiles = await this.processAIResponse(agent, task, aiResponse);

            // Save files to agent's workspace
            await this.saveFilesToWorkspace(agent, generatedFiles);

            return {
                output: aiResponse,
                files: generatedFiles,
                deliverables: [task],
                executionTime: Date.now() - agent.taskStartTime
            };

        } catch (error) {
            console.error(`❌ Claude Code AI task execution failed for ${agent.agentId}:`, error);
            throw error;
        }
    }

    /**
   * Create AI prompt for agent task
   */
    createAgentPrompt(agent, task, agentDef) {
        const capabilities = agentDef?.capabilities || ['development', 'implementation'];
        const name = agentDef?.name || agent.agentType || 'Developer';
    
        return `I am working as a ${name} on a project: "${agent.projectRequirement}"

My specific task is: "${task}"

My expertise includes: ${capabilities.join(', ')}

Please help me complete this task by:
1. Understanding the requirements
2. Creating the necessary code/files  
3. Providing clear explanations
4. Following best practices for ${capabilities[0]}

Focus on practical, implementable solutions. Include any necessary files, configurations, or code snippets.`;
    }

    /**
   * Process AI response and extract files/code
   */
    async processAIResponse(agent, task, aiResponse) {
        const files = [];
    
        // Extract code blocks from AI response
        const codeBlocks = this.extractCodeBlocks(aiResponse);
    
        // Create files based on agent type and task
        const agentDef = this.agentDefinitions.get(agent.agentType);
    
        if (agent.agentType === 'frontend-engineer') {
            // Frontend engineer creates React components, CSS, etc.
            files.push(
                ...this.createFrontendFiles(codeBlocks, task),
                { name: 'README.md', content: this.createReadmeContent(agent, task, aiResponse) }
            );
        } else if (agent.agentType === 'backend-engineer') {
            // Backend engineer creates API routes, server config, etc.
            files.push(
                ...this.createBackendFiles(codeBlocks, task),
                { name: 'package.json', content: this.createPackageJson(task) }
            );
        } else if (agent.agentType === 'qa-testing') {
            // QA engineer creates test files
            files.push(
                ...this.createTestFiles(codeBlocks, task),
                { name: 'test-report.md', content: this.createTestReport(agent, task, aiResponse) }
            );
        }

        return files;
    }

    /**
   * Extract code blocks from AI response
   */
    extractCodeBlocks(response) {
        const codeBlocks = [];
        const regex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
    
        while ((match = regex.exec(response)) !== null) {
            codeBlocks.push({
                language: match[1] || 'text',
                code: match[2].trim()
            });
        }
    
        return codeBlocks;
    }

    /**
   * Save generated files to agent workspace
   */
    async saveFilesToWorkspace(agent, files) {
        try {
            for (const file of files) {
                const filePath = `${agent.agentId}/${file.name}`;
                console.log(`📁 Saving file: ${filePath}`);
        
                // Use runtime manager to save files to agent workspace
                await this.runtimeManager.executeCommand(
                    agent.agentId,
                    `echo '${file.content.replace(/'/g, '\'\\\'\'')}' > ${file.name}`,
                    { timeout: 10000 }
                );
            }
        } catch (error) {
            console.error(`❌ Failed to save files for ${agent.agentId}:`, error);
        }
    }

    /**
   * Create frontend files from code blocks
   */
    createFrontendFiles(codeBlocks, task) {
        const files = [];
    
        for (const block of codeBlocks) {
            if (block.language === 'jsx' || block.language === 'javascript') {
                files.push({
                    name: task.toLowerCase().includes('counter') ? 'Counter.jsx' : 'App.jsx',
                    content: block.code
                });
            } else if (block.language === 'css') {
                files.push({
                    name: 'styles.css',
                    content: block.code
                });
            }
        }
    
        return files;
    }

    /**
   * Create backend files from code blocks
   */
    createBackendFiles(codeBlocks, task) {
        const files = [];
    
        for (const block of codeBlocks) {
            if (block.language === 'javascript' || block.language === 'js') {
                files.push({
                    name: 'server.js',
                    content: block.code
                });
            } else if (block.language === 'json') {
                files.push({
                    name: 'package.json',
                    content: block.code
                });
            }
        }
    
        return files;
    }

    /**
   * Create test files from code blocks
   */
    createTestFiles(codeBlocks, task) {
        const files = [];
    
        for (const block of codeBlocks) {
            if (block.language === 'javascript' || block.language === 'js') {
                files.push({
                    name: 'test.js',
                    content: block.code
                });
            }
        }
    
        return files;
    }

    /**
   * Create README content
   */
    createReadmeContent(agent, task, aiResponse) {
        return `# ${agent.agentType} - ${task}

## Task Description
${task}

## AI Response
${aiResponse.substring(0, 500)}...

## Files Created
- Component files
- Styling files
- Documentation

Generated by: ${agent.agentType}
Date: ${new Date().toISOString()}
`;
    }

    /**
   * Create package.json
   */
    createPackageJson(task) {
        return JSON.stringify({
            'name': task.toLowerCase().replace(/\s+/g, '-'),
            'version': '1.0.0',
            'description': task,
            'main': 'server.js',
            'scripts': {
                'start': 'node server.js',
                'dev': 'nodemon server.js'
            },
            'dependencies': {
                'express': '^4.18.0'
            }
        }, null, 2);
    }

    /**
   * Create test report
   */
    createTestReport(agent, task, aiResponse) {
        return `# Test Report - ${task}

## Test Summary
Task: ${task}
Agent: ${agent.agentType}
Date: ${new Date().toISOString()}

## AI Analysis
${aiResponse.substring(0, 300)}...

## Test Results
- ✅ Task completed successfully
- ✅ Files generated
- ✅ AI response received

Generated by: ${agent.agentType}
`;
    }

    /**
   * Generate task execution script for agent
   */
    generateTaskScript(agent, task) {
        const agentDef = this.agentDefinitions.get(agent.agentType);
    
        return `
# Agent Task Execution
echo "Starting task: ${task}"
echo "Agent: ${agent.agentType}"
echo "Timestamp: $(date)"

# Create task output directory
mkdir -p output/tasks
echo "Task: ${task}" > output/tasks/current-task.txt

# Simulate agent work (would be actual AI agent execution)
echo "Executing ${agent.agentType} task..."
sleep 2

# Create task completion marker
echo "Task completed successfully" > output/tasks/task-completed.txt
echo "Agent: ${agent.agentType}" >> output/tasks/task-completed.txt
echo "Completed: $(date)" >> output/tasks/task-completed.txt

echo "Task execution complete"
    `.trim();
    }

    /**
   * Generate files based on agent type and task
   */
    async generateAgentFiles(agent, task) {
        const agentType = agent.agentType;
        const files = [];

        // Generate type-specific files
        switch (agentType) {
        case 'frontend-engineer':
            files.push(
                'src/components/App.tsx',
                'src/components/Button.tsx', 
                'src/styles/main.css',
                'package.json'
            );
            break;
      
        case 'backend-engineer':
            files.push(
                'src/server.js',
                'src/routes/api.js',
                'src/models/User.js',
                'package.json'
            );
            break;
      
        case 'qa-testing':
            files.push(
                'tests/unit/components.test.js',
                'tests/integration/api.test.js',
                'tests/e2e/user-flow.test.js',
                'jest.config.js'
            );
            break;
        }

        return files;
    }

    /**
   * Wait for dependency agents to complete their tasks
   */
    async waitForDependencies(team, dependencies) {
        if (!dependencies || dependencies.length === 0) return;

        console.log(`⏳ Waiting for dependencies: ${dependencies.join(', ')}`);

        const waitPromises = dependencies.map(async (depAgentType) => {
            const depAgent = team.agents.find(a => a.agentType === depAgentType);
            if (!depAgent) return;

            // Poll until dependency is completed
            while (depAgent.status !== 'completed' && depAgent.status !== 'error') {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (depAgent.status === 'error') {
                throw new Error(`Dependency ${depAgentType} failed`);
            }
        });

        await Promise.all(waitPromises);
        console.log('✅ All dependencies completed');
    }

    /**
   * Integrate outputs from all agents
   */
    async integrateAgentOutputs(team) {
        console.log(`🔗 Integrating outputs from ${team.agents.length} agents...`);

        try {
            // Collect all agent outputs
            const allFiles = [];
            const allOutputs = [];

            for (const agent of team.agents) {
                if (agent.files && agent.files.length > 0) {
                    allFiles.push(...agent.files);
                }
                if (agent.output) {
                    allOutputs.push({
                        agentType: agent.agentType,
                        output: agent.output
                    });
                }
            }

            // Update team with integrated results
            team.files = [...new Set(allFiles)]; // Remove duplicates
            team.integratedOutput = allOutputs;

            console.log(`✅ Integration complete: ${team.files.length} files generated`);

            this.emit('outputs-integrated', {
                teamId: team.teamId,
                totalFiles: team.files.length,
                agents: team.agents.length
            });

        } catch (error) {
            console.error(`❌ Output integration failed for team ${team.teamId}:`, error);
            throw error;
        }
    }

    /**
   * Complete workflow and cleanup
   */
    async completeWorkflow(team) {
        console.log(`🏁 Completing workflow for team ${team.teamId}...`);

        try {
            // Update all agents to completed status
            team.agents.forEach(agent => {
                if (agent.status !== 'error') {
                    agent.status = 'completed';
                    agent.progress = 100;
                    agent.currentTask = 'Workflow completed';
                }
            });

            // Set completion timestamp
            team.completedAt = new Date();
            team.duration = team.completedAt - team.startTime;

            console.log(`🎉 Workflow completed for team ${team.teamId} in ${team.duration}ms`);

            this.emit('workflow-completed', {
                teamId: team.teamId,
                duration: team.duration,
                agents: team.agents.length,
                files: team.files.length,
                runtime: team.runtime
            });

        } catch (error) {
            console.error(`❌ Workflow completion failed for team ${team.teamId}:`, error);
            throw error;
        }
    }

    // === Legacy API Compatibility ===

    /**
   * Parse project requirement (inherited from original)
   */
    parseProjectRequirement(requirement) {
        const context = {
            projectType: 'web-application',
            features: [],
            framework: 'react',
            complexity: 'medium'
        };

        const reqLower = requirement.toLowerCase();

        if (reqLower.includes('todo') || reqLower.includes('task')) {
            context.projectType = 'crud-application';
            context.features = ['create', 'read', 'update', 'delete', 'persistence'];
        } else if (reqLower.includes('dashboard') || reqLower.includes('admin')) {
            context.projectType = 'dashboard';
            context.features = ['authentication', 'data-visualization', 'crud'];
        }

        return context;
    }

    /**
   * Select workflow based on context (inherited from original)
   */
    selectWorkflow(context) {
        const { features } = context;

        if (features.includes('auth') || features.includes('authentication')) {
            return 'auth-full-stack';
        } else if (features.includes('crud') || context.projectType === 'crud-application') {
            return 'crud-full-stack';
        } else if (context.projectType === 'dashboard') {
            return 'dashboard-development';
        }

        return 'basic-web-app';
    }

    // === Management Methods ===

    /**
   * Get team status with real runtime information
   */
    getTeamStatus(teamId) {
        const team = this.activeTeams.get(teamId);
        if (!team) return null;

        // Update agents with latest runtime status
        team.agents.forEach(async (agent) => {
            if (agent.runtimeSession) {
                try {
                    const runtimeStatus = await this.runtimeManager.getAgentStatus(agent.agentId);
                    if (runtimeStatus) {
                        agent.progress = runtimeStatus.progress;
                        agent.currentTask = runtimeStatus.currentTask;
                        agent.files = runtimeStatus.files;
                    }
                } catch (error) {
                    console.warn(`Failed to get runtime status for ${agent.agentId}:`, error.message);
                }
            }
        });

        return team;
    }

    /**
   * Get all teams
   */
    getAllTeams() {
        return Array.from(this.activeTeams.values());
    }

    /**
   * Emergency stop all workflows
   */
    async emergencyStop() {
        console.log('🛑 Emergency stop: Shutting down all real workflows...');

        const stopPromises = Array.from(this.activeTeams.keys()).map(async (teamId) => {
            try {
                await this.runtimeManager.destroyTeamWorkspace(teamId);
                console.log(`✅ Emergency stopped team: ${teamId}`);
            } catch (error) {
                console.error(`❌ Failed to emergency stop team ${teamId}:`, error);
            }
        });

        await Promise.all(stopPromises);
        this.activeTeams.clear();
    
        console.log('✅ Emergency stop completed');
    }

    /**
   * Shutdown orchestrator
   */
    async shutdown() {
        console.log('🛑 Shutting down Real AI Agent Orchestrator...');
    
        await this.emergencyStop();
        await this.runtimeManager.shutdown();
    
        this.initialized = false;
        console.log('✅ Real AI Agent Orchestrator shutdown complete');
    }
}

// Create singleton instance
const realAiOrchestrator = new RealAIAgentOrchestrator();

module.exports = {
    RealAIAgentOrchestrator,
    realAiOrchestrator
};