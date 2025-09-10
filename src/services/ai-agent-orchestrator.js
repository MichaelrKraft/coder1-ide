/**
 * AI Agent Orchestrator Service - JavaScript Version
 * Coordinates multi-agent workflows with real Claude API integration
 * Builds on existing Claude API service with agent templates and memory system
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const pLimit = require('p-limit').default || require('p-limit');
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Import Claude integrations for real code generation
const { ClaudeCodeAPI } = require('../integrations/claude-code-api');
// const ClaudeCodeExec = require('../integrations/claude-code-exec'); // Removed - agent dashboard deprecated

class AIAgentOrchestrator {
  constructor() {
    this.agentDefinitions = new Map();
    this.workflowTemplates = new Map();
    this.activeTeams = new Map();
    this.agentsPath = path.join(process.cwd(), '.coder1', 'agents');
    this.outputDirectory = path.join(process.cwd(), 'generated');
    
    // Initialize Claude integrations for real code generation
    this.claudeAPI = null;
    this.claudeCLI = null;
    
    // Check for API keys and authentication options
    const claudeCodeApiKey = process.env.CLAUDE_CODE_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const claudeCodeToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    
    // Priority 1: Try Claude CLI for CLAUDE_CODE_API_KEY (best for Claude Code Max plan)
    // Disabled - ClaudeCodeExec removed with agent dashboard
    // if (claudeCodeApiKey) {
    //   console.log('🔍 AI Agent Orchestrator: CLAUDE_CODE_API_KEY detected, initializing CLI integration...');
    //   try {
    //     this.claudeCLI = new ClaudeCodeExec({
    //       logger: console,
    //       timeout: 60000, // 60 second timeout for code generation
    //       implementationMode: true
    //     });
    //     console.log('✅ AI Agent Orchestrator: Claude CLI initialized for CLAUDE_CODE_API_KEY');
    //     console.log('🚀 AI Team will use Claude CLI with your Claude Code Max plan pricing');
    //   } catch (cliError) {
    //     console.warn('⚠️ Claude CLI initialization failed:', cliError.message);
    //     console.log('🔄 Falling back to API approach...');
    //   }
    // }
    
    // Priority 2: Use API SDK (fallback or for ANTHROPIC_API_KEY)
    const apiKey = anthropicApiKey;  // Only use ANTHROPIC_API_KEY for API calls
    
    if (apiKey && !this.claudeCLI) {
      // API keys work with SDK - fallback option
      this.claudeAPI = new ClaudeCodeAPI(apiKey, {
        logger: console,
        timeout: 60000 // 60 second timeout for code generation
      });
      console.log('✅ AI Agent Orchestrator: Claude API SDK initialized (fallback mode)');
      console.log('🚀 AI Team will use Claude API for automated code generation');
    } else if (claudeCodeToken) {
      // OAuth token detected but not optimal for automation
      console.log('✅ AI Agent Orchestrator: Claude Code OAuth token detected');
      console.warn('⚠️ OAuth tokens are for interactive Claude CLI, not automated AI Team');
      console.warn('💡 For AI Team, add CLAUDE_CODE_API_KEY to .env.local (preferred for Claude Code Max plan)');
      console.warn('💡 CLAUDE_CODE_API_KEY provides better pricing than ANTHROPIC_API_KEY');
    } else {
      console.warn('⚠️ AI Agent Orchestrator: No Claude API key found, will use simulation mode');
      console.warn('💡 Set CLAUDE_CODE_API_KEY in .env.local to enable real AI Team (Claude Code Max plan pricing)');
    }
    
    this.loadAgentDefinitions();
    this.loadWorkflowTemplates();
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
    } catch (error) {
      console.error('❌ Error loading workflow templates:', error);
    }
  }

  /**
   * Parse project requirements and determine appropriate workflow
   */
  parseProjectRequirement(requirement) {
    const context = {
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
  selectWorkflow(context) {
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
  async spawnTeam(requirement) {
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
    const agents = [];
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

    const teamSession = {
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

    // Start workflow execution (simulated for now)
    setTimeout(() => this.executeWorkflow(teamId), 1000);

    return teamSession;
  }

  /**
   * Execute workflow with sequential agent coordination (SIMPLIFIED VERSION)
   */
  async executeWorkflow(teamId) {
    const team = this.activeTeams.get(teamId);
    if (!team) return;

    const workflow = this.workflowTemplates.get(team.workflow);
    if (!workflow) return;

    team.status = 'planning';
    console.log(`📋 Executing workflow: ${workflow.name}`);

    try {
      // Enhanced workflow execution with streaming progress
      team.status = 'executing';
      
      // Start streaming progress simulation
      this.startStreamingWorkflow(teamId, workflow);

    } catch (error) {
      team.status = 'error';
      console.error(`❌ Team ${teamId} workflow failed:`, error);
    }
  }

  /**
   * Start streaming workflow execution with realistic progress updates
   * Provides granular, real-time progress simulation for enhanced user experience
   */
  async startStreamingWorkflow(teamId, workflow) {
    const team = this.activeTeams.get(teamId);
    if (!team) return;

    console.log(`🔄 Starting streaming workflow for team ${teamId}`);

    try {
      // Phase 1: Planning (0-15%)
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.updateTeamPhase(teamId, 'planning', 'Analyzing requirements and planning architecture');
      
      // Phase 2: Initialize agents (15-25%)
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.startAgentInitialization(teamId, workflow);
      
      // Phase 3: Execute workflow steps (25-90%) - WAIT for completion
      await new Promise(resolve => setTimeout(resolve, 5000));
      await this.executeWorkflowSteps(teamId, workflow); // await the async function
      
      // Phase 4: Integration & finalization (90-100%) - only after agents complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.finalizeWorkflow(teamId);
    } catch (error) {
      console.error(`❌ Workflow execution failed for team ${teamId}:`, error);
      team.status = 'error';
    }
  }

  /**
   * Update team phase with status and progress
   */
  updateTeamPhase(teamId, status, description) {
    const team = this.activeTeams.get(teamId);
    if (!team) return;

    team.status = status;
    console.log(`📊 [${teamId}] ${status}: ${description}`);
  }

  /**
   * Initialize all agents with realistic startup sequence
   */
  startAgentInitialization(teamId, workflow) {
    const team = this.activeTeams.get(teamId);
    if (!team) return;

    team.status = 'initializing';
    
    team.agents.forEach((agent, index) => {
      setTimeout(() => {
        agent.status = 'thinking';
        agent.currentTask = `Analyzing project requirements for ${agent.agentId} tasks`;
        agent.progress = 15 + Math.floor(Math.random() * 10); // 15-25%
        console.log(`🤖 Agent ${agent.agentName} started thinking`);
      }, index * 1000);
    });
  }

  /**
   * Execute workflow steps with streaming progress and deliverable passing
   */
  async executeWorkflowSteps(teamId, workflow) {
    const team = this.activeTeams.get(teamId);
    if (!team) return;

    team.status = 'executing';
    team.sharedDeliverables = {}; // Store deliverables to pass between agents
    
    // Create rate limiter - max 2 concurrent API calls to avoid rate limiting
    const limit = pLimit(2);
    
    // Create promises for each agent with rate limiting
    const agentPromises = workflow.sequence.map((workflowStep, index) => {
      const agent = team.agents.find(a => a.agentId === workflowStep.agent);
      
      if (!agent) {
        console.warn(`⚠️ No agent found for ${workflowStep.agent}`);
        return Promise.resolve();
      }

      // Return a limited promise
      return limit(async () => {
        // Pass previous deliverables as context
        agent.dependencies = team.sharedDeliverables;
        
        // Execute agent work
        await this.simulateAgentWork(agent, workflowStep, index);
        
        // Store deliverables for next agent
        if (agent.deliverables && agent.deliverables.length > 0) {
          team.sharedDeliverables[agent.agentId] = agent.deliverables;
          console.log(`📦 Stored ${agent.agentName} deliverables for downstream agents`);
        }
      });
    });
    
    // Execute all agents with rate limiting
    await Promise.all(agentPromises);
  }

  /**
   * Execute agent work with real Claude code generation
   */
  async simulateAgentWork(agent, workflowStep, agentIndex) {
    // Use real AI (CLI or API) if available, otherwise fall back to simulation
    if ((this.claudeCLI || this.claudeAPI) && this.agentDefinitions.has(agent.agentId)) {
      await this.executeRealAgentWork(agent, workflowStep, agentIndex);
    } else {
      // Fallback to simulation if no AI integration or agent definition
      this.executeSimulatedWork(agent, workflowStep, agentIndex);
    }
  }

  /**
   * Execute real agent work using Claude API
   */
  async executeRealAgentWork(agent, workflowStep, agentIndex) {
    const agentDef = this.agentDefinitions.get(agent.agentId);
    if (!agentDef) {
      console.warn(`⚠️ No agent definition found for ${agent.agentId}`);
      return this.executeSimulatedWork(agent, workflowStep, agentIndex);
    }

    try {
      agent.status = 'thinking';
      agent.currentTask = 'Analyzing requirements';
      agent.progress = 25;

      // Get the appropriate task template
      const taskTemplate = agentDef.taskTemplates?.[workflowStep.task] || 
                          agentDef.taskTemplates?.['default'] ||
                          `Implement ${workflowStep.task} for {requirement}`;

      // Replace template variables
      const team = Array.from(this.activeTeams.values()).find(t => 
        t.agents.some(a => a === agent)
      );
      const prompt = taskTemplate.replace('{requirement}', team?.projectRequirement || 'the project');

      // Build context from dependencies
      let dependencyContext = '';
      if (agent.dependencies && Object.keys(agent.dependencies).length > 0) {
        dependencyContext = '\n\nPrevious agent deliverables available:\n';
        for (const [agentId, deliverables] of Object.entries(agent.dependencies)) {
          const latestDeliverable = deliverables[deliverables.length - 1];
          if (latestDeliverable && latestDeliverable.content) {
            // Include a summary of the previous deliverable (limit to 500 chars)
            const contentPreview = latestDeliverable.content.substring(0, 500);
            dependencyContext += `\n${agentId} provided:\n\`\`\`\n${contentPreview}...\n\`\`\`\n`;
          }
        }
      }

      // Add system prompt and context
      const fullPrompt = `${agentDef.systemPrompt}\n\n${prompt}${dependencyContext}\n\nProvide complete, working code with comments.`;

      agent.status = 'working';
      agent.currentTask = 'Generating code';
      agent.progress = 50;

      console.log(`🤖 ${agent.agentName}: Generating code with Claude API...`);

      // Use Claude CLI (preferred) or API SDK for automation
      let response;
      if (this.claudeCLI) {
        console.log(`🖥️ Using Claude CLI for ${agent.agentName} (CLAUDE_CODE_API_KEY)`);
        response = await this.claudeCLI.executePrompt(fullPrompt, {
          maxTokens: agentDef.maxTokens || 2000,
          temperature: agentDef.temperature || 0.3
        });
      } else if (this.claudeAPI) {
        console.log(`🌐 Using Claude API SDK for ${agent.agentName} (fallback)`);
        response = await this.claudeAPI.sendMessage(fullPrompt, {
          maxTokens: agentDef.maxTokens || 2000,
          temperature: agentDef.temperature || 0.3
        });
      } else {
        throw new Error('No Claude integration available. Please set CLAUDE_CODE_API_KEY or ANTHROPIC_API_KEY in .env.local');
      }

      agent.progress = 75;
      agent.currentTask = 'Processing response';

      // Store generated code
      if (response) {
        agent.deliverables = agent.deliverables || [];
        agent.deliverables.push({
          type: 'code',
          content: response,
          task: workflowStep.task,
          timestamp: new Date()
        });

        // Save to file if specified
        if (workflowStep.outputs) {
          await this.saveAgentDeliverable(agent, response, workflowStep);
        }

        agent.status = 'completed';
        agent.currentTask = 'Code generation complete';
        agent.progress = 100;
        
        console.log(`✅ ${agent.agentName}: Successfully generated code (${response.length} characters)`);
      }
    } catch (error) {
      console.error(`❌ ${agent.agentName}: API call failed:`, error.message);
      agent.status = 'error';
      agent.currentTask = `Error: ${error.message}`;
      // Fall back to simulation on error
      this.executeSimulatedWork(agent, workflowStep, agentIndex);
    }
  }

  /**
   * Fallback simulation when API is not available
   */
  executeSimulatedWork(agent, workflowStep, agentIndex) {
    const taskSteps = this.generateTaskSteps(agent.agentId, workflowStep);
    let currentStep = 0;
    
    const progressInterval = setInterval(() => {
      if (currentStep < taskSteps.length) {
        const step = taskSteps[currentStep];
        agent.status = 'working';
        agent.currentTask = step.description;
        agent.progress = Math.min(25 + (currentStep / taskSteps.length) * 65, 90);
        
        console.log(`⚡ ${agent.agentName} (simulated): ${step.description} (${agent.progress}%)`);
        currentStep++;
      } else {
        clearInterval(progressInterval);
        agent.status = 'completing';
        agent.currentTask = 'Finalizing deliverables';
        agent.progress = 90;
      }
    }, 1500 + Math.random() * 1000);
  }

  /**
   * Save agent deliverable to file
   */
  async saveAgentDeliverable(agent, content, workflowStep) {
    try {
      // Ensure output directory exists
      if (!fs.existsSync(this.outputDirectory)) {
        await mkdir(this.outputDirectory, { recursive: true });
      }

      // Generate filename based on agent and task
      const filename = `${agent.agentId}_${workflowStep.task}_${Date.now()}.js`;
      const filepath = path.join(this.outputDirectory, filename);

      await writeFile(filepath, content, 'utf-8');
      console.log(`💾 Saved ${agent.agentName} deliverable to: ${filename}`);

      // Store file reference
      agent.generatedFiles = agent.generatedFiles || [];
      agent.generatedFiles.push(filepath);
    } catch (error) {
      console.error(`❌ Failed to save deliverable:`, error.message);
    }
  }

  /**
   * Generate realistic task steps for each agent type
   */
  generateTaskSteps(agentId, workflowStep) {
    const commonSteps = {
      'backend-engineer': [
        { description: 'Designing database schema and models' },
        { description: 'Setting up API endpoints and routes' },
        { description: 'Implementing business logic' },
        { description: 'Adding authentication and middleware' },
        { description: 'Writing API tests and validation' }
      ],
      'frontend-engineer': [
        { description: 'Setting up component architecture' },
        { description: 'Building user interface components' },
        { description: 'Implementing state management' },
        { description: 'Styling with CSS and responsive design' },
        { description: 'Adding interactions and event handlers' }
      ],
      'qa-testing': [
        { description: 'Creating test cases and scenarios' },
        { description: 'Setting up testing framework' },
        { description: 'Writing unit tests for components' },
        { description: 'Implementing integration tests' },
        { description: 'Running end-to-end testing' }
      ]
    };

    return commonSteps[agentId] || [
      { description: 'Analyzing requirements' },
      { description: 'Implementing core functionality' },
      { description: 'Testing and validation' },
      { description: 'Documentation and cleanup' }
    ];
  }

  /**
   * Finalize workflow with file generation
   */
  async finalizeWorkflow(teamId) {
    const team = this.activeTeams.get(teamId);
    if (!team) return;

    team.status = 'finalizing';
    
    // Mark all agents as completing
    team.agents.forEach(agent => {
      agent.status = 'completed';
      agent.progress = 100;
      agent.currentTask = 'Task completed successfully';
    });

    // Generate actual project files
    console.log(`📁 Generating project files for team ${teamId}...`);
    team.files = await this.generateProjectFiles(team);
    
    team.status = 'completed';
    console.log(`✅ Team ${teamId} completed workflow - Generated ${team.files.length} files`);
  }

  /**
   * Parse generated code to extract individual files
   */
  parseGeneratedCode(content, agentId) {
    const files = [];
    
    // Look for file markers in various formats
    // Matches: // File: name.js, /* File: name.js */, // name.js, etc.
    const fileMarkers = [
      /\/\/\s*File:\s*([^\n]+)/gi,           // // File: filename.js
      /\/\*\s*File:\s*([^\*]+)\*\//gi,       // /* File: filename.js */
      /\/\/\s*(\w+\.\w+)/gi,                 // // filename.js
      /```(?:javascript|js|typescript|tsx?)\s+([^\n]+)/gi,  // ```javascript filename.js
      /(?:export|import|class|function|const)\s+(?:default\s+)?(\w+)/gi  // Try to extract component names - added g flag
    ];
    
    // Try to split by file markers
    let foundFiles = false;
    for (const pattern of fileMarkers) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        foundFiles = true;
        break;
      }
      if (foundFiles) break;
    }
    
    // If we found file markers, split the content
    if (foundFiles) {
      // Split by any of the file patterns
      const splitPattern = /(?:\/\/\s*File:\s*[^\n]+|\/\*\s*File:\s*[^\*]+\*\/|\/\/\s*\w+\.\w+)/gi;
      const parts = content.split(splitPattern);
      const fileNames = content.match(splitPattern) || [];
      
      for (let i = 0; i < fileNames.length; i++) {
        const filename = fileNames[i].replace(/^[\/\*\s]+|[\*\/\s]+$/g, '').replace(/^File:\s*/i, '').trim();
        const code = parts[i + 1]?.trim();
        if (filename && code) {
          files.push({ 
            name: filename, 
            content: code 
          });
        }
      }
    }
    
    // If no file markers found, try to intelligently split based on content
    if (files.length === 0) {
      // For backend code, look for server/API patterns
      if (agentId === 'backend-engineer') {
        // Check if it's an Express server
        if (content.includes('express()') || content.includes('app.listen')) {
          files.push({ name: 'server.js', content });
        } else if (content.includes('router.') || content.includes('Router()')) {
          files.push({ name: 'routes.js', content });
        } else {
          files.push({ name: 'api.js', content });
        }
      }
      // For frontend code, look for React patterns
      else if (agentId === 'frontend-engineer') {
        // Try to extract React components
        const componentMatches = content.match(/(?:function|const)\s+(\w+)\s*(?:\(|=)/g);
        if (componentMatches && componentMatches.length > 1) {
          // Multiple components, try to split
          const components = content.split(/(?=(?:function|const)\s+\w+\s*(?:\(|=))/);
          components.forEach((comp, idx) => {
            if (comp.trim()) {
              const nameMatch = comp.match(/(?:function|const)\s+(\w+)/);
              const name = nameMatch ? `${nameMatch[1]}.tsx` : `component${idx}.tsx`;
              files.push({ name, content: comp.trim() });
            }
          });
        } else {
          files.push({ name: 'App.tsx', content });
        }
      }
      // For QA code
      else if (agentId === 'qa-testing') {
        files.push({ name: 'test.spec.js', content });
      }
      // Default fallback
      else {
        files.push({ name: `${agentId}-output.js`, content });
      }
    }
    
    return files;
  }

  /**
   * Generate real project files based on workflow and write to disk
   */
  async generateProjectFiles(team) {
    const files = [];
    
    try {
      // Ensure output directory exists
      if (!fs.existsSync(this.outputDirectory)) {
        fs.mkdirSync(this.outputDirectory, { recursive: true });
      }

      // Create project-specific directory
      const projectDir = path.join(this.outputDirectory, `project-${team.teamId}`);
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }

      // Use real generated code from agents instead of templates
      if (team.sharedDeliverables && Object.keys(team.sharedDeliverables).length > 0) {
        console.log('📝 Using real generated code from AI agents...');
        console.log('📦 Available deliverables:', Object.keys(team.sharedDeliverables));
        
        // Process backend engineer code
        if (team.sharedDeliverables['backend-engineer']) {
          const backendDeliverables = team.sharedDeliverables['backend-engineer'];
          console.log(`🔧 Backend deliverables count: ${backendDeliverables.length}`);
          
          for (const deliverable of backendDeliverables) {
            if (deliverable.content) {
              console.log(`📄 Processing backend deliverable, content length: ${deliverable.content.length}`);
              const parsedFiles = this.parseGeneratedCode(deliverable.content, 'backend-engineer');
              console.log(`🗂️ Parsed ${parsedFiles.length} files from backend code`);
              
              for (const file of parsedFiles) {
                const filepath = file.name.includes('/') ? file.name : `server/${file.name}`;
                console.log(`💾 Writing file: ${filepath}`);
                await this.writeProjectFile(projectDir, filepath, file.content, 'backend', 'backend-engineer', files);
              }
            } else {
              console.log('⚠️ Backend deliverable has no content');
            }
          }
        }
        
        // Process frontend engineer code
        if (team.sharedDeliverables['frontend-engineer']) {
          const frontendDeliverables = team.sharedDeliverables['frontend-engineer'];
          console.log(`🎨 Frontend deliverables count: ${frontendDeliverables.length}`);
          
          for (const deliverable of frontendDeliverables) {
            if (deliverable.content) {
              console.log(`📄 Processing frontend deliverable, content length: ${deliverable.content.length}`);
              const parsedFiles = this.parseGeneratedCode(deliverable.content, 'frontend-engineer');
              console.log(`🗂️ Parsed ${parsedFiles.length} files from frontend code`);
              
              for (const file of parsedFiles) {
                const filepath = file.name.includes('/') ? file.name : `src/${file.name}`;
                console.log(`💾 Writing file: ${filepath}`);
                await this.writeProjectFile(projectDir, filepath, file.content, 'frontend', 'frontend-engineer', files);
              }
            } else {
              console.log('⚠️ Frontend deliverable has no content');
            }
          }
        }
        
        // Process QA testing code
        if (team.sharedDeliverables['qa-testing']) {
          const qaDeliverables = team.sharedDeliverables['qa-testing'];
          console.log(`🧪 QA deliverables count: ${qaDeliverables.length}`);
          
          for (const deliverable of qaDeliverables) {
            if (deliverable.content) {
              console.log(`📄 Processing QA deliverable, content length: ${deliverable.content.length}`);
              const parsedFiles = this.parseGeneratedCode(deliverable.content, 'qa-testing');
              console.log(`🗂️ Parsed ${parsedFiles.length} files from QA code`);
              
              for (const file of parsedFiles) {
                const filepath = file.name.includes('/') ? file.name : `tests/${file.name}`;
                console.log(`💾 Writing file: ${filepath}`);
                await this.writeProjectFile(projectDir, filepath, file.content, 'test', 'qa-testing', files);
              }
            } else {
              console.log('⚠️ QA deliverable has no content');
            }
          }
        }
        
        console.log(`✅ Total files generated: ${files.length}`);
        if (files.length > 0) {
          console.log('📁 Files written to:', projectDir);
        }
        
        // Process any other agents
        for (const [agentId, deliverables] of Object.entries(team.sharedDeliverables)) {
          if (!['backend-engineer', 'frontend-engineer', 'qa-testing'].includes(agentId)) {
            for (const deliverable of deliverables) {
              if (deliverable.content) {
                const parsedFiles = this.parseGeneratedCode(deliverable.content, agentId);
                for (const file of parsedFiles) {
                  await this.writeProjectFile(projectDir, file.name, file.content, 'generated', agentId, files);
                }
              }
            }
          }
        }
        
        // Add a package.json if not generated
        if (!files.some(f => f.path.includes('package.json'))) {
          const packageJson = {
            name: `project-${team.teamId}`,
            version: "1.0.0",
            description: team.projectRequirement || "AI-generated project",
            scripts: {
              start: "node server/server.js",
              dev: "nodemon server/server.js",
              test: "jest"
            },
            dependencies: {
              express: "^4.18.0",
              react: "^18.2.0",
              "react-dom": "^18.2.0"
            }
          };
          await this.writeProjectFile(projectDir, 'package.json', JSON.stringify(packageJson, null, 2), 'config', 'system', files);
        }
      } else {
        console.log('⚠️ No deliverables found, generating default template files...');
        // Fallback to template generation if no deliverables
        if (team.context.projectType === 'crud-application') {
          await this.writeProjectFile(projectDir, 'README.md', `# ${team.projectRequirement}\n\nAI-generated project`, 'documentation', 'system', files);
        }
      }

      console.log(`📁 Generated ${files.length} files in ${projectDir}`);
      return files;

    } catch (error) {
      console.error('❌ Error generating project files:', error);
      return files;
    }
  }

  /**
   * Write a single project file and add to files array
   */
  async writeProjectFile(projectDir, relativePath, content, type, agent, files) {
    try {
      const fullPath = path.join(projectDir, relativePath);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write file
      fs.writeFileSync(fullPath, content, 'utf-8');
      
      // Add to files array
      files.push({
        path: relativePath,
        fullPath: fullPath,
        content: content,
        type: type,
        agent: agent,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📄 Created: ${relativePath}`);
    } catch (error) {
      console.error(`❌ Failed to write file ${relativePath}:`, error);
    }
  }

  /**
   * Generate React App component content
   */
  generateReactAppContent(team) {
    return `import React from 'react';
import './App.css';
import TodoList from './components/TodoList';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>📝 Todo App</h1>
        <p>Built by AI Team - ${team.workflow} workflow</p>
      </header>
      <main>
        <TodoList />
      </main>
    </div>
  );
}

export default App;
`;
  }

  /**
   * Generate TodoList component content
   */
  generateTodoListContent(team) {
    return `import React from 'react';
import { useTodos } from '../hooks/useTodos';
import TodoItem from './TodoItem';

const TodoList: React.FC = () => {
  const { todos, addTodo, toggleTodo, deleteTodo, newTodo, setNewTodo } = useTodos();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      addTodo(newTodo);
    }
  };

  return (
    <div className="todo-list">
      <form onSubmit={handleSubmit} className="todo-form">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo..."
          className="todo-input"
        />
        <button type="submit" className="add-button">
          Add Todo
        </button>
      </form>

      <div className="todos">
        {todos.length === 0 ? (
          <p className="empty-state">No todos yet. Add one above!</p>
        ) : (
          todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TodoList;
`;
  }

  /**
   * Generate TodoItem component content
   */
  generateTodoItemContent(team) {
    return `import React from 'react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete }) => {
  return (
    <div className={\`todo-item \${todo.completed ? 'completed' : ''}\`}>
      <label className="todo-checkbox">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
        />
        <span className="checkmark"></span>
      </label>
      
      <span className="todo-text">{todo.text}</span>
      
      <button 
        onClick={() => onDelete(todo.id)}
        className="delete-button"
        aria-label="Delete todo"
      >
        🗑️
      </button>
    </div>
  );
};

export default TodoItem;
`;
  }

  /**
   * Generate useTodos hook content
   */
  generateTodoHookContent(team) {
    return `import { useState, useEffect } from 'react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');

  // Load todos from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('todos');
    if (saved) {
      setTodos(JSON.parse(saved));
    }
  }, []);

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = (text: string) => {
    const newTodoItem: Todo = {
      id: Date.now().toString(),
      text: text.trim(),
      completed: false,
      createdAt: new Date(),
    };
    setTodos(prev => [...prev, newTodoItem]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  return {
    todos,
    addTodo,
    toggleTodo,
    deleteTodo,
    newTodo,
    setNewTodo,
  };
};
`;
  }

  /**
   * Generate API content
   */
  generateTodoApiContent(team) {
    return `// Todo API - Future backend integration
export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// Mock API for now - replace with real backend calls
export const todoApi = {
  async fetchTodos(): Promise<Todo[]> {
    // Simulate API call
    return JSON.parse(localStorage.getItem('todos') || '[]');
  },

  async createTodo(text: string): Promise<Todo> {
    const todo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: new Date(),
    };
    
    const todos = await this.fetchTodos();
    todos.push(todo);
    localStorage.setItem('todos', JSON.stringify(todos));
    
    return todo;
  },

  async updateTodo(id: string, updates: Partial<Todo>): Promise<Todo> {
    const todos = await this.fetchTodos();
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Todo not found');
    
    todos[index] = { ...todos[index], ...updates, updatedAt: new Date() };
    localStorage.setItem('todos', JSON.stringify(todos));
    
    return todos[index];
  },

  async deleteTodo(id: string): Promise<void> {
    const todos = await this.fetchTodos();
    const filtered = todos.filter(t => t.id !== id);
    localStorage.setItem('todos', JSON.stringify(filtered));
  }
};
`;
  }

  /**
   * Generate server content
   */
  generateServerContent(team) {
    return `const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
let todos = [
  {
    id: '1',
    text: 'Welcome to your AI-generated Todo App!',
    completed: false,
    createdAt: new Date().toISOString()
  }
];

// Routes
app.get('/api/todos', (req, res) => {
  res.json(todos);
});

app.post('/api/todos', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  const todo = {
    id: Date.now().toString(),
    text,
    completed: false,
    createdAt: new Date().toISOString()
  };

  todos.push(todo);
  res.status(201).json(todo);
});

app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const { completed, text } = req.body;
  
  const todo = todos.find(t => t.id === id);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });

  if (completed !== undefined) todo.completed = completed;
  if (text !== undefined) todo.text = text;
  todo.updatedAt = new Date().toISOString();

  res.json(todo);
});

app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  todos = todos.filter(t => t.id !== id);
  res.status(204).send();
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(\`🚀 Todo API server running on port \${PORT}\`);
});
`;
  }

  /**
   * Generate package.json content
   */
  generatePackageJsonContent(team) {
    return `{
  "name": "ai-generated-todo-app",
  "version": "1.0.0",
  "description": "Todo app generated by AI Team using ${team.workflow} workflow",
  "private": true,
  "dependencies": {
    "@types/node": "^16.18.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "typescript": "^4.9.0",
    "web-vitals": "^2.1.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "server": "node server/server.js",
    "dev": "concurrently \\"npm start\\" \\"npm run server\\""
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^13.5.0",
    "concurrently": "^7.6.0",
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
`;
  }

  /**
   * Generate README content
   */
  generateReadmeContent(team) {
    return `# 📝 AI-Generated Todo App

This todo application was generated by an AI development team using the **${team.workflow}** workflow.

## 🤖 Generated by AI Team

- **Project Requirement**: ${team.context.requirement}
- **Framework**: ${team.context.framework}
- **Workflow**: ${team.workflow}
- **Generated on**: ${new Date().toLocaleDateString()}

## 🚀 Quick Start

### Install dependencies
\`\`\`bash
npm install
\`\`\`

### Run development server
\`\`\`bash
npm start
\`\`\`

### Run with backend API
\`\`\`bash
npm run dev
\`\`\`

## ✨ Features

- ✅ Add, edit, and delete todos
- ✅ Mark todos as complete/incomplete  
- ✅ Persistent storage (localStorage)
- ✅ Responsive design
- ✅ TypeScript support
- ✅ Express.js backend API
- ✅ Full CRUD operations

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript
- **Backend**: Express.js + Node.js
- **Storage**: localStorage (frontend) + in-memory (backend)
- **Testing**: Jest + React Testing Library

## 🧪 Running Tests

\`\`\`bash
npm test
\`\`\`

## 📁 Project Structure

\`\`\`
src/
├── components/
│   ├── TodoList.tsx    # Main todo list component
│   └── TodoItem.tsx    # Individual todo item
├── hooks/
│   └── useTodos.ts     # Custom hook for todo logic
├── api/
│   └── todos.ts        # API integration layer
└── App.tsx             # Main application component

server/
└── server.js           # Express.js backend server
\`\`\`

## 🎯 Next Steps

1. Replace localStorage with real database (PostgreSQL, MongoDB)
2. Add user authentication
3. Deploy to production (Vercel, Heroku, AWS)
4. Add more advanced features (due dates, categories, etc.)

---

*Generated by AI Team Orchestrator - Real Claude API Integration*
`;
  }

  /**
   * Generate test content
   */
  generateTestContent(team) {
    return `import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

describe('Todo App', () => {
  test('renders todo app header', () => {
    render(<App />);
    const headerElement = screen.getByText(/Todo App/i);
    expect(headerElement).toBeInTheDocument();
  });

  test('can add a new todo', () => {
    render(<App />);
    
    const input = screen.getByPlaceholderText(/Add a new todo/i);
    const addButton = screen.getByText(/Add Todo/i);
    
    fireEvent.change(input, { target: { value: 'Test todo item' } });
    fireEvent.click(addButton);
    
    expect(screen.getByText('Test todo item')).toBeInTheDocument();
  });

  test('can toggle todo completion', () => {
    render(<App />);
    
    // Add a todo first
    const input = screen.getByPlaceholderText(/Add a new todo/i);
    fireEvent.change(input, { target: { value: 'Test todo' } });
    fireEvent.click(screen.getByText(/Add Todo/i));
    
    // Find and click the checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(checkbox).toBeChecked();
  });

  test('shows empty state when no todos', () => {
    render(<App />);
    expect(screen.getByText(/No todos yet/i)).toBeInTheDocument();
  });
});

// Generated by QA Testing Engineer
// Tests cover basic CRUD operations and user interactions
`;
  }

  /**
   * Get memory context from existing memory system
   */
  async getMemoryContext(requirement) {
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
  getTeamStatus(teamId) {
    return this.activeTeams.get(teamId) || null;
  }

  /**
   * Get all active teams
   */
  getAllTeams() {
    return Array.from(this.activeTeams.values());
  }

  /**
   * Send input to specific agent (placeholder)
   */
  async sendAgentInput(teamId, agentId, input) {
    const team = this.activeTeams.get(teamId);
    const agent = team?.agents.find(a => a.agentId === agentId);
    
    if (!team || !agent) return false;

    try {
      // For now, just log the input
      console.log(`📨 Input to ${agentId}: ${input}`);
      agent.output.push(`User: ${input}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to send input to ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Emergency stop - clean up all active teams
   */
  emergencyStop() {
    console.log(`🚨 Emergency stop - cleaning up ${this.activeTeams.size} teams`);
    this.activeTeams.clear();
  }
}

// Export singleton instance
const aiOrchestrator = new AIAgentOrchestrator();
module.exports = { aiOrchestrator, AIAgentOrchestrator };