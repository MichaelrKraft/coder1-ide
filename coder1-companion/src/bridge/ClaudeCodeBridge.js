const { spawn } = require('child_process');
const pty = require('node-pty');
const path = require('path');
const fs = require('fs').promises;

class ClaudeCodeBridge {
  constructor(options) {
    this.logger = options.logger;
    this.config = options.config;
    
    // Claude Code process management
    this.claudePath = null;
    this.activeProcesses = new Map();
    this.sessionHistory = new Map();
    
    // Command queue and rate limiting
    this.commandQueue = [];
    this.processing = false;
    this.rateLimiter = {
      requests: [],
      maxRequests: 10,
      windowMs: 60000 // 1 minute
    };
  }

  async initialize() {
    this.logger.info('🔍 Detecting Claude Code installation...');
    
    try {
      // Try to find Claude Code executable
      this.claudePath = await this.detectClaudeCode();
      
      if (!this.claudePath) {
        throw new Error('Claude Code not found in PATH');
      }
      
      // Verify Claude Code is working
      await this.verifyClaudeCode();
      
      this.logger.success(`✅ Claude Code found: ${this.claudePath}`);
      
      // Setup cleanup on exit
      process.on('exit', () => this.cleanup());
      
    } catch (error) {
      this.logger.error('❌ Claude Code initialization failed:', error.message);
      throw error;
    }
  }

  async detectClaudeCode() {
    const possiblePaths = [
      'claude',
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      path.join(require('os').homedir(), '.local/bin/claude'),
      path.join(require('os').homedir(), 'bin/claude')
    ];
    
    for (const claudePath of possiblePaths) {
      try {
        const { stdout } = await this.execCommand('which', [claudePath]);
        if (stdout.trim()) {
          return stdout.trim();
        }
      } catch (error) {
        // Continue trying other paths
      }
    }
    
    // Try direct execution
    for (const claudePath of possiblePaths) {
      try {
        await this.execCommand(claudePath, ['--version']);
        return claudePath;
      } catch (error) {
        // Continue trying
      }
    }
    
    return null;
  }

  async verifyClaudeCode() {
    try {
      const { stdout } = await this.execCommand(this.claudePath, ['--version']);
      const versionMatch = stdout.match(/claude-code\s+(\d+\.\d+\.\d+)/);
      
      if (!versionMatch) {
        throw new Error('Invalid Claude Code version response');
      }
      
      const version = versionMatch[1];
      this.logger.info(`📋 Claude Code version: ${version}`);
      
      // Check for required features
      const features = await this.checkFeatures();
      this.logger.info(`🎯 Available features: ${features.join(', ')}`);
      
      return { version, features };
      
    } catch (error) {
      throw new Error(`Claude Code verification failed: ${error.message}`);
    }
  }

  async checkFeatures() {
    const features = [];
    
    // Check for headless mode support
    try {
      await this.execCommand(this.claudePath, ['--help']);
      features.push('headless');
    } catch (error) {
      // Feature not available
    }
    
    // Check for JSON output support
    try {
      const { stdout } = await this.execCommand(this.claudePath, ['--help']);
      if (stdout.includes('--output-format')) {
        features.push('json-output');
      }
    } catch (error) {
      // Feature not available
    }
    
    // Check for custom commands
    try {
      const claudeConfigDir = path.join(process.cwd(), '.claude');
      await fs.access(claudeConfigDir);
      features.push('custom-commands');
    } catch (error) {
      // .claude directory not found, but feature may still be available
      features.push('custom-commands');
    }
    
    return features;
  }

  async executeCommand(options) {
    const { command, workDir, sessionId, onProgress } = options;
    
    // Rate limiting check
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please wait before sending more commands.');
    }
    
    this.logger.info(`🚀 Executing Claude command: ${command}`);
    
    try {
      // Determine execution method based on command complexity
      const execution = command.includes('\n') || command.length > 200
        ? await this.executeComplexCommand(command, workDir, sessionId, onProgress)
        : await this.executeSimpleCommand(command, workDir, sessionId, onProgress);
      
      // Store in session history
      this.updateSessionHistory(sessionId, command, execution);
      
      return execution;
      
    } catch (error) {
      this.logger.error(`❌ Claude command failed: ${error.message}`);
      throw error;
    }
  }

  async executeSimpleCommand(command, workDir, sessionId, onProgress) {
    const startTime = Date.now();
    
    // Use headless mode with JSON output for simple commands
    const args = [
      '-p', command,
      '--output-format', 'stream-json'
    ];
    
    if (workDir && workDir !== process.cwd()) {
      process.chdir(workDir);
    }
    
    const result = await this.spawnClaudeProcess(args, {
      cwd: workDir || process.cwd(),
      onProgress
    });
    
    const duration = Date.now() - startTime;
    this.logger.info(`⚡ Command completed in ${duration}ms`);
    
    return {
      type: 'simple',
      command,
      result: result.output,
      duration,
      success: result.exitCode === 0,
      sessionId
    };
  }

  async executeHeadlessCommand(options) {
    // Specialized method for headless Claude Code execution with extended options
    const {
      command,
      workDir,
      sessionId,
      timeout = 60000,
      outputFormat = 'stream-json'
    } = options;

    this.logger.info(`🤖 Executing headless Claude command for session: ${sessionId}`);
    
    const startTime = Date.now();
    
    // Build command arguments for headless mode
    const args = [
      '-p', command,
      '--output-format', outputFormat
    ];
    
    // Change working directory if specified
    if (workDir && workDir !== process.cwd()) {
      process.chdir(workDir);
    }
    
    try {
      const result = await this.spawnClaudeProcess(args, {
        cwd: workDir || process.cwd(),
        timeout,
        onProgress: (data) => {
          this.logger.debug(`📥 Claude headless output: ${data.substring(0, 100)}...`);
        }
      });
      
      const duration = Date.now() - startTime;
      this.logger.success(`✅ Headless command completed in ${duration}ms`);
      
      return {
        type: 'headless',
        command,
        result: result.output,
        duration,
        success: result.exitCode === 0,
        sessionId,
        outputFormat
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Headless command failed after ${duration}ms:`, error.message);
      
      return {
        type: 'headless',
        command,
        result: null,
        duration,
        success: false,
        sessionId,
        error: error.message,
        outputFormat
      };
    }
  }

  async executeComplexCommand(command, workDir, sessionId, onProgress) {
    const startTime = Date.now();
    
    // Use interactive PTY for complex commands
    const processId = `claude_${Date.now()}`;
    
    const ptyProcess = pty.spawn(this.claudePath, [], {
      name: 'xterm-color',
      cols: 120,
      rows: 30,
      cwd: workDir || process.cwd(),
      env: process.env
    });
    
    this.activeProcesses.set(processId, ptyProcess);
    
    let output = '';
    let isComplete = false;
    let completionMarkers = 0;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ptyProcess.kill();
        this.activeProcesses.delete(processId);
        reject(new Error('Command execution timeout'));
      }, 300000); // 5 minute timeout
      
      ptyProcess.on('data', (data) => {
        output += data;
        
        // Progress reporting
        if (onProgress) {
          onProgress({
            type: 'output',
            data: data,
            timestamp: new Date().toISOString()
          });
        }
        
        // Check for completion markers
        if (data.includes('</result>') || data.includes('Command completed')) {
          completionMarkers++;
        }
        
        // Heuristic completion detection
        if (completionMarkers > 0 && data.includes('\n$ ') || data.includes('\n> ')) {
          if (!isComplete) {
            isComplete = true;
            clearTimeout(timeout);
            
            this.activeProcesses.delete(processId);
            ptyProcess.kill();
            
            const duration = Date.now() - startTime;
            this.logger.info(`⚡ Complex command completed in ${duration}ms`);
            
            resolve({
              type: 'complex',
              command,
              result: this.parseClaudeOutput(output),
              duration,
              success: true,
              sessionId,
              processId
            });
          }
        }
      });
      
      ptyProcess.on('exit', (exitCode) => {
        if (!isComplete) {
          clearTimeout(timeout);
          this.activeProcesses.delete(processId);
          
          const duration = Date.now() - startTime;
          
          if (exitCode === 0) {
            resolve({
              type: 'complex',
              command,
              result: this.parseClaudeOutput(output),
              duration,
              success: true,
              sessionId,
              processId
            });
          } else {
            reject(new Error(`Claude Code process exited with code ${exitCode}`));
          }
        }
      });
      
      // Send the command
      ptyProcess.write(command + '\n');
    });
  }

  async spawnClaudeProcess(args, options) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.claudePath, args, {
        cwd: options.cwd,
        stdio: 'pipe'
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        
        if (options.onProgress) {
          options.onProgress({
            type: 'stdout',
            data: chunk,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      process.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        
        if (options.onProgress) {
          options.onProgress({
            type: 'stderr',
            data: chunk,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      process.on('close', (exitCode) => {
        resolve({
          output: stdout,
          error: stderr,
          exitCode
        });
      });
      
      process.on('error', reject);
    });
  }

  parseClaudeOutput(rawOutput) {
    // Try to parse as JSON first (for stream-json format)
    const lines = rawOutput.split('\n');
    const jsonObjects = [];
    
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        try {
          const obj = JSON.parse(line);
          jsonObjects.push(obj);
        } catch (error) {
          // Not valid JSON, continue
        }
      }
    }
    
    if (jsonObjects.length > 0) {
      return {
        format: 'json',
        objects: jsonObjects,
        raw: rawOutput
      };
    }
    
    // Fallback to text parsing
    return {
      format: 'text',
      content: rawOutput,
      raw: rawOutput
    };
  }

  checkRateLimit() {
    const now = Date.now();
    
    // Remove old requests
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      timestamp => now - timestamp < this.rateLimiter.windowMs
    );
    
    // Check if under limit
    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequests) {
      return false;
    }
    
    // Add current request
    this.rateLimiter.requests.push(now);
    return true;
  }

  updateSessionHistory(sessionId, command, result) {
    if (!sessionId) return;
    
    if (!this.sessionHistory.has(sessionId)) {
      this.sessionHistory.set(sessionId, []);
    }
    
    const history = this.sessionHistory.get(sessionId);
    history.push({
      timestamp: new Date().toISOString(),
      command,
      result,
      duration: result.duration
    });
    
    // Keep only last 100 commands per session
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  async getSessionHistory(sessionId) {
    return this.sessionHistory.get(sessionId) || [];
  }

  async execCommand(command, args) {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const process = spawn(command, args);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (exitCode) => {
        if (exitCode === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with exit code ${exitCode}: ${stderr}`));
        }
      });
      
      process.on('error', reject);
    });
  }

  isReady() {
    return !!this.claudePath;
  }

  async cleanup() {
    this.logger.info('🧹 Cleaning up Claude Code Bridge...');
    
    // Kill all active processes
    for (const [processId, process] of this.activeProcesses) {
      this.logger.debug(`Killing process: ${processId}`);
      process.kill();
    }
    
    this.activeProcesses.clear();
    this.sessionHistory.clear();
    
    this.logger.info('✅ Claude Code Bridge cleanup complete');
  }
}

module.exports = { ClaudeCodeBridge };