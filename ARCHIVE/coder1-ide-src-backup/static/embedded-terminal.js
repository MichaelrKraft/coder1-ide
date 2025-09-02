/**
 * Embedded Terminal Manager for Coder1 Interface
 * Integrates xterm.js terminal with WebSocket communication
 */

class EmbeddedTerminalManager {
    constructor() {
        this.terminal = null;
        this.fitAddon = null;
        this.websocket = null;
        this.sessionId = null;
        this.isConnected = false;
        this.isVisible = false;
        this.isMinimized = false;
        this.startTime = null;
        this.uptimeInterval = null;
        
        // Terminal configuration
        this.terminalConfig = {
            theme: {
                background: '#000000',
                foreground: '#ffffff',
                cursor: '#8b5cf6',
                selection: 'rgba(139, 92, 246, 0.3)',
                black: '#000000',
                red: '#ef4444',
                green: '#10b981',
                yellow: '#f59e0b',
                blue: '#3b82f6',
                magenta: '#8b5cf6',
                cyan: '#06b6d4',
                white: '#ffffff',
                brightBlack: '#374151',
                brightRed: '#f87171',
                brightGreen: '#34d399',
                brightYellow: '#fbbf24',
                brightBlue: '#60a5fa',
                brightMagenta: '#a78bfa',
                brightCyan: '#67e8f9',
                brightWhite: '#f9fafb'
            },
            fontSize: 14,
            fontFamily: '"Courier New", "Monaco", "Menlo", monospace',
            cursorBlink: true,
            cursorStyle: 'block',
            scrollback: 1000,
            tabStopWidth: 4,
            bellStyle: 'none'
        };
        
        this.initializeElements();
        this.setupEventListeners();
    }
    
    initializeElements() {
        // Get DOM elements with existence checks
        this.terminalSection = document.getElementById('embeddedTerminalSection');
        this.terminalContainer = document.getElementById('embeddedTerminalWrapper');
        this.terminalElement = document.getElementById('embeddedTerminal');
        
        // Control buttons
        this.terminalToggle = document.getElementById('terminalToggle');
        this.createSessionBtn = document.getElementById('createTerminalSessionBtn');
        this.clearTerminalBtn = document.getElementById('clearEmbeddedTerminalBtn');
        this.disconnectTerminalBtn = document.getElementById('disconnectTerminalBtn');
        this.minimizeTerminalBtn = document.getElementById('minimizeTerminalBtn');
        this.closeTerminalBtn = document.getElementById('closeEmbeddedTerminalBtn');
        
        // Status elements
        this.terminalStatus = document.getElementById('embeddedTerminalStatus');
        this.terminalIndicator = document.getElementById('embeddedTerminalIndicator');
        this.sessionIdDisplay = document.getElementById('terminalSessionId');
        this.connectionStatus = document.getElementById('terminalConnectionStatus');
        this.uptimeDisplay = document.getElementById('terminalUptime');
        
        // Input elements
        this.commandInput = document.getElementById('terminalCommandInput');
        this.sendCommandBtn = document.getElementById('sendTerminalCommand');
        
        // Log missing critical elements
        if (!this.terminalElement) {
            this.logError('Critical: Terminal element not found');
        }
        if (!this.terminalSection) {
            this.logError('Critical: Terminal section not found');
        }
    }
    
    setupEventListeners() {
        try {
            // Terminal toggle button
            if (this.terminalToggle) {
                this.terminalToggle.addEventListener('click', () => {
                    this.toggleTerminal();
                });
            }
            
            // Control buttons with existence checks
            if (this.createSessionBtn) {
                this.createSessionBtn.addEventListener('click', () => {
                    this.createSession();
                });
            }
            
            if (this.clearTerminalBtn) {
                this.clearTerminalBtn.addEventListener('click', () => {
                    this.clearTerminal();
                });
            }
            
            if (this.disconnectTerminalBtn) {
                this.disconnectTerminalBtn.addEventListener('click', () => {
                    this.disconnectSession();
                });
            }
            
            if (this.minimizeTerminalBtn) {
                this.minimizeTerminalBtn.addEventListener('click', () => {
                    this.minimizeTerminal();
                });
            }
            
            if (this.closeTerminalBtn) {
                this.closeTerminalBtn.addEventListener('click', () => {
                    this.closeTerminal();
                });
            }
            
            // Command input with existence checks
            if (this.commandInput) {
                this.commandInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.sendCommand();
                    }
                });
            }
            
            if (this.sendCommandBtn) {
                this.sendCommandBtn.addEventListener('click', () => {
                    this.sendCommand();
                });
            }
            
            // Window resize handler
            window.addEventListener('resize', () => {
                if (this.terminal && this.isVisible) {
                    setTimeout(() => {
                        try {
                            if (this.fitAddon) {
                                this.fitAddon.fit();
                            }
                        } catch (error) {
                            this.logError('Failed to fit terminal on resize', error);
                        }
                    }, 100);
                }
            });
            
        } catch (error) {
            this.logError('Failed to setup event listeners', error);
        }
    }
    
    toggleTerminal() {
        if (this.isVisible) {
            this.closeTerminal();
        } else {
            this.showTerminal();
        }
    }
    
    showTerminal() {
        try {
            if (!this.terminal) {
                this.initializeTerminal();
            }
            
            if (this.terminalSection) {
                this.terminalSection.style.display = 'block';
                this.isVisible = true;
                
                // Update button states
                this.updateButtonStates();
                
                // Fit terminal to container
                setTimeout(() => {
                    if (this.fitAddon) {
                        try {
                            this.fitAddon.fit();
                        } catch (error) {
                            this.logError('Failed to fit terminal', error);
                        }
                    }
                }, 100);
                
                this.log('Terminal interface opened');
            }
        } catch (error) {
            this.logError('Failed to show terminal', error);
        }
    }
    
    closeTerminal() {
        try {
            if (this.terminalSection) {
                this.terminalSection.style.display = 'none';
                this.isVisible = false;
                this.isMinimized = false;
                
                // Remove minimized class
                this.terminalSection.classList.remove('minimized');
                
                this.log('Terminal interface closed');
            }
        } catch (error) {
            this.logError('Failed to close terminal', error);
        }
    }
    
    minimizeTerminal() {
        try {
            this.isMinimized = !this.isMinimized;
            
            if (this.terminalSection && this.minimizeTerminalBtn) {
                if (this.isMinimized) {
                    this.terminalSection.classList.add('minimized');
                    this.minimizeTerminalBtn.innerHTML = '<i class="fas fa-plus"></i>';
                    this.minimizeTerminalBtn.title = 'Restore Terminal';
                } else {
                    this.terminalSection.classList.remove('minimized');
                    this.minimizeTerminalBtn.innerHTML = '<i class="fas fa-minus"></i>';
                    this.minimizeTerminalBtn.title = 'Minimize Terminal';
                    
                    // Refit terminal when restored
                    setTimeout(() => {
                        if (this.fitAddon) {
                            try {
                                this.fitAddon.fit();
                            } catch (error) {
                                this.logError('Failed to fit terminal after restore', error);
                            }
                        }
                    }, 300);
                }
            }
        } catch (error) {
            this.logError('Failed to minimize/restore terminal', error);
        }
    }
    
    initializeTerminal() {
        try {
            if (!this.terminalElement) {
                throw new Error('Terminal element not found');
            }
            
            // Create terminal instance
            this.terminal = new Terminal(this.terminalConfig);
            
            // Create fit addon with fallback handling
            try {
                // Try different possible constructors for FitAddon
                if (typeof FitAddon !== 'undefined') {
                    this.fitAddon = new FitAddon();
                } else if (window.FitAddon && typeof window.FitAddon.FitAddon !== 'undefined') {
                    this.fitAddon = new window.FitAddon.FitAddon();
                } else if (window.FitAddon) {
                    this.fitAddon = new window.FitAddon();
                } else {
                    console.warn('[EmbeddedTerminal] FitAddon not available, terminal will work without auto-fit');
                    this.fitAddon = null;
                }
                
                if (this.fitAddon) {
                    this.terminal.loadAddon(this.fitAddon);
                }
            } catch (error) {
                console.warn('[EmbeddedTerminal] Failed to load FitAddon, continuing without it:', error.message);
                this.fitAddon = null;
            }
            
            // Open terminal in container
            this.terminal.open(this.terminalElement);
            
            // Fit to container
            if (this.fitAddon) {
                this.fitAddon.fit();
            }
            
            // Welcome message - CORRECTED: Single backslashes for ANSI codes
            this.terminal.writeln('\x1b[1;36mCoder1 Integrated Terminal\x1b[0m');
            this.terminal.writeln('\x1b[2mDemo Mode - Terminal Ready\x1b[0m');
            this.terminal.writeln('');
            
            // Simulate successful connection for demo
            setTimeout(() => {
                this.isConnected = true;
                this.sessionId = 'demo-session-' + Date.now();
                this.startTime = Date.now();
                
                // Update all status elements
                this.updateStatus('Connected', 'connected');
                this.updateSessionInfo();
                this.updateButtonStates();
                this.startUptimeCounter();
                
                this.terminal.writeln('\x1b[32m✓ Terminal ready for autonomous builds\x1b[0m');
                this.terminal.write('\x1b[36m$ \x1b[0m');
                
                this.log('Demo mode connection established');
            }, 1500);
            
            // Setup terminal event handlers
            this.setupTerminalHandlers();
            
            this.log('Terminal initialized successfully');
            
        } catch (error) {
            this.logError('Failed to initialize terminal', error);
            // Fallback: show error in terminal section if possible
            if (this.terminalElement) {
                this.terminalElement.innerHTML = `
                    <div style="color: #ef4444; padding: 20px; font-family: monospace;">
                        ✗ Failed to initialize terminal: ${error.message}
                    </div>
                `;
            }
        }
    }
    
    setupTerminalHandlers() {
        try {
            // Handle terminal data input
            this.terminal.onData((data) => {
                if (this.websocket && this.isConnected) {
                    this.sendToWebSocket({
                        type: 'terminal_input',
                        sessionId: this.sessionId,
                        data: data
                    });
                }
            });
            
            // Handle terminal resize
            this.terminal.onResize((size) => {
                if (this.websocket && this.isConnected) {
                    this.sendToWebSocket({
                        type: 'terminal_resize',
                        sessionId: this.sessionId,
                        cols: size.cols,
                        rows: size.rows
                    });
                }
            });
        } catch (error) {
            this.logError('Failed to setup terminal handlers', error);
        }
    }
    
    createSession() {
        try {
            if (this.isConnected) {
                this.log('Session already active');
                return;
            }
            
            this.log('Creating new terminal session...');
            
            // Show terminal if not visible
            if (!this.isVisible) {
                this.showTerminal();
            }
            
            // Connect to WebSocket
            this.connectWebSocket();
        } catch (error) {
            this.logError('Failed to create session', error);
        }
    }
    
    connectWebSocket() {
        try {
            // CORRECTED: Check if WebSocket is supported
            if (!window.WebSocket) {
                throw new Error('WebSocket not supported by browser');
            }
            
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                this.log('WebSocket connected');
                this.requestNewSession();
            };
            
            this.websocket.onmessage = (event) => {
                this.handleWebSocketMessage(event);
            };
            
            this.websocket.onclose = (event) => {
                this.log(`WebSocket disconnected (code: ${event.code})`);
                this.handleDisconnection();
            };
            
            this.websocket.onerror = (error) => {
                this.logError('WebSocket error', error);
                this.handleDisconnection();
            };
            
            // Connection timeout
            setTimeout(() => {
                if (this.websocket && this.websocket.readyState === WebSocket.CONNECTING) {
                    this.websocket.close();
                    this.logError('WebSocket connection timeout');
                }
            }, 10000);
            
        } catch (error) {
            this.logError('Failed to connect WebSocket', error);
            this.handleDisconnection();
        }
    }
    
    requestNewSession() {
        try {
            const websiteInput = document.getElementById('websiteInput');
            const projectName = websiteInput ? websiteInput.value : 'embedded-project';
            
            const message = {
                type: 'create_session',
                userId: 'embedded-terminal-user',
                projectData: {
                    name: projectName,
                    description: 'Terminal session from embedded interface'
                }
            };
            
            this.sendToWebSocket(message);
        } catch (error) {
            this.logError('Failed to request new session', error);
        }
    }
    
    handleWebSocketMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'session_created':
                    this.handleSessionCreated(message);
                    break;
                    
                case 'output':
                    this.handleTerminalOutput(message);
                    break;
                    
                case 'prompt':
                    this.handleClaudeCodePrompt(message);
                    break;
                    
                case 'prompt_response':
                    this.handlePromptResponse(message);
                    break;
                    
                case 'terminal_output':
                    this.handleTerminalOutput(message);
                    break;
                    
                case 'session_status':
                    this.handleSessionStatus(message);
                    break;
                    
                case 'error':
                    this.handleError(message);
                    break;
                    
                default:
                    this.log(`Unknown message type: ${message.type}`);
            }
            
        } catch (error) {
            this.logError('Failed to parse WebSocket message', error);
        }
    }
    
    handleSessionCreated(message) {
        try {
            this.sessionId = message.sessionId;
            this.isConnected = true;
            this.startTime = Date.now();
            
            this.updateStatus('Connected', 'connected');
            this.updateSessionInfo();
            this.updateButtonStates();
            this.startUptimeCounter();
            
            if (this.terminal) {
                this.terminal.writeln('\x1b[32m✓ Terminal session created\x1b[0m');
                this.terminal.writeln(`\x1b[2mSession ID: ${this.sessionId}\x1b[0m`);
                this.terminal.writeln('');
            }
            
            this.log(`Terminal session created: ${this.sessionId}`);
            
            // Notify main interface about session creation
            if (window.coder1Interface && typeof window.coder1Interface.notifyTerminalSessionCreated === 'function') {
                window.coder1Interface.notifyTerminalSessionCreated(this.sessionId);
            }
        } catch (error) {
            this.logError('Failed to handle session creation', error);
        }
    }
    
    handleTerminalOutput(message) {
        try {
            if (this.terminal && message.data) {
                this.terminal.write(message.data);
            }
        } catch (error) {
            this.logError('Failed to handle terminal output', error);
        }
    }
    
    handleSessionStatus(message) {
        try {
            this.updateStatus(message.status, message.status.toLowerCase());
            
            if (message.progress !== undefined) {
                this.log(`Session progress: ${message.progress}%`);
            }
        } catch (error) {
            this.logError('Failed to handle session status', error);
        }
    }
    
    handleClaudeCodePrompt(message) {
        try {
            if (this.terminal && message.data) {
                // Display the prompt output
                this.terminal.write(message.data);
                
                // Show interactive prompt UI if prompt info is available
                if (message.promptInfo) {
                    this.showInteractivePrompt(message.promptInfo, message.sessionId);
                }
            }
        } catch (error) {
            this.logError('Failed to handle Claude Code prompt', error);
        }
    }
    
    handlePromptResponse(message) {
        try {
            if (this.terminal && message.data) {
                // Show the response that was sent
                this.terminal.write(message.data);
            }
            
            // Hide the interactive prompt UI
            this.hideInteractivePrompt();
        } catch (error) {
            this.logError('Failed to handle prompt response', error);
        }
    }
    
    showInteractivePrompt(promptInfo, sessionId) {
        try {
            // Remove any existing prompt UI
            this.hideInteractivePrompt();
            
            // Create prompt overlay
            const promptOverlay = document.createElement('div');
            promptOverlay.id = 'claude-prompt-overlay';
            promptOverlay.className = 'claude-prompt-overlay';
            
            promptOverlay.innerHTML = `
                <div class="claude-prompt-container">
                    <div class="claude-prompt-header">
                        <h4>🤖 Claude Code Permission Required</h4>
                        <p>Claude Code is asking for permission to proceed</p>
                    </div>
                    <div class="claude-prompt-message">
                        <code>${promptInfo.message}</code>
                    </div>
                    <div class="claude-prompt-actions">
                        ${promptInfo.options.map(option => `
                            <button class="claude-prompt-btn ${option.key === '1' || option.key === 'y' ? 'primary' : 'secondary'}" 
                                    data-response="${option.key}" 
                                    data-session="${sessionId}">
                                <span class="key">${option.key}</span>
                                <span class="label">${option.label}</span>
                            </button>
                        `).join('')}
                    </div>
                    <div class="claude-prompt-footer">
                        <small>Choose an option or type in the terminal</small>
                    </div>
                </div>
            `;
            
            // Add to terminal container
            if (this.terminalElement && this.terminalElement.parentNode) {
                this.terminalElement.parentNode.appendChild(promptOverlay);
            }
            
            // Add event listeners to buttons
            promptOverlay.querySelectorAll('.claude-prompt-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const responseKey = e.currentTarget.dataset.response;
                    const sessionId = e.currentTarget.dataset.session;
                    this.sendPromptResponse(sessionId, responseKey);
                });
            });
            
            // Highlight the terminal to show it's waiting for input
            if (this.terminalElement) {
                this.terminalElement.classList.add('waiting-for-input');
            }
            
            this.log(`Interactive prompt shown: ${promptInfo.type}`);
            
        } catch (error) {
            this.logError('Failed to show interactive prompt', error);
        }
    }
    
    hideInteractivePrompt() {
        try {
            const promptOverlay = document.getElementById('claude-prompt-overlay');
            if (promptOverlay) {
                promptOverlay.remove();
            }
            
            // Remove highlighting from terminal
            if (this.terminalElement) {
                this.terminalElement.classList.remove('waiting-for-input');
            }
            
        } catch (error) {
            this.logError('Failed to hide interactive prompt', error);
        }
    }
    
    sendPromptResponse(sessionId, responseKey) {
        try {
            // Send via HTTP API
            fetch(`/api/terminal/sessions/${sessionId}/prompt-response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ responseKey })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.log(`Prompt response sent: ${data.label}`);
                } else {
                    this.logError('Failed to send prompt response', data.error);
                }
            })
            .catch(error => {
                this.logError('Failed to send prompt response', error);
            });
            
        } catch (error) {
            this.logError('Failed to send prompt response', error);
        }
    }
    
    handleError(message) {
        this.logError('Session error', message.error);
        
        if (this.terminal) {
            this.terminal.writeln(`\x1b[31m✗ Error: ${message.error}\x1b[0m`);
        }
    }
    
    handleDisconnection() {
        this.isConnected = false;
        this.updateStatus('Disconnected', 'disconnected');
        this.updateButtonStates();
        this.stopUptimeCounter();
        
        if (this.terminal) {
            this.terminal.writeln('\x1b[33m⚠ Connection lost\x1b[0m');
        }
    }
    
    sendToWebSocket(message) {
        try {
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify(message));
                return true;
            } else {
                this.logError('Cannot send message: WebSocket not connected');
                return false;
            }
        } catch (error) {
            this.logError('Failed to send WebSocket message', error);
            return false;
        }
    }
    
    sendCommand() {
        try {
            if (!this.commandInput) return;
            
            const command = this.commandInput.value.trim();
            if (!command) return;
            
            if (this.isConnected && this.sessionId) {
                // CORRECTED: Use actual carriage return character
                const success = this.sendToWebSocket({
                    type: 'terminal_input',
                    sessionId: this.sessionId,
                    data: command + '\r'
                });
                
                if (success) {
                    this.commandInput.value = '';
                }
            } else if (this.terminal) {
                this.terminal.writeln('\x1b[31m✗ Not connected to session\x1b[0m');
            }
        } catch (error) {
            this.logError('Failed to send command', error);
        }
    }
    
    clearTerminal() {
        try {
            if (this.terminal) {
                this.terminal.clear();
                this.log('Terminal cleared');
            }
        } catch (error) {
            this.logError('Failed to clear terminal', error);
        }
    }
    
    disconnectSession() {
        try {
            if (this.websocket) {
                this.websocket.close();
            }
            
            this.sessionId = null;
            this.isConnected = false;
            this.updateStatus('Disconnected', 'disconnected');
            this.updateButtonStates();
            this.stopUptimeCounter();
            
            this.log('Session disconnected');
        } catch (error) {
            this.logError('Failed to disconnect session', error);
        }
    }
    
    updateStatus(status, className) {
        try {
            if (this.terminalStatus) {
                this.terminalStatus.textContent = status;
                this.terminalStatus.className = `session-status ${className}`;
            }
            
            if (this.terminalIndicator) {
                this.terminalIndicator.className = `session-indicator ${className}`;
            }
            
            if (this.connectionStatus) {
                this.connectionStatus.className = `terminal-connection-status ${className}`;
            }
            
            this.log(`Status updated: ${status} (${className})`);
        } catch (error) {
            this.logError('Failed to update status', error);
        }
    }
    
    updateSessionInfo() {
        try {
            if (this.sessionIdDisplay) {
                this.sessionIdDisplay.textContent = this.sessionId || 'No Session';
            }
        } catch (error) {
            this.logError('Failed to update session info', error);
        }
    }
    
    updateButtonStates() {
        try {
            if (this.createSessionBtn) {
                this.createSessionBtn.disabled = this.isConnected;
            }
            
            if (this.disconnectTerminalBtn) {
                this.disconnectTerminalBtn.disabled = !this.isConnected;
            }
        } catch (error) {
            this.logError('Failed to update button states', error);
        }
    }
    
    startUptimeCounter() {
        this.stopUptimeCounter();
        
        this.uptimeInterval = setInterval(() => {
            try {
                if (this.startTime && this.uptimeDisplay) {
                    const elapsed = Date.now() - this.startTime;
                    const hours = Math.floor(elapsed / 3600000);
                    const minutes = Math.floor((elapsed % 3600000) / 60000);
                    const seconds = Math.floor((elapsed % 60000) / 1000);
                    
                    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    this.uptimeDisplay.textContent = timeStr;
                }
            } catch (error) {
                this.logError('Failed to update uptime', error);
            }
        }, 1000);
    }
    
    stopUptimeCounter() {
        if (this.uptimeInterval) {
            clearInterval(this.uptimeInterval);
            this.uptimeInterval = null;
        }
        
        if (this.uptimeDisplay) {
            this.uptimeDisplay.textContent = '00:00:00';
        }
    }
    
    // Utility methods
    log(message) {
        console.log(`[EmbeddedTerminal] ${message}`);
    }
    
    logError(message, error = null) {
        console.error(`[EmbeddedTerminal] ${message}`, error);
    }
    
    // Public API for main interface integration
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            isConnected: this.isConnected,
            isVisible: this.isVisible,
            uptime: this.startTime ? Date.now() - this.startTime : 0
        };
    }
    
    writeToTerminal(text, color = null) {
        try {
            if (this.terminal) {
                if (color) {
                    this.terminal.writeln(`\x1b[${color}m${text}\x1b[0m`);
                } else {
                    this.terminal.writeln(text);
                }
            }
        } catch (error) {
            this.logError('Failed to write to terminal', error);
        }
    }
    
    executeCommand(command) {
        try {
            if (this.isConnected && this.sessionId) {
                return this.sendToWebSocket({
                    type: 'terminal_input',
                    sessionId: this.sessionId,
                    data: command + '\r'
                });
            }
            return false;
        } catch (error) {
            this.logError('Failed to execute command', error);
            return false;
        }
    }
    
    // Start autonomous build with real-time output
    startAutonomousBuildSimulation(description) {
        if (!this.terminal) {
            this.log('Cannot start build - terminal not initialized');
            return;
        }
        
        this.log('Starting autonomous build with real Claude Code execution');
        
        // Clear terminal and show build start
        this.terminal.clear();
        this.terminal.writeln('\x1b[36m$ claude --dangerously-skip-permissions "' + description + '"\x1b[0m');
        this.terminal.writeln('\x1b[32m✓ Starting real autonomous build with Claude Code CLI...\x1b[0m');
        this.terminal.writeln('\x1b[33m⚡ Autonomous permissions enabled - no manual approvals needed\x1b[0m');
        this.terminal.writeln('');
        
        // Set up listener for real Claude Code output
        this.setupRealTimeOutput();
    }
    
    // Setup real-time output from Claude Code
    setupRealTimeOutput() {
        // Create WebSocket connection to receive real-time output
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/terminal-output`;
        
        try {
            this.outputSocket = new WebSocket(wsUrl);
            
            this.outputSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'claude-output' && this.terminal) {
                        // Display real Claude Code output in terminal
                        this.terminal.write(data.text);
                    }
                } catch (error) {
                    console.warn('Error parsing terminal output:', error);
                }
            };
            
            this.outputSocket.onopen = () => {
                this.log('Connected to real-time Claude Code output');
                if (this.terminal) {
                    this.terminal.writeln('\x1b[32m🔗 Connected to real-time Claude Code output\x1b[0m');
                    this.terminal.writeln('');
                }
            };
            
            this.outputSocket.onclose = () => {
                this.log('Disconnected from real-time output');
            };
            
            this.outputSocket.onerror = (error) => {
                this.log('WebSocket error:', error);
                if (this.terminal) {
                    this.terminal.writeln('\x1b[33m⚠ Using fallback mode - real-time output not available\x1b[0m');
                }
            };
            
        } catch (error) {
            this.log('Failed to connect to real-time output:', error);
            if (this.terminal) {
                this.terminal.writeln('\x1b[33m⚠ Real-time output not available, showing progress updates\x1b[0m');
            }
        }
    }
}

// Initialize embedded terminal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Check if required libraries are loaded
        if (typeof Terminal === 'undefined') {
            console.error('[EmbeddedTerminal] xterm.js library not loaded');
            return;
        }
        
        if (typeof FitAddon === 'undefined') {
            console.warn('[EmbeddedTerminal] xterm fit-addon not loaded - terminal will work without auto-fit');
        }
        
        // Initialize embedded terminal manager
        window.embeddedTerminal = new EmbeddedTerminalManager();
        
        // Add to global scope for main interface integration
        if (window.coder1Interface) {
            window.coder1Interface.embeddedTerminal = window.embeddedTerminal;
        }
        
        console.log('[EmbeddedTerminal] Embedded terminal manager initialized successfully');
        
    } catch (error) {
        console.error('[EmbeddedTerminal] Failed to initialize:', error);
    }
});