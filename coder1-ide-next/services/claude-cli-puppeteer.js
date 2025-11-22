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
    this.responseTimeout = options.responseTimeout || 600000; // 10 minutes - allows for complex architectural analysis with multiple file generation
    this.retryAttempts = options.retryAttempts || 3;
    
    // State management
    this.agents = new Map(); // agentId -> AgentSession
    this.activeTeams = new Map(); // teamId -> TeamSession
    this.isInitialized = false;
    
    // Agent Terminal Manager for cleanup coordination
    this.agentTerminalManager = null; // Set via setAgentTerminalManager()
    
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
   * Set AgentTerminalManager for cleanup coordination
   * @param {AgentTerminalManager} manager - The terminal manager instance
   */
  setAgentTerminalManager(manager) {
    this.agentTerminalManager = manager;
    console.log('🔗 AgentTerminalManager linked to Claude CLI Puppeteer');
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
      console.log('🔧 Testing Claude CLI with --print --version command...');
      const testPty = spawn(this.claudeCliPath, ['--print', '--version'], {
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
            
            // Start basic session health monitoring for --print mode
            this.startSessionHealthMonitoring();
            
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
      console.log(`♻️ Agent ${agentId} already exists - reusing existing agent`);
      return this.agents.get(agentId);
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
      silenceCount: 0,
      trustPromptAnswered: false  // Track if we already answered trust prompt
    };

    try {
      // 🎭 INTERACTIVE MODE: Create real PTY for live Claude Code session
      // Each agent gets its own interactive Claude Code terminal that users can watch
      // This matches the main terminal architecture for seamless multi-agent collaboration
      
      console.log(`🎭 Spawning agent ${agentId} with INTERACTIVE Claude Code PTY`);
      console.log(`📁 Working directory: ${agentWorkTree}`);
      
      // 🔧 FIX (Nov 21, 2025): Use interactive mode with proper Enter key submission
      // --print mode requires prompt at spawn time, incompatible with multi-task workflow
      // Interactive mode works when prompts include \r (Enter key)
      const pty = spawn(this.claudeCliPath, [
        '--model', 'claude-sonnet-4-5-20250929'
      ], {
        name: 'xterm-color',
        cols: 100,
        rows: 30,
        cwd: agentWorkTree,  // Agent works in isolated directory
        env: {
          ...process.env,
          CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN
        }
      });
      
      agentSession.pty = pty;
      
      // Set up PTY event handlers for output streaming
      pty.onData((data) => {
        agentSession.outputBuffer += data;
        agentSession.lastOutputTime = Date.now();
        
        // 🔧 AUTO-HANDLE TRUST PROMPTS: Claude asks "Do you trust the files in this folder?"
        // This can appear at ANY time, not just during initialization
        // Auto-respond with "1" (Yes, proceed) to keep automation flowing
        // IMPORTANT: Only respond ONCE to avoid sending multiple "1" inputs
        const output = data.toString();
        if (!agentSession.trustPromptAnswered && (output.includes('Do you trust') || output.includes('Yes, proceed'))) {
          agentSession.trustPromptAnswered = true;  // Mark as handled immediately
          console.log(`🔐 Agent ${agentId} - Trust prompt detected, auto-approving...`);
          setTimeout(() => {
            pty.write('1\n');
            console.log(`✅ Agent ${agentId} - Trust prompt answered with "1"`);
          }, 200); // Increased delay to ensure full prompt render
        }
        
        // Emit output to connected terminals
        this.emit('agentOutput', {
          agentId,
          output: data,
          timestamp: new Date()
        });
      });
      
      pty.onExit(({ exitCode, signal }) => {
        console.log(`🔚 Agent ${agentId} PTY exited (code: ${exitCode}, signal: ${signal})`);
        agentSession.status = 'stopped';
        
        // Cleanup
        this.agents.delete(agentId);
      });
      
      // IMPORTANT: Add agent to map BEFORE any async operations
      this.agents.set(agentId, agentSession);
      this.stats.totalAgentsSpawned++;
      
      console.log(`✅ Agent ${agentId} added to agents Map with LIVE PTY`);
      
      // 🔧 FIX (Nov 21, 2025): Wait for welcome message before marking ready
      // Trust prompts are handled automatically in the main onData handler above
      let welcomeReceived = false;
      
      const welcomePromise = new Promise((resolve) => {
        const dataHandler = (data) => {
          const output = data.toString();
          
          // Wait for welcome message (trust prompt auto-handled elsewhere)
          if (output.includes('Welcome to Claude Code') || output.includes('cwd:')) {
            welcomeReceived = true;
            console.log(`✅ Agent ${agentId} received welcome message - ready for input`);
            resolve();
          }
        };
        pty.onData(dataHandler);
        
        // Timeout after 15 seconds
        setTimeout(() => {
          if (!welcomeReceived) {
            console.warn(`⚠️ Agent ${agentId} welcome timeout - proceeding anyway`);
            resolve();
          }
        }, 15000);
      });
      
      await welcomePromise;
      
      // Set agent status to ready
      agentSession.status = 'ready';
      agentSession.currentTask = `Ready - Interactive Claude Code session`;
      
      console.log(`🎯 Agent ${agentId} ready for interactive task execution`);
      
      this.emit('agentSpawned', agentSession);
      
      return agentSession;

    } catch (error) {
      console.error(`❌ Failed to spawn agent ${agentId}:`, error);
      
      // Cleanup on failure (PTY may be null in --print mode)
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

    // Skip if no PTY (--print mode uses separate child_process instances)
    if (!pty) {
      console.log(`⏭️ Skipping PTY event handlers for ${agentId} (PTY-less mode)`);
      return;
    }

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
      
      // Enhanced error logging - capture final output buffer
      if (code !== 0) {
        console.error(`❌ Agent ${agentId} exited with error code ${code}`);
        console.error(`📝 Final output buffer (last ${this.outputBufferSize} chars):`);
        console.error(agentSession.outputBuffer || '(empty)');
        console.error(`📝 Response buffer:`);
        console.error(agentSession.responseBuffer || '(empty)');
        console.error(`⏰ Last activity: ${agentSession.lastActivity}`);
        console.error(`📊 Current task: ${agentSession.currentTask}`);
      }
      
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

    if (!agentSession.pty) {
      throw new Error(`Agent ${agentId} has no PTY - cannot send message`);
    }

    console.log(`📤 Sending to ${agentId} via INTERACTIVE PTY: ${message.substring(0, 100)}...`);
    console.log(`📁 Agent working directory: ${agentSession.workTreePath}`);
    
    // Use interactive PTY - write message and monitor for file completion
    return new Promise(async (resolve, reject) => {
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

`;
      
      console.log(`💬 Writing task to ${agentId} interactive PTY`);
      console.log(`📝 Prompt length: ${enhancedPrompt.length} characters`);
      
      // 🔧 FIX (Nov 22, 2025): Send prompt character-by-character to avoid paste mode
      // Bracketed paste mode triggers when too much text is sent at once
      // Send slowly to make it look like typing, not pasting
      console.log(`💬 Sending task to ${agentId} character-by-character (${enhancedPrompt.length} chars)`);
      
      const singleLinePrompt = enhancedPrompt.replace(/\n/g, ' ');
      
      // Send prompt one character at a time with small delays (async function)
      const sendCharByChar = async () => {
        for (let i = 0; i < singleLinePrompt.length; i++) {
          agentSession.pty.write(singleLinePrompt[i]);
          // Add tiny delay every 10 characters to avoid overwhelming PTY
          if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 5)); // 5ms delay
          }
        }
        
        // Submit the command
        agentSession.pty.write('\n');
      };
      
      await sendCharByChar();
      
      console.log(`✅ Task sent to ${agentId} PTY character-by-character (avoids paste mode)`);
      
      // 🔍 [DEBUG] Check if we reach the delayed Enter code block
      console.log(`🔍 [DEBUG] About to check delayed Enter condition:`);
      console.log(`   - enhancedPrompt.length = ${enhancedPrompt.length}`);
      console.log(`   - Should trigger (>500)? ${enhancedPrompt.length > 500}`);
      
      // 🔧 FIX (Nov 22, 2025): Claude CLI fancy rendering mode issue
      // Long prompts (>500 chars) trigger fancy box rendering which requires additional Enter
      // Wait 2 seconds for rendering to complete, then send another Enter to submit
      if (enhancedPrompt.length > 500) {
        console.log(`⏳ Long prompt detected (${enhancedPrompt.length} chars) - waiting 2s for fancy rendering...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        agentSession.pty.write('\n');
        console.log(`✅ Sent additional Enter key to submit fancy-rendered task`);
      }
      
      let hasResponded = false;
      let lastFileModTime = Date.now();
      let filesDetected = false;
      
      // File-based completion detection (primary method)
      // Check every 5 seconds if files were created and are stable
      const fileCheckInterval = setInterval(() => {
        if (hasResponded) {
          clearInterval(fileCheckInterval);
          return;
        }
        
        try {
          const files = fss.readdirSync(taskWorkDir);
          const actualFiles = files.filter(f => !f.startsWith('.') && f !== 'node_modules');
          
          if (actualFiles.length > 0) {
            if (!filesDetected) {
              console.log(`📁 [File Detection] ${actualFiles.length} files detected in ${agentId} work tree`);
              filesDetected = true;
            }
            
            // Check last modification time
            let latestMod = 0;
            actualFiles.forEach(file => {
              const filePath = path.join(taskWorkDir, file);
              try {
                const stats = fss.statSync(filePath);
                if (stats.mtimeMs > latestMod) {
                  latestMod = stats.mtimeMs;
                }
              } catch (e) {
                // File might have been deleted, ignore
              }
            });
            
            if (latestMod > lastFileModTime) {
              lastFileModTime = latestMod;
              console.log(`📝 [File Detection] File activity detected, resetting stability timer`);
            }
            
            // If no file modifications for 30 seconds, consider task complete
            const timeSinceLastMod = Date.now() - lastFileModTime;
            if (timeSinceLastMod > 30000) {
              console.log(`✅ [File Detection] Files stable for 30s, considering task complete`);
              clearInterval(fileCheckInterval);
              clearTimeout(timeout);
              hasResponded = true;
              
              // PTY stays alive for potential future tasks
              
              // Build response from file list
              const fileList = actualFiles.map(f => {
                const filePath = path.join(taskWorkDir, f);
                const stats = fss.statSync(filePath);
                return `- ${f} (${stats.size} bytes)`;
              }).join('\n');
              
              const successMessage = `✅ Task completed successfully!\n\nFiles created:\n${fileList}`;
              
              // Add to conversation history
              agentSession.conversationHistory.push({
                type: 'user',
                content: message,
                timestamp: new Date()
              });
              
              agentSession.conversationHistory.push({
                type: 'assistant',
                content: successMessage,
                timestamp: new Date()
              });
              
              agentSession.lastActivity = new Date();
              agentSession.status = 'ready';
              agentSession.completedTasks.push({
                task: message.substring(0, 100),
                timestamp: new Date(),
                filesCreated: actualFiles.length
              });
              
              this.stats.totalResponsesReceived++;
              
              // Emit to terminals
              this.emit('agentOutput', {
                agentId,
                output: successMessage,
                timestamp: new Date()
              });
              
              resolve(successMessage);
            }
          }
        } catch (error) {
          console.error(`❌ [File Detection] Error checking files: ${error.message}`);
        }
      }, 5000); // Check every 5 seconds
      
      // Track last PTY output to detect agent activity even without file changes
      let lastPTYOutput = Date.now();
      
      // Monitor PTY output as sign of agent working
      const ptyOutputHandler = (data) => {
        lastPTYOutput = Date.now();
        // Don't log every output event, too noisy
      };
      
      if (agentSession.pty) {
        agentSession.pty.on('data', ptyOutputHandler);
      }
      
      // Activity check every 30 seconds
      const activityCheckInterval = setInterval(() => {
        const timeSinceOutput = Date.now() - lastPTYOutput;
        const fiveMinutes = 5 * 60 * 1000;
        
        if (timeSinceOutput > fiveMinutes && !hasResponded) {
          // Agent has been silent for 5 minutes - likely stalled
          clearInterval(fileCheckInterval);
          clearInterval(activityCheckInterval);
          if (agentSession.pty) {
            agentSession.pty.removeListener('data', ptyOutputHandler);
          }
          console.warn(`⏰ Agent ${agentId} appears stalled - no output in 5 minutes`);
          reject(new Error(`Agent ${agentId} idle timeout - no output for 5 minutes`));
        } else if (timeSinceOutput < 60000) {
          // Agent is active (output within last minute)
          console.log(`💓 Agent ${agentId} is active - last output ${Math.floor(timeSinceOutput / 1000)}s ago`);
        }
      }, 30000); // Check every 30 seconds
      
      // Fallback timeout (30 minutes) - increased from 10 minutes for complex tasks
      const timeout = setTimeout(() => {
        if (!hasResponded) {
          clearInterval(fileCheckInterval);
          clearInterval(activityCheckInterval);
          if (agentSession.pty) {
            agentSession.pty.removeListener('data', ptyOutputHandler);
          }
          console.warn(`⏰ Maximum timeout reached for agent ${agentId} task - 30 minutes elapsed`);
          reject(new Error(`Response timeout for agent ${agentId} - maximum time limit (30 min) reached`));
        }
      }, Math.max(timeoutMs, 30 * 60 * 1000)); // At least 30 minutes
      
      // Note: PTY output is already handled by onData() event set up in spawnAgent()
      // User watches live output in the terminal tab
      
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
    
    // Silence detection - no output for specified time (--print mode)
    const SILENCE_THRESHOLD = 2000; // 2s for print mode
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
      // For --print mode, be responsive but reliable
      isComplete = (
        hasCompletionPattern || 
        hasSilence ||
        hasConversationalEnding ||
        hasToolCompletion
      );
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
    
    // 🧹 Cleanup agent terminal session if manager is available
    if (this.agentTerminalManager && typeof this.agentTerminalManager.cleanupSession === 'function') {
      try {
        this.agentTerminalManager.cleanupSession(agentId);
        console.log(`🧹 Agent terminal session cleaned: ${agentId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup agent terminal session ${agentId}:`, error.message);
      }
    }
    
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
    // For --print mode, just check if we have an active session reference
    // No interactive pinging needed since each task spawns a fresh process
    return agentSession && agentSession.status !== 'terminated';
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
      printModeSessions: this.agents.size // All sessions now use --print mode
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