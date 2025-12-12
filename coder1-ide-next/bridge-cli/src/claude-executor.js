/**
 * Claude Executor
 * Handles execution of Claude CLI commands with PTY support for interactive sessions
 *
 * UPDATED (Dec 10, 2025): Added node-pty support for interactive Claude sessions
 * - Uses PTY for `claude` (no args) to show interactive welcome screen
 * - Falls back to spawn() for one-shot commands like `claude "prompt"`
 * - Supports bidirectional stdin streaming over WebSocket
 */

const { spawn, execSync } = require('child_process');
const EventEmitter = require('events');

// Try to load node-pty, fall back gracefully if not available
let pty;
try {
  pty = require('node-pty');
} catch (error) {
  console.warn('[Claude] node-pty not available, interactive mode disabled');
  pty = null;
}

class ClaudeExecutor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.verbose = options.verbose || false;
    // FIXED (Dec 10, 2025): Increased from 60s to 120s to match server timeout
    this.maxTimeout = options.maxTimeout || 120000; // 120 seconds default

    // FIXED (Dec 12, 2025): Resolve full path to claude at startup
    // node-pty requires absolute path or binary in PATH - doesn't use shell resolution
    this.claudePath = this.resolveClaudePath(options.claudePath);

    // Track active interactive sessions
    this.activeSessions = new Map(); // commandId -> ptyProcess
  }

  /**
   * Resolve the full path to claude CLI
   * Critical for node-pty which doesn't use shell for PATH resolution
   */
  resolveClaudePath(providedPath) {
    if (providedPath && providedPath !== 'claude') {
      return providedPath; // Use provided absolute path
    }

    try {
      // Try to find claude using 'which' command
      const resolvedPath = execSync('which claude 2>/dev/null', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      if (resolvedPath) {
        console.log(`[Claude] Resolved path: ${resolvedPath}`);
        return resolvedPath;
      }
    } catch (error) {
      // which failed, try common locations
    }

    // Try common installation paths
    const commonPaths = [
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      `${process.env.HOME}/.local/bin/claude`,
      `${process.env.HOME}/.claude/bin/claude`,
      `${process.env.HOME}/.npm-global/bin/claude`,
      '/usr/bin/claude'
    ];

    const fs = require('fs');
    for (const testPath of commonPaths) {
      try {
        if (fs.existsSync(testPath)) {
          console.log(`[Claude] Found at: ${testPath}`);
          return testPath;
        }
      } catch (e) {
        // Continue checking other paths
      }
    }

    // Fall back to 'claude' and hope PATH is set correctly
    console.warn('[Claude] Could not resolve absolute path, using "claude"');
    return 'claude';
  }

  /**
   * Check if command needs interactive mode (PTY)
   * Returns true for `claude` alone or `claude chat`
   */
  needsInteractiveMode(command) {
    const trimmed = command.trim();
    // Interactive mode for: claude, claude chat, claude --help
    // One-shot mode for: claude "prompt", claude -p "...", etc.
    return trimmed === 'claude' ||
           trimmed === 'claude chat' ||
           trimmed.match(/^claude\s+--?h(elp)?$/);
  }

  /**
   * Execute a Claude command - chooses PTY or spawn based on command type
   */
  async execute(command, options = {}) {
    // Check if this needs interactive mode
    if (this.needsInteractiveMode(command) && pty) {
      return this.executeInteractive(command, options);
    }

    // Fall back to non-interactive execution
    return this.executeNonInteractive(command, options);
  }

  /**
   * Execute Claude in interactive mode using PTY
   * Returns immediately after spawning - output streams via events
   */
  async executeInteractive(command, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const commandId = options.commandId || `cmd_${Date.now()}`;

      // Parse command into parts
      const parts = this.parseCommand(command);
      let args = parts.slice(1); // Skip 'claude'

      // Add model parameter if specified in context
      if (options.context && options.context.selectedClaudeModel) {
        const modelIndex = args.findIndex(arg => arg === '--model');
        if (modelIndex === -1) {
          args.unshift('--model', options.context.selectedClaudeModel);
        } else {
          args[modelIndex + 1] = options.context.selectedClaudeModel;
        }
      }

      this.log(`Executing interactive: claude ${args.join(' ')}`);

      try {
        // Spawn Claude with PTY for full terminal emulation
        const ptyProcess = pty.spawn(this.claudePath, args, {
          name: 'xterm-256color',
          cols: options.cols || 120,
          rows: options.rows || 30,
          cwd: options.context?.workingDirectory || process.cwd(),
          env: {
            ...process.env,
            CODER1_BRIDGE: 'true',
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor'
          }
        });

        // Store session for input routing
        this.activeSessions.set(commandId, ptyProcess);

        let outputBuffer = '';
        let hasExited = false;

        // Handle PTY output
        ptyProcess.onData((data) => {
          outputBuffer += data;

          if (options.onData) {
            options.onData(data);
          }

          this.emit('data', { type: 'stdout', data, commandId });
        });

        // Handle PTY exit
        ptyProcess.onExit(({ exitCode, signal }) => {
          if (hasExited) return;
          hasExited = true;

          const duration = Date.now() - startTime;

          // Clean up session
          this.activeSessions.delete(commandId);

          this.log(`Interactive process exited with code ${exitCode} after ${duration}ms`);

          this.emit('exit', { commandId, exitCode, signal });

          resolve({
            exitCode: exitCode || 0,
            signal,
            stdout: outputBuffer,
            stderr: '',
            duration,
            interactive: true,
            error: exitCode !== 0 ? 'Command failed' : null
          });
        });

        // Set timeout for interactive sessions (longer than one-shot)
        const timeout = setTimeout(() => {
          if (!hasExited) {
            this.warn('Interactive session timeout, killing process...');
            ptyProcess.kill();
          }
        }, this.maxTimeout * 5); // 5x longer for interactive

        // Clear timeout on exit
        ptyProcess.onExit(() => {
          clearTimeout(timeout);
        });

        // Notify that interactive session has started
        this.emit('interactive:started', { commandId, pid: ptyProcess.pid });

      } catch (error) {
        this.error('Failed to spawn interactive PTY:', error);
        reject(error);
      }
    });
  }

  /**
   * Send input to an active interactive session
   */
  writeToSession(commandId, data) {
    const ptyProcess = this.activeSessions.get(commandId);
    if (ptyProcess) {
      ptyProcess.write(data);
      return true;
    }
    return false;
  }

  /**
   * Resize an active interactive session
   */
  resizeSession(commandId, cols, rows) {
    const ptyProcess = this.activeSessions.get(commandId);
    if (ptyProcess) {
      ptyProcess.resize(cols, rows);
      return true;
    }
    return false;
  }

  /**
   * Kill an active interactive session
   */
  killSession(commandId) {
    const ptyProcess = this.activeSessions.get(commandId);
    if (ptyProcess) {
      ptyProcess.kill();
      this.activeSessions.delete(commandId);
      return true;
    }
    return false;
  }

  /**
   * Check if a session is active
   */
  hasActiveSession(commandId) {
    return this.activeSessions.has(commandId);
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Execute a Claude command in non-interactive mode (one-shot)
   */
  async executeNonInteractive(command, options = {}) {
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

      this.log(`Executing non-interactive: claude ${args.join(' ')}`);

      // Spawn Claude process
      const claudeProcess = spawn(this.claudePath, args, {
        env: {
          ...process.env,
          CODER1_BRIDGE: 'true',
          TERM: 'xterm-256color'
        },
        shell: true  // Use shell for proper PATH resolution (finds claude in user's PATH)
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
          interactive: false,
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
      const result = await this.executeNonInteractive('claude --version', {
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
      const result = await this.executeNonInteractive('claude --version', {
        onData: () => {},
        onError: () => {}
      });
      return result.exitCode === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Quick synchronous check if Claude CLI is installed
   * Used for startup validation before accepting commands
   */
  checkClaudeAvailable() {
    try {
      execSync('which claude', { stdio: 'pipe' });
      return { available: true };
    } catch {
      return {
        available: false,
        error: 'Claude CLI not found. Please install: npm install -g @anthropic-ai/claude-code'
      };
    }
  }

  /**
   * Check if interactive mode is supported (node-pty available)
   */
  isInteractiveSupported() {
    return pty !== null;
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
