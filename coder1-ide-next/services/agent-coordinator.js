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

const { getPuppeteerService } = require('./claude-cli-puppeteer');
const { CLIOutputParser } = require('./cli-output-parser');
const { getPromptGenerator } = require('./prompts/prompt-generator');
const EventEmitter = require('events');
const path = require('path');
const { promises: fs } = require('fs');

class AgentCoordinator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🔧 CIRCUIT BREAKER: Maximum retries to prevent infinite loops (Nov 25, 2025)
    this.MAX_PHASE_RETRIES = 3;
    this.MAX_WORKFLOW_RETRIES = 2;
    
    // Configuration
    this.options = {
      maxConcurrentWorkflows: options.maxConcurrentWorkflows || 2,
      defaultTimeout: options.defaultTimeout || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 3,
      workTreeRoot: options.workTreeRoot || path.join(process.cwd(), '.claude-parallel-dev'),
      enableLogging: options.enableLogging !== false,
      ...options
    };
    
    // Services
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
    this.activeWorkflows = new Map(); // workflowId -> WorkflowSession
    this.workflowTemplates = new Map(); // Load predefined workflows
    this.agentRoleDefinitions = new Map(); // role -> definition
    
    // Performance tracking
    this.stats = {
      totalWorkflows: 0,
      totalTasksCompleted: 0,
      totalAgentHours: 0, // Simulated time
      averageWorkflowTime: 0,
      successRate: 0
    };
    
    // 🔍 DIAGNOSTIC: Recursion detection (Nov 25, 2025)
    this.callCounters = {
      executeWorkflow: 0,
      executePhase: 0,
      executeTasksSequentially: 0,
      executeTasksInParallel: 0,
      executeAgentTask: 0
    };
    
    this.initializeAgentRoles();
    this.initializeWorkflowTemplates();
    
    // Terminal manager reference (will be set externally)
    this.agentTerminalManager = null;
    
    // Socket.IO instance for real-time events (will be set externally)
    this.io = options.io || null;
    
    // Setup puppeteer output listener to route to terminal manager
    this.setupPuppeteerListeners();
    
    console.log('🎭 Agent Coordinator initialized');
  }
  
  /**
   * Setup listeners for puppeteer output events
   */
  setupPuppeteerListeners() {
    console.log(`🔧 [COORDINATOR] setupPuppeteerListeners called`);
    console.log(`   puppeteer exists: ${!!this.puppeteer}`);
    console.log(`   puppeteer type: ${this.puppeteer?.constructor?.name}`);
    console.log(`   puppeteer has 'on' method: ${typeof this.puppeteer?.on === 'function'}`);
    
    if (this.puppeteer) {
      console.log(`✅ [COORDINATOR] Attaching 'agentOutput' event listener to puppeteer`);
      this.puppeteer.on('agentOutput', ({ agentId, output, timestamp }) => {
        try {
          // Route output to terminal manager if available
          if (this.agentTerminalManager) {
            console.log(`📺 Routing output from ${agentId} to terminal manager (${output?.length || 0} chars)`);
            console.log(`📝 Output type: ${typeof output}, trimmed length: ${output?.trim().length || 0}`);
            console.log(`📝 Output preview: ${output?.substring(0, 150) || 'EMPTY'}...`);
            
            // Safety check before calling
            if (output && output.trim().length > 0) {
              this.agentTerminalManager.appendToAgentTerminal(agentId, output);
            } else {
              console.warn(`⚠️ Skipping empty/null output for ${agentId}`);
            }
          }
          
          // Also emit for other listeners
          this.emit('agentOutput', { agentId, output, timestamp });
        } catch (error) {
          console.error(`❌ Error routing output for ${agentId}:`, error.message);
          console.error(`   Output type: ${typeof output}, length: ${output?.length}`);
          console.error(`   Stack:`, error.stack);
        }
      });
    }
  }
  
  /**
   * Set the agent terminal manager for output routing
   */
  setAgentTerminalManager(manager) {
    this.agentTerminalManager = manager;
    console.log('🔌 Agent terminal manager connected to coordinator');
  }

  /**
   * Helper method to list files in a directory
   * @param {string} dirPath - Directory path
   * @returns {Promise<Array<string>>} Array of file names
   */
  async listDirectoryFiles(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name);
    } catch (error) {
      console.log(`📁 Directory ${dirPath} not accessible: ${error.message}`);
      return [];
    }
  }

  /**
   * Initialize agent role definitions with capabilities and personas
   */
  initializeAgentRoles() {
    const roles = {
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
      this.agentRoleDefinitions.set(key, role);
    });
    
    console.log(`📋 Loaded ${this.agentRoleDefinitions.size} agent role definitions`);
  }

  /**
   * Initialize workflow templates for different types of projects
   */
  initializeWorkflowTemplates() {
    const templates = {
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
        estimatedTime: 10 // minutes
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
        estimatedTime: 45 // minutes
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
        estimatedTime: 30 // minutes
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
        estimatedTime: 35 // minutes
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
        estimatedTime: 25 // minutes
      }
    };
    
    Object.entries(templates).forEach(([key, template]) => {
      this.workflowTemplates.set(key, template);
    });
    
    console.log(`🔄 Loaded ${this.workflowTemplates.size} workflow templates`);
  }

  /**
   * Analyze requirement and suggest appropriate workflow
   * 
   * @param {string} requirement - Project requirement description
   * @returns {Object} Suggested workflow and reasoning
   */
  analyzeRequirement(requirement) {
    const req = requirement.toLowerCase();
    
    // Simple keyword-based matching (can be enhanced with ML)
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
    
    // Sort by score and return best match
    workflows.sort((a, b) => b.score - a.score);
    
    const bestMatch = workflows[0];
    const template = this.workflowTemplates.get(bestMatch.id);
    
    // Extract all unique agents from phases into a flat array
    // This prevents "Cannot read properties of undefined (reading 'map')" error
    // when spawning agents in claude-code-bridge.ts line 280
    const allAgents = template?.phases
      ? [...new Set(template.phases.flatMap(phase => phase.agents))]
      : [];
    
    return {
      workflowId: bestMatch.id,
      template: {
        ...template,
        agents: allAgents  // Add flattened agents array for spawning
      },
      confidence: bestMatch.score,
      reasoning: bestMatch.reasoning,
      alternatives: workflows.slice(1, 3)
    };
  }

  /**
   * Calculate score for workflow matching
   * 
   * @param {string} requirement - Requirement text
   * @param {Array<string>} keywords - Keywords to match
   * @returns {number} Score from 0-1
   */
  calculateScore(requirement, keywords) {
    let score = 0;
    const words = requirement.split(/\s+/);
    
    keywords.forEach(keyword => {
      if (requirement.includes(keyword)) {
        score += 0.2;
      }
      // Partial matches
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
   * 
   * @param {string} workflowId - Workflow template ID
   * @param {string} requirement - Project requirement
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Workflow execution result
   */
  async executeWorkflow(workflowId, requirement, options = {}) {
    // 🔍 DIAGNOSTIC: Recursion detection
    this.callCounters.executeWorkflow++;
    const currentCallCount = this.callCounters.executeWorkflow;
    console.log(`🚨 [RECURSION-DETECT] executeWorkflow call #${currentCallCount}`);
    if (currentCallCount > 5) {
      console.error(`🚨🚨🚨 INFINITE LOOP DETECTED! executeWorkflow called ${currentCallCount} times!`);
      console.error(`   This indicates an infinite recursion bug.`);
      console.error(`   Aborting to prevent server crash...`);
      throw new Error(`Infinite loop detected: executeWorkflow called ${currentCallCount} times`);
    }
    
    // 🔍 DIAGNOSTIC: Function entry
    console.log('🚀 [COORDINATOR] executeWorkflow CALLED');
    console.log('   workflowId:', workflowId);
    console.log('   requirement:', requirement.substring(0, 100) + '...');
    console.log('   options:', JSON.stringify(options, null, 2).substring(0, 200));
    
    // 🧹 CRITICAL FIX (Nov 25, 2025): Clean up ALL existing agents before spawning new ones
    // This prevents PTY leaks and ID mismatches from previous workflow runs
    console.log('🧹 [CLEANUP] Stopping all existing agents before new workflow...');
    try {
      if (this.puppeteer && typeof this.puppeteer.emergencyStopAll === 'function') {
        await this.puppeteer.emergencyStopAll();
        console.log('✅ [CLEANUP] All previous agents stopped successfully');
      }
    } catch (cleanupError) {
      console.warn('⚠️ [CLEANUP] Error stopping previous agents:', cleanupError.message);
      // Continue anyway - new workflow should still work
    }
    
    const template = this.workflowTemplates.get(workflowId);
    if (!template) {
      console.error('❌ [COORDINATOR] Workflow template not found:', workflowId);
      console.error('   Available templates:', Array.from(this.workflowTemplates.keys()));
      throw new Error(`Workflow template '${workflowId}' not found`);
    }
    
    console.log('✅ [COORDINATOR] Template found:', template.name);

    // CRITICAL FIX: Use sessionId from options if provided (for bridge coordination)
    // This ensures agent IDs match between early UI emission and actual execution
    const sessionId = options.sessionId || `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    console.log(`🆔 Coordinator using sessionId: ${sessionId} (from options: ${!!options.sessionId})`);
    
    const workflowSession = {
      sessionId,
      workflowId,
      template,
      requirement,
      detailedRequirements: options.detailedRequirements || null, // Store gathered requirements
      status: 'starting',
      currentPhase: null,
      currentPhaseIndex: 0,
      retryCount: 0, // 🔧 CIRCUIT BREAKER: Track workflow retries (Nov 25, 2025)
      phaseRetries: new Map(), // 🔧 Track retries per phase (Nov 25, 2025)
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
        timeout: options.timeout || this.options.defaultTimeout,
        ...options
      }
    };

    this.activeWorkflows.set(sessionId, workflowSession);
    this.stats.totalWorkflows++;

    console.log(`🚀 Starting workflow: ${template.name}`);
    console.log(`📋 Requirement: ${requirement}`);
    console.log(`⏱️ Estimated time: ${template.estimatedTime} minutes`);
    console.log(`🆔 Session ID: ${sessionId}`);
    console.log(`📁 Work tree root: ${workflowSession.options.workTreeRoot}`);
    console.log(`📊 Template phases: ${template.phases.length}`);

    try {
      // Initialize puppeteer service
      if (!this.puppeteer.isInitialized) {
        console.log(`🔧 Initializing CLI Puppeteer service...`);
        
        // 🔧 FIX (Nov 21, 2025): Add 5-second timeout to prevent indefinite hanging
        // If puppeteer hangs during test, assume it's already functional and continue
        try {
          await Promise.race([
            this.puppeteer.initialize(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Puppeteer init timeout')), 5000))
          ]);
          console.log(`✅ CLI Puppeteer service initialized`);
        } catch (initError) {
          console.warn(`⚠️ Puppeteer initialization timeout/error - assuming already functional:`, initError.message);
          // Force set initialized flag and continue
          this.puppeteer.isInitialized = true;
        }
      } else {
        console.log(`♻️ CLI Puppeteer service already initialized`);
      }

      // Create work tree directory
      console.log(`📁 Creating work tree directory: ${workflowSession.options.workTreeRoot}`);
      await fs.mkdir(workflowSession.options.workTreeRoot, { recursive: true });
      console.log(`✅ Work tree directory created successfully`);

      // 🔍 DIAGNOSTIC: About to start workflow execution
      console.log('🚀 [COORDINATOR] Starting workflow execution');
      console.log(`   Total phases: ${template.phases.length}`);
      console.log(`   Workflow name: ${template.name}`);
      console.log(`   Session ID: ${sessionId}`);

      // Execute phases sequentially
      for (let i = 0; i < template.phases.length; i++) {
        const phase = template.phases[i];
        workflowSession.currentPhase = phase;
        workflowSession.currentPhaseIndex = i;
        
        // 🔧 CIRCUIT BREAKER: Check phase retry limit (Nov 25, 2025)
        const phaseKey = `${i}-${phase.name}`;
        const phaseRetryCount = workflowSession.phaseRetries.get(phaseKey) || 0;
        
        if (phaseRetryCount >= this.MAX_PHASE_RETRIES) {
          console.error(`🚨 [CIRCUIT-BREAKER] Phase "${phase.name}" exceeded ${this.MAX_PHASE_RETRIES} retry attempts!`);
          console.error(`   Phase has failed repeatedly - aborting workflow to prevent infinite loop.`);
          throw new Error(`Phase "${phase.name}" exceeded retry limit (${this.MAX_PHASE_RETRIES} attempts)`);
        }
        
        console.log(`📍 Phase ${i + 1}/${template.phases.length}: ${phase.name}`);
        console.log(`👥 Phase agents: ${phase.agents.join(', ')}`);
        console.log(`🔄 Phase mode: ${phase.mode}`);
        console.log(`📝 Phase tasks: ${phase.tasks?.length || 0} tasks`);
        console.log(`🔄 Phase retry count: ${phaseRetryCount}/${this.MAX_PHASE_RETRIES}`);
        
        const phaseStartTime = new Date();
        
        try {
          const phaseResult = await this.executePhase(workflowSession, phase);
          const phaseEndTime = new Date();
          const phaseDuration = phaseEndTime - phaseStartTime;
          
          console.log(`✅ Phase ${phase.name} completed in ${phaseDuration}ms`);
          console.log(`📊 Phase outputs: ${phaseResult.outputs?.length || 0} results`);
          console.log(`🤖 Phase agents used: ${phaseResult.agents?.length || 0} agents`);
          
          // 🔧 CIRCUIT BREAKER: Reset phase retry counter on success
          workflowSession.phaseRetries.set(phaseKey, 0);
          
          workflowSession.progress.phases.push(phaseResult);
          
          // Update overall progress
          workflowSession.progress.overall = ((i + 1) / template.phases.length) * 100;
          console.log(`📈 Overall progress: ${workflowSession.progress.overall.toFixed(1)}%`);
          
          this.emit('phaseCompleted', {
            sessionId,
            phaseIndex: i,
            phase,
            result: phaseResult
          });
          
        } catch (phaseError) {
          // 🔧 CIRCUIT BREAKER: Check if error is fatal (should not retry)
          if (phaseError.isFatalError) {
            console.error(`🚨 [FATAL-ERROR] Phase "${phase.name}" failed with fatal error - no retry!`);
            console.error(`   Error: ${phaseError.message}`);
            if (phaseError.phaseData) {
              console.error(`   Phase data:`, JSON.stringify(phaseError.phaseData, null, 2));
            }
            console.error(`   Failing workflow immediately...`);
            throw phaseError; // Propagate immediately, no retry
          }
          
          // Non-fatal error: Use circuit breaker retry logic
          const newRetryCount = phaseRetryCount + 1;
          workflowSession.phaseRetries.set(phaseKey, newRetryCount);
          
          console.error(`❌ Phase "${phase.name}" failed (attempt ${newRetryCount}/${this.MAX_PHASE_RETRIES}):`, phaseError.message);
          
          if (newRetryCount >= this.MAX_PHASE_RETRIES) {
            console.error(`🚨 Phase "${phase.name}" exhausted all ${this.MAX_PHASE_RETRIES} retry attempts!`);
            console.error(`   Failing workflow to prevent infinite loop...`);
            throw phaseError; // Propagate to workflow-level catch
          } else {
            console.warn(`🔄 Retrying phase "${phase.name}" (attempt ${newRetryCount + 1}/${this.MAX_PHASE_RETRIES})...`);
            i--; // Retry the same phase by decrementing loop counter
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
      
      return {
        sessionId,
        status: 'completed',
        results: workflowSession.results,
        executionTime: workflowSession.endTime - workflowSession.startTime,
        agents: Array.from(workflowSession.agents.values())
      };

    } catch (error) {
      console.error(`❌ Workflow failed: ${sessionId}`, error);
      
      workflowSession.status = 'failed';
      workflowSession.endTime = new Date();
      workflowSession.results.errors.push({
        message: error.message,
        timestamp: new Date(),
        phase: workflowSession.currentPhase?.name
      });

      this.emit('workflowFailed', { sessionId, error });
      
      // Cleanup agents
      await this.cleanupWorkflowAgents(sessionId);
      
      throw error;
    }
  }

  /**
   * Execute a single phase of the workflow
   * 
   * @param {Object} workflowSession - Current workflow session
   * @param {Object} phase - Phase definition
   * @returns {Promise<Object>} Phase execution result
   */
  async executePhase(workflowSession, phase) {
    // 🔍 DIAGNOSTIC: Recursion detection
    this.callCounters.executePhase++;
    const currentCallCount = this.callCounters.executePhase;
    console.log(`🚨 [RECURSION-DETECT] executePhase call #${currentCallCount}`);
    if (currentCallCount > 10) {
      console.error(`🚨🚨🚨 INFINITE LOOP DETECTED! executePhase called ${currentCallCount} times!`);
      console.error(`   This indicates an infinite recursion bug.`);
      console.error(`   Aborting to prevent server crash...`);
      throw new Error(`Infinite loop detected: executePhase called ${currentCallCount} times`);
    }
    
    const { sessionId, requirement, options } = workflowSession;
    const phaseResult = {
      name: phase.name,
      status: 'starting',
      outputs: [],
      agents: [],
      startTime: new Date(),
      endTime: null
    };

    try {
      console.log(`🔄 Starting phase: ${phase.name}`);
      console.log(`📋 Phase requirement context: "${requirement}"`);
      console.log(`📁 Phase work tree: ${options.workTreeRoot}`);
      
      // Spawn agents for this phase if not already active
      const activeAgents = [];
      console.log(`👥 Processing ${phase.agents.length} required agents...`);
      
      for (const roleId of phase.agents) {
        let agent = workflowSession.agents.get(roleId);
        
        if (!agent) {
          const agentId = `${sessionId}-${roleId}`;
          const roleDefinition = this.agentRoleDefinitions.get(roleId);
          
          console.log(`🤖 Spawning NEW agent: ${roleDefinition?.name || roleId} (ID: ${agentId})`);
          console.log(`📝 Agent role definition found: ${!!roleDefinition}`);
          
          if (!roleDefinition) {
            throw new Error(`Role definition not found for '${roleId}' - cannot spawn agent`);
          }
          
          const agentContext = `${requirement}\n\nPhase: ${phase.name}`;
          console.log(`📋 Agent context: "${agentContext.substring(0, 100)}..."`);
          
          // 🔧 FIX (Nov 22, 2025): Create terminal session BEFORE spawning agent
          // This ensures the session exists when PTY onData fires with Claude CLI welcome message
          // Previously, welcome messages arrived before session creation and were dropped
          if (this.agentTerminalManager) {
            const terminalSession = this.agentTerminalManager.createAgentTerminalSession(
              agentId,
              workflowSession.sessionId,
              roleId
            );
            console.log(`📺 Pre-created terminal session for agent ${agentId} (before PTY spawn)`);
          }
          
          // 🔧 FIX (Nov 23, 2025): Validate agent spawn with error handling
          // CRITICAL: Agent spawning must succeed or phase should fail
          // Prevents silent failures that allow phases to complete without agents
          const agentSpawnStart = new Date();
          
          try {
            agent = await this.puppeteer.spawnAgent(
              agentId,
              roleId,
              agentContext,
              options.workTreeRoot
            );
            
            const agentSpawnTime = new Date() - agentSpawnStart;
            
            // Validate agent object
            if (!agent || !agent.agentId) {
              throw new Error(`spawnAgent returned invalid agent object: ${JSON.stringify(agent)}`);
            }
            
            if (!agent.workTreePath) {
              throw new Error(`Agent spawned without workTreePath`);
            }
            
            console.log(`✅ Agent ${agentId} spawned successfully in ${agentSpawnTime}ms`);
            console.log(`🏠 Agent work tree: ${agent.workTreePath}`);
            console.log(`📊 Agent status: ${agent.status}`);
            console.log(`📺 Terminal session ready - PTY output will be captured from first byte`);
            
            // 🔧 FIX (Nov 25, 2025): Emit Socket.IO event when agent spawns
            // This notifies frontend to create terminal connections for real-time output
            if (this.io) {
              const agentSpawnEvent = {
                teamId: workflowSession.sessionId,
                agents: [{
                  id: agentId,
                  name: roleDefinition.name,
                  role: roleId,
                  status: 'spawned',
                  workTreePath: agent.workTreePath
                }]
              };
              console.log(`📡 Emitting agent:spawn event for ${agentId}`);
              this.io.emit('agent:spawn', agentSpawnEvent);
            } else {
              console.warn(`⚠️ Socket.IO not available, cannot emit agent:spawn for ${agentId}`);
            }
            
          } catch (spawnError) {
            console.error(`❌ [CRITICAL] Failed to spawn ${roleId} agent (${agentId}):`, spawnError);
            console.error(`   Error type: ${spawnError.constructor.name}`);
            console.error(`   Error message: ${spawnError.message}`);
            console.error(`   Stack trace: ${spawnError.stack?.substring(0, 500) || 'N/A'}`);
            console.error(`   🚨 This will cause phase to FAIL (as intended)`);
            throw new Error(`Agent spawn failed for ${roleId}: ${spawnError.message}`);
          }
          
          workflowSession.agents.set(roleId, agent);
        } else {
          console.log(`♻️ Reusing existing agent: ${agent.agentId} (status: ${agent.status})`);
        }
        
        activeAgents.push(agent);
        phaseResult.agents.push(agent.agentId);
      }
      
      console.log(`✅ All phase agents ready: ${activeAgents.length} active agents`);
      
      // 🔍 VALIDATION: Ensure activeAgents array has agents (Nov 25, 2025)
      if (!activeAgents || activeAgents.length === 0) {
        console.error(`🚨 [VALIDATION] CRITICAL ERROR: No active agents available for phase "${phase.name}"!`);
        console.error(`   Phase requires: ${phase.agents.join(', ')}`);
        console.error(`   Active agents: ${activeAgents.length}`);
        console.error(`   This indicates agent spawning failed silently.`);
        throw new Error(`Phase "${phase.name}" has no active agents - cannot execute tasks`);
      }

      // 🔧 FIX (Nov 23, 2025): Enhanced diagnostic logging for phase execution
      // Helps identify which agents are being used and their status before task execution
      console.log(`====================================================`);
      console.log(`🔄 [PHASE] Executing phase: ${phase.name}`);
      console.log(`   📋 Mode: ${phase.mode}`);
      console.log(`   📝 Tasks: ${phase.tasks?.length || 0} total`);
      console.log(`   👥 Agents: ${activeAgents.length} active`);
      console.log(`====================================================`);
      
      // Log each active agent's details
      activeAgents.forEach((agent, index) => {
        console.log(`👤 Agent ${index + 1}/${activeAgents.length}:`);
        console.log(`   Role: ${agent.role}`);
        console.log(`   ID: ${agent.agentId}`);
        console.log(`   Status: ${agent.status}`);
        console.log(`   Work Tree: ${agent.workTreePath}`);
      });
      
      // 🔍 DIAGNOSTIC: Enhanced phase.tasks logging (Nov 25, 2025)
      console.log(`+====================================================+`);
      console.log(`|  🔍 [PHASE-DEBUG] TASK ANALYSIS                  |`);
      console.log(`+====================================================+`);
      console.log(`   📊 phase.tasks exists: ${!!phase.tasks}`);
      console.log(`   📊 phase.tasks type: ${typeof phase.tasks}`);
      console.log(`   📊 phase.tasks length: ${phase.tasks?.length || 0}`);
      console.log(`   📊 phase.tasks array: ${JSON.stringify(phase.tasks)}`);
      console.log(`   📊 phase.mode: ${phase.mode}`);
      console.log(`   📊 activeAgents.length: ${activeAgents.length}`);
      console.log(``);
      console.log(`📝 Task List:`);
      if (!phase.tasks || phase.tasks.length === 0) {
        console.log(`   ⚠️ WARNING: NO TASKS DEFINED - This will cause phase failure!`);
      } else {
        phase.tasks.forEach((task, index) => {
          console.log(`   ${index + 1}. "${task}"`);
        });
      }
      console.log(`====================================================`);
      
      // 🔍 VALIDATION: Ensure phase.tasks exists and has items (Nov 25, 2025)
      if (!phase.tasks || !Array.isArray(phase.tasks) || phase.tasks.length === 0) {
        console.error(`🚨 [VALIDATION] CRITICAL ERROR: Phase "${phase.name}" has no tasks defined!`);
        console.error(`   phase.tasks: ${JSON.stringify(phase.tasks)}`);
        console.error(`   phase.mode: ${phase.mode}`);
        console.error(`   This indicates a malformed workflow template.`);
        
        // 🔧 FALLBACK: Generate default task based on phase name and agents
        console.warn(`🔧 [FALLBACK] Generating default task for phase "${phase.name}"...`);
        const defaultTask = `Complete the ${phase.name.toLowerCase()} work for this project. Use your expertise as a ${phase.agents.join(' and ')} to deliver high-quality results.`;
        phase.tasks = [defaultTask];
        console.warn(`🔧 [FALLBACK] Generated task: "${defaultTask}"`);
      }
      
      const taskExecutionStart = new Date();
      
      if (phase.mode === 'parallel') {
        console.log(`⚡ Running tasks in PARALLEL across ${activeAgents.length} agents`);
        phaseResult.outputs = await this.executeTasksInParallel(activeAgents, phase.tasks, requirement, workflowSession);
      } else {
        console.log(`🔄 Running tasks SEQUENTIALLY across ${activeAgents.length} agents`);
        phaseResult.outputs = await this.executeTasksSequentially(activeAgents, phase.tasks, requirement, workflowSession);
      }
      
      const taskExecutionTime = new Date() - taskExecutionStart;
      console.log(`✅ Task execution completed in ${taskExecutionTime}ms`);
      console.log(`📊 Task results: ${phaseResult.outputs?.length || 0} outputs received`);
      
      // Log each task result summary
      if (phaseResult.outputs?.length > 0) {
        phaseResult.outputs.forEach((output, index) => {
          console.log(`📄 Result ${index + 1}: Agent ${output.agent || 'unknown'} - ${output.success ? '✅ SUCCESS' : '❌ FAILED'}`);
          if (output.success && output.output) {
            console.log(`   📝 Output length: ${output.output.length} chars`);
            console.log(`   🗂️ Task: ${output.task || 'unknown'}`);
          }
          if (!output.success && output.error) {
            console.log(`   ❌ Error: ${output.error}`);
          }
        });
      } else {
        console.log(`⚠️ WARNING: No task outputs received!`);
      }

      // 🔧 FIX (Nov 23, 2025): Fail phase if no successful task outputs
      // CRITICAL: Phase should NOT succeed if all agents failed or produced no outputs
      // This prevents downstream phases from executing when prerequisite work is incomplete
      if (!phaseResult.outputs || phaseResult.outputs.length === 0) {
        console.error(`❌ [WORKFLOW] Phase ${phase.name} FAILED: No successful task outputs`);
        console.error(`   👥 Agents in phase: ${phase.agents.join(', ')}`);
        console.error(`   📝 Tasks assigned: ${phase.tasks?.join(', ') || 'none'}`);
        console.error(`   🔄 Execution mode: ${phase.mode}`);
        console.error(`   💡 This usually means agents failed to spawn or execute tasks`);
        
        phaseResult.status = 'failed';
        phaseResult.endTime = new Date();
        phaseResult.error = `No successful task outputs - all ${phase.agents.length} agent(s) failed or did not execute`;
        
        // 🔧 CIRCUIT BREAKER: Mark as fatal error - do not retry (Nov 25, 2025)
        const error = new Error(`Phase "${phase.name}" failed: No successful outputs from ${phase.agents.length} agent(s)`);
        error.isFatalError = true; // Prevent automatic retries
        error.phaseData = {
          phaseName: phase.name,
          agents: phase.agents,
          tasks: phase.tasks,
          mode: phase.mode,
          outputsReceived: phaseResult.outputs?.length || 0
        };
        throw error;
      }

      phaseResult.status = 'completed';
      phaseResult.endTime = new Date();
      
      console.log(`✅ Phase completed: ${phase.name}`);
      
      return phaseResult;

    } catch (error) {
      console.error(`❌ Phase failed: ${phase.name}`, error);
      
      phaseResult.status = 'failed';
      phaseResult.endTime = new Date();
      phaseResult.error = error.message;
      
      throw error;
    }
  }

  /**
   * Execute tasks in parallel across multiple agents
   * 
   * @param {Array} agents - Available agents
   * @param {Array} tasks - Tasks to execute
   * @param {string} context - Context for tasks
   * @returns {Promise<Array>} Task results
   */
  async executeTasksInParallel(agents, tasks, context, workflowSession = null) {
    // 🔍 DIAGNOSTIC: Enhanced logging for debugging (Nov 25, 2025)
    console.log(`=======================================================`);
    console.log(`⚡ [PARALLEL-EXEC] ENTRY - executeTasksInParallel called`);
    console.log(`   📊 Tasks count: ${tasks?.length || 0}`);
    console.log(`   📊 Agents count: ${agents?.length || 0}`);
    console.log(`   📊 Tasks array: ${JSON.stringify(tasks)}`);
    console.log(`   📊 Context: "${context?.substring(0, 100)}..."`);
    console.log(`   📊 Has workflowSession: ${!!workflowSession}`);
    console.log(`   📊 Call stack trace:`);
    console.trace('executeTasksInParallel called from:');
    console.log(`=======================================================`);
    
    const taskPromises = agents.map((agent, index) => {
      const task = tasks[index] || tasks[0]; // Reuse tasks if fewer than agents
      const roleDefinition = this.agentRoleDefinitions.get(agent.role);
      
      // Generate detailed prompt if requirements object available
      let prompt;
      if (workflowSession?.detailedRequirements) {
        console.log(`📋 Generating detailed ${agent.role} prompt from requirements...`);
        prompt = this.promptGenerator.generate(
          agent.role,
          workflowSession.detailedRequirements,
          {
            workTreePath: agent.workTreePath || workflowSession.options.workTreeRoot,
            branchName: agent.branchName || 'main',
            currentTask: task
          }
        );
        console.log(`✅ Generated ${prompt.length} character detailed prompt`);
      } else {
        // Fallback to simple prompt if no requirements
        console.log(`⚠️ No detailed requirements, using simple prompt for ${agent.role}`);
        prompt = `Task: ${task}\nContext: ${context}\nRole: ${roleDefinition.persona}\n\nPlease complete this task with your expertise. Provide clear, actionable output including any code, configurations, or recommendations.`;
      }

      // 🔧 FIX (Nov 24, 2025): Add staggered delay to prevent PTY conflicts
      // When multiple agents start simultaneously, their PTYs can interfere
      // Frontend starts immediately (0s), Backend starts 3s later
      return new Promise(resolve => {
        const delayMs = index * 3000; // 3 second stagger between each agent
        console.log(`⏳ Agent ${agent.role} will start in ${delayMs}ms (${index === 0 ? 'immediate' : `${delayMs/1000}s delay`})`);
        
        setTimeout(async () => {
          console.log(`🚀 Starting ${agent.role} agent now...`);
          const result = await this.executeAgentTask(agent, prompt, task);
          resolve(result);
        }, delayMs);
      });
    });

    const results = await Promise.all(taskPromises);
    
    // 🔍 DIAGNOSTIC: Exit logging
    console.log(`=======================================================`);
    console.log(`✅ [PARALLEL-EXEC] EXIT - executeTasksInParallel completed`);
    console.log(`   📊 Total results: ${results.length}`);
    console.log(`   📊 Successful results: ${results.filter(r => r.success).length}`);
    console.log(`   📊 Failed results: ${results.filter(r => !r.success).length}`);
    console.log(`=======================================================`);
    
    // Filter successful results
    return results.filter(result => result.success);
  }

  /**
   * Execute tasks sequentially, passing results between agents
   * 
   * @param {Array} agents - Available agents  
   * @param {Array} tasks - Tasks to execute
   * @param {string} context - Context for tasks
   * @returns {Promise<Array>} Task results
   */
  async executeTasksSequentially(agents, tasks, context, workflowSession = null) {
    // 🔍 DIAGNOSTIC: Enhanced logging for debugging (Nov 25, 2025)
    console.log(`====================================================`);
    console.log(`🔄 [SEQUENTIAL-EXEC] ENTRY - executeTasksSequentially called`);
    console.log(`   📊 Tasks count: ${tasks?.length || 0}`);
    console.log(`   📊 Agents count: ${agents?.length || 0}`);
    console.log(`   📊 Tasks array: ${JSON.stringify(tasks)}`);
    console.log(`   📊 Context: "${context?.substring(0, 100)}..."`);
    console.log(`   📊 Has workflowSession: ${!!workflowSession}`);
    console.log(`   📊 Call stack trace:`);
    console.trace('executeTasksSequentially called from:');
    console.log(`====================================================`);
    
    const results = [];
    let previousResult = null;
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const agent = agents[i % agents.length]; // Round-robin if more tasks than agents
      const roleDefinition = this.agentRoleDefinitions.get(agent.role);
      
      // Generate detailed prompt if requirements object available
      let prompt;
      if (workflowSession?.detailedRequirements) {
        console.log(`📋 Generating detailed ${agent.role} prompt from requirements (task ${i+1}/${tasks.length})...`);
        prompt = this.promptGenerator.generate(
          agent.role,
          workflowSession.detailedRequirements,
          {
            workTreePath: agent.workTreePath || workflowSession.options.workTreeRoot,
            branchName: agent.branchName || 'main',
            currentTask: task
          }
        );
        
        // TEMPORARY FIX: Previous context causes Claude CLI to hang when passed as argument
        // Agents can still see previous work via files in the shared work tree directory
        // TODO: Implement proper context passing that Claude CLI can handle
        // if (previousResult && previousResult.success) {
        //   prompt += `\n\n## Previous Work Completed\n${previousResult.output.substring(0, 1000)}`;
        // }
        
        console.log(`✅ Generated ${prompt.length} character detailed prompt with ${previousResult ? 'previous context' : 'no context'}`);
      } else {
        // Fallback to simple prompt if no requirements
        console.log(`⚠️ No detailed requirements, using simple prompt for ${agent.role} (task ${i+1}/${tasks.length})`);
        prompt = `Task: ${task}\nContext: ${context}\nRole: ${roleDefinition.persona}`;

        // Add previous result as context for subsequent tasks
        if (previousResult && previousResult.success) {
          prompt += `\n\nPrevious work completed: ${previousResult.output.substring(0, 1000)}`;
        }

        prompt += `\n\nPlease complete this task with your expertise. Provide clear, actionable output including any code, configurations, or recommendations.`;
      }

      const result = await this.executeAgentTask(agent, prompt, task);
      results.push(result);
      
      if (result.success) {
        previousResult = result;
      }
    }
    
    // 🔍 DIAGNOSTIC: Exit logging
    console.log(`====================================================`);
    console.log(`✅ [SEQUENTIAL-EXEC] EXIT - executeTasksSequentially completed`);
    console.log(`   📊 Results count: ${results.length}`);
    console.log(`   📊 Successful results: ${results.filter(r => r.success).length}`);
    console.log(`   📊 Failed results: ${results.filter(r => !r.success).length}`);
    console.log(`====================================================`);
    
    return results;
  }

  /**
   * Execute a single task with an agent
   * 
   * @param {Object} agent - Agent session
   * @param {string} prompt - Task prompt
   * @param {string} taskName - Task name for tracking
   * @returns {Promise<Object>} Task result
   */
  async executeAgentTask(agent, prompt, taskName) {
    const startTime = Date.now();
    
    try {
      // 🔍 DIAGNOSTIC: Enhanced sendToAgent logging (Nov 25, 2025)
      console.log(`+=========================================================+`);
      console.log(`| 🔍 [SEND-TO-AGENT] DIAGNOSTIC CHECKPOINT         |`);
      console.log(`+=========================================================+`);
      console.log(`📤 Sending task to ${agent.role} agent (${agent.agentId}): "${taskName}"`);
      console.log(`🏠 Agent work directory: ${agent.workTreePath}`);
      console.log(`📋 Agent status: ${agent.status}`);
      console.log(`👥 Agent role: ${agent.role}`);
      console.log(`🆔 Agent ID: ${agent.agentId}`);
      console.log(``);
      console.log(`💡 [VALIDATION CHECKS]`);
      console.log(`   ✅ Agent object exists: ${!!agent}`);
      console.log(`   ✅ Agent ID valid: ${!!agent.agentId} ("${agent.agentId}")`);
      console.log(`   ✅ Puppeteer service exists: ${!!this.puppeteer}`);
      console.log(`   ✅ sendToAgent function exists: ${typeof this.puppeteer.sendToAgent === 'function'}`);
      console.log(``);
      console.log(`💬 [PROMPT DETAILS]`);
      console.log(`   Length: ${prompt.length} chars`);
      console.log(`   Empty: ${prompt.length === 0}`);
      console.log(`   Type: ${typeof prompt}`);
      console.log(`   Preview (first 300 chars):`);
      console.log(`   "${prompt.substring(0, 300)}${prompt.length > 300 ? '...' : ''}"`);

      console.log(`============================================================`);
      
      console.log(`🚀 [EXECUTING] Calling puppeteer.sendToAgent()...`);
      console.log(`   Agent ID: ${agent.agentId}`);
      console.log(`   Prompt length: ${prompt.length}`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);
      
      const response = await this.puppeteer.sendToAgent(agent.agentId, prompt);
      
      console.log(`📥 Received response from ${agent.role} agent`);
      console.log(`📊 Response length: ${response?.length || 0} chars`);
      console.log(`📝 Response preview: "${response?.substring(0, 300) || 'No response'}..."`);
      
      const parsed = this.outputParser.parseContent(response);
      console.log(`🔧 Parsed content: ${parsed ? 'Success' : 'Failed'}`);
      
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ ${agent.role} completed: ${taskName} (${executionTime}ms)`);
      
      // Check if the agent created any files
      const workTreePath = agent.workTreePath;
      try {
        const files = await this.listDirectoryFiles(workTreePath);
        console.log(`📁 Files in agent work tree (${workTreePath}): ${files.length} files`);
        if (files.length > 0) {
          console.log(`📄 Created files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
        } else {
          console.log(`⚠️ WARNING: No files created in agent work tree!`);
        }
      } catch (fileError) {
        console.log(`⚠️ Could not check agent work tree files: ${fileError.message}`);
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
        error: error.message,
        success: false,
        executionTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Synthesize results from all phases into final summary
   * 
   * @param {Object} workflowSession - Workflow session
   * @returns {Promise<Object>} Synthesized results
   */
  async synthesizeResults(workflowSession) {
    console.log(`🔬 Synthesizing results for workflow: ${workflowSession.sessionId}`);
    
    // Collect all outputs
    const allOutputs = [];
    const allFiles = [];
    
    workflowSession.progress.phases.forEach(phase => {
      if (phase.outputs) {
        phase.outputs.forEach(output => {
          if (output.success) {
            allOutputs.push(output);
            
            // Extract file operations
            if (output.parsed && output.parsed.files) {
              allFiles.push(...output.parsed.files);
            }
          }
        });
      }
    });

    // Generate summary with architect agent if available
    let summary = `Workflow completed: ${workflowSession.template.name}

Requirement: ${workflowSession.requirement}

Phases executed:
${workflowSession.progress.phases.map((phase, i) => 
  `${i + 1}. ${phase.name} - ${phase.status}`
).join('\n')}

Total outputs: ${allOutputs.length}
Files modified: ${allFiles.length}
Execution time: ${((workflowSession.endTime || new Date()) - workflowSession.startTime) / 1000}s`;

    // Try to get a more sophisticated summary from an architect agent
    try {
      const architectAgent = Array.from(workflowSession.agents.values())
        .find(agent => agent.role === 'architect' || agent.role === 'fullstack');
      
      if (architectAgent) {
        const summaryPrompt = `Please provide a comprehensive summary of this completed workflow:

Original requirement: ${workflowSession.requirement}
Workflow: ${workflowSession.template.name}

Key outputs:
${allOutputs.slice(0, 3).map(output => 
  `- ${output.task}: ${output.output.substring(0, 200)}...`
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

    // Update workflow session results
    workflowSession.results.outputs = allOutputs;
    workflowSession.results.files = allFiles;

    return {
      summary,
      totalOutputs: allOutputs.length,
      totalFiles: allFiles.length,
      executionTime: (workflowSession.endTime || new Date()) - workflowSession.startTime,
      phases: workflowSession.progress.phases.length
    };
  }

  /**
   * Get workflow status and progress
   * 
   * @param {string} sessionId - Workflow session ID
   * @returns {Object|null} Workflow status
   */
  getWorkflowStatus(sessionId) {
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
      executionTime: workflow.endTime ? 
        workflow.endTime - workflow.startTime : 
        Date.now() - workflow.startTime
    };
  }

  /**
   * Stop a workflow and cleanup resources
   * 
   * @param {string} sessionId - Workflow session ID
   * @returns {Promise} Resolves when workflow is stopped
   */
  async stopWorkflow(sessionId) {
    const workflow = this.activeWorkflows.get(sessionId);
    if (!workflow) {
      return;
    }

    console.log(`🛑 Stopping workflow: ${sessionId}`);
    
    workflow.status = 'stopping';
    
    // Stop all agents
    await this.cleanupWorkflowAgents(sessionId);
    
    workflow.status = 'stopped';
    workflow.endTime = new Date();
    
    this.activeWorkflows.delete(sessionId);
    
    this.emit('workflowStopped', { sessionId });
  }

  /**
   * Cleanup agents for a specific workflow
   * 
   * @param {string} sessionId - Workflow session ID  
   * @returns {Promise} Resolves when agents are cleaned up
   */
  async cleanupWorkflowAgents(sessionId) {
    const workflow = this.activeWorkflows.get(sessionId);
    if (!workflow) {
      return;
    }

    const stopPromises = Array.from(workflow.agents.values()).map(agent => 
      this.puppeteer.stopAgent(agent.agentId)
    );

    await Promise.all(stopPromises);
  }

  /**
   * Get available workflow templates
   * 
   * @returns {Array} Array of workflow templates
   */
  getAvailableWorkflows() {
    return Array.from(this.workflowTemplates.entries()).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description,
      estimatedTime: template.estimatedTime,
      phases: template.phases.length,
      agents: [...new Set(template.phases.flatMap(p => p.agents))]
    }));
  }

  /**
   * Get coordinator statistics
   * 
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      activeWorkflows: this.activeWorkflows.size,
      availableTemplates: this.workflowTemplates.size,
      availableRoles: this.agentRoleDefinitions.size,
      puppeteerStats: this.puppeteer.getStats()
    };
  }
}

// Singleton instance with global registry for cross-module stability
// This prevents multiple instances when Next.js HMR reloads modules
let coordinatorInstance = null;

function getCoordinatorService(options = {}) {
  // Check global registry first (survives module reloads)
  if (global.__AGENT_COORDINATOR__) {
    console.log('✅ Using existing AgentCoordinator from global registry');
    coordinatorInstance = global.__AGENT_COORDINATOR__;
    return coordinatorInstance;
  }
  
  // Create new instance if none exists
  if (!coordinatorInstance) {
    coordinatorInstance = new AgentCoordinator(options);
    // Store in global registry
    global.__AGENT_COORDINATOR__ = coordinatorInstance;
    console.log('🌍 Registered AgentCoordinator in global registry');
  }
  
  return coordinatorInstance;
}

module.exports = {
  AgentCoordinator,
  getCoordinatorService
};