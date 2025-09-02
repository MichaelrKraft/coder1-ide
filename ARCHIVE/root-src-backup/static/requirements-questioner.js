/**
 * Requirements Questioner Frontend
 * 
 * Interactive interface for gathering project requirements
 * through intelligent questioning
 */

class RequirementsQuestioner {
    constructor() {
        this.currentSession = null;
        this.questions = [];
        this.answers = [];
        this.currentQuestionIndex = 0;
        
        this.init();
    }

    init() {
        // Override the default send message to intercept potential build requests
        this.interceptBuildRequests();
        
        console.log('🤔 Requirements questioner initialized');
    }

    /**
     * Intercept messages that might be build requests
     */
    interceptBuildRequests() {
        const originalSendMessage = window.coder1Interface?.sendMessage;
        if (!originalSendMessage) return;

        window.coder1Interface.sendMessage = async function() {
            const message = this.messageInput.value.trim();
            
            // Check if this looks like a build request
            if (window.requirementsQuestioner.shouldTriggerQuestioning(message)) {
                // Trigger questioning instead of immediate build
                await window.requirementsQuestioner.startQuestioningProcess(message);
                return;
            }
            
            // Otherwise, proceed with normal message sending
            return originalSendMessage.call(this);
        };
    }

    /**
     * Determine if message should trigger questioning
     */
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
        // 2. Is a substantial request (more than 5 words) AND  
        // 3. Doesn't already contain detailed specifications
        const hasKeywords = buildKeywords.some(keyword => lowercaseMessage.includes(keyword));
        const isSubstantial = wordCount >= 5;
        const lacksDetail = wordCount < 30; // If it's already very detailed, skip questioning

        return hasKeywords && isSubstantial && lacksDetail;
    }

    /**
     * Start the questioning process
     */
    async startQuestioningProcess(originalRequest) {
        try {
            console.log('🤔 Starting requirements gathering for:', originalRequest);

            // Show that we're analyzing
            this.showAnalyzingMessage(originalRequest);

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

            if (!response.ok) {
                throw new Error('Failed to analyze requirements');
            }

            const data = await response.json();
            
            if (data.success) {
                this.startQuestioningSession(originalRequest, data.data);
            } else {
                throw new Error(data.error || 'Analysis failed');
            }

        } catch (error) {
            console.error('Requirements analysis failed:', error);
            this.showErrorMessage('Failed to analyze requirements. Proceeding with original request...');
            
            // Fall back to normal build process
            this.proceedWithOriginalRequest(originalRequest);
        }
    }

    /**
     * Show analyzing message in chat
     */
    showAnalyzingMessage(request) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        // Add user message
        this.addChatMessage('user', request);

        // Add analyzing message
        this.addChatMessage('assistant', `🤔 I'd like to ask a few questions to build you the perfect website! Let me analyze your request first...`, true);
    }

    /**
     * Start interactive questioning session
     */
    startQuestioningSession(originalRequest, analysisData) {
        console.log('🔍 Starting questioning session with data:', analysisData);
        
        this.currentSession = {
            originalRequest,
            analysis: analysisData.analysis,
            projectType: analysisData.projectType,
            questions: analysisData.questions,
            answers: new Array(analysisData.questions.length).fill(''),
            startTime: Date.now()
        };

        this.currentQuestionIndex = 0;
        
        console.log('📋 Session created with questions:', this.currentSession.questions);
        
        // Show introduction message
        this.showQuestioningIntroduction();
        
        // Start questioning
        this.askNextQuestion();
    }

    /**
     * Show introduction to questioning process
     */
    showQuestioningIntroduction() {
        const { analysis, projectType, questions } = this.currentSession;
        
        let introMessage = `Great! I can see you want to build a **${projectType}** with a **${analysis.complexity}** level of complexity.\n\n`;
        introMessage += `To create the perfect website for you, I have **${Math.min(questions.length, 5)}** quick questions. This will help me:\n`;
        introMessage += `• 🎯 Understand your specific needs\n`;
        introMessage += `• 🎨 Match your style preferences\n`;
        introMessage += `• ⚙️ Include the right functionality\n`;
        introMessage += `• 📱 Optimize for your audience\n\n`;
        introMessage += `Ready? Let's make your website amazing! ✨`;

        this.addChatMessage('assistant', introMessage);
        
        // Add questioning interface
        this.createQuestioningInterface();
    }

    /**
     * Create the questioning interface
     */
    createQuestioningInterface() {
        console.log('🎯 Creating questioning interface in main display area');
        
        // Use main display area instead of chat
        const mainDisplaySection = document.getElementById('mainDisplaySection');
        const mainDisplayTitle = document.getElementById('mainDisplayTitle');
        const mainDisplayContent = document.getElementById('mainDisplayContent');
        
        console.log('🔍 Main display elements:', { mainDisplaySection, mainDisplayTitle, mainDisplayContent });
        
        if (!mainDisplaySection || !mainDisplayTitle || !mainDisplayContent) {
            console.error('❌ Main display elements not found!');
            return;
        }

        // Show the main display area
        mainDisplaySection.style.display = 'block';
        mainDisplayTitle.textContent = 'Project Requirements';
        
        console.log('✅ Main display area shown with title "Project Requirements"');

        const questioningContainer = document.createElement('div');
        questioningContainer.className = 'questioning-container';
        questioningContainer.id = 'questioningContainer';
        
        questioningContainer.innerHTML = `
            <div class="questioning-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="questionProgress"></div>
                </div>
                <span class="progress-text" id="progressText">Question 0 of ${this.currentSession.questions.length}</span>
            </div>
            
            <div class="current-question" id="currentQuestion">
                <!-- Question will be inserted here -->
            </div>
            
            <div class="question-input">
                <textarea 
                    id="answerInput" 
                    placeholder="Type your answer here..." 
                    rows="3"
                ></textarea>
                <div class="question-controls">
                    <div class="control-left">
                        <button id="backQuestion" class="btn secondary" disabled>
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                    </div>
                    <div class="control-right">
                        <button id="skipQuestion" class="btn secondary">
                            <i class="fas fa-forward"></i> Skip
                        </button>
                        <button id="nextQuestion" class="btn primary">
                            Next <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="questioning-actions">
                <button id="finishEarly" class="btn secondary">I'm ready to build</button>
                <button id="cancelQuestioning" class="btn danger">Cancel</button>
            </div>
        `;

        // Add styles if not already present
        if (!document.getElementById('questioning-styles')) {
            this.addQuestioningStyles();
        }

        mainDisplayContent.innerHTML = '';
        mainDisplayContent.appendChild(questioningContainer);
        
        // Add event listeners
        this.setupQuestioningEventListeners();
        
        // Override close button to handle questioning cancellation
        this.setupCloseButtonHandler();
        
        // Scroll to main display area
        mainDisplaySection.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Add CSS styles for questioning interface
     */
    addQuestioningStyles() {
        const styles = document.createElement('style');
        styles.id = 'questioning-styles';
        styles.textContent = `
            .questioning-container {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 20px;
                margin: 16px 0;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .questioning-progress {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .progress-bar {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #007bff, #00d4ff);
                border-radius: 3px;
                transition: width 0.3s ease;
                width: 0%;
            }
            
            .progress-text {
                color: #888;
                font-size: 14px;
                white-space: nowrap;
            }
            
            .current-question {
                background: rgba(0, 123, 255, 0.1);
                border-left: 4px solid #007bff;
                padding: 16px;
                border-radius: 8px;
                margin: 16px 0;
            }
            
            .question-text {
                font-size: 16px;
                font-weight: 500;
                color: #fff;
                margin-bottom: 8px;
            }
            
            .question-category {
                font-size: 12px;
                color: #007bff;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .question-input textarea {
                width: 100%;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                padding: 12px;
                color: #fff;
                font-family: inherit;
                font-size: 14px;
                resize: vertical;
                min-height: 80px;
            }
            
            .question-input textarea:focus {
                outline: none;
                border-color: #007bff;
                background: rgba(255, 255, 255, 0.08);
            }
            
            .question-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 12px;
            }
            
            .control-left {
                display: flex;
                gap: 8px;
            }
            
            .control-right {
                display: flex;
                gap: 8px;
            }
            
            .questioning-actions {
                display: flex;
                gap: 12px;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                justify-content: center;
            }
            
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            
            .btn.primary {
                background: #007bff;
                color: white;
            }
            
            .btn.primary:hover {
                background: #0056b3;
            }
            
            .btn.secondary {
                background: rgba(255, 255, 255, 0.1);
                color: #ccc;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .btn.secondary:hover {
                background: rgba(255, 255, 255, 0.15);
            }
            
            .btn.danger {
                background: rgba(220, 53, 69, 0.2);
                color: #ff6b7a;
                border: 1px solid rgba(220, 53, 69, 0.3);
            }
            
            .btn.danger:hover {
                background: rgba(220, 53, 69, 0.3);
            }
            
            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                pointer-events: none;
            }
            
            .btn.secondary:disabled {
                background: rgba(255, 255, 255, 0.05);
                color: #666;
                border-color: rgba(255, 255, 255, 0.1);
            }
            
            .btn i {
                margin: 0 4px;
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Setup event listeners for questioning interface
     */
    setupQuestioningEventListeners() {
        const answerInput = document.getElementById('answerInput');
        const backButton = document.getElementById('backQuestion');
        const nextButton = document.getElementById('nextQuestion');
        const skipButton = document.getElementById('skipQuestion');
        const finishButton = document.getElementById('finishEarly');
        const cancelButton = document.getElementById('cancelQuestioning');

        console.log('🔗 Setting up questioning event listeners...');
        console.log('📋 Elements found:', { answerInput, backButton, nextButton, skipButton, finishButton, cancelButton });

        if (answerInput) {
            answerInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleNextQuestion();
                } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
                    e.preventDefault();
                    this.handleBackQuestion();
                } else if (e.key === 'ArrowRight' && e.ctrlKey) {
                    e.preventDefault();
                    this.handleSkipQuestion();
                }
            });
        }

        if (backButton) {
            backButton.addEventListener('click', () => {
                console.log('◀️ Back button clicked');
                this.handleBackQuestion();
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                console.log('▶️ Next button clicked');
                this.handleNextQuestion();
            });
        }

        if (skipButton) {
            skipButton.addEventListener('click', () => {
                console.log('⏭️ Skip button clicked');
                this.handleSkipQuestion();
            });
        }

        if (finishButton) {
            finishButton.addEventListener('click', () => {
                console.log('🏁 Finish button clicked');
                this.handleFinishEarly();
            });
        }

        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                console.log('❌ Cancel button clicked');
                this.handleCancel();
            });
        }
    }

    /**
     * Setup close button handler to cancel questioning
     */
    setupCloseButtonHandler() {
        const closeButton = document.getElementById('closeMainDisplay');
        if (closeButton && this.currentSession) {
            // Store original handler
            this.originalCloseHandler = closeButton.onclick;
            
            // Override with questioning cancellation
            closeButton.onclick = () => {
                this.handleCancel();
            };
        }
    }

    /**
     * Ask the next question
     */
    askNextQuestion() {
        if (this.currentQuestionIndex >= this.currentSession.questions.length) {
            this.finishQuestioning();
            return;
        }

        const question = this.currentSession.questions[this.currentQuestionIndex];
        
        // Update progress
        this.updateProgress();
        
        // Update button states
        this.updateNavigationButtons();
        
        // Show question
        this.displayQuestion(question);
        
        // Focus on input
        setTimeout(() => {
            const answerInput = document.getElementById('answerInput');
            if (answerInput) {
                answerInput.focus();
            }
        }, 100);
    }

    /**
     * Update progress indicator
     */
    updateProgress() {
        const progressFill = document.getElementById('questionProgress');
        const progressText = document.getElementById('progressText');
        
        const percentage = (this.currentQuestionIndex / this.currentSession.questions.length) * 100;
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `Question ${this.currentQuestionIndex + 1} of ${this.currentSession.questions.length}`;
        }
    }

    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        const backButton = document.getElementById('backQuestion');
        const nextButton = document.getElementById('nextQuestion');
        
        // Back button should be disabled on first question
        if (backButton) {
            backButton.disabled = this.currentQuestionIndex === 0;
        }
        
        // Update next button text for last question
        if (nextButton) {
            const isLastQuestion = this.currentQuestionIndex === this.currentSession.questions.length - 1;
            nextButton.innerHTML = isLastQuestion 
                ? 'Finish <i class="fas fa-check"></i>' 
                : 'Next <i class="fas fa-arrow-right"></i>';
        }
    }

    /**
     * Display current question
     */
    displayQuestion(question) {
        const questionContainer = document.getElementById('currentQuestion');
        if (!questionContainer) return;

        questionContainer.innerHTML = `
            <div class="question-category">${question.category.replace('_', ' ')}</div>
            <div class="question-text">${question.question}</div>
        `;

        // Clear previous answer
        const answerInput = document.getElementById('answerInput');
        if (answerInput) {
            answerInput.value = this.currentSession.answers[this.currentQuestionIndex] || '';
        }
    }

    /**
     * Handle back question click
     */
    handleBackQuestion() {
        if (this.currentQuestionIndex > 0) {
            // Save current answer before going back
            const answerInput = document.getElementById('answerInput');
            const answer = answerInput ? answerInput.value.trim() : '';
            this.currentSession.answers[this.currentQuestionIndex] = answer;
            
            // Move to previous question
            this.currentQuestionIndex--;
            this.askNextQuestion();
        }
    }

    /**
     * Handle next question click
     */
    handleNextQuestion() {
        const answerInput = document.getElementById('answerInput');
        const answer = answerInput ? answerInput.value.trim() : '';
        
        // Save answer
        this.currentSession.answers[this.currentQuestionIndex] = answer;
        
        // Move to next question
        this.currentQuestionIndex++;
        this.askNextQuestion();
    }

    /**
     * Handle skip question
     */
    handleSkipQuestion() {
        this.currentSession.answers[this.currentQuestionIndex] = '';
        this.currentQuestionIndex++;
        this.askNextQuestion();
    }

    /**
     * Handle finish early
     */
    handleFinishEarly() {
        console.log('🏁 Finish early button clicked');
        this.finishQuestioning();
    }

    /**
     * Handle cancel questioning
     */
    handleCancel() {
        this.removeQuestioningInterface();
        this.addChatMessage('assistant', 'No problem! Let me build your website with the original request.');
        this.proceedWithOriginalRequest(this.currentSession.originalRequest);
    }

    /**
     * Finish questioning and proceed with enhanced build
     */
    async finishQuestioning() {
        try {
            console.log('🏁 Starting finish questioning process...');
            console.log('📋 Current session data:', this.currentSession);
            
            if (!this.currentSession) {
                console.error('❌ No current session found - cannot finish questioning');
                this.addChatMessage('assistant', 'Sorry, there was an issue with the questioning session. Please try again.');
                return;
            }
            
            console.log('📝 Session answers:', this.currentSession.answers);
            
            this.addChatMessage('assistant', '✨ Perfect! Let me create your enhanced website with all this great information...');
            
            // Store session data before removing interface
            const sessionData = {
                originalRequest: this.currentSession.originalRequest,
                questions: this.currentSession.questions,
                answers: this.currentSession.answers,
                analysis: this.currentSession.analysis
            };
            
            // Remove questioning interface
            this.removeQuestioningInterface();
            
            // Generate enhanced brief
            console.log('🌐 Calling generate-enhanced-brief API...');
            const response = await fetch('/api/agent/generate-enhanced-brief', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });

            console.log('📡 API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API error response:', errorText);
                throw new Error(`Failed to generate enhanced brief: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log('📊 API response data:', data);
            
            if (data.success) {
                // Proceed with enhanced build
                console.log('🚀 Proceeding with enhanced build...');
                this.proceedWithEnhancedBuild(data.data);
            } else {
                throw new Error(data.error || 'Unknown API error');
            }

        } catch (error) {
            console.error('❌ Failed to finish questioning:', error);
            this.addChatMessage('assistant', 'I had trouble processing your answers, but I\'ll build your website with the information I have!');
            
            // Create a simple enhanced prompt from the stored session data or current session
            const enhancedPrompt = typeof sessionData !== 'undefined' 
                ? this.createSimpleEnhancedPromptFromData(sessionData)
                : this.createSimpleEnhancedPrompt();
            this.proceedWithSimpleRequest(enhancedPrompt);
        }
    }

    /**
     * Proceed with enhanced build using gathered requirements (REAL AUTONOMOUS BUILDING)
     */
    async proceedWithEnhancedBuild(enhancedBrief) {
        try {
            console.log('🚀 Starting REAL autonomous build with gathered requirements');
            console.log('📝 Enhanced brief:', enhancedBrief.enhancedPrompt);

            // Show building status
            this.addChatMessage('assistant', '🚀 Starting autonomous build process...\n\nThis will create a real project with actual files, and optionally deploy to a live URL!');
            
            // Call the REAL autonomous building API
            const response = await fetch('/api/agent/tasks/build-autonomous', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    enhancedBrief: enhancedBrief.enhancedPrompt,
                    options: {
                        strategy: 'hybrid', // Try Claude Code CLI first, fallback to generator
                        createGitHubRepo: true, // Will only work if GitHub token is configured
                        deploy: true, // Will only work if deployment tokens are configured
                        deploymentPlatform: 'vercel',
                        privateRepo: false,
                        enableGitHubPages: true
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Real autonomous build response:', data);
                this.handleRealBuildResponse(data);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Build request failed');
            }

        } catch (error) {
            console.error('❌ Real autonomous build failed:', error);
            this.addChatMessage('assistant', `❌ Build failed: ${error.message}\n\nDon't worry - your requirements are saved! Try again or check the setup guide.`);
        }
    }

    /**
     * Proceed with original request (fallback)
     */
    async proceedWithOriginalRequest(originalRequest) {
        // Use the original Coder1 message sending
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = originalRequest;
            
            // Call original send function
            const originalSendMessage = window.coder1Interface?.constructor.prototype.sendMessage;
            if (originalSendMessage) {
                await originalSendMessage.call(window.coder1Interface);
            }
        }
    }

    /**
     * Handle real autonomous build response and show detailed results
     */
    handleRealBuildResponse(data) {
        console.log('🚀 handleRealBuildResponse called with data:', data);
        
        if (data.success) {
            const buildResults = data.results;
            const buildId = data.buildId;
            const summary = buildResults.summary;
            
            // Create detailed success message
            let message = `✅ **Autonomous Build Completed Successfully!**\n\n`;
            message += `🆔 **Build ID:** ${buildId}\n`;
            message += `⏱️ **Duration:** ${summary.duration}ms\n`;
            message += `🔧 **Strategy:** ${summary.strategy}\n`;
            message += `📊 **Framework:** ${summary.metrics.framework}\n`;
            message += `📁 **Files Created:** ${summary.metrics.filesCreated}\n\n`;
            
            // Show which components worked
            message += `**Build Components:**\n`;
            message += `${summary.components.projectGeneration ? '✅' : '❌'} Project Generation\n`;
            message += `${summary.components.githubRepository ? '✅' : '❌'} GitHub Repository\n`;
            message += `${summary.components.deployment ? '✅' : '❌'} Deployment\n\n`;
            
            // Add next steps
            if (summary.components.projectGeneration) {
                message += `🎉 **Your project has been created!**\n`;
                message += `📂 Project files are ready in the \`projects/\` directory\n`;
                
                if (summary.components.deployment && summary.metrics.deploymentPlatform !== 'none') {
                    message += `🌐 **Live URL:** Coming soon (deployment configured for ${summary.metrics.deploymentPlatform})\n`;
                }
                
                if (summary.components.githubRepository) {
                    message += `📦 **GitHub:** Repository created and initialized\n`;
                } else {
                    message += `💡 **Tip:** Add \`GITHUB_TOKEN\` to your environment to enable automatic repository creation\n`;
                }
                
                message += `\n🚀 **Ready to use:** Your project is ready for development!`;
            }
            
            this.addChatMessage('assistant', message);
            
            // Update task counters
            this.updateTaskCountersDirectly();
            
        } else {
            this.addChatMessage('assistant', `❌ **Autonomous Build Failed**\n\n${data.error || 'Unknown error occurred'}\n\nDon't worry - your requirements are saved! You can try again or check the logs for more details.`);
        }
    }

    /**
     * Handle build response and show appropriate message (Legacy demo mode)
     */
    handleBuildResponse(data) {
        console.log('🎯 handleBuildResponse called with data:', data);
        
        if (data.success) {
            const taskId = data.data.taskId || data.data.buildSessionId;
            const isWebsiteBuild = data.data.websiteBuild || data.data.autonomousBuild;
            
            if (isWebsiteBuild) {
                this.addChatMessage('assistant', `🚀 ${data.data.message}\n\n📋 Task ID: ${taskId}\n\nI'm now building your website with all the requirements we discussed. Watch the terminal for live progress!`);
                
                // Trigger terminal simulation for demo mode
                console.log('🖥️ Checking terminal availability...', {
                    embeddedTerminal: !!window.embeddedTerminal,
                    isConnected: window.embeddedTerminal ? window.embeddedTerminal.isConnected : false
                });
                
                // Try to trigger terminal simulation with retry mechanism
                this.triggerTerminalSimulation();
            } else {
                this.addChatMessage('assistant', `✅ ${data.data.message}\n\n📋 Task ID: ${taskId}`);
            }
            
            // Update task counters after successful task creation
            console.log('🔍 Checking for coder1Interface...', {
                windowExists: !!window.coder1Interface,
                methodExists: !!(window.coder1Interface && window.coder1Interface.updateTaskCounters),
                windowKeys: window.coder1Interface ? Object.keys(window.coder1Interface) : 'none'
            });
            
            // Try to update counters directly
            console.log('🔄 Attempting direct task counter update...');
            this.updateTaskCountersDirectly();
            
            // Also update main interface counters if available
            if (window.coder1Interface && window.coder1Interface.updateTaskCounters) {
                setTimeout(() => window.coder1Interface.updateTaskCounters(), 1000);
            }
        } else {
            this.addChatMessage('assistant', `❌ Build failed: ${data.error}`);
        }
    }

    /**
     * Remove questioning interface
     */
    removeQuestioningInterface() {
        const container = document.getElementById('questioningContainer');
        if (container) {
            container.remove();
        }
        
        // Restore original close button handler
        const closeButton = document.getElementById('closeMainDisplay');
        if (closeButton && this.originalCloseHandler) {
            closeButton.onclick = this.originalCloseHandler;
        }
        
        // Hide main display area
        const mainDisplaySection = document.getElementById('mainDisplaySection');
        if (mainDisplaySection) {
            mainDisplaySection.style.display = 'none';
        }
        
        // Clear current session
        this.currentSession = null;
    }

    /**
     * Create a simple enhanced prompt from answers
     */
    createSimpleEnhancedPrompt() {
        if (!this.currentSession) {
            return "Build a basic website";
        }

        let enhanced = `${this.currentSession.originalRequest}\n\nAdditional Requirements:\n`;
        
        this.currentSession.answers.forEach((answer, index) => {
            if (answer && answer.trim()) {
                const question = this.currentSession.questions[index];
                enhanced += `• ${question.question}\n  Answer: ${answer.trim()}\n\n`;
            }
        });

        return enhanced;
    }

    /**
     * Create a simple enhanced prompt from session data
     */
    createSimpleEnhancedPromptFromData(sessionData) {
        if (!sessionData || !sessionData.originalRequest) {
            return "Build a basic website";
        }

        let enhanced = `${sessionData.originalRequest}\n\nAdditional Requirements:\n`;
        
        if (sessionData.answers && sessionData.questions) {
            sessionData.answers.forEach((answer, index) => {
                if (answer && answer.trim()) {
                    const question = sessionData.questions[index];
                    if (question) {
                        enhanced += `• ${question.question}\n  Answer: ${answer.trim()}\n\n`;
                    }
                }
            });
        }

        return enhanced;
    }

    /**
     * Proceed with simple request (fallback)
     */
    async proceedWithSimpleRequest(enhancedPrompt) {
        try {
            const response = await fetch('/api/agent/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: enhancedPrompt,
                    autoExecute: true,
                    priority: 'high',
                    websiteBuild: true // CRITICAL: This flag triggers autonomous build simulation
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.handleBuildResponse(data);
            } else {
                throw new Error('Simple build request failed');
            }

        } catch (error) {
            console.error('Simple build failed:', error);
            this.addChatMessage('assistant', 'Build request failed. Please try again or contact support.');
        }
    }

    /**
     * Update task counters directly (when coder1Interface is not available)
     */
    async updateTaskCountersDirectly() {
        try {
            console.log('🔄 Direct updateTaskCounters() called...');
            const response = await fetch('/api/agent/tasks');
            const data = await response.json();
            
            console.log('📡 Direct Task API response:', data);
            
            if (data.success) {
                // Be more specific about which status items to target
                const pendingElement = document.querySelector('[data-action="show-pending-tasks"] .status-value');
                const activeElement = document.querySelector('[data-action="show-active-tasks"] .status-value');
                const completedElement = document.querySelector('[data-action="show-completed-tasks"] .status-value');
                
                console.log('🎯 Direct found specific elements:', {
                    pending: pendingElement,
                    active: activeElement,
                    completed: completedElement
                });
                
                if (pendingElement && activeElement && completedElement) {
                    // Count tasks from the main tasks array since that's where they actually are
                    const allTasks = data.data.tasks || [];
                    const pendingCount = allTasks.filter(task => task.status === 'pending').length;
                    const activeCount = allTasks.filter(task => task.status === 'in_progress' || task.status === 'building').length;
                    const completedCount = allTasks.filter(task => task.status === 'completed').length;
                    
                    // DEBUG: Log the actual counts
                    console.log('🔢 Direct Task Counter Update:', {
                        pending: pendingCount,
                        active: activeCount,
                        completed: completedCount
                    });
                    
                    console.log('📝 Direct updating specific DOM elements...');
                    pendingElement.textContent = pendingCount;
                    activeElement.textContent = activeCount;
                    completedElement.textContent = completedCount;
                    
                    console.log('✅ Direct DOM elements updated:', {
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
                            console.log('🔍 Direct auto-expanded project status section due to active tasks');
                        }
                    }
                } else {
                    console.error('❌ Direct: Could not find specific status elements to update');
                }
            } else {
                console.error('❌ Direct API returned success: false');
            }
        } catch (error) {
            console.error('❌ Direct task counter update failed:', error);
        }
    }

    /**
     * Trigger terminal simulation with retry mechanism
     */
    triggerTerminalSimulation() {
        let retryCount = 0;
        const maxRetries = 10;
        const retryInterval = 500; // 500ms
        
        const attemptSimulation = () => {
            console.log(`🔄 Attempting terminal simulation (try ${retryCount + 1}/${maxRetries})`);
            
            if (window.embeddedTerminal) {
                console.log('🚀 Starting terminal build simulation...');
                const description = this.currentSession ? this.currentSession.originalRequest : 'Building your website';
                
                // Force terminal to show if not already visible
                if (!window.embeddedTerminal.isVisible) {
                    console.log('📺 Showing terminal...');
                    window.embeddedTerminal.showTerminal();
                }
                
                // Always trigger simulation in demo mode
                setTimeout(() => {
                    window.embeddedTerminal.startAutonomousBuildSimulation(description);
                }, 1000);
                
                return true; // Success
            } else {
                retryCount++;
                if (retryCount < maxRetries) {
                    console.log(`⏳ Terminal not available yet, retrying in ${retryInterval}ms...`);
                    setTimeout(attemptSimulation, retryInterval);
                } else {
                    console.warn('⚠️ Terminal not available after maximum retries');
                }
                return false;
            }
        };
        
        // Start immediately, then retry if needed
        setTimeout(attemptSimulation, 1000);
    }

    /**
     * Add message to chat
     */
    addChatMessage(type, content, typing = false) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${type === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-content">
                ${typing ? '<div class="typing-indicator">...</div>' : ''}
                <div class="message-text" style="display: ${typing ? 'none' : 'block'}">
                    ${content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
                </div>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Simulate typing effect
        if (typing) {
            setTimeout(() => {
                const typingDiv = messageDiv.querySelector('.typing-indicator');
                const textDiv = messageDiv.querySelector('.message-text');
                if (typingDiv && textDiv) {
                    typingDiv.style.display = 'none';
                    textDiv.style.display = 'block';
                }
            }, 1500);
        }
    }
}

// Initialize when DOM is ready - with retry mechanism
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 DEBUG: RequirementsQuestioner script loaded with debug logging enabled');
    
    const initializeQuestioner = () => {
        if (window.coder1Interface) {
            window.requirementsQuestioner = new RequirementsQuestioner();
            console.log('🔧 DEBUG: RequirementsQuestioner initialized');
            return true;
        } else {
            console.log('🔧 DEBUG: coder1Interface not available yet, retrying...');
            return false;
        }
    };
    
    // Try immediately
    if (!initializeQuestioner()) {
        // If not available, retry every 100ms up to 50 times (5 seconds)
        let retries = 0;
        const retryInterval = setInterval(() => {
            if (initializeQuestioner() || retries++ > 50) {
                clearInterval(retryInterval);
                if (retries > 50) {
                    console.error('🔧 DEBUG: RequirementsQuestioner failed to initialize - coder1Interface not found');
                }
            }
        }, 100);
    }
});

// Make the class available globally
window.RequirementsQuestioner = RequirementsQuestioner;