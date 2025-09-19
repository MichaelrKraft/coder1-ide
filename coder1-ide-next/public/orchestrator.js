// Orchestrator Standalone JavaScript
// Handles all functionality for the AI Mastermind Consultation interface

class OrchestratorApp {
    constructor() {
        this.socket = null;
        this.session = null;
        this.messages = [];
        this.isLoading = false;
        this.uploadedFiles = [];
        this.recognition = null;
        this.isRecording = false;
        this.joinedAgents = new Set(); // Track which agents have joined
        this.streamingMessages = new Map(); // Track streaming messages
        this.typingIndicators = new Set(); // Track active typing indicators
        
        // Phase configuration
        this.phases = [
            { key: 'discovery', label: 'Discovery', description: 'Orchestrator analyzes your requirements' },
            { key: 'team', label: 'Team Assembly', description: 'Describe your project in a few sentences.' },
            { key: 'collaboration', label: 'Collaboration', description: 'Experts discuss and ask questions' },
            { key: 'planning', label: 'Individual Planning', description: 'Each expert creates individual plans' },
            { key: 'synthesis', label: 'Plan Synthesis', description: 'Best ideas combined into final plan' }
        ];
        
        this.init();
    }
    
    init() {
        // REMOVED: // REMOVED: console.log('[Orchestrator] Initializing standalone application');
        this.setupEventListeners();
        this.setupFileUpload();
        this.setupVoiceRecognition();
        this.connectSocket();
    }
    
    setupEventListeners() {
        // Enter key handlers
        document.getElementById('user-query')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                startConsultation(); // Call the global function, not this.startConsultation
            }
        });
        
        document.getElementById('user-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendUserMessage();
            }
        });
        
        // Auto-resize textareas
        this.setupAutoResize();
    }
    
    setupAutoResize() {
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
            });
        });
    }
    
    setupFileUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        
        if (!uploadArea || !fileInput) return;
        
        // File input change handler
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        // Drag and drop handlers
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });
    }
    
    handleFiles(files) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.md', '.json', '.xml'];
        
        for (let file of files) {
            // Check file size
            if (file.size > maxSize) {
                logger?.warn(`File ${file.name} exceeds 10MB limit`);
                continue;
            }
            
            // Check file type
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            if (!allowedTypes.some(type => file.name.toLowerCase().endsWith(type))) {
                logger?.warn(`File ${file.name} has unsupported type`);
                continue;
            }
            
            // Add to uploaded files
            const fileObj = {
                id: `file-${Date.now()}-${Math.random()}`,
                name: file.name,
                size: file.size,
                type: file.type,
                file: file
            };
            
            this.uploadedFiles.push(fileObj);
        }
        
        this.renderUploadedFiles();
    }
    
    renderUploadedFiles() {
        const container = document.getElementById('uploaded-files');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.uploadedFiles.forEach(fileObj => {
            const fileEl = document.createElement('div');
            fileEl.className = 'uploaded-file';
            fileEl.dataset.fileId = fileObj.id;
            
            const sizeStr = this.formatFileSize(fileObj.size);
            
            fileEl.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                    </div>
                    <div class="file-details">
                        <div class="file-name">${fileObj.name}</div>
                        <div class="file-size">${sizeStr}</div>
                    </div>
                </div>
                <button class="file-remove" onclick="app.removeFile('${fileObj.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
            
            container.appendChild(fileEl);
        });
    }
    
    removeFile(fileId) {
        this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
        this.renderUploadedFiles();
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    setupVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            logger?.warn('[Orchestrator] Speech recognition not supported');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        this.recognition.onstart = () => {
            // REMOVED: // REMOVED: console.log('[Orchestrator] Voice recording started');
            this.isRecording = true;
            const micBtn = document.getElementById('microphone-btn');
            if (micBtn) {
                micBtn.classList.add('recording');
            }
        };
        
        this.recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    transcript += event.results[i][0].transcript;
                }
            }
            
            if (transcript) {
                const textarea = document.getElementById('user-query');
                if (textarea) {
                    // Append to existing text or replace if empty
                    const currentText = textarea.value.trim();
                    textarea.value = currentText ? `${currentText} ${transcript}` : transcript;
                    
                    // Trigger resize
                    textarea.style.height = 'auto';
                    textarea.style.height = textarea.scrollHeight + 'px';
                }
            }
        };
        
        this.recognition.onend = () => {
            // REMOVED: // REMOVED: console.log('[Orchestrator] Voice recording ended');
            this.isRecording = false;
            const micBtn = document.getElementById('microphone-btn');
            if (micBtn) {
                micBtn.classList.remove('recording', 'processing');
            }
        };
        
        this.recognition.onerror = (event) => {
            logger?.error('[Orchestrator] Voice recognition error:', event.error);
            this.isRecording = false;
            const micBtn = document.getElementById('microphone-btn');
            if (micBtn) {
                micBtn.classList.remove('recording', 'processing');
            }
        };
    }
    
    startVoiceRecording() {
        if (!this.recognition) {
            logger?.warn('[Orchestrator] Speech recognition not available');
            return;
        }
        
        if (this.isRecording) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
            } catch (error) {
                logger?.error('[Orchestrator] Failed to start voice recognition:', error);
            }
        }
    }
    
    connectSocket() {
        if (typeof io === 'undefined') {
            logger?.warn('[Orchestrator] Socket.IO not available, running in demo mode');
            return;
        }
        
        const socketUrl = 'http://localhost:3000';
        // REMOVED: // REMOVED: console.log('[Orchestrator] Connecting to:', socketUrl);
        
    //         this.socket = io(socketUrl, {
    //             transports: ['websocket', 'polling'],
    //             timeout: 10000,
    //             forceNew: true,
    //             reconnection: true,
    //             reconnectionAttempts: 5,
    //             reconnectionDelay: 2000
    //         });
        
        this.setupSocketHandlers();
    }
    
    setupSocketHandlers() {
        this.socket.on('connect', () => {
            // REMOVED: console.log('[Orchestrator] Connected:', this.socket.id);
        });
        
        this.socket.on('connect_error', (error) => {
            // logger?.error('[Orchestrator] Connection error:', error);
        });
        
        // Conversation events
        this.socket.on('conversation:started', (data) => {
            // REMOVED: // REMOVED: console.log('[Orchestrator] Conversation started:', data);
            this.session = {
                sessionId: data.sessionId,
                query: data.query || this.getUserQuery(),
                active: true,
                phase: data.phase || 'discovery',
                startTime: Date.now(),
                agents: data.agents || []
            };
            this.isLoading = false;
            this.showConversationScreen();
            this.updatePhaseProgress();
            
            // Hide loading phase when conversation starts
            hideLoadingPhase();
            
            // Add the orchestrator's initial message if provided
            if (data.orchestratorMessage && data.orchestratorMessage.message && data.orchestratorMessage.message !== 'Execution error') {
                this.addMessage({
                    id: `orchestrator-${Date.now()}`,
                    agent: 'Orchestrator',
                    message: data.orchestratorMessage.message,
                    timestamp: Date.now(),
                    type: 'orchestrator',
                    phase: data.phase
                });
            } else {
                // Add a friendly welcome message if the backend isn't providing one
                this.addMessage({
                    id: `welcome-${Date.now()}`,
                    agent: 'Orchestrator', 
                    message: 'Welcome to your AI Mastermind consultation! I\'m gathering expert insights about your project. Feel free to ask questions or provide additional details.',
                    timestamp: Date.now(),
                    type: 'orchestrator',
                    phase: data.phase
                });
            }
        });
        
        this.socket.on('conversation:phase-changed', (data) => {
            // REMOVED: // REMOVED: console.log('[Orchestrator] Phase changed:', data);
            if (this.session) {
                this.session.phase = data.phase || data.newPhase;
                this.updatePhaseProgress();
            }
            
            // Update timer phase
            const phaseData = this.phases.find(p => p.key === (data.phase || data.newPhase));
            if (phaseData) {
                consultationTimer.updatePhaseManually(phaseData.label);
            }
            
            // Add phase transition message
            this.addMessage({
                id: `phase-${Date.now()}`,
                agent: 'System',
                message: `Entering ${phaseData?.label} phase...`,
                timestamp: Date.now(),
                type: 'system',
                phase: data.phase || data.newPhase
            });
        });
        
        this.socket.on('conversation:phase-change', (data) => {
            // REMOVED: // REMOVED: console.log('[Orchestrator] Phase change event:', data);
            if (this.session) {
                this.session.phase = data.newPhase;
                this.updatePhaseProgress();
            }
        });
        
        this.socket.on('conversation:message', (data) => {
            // REMOVED: // REMOVED: console.log('[Orchestrator] Message received:', data);
            this.addMessage({
                id: data.id || `msg-${Date.now()}-${Math.random()}`,
                agent: data.agent || 'Agent',
                message: data.message,
                timestamp: data.timestamp || Date.now(),
                type: data.type || 'collaboration',
                phase: data.phase
            });
        });
        
        this.socket.on('conversation:orchestrator-message', (data) => {
            // REMOVED: // REMOVED: console.log('[Orchestrator] Orchestrator message received:', data);
            this.addMessage({
                id: data.id || `orchestrator-${Date.now()}-${Math.random()}`,
                agent: 'Orchestrator',
                message: data.message,
                timestamp: data.timestamp || Date.now(),
                type: 'orchestrator',
                phase: data.phase
            });
        });
        
        this.socket.on('conversation:agent-message', (data) => {
            // REMOVED: // REMOVED: console.log('[Orchestrator] Agent message received:', data);
            
            const agentName = data.agentName || data.agent || data.speaker;
            const agentType = data.expertType || data.agent; // Get the agent type for color coding
            
            // Check if this is a new agent joining the conversation
            if (agentName && !this.joinedAgents.has(agentName)) {
                this.joinedAgents.add(agentName);
                
                // Add introduction message for new agent
                this.addMessage({
                    id: `intro-${agentName}-${Date.now()}`,
                    agent: 'System',
                    message: `🎭 ${agentName} has joined the expert consultation`,
                    timestamp: Date.now(),
                    type: 'system',
                    phase: data.phase
                });
            }
            
            this.addMessage({
                id: data.id || `${data.agent}-${Date.now()}-${Math.random()}`,
                agent: agentName,
                agentType: agentType,  // Pass the agent type for color coding
                message: data.message,
                timestamp: data.timestamp || Date.now(),
                type: 'agent',
                phase: data.phase,
                round: data.round
            });
        });
        
        this.socket.on('conversation:expert-thinking', (data) => {
            // REMOVED: // REMOVED: console.log('[Orchestrator] Expert thinking:', data);
            // Remove any existing thinking indicators
            this.removeThinkingIndicators();
            
            this.addMessage({
                id: `thinking-${data.expertType}-${Date.now()}`,
                agent: data.expertName,
                message: data.message,
                timestamp: data.timestamp || Date.now(),
                type: 'thinking',
                phase: data.phase,
                temporary: true
            });
        });
        
        this.socket.on('conversation:plans-received', (data) => {
            // REMOVED: // REMOVED: console.log('[Orchestrator] Plans received:', data);
            if (this.session) {
                this.session.plans = data.plans;
            }
        });
        
        this.socket.on('conversation:synthesis-complete', (data) => {
            // REMOVED: // REMOVED: console.log('[Orchestrator] Synthesis complete:', data);
            if (this.session) {
                this.session.synthesis = data.synthesis;
                this.session.claudeCodePrompt = data.claudeCodePrompt;
                this.session.finalPlan = data.synthesis || data.finalPlan; // Store synthesis as finalPlan
                this.session.phase = 'complete';
                this.session.synthesisComplete = true; // Flag for export validation
            }
            
            // Complete the timer! 🎉
            consultationTimer.complete();
            
            this.addMessage({
                id: `synthesis-${Date.now()}`,
                agent: 'Orchestrator',
                message: 'Expert consultation complete! Final plan has been synthesized from all expert insights.',
                timestamp: Date.now(),
                type: 'synthesis'
            });
            
            this.showCompletionActions();
        });
        
        this.socket.on('conversation:complete', (data) => {
            // REMOVED: // REMOVED: console.log('[Orchestrator] Conversation complete:', data);
            if (this.session) {
                this.session.active = false;
                this.session.phase = 'complete';
            }
            
            // Complete the timer as backup (in case synthesis-complete didn't fire)
            if (!consultationTimer.isCompleted) {
                consultationTimer.complete();
            }
            
            this.showCompletionActions();
        });
        
        this.socket.on('conversation:error', (data) => {
            logger?.error('[Orchestrator] Conversation error:', data);
            this.isLoading = false;
            this.addMessage({
                id: `error-${Date.now()}`,
                agent: 'System',
                message: `Error: ${data.message || data.error || 'Unknown error'}`,
                timestamp: Date.now(),
                type: 'system'
            });
        });
        
        this.socket.on('conversation:claude-code-ready', (data) => {
            // REMOVED: console.log('[Orchestrator] Claude Code prompt ready:', data);
            // this.downloadClaudeCodePrompt(data.claudeCodePrompt);
        });
        
        this.socket.on('conversation:export-ready', (data) => {
            // REMOVED: console.log('[Orchestrator] Export ready:', data);
            // this.downloadExportData(data.data, data.format, data.filename);
        });
        
        // Streaming message handlers
        this.socket.on('conversation:stream-start', (data) => {
            // REMOVED: console.log('[Orchestrator] Stream started:', data);
            // this.handleStreamStart(data);
        });
        
        this.socket.on('conversation:stream-chunk', (data) => {
            // REMOVED: console.log('[Orchestrator] Stream chunk:', data);
            // this.handleStreamChunk(data);
        });
        
        this.socket.on('conversation:stream-complete', (data) => {
            // REMOVED: console.log('[Orchestrator] Stream complete:', data);
            // this.handleStreamComplete(data);
        });
        
        this.socket.on('conversation:typing-start', (data) => {
            // REMOVED: console.log('[Orchestrator] Typing started:', data);
            // this.showTypingIndicator(data);
        });
        
        this.socket.on('conversation:typing-stop', (data) => {
            // REMOVED: console.log('[Orchestrator] Typing stopped:', data);
            // this.hideTypingIndicator(data);
        });
        
        // Stream error handling
        this.socket.on('conversation:stream-error', (data) => {
            // logger?.error('[Orchestrator] Stream error:', data);
            // this.handleStreamError(data);
        });
        
        this.socket.on('conversation:stream-timeout', (data) => {
            // logger?.warn('[Orchestrator] Stream timeout:', data);
            // this.handleStreamTimeout(data);
        });
        
        this.socket.on('conversation:stream-retry', (data) => {
            // REMOVED: console.log('[Orchestrator] Stream retry:', data);
            // this.handleStreamRetry(data);
        });
    }
    
    getUserQuery() {
        return document.getElementById('user-query')?.value?.trim() || '';
    }
    
    getUserInput() {
        return document.getElementById('user-input')?.value?.trim() || '';
    }
    
    showConversationScreen() {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('conversation-screen').style.display = 'flex';
        
        // Show interaction area immediately so user can participate
        document.getElementById('interaction-area').style.display = 'block';
        
        // REMOVED: // REMOVED: console.log('[Orchestrator] Conversation screen displayed, interaction area visible');
    }
    
    updatePhaseProgress() {
        if (!this.session) return;
        
        const currentPhaseIndex = this.phases.findIndex(p => p.key === this.session.phase);
        const progressPercentage = ((currentPhaseIndex + 1) / this.phases.length) * 100;
        
        // Update progress bar
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = `${progressPercentage}%`;
        }
        
        // Update phase indicator
        const phaseIndicator = document.getElementById('phase-indicator');
        if (phaseIndicator) {
            phaseIndicator.textContent = `${currentPhaseIndex + 1} of ${this.phases.length}`;
        }
        
        // Update phase steps
        this.renderPhaseSteps(currentPhaseIndex);
    }
    
    renderPhaseSteps(currentPhaseIndex) {
        const phaseStepsContainer = document.getElementById('phase-steps');
        if (!phaseStepsContainer) return;
        
        phaseStepsContainer.innerHTML = '';
        
        this.phases.forEach((phase, index) => {
            const phaseStep = document.createElement('div');
            phaseStep.className = 'phase-step';
            
            if (index < currentPhaseIndex) {
                phaseStep.classList.add('completed');
            } else if (index === currentPhaseIndex) {
                phaseStep.classList.add('active');
            }
            
            phaseStep.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="16 12 12 8 8 12"></polyline>
                </svg>
                <span class="phase-label">${phase.label}</span>
            `;
            
            phaseStepsContainer.appendChild(phaseStep);
        });
    }
    
    removeThinkingIndicators() {
        const thinkingMessages = document.querySelectorAll('.message.thinking');
        thinkingMessages.forEach(msg => msg.remove());
        
        // Also remove from messages array
        this.messages = this.messages.filter(msg => msg.type !== 'thinking');
    }
    
    addMessage(message) {
        // Remove thinking indicators when actual message arrives
        if (message.type === 'agent') {
            this.removeThinkingIndicators();
        }
        
        // Mark new orchestrator and agent messages for glow effect
        if (message.type === 'orchestrator' || message.type === 'agent') {
            message.isNew = true;
        }
        
        this.messages.push(message);
        this.renderMessages();
        this.scrollToBottom();
        
        // Apply orange glow to new messages
        if (message.isNew) {
            setTimeout(() => {
                const messageElement = document.getElementById(message.id);
                if (messageElement) {
                    messageElement.classList.add('new-message');
                    // Remove class after animation completes
                    setTimeout(() => {
                        messageElement.classList.remove('new-message');
                    }, 2000);
                }
            }, 100);
        }
    }
    
    getAgentClass(agentName, agentType) {
        // First try to use explicit agent type if provided
        if (agentType) {
            const typeClassMap = {
                'frontend-specialist': 'agent-frontend',
                'backend-specialist': 'agent-backend',
                'security-specialist': 'agent-security',
                'database-specialist': 'agent-database',
                'system-architect': 'agent-architect',
                'devops-specialist': 'agent-devops',
                'mobile-specialist': 'agent-mobile',
                'ai-specialist': 'agent-ai',
                'ux-designer': 'agent-ux',
                'orchestrator': 'agent-orchestrator'
            };
            
            if (typeClassMap[agentType]) {
                return typeClassMap[agentType];
            }
        }
        
        // Fallback to name-based pattern matching
        if (!agentName || agentName === 'undefined') return 'agent-orchestrator';
        
        const agent = agentName.toLowerCase();
        
        if (agent.includes('architect') || agent.includes('system architect') || agent.includes('technical architect')) {
            return 'agent-architect';
        } else if (agent.includes('frontend') || agent.includes('ui') || agent.includes('interface')) {
            return 'agent-frontend';  
        } else if (agent.includes('backend') || agent.includes('api') || agent.includes('server')) {
            return 'agent-backend';
        } else if (agent.includes('security') || agent.includes('auth') || agent.includes('crypto')) {
            return 'agent-security';
        } else if (agent.includes('ux') || agent.includes('designer') || agent.includes('user experience')) {
            return 'agent-ux';
        } else if (agent.includes('devops') || agent.includes('deployment') || agent.includes('infrastructure')) {
            return 'agent-devops';
        } else if (agent.includes('orchestrator')) {
            return 'agent-orchestrator';
        }
        
        // Default fallback based on common patterns
        return 'agent-orchestrator';
    }

    renderMessages() {
        const container = document.getElementById('messages-container');
        if (!container) return;
        
        // Keep existing messages and add new ones (for performance)
        const existingCount = container.querySelectorAll('.message').length;
        const newMessages = this.messages.slice(existingCount);
        
        newMessages.forEach(message => {
            const messageEl = document.createElement('div');
            messageEl.className = `message ${message.type}`;
            
            // Apply agent-specific styling
            if (message.type === 'agent' || message.type === 'orchestrator') {
                const agentClass = this.getAgentClass(message.agent, message.agentType);
                messageEl.classList.add(agentClass);
            }
            
            if (message.agent === 'You') {
                messageEl.classList.add('user-message');
            }
            
            // Add glow effect for new messages
            if (message.isNew) {
                messageEl.classList.add('new-message');
                // Remove glow after animation
                setTimeout(() => {
                    messageEl.classList.remove('new-message');
                    message.isNew = false;
                }, 2000);
            }
            
            // Add streaming indicator class
            if (message.isStreaming) {
                messageEl.classList.add('streaming-message');
            }
            
            // Add typing indicator class
            if (message.type === 'typing') {
                messageEl.classList.add('typing-indicator');
            }
            
            const timeString = new Date(message.timestamp).toLocaleTimeString();
            const phaseLabel = this.phases.find(p => p.key === message.phase)?.label || '';
            
            // Ensure agent name is never undefined - preserve original name if available
            const displayName = message.agent && message.agent !== 'undefined' ? message.agent : 'System';
            
            messageEl.innerHTML = `
                <div class="message-header">
                    <div class="message-meta">
                        <span class="message-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M12 1v6"></path>
                                <path d="M12 17v6"></path>
                                <path d="M3.05 6.05l4.24 4.24"></path>
                                <path d="M16.71 16.71l4.24 4.24"></path>
                                <path d="M1 12h6"></path>
                                <path d="M17 12h6"></path>
                                <path d="M3.05 17.95l4.24-4.24"></path>
                                <path d="M16.71 7.29l4.24-4.24"></path>
                            </svg>
                        </span>
                        <span class="agent-name">${displayName}</span>
                        <span class="message-time">${timeString}</span>
                    </div>
                    ${phaseLabel ? `<span class="message-phase">${phaseLabel}</span>` : ''}
                </div>
                <div class="message-content">${message.isStreaming ? '' : this.highlightExpertMentions(message.message)}</div>
            `;
            
            container.appendChild(messageEl);
        });
        
        // Auto-scroll to show latest messages
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        const container = document.getElementById('messages-container');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    }

    handleStreamStart(data) {
        const messageId = data.messageId || `stream-${Date.now()}`;
        const agentName = data.agentName || data.agent || 'Assistant';
        const agentType = data.agentType || data.expertType;
        
        // Remove typing indicator if present
        this.hideTypingIndicator({ agentName });
        
        // Create streaming message placeholder
        const streamingMessage = {
            id: messageId,
            agent: agentName,
            agentType: agentType,
            message: '',
            timestamp: data.timestamp || Date.now(),
            type: data.type || 'agent',
            phase: data.phase,
            isStreaming: true,
            streamBuffer: ''
        };
        
        this.streamingMessages.set(messageId, streamingMessage);
        this.messages.push(streamingMessage);
        this.renderMessages();
        this.scrollToBottom();
    }
    
    handleStreamChunk(data) {
        const messageId = data.messageId;
        const streamingMessage = this.streamingMessages.get(messageId);
        
        if (!streamingMessage) {
            logger?.warn('[Streaming] No streaming message found for chunk:', messageId);
            return;
        }
        
        // Add chunk to buffer
        streamingMessage.streamBuffer += data.chunk || '';
        
        // Progressive rendering - show text word by word or character by character
        this.renderStreamingText(messageId, data.chunk || '', data.isComplete);
    }
    
    handleStreamComplete(data) {
        const messageId = data.messageId;
        const streamingMessage = this.streamingMessages.get(messageId);
        
        if (!streamingMessage) {
            logger?.warn('[Streaming] No streaming message found for completion:', messageId);
            return;
        }
        
        // Finalize the message
        streamingMessage.message = streamingMessage.streamBuffer;
        streamingMessage.isStreaming = false;
        delete streamingMessage.streamBuffer;
        
        // Remove from streaming map
        this.streamingMessages.delete(messageId);
        
        // Final render to ensure complete message is shown
        this.renderStreamingText(messageId, '', true);
        
        // Add glow effect for completed streaming message
        setTimeout(() => {
            const messageElement = document.getElementById(messageId);
            if (messageElement) {
                messageElement.classList.add('stream-complete');
                setTimeout(() => {
                    messageElement.classList.remove('stream-complete');
                }, 1000);
            }
        }, 100);
    }
    
    renderStreamingText(messageId, newChunk, isComplete) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;
        
        const contentElement = messageElement.querySelector('.message-content');
        if (!contentElement) return;
        
        const streamingMessage = this.streamingMessages.get(messageId);
        if (!streamingMessage && !isComplete) return;
        
        let textToRender;
        if (isComplete) {
            // Show final complete message
            const finalMessage = this.messages.find(m => m.id === messageId);
            textToRender = finalMessage?.message || '';
        } else {
            textToRender = streamingMessage.streamBuffer || '';
        }
        
        // Render with typing cursor effect
        const highlightedText = this.highlightExpertMentions(textToRender);
        
        if (isComplete) {
            contentElement.innerHTML = highlightedText;
        } else {
            // Add typing cursor for streaming
            contentElement.innerHTML = highlightedText + '<span class="typing-cursor">▊</span>';
        }
        
        // Auto-scroll to keep streaming message in view
        this.scrollToBottom();
    }
    
    showTypingIndicator(data) {
        const agentName = data.agentName || data.agent || 'Assistant';
        const agentType = data.agentType || data.expertType;
        const indicatorId = `typing-${agentName}-${Date.now()}`;
        const thinkingState = data.thinkingState || 'thinking';
        
        // Remove existing typing indicator for this agent
        this.hideTypingIndicator({ agentName });
        
        // Add typing indicator to active set
        this.typingIndicators.add(agentName);
        
        // Generate contextual thinking message
        const thinkingMessages = {
            thinking: `💭 ${agentName} is analyzing your request...`,
            researching: `🔍 ${agentName} is researching solutions...`,
            planning: `📋 ${agentName} is creating a plan...`,
            writing: `✍️ ${agentName} is writing a response...`,
            reviewing: `👀 ${agentName} is reviewing recommendations...`
        };
        
        const typingMessage = {
            id: indicatorId,
            agent: agentName,
            agentType: agentType,
            message: data.message || thinkingMessages[thinkingState] || `${agentName} is thinking...`,
            timestamp: Date.now(),
            type: 'typing',
            thinkingState: thinkingState,
            phase: data.phase,
            temporary: true
        };
        
        this.messages.push(typingMessage);
        this.renderMessages();
        this.scrollToBottom();
        
        // Auto-update thinking state progression
        if (data.progressiveThinking !== false) {
            this.startThinkingProgression(indicatorId, agentName, agentType, data.phase);
        }
    }
    
    startThinkingProgression(indicatorId, agentName, agentType, phase) {
        const states = ['thinking', 'researching', 'planning', 'writing'];
        let currentStateIndex = 0;
        
        const progressInterval = setInterval(() => {
            // Check if indicator still exists
            if (!this.typingIndicators.has(agentName)) {
                clearInterval(progressInterval);
                return;
            }
            
            currentStateIndex = (currentStateIndex + 1) % states.length;
            const newState = states[currentStateIndex];
            
            // Update the message content
            const messageIndex = this.messages.findIndex(m => m.id === indicatorId);
            if (messageIndex !== -1) {
                const thinkingMessages = {
                    thinking: `💭 ${agentName} is analyzing your request...`,
                    researching: `🔍 ${agentName} is researching solutions...`,
                    planning: `📋 ${agentName} is creating a plan...`,
                    writing: `✍️ ${agentName} is writing a response...`
                };
                
                this.messages[messageIndex].message = thinkingMessages[newState];
                this.messages[messageIndex].thinkingState = newState;
                
                // Re-render only this message
                this.updateTypingIndicatorMessage(indicatorId);
            }
        }, 3000); // Change state every 3 seconds
        
        // Store interval reference for cleanup
        if (!this.thinkingIntervals) {
            this.thinkingIntervals = new Map();
        }
        this.thinkingIntervals.set(agentName, progressInterval);
    }
    
    updateTypingIndicatorMessage(indicatorId) {
        const messageElement = document.getElementById(indicatorId);
        if (!messageElement) return;
        
        const message = this.messages.find(m => m.id === indicatorId);
        if (!message) return;
        
        const contentElement = messageElement.querySelector('.message-content');
        if (contentElement) {
            contentElement.innerHTML = message.message;
        }
    }
    
    hideTypingIndicator(data) {
        const agentName = data.agentName || data.agent;
        if (!agentName) return;
        
        // Clear thinking progression interval
        if (this.thinkingIntervals && this.thinkingIntervals.has(agentName)) {
            clearInterval(this.thinkingIntervals.get(agentName));
            this.thinkingIntervals.delete(agentName);
        }
        
        // Remove from active typing set
        this.typingIndicators.delete(agentName);
        
        // Remove typing indicator messages
        const typingMessages = document.querySelectorAll('.message.typing');
        typingMessages.forEach(element => {
            const agentElement = element.querySelector('.agent-name');
            if (agentElement && agentElement.textContent === agentName) {
                element.remove();
            }
        });
        
        // Remove from messages array
        this.messages = this.messages.filter(msg => 
            !(msg.type === 'typing' && msg.agent === agentName)
        );
    }
    
    handleStreamError(data) {
        const messageId = data.messageId;
        const agentName = data.agentName || data.agent || 'Assistant';
        const errorMessage = data.error || 'Stream encountered an error';
        
        logger?.error('[Streaming Error]', {
            messageId,
            agentName,
            error: errorMessage,
            timestamp: Date.now()
        });
        
        // Remove any existing streaming message
        if (messageId && this.streamingMessages.has(messageId)) {
            this.streamingMessages.delete(messageId);
        }
        
        // Hide typing indicators for this agent
        this.hideTypingIndicator({ agentName });
        
        // Show error message to user
        const errorMsg = {
            id: `error-${messageId || Date.now()}`,
            agent: 'System',
            message: `⚠️ ${agentName} encountered an error while responding: ${errorMessage}. Attempting to recover...`,
            timestamp: Date.now(),
            type: 'error',
            temporary: true
        };
        
        this.messages.push(errorMsg);
        this.renderMessages();
        this.scrollToBottom();
        
        // Auto-retry after a delay
        setTimeout(() => {
            this.retryStreamingResponse(data);
        }, 2000);
    }
    
    handleStreamTimeout(data) {
        const messageId = data.messageId;
        const agentName = data.agentName || data.agent || 'Assistant';
        
        logger?.warn('[Stream Timeout]', {
            messageId,
            agentName,
            timeout: data.timeout,
            timestamp: Date.now()
        });
        
        // Remove any existing streaming message
        if (messageId && this.streamingMessages.has(messageId)) {
            const streamingMessage = this.streamingMessages.get(messageId);
            
            // If we have partial content, show it with timeout notice
            if (streamingMessage.streamBuffer && streamingMessage.streamBuffer.trim()) {
                streamingMessage.message = streamingMessage.streamBuffer + '\n\n⏰ *Response timed out - partial content shown*';
                streamingMessage.isStreaming = false;
                delete streamingMessage.streamBuffer;
                this.streamingMessages.delete(messageId);
                
                // Re-render to show partial content
                this.renderMessages();
            } else {
                // No content received, show timeout message
                this.streamingMessages.delete(messageId);
                this.showTimeoutMessage(agentName, messageId);
            }
        } else {
            this.showTimeoutMessage(agentName, messageId);
        }
        
        // Hide typing indicators
        this.hideTypingIndicator({ agentName });
    }
    
    showTimeoutMessage(agentName, originalMessageId) {
        const timeoutMsg = {
            id: `timeout-${originalMessageId || Date.now()}`,
            agent: 'System',
            message: `⏰ ${agentName}'s response timed out. This may be due to high server load or complex analysis. Please try again.`,
            timestamp: Date.now(),
            type: 'timeout',
            temporary: true
        };
        
        this.messages.push(timeoutMsg);
        this.renderMessages();
        this.scrollToBottom();
    }
    
    handleStreamRetry(data) {
        const agentName = data.agentName || data.agent || 'Assistant';
        const attempt = data.attempt || 1;
        
        // REMOVED: // REMOVED: console.log('[Stream Retry]', {
    //             agentName,
    //             attempt,
    //             timestamp: Date.now()
    //         });
        
        // Show retry message to user
        const retryMsg = {
            id: `retry-${Date.now()}`,
            agent: 'System', 
            message: `🔄 ${agentName} is retrying (attempt ${attempt})...`,
            timestamp: Date.now(),
            type: 'retry',
            temporary: true
        };
        
        this.messages.push(retryMsg);
        this.renderMessages();
        this.scrollToBottom();
        
        // Show typing indicator for retry
        this.showTypingIndicator({
            agentName,
            agent: agentName,
            thinkingState: 'thinking',
            message: `🔄 ${agentName} is retrying your request...`,
            progressiveThinking: false
        });
        
        // Remove retry message after a short delay
        setTimeout(() => {
            this.messages = this.messages.filter(msg => msg.id !== retryMsg.id);
            this.renderMessages();
        }, 3000);
    }
    
    retryStreamingResponse(originalData) {
        if (!this.socket || !this.session?.sessionId) {
            logger?.warn('[Stream Retry] No socket or session available');
            return;
        }
        
        // Emit retry request to server
        this.socket.emit('conversation:retry-stream', {
            sessionId: this.session.sessionId,
            originalMessageId: originalData.messageId,
            agentName: originalData.agentName || originalData.agent,
            retryReason: 'stream_error',
            timestamp: Date.now()
        });
    }
    
    // Cleanup method for when user leaves or refreshes page
    cleanupStreamingResources() {
        // Clear all thinking progression intervals
        if (this.thinkingIntervals) {
            for (const [agentName, interval] of this.thinkingIntervals.entries()) {
                clearInterval(interval);
            }
            this.thinkingIntervals.clear();
        }
        
        // Clear streaming messages
        this.streamingMessages.clear();
        
        // Clear typing indicators
        this.typingIndicators.clear();
    }
    
    highlightExpertMentions(text) {
        if (!text) return text;
        
        // Define expert patterns and their corresponding CSS classes
        const expertPatterns = [
            {
                pattern: /\b(Frontend\s+(?:Specialist|Expert)|Front-end\s+(?:Specialist|Expert)|UI\s+Expert)\b/gi,
                class: 'expert-mention-frontend'
            },
            {
                pattern: /\b(Backend\s+(?:Specialist|Expert)|Back-end\s+(?:Specialist|Expert)|Server\s+Expert|API\s+Expert)\b/gi,
                class: 'expert-mention-backend'
            },
            {
                pattern: /\b(Security\s+(?:Expert|Specialist|Architect)|Cybersecurity\s+Expert)\b/gi,
                class: 'expert-mention-security'
            },
            {
                pattern: /\b(Database\s+(?:Expert|Specialist)|Data\s+Architect|DB\s+Expert)\b/gi,
                class: 'expert-mention-database'
            },
            {
                pattern: /\b(System\s+Architect|Technical\s+Architect|Solution\s+Architect|Software\s+Architect)\b/gi,
                class: 'expert-mention-architect'
            },
            {
                pattern: /\b(DevOps\s+(?:Engineer|Specialist)|Infrastructure\s+Expert|Deployment\s+Expert)\b/gi,
                class: 'expert-mention-devops'
            },
            {
                pattern: /\b(Mobile\s+(?:Expert|Specialist|Developer)|iOS\s+Expert|Android\s+Expert)\b/gi,
                class: 'expert-mention-mobile'
            },
            {
                pattern: /\b(AI\s+(?:Expert|Specialist)|ML\s+(?:Expert|Specialist)|Machine\s+Learning\s+Expert|AI\/ML\s+Expert)\b/gi,
                class: 'expert-mention-ai'
            },
            {
                pattern: /\b(UX\s+Designer|User\s+Experience\s+Designer|UI\/UX\s+Designer|Product\s+Designer)\b/gi,
                class: 'expert-mention-ux'
            }
        ];
        
        // Apply highlighting to each pattern
        let highlightedText = text;
        expertPatterns.forEach(({ pattern, class: className }) => {
            highlightedText = highlightedText.replace(pattern, (match) => {
                return `<span class="${className}">${match}</span>`;
            });
        });
        
        return highlightedText;
    }
    
    downloadClaudeCodePrompt(promptText) {
        const blob = new Blob([promptText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claude-code-prompt-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.addMessage({
            id: `download-${Date.now()}`,
            agent: 'System',
            message: 'Claude Code prompt downloaded successfully! Redirecting to CoderOne IDE...',
            timestamp: Date.now(),
            type: 'system'
        });
        
        // Redirect to CoderOne IDE after a short delay
        setTimeout(() => {
            window.location.href = '/ide';
        }, 1500);
    }
    
    downloadExportData(exportData, format, filename) {
        let content, mimeType;
        
        if (format === 'md') {
            // For Markdown PRD files
            content = exportData;
            mimeType = 'text/markdown';
        } else {
            // For JSON files (legacy format)
            content = JSON.stringify(exportData, null, 2);
            mimeType = 'application/json';
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `export-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        const fileType = format === 'md' ? 'Professional PRD' : 'Conversation data';
        this.addMessage({
            id: `export-${Date.now()}`,
            agent: 'System',
            message: `${fileType} exported successfully as "${filename}"!`,
            timestamp: Date.now(),
            type: 'system'
        });
    }
    
    showCompletionActions() {
        document.getElementById('completion-actions').style.display = 'block';
        document.getElementById('interaction-area').style.display = 'none';
    }
}

// Loading phase functions
function showLoadingPhase() {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create loading phase element
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading-phase';
    loadingEl.id = 'loading-phase';
    
    const loadingMessages = [
        '🔍 Analyzing your requirements...',
        '🎭 Assembling expert team...',
        '💡 Preparing consultation...'
    ];
    
    loadingEl.innerHTML = `
        <div class="loading-icon">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent-secondary)" stroke-width="2" opacity="0.3"/>
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent-primary)" stroke-width="2" 
                        stroke-dasharray="283" stroke-dashoffset="75"
                        style="animation: rotate 2s linear infinite"/>
            </svg>
        </div>
        <div class="loading-text" id="loading-text">${loadingMessages[0]}</div>
        <div class="loading-dots">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
        </div>
    `;
    
    container.appendChild(loadingEl);
    
    // Cycle through loading messages
    let messageIndex = 0;
    window.loadingInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        const textEl = document.getElementById('loading-text');
        if (textEl) {
            textEl.textContent = loadingMessages[messageIndex];
        }
    }, 5000); // Change message every 5 seconds
}

function hideLoadingPhase() {
    if (window.loadingInterval) {
        clearInterval(window.loadingInterval);
        window.loadingInterval = null;
    }
    const loadingEl = document.getElementById('loading-phase');
    if (loadingEl) {
        loadingEl.remove();
    }
}

// Global functions for button handlers
function handleUploadClick() {
    document.getElementById('file-input')?.click();
}

function toggleUploadArea() {
    const uploadSection = document.querySelector('.document-upload-section');
    const paperclipBtn = document.getElementById('paperclip-btn');
    
    if (uploadSection && paperclipBtn) {
        uploadSection.classList.toggle('active');
        paperclipBtn.classList.toggle('active');
    }
}

function toggleVoiceInput() {
    if (app && app.startVoiceRecording) {
        app.startVoiceRecording();
    }
}

// Close upload area when clicking outside
document.addEventListener('click', function(event) {
    const uploadSection = document.querySelector('.document-upload-section');
    const paperclipBtn = document.getElementById('paperclip-btn');
    
    if (!uploadSection || !paperclipBtn) return;
    
    // Check if click is outside upload area and paperclip button
    if (!uploadSection.contains(event.target) && !paperclipBtn.contains(event.target)) {
        uploadSection.classList.remove('active');
        paperclipBtn.classList.remove('active');
    }
});

function startConsultation() {
    const userQuery = document.getElementById('user-query')?.value?.trim() || '';
    
    if (!userQuery) {
        console.warn('[Orchestrator] No query provided');
        alert('Please describe what you want to build');
        return;
    }
    
    // Check if PRD Genius is available and use it instead of WebSocket consultation
    if (window.prdGenius) {
        console.log('[Orchestrator] Launching PRD Genius with query:', userQuery);
        
        // Pre-fill the project description
        window.prdGenius.wizardResponses['project-description'] = userQuery;
        
        // Reset to start
        window.prdGenius.currentStep = 0;
        window.prdGenius.comprehensiveMode = false;
        window.prdGenius.showingChoiceScreen = false;
        
        // Show PRD Genius modal
        window.prdGenius.show();
        
        // Hide the setup screen to show PRD Genius took over
        const setupScreen = document.getElementById('setup-screen');
        if (setupScreen) {
            setupScreen.style.display = 'none';
        }
        
        return; // Exit here - PRD Genius handles the rest
    }
    
    // Fallback to original WebSocket consultation if PRD Genius not available
    if (!app || !app.socket) {
        console.warn('[Orchestrator] Socket not connected and PRD Genius not available');
        alert('PRD Genius is not available and WebSocket connection failed. Please refresh the page.');
        return;
    }
    
    // console.log('[Orchestrator] Starting conversation:', userQuery);
    app.isLoading = true;
    
    // Start the countdown timer! ⏱️
    consultationTimer.start();
    
    // Show animated loading phase
    showLoadingPhase();
    
    // Update button state
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.innerHTML = `
            <div class="loading-spinner"></div>
            Initializing...
        `;
        startBtn.disabled = true;
    }
    
    // Add initial system message
    app.addMessage({
        id: `start-${Date.now()}`,
        agent: 'System',
        message: 'Initializing AI Mastermind consultation...',
        timestamp: Date.now(),
        type: 'system'
    });
    
    // Prepare file data for sending
    const fileData = app.uploadedFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
        // Note: Actual file content would need to be read and sent separately
    }));
    
    // Emit conversation start
    app.socket.emit('conversation:start', {
        query: userQuery,
        files: fileData,
        options: {
            minAgents: 3,
            includeQuestions: true,
            maxDiscussionRounds: 3
        }
    });
}

function sendUserMessage() {
    const userInput = app.getUserInput();
    
    if (!userInput || !app.socket || !app.session?.sessionId) {
        return;
    }
    
    // REMOVED: // REMOVED: console.log('[Orchestrator] Sending user message:', userInput);
    
    // Add user message to display
    app.addMessage({
        id: `user-${Date.now()}`,
        agent: 'You',
        message: userInput,
        timestamp: Date.now(),
        type: 'user'
    });
    
    // Send to server
    app.socket.emit('conversation:user-message', {
        sessionId: app.session.sessionId,
        message: userInput,
        sender: 'user',
        timestamp: Date.now()
    });
    
    // Clear input
    document.getElementById('user-input').value = '';
}

function generateClaudeCodePrompt() {
    const btn = event.target.closest('button');
    
    if (!app.socket || !app.session?.sessionId) {
        logger?.warn('[Orchestrator] No socket connection or session');
        return;
    }
    
    // Add button animation
    if (btn) {
        btn.classList.add('btn-animated', 'processing');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<span class="btn-text">✨ Generating... <span class="spinner"></span></span>';
        
        // Reset button after a delay
        setTimeout(() => {
            btn.classList.remove('processing');
            btn.innerHTML = '<span class="btn-text">✅ Generated!</span>';
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.classList.remove('btn-animated');
            }, 2000);
        }, 3000);
    }
    
    if (!app.session?.synthesisComplete) {
        logger?.warn('[Orchestrator] Synthesis not complete yet');
        
        // Show user-friendly message
        app.addMessage({
            id: `claude-code-error-${Date.now()}`,
            agent: 'System',
            message: 'Claude Code prompt not ready yet. Please wait for the expert consultation to complete.',
            timestamp: Date.now(),
            type: 'system'
        });
        return;
    }
    
    // REMOVED: // REMOVED: console.log('[Orchestrator] Generating Claude Code prompt');
    //     app.socket.emit('conversation:generate-claude-code', {
    //         sessionId: app.session.sessionId
    //     });
}

function exportPlan() {
    const btn = event.target.closest('button');
    
    if (!app.session) {
        logger?.warn('[Orchestrator] No session available for export');
        
        // Show user-friendly message
        app.addMessage({
            id: `export-error-${Date.now()}`,
            agent: 'System',
            message: 'Export not available. Please start a consultation first.',
            timestamp: Date.now(),
            type: 'system'
        });
        return;
    }
    
    // Launch confetti celebration! 🎉
    launchConfetti();
    
    // Add button animation
    if (btn) {
        btn.classList.add('btn-animated', 'processing');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<span class="btn-text">📄 Creating PRD... <span class="spinner"></span></span>';
        
        // Complete animation after processing
        setTimeout(() => {
            btn.classList.remove('processing');
            btn.innerHTML = '<span class="btn-text">✅ PRD Exported!</span>';
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.classList.remove('btn-animated');
            }, 2000);
        }, 1500);
    }
    
    // Generate a structured PRD document
    let prdContent = `# Product Requirements Document (PRD)\n\n`;
    prdContent += `**Generated:** ${new Date().toLocaleString()}\n`;
    prdContent += `**Session ID:** ${app.session.sessionId}\n\n`;
    
    prdContent += `## Executive Summary\n\n`;
    prdContent += `### Project Overview\n`;
    prdContent += `${app.session.query || 'No project description provided'}\n\n`;
    
    // Add expert team section
    if (app.session.agents && app.session.agents.length > 0) {
        prdContent += `## Expert Team Assembled\n\n`;
        app.session.agents.forEach(agent => {
            prdContent += `- **${agent.name || agent}**: ${agent.role || 'Technical Expert'}\n`;
        });
        prdContent += `\n`;
    }
    
    // Add key recommendations from the conversation
    prdContent += `## Key Recommendations\n\n`;
    
    // Extract recommendations from expert messages
    const expertMessages = app.messages.filter(m => m.type === 'agent');
    const expertTypes = new Set();
    
    expertMessages.forEach(message => {
        if (!expertTypes.has(message.agent)) {
            expertTypes.add(message.agent);
            prdContent += `### ${message.agent}\n`;
            prdContent += `${message.message}\n\n`;
        }
    });
    
    // Add synthesis/final plan if available
    if (app.session.synthesis || app.session.finalPlan) {
        prdContent += `## Final Implementation Plan\n\n`;
        prdContent += `${app.session.synthesis || app.session.finalPlan}\n\n`;
    }
    
    // Extract SPECIFIC technical details from expert messages
    const extractTechnicalDetails = () => {
        const techDetails = {
            frontend: [],
            backend: [],
            database: [],
            infrastructure: [],
            architecture: [],
            libraries: [],
            apis: []
        };
        
        app.messages.forEach(msg => {
            if (msg.type === 'agent' && msg.message) {
                const text = msg.message;
                
                // Extract frontend technologies
                const frontendMatches = text.match(/(React|Vue|Angular|Next\.js|Nuxt|SvelteKit|Tailwind|Bootstrap|Material.UI)[\s\d.]*/gi);
                if (frontendMatches) techDetails.frontend.push(...frontendMatches);
                
                // Extract backend technologies
                const backendMatches = text.match(/(Node\.js|Express|FastAPI|Django|Flask|Spring Boot|Ruby on Rails|ASP\.NET)[\s\d.]*/gi);
                if (backendMatches) techDetails.backend.push(...backendMatches);
                
                // Extract databases
                const dbMatches = text.match(/(PostgreSQL|MySQL|MongoDB|Redis|DynamoDB|Firestore|SQLite|CouchDB)[\s\d.]*/gi);
                if (dbMatches) techDetails.database.push(...dbMatches);
                
                // Extract infrastructure
                const infraMatches = text.match(/(AWS|Azure|GCP|Docker|Kubernetes|Vercel|Netlify|Heroku|DigitalOcean)/gi);
                if (infraMatches) techDetails.infrastructure.push(...infraMatches);
                
                // Extract architecture patterns
                const archMatches = text.match(/(microservices|serverless|monolithic|event-driven|RESTful|GraphQL|WebSocket|MVC|MVVM)/gi);
                if (archMatches) techDetails.architecture.push(...archMatches);
                
                // Extract specific libraries
                const libMatches = text.match(/(Prisma|Sequelize|TypeORM|Mongoose|Passport|JWT|Socket\.io|Redux|Zustand|React Query)[\s\d.]*/gi);
                if (libMatches) techDetails.libraries.push(...libMatches);
            }
        });
        
        // Remove duplicates
        Object.keys(techDetails).forEach(key => {
            techDetails[key] = [...new Set(techDetails[key])];
        });
        
        return techDetails;
    };
    
    const techDetails = extractTechnicalDetails();
    
    // Add technical specifications section with ACTUAL recommendations
    prdContent += `## Technical Specifications\n\n`;
    
    if (techDetails.architecture.length > 0) {
        prdContent += `### Architecture\n`;
        techDetails.architecture.forEach(arch => {
            prdContent += `- ${arch}\n`;
        });
        prdContent += `\n`;
    }
    
    prdContent += `### Technology Stack\n`;
    
    if (techDetails.frontend.length > 0) {
        prdContent += `- **Frontend**: ${techDetails.frontend.join(', ')}\n`;
    } else {
        prdContent += `- **Frontend**: To be determined based on requirements\n`;
    }
    
    if (techDetails.backend.length > 0) {
        prdContent += `- **Backend**: ${techDetails.backend.join(', ')}\n`;
    } else {
        prdContent += `- **Backend**: To be determined based on scalability needs\n`;
    }
    
    if (techDetails.database.length > 0) {
        prdContent += `- **Database**: ${techDetails.database.join(', ')}\n`;
    } else {
        prdContent += `- **Database**: To be determined based on data structure\n`;
    }
    
    if (techDetails.infrastructure.length > 0) {
        prdContent += `- **Infrastructure**: ${techDetails.infrastructure.join(', ')}\n`;
    }
    
    if (techDetails.libraries.length > 0) {
        prdContent += `- **Key Libraries**: ${techDetails.libraries.join(', ')}\n`;
    }
    
    prdContent += `\n`;
    
    // Add more specific timeline based on complexity
    prdContent += `## Timeline & Milestones\n\n`;
    prdContent += `- **Week 1-2**: Environment setup with ${techDetails.frontend[0] || 'chosen frontend'} and ${techDetails.backend[0] || 'backend framework'}\n`;
    prdContent += `- **Week 3-4**: Core feature development and ${techDetails.database[0] || 'database'} integration\n`;
    prdContent += `- **Week 5-6**: API development and testing\n`;
    prdContent += `- **Week 7-8**: Deployment on ${techDetails.infrastructure[0] || 'cloud platform'} and optimization\n\n`;
    
    // Add next steps
    prdContent += `## Next Steps\n\n`;
    prdContent += `1. Review expert recommendations with stakeholders\n`;
    prdContent += `2. Finalize technology choices\n`;
    prdContent += `3. Create detailed technical design documents\n`;
    prdContent += `4. Begin implementation phase\n`;
    
    // Create and download the PRD as markdown
    const blob = new Blob([prdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PRD-${app.session.sessionId}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show success message
    app.addMessage({
        id: `export-success-${Date.now()}`,
        agent: 'System',
        message: '✅ PRD exported successfully! Check your downloads folder.',
        timestamp: Date.now(),
        type: 'system'
    });
}

function startNewConsultation() {
    // Reset application state
    app.session = null;
    app.messages = [];
    app.isLoading = false;
    app.uploadedFiles = [];
    
    // Reset timer
    consultationTimer.reset();
    
    // Reset UI
    document.getElementById('setup-screen').style.display = 'flex';
    document.getElementById('conversation-screen').style.display = 'none';
    document.getElementById('session-status').style.display = 'none';
    document.getElementById('completion-actions').style.display = 'none';
    document.getElementById('interaction-area').style.display = 'none';
    
    // Clear inputs
    document.getElementById('user-query').value = '';
    document.getElementById('user-input').value = '';
    
    // Reset button
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.5 16.5c-1.5 1.5-1.5 4.5 0 6s4.5 1.5 6 0l6-6c1.5-1.5 1.5-4.5 0-6s-4.5-1.5-6 0l-6 6z"></path>
                <path d="M13.5 10.5L10.5 7.5"></path>
            </svg>
            Start Expert Consultation
        `;
        startBtn.disabled = false;
    }
    
    // Clear messages container
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }
    
    // Clear uploaded files display
    const uploadedFilesContainer = document.getElementById('uploaded-files');
    if (uploadedFilesContainer) {
        uploadedFilesContainer.innerHTML = '';
    }
}

// ===== CONFETTI CELEBRATION ANIMATION =====

function launchConfetti() {
    // Create confetti container
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.body.appendChild(confettiContainer);
    
    // Confetti colors matching the orchestrator theme
    const colors = [
        '#8b5cf6', // Purple (primary accent)
        '#06b6d4', // Cyan (secondary accent)
        '#f97316', // Orange (tertiary accent)
        '#ec4899', // Pink
        '#10b981', // Green
        '#3b82f6', // Blue
        '#f59e0b', // Yellow
        '#ef4444'  // Red
    ];
    
    // Create confetti particles
    const particleCount = 100;
    
    for (let i = 0; i < particleCount; i++) {
        createConfettiParticle(confettiContainer, colors);
    }
    
    // Remove confetti after animation completes
    setTimeout(() => {
        confettiContainer.style.opacity = '0';
        confettiContainer.style.transition = 'opacity 1s ease-out';
        
        setTimeout(() => {
            confettiContainer.remove();
        }, 1000);
    }, 3500); // Show for 3.5 seconds, then fade out over 1 second
}

function createConfettiParticle(container, colors) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    
    // Random properties
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 5; // 5-15px
    const left = Math.random() * 100; // Random horizontal position
    const animationDuration = Math.random() * 2 + 2; // 2-4 seconds
    const rotationSpeed = Math.random() * 360; // Random rotation
    const delay = Math.random() * 0.5; // Stagger the start
    
    // Randomly choose between rectangle and circle
    const isCircle = Math.random() > 0.5;
    
    particle.style.cssText = `
        left: ${left}%;
        width: ${isCircle ? size : size * 0.6}px;
        height: ${size}px;
        background: ${color};
        animation-duration: ${animationDuration}s;
        animation-delay: ${delay}s;
        --rotation-speed: ${rotationSpeed}deg;
        border-radius: ${isCircle ? '50%' : '0'};
    `;
    
    container.appendChild(particle);
}

// ===== CONSULTATION COUNTDOWN TIMER =====

class ConsultationTimer {
    constructor() {
        this.totalTime = 180; // 3 minutes in seconds
        this.remainingTime = this.totalTime;
        this.isRunning = false;
        this.interval = null;
        this.isCompleted = false;
        this.isOvertime = false;
        this.phases = [
            { name: 'Getting Started', threshold: 180 },
            { name: 'Assembling Experts', threshold: 150 },
            { name: 'Expert Discussion', threshold: 90 },
            { name: 'Creating Synthesis', threshold: 30 },
            { name: 'Finalizing', threshold: 10 }
        ];
        
        this.timerElement = document.getElementById('consultation-timer');
        this.displayElement = document.getElementById('timer-display');
        this.phaseElement = document.getElementById('timer-phase');
        this.progressRing = document.querySelector('.timer-progress-ring');
    }
    
    start() {
        if (this.isRunning) return;
        
        // REMOVED: // REMOVED: console.log('[Timer] Starting 3-minute consultation countdown');
        this.isRunning = true;
        this.showTimer();
        this.updateDisplay();
        
        this.interval = setInterval(() => {
            this.tick();
        }, 1000);
    }
    
    tick() {
        if (this.isCompleted) return;
        
        this.remainingTime--;
        this.updateDisplay();
        this.updateProgress();
        this.updatePhase();
        this.updateColors();
        
        // Handle overtime
        if (this.remainingTime <= 0 && !this.isOvertime) {
            this.handleOvertime();
        }
    }
    
    updateDisplay() {
        const minutes = Math.floor(Math.abs(this.remainingTime) / 60);
        const seconds = Math.abs(this.remainingTime) % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (this.displayElement) {
            this.displayElement.textContent = this.remainingTime < 0 ? `+${timeString}` : timeString;
        }
    }
    
    updateProgress() {
        if (!this.progressRing) return;
        
        const circumference = 2 * Math.PI * 30; // radius = 30
        let progress;
        
        if (this.isOvertime) {
            // Show spinning animation for overtime
            return;
        } else {
            progress = (this.totalTime - this.remainingTime) / this.totalTime;
        }
        
        const offset = circumference * (1 - progress);
        this.progressRing.style.strokeDashoffset = offset;
    }
    
    updatePhase() {
        if (!this.phaseElement) return;
        
        let currentPhase = this.phases.find(phase => this.remainingTime > phase.threshold);
        if (!currentPhase) {
            currentPhase = this.phases[this.phases.length - 1];
        }
        
        if (this.isOvertime) {
            this.phaseElement.textContent = 'Almost There...';
        } else {
            this.phaseElement.textContent = currentPhase.name;
        }
    }
    
    updateColors() {
        if (!this.progressRing) return;
        
        // Remove existing color classes
        this.progressRing.classList.remove('warning', 'urgent');
        
        if (this.isOvertime) {
            this.timerElement.classList.add('overtime');
        } else if (this.remainingTime <= 30) {
            this.progressRing.classList.add('urgent');
        } else if (this.remainingTime <= 60) {
            this.progressRing.classList.add('warning');
        }
    }
    
    handleOvertime() {
        // REMOVED: // REMOVED: console.log('[Timer] Consultation going into overtime');
        this.isOvertime = true;
        this.timerElement.classList.add('overtime');
        this.phaseElement.textContent = 'Almost There...';
    }
    
    complete() {
        if (this.isCompleted) return;
        
        // REMOVED: // REMOVED: console.log('[Timer] Consultation completed!');
        this.isCompleted = true;
        this.isRunning = false;
        
        // Jump to completion immediately
        this.remainingTime = 0;
        this.updateDisplay();
        
        // Show completion animation
        this.timerElement.classList.add('completed');
        this.progressRing.style.strokeDashoffset = 0;
        this.phaseElement.textContent = 'Complete!';
        
        // Clean up
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        // Hide timer after a delay
        setTimeout(() => {
            this.hideTimer();
        }, 3000);
    }
    
    showTimer() {
        if (this.timerElement) {
            this.timerElement.style.display = 'flex';
            setTimeout(() => {
                this.timerElement.style.opacity = '1';
            }, 100);
        }
    }
    
    hideTimer() {
        if (this.timerElement) {
            this.timerElement.style.opacity = '0';
            setTimeout(() => {
                this.timerElement.style.display = 'none';
                this.reset();
            }, 300);
        }
    }
    
    reset() {
        this.remainingTime = this.totalTime;
        this.isRunning = false;
        this.isCompleted = false;
        this.isOvertime = false;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        // Reset classes
        if (this.timerElement) {
            this.timerElement.classList.remove('completed', 'overtime');
        }
        if (this.progressRing) {
            this.progressRing.classList.remove('warning', 'urgent');
        }
    }
    
    // Manual phase updates from consultation flow
    updatePhaseManually(phase) {
        if (this.phaseElement && !this.isOvertime) {
            this.phaseElement.textContent = phase;
        }
    }
}

// Create global timer instance
const consultationTimer = new ConsultationTimer();

// ===== THEME SWITCHING FUNCTIONALITY =====

// Initialize theme from localStorage
function initializeTheme() {
    const savedTheme = localStorage.getItem('orchestrator-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'light' || (savedTheme === null && !prefersDark)) {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

// Toggle theme function (called by the theme toggle button)
function toggleTheme() {
    const isLightTheme = document.body.classList.contains('light-theme');
    
    if (isLightTheme) {
        // Switch to dark theme
        document.body.classList.remove('light-theme');
        localStorage.setItem('orchestrator-theme', 'dark');
        // REMOVED: // REMOVED: console.log('[Theme] Switched to dark theme');
    } else {
        // Switch to light theme
        document.body.classList.add('light-theme');
        localStorage.setItem('orchestrator-theme', 'light');
        // REMOVED: // REMOVED: console.log('[Theme] Switched to light theme');
    }
}

// Listen for system theme changes
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Only auto-switch if user hasn't manually set a preference
        const savedTheme = localStorage.getItem('orchestrator-theme');
        if (savedTheme === null) {
            if (e.matches) {
                document.body.classList.remove('light-theme');
            } else {
                document.body.classList.add('light-theme');
            }
            // REMOVED: console.log('[Theme] Auto-switched based on system preference');
        }
    });
}

// Initialize theme on page load
// document.addEventListener('DOMContentLoaded', () => {
//     initializeTheme();
//     console.log('[Theme] Theme initialized');
// });

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    // Load Socket.IO
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = () => {
        // REMOVED: // REMOVED: console.log('[Orchestrator] Socket.IO loaded, initializing app');
        app = new OrchestratorApp();
    };
    script.onerror = () => {
        logger?.error('[Orchestrator] Failed to load Socket.IO');
        // Initialize app anyway for UI functionality (without real-time features)
        // REMOVED: // REMOVED: console.log('[Orchestrator] Initializing app without Socket.IO');
        app = new OrchestratorApp();
    };
    document.head.appendChild(script);
});

// ===== TIMELINE ANIMATION CONTROLLER =====

class TimelineAnimationController {
    constructor() {
        this.steps = [];
        this.connectors = [];
        this.currentStep = -1;
        this.isPlaying = false;
        this.isPaused = false;
        this.animationTimeout = null;
        this.observer = null;
        this.hasStarted = false;
        
        this.stepNames = [
            'Discovery',
            'Team Assembly', 
            'Collaboration',
            'Individual Planning',
            'Plan Synthesis'
        ];
        
        this.stepDescriptions = [
            'Orchestrator analyzes your requirements',
            'Assembles 3+ expert AI agents',
            'Experts discuss and ask questions',
            'Each expert creates individual plans',
            'Best ideas combined into final plan'
        ];
        
        this.init();
    }
    
    init() {
        this.setupElements();
        this.setupControls();
        this.setupIntersectionObserver();
        this.setupClickNavigation();
        this.checkReducedMotion();
        this.initializeState();
    }
    
    setupElements() {
        // Get all step cards
        this.steps = Array.from(document.querySelectorAll('.step-card')).sort((a, b) => {
            const aStep = parseInt(a.id.replace('step-', ''));
            const bStep = parseInt(b.id.replace('step-', ''));
            return aStep - bStep;
        });
        
        // Get all flow connectors
        this.connectors = Array.from(document.querySelectorAll('.flow-connector'));
    }
    
    setupControls() {
        const playBtn = document.getElementById('play-animation');
        const pauseBtn = document.getElementById('pause-animation');
        const replayBtn = document.getElementById('replay-animation');
        
        if (playBtn) {
            playBtn.addEventListener('click', () => this.play());
        }
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pause());
        }
        if (replayBtn) {
            replayBtn.addEventListener('click', () => this.replay());
        }
    }
    
    setupClickNavigation() {
        // Allow clicking on step cards to jump to that step
        this.steps.forEach((step, index) => {
            step.addEventListener('click', () => {
                if (!this.isPlaying) {
                    this.jumpToStep(index);
                    // Labels are now always visible, no need to show/hide
                }
            });
        });
    }
    
    showStepLabel(stepIndex) {
        // Labels are now always visible, this method is kept for compatibility
        // but doesn't need to do anything
    }
    
    setupIntersectionObserver() {
        const timelineSection = document.querySelector('.process-flow-timeline');
        if (!timelineSection) return;
        
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.hasStarted) {
                        // Auto-start animation when timeline becomes visible
                        setTimeout(() => {
                            if (!this.hasStarted) {
                                this.play();
                            }
                        }, 500);
                    }
                });
            },
            { threshold: 0.3 }
        );
        
        this.observer.observe(timelineSection);
    }
    
    initializeState() {
        // Initialize with first step ready to animate
        this.reset();
    }
    
    checkReducedMotion() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            // Show all steps as active for accessibility
            this.steps.forEach((step, index) => {
                step.classList.add('step-completed');
                this.activateConnector(index);
            });
            this.updateStatus(4, true); // Show final step
            this.updateProgressBar(100);
            return;
        }
    }
    
    play() {
        if (this.isPlaying && !this.isPaused) return;
        
        this.hasStarted = true;
        this.isPlaying = true;
        this.isPaused = false;
        
        this.updateControlButtons();
        
        if (this.currentStep === -1) {
            // Start from beginning
            this.currentStep = 0;
            this.animateStep(0);
        } else if (this.isPaused) {
            // Resume from current position
            this.animateStep(this.currentStep + 1);
        }
    }
    
    pause() {
        if (!this.isPlaying) return;
        
        this.isPaused = true;
        this.isPlaying = false;
        
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
        
        this.updateControlButtons();
    }
    
    replay() {
        this.reset();
        setTimeout(() => this.play(), 100);
    }
    
    reset() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentStep = -1;
        this.hasStarted = false;
        
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
        
        // Reset all step cards
        this.steps.forEach(step => {
            step.classList.remove('step-active', 'step-completed');
        });
        
        // Reset all connectors
        this.connectors.forEach(connector => {
            connector.classList.remove('connector-active');
        });
        
        // Reset progress and status
        this.updateStatus(0);
        this.updateProgressBar(0);
        this.updateControlButtons();
    }
    
    jumpToStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;
        
        // Mark all previous steps as completed
        for (let i = 0; i <= stepIndex; i++) {
            this.steps[i].classList.remove('step-active');
            this.steps[i].classList.add('step-completed');
            
            if (i < this.connectors.length) {
                this.activateConnector(i);
            }
        }
        
        // Mark future steps as inactive
        for (let i = stepIndex + 1; i < this.steps.length; i++) {
            this.steps[i].classList.remove('step-active', 'step-completed');
        }
        
        this.currentStep = stepIndex;
        this.updateStatus(stepIndex);
        this.updateProgressBar(((stepIndex + 1) / this.steps.length) * 100);
    }
    
    animateStep(stepIndex) {
        if (stepIndex >= this.steps.length || this.isPaused) {
            if (stepIndex >= this.steps.length) {
                // Animation complete
                this.isPlaying = false;
                this.updateControlButtons();
            }
            return;
        }
        
        const step = this.steps[stepIndex];
        this.currentStep = stepIndex;
        
        // Remove active from previous step
        if (stepIndex > 0) {
            this.steps[stepIndex - 1].classList.remove('step-active');
            this.steps[stepIndex - 1].classList.add('step-completed');
            // Hide previous step label
            const prevLabel = document.getElementById(`label-${stepIndex}`);
            if (prevLabel) prevLabel.classList.remove('visible');
        }
        
        // Activate current step
        step.classList.add('step-active');
        
        // Labels are always visible now, no need to show them
        
        // Activate connector to this step
        if (stepIndex > 0) {
            this.activateConnector(stepIndex - 1);
        }
        
        // Update status and progress
        this.updateStatus(stepIndex);
        this.updateProgressBar(((stepIndex + 1) / this.steps.length) * 100);
        
        // Schedule next step
        this.animationTimeout = setTimeout(() => {
            this.animateStep(stepIndex + 1);
        }, 1500); // 1.5s delay between steps for better visibility with labels
    }
    
    activateConnector(connectorIndex) {
        const connector = this.connectors.find(c => 
            c.dataset.connector === `${connectorIndex + 1}-${connectorIndex + 2}`
        );
        if (connector) {
            connector.classList.add('connector-active');
        }
    }
    
    updateStatus(stepIndex, isComplete = false) {
        const stepNameEl = document.getElementById('current-step-name');
        const stepDescEl = document.getElementById('current-step-desc');
        const stepNumberEl = document.getElementById('current-step-number');
        
        if (stepNameEl && stepIndex < this.stepNames.length) {
            stepNameEl.textContent = this.stepNames[stepIndex];
        }
        if (stepDescEl && stepIndex < this.stepDescriptions.length) {
            stepDescEl.textContent = this.stepDescriptions[stepIndex];
        }
        if (stepNumberEl) {
            stepNumberEl.textContent = stepIndex + 1;
        }
    }
    
    updateProgressBar(percentage) {
        const progressBar = document.getElementById('timeline-progress');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }
    
    updateControlButtons() {
        const playBtn = document.getElementById('play-animation');
        const pauseBtn = document.getElementById('pause-animation');
        const replayBtn = document.getElementById('replay-animation');
        
        if (playBtn) {
            playBtn.style.display = this.isPlaying ? 'none' : 'inline-flex';
        }
        if (pauseBtn) {
            pauseBtn.style.display = this.isPlaying ? 'inline-flex' : 'none';
        }
        if (replayBtn) {
            replayBtn.disabled = !this.hasStarted;
        }
    }
    
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
        }
    }
}

// Initialize timeline animation controller when DOM is ready
let timelineAnimationController = null;

document.addEventListener('DOMContentLoaded', () => {
    timelineAnimationController = new TimelineAnimationController();
});

// Cleanup streaming resources when page unloads
window.addEventListener('beforeunload', () => {
    if (app && typeof app.cleanupStreamingResources === 'function') {
        app.cleanupStreamingResources();
        // REMOVED: // REMOVED: console.log('[Orchestrator] Streaming resources cleaned up');
    }
    
    if (timelineAnimationController) {
        timelineAnimationController.destroy();
    }
});

// Handle visibility changes to pause/resume streaming
document.addEventListener('visibilitychange', () => {
    if (app && app.socket) {
        if (document.hidden) {
            // Page is hidden, pause streaming updates
            app.socket.emit('conversation:pause-streaming', {
                sessionId: app.session?.sessionId,
                reason: 'page_hidden'
            });
        } else {
            // Page is visible again, resume streaming
            app.socket.emit('conversation:resume-streaming', {
                sessionId: app.session?.sessionId,
                reason: 'page_visible'
            });
        }
    }
});

// Expose functions globally for HTML onclick handlers
window.startConsultation = startConsultation;
window.sendUserMessage = sendUserMessage;
window.toggleVoiceInput = toggleVoiceInput;
window.toggleUploadArea = toggleUploadArea;
window.toggleTheme = toggleTheme;
window.showLoadingPhase = showLoadingPhase;