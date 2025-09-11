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
const EventEmitter = require('events');
const path = require('path');
const { promises: fs } = require('fs');

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
      const testPty = spawn(this.claudeCliPath, ['--version'], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        env: process.env
      });
      
      return new Promise((resolve, reject) => {
        let output = '';
        const timeout = setTimeout(() => {
          testPty.kill();
          reject(new Error('Claude CLI test timeout - check authentication'));
        }, 10000);
        
        testPty.on('data', (data) => {
          output += data.toString();
          if (output.includes('claude')) {
            clearTimeout(timeout);
            testPty.kill();
            this.isInitialized = true;
            console.log('✅ Claude CLI Puppeteer initialized successfully');
            resolve();
          }
        });
        
        testPty.on('exit', (code) => {
          clearTimeout(timeout);
          if (code !== 0 && !this.isInitialized) {
            reject(new Error(`Claude CLI test failed with code ${code}. Check installation and authentication.`));
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
      isWaitingForResponse: false
    };

    try {
      // Spawn Claude CLI PTY session
      const pty = spawn(this.claudeCliPath, [], {
        name: 'xterm-color',
        cols: 100,
        rows: 30,
        cwd: agentWorkTree,
        env: {
          ...process.env,
          TERM: 'xterm-color',
          // Ensure no interactive prompts
          CLAUDE_NO_INTERACTIVE: '1'
        }
      });

      agentSession.pty = pty;

      // Set up PTY event handlers
      this.setupAgentPTY(agentSession);

      // Wait for Claude to initialize
      await this.waitForAgentReady(agentSession);

      // Send initial agent persona prompt
      await this.initializeAgentPersona(agentSession);

      agentSession.status = 'ready';
      agentSession.currentTask = `Ready to work as ${role} agent`;
      
      this.agents.set(agentId, agentSession);
      this.stats.totalAgentsSpawned++;

      console.log(`✅ Agent ${agentId} ready`);
      
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

    if (agentSession.status !== 'ready' && agentSession.status !== 'working') {
      throw new Error(`Agent ${agentId} is not ready (status: ${agentSession.status})`);
    }

    console.log(`📤 Sending to ${agentId}: ${message.substring(0, 100)}...`);

    return new Promise((resolve, reject) => {
      // Set up response handling
      agentSession.isWaitingForResponse = true;
      agentSession.responseBuffer = '';
      agentSession.status = 'working';
      
      const responseResolver = { resolve, reject };
      agentSession.responseResolvers.push(responseResolver);

      // Set timeout
      const timeout = setTimeout(() => {
        agentSession.isWaitingForResponse = false;
        agentSession.status = 'ready';
        
        // Remove this resolver
        const index = agentSession.responseResolvers.indexOf(responseResolver);
        if (index > -1) {
          agentSession.responseResolvers.splice(index, 1);
        }
        
        reject(new Error(`Response timeout for agent ${agentId}`));
      }, timeoutMs);

      // Store timeout reference
      responseResolver.timeout = timeout;

      // Send the message
      try {
        agentSession.pty.write(message + '\n');
        
        // Add to conversation history
        agentSession.conversationHistory.push({
          type: 'user',
          content: message,
          timestamp: new Date()
        });
        
        agentSession.lastActivity = new Date();
        this.stats.totalCommandsSent++;
        
      } catch (error) {
        clearTimeout(timeout);
        agentSession.isWaitingForResponse = false;
        agentSession.status = 'ready';
        
        // Remove resolver
        const index = agentSession.responseResolvers.indexOf(responseResolver);
        if (index > -1) {
          agentSession.responseResolvers.splice(index, 1);
        }
        
        reject(error);
      }
    });
  }

  /**
   * Check if agent response is complete and resolve promises
   * 
   * @param {Object} agentSession - Agent session object
   */
  checkResponseCompletion(agentSession) {
    if (!agentSession.isWaitingForResponse || agentSession.responseResolvers.length === 0) {
      return;
    }

    const buffer = agentSession.responseBuffer;
    
    // Simple completion detection patterns (can be enhanced)
    const completionPatterns = [
      /\n\s*$/,  // Ends with newline and optional whitespace
      /\.\s*$/,  // Ends with period
      /\?\s*$/,  // Ends with question mark
      /!\s*$/,   // Ends with exclamation
      /```\s*$/  // Ends with code block
    ];

    // Check if we have substantial content and a completion pattern
    if (buffer.length > 50) {
      const hasCompletionPattern = completionPatterns.some(pattern => pattern.test(buffer));
      
      // Also check if there's been no new output for a short time
      const timeSinceLastOutput = Date.now() - agentSession.lastActivity.getTime();
      
      if (hasCompletionPattern || timeSinceLastOutput > 3000) { // 3 second silence
        this.completeAgentResponse(agentSession);
      }
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
  getStats() {
    return {
      ...this.stats,
      activeAgents: this.agents.size,
      activeTeams: this.activeTeams.size,
      isInitialized: this.isInitialized,
      uptime: Date.now() - (this.startTime || Date.now())
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