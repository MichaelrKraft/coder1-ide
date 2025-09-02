// Coder1 Frontend JavaScript
class Coder1Interface {
    constructor() {
        // Helper function to safely get elements
        const safeGetElement = (id) => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`Element with id '${id}' not found`);
            }
            return element;
        };
        
        this.chatMessages = safeGetElement('chatMessages');
        this.messageInput = safeGetElement('messageInput');
        this.sendButton = safeGetElement('sendMessage');
        this.clearButton = safeGetElement('clearChat');
        this.exportButton = safeGetElement('exportChat');
        
        // Execution log elements
        this.executionLog = safeGetElement('executionLog');
        this.clearLogButton = safeGetElement('clearLog');
        this.exportLogButton = safeGetElement('exportLog');
        this.toggleAutoScrollButton = safeGetElement('toggleAutoScroll');
        this.autoScrollEnabled = true;
        
        // Theme toggle
        this.themeToggle = safeGetElement('themeToggle');
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        
        // Website selector
        this.websiteInput = safeGetElement('websiteInput');
        this.setWebsiteBtn = safeGetElement('setWebsite');
        this.currentWebsite = localStorage.getItem('currentWebsite') || 'autonomous_vibe_interface';
        
        // Mode selector
        this.modeBtns = document.querySelectorAll('.mode-btn');
        this.modeText = safeGetElement('modeText');
        this.modeInfo = safeGetElement('modeInfo');
        this.currentMode = localStorage.getItem('currentMode') || 'chat';
        
        // Upload interface elements
        this.attachBtn = document.getElementById('attachBtn');
        this.uploadPanel = document.getElementById('uploadPanel');
        this.uploadTabs = document.querySelectorAll('.upload-tab');
        this.uploadTabContents = document.querySelectorAll('.upload-tab-content');
        this.fileInput = document.getElementById('fileInput');
        this.imageInput = document.getElementById('imageInput');
        this.fileDropZone = document.getElementById('fileDropZone');
        this.imageDropZone = document.getElementById('imageDropZone');
        this.urlInput = document.getElementById('urlInput');
        this.fetchUrlBtn = document.getElementById('fetchUrlBtn');
        this.urlPreview = document.getElementById('urlPreview');
        this.clearUploadsBtn = document.getElementById('clearUploads');
        this.closeUploadBtn = document.getElementById('closeUpload');
        this.contextDisplay = document.getElementById('contextDisplay');
        this.contextItems = document.getElementById('contextItems');
        this.contextToggle = document.getElementById('contextToggle');
        
        // Context storage
        this.uploadedContext = [];
        this.contextCollapsed = false;
        
        
        // Enhanced error recovery system
        this.errorRecoveryEnabled = true;
        this.lastErrorTime = null;
        this.errorCount = 0;
        this.maxErrorsBeforeAlert = 3;
        this.rateLimitDetected = false;
        this.circuitBreakerState = 'CLOSED';
        
        
        // Terminal monitor elements
        this.terminalCard = document.getElementById('terminalMonitorCard');
        this.terminalOutput = document.getElementById('terminalOutput');
        this.terminalStatusIndicator = document.getElementById('terminalStatusIndicator');
        this.terminalStatusText = document.getElementById('terminalStatusText');
        this.toggleTerminalBtn = document.getElementById('toggleTerminalBtn');
        this.clearTerminalBtn = document.getElementById('clearTerminalBtn');
        this.terminalVisible = true;
        
        // Session dashboard elements
        this.dashboardCard = document.getElementById('sessionDashboardCard');
        this.activeSessionsCount = document.getElementById('activeSessionsCount');
        this.totalCostDisplay = document.getElementById('totalCostDisplay');
        this.sessionList = document.getElementById('sessionList');
        this.refreshSessionsBtn = document.getElementById('refreshSessionsBtn');
        this.newSessionBtn = document.getElementById('newSessionBtn');
        this.activeSessions = new Map();
        
        // Main display elements (for requirements, tasks, etc.)
        this.mainDisplaySection = document.getElementById('mainDisplaySection');
        this.mainDisplayTitle = document.getElementById('mainDisplayTitle');
        this.mainDisplayContent = document.getElementById('mainDisplayContent');
        this.closeMainDisplayBtn = document.getElementById('closeMainDisplay');
        
        try { this.initializeEventListeners(); } catch(e) { console.error('initializeEventListeners failed:', e); }
        try { this.autoResizeTextarea(); } catch(e) { console.error('autoResizeTextarea failed:', e); }
        try { this.initializeExecutionLog(); } catch(e) { console.error('initializeExecutionLog failed:', e); }
        try { this.initializeTheme(); } catch(e) { console.error('initializeTheme failed:', e); }
        try { this.initializeSpotlightEffect(); } catch(e) { console.error('initializeSpotlightEffect failed:', e); }
        try { this.initializeWebsiteSelector(); } catch(e) { console.error('initializeWebsiteSelector failed:', e); }
        try { this.initializeUploadInterface(); } catch(e) { console.error('initializeUploadInterface failed:', e); }
        try { this.initializeSessionControls(); } catch(e) { console.error('initializeSessionControls failed:', e); }
        try { this.initializeTerminalMonitor(); } catch(e) { console.error('initializeTerminalMonitor failed:', e); }
        try { this.initializeSessionDashboard(); } catch(e) { console.error('initializeSessionDashboard failed:', e); }
        this.updateTaskCounters().catch(err => console.error('Error initializing task counters:', err)); // Initialize task counters on load
    }

    initializeEventListeners() {
        // Helper function to safely add event listeners
        const safeAddEventListener = (element, event, handler) => {
            if (element) {
                element.addEventListener(event, handler);
            }
        };
        
        // Send message
        safeAddEventListener(this.sendButton, 'click', () => this.sendMessage());
        safeAddEventListener(this.messageInput, 'keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Clear chat
        safeAddEventListener(this.clearButton, 'click', () => this.clearChat());

        // Export chat
        safeAddEventListener(this.exportButton, 'click', () => this.exportChat());

        // Execution log controls
        safeAddEventListener(this.clearLogButton, 'click', () => this.clearExecutionLog());
        safeAddEventListener(this.exportLogButton, 'click', () => this.exportExecutionLog());
        safeAddEventListener(this.toggleAutoScrollButton, 'click', () => this.toggleAutoScroll());

        // Theme toggle
        safeAddEventListener(this.themeToggle, 'click', () => this.toggleTheme());

        // Website selector
        safeAddEventListener(this.setWebsiteBtn, 'click', () => this.setWebsite());
        safeAddEventListener(this.websiteInput, 'keypress', (e) => {
            if (e.key === 'Enter') {
                this.setWebsite();
            }
        });

        // Mode selector
        this.modeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.closest('.mode-btn').dataset.mode));
        });

        // Quick action buttons
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuickAction(e));
        });

        // File items
        document.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleFileClick(e));
        });

        // Status items
        document.querySelectorAll('.status-item.clickable').forEach(item => {
            item.addEventListener('click', (e) => this.handleStatusClick(e));
        });

        // Upload interface
        this.attachBtn.addEventListener('click', () => this.toggleUploadPanel());
        this.closeUploadBtn.addEventListener('click', () => this.hideUploadPanel());
        this.clearUploadsBtn.addEventListener('click', () => this.clearAllContext());
        this.contextToggle.addEventListener('click', () => this.toggleContextDisplay());
        
        // Upload tabs
        this.uploadTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchUploadTab(e.target.dataset.tab));
        });
        
        // File inputs
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'document'));
        this.imageInput.addEventListener('change', (e) => this.handleFileSelect(e, 'image'));
        
        // Drop zones
        this.setupDropZone(this.fileDropZone, this.fileInput, 'document');
        this.setupDropZone(this.imageDropZone, this.imageInput, 'image');
        
        // URL fetching
        this.fetchUrlBtn.addEventListener('click', () => this.fetchUrlContent());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.fetchUrlContent();
            }
        });

        // Main display
        this.closeMainDisplayBtn.addEventListener('click', () => this.hideMainDisplay());
        
        // Collapsible dropdowns
        const projectStatusHeader = document.getElementById('projectStatusHeader');
        const quickActionsHeader = document.getElementById('quickActionsHeader');
        const recentFilesHeader = document.getElementById('recentFilesHeader');
        const executionLogHeader = document.getElementById('executionLogHeader');
        
        if (projectStatusHeader) {
            projectStatusHeader.addEventListener('click', () => this.toggleDropdown('projectStatus'));
        }
        if (quickActionsHeader) {
            quickActionsHeader.addEventListener('click', () => this.toggleDropdown('quickActions'));
        }
        if (recentFilesHeader) {
            recentFilesHeader.addEventListener('click', () => this.toggleDropdown('recentFiles'));
        }
        if (executionLogHeader) {
            executionLogHeader.addEventListener('click', () => this.toggleDropdown('executionLog'));
        }
    }

    autoResizeTextarea() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });
    }

    initializeMode() {
        this.switchMode(this.currentMode);
    }

    switchMode(mode) {
        this.currentMode = mode;
        localStorage.setItem('currentMode', mode);
        
        // Update UI
        this.modeBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            }
        });
        
        // Update mode indicator
        const modeConfig = this.getModeConfig(mode);
        this.modeText.textContent = modeConfig.text;
        this.modeInfo.title = modeConfig.tooltip;
        this.messageInput.placeholder = modeConfig.placeholder;
        
        this.logExecution('info', `Switched to ${mode} mode`);
    }

    getModeConfig(mode) {
        const configs = {
            chat: {
                text: 'Chat Mode',
                tooltip: 'Ask questions and get explanations',
                placeholder: 'Ask a question or request help...'
            },
            task: {
                text: 'Task Mode',
                tooltip: 'Request code changes and implementations',
                placeholder: 'Describe what you want me to implement...'
            },
            build: {
                text: 'Build Mode',
                tooltip: 'Build complete websites and applications',
                placeholder: 'Describe the website or app you want to build...'
            },
        };
        return configs[mode] || configs.chat;
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Debug logging
        console.log(`[SendMessage] Current mode: ${this.currentMode}`);
        console.log(`[SendMessage] Message: "${message}"`);


        // Check if this should trigger requirements questioning (auto-switch to build mode)
        if (this.shouldTriggerQuestioning(message)) {
            // Auto-switch to build mode if not already there
            if (this.currentMode !== 'build') {
                this.switchMode('build');
            }
            // Clear input and add user message
            this.addMessage(message, 'user');
            this.messageInput.value = '';
            this.messageInput.style.height = 'auto';
            
            await this.startQuestioningProcess(message);
            return;
        }

        // Add user message to chat
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        // Show loading
        const loadingId = this.addMessage('Processing your request...', 'assistant', true);

        try {
            // Use current mode to determine endpoint and handling
            let endpoint, requestType, requestBody;
            
            if (this.currentMode === 'chat') {
                endpoint = '/api/agent/chat';
                requestType = 'chat';
                requestBody = { message: message };
            } else if (this.currentMode === 'build') {
                endpoint = '/api/agent/tasks';
                requestType = 'website build';
                requestBody = { description: message, websiteBuild: true };
            } else {
                endpoint = '/api/agent/tasks';
                requestType = 'task';
                requestBody = { description: message };
            }
            
            this.logExecution('info', `Sending ${requestType} (${this.currentMode} mode): ${message}`);
            
            // Add context if available
            const context = this.getContextForMessage();
            if (context) {
                requestBody.context = context;
                this.logExecution('info', `Including context: ${context.summary}`);
            }
            
            // Send to appropriate endpoint
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            // Remove loading message
            this.removeMessage(loadingId);

            if (data.success) {
                const isQuestion = (this.currentMode === 'chat');
                if (isQuestion) {
                    // Handle chat response
                    const chatResponse = data.data?.response || 'I received your question.';
                    this.addMessage(chatResponse, 'assistant');
                    this.logExecution('success', 'Chat response provided');
                } else {
                    // Handle task response
                    if (data.data?.type === 'autonomous_build') {
                        // Handle autonomous website building
                        const buildMessage = `${data.data.message}\n\n🎯 Build Session ID: ${data.data.buildSessionId}\n\nI'm now coordinating between AI and browser automation to build your website. You can monitor progress in the execution log below.`;
                        this.addMessage(buildMessage, 'assistant');
                        this.logExecution('success', `Autonomous build started: ${data.data.buildSessionId}`);
                        
                        // Start monitoring the build progress
                        this.startBuildMonitoring(data.data.buildSessionId);
                        
                    } else {
                        // Handle regular task response
                        const message = data.data?.autoExecute 
                            ? `${data.data.message} 🤖 Working on it now...`
                            : data.data?.message || 'Task created successfully!';
                            
                        this.addMessage(message, 'assistant');
                        this.updateProjectStatus(data.data);
                        this.logExecution('success', `Task created and ${data.data?.autoExecute ? 'auto-executing' : 'queued'}: ${data.data?.taskId || 'N/A'}`);
                    }
                }
            } else {
                this.addMessage(`Error: ${data.error}`, 'assistant');
                this.logExecution('error', `Task creation failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Request failed:', error);
            this.removeMessage(loadingId);
            this.addMessage(`Error: ${error.message}`, 'assistant');
            this.logExecution('error', `Network error: ${error.message}`);
        }
    }

    isQuestionMessage(message) {
        // Convert to lowercase for checking
        const lowerMessage = message.toLowerCase().trim();
        
        // Question words and patterns
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'should', 'would', 'will', 'is', 'are', 'do', 'does', 'did'];
        const questionPhrases = [
            'help me understand',
            'explain',
            'tell me about',
            'what is',
            'how do',
            'can you',
            'could you',
            'would you',
            'should i',
            'do you know',
            'is there',
            'are there'
        ];
        
        // Check for question mark
        if (lowerMessage.includes('?')) {
            return true;
        }
        
        // Check for question words at the beginning
        const firstWord = lowerMessage.split(' ')[0];
        if (questionWords.includes(firstWord)) {
            return true;
        }
        
        // Check for question phrases
        for (const phrase of questionPhrases) {
            if (lowerMessage.startsWith(phrase)) {
                return true;
            }
        }
        
        // Check for task-like patterns (these should be tasks, not questions)
        const taskPatterns = [
            'create', 'make', 'build', 'implement', 'add', 'write',
            'update', 'modify', 'change', 'fix', 'debug', 'refactor',
            'install', 'setup', 'configure', 'deploy', 'test'
        ];
        
        const firstTwoWords = lowerMessage.split(' ').slice(0, 2).join(' ');
        for (const pattern of taskPatterns) {
            if (lowerMessage.startsWith(pattern) || firstTwoWords.includes(pattern)) {
                return false; // Definitely a task
            }
        }
        
        // If none of the above, default to question if it's conversational
        const conversationalPatterns = ['hi', 'hello', 'thanks', 'thank you', 'please', 'help'];
        for (const pattern of conversationalPatterns) {
            if (lowerMessage.includes(pattern)) {
                return true;
            }
        }
        
        // Default to task if unclear
        return false;
    }

    addMessage(content, sender, isLoading = false) {
        const messageId = 'msg-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.id = messageId;

        const avatarIcon = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
        const loadingClass = isLoading ? 'loading' : '';

        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="${avatarIcon}"></i>
            </div>
            <div class="message-content ${loadingClass}">
                <p>${content}</p>
            </div>
        `;

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        return messageId;
    }

    removeMessage(messageId) {
        const message = document.getElementById(messageId);
        if (message) {
            message.remove();
        }
    }

    clearChat() {
        if (confirm('Are you sure you want to clear the chat?')) {
            // Keep the welcome message
            const welcomeMessage = this.chatMessages.querySelector('.message.assistant-message');
            this.chatMessages.innerHTML = '';
            if (welcomeMessage) {
                this.chatMessages.appendChild(welcomeMessage);
            }
            this.logExecution('info', 'Chat history cleared');
        }
    }

    exportChat() {
        const messages = Array.from(this.chatMessages.querySelectorAll('.message')).map(msg => {
            const isUser = msg.classList.contains('user-message');
            const content = msg.querySelector('.message-content p').textContent;
            return `${isUser ? 'User' : 'Assistant'}: ${content}`;
        });

        const chatText = messages.join('\n\n');
        const blob = new Blob([chatText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `coder1-chat-${formatTimestamp(new Date(), 'iso').split('T')[0]}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.logExecution('info', 'Chat history exported');
    }

    handleQuickAction(e) {
        const button = e.currentTarget;
        const action = button.querySelector('span').textContent;
        
        switch (action) {
            case 'New File':
                this.messageInput.value = 'Create a new file';
                this.messageInput.focus();
                break;
            case 'Open Project':
                this.messageInput.value = 'Help me open and analyze my project';
                this.messageInput.focus();
                break;
            case 'Git Status':
                this.messageInput.value = 'Show me the git status of my project';
                this.messageInput.focus();
                break;
            case 'Terminal':
                this.messageInput.value = 'I need help with terminal commands';
                this.messageInput.focus();
                break;
            case 'Build Website':
                this.switchMode('build');
                this.messageInput.value = 'Build a website for me';
                this.sendMessage();
                break;
        }
    }

    handleFileClick(e) {
        const fileName = e.currentTarget.querySelector('span').textContent;
        this.messageInput.value = `Help me with the file: ${fileName}`;
        this.messageInput.focus();
    }

    async handleStatusClick(e) {
        const action = e.currentTarget.getAttribute('data-action');
        
        this.logExecution('info', `Status item clicked: ${action}`);
        
        switch (action) {
            case 'show-pending-tasks':
                await this.displayPendingTasks();
                break;
            case 'show-active-tasks':
                await this.displayActiveTasks();
                break;
            case 'show-completed-tasks':
                await this.displayCompletedTasks();
                break;
            case 'show-modified-files':
                await this.displayModifiedFiles();
                break;
            case 'show-build-sessions':
                await this.displayBuildSessions();
                break;
            case 'show-code-stats':
                await this.displayCodeStats();
                break;
            case 'show-help-support':
                await this.displayHelpSupport();
                break;
            default:
                this.addMessage('No data available for this status item.', 'assistant');
        }
    }

    async displayCompletedTasks() {
        // Get completed tasks from backend API
        const completedTasks = await this.getCompletedTasksFromBackend();
        
        if (completedTasks.length === 0) {
            this.projectStatusTitle.textContent = 'No Completed Tasks';
            const noTasksHtml = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i><p>No completed tasks yet.<br>Tasks will appear here when completed.</p></div>';
            this.addTaskDisplay(noTasksHtml);
            this.logExecution('info', 'No completed tasks to display');
            return;
        }
        
        // Set the title for completed tasks
        this.projectStatusTitle.textContent = `Completed Tasks (${completedTasks.length})`;
        
        const tasksHtml = this.createTasksDisplay('Completed Tasks', completedTasks);
        this.addTaskDisplay(tasksHtml);
        this.logExecution('success', `Displayed ${completedTasks.length} completed tasks`);
    }

    async displayPendingTasks() {
        // Get pending tasks from backend API
        const pendingTasks = await this.getPendingTasksFromBackend();
        
        if (pendingTasks.length === 0) {
            this.projectStatusTitle.textContent = 'No Pending Tasks';
            const noTasksHtml = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fas fa-clock" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i><p>No pending tasks.<br>Tasks waiting to be started will appear here.</p></div>';
            this.addTaskDisplay(noTasksHtml);
            this.logExecution('info', 'No pending tasks to display');
            return;
        }
        
        // Set the title for pending tasks
        this.projectStatusTitle.textContent = `Pending Tasks (${pendingTasks.length})`;
        
        const tasksHtml = this.createTasksDisplay('Pending Tasks', pendingTasks);
        this.addTaskDisplay(tasksHtml);
        this.logExecution('success', `Displayed ${pendingTasks.length} pending tasks`);
    }

    async displayActiveTasks() {
        // Get active/in-progress tasks from backend API
        const activeTasks = await this.getActiveTasksFromBackend();
        
        if (activeTasks.length === 0) {
            this.projectStatusTitle.textContent = 'No Active Tasks';
            const noTasksHtml = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fas fa-spinner" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i><p>No active tasks.<br>Tasks currently being executed will appear here.</p></div>';
            this.addTaskDisplay(noTasksHtml);
            this.logExecution('info', 'No active tasks to display');
            return;
        }
        
        // Set the title for active tasks
        this.projectStatusTitle.textContent = `Active Tasks (${activeTasks.length})`;
        
        const tasksHtml = this.createTasksDisplay('Active Tasks', activeTasks);
        this.addTaskDisplay(tasksHtml);
        this.logExecution('success', `Displayed ${activeTasks.length} active tasks`);
    }

    async displayModifiedFiles() {
        // Get modified files from backend API
        const modifiedFiles = await this.getModifiedFilesFromBackend();
        
        if (modifiedFiles.length === 0) {
            this.projectStatusTitle.textContent = 'No Modified Files';
            const noFilesHtml = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fas fa-file-code" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i><p>No files have been modified yet.<br>Files changed by tasks will appear here.</p></div>';
            this.addTaskDisplay(noFilesHtml);
            this.logExecution('info', 'No modified files to display');
            return;
        }
        
        // Set the title for modified files
        this.projectStatusTitle.textContent = `Modified Files (${modifiedFiles.length})`;
        
        const filesHtml = this.createFilesDisplay('Modified Files', modifiedFiles);
        this.addTaskDisplay(filesHtml);
        this.logExecution('success', `Displayed ${modifiedFiles.length} modified files`);
    }

    async displayBuildSessions() {
        // Get build sessions from backend API
        const buildSessions = await this.getBuildSessionsFromBackend();
        
        if (buildSessions.length === 0) {
            this.projectStatusTitle.textContent = 'No Build Sessions';
            const noSessionsHtml = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fas fa-globe" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i><p>No build sessions yet.<br>Website builds will appear here.</p></div>';
            this.addTaskDisplay(noSessionsHtml);
            this.logExecution('info', 'No build sessions to display');
            return;
        }
        
        // Set the title for build sessions
        this.projectStatusTitle.textContent = `Build Sessions (${buildSessions.length})`;
        
        const sessionsHtml = this.createTasksDisplay('Build Sessions', buildSessions);
        this.addTaskDisplay(sessionsHtml);
        this.logExecution('success', `Displayed ${buildSessions.length} build sessions`);
    }

    async displayCodeStats() {
        // Show mock code statistics
        const mockStats = {
            totalTasks: 5,
            completedTasks: 2,
            activeTasks: 1,
            projectPath: '/Users/michaelkraft/autonomous_vibe_interface',
            totalFiles: 12,
            linesOfCode: 1847,
            languages: ['JavaScript', 'HTML', 'CSS'],
            lastActivity: 'Icon color updates'
        };
        
        // Set the title for code statistics
        this.projectStatusTitle.textContent = 'Code Statistics';
        
        const statsHtml = this.createStatsDisplay('Code Statistics', mockStats);
        this.addTaskDisplay(statsHtml);
        this.logExecution('success', 'Displayed code statistics');
    }

    async displayHelpSupport() {
        // Set the title for help and support
        this.projectStatusTitle.textContent = 'Help & Support';
        
        const helpHtml = this.createHelpSupportDisplay();
        this.addTaskDisplay(helpHtml);
        this.logExecution('success', 'Displayed help and support');
    }

    createHelpSupportDisplay() {
        return `
            <div class="help-support-display">
                <div class="help-search">
                    <input type="text" id="helpSearch" placeholder="Search help topics..." class="help-search-input">
                    <i class="fas fa-search help-search-icon"></i>
                </div>
                
                <div class="help-sections" id="helpSections">
                    <div class="help-section" data-category="getting-started">
                        <div class="help-section-header" onclick="toggleHelpSection('getting-started')">
                            <h4><i class="fas fa-play-circle"></i> Getting Started</h4>
                            <i class="fas fa-chevron-down toggle-icon"></i>
                        </div>
                        <div class="help-section-content" id="getting-started-content">
                            <div class="help-item">
                                <h5>How to use Coder1</h5>
                                <p>Simply type your coding task or question in the chat input and press send. Coder1 will analyze your request and automatically implement the solution.</p>
                            </div>
                            <div class="help-item">
                                <h5>Adding Context</h5>
                                <p>Click the paperclip icon (📎) to upload files, images, or fetch content from URLs to provide additional context for your tasks.</p>
                            </div>
                            <div class="help-item">
                                <h5>Project Status</h5>
                                <p>Use the Project Status panel to view completed tasks, modified files, and code statistics. Click any item to see detailed information.</p>
                            </div>
                        </div>
                    </div>

                    <div class="help-section" data-category="upload-system">
                        <div class="help-section-header" onclick="toggleHelpSection('upload-system')">
                            <h4><i class="fas fa-upload"></i> Upload System</h4>
                            <i class="fas fa-chevron-down toggle-icon"></i>
                        </div>
                        <div class="help-section-content" id="upload-system-content">
                            <div class="help-item">
                                <h5>File Uploads</h5>
                                <p>Drag and drop or click to browse for documents (.txt, .md, .json, .js, .py, .css, .html, .pdf). Maximum file size: 10MB.</p>
                            </div>
                            <div class="help-item">
                                <h5>Image Uploads</h5>
                                <p>Upload screenshots, diagrams, or mockups (.jpg, .png, .gif, .bmp, .webp). Coder1 can analyze images for text and visual information.</p>
                            </div>
                            <div class="help-item">
                                <h5>URL Fetching</h5>
                                <p>Enter any website URL to fetch and extract its content. Useful for documentation, API references, or examples.</p>
                            </div>
                            <div class="help-item">
                                <h5>Managing Context</h5>
                                <p>View uploaded context below the chat input. Remove individual items or clear all context using the provided controls.</p>
                            </div>
                        </div>
                    </div>

                    <div class="help-section" data-category="troubleshooting">
                        <div class="help-section-header" onclick="toggleHelpSection('troubleshooting')">
                            <h4><i class="fas fa-tools"></i> Troubleshooting</h4>
                            <i class="fas fa-chevron-down toggle-icon"></i>
                        </div>
                        <div class="help-section-content" id="troubleshooting-content">
                            <div class="help-item">
                                <h5>File Upload Fails</h5>
                                <p><strong>Solution:</strong> Check file size (max 10MB) and format. Supported: documents, images, and text files.</p>
                            </div>
                            <div class="help-item">
                                <h5>Tasks Not Executing</h5>
                                <p><strong>Solution:</strong> Ensure your API key is configured. Check the execution log for error messages.</p>
                            </div>
                            <div class="help-item">
                                <h5>Context Not Working</h5>
                                <p><strong>Solution:</strong> Verify files are properly uploaded and appear in the context display. Try re-uploading if needed.</p>
                            </div>
                            <div class="help-item">
                                <h5>Interface Not Responsive</h5>
                                <p><strong>Solution:</strong> Refresh the page. Check browser console for JavaScript errors. Clear browser cache if issues persist.</p>
                            </div>
                        </div>
                    </div>

                    <div class="help-section" data-category="tips-tricks">
                        <div class="help-section-header" onclick="toggleHelpSection('tips-tricks')">
                            <h4><i class="fas fa-lightbulb"></i> Tips & Tricks</h4>
                            <i class="fas fa-chevron-down toggle-icon"></i>
                        </div>
                        <div class="help-section-content" id="tips-tricks-content">
                            <div class="help-item">
                                <h5>Better Task Descriptions</h5>
                                <p>Be specific about what you want. Include file names, desired functionality, and any constraints or preferences.</p>
                            </div>
                            <div class="help-item">
                                <h5>Using Quick Actions</h5>
                                <p>Click Quick Action buttons to quickly fill the chat input with common requests like "Create a new file" or "Show git status".</p>
                            </div>
                            <div class="help-item">
                                <h5>Theme Switching</h5>
                                <p>Use the moon/sun icon in the header to switch between dark and light themes. Your preference is saved automatically.</p>
                            </div>
                            <div class="help-item">
                                <h5>Managing Tasks</h5>
                                <p>Click on completed tasks to view details, delete individual tasks, or clear all completed tasks using the bulk action button.</p>
                            </div>
                        </div>
                    </div>

                    <div class="help-section" data-category="system-info">
                        <div class="help-section-header" onclick="toggleHelpSection('system-info')">
                            <h4><i class="fas fa-info-circle"></i> System Information</h4>
                            <i class="fas fa-chevron-down toggle-icon"></i>
                        </div>
                        <div class="help-section-content" id="system-info-content">
                            <div class="help-item">
                                <h5>Current Capabilities</h5>
                                <p>Coder1 can read/write files, analyze images, fetch web content, execute terminal commands, and manage your project autonomously.</p>
                            </div>
                            <div class="help-item">
                                <h5>Supported File Types</h5>
                                <p><strong>Documents:</strong> .txt, .md, .json, .js, .py, .css, .html, .pdf<br>
                                <strong>Images:</strong> .jpg, .jpeg, .png, .gif, .bmp, .webp</p>
                            </div>
                            <div class="help-item">
                                <h5>API Integration</h5>
                                <p>Powered by Anthropic's Claude AI. Requires valid API key for full functionality. Check execution log for API status.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-footer">
                    <p><i class="fas fa-question-circle"></i> Need more help? Try asking Coder1 directly: "How do I..." or "Help me with..."</p>
                </div>
            </div>
        `;
    }

    createTasksDisplay(title, tasks) {
        const taskItems = tasks.map(task => {
            const subtasks = task.subtasks ? task.subtasks.map(sub => `<li>${sanitizeHtml(sub)}</li>`).join('') : '';
            const response = task.claudeResponse ? sanitizeHtml(task.claudeResponse.substring(0, 200)) + '...' : 'No response';
            
            return `
                <div class="task-item" data-task-id="${task.id}">
                    <div class="task-header" onclick="toggleTaskDetails('${task.id}')">
                        <span class="task-title">${sanitizeHtml(task.description)}</span>
                        <div class="task-actions">
                            <span class="task-status status-${task.status}">${task.status.toUpperCase()}</span>
                            <button class="toggle-details">Details</button>
                            <button class="delete-task-btn" onclick="event.stopPropagation(); coder1.deleteTask('${task.id}')" title="Delete task">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="task-details" id="details-${task.id}" style="display: none;">
                        <div class="task-info">
                            <p><strong>Created:</strong> ${formatTimestamp(task.createdAt)}</p>
                            <p><strong>Completed:</strong> ${task.completedAt ? formatTimestamp(task.completedAt) : 'N/A'}</p>
                            <p><strong>Priority:</strong> ${task.priority || 1}</p>
                        </div>
                        ${subtasks ? `<div class="task-subtasks"><strong>Subtasks:</strong><ul>${subtasks}</ul></div>` : ''}
                        <div class="task-response">
                            <strong>Response:</strong>
                            <p>${response}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        const clearAllButton = tasks.length > 0 ? `
            <div class="task-management-actions">
                <button class="clear-all-tasks-btn" onclick="coder1.clearAllCompletedTasks()">
                    <i class="fas fa-trash-alt"></i>
                    Clear All Completed Tasks
                </button>
            </div>
        ` : '';
        
        return `
            <div class="tasks-display">
                <div class="tasks-display-header">
                    <h3>${title} (${tasks.length})</h3>
                    ${clearAllButton}
                </div>
                <div class="task-list">
                    ${taskItems}
                </div>
            </div>
        `;
    }

    createFilesDisplay(title, files) {
        const fileItems = files.map(file => `
            <div class="file-display-item">
                <span class="file-name">${sanitizeHtml(file.name)}</span>
                <span class="file-path">${sanitizeHtml(file.path)}</span>
                <span class="file-modified">${formatTimestamp(file.lastModified)}</span>
            </div>
        `).join('');
        
        return `
            <div class="files-display">
                <h3>${title} (${files.length})</h3>
                <div class="file-list-display">
                    ${fileItems}
                </div>
            </div>
        `;
    }

    createStatsDisplay(title, data) {
        return `
            <div class="stats-display">
                <h3>${title}</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Total Tasks:</span>
                        <span class="stat-value">${data.totalTasks || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Completed Tasks:</span>
                        <span class="stat-value">${data.completedTasks || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Active Tasks:</span>
                        <span class="stat-value">${data.activeTasks || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Files:</span>
                        <span class="stat-value">${data.totalFiles || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Lines of Code:</span>
                        <span class="stat-value">${data.linesOfCode || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Last Activity:</span>
                        <span class="stat-value">${sanitizeHtml(data.lastActivity || 'N/A')}</span>
                    </div>
                </div>
                <div class="stat-detail">
                    <p><strong>Project Path:</strong> ${sanitizeHtml(data.projectPath || 'N/A')}</p>
                    <p><strong>Languages:</strong> ${data.languages ? data.languages.join(', ') : 'N/A'}</p>
                </div>
            </div>
        `;
    }

    addTaskDisplay(htmlContent) {
        // Use the main display area
        this.mainDisplayContent.innerHTML = htmlContent;
        
        // Show the main display section
        this.mainDisplaySection.style.display = 'block';
        
        // Scroll to the main display area
        this.mainDisplaySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        return 'main-display-' + Date.now();
    }

    hideMainDisplay() {
        this.mainDisplaySection.style.display = 'none';
        this.logExecution('info', 'Main display closed');
    }

    toggleDropdown(section) {
        const content = document.getElementById(`${section}Content`);
        const arrow = document.getElementById(`${section}Arrow`);
        
        if (content && arrow) {
            const isExpanded = content.style.display !== 'none';
            
            if (isExpanded) {
                content.style.display = 'none';
                content.classList.remove('expanded');
                arrow.classList.remove('expanded');
                this.logExecution('info', `${section} collapsed`);
            } else {
                content.style.display = 'block';
                content.classList.add('expanded');
                arrow.classList.add('expanded');
                this.logExecution('info', `${section} expanded`);
            }
        }
    }

    // Task Management Methods
    getCompletedTasks() {
        try {
            const saved = localStorage.getItem('completedTasks');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading completed tasks:', error);
        }
        
        // Return default mock data if nothing saved
        return [
            {
                id: 'task-1',
                description: 'Change icon colors to match Coder1 gradient',
                status: 'completed',
                createdAt: Date.now() - 3600000,
                completedAt: Date.now() - 1800000,
                priority: 1,
                subtasks: ['Identify purple icons', 'Apply gradient styling', 'Update CSS classes'],
                claudeResponse: 'Successfully updated icon colors to use the same gradient as the Coder1 title. Modified .quick-action-btn i and .logo i selectors to use linear-gradient styling.'
            }
        ];
    }

    async getCompletedTasksFromBackend() {
        try {
            // Use cached data if available for consistency
            if (this._lastTaskData) {
                const allTasks = this._lastTaskData.tasks || [];
                const completedTasks = allTasks.filter(task => task.status === 'completed');
                console.log('📊 Using cached data for completed tasks:', completedTasks.length);
                return completedTasks;
            }
            
            const response = await fetch('/api/agent/tasks');
            const data = await response.json();
            
            if (data.success) {
                const allTasks = data.data.tasks || [];
                const completedTasks = allTasks.filter(task => task.status === 'completed');
                console.log('🌐 Fetched completed tasks from API:', completedTasks.length);
                return completedTasks;
            } else {
                console.error('Error fetching tasks from backend:', data.error);
                return [];
            }
        } catch (error) {
            console.error('Error fetching completed tasks from backend:', error);
            // Fallback to localStorage if backend fails
            return this.getCompletedTasks();
        }
    }

    async getPendingTasksFromBackend() {
        try {
            // Use cached data if available for consistency
            if (this._lastTaskData) {
                const allTasks = this._lastTaskData.tasks || [];
                const pendingTasks = allTasks.filter(task => task.status === 'pending');
                console.log('📊 Using cached data for pending tasks:', pendingTasks.length);
                return pendingTasks;
            }
            
            const response = await fetch('/api/agent/tasks');
            const data = await response.json();
            
            if (data.success) {
                // Filter for pending tasks
                const allTasks = data.data.tasks || [];
                const pendingTasks = allTasks.filter(task => task.status === 'pending');
                console.log('🌐 Fetched pending tasks from API:', pendingTasks.length);
                return pendingTasks;
            } else {
                console.error('Error fetching tasks from backend:', data.error);
                return [];
            }
        } catch (error) {
            console.error('Error fetching pending tasks from backend:', error);
            return [];
        }
    }

    async getActiveTasksFromBackend() {
        try {
            // Use cached data if available for consistency
            if (this._lastTaskData) {
                const allTasks = this._lastTaskData.tasks || [];
                const activeTasks = allTasks.filter(task => task.status === 'in_progress');
                console.log('📊 Using cached data for active tasks:', activeTasks.length);
                return activeTasks;
            }
            
            const response = await fetch('/api/agent/tasks');
            const data = await response.json();
            
            if (data.success) {
                // Filter for in-progress tasks
                const allTasks = data.data.tasks || [];
                const activeTasks = allTasks.filter(task => task.status === 'in_progress');
                console.log('🌐 Fetched active tasks from API:', activeTasks.length);
                return activeTasks;
            } else {
                console.error('Error fetching tasks from backend:', data.error);
                return [];
            }
        } catch (error) {
            console.error('Error fetching active tasks from backend:', error);
            return [];
        }
    }

    async getModifiedFilesFromBackend() {
        try {
            const response = await fetch('/api/agent/tasks');
            const data = await response.json();
            
            if (data.success) {
                // Extract modified files from all tasks
                const modifiedFiles = new Map();
                
                [...data.data.activeTasks, ...data.data.completedTasks].forEach(task => {
                    if (task.implementationResults && task.implementationResults.changes) {
                        task.implementationResults.changes.forEach(change => {
                            modifiedFiles.set(change.filePath, {
                                name: change.filePath.split('/').pop(),
                                path: change.filePath,
                                lastModified: task.completedAt || task.createdAt,
                                modified: true,
                                taskId: task.id,
                                taskDescription: task.description
                            });
                        });
                    }
                });
                
                return Array.from(modifiedFiles.values());
            } else {
                console.error('Error fetching tasks from backend:', data.error);
                return [];
            }
        } catch (error) {
            console.error('Error fetching modified files from backend:', error);
            return [];
        }
    }

    async getBuildSessionsFromBackend() {
        try {
            const response = await fetch('/api/agent/tasks');
            const data = await response.json();
            
            if (data.success) {
                // Filter for build-related tasks
                const buildTasks = [...data.data.activeTasks, ...data.data.completedTasks]
                    .filter(task => {
                        const desc = task.description ? task.description.toLowerCase() : '';
                        return desc.includes('website') || desc.includes('build') || desc.includes('page') || desc.includes('site');
                    });
                
                return buildTasks;
            } else {
                console.error('Error fetching tasks from backend:', data.error);
                return [];
            }
        } catch (error) {
            console.error('Error fetching build sessions from backend:', error);
            return [];
        }
    }

    saveCompletedTasks(tasks) {
        try {
            localStorage.setItem('completedTasks', JSON.stringify(tasks));
            this.updateTaskCounters().catch(err => console.error('Error updating task counters:', err));
        } catch (error) {
            console.error('Error saving completed tasks:', error);
        }
    }

    deleteTask(taskId) {
        const tasks = this.getCompletedTasks();
        const filteredTasks = tasks.filter(task => task.id !== taskId);
        this.saveCompletedTasks(filteredTasks);
        
        // Refresh the display
        this.displayCompletedTasks();
        this.logExecution('success', `Deleted task: ${taskId}`);
    }

    clearAllCompletedTasks() {
        if (confirm('Are you sure you want to delete all completed tasks? This action cannot be undone.')) {
            this.saveCompletedTasks([]);
            this.displayCompletedTasks();
            this.logExecution('success', 'All completed tasks cleared');
        }
    }

    async updateTaskCounters() {
        try {
            console.log('🔄 updateTaskCounters() called...');
            const response = await fetch('/api/agent/tasks');
            const data = await response.json();
            
            console.log('📡 Task API response:', data);
            
            if (data.success) {
                // Be more specific about which status items to target
                const pendingElement = document.querySelector('[data-action="show-pending-tasks"] .status-value');
                const activeElement = document.querySelector('[data-action="show-active-tasks"] .status-value');
                const completedElement = document.querySelector('[data-action="show-completed-tasks"] .status-value');
                
                console.log('🎯 Found specific elements:', {
                    pending: pendingElement,
                    active: activeElement,
                    completed: completedElement
                });
                
                if (pendingElement && activeElement && completedElement) {
                    // Count tasks from the main tasks array since that's where they actually are
                    const allTasks = data.data.tasks || [];
                    const pendingCount = allTasks.filter(task => task.status === 'pending').length;
                    const activeCount = allTasks.filter(task => task.status === 'in_progress').length;
                    const completedCount = allTasks.filter(task => task.status === 'completed').length;
                    
                    // DEBUG: Log the actual counts
                    console.log('🔢 Task Counter Update:', {
                        pending: pendingCount,
                        active: activeCount,
                        completed: completedCount,
                        activeTasks: data.data.activeTasks.length,
                        completedTasks: data.data.completedTasks.length
                    });
                    
                    console.log('📝 Updating specific DOM elements...');
                    pendingElement.textContent = pendingCount;
                    activeElement.textContent = activeCount;
                    completedElement.textContent = completedCount;
                    
                    console.log('✅ Specific DOM elements updated:', {
                        pending: pendingElement.textContent,
                        active: activeElement.textContent,
                        completed: completedElement.textContent
                    });
                    
                    // Auto-expand project status section if there are any tasks
                    const totalTasks = pendingCount + activeCount + completedCount;
                    if (totalTasks > 0) {
                        const projectStatusContent = document.getElementById('projectStatusContent');
                        const projectStatusArrow = document.getElementById('projectStatusArrow');
                        if (projectStatusContent && projectStatusContent.style.display === 'none') {
                            projectStatusContent.style.display = 'block';
                            projectStatusContent.classList.add('expanded');
                            if (projectStatusArrow) {
                                projectStatusArrow.classList.add('expanded');
                            }
                            console.log('🔍 Auto-expanded project status section due to active tasks');
                        }
                    }
                    
                    // Store the current data for consistency
                    this._lastTaskData = data.data;
                    
                    // Also update Files Modified and Build Sessions if they exist
                    const filesElement = document.querySelector('[data-action="show-modified-files"] .status-value');
                    const sessionsElement = document.querySelector('[data-action="show-build-sessions"] .status-value');
                    
                    if (filesElement) {
                        // Files Modified - count unique files that have been modified
                        const modifiedFiles = new Set();
                        [...data.data.activeTasks, ...data.data.completedTasks].forEach(task => {
                            if (task.implementationResults && task.implementationResults.changes) {
                                task.implementationResults.changes.forEach(change => {
                                    modifiedFiles.add(change.filePath);
                                });
                            }
                        });
                        filesElement.textContent = modifiedFiles.size;
                    }
                    
                    if (sessionsElement) {
                        // Build Sessions - count tasks that are website builds
                        const buildSessions = [...data.data.activeTasks, ...data.data.completedTasks]
                            .filter(task => task.description && (task.description.includes('website') || task.description.includes('build'))).length;
                        sessionsElement.textContent = buildSessions;
                    }
                } else {
                    console.error('❌ Could not find specific status elements to update');
                }
            } else {
                throw new Error('API returned success: false');
            }
        } catch (error) {
            console.error('Error updating task counters:', error);
            // Fallback to localStorage if backend fails
            const completedTasks = this.getCompletedTasks();
            const statusItems = document.querySelectorAll('.status-item .status-value');
            if (statusItems.length >= 3) {
                console.log('📦 Using localStorage fallback:', {
                    completed: completedTasks.length
                });
                statusItems[0].textContent = 0; // No pending data available
                statusItems[1].textContent = 0; // No active data available
                statusItems[2].textContent = completedTasks.length;
                
                // Clear stored data to indicate we're using fallback
                this._lastTaskData = null;
            }
        }
    }

    updateProjectStatus(task) {
        // Update counters in sidebar
        const statusItems = document.querySelectorAll('.status-item .status-value');
        if (statusItems.length >= 1) {
            const currentTasks = parseInt(statusItems[0].textContent) || 0;
            statusItems[0].textContent = currentTasks + 1;
        }
    }

    async loadProjectStatus() {
        try {
            const response = await fetch('/api/agent/tasks');
            const data = await response.json();
            
            if (data.success) {
                const statusItems = document.querySelectorAll('.status-item .status-value');
                if (statusItems.length >= 6) {
                    // Count pending tasks (status === 'pending')
                    const pendingCount = data.data.activeTasks.filter(task => task.status === 'pending').length;
                    // Count active/in-progress tasks (status === 'in_progress')  
                    const activeCount = data.data.activeTasks.filter(task => task.status === 'in_progress').length;
                    // Count completed tasks
                    const completedCount = data.data.completedTasksCount || 0;
                    
                    statusItems[0].textContent = pendingCount;      // Tasks Pending
                    statusItems[1].textContent = activeCount;       // Tasks Active
                    statusItems[2].textContent = completedCount;    // Tasks Completed
                    statusItems[3].textContent = 0;                 // Files Modified (placeholder)
                    statusItems[4].textContent = 0;                 // Lines of Code (placeholder)
                    // statusItems[5] is Help & Support icon, leave unchanged
                }
            }
        } catch (error) {
            console.error('Error loading project status:', error);
        }
    }

    // Execution Log Methods
    initializeExecutionLog() {
        try {
            // Fix the initial log entry timestamp
            const initialLogEntry = this.executionLog.querySelector('.log-entry.system .log-timestamp');
            if (initialLogEntry) {
                initialLogEntry.textContent = `[${new Date().toLocaleTimeString()}]`;
            }
            
            // Update the initial message
            const initialMessage = this.executionLog.querySelector('.log-entry.system .log-message');
            if (initialMessage) {
                initialMessage.textContent = 'Coder1 initialized and ready for tasks';
            }
            
            console.log('Execution log initialized');
        } catch (error) {
            console.error('Error initializing execution log:', error);
        }
    }

    logExecution(level, message) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${level}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-level">${level.toUpperCase()}</span>
            <span class="log-message">${sanitizeHtml(message)}</span>
        `;
        
        this.executionLog.appendChild(logEntry);
        
        // Auto-scroll if enabled
        if (this.autoScrollEnabled) {
            this.executionLog.scrollTop = this.executionLog.scrollHeight;
        }
        
        // Limit log entries to prevent memory issues
        const maxEntries = 1000;
        while (this.executionLog.children.length > maxEntries) {
            this.executionLog.removeChild(this.executionLog.firstChild);
        }
    }

    clearExecutionLog() {
        if (confirm('Are you sure you want to clear the execution log?')) {
            this.executionLog.innerHTML = '';
            this.logExecution('system', 'Execution log cleared');
        }
    }

    exportExecutionLog() {
        const logEntries = Array.from(this.executionLog.querySelectorAll('.log-entry')).map(entry => {
            const timestamp = entry.querySelector('.log-timestamp').textContent;
            const level = entry.querySelector('.log-level').textContent;
            const message = entry.querySelector('.log-message').textContent;
            return `${timestamp} ${level} ${message}`;
        });

        const logText = logEntries.join('\n');
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `coder1-execution-log-${formatTimestamp(new Date(), 'iso').split('T')[0]}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.logExecution('info', 'Execution log exported');
    }

    toggleAutoScroll() {
        this.autoScrollEnabled = !this.autoScrollEnabled;
        
        if (this.autoScrollEnabled) {
            this.toggleAutoScrollButton.classList.add('auto-scroll-enabled');
            this.toggleAutoScrollButton.querySelector('i').className = 'fas fa-lock';
            this.executionLog.scrollTop = this.executionLog.scrollHeight;
            this.logExecution('info', 'Auto-scroll enabled');
        } else {
            this.toggleAutoScrollButton.classList.remove('auto-scroll-enabled');
            this.toggleAutoScrollButton.querySelector('i').className = 'fas fa-lock-open';
            this.logExecution('info', 'Auto-scroll disabled');
        }
    }

    // Theme Methods
    initializeTheme() {
        this.applyTheme(this.currentTheme);
        this.updateThemeIcon();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.currentTheme);
        this.updateThemeIcon();
        localStorage.setItem('theme', this.currentTheme);
        this.logExecution('info', `Switched to ${this.currentTheme} theme`);
    }

    applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }

    updateThemeIcon() {
        const icon = this.themeToggle.querySelector('i');
        if (this.currentTheme === 'dark') {
            icon.className = 'fas fa-moon';
        } else {
            icon.className = 'fas fa-sun';
        }
    }

    // Website Selector Methods
    initializeWebsiteSelector() {
        this.websiteInput.value = this.currentWebsite;
        this.logExecution('system', `Current website: ${this.currentWebsite}`);
    }

    setWebsite() {
        const newWebsite = this.websiteInput.value.trim();
        if (!newWebsite) {
            this.addMessage('Please enter a website URL or project name.', 'assistant');
            return;
        }

        this.currentWebsite = newWebsite;
        localStorage.setItem('currentWebsite', newWebsite);
        
        this.addMessage(`🌐 Now working on: ${newWebsite}`, 'assistant');
        this.logExecution('info', `Website changed to: ${newWebsite}`);
        
        // Optionally notify the backend about the website change
        this.notifyWebsiteChange(newWebsite);
    }

    async notifyWebsiteChange(website) {
        try {
            const response = await fetch('/api/agent/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    currentWebsite: website,
                    projectContext: `Working on ${website}`
                })
            });

            if (response.ok) {
                this.logExecution('success', 'Backend notified of website change');
            }
        } catch (error) {
            this.logExecution('warning', `Could not notify backend: ${error.message}`);
        }
    }

    // Spotlight Effect Methods
    initializeSpotlightEffect() {
        const sidebarCards = document.querySelectorAll('.sidebar-card');
        
        sidebarCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                
                card.style.setProperty('--mouse-x', `${x}%`);
                card.style.setProperty('--mouse-y', `${y}%`);
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.setProperty('--mouse-x', '50%');
                card.style.setProperty('--mouse-y', '50%');
            });
        });
        
        this.logExecution('system', 'Spotlight effects initialized on sidebar cards');
    }

    // Upload Interface Methods
    initializeUploadInterface() {
        // Load any saved context from localStorage
        const savedContext = localStorage.getItem('uploadedContext');
        if (savedContext) {
            try {
                this.uploadedContext = JSON.parse(savedContext);
                this.updateContextDisplay();
            } catch (error) {
                console.error('Error loading saved context:', error);
                this.uploadedContext = [];
            }
        }
        
        this.logExecution('system', 'Upload interface initialized');
    }

    toggleUploadPanel() {
        const isVisible = this.uploadPanel.style.display !== 'none';
        if (isVisible) {
            this.hideUploadPanel();
        } else {
            this.showUploadPanel();
        }
    }

    showUploadPanel() {
        this.uploadPanel.style.display = 'block';
        this.attachBtn.classList.add('active');
        this.logExecution('info', 'Upload panel opened');
    }

    hideUploadPanel() {
        this.uploadPanel.style.display = 'none';
        this.attachBtn.classList.remove('active');
        this.logExecution('info', 'Upload panel closed');
    }

    switchUploadTab(tabName) {
        // Update tab buttons
        this.uploadTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        this.uploadTabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        this.logExecution('info', `Switched to ${tabName} upload tab`);
    }

    setupDropZone(dropZone, fileInput, type) {
        // Click to browse
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            this.processFiles(files, type);
        });
    }

    handleFileSelect(event, type) {
        const files = Array.from(event.target.files);
        this.processFiles(files, type);
        
        // Clear the input so the same file can be selected again
        event.target.value = '';
    }

    async processFiles(files, type) {
        this.logExecution('info', `Processing ${files.length} ${type} files`);
        
        // Create FormData for upload
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        
        try {
            const response = await fetch('/api/agent/upload-files', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Process successful uploads
                data.data.processedFiles.forEach(processedFile => {
                    if (processedFile.success) {
                        const contextItem = {
                            id: Date.now() + Math.random(),
                            name: processedFile.name,
                            type: processedFile.type,
                            size: processedFile.size,
                            mimeType: processedFile.mimeType,
                            content: processedFile.content,
                            uploadedAt: processedFile.processedAt
                        };
                        this.uploadedContext.push(contextItem);
                        this.logExecution('success', `Added ${processedFile.type} context: ${processedFile.name}`);
                    } else {
                        this.logExecution('error', `Error processing ${processedFile.name}: ${processedFile.error}`);
                    }
                });
                
                this.addMessage(`Successfully processed ${data.data.successCount} of ${data.data.totalFiles} files`, 'assistant');
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            this.logExecution('error', `Upload failed: ${error.message}`);
            this.addMessage(`Upload failed: ${error.message}`, 'assistant');
        }
        
        this.updateContextDisplay();
        this.saveContextToStorage();
    }


    async fetchUrlContent() {
        const url = this.urlInput.value.trim();
        if (!url) {
            this.addMessage('Please enter a valid URL', 'assistant');
            return;
        }

        this.fetchUrlBtn.disabled = true;
        this.fetchUrlBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching...';
        
        try {
            this.logExecution('info', `Fetching content from: ${url}`);
            
            const response = await fetch('/api/agent/fetch-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            if (data.success) {
                const contextItem = {
                    id: Date.now() + Math.random(),
                    name: data.data.title || url,
                    type: 'url',
                    size: data.data.content.length,
                    content: data.data.content,
                    url: url,
                    title: data.data.title,
                    description: data.data.description,
                    uploadedAt: new Date().toISOString()
                };

                this.uploadedContext.push(contextItem);
                this.updateContextDisplay();
                this.saveContextToStorage();
                
                // Show preview
                this.showUrlPreview(data.data);
                
                this.logExecution('success', `Fetched URL content: ${contextItem.name}`);
                this.urlInput.value = '';
            } else {
                throw new Error(data.error || 'Failed to fetch URL content');
            }
        } catch (error) {
            this.logExecution('error', `URL fetch failed: ${error.message}`);
            this.addMessage(`Error fetching URL: ${error.message}`, 'assistant');
        } finally {
            this.fetchUrlBtn.disabled = false;
            this.fetchUrlBtn.innerHTML = '<i class="fas fa-download"></i> Fetch';
        }
    }

    showUrlPreview(data) {
        this.urlPreview.innerHTML = `
            <h4>${sanitizeHtml(data.title || 'Untitled')}</h4>
            <p><strong>URL:</strong> ${sanitizeHtml(data.url || '')}</p>
            <p><strong>Description:</strong> ${sanitizeHtml(data.description || 'No description')}</p>
            <p><strong>Content:</strong> ${data.content.length} characters</p>
        `;
        this.urlPreview.style.display = 'block';
    }

    updateContextDisplay() {
        if (this.uploadedContext.length === 0) {
            this.contextDisplay.style.display = 'none';
            return;
        }

        this.contextDisplay.style.display = 'block';
        this.contextItems.innerHTML = '';

        this.uploadedContext.forEach(item => {
            const contextItemEl = document.createElement('div');
            contextItemEl.className = 'context-item';
            
            const icon = this.getContextIcon(item.type);
            const size = item.type === 'url' ? `${item.content.length} chars` : this.formatFileSize(item.size);
            
            contextItemEl.innerHTML = `
                <i class="${icon}"></i>
                <span class="item-name">${sanitizeHtml(item.name)}</span>
                <span class="item-size">${size}</span>
                <button class="remove-context" onclick="coder1.removeContext('${item.id}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            this.contextItems.appendChild(contextItemEl);
        });

        // Update header count
        const header = this.contextDisplay.querySelector('.context-header h4');
        header.textContent = `Context Added (${this.uploadedContext.length})`;
        
        // Show/hide items based on collapsed state
        this.contextItems.style.display = this.contextCollapsed ? 'none' : 'flex';
    }

    getContextIcon(type) {
        const icons = {
            document: 'fas fa-file-alt',
            image: 'fas fa-image',
            url: 'fas fa-link'
        };
        return icons[type] || 'fas fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    removeContext(itemId) {
        this.uploadedContext = this.uploadedContext.filter(item => item.id != itemId);
        this.updateContextDisplay();
        this.saveContextToStorage();
        this.logExecution('info', `Removed context item: ${itemId}`);
    }

    clearAllContext() {
        if (this.uploadedContext.length === 0) {
            this.addMessage('No context to clear', 'assistant');
            return;
        }

        if (confirm(`Clear all ${this.uploadedContext.length} context items?`)) {
            this.uploadedContext = [];
            this.updateContextDisplay();
            this.saveContextToStorage();
            this.urlPreview.style.display = 'none';
            this.logExecution('info', 'Cleared all context items');
            this.addMessage('All context items cleared', 'assistant');
        }
    }

    toggleContextDisplay() {
        this.contextCollapsed = !this.contextCollapsed;
        this.contextItems.style.display = this.contextCollapsed ? 'none' : 'flex';
        
        const icon = this.contextToggle.querySelector('i');
        icon.className = this.contextCollapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
        
        localStorage.setItem('contextCollapsed', this.contextCollapsed);
    }

    saveContextToStorage() {
        try {
            localStorage.setItem('uploadedContext', JSON.stringify(this.uploadedContext));
        } catch (error) {
            console.error('Error saving context to localStorage:', error);
        }
    }

    getContextForMessage() {
        if (this.uploadedContext.length === 0) {
            return null;
        }

        return {
            items: this.uploadedContext.map(item => ({
                name: item.name,
                type: item.type,
                content: item.type === 'image' ? 
                    `[Image: ${item.name}] - This is an image file that may contain text, diagrams, or visual information relevant to the task.` : 
                    item.content,
                url: item.url,
                uploadedAt: item.uploadedAt
            })),
            summary: `Context includes ${this.uploadedContext.length} items: ${this.uploadedContext.map(i => `${i.name} (${i.type})`).join(', ')}`
        };
    }

    // ================== AUTONOMOUS BUILD MONITORING ==================

    /**
     * Start monitoring an autonomous website build session
     * @param {string} buildSessionId - The build session ID to monitor
     */
    startBuildMonitoring(buildSessionId) {
        this.logExecution('info', `Starting build monitoring for session: ${buildSessionId}`);
        
        // Store the build session ID for reference
        this.currentBuildSession = buildSessionId;
        
        // Start polling for build session status
        this.buildMonitoringInterval = setInterval(() => {
            this.checkBuildSessionStatus(buildSessionId);
        }, 5000); // Check every 5 seconds
        
        // Also check immediately
        this.checkBuildSessionStatus(buildSessionId);
    }

    /**
     * Check the status of a build session
     * @param {string} buildSessionId - The build session ID to check
     */
    async checkBuildSessionStatus(buildSessionId) {
        try {
            const response = await fetch(`/api/agent/build-sessions/${buildSessionId}`);
            const data = await response.json();
            
            if (data.success) {
                const sessionStatus = data.data;
                this.updateBuildSessionStatus(sessionStatus);
                
                // Check if session is complete or failed
                if (sessionStatus.status === 'completed' || sessionStatus.status === 'failed' || sessionStatus.status === 'stopped') {
                    this.stopBuildMonitoring(buildSessionId, sessionStatus.status);
                }
            } else {
                // Session might not exist anymore
                this.logExecution('warning', `Build session ${buildSessionId} not found`);
                this.stopBuildMonitoring(buildSessionId, 'not_found');
            }
        } catch (error) {
            this.logExecution('error', `Error checking build session: ${error.message}`);
        }
    }

    /**
     * Update the UI with build session status
     * @param {Object} sessionStatus - The current session status
     */
    updateBuildSessionStatus(sessionStatus) {
        const statusMessage = this.formatBuildStatusMessage(sessionStatus);
        
        // Log the current status
        this.logExecution('info', statusMessage);
        
        // Update the chat if there are significant status changes
        if (this.shouldNotifyStatusChange(sessionStatus)) {
            this.addMessage(`🔄 Build Update: ${statusMessage}`, 'assistant');
        }
    }

    /**
     * Format a build status message
     * @param {Object} sessionStatus - The session status object
     * @returns {string} - Formatted status message
     */
    formatBuildStatusMessage(sessionStatus) {
        const {
            status,
            browserSession,
            progress,
            autoApprovedCount = 0,
            humanApprovedCount = 0,
            rejectedCount = 0
        } = sessionStatus;

        let message = `Session ${sessionStatus.sessionId || 'unknown'} - Status: ${status.toUpperCase()}`;
        
        if (progress) {
            message += ` | Progress: ${progress.currentStep || 'unknown'} (${progress.completedSteps || 0}/${progress.totalSteps || 0})`;
        }
        
        if (browserSession?.status) {
            message += ` | Browser: ${browserSession.status}`;
        }
        
        const totalApprovals = autoApprovedCount + humanApprovedCount + rejectedCount;
        if (totalApprovals > 0) {
            message += ` | Approvals: ${autoApprovedCount} auto, ${humanApprovedCount} manual, ${rejectedCount} rejected`;
        }
        
        return message;
    }

    /**
     * Determine if a status change should trigger a chat notification
     * @param {Object} sessionStatus - The session status object
     * @returns {boolean} - Whether to notify user
     */
    shouldNotifyStatusChange(sessionStatus) {
        // Only notify on major status changes or errors
        const notifiableStatuses = ['completed', 'failed', 'error', 'requires_human'];
        return notifiableStatuses.includes(sessionStatus.status);
    }

    /**
     * Stop monitoring a build session
     * @param {string} buildSessionId - The build session ID
     * @param {string} reason - Reason for stopping monitoring
     */
    stopBuildMonitoring(buildSessionId, reason) {
        if (this.buildMonitoringInterval) {
            clearInterval(this.buildMonitoringInterval);
            this.buildMonitoringInterval = null;
        }
        
        this.currentBuildSession = null;
        
        const reasonText = reason === 'completed' ? 'Build completed successfully!' :
                          reason === 'failed' ? 'Build failed' :
                          reason === 'stopped' ? 'Build was stopped' :
                          reason === 'not_found' ? 'Build session ended' :
                          'Build monitoring stopped';
        
        this.logExecution('info', `Build monitoring stopped for ${buildSessionId}: ${reasonText}`);
        
        if (reason === 'completed') {
            this.addMessage(`✅ ${reasonText} Your website has been built successfully.`, 'assistant');
        } else if (reason === 'failed') {
            this.addMessage(`❌ ${reasonText}. Check the execution log for details.`, 'assistant');
        }
    }

    /**
     * Manually stop a build session
     * @param {string} buildSessionId - The build session ID to stop
     */
    async stopBuildSession(buildSessionId) {
        try {
            const response = await fetch(`/api/agent/build-sessions/${buildSessionId}/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: 'manual' })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.addMessage('🛑 Build session stopped manually.', 'assistant');
                this.logExecution('info', `Manually stopped build session: ${buildSessionId}`);
                this.stopBuildMonitoring(buildSessionId, 'stopped');
            } else {
                throw new Error(data.error || 'Failed to stop build session');
            }
        } catch (error) {
            this.logExecution('error', `Error stopping build session: ${error.message}`);
            this.addMessage(`❌ Error stopping build session: ${error.message}`, 'assistant');
        }
    }

    // Requirements Questioning Methods
    shouldTriggerQuestioning(message) {
        const buildKeywords = [
            'build', 'create', 'make', 'website', 'site', 'page',
            'portfolio', 'blog', 'shop', 'store', 'landing',
            'design', 'develop'
        ];

        const lowercaseMessage = message.toLowerCase();
        const wordCount = message.split(' ').length;

        // Trigger if:
        // 1. Contains build keywords AND
        // 2. Is a substantial request (3 or more words) AND  
        // 3. Doesn't already contain detailed specifications
        const hasKeywords = buildKeywords.some(keyword => lowercaseMessage.includes(keyword));
        const isSubstantial = wordCount >= 3; // Lowered from 5 to 3 words
        const lacksDetail = wordCount < 30; // If it's already very detailed, skip questioning

        // Debug logging
        console.log(`[Questioning] Message: "${message}"`);
        console.log(`[Questioning] Word count: ${wordCount}`);
        console.log(`[Questioning] Has keywords: ${hasKeywords}`);
        console.log(`[Questioning] Is substantial: ${isSubstantial}`);
        console.log(`[Questioning] Lacks detail: ${lacksDetail}`);
        console.log(`[Questioning] Should trigger: ${hasKeywords && isSubstantial && lacksDetail}`);

        return hasKeywords && isSubstantial && lacksDetail;
    }

    async startQuestioningProcess(originalRequest) {
        try {
            this.logExecution('info', `Starting requirements gathering for: ${originalRequest}`);

            // Show that we're analyzing
            const analysisId = this.addMessage('🤔 Analyzing your request to gather the right details...', 'assistant', true);

            // Get questions from backend
            const response = await fetch('/api/agent/analyze-requirements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    request: originalRequest
                })
            });

            // Remove analysis message
            this.removeMessage(analysisId);

            if (!response.ok) {
                throw new Error('Failed to analyze requirements');
            }

            const data = await response.json();
            
            if (data.success && data.data.questions) {
                console.log('Frontend received questions:', data.data.questions.length);
                // Start the new questioning interface
                if (window.requirementsQuestioner) {
                    window.requirementsQuestioner.startQuestioningSession(originalRequest, data.data);
                } else if (window.RequirementsQuestioner) {
                    const questioner = new RequirementsQuestioner();
                    questioner.startQuestioningSession(originalRequest, data.data);
                } else {
                    console.error('RequirementsQuestioner not available, falling back to old system');
                    this.displayQuestions(originalRequest, data.data.questions);
                }
            } else {
                console.warn('Questions failed or empty:', data);
                // Fall back to direct processing if questioning fails
                this.addMessage('I\'ll proceed with your request as-is.', 'assistant');
                this.logExecution('warn', 'Requirements questioning failed, proceeding with direct task creation');
                // Continue with normal processing
                this.processDirectRequest(originalRequest);
            }
            
        } catch (error) {
            this.logExecution('error', `Requirements questioning error: ${error.message}`);
            this.addMessage('I\'ll proceed with your request as-is.', 'assistant');
            // Continue with normal processing on error
            this.processDirectRequest(originalRequest);
        }
    }

    displayQuestions(originalRequest, questions) {
        console.log('Debug - Displaying questions:', questions);
        
        // Check if questions array is empty or undefined
        if (!questions || questions.length === 0) {
            console.warn('No questions received to display');
            // Fallback test questions
            questions = [
                {question: "What is the main purpose of this website?", type: "open"},
                {question: "Who is your target audience?", type: "open"},
                {question: "What are the 3 most important actions you want visitors to take?", type: "open"}
            ];
            console.log('Using fallback questions for testing');
        }
        
        const questionsHtml = `
            <div class="requirements-questions">
                <h3>🎯 Let's build something amazing together!</h3>
                <p>I have a few questions to make sure I build exactly what you want:</p>
                <div class="questions-list">
                    ${questions.map((q, index) => `
                        <div class="question-item" data-question-index="${index}">
                            <label>${q.question}</label>
                            ${q.type === 'select' ? 
                                `<select class="question-input">
                                    ${q.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                                </select>` :
                                `<input type="text" class="question-input" placeholder="${q.placeholder || 'Your answer...'}">`
                            }
                        </div>
                    `).join('')}
                </div>
                <div class="questions-actions">
                    <button class="submit-answers-btn" onclick="window.coder1Interface.submitAnswers('${originalRequest}')">
                        Build It! 🚀
                    </button>
                    <button class="skip-questions-btn" onclick="window.coder1Interface.skipQuestions('${originalRequest}')">
                        Skip Questions
                    </button>
                </div>
            </div>
        `;
        
        // Display in main display area instead of chat
        console.log('Setting title element:', this.mainDisplayTitle);
        console.log('Setting content element:', this.mainDisplayContent);
        
        this.mainDisplayTitle.textContent = 'Project Requirements';
        this.mainDisplayContent.innerHTML = questionsHtml;
        this.mainDisplaySection.style.display = 'block';
        this.mainDisplaySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        console.log('Questions displayed in project status section');
        
        // Add a simple acknowledgment in chat
        this.addMessage('Perfect! I\'ve opened a requirements form below. Please fill it out so I can build exactly what you need.', 'assistant');
    }

    async submitAnswers(originalRequest) {
        const answers = [];
        const questionItems = document.querySelectorAll('.question-item');
        
        questionItems.forEach((item, index) => {
            const input = item.querySelector('.question-input');
            answers.push({
                question: item.querySelector('label').textContent,
                answer: input.value || input.selectedOptions?.[0]?.text || ''
            });
        });

        // Create enhanced request with answers
        const enhancedRequest = `${originalRequest}\n\nAdditional Details:\n${answers.map(a => `${a.question}: ${a.answer}`).join('\n')}`;
        
        this.addMessage('Perfect! Building your project with those specifications...', 'assistant');
        this.logExecution('info', 'Requirements gathered, proceeding with enhanced build');
        
        // Process the enhanced request
        await this.processDirectRequest(enhancedRequest);
    }

    async skipQuestions(originalRequest) {
        this.addMessage('No problem! I\'ll build based on your original request.', 'assistant');
        this.logExecution('info', 'User skipped requirements gathering');
        
        // Process the original request
        await this.processDirectRequest(originalRequest);
    }

    async processDirectRequest(request) {
        const loadingId = this.addMessage('Creating your project...', 'assistant', true);
        
        try {
            const response = await fetch('/api/agent/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ description: request, websiteBuild: true })
            });

            const data = await response.json();
            this.removeMessage(loadingId);

            if (data.success) {
                const message = `${data.data.message} 🤖 Working on it now...`;
                this.addMessage(message, 'assistant');
                this.logExecution('success', `Task created: ${data.data.taskId}`);
            } else {
                this.addMessage(`Error: ${data.error}`, 'assistant');
                this.logExecution('error', `Task creation failed: ${data.error}`);
            }
        } catch (error) {
            this.removeMessage(loadingId);
            this.addMessage(`Error: ${error.message}`, 'assistant');
            this.logExecution('error', `Request processing error: ${error.message}`);
        }
    }



    
    
    
    
    
    initializeSessionControls() {
        // Placeholder for session control initialization
        // This function was being called but not defined
        console.log('Session controls initialized');
    }

    initializeTerminalMonitor() {
        this.terminalOutput = document.getElementById('terminalOutput');
        this.terminalInput = document.getElementById('terminalInput');
        this.terminalStatusIndicator = document.getElementById('terminalStatusIndicator');
        this.terminalContainer = document.getElementById('terminalContainer');
        this.terminalToggle = document.getElementById('terminalToggle');
        this.clearTerminalBtn = document.getElementById('clearTerminal');
        
        if (this.terminalToggle) {
            this.terminalToggle.addEventListener('click', () => this.toggleTerminalVisibility());
        }
        
        if (this.clearTerminalBtn) {
            this.clearTerminalBtn.addEventListener('click', () => this.clearTerminalOutput());
        }
        
        this.hideTerminalMonitor();
    }
    
    showTerminalMonitor() {
        if (this.terminalContainer) {
            this.terminalContainer.style.display = 'block';
            this.addTerminalLine('Terminal monitoring started...', 'info');
            this.setTerminalStatus('Connected', 'success');
        }
    }
    
    hideTerminalMonitor() {
        if (this.terminalContainer) {
            this.terminalContainer.style.display = 'none';
        }
    }
    
    toggleTerminalVisibility() {
        if (this.terminalContainer) {
            const isVisible = this.terminalContainer.style.display !== 'none';
            if (isVisible) {
                this.hideTerminalMonitor();
            } else {
                this.showTerminalMonitor();
            }
        }
    }
    
    clearTerminalOutput() {
        if (this.terminalOutput) {
            this.terminalOutput.innerHTML = '';
        }
    }
    
    addTerminalLine(text, type = 'default') {
        if (!this.terminalOutput) return;
        
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        const prompt = this.getTerminalPrompt(type);
        
        line.innerHTML = `
            <span class="terminal-timestamp">[${timestamp}]</span>
            <span class="terminal-prompt">${prompt}</span>
            <span class="terminal-text ${type}">${text}</span>
        `;
        
        this.terminalOutput.appendChild(line);
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
    }
    
    getTerminalPrompt(type) {
        switch (type) {
            case 'info':
                return 'INFO';
            case 'success':
                return 'SUCCESS';
            case 'error':
                return 'ERROR';
            case 'warning':
                return 'WARN';
            default:
                return '$';
        }
    }
    
    setTerminalStatus(text, type = 'default') {
        if (this.terminalStatusIndicator) {
            this.terminalStatusIndicator.textContent = text;
            this.terminalStatusIndicator.className = `terminal-status-indicator ${type}`;
        }
    }
    
    updateTerminalMonitor(status) {
        if (!status) return;
        
        // Update terminal based on session status
        switch (status.status) {
            case 'initializing':
                this.setTerminalStatus('Initializing...', 'info');
                this.addTerminalLine('Build session initializing...', 'info');
                break;
            case 'launching_browser':
                this.setTerminalStatus('Launching Browser', 'info');
                this.addTerminalLine('Launching cloud browser...', 'info');
                break;
            case 'active':
                this.setTerminalStatus('Active', 'success');
                this.addTerminalLine('Session is now active and building your project!', 'success');
                break;
            case 'completed':
                this.setTerminalStatus('Completed', 'success');
                this.addTerminalLine('Session completed successfully!', 'success');
                break;
            case 'error':
                this.setTerminalStatus('Error', 'error');
                this.addTerminalLine('Session encountered an error', 'error');
                break;
            case 'failed':
                this.setTerminalStatus('Failed', 'error');
                this.addTerminalLine('Session failed after maximum retries', 'error');
                break;
            case 'terminated':
                this.setTerminalStatus('Terminated', 'warning');
                this.addTerminalLine('Session was terminated', 'warning');
                break;
        }
        
        // Show progress if available
        if (status.progress && status.progress.message) {
            this.addTerminalLine(`Progress: ${status.progress.percentage}% - ${status.progress.message}`, 'info');
        }
        
        // Process real terminal output if available
        if (status.terminalOutput && status.terminalOutput.lines) {
            this.processRealTerminalOutput(status.terminalOutput);
        } else if (status.status === 'active') {
            // Add mock terminal output for demonstration (fallback)
            this.addMockTerminalOutput();
        }
        
        // Process download information if available
        if (status.downloadInfo && status.downloadInfo.available) {
            this.processDownloadInfo(status.downloadInfo);
        }
    }
    
    processRealTerminalOutput(terminalOutput) {
        if (!terminalOutput.lines || terminalOutput.lines.length === 0) return;
        
        // Add timestamp separator for new terminal batch
        const timestamp = new Date(terminalOutput.timestamp).toLocaleTimeString();
        this.addTerminalLine(`--- Terminal Output (${timestamp}) ---`, 'info');
        
        // Process each line
        terminalOutput.lines.forEach(line => {
            if (line.trim().length === 0) return;
            
            // Determine line type based on content
            let lineType = 'default';
            if (line.includes('error') || line.includes('Error') || line.includes('failed')) {
                lineType = 'error';
            } else if (line.includes('warning') || line.includes('Warning')) {
                lineType = 'warning';
            } else if (line.includes('success') || line.includes('Success') || line.includes('complete')) {
                lineType = 'success';
            } else if (line.includes('npm') || line.includes('installing') || line.includes('building')) {
                lineType = 'info';
            }
            
            this.addTerminalLine(line, lineType);
        });
    }
    
    processDownloadInfo(downloadInfo) {
        if (!downloadInfo || !downloadInfo.available) return;
        
        this.addTerminalLine('🎉 Project files are ready for download!', 'success');
        
        // Show download URLs if available
        if (downloadInfo.urls && downloadInfo.urls.length > 0) {
            this.addTerminalLine(`📥 Found ${downloadInfo.urls.length} download URL(s):`, 'info');
            downloadInfo.urls.forEach(url => {
                this.addTerminalLine(`  • ${url}`, 'default');
            });
        }
        
        // Show download results if available
        if (downloadInfo.results && downloadInfo.results.length > 0) {
            this.addTerminalLine(`📦 Download Results:`, 'info');
            downloadInfo.results.forEach(result => {
                const status = result.initiated ? '✅ Success' : '❌ Failed';
                const message = result.error ? result.error : result.status;
                this.addTerminalLine(`  ${status}: ${result.url}`, result.initiated ? 'success' : 'error');
                if (message) {
                    this.addTerminalLine(`    ${message}`, 'default');
                }
            });
        } else {
            this.addTerminalLine('📥 Check the Recent Files section in Replit.com', 'info');
        }
    }
    
    addMockTerminalOutput() {
        const mockOutputs = [
            'Installing dependencies...',
            'Running build process...',
            'Generating files...',
            'Optimizing code...',
            'Running tests...',
            'Deploying application...',
            'Finalizing project...',
            'Building project...'
        ];
        
        // Add a random mock output occasionally
        if (Math.random() < 0.3) {
            const randomOutput = mockOutputs[Math.floor(Math.random() * mockOutputs.length)];
            this.addTerminalLine(randomOutput, 'default');
        }
    }
}

// Global function for toggling task details
function toggleTaskDetails(taskId) {
    const details = document.getElementById(`details-${taskId}`);
    const button = document.querySelector(`[data-task-id="${taskId}"] .toggle-details`);
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        button.textContent = 'Hide Details';
    } else {
        details.style.display = 'none';
        button.textContent = 'Details';
    }
}

// Global function for toggling help sections
function toggleHelpSection(sectionId) {
    const section = document.querySelector(`[data-category="${sectionId}"]`);
    const content = document.getElementById(`${sectionId}-content`);
    
    if (section && content) {
        section.classList.toggle('expanded');
        
        if (section.classList.contains('expanded')) {
            content.style.display = 'block';
        } else {
            content.style.display = 'none';
        }
    }
}

// Global instance for callbacks
let coder1;

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (coder1) {
        coder1.logExecution('error', `Unhandled promise rejection: ${event.reason}`);
    }
});

// Global functions for DOM interactions
function toggleTaskDetails(taskId) {
    const details = document.getElementById(`task-details-${taskId}`);
    const button = document.querySelector(`[onclick="toggleTaskDetails('${taskId}')"]`);
    
    if (details.style.display === 'none' || !details.style.display) {
        details.style.display = 'block';
        button.textContent = 'Hide Details';
    } else {
        details.style.display = 'none';
        button.textContent = 'Details';
    }
}

// Initialize the interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing Coder1 interface...');
        coder1 = new Coder1Interface();
        window.coder1Interface = coder1; // Make available for RequirementsQuestioner
        coder1.initializeMode();
        coder1.loadProjectStatus();
        console.log('Coder1 interface initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Coder1 interface:', error);
        document.body.innerHTML = `
            <div style="padding: 20px; font-family: Arial;">
                <h1>Error Loading Interface</h1>
                <p>Error: ${error.message}</p>
                <p>Check the browser console for more details.</p>
            </div>
        `;
    }
});
