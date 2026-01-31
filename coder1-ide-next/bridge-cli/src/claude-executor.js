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

// Try to load node-pty-prebuilt-multiarch (no compilation required)
// Falls back gracefully if not available
let pty;
try {
  pty = require('node-pty-prebuilt-multiarch');
} catch (error) {
  // Try original node-pty as fallback (for users who compiled it)
  try {
    pty = require('node-pty');
  } catch (e) {
    console.warn('[Claude] node-pty not available, interactive mode disabled');
    pty = null;
  }
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

    // Detect platform
    const isWindows = process.platform === 'win32';

    try {
      // Try platform-specific command to find in PATH
      let findCommand, resolvedPath;
      if (isWindows) {
        resolvedPath = execSync('where claude 2>nul', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).split('\n')[0].trim();
      } else {
        resolvedPath = execSync('which claude 2>/dev/null', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
      }

      if (resolvedPath) {
        console.log(`[Claude] Resolved path: ${resolvedPath}`);
        return resolvedPath;
      }
    } catch (error) {
      // Command failed, try common locations
    }

    // Try common installation paths - platform specific
    const commonPaths = isWindows
      ? [
          // Windows paths
          `${process.env.LOCALAPPDATA}\\Programs\\Claude\\claude.exe`,
          `${process.env.APPDATA}\\npm\\claude.cmd`,
          `${process.env.USERPROFILE}\\.claude\\bin\\claude.exe`,
          'C:\\Program Files\\Claude\\claude.exe',
          'C:\\Program Files (x86)\\Claude\\claude.exe'
        ]
      : [
          // macOS/Linux paths
          '/usr/local/bin/claude',
          '/opt/homebrew/bin/claude',
          `${process.env.HOME}/.local/bin/claude`,
          `${process.env.HOME}/.claude/bin/claude`,
          `${process.env.HOME}/.claude/local/claude`,   // OAuth/download install location (Dec 2025)
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
   * Classify PTY spawn errors for helpful error messages
   * @param {Error} error - The spawn error
   * @returns {{ code: string, message: string, recoverable: boolean, userAction: string }}
   */
  classifyPtyError(error) {
    const errorMsg = error.message || '';

    if (errorMsg.includes('posix_spawnp failed') || errorMsg.includes('spawn failed')) {
      return {
        code: 'PTY_SPAWN_FAILED',
        message: 'Native PTY module failed to spawn process. This usually means node-pty needs recompilation.',
        recoverable: true,
        userAction: `To fix:
  1. Reinstall with: npm install -g coder1-bridge --build-from-source
  2. Or use Node.js LTS (v20): nvm use 20 && npm install -g coder1-bridge
  3. Or use non-interactive mode: claude "your prompt here"`
      };
    }

    if (errorMsg.includes('ENOENT')) {
      return {
        code: 'BINARY_NOT_FOUND',
        message: 'Claude CLI binary not found at resolved path.',
        recoverable: false,
        userAction: 'Install Claude Code: npm install -g @anthropic-ai/claude-code'
      };
    }

    if (errorMsg.includes('EMFILE') || errorMsg.includes('file descriptors')) {
      return {
        code: 'FD_EXHAUSTION',
        message: 'Too many open file descriptors.',
        recoverable: true,
        userAction: 'Close unused terminals/processes and try again'
      };
    }

    return {
      code: 'UNKNOWN_PTY_ERROR',
      message: errorMsg || 'Unknown PTY error',
      recoverable: false,
      userAction: 'Check coder1-bridge diagnose output for details'
    };
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
   * 🔧 FIX (Dec 15, 2025): Added pre-spawn validation to catch path issues early
   */
  async execute(command, options = {}) {
    // Pre-spawn validation: Check if Claude CLI exists at resolved path
    const fs = require('fs');

    this.log(`Executing command with claudePath: ${this.claudePath}`);

    if (!this.claudePath || this.claudePath === 'claude') {
      // Path was never resolved - try to resolve now
      this.claudePath = this.resolveClaudePath(this.claudePath);
      this.log(`Re-resolved claudePath to: ${this.claudePath}`);
    }

    // Validate the path exists before attempting spawn
    if (this.claudePath && this.claudePath !== 'claude') {
      try {
        if (!fs.existsSync(this.claudePath)) {
          throw new Error(`Claude CLI binary not found at resolved path: ${this.claudePath}`);
        }
        this.log(`Validated Claude CLI exists at: ${this.claudePath}`);
      } catch (e) {
        this.error(`Path validation failed: ${e.message}`);
        throw new Error(`Claude CLI path validation failed: ${this.claudePath} - ${e.message}`);
      }
    } else {
      // Fallback to 'claude' - will rely on shell PATH resolution
      this.warn(`Using fallback 'claude' command - PATH resolution required`);
    }

    // 🔧 FIX (Jan 4, 2026): Check authentication before executing commands
    // Skip auth check for version/help commands (they don't need auth)
    const skipAuthCommands = ['--version', '-v', '--help', '-h', 'auth'];
    const needsAuthCheck = !skipAuthCommands.some(cmd => command.includes(cmd));

    if (needsAuthCheck) {
      const authStatus = await this.checkAuthStatus();
      if (!authStatus.authenticated) {
        this.error('Claude CLI is not authenticated');
        this.error('Please run: claude auth login');
        this.error(`Auth status output: ${authStatus.output || authStatus.error || 'unknown'}`);

        return Promise.resolve({
          exitCode: 1,
          signal: null,
          stdout: '',
          stderr: `Claude CLI is not authenticated.\n\nTo fix, run:\n  claude auth login\n\nThen try again.\n\nAuth status: ${authStatus.output || authStatus.error || 'Could not determine auth status'}`,
          duration: 0,
          interactive: false,
          error: 'Not authenticated'
        });
      }
      if (authStatus.warning) {
        this.warn(`Auth check: ${authStatus.warning}`);
      } else {
        this.log(`Auth check passed: ${authStatus.output}`);
      }
    }

    // Check if this needs interactive mode
    if (this.needsInteractiveMode(command)) {
      if (pty) {
        return this.executeInteractive(command, options);
      } else {
        // FIX (Jan 2026): node-pty not available - try non-interactive fallback
        // Pre-built binaries can't bundle native C++ addons like node-pty
        this.warn('Interactive mode unavailable (node-pty not installed).');
        this.warn('Falling back to non-interactive verification.');

        // Try running claude --version to verify CLI is accessible
        try {
          const versionResult = await this.executeNonInteractive('claude --version', options);
          if (versionResult.exitCode === 0) {
            return Promise.resolve({
              exitCode: 1,
              signal: null,
              stdout: '',
              stderr: `Claude CLI detected (${(versionResult.stdout || '').trim()})\n\n` +
                      `⚠️  Interactive mode unavailable in this bridge installation.\n` +
                      `The pre-built binary doesn't include terminal emulation support.\n\n` +
                      `To get full interactive Claude in Coder1 IDE:\n` +
                      `  npm install -g coder1-bridge\n` +
                      `  coder1-bridge start\n\n` +
                      `Or use Claude with prompts directly:\n` +
                      `  claude "your question here"\n`,
              duration: 0,
              interactive: false,
              error: 'node-pty not available for interactive mode'
            });
          }
        } catch (e) {
          // claude --version failed, fall through to generic error
        }

        return Promise.resolve({
          exitCode: 1,
          signal: null,
          stdout: '',
          stderr: 'Claude CLI not found or not responding.\n\n' +
                  'Please check:\n' +
                  '  1. Claude CLI is installed: npm install -g @anthropic-ai/claude-code\n' +
                  '  2. You are authenticated: claude auth login\n' +
                  '  3. Reinstall bridge with PTY support: npm install -g coder1-bridge\n',
          duration: 0,
          interactive: false,
          error: 'Claude CLI not accessible'
        });
      }
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
            this.warn(`Interactive session timeout after ${(this.maxTimeout * 5) / 1000}s, killing process...`);
            this.warn(`Claude path: ${this.claudePath}`);
            this.warn('');
            this.warn('This usually means Claude CLI needs authentication.');
            this.warn('Try running in a regular terminal:');
            this.warn('  1. claude auth status');
            this.warn('  2. claude auth login (if not authenticated)');
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
        const classified = this.classifyPtyError(error);

        this.error(`Failed to spawn interactive PTY: ${classified.code}`);
        this.error(classified.message);
        this.error('');
        this.error(classified.userAction);

        if (classified.recoverable) {
          // Attempt graceful fallback to non-interactive mode
          this.warn('');
          this.warn('Attempting fallback to non-interactive mode...');
          this.warn('Note: Interactive features (welcome screen, real-time input) will be limited.');

          // Fall back to non-interactive execution (use .then() since we're in Promise executor)
          this.executeNonInteractive(command, options)
            .then((result) => {
              resolve({
                ...result,
                fallback: true,
                fallbackReason: classified.code
              });
            })
            .catch((fallbackError) => {
              this.error('Fallback also failed:', fallbackError.message);
              reject(new Error(
                `PTY spawn failed (${classified.code}): ${classified.message}\n\n${classified.userAction}`
              ));
            });
          return; // Don't fall through to reject below
        }

        // If not recoverable, reject with helpful message
        reject(new Error(
          `PTY spawn failed (${classified.code}): ${classified.message}\n\n${classified.userAction}`
        ));
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

      // 🔧 FIX (Jan 27, 2026): Re-quote args with special shell characters
      // When shell: true is used, spawn() joins args with spaces WITHOUT quotes,
      // causing parentheses and other special chars to break the shell command.
      // The eternal memory context often contains "(6 weeks ago)" which breaks sh.
      const quotedArgs = args.map(arg => {
        // If arg contains spaces, quotes, or shell special chars, wrap in double quotes
        if (/[\s"'`$();&|<>\\]/.test(arg)) {
          // Escape backslashes first, then double quotes, then wrap
          return `"${arg.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
        }
        return arg;
      });

      this.log(`Executing non-interactive: ${this.claudePath} ${quotedArgs.join(' ')}`);

      // Spawn Claude process
      // 🔧 FIX (Jan 4, 2026): Added stdio config to prevent hanging on stdin
      // Without this, spawn() defaults stdin to 'pipe', causing Claude CLI to
      // wait for input that never comes (e.g., auth prompts), leading to 120s timeouts
      const claudeProcess = spawn(this.claudePath, quotedArgs, {
        env: {
          ...process.env,
          CODER1_BRIDGE: 'true',
          TERM: 'xterm-256color'
        },
        shell: true,  // Use shell for proper PATH resolution (finds claude in user's PATH)
        stdio: ['ignore', 'pipe', 'pipe']  // Ignore stdin, capture stdout/stderr
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

      // Set timeout with improved error messaging (Dec 22, 2025)
      const timeout = setTimeout(() => {
        if (!hasExited) {
          this.warn(`Command timeout after ${this.maxTimeout / 1000}s, killing process...`);
          this.warn(`Command: claude ${args.join(' ')}`);
          this.warn(`Claude path: ${this.claudePath}`);
          this.warn('');
          this.warn('Troubleshooting tips:');
          this.warn('  1. Check auth: claude auth status');
          this.warn('  2. Re-authenticate: claude auth login');
          this.warn('  3. Run diagnostic: coder1-bridge diagnose');
          this.warn('  4. Try verbose mode: coder1-bridge start --verbose');
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
   * 🔧 FIX (Dec 15, 2025): Use this.claudePath instead of 'which claude'
   */
  checkClaudeAvailable() {
    const fs = require('fs');

    // First check if we have a resolved path that exists
    if (this.claudePath && this.claudePath !== 'claude') {
      try {
        if (fs.existsSync(this.claudePath)) {
          return { available: true, path: this.claudePath };
        }
      } catch (e) {
        // Continue to fallback check
      }
    }

    // Fallback: try platform-specific command
    try {
      const isWindows = process.platform === 'win32';
      if (isWindows) {
        execSync('where claude', { stdio: 'pipe' });
      } else {
        execSync('which claude', { stdio: 'pipe' });
      }
      return { available: true };
    } catch {
      return {
        available: false,
        error: `Claude CLI not found at ${this.claudePath || 'any location'}. Please install: npm install -g @anthropic-ai/claude-code`
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
   * Check if Claude CLI is authenticated
   * 🔧 FIX (Jan 4, 2026): Added to fail fast instead of timing out after 120s
   * Returns auth status before attempting commands
   */
  async checkAuthStatus() {
    try {
      const output = execSync(`"${this.claudePath}" auth status`, {
        encoding: 'utf-8',
        timeout: 30000,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Check for various "not authenticated" indicators
      const lowerOutput = output.toLowerCase();
      const authenticated = !lowerOutput.includes('not authenticated') &&
                           !lowerOutput.includes('no active session') &&
                           !lowerOutput.includes('please log in') &&
                           !lowerOutput.includes('not logged in');

      return {
        authenticated,
        output: output.trim()
      };
    } catch (error) {
      // FIX (Jan 2026): If timeout, don't block - let the actual command fail naturally
      if (error.message && error.message.includes('ETIMEDOUT')) {
        return {
          authenticated: true,
          warning: 'Auth check timed out - proceeding anyway',
          output: ''
        };
      }
      // For other errors (CLI not found, etc.), still return false
      return {
        authenticated: false,
        error: error.message,
        output: error.stderr || error.stdout || ''
      };
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
