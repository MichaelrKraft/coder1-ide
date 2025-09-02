// Streamlined Coder1 Interface
class Coder1Interface {
    constructor() {
        // Initialize DOM elements in setupEventListeners instead
        this.messageInput = null;
        this.chatMessages = null;
        this.sendBtn = null;
        this.attachBtn = null;
        this.uploadPanel = null;
        this.openCodeEditorBtn = null;
        
        // Project Management
        this.projectRegistry = this.loadProjectRegistry();
        this.nextPort = 3500;
        
        // Background Animation
        this.interactiveGradient = null;
        this.curX = 0;
        this.curY = 0;
        this.tgX = 0;
        this.tgY = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAutoResize();
        this.updateStatus();
        this.startTimeUpdater();
        this.updateProjectsList();
        this.updateSystemStatus();
        this.initBackgroundAnimation();
        this.initAttachmentDropdown();
    }

    setupEventListeners() {
        // Initialize all DOM elements first
        console.log('Setting up event listeners...');
        this.messageInput = document.getElementById('messageInput');
        this.chatMessages = document.getElementById('chatMessages');
        this.sendBtn = document.getElementById('sendBtnInside');
        this.attachBtn = document.getElementById('attachTrigger');
        this.uploadPanel = document.getElementById('uploadPanel');
        
        console.log('Send button found:', this.sendBtn);
        console.log('Message input found:', this.messageInput);
        
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => {
                console.log('Send button clicked!');
                this.sendMessage();
            });
        } else {
            console.error('Send button not found!');
        }
        
        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Attach files
        if (this.attachBtn) {
            this.attachBtn.addEventListener('click', () => this.toggleUploadPanel());
        }

        // Component Browser
        const componentBrowserBtn = document.getElementById('componentBrowser');
        if (componentBrowserBtn) {
            componentBrowserBtn.addEventListener('click', () => this.openComponentBrowser());
        }
        
        const closeUploadBtn = document.getElementById('closeUpload');
        if (closeUploadBtn) {
            closeUploadBtn.addEventListener('click', () => this.hideUploadPanel());
        }
        
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        if (uploadZone && fileInput) {
            uploadZone.addEventListener('click', () => fileInput.click());
        }

        // File input
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // Drag and drop
        if (uploadZone) {
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.style.borderColor = 'var(--accent-blue)';
            });
            uploadZone.addEventListener('dragleave', () => {
                uploadZone.style.borderColor = 'var(--border-color)';
            });
            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.style.borderColor = 'var(--border-color)';
                this.handleFileUpload(e);
            });
        }

        // Suggestion buttons
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleSuggestion(action);
            });
        });

        // Action bar buttons with error handling
        const openCodeEditorBtn = document.getElementById('openCodeEditor');
        const openTerminalBtn = document.getElementById('openTerminal');
        const viewFilesBtn = document.getElementById('viewFiles');
        const helpSupportBtn = document.getElementById('helpSupport');
        const settingsBtn = document.getElementById('settings');

        if (openCodeEditorBtn) {
            console.log('Open IDE button found, attaching event listener');
            openCodeEditorBtn.addEventListener('click', (event) => {
                console.log('Open IDE button clicked!', event);
                event.preventDefault();
                event.stopPropagation();
                
                // Direct test - try to open IDE immediately
                console.log('Attempting to open http://localhost:3001');
                const newWindow = window.open('http://localhost:3001', '_blank');
                
                if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                    console.error('Popup blocked! Please allow popups for this site.');
                    alert('Popup blocked! Please allow popups for this site and try again.');
                } else {
                    console.log('Window opened successfully');
                }
                
                // Also call the original method
                this.openIDE();
            });
        } else {
            console.error('Open IDE button not found!');
        }

        if (openTerminalBtn) {
            openTerminalBtn.addEventListener('click', () => {
                console.log('Open Terminal button clicked!');
                this.openTerminal();
            });
        } else {
            console.error('Open Terminal button not found!');
        }

        if (viewFilesBtn) {
            viewFilesBtn.addEventListener('click', () => {
                console.log('View Files button clicked!');
                this.viewFiles();
            });
        } else {
            console.error('View Files button not found!');
        }

        if (helpSupportBtn) {
            helpSupportBtn.addEventListener('click', () => this.showHelp());
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // V0-style action buttons
        document.querySelectorAll('.v0-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleV0Action(e.target.closest('.v0-action-btn')));
        });

        // Project Manager Event Listeners
        document.getElementById('createProject').addEventListener('click', () => this.showProjectModal());
        document.getElementById('createFirstProject').addEventListener('click', () => this.showProjectModal());
        document.getElementById('closeProjectModal').addEventListener('click', () => this.hideProjectModal());
        document.getElementById('cancelProject').addEventListener('click', () => this.hideProjectModal());
        document.getElementById('projectForm').addEventListener('submit', (e) => this.handleProjectCreation(e));
        document.getElementById('projectTemplate').addEventListener('change', (e) => this.handleTemplateChange(e));
        
        // Template click handlers with magic effects
        document.querySelectorAll('.template-item').forEach(item => {
            const template = item.dataset.template;
            
            // Add unique magic colors for each template
            this.addTemplateTheme(item, template);
            
            item.addEventListener('click', (e) => {
                console.log('Template button clicked:', template);
                this.addMagicClickEffect(e.currentTarget);
                this.selectTemplate(template);
            });
        });
    }

    setupAutoResize() {
        if (!this.messageInput) return;
        
        const minHeight = 60;
        const maxHeight = 200;
        
        // Set initial height
        this.messageInput.style.height = `${minHeight}px`;
        
        this.messageInput.addEventListener('input', () => {
            // Reset height to get accurate scrollHeight
            this.messageInput.style.height = `${minHeight}px`;
            
            // Calculate new height
            const newHeight = Math.max(
                minHeight,
                Math.min(this.messageInput.scrollHeight, maxHeight)
            );
            
            this.messageInput.style.height = `${newHeight}px`;
            
            // Update send button state based on content
            this.updateSendButtonState();
        });
    }
    
    updateSendButtonState() {
        if (!this.messageInput) return;
        
        const hasContent = this.messageInput.value.trim().length > 0;
        const sendBtn = document.getElementById('sendBtnInside');
        
        if (sendBtn) {
            if (hasContent) {
                sendBtn.classList.add('active');
            } else {
                sendBtn.classList.remove('active');
            }
        } else {
            console.error('Send button not found in updateSendButtonState');
        }
    }

    async sendMessage() {
        console.log('sendMessage called');
        const message = this.messageInput.value.trim();
        console.log('Message content:', message);
        if (!message) {
            console.log('No message to send, returning');
            return;
        }

        this.addMessage('user', message);
        this.messageInput.value = '';
        this.messageInput.style.height = '60px';
        this.updateSendButtonState();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Check for /ui commands first
            if (message.startsWith('/ui')) {
                console.log('UI command detected:', message);
                await this.handleUICommand(message);
            } else {
                // Detect intent and route accordingly
                const intent = this.detectIntent(message);
                
                if (intent === 'build-website') {
                    await this.handleBuildWebsite(message);
                } else if (intent === 'open-ide') {
                    this.openIDE();
                } else {
                    await this.handleGeneralChat(message);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('ai', 'Sorry, I encountered an error. Please try again.');
        } finally {
            this.hideTypingIndicator();
        }
    }

    detectIntent(message) {
        const buildKeywords = ['build', 'create', 'make', 'website', 'app', 'application', 'landing page'];
        const ideKeywords = ['ide', 'editor', 'code', 'open editor'];
        
        const lowerMessage = message.toLowerCase();
        
        if (buildKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return 'build-website';
        } else if (ideKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return 'open-ide';
        }
        
        return 'general';
    }

    async handleBuildWebsite(message) {
        this.addMessage('ai', `I'll help you build that! Let me gather some details first.`);
        
        // Simulate the 5-question workflow
        setTimeout(() => {
            this.addMessage('ai', `<div class="build-workflow">
                <h4>🚀 Build Workflow Started</h4>
                <p>I'll ask you 5 quick questions to understand your project better:</p>
                <ol>
                    <li><strong>What type of application do you want to build?</strong></li>
                    <li><strong>Who is your target audience?</strong></li>
                    <li><strong>What are the main features you need?</strong></li>
                    <li><strong>Do you have any design preferences?</strong></li>
                    <li><strong>Any specific technology requirements?</strong></li>
                </ol>
                <p>Would you like to proceed with the questionnaire or go directly to the IDE?</p>
                <div class="action-buttons">
                    <button class="action-btn primary" onclick="console.log('Start Questionnaire clicked'); coder1.startQuestionnaire()">Start Questionnaire</button>
                    <button class="action-btn" onclick="console.log('Open IDE clicked'); coder1.openIDE()">Open IDE</button>
                </div>
            </div>`);
        }, 1000);
    }

    async handleUICommand(message) {
        console.log('Processing UI command:', message);
        
        try {
            // Call the Magic API
            const response = await fetch('/api/magic/ui', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            console.log('UI command response:', data);

            if (data.success) {
                if (data.component) {
                    // Component generated successfully
                    this.addMessage('ai', `✨ Generated component successfully! Here's your **${data.component.explanation}**:`);
                    
                    // Add code block
                    this.addMessage('ai', `
                        <div class="code-result">
                            <div class="code-header">
                                <span class="code-title">React Component</span>
                                <button class="copy-code-btn" onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent)">📋 Copy</button>
                            </div>
                            <pre class="code-block"><code>${this.escapeHtml(data.component.code)}</code></pre>
                        </div>
                    `);

                    if (data.component.metadata && data.component.metadata.customizations) {
                        const customizations = Object.entries(data.component.metadata.customizations || {});
                        if (customizations && customizations.length > 0) {
                            this.addMessage('ai', `🎨 Applied customizations: ${customizations.map(([k,v]) => `${k}: ${v}`).join(', ')}`);
                        }
                    }

                } else if (data.category_results) {
                    // Category listing
                    this.addMessage('ai', `📋 Found ${data.category_results.total_components || 0} components in **${data.category_results.category}** category:`);
                    
                    const components = data.category_results.components || [];
                    if (components.length > 0) {
                        const componentList = components.map(comp => 
                            `• **${comp.name}** - ${comp.description} \`/ui ${comp.key}\``
                        ).join('\n');
                        this.addMessage('ai', componentList);
                    }

                } else if (data.search_results) {
                    // Search results
                    this.addMessage('ai', `🔍 Found ${data.search_results.total_found || 0} components matching "${data.search_results.query}":`);
                    
                    const results = data.search_results.results || [];
                    if (results.length > 0) {
                        const resultList = results.map(comp => 
                            `• **${comp.name}** - ${comp.description} \`/ui ${comp.key}\``
                        ).join('\n');
                        this.addMessage('ai', resultList);
                    }

                } else if (data.component_info) {
                    // Component info
                    const info = data.component_info;
                    this.addMessage('ai', `ℹ️ **${info.name}** (${info.category})`);
                    this.addMessage('ai', `${info.description}`);
                    
                    if (info.variants && Object.keys(info.variants).length > 0) {
                        const variants = Object.entries(info.variants).map(([prop, values]) => 
                            `**${prop}**: ${values.join(', ')}`
                        ).join('\n');
                        this.addMessage('ai', `🎛️ **Variants:**\n${variants}`);
                    }

                    if (data.dependency_info && data.dependency_info.required_dependencies && data.dependency_info.required_dependencies.length > 0) {
                        const installCommands = data.dependency_info.install_commands || [];
                        if (installCommands.length > 0) {
                            this.addMessage('ai', `📦 **Dependencies needed:**\n${installCommands.join('\n')}`);
                        }
                    }

                } else if (data.total_components) {
                    // List all categories
                    this.addMessage('ai', `📚 **React Bits Component Library** (${data.total_components} components):`);
                    
                    const categoryList = Object.entries(data.categories).map(([key, cat]) => 
                        `${cat.icon} **${cat.name}** (${cat.count}) - ${cat.description}`
                    ).join('\n');
                    
                    this.addMessage('ai', categoryList);
                    this.addMessage('ai', `💡 Try: \`/ui list buttons\` or \`/ui search glowing\` or \`/ui info card-glass\``);
                }

                // Add suggestions if provided
                if (data.suggestions && data.suggestions.message) {
                    this.addMessage('ai', `💡 ${data.suggestions.message}`);
                }

            } else {
                // Error occurred
                this.addMessage('ai', `❌ ${data.error}`);
                
                if (data.suggestions) {
                    if (data.suggestions.categories) {
                        this.addMessage('ai', '📋 Available categories:');
                        const catList = data.suggestions.categories.map(cat => 
                            `• **${cat.name}** - \`${cat.command}\``
                        ).join('\n');
                        this.addMessage('ai', catList);
                    }

                    if (data.suggestions.examples) {
                        this.addMessage('ai', '💡 Try these examples:');
                        this.addMessage('ai', data.suggestions.examples.map(ex => `• \`${ex}\``).join('\n'));
                    }
                }
            }

        } catch (error) {
            console.error('UI command failed:', error);
            this.addMessage('ai', `❌ Failed to process UI command: ${error.message}`);
            this.addMessage('ai', '💡 Try: `/ui list` to see available components or `/ui search button` to search');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async handleGeneralChat(message) {
        // Simulate AI response
        const responses = [
            "I can help you with that! Here are some suggestions:",
            "Great question! Let me break this down for you:",
            "I understand what you're looking for. Here's what I recommend:",
            "That's an interesting challenge! Let me help you solve it:"
        ];
        
        const response = responses[Math.floor(Math.random() * responses.length)];
        this.addMessage('ai', response);
    }

    handleSuggestion(action) {
        const suggestions = {
            'build-website': 'I want to build a website',
            'write-code': 'Help me write some code',
            'debug-issue': 'I need help debugging an issue',
            'deploy-app': 'I want to deploy my application'
        };
        
        this.messageInput.value = suggestions[action];
        this.messageInput.focus();
    }

    addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const avatar = type === 'user' ? '👤' : '🤖';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                ${typeof content === 'string' ? `<p>${content}</p>` : content}
            </div>
        `;
        
        // Add magic transition effect to new messages
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
        
        this.chatMessages.appendChild(messageDiv);
        
        // Trigger animation with slight delay for smooth effect
        requestAnimationFrame(() => {
            messageDiv.style.transition = 'all 0.3s ease';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        });
        
        // Smooth scroll animation
        this.smoothScrollToBottom();
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(typingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    toggleUploadPanel() {
        this.uploadPanel.style.display = this.uploadPanel.style.display === 'none' ? 'block' : 'none';
    }

    hideUploadPanel() {
        this.uploadPanel.style.display = 'none';
    }

    handleFileUpload(event) {
        const files = event.target.files || event.dataTransfer.files;
        if (files.length > 0) {
            this.addMessage('ai', `📎 Received ${files.length} file(s). I can analyze these for you!`);
            this.hideUploadPanel();
        }
    }

    openIDE() {
        console.log('openIDE method called');
        this.addMessage('ai', `🚀 Opening the Coder1 IDE... This will launch our revolutionary development environment where you can watch AI code in real-time!`);
        
        // Immediate fallback for debugging - open IDE directly
        this.openIDEApplication();
        
        // Also try magic transition effect as enhancement
        try {
            this.createMagicTransition(() => {
                // Secondary attempt
                console.log('Magic transition callback executing');
            });
        } catch (error) {
            console.error('Magic transition failed:', error);
        }
    }

    openTerminal() {
        this.addMessage('ai', `💻 Terminal functionality will be integrated into the IDE. Opening IDE with terminal focus...`);
        
        // Add magic transition effect with fallback
        try {
            this.createMagicTransition(() => {
                this.openIDEApplication();
            });
        } catch (error) {
            console.error('Magic transition failed:', error);
            setTimeout(() => {
                this.openIDEApplication();
            }, 500);
        }
    }

    viewFiles() {
        this.addMessage('ai', `📁 File explorer will be available in the IDE. Let me open it for you...`);
        
        // Add magic transition effect with fallback
        try {
            this.createMagicTransition(() => {
                this.openIDEApplication();
            });
        } catch (error) {
            console.error('Magic transition failed:', error);
            setTimeout(() => {
                this.openIDEApplication();
            }, 500);
        }
    }

    showHelp() {
        this.addMessage('ai', `
            <div class="help-content">
                <h4>🆘 Coder1 Help & Support</h4>
                <ul>
                    <li><strong>Build websites:</strong> Describe your project and I'll guide you through it</li>
                    <li><strong>Write code:</strong> Ask for help with specific programming tasks</li>
                    <li><strong>Debug issues:</strong> Share your code and I'll help you fix problems</li>
                    <li><strong>Deploy apps:</strong> I can help you deploy to various platforms</li>
                </ul>
                <p>Use the IDE for advanced development with real-time AI assistance!</p>
            </div>
        `);
    }

    showSettings() {
        this.addMessage('ai', `
            <div class="settings-content">
                <h4>⚙️ Settings</h4>
                <p>Settings panel coming soon! Current capabilities:</p>
                <ul>
                    <li>Tokyo Night theme (active)</li>
                    <li>Real-time AI assistance</li>
                    <li>File upload support</li>
                    <li>IDE integration</li>
                </ul>
            </div>
        `);
    }

    startQuestionnaire() {
        console.log('startQuestionnaire called');
        console.log('coder1 global object:', window.coder1);
        this.addMessage('ai', `
            <div class="questionnaire-start">
                <h4>📋 Project Questionnaire</h4>
                <p><strong>Question 1 of 5:</strong> What type of application do you want to build?</p>
                <div class="question-options">
                    <button class="option-btn" onclick="console.log('Answer button clicked'); coder1.answerQuestion('website')">Website/Landing Page</button>
                    <button class="option-btn" onclick="console.log('Answer button clicked'); coder1.answerQuestion('webapp')">Web Application</button>
                    <button class="option-btn" onclick="console.log('Answer button clicked'); coder1.answerQuestion('ecommerce')">E-commerce Store</button>
                    <button class="option-btn" onclick="console.log('Answer button clicked'); coder1.answerQuestion('blog')">Blog/Content Site</button>
                </div>
            </div>
        `);
    }

    answerQuestion(answer) {
        this.addMessage('user', `Selected: ${answer}`);
        this.addMessage('ai', `Great choice! This questionnaire will be fully integrated into the IDE for a seamless experience. Let me open the IDE where you can complete the remaining questions and watch your project being built in real-time!`);
        
        setTimeout(() => {
            this.openIDE();
        }, 2000);
    }

    toggleTheme() {
        // Theme toggle placeholder - Tokyo Night is default
        this.addMessage('ai', `🌙 Currently using Tokyo Night theme. Additional themes coming soon!`);
    }

    refreshActivity() {
        this.updateActivityList();
        this.updateStatus();
    }

    updateActivityList() {
        const activityList = document.getElementById('activityList');
        const activities = [
            { icon: '🚀', text: 'System ready for coding', time: 'Just now' },
            { icon: '💻', text: 'IDE preparation complete', time: '1 min ago' },
            { icon: '🔧', text: 'Environment configured', time: '2 min ago' }
        ];
        
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-content">
                    <span class="activity-text">${activity.text}</span>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </div>
        `).join('');
    }

    updateStatus() {
        // Update status counters
        document.getElementById('totalTasks').textContent = '0';
        document.getElementById('modifiedFiles').textContent = '0';
        document.getElementById('activeSessions').textContent = '0';
        
        // Update AI status
        document.getElementById('aiStatus').innerHTML = `
            <span class="ai-dot"></span>
            <span class="ai-text">Ready</span>
        `;
    }

    startTimeUpdater() {
        const updateUptime = () => {
            const now = new Date();
            const uptime = now.toLocaleTimeString();
            const uptimeElement = document.getElementById('uptime');
            if (uptimeElement) {
                uptimeElement.textContent = uptime;
            }
        };
        
        updateUptime();
        setInterval(updateUptime, 1000);
    }

    // Project Management Functions
    loadProjectRegistry() {
        const saved = localStorage.getItem('coder1-projects');
        return saved ? JSON.parse(saved) : [];
    }

    saveProjectRegistry() {
        localStorage.setItem('coder1-projects', JSON.stringify(this.projectRegistry));
    }

    getNextAvailablePort() {
        const usedPorts = this.projectRegistry.map(p => p.port);
        while (usedPorts.includes(this.nextPort)) {
            this.nextPort++;
        }
        return this.nextPort++;
    }

    showProjectModal() {
        document.getElementById('projectModal').style.display = 'flex';
        document.getElementById('projectName').focus();
    }

    hideProjectModal() {
        document.getElementById('projectModal').style.display = 'none';
        document.getElementById('projectForm').reset();
        document.getElementById('customQuestions').style.display = 'none';
    }

    handleTemplateChange(event) {
        const template = event.target.value;
        const customQuestions = document.getElementById('customQuestions');
        
        if (template === 'custom') {
            customQuestions.style.display = 'block';
        } else {
            customQuestions.style.display = 'none';
        }
    }

    selectTemplate(template) {
        console.log('Template selected:', template);
        document.getElementById('projectTemplate').value = template;
        this.handleTemplateChange({ target: { value: template } });
        this.showProjectModal();
    }

    async handleProjectCreation(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const projectData = {
            id: `project-${Date.now()}`,
            name: formData.get('projectName'),
            description: formData.get('projectDescription') || '',
            template: formData.get('projectTemplate'),
            port: this.getNextAvailablePort(),
            status: 'creating',
            createdAt: new Date().toISOString(),
            url: null
        };

        // Debug logging to help troubleshoot the issue
        console.log('Form data debug:', {
            name: projectData.name,
            nameType: typeof projectData.name,
            nameLength: projectData.name ? projectData.name.length : 'null',
            trimmedName: projectData.name ? projectData.name.trim() : 'null',
            trimmedLength: projectData.name ? projectData.name.trim().length : 'null'
        });

        // Validate project name (using trimmed version to handle whitespace)
        const trimmedName = projectData.name ? projectData.name.trim() : '';
        if (!trimmedName || trimmedName.length < 2) {
            alert('Project name must be at least 2 characters long');
            return;
        }

        // Update projectData with trimmed name
        projectData.name = trimmedName;

        // Check for duplicate names
        if (this.projectRegistry.some(p => p.name === projectData.name)) {
            alert('A project with this name already exists');
            return;
        }

        this.hideProjectModal();
        
        // Add to registry
        this.projectRegistry.push(projectData);
        this.saveProjectRegistry();
        this.updateProjectsList();
        this.updateSystemStatus();
        
        // Start project creation process
        this.addMessage('ai', `🚀 Creating project "${projectData.name}" with ${projectData.template} template...`);
        
        if (projectData.template === 'custom') {
            this.addMessage('ai', `🤖 Starting AI-powered project setup with 5-question workflow for "${projectData.name}". This will use SuperClaude integration to understand your requirements and generate the perfect codebase.`);
        }
        
        // Simulate project creation
        await this.createProjectInstance(projectData);
    }

    async createProjectInstance(projectData) {
        try {
            // Update status to building
            const project = this.projectRegistry.find(p => p.id === projectData.id);
            project.status = 'building';
            this.saveProjectRegistry();
            this.updateProjectsList();
            
            // Simulate build process
            this.addMessage('ai', `📦 Setting up ${projectData.template} template...`);
            await this.delay(2000);
            
            this.addMessage('ai', `📁 Creating project structure...`);
            await this.delay(1500);
            
            this.addMessage('ai', `📚 Installing dependencies...`);
            await this.delay(3000);
            
            // Update status to ready
            project.status = 'running';
            project.url = `http://localhost:${project.port}`;
            this.saveProjectRegistry();
            this.updateProjectsList();
            this.updateSystemStatus();
            
            this.addMessage('ai', `✅ Project "${projectData.name}" is ready! IDE launching on port ${project.port}...`);
            
            // Auto-launch IDE
            setTimeout(() => {
                this.openProjectIDE(project);
            }, 1000);
            
        } catch (error) {
            console.error('Project creation failed:', error);
            const project = this.projectRegistry.find(p => p.id === projectData.id);
            project.status = 'error';
            this.saveProjectRegistry();
            this.updateProjectsList();
            this.addMessage('ai', `❌ Failed to create project "${projectData.name}". Please try again.`);
        }
    }

    updateProjectsList() {
        const projectsList = document.getElementById('projectsList');
        const noProjects = document.getElementById('noProjects');
        
        if (this.projectRegistry.length === 0) {
            noProjects.style.display = 'flex';
            return;
        }
        
        noProjects.style.display = 'none';
        
        const projectsHTML = this.projectRegistry.map(project => `
            <div class="project-item" data-project-id="${project.id}">
                <div class="project-icon">${this.getProjectIcon(project.template)}</div>
                <div class="project-info">
                    <div class="project-name">${project.name}</div>
                    <div class="project-meta">
                        <span class="project-status">
                            <span class="status-dot ${this.getStatusClass(project.status)}"></span>
                            ${this.getStatusText(project.status)}
                        </span>
                        ${project.status === 'running' ? `<span class="project-port">:${project.port}</span>` : ''}
                    </div>
                </div>
                <div class="project-actions">
                    ${project.status === 'running' ? `
                        <button class="project-action-btn" onclick="coder1.openProjectIDE(coder1.getProject('${project.id}'))" title="Open IDE">
                            <i class="lucide-code"></i>
                        </button>
                        <button class="project-action-btn" onclick="coder1.openProjectURL('${project.url}')" title="Open Preview">
                            <i class="lucide-external-link"></i>
                        </button>
                    ` : ''}
                    <button class="project-action-btn danger" onclick="coder1.deleteProject('${project.id}')" title="Delete Project">
                        <i class="lucide-trash-2"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        projectsList.innerHTML = projectsHTML;
    }

    updateSystemStatus() {
        const runningProjects = this.projectRegistry.filter(p => p.status === 'running').length;
        const activeProjects = this.projectRegistry.length;
        
        document.getElementById('activeProjectsCount').textContent = activeProjects;
        document.getElementById('runningIDEs').textContent = runningProjects;
        document.getElementById('availablePorts').textContent = Math.max(0, 10 - activeProjects);
        
        // Update system status indicator
        const systemStatus = document.getElementById('systemStatus');
        if (activeProjects === 0) {
            systemStatus.className = 'status-dot connected';
        } else if (activeProjects < 5) {
            systemStatus.className = 'status-dot connected';
        } else if (activeProjects < 8) {
            systemStatus.className = 'status-dot warning';
        } else {
            systemStatus.className = 'status-dot error';
        }
    }

    getProject(id) {
        return this.projectRegistry.find(p => p.id === id);
    }

    getProjectIcon(template) {
        const icons = {
            'react-dashboard': '⚛️',
            'nextjs-app': '▲',
            'vue-spa': '💚',
            'express-api': '🚀',
            'custom': '🎯'
        };
        return icons[template] || '📁';
    }

    getStatusClass(status) {
        const classes = {
            'creating': 'warning',
            'building': 'warning',
            'running': 'connected',
            'error': 'error',
            'stopped': 'error'
        };
        return classes[status] || 'error';
    }

    getStatusText(status) {
        const texts = {
            'creating': 'Creating...',
            'building': 'Building...',
            'running': 'Running',
            'error': 'Error',
            'stopped': 'Stopped'
        };
        return texts[status] || 'Unknown';
    }

    openProjectIDE(project) {
        if (!project || project.status !== 'running') {
            this.addMessage('ai', `❌ Project is not ready yet. Current status: ${project?.status || 'Not found'}`);
            return;
        }
        
        this.addMessage('ai', `🚀 Opening IDE for "${project.name}" on port ${project.port}...`);
        
        // Auto-open IDE for the project
        setTimeout(() => {
            this.openIDE();
        }, 1000);
    }

    openProjectURL(url) {
        if (url) {
            window.open(url, '_blank');
        }
    }

    deleteProject(id) {
        const project = this.getProject(id);
        if (!project) return;
        
        if (confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
            this.projectRegistry = this.projectRegistry.filter(p => p.id !== id);
            this.saveProjectRegistry();
            this.updateProjectsList();
            this.updateSystemStatus();
            this.addMessage('ai', `🗑️ Project "${project.name}" has been deleted.`);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async openIDEApplication() {
        console.log('openIDEApplication method called');
        // Use the full IDE interface with sliding panels and React Bits integration
        const terminalIdeUrl = 'http://localhost:3001';
        
        this.addMessage('ai', `🚀 Opening Coder1 IDE with React Bits integration...`);
        console.log('Opening terminal IDE URL:', terminalIdeUrl);
        
        this.addMessage('ai', `✅ IDE Ready! Opening terminal interface...`);
        this.addMessage('ai', `
            <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin: 0.5rem 0; border-left: 4px solid var(--accent-green);">
                <h4 style="margin: 0 0 0.5rem 0; color: var(--accent-green);">🎯 React Bits Integration Active!</h4>
                <p style="margin: 0.5rem 0;">Try these commands in the terminal:</p>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                    <li><code style="background: var(--bg-tertiary); padding: 0.25rem 0.5rem; border-radius: 4px;">/ui create a blue glowing button</code></li>
                    <li><code style="background: var(--bg-tertiary); padding: 0.25rem 0.5rem; border-radius: 4px;">/ui make a large animated card</code></li>
                    <li><code style="background: var(--bg-tertiary); padding: 0.25rem 0.5rem; border-radius: 4px;">/ui build a spinning loader</code></li>
                    <li><code style="background: var(--bg-tertiary); padding: 0.25rem 0.5rem; border-radius: 4px;">/ui create a purple navigation bar</code></li>
                </ul>
                <p style="margin: 0.5rem 0; font-weight: bold;">✨ Features: Natural language parsing, 4 variants per component, TypeScript support!</p>
            </div>
        `);
        this.addMessage('ai', `🔗 <strong>Direct Link:</strong> <a href="${terminalIdeUrl}" target="_blank" style="color: var(--accent-blue); text-decoration: underline;">${terminalIdeUrl}</a>`);
        
        // Force open with cache bypass
        const timestamp = Date.now();
        const urlWithCacheBust = `${terminalIdeUrl}?t=${timestamp}`;
        const newWindow = window.open(urlWithCacheBust, '_blank');
        
        // If popup was blocked, provide alternative
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
            this.addMessage('ai', `⚠️ Popup blocked! Please click the link above or allow popups for this site.`);
        } else {
            this.addMessage('ai', `🎉 IDE opened successfully! Start using /ui commands to generate React components.`);
        }
    }

    smoothScrollToBottom() {
        const targetScroll = this.chatMessages.scrollHeight;
        const startScroll = this.chatMessages.scrollTop;
        const distance = targetScroll - startScroll;
        const duration = 300; // ms
        let start = null;

        const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            
            // Easing function for smooth animation
            const easeOutCubic = progress => 1 - Math.pow(1 - progress, 3);
            
            this.chatMessages.scrollTop = startScroll + distance * easeOutCubic(progress);
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }

    createMagicTransition(callback) {
        // Create simple transition overlay
        const overlay = document.createElement('div');
        overlay.className = 'transition-overlay';
        document.body.appendChild(overlay);

        // Create a few magic particles for effect
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'magic-particle';
                particle.style.left = Math.random() * window.innerWidth + 'px';
                particle.style.top = (window.innerHeight / 2 + Math.random() * 100 - 50) + 'px';
                
                // Random colors for particles
                const colors = ['var(--accent-blue)', 'var(--accent-purple)', 'var(--accent-green)'];
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                
                document.body.appendChild(particle);
                
                // Remove particle after animation
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.remove();
                    }
                }, 1000);
            }, i * 30);
        }

        // Activate overlay
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });

        // Execute callback quickly and cleanup
        setTimeout(() => {
            if (callback) {
                callback();
            }
            
            // Remove overlay after brief display
            setTimeout(() => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.remove();
                    }
                }, 300);
            }, 100);
        }, 400);
    }

    openComponentBrowser() {
        this.addMessage('ai', '🎨 Opening React Bits Component Browser...');
        
        // Create magic transition effect
        this.createMagicTransition(() => {
            // Open component browser in new tab
            const url = '/component-browser.html';
            const popup = window.open(url, '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
            
            if (!popup) {
                this.addMessage('ai', `⚠️ Popup blocked! Please click this link to open the Component Browser: <a href="${url}" target="_blank" style="color: var(--accent-blue); text-decoration: underline;">${url}</a>`);
            } else {
                this.addMessage('ai', `✨ Component Browser opened! Browse 35+ React components organized by category. Use the search and customization features to find the perfect component for your project.`);
            }
        });
    }

    addTemplateTheme(item, template) {
        const themes = {
            'react-dashboard': { color: '#61dafb', rgb: '97, 218, 251' },
            'nextjs-app': { color: '#ffffff', rgb: '255, 255, 255' },
            'vue-spa': { color: '#4fc08d', rgb: '79, 192, 141' },
            'express-api': { color: '#68a063', rgb: '104, 160, 99' },
            'custom': { color: '#bb9af7', rgb: '187, 154, 247' }
        };

        const theme = themes[template] || themes['custom'];
        item.style.setProperty('--template-color', theme.color);
        item.style.setProperty('--template-color-rgb', theme.rgb);
    }

    addMagicClickEffect(element) {
        // Create ripple effect
        const ripple = document.createElement('div');
        ripple.className = 'magic-ripple';
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = '50%';
        ripple.style.top = '50%';
        ripple.style.transform = 'translate(-50%, -50%) scale(0)';
        
        element.appendChild(ripple);
        
        // Animate ripple
        requestAnimationFrame(() => {
            ripple.style.transform = 'translate(-50%, -50%) scale(1)';
            ripple.style.opacity = '0';
        });
        
        // Remove ripple after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    handleV0Action(btn) {
        const action = btn.getAttribute('data-action');
        const actionText = btn.querySelector('span').textContent;
        
        // Add the action as a user message
        this.addMessage('user', `I want to ${actionText.toLowerCase()}`);
        
        // Show typing indicator and respond
        this.showTypingIndicator();
        
        setTimeout(() => {
            this.hideTypingIndicator();
            
            switch (action) {
                case 'clone-screenshot':
                    this.addMessage('ai', `🖼️ I'll help you clone a screenshot into a working interface! Please upload an image or provide a URL to the design you'd like to recreate.`);
                    break;
                case 'import-figma':
                    this.addMessage('ai', `🎨 I can help you convert your Figma design into code! Please share your Figma file URL or export your design assets.`);
                    break;
                case 'upload-project':
                    this.addMessage('ai', `📁 Ready to help you upload and analyze your project! You can drag and drop files or use the attach button to share your codebase.`);
                    this.toggleUploadPanel();
                    break;
                case 'landing-page':
                    this.addMessage('ai', `🚀 Let's create an amazing landing page! I'll need to know about your business, target audience, and desired features. What's your project about?`);
                    break;
                case 'signup-form':
                    this.addMessage('ai', `📝 I'll help you build a professional sign-up form! What fields do you need (email, password, name, etc.) and what's the overall style you're going for?`);
                    break;
                default:
                    this.addMessage('ai', `I'll help you with that! Can you provide more details about what you'd like to build?`);
            }
        }, 1500);
    }

    // Background Animation Methods
    initBackgroundAnimation() {
        this.interactiveGradient = document.getElementById('interactiveGradient');
        if (!this.interactiveGradient) return;
        
        // Start the animation loop
        this.animateBackground();
        
        // Add mouse move listener to the interactive gradient
        this.interactiveGradient.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });
    }

    handleMouseMove(event) {
        if (!this.interactiveGradient) return;
        
        const rect = this.interactiveGradient.getBoundingClientRect();
        this.tgX = event.clientX - rect.left;
        this.tgY = event.clientY - rect.top;
    }

    animateBackground() {
        if (!this.interactiveGradient) return;
        
        // Smooth interpolation for mouse following
        this.curX = this.curX + (this.tgX - this.curX) / 20;
        this.curY = this.curY + (this.tgY - this.curY) / 20;
        
        // Apply transform to interactive gradient
        this.interactiveGradient.style.transform = `translate(${Math.round(this.curX)}px, ${Math.round(this.curY)}px)`;
        
        // Continue animation loop
        requestAnimationFrame(() => this.animateBackground());
    }

    // Attachment Dropdown Methods
    initAttachmentDropdown() {
        const attachTrigger = document.getElementById('attachTrigger');
        const attachDropdown = document.getElementById('attachDropdown');
        const attachMenu = document.getElementById('attachMenu');
        const attachmentBadge = document.getElementById('attachmentBadge');
        const badgeCount = document.getElementById('badgeCount');
        
        console.log('Initializing attachment dropdown...');
        console.log('Attach trigger found:', attachTrigger);
        console.log('Attach dropdown found:', attachDropdown);
        console.log('Attach menu found:', attachMenu);
        
        this.attachments = [];
        
        if (!attachTrigger || !attachDropdown || !attachMenu) {
            console.error('Attachment dropdown elements not found!');
            return;
        }
        
        // Toggle dropdown on trigger click
        attachTrigger.addEventListener('click', (e) => {
            console.log('Attachment trigger clicked!');
            e.stopPropagation();
            this.toggleAttachmentDropdown();
        });
        
        // Handle attachment option clicks
        const attachOptions = attachMenu.querySelectorAll('.v0-attach-option');
        attachOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAttachmentOption(option.dataset.type);
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!attachDropdown.contains(e.target)) {
                this.closeAttachmentDropdown();
            }
        });
        
        // Close dropdown on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAttachmentDropdown();
            }
        });
    }
    
    toggleAttachmentDropdown() {
        console.log('toggleAttachmentDropdown called');
        const attachDropdown = document.getElementById('attachDropdown');
        if (attachDropdown) {
            console.log('Toggling dropdown, current classes:', attachDropdown.className);
            attachDropdown.classList.toggle('active');
            console.log('After toggle, classes:', attachDropdown.className);
        } else {
            console.error('attachDropdown element not found in toggle function');
        }
    }
    
    closeAttachmentDropdown() {
        const attachDropdown = document.getElementById('attachDropdown');
        if (attachDropdown) {
            attachDropdown.classList.remove('active');
        }
    }
    
    handleAttachmentOption(type) {
        this.closeAttachmentDropdown();
        
        switch(type) {
            case 'file':
                this.handleFileUpload();
                break;
            case 'url':
                this.handleUrlInput();
                break;
            case 'image':
                this.handleImageUpload();
                break;
        }
    }
    
    handleFileUpload() {
        // Create file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = '.txt,.md,.json,.js,.py,.css,.html,.pdf,.doc,.docx';
        
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                this.addAttachment({
                    type: 'file',
                    name: file.name,
                    size: file.size,
                    file: file
                });
            });
        });
        
        fileInput.click();
    }
    
    handleUrlInput() {
        const url = prompt('Enter URL:');
        if (url && this.isValidUrl(url)) {
            this.addAttachment({
                type: 'url',
                name: url,
                url: url
            });
        } else if (url) {
            alert('Please enter a valid URL');
        }
    }
    
    handleImageUpload() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'image/*';
        
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                this.addAttachment({
                    type: 'image',
                    name: file.name,
                    size: file.size,
                    file: file
                });
            });
        });
        
        fileInput.click();
    }
    
    addAttachment(attachment) {
        this.attachments.push(attachment);
        this.updateAttachmentBadge();
        console.log('Attachment added:', attachment);
    }
    
    updateAttachmentBadge() {
        const attachmentBadge = document.getElementById('attachmentBadge');
        const badgeCount = document.getElementById('badgeCount');
        
        if (this.attachments.length > 0) {
            attachmentBadge.style.display = 'block';
            badgeCount.textContent = this.attachments.length;
        } else {
            attachmentBadge.style.display = 'none';
        }
    }
    
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
}

// Initialize the interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.coder1 = new Coder1Interface();
});

// CSS for typing indicator and additional styles
const additionalStyles = `
<style>
.typing-dots {
    display: flex;
    gap: 4px;
    padding: 8px 0;
}

.typing-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-blue);
    animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes typing {
    0%, 60%, 100% {
        transform: translateY(0);
    }
    30% {
        transform: translateY(-10px);
    }
}

.build-workflow {
    background: var(--bg-secondary);
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid var(--accent-blue);
}

.build-workflow h4 {
    color: var(--accent-blue);
    margin-bottom: 0.5rem;
}

.build-workflow ol {
    margin: 1rem 0;
    padding-left: 1.5rem;
}

.build-workflow li {
    margin-bottom: 0.5rem;
}

.action-buttons {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
}

.action-buttons .action-btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
}

.action-buttons .action-btn:hover {
    background: var(--bg-secondary);
    border-color: var(--accent-blue);
}

.action-buttons .action-btn.primary {
    background: var(--accent-blue);
    color: white;
    border-color: var(--accent-blue);
}

.question-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
}

.option-btn {
    padding: 0.75rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
}

.option-btn:hover {
    background: var(--bg-secondary);
    border-color: var(--accent-blue);
}

.help-content, .settings-content {
    background: var(--bg-secondary);
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid var(--accent-green);
}

.help-content h4, .settings-content h4 {
    color: var(--accent-green);
    margin-bottom: 0.5rem;
}

.help-content ul, .settings-content ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
}

.questionnaire-start {
    background: var(--bg-secondary);
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid var(--accent-purple);
}

.questionnaire-start h4 {
    color: var(--accent-purple);
    margin-bottom: 0.5rem;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);