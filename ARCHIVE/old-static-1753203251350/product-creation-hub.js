/**
 * Product Creation Hub - Frontend Controller
 * Integrates with backend services for Smart PRD & Wireframe Generator
 */

class ProductCreationHub {
    constructor() {
        console.log('🚀 ProductCreationHub constructor called');
        this.currentProject = null;
        this.currentStep = 1;
        this.sessionId = this.generateSessionId();
        this.questions = [];
        this.answers = [];
        this.waitingForAnswer = false;
        this.prdDocument = null;
        this.wireframes = null;
        this.marketInsights = null;
        this.projectIntelligence = null;
        this.eventListenersInitialized = false;
        this.isProcessing = false;
        
        console.log('🔧 Initial state:', {
            sessionId: this.sessionId,
            currentProject: this.currentProject,
            waitingForAnswer: this.waitingForAnswer,
            currentStep: this.currentStep
        });
        
        this.initializeEventListeners();
        this.initializeAnalytics();
        this.loadExistingProject();
        
        // Make clearProject available globally for debugging
        window.clearProject = () => {
            localStorage.removeItem('currentProjectId');
            localStorage.removeItem('currentProject');
            location.reload();
        };
        
        // Add test function to debug from console
        window.testSendMessage = () => {
            console.log('🧪 Test function called');
            console.log('📊 Current state:', {
                currentProject: this.currentProject,
                waitingForAnswer: this.waitingForAnswer,
                answers: this.answers,
                questions: this.questions
            });
            this.sendMessage();
        };
        
        // Add simple test for questions
        window.testQuestions = () => {
            console.log('🧪 Testing questions directly...');
            
            // Test 1: Can we get questions?
            const questions = this.getDefaultQuestions();
            console.log('✅ Questions retrieved:', questions);
            
            // Test 2: Can we add a message to chat?
            try {
                this.addMessageToChat('TEST: This is a test message', 'assistant');
                console.log('✅ addMessageToChat works');
            } catch (error) {
                console.error('❌ addMessageToChat failed:', error);
            }
            
            // Test 3: Can we set project and ask question?
            try {
                this.currentProject = { id: 'test', originalRequest: 'test project' };
                this.questions = questions;
                this.answers = [];
                this.waitingForAnswer = true;
                this.addMessageToChat('TEST QUESTION: What is your target audience?', 'assistant');
                console.log('✅ Full question flow test completed');
                console.log('📊 State after test:', {
                    currentProject: !!this.currentProject,
                    waitingForAnswer: this.waitingForAnswer,
                    questionsLength: this.questions.length
                });
            } catch (error) {
                console.error('❌ Question flow test failed:', error);
            }
        };
        
        // Add direct function access for debugging
        window.debugHub = this;
        
        // Add debug state function
        window.debugState = () => {
            console.log('🔍 Current Hub State:', {
                waitingForAnswer: this.waitingForAnswer,
                currentProject: !!this.currentProject,
                currentStep: this.currentStep,
                questionsLength: this.questions.length,
                answersLength: this.answers.length,
                eventListenersInitialized: this.eventListenersInitialized
            });
            return {
                waitingForAnswer: this.waitingForAnswer,
                currentProject: !!this.currentProject,
                currentStep: this.currentStep,
                questionsLength: this.questions.length,
                answersLength: this.answers.length
            };
        };
        
        // Add manual question starter
        window.startQuestions = () => {
            console.log('🔧 Manually starting questions...');
            if (!this.currentProject) {
                this.currentProject = {
                    id: `manual-${Date.now()}`,
                    originalRequest: 'Manual start',
                    projectType: 'web-application'
                };
            }
            this.questions = this.getDefaultQuestions();
            this.answers = [];
            this.startWizard();
        };
        
        // Add immediate test function
        window.testQuestion = () => {
            console.log('🧪 Testing immediate question display...');
            this.questions = this.getDefaultQuestions();
            this.answers = [];
            this.currentProject = { id: 'test', originalRequest: 'test' };
            this.addMessageToChat('Question 1 of 5: Who is your target audience and what are their main needs?', 'assistant');
            this.waitingForAnswer = true;
            console.log('✅ Test question added, waitingForAnswer set to true');
        };
    }

    generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getDefaultQuestions() {
        return [
            { question: "Who is your target audience and what are their main needs?" },
            { question: "What are the core features your project must have?" },
            { question: "What platforms should your project support (web, mobile, desktop)?" },
            { question: "Do you have any specific design preferences or branding requirements?" },
            { question: "What is your timeline and budget for this project?" }
        ];
    }

    async initializeAnalytics() {
        try {
            const response = await fetch('/api/analytics/start-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    userContext: {
                        userAgent: navigator.userAgent,
                        referrer: document.referrer,
                        timestamp: new Date().toISOString()
                    }
                })
            });
            
            if (response.ok) {
                console.log('Analytics session started:', this.sessionId);
            }
        } catch (error) {
            console.warn('Analytics initialization failed:', error);
        }
    }

    initializeEventListeners() {
        // Prevent multiple initialization
        if (this.eventListenersInitialized) {
            console.log('🚫 Event listeners already initialized, skipping');
            return;
        }
        
        // Send message functionality
        const sendBtn = document.getElementById('sendMessage');
        const messageInput = document.getElementById('messageInput');
        
        console.log('🔗 Initializing event listeners:', {
            sendBtn: !!sendBtn,
            messageInput: !!messageInput
        });
        
        // Remove any existing listeners first
        if (sendBtn) {
            sendBtn.replaceWith(sendBtn.cloneNode(true));
            document.getElementById('sendMessage').addEventListener('click', () => {
                console.log('🖱️ Send button clicked');
                this.sendMessage();
            });
        }
        
        if (messageInput) {
            messageInput.replaceWith(messageInput.cloneNode(true));
            document.getElementById('messageInput').addEventListener('keypress', (e) => {
                console.log('⌨️ Key pressed:', e.key, 'shiftKey:', e.shiftKey);
                if (e.key === 'Enter' && !e.shiftKey) {
                    console.log('✅ Enter key detected - calling sendMessage');
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Wizard steps
        document.getElementById('startWizard')?.addEventListener('click', () => this.startWizard());
        document.getElementById('generatePRD')?.addEventListener('click', () => this.generatePRD());
        document.getElementById('startConsultation')?.addEventListener('click', () => this.startConsultation());
        document.getElementById('generateWireframes')?.addEventListener('click', () => this.generateWireframes());
        document.getElementById('manageVersions')?.addEventListener('click', () => this.openVersionManager());
        document.getElementById('exportProject')?.addEventListener('click', () => this.exportProject());

        // PRD actions
        document.getElementById('viewFullPRD')?.addEventListener('click', () => this.viewFullPRD());
        document.getElementById('exportPRD')?.addEventListener('click', () => this.exportPRD());
        document.getElementById('sharePRD')?.addEventListener('click', () => this.sharePRD());
        document.getElementById('sendToClaudeCode')?.addEventListener('click', () => this.sendToClaudeCode());

        // Quick actions
        document.getElementById('duplicateProject')?.addEventListener('click', () => this.duplicateProject());
        document.getElementById('shareProject')?.addEventListener('click', () => this.shareProject());
        document.getElementById('exportAll')?.addEventListener('click', () => this.exportAll());
        document.getElementById('viewAnalytics')?.addEventListener('click', () => this.openAnalyticsDashboard());
        document.getElementById('getHelp')?.addEventListener('click', () => this.getHelp());

        // Modal controls
        document.getElementById('downloadPRD')?.addEventListener('click', () => this.exportPRD());
        document.getElementById('closePRDModal')?.addEventListener('click', () => this.closePRDModal());
        document.getElementById('closeWireframesModal')?.addEventListener('click', () => this.closeWireframesModal());
        document.getElementById('closeSuccessModal')?.addEventListener('click', () => this.closeSuccessModal());
        document.getElementById('closeConsultationModal')?.addEventListener('click', () => this.closeConsultationModal());
        document.getElementById('closeVersionModal')?.addEventListener('click', () => this.closeVersionModal());

        // Consultation controls
        document.getElementById('selectAllPersonas')?.addEventListener('click', () => this.selectAllPersonas());
        document.getElementById('startPersonaConsultation')?.addEventListener('click', () => this.startPersonaConsultation());
        document.getElementById('exportConsultationReport')?.addEventListener('click', () => this.exportConsultationReport());
        document.getElementById('applyRecommendations')?.addEventListener('click', () => this.applyRecommendations());

        // Version management controls
        document.getElementById('createVersion')?.addEventListener('click', () => this.createNewVersion());
        document.getElementById('createBranch')?.addEventListener('click', () => this.createNewBranch());
        document.getElementById('compareVersions')?.addEventListener('click', () => this.compareSelectedVersions());
        document.getElementById('createIterationPlan')?.addEventListener('click', () => this.createIterationPlan());
        document.getElementById('exportVersionHistory')?.addEventListener('click', () => this.exportVersionHistory());
        document.getElementById('rollbackVersion')?.addEventListener('click', () => this.rollbackToSelectedVersion());

        // Version tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchVersionTab(e.target.dataset.tab));
        });

        // Expandable sections
        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const button = e.currentTarget; // Use currentTarget to get the button, not the clicked icon
                const section = button.dataset.section;
                this.toggleSection(section);
            });
        });

        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
        
        // IDE Enter button
        document.getElementById('enterIDE')?.addEventListener('click', () => this.enterIDE());
        
        // Skip buttons
        document.getElementById('skipPRD')?.addEventListener('click', () => this.skipStep(3));
        document.getElementById('skipConsultation')?.addEventListener('click', () => this.skipStep(4));
        document.getElementById('skipWireframes')?.addEventListener('click', () => this.skipStep(5));
        document.getElementById('skipVersions')?.addEventListener('click', () => this.skipStep(6));
        
        // Mark as initialized
        this.eventListenersInitialized = true;
        console.log('✅ Event listeners initialized successfully');
    }

    async sendMessage() {
        console.log('🔄 sendMessage() called');
        
        // Prevent re-entrant calls
        if (this.isProcessing) {
            console.log('🚫 Already processing, ignoring duplicate call');
            return;
        }
        
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) {
            console.log('❌ Empty message, returning');
            return;
        }

        // Add user message to chat
        this.addMessageToChat(message, 'user');
        messageInput.value = '';
        
        // Ensure input field retains focus for next message
        setTimeout(() => messageInput.focus(), 100);
        
        // CRITICAL: Prevent any other processing during this function
        const processingFlag = this.isProcessing;
        this.isProcessing = true;

        console.log('📊 sendMessage state:', {
            currentProject: !!this.currentProject,
            waitingForAnswer: this.waitingForAnswer,
            answersLength: this.answers.length,
            questionsLength: this.questions.length,
            message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
        });

        // Check if we're waiting for an answer to a question
        if (this.waitingForAnswer && this.currentProject) {
            console.log('✅ Processing user answer since waitingForAnswer is true');
            try {
                await this.handleUserAnswer(message);
                console.log('✅ handleUserAnswer completed');
                this.isProcessing = processingFlag;
                return;
            } catch (error) {
                console.error('❌ Error in handleUserAnswer:', error);
                this.addMessageToChat('Sorry, there was an error processing your answer. Please try again.', 'assistant');
                this.isProcessing = processingFlag;
                return;
            }
        }

        // Check if this is the initial project description
        console.log('🔍 Checking if this is initial project description:', {
            hasCurrentProject: !!this.currentProject,
            currentProject: this.currentProject,
            messagePreview: message.substring(0, 30)
        });
        
        if (!this.currentProject) {
            console.log('🚀 Processing initial project description - CONFIRMED');
            
            // Skip API call and go straight to questions
            this.currentProject = {
                id: `project-${Date.now()}`,
                originalRequest: message,
                projectType: 'web-application',
            };
            
            console.log('✅ Project created:', this.currentProject);
            
            // Ensure questions are properly initialized
            const defaultQuestions = this.getDefaultQuestions();
            console.log('📋 Default questions loaded:', defaultQuestions);
            
            // Validate that questions are properly formatted
            if (!defaultQuestions || !Array.isArray(defaultQuestions) || defaultQuestions.length === 0) {
                console.error('❌ getDefaultQuestions returned invalid data:', defaultQuestions);
                this.addMessageToChat('Sorry, there was an error initializing the question system. Please refresh the page and try again.', 'assistant');
                this.isProcessing = processingFlag;
                return;
            }
            
            // Validate each question has the required structure
            const validQuestions = defaultQuestions.every(q => q && typeof q === 'object' && typeof q.question === 'string');
            if (!validQuestions) {
                console.error('❌ Some questions are malformed:', defaultQuestions);
                this.addMessageToChat('Sorry, there was an error with the question format. Please refresh the page and try again.', 'assistant');
                this.isProcessing = processingFlag;
                return;
            }
            
            this.questions = defaultQuestions;
            this.answers = [];
            
            console.log('✅ Project created with validated questions:', {
                questionsLength: this.questions.length,
                questionsArray: this.questions,
                firstQuestion: this.questions[0],
                firstQuestionText: this.questions[0]?.question
            });
            
            this.addMessageToChat(
                `Great! I've analyzed your project idea. I'll now ask you 5 targeted questions to better understand your requirements and create a comprehensive PRD.`,
                'assistant'
            );

            this.updateProgress(10, 'Project idea captured');
            
            // Start questioning immediately - simplified approach
            console.log('🚀 Starting wizard immediately...');
            
            // IMPORTANT FIX NOTE (2025-01-20): 
            // The original complex async flow through startWizard() -> askNextQuestion() 
            // had timing/race condition issues causing "Cannot read properties of undefined" errors.
            // The direct approach below bypasses all complex logic and works reliably.
            // 
            // SOLUTION: Instead of complex flows, directly:
            // 1. Set waitingForAnswer = true
            // 2. Add question to chat immediately
            // 3. Let handleUserAnswer() process the response
            //
            // This fix resolved multiple failed debugging attempts and should be preserved.
            
            // Try direct approach first - THIS IS THE WORKING SOLUTION
            try {
                console.log('🧪 TESTING: Direct question approach');
                console.log('🔧 Setting waitingForAnswer to true');
                this.waitingForAnswer = true;
                console.log('💬 Adding question to chat');
                this.addMessageToChat('Question 1 of 5: Who is your target audience and what are their main needs?', 'assistant');
                console.log('✅ Direct question added successfully, waitingForAnswer:', this.waitingForAnswer);
                console.log('🏁 Resetting processing flag and returning');
                this.isProcessing = processingFlag;
                return;
            } catch (directError) {
                console.error('❌ Direct approach failed:', directError);
                console.error('❌ Error details:', directError.stack);
            }
            
            // Fallback to original approach
            try {
                await this.startWizard();
                console.log('✅ startWizard completed');
            } catch (wizardError) {
                console.error('❌ startWizard failed:', wizardError);
                this.addMessageToChat('There was an error starting the questions. Let me try a different approach.', 'assistant');
                
                // Manual fallback
                this.waitingForAnswer = true;
                this.addMessageToChat('Question 1 of 5: Who is your target audience and what are their main needs?', 'assistant');
            }
        }
        
        // Reset processing flag
        this.isProcessing = processingFlag;
    }

    async startWizard() {
        console.log('🚀 startWizard called with full debug info:', {
            currentProject: !!this.currentProject,
            questionsLength: this.questions ? this.questions.length : 'undefined',
            answersLength: this.answers ? this.answers.length : 'undefined',
            questionsArray: this.questions
        });
        
        if (!this.currentProject) {
            console.log('❌ No currentProject, returning from startWizard');
            return;
        }

        if (!this.questions || this.questions.length === 0) {
            console.log('❌ No questions available, loading default questions');
            this.questions = this.getDefaultQuestions();
        }

        console.log('✅ startWizard proceeding with questions:', this.questions.length);
        this.setStep(2);
        this.updateProgress(25, 'Starting interview process');

        // Start the questioning process
        this.addMessageToChat('Perfect! Let\'s gather some details about your project. I\'ll ask you 5 questions to create the best possible requirements document.', 'assistant');
        
        try {
            console.log('🔄 About to call askNextQuestion...');
            await this.askNextQuestion();
            console.log('✅ askNextQuestion completed successfully');
            console.log('🔍 Final state after askNextQuestion:', {
                waitingForAnswer: this.waitingForAnswer,
                questionsLength: this.questions.length,
                answersLength: this.answers.length
            });
        } catch (error) {
            console.error('❌ Error in askNextQuestion:', error);
            console.error('❌ Full error details:', error.stack);
            this.addMessageToChat('Sorry, there was an error starting the questions. Please refresh and try again.', 'assistant');
        }
    }

    async askNextQuestion() {
        const currentQuestionIndex = this.answers.length;
        console.log('❓ askNextQuestion called:', {
            currentQuestionIndex,
            totalQuestions: this.questions ? this.questions.length : 'questions is null/undefined',
            questionsArray: this.questions,
            questionsType: typeof this.questions,
            isArray: Array.isArray(this.questions)
        });
        
        // IMMEDIATE: Force reinitialization every time to bypass any corruption
        console.log('🔧 FORCE reinitializing questions to ensure they exist');
        this.questions = this.getDefaultQuestions();
        console.log('📋 Questions FORCE reinitialized:', {
            questions: this.questions,
            length: this.questions.length,
            firstQuestion: this.questions[0],
            firstQuestionStructure: this.questions[0] ? Object.keys(this.questions[0]) : 'undefined'
        });
        
        // Double-check initialization worked
        if (!this.questions || this.questions.length === 0) {
            console.error('❌ FORCE reinitialization FAILED');
            this.addMessageToChat('Critical error: Cannot initialize questions. Please refresh the page.', 'assistant');
            return;
        }
        
        if (currentQuestionIndex >= this.questions.length) {
            console.log('✅ All questions answered - calling completeQuestioning');
            this.completeQuestioning();
            return;
        }

        let question = this.questions[currentQuestionIndex];
        console.log('📋 Asking question at index', currentQuestionIndex, ':', question);
        
        if (!question || !question.question) {
            console.error('❌ Question is undefined or malformed at index:', currentQuestionIndex);
            console.error('❌ Questions array:', this.questions);
            console.error('❌ Question object:', question);
            
            // Try to reinitialize questions and retry once
            this.questions = this.getDefaultQuestions();
            console.log('🔄 Retrying with reinitialized questions');
            const retryQuestion = this.questions[currentQuestionIndex];
            if (!retryQuestion || !retryQuestion.question) {
                console.error('❌ Still no valid question after reinitialize, aborting');
                this.addMessageToChat('Sorry, there was an error with the question system. Please refresh the page and try again.', 'assistant');
                return;
            }
            // Use the retry question
            question = retryQuestion;
        }
        
        // Final safety check before accessing question.question
        if (!question || typeof question !== 'object' || !question.question) {
            console.error('❌ CRITICAL: Question is still invalid after all checks:', {
                question,
                questionType: typeof question,
                hasQuestionProperty: question && 'question' in question,
                questionValue: question && question.question,
                questionsArray: this.questions,
                currentIndex: currentQuestionIndex
            });
            this.addMessageToChat('Sorry, there was an error loading the questions. Please refresh the page and try again.', 'assistant');
            return;
        }

        this.addMessageToChat(
            `Question ${currentQuestionIndex + 1} of ${this.questions.length}: ${question.question}`,
            'assistant'
        );

        // Update step progress
        this.updateQuestionProgress(currentQuestionIndex, this.questions.length);

        // Wait for user response
        this.waitingForAnswer = true;
        console.log('🔄 Set waitingForAnswer to TRUE, asking question:', currentQuestionIndex + 1);
        console.log('🔍 Current state after setting waitingForAnswer:', {
            waitingForAnswer: this.waitingForAnswer,
            currentProject: !!this.currentProject,
            answersLength: this.answers.length
        });
        
        // Confirm waitingForAnswer was set correctly
        console.log('✅ waitingForAnswer set to:', this.waitingForAnswer);
    }

    async handleUserAnswer(answer) {
        console.log('🎯 handleUserAnswer called with:', {
            answer: answer.substring(0, 50) + (answer.length > 50 ? '...' : ''),
            waitingForAnswer: this.waitingForAnswer,
            currentAnswersLength: this.answers.length,
            totalQuestions: this.questions.length
        });

        if (!this.waitingForAnswer) {
            console.log('❌ Not waiting for answer, returning early');
            console.log('🔍 Current state details:', {
                waitingForAnswer: this.waitingForAnswer,
                hasCurrentProject: !!this.currentProject,
                questionsLength: this.questions.length,
                answersLength: this.answers.length
            });
            return;
        }

        console.log('✅ handleUserAnswer proceeding - waitingForAnswer is true');

        try {
            this.answers.push({ answer, timestamp: new Date().toISOString() });
            this.waitingForAnswer = false;
            console.log('✅ Answer stored, waitingForAnswer set to false');

            // Track question answering
            await this.trackEvent('question_answered', {
                projectId: this.currentProject.id,
                questionIndex: this.answers.length - 1,
                responseLength: answer.length
            });

            // Ask next question or complete
            if (this.answers.length < this.questions.length) {
                console.log(`📝 ${this.answers.length}/${this.questions.length} questions answered - asking next question`);
                await this.askNextQuestion();
            } else {
                console.log('🎉 All questions answered - completing questioning');
                this.completeQuestioning();
            }
        } catch (error) {
            console.error('❌ Error in handleUserAnswer:', error);
            this.addMessageToChat('Sorry, there was an error processing your answer. Please try again.', 'assistant');
            this.waitingForAnswer = true; // Reset flag so user can try again
        }
    }

    completeQuestioning() {
        this.updateProgress(50, 'Interview completed');
        this.updateQuestionProgress(this.questions.length, this.questions.length);
        
        this.addMessageToChat(
            'Excellent! I have all the information I need. ✅ **Next Step**: Click the "Generate PRD" button in Step 3 on the right to create your Product Requirements Document.',
            'assistant'
        );

        this.setStep(3);
        document.getElementById('generatePRD').disabled = false;
        document.getElementById('skipPRD').disabled = false;
        
        // Add visual highlight to the Generate PRD button
        const generateButton = document.getElementById('generatePRD');
        if (generateButton) {
            generateButton.style.animation = 'pulse 2s infinite';
            generateButton.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.5)';
        }
    }

    async generatePRD() {
        // Clear the pulse animation
        const generateButton = document.getElementById('generatePRD');
        if (generateButton) {
            generateButton.style.animation = '';
            generateButton.style.boxShadow = '';
        }
        
        this.updateProgress(70, 'Generating PRD...');
        this.setPRDStatus('in-progress');

        try {
            const response = await fetch('/api/prd/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: this.currentProject.id,
                    originalRequest: this.currentProject.originalRequest,
                    questions: this.questions,
                    answers: this.answers,
                    sessionId: this.sessionId
                })
            });

            const result = await response.json();

            if (result.success) {
                this.prdDocument = result.prdDocument;
                this.updatePRDPreview(this.prdDocument);
                this.setPRDStatus('completed');
                this.updateProgress(80, 'PRD generated successfully');
                
                this.addMessageToChat(
                    'Your Product Requirements Document has been generated! You can view it in the PRD Assistant panel on the right.',
                    'assistant'
                );

                this.setStep(4);
                document.getElementById('startConsultation').disabled = false;
                document.getElementById('skipConsultation').disabled = false;

                // Load market insights and intelligence
                await this.loadMarketInsights();
                await this.loadProjectIntelligence();

                // Track PRD generation
                await this.trackEvent('prd_generated', {
                    projectId: this.currentProject.id,
                    contentLength: this.prdDocument.content.length,
                    confidence: this.prdDocument.metadata.confidence
                });

            } else {
                throw new Error(result.error || 'Failed to generate PRD');
            }
        } catch (error) {
            console.error('Error generating PRD:', error);
            this.addMessageToChat('Sorry, there was an error generating your PRD. Please try again.', 'assistant');
            this.setPRDStatus('Not Started');
        }
    }

    async generateWireframes() {
        this.updateProgress(90, 'Creating wireframes...');

        try {
            const response = await fetch('/api/wireframes/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: this.currentProject.id,
                    prdDocument: this.prdDocument,
                    sessionId: this.sessionId
                })
            });

            const result = await response.json();

            if (result.success) {
                this.wireframes = result.wireframes;
                this.updateProgress(100, 'Project complete!');
                
                this.addMessageToChat(
                    `Perfect! I've created ${this.wireframes.wireframes.length} wireframe layouts for your project. Opening wireframes viewer...`,
                    'assistant'
                );

                // Show wireframes immediately after generation
                setTimeout(() => this.viewWireframes(), 1000);

                this.setStep(6);
                document.getElementById('manageVersions').disabled = false;
                document.getElementById('skipVersions').disabled = false;

                // Track wireframe generation
                await this.trackEvent('wireframes_generated', {
                    projectId: this.currentProject.id,
                    wireframeCount: this.wireframes.wireframes.length
                });

            } else {
                throw new Error(result.error || 'Failed to generate wireframes');
            }
        } catch (error) {
            console.error('Error generating wireframes:', error);
            this.addMessageToChat('Sorry, there was an error generating wireframes. Please try again.', 'assistant');
        }
    }

    // Wireframes Viewing Method
    viewWireframes() {
        console.log('🔄 Opening wireframes viewer...');
        console.log('Wireframes data:', this.wireframes);
        
        if (!this.wireframes || !this.wireframes.wireframes) {
            console.error('❌ No wireframes data available');
            this.addMessageToChat('No wireframes available. Please generate wireframes first.', 'assistant');
            return;
        }

        const modal = document.getElementById('wireframesModal');
        const content = document.getElementById('wireframesModalContent');
        
        if (!modal || !content) {
            console.error('❌ Wireframes modal elements not found');
            this.addMessageToChat('Error: Wireframes viewer not available.', 'assistant');
            return;
        }
        
        console.log(`✅ Found ${this.wireframes.wireframes.length} wireframes to display`);

        // Populate wireframes content
        content.innerHTML = `
            <div class="wireframes-grid">
                ${this.wireframes.wireframes.map((wireframe, index) => `
                    <div class="wireframe-item">
                        <h4>${wireframe.name}</h4>
                        <div class="wireframe-preview">
                            ${wireframe.htmlContent || '<p>Preview not available</p>'}
                        </div>
                        <div class="wireframe-actions">
                            <button class="btn secondary" onclick="window.open('${wireframe.htmlFile}', '_blank')">
                                <i class="fas fa-external-link-alt"></i>
                                Open Full View
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Show modal
        modal.style.display = 'flex';
        
        console.log('✅ Wireframes modal opened with', this.wireframes.wireframes.length, 'wireframes');
    }

    closeWireframesModal() {
        const modal = document.getElementById('wireframesModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Multi-Persona Consultation Methods
    async startConsultation() {
        if (!this.currentProject) return;

        this.addMessageToChat(
            'Let\'s get expert insights from our AI consultants! I\'ll analyze your project with multiple specialized personas.',
            'assistant'
        );

        // Show consultation modal
        await this.showConsultationModal();
    }

    async showConsultationModal() {
        try {
            const modal = document.getElementById('consultationModal');
            if (!modal) {
                console.error('Consultation modal not found');
                this.addMessageToChat('Error: Consultation interface not available.', 'assistant');
                return;
            }
            
            console.log('🔄 Opening consultation modal...');
            
            // Load available personas
            await this.loadAvailablePersonas();
            
            // Setup tab switching for consultation
            this.setupTabSwitching();
            
            modal.style.display = 'flex';
            console.log('✅ Consultation modal opened successfully');
        } catch (error) {
            console.error('Error opening consultation modal:', error);
            this.addMessageToChat('Sorry, there was an error opening the AI consultation. Please try again.', 'assistant');
        }
    }

    async loadAvailablePersonas() {
        try {
            console.log('🔄 Loading available personas...');
            const response = await fetch('/api/personas/available');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📊 Personas API response:', result);

            if (result.success && result.personas) {
                this.availablePersonas = result.personas;
                this.renderPersonaGrid(result.personas);
                console.log(`✅ Loaded ${result.personas.length} personas successfully`);
            } else {
                throw new Error(result.error || 'No personas data received');
            }
        } catch (error) {
            console.error('❌ Error loading personas:', error);
            // Show fallback message in the consultation modal
            const grid = document.getElementById('personaGrid');
            if (grid) {
                grid.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Unable to load AI experts. Please try again later.</p>
                        <button class="btn secondary" onclick="window.productCreationHub.loadAvailablePersonas()">
                            <i class="fas fa-refresh"></i> Retry
                        </button>
                    </div>
                `;
            }
        }
    }

    renderPersonaGrid(personas) {
        const grid = document.getElementById('personaGrid');
        if (!grid) return;

        grid.innerHTML = personas.map(persona => `
            <div class="persona-card" data-persona-id="${persona.id}">
                <div class="persona-header">
                    <div class="persona-icon" style="background-color: ${persona.color}">
                        <i class="${persona.iconClass}"></i>
                    </div>
                    <h5 class="persona-name">${persona.name}</h5>
                </div>
                <ul class="persona-expertise">
                    ${persona.expertise.map(skill => `<li>${skill}</li>`).join('')}
                </ul>
            </div>
        `).join('');

        // Add click handlers for persona selection
        grid.querySelectorAll('.persona-card').forEach(card => {
            card.addEventListener('click', () => this.togglePersonaSelection(card));
        });
    }

    togglePersonaSelection(card) {
        card.classList.toggle('selected');
        this.updateConsultationButton();
    }

    selectAllPersonas() {
        const cards = document.querySelectorAll('.persona-card');
        const allSelected = Array.from(cards).every(card => card.classList.contains('selected'));
        
        cards.forEach(card => {
            if (allSelected) {
                card.classList.remove('selected');
            } else {
                card.classList.add('selected');
            }
        });
        
        this.updateConsultationButton();
    }

    updateConsultationButton() {
        const selectedCards = document.querySelectorAll('.persona-card.selected');
        const button = document.getElementById('startPersonaConsultation');
        
        if (button) {
            button.disabled = selectedCards.length === 0;
        }
    }

    async startPersonaConsultation() {
        const selectedCards = document.querySelectorAll('.persona-card.selected');
        const selectedPersonas = Array.from(selectedCards).map(card => 
            card.getAttribute('data-persona-id')
        );

        if (selectedPersonas.length === 0) return;

        // Hide persona selection and show loading
        document.getElementById('personaSelection').style.display = 'none';
        document.getElementById('consultationResults').style.display = 'block';

        try {
            const response = await fetch('/api/personas/consult', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: this.currentProject.id,
                    projectType: this.currentProject.projectType,
                    requirements: this.answers,
                    features: this.currentProject.questions || [],
                    complexity: 'medium',
                    timeline: '6 weeks',
                    selectedPersonas: selectedPersonas
                })
            });

            const result = await response.json();

            if (result.success) {
                this.consultationResult = result.consultation;
                this.renderConsultationResults(result.consultation);
                
                this.addMessageToChat(
                    `Expert consultation complete! ${result.consultation.summary.totalPersonas} experts have analyzed your project. Check the consultation modal for detailed insights.`,
                    'assistant'
                );

                // Move to next step
                this.setStep(5);
                document.getElementById('generateWireframes').disabled = false;
                document.getElementById('skipWireframes').disabled = false;

                // Track consultation
                await this.trackEvent('consultation_completed', {
                    projectId: this.currentProject.id,
                    personasConsulted: selectedPersonas.length,
                    criticalFindings: result.consultation.summary.criticalFindings
                });

            } else {
                throw new Error(result.error || 'Failed to conduct consultation');
            }
        } catch (error) {
            console.error('Error conducting consultation:', error);
            this.addMessageToChat('Sorry, there was an error conducting the expert consultation. Please try again.', 'assistant');
        }
    }

    renderConsultationResults(consultation) {
        // Update summary metrics
        document.getElementById('totalPersonas').textContent = consultation.summary.totalPersonas;
        document.getElementById('criticalFindings').textContent = consultation.summary.criticalFindings;
        document.getElementById('successProbability').textContent = `${consultation.summary.estimatedSuccessProbability}%`;
        document.getElementById('consensusLevel').textContent = `${consultation.summary.consensusLevel}%`;

        // Render overview tab
        this.renderOverviewTab(consultation);
        
        // Render insights tab
        this.renderInsightsTab(consultation);
        
        // Render actions tab
        this.renderActionsTab(consultation);
        
        // Render risks tab
        this.renderRisksTab(consultation);

        // Setup tab switching
        this.setupTabSwitching();
    }

    renderOverviewTab(consultation) {
        const agreementsEl = document.getElementById('expertAgreements');
        const conflictsEl = document.getElementById('expertConflicts');

        if (agreementsEl && consultation.crossPersonaAnalysis.agreements) {
            agreementsEl.innerHTML = consultation.crossPersonaAnalysis.agreements
                .map(agreement => `<li>${agreement}</li>`)
                .join('');
        }

        if (conflictsEl && consultation.crossPersonaAnalysis.conflicts) {
            conflictsEl.innerHTML = consultation.crossPersonaAnalysis.conflicts
                .map(conflict => `<li>${conflict}</li>`)
                .join('');
        }
    }

    renderInsightsTab(consultation) {
        const container = document.getElementById('personaInsights');
        if (!container) return;

        container.innerHTML = consultation.personaInsights.map(insight => `
            <div class="persona-insight">
                <div class="persona-insight-header">
                    <div class="persona-insight-title">
                        <h5>${insight.personaName}</h5>
                        <span class="insight-priority ${insight.priority}">${insight.priority}</span>
                    </div>
                    <div class="insight-confidence">Confidence: ${insight.confidence}%</div>
                </div>
                
                <div class="insight-section">
                    <h6>Key Insights</h6>
                    <ul>
                        ${insight.insights.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="insight-section">
                    <h6>Recommendations</h6>
                    <ul>
                        ${insight.recommendations.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="insight-section">
                    <h6>Risk Considerations</h6>
                    <ul>
                        ${insight.risks.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
    }

    renderActionsTab(consultation) {
        const immediateEl = document.getElementById('immediateActions');
        const shortTermEl = document.getElementById('shortTermActions');
        const longTermEl = document.getElementById('longTermActions');

        if (immediateEl && consultation.actionPlan.immediate) {
            immediateEl.innerHTML = consultation.actionPlan.immediate
                .map(action => `<li>${action}</li>`)
                .join('');
        }

        if (shortTermEl && consultation.actionPlan.shortTerm) {
            shortTermEl.innerHTML = consultation.actionPlan.shortTerm
                .map(action => `<li>${action}</li>`)
                .join('');
        }

        if (longTermEl && consultation.actionPlan.longTerm) {
            longTermEl.innerHTML = consultation.actionPlan.longTerm
                .map(action => `<li>${action}</li>`)
                .join('');
        }
    }

    renderRisksTab(consultation) {
        const securityEl = document.getElementById('securityRisks');
        const technicalEl = document.getElementById('technicalRisks');
        const businessEl = document.getElementById('businessRisks');
        const operationalEl = document.getElementById('operationalRisks');

        if (securityEl && consultation.riskMatrix.security) {
            securityEl.innerHTML = consultation.riskMatrix.security
                .map(risk => `<li>${risk}</li>`)
                .join('');
        }

        if (technicalEl && consultation.riskMatrix.technical) {
            technicalEl.innerHTML = consultation.riskMatrix.technical
                .map(risk => `<li>${risk}</li>`)
                .join('');
        }

        if (businessEl && consultation.riskMatrix.business) {
            businessEl.innerHTML = consultation.riskMatrix.business
                .map(risk => `<li>${risk}</li>`)
                .join('');
        }

        if (operationalEl && consultation.riskMatrix.operational) {
            operationalEl.innerHTML = consultation.riskMatrix.operational
                .map(risk => `<li>${risk}</li>`)
                .join('');
        }
    }

    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Update button states
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update panel states
                tabPanels.forEach(panel => panel.classList.remove('active'));
                document.getElementById(targetTab)?.classList.add('active');
            });
        });
    }

    closeConsultationModal() {
        document.getElementById('consultationModal').style.display = 'none';
        
        // Reset modal state
        document.getElementById('personaSelection').style.display = 'block';
        document.getElementById('consultationResults').style.display = 'none';
        
        // Clear selections
        document.querySelectorAll('.persona-card').forEach(card => {
            card.classList.remove('selected');
        });
    }

    async exportConsultationReport() {
        if (!this.consultationResult) return;

        try {
            const response = await fetch(`/api/personas/consultation/${this.currentProject.id}/export`, {
                method: 'GET'
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `consultation-report-${this.currentProject.id}.md`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Export failed:', error);
        }
    }

    applyRecommendations() {
        if (!this.consultationResult) return;

        // For MVP, we'll just show a success message
        this.addMessageToChat(
            'Expert recommendations have been noted and will be incorporated into the project documentation. The most critical items have been highlighted for immediate attention.',
            'assistant'
        );

        this.closeConsultationModal();
    }

    async loadMarketInsights() {
        try {
            const response = await fetch(`/api/market-insights/${this.currentProject.id}`);
            const result = await response.json();
            
            if (result.success) {
                this.marketInsights = result.insights;
                this.updateMarketInsights(this.marketInsights);
                this.updateSuccessScore(result.insights.viability.score);
            }
        } catch (error) {
            console.error('Error loading market insights:', error);
        }
    }

    async loadProjectIntelligence() {
        try {
            const response = await fetch(`/api/intelligence/${this.currentProject.id}`);
            const result = await response.json();
            
            if (result.success) {
                this.projectIntelligence = result.intelligence;
                this.updateRecommendations(this.projectIntelligence.recommendations);
                this.updateTrendingFeatures(this.projectIntelligence.marketInsights?.trending);
            }
        } catch (error) {
            console.error('Error loading project intelligence:', error);
        }
    }

    // UI Update Methods
    addMessageToChat(message, sender) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-content">
                <p>${message}</p>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Note: handleUserAnswer is called from sendMessage(), not here to avoid double-processing
    }

    setStep(stepNumber) {
        // Update wizard steps visual state
        document.querySelectorAll('.wizard-step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            
            if (index + 1 === stepNumber) {
                step.classList.add('active');
            } else if (index + 1 < stepNumber) {
                step.classList.add('completed');
            }
        });
        
        this.currentStep = stepNumber;
    }

    updateProgress(percentage, text) {
        const progressFill = document.getElementById('wizardProgress');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = text;
    }

    updateQuestionProgress(answered, total) {
        const progressElement = document.getElementById('questionProgress');
        if (progressElement) {
            progressElement.textContent = `${answered}/${total} questions answered`;
        }
    }

    setPRDStatus(status) {
        const statusBadge = document.getElementById('prdStatus');
        if (statusBadge) {
            statusBadge.textContent = status;
            statusBadge.className = `status-badge ${status.toLowerCase().replace(' ', '-')}`;
        }
    }

    updatePRDPreview(prdDocument) {
        const preview = document.getElementById('prdPreview');
        const metrics = document.getElementById('prdMetrics');
        const actions = document.getElementById('prdActions');

        // Show PRD summary in preview
        const summary = this.extractPRDSummary(prdDocument.content);
        preview.innerHTML = `
            <div class="prd-summary">
                <h4>${prdDocument.title}</h4>
                <p>${summary}</p>
            </div>
        `;

        // Update metrics
        const completeness = (this.answers.length / this.questions.length) * 100;
        document.getElementById('completenessBar').style.width = `${completeness}%`;
        document.getElementById('completenessValue').textContent = `${Math.round(completeness)}%`;
        document.getElementById('confidenceIndicator').innerHTML = `
            <span class="confidence-level">${prdDocument.metadata.confidence}</span>
        `;

        // Show metrics and actions
        metrics.style.display = 'block';
        actions.style.display = 'flex';
    }

    updateMarketInsights(insights) {
        const section = document.getElementById('marketInsights').querySelector('.section-content');
        section.innerHTML = `
            <div class="insights-content" style="padding: 15px;">
                <div class="insight-item">
                    <span class="insight-label">Market Viability:</span>
                    <span class="insight-value">${insights.viability.score}/100</span>
                </div>
                <div class="insight-item">
                    <span class="insight-label">Competition Level:</span>
                    <span class="insight-value">${insights.competition.level}</span>
                </div>
                <div class="insight-item">
                    <span class="insight-label">Market Size:</span>
                    <span class="insight-value">${insights.marketSize.size}</span>
                </div>
            </div>
        `;
    }

    updateRecommendations(recommendations) {
        const section = document.getElementById('aiRecommendations').querySelector('.section-content');
        const recList = recommendations.slice(0, 3).map(rec => 
            `<div class="recommendation-item">
                <strong>${rec.category}:</strong> ${rec.suggestions[0]}
            </div>`
        ).join('');
        
        section.innerHTML = `<div style="padding: 15px;">${recList}</div>`;
    }

    updateTrendingFeatures(trending) {
        if (!trending) return;
        
        const section = document.getElementById('trendingFeatures').querySelector('.section-content');
        const featuresList = trending.features.slice(0, 3).map(feature => 
            `<div class="trending-item">
                <span class="feature-name">${feature.feature}</span>
                <span class="feature-adoption">${feature.adoption}% adoption</span>
            </div>`
        ).join('');
        
        section.innerHTML = `<div style="padding: 15px;">${featuresList}</div>`;
    }

    updateSuccessScore(score) {
        const scoreElement = document.getElementById('successScore');
        if (scoreElement) {
            scoreElement.textContent = `${score}%`;
        }
    }

    // Modal Methods
    viewFullPRD() {
        if (!this.prdDocument) return;
        
        const modal = document.getElementById('prdModal');
        const content = document.getElementById('prdModalContent');
        
        content.innerHTML = `<pre style="white-space: pre-wrap; font-family: 'Inter', sans-serif;">${this.prdDocument.content}</pre>`;
        modal.style.display = 'flex';
    }

    closePRDModal() {
        document.getElementById('prdModal').style.display = 'none';
    }

    closeWireframesModal() {
        document.getElementById('wireframesModal').style.display = 'none';
    }

    closeSuccessModal() {
        document.getElementById('successModal').style.display = 'none';
    }

    closeConsultationModal() {
        const modal = document.getElementById('consultationModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Section toggle for expandable content
    toggleSection(sectionName) {
        const button = document.querySelector(`[data-section="${sectionName}"]`);
        const section = button.closest('.accelerator-section');
        const content = section.querySelector('.section-content');
        const icon = button.querySelector('i');
        
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            content.classList.add('expanded');
            if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
            content.classList.remove('expanded');
            content.classList.add('collapsed');
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }

    // Utility Methods
    extractPRDSummary(content) {
        const lines = content.split('\n');
        const summaryStart = lines.findIndex(line => line.includes('Executive Summary'));
        if (summaryStart === -1) return 'Product Requirements Document generated successfully.';
        
        return lines.slice(summaryStart + 2, summaryStart + 4).join(' ').substring(0, 200) + '...';
    }

    async trackEvent(eventType, eventData) {
        try {
            await fetch('/api/analytics/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    eventType,
                    eventData
                })
            });
        } catch (error) {
            console.warn('Analytics tracking failed:', error);
        }
    }

    // Action Methods
    async exportPRD() {
        if (!this.prdDocument) return;
        
        try {
            const response = await fetch(`/api/prd/export/${this.currentProject.id}?format=markdown`, {
                method: 'GET'
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.prdDocument.title}-PRD.md`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Export failed:', error);
        }
    }

    async sharePRD() {
        if (!this.prdDocument) return;
        
        try {
            const response = await fetch(`/api/prd/share/${this.currentProject.id}`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                navigator.clipboard.writeText(result.shareUrl);
                alert('Share link copied to clipboard!');
            }
        } catch (error) {
            console.error('Share failed:', error);
        }
    }

    sendToClaudeCode() {
        if (!this.prdDocument || !this.currentProject) {
            this.addMessageToChat('No PRD available to send to Claude Code. Please generate a PRD first.', 'assistant');
            return;
        }
        
        // Format PRD for Claude Code with clear instructions
        const claudeCodePrompt = `# Project: ${this.prdDocument.title}

## Original Request
${this.currentProject.originalRequest}

## Project Requirements (from Q&A session)
${this.answers.map((answer, index) => `**Q${index + 1}**: ${this.questions[index].question}
**A${index + 1}**: ${answer.answer}`).join('\n\n')}

## Complete Product Requirements Document
${this.prdDocument.content}

---

**Instructions for Claude Code:**
This is a complete Product Requirements Document generated from a structured interview process. You can use this to:
1. Create the project structure and files
2. Generate initial code based on the requirements  
3. Set up the development environment
4. Plan implementation phases

Please analyze this PRD and help me build this project step by step.`;

        // Copy to clipboard
        navigator.clipboard.writeText(claudeCodePrompt).then(() => {
            this.addMessageToChat(
                '📋 **PRD copied to clipboard!** \n\n' +
                'Your complete Product Requirements Document has been formatted for Claude Code and copied to your clipboard. \n\n' +
                '**Next steps:**\n' +
                '1. Click "Enter Coder1 IDE" to open the development environment\n' +
                '2. Paste the PRD into Claude Code to start building your project\n' +
                '3. Claude Code will help you create the project structure and implementation',
                'assistant'
            );
            
            // Store the formatted prompt for IDE transfer as well
            localStorage.setItem('claudeCodePrompt', claudeCodePrompt);
            localStorage.setItem('promptReady', 'true');
            
        }).catch(() => {
            this.addMessageToChat('Failed to copy PRD to clipboard. Please try again.', 'assistant');
        });
    }

    async exportProject() {
        if (!this.currentProject) return;
        
        try {
            const response = await fetch(`/api/project/export/${this.currentProject.id}`, {
                method: 'GET'
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.currentProject.id}-complete-project.zip`;
                a.click();
                window.URL.revokeObjectURL(url);
                
                // Show success message with IDE option
                this.addMessageToChat(
                    '🎉 Project exported successfully! Your complete project documentation is downloaded. ' +
                    'Would you like to continue working in the Coder1 IDE? Click "Enter Coder1 IDE" in the header to transfer your project.',
                    'assistant'
                );
                
                // Store project data for IDE transfer
                this.prepareProjectForIDE();
                
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.addMessageToChat('Sorry, there was an error exporting your project. Please try again.', 'assistant');
        }
    }

    duplicateProject() {
        if (!this.currentProject) return;
        
        const newRequest = this.currentProject.originalRequest + ' (Copy)';
        document.getElementById('messageInput').value = newRequest;
        this.sendMessage();
    }

    shareProject() {
        if (!this.currentProject) return;
        
        const shareData = {
            title: 'Check out my project idea',
            text: this.currentProject.originalRequest,
            url: window.location.href
        };
        
        if (navigator.share) {
            navigator.share(shareData);
        } else {
            navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
            alert('Project details copied to clipboard!');
        }
    }

    exportAll() {
        this.exportProject();
    }

    getHelp() {
        this.addMessageToChat(
            'I\'m here to help! You can:\n\n' +
            '• Describe any type of web project or application\n' +
            '• Answer the 5 questions to get a detailed PRD\n' +
            '• Generate wireframes to visualize your project\n' +
            '• Export everything when you\'re done\n\n' +
            'Just tell me what you want to build and I\'ll guide you through the process!',
            'assistant'
        );
    }

    toggleTheme() {
        document.body.classList.toggle('light-theme');
        const icon = document.querySelector('#themeToggle i');
        icon.className = document.body.classList.contains('light-theme') 
            ? 'fas fa-sun' 
            : 'fas fa-moon';
    }

    prepareProjectForIDE() {
        if (!this.currentProject) return;
        
        // Prepare comprehensive project data for Claude Code
        const projectData = {
            id: this.currentProject.id,
            title: this.currentProject.originalRequest,
            projectType: this.currentProject.projectType,
            questions: this.questions,
            answers: this.answers.map(a => a.answer),
            prd: this.prdDocument ? {
                title: this.prdDocument.title,
                content: this.prdDocument.content,
                metadata: this.prdDocument.metadata
            } : null,
            wireframes: this.wireframes,
            consultation: this.consultationResult,
            marketInsights: this.marketInsights,
            projectIntelligence: this.projectIntelligence,
            timestamp: new Date().toISOString(),
            status: 'ready-for-development'
        };
        
        // Store in localStorage for IDE access
        localStorage.setItem('productCreationProject', JSON.stringify(projectData));
        localStorage.setItem('projectTransferReady', 'true');
        
        console.log('Project data prepared for IDE transfer:', projectData);
    }
    
    enterIDE() {
        // Prepare project data if available
        if (this.currentProject) {
            this.prepareProjectForIDE();
        }
        
        // Navigate to Coder1 IDE with context
        const ideUrl = this.currentProject 
            ? '/ide?project=transfer'
            : '/ide';
            
        window.open(ideUrl, '_blank');
        
        // Show transfer message
        if (this.currentProject) {
            this.addMessageToChat(
                '🚀 Opening Coder1 IDE with your project data! Your PRD and project details have been prepared for Claude Code integration.',
                'assistant'
            );
        }
    }

    skipStep(stepNumber) {
        console.log(`Skipping step ${stepNumber}`);
        
        // Move to next step
        const nextStep = stepNumber + 1;
        if (nextStep <= 7) {
            this.setStep(nextStep);
            this.updateProgress(Math.min(100, (nextStep - 1) * 16.67), `Step ${nextStep} ready`);
            
            // Enable the next step's buttons based on which step we're moving to
            switch (nextStep) {
                case 4:
                    document.getElementById('startConsultation').disabled = false;
                    document.getElementById('skipConsultation').disabled = false;
                    break;
                case 5:
                    document.getElementById('generateWireframes').disabled = false;
                    document.getElementById('skipWireframes').disabled = false;
                    break;
                case 6:
                    document.getElementById('manageVersions').disabled = false;
                    document.getElementById('skipVersions').disabled = false;
                    break;
                case 7:
                    document.getElementById('exportProject').disabled = false;
                    break;
            }
        } else {
            // All steps complete
            this.updateProgress(100, 'Project ready!');
            document.getElementById('exportProject').disabled = false;
        }
        
        // Show skip confirmation message
        this.addMessageToChat(`✅ Step ${stepNumber} skipped. You can return to this step later if needed.`, 'assistant');
    }

    loadExistingProject() {
        // Check if there's a project ID in the URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('project') || localStorage.getItem('currentProjectId');
        
        console.log('Checking for existing project:', projectId);
        if (projectId) {
            console.log('Loading existing project:', projectId);
            this.loadProject(projectId);
        } else {
            console.log('No existing project found');
        }
    }

    async loadProject(projectId) {
        try {
            const response = await fetch(`/api/project/${projectId}`);
            
            if (response.status === 404) {
                console.log('Project not found, clearing stored project ID');
                localStorage.removeItem('currentProjectId');
                localStorage.removeItem('currentProject');
                return;
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.currentProject = result.project;
                this.prdDocument = result.prd;
                this.wireframes = result.wireframes;
                
                // Update UI to reflect loaded project
                this.updateUIForLoadedProject();
            } else {
                console.log('Failed to load project, clearing stored project ID');
                localStorage.removeItem('currentProjectId');
                localStorage.removeItem('currentProject');
            }
        } catch (error) {
            console.error('Error loading project:', error);
            localStorage.removeItem('currentProjectId');
            localStorage.removeItem('currentProject');
        }
    }

    updateUIForLoadedProject() {
        if (!this.currentProject) return;
        
        // Update project name in header
        document.getElementById('websiteInput').value = this.currentProject.title || 'Loaded Project';
        
        // Update wizard progress based on what's completed
        if (this.prdDocument) {
            this.setStep(this.wireframes ? 5 : 4);
            this.updateProgress(this.wireframes ? 100 : 80, 
                this.wireframes ? 'Project complete!' : 'PRD generated');
            this.updatePRDPreview(this.prdDocument);
        }
        
        // Add welcome back message
        this.addMessageToChat('Welcome back! Your project has been loaded and you can continue where you left off.', 'assistant');
    }

    // Save project state to localStorage
    saveProjectState() {
        if (!this.currentProject) return;
        
        localStorage.setItem('currentProjectId', this.currentProject.id);
        localStorage.setItem('productCreationState', JSON.stringify({
            project: this.currentProject,
            step: this.currentStep,
            answers: this.answers,
            timestamp: new Date().toISOString()
        }));
    }

    // Auto-save functionality
    setupAutoSave() {
        setInterval(() => {
            this.saveProjectState();
        }, 30000); // Save every 30 seconds
    }

    // Version Management Methods

    async openVersionManager() {
        const modal = document.getElementById('versionModal');
        modal.style.display = 'flex';
        
        // Initialize version management data
        await this.loadVersionHistory();
        await this.loadIterationPlans();
        
        // Move to step 7 (Ready to Build!) and enable export
        this.setStep(7);
        this.updateProgress(100, 'Project ready to build!');
        document.getElementById('exportProject').disabled = false;
        
        // Add completion message with IDE redirect info
        this.addMessageToChat(
            '🎉 Congratulations! Your project is now complete with version management set up. Automatically redirecting to Coder1 IDE in 3 seconds...',
            'assistant'
        );
        
        // Auto-redirect to Coder1 IDE after 3 seconds
        setTimeout(() => {
            this.addMessageToChat('🚀 Launching Coder1 IDE with your project...', 'assistant');
            this.enterIDE();
        }, 3000);
    }

    closeVersionModal() {
        document.getElementById('versionModal').style.display = 'none';
    }

    switchVersionTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-panel`).classList.add('active');

        // Load tab-specific data
        switch (tabName) {
            case 'history':
                this.loadVersionHistory();
                break;
            case 'compare':
                this.loadVersionSelectors();
                break;
            case 'iterations':
                this.loadIterationPlans();
                break;
        }
    }

    async loadVersionHistory() {
        if (!this.currentProject) return;

        try {
            const response = await fetch(`/api/versions/${this.currentProject.id}`);
            const data = await response.json();

            if (data.success) {
                this.renderVersionList(data.versions);
                this.renderVersionTree(data.versions);
            }
        } catch (error) {
            console.error('Failed to load version history:', error);
        }
    }

    renderVersionList(versions) {
        const versionList = document.getElementById('versionList');
        
        if (!versions || versions.length === 0) {
            versionList.innerHTML = `
                <div style="text-align: center; color: rgba(255, 255, 255, 0.6); padding: 40px;">
                    <i class="fas fa-history" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p>No versions yet. Create your first version when you're ready to save your progress.</p>
                </div>
            `;
            return;
        }

        versionList.innerHTML = versions.map(version => `
            <div class="version-item ${version.isCurrentVersion ? 'current' : ''}" data-version-id="${version.id}">
                <div class="version-info">
                    <div class="version-number">${version.versionNumber}</div>
                    <div class="version-title">${version.title}</div>
                    <div class="version-meta">
                        <span><i class="fas fa-user"></i> ${version.createdBy}</span>
                        <span><i class="fas fa-clock"></i> ${new Date(version.createdAt).toLocaleDateString()}</span>
                        <span><i class="fas fa-code-branch"></i> ${version.branchName}</span>
                        <span><i class="fas fa-gauge"></i> ${version.confidence}% confidence</span>
                    </div>
                    <div class="version-tags">
                        ${version.tags.map(tag => `<span class="version-tag ${tag}">${tag}</span>`).join('')}
                    </div>
                </div>
                <div class="version-node-actions">
                    <button class="version-action-btn" onclick="productCreationHub.viewVersion('${version.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="version-action-btn" onclick="productCreationHub.createBranchFromVersion('${version.id}')">
                        <i class="fas fa-code-branch"></i> Branch
                    </button>
                    ${!version.isCurrentVersion ? `
                        <button class="version-action-btn" onclick="productCreationHub.rollbackToVersion('${version.id}')">
                            <i class="fas fa-undo"></i> Restore
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    renderVersionTree(versions) {
        const versionTree = document.getElementById('versionTree');
        
        if (!versions || versions.length === 0) {
            versionTree.innerHTML = '<p style="color: rgba(255, 255, 255, 0.6); text-align: center;">No version tree available</p>';
            return;
        }

        // Create simplified tree view
        versionTree.innerHTML = versions.map(version => `
            <div class="version-node ${version.isCurrentVersion ? 'current' : ''} ${version.branchName !== 'main' ? 'branch' : ''}" 
                 data-version-id="${version.id}">
                <div class="version-node-icon">
                    <i class="fas fa-${version.iterationType === 'major' ? 'star' : version.iterationType === 'minor' ? 'circle' : 'dot-circle'}"></i>
                </div>
                <div class="version-node-content">
                    <div class="version-node-title">${version.versionNumber} - ${version.title}</div>
                    <div class="version-node-meta">
                        <span>${new Date(version.createdAt).toLocaleDateString()}</span>
                        <span>${version.changeCount} changes</span>
                        <span>${version.approvalStatus}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async createNewVersion() {
        if (!this.currentProject) {
            alert('No active project found');
            return;
        }

        const description = prompt('Enter a description for this version:');
        if (!description) return;

        const iterationType = prompt('Version type (major/minor/patch):', 'minor');
        if (!['major', 'minor', 'patch'].includes(iterationType)) {
            alert('Invalid version type');
            return;
        }

        try {
            const projectData = {
                questions: this.questions,
                answers: this.answers,
                prdDocument: this.prdDocument,
                wireframes: this.wireframes,
                consultationResults: this.consultationResults
            };

            const response = await fetch('/api/versions/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: this.currentProject.id,
                    projectData,
                    changeDescription: description,
                    createdBy: 'Current User',
                    iterationType
                })
            });

            const result = await response.json();
            if (result.success) {
                alert(`Version ${result.version.versionNumber} created successfully!`);
                await this.loadVersionHistory();
            } else {
                alert('Failed to create version: ' + result.error);
            }
        } catch (error) {
            console.error('Error creating version:', error);
            alert('Failed to create version');
        }
    }

    async createNewBranch() {
        const currentVersionId = this.getCurrentVersionId();
        if (!currentVersionId) {
            alert('No current version found');
            return;
        }

        const branchName = prompt('Enter branch name:');
        if (!branchName) return;

        try {
            const response = await fetch('/api/versions/branch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    versionId: currentVersionId,
                    branchName,
                    createdBy: 'Current User',
                    description: `New branch: ${branchName}`
                })
            });

            const result = await response.json();
            if (result.success) {
                alert(`Branch "${branchName}" created successfully!`);
                await this.loadVersionHistory();
            } else {
                alert('Failed to create branch: ' + result.error);
            }
        } catch (error) {
            console.error('Error creating branch:', error);
            alert('Failed to create branch');
        }
    }

    async loadVersionSelectors() {
        if (!this.currentProject) return;

        try {
            const response = await fetch(`/api/versions/${this.currentProject.id}`);
            const data = await response.json();

            if (data.success) {
                const versionASelect = document.getElementById('versionA');
                const versionBSelect = document.getElementById('versionB');

                const optionsHTML = data.versions.map(v => 
                    `<option value="${v.id}">${v.versionNumber} - ${v.title}</option>`
                ).join('');

                versionASelect.innerHTML = '<option value="">Select version...</option>' + optionsHTML;
                versionBSelect.innerHTML = '<option value="">Select version...</option>' + optionsHTML;
            }
        } catch (error) {
            console.error('Failed to load version selectors:', error);
        }
    }

    async compareSelectedVersions() {
        const versionAId = document.getElementById('versionA').value;
        const versionBId = document.getElementById('versionB').value;

        if (!versionAId || !versionBId) {
            alert('Please select both versions to compare');
            return;
        }

        try {
            const response = await fetch('/api/versions/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ versionAId, versionBId })
            });

            const result = await response.json();
            if (result.success) {
                this.renderComparisonResults(result.comparison);
            } else {
                alert('Failed to compare versions: ' + result.error);
            }
        } catch (error) {
            console.error('Error comparing versions:', error);
            alert('Failed to compare versions');
        }
    }

    renderComparisonResults(comparison) {
        const resultsContainer = document.getElementById('comparisonResults');
        
        resultsContainer.innerHTML = `
            <div class="comparison-summary">
                <div class="comparison-stat">
                    <div class="stat-value">${comparison.statistics.totalChanges}</div>
                    <div class="stat-label">Total Changes</div>
                </div>
                <div class="comparison-stat">
                    <div class="stat-value">${comparison.statistics.addedItems}</div>
                    <div class="stat-label">Added Items</div>
                </div>
                <div class="comparison-stat">
                    <div class="stat-value">${comparison.statistics.modifiedItems}</div>
                    <div class="stat-label">Modified Items</div>
                </div>
                <div class="comparison-stat">
                    <div class="stat-value">${comparison.statistics.removedItems}</div>
                    <div class="stat-label">Removed Items</div>
                </div>
            </div>
            
            <div class="comparison-details">
                ${comparison.differences.map(diff => `
                    <div class="comparison-section">
                        <div class="comparison-section-title">
                            <i class="fas fa-${this.getSectionIcon(diff.section)}"></i>
                            ${diff.section.charAt(0).toUpperCase() + diff.section.slice(1)} Changes
                        </div>
                        <div class="comparison-changes">
                            ${diff.changes.map(change => `
                                <div class="comparison-change">
                                    <span class="change-type ${change.changeType}">${change.changeType}</span>
                                    <span>${change.description}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getSectionIcon(section) {
        const icons = {
            questions: 'question-circle',
            prd: 'file-alt',
            wireframes: 'drafting-compass',
            consultation: 'users',
            settings: 'cog'
        };
        return icons[section] || 'file';
    }

    async loadIterationPlans() {
        if (!this.currentProject) return;

        try {
            const response = await fetch(`/api/iterations/${this.currentProject.id}`);
            const data = await response.json();

            if (data.success) {
                this.renderIterationPlans(data.plans);
            }
        } catch (error) {
            console.error('Failed to load iteration plans:', error);
        }
    }

    renderIterationPlans(plans) {
        const iterationList = document.getElementById('iterationList');
        
        if (!plans || plans.length === 0) {
            iterationList.innerHTML = `
                <div style="text-align: center; color: rgba(255, 255, 255, 0.6); padding: 40px;">
                    <i class="fas fa-tasks" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p>No iteration plans yet. Create your first plan to organize future development.</p>
                </div>
            `;
            return;
        }

        iterationList.innerHTML = plans.map(plan => `
            <div class="iteration-item">
                <div class="iteration-header">
                    <div>
                        <div class="iteration-title">${plan.title}</div>
                        <p style="color: rgba(255, 255, 255, 0.7); margin: 0;">${plan.description}</p>
                    </div>
                    <span class="iteration-status ${plan.status}">${plan.status.replace('_', ' ')}</span>
                </div>
                
                <div class="iteration-meta">
                    <div class="iteration-meta-item">
                        <span class="meta-label">Target Version</span>
                        <span class="meta-value">${plan.targetVersion}</span>
                    </div>
                    <div class="iteration-meta-item">
                        <span class="meta-label">Estimated Hours</span>
                        <span class="meta-value">${plan.resources.estimatedHours}h</span>
                    </div>
                    <div class="iteration-meta-item">
                        <span class="meta-label">Planned Changes</span>
                        <span class="meta-value">${plan.plannedChangesCount}</span>
                    </div>
                    <div class="iteration-meta-item">
                        <span class="meta-label">Risk Level</span>
                        <span class="meta-value">${plan.risksCount} risks identified</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async createIterationPlan() {
        // This would open a detailed form for creating iteration plans
        alert('Iteration plan creation form would open here. This is a complex feature that would include:\n\n• Target version selection\n• Planned changes definition\n• Timeline planning\n• Resource allocation\n• Risk assessment');
    }

    async exportVersionHistory() {
        if (!this.currentProject) return;

        try {
            const response = await fetch(`/api/versions/${this.currentProject.id}`);
            const data = await response.json();

            if (data.success) {
                const exportData = {
                    projectId: this.currentProject.id,
                    exportDate: new Date().toISOString(),
                    versions: data.versions,
                    totalVersions: data.totalVersions
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `version-history-${this.currentProject.id}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to export version history:', error);
            alert('Failed to export version history');
        }
    }

    async rollbackToSelectedVersion() {
        // Get selected version from UI
        const selectedVersion = document.querySelector('.version-item.selected');
        if (!selectedVersion) {
            alert('Please select a version to rollback to');
            return;
        }

        const versionId = selectedVersion.dataset.versionId;
        await this.rollbackToVersion(versionId);
    }

    async rollbackToVersion(versionId) {
        if (!confirm('Are you sure you want to rollback to this version? This will create a new version with the previous state.')) {
            return;
        }

        try {
            const response = await fetch('/api/versions/rollback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: this.currentProject.id,
                    targetVersionId: versionId,
                    rollbackBy: 'Current User'
                })
            });

            const result = await response.json();
            if (result.success) {
                alert('Successfully rolled back to previous version!');
                await this.loadVersionHistory();
                // Reload project data
                location.reload();
            } else {
                alert('Failed to rollback: ' + result.error);
            }
        } catch (error) {
            console.error('Error during rollback:', error);
            alert('Failed to rollback version');
        }
    }

    viewVersion(versionId) {
        // This would show version details in a modal
        alert(`View version details for: ${versionId}\n\nThis would show:\n• Complete project state at that version\n• Changes made\n• Metadata and tags`);
    }

    createBranchFromVersion(versionId) {
        const branchName = prompt('Enter branch name:');
        if (!branchName) return;

        fetch('/api/versions/branch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                versionId,
                branchName,
                createdBy: 'Current User',
                description: `Branch from version ${versionId}`
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert(`Branch "${branchName}" created successfully!`);
                this.loadVersionHistory();
            } else {
                alert('Failed to create branch: ' + result.error);
            }
        })
        .catch(error => {
            console.error('Error creating branch:', error);
            alert('Failed to create branch');
        });
    }

    getCurrentVersionId() {
        // Helper method to get current version ID
        if (this.currentProject && this.currentProject.currentVersionId) {
            return this.currentProject.currentVersionId;
        }
        return null;
    }

    /**
     * Analytics Dashboard Implementation
     */
    async openAnalyticsDashboard() {
        const modal = document.getElementById('analyticsModal');
        if (!modal) return;

        // Show loading state
        this.showAnalyticsLoading();
        modal.style.display = 'flex';

        try {
            // Load analytics data
            const dateRange = document.getElementById('analyticsDateRange')?.value || 30;
            await this.loadAnalyticsDashboard(dateRange);
            
            // Setup analytics event listeners
            this.setupAnalyticsEventListeners();

            // Track analytics view
            await this.trackEvent('analytics_opened', {
                dateRange,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error opening analytics dashboard:', error);
            this.showAnalyticsError('Failed to load analytics data');
        }
    }

    showAnalyticsLoading() {
        const sections = ['overviewMetrics', 'projectTypesChart', 'featureAdoption', 'userEngagement', 'performanceMetrics', 'aiInsights', 'recommendations'];
        sections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
            }
        });
    }

    showAnalyticsError(message) {
        const sections = ['overviewMetrics', 'projectTypesChart', 'featureAdoption', 'userEngagement', 'performanceMetrics', 'aiInsights', 'recommendations'];
        sections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${message}</div>`;
            }
        });
    }

    async loadAnalyticsDashboard(dateRange = 30) {
        try {
            const response = await fetch(`/api/analytics/dashboard?dateRange=${dateRange}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.renderAnalyticsDashboard(data.dashboard);
            } else {
                throw new Error(data.error || 'Failed to load analytics');
            }
        } catch (error) {
            console.error('Error loading analytics dashboard:', error);
            this.showAnalyticsError('Failed to load analytics data');
        }
    }

    renderAnalyticsDashboard(dashboard) {
        // Render overview metrics
        this.renderOverviewMetrics(dashboard.overview);
        
        // Render project analytics charts
        this.renderProjectCharts(dashboard.projectAnalytics);
        
        // Render feature adoption
        this.renderFeatureAdoption(dashboard.featureAdoption);
        
        // Render user engagement
        this.renderUserEngagement(dashboard.userEngagement);
        
        // Render performance metrics
        this.renderPerformanceMetrics(dashboard.performanceMetrics);
        
        // Render AI insights
        this.renderAIInsights(dashboard.insights);
        
        // Render recommendations
        this.renderRecommendations(dashboard.recommendations);
    }

    renderOverviewMetrics(overview) {
        const container = document.getElementById('overviewMetrics');
        if (!container) return;

        container.innerHTML = `
            <div class="metric-card">
                <div class="metric-icon"><i class="fas fa-project-diagram"></i></div>
                <div class="metric-content">
                    <div class="metric-value">${overview.totalProjects || 0}</div>
                    <div class="metric-label">Total Projects</div>
                    <div class="metric-change positive">+${overview.weeklyGrowth || 0}% this week</div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon"><i class="fas fa-check-circle"></i></div>
                <div class="metric-content">
                    <div class="metric-value">${overview.completedProjects || 0}</div>
                    <div class="metric-label">Completed</div>
                    <div class="metric-change">${overview.successRate || 0}% success rate</div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon"><i class="fas fa-clock"></i></div>
                <div class="metric-content">
                    <div class="metric-value">${overview.averageCompletionTime || 0}m</div>
                    <div class="metric-label">Avg. Completion</div>
                    <div class="metric-change">Time to finish</div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon"><i class="fas fa-star"></i></div>
                <div class="metric-content">
                    <div class="metric-value">${overview.averageComplexity || 0}</div>
                    <div class="metric-label">Avg. Complexity</div>
                    <div class="metric-change">Project difficulty</div>
                </div>
            </div>
        `;
    }

    renderProjectCharts(projectAnalytics) {
        // Render project types chart
        const typesChart = document.getElementById('projectTypesChart');
        if (typesChart && projectAnalytics.projectTypes) {
            const types = projectAnalytics.projectTypes.slice(0, 5); // Top 5
            typesChart.innerHTML = `
                <div class="chart-bars">
                    ${types.map(type => `
                        <div class="chart-bar">
                            <div class="bar-label">${type.type}</div>
                            <div class="bar-container">
                                <div class="bar-fill" style="width: ${type.percentage}%"></div>
                            </div>
                            <div class="bar-value">${type.count} (${type.percentage}%)</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Render completion times chart
        const timesChart = document.getElementById('completionTimesChart');
        if (timesChart && projectAnalytics.completionTimes) {
            timesChart.innerHTML = `
                <div class="completion-stats">
                    <div class="stat-item">
                        <span class="stat-label">Average Time</span>
                        <span class="stat-value">${projectAnalytics.completionTimes.average || 0} min</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Fastest</span>
                        <span class="stat-value">${projectAnalytics.completionTimes.fastest || 0} min</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Median</span>
                        <span class="stat-value">${projectAnalytics.completionTimes.median || 0} min</span>
                    </div>
                </div>
            `;
        }
    }

    renderFeatureAdoption(featureAdoption) {
        const container = document.getElementById('featureAdoption');
        if (!container || !featureAdoption.adoptionRates) return;

        const features = Object.entries(featureAdoption.adoptionRates);
        container.innerHTML = `
            <div class="adoption-grid">
                ${features.map(([feature, rate]) => `
                    <div class="adoption-item">
                        <div class="adoption-header">
                            <span class="feature-name">${this.formatFeatureName(feature)}</span>
                            <span class="adoption-rate">${rate}%</span>
                        </div>
                        <div class="adoption-bar">
                            <div class="adoption-fill" style="width: ${rate}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderUserEngagement(userEngagement) {
        const container = document.getElementById('userEngagement');
        if (!container) return;

        container.innerHTML = `
            <div class="engagement-grid">
                <div class="engagement-card">
                    <h4><i class="fas fa-users"></i> Session Metrics</h4>
                    <div class="engagement-stat">
                        <span>Avg. Session Duration</span>
                        <span>${userEngagement.sessionMetrics?.averageDuration || 0} min</span>
                    </div>
                    <div class="engagement-stat">
                        <span>Pages per Session</span>
                        <span>${userEngagement.sessionMetrics?.pagesPerSession || 0}</span>
                    </div>
                </div>
                <div class="engagement-card">
                    <h4><i class="fas fa-chart-line"></i> Engagement Score</h4>
                    <div class="score-display">
                        <div class="score-value">${userEngagement.engagementScore || 0}</div>
                        <div class="score-label">out of 100</div>
                    </div>
                </div>
                <div class="engagement-card">
                    <h4><i class="fas fa-redo"></i> Retention</h4>
                    <div class="engagement-stat">
                        <span>7-day Return Rate</span>
                        <span>${userEngagement.retentionRate || 0}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderPerformanceMetrics(performanceMetrics) {
        const container = document.getElementById('performanceMetrics');
        if (!container || !performanceMetrics.systemHealth) return;

        const health = performanceMetrics.systemHealth;
        container.innerHTML = `
            <div class="performance-grid">
                <div class="performance-card">
                    <div class="performance-icon"><i class="fas fa-tachometer-alt"></i></div>
                    <div class="performance-content">
                        <div class="performance-value">${health.averageResponseTime}ms</div>
                        <div class="performance-label">Response Time</div>
                    </div>
                </div>
                <div class="performance-card">
                    <div class="performance-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="performance-content">
                        <div class="performance-value">${(health.errorRate * 100).toFixed(2)}%</div>
                        <div class="performance-label">Error Rate</div>
                    </div>
                </div>
                <div class="performance-card">
                    <div class="performance-icon"><i class="fas fa-server"></i></div>
                    <div class="performance-content">
                        <div class="performance-value">${health.uptime}%</div>
                        <div class="performance-label">Uptime</div>
                    </div>
                </div>
                <div class="performance-card">
                    <div class="performance-icon"><i class="fas fa-chart-line"></i></div>
                    <div class="performance-content">
                        <div class="performance-value">${health.throughput}</div>
                        <div class="performance-label">Requests/min</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAIInsights(insights) {
        const container = document.getElementById('aiInsights');
        if (!container || !insights.keyFindings) return;

        container.innerHTML = `
            <div class="insights-list">
                ${insights.keyFindings.map(finding => `
                    <div class="insight-item ${finding.impact}">
                        <div class="insight-header">
                            <span class="insight-type">${this.formatInsightType(finding.type)}</span>
                            <span class="insight-impact ${finding.impact}">${finding.impact}</span>
                        </div>
                        <h4>${finding.title}</h4>
                        <p>${finding.description}</p>
                        <div class="insight-recommendation">
                            <strong>Recommendation:</strong> ${finding.recommendation}
                        </div>
                        <div class="insight-confidence">
                            Confidence: ${Math.round(finding.confidence * 100)}%
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderRecommendations(recommendations) {
        const container = document.getElementById('recommendations');
        if (!container) return;

        const allRecommendations = [
            ...recommendations.immediate.map(r => ({ ...r, timeframe: 'immediate' })),
            ...recommendations.shortTerm.map(r => ({ ...r, timeframe: 'short-term' })),
            ...recommendations.longTerm.map(r => ({ ...r, timeframe: 'long-term' }))
        ];

        container.innerHTML = `
            <div class="recommendations-list">
                ${allRecommendations.map(rec => `
                    <div class="recommendation-item ${rec.priority}">
                        <div class="recommendation-header">
                            <span class="rec-priority ${rec.priority}">${rec.priority}</span>
                            <span class="rec-category">${rec.category}</span>
                            <span class="rec-timeline">${rec.timeline}</span>
                        </div>
                        <h4>${rec.title}</h4>
                        <p>${rec.description}</p>
                        <div class="recommendation-impact">
                            <strong>Expected Impact:</strong> ${rec.expectedImpact}
                        </div>
                        <div class="recommendation-effort">
                            Effort: ${rec.effort} | Timeline: ${rec.timeline}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    setupAnalyticsEventListeners() {
        // Close modal
        document.getElementById('closeAnalyticsModal')?.addEventListener('click', () => {
            document.getElementById('analyticsModal').style.display = 'none';
        });

        // Date range change
        document.getElementById('analyticsDateRange')?.addEventListener('change', (e) => {
            this.loadAnalyticsDashboard(e.target.value);
        });

        // Refresh button
        document.getElementById('refreshAnalytics')?.addEventListener('click', () => {
            const dateRange = document.getElementById('analyticsDateRange')?.value || 30;
            this.loadAnalyticsDashboard(dateRange);
        });

        // Export button
        document.getElementById('exportAnalytics')?.addEventListener('click', () => {
            this.exportAnalyticsData();
        });
    }

    async exportAnalyticsData() {
        try {
            const dateRange = document.getElementById('analyticsDateRange')?.value || 30;
            const response = await fetch(`/api/analytics/export?dateRange=${dateRange}&format=json`);
            const data = await response.json();

            if (data.success) {
                const blob = new Blob([data.data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);

                // Track export
                await this.trackEvent('analytics_exported', {
                    dateRange,
                    format: 'json',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error exporting analytics:', error);
            alert('Failed to export analytics data');
        }
    }

    formatFeatureName(feature) {
        const names = {
            'multiPersonaConsultation': 'Multi-Persona Consultation',
            'versionControl': 'Version Control',
            'templateUsage': 'Template Usage',
            'collaboration': 'Team Collaboration',
            'export': 'Export Features'
        };
        return names[feature] || feature;
    }

    formatInsightType(type) {
        const types = {
            'success_pattern': 'Success Pattern',
            'optimization': 'Optimization',
            'feature_gap': 'Feature Gap',
            'user_behavior': 'User Behavior'
        };
        return types[type] || type;
    }

    // Initialize version management when project starts
    async initializeVersioning() {
        if (!this.currentProject) return;

        // Create initial version when project is first created
        const projectData = {
            questions: this.questions || [],
            answers: this.answers || [],
            prdDocument: this.prdDocument,
            wireframes: this.wireframes,
            consultationResults: this.consultationResults
        };

        try {
            const response = await fetch('/api/versions/create-initial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: this.currentProject.id,
                    projectData,
                    createdBy: 'Current User',
                    title: 'Project Initialization'
                })
            });

            const result = await response.json();
            if (result.success) {
                this.currentProject.currentVersionId = result.version.id;
                console.log('Initial version created:', result.version.versionNumber);
            }
        } catch (error) {
            console.error('Failed to create initial version:', error);
        }
    }
}

// Initialize the Product Creation Hub when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 DOM Content Loaded - initializing ProductCreationHub');
    
    // Verify critical elements exist
    const sendBtn = document.getElementById('sendMessage');
    const messageInput = document.getElementById('messageInput');
    
    console.log('🔍 Critical elements check:', {
        sendMessage: !!sendBtn,
        messageInput: !!messageInput,
        sendButtonHTML: sendBtn ? sendBtn.outerHTML.substring(0, 100) : 'NOT FOUND',
        inputHTML: messageInput ? messageInput.outerHTML.substring(0, 100) : 'NOT FOUND'
    });
    
    window.productCreationHub = new ProductCreationHub();
    window.productCreationHub.setupAutoSave();
    
    console.log('✅ ProductCreationHub initialized and available as window.productCreationHub');
});

// Handle page visibility for analytics
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.productCreationHub) {
        window.productCreationHub.saveProjectState();
    }
});