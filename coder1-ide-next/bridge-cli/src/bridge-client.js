/**
 * Bridge Client - Production Version
 * Handles WebSocket connection to Coder1 IDE and Claude CLI execution
 * Features: Winston logging, p-queue command management, auto-reconnection
 */

const io = require('socket.io-client');
const EventEmitter = require('events');
const PQueue = require('p-queue').default;
const logger = require('./logger');
const ClaudeExecutor = require('./claude-executor');
const FileHandler = require('./file-handler');

class BridgeClient extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.serverUrl = options.serverUrl || 'https://coder1-ide.onrender.com';
    this.verbose = options.verbose || false;
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
    this.claudeExecutor = new ClaudeExecutor({ verbose: this.verbose });
    this.fileHandler = new FileHandler({ verbose: this.verbose });
    
    // Heartbeat interval
    this.heartbeatInterval = null;
    this.lastHeartbeat = Date.now();
    
    // Enhanced statistics for production monitoring
    this.stats = {
      commandsExecuted: 0,
      commandsQueued: 0,
      commandsFailed: 0,
      uptime: Date.now(),
      memoryUsage: 0,
      reconnections: 0,
      lastError: null
    };
    
    logger.info('Bridge client initialized', {
      serverUrl: this.serverUrl,
      maxReconnectAttempts: this.maxReconnectAttempts,
      queueConcurrency: this.commandQueue.concurrency
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
   * Validate pairing code with server
   */
  async validatePairingCode(code) {
    const fetch = (await import('node-fetch')).default;
    
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
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        reconnectionAttempts: this.maxReconnectAttempts
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
   */
  async handleClaudeCommand(data) {
    const { sessionId, commandId, command, context } = data;
    
    // Add command to production queue
    this.stats.commandsQueued++;
    
    // Queue the command for execution
    await this.commandQueue.add(async () => {
      const startTime = Date.now();
      
      logger.info('Executing Claude command', { 
        commandId, 
        command: command.substring(0, 100), // Log first 100 chars
        sessionId,
        queueSize: this.commandQueue.size
      });
      
      try {
        // Change to working directory if specified
        if (context?.workingDirectory) {
          process.chdir(context.workingDirectory);
          logger.debug('Changed working directory', { 
            workingDirectory: context.workingDirectory 
          });
        }
        
        // Execute Claude command
        const result = await this.claudeExecutor.execute(command, {
          onData: (chunk) => {
            // Stream output back to server
            this.socket.emit('claude:output', {
              sessionId,
              commandId,
              data: chunk,
              stream: 'stdout',
              timestamp: Date.now()
            });
          },
          onError: (chunk) => {
            // Stream errors back to server
            this.socket.emit('claude:output', {
              sessionId,
              commandId,
              data: chunk,
              stream: 'stderr',
              timestamp: Date.now()
            });
            
            logger.warn('Claude command stderr', { 
              commandId, 
              error: chunk.substring(0, 200) 
            });
          }
        });
        
        // Send completion
        this.socket.emit('claude:complete', {
          sessionId,
          commandId,
          exitCode: result.exitCode,
          duration: result.duration,
          error: result.error
        });
        
        const duration = Date.now() - startTime;
        this.stats.commandsExecuted++;
        
        logger.info('Claude command completed', { 
          commandId, 
          exitCode: result.exitCode,
          duration,
          success: result.exitCode === 0
        });
      
      } catch (error) {
        const duration = Date.now() - startTime;
        this.stats.commandsFailed++;
        this.stats.lastError = error.message;
        
        logger.error('Command execution error', { 
          commandId, 
          error: error.message,
          stack: error.stack,
          duration
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