/**
 * Claude Executor
 * Handles execution of Claude CLI commands
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');
// Production logging - no chalk dependency

class ClaudeExecutor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.verbose = options.verbose || false;
    this.maxTimeout = options.maxTimeout || 60000; // 60 seconds default
    this.claudePath = options.claudePath || 'claude'; // Assume in PATH
  }

  /**
   * Execute a Claude command
   */
  async execute(command, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Parse command into parts
      const parts = this.parseCommand(command);
      const claudeCommand = parts[0]; // Should be 'claude'
      let args = parts.slice(1);
      
      // Add model parameter if specified in context
      if (options.context && options.context.selectedClaudeModel) {
        const modelIndex = args.findIndex(arg => arg === '--model');
        if (modelIndex === -1) {
          // Add model parameter if not already present
          args.unshift('--model', options.context.selectedClaudeModel);
        } else {
          // Replace existing model parameter
          args[modelIndex + 1] = options.context.selectedClaudeModel;
        }
      }
      
      this.log(`Executing: claude ${args.join(' ')}`);
      
      // Spawn Claude process
      const claudeProcess = spawn(this.claudePath, args, {
        env: {
          ...process.env,
          CODER1_BRIDGE: 'true',
          TERM: 'xterm-256color'
        },
        shell: false
      });
      
      let outputBuffer = '';
      let errorBuffer = '';
      let hasExited = false;
      
      // Handle stdout
      claudeProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        outputBuffer += chunk;
        
        if (options.onData) {
          options.onData(chunk);
        }
        
        this.emit('data', { type: 'stdout', data: chunk });
      });
      
      // Handle stderr
      claudeProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorBuffer += chunk;
        
        if (options.onError) {
          options.onError(chunk);
        }
        
        this.emit('data', { type: 'stderr', data: chunk });
      });
      
      // Handle process exit
      claudeProcess.on('close', (code, signal) => {
        if (hasExited) return;
        hasExited = true;
        
        const duration = Date.now() - startTime;
        
        this.log(`Process exited with code ${code} after ${duration}ms`);
        
        resolve({
          exitCode: code || 0,
          signal,
          stdout: outputBuffer,
          stderr: errorBuffer,
          duration,
          error: code !== 0 ? errorBuffer || 'Command failed' : null
        });
      });
      
      // Handle process error
      claudeProcess.on('error', (error) => {
        if (hasExited) return;
        hasExited = true;
        
        this.error('Process error:', error);
        
        if (error.code === 'ENOENT') {
          reject(new Error('Claude CLI not found. Please ensure Claude Code is installed.'));
        } else {
          reject(error);
        }
      });
      
      // Set timeout
      const timeout = setTimeout(() => {
        if (!hasExited) {
          this.warn('Command timeout, killing process...');
          claudeProcess.kill('SIGTERM');
          
          setTimeout(() => {
            if (!hasExited) {
              claudeProcess.kill('SIGKILL');
            }
          }, 5000);
        }
      }, this.maxTimeout);
      
      // Clear timeout on exit
      claudeProcess.on('exit', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Get Claude CLI version
   */
  async getVersion() {
    try {
      const result = await this.execute('claude --version', {
        onData: () => {}, // Suppress output
        onError: () => {}
      });
      
      if (result.exitCode === 0 && result.stdout) {
        // Extract version from output
        const versionMatch = result.stdout.match(/(\d+\.\d+\.\d+)/);
        if (versionMatch) {
          return versionMatch[1];
        }
        return result.stdout.trim();
      }
      
      return null;
    } catch (error) {
      this.warn('Failed to get Claude version:', error.message);
      return null;
    }
  }

  /**
   * Check if Claude CLI is available
   */
  async isAvailable() {
    try {
      const result = await this.execute('claude --version', {
        onData: () => {},
        onError: () => {}
      });
      return result.exitCode === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse command string into arguments
   * Handles quoted strings properly
   */
  parseCommand(command) {
    const args = [];
    let current = '';
    let inQuote = false;
    let quoteChar = null;
    
    for (let i = 0; i < command.length; i++) {
      const char = command[i];
      const nextChar = command[i + 1];
      
      if (!inQuote && (char === '"' || char === "'")) {
        inQuote = true;
        quoteChar = char;
      } else if (inQuote && char === quoteChar) {
        inQuote = false;
        quoteChar = null;
      } else if (!inQuote && char === ' ') {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current) {
      args.push(current);
    }
    
    return args;
  }

  /**
   * Set maximum command timeout
   */
  setMaxTimeout(timeout) {
    this.maxTimeout = timeout;
    this.log(`Max timeout set to ${timeout}ms`);
  }

  /**
   * Logging helpers
   */
  log(...args) {
    if (this.verbose) {
      console.log('\x1b[90m[Claude]\x1b[0m', ...args);
    }
  }

  warn(...args) {
    console.warn('\x1b[33m[Claude]\x1b[0m', ...args);
  }

  error(...args) {
    console.error('\x1b[31m[Claude]\x1b[0m', ...args);
  }
}

module.exports = ClaudeExecutor;