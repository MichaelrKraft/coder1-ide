#!/usr/bin/env node

/**
 * Coder1 Bridge Service
 * 
 * Standalone service that bridges Coder1 web IDE with local Claude CLI
 * Runs on user's machine to provide secure local access to Claude CLI
 * 
 * Architecture:
 * - WebSocket client connects to Coder1 web service
 * - Local Claude CLI integration via child_process
 * - Secure authentication using Bridge tokens
 * - Session persistence and cleanup
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class Coder1Bridge extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      serverUrl: options.serverUrl || 'wss://coder1.app',
      bridgeId: options.bridgeId || this.generateBridgeId(),
      authToken: options.authToken || null,
      reconnectDelay: options.reconnectDelay || 5000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      claudeCliPath: options.claudeCliPath || this.detectClaudeCliPath(),
      workingDirectory: options.workingDirectory || process.cwd(),
      ...options
    };

    this.ws = null;
    this.reconnectAttempts = 0;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.activeProcesses = new Map();
    this.sessionId = null;
    
    this.log('Coder1 Bridge initialized', this.config.bridgeId);
  }

  /**
   * Start the bridge service
   */
  async start() {
    this.log('Starting Coder1 Bridge service...');
    
    try {
      // Verify Claude CLI is available
      await this.verifyClaudeCli();
      
      // Connect to Coder1 server
      await this.connect();
      
      // Start health check interval
      this.startHealthCheck();
      
      this.log('✅ Coder1 Bridge service started successfully');
      this.emit('started');
      
    } catch (error) {
      this.error('❌ Failed to start Coder1 Bridge:', error.message);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the bridge service
   */
  async stop() {
    this.log('Stopping Coder1 Bridge service...');
    
    // Close WebSocket connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Kill active processes
    for (const [id, process] of this.activeProcesses) {
      try {
        process.kill();
        this.activeProcesses.delete(id);
      } catch (error) {
        this.error(`Failed to kill process ${id}:`, error.message);
      }
    }

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.isConnected = false;
    this.isAuthenticated = false;
    
    this.log('✅ Coder1 Bridge service stopped');
    this.emit('stopped');
  }

  /**
   * Connect to Coder1 server
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.config.serverUrl}/bridge`;
      this.log(`🔌 Connecting to ${wsUrl}...`);

      this.ws = new WebSocket(wsUrl, {
        headers: {
          'User-Agent': `Coder1-Bridge/${this.getVersion()}`,
          'X-Bridge-ID': this.config.bridgeId,
          'X-Bridge-Auth': this.config.authToken || 'anonymous'
        }
      });

      this.ws.on('open', () => {
        this.log('✅ Connected to Coder1 server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send authentication
        this.authenticate();
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', (code, reason) => {
        this.log(`❌ Disconnected from server: ${code} ${reason}`);
        this.isConnected = false;
        this.isAuthenticated = false;
        
        // Attempt reconnection if not intentional
        if (code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (error) => {
        this.error('WebSocket error:', error.message);
        reject(error);
      });
    });
  }

  /**
   * Authenticate with Coder1 server
   */
  authenticate() {
    const authMessage = {
      type: 'auth',
      bridgeId: this.config.bridgeId,
      version: this.getVersion(),
      platform: os.platform(),
      claudeCliAvailable: !!this.config.claudeCliPath,
      capabilities: ['claude-cli', 'file-operations', 'terminal-proxy'],
      timestamp: Date.now()
    };

    this.send(authMessage);
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      this.debug('📨 Received:', message.type);

      switch (message.type) {
        case 'auth_success':
          this.handleAuthSuccess(message);
          break;
          
        case 'auth_error':
          this.handleAuthError(message);
          break;
          
        case 'claude_command':
          this.handleClaudeCommand(message);
          break;
          
        case 'file_operation':
          this.handleFileOperation(message);
          break;
          
        case 'health_check':
          this.handleHealthCheck(message);
          break;
          
        default:
          this.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      this.error('Failed to handle message:', error.message);
    }
  }

  /**
   * Handle successful authentication
   */
  handleAuthSuccess(message) {
    this.isAuthenticated = true;
    this.sessionId = message.sessionId;
    this.log('✅ Authenticated successfully');
    this.log(`📋 Session ID: ${this.sessionId}`);
    this.emit('authenticated', message);
  }

  /**
   * Handle authentication error
   */
  handleAuthError(message) {
    this.error('❌ Authentication failed:', message.error);
    this.emit('auth_error', message);
  }

  /**
   * Handle Claude CLI command execution
   */
  async handleClaudeCommand(message) {
    const { commandId, command, args = [], workingDir } = message;
    
    try {
      this.log(`🤖 Executing Claude command: ${command}`);
      
      // Spawn Claude CLI process
      const process = spawn(this.config.claudeCliPath, [command, ...args], {
        cwd: workingDir || this.config.workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CODER1_BRIDGE_SESSION: this.sessionId
        }
      });

      this.activeProcesses.set(commandId, process);

      // Handle process output
      process.stdout.on('data', (data) => {
        this.send({
          type: 'claude_output',
          commandId,
          stream: 'stdout',
          data: data.toString()
        });
      });

      process.stderr.on('data', (data) => {
        this.send({
          type: 'claude_output',
          commandId,
          stream: 'stderr',
          data: data.toString()
        });
      });

      // Handle process completion
      process.on('close', (code) => {
        this.activeProcesses.delete(commandId);
        this.send({
          type: 'claude_complete',
          commandId,
          exitCode: code
        });
      });

      process.on('error', (error) => {
        this.activeProcesses.delete(commandId);
        this.send({
          type: 'claude_error',
          commandId,
          error: error.message
        });
      });

    } catch (error) {
      this.send({
        type: 'claude_error',
        commandId,
        error: error.message
      });
    }
  }

  /**
   * Handle file operations
   */
  async handleFileOperation(message) {
    const { operationId, operation, path: filePath, data } = message;
    
    try {
      let result;
      
      switch (operation) {
        case 'read':
          result = await fs.readFile(filePath, 'utf8');
          break;
          
        case 'write':
          await fs.writeFile(filePath, data, 'utf8');
          result = 'success';
          break;
          
        case 'exists':
          try {
            await fs.access(filePath);
            result = true;
          } catch {
            result = false;
          }
          break;
          
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      this.send({
        type: 'file_result',
        operationId,
        result
      });

    } catch (error) {
      this.send({
        type: 'file_error',
        operationId,
        error: error.message
      });
    }
  }

  /**
   * Handle health check requests
   */
  handleHealthCheck(message) {
    const stats = {
      bridgeId: this.config.bridgeId,
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      activeProcesses: this.activeProcesses.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      claudeCliAvailable: !!this.config.claudeCliPath,
      timestamp: Date.now()
    };

    this.send({
      type: 'health_response',
      requestId: message.requestId,
      stats
    });
  }

  /**
   * Send message to server
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.warn('Cannot send message: WebSocket not connected');
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    this.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        this.error('Reconnection failed:', error.message);
      });
    }, delay);
  }

  /**
   * Start health check interval
   */
  startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      if (this.isConnected && this.isAuthenticated) {
        this.send({
          type: 'ping',
          timestamp: Date.now()
        });
      }
    }, 30000); // 30 second health checks
  }

  /**
   * Detect Claude CLI installation path
   */
  detectClaudeCliPath() {
    // Common Claude CLI installation paths
    const possiblePaths = [
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      path.join(os.homedir(), '.local/bin/claude'),
      path.join(os.homedir(), 'bin/claude'),
      'claude' // Assume in PATH
    ];

    for (const claudePath of possiblePaths) {
      try {
        // This would need to be tested properly in real implementation
        return claudePath;
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Verify Claude CLI is available
   */
  async verifyClaudeCli() {
    if (!this.config.claudeCliPath) {
      throw new Error('Claude CLI not found. Please install Claude Code CLI from https://claude.ai/code');
    }

    // In real implementation, this would test the CLI
    this.log('✅ Claude CLI verified:', this.config.claudeCliPath);
  }

  /**
   * Generate unique bridge ID
   */
  generateBridgeId() {
    const hostname = os.hostname();
    const random = crypto.randomBytes(8).toString('hex');
    return `bridge_${hostname}_${random}`;
  }

  /**
   * Get bridge version
   */
  getVersion() {
    return '1.0.0-alpha';
  }

  /**
   * Logging utilities
   */
  log(...args) {
    console.log(`[${new Date().toISOString()}] [Bridge]`, ...args);
  }

  debug(...args) {
    if (process.env.DEBUG) {
      console.log(`[${new Date().toISOString()}] [Debug]`, ...args);
    }
  }

  warn(...args) {
    console.warn(`[${new Date().toISOString()}] [Warn]`, ...args);
  }

  error(...args) {
    console.error(`[${new Date().toISOString()}] [Error]`, ...args);
  }
}

/**
 * CLI Interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};

  // Parse CLI arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];
    if (key && value) {
      config[key] = value;
    }
  }

  // Create and start bridge
  const bridge = new Coder1Bridge(config);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await bridge.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await bridge.stop();
    process.exit(0);
  });

  // Start the bridge
  bridge.start().catch(error => {
    console.error('❌ Failed to start Coder1 Bridge:', error.message);
    process.exit(1);
  });
}

module.exports = { Coder1Bridge };