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
        this.selectedPattern = null;
        this.generatedPRD = null;
        this.handoffId = null;
        this.patterns = [];
        
        this.init();
    }

    async init() {
        console.log('🎯 Smart PRD Generator initialized');
        
        // Load available patterns
        await this.loadPatterns();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Show initial hero section
        this.showSection('hero-section');
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

    async loadPatterns() {
        try {
            const response = await fetch('/api/smart-prd/patterns');
            const data = await response.json();
            
            if (data.success) {
                this.patterns = data.patterns;
                this.renderPatterns();
                console.log(`📋 Loaded ${this.patterns.length} patterns`);
            }
        } catch (error) {
            console.error('Failed to load patterns:', error);
            this.showToast('Failed to load patterns', 'error');
        }
    }

    renderPatterns() {
        const grid = document.getElementById('patterns-grid');
        if (!grid) return;

        grid.innerHTML = this.patterns.map(pattern => `
            <div class="pattern-card bg-white rounded-xl shadow-lg p-6 cursor-pointer border-2 border-transparent hover:border-primary transition-all"
                 onclick="prdGenerator.selectPattern('${pattern.id}')">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-bold text-gray-900">${pattern.name}</h3>
                    <div class="px-3 py-1 bg-${this.getCategoryColor(pattern.category)}-100 text-${this.getCategoryColor(pattern.category)}-800 rounded-full text-sm font-medium">
                        ${pattern.category}
                    </div>
                </div>
                
                <p class="text-gray-600 mb-4 text-sm">${pattern.description}</p>
                
                <div class="flex justify-between items-center text-sm text-gray-500 mb-4">
                    <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        ${Math.round(pattern.successRate * 100)}% success
                    </span>
                    <span>${pattern.avgTimeToPMF}</span>
                </div>
                
                <div class="flex flex-wrap gap-2">
                    ${pattern.tags.slice(0, 3).map(tag => 
                        `<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">${tag}</span>`
                    ).join('')}
                </div>
                
                <div class="mt-4 pt-4 border-t border-gray-100">
                    <button class="w-full bg-gradient-to-r from-primary to-secondary text-white py-2 rounded-lg hover:shadow-lg transition-all">
                        Select This Pattern
                    </button>
                </div>
            </div>
        `).join('');
    }

    getCategoryColor(category) {
        const colors = {
            'saas': 'blue',
            'ecommerce': 'green',
            'collaboration': 'purple',
            'devtools': 'indigo',
            'social': 'pink',
            'analytics': 'yellow',
            'marketplace': 'red',
            'design': 'teal'
        };
        return colors[category] || 'gray';
    }

    selectPattern(patternId) {
        this.selectedPattern = this.patterns.find(p => p.id === patternId);
        console.log('🎯 Selected pattern:', this.selectedPattern?.name);
        
        this.showToast(`Selected ${this.selectedPattern?.name}`, 'success');
        
        // Start questionnaire for this pattern
        setTimeout(() => {
            this.startQuestionnaire();
        }, 1000);
    }

    async startQuestionnaire() {
        try {
            // Create questionnaire session
            const response = await fetch('/api/smart-prd/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userContext: {
                        selectedPattern: this.selectedPattern?.id,
                        category: this.selectedPattern?.category
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
                    // Questionnaire complete, generate PRD
                    console.log('✅ Questionnaire completed');
                    await this.generatePRD();
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
            </div>
        `;
    }

    updateProgress(progress) {
        if (!progress) return;

        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar) {
            progressBar.style.width = `${progress.progressPercentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `Question ${progress.questionsAnswered + 1} of ${progress.estimatedTotal}`;
        }
    }

    async nextQuestion() {
        const answer = this.getQuestionAnswer();
        
        if (answer === null) {
            this.showToast('Please select an answer', 'warning');
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
                this.currentQuestionIndex++;
                
                // Get next question
                await this.getNextQuestion();
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
                return Array.from(checkboxes).map(cb => cb.value);
                
            case 'text':
                const textarea = document.querySelector(`textarea[name="question-${questionId}"]`);
                return textarea ? textarea.value.trim() : null;
                
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
                    format: 'markdown'
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.generatedPRD = data.prd;
                console.log('📄 PRD generated successfully');
                
                // Show completion
                document.getElementById('generation-loading').classList.add('hidden');
                document.getElementById('generation-complete').classList.remove('hidden');
                
                // Track conversion event
                this.trackEvent('prd_generated', {
                    pattern: this.selectedPattern?.id,
                    sessionId: this.sessionId
                });
                
            } else {
                throw new Error(data.error || 'Failed to generate PRD');
            }
        } catch (error) {
            console.error('Failed to generate PRD:', error);
            this.showToast('Failed to generate PRD', 'error');
        }
    }

    async startHandoff() {
        try {
            const response = await fetch('/api/coder1-handoff/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    prdResult: this.generatedPRD
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
                    sessionId: this.sessionId
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
            <div class="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg">
                <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center progress-step ${step.status === 'completed' ? 'completed' : index === 0 ? 'active' : ''}">
                    <span class="font-bold">${index + 1}</span>
                </div>
                <div class="flex-1">
                    <h3 class="text-lg font-bold text-gray-900 mb-2">${step.title}</h3>
                    <p class="text-gray-600 mb-4">${step.description}</p>
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-500">⏱️ ${step.timeEstimate}</span>
                        ${step.status === 'completed' ? 
                            '<span class="text-sm text-green-600">✅ Completed</span>' : 
                            '<button class="text-sm text-primary hover:underline">Start Step →</button>'
                        }
                    </div>
                </div>
            </div>
        `).join('');
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

    downloadPRD() {
        if (!this.generatedPRD) {
            this.showToast('No PRD available for download', 'error');
            return;
        }

        // Create and download file
        const blob = new Blob([this.generatedPRD.document], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.generatedPRD.metadata.projectName || 'PRD'}.md`;
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
        const sections = ['hero-section', 'pattern-selection', 'questionnaire-section', 'prd-generation', 'handoff-section'];
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

function showPatterns() {
    window.prdGenerator.showPatterns();
}

function showAbout() {
    window.prdGenerator.showAbout();
}

function nextQuestion() {
    window.prdGenerator.nextQuestion();
}

function previousQuestion() {
    // TODO: Implement if needed
}

function downloadPRD() {
    window.prdGenerator.downloadPRD();
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