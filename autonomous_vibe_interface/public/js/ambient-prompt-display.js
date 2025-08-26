/**
 * Ambient Prompt Display System
 * Continuously rotates through intelligent MCP prompt suggestions
 * Provides context-aware recommendations to discover features
 */

class AmbientPromptDisplay {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentIndex = 0;
        this.rotationInterval = null;
        this.isPaused = false;
        this.rotationSpeed = 7000; // 7 seconds default
        this.lastUserActivity = Date.now();
        this.context = {
            currentFile: null,
            fileType: null,
            recentErrors: [],
            idleTime: 0,
            timeOfDay: this.getTimeOfDay(),
            gitStatus: 'clean',
            lastExecutedPrompts: []
        };
        
        // Will be populated from mcp-prompts-library.json
        this.prompts = [];
        this.filteredPrompts = [];
        
        this.init();
    }
    
    async init() {
        await this.loadPrompts();
        this.setupContainer();
        this.setupContextMonitoring();
        this.startRotation();
        this.bindEvents();
    }
    
    async loadPrompts() {
        try {
            const response = await fetch('/api/mcp-prompts/library');
            const data = await response.json();
            this.prompts = data.prompts || [];
            this.filteredPrompts = [...this.prompts];
        } catch (error) {
            console.error('Failed to load prompts:', error);
            // Fallback to default prompts
            this.loadDefaultPrompts();
        }
    }
    
    loadDefaultPrompts() {
        this.prompts = [
            {
                id: 'quick-start',
                command: '/coder1/quick-start',
                title: 'Quick Start Guide',
                description: 'Learn what I can do for you',
                icon: '🚀',
                category: 'getting-started',
                examples: ['Shows all available commands', 'Provides interactive tutorials'],
                contextTriggers: ['new-session', 'first-time']
            },
            {
                id: 'find-bugs',
                command: '/coder1/find-bugs',
                title: 'Bug Hunter',
                description: 'Automatically detect issues in your code',
                icon: '🐛',
                category: 'debugging',
                examples: ['Finds syntax errors', 'Detects logic issues', 'Suggests fixes'],
                contextTriggers: ['has-errors', 'test-failure']
            },
            {
                id: 'optimize',
                command: '/coder1/optimize',
                title: 'Performance Optimizer',
                description: 'Make your code run faster',
                icon: '⚡',
                category: 'performance',
                examples: ['Reduces complexity', 'Improves algorithms', 'Removes bottlenecks'],
                contextTriggers: ['large-file', 'slow-performance']
            },
            {
                id: 'generate-tests',
                command: '/coder1/generate-tests',
                title: 'Test Generator',
                description: 'Create comprehensive test suites',
                icon: '🧪',
                category: 'testing',
                examples: ['Unit tests', 'Integration tests', 'Edge cases'],
                contextTriggers: ['no-tests', 'new-function']
            },
            {
                id: 'explain-code',
                command: '/coder1/explain',
                title: 'Code Explainer',
                description: 'Understand complex code instantly',
                icon: '💡',
                category: 'learning',
                examples: ['Line-by-line explanations', 'Architecture overview'],
                contextTriggers: ['complex-code', 'unfamiliar-language']
            }
        ];
        this.filteredPrompts = [...this.prompts];
    }
    
    setupContainer() {
        this.container.innerHTML = `
            <div class="ambient-prompt-wrapper">
                <div class="ambient-prompt-display">
                    <div class="prompt-card" id="prompt-card">
                        <!-- Content will be dynamically inserted -->
                    </div>
                    <div class="rotation-controls">
                        <div class="rotation-indicators">
                            ${this.prompts.map((_, i) => 
                                `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`
                            ).join('')}
                        </div>
                        <button class="pause-btn" id="pause-rotation" title="Pause rotation">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="prompt-preview" id="prompt-preview" style="display: none;">
                    <!-- Preview content on hover -->
                </div>
            </div>
        `;
        
        this.updatePromptCard();
    }
    
    updatePromptCard() {
        const prompt = this.filteredPrompts[this.currentIndex];
        if (!prompt) return;
        
        const card = document.getElementById('prompt-card');
        card.innerHTML = `
            <div class="prompt-content">
                <div class="prompt-header">
                    <span class="prompt-icon">${prompt.icon}</span>
                    <span class="prompt-category">${prompt.category}</span>
                </div>
                <div class="prompt-main">
                    <div class="prompt-command">${prompt.command}</div>
                    <div class="prompt-description">${prompt.description}</div>
                </div>
                <div class="prompt-actions">
                    <button class="try-now-btn" data-command="${prompt.command}">
                        Try Now
                    </button>
                    <button class="learn-more-btn" data-id="${prompt.id}">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                            <path d="M7 0C3.134 0 0 3.134 0 7s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zm0 12.6c-3.094 0-5.6-2.506-5.6-5.6S3.906 1.4 7 1.4s5.6 2.506 5.6 5.6-2.506 5.6-5.6 5.6zm-.7-9.1h1.4v1.4h-1.4V3.5zm0 2.8h1.4V10h-1.4V6.3z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        // Add entrance animation
        card.classList.remove('fade-in');
        void card.offsetWidth; // Trigger reflow
        card.classList.add('fade-in');
        
        // Update rotation indicators
        this.updateIndicators();
    }
    
    updateIndicators() {
        const dots = this.container.querySelectorAll('.rotation-indicators .dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentIndex);
        });
    }
    
    setupContextMonitoring() {
        // Monitor idle time
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                const now = Date.now();
                this.context.idleTime = now - this.lastUserActivity;
                this.lastUserActivity = now;
                this.adjustRotationSpeed();
            });
        });
        
        // Update idle time every second
        setInterval(() => {
            this.context.idleTime = Date.now() - this.lastUserActivity;
            this.context.timeOfDay = this.getTimeOfDay();
        }, 1000);
        
        // Listen for context updates from the IDE
        window.addEventListener('context-update', (event) => {
            Object.assign(this.context, event.detail);
            this.filterPromptsByContext();
        });
    }
    
    filterPromptsByContext() {
        this.filteredPrompts = this.prompts.filter(prompt => {
            // Don't show recently executed prompts
            if (this.context.lastExecutedPrompts.includes(prompt.id)) {
                return false;
            }
            
            // Priority for error context
            if (this.context.recentErrors.length > 0 && prompt.category === 'debugging') {
                return true;
            }
            
            // File type matching
            if (this.context.fileType && prompt.contextTriggers?.includes(this.context.fileType)) {
                return true;
            }
            
            // Idle suggestions
            if (this.context.idleTime > 300000 && prompt.category === 'inspiration') {
                return true;
            }
            
            // Time of day matching
            if (this.context.timeOfDay === 'morning' && prompt.category === 'getting-started') {
                return true;
            }
            
            // Default to showing general prompts
            return !prompt.contextTriggers || prompt.contextTriggers.includes('general');
        });
        
        // If no context matches, show all prompts
        if (this.filteredPrompts.length === 0) {
            this.filteredPrompts = [...this.prompts];
        }
    }
    
    adjustRotationSpeed() {
        // Speed up when user is active
        if (this.context.idleTime < 5000) {
            this.rotationSpeed = 5000; // 5 seconds when active
        } else if (this.context.idleTime > 60000) {
            this.rotationSpeed = 15000; // 15 seconds when idle
        } else {
            this.rotationSpeed = 7000; // Default 7 seconds
        }
        
        // Restart rotation with new speed
        if (!this.isPaused) {
            this.stopRotation();
            this.startRotation();
        }
    }
    
    startRotation() {
        if (this.rotationInterval) return;
        
        this.rotationInterval = setInterval(() => {
            if (!this.isPaused) {
                this.nextPrompt();
            }
        }, this.rotationSpeed);
    }
    
    stopRotation() {
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
            this.rotationInterval = null;
        }
    }
    
    nextPrompt() {
        this.currentIndex = (this.currentIndex + 1) % this.filteredPrompts.length;
        this.updatePromptCard();
    }
    
    previousPrompt() {
        this.currentIndex = (this.currentIndex - 1 + this.filteredPrompts.length) % this.filteredPrompts.length;
        this.updatePromptCard();
    }
    
    bindEvents() {
        // Pause on hover
        this.container.addEventListener('mouseenter', () => {
            this.isPaused = true;
            this.container.classList.add('paused');
        });
        
        this.container.addEventListener('mouseleave', () => {
            this.isPaused = false;
            this.container.classList.remove('paused');
        });
        
        // Pause button
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('#pause-rotation')) {
                this.togglePause();
            }
            
            // Try now button
            if (e.target.closest('.try-now-btn')) {
                const command = e.target.closest('.try-now-btn').dataset.command;
                this.executePrompt(command);
            }
            
            // Learn more button
            if (e.target.closest('.learn-more-btn')) {
                const promptId = e.target.closest('.learn-more-btn').dataset.id;
                this.showPromptDetails(promptId);
            }
            
            // Indicator dots
            if (e.target.closest('.dot')) {
                const index = parseInt(e.target.closest('.dot').dataset.index);
                this.jumpToPrompt(index);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.key === 'ArrowLeft') {
                this.previousPrompt();
            } else if (e.key === 'ArrowRight') {
                this.nextPrompt();
            } else if (e.key === ' ' && e.shiftKey) {
                e.preventDefault();
                this.togglePause();
            }
        });
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pause-rotation');
        
        if (this.isPaused) {
            this.stopRotation();
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6.5 5.5v5l4-2.5-4-2.5z"/>
                </svg>
            `;
        } else {
            this.startRotation();
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
                </svg>
            `;
        }
    }
    
    jumpToPrompt(index) {
        this.currentIndex = index;
        this.updatePromptCard();
        this.isPaused = true;
        this.togglePause(); // Resume after jump
    }
    
    async executePrompt(command) {
        // Track execution
        const prompt = this.filteredPrompts[this.currentIndex];
        if (prompt) {
            this.context.lastExecutedPrompts.push(prompt.id);
            // Keep only last 5 executed prompts
            if (this.context.lastExecutedPrompts.length > 5) {
                this.context.lastExecutedPrompts.shift();
            }
        }
        
        // Send execution request
        try {
            const response = await fetch('/api/mcp-prompts/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command })
            });
            
            if (response.ok) {
                // Show success feedback
                this.showFeedback('Executing ' + command, 'success');
            } else {
                this.showFeedback('Failed to execute prompt', 'error');
            }
        } catch (error) {
            console.error('Failed to execute prompt:', error);
            this.showFeedback('Error executing prompt', 'error');
        }
    }
    
    showPromptDetails(promptId) {
        const prompt = this.prompts.find(p => p.id === promptId);
        if (!prompt) return;
        
        const preview = document.getElementById('prompt-preview');
        preview.innerHTML = `
            <div class="preview-content">
                <h3>${prompt.icon} ${prompt.title}</h3>
                <p>${prompt.description}</p>
                <div class="examples">
                    <h4>Examples:</h4>
                    <ul>
                        ${prompt.examples?.map(ex => `<li>${ex}</li>`).join('') || '<li>No examples available</li>'}
                    </ul>
                </div>
                <button class="close-preview">×</button>
            </div>
        `;
        preview.style.display = 'block';
        
        preview.querySelector('.close-preview').addEventListener('click', () => {
            preview.style.display = 'none';
        });
    }
    
    showFeedback(message, type = 'info') {
        const feedback = document.createElement('div');
        feedback.className = `prompt-feedback ${type}`;
        feedback.textContent = message;
        this.container.appendChild(feedback);
        
        setTimeout(() => {
            feedback.classList.add('fade-out');
            setTimeout(() => feedback.remove(), 300);
        }, 3000);
    }
    
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        if (hour < 21) return 'evening';
        return 'night';
    }
    
    // Public methods for external control
    updateContext(updates) {
        Object.assign(this.context, updates);
        this.filterPromptsByContext();
    }
    
    addPrompt(prompt) {
        this.prompts.push(prompt);
        this.filterPromptsByContext();
    }
    
    removePrompt(promptId) {
        this.prompts = this.prompts.filter(p => p.id !== promptId);
        this.filterPromptsByContext();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if container exists
    if (document.getElementById('ambient-prompt-container')) {
        window.ambientPromptDisplay = new AmbientPromptDisplay('ambient-prompt-container');
    }
});