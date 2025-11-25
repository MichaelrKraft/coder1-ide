/**
 * Smart Repository Patterns PRD Generator - Frontend JavaScript
 * 
 * Handles the interactive questionnaire, pattern selection, PRD generation,
 * and handoff to Coder1 IDE. Optimized for conversion and user experience.
 */

class SmartPRDGenerator {
    constructor() {
        this.sessionId = null;
        this.currentQuestion = null;
        this.currentQuestionIndex = 0;
        this.answers = {};
        this.selectedMode = null; // 'quick' or 'professional'
        this.generatedPRD = null;
        this.handoffId = null;
        this.totalQuestions = 5; // Will be updated based on mode
        this.recommendedTemplates = []; // AI-recommended templates
        this.selectedTemplate = null; // User-selected template
        
        this.init();
    }

    async init() {
        console.log('🎯 Smart PRD Generator initialized');
        
        // Initialize dark mode from localStorage
        this.initDarkMode();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Show initial hero section
        this.showSection('hero-section');
    }
    
    initDarkMode() {
        // Check localStorage for theme preference
        const darkMode = localStorage.getItem('prd-generator-dark-mode') === 'true';
        
        if (darkMode) {
            document.documentElement.classList.add('dark');
            // Update toggle button icon if it exists
            const sunIcon = document.getElementById('sun-icon');
            const moonIcon = document.getElementById('moon-icon');
            if (sunIcon) sunIcon.style.display = 'block';
            if (moonIcon) moonIcon.style.display = 'none';
        }
    }
    
    toggleDarkMode() {
        const isDark = document.documentElement.classList.toggle('dark');
        
        // Save preference to localStorage
        localStorage.setItem('prd-generator-dark-mode', isDark);
        
        // Update toggle button icons
        const sunIcon = document.getElementById('sun-icon');
        const moonIcon = document.getElementById('moon-icon');
        
        if (isDark) {
            // Dark mode: show sun icon, hide moon icon
            if (sunIcon) sunIcon.style.display = 'block';
            if (moonIcon) moonIcon.style.display = 'none';
        } else {
            // Light mode: show moon icon, hide sun icon
            if (sunIcon) sunIcon.style.display = 'none';
            if (moonIcon) moonIcon.style.display = 'block';
        }
        
        console.log(`🌙 Dark mode ${isDark ? 'enabled' : 'disabled'}`);
    }

    setupEventListeners() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                const nextBtn = document.getElementById('next-btn');
                if (nextBtn && !nextBtn.disabled) {
                    nextBtn.click();
                }
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.section) {
                this.showSection(e.state.section);
            }
        });
    }

    goBack(targetSection) {
        // Navigate back to the specified section
        this.showSection(targetSection);
    }
    
    selectMode(mode) {
        this.selectedMode = mode;
        console.log(`📋 Selected mode: ${mode}`);
        
        // Update total questions based on mode
        this.totalQuestions = mode === 'quick' ? 5 : 12;
        
        // Show success message
        const modeTitle = mode === 'quick' ? 'Quick Mode' : 'Professional Mode';
        const timeEstimate = mode === 'quick' ? '3-5 minutes' : '10-15 minutes';
        this.showToast(`${modeTitle} selected (${timeEstimate})`, 'success');
        
        // Skip pattern selection - go directly to questionnaire
        this.startQuestionnaire();
    }

    async startQuestionnaire() {
        try {
            // Create questionnaire session with mode
            const response = await fetch('/api/smart-prd/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userContext: {
                        mode: this.selectedMode,
                        questionCount: this.totalQuestions
                    }
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.sessionId = data.sessionId;
                console.log('📝 Started questionnaire session:', this.sessionId);
                
                // Show questionnaire section and get first question
                this.showSection('questionnaire-section');
                await this.getNextQuestion();
            } else {
                throw new Error(data.error || 'Failed to start questionnaire');
            }
        } catch (error) {
            console.error('Failed to start questionnaire:', error);
            this.showToast('Failed to start questionnaire', 'error');
        }
    }

    async getNextQuestion() {
        try {
            const response = await fetch(`/api/smart-prd/sessions/${this.sessionId}/next-question`);
            const data = await response.json();
            
            if (data.success) {
                if (data.completed) {
                    // Questionnaire complete, show template recommendations
                    console.log('✅ Questionnaire completed');
                    await this.showTemplateRecommendations();
                } else {
                    this.currentQuestion = data.question;
                    this.renderQuestion(data.question);
                    this.updateProgress(data.progress);
                }
            } else {
                throw new Error(data.error || 'Failed to get next question');
            }
        } catch (error) {
            console.error('Failed to get next question:', error);
            this.showToast('Failed to load question', 'error');
        }
    }

    renderQuestion(question) {
        const card = document.getElementById('question-card');
        if (!card) return;

        let questionHTML = `
            <div class="mb-6">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">${question.text}</h3>
                ${question.impact ? `<p class="text-sm text-gray-600 mb-4">💡 ${question.impact}</p>` : ''}
            </div>
        `;

        switch (question.type) {
            case 'choice':
                questionHTML += this.renderChoiceQuestion(question);
                break;
            case 'boolean':
                questionHTML += this.renderBooleanQuestion(question);
                break;
            case 'multiple':
                questionHTML += this.renderMultipleQuestion(question);
                break;
            case 'text':
                questionHTML += this.renderTextQuestion(question);
                break;
            default:
                questionHTML += `<p class="text-red-500">Unknown question type: ${question.type}</p>`;
        }

        card.innerHTML = questionHTML;

        // Focus first input for accessibility
        const firstInput = card.querySelector('input, textarea, select');
        if (firstInput) {
            firstInput.focus();
        }
    }

    renderChoiceQuestion(question) {
        return `
            <div class="space-y-3">
                ${question.choices.map((choice, index) => `
                    <label class="block cursor-pointer">
                        <div class="p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition-all choice-option" data-value="${choice.value}">
                            <div class="flex items-start">
                                <input type="radio" name="question-${question.id}" value="${choice.value}" class="sr-only">
                                <div class="flex-1">
                                    <div class="flex items-center mb-2">
                                        <div class="w-5 h-5 border-2 border-gray-300 rounded-full mr-3 radio-indicator"></div>
                                        <span class="font-semibold text-gray-900">${choice.label}</span>
                                    </div>
                                    ${choice.description ? `<p class="text-sm text-gray-600 ml-8">${choice.description}</p>` : ''}
                                    ${choice.impact ? `<p class="text-xs text-blue-600 ml-8 mt-1">🔍 ${choice.impact}</p>` : ''}
                                </div>
                            </div>
                        </div>
                    </label>
                `).join('')}
            </div>
        `;
    }

    renderBooleanQuestion(question) {
        return `
            <div class="flex gap-4">
                <label class="flex-1 cursor-pointer">
                    <div class="p-6 border-2 border-gray-200 rounded-lg hover:border-primary transition-all choice-option text-center" data-value="true">
                        <input type="radio" name="question-${question.id}" value="true" class="sr-only">
                        <div class="text-4xl mb-2">✅</div>
                        <span class="font-semibold text-gray-900">Yes</span>
                    </div>
                </label>
                <label class="flex-1 cursor-pointer">
                    <div class="p-6 border-2 border-gray-200 rounded-lg hover:border-primary transition-all choice-option text-center" data-value="false">
                        <input type="radio" name="question-${question.id}" value="false" class="sr-only">
                        <div class="text-4xl mb-2">❌</div>
                        <span class="font-semibold text-gray-900">No</span>
                    </div>
                </label>
            </div>
        `;
    }

    renderMultipleQuestion(question) {
        return `
            <div class="space-y-3">
                <p class="text-sm text-gray-600 mb-4">Select all that apply:</p>
                ${question.choices.map((choice, index) => `
                    <label class="block cursor-pointer">
                        <div class="p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition-all choice-option" data-value="${choice.value}">
                            <div class="flex items-center">
                                <input type="checkbox" name="question-${question.id}" value="${choice.value}" class="sr-only">
                                <div class="w-5 h-5 border-2 border-gray-300 rounded mr-3 checkbox-indicator"></div>
                                <span class="font-semibold text-gray-900">${choice.label}</span>
                            </div>
                        </div>
                    </label>
                `).join('')}
            </div>
        `;
    }

    renderTextQuestion(question) {
        // Generate example HTML if examples exist
        let examplesHTML = '';
        if (question.examples && question.examples.length > 0) {
            examplesHTML = `
                <details class="mt-4">
                    <summary class="text-sm text-primary hover:text-secondary cursor-pointer font-medium inline-flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Show example answers
                    </summary>
                    <div class="mt-3 space-y-2 pl-5">
                        ${question.examples.map((example, i) => `
                            <div class="text-sm text-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600">
                                <span class="font-medium text-gray-700 dark:text-gray-300">Example ${i + 1}:</span> ${example}
                            </div>
                        `).join('')}
                    </div>
                </details>
            `;
        }
        
        return `
            <div>
                <textarea 
                    name="question-${question.id}" 
                    placeholder="${question.placeholder || 'Enter your answer...'}"
                    maxlength="${question.maxLength || 500}"
                    class="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-all"
                    rows="4"
                ></textarea>
                <p class="text-xs text-gray-500 mt-2">Maximum ${question.maxLength || 500} characters</p>
                ${examplesHTML}
            </div>
        `;
    }

    updateProgress(progress) {
        if (!progress) return;

        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar) {
            progressBar.style.width = `${progress.percentage}%`;
        }
        
        if (progressText) {
            const modeLabel = this.selectedMode === 'quick' ? '⚡ Quick' : '🏆 Professional';
            progressText.textContent = `${modeLabel} - Question ${progress.current} of ${progress.total}`;
        }
    }
    
    async skipToGenerate() {
        console.log('⏭️ Skipping to generation with current answers');
        
        // Show loading message
        this.showToast('Using AI to fill in remaining details...', 'info');
        
        // Mark session as ready for generation
        try {
            const response = await fetch(`/api/smart-prd/sessions/${this.sessionId}/skip-to-generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentAnswers: this.answers,
                    mode: this.selectedMode
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                await this.generatePRD();
            } else {
                throw new Error(data.error || 'Failed to skip to generation');
            }
        } catch (error) {
            console.error('Failed to skip to generation:', error);
            this.showToast('Failed to skip to generation', 'error');
        }
    }

    async nextQuestion() {
        const answer = this.getQuestionAnswer();
        
        // Validate answer is not null, undefined, empty string, or empty array
        if (answer === null || answer === undefined || 
            (typeof answer === 'string' && answer.trim() === '') ||
            (Array.isArray(answer) && answer.length === 0)) {
            this.showToast('Please provide an answer before continuing', 'warning');
            return;
        }

        try {
            // Submit answer
            const response = await fetch(`/api/smart-prd/sessions/${this.sessionId}/answers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questionId: this.currentQuestion.id,
                    answer: answer
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.answers[this.currentQuestion.id] = answer;
                
                if (data.complete) {
                    // Questionnaire complete, show template recommendations
                    console.log('✅ Questionnaire completed');
                    await this.showTemplateRecommendations();
                } else if (data.nextQuestion) {
                    // Update to next question
                    this.currentQuestionIndex = data.currentIndex - 1;
                    this.currentQuestion = data.nextQuestion;
                    this.renderQuestion(data.nextQuestion);
                    this.updateProgress({
                        current: data.currentIndex,
                        total: data.totalQuestions,
                        percentage: Math.round((data.currentIndex / data.totalQuestions) * 100)
                    });
                } else {
                    throw new Error('No next question provided');
                }
            } else {
                throw new Error(data.error || 'Failed to submit answer');
            }
        } catch (error) {
            console.error('Failed to submit answer:', error);
            this.showToast('Failed to submit answer', 'error');
        }
    }

    getQuestionAnswer() {
        if (!this.currentQuestion) return null;

        const questionId = this.currentQuestion.id;
        
        switch (this.currentQuestion.type) {
            case 'choice':
            case 'boolean':
                const selected = document.querySelector(`input[name="question-${questionId}"]:checked`);
                return selected ? selected.value : null;
                
            case 'multiple':
                const checkboxes = document.querySelectorAll(`input[name="question-${questionId}"]:checked`);
                const values = Array.from(checkboxes).map(cb => cb.value);
                return values.length > 0 ? values : null;
                
            case 'text':
                const textarea = document.querySelector(`textarea[name="question-${questionId}"]`);
                const textValue = textarea ? textarea.value.trim() : '';
                return textValue.length > 0 ? textValue : null;
                
            default:
                return null;
        }
    }

    async generatePRD() {
        this.showSection('prd-generation');
        
        try {
            const response = await fetch(`/api/smart-prd/sessions/${this.sessionId}/generate-prd`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    format: 'markdown',
                    selectedTemplate: this.selectedTemplate ? {
                        id: this.selectedTemplate.template.id,
                        name: this.selectedTemplate.template.name,
                        description: this.selectedTemplate.template.description,
                        githubUrl: this.selectedTemplate.template.githubUrl,
                        docsUrl: this.selectedTemplate.template.docsUrl,
                        techStack: this.selectedTemplate.template.techStack,
                        features: this.selectedTemplate.template.features,
                        estimatedSetupTime: this.selectedTemplate.template.estimatedSetupTime,
                        difficultyLevel: this.selectedTemplate.template.difficultyLevel,
                        compatibilityScore: this.selectedTemplate.compatibilityScore,
                        matchReasons: this.selectedTemplate.matchReasons
                    } : null
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.generatedPRD = data.prd;
                console.log('📄 PRD generated successfully');
                
                // Show completion
                document.getElementById('generation-loading').classList.add('hidden');
                document.getElementById('generation-complete').classList.remove('hidden');
                
                // Render PRD preview
                this.renderPRDPreview(data.prd);
                
                // Track conversion event
                this.trackEvent('prd_generated', {
                    sessionId: this.sessionId,
                    hasTemplate: !!this.selectedTemplate
                });
                
            } else {
                throw new Error(data.error || 'Failed to generate PRD');
            }
        } catch (error) {
            console.error('Failed to generate PRD:', error);
            this.showToast('Failed to generate PRD', 'error');
        }
    }

    async showTemplateRecommendations() {
        this.showSection('template-recommendations');
        
        try {
            // Show loading state
            document.getElementById('templates-loading').classList.remove('hidden');
            document.getElementById('template-cards-container').classList.add('hidden');
            
            // Fetch template recommendations based on requirements
            const recommendations = await this.fetchTemplateRecommendations();
            
            if (recommendations && recommendations.length > 0) {
                this.recommendedTemplates = recommendations;
                this.renderTemplateCards(recommendations);
                
                // Hide loading, show cards
                document.getElementById('templates-loading').classList.add('hidden');
                document.getElementById('template-cards-container').classList.remove('hidden');
                
                console.log(`🎯 Showing ${recommendations.length} template recommendations`);
            } else {
                // No recommendations, skip directly to PRD
                console.log('⚠️ No template recommendations found, proceeding to PRD');
                await this.generatePRD();
            }
        } catch (error) {
            console.error('Failed to fetch templates:', error);
            // On error, skip templates and proceed to PRD
            this.showToast('Continuing without template recommendations', 'info');
            await this.generatePRD();
        }
    }

    async fetchTemplateRecommendations() {
        try {
            const response = await fetch('/api/templates/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requirements: {
                        initialRequest: this.answers['initial-idea'] || this.answers['product-description'] || '',
                        features: this.extractFeaturesFromAnswers(),
                        techStack: this.extractTechStackFromAnswers(),
                        scope: 'mvp',
                        projectType: 'web-application'
                    },
                    limit: 5,
                    minScore: 50
                })
            });

            const data = await response.json();
            
            if (data.success) {
                return data.templates || [];
            } else {
                console.error('Template API error:', data.error);
                return [];
            }
        } catch (error) {
            console.error('Failed to fetch template recommendations:', error);
            return [];
        }
    }

    extractFeaturesFromAnswers() {
        // Extract features from user answers
        const features = [];
        const answers = Object.values(this.answers);
        
        // Common keywords to look for
        const featureKeywords = {
            'authentication': ['login', 'signup', 'auth', 'user'],
            'teams': ['team', 'workspace', 'organization', 'collaborate'],
            'billing': ['payment', 'subscription', 'billing', 'stripe'],
            'admin': ['admin', 'dashboard', 'management'],
            'api': ['api', 'rest', 'graphql', 'endpoint']
        };
        
        answers.forEach(answer => {
            if (typeof answer === 'string') {
                const lowerAnswer = answer.toLowerCase();
                Object.entries(featureKeywords).forEach(([feature, keywords]) => {
                    if (keywords.some(kw => lowerAnswer.includes(kw)) && !features.includes(feature)) {
                        features.push(feature);
                    }
                });
            }
        });
        
        return features;
    }

    extractTechStackFromAnswers() {
        // Extract tech stack preferences from answers
        const techStack = {};
        const answers = Object.values(this.answers);
        const answersStr = answers.join(' ').toLowerCase();
        
        // Frontend frameworks
        if (answersStr.includes('react')) techStack.frontend = 'React';
        else if (answersStr.includes('vue')) techStack.frontend = 'Vue';
        else if (answersStr.includes('next')) techStack.frontend = 'Next.js';
        
        // Backend
        if (answersStr.includes('node') || answersStr.includes('express')) techStack.backend = 'Node.js';
        else if (answersStr.includes('django')) techStack.backend = 'Django';
        else if (answersStr.includes('go') || answersStr.includes('golang')) techStack.backend = 'Go';
        
        // Database
        if (answersStr.includes('postgres')) techStack.database = 'PostgreSQL';
        else if (answersStr.includes('mongo')) techStack.database = 'MongoDB';
        else if (answersStr.includes('supabase')) techStack.database = 'Supabase';
        
        return techStack;
    }

    renderTemplateCards(recommendations) {
        const container = document.getElementById('template-cards');
        if (!container) return;
        
        container.innerHTML = recommendations.map(rec => this.renderTemplateCard(rec)).join('');
    }

    renderTemplateCard({ template, compatibilityScore, matchReasons, missingFeatures }) {
        const badgeClass = compatibilityScore >= 80 ? 'bg-green-100 text-green-800 border-green-300' : 
                          compatibilityScore >= 60 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 
                          'bg-gray-100 text-gray-800 border-gray-300';
        
        return `
            <div class="template-card bg-white rounded-lg shadow-lg p-6 border-2 border-transparent hover:border-primary transition-all cursor-pointer" 
                 data-template-id="${template.id}"
                 onclick="prdGenerator.selectTemplate('${template.id}')">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-xl font-bold text-gray-900">${template.name}</h3>
                    <span class="px-3 py-1 rounded-full text-sm font-semibold border ${badgeClass}">
                        ${compatibilityScore}% Match
                    </span>
                </div>
                
                <p class="text-gray-600 mb-4">${template.description}</p>
                
                <div class="flex flex-wrap gap-2 mb-4">
                    ${this.renderTechBadges(template.techStack)}
                </div>
                
                <div class="space-y-2 mb-4 text-sm">
                    ${matchReasons.slice(0, 3).map(reason => `
                        <div class="text-gray-700">${reason}</div>
                    `).join('')}
                </div>
                
                ${missingFeatures && missingFeatures.length > 0 ? `
                    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 text-sm">
                        <strong class="text-yellow-800">⚠️ You'll need to add:</strong>
                        <div class="text-yellow-700 mt-1">${missingFeatures.slice(0, 3).join(', ')}</div>
                    </div>
                ` : ''}
                
                <div class="flex gap-3">
                    <a href="${template.githubUrl}" target="_blank" onclick="event.stopPropagation()" 
                       class="flex-1 text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium">
                        <i class="fab fa-github"></i> GitHub ${template.metadata?.stars ? `(${template.metadata.stars}⭐)` : ''}
                    </a>
                    ${template.docsUrl ? `
                        <a href="${template.docsUrl}" target="_blank" onclick="event.stopPropagation()" 
                           class="flex-1 text-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium">
                            📚 Docs
                        </a>
                    ` : ''}
                </div>
                
                <div class="mt-3 text-xs text-gray-500 text-center">
                    Setup time: ${template.estimatedSetupTime} • ${template.difficultyLevel}
                </div>
            </div>
        `;
    }

    renderTechBadges(techStack) {
        const badges = [];
        if (techStack.frontend) badges.push(`<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">${techStack.frontend}</span>`);
        if (techStack.backend) badges.push(`<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">${techStack.backend}</span>`);
        if (techStack.database) badges.push(`<span class="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">${techStack.database}</span>`);
        if (techStack.auth) badges.push(`<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">${techStack.auth}</span>`);
        return badges.join('');
    }

    selectTemplate(templateId) {
        // Remove selection from all cards
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('border-primary', 'ring-2', 'ring-primary', 'ring-opacity-50');
        });
        
        // Add selection to clicked card
        const selectedCard = document.querySelector(`[data-template-id="${templateId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('border-primary', 'ring-2', 'ring-primary', 'ring-opacity-50');
        }
        
        // Store selected template
        this.selectedTemplate = this.recommendedTemplates.find(rec => rec.template.id === templateId);
        
        // Enable proceed button
        const proceedBtn = document.getElementById('proceed-to-prd-btn');
        if (proceedBtn) {
            proceedBtn.disabled = false;
        }
        
        console.log(`✅ Selected template: ${this.selectedTemplate.template.name}`);
        this.showToast(`Selected template: ${this.selectedTemplate.template.name}`, 'success');
    }

    skipTemplates() {
        this.selectedTemplate = null;
        console.log('⏭️ Skipping template recommendations');
        this.showToast('Starting from scratch - no template selected', 'info');
        this.generatePRD();
    }

    proceedToPRD() {
        if (!this.selectedTemplate) {
            this.showToast('Please select a template or skip to continue', 'warning');
            return;
        }
        console.log(`➡️ Proceeding to PRD with template: ${this.selectedTemplate.template.name}`);
        this.generatePRD();
    }

    async startHandoff() {
        try {
            // Ensure we have a PRD generated
            if (!this.generatedPRD) {
                this.showToast('Please generate a PRD first', 'warning');
                return;
            }
            
            // Extract product name from answers or PRD
            const productName = this.answers['product-name'] || 
                                this.answers['productName'] || 
                                'New Product';
            
            const response = await fetch('/api/coder1-handoff/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prdContent: this.generatedPRD,
                    sessionId: this.sessionId,
                    productName: productName,
                    selectedTemplate: this.selectedTemplate ? {
                        id: this.selectedTemplate.template.id,
                        name: this.selectedTemplate.template.name,
                        githubUrl: this.selectedTemplate.template.githubUrl,
                        compatibilityScore: this.selectedTemplate.compatibilityScore
                    } : null
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.handoffId = data.handoff.id;
                console.log('🤝 Handoff created:', this.handoffId);
                
                this.showSection('handoff-section');
                this.renderHandoffSteps(data.handoff);
                
                // Track conversion event
                this.trackEvent('handoff_started', {
                    handoffId: this.handoffId,
                    sessionId: this.sessionId,
                    productName: productName
                });
                
            } else {
                throw new Error(data.error || 'Failed to create handoff');
            }
        } catch (error) {
            console.error('Failed to start handoff:', error);
            this.showToast('Failed to start handoff', 'error');
        }
    }

    renderHandoffSteps(handoff) {
        const container = document.getElementById('handoff-steps');
        if (!container) return;

        container.innerHTML = handoff.steps.map((step, index) => `
            <div class="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg" data-step-id="${step.id}">
                <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center progress-step ${step.status === 'completed' ? 'completed' : index === 0 ? 'active' : ''}">
                    <span class="font-bold">${index + 1}</span>
                </div>
                <div class="flex-1">
                    <h3 class="text-lg font-bold text-gray-900 mb-2">${step.title}</h3>
                    <p class="text-gray-600 mb-4">${step.description}</p>
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-500">⏱️ ${step.timeEstimate || '~30 seconds'}</span>
                        <span class="step-status-${step.id}">
                            ${step.status === 'completed' ? 
                                '<span class="text-sm text-green-600">✅ Completed</span>' : 
                                step.status === 'in-progress' ?
                                '<span class="text-sm text-blue-600">⏳ Processing...</span>' :
                                `<button onclick="window.prdGenerator.executeStep('${step.id}')" class="text-sm text-primary hover:underline font-semibold">Start Step →</button>`
                            }
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async executeStep(stepId) {
        try {
            console.log('🚀 Executing step:', stepId);
            
            // Update UI to show in-progress
            const statusElement = document.querySelector(`.step-status-${stepId}`);
            if (statusElement) {
                statusElement.innerHTML = '<span class="text-sm text-blue-600">⏳ Processing...</span>';
            }
            
            // Simulate step execution (in real implementation, call backend API)
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Update UI to show completed
            if (statusElement) {
                statusElement.innerHTML = '<span class="text-sm text-green-600">✅ Completed</span>';
            }
            
            // Update step circle to completed
            const stepDiv = document.querySelector(`[data-step-id="${stepId}"]`);
            if (stepDiv) {
                const circle = stepDiv.querySelector('.progress-step');
                if (circle) {
                    circle.classList.remove('active');
                    circle.classList.add('completed');
                }
            }
            
            this.showToast('Step completed successfully', 'success');
            
        } catch (error) {
            console.error('Step execution failed:', error);
            this.showToast('Step execution failed', 'error');
            
            // Revert UI to pending state
            const statusElement = document.querySelector(`.step-status-${stepId}`);
            if (statusElement) {
                statusElement.innerHTML = `<button onclick="window.prdGenerator.executeStep('${stepId}')" class="text-sm text-primary hover:underline font-semibold">Start Step →</button>`;
            }
        }
    }

    async launchIDE() {
        try {
            const response = await fetch(`/api/coder1-handoff/${this.handoffId}/launch-ide`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.success) {
                // Track final conversion
                this.trackEvent('ide_launched', {
                    handoffId: this.handoffId,
                    sessionId: this.sessionId
                });
                
                this.showToast('Launching Coder1 IDE...', 'success');
                
                // Open IDE in new tab
                setTimeout(() => {
                    window.open(data.ideUrl, '_blank');
                }, 1000);
                
            } else {
                throw new Error(data.error || 'Failed to launch IDE');
            }
        } catch (error) {
            console.error('Failed to launch IDE:', error);
            this.showToast('Failed to launch IDE', 'error');
        }
    }

    renderPRDPreview(prdContent) {
        const previewContainer = document.getElementById('prd-preview');
        if (!previewContainer) return;
        
        // Convert markdown to HTML for better preview
        // For now, we'll do a simple conversion - in production you'd use a markdown parser
        const htmlContent = prdContent
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 text-primary">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
            .replace(/^\- (.*$)/gim, '<li class="ml-4">• $1</li>')
            .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*)\*/g, '<em>$1</em>')
            .replace(/```[a-z]*\n([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded my-2 text-sm overflow-x-auto"><code>$1</code></pre>')
            .replace(/\n\n/g, '</p><p class="mb-4">')
            .replace(/\n/g, '<br>');
        
        previewContainer.innerHTML = `
            <div class="prose prose-lg max-w-none">
                <p class="mb-4">${htmlContent}</p>
            </div>
        `;
    }

    downloadPRD() {
        if (!this.generatedPRD) {
            this.showToast('No PRD available for download', 'error');
            return;
        }

        // Create and download file
        const blob = new Blob([this.generatedPRD], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PRD_${this.selectedTemplate?.template?.id || 'custom'}_${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('PRD downloaded successfully!', 'success');
        
        // Track download event
        this.trackEvent('prd_downloaded', {
            sessionId: this.sessionId
        });
    }

    showSection(sectionId) {
        // Hide all sections
        const sections = ['hero-section', 'mode-selection', 'questionnaire-section', 'template-recommendations', 'prd-generation', 'handoff-section'];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                section.classList.add('hidden');
            }
        });

        // Show target section
        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.remove('hidden');
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Update browser history
        history.pushState({ section: sectionId }, '', `#${sectionId}`);
    }

    showPatterns() {
        this.showSection('pattern-selection');
    }

    showAbout() {
        // TODO: Implement about modal
        this.showToast('About section coming soon!', 'info');
    }

    showHelp() {
        // TODO: Implement help modal
        this.showToast('Need help? Contact support!', 'info');
    }

    launchCoder1() {
        window.open('http://localhost:3001/ide', '_blank');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const toast = document.createElement('div');
        toast.className = `${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg animate-slide-up`;
        toast.textContent = message;

        container.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    trackEvent(eventName, properties = {}) {
        // Analytics tracking
        console.log('📊 Event:', eventName, properties);
        
        // TODO: Integrate with analytics service
        // gtag('event', eventName, properties);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.prdGenerator = new SmartPRDGenerator();
    
    // Set up choice option interactions
    document.addEventListener('click', (e) => {
        if (e.target.closest('.choice-option')) {
            const option = e.target.closest('.choice-option');
            const input = option.querySelector('input');
            
            if (input.type === 'radio') {
                // Clear other selections
                const name = input.name;
                document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
                    radio.closest('.choice-option').classList.remove('border-primary', 'bg-primary-50');
                    const indicator = radio.closest('.choice-option').querySelector('.radio-indicator');
                    if (indicator) {
                        indicator.classList.remove('bg-primary', 'border-primary');
                        indicator.classList.add('border-gray-300');
                    }
                });
                
                // Select this option
                input.checked = true;
                option.classList.add('border-primary', 'bg-blue-50');
                const indicator = option.querySelector('.radio-indicator');
                if (indicator) {
                    indicator.classList.add('bg-primary', 'border-primary');
                    indicator.classList.remove('border-gray-300');
                }
            } else if (input.type === 'checkbox') {
                input.checked = !input.checked;
                if (input.checked) {
                    option.classList.add('border-primary', 'bg-blue-50');
                    const indicator = option.querySelector('.checkbox-indicator');
                    if (indicator) {
                        indicator.classList.add('bg-primary', 'border-primary');
                        indicator.innerHTML = '<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
                    }
                } else {
                    option.classList.remove('border-primary', 'bg-blue-50');
                    const indicator = option.querySelector('.checkbox-indicator');
                    if (indicator) {
                        indicator.classList.remove('bg-primary', 'border-primary');
                        indicator.innerHTML = '';
                    }
                }
            }
        }
    });
});

// Global functions for onclick handlers
function startQuestionnaire() {
    window.prdGenerator.startQuestionnaire();
}

function showModeSelection() {
    window.prdGenerator.showSection('mode-selection');
}

function selectMode(mode) {
    window.prdGenerator.selectMode(mode);
}

function showPatterns() {
    window.prdGenerator.showPatterns();
}

function showAbout() {
    window.prdGenerator.showAbout();
}

function nextQuestion() {
    window.prdGenerator.nextQuestion();
}

function skipToGenerate() {
    window.prdGenerator.skipToGenerate();
}

function previousQuestion() {
    // TODO: Implement if needed
}

function downloadPRD() {
    window.prdGenerator.downloadPRD();
}

function exportPDFWrapper() {
    if (window.PRDExportUtils && window.prdGenerator && window.prdGenerator.generatedPRD) {
        window.PRDExportUtils.exportAsPDF(window.prdGenerator.generatedPRD);
    } else {
        console.error('Export utilities or PRD content not available');
        alert('Unable to export PDF. Please ensure the PRD has been generated.');
    }
}

function exportJSONWrapper() {
    if (window.PRDExportUtils && window.prdGenerator && window.prdGenerator.generatedPRD) {
        window.PRDExportUtils.exportAsJSON(
            window.prdGenerator.generatedPRD,
            window.prdGenerator.answers || {},
            window.prdGenerator.selectedTemplate || null,
            window.prdGenerator.selectedMode || 'unknown'
        );
    } else {
        console.error('Export utilities or PRD content not available');
        alert('Unable to export JSON. Please ensure the PRD has been generated.');
    }
}

function startHandoff() {
    window.prdGenerator.startHandoff();
}

function launchIDE() {
    window.prdGenerator.launchIDE();
}

function launchCoder1() {
    window.prdGenerator.launchCoder1();
}

function showHelp() {
    window.prdGenerator.showHelp();
}

// Add global function for dark mode toggle
function toggleDarkMode() {
    console.log('Toggle dark mode clicked');
    if (window.prdGenerator) {
        window.prdGenerator.toggleDarkMode();
    } else {
        console.error('PRD Generator not initialized');
        // Fallback: try to toggle dark mode directly
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('prd-generator-dark-mode', isDark);
        console.log(`Dark mode ${isDark ? 'enabled' : 'disabled'} (fallback)`);
    }
}

// Make functions globally available immediately
window.toggleDarkMode = toggleDarkMode;