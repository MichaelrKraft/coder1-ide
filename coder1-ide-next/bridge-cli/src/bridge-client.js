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
const LivingFilesHandler = require('./living-files-handler');
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

    // Living files handler - lazy-initialized on first use
    this.livingFilesHandler = null;

    // Track active interactive sessions for input routing
    this.activeInteractiveSessions = new Map(); // sessionId -> commandId
    this.commandToSessionMap = new Map();       // commandId -> sessionId (reverse lookup)
    this.activeNonInteractiveProcesses = new Map(); // commandId -> childProcess (for cancel support)

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

    // Track non-interactive processes for cancel support
    this.claudeExecutor.on('process:spawned', ({ commandId, process }) => {
      this.activeNonInteractiveProcesses.set(commandId, process);
      process.on('exit', () => {
        this.activeNonInteractiveProcesses.delete(commandId);
      });
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
        pingTimeout: 300000, // 5 minutes - allows long Claude CLI commands
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

        // Sync living files to server on connection
        try {
          if (!this.livingFilesHandler) {
            this.livingFilesHandler = new LivingFilesHandler();
          }
          const created = this.livingFilesHandler.initializeDefaults();
          if (created > 0) {
            logger.info('Initialized living file defaults', { created });
          }

          const payload = this.livingFilesHandler.readAllWithSizeGuard();
          const payloadSize = Math.round(Buffer.byteLength(JSON.stringify(payload), 'utf8') / 1024);
          this.socket.emit('livingfiles:sync', payload);
          logger.info(`Living files synced (9 files, ${payloadSize}kb)`);
        } catch (error) {
          logger.error('Failed to sync living files on connection', { error: error.message });
        }
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

      // Handle cancel request (timeout cleanup - kills running processes)
      this.socket.on('claude:cancel', (data) => {
        this.handleClaudeCancel(data);
      });

      // Handle kill request for interactive Claude sessions
      this.socket.on('claude:kill', (data) => {
        this.handleClaudeKill(data);
      });

      // Handle file operation requests
      this.socket.on('file:request', async (data) => {
        await this.handleFileRequest(data);
      });

      // Handle collaborative file write requests (from collab editing sync)
      // 6.1: Blocked patterns — sensitive files that should never be written via collab sync
      const COLLAB_BLOCKED_PATTERNS = [
        /\.env/i,                // Any .env file (.env, .env.local, .env.production, etc.)
        /credentials/i,          // Credential files
        /\.git\/config$/i,       // Git config
        /id_rsa/i,               // SSH private keys
        /\.ssh\//i,              // SSH directory
        /\.aws\//i,              // AWS credentials directory
        /\.npmrc$/i,             // npm config (may contain tokens)
        /\.netrc$/i,             // netrc auth file
        /\.pypirc$/i,            // Python package index config
        /node_modules\//,        // Don't write into dependencies
      ];
      const COLLAB_ALLOWED_EXTENSIONS = [
        '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.scss',
        '.html', '.yaml', '.yml', '.toml', '.py', '.go', '.rs', '.java',
        '.c', '.cpp', '.h', '.hpp', '.rb', '.php', '.swift', '.kt',
        '.vue', '.svelte', '.astro', '.txt', '.xml', '.sql', '.sh',
      ];

      // Tracks last applied sequence per file to drop stale/out-of-order writes
      if (!this._collabLastSequence) {
        this._collabLastSequence = new Map(); // filePath -> lastSequenceNumber
      }
      // Safeguard #4: Track authorized teams for bridge-side validation
      if (!this._authorizedTeams) {
        this._authorizedTeams = new Set();
      }
      // Track whether bridge has received any team auth events
      if (this._teamAuthInitialized === undefined) {
        this._teamAuthInitialized = false;
      }

      // Listen for team authorization events from server
      this.socket.on('team:authorized', ({ teamId }) => {
        if (teamId) {
          this._authorizedTeams.add(teamId);
          this._teamAuthInitialized = true;
          logger.info('Team authorized for collab writes', { teamId });
        }
      });

      this.socket.on('file:write-collab', async (data) => {
        const { requestId, filePath, content, sequenceNumber, expectedHash, teamId } = data;

        logger.info('Collaborative file write request', { requestId, filePath, sequenceNumber });

        try {
          // Safeguard #4: Verify this bridge is authorized for this team
          // If teamId is provided, the bridge must have received a team:authorized event for it.
          // No grace period — writes from unknown teams are always rejected.
          if (teamId && !this._authorizedTeams.has(teamId)) {
            logger.warn('Unauthorized team write attempt', { teamId, filePath, authInitialized: this._teamAuthInitialized });
            this.socket.emit('file:response', {
              requestId,
              operation: 'collab-write',
              result: null,
              error: 'Not authorized for this team'
            });
            return;
          }

          // 4.2: Convert protocol path (forward slashes) to native OS path
          const nativePath = this._toNativePath(filePath);

          // Validate path (no traversal, no absolute paths)
          const pathMod = require('path');
          const normalized = pathMod.normalize(nativePath);
          if (normalized.includes('..')) {
            throw new Error('Path traversal not allowed');
          }

          // 6.1: Check blocked patterns — block sensitive files
          for (const pattern of COLLAB_BLOCKED_PATTERNS) {
            if (pattern.test(filePath) || pattern.test(normalized)) {
              logger.warn('Blocked collab write to sensitive file', { filePath, pattern: pattern.toString() });
              this.socket.emit('file:response', {
                requestId,
                operation: 'collab-write',
                result: null,
                error: `Blocked: writing to sensitive file pattern (${pattern})`
              });
              return;
            }
          }

          // 6.1: Warn on non-standard extensions (don't block, just log)
          const ext = pathMod.extname(normalized).toLowerCase();
          if (ext && !COLLAB_ALLOWED_EXTENSIONS.includes(ext)) {
            logger.warn('Collab write to non-standard extension', { filePath, ext });
          }

          // Check sequence number — drop stale writes (Safeguard: write ordering)
          if (sequenceNumber != null) {
            const lastSeq = this._collabLastSequence.get(filePath) || 0;
            if (sequenceNumber < lastSeq) {
              logger.warn('Dropping out-of-order collab write', { filePath, sequenceNumber, lastSeq });
              this.socket.emit('file:response', {
                requestId,
                operation: 'collab-write',
                result: { dropped: true, reason: 'stale_sequence' },
                error: null
              });
              return;
            }
            this._collabLastSequence.set(filePath, sequenceNumber);
          }

          // Hash comparison before overwrite (Safeguard: detect local-side edits outside IDE)
          if (expectedHash) {
            try {
              const fsSync = require('fs');
              const crypto = require('crypto');
              const resolvedPath = this.fileHandler.resolvePath(nativePath);
              const existing = fsSync.readFileSync(resolvedPath, 'utf8');
              const actualHash = crypto.createHash('md5').update(existing).digest('hex');
              if (actualHash !== expectedHash) {
                this.socket.emit('file:response', {
                  requestId,
                  operation: 'collab-write',
                  result: null,
                  error: `local_conflict: file modified outside IDE (expected ${expectedHash}, got ${actualHash})`
                });
                return;
              }
            } catch (hashErr) {
              // File doesn't exist yet — safe to write (ENOENT is OK)
              if (hashErr.code !== 'ENOENT') {
                logger.warn('Hash check error, proceeding with write', { filePath, error: hashErr.message });
              }
            }
          }

          // 4.4: Strip UTF-8 BOM if present
          let cleanContent = content;
          if (cleanContent.length > 0 && cleanContent.charCodeAt(0) === 0xFEFF) {
            cleanContent = cleanContent.slice(1);
          }

          // 4.1: Convert LF to native line endings (Windows uses CRLF)
          if (process.platform === 'win32') {
            // Content arrives as LF from server; convert to CRLF for Windows
            cleanContent = cleanContent.replace(/\n/g, '\r\n');
          }

          // 4.5 Safeguard #1: Backup existing file before overwrite
          await this._backupBeforeOverwrite(nativePath);

          const result = await this.fileHandler.write(nativePath, cleanContent);

          this.socket.emit('file:response', {
            requestId,
            operation: 'collab-write',
            result,
            error: null
          });

          logger.info('Collaborative file written', { filePath, size: result.size });
        } catch (error) {
          logger.error('Collaborative file write failed', { filePath, error: error.message });

          this.socket.emit('file:response', {
            requestId,
            operation: 'collab-write',
            result: null,
            error: error.message
          });
        }
      });

      // Handle living file write requests from server
      this.socket.on('livingfiles:write', async (data) => {
        const { filename, content, mode } = data;
        logger.info('Living file write request', { filename, mode });

        try {
          if (!this.livingFilesHandler) {
            this.livingFilesHandler = new LivingFilesHandler();
          }
          const result = this.livingFilesHandler.writeFile(filename, content, mode);

          this.socket.emit('livingfiles:write-ack', {
            filename,
            success: result.success,
            error: result.error || null
          });
        } catch (error) {
          logger.error('Living file write failed', { filename, error: error.message });
          this.socket.emit('livingfiles:write-ack', {
            filename,
            success: false,
            error: error.message
          });
        }
      });

      // Handle living files refresh request from server
      this.socket.on('livingfiles:request', () => {
        logger.info('Living files refresh requested by server');

        try {
          if (!this.livingFilesHandler) {
            this.livingFilesHandler = new LivingFilesHandler();
          }
          const payload = this.livingFilesHandler.readAllWithSizeGuard();
          this.socket.emit('livingfiles:sync', payload);
          logger.info('Living files re-synced', { fileCount: Object.keys(payload.files).length });
        } catch (error) {
          logger.error('Living files refresh failed', { error: error.message });
        }
      });

      // Handle configuration updates
      this.socket.on('config:update', (data) => {
        this.handleConfigUpdate(data);
      });

      // Handle Time Capsule creation requests
      this.socket.on('time_capsule:create', async (data) => {
        const { repoPath, commitSha, capsuleData, capsuleId } = data;
        logger.info('Time Capsule creation requested', { commitSha, capsuleId });
        try {
          const { writeTimeCapsule } = require('./time-capsule-handler');
          const result = await writeTimeCapsule(repoPath, commitSha, capsuleData);
          this.socket.emit('time_capsule:result', { capsuleId, ...result });
          logger.info('Time Capsule result', { capsuleId, success: result.success });
        } catch (error) {
          logger.error('Time Capsule handler error', { capsuleId, error: error.message });
          this.socket.emit('time_capsule:result', {
            capsuleId,
            success: false,
            error: error.message,
          });
        }
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
   * Handle cancel request (kills running interactive or non-interactive processes)
   */
  handleClaudeCancel(data) {
    const { commandId } = data;
    if (!commandId) {
      logger.warn('Cancel request missing commandId');
      return;
    }

    logger.info('Cancelling command', { commandId });

    // Try interactive session first
    const sessionId = this.commandToSessionMap.get(commandId);
    if (sessionId) {
      const success = this.claudeExecutor.killSession(commandId);
      if (success) {
        logger.info('Cancelled interactive session', { commandId, sessionId });
        this.activeInteractiveSessions.delete(sessionId);
        this.commandToSessionMap.delete(commandId);
        return;
      }
    }

    // Try non-interactive process
    const childProcess = this.activeNonInteractiveProcesses.get(commandId);
    if (childProcess) {
      try {
        childProcess.kill('SIGTERM');
        // Force kill after 5 seconds if still running
        setTimeout(() => {
          try { childProcess.kill('SIGKILL'); } catch (e) { /* already dead */ }
        }, 5000);
        logger.info('Cancelled non-interactive process', { commandId });
      } catch (e) {
        logger.warn('Failed to kill non-interactive process', { commandId, error: e.message });
      }
      this.activeNonInteractiveProcesses.delete(commandId);
      return;
    }

    logger.warn('No active process found for cancel', { commandId });
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

  // ============================================================================
  // Cross-Platform Helpers (Phase 4)
  // ============================================================================

  /**
   * 4.2: Convert protocol path (forward slashes) to native OS path.
   * Protocol always uses '/' — Windows needs '\'.
   */
  _toNativePath(protocolPath) {
    if (process.platform === 'win32') {
      return protocolPath.replace(/\//g, '\\');
    }
    return protocolPath;
  }

  /**
   * 4.5 Safeguard #1: Backup existing file before overwrite.
   * Copies to .coder1/backup/{timestamp}_{filename}, keeps last 10 per file.
   */
  async _backupBeforeOverwrite(filePath) {
    const fs = require('fs');
    const pathMod = require('path');

    try {
      const resolvedPath = this.fileHandler.resolvePath(filePath);
      // Check if file exists — if not, no backup needed
      await fs.promises.access(resolvedPath, fs.constants.F_OK);

      const existing = await fs.promises.readFile(resolvedPath, 'utf8');
      const backupDir = pathMod.join(process.cwd(), '.coder1', 'backup');
      await fs.promises.mkdir(backupDir, { recursive: true });

      const timestamp = Date.now();
      const basename = pathMod.basename(filePath);
      const backupPath = pathMod.join(backupDir, `${timestamp}_${basename}`);
      await fs.promises.writeFile(backupPath, existing, 'utf8');

      // Prune: keep only last 10 backups for this filename
      const entries = await fs.promises.readdir(backupDir);
      const matching = entries
        .filter(e => e.endsWith(`_${basename}`))
        .sort(); // Sorted by timestamp prefix (ascending)
      if (matching.length > 10) {
        const toDelete = matching.slice(0, matching.length - 10);
        for (const old of toDelete) {
          await fs.promises.unlink(pathMod.join(backupDir, old)).catch(() => {});
        }
      }

      logger.debug('Backup created before collab overwrite', { backupPath });
    } catch (err) {
      // ENOENT = file doesn't exist yet, no backup needed
      if (err.code !== 'ENOENT') {
        logger.warn('Backup before overwrite failed (non-fatal)', { filePath, error: err.message });
      }
    }
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