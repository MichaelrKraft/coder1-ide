/**
 * PRD Generator V2 - Simplified, Intelligent, and Thorough
 * Generates comprehensive PRDs optimized for AI context engineering
 */

class PRDGeneratorV2 {
    constructor() {
        this.state = {
            phase: 'discovery', // discovery | creation | delivery
            projectType: null,
            projectName: '',
            projectDescription: '',
            currentQuestionIndex: 0,
            questions: [],
            answers: [],
            prdDocument: null,
            wireframes: null,
            settings: {
                questionDepth: 'standard', // quick | standard | detailed
                autoPreview: true,
                includeWireframes: true,
                expertInsights: true
            }
        };
        
        this.sessionId = this.generateSessionId();
        this.conversationHistory = [];
        
        // Dynamic question bank organized by project type and depth
        this.questionBank = this.initializeQuestionBank();
        
        this.init();
    }
    
    generateSessionId() {
        return `prd-v2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    initializeQuestionBank() {
        return {
            // Universal questions for all project types
            universal: {
                quick: [
                    {
                        id: 'target-audience',
                        question: 'Who is your primary target audience and what problem are you solving for them?',
                        type: 'open',
                        category: 'business',
                        followUp: (answer) => this.analyzeAudienceComplexity(answer)
                    },
                    {
                        id: 'core-features',
                        question: 'What are the 3-5 must-have features for your MVP?',
                        type: 'list',
                        category: 'functional'
                    },
                    {
                        id: 'success-metrics',
                        question: 'How will you measure success? What are your key metrics?',
                        type: 'open',
                        category: 'business'
                    }
                ],
                standard: [
                    {
                        id: 'competitors',
                        question: 'Who are your main competitors and how will you differentiate?',
                        type: 'open',
                        category: 'market'
                    },
                    {
                        id: 'technical-constraints',
                        question: 'Are there any technical constraints or existing systems to integrate with?',
                        type: 'open',
                        category: 'technical'
                    },
                    {
                        id: 'timeline-budget',
                        question: 'What is your timeline and budget for the MVP?',
                        type: 'structured',
                        category: 'planning'
                    },
                    {
                        id: 'scaling',
                        question: 'What are your scaling expectations? (users, data, geographic reach)',
                        type: 'open',
                        category: 'technical'
                    }
                ],
                detailed: [
                    {
                        id: 'user-journey',
                        question: 'Describe the complete user journey from discovery to retention.',
                        type: 'narrative',
                        category: 'ux'
                    },
                    {
                        id: 'data-privacy',
                        question: 'What data will you collect and how will you ensure privacy/compliance?',
                        type: 'open',
                        category: 'security'
                    },
                    {
                        id: 'monetization',
                        question: 'What is your monetization strategy and pricing model?',
                        type: 'structured',
                        category: 'business'
                    },
                    {
                        id: 'team-resources',
                        question: 'What is your team composition and what resources do you have?',
                        type: 'open',
                        category: 'planning'
                    }
                ]
            },
            
            // SaaS-specific questions
            saas: {
                specific: [
                    {
                        id: 'subscription-tiers',
                        question: 'What subscription tiers will you offer and what features differentiate them?',
                        type: 'structured',
                        category: 'business'
                    },
                    {
                        id: 'multi-tenancy',
                        question: 'Will this be single-tenant or multi-tenant? Any white-label requirements?',
                        type: 'choice',
                        category: 'technical'
                    },
                    {
                        id: 'api-requirements',
                        question: 'Do you need a public API? What integrations are essential?',
                        type: 'open',
                        category: 'technical'
                    },
                    {
                        id: 'onboarding-flow',
                        question: 'Describe your ideal user onboarding experience.',
                        type: 'narrative',
                        category: 'ux'
                    }
                ]
            },
            
            // E-commerce specific questions
            ecommerce: {
                specific: [
                    {
                        id: 'product-catalog',
                        question: 'How many products/SKUs? Will you have variants (size, color)?',
                        type: 'structured',
                        category: 'functional'
                    },
                    {
                        id: 'payment-shipping',
                        question: 'What payment methods and shipping options do you need?',
                        type: 'list',
                        category: 'functional'
                    },
                    {
                        id: 'inventory-management',
                        question: 'How will you manage inventory? Any dropshipping or fulfillment partners?',
                        type: 'open',
                        category: 'operations'
                    },
                    {
                        id: 'international',
                        question: 'Will you sell internationally? Multi-currency/language needs?',
                        type: 'choice',
                        category: 'business'
                    }
                ]
            },
            
            // Mobile app specific questions
            mobile: {
                specific: [
                    {
                        id: 'platform-priority',
                        question: 'iOS, Android, or both? What is your priority and why?',
                        type: 'choice',
                        category: 'technical'
                    },
                    {
                        id: 'offline-capability',
                        question: 'What features must work offline? How critical is offline functionality?',
                        type: 'open',
                        category: 'technical'
                    },
                    {
                        id: 'device-features',
                        question: 'Which device features will you use? (camera, GPS, notifications, etc.)',
                        type: 'list',
                        category: 'technical'
                    },
                    {
                        id: 'app-store-strategy',
                        question: 'What is your app store optimization and launch strategy?',
                        type: 'open',
                        category: 'marketing'
                    }
                ]
            },
            
            // Marketplace specific questions
            marketplace: {
                specific: [
                    {
                        id: 'marketplace-model',
                        question: 'B2B, B2C, or C2C? What is your marketplace model?',
                        type: 'choice',
                        category: 'business'
                    },
                    {
                        id: 'trust-safety',
                        question: 'How will you handle trust, safety, and dispute resolution?',
                        type: 'open',
                        category: 'operations'
                    },
                    {
                        id: 'commission-structure',
                        question: 'What is your commission/fee structure?',
                        type: 'structured',
                        category: 'business'
                    },
                    {
                        id: 'supply-demand',
                        question: 'How will you solve the chicken-and-egg problem? (supply vs demand)',
                        type: 'open',
                        category: 'strategy'
                    }
                ]
            },
            
            // Internal tool specific questions
            internal: {
                specific: [
                    {
                        id: 'user-roles',
                        question: 'What are the different user roles and their permissions?',
                        type: 'structured',
                        category: 'functional'
                    },
                    {
                        id: 'existing-systems',
                        question: 'What existing systems/databases must this integrate with?',
                        type: 'list',
                        category: 'technical'
                    },
                    {
                        id: 'workflow-automation',
                        question: 'What manual processes are you trying to automate?',
                        type: 'narrative',
                        category: 'functional'
                    },
                    {
                        id: 'reporting-needs',
                        question: 'What reports and analytics do stakeholders need?',
                        type: 'list',
                        category: 'functional'
                    }
                ]
            }
        };
    }
    
    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.initializeUI();
    }
    
    setupEventListeners() {
        // Quick start options
        document.querySelectorAll('.quick-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.handleQuickStart(type);
            });
        });
        
        // Input handling
        const userInput = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');
        
        sendButton.addEventListener('click', () => this.handleUserInput());
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleUserInput();
            }
        });
        
        // Auto-resize textarea
        userInput.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        });
        
        // Action buttons
        document.getElementById('skipQuestion')?.addEventListener('click', () => this.skipCurrentQuestion());
        document.getElementById('quickMode')?.addEventListener('click', () => this.setQuestionMode('quick'));
        document.getElementById('detailedMode')?.addEventListener('click', () => this.setQuestionMode('detailed'));
        document.getElementById('generatePRD')?.addEventListener('click', () => this.generateComprehensivePRD());
        document.getElementById('downloadPRD')?.addEventListener('click', () => this.downloadPRD());
        document.getElementById('viewFullscreen')?.addEventListener('click', () => this.showFullscreenPRD());
        document.getElementById('sendToClaudeCode')?.addEventListener('click', () => this.sendToClaudeCode());
        document.getElementById('exportAll')?.addEventListener('click', () => this.showExportModal());
        document.getElementById('startNew')?.addEventListener('click', () => this.startNewProject());
        
        // Fullscreen modal controls
        document.getElementById('closeFullscreen')?.addEventListener('click', () => this.closeFullscreenPRD());
        document.getElementById('copyPRD')?.addEventListener('click', () => this.copyPRDToClipboard());
        document.getElementById('downloadFromFullscreen')?.addEventListener('click', () => this.downloadPRD());
        document.getElementById('editPRD')?.addEventListener('click', () => this.enterEditMode());
        document.getElementById('savePRD')?.addEventListener('click', () => this.saveEditedPRD());
        document.getElementById('cancelEdit')?.addEventListener('click', () => this.cancelEditMode());
        
        // Panel controls
        document.getElementById('togglePreview')?.addEventListener('click', () => this.toggleSidePanel());
        document.getElementById('closePanel')?.addEventListener('click', () => this.closeSidePanel());
        
        // Settings
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.showSettings());
        document.getElementById('closeSettings')?.addEventListener('click', () => this.closeSettings());
        
        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
        
        // Export options
        document.querySelectorAll('.export-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                this.exportPRD(format);
            });
        });
    }
    
    handleQuickStart(projectType) {
        this.state.projectType = projectType;
        const typeLabels = {
            saas: 'SaaS Platform',
            ecommerce: 'E-commerce Site',
            mobile: 'Mobile App',
            marketplace: 'Marketplace',
            internal: 'Internal Tool',
            other: 'Custom Project'
        };
        
        // Remove placeholder text when project type is selected
        const userInput = document.getElementById('userInput');
        if (userInput) {
            userInput.placeholder = '';
        }
        
        const message = `Great! I'll help you build a ${typeLabels[projectType]}. Let me ask you some targeted questions to create a comprehensive PRD.`;
        this.addAssistantMessage(message);
        
        // Start with the first universal question
        this.prepareQuestions();
        this.askNextQuestion();
    }
    
    prepareQuestions() {
        const depth = this.state.settings.questionDepth;
        const limits = {
            quick: 3,
            standard: 5,
            detailed: 10
        };
        
        const maxQuestions = limits[depth] || 5;
        
        // Get all potential questions
        const universalQuestions = [
            ...this.questionBank.universal.quick,
            ...(depth !== 'quick' ? this.questionBank.universal.standard : []),
            ...(depth === 'detailed' ? this.questionBank.universal.detailed : [])
        ];
        
        // Add project-specific questions
        let specificQuestions = [];
        if (this.state.projectType && this.state.projectType !== 'other') {
            specificQuestions = this.questionBank[this.state.projectType]?.specific || [];
        }
        
        // Intelligently merge and order questions
        const allQuestions = this.intelligentQuestionOrdering([
            ...universalQuestions,
            ...specificQuestions
        ]);
        
        // LIMIT to the correct number based on mode
        this.state.questions = allQuestions.slice(0, maxQuestions);
        
        console.log(`📋 Prepared ${this.state.questions.length} questions for ${depth} mode (max: ${maxQuestions})`);
        
        // Show context bar with question count
        this.updateContextBar(true);
    }
    
    intelligentQuestionOrdering(questions) {
        // Order by category priority: business -> functional -> technical -> ux -> operations
        const categoryPriority = {
            business: 1,
            market: 2,
            functional: 3,
            technical: 4,
            ux: 5,
            operations: 6,
            planning: 7,
            security: 8,
            marketing: 9,
            strategy: 10
        };
        
        return questions.sort((a, b) => {
            const priorityA = categoryPriority[a.category] || 99;
            const priorityB = categoryPriority[b.category] || 99;
            return priorityA - priorityB;
        });
    }
    
    askNextQuestion() {
        console.log('🤖 askNextQuestion called:', {
            currentIndex: this.state.currentQuestionIndex,
            totalQuestions: this.state.questions.length,
            phase: this.state.phase
        });
        
        if (this.state.currentQuestionIndex >= this.state.questions.length) {
            console.log('📋 Discovery complete, transitioning to creation phase');
            this.completeDiscovery();
            return;
        }
        
        const question = this.state.questions[this.state.currentQuestionIndex];
        console.log('❓ Next question:', question);
        
        // Add contextual information based on previous answers
        let contextualizedQuestion = question.question;
        if (this.state.answers.length > 0) {
            contextualizedQuestion = this.contextualizeQuestion(question, this.state.answers);
        }
        
        this.addAssistantMessage(contextualizedQuestion, 'question');
        this.updateQuestionCounter();
        
        // Show question counter if not visible
        const questionCounter = document.getElementById('questionCounter');
        if (questionCounter) {
            questionCounter.style.display = 'flex';
        }
        
        // Show relevant suggestions based on question type
        if (question.type === 'choice') {
            this.showChoiceButtons(question);
        }
    }
    
    contextualizeQuestion(question, previousAnswers) {
        // Add intelligent context based on previous answers
        let context = question.question;
        
        // Example: If they mentioned B2B, adjust language
        const isB2B = previousAnswers.some(a => 
            a.answer.toLowerCase().includes('b2b') || 
            a.answer.toLowerCase().includes('business')
        );
        
        if (isB2B && question.id === 'user-journey') {
            context = 'Describe the complete B2B buyer journey from discovery through procurement to renewal.';
        }
        
        return context;
    }
    
    analyzeAudienceComplexity(answer) {
        // Dynamically add follow-up questions based on answer complexity
        const complexity = this.assessComplexity(answer);
        
        if (complexity === 'high') {
            // Add additional segmentation questions
            return {
                id: 'audience-segments',
                question: 'You mentioned multiple user types. Can you describe each segment and their specific needs?',
                type: 'structured',
                category: 'business'
            };
        }
        return null;
    }
    
    assessComplexity(text) {
        // Simple complexity assessment based on length and keywords
        const complexKeywords = ['multiple', 'various', 'different', 'segments', 'both'];
        const hasComplexKeywords = complexKeywords.some(kw => text.toLowerCase().includes(kw));
        
        if (text.length > 200 || hasComplexKeywords) {
            return 'high';
        } else if (text.length > 100) {
            return 'medium';
        }
        return 'low';
    }
    
    handleUserInput() {
        const userInput = document.getElementById('userInput');
        const message = userInput.value.trim();
        
        if (!message) return;
        
        this.addUserMessage(message);
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // Remove placeholder text after first answer
        if (this.state.answers.length === 0 || this.state.phase === 'discovery' && this.state.currentQuestionIndex === 0) {
            userInput.placeholder = '';
        }
        
        // Check if this is the initial project description without project type selected
        if (this.state.phase === 'discovery' && !this.state.projectType && this.state.questions.length === 0) {
            console.log('🚀 Handling initial project description without quick-start selection');
            
            // Set project type to 'other' and store the description
            this.state.projectType = 'other';
            this.state.projectDescription = message;
            
            const followUpMessage = `Thanks for describing your project! I'll ask you some targeted questions to create a comprehensive PRD.`;
            this.addAssistantMessage(followUpMessage);
            
            // Prepare questions and start the flow
            this.prepareQuestions();
            this.askNextQuestion();
            return;
        }
        
        // Process based on current phase
        if (this.state.phase === 'discovery') {
            this.processDiscoveryInput(message);
        } else if (this.state.phase === 'creation') {
            this.processCreationInput(message);
        }
    }
    
    processDiscoveryInput(message) {
        console.log('💬 Processing discovery input:', message);
        
        // Store the answer
        const currentQuestion = this.state.questions[this.state.currentQuestionIndex];
        console.log('📝 Current question being answered:', currentQuestion);
        
        this.state.answers.push({
            questionId: currentQuestion.id,
            question: currentQuestion.question,
            answer: message,
            timestamp: new Date().toISOString()
        });
        
        console.log('✅ Answer stored, total answers:', this.state.answers.length);
        
        // Check for follow-up questions
        if (currentQuestion.followUp) {
            const followUpQuestion = currentQuestion.followUp(message);
            if (followUpQuestion) {
                this.state.questions.splice(this.state.currentQuestionIndex + 1, 0, followUpQuestion);
                console.log('➕ Follow-up question added');
            }
        }
        
        // Update PRD preview if enabled
        if (this.state.settings.autoPreview) {
            this.updatePRDPreview();
        }
        
        // Move to next question
        console.log('⏭️ Moving to next question. Current index before increment:', this.state.currentQuestionIndex);
        this.state.currentQuestionIndex++;
        console.log('⏭️ New index after increment:', this.state.currentQuestionIndex);
        this.askNextQuestion();
    }
    
    completeDiscovery() {
        console.log('🎉 COMPLETE DISCOVERY CALLED!');
        console.log('📊 Final discovery state:', {
            questionsAnswered: this.state.answers.length,
            totalQuestions: this.state.questions.length,
            currentIndex: this.state.currentQuestionIndex,
            previousPhase: this.state.phase
        });
        
        this.state.phase = 'creation';
        console.log('🔄 Phase changed to:', this.state.phase);
        
        this.updateProgressIndicator();
        console.log('✅ Progress indicator updated');
        
        const message = `Excellent! I have all the information I need. 

Based on your answers, I'll now generate a comprehensive PRD that includes:
• Detailed technical specifications optimized for AI implementation
• Complete user stories with acceptance criteria
• System architecture and data models
• API specifications and integration points
• Security and compliance requirements
• Testing and deployment strategies

Click "Generate PRD" to create your document.`;
        
        this.addAssistantMessage(message);
        console.log('💬 Added completion message to conversation');
        
        console.log('🎯 About to call showCreationActions()');
        this.showCreationActions();
        console.log('✅ Creation actions should now be visible (Generate PRD button)');
    }
    
    async generateComprehensivePRD() {
        // IMPORTANT: Ensure preview panel stays hidden with !important override
        const previewColumn = document.getElementById('previewColumn');
        if (previewColumn) {
            previewColumn.style.setProperty('display', 'none', 'important');
        }
        
        this.showLoading('Generating comprehensive PRD optimized for AI context...');
        
        try {
            // Prepare questions and answers for the backend
            const questions = this.state.questions.map(q => q.question);
            const answers = this.state.answers.map(a => a.answer);
            
            // Call the correct backend API
            const response = await fetch('/api/prd/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: this.sessionId || `project_${Date.now()}`,
                    originalRequest: this.state.projectDescription || 'PRD Generation Project',
                    questions: questions,
                    answers: answers,
                    sessionId: this.sessionId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.state.prdDocument = result.prdDocument;
                this.generatedPRD = result.prdDocument; // Ensure compatibility with delivery functions
                
                // Show PRD immediately in full-screen modal
                this.showFullscreenPRD();
                
                this.state.phase = 'delivery';
                this.updateProgressIndicator();
                this.showDeliveryActions();
                
                // DO NOT show edit controls - they're inside the preview panel we're hiding!
                // const editControls = document.getElementById('editControls');
                // if (editControls) {
                //     editControls.style.display = 'block';
                // }
                
                this.hideLoading();
                this.showToast('PRD generated successfully!', 'success');
                
                // Enable download button
                const downloadBtn = document.getElementById('downloadPRD');
                if (downloadBtn) {
                    downloadBtn.disabled = false;
                }
            } else {
                throw new Error(result.error || 'Failed to generate PRD');
            }
        } catch (error) {
            console.error('Error generating PRD:', error);
            this.hideLoading();
            this.showToast('Error generating PRD. Please try again.', 'error');
            
            // Fallback to client-side generation
            this.generateClientSidePRD();
        }
    }
    
    generateClientSidePRD() {
        // Fallback client-side PRD generation when API fails
        console.log('Generating PRD client-side as fallback');
        
        // IMPORTANT: Ensure preview panel stays hidden with !important override
        const previewColumn = document.getElementById('previewColumn');
        if (previewColumn) {
            previewColumn.style.setProperty('display', 'none', 'important');
        }
        
        try {
            const prdDocument = {
                id: `prd_${Date.now()}`,
                content: this.createClientSidePRDContent(),
                metadata: {
                    confidence: 'Medium',
                    createdAt: new Date().toISOString(),
                    version: '1.0',
                    status: 'Draft',
                    completeness: 'Generated'
                }
            };
            
            this.state.prdDocument = prdDocument;
            this.generatedPRD = prdDocument; // Ensure compatibility with delivery functions
            
            // Show PRD immediately in full-screen modal
            this.showFullscreenPRD();
            
            this.state.phase = 'delivery';
            this.updateProgressIndicator();
            this.showDeliveryActions();
            
            // DO NOT show edit controls - they're inside the preview panel we're hiding!
            // const editControls = document.getElementById('editControls');
            // if (editControls) {
            //     editControls.style.display = 'block';
            // }
            
            this.hideLoading();
            this.showToast('PRD generated successfully (client-side)!', 'success');
            
            // Enable download button
            const downloadBtn = document.getElementById('downloadPRD');
            if (downloadBtn) {
                downloadBtn.disabled = false;
            }
        } catch (error) {
            console.error('Client-side PRD generation failed:', error);
            this.hideLoading();
            this.showToast('Failed to generate PRD. Please try again.', 'error');
        }
    }
    
    createClientSidePRDContent() {
        const projectName = this.state.projectDescription || 'Your Project';
        const currentDate = new Date().toLocaleDateString();
        
        let content = `# Product Requirements Document\n\n`;
        content += `**Project:** ${projectName}\n`;
        content += `**Date:** ${currentDate}\n`;
        content += `**Version:** 1.0\n\n`;
        
        content += `## Executive Summary\n\n`;
        content += `${projectName} - A comprehensive solution designed to meet user needs through innovative technology.\n\n`;
        
        if (this.state.answers.length > 0) {
            content += `## Requirements Analysis\n\n`;
            this.state.questions.forEach((question, index) => {
                const answer = this.state.answers[index];
                if (answer && !answer.skipped) {
                    content += `### ${question.question}\n\n`;
                    content += `${answer.answer}\n\n`;
                }
            });
        }
        
        content += `## Technical Requirements\n\n`;
        content += `- Modern web application architecture\n`;
        content += `- Responsive design across all devices\n`;
        content += `- Scalable and maintainable codebase\n`;
        content += `- Security best practices\n\n`;
        
        content += `## Success Metrics\n\n`;
        content += `- User satisfaction > 90%\n`;
        content += `- Performance optimization\n`;
        content += `- Scalable user adoption\n\n`;
        
        content += `---\n*Generated by Coder1 Smart PRD Generator*`;
        
        return content;
    }
    
    downloadPRD() {
        if (!this.state.prdDocument) {
            this.showToast('No PRD available for download. Please generate a PRD first.', 'error');
            return;
        }
        
        try {
            // Create downloadable content
            const content = this.state.prdDocument.content;
            const filename = `PRD_${this.state.projectDescription || 'Project'}_${new Date().toISOString().split('T')[0]}.md`;
            
            // Create blob and download link for PRD
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            
            // Create temporary link and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = filename.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize filename
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            window.URL.revokeObjectURL(url);
            
            this.showToast('PRD downloaded successfully!', 'success');
            
            // Also download CLAUDE.md after a short delay
            setTimeout(() => {
                const claudeMd = this.generateClaudeMd();
                const claudeFilename = `CLAUDE_${this.state.projectDescription || 'Project'}_${new Date().toISOString().split('T')[0]}.md`;
                
                const claudeBlob = new Blob([claudeMd], { type: 'text/markdown;charset=utf-8' });
                const claudeUrl = window.URL.createObjectURL(claudeBlob);
                
                const claudeLink = document.createElement('a');
                claudeLink.href = claudeUrl;
                claudeLink.download = claudeFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
                document.body.appendChild(claudeLink);
                claudeLink.click();
                document.body.removeChild(claudeLink);
                window.URL.revokeObjectURL(claudeUrl);
                
                this.showToast('CLAUDE.md context file also downloaded!', 'success');
            }, 500);
            
        } catch (error) {
            console.error('Error downloading PRD:', error);
            this.showToast('Error downloading PRD. Please try again.', 'error');
        }
    }
    
    showFullscreenPRD() {
        if (!this.state.prdDocument) {
            this.showToast('Please generate a PRD first', 'error');
            return;
        }
        
        // IMPORTANT: Ensure preview panel stays hidden with !important and grid stays at 2 columns
        const previewColumn = document.getElementById('previewColumn');
        if (previewColumn) {
            previewColumn.style.setProperty('display', 'none', 'important');
        }
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.style.gridTemplateColumns = '1fr 200px'; // Keep 2 columns only
            mainContent.classList.remove('with-preview'); // Remove any preview classes
        }
        
        // Convert markdown to HTML for better display
        const htmlContent = this.markdownToHTML(this.state.prdDocument.content);
        
        // Update fullscreen modal content
        const contentDiv = document.getElementById('fullscreenPRDContent');
        if (contentDiv) {
            contentDiv.innerHTML = htmlContent;
        }
        
        // Show the modal
        const modal = document.getElementById('fullscreenModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    closeFullscreenPRD() {
        const modal = document.getElementById('fullscreenModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    async copyPRDToClipboard() {
        if (!this.state.prdDocument) {
            this.showToast('No PRD available to copy', 'error');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(this.state.prdDocument.content);
            this.showToast('PRD copied to clipboard!', 'success');
        } catch (error) {
            console.error('Failed to copy PRD:', error);
            this.showToast('Failed to copy PRD. Please try again.', 'error');
        }
    }
    
    enterEditMode() {
        const contentDiv = document.getElementById('fullscreenPRDContent');
        const editBtn = document.getElementById('editPRD');
        const saveBtn = document.getElementById('savePRD');
        const cancelBtn = document.getElementById('cancelEdit');
        const copyBtn = document.getElementById('copyPRD');
        const downloadBtn = document.getElementById('downloadFromFullscreen');
        
        if (!contentDiv) return;
        
        // Store original content for cancel functionality
        this.originalPRDContent = this.state.prdDocument.content;
        
        // Convert back to markdown in textarea for editing
        const textarea = document.createElement('textarea');
        textarea.id = 'prdEditTextarea';
        textarea.value = this.state.prdDocument.content;
        textarea.style.cssText = `
            width: 100%;
            min-height: 500px;
            height: calc(100vh - 200px);
            padding: 1.5rem;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            background: var(--glass-enhanced);
            color: var(--text-primary);
            border: 1px solid var(--glass-border-enhanced);
            border-radius: 12px;
            resize: vertical;
            outline: none;
        `;
        
        // Replace content with textarea
        contentDiv.innerHTML = '';
        contentDiv.appendChild(textarea);
        
        // Update button visibility
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'inline-flex';
        copyBtn.style.display = 'none';
        downloadBtn.style.display = 'none';
        
        // Focus on textarea
        textarea.focus();
        
        this.showToast('Edit mode enabled. Make your changes and click Save.', 'info');
    }
    
    saveEditedPRD() {
        const textarea = document.getElementById('prdEditTextarea');
        if (!textarea) return;
        
        // Save the edited content
        const editedContent = textarea.value;
        this.state.prdDocument.content = editedContent;
        
        // Update the PRD preview in the sidebar
        this.updatePRDPreview();
        
        // Exit edit mode and show the updated content
        this.exitEditMode(true);
        
        this.showToast('PRD updated successfully!', 'success');
    }
    
    cancelEditMode() {
        // Restore original content
        this.state.prdDocument.content = this.originalPRDContent;
        
        // Exit edit mode without saving
        this.exitEditMode(false);
        
        this.showToast('Edit cancelled. No changes were saved.', 'info');
    }
    
    exitEditMode(saved) {
        const contentDiv = document.getElementById('fullscreenPRDContent');
        const editBtn = document.getElementById('editPRD');
        const saveBtn = document.getElementById('savePRD');
        const cancelBtn = document.getElementById('cancelEdit');
        const copyBtn = document.getElementById('copyPRD');
        const downloadBtn = document.getElementById('downloadFromFullscreen');
        
        if (!contentDiv) return;
        
        // Convert markdown to HTML and display
        const htmlContent = this.markdownToHTML(this.state.prdDocument.content);
        contentDiv.innerHTML = htmlContent;
        
        // Restore button visibility
        editBtn.style.display = 'inline-flex';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        copyBtn.style.display = 'inline-flex';
        downloadBtn.style.display = 'inline-flex';
    }
    
    markdownToHTML(markdown) {
        if (!markdown) return '';
        
        // Simple markdown to HTML conversion
        let html = markdown;
        
        // Headers
        html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
        
        // Bold and italic
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Lists
        html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        html = html.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');
        
        // Code blocks
        html = html.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Line breaks
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        // Clean up empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>(<h[1-6]>)/g, '$1');
        html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
        
        return html;
    }
    
    createComprehensivePRD(data) {
        // Generate an extremely thorough PRD optimized for AI context engineering
        const prd = {
            metadata: {
                version: '2.0',
                generatedAt: new Date().toISOString(),
                sessionId: this.sessionId,
                projectType: this.state.projectType,
                aiOptimized: true
            },
            
            // Executive Summary
            executiveSummary: this.generateExecutiveSummary(),
            
            // Project Context (Critical for AI understanding)
            projectContext: {
                description: this.state.projectDescription,
                problemStatement: this.extractProblemStatement(),
                targetAudience: this.extractTargetAudience(),
                uniqueValueProposition: this.generateUVP(),
                successCriteria: this.generateSuccessCriteria()
            },
            
            // Functional Requirements (Extremely detailed)
            functionalRequirements: this.generateDetailedFunctionalRequirements(),
            
            // Technical Specifications (AI-implementation ready)
            technicalSpecs: {
                architecture: this.generateArchitectureSpec(),
                techStack: this.recommendTechStack(),
                dataModels: this.generateDataModels(),
                apiSpecifications: this.generateAPISpecs(),
                integrations: this.generateIntegrationSpecs(),
                securityRequirements: this.generateSecuritySpecs(),
                performanceRequirements: this.generatePerformanceSpecs()
            },
            
            // User Stories with Acceptance Criteria
            userStories: this.generateComprehensiveUserStories(),
            
            // UI/UX Specifications
            uiuxSpecs: {
                designPrinciples: this.generateDesignPrinciples(),
                wireframes: this.state.wireframes,
                userFlows: this.generateUserFlows(),
                accessibilityRequirements: this.generateAccessibilitySpecs()
            },
            
            // Implementation Roadmap
            implementation: {
                phases: this.generateImplementationPhases(),
                milestones: this.generateMilestones(),
                dependencies: this.identifyDependencies(),
                riskMatrix: this.generateRiskMatrix()
            },
            
            // Testing Strategy
            testingStrategy: {
                unitTests: this.generateUnitTestRequirements(),
                integrationTests: this.generateIntegrationTestPlan(),
                e2eTests: this.generateE2ETestScenarios(),
                performanceTests: this.generatePerformanceTestPlan(),
                securityTests: this.generateSecurityTestPlan()
            },
            
            // Deployment & DevOps
            deployment: {
                environments: this.generateEnvironmentSpecs(),
                cicdPipeline: this.generateCICDRequirements(),
                monitoring: this.generateMonitoringRequirements(),
                scalingStrategy: this.generateScalingStrategy()
            },
            
            // Business Requirements
            businessRequirements: {
                kpis: this.generateKPIs(),
                analytics: this.generateAnalyticsRequirements(),
                compliance: this.generateComplianceRequirements(),
                sla: this.generateSLARequirements()
            },
            
            // Edge Cases & Error Handling
            edgeCases: this.generateEdgeCases(),
            errorHandling: this.generateErrorHandlingStrategy(),
            
            // Glossary & Definitions
            glossary: this.generateProjectGlossary(),
            
            // Appendices
            appendices: {
                competitorAnalysis: this.generateCompetitorAnalysis(),
                marketResearch: this.generateMarketInsights(),
                technicalReferences: this.generateTechnicalReferences()
            }
        };
        
        return prd;
    }
    
    generateDetailedFunctionalRequirements() {
        const requirements = [];
        
        // Extract from answers and enhance with AI-ready details
        this.state.answers.forEach((answer, index) => {
            if (answer.questionId === 'core-features') {
                const features = this.parseFeatures(answer.answer);
                features.forEach(feature => {
                    requirements.push({
                        id: `FR-${index + 1}`,
                        feature: feature.name,
                        description: feature.description || this.enhanceFeatureDescription(feature.name),
                        priority: feature.priority || 'P1',
                        acceptance_criteria: this.generateAcceptanceCriteria(feature),
                        technical_notes: this.generateTechnicalNotes(feature),
                        dependencies: this.identifyFeatureDependencies(feature),
                        effort_estimate: this.estimateEffort(feature)
                    });
                });
            }
        });
        
        // Add standard requirements based on project type
        const standardRequirements = this.getStandardRequirements();
        requirements.push(...standardRequirements);
        
        return requirements;
    }
    
    generateComprehensiveUserStories() {
        const userStories = [];
        const personas = this.identifyPersonas();
        
        personas.forEach(persona => {
            const stories = this.generateStoriesForPersona(persona);
            stories.forEach(story => {
                userStories.push({
                    id: `US-${userStories.length + 1}`,
                    persona: persona.name,
                    story: story.narrative,
                    acceptance_criteria: story.criteria,
                    technical_implementation: story.implementation,
                    test_scenarios: story.testScenarios,
                    priority: story.priority,
                    effort_points: story.effort
                });
            });
        });
        
        return userStories;
    }
    
    generateArchitectureSpec() {
        return {
            overview: 'Modern microservices architecture with cloud-native design',
            components: [
                {
                    name: 'Frontend Application',
                    technology: 'React/Next.js',
                    description: 'Progressive Web App with server-side rendering',
                    responsibilities: ['User interface', 'Client-side routing', 'State management', 'API integration']
                },
                {
                    name: 'API Gateway',
                    technology: 'Node.js/Express or API Gateway service',
                    description: 'Central entry point for all client requests',
                    responsibilities: ['Request routing', 'Authentication', 'Rate limiting', 'Request/response transformation']
                },
                {
                    name: 'Core Services',
                    technology: 'Node.js/Python microservices',
                    description: 'Business logic implementation',
                    services: this.defineCoreMicroservices()
                },
                {
                    name: 'Data Layer',
                    technology: 'PostgreSQL/MongoDB + Redis',
                    description: 'Persistent storage and caching',
                    responsibilities: ['Data persistence', 'Caching', 'Search capabilities', 'Data integrity']
                },
                {
                    name: 'Message Queue',
                    technology: 'RabbitMQ/Kafka',
                    description: 'Asynchronous processing and event streaming',
                    responsibilities: ['Event processing', 'Background jobs', 'Service communication']
                }
            ],
            deployment: {
                platform: 'AWS/GCP/Azure',
                containerization: 'Docker + Kubernetes',
                cdn: 'CloudFront/Cloudflare',
                monitoring: 'DataDog/New Relic'
            }
        };
    }
    
    generateAPISpecs() {
        const apis = [];
        
        // Generate REST API specifications
        const endpoints = this.defineAPIEndpoints();
        endpoints.forEach(endpoint => {
            apis.push({
                method: endpoint.method,
                path: endpoint.path,
                description: endpoint.description,
                authentication: endpoint.auth || 'Bearer token',
                request: {
                    headers: endpoint.headers || this.getStandardHeaders(),
                    params: endpoint.params,
                    body: endpoint.requestBody,
                    validation: endpoint.validation
                },
                response: {
                    success: endpoint.successResponse,
                    errors: endpoint.errorResponses
                },
                example: this.generateAPIExample(endpoint)
            });
        });
        
        return apis;
    }
    
    generateDataModels() {
        const models = [];
        
        // Define core data models based on project type
        const coreModels = this.defineCoreDataModels();
        
        coreModels.forEach(model => {
            models.push({
                name: model.name,
                tableName: model.tableName || model.name.toLowerCase() + 's',
                description: model.description,
                fields: model.fields.map(field => ({
                    name: field.name,
                    type: field.type,
                    required: field.required || false,
                    unique: field.unique || false,
                    indexed: field.indexed || false,
                    default: field.default,
                    validation: field.validation,
                    description: field.description
                })),
                relationships: model.relationships,
                indexes: model.indexes,
                migrations: this.generateMigrationScript(model)
            });
        });
        
        return models;
    }
    
    // Helper methods for PRD generation
    defineCoreMicroservices() {
        const services = [];
        
        if (this.state.projectType === 'saas') {
            services.push(
                { name: 'User Service', responsibilities: ['Authentication', 'User management', 'Roles & permissions'] },
                { name: 'Billing Service', responsibilities: ['Subscription management', 'Payment processing', 'Invoicing'] },
                { name: 'Notification Service', responsibilities: ['Email', 'In-app notifications', 'SMS'] },
                { name: 'Analytics Service', responsibilities: ['Usage tracking', 'Reporting', 'Insights'] }
            );
        } else if (this.state.projectType === 'ecommerce') {
            services.push(
                { name: 'Product Service', responsibilities: ['Product catalog', 'Inventory', 'Categories'] },
                { name: 'Order Service', responsibilities: ['Order processing', 'Cart management', 'Checkout'] },
                { name: 'Payment Service', responsibilities: ['Payment processing', 'Refunds', 'Payment methods'] },
                { name: 'Shipping Service', responsibilities: ['Shipping calculation', 'Tracking', 'Fulfillment'] }
            );
        }
        
        return services;
    }
    
    defineAPIEndpoints() {
        const endpoints = [];
        
        // Authentication endpoints (universal)
        endpoints.push(
            {
                method: 'POST',
                path: '/api/auth/register',
                description: 'Register new user account',
                requestBody: {
                    email: 'string',
                    password: 'string',
                    name: 'string'
                },
                successResponse: {
                    user: 'User object',
                    token: 'JWT token'
                }
            },
            {
                method: 'POST',
                path: '/api/auth/login',
                description: 'Authenticate user',
                requestBody: {
                    email: 'string',
                    password: 'string'
                },
                successResponse: {
                    user: 'User object',
                    token: 'JWT token'
                }
            }
        );
        
        // Add project-specific endpoints
        if (this.state.projectType === 'saas') {
            endpoints.push(
                {
                    method: 'GET',
                    path: '/api/subscription/plans',
                    description: 'Get available subscription plans',
                    successResponse: {
                        plans: 'Array of plan objects'
                    }
                },
                {
                    method: 'POST',
                    path: '/api/subscription/subscribe',
                    description: 'Subscribe to a plan',
                    requestBody: {
                        planId: 'string',
                        paymentMethodId: 'string'
                    },
                    successResponse: {
                        subscription: 'Subscription object'
                    }
                }
            );
        }
        
        return endpoints;
    }
    
    defineCoreDataModels() {
        const models = [];
        
        // User model (universal)
        models.push({
            name: 'User',
            description: 'User account information',
            fields: [
                { name: 'id', type: 'UUID', required: true, unique: true },
                { name: 'email', type: 'string', required: true, unique: true, indexed: true },
                { name: 'password', type: 'string', required: true, description: 'Hashed password' },
                { name: 'name', type: 'string', required: true },
                { name: 'role', type: 'enum', default: 'user', validation: ['user', 'admin', 'moderator'] },
                { name: 'emailVerified', type: 'boolean', default: false },
                { name: 'createdAt', type: 'timestamp', required: true },
                { name: 'updatedAt', type: 'timestamp', required: true }
            ],
            relationships: [
                { type: 'hasMany', model: 'Session' },
                { type: 'hasMany', model: 'AuditLog' }
            ],
            indexes: [
                { fields: ['email'], unique: true },
                { fields: ['createdAt'] }
            ]
        });
        
        // Add project-specific models
        if (this.state.projectType === 'ecommerce') {
            models.push({
                name: 'Product',
                description: 'Product catalog item',
                fields: [
                    { name: 'id', type: 'UUID', required: true, unique: true },
                    { name: 'sku', type: 'string', required: true, unique: true },
                    { name: 'name', type: 'string', required: true, indexed: true },
                    { name: 'description', type: 'text', required: true },
                    { name: 'price', type: 'decimal', required: true },
                    { name: 'inventory', type: 'integer', default: 0 },
                    { name: 'category', type: 'string', indexed: true },
                    { name: 'images', type: 'json', description: 'Array of image URLs' },
                    { name: 'status', type: 'enum', default: 'active', validation: ['active', 'inactive', 'draft'] }
                ],
                relationships: [
                    { type: 'hasMany', model: 'OrderItem' },
                    { type: 'hasMany', model: 'Review' }
                ]
            });
        }
        
        return models;
    }
    
    // UI Methods
    addAssistantMessage(content, type = 'default') {
        const thread = document.getElementById('conversationThread');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                ${this.formatMessage(content)}
            </div>
        `;
        
        thread.appendChild(messageDiv);
        thread.scrollTop = thread.scrollHeight;
        
        this.conversationHistory.push({
            role: 'assistant',
            content,
            timestamp: new Date().toISOString()
        });
    }
    
    addUserMessage(content) {
        const thread = document.getElementById('conversationThread');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="message-content">
                ${this.escapeHtml(content)}
            </div>
        `;
        
        thread.appendChild(messageDiv);
        thread.scrollTop = thread.scrollHeight;
        
        this.conversationHistory.push({
            role: 'user',
            content,
            timestamp: new Date().toISOString()
        });
    }
    
    formatMessage(content) {
        // Convert markdown-like formatting to HTML
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/• /g, '• ');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateContextBar(show) {
        const contextBar = document.getElementById('contextBar');
        const contextText = document.getElementById('contextText');
        
        // Check if elements exist before trying to access them
        if (!contextBar || !contextText) {
            console.log('Context bar elements not found, skipping update');
            return;
        }
        
        if (show) {
            contextBar.style.display = 'flex';
            contextText.textContent = 
                `Asking targeted questions for your ${this.state.projectType} project...`;
        } else {
            contextBar.style.display = 'none';
        }
    }
    
    updateQuestionCounter() {
        const current = document.querySelector('.counter-current');
        const total = document.querySelector('.counter-total');
        const progress = document.querySelector('.counter-progress');
        
        if (current && total) {
            current.textContent = this.state.currentQuestionIndex + 1;
            total.textContent = this.state.questions.length;
            
            // Update progress bar
            if (progress && this.state.questions.length > 0) {
                const progressPercent = Math.round((this.state.currentQuestionIndex + 1) / this.state.questions.length * 100);
                progress.setAttribute('data-progress', progressPercent);
                
                // Update CSS custom property for progress bar width
                progress.style.setProperty('--progress-width', progressPercent + '%');
            }
        }
        
        console.log('📊 Question counter updated:', {
            current: this.state.currentQuestionIndex + 1,
            total: this.state.questions.length
        });
    }
    
    updateProgressIndicator() {
        // Update both horizontal and vertical progress indicators
        document.querySelectorAll('.progress-step, .progress-step-vertical').forEach(step => {
            step.classList.remove('active', 'completed');
            
            const stepPhase = step.dataset.phase;
            if (stepPhase === this.state.phase) {
                step.classList.add('active');
            } else if (this.getPhaseOrder(stepPhase) < this.getPhaseOrder(this.state.phase)) {
                step.classList.add('completed');
            }
        });
    }
    
    getPhaseOrder(phase) {
        const order = { discovery: 1, creation: 2, delivery: 3 };
        return order[phase] || 0;
    }
    
    showCreationActions() {
        console.log('🎬 SHOW CREATION ACTIONS called');
        
        const discoveryActions = document.getElementById('discoveryActions');
        const creationActions = document.getElementById('creationActions');
        
        console.log('🔍 DOM elements check:', {
            discoveryActions: !!discoveryActions,
            creationActions: !!creationActions,
            discoveryDisplay: discoveryActions?.style.display,
            creationDisplay: creationActions?.style.display
        });
        
        if (discoveryActions) {
            discoveryActions.style.display = 'none';
            console.log('✅ Hidden discovery actions');
        } else {
            console.log('❌ discoveryActions element not found!');
        }
        
        if (creationActions) {
            creationActions.style.display = 'flex';
            console.log('✅ Showed creation actions (Generate PRD button)');
            
            // Double-check Generate PRD button exists
            const generateBtn = document.getElementById('generatePRD');
            console.log('🔍 Generate PRD button check:', {
                exists: !!generateBtn,
                visible: generateBtn?.offsetParent !== null,
                disabled: generateBtn?.disabled
            });
        } else {
            console.log('❌ creationActions element not found!');
        }
    }
    
    showDeliveryActions() {
        document.getElementById('creationActions').style.display = 'none';
        document.getElementById('deliveryActions').style.display = 'flex';
        
        // Add clear instructions for users
        this.addAssistantMessage(`✅ **PRD Generated Successfully!**
            
Your Product Requirements Document and CLAUDE.md file are ready and displayed in full-screen view! 

📑 **Your Documents Are Ready:**
• The PRD is now shown in the full-screen modal
• You can edit, download, or copy the document from there
• Close the modal to return to this conversation

🚀 **What Happens When You Click "Send to Claude Code":**
• 📤 Your PRD and CLAUDE.md will be transferred to the IDE
• 📝 CLAUDE.md will be automatically created as a file in the editor
• 🎯 The file will open automatically for you to review
• 💬 The PRD panel will appear with quick action buttons
• 🔑 You'll be prompted for your Claude API key if not already set

🤖 **Ready to Start Building?**
Click the rainbow "Send to Claude Code" button to begin development!

📥 **Other Options:**
• **Download** - Save documents to your computer
• **Export** - Choose different formats (PDF, HTML, JSON)
• **Start New** - Begin a fresh project

The PRD and CLAUDE.md previews are shown in the right panel →`);
    }
    
    toggleSidePanel() {
        const panel = document.getElementById('sidePanel');
        panel.classList.toggle('open');
    }
    
    openSidePanel() {
        const panel = document.getElementById('sidePanel');
        panel.classList.add('open');
    }
    
    closeSidePanel() {
        const panel = document.getElementById('sidePanel');
        panel.classList.remove('open');
    }
    
    // Dynamic Preview Panel Functions
    showPreviewPanel() {
        // DISABLED: Now using fullscreen modal instead of side panel
        console.log('🚫 showPreviewPanel() called but disabled - using fullscreen modal instead');
        return;
    }
    
    hidePreviewPanel() {
        console.log('🎬 Hiding preview panel');
        
        const mainContent = document.getElementById('mainContent');
        const previewColumn = document.getElementById('previewColumn');
        
        if (previewColumn && mainContent) {
            // Add hiding animation class
            previewColumn.classList.add('hiding');
            
            // Wait for animation to complete, then hide
            setTimeout(() => {
                previewColumn.style.display = 'none';
                previewColumn.classList.remove('hiding');
                
                // Update the grid layout
                mainContent.classList.remove('with-preview');
                mainContent.classList.add('without-preview');
                
                console.log('✅ Preview panel hidden and grid layout updated');
            }, 300); // Match the CSS animation duration
        } else {
            console.log('❌ Preview panel elements not found');
        }
    }
    
    togglePreviewPanel() {
        const previewColumn = document.getElementById('previewColumn');
        const isVisible = previewColumn && previewColumn.style.display !== 'none';
        
        if (isVisible) {
            this.hidePreviewPanel();
        } else {
            this.showPreviewPanel();
        }
    }
    
    showLoading(text = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (!overlay) {
            console.log('⚠️ Loading overlay not found, cannot show loading');
            return;
        }
        
        if (loadingText) {
            loadingText.textContent = text;
        } else {
            console.log('⚠️ Loading text element not found');
        }
        
        overlay.style.display = 'flex';
        console.log('⏳ Loading shown:', text);
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            console.log('✅ Loading hidden');
        } else {
            console.log('⚠️ Loading overlay not found, cannot hide loading');
        }
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    displayPRD(prd) {
        // DISABLED: Now using fullscreen modal instead of side panel
        console.log('🚫 displayPRD() called but disabled - using fullscreen modal instead');
        return;
        
        /* Original code commented out:
        const preview = document.getElementById('prdPreview');
        
        if (!preview) {
            console.log('⚠️ PRD preview element not found');
            return;
        }
        */
        
        // Handle different PRD formats - API response has different structure than expected
        let prdHTML;
        if (prd.content && typeof prd.content === 'string') {
            // API response format - content is markdown text
            console.log('📄 Displaying PRD from API response format');
            prdHTML = `
                <div class="prd-document">
                    <div class="prd-header">
                        <h1>📋 Generated PRD</h1>
                        <div class="prd-meta">
                            <span class="prd-version">Version: ${prd.metadata?.version || '1.0'}</span>
                            <span class="prd-date">Generated: ${new Date(prd.metadata?.createdAt).toLocaleString()}</span>
                            <span class="prd-status">${prd.metadata?.status || 'Draft'}</span>
                        </div>
                    </div>
                    <div class="prd-content">
                        ${this.markdownToHTML(prd.content)}
                    </div>
                </div>
            `;
        } else {
            // Custom format - try the old method
            console.log('📄 Displaying PRD from custom format');
            prdHTML = this.generatePRDHTML(prd);
        }
        
        preview.innerHTML = prdHTML;
        
        // Also update the CLAUDE.md preview
        this.updateClaudePreview();
        
        // Update status
        document.getElementById('completenessBar').style.width = '100%';
        document.getElementById('completenessValue').textContent = '100%';
        document.getElementById('confidenceBadge').textContent = 'High';
        document.getElementById('confidenceBadge').style.background = 'var(--success)';
        document.getElementById('confidenceBadge').style.color = 'white';
        
        // Enable download and fullscreen buttons
        document.getElementById('downloadPRD').disabled = false;
        document.getElementById('viewFullscreen').disabled = false;
    }
    
    generatePRDHTML(prd) {
        // Generate comprehensive, AI-optimized PRD document
        return `
            <div class="prd-document">
                <h1>Product Requirements Document</h1>
                <p class="prd-meta">Version ${prd.metadata.version} | Generated: ${new Date(prd.metadata.generatedAt).toLocaleDateString()}</p>
                
                <section>
                    <h2>Executive Summary</h2>
                    <p>${prd.executiveSummary}</p>
                </section>
                
                <section>
                    <h2>Project Context</h2>
                    <h3>Problem Statement</h3>
                    <p>${prd.projectContext.problemStatement}</p>
                    
                    <h3>Target Audience</h3>
                    <p>${prd.projectContext.targetAudience}</p>
                    
                    <h3>Unique Value Proposition</h3>
                    <p>${prd.projectContext.uniqueValueProposition}</p>
                    
                    <h3>Success Criteria</h3>
                    <ul>
                        ${prd.projectContext.successCriteria.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </section>
                
                <section>
                    <h2>Functional Requirements</h2>
                    ${prd.functionalRequirements.map(req => `
                        <div class="requirement">
                            <h4>${req.id}: ${req.feature}</h4>
                            <p>${req.description}</p>
                            <p><strong>Priority:</strong> ${req.priority}</p>
                            <p><strong>Acceptance Criteria:</strong></p>
                            <ul>
                                ${req.acceptance_criteria.map(c => `<li>${c}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </section>
                
                <section>
                    <h2>Technical Architecture</h2>
                    <h3>System Overview</h3>
                    <p>${prd.technicalSpecs.architecture.overview}</p>
                    
                    <h3>Components</h3>
                    ${prd.technicalSpecs.architecture.components.map(comp => `
                        <div class="component">
                            <h4>${comp.name}</h4>
                            <p><strong>Technology:</strong> ${comp.technology}</p>
                            <p>${comp.description}</p>
                            <ul>
                                ${comp.responsibilities.map(r => `<li>${r}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </section>
                
                <!-- Additional sections continue with same level of detail -->
            </div>
        `;
    }
    
    // Additional helper methods
    loadSettings() {
        const saved = localStorage.getItem('prdGeneratorSettings');
        if (saved) {
            this.state.settings = { ...this.state.settings, ...JSON.parse(saved) };
        }
    }
    
    saveSettings() {
        localStorage.setItem('prdGeneratorSettings', JSON.stringify(this.state.settings));
    }
    
    initializeUI() {
        // Set initial theme (dark by default)
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            const themeBtn = document.getElementById('themeToggle');
            if (themeBtn) {
                const icon = themeBtn.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-sun';
                }
            }
        }
    }
    
    toggleTheme() {
        document.body.classList.toggle('light-theme');
        const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', theme);
        
        // Update button icon
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            const icon = themeBtn.querySelector('i');
            if (icon) {
                icon.className = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }
    
    async sendToClaudeCode() {
        if (!this.state.prdDocument) {
            this.showToast('Please generate a PRD first', 'error');
            return;
        }

        try {
            // Extract basic info from PRD (best effort)
            const prdContent = this.state.prdDocument.content || '';
            const metadata = this.state.prdDocument.metadata || {};
            
            // Enhanced title extraction with markdown fallback
            const title = metadata.projectName || 
                         this.state.projectDescription || 
                         prdContent.match(/^#\s+(.+)$/m)?.[1] || // Try to extract from markdown
                         "Project from PRD Generator";
            
            // Minimal required structure - IDE will handle the rest
            const transferData = {
                prd: {
                    title: title,
                    description: prdContent,  // Full PRD content
                    features: [],  // Empty is fine
                    requirements: [],  // Empty is fine
                    technical_specs: [this.generateClaudeMd()]  // IMPORTANT: Must be array!
                },
                user: {
                    // Optional - leave empty for now
                }
            };
            
            // Debug logging for alpha testing
            console.log('[PRD Transfer] Storing data with key: prd_transfer_data');
            console.log('[PRD Transfer] Data structure:', transferData);
            
            // Store with correct key
            sessionStorage.setItem('prd_transfer_data', JSON.stringify(transferData));
            
            // Also try localStorage as backup
            try {
                localStorage.setItem('prd_transfer_data', JSON.stringify(transferData));
                console.log('[PRD Transfer] Data stored in both sessionStorage and localStorage');
            } catch (e) {
                console.log('[PRD Transfer] localStorage failed, using sessionStorage only');
            }
            
            // Show more detailed transfer message
            this.showToast('✨ Transferring PRD & CLAUDE.md to IDE...', 'success');
            
            // Add a more detailed message in the chat
            this.addAssistantMessage(`🚀 **Transferring to Claude Code IDE!**
            
📤 **What's being transferred:**
• Your complete PRD document
• Generated CLAUDE.md file with AI context
• Project metadata and configuration

📝 **What will happen next:**
• The IDE will open in a new tab
• CLAUDE.md will be automatically created
• The file will open in the editor
• You'll see the PRD panel on the right
• You can start building immediately!

⏳ Redirecting now...`);
            
            // Navigate to IDE - use the integrated IDE path
            const IDE_URL = '/ide';  // Use the integrated IDE served by main server
                
            console.log('[PRD Transfer] Navigating to:', IDE_URL);
            
            setTimeout(() => {
                // Open in same tab
                window.location.href = IDE_URL;
            }, 1000);
            
        } catch (error) {
            console.error('[PRD Transfer] Error:', error);
            this.showToast('Failed to transfer PRD', 'error');
        }
    }

    generateInitialPrompt() {
        const projectName = this.state.prdDocument?.metadata?.projectName || this.state.projectDescription || 'the project';
        const projectType = this.state.projectType || 'application';
        const primaryFeature = this.state.answers?.[0]?.answer || 'main functionality';
        
        // Generate context-aware prompt based on project details
        const prompts = {
            saas: `Let's start building ${projectName}. First, set up the project structure with authentication and the ${primaryFeature}. Use the PRD in CLAUDE.md for full specifications.`,
            ecommerce: `Let's build ${projectName}. Begin with the product catalog and shopping cart using the detailed specs in CLAUDE.md.`,
            mobile: `Let's create ${projectName} mobile app. Start with the main navigation and ${primaryFeature} following the PRD in CLAUDE.md.`,
            marketplace: `Let's build ${projectName} marketplace. Begin with user registration and listing creation based on CLAUDE.md specifications.`,
            internal: `Let's build ${projectName} internal tool. Start with the dashboard and ${primaryFeature} as specified in CLAUDE.md.`,
            other: `Let's build ${projectName}. Begin with the core ${primaryFeature} following the comprehensive PRD in CLAUDE.md.`
        };
        
        return prompts[projectType] || prompts.other;
    }
    
    generateClaudeMd() {
        const prd = this.state.prdDocument;
        if (!prd) return '';
        
        const projectName = this.state.projectDescription || 'Project';
        const date = new Date().toISOString();
        return `# CLAUDE.md - ${projectName} Development Guide

This file provides guidance to Claude Code when working on ${projectName}.
Generated from PRD Generator V2 on ${date}

## Project Context
**Original Request:** ${this.state.projectDescription}
**Session ID:** ${this.sessionId}
**Questions Answered:** ${this.state.answers.length}

## Requirements Discovery

### Questions & Answers
${this.state.questions.map((q, i) => {
    const answer = this.state.answers[i];
    return `**Q${i+1}: ${q.question}**
Answer: ${answer?.answer || answer || 'Not provided'}
`;
}).join('\n')}

## Generated PRD Content

${prd.content}

## Implementation Guidelines for Claude Agents

1. **Start with Core Features**: Focus on the must-have features identified in the discovery phase
2. **Follow Technical Constraints**: Adhere to any technical requirements mentioned
3. **Use Success Metrics**: Validate implementation against the defined KPIs
4. **Maintain Project Context**: Reference this CLAUDE.md for all development decisions

## Development Priority Order
Based on the discovery phase, implement features in this order:
${this.state.answers.slice(0, 5).map((a, i) => `${i+1}. ${a.answer || a}`).join('\n')}

---
*Generated by Coder1 PRD Generator V2*
*This file should be placed in the project root for Claude Code reference*
`;
    }
    
    showExportModal() {
        document.getElementById('exportModal').style.display = 'flex';
    }
    
    exportPRD(format) {
        if (!this.state.prdDocument) {
            this.showToast('Please generate a PRD first', 'error');
            return;
        }
        
        // Implementation for different export formats
        switch(format) {
            case 'pdf':
                this.exportAsPDF();
                break;
            case 'markdown':
                this.exportAsMarkdown();
                break;
            case 'json':
                this.exportAsJSON();
                break;
            case 'html':
                this.exportAsHTML();
                break;
        }
        
        // Close modal
        document.getElementById('exportModal').style.display = 'none';
    }
    
    exportAsJSON() {
        const dataStr = JSON.stringify(this.generatedPRD, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `prd-${this.state.projectName || 'project'}-${Date.now()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
    
    exportAsMarkdown() {
        const markdown = this.generateClaudeMd();
        const dataUri = 'data:text/markdown;charset=utf-8,'+ encodeURIComponent(markdown);
        
        const exportFileDefaultName = `prd-${this.state.projectName || 'project'}-${Date.now()}.md`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
    
    exportAsHTML() {
        const html = this.renderPRDHTML(this.generatedPRD);
        const fullHTML = `<!DOCTYPE html>
<html>
<head>
    <title>PRD - ${this.state.projectName}</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; }
        h1, h2, h3 { color: #333; }
        section { margin: 2rem 0; }
        .metadata { background: #f5f5f5; padding: 1rem; border-radius: 8px; }
    </style>
</head>
<body>
    ${html}
</body>
</html>`;
        
        const dataUri = 'data:text/html;charset=utf-8,'+ encodeURIComponent(fullHTML);
        const exportFileDefaultName = `prd-${this.state.projectName || 'project'}-${Date.now()}.html`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
    
    exportAsPDF() {
        // This would require a PDF library or server-side generation
        this.showToast('PDF export requires server-side generation. Use Print to PDF for now.', 'info');
        window.print();
    }
    
    startNewProject() {
        if (confirm('Are you sure you want to start a new project? Current progress will be lost.')) {
            // Reset state
            this.state = {
                phase: 'discovery',
                projectType: null,
                projectName: '',
                projectDescription: '',
                currentQuestionIndex: 0,
                questions: [],
                answers: [],
                prdDocument: null,
                wireframes: null,
                settings: this.state.settings
            };
            
            this.sessionId = this.generateSessionId();
            this.conversationHistory = [];
            this.generatedPRD = null;
            
            // Clear UI
            document.getElementById('conversationThread').innerHTML = this.getWelcomeMessage();
            this.updateProgressIndicator('discovery');
            this.updateActionsBar('discovery');
            
            // Clear panel
            document.getElementById('prdPreview').innerHTML = `
                <div class="prd-placeholder">
                    <i class="fas fa-file-text"></i>
                    <p>Your PRD will appear here as you answer questions</p>
                    <p class="text-muted">The document builds in real-time</p>
                </div>
            `;
            
            this.showToast('New project started', 'success');
        }
    }
    
    getWelcomeMessage() {
        return `
            <div class="message assistant-message welcome-message">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <h3>Welcome to the Smart PRD Generator!</h3>
                    <p>I'll help you create a comprehensive Product Requirements Document through an intelligent conversation. Let's start simple:</p>
                    <p class="highlight-text">What would you like to build?</p>
                    <div class="quick-start-options">
                        <button class="quick-option" data-type="saas">
                            <i class="fas fa-cloud"></i>
                            <span>SaaS Platform</span>
                        </button>
                        <button class="quick-option" data-type="ecommerce">
                            <i class="fas fa-shopping-cart"></i>
                            <span>E-commerce Site</span>
                        </button>
                        <button class="quick-option" data-type="mobile">
                            <i class="fas fa-mobile-alt"></i>
                            <span>Mobile App</span>
                        </button>
                        <button class="quick-option" data-type="marketplace">
                            <i class="fas fa-store"></i>
                            <span>Marketplace</span>
                        </button>
                        <button class="quick-option" data-type="internal">
                            <i class="fas fa-building"></i>
                            <span>Internal Tool</span>
                        </button>
                        <button class="quick-option" data-type="other">
                            <i class="fas fa-ellipsis-h"></i>
                            <span>Other</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    toggleSidePanel() {
        const rightColumn = document.querySelector('.right-column');
        if (rightColumn) {
            if (rightColumn.style.display === 'none') {
                rightColumn.style.display = 'block';
            } else {
                rightColumn.style.display = 'none';
            }
        }
    }
    
    closeSidePanel() {
        const rightColumn = document.querySelector('.right-column');
        if (rightColumn) {
            rightColumn.style.display = 'none';
        }
    }
    
    showSettings() {
        document.getElementById('settingsModal').style.display = 'flex';
    }
    
    closeSettings() {
        document.getElementById('settingsModal').style.display = 'none';
        this.saveSettings();
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.getElementById('toastContainer').appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
    
    // Missing Methods Implementation
    
    skipCurrentQuestion() {
        console.log('🔍 SKIP QUESTION DEBUG - Current state:', {
            phase: this.state.phase,
            currentIndex: this.state.currentQuestionIndex,
            totalQuestions: this.state.questions.length,
            questionsLeft: this.state.questions.length - this.state.currentQuestionIndex,
            answersCount: this.state.answers.length
        });
        
        if (this.state.phase !== 'discovery' || this.state.currentQuestionIndex >= this.state.questions.length) {
            console.log('❌ Cannot skip: wrong phase or no questions left');
            this.showToast('No question to skip', 'info');
            return;
        }
        
        const currentQuestion = this.state.questions[this.state.currentQuestionIndex];
        console.log('⏭️ Skipping question:', currentQuestion);
        
        // Add a placeholder answer for the skipped question
        this.state.answers.push({
            questionId: currentQuestion.id,
            question: currentQuestion.question,
            answer: '[SKIPPED]',
            timestamp: new Date().toISOString(),
            skipped: true
        });
        
        console.log('📊 Added skipped answer. Total answers:', this.state.answers.length);
        
        // Show skip message
        this.addAssistantMessage(`Question skipped. Let's move to the next one.`);
        
        // Move to next question
        this.state.currentQuestionIndex++;
        console.log('📈 NEW INDEX after skip:', this.state.currentQuestionIndex, 'of', this.state.questions.length);
        console.log('🎯 Will now call askNextQuestion - should trigger completeDiscovery if index >= length');
        
        this.askNextQuestion();
        
        this.showToast('Question skipped', 'info');
    }
    
    setQuestionMode(mode) {
        if (this.state.phase !== 'discovery') {
            this.showToast('Cannot change mode during this phase', 'info');
            return;
        }
        
        console.log('🔄 Switching question mode to:', mode);
        
        const oldMode = this.state.settings.questionDepth;
        this.state.settings.questionDepth = mode;
        this.saveSettings();
        
        const modeLabels = {
            quick: 'Quick (3 questions)',
            standard: 'Standard (5 questions)',
            detailed: 'Detailed (10 questions)'
        };
        
        // If we haven't started asking questions yet, just update the setting
        if (this.state.currentQuestionIndex === 0 && this.state.questions.length > 0) {
            // Regenerate questions with new mode
            const currentProjectType = this.state.projectType;
            this.prepareQuestions();
            this.addAssistantMessage(`Switched to ${modeLabels[mode]}. I'll ask the right amount of questions for a focused PRD.`);
            
            // Update the question counter immediately
            const counterDisplay = document.querySelector('.question-counter');
            if (counterDisplay) {
                counterDisplay.textContent = `Question ${this.state.currentQuestionIndex + 1} of ${this.state.questions.length}`;
            }
        } else if (this.state.questions.length === 0) {
            // Just show confirmation
            this.addAssistantMessage(`Switched to ${modeLabels[mode]}. Questions will be adjusted when we start.`);
        } else {
            // Already in progress - adjust remaining questions
            const limits = { quick: 3, standard: 5, detailed: 10 };
            const targetQuestions = limits[mode] || 5;
            
            // If we've already asked more questions than the new limit, just finish
            if (this.state.currentQuestionIndex >= targetQuestions) {
                this.completeDiscovery();
            } else {
                // Truncate remaining questions
                this.state.questions = this.state.questions.slice(0, targetQuestions);
                this.addAssistantMessage(`Switched to ${modeLabels[mode]}. Adjusted to ${targetQuestions} total questions.`);
                
                // Update the question counter
                const counterDisplay = document.querySelector('.question-counter');
                if (counterDisplay) {
                    counterDisplay.textContent = `Question ${this.state.currentQuestionIndex + 1} of ${this.state.questions.length}`;
                }
            }
        }
        
        this.showToast(`Switched to ${modeLabels[mode]}`, 'success');
    }
    
    switchPreviewTab(tab) {
        console.log('📑 Switching to tab:', tab);
        
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            if (content.dataset.tabContent === tab) {
                content.classList.add('active');
                content.style.display = 'block';
            } else {
                content.classList.remove('active');
                content.style.display = 'none';
            }
        });
    }
    
    updatePRDPreview() {
        const previewElement = document.getElementById('prdPreview');
        if (!previewElement) return;
        
        console.log('🔄 Updating PRD preview with', this.state.answers.length, 'answers');
        
        // Check if we're in delivery phase with a generated PRD
        if (this.state.phase === 'delivery' && this.state.prdDocument) {
            // PRD is already displayed by displayPRD function
            return;
        }
        
        if (this.state.answers.length === 0) {
            previewElement.innerHTML = `
                <div class="prd-placeholder">
                    <i class="fas fa-file-text"></i>
                    <p>Your PRD will appear here as you answer questions</p>
                    <p class="text-muted">The document builds in real-time</p>
                </div>
            `;
            return;
        }
        
        // Generate preview content based on current answers
        let previewContent = `
            <div class="prd-preview-content">
                <h3>PRD Preview</h3>
                <div class="preview-section">
                    <h4>Project Overview</h4>
                    <p><strong>Type:</strong> ${this.getProjectTypeLabel()}</p>
                    ${this.state.projectDescription ? `<p><strong>Description:</strong> ${this.state.projectDescription}</p>` : ''}
                </div>
        `;
        
        // Add answers sections
        if (this.state.answers.length > 0) {
            previewContent += `
                <div class="preview-section">
                    <h4>Requirements Gathered</h4>
                    <ul>
            `;
            
            this.state.answers.forEach((answer, index) => {
                if (!answer.skipped) {
                    previewContent += `
                        <li>
                            <strong>${answer.question}</strong>
                            <p>${answer.answer}</p>
                        </li>
                    `;
                }
            });
            
            previewContent += `</ul></div>`;
        }
        
        previewContent += `</div>`;
        previewElement.innerHTML = previewContent;
        
        // Also update CLAUDE.md preview if we have enough data
        this.updateClaudePreview();
        
        // Update progress indicators
        const completenessBar = document.getElementById('completenessBar');
        const completenessValue = document.getElementById('completenessValue');
        
        if (completenessBar && completenessValue) {
            const progress = Math.round((this.state.answers.length / Math.max(this.state.questions.length, 1)) * 100);
            completenessBar.style.width = progress + '%';
            completenessValue.textContent = progress + '%';
        }
    }
    
    updateClaudePreview() {
        const claudePreviewElement = document.getElementById('claudePreview');
        if (!claudePreviewElement) return;
        
        if (this.state.answers.length === 0) {
            claudePreviewElement.innerHTML = `
                <div class="prd-placeholder">
                    <i class="fas fa-robot"></i>
                    <p>CLAUDE.md will be generated with your PRD</p>
                    <p class="text-muted">This file provides AI context for development</p>
                </div>
            `;
            return;
        }
        
        // Generate a preview of the CLAUDE.md content
        const claudeContent = this.generateClaudeMd();
        claudePreviewElement.innerHTML = `
            <div class="prd-preview-content">
                <pre style="white-space: pre-wrap; font-family: 'Monaco', 'Consolas', monospace; font-size: 0.85rem; line-height: 1.6;">
${this.escapeHtml(claudeContent)}
                </pre>
            </div>
        `;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    processCreationInput(message) {
        console.log('🎨 Processing creation phase input:', message);
        
        // In creation phase, user might be providing feedback or requesting changes
        this.addAssistantMessage(`I understand you'd like: "${message}". Let me incorporate that into your PRD generation.`);
        
        // Store as creation feedback
        if (!this.state.creationFeedback) {
            this.state.creationFeedback = [];
        }
        
        this.state.creationFeedback.push({
            feedback: message,
            timestamp: new Date().toISOString()
        });
        
        // Suggest next steps
        this.addAssistantMessage(`Your feedback has been noted. Click "Generate PRD" when you're ready to create your comprehensive document.`);
    }
    
    showChoiceButtons(question) {
        console.log('🔘 Showing choice buttons for:', question);
        
        // This would typically create clickable choice buttons
        // For now, we'll add the choices as text suggestions
        if (question.choices) {
            let choicesHtml = '<div class="question-choices">';
            question.choices.forEach((choice, index) => {
                choicesHtml += `<button class="btn-premium btn-secondary choice-btn" data-choice="${choice}">${choice}</button>`;
            });
            choicesHtml += '</div>';
            
            // Add to last assistant message or create new one
            const lastMessage = document.querySelector('.conversation-thread .message:last-child .message-content');
            if (lastMessage) {
                lastMessage.innerHTML += choicesHtml;
            }
            
            // Add click handlers for choice buttons
            setTimeout(() => {
                document.querySelectorAll('.choice-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const choice = e.target.dataset.choice;
                        this.handleChoiceSelection(choice);
                    });
                });
            }, 100);
        }
    }
    
    handleChoiceSelection(choice) {
        console.log('✅ Choice selected:', choice);
        
        // Add user message
        this.addUserMessage(choice);
        
        // Process as normal input
        this.processDiscoveryInput(choice);
        
        // Remove choice buttons
        document.querySelectorAll('.choice-btn').forEach(btn => btn.remove());
    }
    
    getProjectTypeLabel() {
        const labels = {
            saas: 'SaaS Platform',
            ecommerce: 'E-commerce Site',
            mobile: 'Mobile App',
            marketplace: 'Marketplace',
            internal: 'Internal Tool',
            other: 'Custom Project'
        };
        return labels[this.state.projectType] || 'Unknown';
    }
    
    toggleEditMode() {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        const contentElement = activeTab === 'prd' ? 
            document.getElementById('prdPreview') : 
            document.getElementById('claudePreview');
        
        // Get the inner content div
        const contentDiv = contentElement.querySelector('.prd-preview-content, .prd-document') || contentElement;
        
        if (!this.editMode) {
            // Enter edit mode
            this.editMode = true;
            this.originalContent = {
                prd: document.getElementById('prdPreview').innerHTML,
                claude: document.getElementById('claudePreview').innerHTML
            };
            
            // Make content editable
            contentDiv.contentEditable = true;
            contentDiv.style.outline = '2px solid var(--accent-primary)';
            contentDiv.style.padding = '1rem';
            contentDiv.style.borderRadius = '8px';
            
            // Update buttons
            document.getElementById('editToggleBtn').style.display = 'none';
            document.getElementById('saveEditsBtn').style.display = 'inline-flex';
            document.getElementById('cancelEditsBtn').style.display = 'inline-flex';
            
            this.showToast('You can now edit the document. Click Save when done.', 'info');
        }
    }
    
    saveEdits() {
        if (!this.editMode) return;
        
        // Save the edited content
        const prdContent = document.getElementById('prdPreview').innerHTML;
        const claudeContent = document.getElementById('claudePreview').innerHTML;
        
        // Update the stored PRD document with edited content
        if (this.state.prdDocument) {
            // Extract text content from HTML for storage
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = prdContent;
            this.state.prdDocument.content = tempDiv.textContent || tempDiv.innerText;
        }
        
        // Exit edit mode
        this.exitEditMode();
        
        this.showToast('Changes saved successfully!', 'success');
    }
    
    cancelEdits() {
        if (!this.editMode) return;
        
        // Restore original content
        document.getElementById('prdPreview').innerHTML = this.originalContent.prd;
        document.getElementById('claudePreview').innerHTML = this.originalContent.claude;
        
        // Exit edit mode
        this.exitEditMode();
        
        this.showToast('Changes discarded', 'info');
    }
    
    exitEditMode() {
        this.editMode = false;
        
        // Make content non-editable
        ['prdPreview', 'claudePreview'].forEach(id => {
            const element = document.getElementById(id);
            const contentDiv = element.querySelector('.prd-preview-content, .prd-document') || element;
            contentDiv.contentEditable = false;
            contentDiv.style.outline = 'none';
        });
        
        // Update buttons
        document.getElementById('editToggleBtn').style.display = 'inline-flex';
        document.getElementById('saveEditsBtn').style.display = 'none';
        document.getElementById('cancelEditsBtn').style.display = 'none';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.prdGenerator = new PRDGeneratorV2();
});