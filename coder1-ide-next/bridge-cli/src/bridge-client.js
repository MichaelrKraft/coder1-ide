/**
 * Bridge Client - Production Version
 * Handles WebSocket connection to Coder1 IDE and Claude CLI execution
 * Features: Winston logging, p-queue command management, auto-reconnection
 *
 * UPDATED (Dec 10, 2025): Added PTY support for interactive Claude sessions
 * - Bidirectional stdin streaming for interactive mode
 * - Terminal resize support
 * - Session tracking for input routing
 */

const io = require('socket.io-client');
const EventEmitter = require('events');
const PQueue = require('p-queue');
const logger = require('./logger');
const ClaudeExecutor = require('./claude-executor');
const FileHandler = require('./file-handler');
const { saveCredentials, loadCredentials, clearCredentials } = require('./credentials-manager');

class BridgeClient extends EventEmitter {
  constructor(options = {}) {
    super();

    // Detect if we should use local or production URL
    // Check for --local flag or environment variable
    const isLocal = options.local || process.env.CODER1_LOCAL === 'true';
    this.serverUrl = options.serverUrl || (isLocal ? 'http://localhost:3001' : 'https://coder1.ai');
    this.verbose = options.verbose || false;
    this.claudePath = options.claudePath || 'claude'; // 🔧 FIX: Accept resolved Claude path
    this.socket = null;
    this.bridgeId = null;
    this.userId = null;
    this.token = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = null; // Infinite reconnection attempts

    // Production command queue - prevents overwhelming Claude CLI
    this.commandQueue = new PQueue({
      concurrency: 1,           // One command at a time
      timeout: 300000,          // 5 minute timeout per command
      throwOnTimeout: true,     // Throw error on timeout
      intervalCap: 1,           // Rate limiting: 1 command per interval
      interval: 1000            // 1 second interval
    });

    // Queue monitoring
    this.commandQueue.on('add', () => {
      logger.debug('Command added to queue', { queueSize: this.commandQueue.size });
    });

    this.commandQueue.on('next', () => {
      logger.debug('Processing next command', {
        queueSize: this.commandQueue.size,
        pending: this.commandQueue.pending
      });
    });

    // Initialize sub-modules
    // 🔧 FIX: Pass claudePath to ClaudeExecutor so pty.spawn uses full path
    this.claudeExecutor = new ClaudeExecutor({
      verbose: this.verbose,
      claudePath: this.claudePath
    });
    this.fileHandler = new FileHandler({ verbose: this.verbose });

    // Track active interactive sessions for input routing
    this.activeInteractiveSessions = new Map(); // sessionId -> commandId
    this.commandToSessionMap = new Map();       // commandId -> sessionId (reverse lookup)

    // Set up claudeExecutor event listeners for interactive sessions
    this.setupClaudeExecutorListeners();

    // Heartbeat interval
    this.heartbeatInterval = null;
    this.lastHeartbeat = Date.now();

    // Enhanced statistics for production monitoring
    this.stats = {
      commandsExecuted: 0,
      commandsQueued: 0,
      commandsFailed: 0,
      interactiveSessions: 0,
      uptime: Date.now(),
      memoryUsage: 0,
      reconnections: 0,
      lastError: null
    };

    logger.info('Bridge client initialized', {
      serverUrl: this.serverUrl,
      maxReconnectAttempts: this.maxReconnectAttempts,
      queueConcurrency: this.commandQueue.concurrency,
      interactiveSupported: this.claudeExecutor.isInteractiveSupported()
    });
  }

  /**
   * Set up event listeners for ClaudeExecutor interactive sessions
   */
  setupClaudeExecutorListeners() {
    // When an interactive session starts
    this.claudeExecutor.on('interactive:started', ({ commandId, pid }) => {
      logger.info('Interactive session started', { commandId, pid });
      this.stats.interactiveSessions++;

      // Direct O(1) lookup using reverse map instead of iteration
      const foundSessionId = this.commandToSessionMap.get(commandId) || null;
      if (!foundSessionId) {
        logger.warn('No sessionId found for commandId in interactive:started', { commandId });
      }

      if (this.socket) {
        this.socket.emit('claude:interactive:started', {
          commandId,
          pid,
          sessionId: foundSessionId, // Include sessionId for server-side tracking
          interactiveSupported: true
        });
      }
    });

    // Stream data from interactive sessions
    this.claudeExecutor.on('data', ({ type, data, commandId }) => {
      // Data is already sent in handleClaudeCommand, but this catches
      // any data that might come through the event system
      logger.debug('ClaudeExecutor data event', { type, commandId, length: data?.length });
    });

    // When an interactive session exits
    this.claudeExecutor.on('exit', ({ commandId, exitCode, signal }) => {
      logger.info('Interactive session exited', { commandId, exitCode, signal });

      // Direct O(1) lookup using reverse map and clean up both maps
      const foundSessionId = this.commandToSessionMap.get(commandId) || null;
      if (foundSessionId) {
        this.activeInteractiveSessions.delete(foundSessionId);
        this.commandToSessionMap.delete(commandId);
      }

      if (this.socket) {
        this.socket.emit('claude:interactive:ended', {
          commandId,
          sessionId: foundSessionId, // Include sessionId for server-side cleanup
          exitCode,
          signal
        });
      }
    });
  }

  /**
   * Connect to the Coder1 IDE with pairing code
   */
  async connect(pairingCode) {
    try {
      // Step 1: Validate pairing code and get token
      this.log('Validating pairing code...');
      const pairingResponse = await this.validatePairingCode(pairingCode);
      
      if (!pairingResponse.success) {
        throw new Error(pairingResponse.error || 'Invalid pairing code');
      }
      
      this.token = pairingResponse.token;
      this.bridgeId = pairingResponse.bridgeId;
      this.userId = pairingResponse.userId;
      
      this.log(`Pairing successful. User ID: ${this.userId}`);

      // Save credentials for auto-reconnect
      saveCredentials({
        token: this.token,
        bridgeId: this.bridgeId,
        userId: this.userId,
        serverUrl: this.serverUrl,
        savedAt: new Date().toISOString()
      });
      this.log('Credentials saved for auto-reconnect');

      // Step 2: Connect WebSocket with token
      await this.connectWebSocket();
      
      // Step 3: Start heartbeat
      this.startHeartbeat();
      
      this.connected = true;
      this.emit('connected', { bridgeId: this.bridgeId, userId: this.userId });
      
    } catch (error) {
      this.error('Connection failed:', error);
      throw error;
    }
  }

  /**
   * Attempt to connect using saved credentials (auto-connect)
   * @returns {Promise<boolean>} true if connected, false if need pairing
   */
  async autoConnect() {
    const creds = loadCredentials();
    if (!creds) {
      this.log('No saved credentials found');
      return false;
    }

    this.log('Found saved credentials, attempting auto-connect...');
    this.log(`  Server: ${creds.serverUrl}`);
    this.log(`  Bridge ID: ${creds.bridgeId}`);
    this.log(`  Saved: ${creds.savedAt}`);

    // Use saved credentials
    this.token = creds.token;
    this.bridgeId = creds.bridgeId;
    this.userId = creds.userId;

    // Override server URL if credentials have a different one
    if (creds.serverUrl && creds.serverUrl !== this.serverUrl) {
      this.log(`Using saved server URL: ${creds.serverUrl}`);
      this.serverUrl = creds.serverUrl;
    }

    try {
      await this.connectWebSocket();
      this.startHeartbeat();
      this.connected = true;
      this.emit('connected', { bridgeId: this.bridgeId, userId: this.userId });
      this.log('Auto-connect successful!');
      return true;
    } catch (error) {
      this.error(`Auto-connect failed: ${error.message}`);
      clearCredentials();
      this.log('Credentials cleared - will need pairing code');
      return false;
    }
  }

  /**
   * Validate pairing code with server
   */
  async validatePairingCode(code) {
    const fetch = require('node-fetch');
    
    try {
      const response = await fetch(`${this.serverUrl}/api/bridge/pair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          version: require('../package.json').version,
          platform: process.platform,
          claudeVersion: await this.claudeExecutor.getVersion()
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Pairing failed');
      }
      
      return data;
    } catch (error) {
      this.error('Pairing error:', error);
      throw error;
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.log('Connecting to WebSocket server...');
      
      this.socket = io(`${this.serverUrl}/bridge`, {
        auth: {
          token: this.token
        },
        transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket (matches server config)
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        reconnectionAttempts: this.maxReconnectAttempts,
        upgrade: true, // Allow upgrade from polling to websocket
        rememberUpgrade: true, // Remember successful upgrades
        timeout: 45000, // Match server connectTimeout
        pingTimeout: 120000, // 2 minutes - generous timeout for production
        pingInterval: 25000 // 25 seconds - keep connection alive
      });
      
      // Connection success
      this.socket.on('connect', () => {
        this.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      });
      
      // Connection accepted
      this.socket.on('connection:accepted', (data) => {
        this.log('Connection accepted by server');
        this.bridgeId = data.bridgeId;
        this.emit('accepted', data);
      });
      
      // Connection rejected
      this.socket.on('connection:rejected', (data) => {
        this.error('Connection rejected:', data.reason);
        reject(new Error(data.reason || 'Connection rejected'));
      });
      
      // Handle Claude command execution requests
      this.socket.on('claude:execute', async (data) => {
        await this.handleClaudeCommand(data);
      });

      // Handle stdin input for interactive Claude sessions
      this.socket.on('claude:input', (data) => {
        this.handleClaudeInput(data);
      });

      // Handle terminal resize for interactive Claude sessions
      this.socket.on('claude:resize', (data) => {
        this.handleClaudeResize(data);
      });

      // Handle kill request for interactive Claude sessions
      this.socket.on('claude:kill', (data) => {
        this.handleClaudeKill(data);
      });

      // Handle file operation requests
      this.socket.on('file:request', async (data) => {
        await this.handleFileRequest(data);
      });

      // Handle configuration updates
      this.socket.on('config:update', (data) => {
        this.handleConfigUpdate(data);
      });
      
      // Connection error
      this.socket.on('connect_error', (error) => {
        this.error('Connection error:', error.message);
        this.reconnectAttempts++;

        // Clear credentials if authentication failed (token expired/invalid)
        if (error.message?.includes('authentication') ||
            error.message?.includes('invalid token') ||
            error.message?.includes('unauthorized')) {
          clearCredentials();
          this.log('Credentials cleared due to auth failure');
        }

        if (this.reconnectAttempts === 1) {
          reject(error);
        }
      });
      
      // Disconnection
      this.socket.on('disconnect', (reason) => {
        this.warn('Disconnected:', reason);
        this.connected = false;
        this.emit('disconnected', reason);
      });
      
      // Reconnection
      this.socket.on('reconnect', (attemptNumber) => {
        this.log(`Reconnected after ${attemptNumber} attempts`);
        this.connected = true;
        this.emit('reconnected');
      });
      
      // Set timeout for initial connection
      setTimeout(() => {
        if (!this.connected && this.socket) {
          reject(new Error('Connection timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Handle Claude command execution - Production Version with Queue
   * UPDATED (Dec 10, 2025): Added PTY support for interactive sessions
   * FIXED (Dec 10, 2025): Interactive sessions don't await - run in background
   */
  async handleClaudeCommand(data) {
    const { sessionId, commandId, command, context } = data;

    // Check if this will be an interactive session
    const isInteractive = this.claudeExecutor.needsInteractiveMode(command);

    // Add command to production queue
    this.stats.commandsQueued++;

    // Queue the command for execution
    await this.commandQueue.add(async () => {
      const startTime = Date.now();

      logger.info('Executing Claude command', {
        commandId,
        command: command.substring(0, 100), // Log first 100 chars
        sessionId,
        isInteractive,
        queueSize: this.commandQueue.size
      });

      try {
        // Change to working directory if specified AND it exists locally
        // 🔧 FIX (Dec 15, 2025): Server sends Render's cwd which doesn't exist on user's Mac
        // Only chdir if the directory actually exists on the local machine
        if (context?.workingDirectory) {
          const fs = require('fs');
          if (fs.existsSync(context.workingDirectory)) {
            process.chdir(context.workingDirectory);
            logger.debug('Changed working directory', {
              workingDirectory: context.workingDirectory
            });
          } else {
            logger.warn('Ignoring non-existent working directory from server', {
              requested: context.workingDirectory,
              using: process.cwd()
            });
          }
        }

        // Track interactive session for input routing
        if (isInteractive) {
          this.activeInteractiveSessions.set(sessionId, commandId);
          this.commandToSessionMap.set(commandId, sessionId); // Reverse mapping for O(1) lookup
          logger.info('Tracking interactive session', { sessionId, commandId });
        }

        // Common execution options
        const executeOptions = {
          commandId, // Pass commandId for session tracking
          context,   // Pass full context including selectedClaudeModel
          cols: context?.cols || 120,
          rows: context?.rows || 30,
          onData: (chunk) => {
            // Stream output back to server
            this.socket.emit('claude:output', {
              sessionId,
              commandId,
              data: chunk,
              stream: 'stdout',
              timestamp: Date.now(),
              interactive: isInteractive
            });
          },
          onError: (chunk) => {
            // Stream errors back to server
            this.socket.emit('claude:output', {
              sessionId,
              commandId,
              data: chunk,
              stream: 'stderr',
              timestamp: Date.now(),
              interactive: isInteractive
            });

            logger.warn('Claude command stderr', {
              commandId,
              error: chunk.substring(0, 200)
            });
          }
        };

        // CRITICAL FIX: For interactive sessions, DON'T await the execution
        // The PTY will stay open and stream output via onData callback
        // The 'interactive:started' event signals when session is ready
        // The 'exit' event handles cleanup when user exits
        if (isInteractive) {
          // Start execution WITHOUT awaiting - let it run in background
          this.claudeExecutor.execute(command, executeOptions)
            .then((result) => {
              // Interactive session ended (user typed /exit or Ctrl+C)
              logger.info('Interactive session ended normally', {
                commandId,
                exitCode: result.exitCode,
                duration: result.duration
              });

              // Clean up tracking (both maps)
              this.activeInteractiveSessions.delete(sessionId);
              this.commandToSessionMap.delete(commandId);

              // FIX (Jan 2026): If command failed, send the error message to terminal
              // Previously these errors were swallowed and users saw nothing
              if (result.exitCode !== 0 && (result.stderr || result.error)) {
                const errorText = result.stderr || result.error;
                this.socket.emit('claude:output', {
                  sessionId,
                  commandId,
                  data: `\r\n${errorText}\r\n`,
                  stream: 'stderr',
                  timestamp: Date.now()
                });
              }

              // Send completion
              this.socket.emit('claude:complete', {
                sessionId,
                commandId,
                exitCode: result.exitCode,
                duration: result.duration,
                error: result.error,
                interactive: true
              });

              this.stats.commandsExecuted++;
            })
            .catch((error) => {
              // Interactive session failed
              logger.error('Interactive session error', {
                commandId,
                error: error.message
              });

              this.activeInteractiveSessions.delete(sessionId);
              this.commandToSessionMap.delete(commandId); // Clean up reverse map
              this.stats.commandsFailed++;
              this.stats.lastError = error.message;

              // 🔧 FIX (Dec 15, 2025): More specific error detection
              // Only show "Claude CLI not found" if the error is actually about Claude CLI
              const errorMessage = this.formatClaudeError(error.message);

              this.socket.emit('claude:error', {
                sessionId,
                commandId,
                error: errorMessage,
                timestamp: Date.now()
              });

              this.socket.emit('claude:complete', {
                sessionId,
                commandId,
                exitCode: 1,
                duration: Date.now() - startTime,
                error: error.message,
                interactive: true
              });
            });

          // Immediately return from queue - session is running in background
          // The 'interactive:started' event will notify the server
          logger.info('Interactive session spawned, returning immediately', {
            commandId,
            sessionId
          });
          return;
        }

        // Non-interactive: await the full execution
        const result = await this.claudeExecutor.execute(command, executeOptions);

        // FIX (Jan 2026): If command failed, send the error message to terminal
        if (result.exitCode !== 0 && (result.stderr || result.error)) {
          const errorText = result.stderr || result.error;
          this.socket.emit('claude:output', {
            sessionId,
            commandId,
            data: `\r\n${errorText}\r\n`,
            stream: 'stderr',
            timestamp: Date.now()
          });
        }

        // Send completion
        this.socket.emit('claude:complete', {
          sessionId,
          commandId,
          exitCode: result.exitCode,
          duration: result.duration,
          error: result.error,
          interactive: result.interactive
        });

        const duration = Date.now() - startTime;
        this.stats.commandsExecuted++;

        logger.info('Claude command completed', {
          commandId,
          exitCode: result.exitCode,
          duration,
          interactive: result.interactive,
          success: result.exitCode === 0
        });

      } catch (error) {
        const duration = Date.now() - startTime;
        this.stats.commandsFailed++;
        this.stats.lastError = error.message;

        // Clean up interactive session tracking on error
        if (isInteractive) {
          this.activeInteractiveSessions.delete(sessionId);
          this.commandToSessionMap.delete(commandId);
        }

        logger.error('Command execution error', {
          commandId,
          error: error.message,
          stack: error.stack,
          duration
        });

        // 🔧 FIX (Dec 15, 2025): More specific error detection
        const errorMessage = this.formatClaudeError(error.message);

        this.socket.emit('claude:error', {
          sessionId,
          commandId,
          error: errorMessage,
          timestamp: Date.now()
        });

        // Send error completion
        this.socket.emit('claude:complete', {
          sessionId,
          commandId,
          exitCode: 1,
          duration,
          error: error.message
        });
      }
    });
  }

  /**
   * Handle stdin input for interactive Claude sessions
   * Routes keyboard input from IDE terminal to the PTY process
   */
  handleClaudeInput(data) {
    const { sessionId, commandId, input } = data;

    // Try to find the session by commandId first, then by sessionId mapping
    let targetCommandId = commandId;
    if (!targetCommandId && sessionId) {
      targetCommandId = this.activeInteractiveSessions.get(sessionId);
    }

    if (!targetCommandId) {
      logger.warn('No active interactive session for input', { sessionId, commandId });
      return;
    }

    const success = this.claudeExecutor.writeToSession(targetCommandId, input);

    if (!success) {
      logger.warn('Failed to write to interactive session', { targetCommandId, inputLength: input?.length });
    } else {
      logger.debug('Wrote input to interactive session', { targetCommandId, inputLength: input?.length });
    }
  }

  /**
   * Handle terminal resize for interactive Claude sessions
   */
  handleClaudeResize(data) {
    const { sessionId, commandId, cols, rows } = data;

    // Try to find the session
    let targetCommandId = commandId;
    if (!targetCommandId && sessionId) {
      targetCommandId = this.activeInteractiveSessions.get(sessionId);
    }

    if (!targetCommandId) {
      logger.warn('No active interactive session for resize', { sessionId, commandId });
      return;
    }

    const success = this.claudeExecutor.resizeSession(targetCommandId, cols, rows);

    if (success) {
      logger.debug('Resized interactive session', { targetCommandId, cols, rows });
    } else {
      logger.warn('Failed to resize interactive session', { targetCommandId });
    }
  }

  /**
   * Handle kill request for interactive Claude sessions
   */
  handleClaudeKill(data) {
    const { sessionId, commandId } = data;

    // Try to find the session
    let targetCommandId = commandId;
    if (!targetCommandId && sessionId) {
      targetCommandId = this.activeInteractiveSessions.get(sessionId);
    }

    if (!targetCommandId) {
      logger.warn('No active interactive session to kill', { sessionId, commandId });
      return;
    }

    const success = this.claudeExecutor.killSession(targetCommandId);

    if (success) {
      logger.info('Killed interactive session', { targetCommandId });
      this.activeInteractiveSessions.delete(sessionId);
    } else {
      logger.warn('Failed to kill interactive session', { targetCommandId });
    }
  }

  /**
   * Handle file operation requests
   */
  async handleFileRequest(data) {
    const { requestId, operation, path, content, options } = data;
    
    this.log(`File operation: ${operation} on ${path}`);
    
    try {
      let result;
      
      switch (operation) {
        case 'read':
          result = await this.fileHandler.read(path, options);
          break;
        case 'write':
          result = await this.fileHandler.write(path, content, options);
          break;
        case 'list':
          result = await this.fileHandler.list(path, options);
          break;
        case 'exists':
          result = await this.fileHandler.exists(path);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      // Send response
      this.socket.emit('file:response', {
        requestId,
        operation,
        result,
        error: null
      });
      
    } catch (error) {
      this.error('File operation error:', error);
      
      // Send error response
      this.socket.emit('file:response', {
        requestId,
        operation,
        result: null,
        error: error.message
      });
    }
  }

  /**
   * Handle configuration updates
   */
  handleConfigUpdate(data) {
    this.log('Configuration update received:', data);
    
    if (data.maxCommandTimeout) {
      this.claudeExecutor.setMaxTimeout(data.maxCommandTimeout);
    }
    
    if (data.workingDirectory) {
      process.chdir(data.workingDirectory);
    }
    
    this.emit('config:updated', data);
  }

  /**
   * Start heartbeat to maintain connection
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.connected) {
        // Update memory usage
        const memUsage = process.memoryUsage();
        this.stats.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024);
        
        // Calculate uptime
        const uptime = Math.floor((Date.now() - this.stats.uptime) / 1000);
        
        // Send heartbeat
        this.socket.emit('heartbeat', {
          timestamp: Date.now(),
          status: 'active',
          stats: {
            ...this.stats,
            uptime
          }
        });
        
        this.lastHeartbeat = Date.now();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Disconnect from server
   */
  async disconnect() {
    this.log('Disconnecting...');
    
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connected = false;
    this.emit('disconnected', 'manual');
  }

  /**
   * Format error messages for Claude-specific errors
   * 🔧 FIX (Dec 15, 2025): More specific error detection to avoid misleading messages
   */
  formatClaudeError(errorMsg) {
    // Check if error is specifically about Claude CLI not being found
    if (errorMsg.includes('Claude CLI') && (errorMsg.includes('not found') || errorMsg.includes('ENOENT'))) {
      return 'Claude CLI not found. Please install: npm install -g @anthropic-ai/claude-code';
    }

    // Check for path validation errors (more specific)
    if (errorMsg.includes('path validation failed')) {
      return errorMsg; // Show the detailed path validation error
    }

    // Check for generic ENOENT that might be about working directory
    if (errorMsg.includes('ENOENT') && errorMsg.includes('chdir')) {
      return `Working directory error: ${errorMsg}`;
    }

    // Check for spawn errors with 'claude' in the path
    if ((errorMsg.includes('ENOENT') || errorMsg.includes('spawn')) && errorMsg.toLowerCase().includes('claude')) {
      return 'Claude CLI not found. Please install: npm install -g @anthropic-ai/claude-code';
    }

    // Default: return original error message for debugging
    return errorMsg;
  }

  /**
   * Logging helpers
   */
  log(...args) {
    if (this.verbose) {
      console.log('\x1b[90m[Bridge]\x1b[0m', ...args);
    }
  }

  warn(...args) {
    console.warn('\x1b[33m[Bridge]\x1b[0m', ...args);
  }

  error(...args) {
    console.error('\x1b[31m[Bridge]\x1b[0m', ...args);
  }
}

module.exports = BridgeClient;