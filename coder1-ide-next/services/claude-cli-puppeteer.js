/**
 * Claude CLI Puppeteer Service
 * 
 * Orchestrates multiple Claude CLI instances through PTY sessions for true AI agent automation.
 * Each agent runs in its own PTY with Claude CLI, enabling parallel execution and real conversations.
 * 
 * Key Features:
 * - Spawn multiple Claude CLI instances via PTY
 * - Parse streaming output in real-time
 * - Maintain conversation context per agent
 * - Handle errors and recovery gracefully
 * - Support both parallel and sequential execution
 */

const { spawn } = require('node-pty');
const { spawn: spawnChild } = require('child_process');
const EventEmitter = require('events');
const path = require('path');
const { promises: fs } = require('fs');
const fss = require('fs');  // Regular sync fs for file operations

class ClaudeCLIPuppeteer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.claudeCliPath = options.claudeCliPath || '/opt/homebrew/bin/claude';
    this.maxConcurrentAgents = options.maxConcurrentAgents || 3;
    this.outputBufferSize = options.outputBufferSize || 10000; // chars
    this.responseTimeout = options.responseTimeout || 120000; // 2 minutes
    this.retryAttempts = options.retryAttempts || 3;
    
    // State management
    this.agents = new Map(); // agentId -> AgentSession
    this.activeTeams = new Map(); // teamId -> TeamSession
    this.isInitialized = false;
    
    // Performance tracking
    this.stats = {
      totalAgentsSpawned: 0,
      totalCommandsSent: 0,
      totalResponsesReceived: 0,
      averageResponseTime: 0,
      errors: 0
    };
    
    console.log('🤖 Claude CLI Puppeteer initialized');
  }

  /**
   * Initialize the puppeteer service
   * Verify Claude CLI is available and working
   */
  async initialize() {
    try {
      // Check if Claude CLI exists
      await fs.access(this.claudeCliPath);
      
      // Test spawn a single Claude session to verify it works
      console.log('🔧 Testing Claude CLI with --version command...');
      const testPty = spawn(this.claudeCliPath, ['--version'], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        env: process.env
      });
      
      return new Promise((resolve, reject) => {
        let output = '';
        let errorOutput = '';
        
        const timeout = setTimeout(() => {
          console.log('⏰ Claude CLI test timeout after 30 seconds');
          console.log(`📄 Output received: "${output}"`);
          console.log(`❌ Error output: "${errorOutput}"`);
          testPty.kill();
          reject(new Error('Claude CLI test timeout - check authentication'));
        }, 30000); // Increased timeout to 30 seconds
        
        testPty.on('data', (data) => {
          const chunk = data.toString();
          output += chunk;
          console.log(`📥 Claude CLI output: "${chunk}"`);
          
          // Check for various success indicators
          if (output.includes('claude') || output.includes('Claude') || output.includes('1.0.')) {
            console.log(`✅ Claude CLI test successful - found indicator in output`);
            clearTimeout(timeout);
            testPty.kill();
            this.isInitialized = true;
            console.log('✅ Claude CLI Puppeteer initialized successfully');
            
            // Start health monitoring if interactive mode is enabled
            if (process.env.ENABLE_INTERACTIVE_CLI === 'true') {
              this.startSessionHealthMonitoring();
            }
            
            resolve();
          }
        });
        
        testPty.on('stderr', (data) => {
          const chunk = data.toString();
          errorOutput += chunk;
          console.log(`🚨 Claude CLI stderr: "${chunk}"`);
        });
        
        testPty.on('exit', (code) => {
          console.log(`🔚 Claude CLI test exited with code: ${code}`);
          console.log(`📄 Final output: "${output}"`);
          console.log(`❌ Final error output: "${errorOutput}"`);
          
          clearTimeout(timeout);
          if (code === 0 && !this.isInitialized) {
            // If exit code is 0 but we didn't detect success, still consider it successful
            console.log('✅ Claude CLI test successful - exit code 0');
            this.isInitialized = true;
            resolve();
          } else if (code !== 0 && !this.isInitialized) {
            reject(new Error(`Claude CLI test failed with code ${code}. Output: "${output}", Error: "${errorOutput}"`));
          }
        });
      });
      
    } catch (error) {
      console.error('❌ Claude CLI Puppeteer initialization failed:', error);
      throw new Error(`Claude CLI not found at ${this.claudeCliPath}. Please install Claude CLI or update path.`);
    }
  }

  /**
   * Spawn a team of AI agents for a project requirement
   * 
   * @param {string} teamId - Unique team identifier
   * @param {string} requirement - Project requirement description
   * @param {Array<string>} agentRoles - Array of agent roles to spawn
   * @param {string} workTreeRoot - Base path for git work trees
   * @returns {Promise<Object>} Team session object
   */
  async spawnTeam(teamId, requirement, agentRoles = ['frontend', 'backend'], workTreeRoot) {
    if (!this.isInitialized) {
      throw new Error('Puppeteer service not initialized. Call initialize() first.');
    }

    if (this.activeTeams.size >= this.maxConcurrentAgents) {
      throw new Error(`Maximum concurrent teams reached (${this.maxConcurrentAgents})`);
    }

    console.log(`🚀 Spawning AI team: ${teamId}`);
    console.log(`📋 Requirement: ${requirement}`);
    console.log(`👥 Agents: ${agentRoles.join(', ')}`);

    const teamSession = {
      teamId,
      requirement,
      agentRoles,
      workTreeRoot,
      status: 'spawning',
      agents: new Map(),
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      progress: {
        overall: 0,
        planning: 0,
        development: 0,
        testing: 0
      }
    };

    this.activeTeams.set(teamId, teamSession);

    try {
      // Spawn agents in parallel
      const agentPromises = agentRoles.map(role => 
        this.spawnAgent(`${teamId}-${role}`, role, requirement, workTreeRoot)
      );

      const agents = await Promise.all(agentPromises);
      
      // Add agents to team session
      agents.forEach(agent => {
        teamSession.agents.set(agent.agentId, agent);
      });

      teamSession.status = 'ready';
      teamSession.startedAt = new Date();
      
      console.log(`✅ Team ${teamId} spawned successfully with ${agents.length} agents`);
      
      this.emit('teamSpawned', teamSession);
      
      return teamSession;

    } catch (error) {
      console.error(`❌ Failed to spawn team ${teamId}:`, error);
      teamSession.status = 'error';
      
      // Cleanup any partially created agents
      await this.cleanupTeam(teamId);
      
      throw error;
    }
  }

  /**
   * Spawn a single AI agent with Claude CLI
   * 
   * @param {string} agentId - Unique agent identifier  
   * @param {string} role - Agent role (frontend, backend, etc.)
   * @param {string} context - Initial context/requirement
   * @param {string} workTreeRoot - Working directory path
   * @returns {Promise<Object>} Agent session object
   */
  async spawnAgent(agentId, role, context, workTreeRoot) {
    if (this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} already exists`);
    }

    console.log(`🤖 Spawning agent: ${agentId} (${role})`);

    const agentWorkTree = path.join(workTreeRoot, role);
    
    // Ensure work tree directory exists
    try {
      await fs.mkdir(agentWorkTree, { recursive: true });
    } catch (error) {
      console.warn(`Work tree directory already exists: ${agentWorkTree}`);
    }

    console.log(`🎮 Using --print mode with stdin for reliable file creation`);

    const agentSession = {
      agentId,
      role,
      context,
      workTreePath: agentWorkTree,
      status: 'initializing',
      currentTask: `Setting up ${role} development environment...`,
      progress: 0,
      conversationHistory: [],
      outputBuffer: '',
      responseBuffer: '',
      lastActivity: new Date(),
      completedTasks: [],
      pty: null,
      responseResolvers: [],
      isWaitingForResponse: false,
      lastOutputTime: Date.now(),
      silenceCount: 0
    };

    try {
      // Note: For actual task execution, we spawn separate child_process instances
      // This PTY is mainly for agent initialization and tracking
      const cliArgs = ['--print', '--dangerously-skip-permissions'];
      
      console.log(`🚀 Spawning Claude CLI with --print flag for agent ${agentId}`);
      console.log(`📝 CLI Args: ${cliArgs.join(' ')}`);
      
      const pty = spawn(this.claudeCliPath, cliArgs, {
        name: 'xterm-color',
        cols: 100,
        rows: 30,
        cwd: agentWorkTree,
        env: {
          ...process.env,
          TERM: 'xterm-color'
        }
      });

      agentSession.pty = pty;
      
      // IMPORTANT: Add agent to map BEFORE any async operations
      this.agents.set(agentId, agentSession);
      this.stats.totalAgentsSpawned++;
      
      console.log(`✅ Agent ${agentId} added to agents Map`);

      // Set up PTY event handlers
      this.setupAgentPTY(agentSession);

      // --print mode: PTY exits immediately, we'll spawn new child_process instances for each task
      agentSession.status = 'ready';
      agentSession.currentTask = `Ready to work as ${role} agent`;
      
      console.log(`🎭 Agent ${agentId} registered in --print mode with stdin support`);
      console.log(`📁 Working directory: ${agentWorkTree}`);
      console.log(`🎯 Ready for reliable file creation via stdin`);
      
      this.emit('agentSpawned', agentSession);
      
      return agentSession;

    } catch (error) {
      console.error(`❌ Failed to spawn agent ${agentId}:`, error);
      
      // Cleanup on failure
      if (agentSession.pty) {
        agentSession.pty.kill();
      }
      
      agentSession.status = 'error';
      throw error;
    }
  }

  /**
   * Set up PTY event handlers for an agent
   * 
   * @param {Object} agentSession - Agent session object
   */
  setupAgentPTY(agentSession) {
    const { agentId, pty } = agentSession;

    pty.on('data', (data) => {
      const output = data.toString();
      
      // Add to output buffer (keep last N chars)
      agentSession.outputBuffer += output;
      if (agentSession.outputBuffer.length > this.outputBufferSize) {
        agentSession.outputBuffer = agentSession.outputBuffer.slice(-this.outputBufferSize);
      }

      // Add to response buffer if waiting for response
      if (agentSession.isWaitingForResponse) {
        agentSession.responseBuffer += output;
        // Update last output time for response detection
        agentSession.lastOutputTime = Date.now();
      }

      agentSession.lastActivity = new Date();
      
      // Emit real-time output for UI updates
      this.emit('agentOutput', {
        agentId,
        output,
        timestamp: new Date()
      });

      // Check for response completion patterns
      this.checkResponseCompletion(agentSession);
    });

    pty.on('exit', (code, signal) => {
      console.log(`🔌 Agent ${agentId} PTY exited with code ${code}, signal ${signal}`);
      agentSession.status = code === 0 ? 'completed' : 'error';
      
      // Resolve any pending response promises with error
      agentSession.responseResolvers.forEach(resolver => {
        resolver.reject(new Error(`Agent PTY exited unexpectedly: ${code}`));
      });
      agentSession.responseResolvers = [];
      
      this.emit('agentExited', { agentId, code, signal });
    });
  }

  
  /**
   * Wait for agent to be ready to accept commands
   * 
   * @param {Object} agentSession - Agent session object
   * @returns {Promise} Resolves when agent is ready
   */
  waitForAgentReady(agentSession) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Agent ${agentSession.agentId} ready timeout`));
      }, 30000); // 30 second timeout

      const checkReady = () => {
        // Look for Claude CLI ready patterns
        if (agentSession.outputBuffer.includes('Claude') || 
            agentSession.outputBuffer.includes('How can I help') ||
            agentSession.outputBuffer.includes('>') ||
            agentSession.outputBuffer.length > 50) {
          clearTimeout(timeout);
          resolve();
        } else {
          // Keep checking
          setTimeout(checkReady, 1000);
        }
      };

      checkReady();
    });
  }

  /**
   * Initialize agent with role-specific persona
   * 
   * @param {Object} agentSession - Agent session object
   * @returns {Promise} Resolves when persona is set
   */
  async initializeAgentPersona(agentSession) {
    const { role, context } = agentSession;
    
    const personaPrompts = {
      frontend: `You are an expert Frontend Developer specializing in React, TypeScript, and modern UI/UX design. Your task is to create beautiful, responsive, and accessible user interfaces. Context: ${context}`,
      
      backend: `You are an expert Backend Developer specializing in Node.js, APIs, and database design. Your task is to create robust, secure, and scalable server-side solutions. Context: ${context}`,
      
      testing: `You are an expert QA Engineer specializing in automated testing, test strategies, and quality assurance. Your task is to ensure code quality and reliability through comprehensive testing. Context: ${context}`,
      
      database: `You are an expert Database Engineer specializing in database design, optimization, and data modeling. Your task is to create efficient and scalable data storage solutions. Context: ${context}`,
      
      devops: `You are an expert DevOps Engineer specializing in deployment, CI/CD, and infrastructure. Your task is to create reliable deployment and monitoring solutions. Context: ${context}`
    };

    const prompt = personaPrompts[role] || `You are an expert ${role} developer. Context: ${context}`;
    
    // Send the persona prompt and wait for acknowledgment
    await this.sendToAgent(agentSession.agentId, prompt);
    
    agentSession.conversationHistory.push({
      type: 'system',
      content: prompt,
      timestamp: new Date()
    });
  }

  /**
   * Send a message to a specific agent
   * 
   * @param {string} agentId - Agent identifier
   * @param {string} message - Message to send
   * @param {number} timeoutMs - Response timeout in milliseconds
   * @returns {Promise<string>} Agent response
   */
  async sendToAgent(agentId, message, timeoutMs = this.responseTimeout) {
    const agentSession = this.agents.get(agentId);
    
    if (!agentSession) {
      throw new Error(`Agent ${agentId} not found`);
    }

    console.log(`📤 Sending to ${agentId}: ${message.substring(0, 100)}...`);
    console.log(`📁 Agent working directory: ${agentSession.workTreePath}`);
    
    // Always use --print mode with stdin (proven working approach)
    return new Promise((resolve, reject) => {
      // Create task-specific work directory
      const taskWorkDir = agentSession.workTreePath;
      
      if (!taskWorkDir) {
        console.error(`❌ Working directory is undefined for agent ${agentId}`);
        reject(new Error(`Working directory is undefined for agent ${agentId}`));
        return;
      }
      
      // Format the prompt with explicit file creation instructions
      const enhancedPrompt = `${message}

IMPORTANT: You must create actual files in the current directory. Use the Write tool to create files. Do not just describe what you would do - actually create the files.

Working directory: ${taskWorkDir}
Role: ${agentSession.role}
Context: ${agentSession.context}`;
      
      console.log(`🎯 Spawning new Claude CLI for task in ${taskWorkDir}`);
      console.log(`📝 Task prompt: ${enhancedPrompt.substring(0, 100)}...`);
      
      // Spawn new Claude CLI with --print flag using child_process for proper stdin
      const taskProcess = spawnChild(this.claudeCliPath, [
        '--print', 
        '--dangerously-skip-permissions'
        // NO PROMPT as argument - will be sent via stdin
      ], {
        cwd: taskWorkDir,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'] // Enable stdin, stdout, stderr pipes
      });
      
      // Send prompt via stdin (this is the correct way for file creation)
      taskProcess.stdin.write(enhancedPrompt + '\n');
      taskProcess.stdin.end(); // Signal end of input
      
      let responseBuffer = '';
      let hasResponded = false;
      
      // Set timeout
      const timeout = setTimeout(() => {
        if (!hasResponded) {
          taskProcess.kill();
          reject(new Error(`Response timeout for agent ${agentId}`));
        }
      }, timeoutMs);
      
      // Handle stdout output
      taskProcess.stdout.on('data', (data) => {
        const output = data.toString();
        responseBuffer += output;
        
        // Emit real-time output
        this.emit('agentOutput', {
          agentId,
          output,
          timestamp: new Date()
        });
      });
      
      // Handle stderr output
      taskProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error(`❌ Claude CLI error: ${error}`);
        responseBuffer += error;
      });
      
      // Handle exit
      taskProcess.on('exit', (code, signal) => {
        clearTimeout(timeout);
        
        if (!hasResponded) {
          hasResponded = true;
          
          // Check if we got any meaningful response
          if (responseBuffer.trim().length > 10) {
            console.log(`✅ Agent ${agentId} task completed (code: ${code})`);
            console.log(`📥 Response length: ${responseBuffer.length} chars`);
            
            // Add to conversation history
            agentSession.conversationHistory.push({
              type: 'user',
              content: message,
              timestamp: new Date()
            });
            
            agentSession.conversationHistory.push({
              type: 'assistant',
              content: responseBuffer.trim(),
              timestamp: new Date()
            });
            
            agentSession.lastActivity = new Date();
            agentSession.status = 'ready';
            agentSession.completedTasks.push({
              task: message.substring(0, 100),
              timestamp: new Date()
            });
            
            this.stats.totalResponsesReceived++;
            
            // Check for files created
            this.checkWorkTreeForFiles(agentSession);
            
            resolve(responseBuffer.trim());
          } else {
            reject(new Error(`Agent ${agentId} exited without meaningful response (code: ${code})`));
          }
        }
      });
      
      agentSession.lastActivity = new Date();
      this.stats.totalCommandsSent++;
    });
  }
  
  /**
   * Check work tree for created files
   * 
   * @param {Object} agentSession - Agent session object
   */
  checkWorkTreeForFiles(agentSession) {
    try {
      const files = fss.readdirSync(agentSession.workTreePath);
      const actualFiles = files.filter(f => !f.startsWith('.task_') && !f.startsWith('.'));
      
      if (actualFiles.length > 0) {
        console.log(`📁 Files in ${agentSession.agentId} work tree:`);
        actualFiles.forEach(file => {
          const filePath = path.join(agentSession.workTreePath, file);
          const stats = fss.statSync(filePath);
          console.log(`  - ${file} (${stats.size} bytes)`);
        });
      } else {
        console.log(`⚠️ No files created yet in ${agentSession.agentId} work tree`);
      }
    } catch (error) {
      console.error(`Error checking work tree for ${agentSession.agentId}:`, error.message);
    }
  }

  /**
   * Check if agent response is complete and resolve promises
   * Enhanced for interactive mode detection
   * 
   * @param {Object} agentSession - Agent session object
   */
  checkResponseCompletion(agentSession) {
    if (!agentSession.isWaitingForResponse || agentSession.responseResolvers.length === 0) {
      return;
    }

    const buffer = agentSession.responseBuffer;
    const timeSinceLastOutput = Date.now() - agentSession.lastOutputTime;
    
    // Enhanced completion detection for interactive mode
    const completionIndicators = {
      // Common Claude endings
      conversational: [
        'Is there anything else',
        'Let me know if',
        'Would you like',
        'Feel free to',
        'Hope this helps',
        'I\'ve completed',
        'I\'ve created',
        'I\'ve written',
        'Done!',
        'Completed!'
      ],
      
      // Tool completion patterns
      toolCompletion: [
        'File created:',
        'File written:',
        'File updated:',
        'Successfully created',
        'Successfully wrote',
        'The file has been',
        'Created file',
        'Wrote file',
        'I\'ve created',
        'I\'ve written',
        'The file is now created',
        'File saved'
      ],
      
      // Structural patterns
      patterns: [
        /\n\s*$/,  // Ends with newline
        /\.\s*$/,  // Ends with period
        /\?\s*$/,  // Ends with question
        /!\s*$/,   // Ends with exclamation
        /```\s*$/, // Ends with code block
        /\);\s*$/, // Ends with JS statement
        /}\s*$/    // Ends with closing brace
      ]
    };

    // Check for conversational endings
    const hasConversationalEnding = completionIndicators.conversational.some(phrase => 
      buffer.toLowerCase().includes(phrase.toLowerCase())
    );
    
    // Check for tool completion
    const hasToolCompletion = completionIndicators.toolCompletion.some(phrase =>
      buffer.includes(phrase)
    );
    
    // Check for structural patterns
    const hasCompletionPattern = completionIndicators.patterns.some(pattern => 
      pattern.test(buffer)
    );
    
    // Silence detection - no output for specified time
    const SILENCE_THRESHOLD = agentSession.isInteractive ? 3000 : 2000; // 3s for interactive, 2s for print
    const hasSilence = timeSinceLastOutput > SILENCE_THRESHOLD;
    
    // Increase silence count if we have silence
    if (hasSilence && buffer.length > 10) {
      agentSession.silenceCount++;
    } else {
      agentSession.silenceCount = 0;
    }
    
    // Determine if response is complete
    let isComplete = false;
    
    if (buffer.length > 50) {
      // For interactive mode, be more patient
      if (agentSession.isInteractive) {
        isComplete = (
          (hasConversationalEnding || hasToolCompletion) ||
          (hasCompletionPattern && agentSession.silenceCount >= 2) || // Need 2 silence periods
          (timeSinceLastOutput > 5000) // 5 second hard timeout
        );
      } else {
        // For print mode, be quicker
        isComplete = (
          hasCompletionPattern || 
          hasSilence ||
          hasConversationalEnding ||
          hasToolCompletion
        );
      }
    }
    
    if (isComplete) {
      console.log(`✅ Response complete for ${agentSession.agentId} (silence: ${timeSinceLastOutput}ms, buffer: ${buffer.length} chars)`);
      this.completeAgentResponse(agentSession);
    }
  }

  /**
   * Complete agent response and resolve waiting promises
   * 
   * @param {Object} agentSession - Agent session object
   */
  completeAgentResponse(agentSession) {
    const response = agentSession.responseBuffer.trim();
    
    console.log(`📥 Response from ${agentSession.agentId}: ${response.substring(0, 100)}...`);
    
    // Add to conversation history
    agentSession.conversationHistory.push({
      type: 'assistant',
      content: response,
      timestamp: new Date()
    });
    
    // Resolve all waiting promises
    agentSession.responseResolvers.forEach(resolver => {
      clearTimeout(resolver.timeout);
      resolver.resolve(response);
    });
    
    // Reset state
    agentSession.responseResolvers = [];
    agentSession.isWaitingForResponse = false;
    agentSession.responseBuffer = '';
    agentSession.status = 'ready';
    
    this.stats.totalResponsesReceived++;
    
    this.emit('agentResponse', {
      agentId: agentSession.agentId,
      response,
      timestamp: new Date()
    });
  }


  /**
   * Build persona prompt for agent initialization
   * 
   * @param {string} role - Agent role
   * @param {string} context - Project context
   * @returns {string} Persona initialization prompt
   */
  buildPersonaPrompt(role, context) {
    const personas = {
      frontend: `You are a Frontend Engineer specialized in React, TypeScript, and modern UI frameworks. 
Your focus is on creating responsive, accessible, and performant user interfaces.
You use the Write and Edit tools to create actual files, not just describe them.`,
      
      backend: `You are a Backend Engineer specialized in Node.js, APIs, databases, and server architecture.
Your focus is on building scalable, secure, and efficient server-side applications.
You use the Write and Edit tools to create actual files, not just describe them.`,
      
      fullstack: `You are a Full-Stack Developer capable of handling both frontend and backend development.
You can work with React, TypeScript, Node.js, databases, and complete application architecture.
You use the Write and Edit tools to create actual files, not just describe them.`,
      
      testing: `You are a QA Engineer specialized in testing strategies, test automation, and quality assurance.
Your focus is on creating comprehensive test suites and ensuring code quality.
You use the Write and Edit tools to create actual test files, not just describe them.`,
      
      devops: `You are a DevOps Engineer specialized in deployment, infrastructure, CI/CD, and monitoring.
Your focus is on automation, scalability, and system reliability.
You use the Write and Edit tools to create actual configuration files, not just describe them.`,
      
      architect: `You are a Software Architect specialized in system design, architecture patterns, and technical leadership.
Your focus is on creating scalable, maintainable system architectures.
You use the Write and Edit tools to create actual documentation and code files, not just describe them.`
    };
    
    const basePersona = personas[role] || personas.fullstack;
    
    return `${basePersona}

Project Context: ${context}

You are now ready to work on tasks. When given a task:
1. Analyze the requirements
2. Create actual files using Write and Edit tools
3. Ensure the code is functional and follows best practices
4. Provide clear explanations of what you've created

Respond with "Ready to work as ${role} agent" to confirm.`;
  }

  /**
   * Send message to multiple agents in parallel
   * 
   * @param {Array<string>} agentIds - Array of agent IDs
   * @param {string} message - Message to send to all agents
   * @returns {Promise<Object>} Map of agentId -> response
   */
  async sendToMultipleAgents(agentIds, message) {
    console.log(`📤 Broadcasting to ${agentIds.length} agents: ${message.substring(0, 100)}...`);
    
    const promises = agentIds.map(agentId => 
      this.sendToAgent(agentId, message).catch(error => ({
        agentId,
        error: error.message
      }))
    );
    
    const responses = await Promise.all(promises);
    
    const result = {};
    responses.forEach((response, index) => {
      const agentId = agentIds[index];
      result[agentId] = response.error ? { error: response.error } : response;
    });
    
    return result;
  }

  /**
   * Get agent status and information
   * 
   * @param {string} agentId - Agent identifier
   * @returns {Object} Agent status object
   */
  getAgentStatus(agentId) {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      return null;
    }
    
    return {
      agentId: agent.agentId,
      role: agent.role,
      status: agent.status,
      currentTask: agent.currentTask,
      progress: agent.progress,
      lastActivity: agent.lastActivity,
      conversationLength: agent.conversationHistory.length,
      completedTasks: agent.completedTasks,
      isActive: agent.pty && !agent.pty.killed
    };
  }

  /**
   * Get team status and information
   * 
   * @param {string} teamId - Team identifier
   * @returns {Object} Team status object
   */
  getTeamStatus(teamId) {
    const team = this.activeTeams.get(teamId);
    
    if (!team) {
      return null;
    }
    
    const agents = Array.from(team.agents.values()).map(agent => 
      this.getAgentStatus(agent.agentId)
    );
    
    return {
      teamId: team.teamId,
      requirement: team.requirement,
      status: team.status,
      agents,
      progress: team.progress,
      createdAt: team.createdAt,
      startedAt: team.startedAt,
      completedAt: team.completedAt
    };
  }

  /**
   * Stop and cleanup a specific agent
   * 
   * @param {string} agentId - Agent identifier
   * @returns {Promise} Resolves when agent is stopped
   */
  async stopAgent(agentId) {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      return;
    }
    
    console.log(`🛑 Stopping agent: ${agentId}`);
    
    agent.status = 'stopping';
    
    // Kill PTY process
    if (agent.pty && !agent.pty.killed) {
      agent.pty.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (!agent.pty.killed) {
          agent.pty.kill('SIGKILL');
        }
      }, 5000);
    }
    
    // Reject any pending promises
    agent.responseResolvers.forEach(resolver => {
      resolver.reject(new Error('Agent stopped'));
    });
    
    agent.responseResolvers = [];
    agent.status = 'stopped';
    
    this.agents.delete(agentId);
    
    this.emit('agentStopped', { agentId });
  }

  /**
   * Stop and cleanup entire team
   * 
   * @param {string} teamId - Team identifier
   * @returns {Promise} Resolves when team is stopped
   */
  async cleanupTeam(teamId) {
    const team = this.activeTeams.get(teamId);
    
    if (!team) {
      return;
    }
    
    console.log(`🛑 Cleaning up team: ${teamId}`);
    
    // Stop all agents in parallel
    const stopPromises = Array.from(team.agents.keys()).map(agentId => 
      this.stopAgent(agentId)
    );
    
    await Promise.all(stopPromises);
    
    team.status = 'stopped';
    team.completedAt = new Date();
    
    this.activeTeams.delete(teamId);
    
    this.emit('teamStopped', { teamId });
  }

  /**
   * Emergency stop all agents and teams
   * 
   * @returns {Promise} Resolves when all agents are stopped
   */
  async emergencyStopAll() {
    console.log('🚨 Emergency stop - stopping all agents and teams');
    
    const stopPromises = [];
    
    // Stop all teams
    for (const teamId of this.activeTeams.keys()) {
      stopPromises.push(this.cleanupTeam(teamId));
    }
    
    // Stop any orphaned agents
    for (const agentId of this.agents.keys()) {
      stopPromises.push(this.stopAgent(agentId));
    }
    
    await Promise.all(stopPromises);
    
    console.log('✅ Emergency stop complete');
    
    this.emit('emergencyStop');
  }

  /**
   * Get service statistics
   * 
   * @returns {Object} Service statistics
   */
  /**
   * Monitor health of interactive sessions
   * Periodically check if PTY sessions are still responsive
   */
  startSessionHealthMonitoring() {
    if (this.healthMonitorInterval) {
      return; // Already monitoring
    }
    
    this.healthMonitorInterval = setInterval(() => {
      this.checkAllSessionHealth();
    }, 30000); // Check every 30 seconds
    
    console.log('🏥 Session health monitoring started');
  }
  
  /**
   * Stop session health monitoring
   */
  stopSessionHealthMonitoring() {
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
      this.healthMonitorInterval = null;
      console.log('🏥 Session health monitoring stopped');
    }
  }
  
  /**
   * Check health of all active sessions
   */
  async checkAllSessionHealth() {
    for (const [agentId, session] of this.agents.entries()) {
      if (session.isInteractive && session.pty && !session.pty.killed) {
        await this.checkSessionHealth(session);
      }
    }
  }
  
  /**
   * Check health of a specific session
   * 
   * @param {Object} agentSession - Agent session to check
   */
  async checkSessionHealth(agentSession) {
    const { agentId } = agentSession;
    const idleTime = Date.now() - agentSession.lastActivity.getTime();
    const MAX_IDLE_TIME = 5 * 60 * 1000; // 5 minutes
    
    // Check if session has been idle too long
    if (idleTime > MAX_IDLE_TIME) {
      console.log(`⚠️ Agent ${agentId} has been idle for ${Math.round(idleTime / 1000)}s`);
      
      // Try to ping the session
      try {
        const pingResponse = await this.pingSession(agentSession);
        if (pingResponse) {
          console.log(`✅ Agent ${agentId} is still responsive`);
          agentSession.lastActivity = new Date();
        }
      } catch (error) {
        console.error(`❌ Agent ${agentId} is not responsive: ${error.message}`);
        
        // Mark session as unhealthy
        agentSession.status = 'unhealthy';
        this.emit('sessionUnhealthy', { agentId, error: error.message });
        
        // Optionally restart the session
        if (process.env.AUTO_RESTART_UNHEALTHY === 'true') {
          console.log(`🔄 Attempting to restart agent ${agentId}...`);
          await this.restartAgent(agentSession);
        }
      }
    }
  }
  
  /**
   * Ping a session to check if it's responsive
   * 
   * @param {Object} agentSession - Agent session to ping
   * @returns {Promise<boolean>} True if responsive
   */
  async pingSession(agentSession) {
    if (!agentSession.isInteractive || !agentSession.pty || agentSession.pty.killed) {
      throw new Error('Session is not interactive or PTY is dead');
    }
    
    // Send a simple echo command
    const pingMessage = '# Health check - please respond with "alive"';
    
    try {
      const response = await this.sendToAgentInteractive(agentSession.agentId, pingMessage, 5000);
      return response && response.toLowerCase().includes('alive');
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Restart an unhealthy agent
   * 
   * @param {Object} agentSession - Agent session to restart
   */
  async restartAgent(agentSession) {
    const { agentId, role, context, workTreePath } = agentSession;
    
    // Kill existing PTY
    if (agentSession.pty && !agentSession.pty.killed) {
      agentSession.pty.kill();
    }
    
    // Remove from agents map
    this.agents.delete(agentId);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Respawn agent
    try {
      const workTreeRoot = path.dirname(workTreePath);
      await this.spawnAgent(agentId, role, context, workTreeRoot);
      console.log(`✅ Agent ${agentId} restarted successfully`);
      this.emit('agentRestarted', { agentId });
    } catch (error) {
      console.error(`❌ Failed to restart agent ${agentId}:`, error);
      this.emit('agentRestartFailed', { agentId, error: error.message });
    }
  }
  
  getStats() {
    return {
      ...this.stats,
      activeAgents: this.agents.size,
      activeTeams: this.activeTeams.size,
      isInitialized: this.isInitialized,
      uptime: Date.now() - (this.startTime || Date.now()),
      interactiveSessions: Array.from(this.agents.values()).filter(s => s.isInteractive).length
    };
  }
}

// Export singleton instance
let puppeteerInstance = null;

function getPuppeteerService(options = {}) {
  if (!puppeteerInstance) {
    puppeteerInstance = new ClaudeCLIPuppeteer(options);
  }
  return puppeteerInstance;
}

module.exports = {
  ClaudeCLIPuppeteer,
  getPuppeteerService
};