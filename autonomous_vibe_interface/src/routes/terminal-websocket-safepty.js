// SafePTYManager Integration for Main Server
// Replaces terminal-websocket.js with Socket.IO compatible implementation

const os = require('os');
const { PTYSupervisionAdapter } = require('../services/supervision/PTYSupervisionAdapter');
const { SupervisionCommands } = require('../services/supervision/SupervisionCommands');
const { ClaudeInputHandler } = require('../services/supervision/ClaudeInputHandler');
const { getInstance: getRepositoryCommands } = require('../services/terminal-commands/repository-intelligence-commands');
const claudeFileTracker = require('../services/claude-file-tracker');

// SafePTYManager - Production-ready PTY session management
class SafePTYManager {
    constructor() {
        this.sessions = new Map();
        this.sessionCount = 0;
        this.maxSessions = 10; // Increased max sessions
        this.lastSessionCreation = 0;
        this.minSessionInterval = 100; // Reduced to 100ms rate limit
        this.telemetry = {
            sessionsCreated: 0,
            sessionsDestroyed: 0,
            rateLimitHits: 0,
            errors: 0
        };
        
        console.log('[SafePTYManager] Initialized with rate limiting and session management');
    }
    
    // Rate limiting to prevent PTY exhaustion
    canCreateSession() {
        const now = Date.now();
        const timeSinceLastCreation = now - this.lastSessionCreation;
        
        if (timeSinceLastCreation < this.minSessionInterval) {
            this.telemetry.rateLimitHits++;
            return false;
        }
        
        if (this.sessionCount >= this.maxSessions) {
            this.telemetry.rateLimitHits++;
            return false;
        }
        
        return true;
    }
    
    // Create new PTY session with Claude Code detection
    createSession(socketId, options = {}) {
        if (!this.canCreateSession()) {
            throw new Error(`Rate limited: Max ${this.maxSessions} sessions, min ${this.minSessionInterval}ms interval`);
        }
        
        try {
            let pty;
            try {
                pty = require('node-pty');
            } catch (error) {
                throw new Error('node-pty not available - terminal features disabled');
            }
            
            // Use provided ID if available, otherwise generate one
            const sessionId = options.id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
            const cwd = options.cwd || process.env.HOME;
            
            // Enhanced environment for Claude Code CLI
            const env = {
                ...process.env,
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor',
                // Ensure Claude Code CLI is in PATH
                PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
                // Claude-specific optimizations
                CLAUDE_CLI_MODE: '1',
                CLAUDE_TERMINAL_INTEGRATION: '1'
            };
            
            console.log(`[SafePTYManager] Creating session: ${sessionId}`);
            console.log(`[SafePTYManager] Shell: ${shell}, CWD: ${cwd}`);
            
            const ptyProcess = pty.spawn(shell, ['-l'], {
                name: 'xterm-256color',
                cols: options.cols || 80,
                rows: options.rows || 24,
                cwd: cwd,
                env: env
            });
            
            const session = {
                id: sessionId,
                process: ptyProcess,
                socketId: socketId,
                createdAt: Date.now(),
                claudeDetected: false,
                commandHistory: [],
                thinkingMode: 'normal'  // Default thinking mode
            };
            
            // Don't send welcome message - it's causing display issues
            // Users will see the prompt to type claude from the React UI instead
            
            // Claude Code CLI detection
            ptyProcess.onData((data) => {
                // Look for Claude Code CLI prompts or responses
                if (data.includes('claude') && (data.includes('>', '<') || data.includes('$'))) {
                    if (!session.claudeDetected) {
                        session.claudeDetected = true;
                        console.log(`[SafePTYManager] Claude Code CLI detected in session ${sessionId}`);
                    }
                }
            });
            
            // Store session
            this.sessions.set(sessionId, session);
            this.sessionCount++;
            this.lastSessionCreation = Date.now();
            this.telemetry.sessionsCreated++;
            
            console.log(`[SafePTYManager] Session created: ${sessionId} (${this.sessionCount}/${this.maxSessions})`);
            
            return session;
            
        } catch (error) {
            this.telemetry.errors++;
            console.error('[SafePTYManager] Session creation failed:', error);
            throw error;
        }
    }
    
    // Get session by ID
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    
    // Destroy session and cleanup
    destroySession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            try {
                session.process.kill();
                this.sessions.delete(sessionId);
                this.sessionCount--;
                this.telemetry.sessionsDestroyed++;
                console.log(`[SafePTYManager] Session destroyed: ${sessionId} (${this.sessionCount}/${this.maxSessions})`);
            } catch (error) {
                console.error(`[SafePTYManager] Error destroying session ${sessionId}:`, error);
            }
        }
    }
    
    // Get telemetry data
    getTelemetry() {
        return {
            ...this.telemetry,
            activeSessions: this.sessionCount,
            maxSessions: this.maxSessions,
            rateLimitEffectiveness: this.telemetry.rateLimitHits / (this.telemetry.sessionsCreated + this.telemetry.rateLimitHits)
        };
    }
    
    // Cleanup disconnected sessions
    cleanup() {
        for (const [sessionId, session] of this.sessions) {
            const age = Date.now() - session.createdAt;
            if (age > 3600000) { // 1 hour timeout
                console.log(`[SafePTYManager] Cleaning up old session: ${sessionId}`);
                this.destroySession(sessionId);
            }
        }
    }
}

// Global SafePTYManager instance
const safeptyManager = new SafePTYManager();

// Global ClaudeInputHandler instance for managing Claude subprocess input
const claudeInputHandler = new ClaudeInputHandler();

// Socket.IO terminal integration (compatible with frontend)
function setupTerminalWebSocket(io) {
    console.log('[SafePTYManager] Setting up Socket.IO terminal integration...');
    
    // Import Claude button routes for WebSocket integration
    const claudeButtonRoutes = require('./claude-buttons');
    
    // Track connected clients for both voice and terminal
    const connectedClients = new Map();
    
    // Track active supervision adapters
    const activeSupervision = new Map();
    
    io.on('connection', (socket) => {
        console.log(`[SafePTYManager] Client connected: ${socket.id}`);
        
        // Track client connection (for both voice and terminal)
        connectedClients.set(socket.id, { 
            connectedAt: Date.now(),
            sessionId: null,
            type: 'mixed' // Can handle both voice and terminal
        });
        
        // Handle terminal creation requests
        socket.on('terminal:create', (options = {}) => {
            try {
                const session = safeptyManager.createSession(socket.id, options);
                
                // Send success response
                socket.emit('terminal:created', {
                    id: session.id,
                    pid: session.process.pid
                });
                
                // Initialize line buffer for supervision
                session.lineBuffer = '';
                session.lastAnalyzedLine = '';
                session.recentQuestions = new Set(); // Track recent questions to avoid duplicates
                session.answeredQuestions = new Set(); // Track questions we've already answered
                session.pendingQuestions = []; // Collect questions before responding
                session.questionTimer = null; // Timer to batch questions
                session.claudeActive = false; // Track if Claude is the active process
                session.claudePromptDetected = false; // Track if Claude's prompt is detected
                session.responsesDelivered = false; // Track if we've already delivered responses
                session.pendingResponses = []; // Queue responses to send when Claude is ready
                
                // Forward terminal output to client (emit both events for compatibility)
                session.process.onData((data) => {
                    const outputData = {
                        id: session.id,
                        data: data
                    };
                    socket.emit('terminal:data', outputData);
                    socket.emit('terminal:output', outputData);
                    
                    // ERROR DOCTOR: Detect errors in terminal output
                    const errorPatterns = [
                        /error:/i,
                        /exception:/i,
                        /cannot find module/i,
                        /unexpected token/i,
                        /reference.*?is not defined/i,
                        /type.*?error/i,
                        /permission denied/i,
                        /enoent/i,
                        /address already in use/i,
                        /command not found/i,
                        /failed to/i,
                        /syntax.*?error/i
                    ];
                    
                    // Check if data contains error patterns
                    if (errorPatterns.some(pattern => pattern.test(data))) {
                        console.log('🔍 Error Doctor: Error detected in terminal output');
                        
                        // Trigger error analysis (non-blocking)
                        setTimeout(async () => {
                            try {
                                const axios = require('axios');
                                const analysisResult = await axios.post(`http://localhost:${process.env.PORT || 3000}/api/error-doctor/analyze`, {
                                    errorText: data,
                                    errorType: 'terminal',
                                    context: {
                                        workingDirectory: process.cwd(),
                                        hasPackageJson: require('fs').existsSync('package.json'),
                                        nodeVersion: process.version
                                    }
                                });
                                
                                if (analysisResult.data.success && analysisResult.data.fixes?.length > 0) {
                                    // Emit error analysis to frontend
                                    socket.emit('error-doctor:analysis', {
                                        sessionId: session.id,
                                        analysis: analysisResult.data,
                                        timestamp: Date.now()
                                    });
                                    console.log(`✅ Error Doctor: Found ${analysisResult.data.fixes.length} potential fixes`);
                                }
                            } catch (error) {
                                console.log('⚠️ Error Doctor: Analysis failed silently:', error.message);
                            }
                        }, 100); // Small delay to avoid blocking terminal output
                    }
                    
                    // Pass data to supervision systems if active
                    if (session.supervisionAdapter && session.supervisionAdapter.isActive) {
                        session.supervisionAdapter.processOutput(data);
                    }
                    
                    // Also pass to SupervisionEngine if it exists
                    if (session.supervisionEngine) {
                        session.supervisionEngine.handleClaudeCodeOutput(data);
                    }
                    
                    // Detect Claude state from output - look for Claude's actual input prompt
                    if (data.includes('Claude Code CLI') || data.includes('⏺')) {
                        session.claudeActive = true;
                        session.claudePromptDetected = false;
                        console.log('[Supervision] Claude detected as active process');
                    }
                    
                    // Better detection of Claude's input prompt after questions
                    // Claude shows a thinking animation then waits for input
                    if (session.claudeActive) {
                        // Track file activity from Claude's output
                        // Throttle updates to prevent excessive events
                        if (!session.lastOutputCheck || Date.now() - session.lastOutputCheck > 2000) {
                            session.lastOutputCheck = Date.now();
                            
                            // Look for file references in Claude's output
                            if (data.length > 10) { // Only process substantial output
                                const fileRefs = claudeFileTracker.parseFileReferences(data);
                                if (fileRefs.length > 0) {
                                    const operation = claudeFileTracker.detectOperation(data);
                                    claudeFileTracker.trackFileOperation(
                                        fileRefs[0],
                                        operation,
                                        session.id,
                                        { source: 'claude-output', dataPreview: data.substring(0, 100) }
                                    );
                                }
                            }
                        }
                        
                        // Check for the end of Claude's output (when it stops "thinking")
                        // Also check if Claude has asked numbered questions (e.g., "1. What is..." or "2. What key...")
                        const hasQuestionPattern = data.match(/\d+\.\s+.*\?/) || data.includes('etc.)');
                        const hasThinkingEnded = data.includes('interrupt)') && !data.includes('Germinating') && !data.includes('Smooshing');
                        
                        if (hasThinkingEnded || (hasQuestionPattern && session.pendingResponses.length > 0)) {
                            // Claude has finished its animation and is ready OR has asked questions and we have responses
                            session.claudePromptDetected = true;
                            
                            // Small delay to ensure Claude is fully ready
                            setTimeout(async () => {
                                if (session.pendingResponses && session.pendingResponses.length > 0 && !session.responsesDelivered) {
                                    console.log(`[Supervision] Claude ready - delivering ${session.pendingResponses.length} responses`);
                                    session.responsesDelivered = true;
                                    
                                    // Use ClaudeInputHandler for proper input delivery
                                    for (let i = 0; i < session.pendingResponses.length; i++) {
                                        const response = session.pendingResponses[i];
                                        console.log(`[Supervision] Sending response ${i + 1}: "${response}"`);
                                        
                                        // Try to send via ClaudeInputHandler
                                        const success = await claudeInputHandler.sendToClaudeProcess(
                                            session.id,
                                            response,
                                            session.process
                                        );
                                        
                                        if (success) {
                                            console.log(`[Supervision] Response ${i + 1} delivered successfully`);
                                        } else {
                                            console.log(`[Supervision] Response ${i + 1} delivery may have failed`);
                                        }
                                        
                                        // Small delay between responses
                                        if (i < session.pendingResponses.length - 1) {
                                            await new Promise(resolve => setTimeout(resolve, 500));
                                        }
                                    }
                                    
                                    session.pendingResponses = [];
                                }
                            }, 100);
                        }
                    }
                    
                    // Detect when Claude exits
                    if (data.includes('Saving session') || data.includes('exit')) {
                        session.claudeActive = false;
                        session.claudeWaitingForInput = false;
                        console.log('[Supervision] Claude process ended');
                        
                        // Set file tracker back to idle when Claude exits
                        claudeFileTracker.setIdle(session.id);
                    }
                    
                    // If supervision is active, buffer and analyze complete lines
                    if (session.supervisionActive && global.supervisionEngine) {
                        // Add to line buffer
                        session.lineBuffer += data;
                        
                        // Check if we have complete lines (ending with newline)
                        const lines = session.lineBuffer.split(/\r?\n/);
                        
                        // Process all complete lines except the last (which might be incomplete)
                        for (let i = 0; i < lines.length - 1; i++) {
                            const completeLine = lines[i].trim();
                            
                            // Skip empty lines, prompts, ANSI codes, and UI elements
                            if (completeLine.length > 10 && 
                                !completeLine.includes('michaelkraft$') &&
                                !completeLine.includes('? for shortcuts') &&
                                !completeLine.includes('╭') &&
                                !completeLine.includes('╰') &&
                                !completeLine.includes('│') &&
                                !completeLine.includes('[2K') &&
                                !completeLine.includes('[1A') &&
                                !completeLine.match(/^\[.*?m.*?$/) &&
                                completeLine !== session.lastAnalyzedLine) {
                                
                                // Check if we've seen this question recently to avoid duplicates
                                const questionKey = completeLine.substring(0, 50);
                                if (session.recentQuestions.has(questionKey)) {
                                    console.log('[Supervision] Skipping duplicate question');
                                    continue;
                                }
                                
                                // Track this question
                                session.recentQuestions.add(questionKey);
                                // Clean up old questions (keep last 10)
                                if (session.recentQuestions.size > 10) {
                                    const oldKeys = Array.from(session.recentQuestions).slice(0, session.recentQuestions.size - 10);
                                    oldKeys.forEach(key => session.recentQuestions.delete(key));
                                }
                                
                                // Analyze this complete line
                                session.lastAnalyzedLine = completeLine;
                                console.log('[Supervision] Analyzing line:', completeLine);
                                console.log('[Supervision] Global engine exists:', !!global.supervisionEngine);
                                if (global.supervisionEngine) {
                                    global.supervisionEngine.handleClaudeCodeOutput(completeLine);
                                } else {
                                    console.log('[Supervision] WARNING: No global supervision engine available');
                                }
                            }
                        }
                        
                        // Keep the incomplete last line in the buffer
                        session.lineBuffer = lines[lines.length - 1];
                    }
                });
                
                // Store session reference for supervision integration
                session.socketId = socket.id;
                session.supervisionAdapter = null;
                
                // Handle terminal exit
                session.process.onExit((exitCode, signal) => {
                    console.log(`[SafePTYManager] Session ${session.id} exited: code=${exitCode}, signal=${signal}`);
                    
                    // Clean up ClaudeInputHandler for this session
                    claudeInputHandler.cleanup(session.id);
                    
                    socket.emit('terminal:exit', {
                        id: session.id,
                        exitCode: exitCode,
                        signal: signal
                    });
                    safeptyManager.destroySession(session.id);
                });
                
            } catch (error) {
                console.error('[SafePTYManager] Terminal creation error:', error);
                socket.emit('terminal:error', {
                    message: error.message
                });
            }
        });
        
        // Handle terminal input (support both terminal:data and terminal:input for compatibility)
        const handleTerminalInput = async ({ id, data, thinkingMode }) => {
            console.log('🔵 [Backend] terminal:data received:', { id, data: data?.substring(0, 50), thinkingMode });
            const session = safeptyManager.getSession(id);
            if (session && session.process) {
                // Store thinking mode in session for use by Claude API calls
                if (thinkingMode) {
                    session.thinkingMode = thinkingMode;
                }
                
                // Initialize command buffer if it doesn't exist
                if (!session.commandBuffer) {
                    session.commandBuffer = '';
                }
                
                // When AI Team is active, just pass through to PTY normally
                // Claude Code CLI will handle all terminal I/O
                if (session.aiTeamActive) {
                    console.log('[AI-TEAM] AI Team active, passing through to PTY');
                    // Fall through to normal PTY handling below
                }
                
                // Helper function to clean ANSI escape sequences
                function cleanCommand(rawData) {
                    // Remove ANSI escape sequences
                    let cleaned = rawData.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
                    // Remove other escape sequences
                    cleaned = cleaned.replace(/\x1b\][0-9;]*[^\x07]*\x07/g, '');
                    cleaned = cleaned.replace(/\x1b\][0-9;]*[^\x1b\\]*\x1b\\/g, '');
                    // Remove special terminal sequences like \x1BOA, \x1BOB, etc.
                    cleaned = cleaned.replace(/\x1bO[A-Z]/g, '');
                    
                    // Process backspace characters (\x7F and \x08) properly
                    let result = '';
                    for (let i = 0; i < cleaned.length; i++) {
                        const char = cleaned[i];
                        if (char === '\x7F' || char === '\x08') {
                            // Backspace: remove the last character from result
                            if (result.length > 0) {
                                result = result.slice(0, -1);
                            }
                        } else if (char.charCodeAt(0) >= 32 || char === '\r' || char === '\n') {
                            // Only add printable characters and newlines
                            result += char;
                        }
                        // Skip other control characters
                    }
                    
                    return result;
                }
                
                
                // Build command buffer to track what's being typed
                session.commandBuffer += data;
                
                // Clean the current buffer to check what's being typed
                const currentClean = cleanCommand(session.commandBuffer).trim();
                
                // Check if we have a complete command (ended with enter/return)
                if (data.includes('\r') || data.includes('\n')) {
                    console.log(`[CODER1-DEBUG] Complete command detected: "${currentClean}"`);
                    
                    // Clear the buffer for next command
                    session.commandBuffer = '';
                    
                    // NOTE: AI Team command handling moved earlier to prevent Claude CLI interference
                    // The check is now at the beginning of handleTerminalInput function
                    
                    // Check if this is a coder1 command
                    if (currentClean && (currentClean.startsWith('coder1 ') || currentClean === 'coder1')) {
                        console.log(`[CODER1-DEBUG] Intercepted coder1 command: "${currentClean}"`);
                        
                        // Send a newline to move to next line (visual feedback)
                        socket.emit('terminal:data', {
                            id: session.id,
                            data: '\r\n'
                        });
                        
                        try {
                            const repositoryCommands = getRepositoryCommands();
                            
                            // Create a wrapper to write to the terminal
                            const terminalWrapper = {
                                write: (text) => {
                                    socket.emit('terminal:data', {
                                        id: session.id,
                                        data: text
                                    });
                                },
                                session: session
                            };
                            
                            // Process the command
                            console.log(`[CODER1-DEBUG] Processing command: "${currentClean}"`);
                            const handled = await repositoryCommands.processCommand(currentClean, terminalWrapper);
                            console.log(`[CODER1-DEBUG] Command processing result: ${handled}`);
                            
                            if (handled) {
                                console.log(`[CODER1-DEBUG] Command handled successfully, refreshing prompt`);
                            } else {
                                console.log(`[CODER1-DEBUG] Command not recognized`);
                                socket.emit('terminal:data', {
                                    id: session.id,
                                    data: `❌ Unknown coder1 command: ${currentClean}\r\n`
                                });
                            }
                        } catch (error) {
                            console.error('Repository command error:', error);
                            socket.emit('terminal:data', {
                                id: session.id,
                                data: `❌ Command error: ${error.message}\r\n`
                            });
                        }
                        
                        // Clear the line in bash and show a new prompt
                        // Send Ctrl+C to cancel any pending command in bash
                        session.process.write('\x03');
                        
                        // Important: Return early to prevent sending enter to PTY
                        return;
                    } else {
                        // Not a coder1 command, send the enter key normally
                        session.process.write(data);
                        
                        // Track command history for Claude detection
                        session.commandHistory.push(currentClean);
                        if (session.commandHistory.length > 100) {
                            session.commandHistory = session.commandHistory.slice(-50);
                        }
                        
                        // Detect when Claude is launched
                        if (currentClean === 'claude' || currentClean.startsWith('claude ')) {
                            console.log('[SafePTYManager] Claude command detected:', currentClean);
                            console.log('[SafePTYManager] Full command:', currentClean);
                            session.claudeLaunching = true;
                            
                            // Track file activity for Claude commands
                            console.log('[SafePTYManager] File tracker loaded:', typeof claudeFileTracker);
                            
                            // Parse the Claude command for context
                            if (currentClean.startsWith('claude ')) {
                                const claudePrompt = currentClean.substring(7); // Remove 'claude ' prefix
                                
                                // Track that Claude is analyzing/working
                                const fileRefs = claudeFileTracker.parseFileReferences(claudePrompt);
                                if (fileRefs.length > 0) {
                                    // Found file references in the command
                                    const operation = claudeFileTracker.detectOperation(claudePrompt);
                                    claudeFileTracker.trackFileOperation(
                                        fileRefs[0],
                                        operation,
                                        session.id,
                                        { source: 'terminal', prompt: claudePrompt }
                                    );
                                } else {
                                    // No specific files, mark as analyzing
                                    claudeFileTracker.trackFileOperation(
                                        null,
                                        'analyzing',
                                        session.id,
                                        { source: 'terminal', prompt: claudePrompt }
                                    );
                                }
                            }
                            
                            // Try to detect Claude process after a short delay
                            setTimeout(async () => {
                                const claudePid = await claudeInputHandler.detectClaudeProcess(
                                    session.id, 
                                    session.process.pid
                                );
                                
                                if (claudePid) {
                                    session.claudePid = claudePid;
                                    session.claudeActive = true;
                                    console.log(`[SafePTYManager] Claude subprocess tracked: PID ${claudePid}`);
                                    
                                    // Notify supervision system
                                    socket.emit('supervision:claude-detected', {
                                        sessionId: session.id,
                                        claudePid: claudePid
                                    });
                                }
                            }, 1000); // Wait 1 second for Claude to fully spawn
                        }
                    }
                } else {
                    // For coder1 commands, we need to echo manually since bash won't see them
                    // BUT NOT when Claude is active - Claude handles its own echo
                    if (currentClean.startsWith('coder1') && !session.claudeActive) {
                        // Echo the character back to the terminal display
                        socket.emit('terminal:data', {
                            id: session.id,
                            data: data
                        });
                        // Don't send to PTY for coder1 commands
                    } else if (session.claudeActive) {
                        // When Claude is active, always send input to PTY
                        // Claude CLI handles its own echo and prompt
                        session.process.write(data);
                    } else {
                        // Normal command, send to PTY for echo and processing
                        session.process.write(data);
                    }
                }
                
            } else {
                socket.emit('terminal:error', {
                    message: `Terminal session ${id} not found`
                });
            }
        };
        
        // Register both terminal:data and terminal:input event handlers for compatibility
        socket.on('terminal:data', handleTerminalInput);
        socket.on('terminal:input', handleTerminalInput);
        
        // Handle terminal resize with debouncing to prevent ResizeObserver loops
        const resizeTimeouts = new Map();
        socket.on('terminal:resize', ({ id, cols, rows }) => {
            const session = safeptyManager.getSession(id);
            if (session && session.process) {
                // Clear previous resize timeout
                if (resizeTimeouts.has(id)) {
                    clearTimeout(resizeTimeouts.get(id));
                }
                
                // Debounce resize events to prevent loops
                const timeout = setTimeout(() => {
                    try {
                        session.process.resize(cols, rows);
                        console.log(`[SafePTYManager] Terminal ${id} resized to ${cols}x${rows}`);
                    } catch (error) {
                        console.error(`[SafePTYManager] Resize error for ${id}:`, error);
                    } finally {
                        resizeTimeouts.delete(id);
                    }
                }, 100); // 100ms debounce
                
                resizeTimeouts.set(id, timeout);
            }
        });
        
        // Register Claude button WebSocket handlers
        socket.on('claude:button', ({ action, prompt, sessionId }) => {
            console.log(`[SafePTYManager] Claude button action: ${action} with sessionId: ${sessionId}`);
            
            // Store socket reference for later registration
            socket.claudeSessionId = sessionId;
            socket.claudeSocket = socket;
            
            // For supervision, mark the current terminal session as supervised
            if (action === 'supervision') {
                // Find the terminal session for this socket
                for (const [id, session] of safeptyManager.sessions) {
                    if (session.socketId === socket.id) {
                        session.supervisionActive = true;
                        session.supervisionSessionId = sessionId;
                        console.log(`[SafePTYManager] Marked session ${id} for supervision`);
                        
                        // Set up supervision event listeners - check periodically for global engine
                        console.log(`[SafePTYManager] Setting up supervision listeners. Global engine exists: ${!!global.supervisionEngine}`);
                        
                        // Function to setup listeners when engine becomes available
                        const setupListeners = () => {
                            if (global.supervisionEngine && !session.supervisionListenersSetup) {
                                session.supervisionListenersSetup = true;
                                console.log(`[SafePTYManager] Attaching supervision event listeners for session ${id}`);
                            
                                // When supervision has an intervention, display it and deliver to Claude
                                global.supervisionEngine.on('interventionReady', (intervention) => {
                                    const message = `\r\n\x1b[33m━━━━━ AI Supervision Suggestion ━━━━━\x1b[0m\r\n` +
                                                  `\x1b[36m${intervention.intervention}\x1b[0m\r\n` +
                                                  `\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n`;
                                    
                                    socket.emit('terminal:data', {
                                        id: session.id,
                                        data: message
                                    });
                                    
                                    // For general interventions, we display them but don't auto-input
                                    // These are typically guidance/suggestions rather than direct answers
                                    console.log(`[Supervision] Intervention displayed: ${intervention.intervention.substring(0, 50)}...`);
                                });
                                
                                // Show when supervision detects questions and auto-respond
                                global.supervisionEngine.on('questionAnswered', (event) => {
                                    // Reset delivery flag for new questions
                                    session.responsesDelivered = false;
                                    
                                    // Collect questions and batch responses
                                    if (!session.pendingQuestions) {
                                        session.pendingQuestions = [];
                                    }
                                    
                                    session.pendingQuestions.push(event);
                                    
                                    // Clear existing timer
                                    if (session.questionTimer) {
                                        clearTimeout(session.questionTimer);
                                    }
                                    
                                    // Set timer to respond after collecting all questions (wait 3 seconds for more questions)
                                    session.questionTimer = setTimeout(() => {
                                        if (session.pendingQuestions.length > 0) {
                                            console.log(`[Supervision] Collected ${session.pendingQuestions.length} questions from Claude`);
                                            
                                            // Display message that we're responding
                                            const displayMessage = `\r\n\x1b[35m🤖 AI Supervisor: I detected ${session.pendingQuestions.length} questions!\x1b[0m\r\n` +
                                                                  `\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n` +
                                                                  `\x1b[36mPreparing auto-responses...\x1b[0m\r\n`;
                                            
                                            socket.emit('terminal:data', {
                                                id: session.id,
                                                data: displayMessage
                                            });
                                            
                                            // Clear any existing responses first
                                            session.pendingResponses = [];
                                            
                                            // Queue responses to be sent when Claude is ready
                                            session.pendingQuestions.forEach((q, index) => {
                                                // Display each answer
                                                const answerDisplay = `\x1b[32m${index + 1}. ${q.answer}\x1b[0m\r\n`;
                                                socket.emit('terminal:data', {
                                                    id: session.id,
                                                    data: answerDisplay
                                                });
                                                
                                                // Queue the response
                                                session.pendingResponses.push(q.answer);
                                            });
                                            
                                            console.log(`[Supervision] Queued ${session.pendingResponses.length} responses`);
                                            console.log('[Supervision] Waiting for Claude to be ready to receive input...');
                                            
                                            // Fallback timer - send responses after 5 seconds if not already sent
                                            setTimeout(async () => {
                                                if (session.pendingResponses && session.pendingResponses.length > 0 && !session.responsesDelivered) {
                                                    console.log('[Supervision] Fallback timer triggered - sending responses now');
                                                    session.responsesDelivered = true;
                                                    
                                                    for (let i = 0; i < session.pendingResponses.length; i++) {
                                                        const response = session.pendingResponses[i];
                                                        console.log(`[Supervision] Sending response ${i + 1} via fallback: "${response}"`);
                                                        
                                                        // Try to send via ClaudeInputHandler
                                                        const success = await claudeInputHandler.sendToClaudeProcess(
                                                            session.id,
                                                            response,
                                                            session.process
                                                        );
                                                        
                                                        if (success) {
                                                            console.log(`[Supervision] Response ${i + 1} delivered via fallback`);
                                                        } else {
                                                            // Try direct PTY write as last resort
                                                            session.process.write(response + '\n');
                                                            console.log(`[Supervision] Response ${i + 1} sent via direct PTY`);
                                                        }
                                                        
                                                        // Small delay between responses
                                                        if (i < session.pendingResponses.length - 1) {
                                                            await new Promise(resolve => setTimeout(resolve, 500));
                                                        }
                                                    }
                                                    
                                                    session.pendingResponses = [];
                                                }
                                            }, 5000); // 5 second fallback timer
                                            
                                            // Clear pending questions
                                            session.pendingQuestions = [];
                                        }
                                    }, 3000); // Wait 3 seconds to collect all questions
                                });
                                
                                // Show when supervision grants permission and auto-approve
                                global.supervisionEngine.on('permissionGranted', (event) => {
                                    const message = `\r\n\x1b[32m✅ AI Supervisor: ${event.approval}\x1b[0m\r\n`;
                                    
                                    socket.emit('terminal:data', {
                                        id: session.id,
                                        data: message
                                    });
                                    
                                    // Actually send the approval to Claude's input stream
                                    setTimeout(async () => {
                                        if (session.process && !session.process.killed) {
                                            // Use ClaudeInputHandler for proper delivery
                                            const success = await claudeInputHandler.sendToClaudeProcess(
                                                session.id,
                                                'yes',
                                                session.process
                                            );
                                            
                                            if (success) {
                                                console.log(`[Supervision] Auto-approval delivered successfully`);
                                            } else {
                                                console.log(`[Supervision] Auto-approval delivery may have failed`);
                                            }
                                        }
                                    }, 1000);
                                });
                                
                                // NEW: Listen for question responses from supervision engine
                                global.supervisionEngine.on('responseGenerated', async (data) => {
                                    console.log(`[SafePTYManager] 📝 Response generated for question: ${data.response}`);
                                    console.log(`[SafePTYManager] Supervision mode: ${session.supervisionMode || 'auto'}`);
                                    
                                    // Check supervision mode (default to auto for autonomous operation)
                                    const mode = session.supervisionMode || 'auto';
                                    
                                    if (mode === 'suggestion') {
                                        // SUGGESTION MODE: Show response to user, don't auto-type
                                        console.log(`[SafePTYManager] Suggestion mode - displaying response to user`);
                                        socket.emit('supervision:suggestion', {
                                            sessionId: data.sessionId,
                                            suggestion: data.response,
                                            message: 'Suggested response (you can type this manually):',
                                            timestamp: Date.now()
                                        });
                                    } else if (mode === 'auto' && session.process && !session.process.killed) {
                                        // AUTO MODE: Type the response automatically for autonomous operation
                                        console.log(`[SafePTYManager] Auto mode - typing response into Claude...`);
                                        
                                        // Slightly longer delay to make it clear this is automated
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                        
                                        // Type each character to simulate input (slightly slower for clarity)
                                        for (const char of data.response) {
                                            session.process.write(char);
                                            await new Promise(resolve => setTimeout(resolve, 20)); // Slightly slower typing
                                        }
                                        
                                        // Press enter
                                        session.process.write('\r');
                                        console.log(`[SafePTYManager] ✅ Response typed into Claude`);
                                    }
                                });
                                
                                console.log('[SafePTYManager] Supervision event listeners attached');
                            } else if (!global.supervisionEngine) {
                                console.log('[SafePTYManager] Global supervision engine not ready yet, will retry...');
                            }
                        };
                        
                        // Try to setup listeners immediately
                        setupListeners();
                        
                        // If engine wasn't ready, poll for it
                        if (!session.supervisionListenersSetup) {
                            const pollForEngine = setInterval(() => {
                                setupListeners();
                                if (session.supervisionListenersSetup) {
                                    clearInterval(pollForEngine);
                                }
                            }, 1000); // Check every second for up to 10 seconds
                            
                            setTimeout(() => {
                                clearInterval(pollForEngine);
                                if (!session.supervisionListenersSetup) {
                                    console.log('[SafePTYManager] WARNING: Supervision engine never became available');
                                }
                            }, 10000);
                        }
                        break;
                    }
                }
            }
            
            // Emit appropriate action based on button
            switch (action) {
                case 'supervision':
                case 'parallel':
                case 'infinite':
                case 'hivemind':
                    // These are handled via REST API calls from frontend
                    socket.emit('claude:ready', { action, sessionId });
                    break;
                default:
                    socket.emit('claude:error', { message: `Unknown action: ${action}` });
            }
        });
        
        // Register for Claude session output
        socket.on('claude:register', ({ sessionId }) => {
            console.log(`[SafePTYManager] Registering socket ${socket.id} for Claude session: ${sessionId}`);
            if (claudeButtonRoutes.registerWebSocket) {
                claudeButtonRoutes.registerWebSocket(sessionId, socket);
            }
        });
        
        // Handle AI Team state updates
        socket.on('ai-team:state', ({ terminalId, isActive, teamConfig = null }) => {
            console.log(`[SafePTYManager] AI Team state update: terminalId=${terminalId}, active=${isActive}`);
            
            const session = safeptyManager.getSession(terminalId);
            if (session) {
                // If activating AI Team and Claude is running, kill Claude first
                if (isActive && (session.claudePid || session.claudeActive || session.claudeLaunching)) {
                    console.log(`[SafePTYManager] Claude is active - terminating to start AI Team`);
                    try {
                        // Send Ctrl+C to terminate Claude
                        session.process.write('\x03');
                        
                        // Clear Claude tracking
                        session.claudePid = null;
                        session.claudeActive = false;
                        session.claudeLaunching = false;
                        session.claudePromptDetected = false;
                        session.claudeWaitingForInput = false;
                        
                        // Wait a moment for Claude to exit, then clear screen
                        setTimeout(() => {
                            // Clear the terminal and reset cursor
                            socket.emit('terminal:data', {
                                id: session.id,
                                data: '\x1b[2J\x1b[H' // Clear screen and move cursor to top
                            });
                            
                            // Show fresh prompt
                            socket.emit('terminal:data', {
                                id: session.id,
                                data: 'michaelkraft$ '
                            });
                        }, 500);
                    } catch (error) {
                        console.error('Error killing Claude process:', error);
                    }
                }
                
                session.aiTeamActive = isActive;
                session.aiTeamConfig = teamConfig;
                console.log(`[SafePTYManager] AI Team state set for session ${terminalId}: ${isActive}`);
            } else {
                console.warn(`[SafePTYManager] Session ${terminalId} not found for AI Team state update`);
            }
        });
        
        // Handle supervision activation
        socket.on('supervision:start', ({ sessionId, terminalId, mode = 'auto' }) => {
            console.log(`[SafePTYManager] 🎯 SUPERVISION START REQUEST RECEIVED`);
            console.log(`[SafePTYManager] SessionId: ${sessionId}, TerminalId: ${terminalId}`);
            console.log(`[SafePTYManager] Supervision Mode: ${mode}`); // 'auto' or 'suggestion'
            console.log(`[SafePTYManager] Socket ID: ${socket.id}`);
            console.log(`[SafePTYManager] Active sessions count: ${safeptyManager.sessions.size}`);
            
            const session = terminalId ? safeptyManager.getSession(terminalId) : 
                           Array.from(safeptyManager.sessions.values()).find(s => s.socketId === socket.id);
            
            console.log(`[SafePTYManager] Found session: ${session ? session.id : 'NONE'}`);
            console.log(`[SafePTYManager] Session has process: ${!!session?.process}`);
            console.log(`[SafePTYManager] Session already has supervision: ${!!session?.supervisionAdapter}`);
            
            if (session && session.process) {
                console.log(`[SafePTYManager] ✅ Creating PTYSupervisionAdapter...`);
                
                // Import and create SupervisionEngine
                const { SupervisionEngine } = require('../services/supervision/SupervisionEngine');
                const supervisionEngine = new SupervisionEngine({
                    sessionId: sessionId,
                    projectPath: process.cwd(),
                    logger: console
                });
                
                // Create supervision adapter for this PTY session
                const adapter = new PTYSupervisionAdapter(session.process, supervisionEngine, {
                    sessionId: sessionId,
                    logger: console,
                    projectRoot: process.cwd()
                });
                
                console.log(`[SafePTYManager] ✅ PTYSupervisionAdapter created`);
                console.log(`[SafePTYManager] 🔗 Connecting ClaudeInputHandler...`);
                
                // Pass ClaudeInputHandler to the adapter for proper subprocess communication
                adapter.claudeInputHandler = claudeInputHandler;
                console.log(`[SafePTYManager] ✅ ClaudeInputHandler connected`);
                
                // Create supervision commands interface
                const supervisionCommands = new SupervisionCommands(adapter);
                
                // Set up event forwarding to frontend
                adapter.on('intervention', (data) => {
                    socket.emit('supervision:intervention', data);
                    console.log(`[Supervision] Intervention: ${data.response}`);
                });
                
                adapter.on('smart-decision', (data) => {
                    socket.emit('supervision:smart-decision', data);
                    console.log(`[Supervision] Smart decision: ${data.decision.reason}`);
                });
                
                adapter.on('confusion-detected', (data) => {
                    socket.emit('supervision:confusion', data);
                    console.log(`[Supervision] Confusion detected: ${data.text}`);
                });
                
                adapter.on('error-detected', (data) => {
                    socket.emit('supervision:error', data);
                    console.log(`[Supervision] Error detected: ${data.text}`);
                });
                
                // Listen for responses from SupervisionEngine
                supervisionEngine.on('responseGenerated', async (data) => {
                    console.log(`[SafePTYManager] 📝 SupervisionEngine generated response: ${data.response}`);
                    console.log(`[SafePTYManager] Supervision mode: ${session.supervisionMode || 'auto'}`);
                    
                    // Check supervision mode (default to auto for autonomous operation)
                    const currentMode = session.supervisionMode || 'auto';
                    
                    if (currentMode === 'suggestion') {
                        // SUGGESTION MODE: Show response to user, don't auto-type
                        console.log(`[SafePTYManager] Suggestion mode - displaying response to user`);
                        socket.emit('supervision:suggestion', {
                            sessionId: data.sessionId,
                            suggestion: data.response,
                            message: 'Suggested response (you can type this manually):',
                            timestamp: Date.now()
                        });
                    } else if (currentMode === 'auto' && session.process && !session.process.killed) {
                        // AUTO MODE: Type the response automatically for autonomous operation
                        console.log(`[SafePTYManager] Auto mode - typing response into Claude...`);
                        
                        // Slightly longer delay to make it clear this is automated
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Type each character to simulate input (slightly slower for clarity)
                        for (const char of data.response) {
                            session.process.write(char);
                            await new Promise(resolve => setTimeout(resolve, 20)); // Slightly slower typing
                        }
                        
                        // Press enter
                        session.process.write('\r');
                        console.log(`[SafePTYManager] ✅ Response typed into Claude`);
                    }
                });
                
                adapter.on('output', (data) => {
                    socket.emit('supervision:output', data);
                });
                
                adapter.on('supervision-mode-changed', (data) => {
                    socket.emit('supervision:mode-changed', data);
                    console.log(`[Supervision] Mode changed to: ${data.mode}`);
                });
                
                // Start supervision
                console.log(`[SafePTYManager] 🚀 Starting supervision adapter...`);
                adapter.startSupervision();
                console.log(`[SafePTYManager] ✅ Supervision adapter started`);
                
                // Store adapter, commands references, engine, and mode
                session.supervisionAdapter = adapter;
                session.supervisionEngine = supervisionEngine; // Store the engine reference
                session.supervisionCommands = supervisionCommands;
                session.supervisionMode = mode; // Store supervision mode (auto/suggestion)
                activeSupervision.set(sessionId, adapter);
                
                console.log(`[SafePTYManager] 📊 Supervision state:`);
                console.log(`[SafePTYManager] - Session ID: ${sessionId}`);
                console.log(`[SafePTYManager] - Terminal ID: ${session.id}`);
                console.log(`[SafePTYManager] - Adapter stored: ${!!session.supervisionAdapter}`);
                console.log(`[SafePTYManager] - Active supervisions count: ${activeSupervision.size}`);
                console.log(`[SafePTYManager] - Global supervision engine exists: ${!!global.supervisionEngine}`);
                
                socket.emit('supervision:started', { sessionId, terminalId: session.id });
                console.log(`[SafePTYManager] ✅ SUPERVISION FULLY ACTIVATED`);
                
            } else {
                console.log(`[SafePTYManager] ❌ SUPERVISION FAILED TO START`);
                console.log(`[SafePTYManager] - Session found: ${!!session}`);
                console.log(`[SafePTYManager] - Has process: ${!!session?.process}`);
                console.log(`[SafePTYManager] - Socket ID mismatch?`);
                socket.emit('supervision:error', { message: 'No terminal session found for supervision' });
            }
        });
        
        // Handle supervision stop
        socket.on('supervision:stop', ({ sessionId }) => {
            console.log(`[SafePTYManager] Stopping supervision for session ${sessionId}`);
            
            const adapter = activeSupervision.get(sessionId);
            if (adapter) {
                adapter.stopSupervision();
                activeSupervision.delete(sessionId);
                
                // Clear adapter reference from session
                for (const session of safeptyManager.sessions.values()) {
                    if (session.supervisionAdapter === adapter) {
                        session.supervisionAdapter = null;
                        break;
                    }
                }
                
                socket.emit('supervision:stopped', { sessionId });
            }
        });
        
        // Handle supervision commands
        socket.on('supervision:command', ({ command, args }) => {
            console.log(`[SafePTYManager] Supervision command: ${command}`, args);
            // This will be implemented in Phase 5
            socket.emit('supervision:command-result', { 
                command, 
                result: `Command ${command} received - full implementation pending`
            });
        });
        
        // Handle supervision status checks
        socket.on('supervision:status-check', () => {
            console.log(`[SafePTYManager] Status check requested from ${socket.id}`);
            
            // Check if any supervision is currently active
            let hasActiveSupervision = false;
            let activeSessions = [];
            
            for (const [sessionId, adapter] of activeSupervision) {
                if (adapter && adapter.isActive) {
                    hasActiveSupervision = true;
                    activeSessions.push({
                        sessionId,
                        mode: adapter.getSupervisionMode?.()?.mode || 'unknown',
                        interventions: adapter.interventionCount || 0
                    });
                }
            }
            
            socket.emit('supervision:status', {
                active: hasActiveSupervision,
                sessionCount: activeSupervision.size,
                activeSessions: activeSessions,
                totalSessions: safeptyManager.sessionCount
            });
        });
        
        // Handle Error Doctor fix application
        socket.on('error-doctor:apply-fix', async ({ sessionId, fix }) => {
            console.log(`[SafePTYManager] Error Doctor: Applying fix for session ${sessionId}`);
            
            const session = safeptyManager.getSession(sessionId);
            if (session && session.process && fix) {
                try {
                    if (fix.command) {
                        // Execute the fix command in the terminal
                        console.log(`[Error Doctor] Executing fix command: ${fix.command}`);
                        session.process.write(fix.command + '\r');
                        
                        // Notify frontend that fix was applied
                        socket.emit('error-doctor:fix-applied', {
                            sessionId: sessionId,
                            fix: fix,
                            message: `Applied fix: ${fix.title}`,
                            timestamp: Date.now()
                        });
                    } else {
                        console.log(`[Error Doctor] Fix requires manual intervention: ${fix.title}`);
                        socket.emit('error-doctor:fix-manual', {
                            sessionId: sessionId,
                            fix: fix,
                            message: 'This fix requires manual intervention',
                            timestamp: Date.now()
                        });
                    }
                } catch (error) {
                    console.error('[Error Doctor] Fix application failed:', error);
                    socket.emit('error-doctor:fix-error', {
                        sessionId: sessionId,
                        error: error.message,
                        timestamp: Date.now()
                    });
                }
            } else {
                socket.emit('error-doctor:fix-error', {
                    sessionId: sessionId,
                    error: 'Terminal session not found or invalid fix',
                    timestamp: Date.now()
                });
            }
        });
        
        // Handle PTY supervision trigger from API
        socket.on('supervision:start-pty', ({ sessionId }) => {
            console.log(`[SafePTYManager] PTY supervision triggered for session ${sessionId}`);
            
            // Find the active terminal session for this socket
            const session = Array.from(safeptyManager.sessions.values())
                           .find(s => s.socketId === socket.id);
            
            if (session && session.process && !session.supervisionAdapter) {
                // Trigger supervision start
                socket.emit('supervision:start', { 
                    sessionId: sessionId, 
                    terminalId: session.id 
                });
            } else if (session && session.supervisionAdapter) {
                console.log(`[SafePTYManager] Supervision already active for session ${sessionId}`);
            } else {
                console.log(`[SafePTYManager] No terminal session found for PTY supervision`);
            }
        });
        
        // Handle voice events (moved from app.js)
        socket.on('voice:join_session', (data) => {
            if (data.sessionId) {
                socket.join(`session:${data.sessionId}`);
                const client = connectedClients.get(socket.id);
                if (client) {
                    client.sessionId = data.sessionId;
                }
                socket.emit('voice:session_joined', { sessionId: data.sessionId });
                console.log(`[SafePTYManager] Voice session joined: ${data.sessionId}`);
            }
        });
        
        // Handle client disconnect
        socket.on('disconnect', () => {
            console.log(`[SafePTYManager] Client disconnected: ${socket.id}`);
            
            // Remove from connected clients tracking
            connectedClients.delete(socket.id);
            
            // Clean up sessions for this socket
            for (const [sessionId, session] of safeptyManager.sessions) {
                if (session.socketId === socket.id) {
                    safeptyManager.destroySession(sessionId);
                }
            }
            
            // Clean up old clients periodically
            if (connectedClients.size > 100) {
                const now = Date.now();
                for (const [id, client] of connectedClients.entries()) {
                    if (now - client.connectedAt > 3600000) { // 1 hour
                        connectedClients.delete(id);
                    }
                }
            }
        });
    });
    
    // Periodic cleanup
    setInterval(() => {
        safeptyManager.cleanup();
    }, 300000); // 5 minutes
    
    console.log('[SafePTYManager] Socket.IO terminal integration ready');
}

// Export telemetry endpoint
function getTerminalTelemetry() {
    return safeptyManager.getTelemetry();
}

module.exports = {
    setupTerminalWebSocket,
    getTerminalTelemetry
};