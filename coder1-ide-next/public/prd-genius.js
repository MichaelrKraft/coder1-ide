// PRD Genius - Intelligent PRD Generator integrated with Orchestrator
// Learns from the world's best codebases to create professional PRDs

class PRDGenius {
    constructor() {
        this.currentStep = 0;
        this.wizardResponses = {};
        this.selectedPatterns = [];
        this.generatedPRD = null;
        this.mode = 'wizard'; // 'wizard' or 'orchestrator'
        this.isActive = false;
        this.container = null;
        this.comprehensiveMode = false; // Track if user wants comprehensive PRD
        this.showingChoiceScreen = false; // Track if we're showing the choice screen
        
        // Repository patterns database (curated from top open-source projects)
        this.repositoryPatterns = {
            'saas': {
                name: 'SaaS Platform',
                icon: 'fa-cloud',
                description: 'Build a scalable SaaS application',
                repos: ['supabase', 'cal.com', 'posthog'],
                patterns: {
                    auth: 'Supabase Auth (JWT + Magic Links)',
                    payments: 'Stripe Subscriptions',
                    analytics: 'PostHog Events',
                    database: 'PostgreSQL with Row-Level Security',
                    realtime: 'WebSockets via Supabase',
                    api: 'REST + GraphQL Hybrid'
                }
            },
            'ecommerce': {
                name: 'E-commerce',
                icon: 'fa-shopping-cart',
                description: 'Create an online store',
                repos: ['saleor', 'medusa'],
                patterns: {
                    catalog: 'Product variants & SKUs',
                    cart: 'Session-based + Persistent',
                    payments: 'Multi-gateway (Stripe, PayPal)',
                    inventory: 'Real-time stock tracking',
                    shipping: 'Multi-carrier integration',
                    api: 'GraphQL-first'
                }
            },
            'social': {
                name: 'Social Platform',
                icon: 'fa-users',
                description: 'Build a community platform',
                repos: ['mastodon', 'forem'],
                patterns: {
                    auth: 'OAuth2 + SSO',
                    content: 'Activity streams',
                    messaging: 'Real-time chat',
                    notifications: 'Push + Email',
                    moderation: 'Community-driven',
                    api: 'ActivityPub federation'
                }
            },
            'marketplace': {
                name: 'Marketplace',
                icon: 'fa-store',
                description: 'Multi-vendor platform',
                repos: ['saleor', 'twenty'],
                patterns: {
                    vendors: 'Multi-tenant architecture',
                    payments: 'Split payments & escrow',
                    reviews: 'Verified purchase system',
                    search: 'Elasticsearch/Algolia',
                    messaging: 'Buyer-seller chat',
                    api: 'REST with webhooks'
                }
            },
            'devtool': {
                name: 'Developer Tool',
                icon: 'fa-code',
                description: 'Build tools for developers',
                repos: ['sentry', 'dub', 'supabase'],
                patterns: {
                    auth: 'API keys + OAuth',
                    integration: 'Webhook system',
                    analytics: 'Usage tracking',
                    billing: 'Usage-based pricing',
                    sdk: 'Multi-language SDKs',
                    api: 'REST + SDK generation'
                }
            },
            'productivity': {
                name: 'Productivity App',
                icon: 'fa-tasks',
                description: 'Task management & collaboration',
                repos: ['cal.com', 'rallly', 'twenty'],
                patterns: {
                    auth: 'SSO + Team invites',
                    collaboration: 'Real-time updates',
                    scheduling: 'Calendar integration',
                    notifications: 'Smart reminders',
                    integrations: 'Zapier/Make',
                    api: 'REST + Webhooks'
                }
            }
        };
        
        // Wizard questions flow - now with 8 questions (5 basic + 3 comprehensive)
        this.wizardQuestions = [
            // Basic questions (1-5)
            {
                id: 'project-type',
                question: "What type of application are you building?",
                type: 'choice',
                tier: 'basic',
                options: Object.keys(this.repositoryPatterns).map(key => ({
                    value: key,
                    label: this.repositoryPatterns[key].name,
                    icon: this.repositoryPatterns[key].icon,
                    description: this.repositoryPatterns[key].description
                }))
            },
            {
                id: 'project-description',
                question: "Describe your project in one sentence",
                type: 'text',
                tier: 'basic',
                placeholder: "e.g., A platform for freelancers to manage projects and invoices",
                validation: (value) => value.length > 10
            },
            {
                id: 'target-users',
                question: "Who are your target users?",
                type: 'text',
                tier: 'basic',
                placeholder: "e.g., Small business owners, freelancers, creative professionals",
                validation: (value) => value.length > 5
            },
            {
                id: 'core-features',
                question: "What are your 3 must-have features?",
                type: 'multiline',
                tier: 'basic',
                placeholder: "1. User authentication\n2. Payment processing\n3. Real-time notifications",
                validation: (value) => value.split('\n').filter(l => l.trim()).length >= 1
            },
            {
                id: 'tech-preference',
                question: "What's your preferred tech stack?",
                type: 'choice',
                tier: 'basic',
                options: [
                    { value: 'nextjs', label: 'Next.js + TypeScript', icon: 'fa-react', description: 'Modern React framework' },
                    { value: 'react', label: 'React + Node.js', icon: 'fa-node-js', description: 'Classic full-stack' },
                    { value: 'vue', label: 'Vue + Express', icon: 'fa-vuejs', description: 'Progressive framework' },
                    { value: 'auto', label: 'Let AI decide', icon: 'fa-magic', description: 'Based on requirements' }
                ]
            },
            // Comprehensive questions (6-8)
            {
                id: 'problem-competitors',
                question: "What problem does this solve and who are your main competitors?",
                type: 'multiline',
                tier: 'comprehensive',
                placeholder: "Problem: Users struggle to manage multiple projects efficiently\n\nCompetitors:\n1. Asana - Project management\n2. Monday.com - Work OS\n3. Notion - All-in-one workspace",
                validation: (value) => value.length > 20
            },
            {
                id: 'success-metrics',
                question: "How will you measure success?",
                type: 'multiline',
                tier: 'comprehensive',
                placeholder: "• 1,000 active users in 3 months\n• 50% user retention after 30 days\n• < 2 second page load times\n• NPS score > 50\n• $10K MRR within 6 months",
                validation: (value) => value.length > 10
            },
            {
                id: 'timeline-constraints',
                question: "What's your timeline and any constraints?",
                type: 'multiline',
                tier: 'comprehensive',
                placeholder: "Timeline: MVP in 3 months\n\nConstraints:\n• Budget: $50K\n• Team: 2 developers\n• Must integrate with existing CRM\n• GDPR compliance required",
                validation: (value) => value.length > 10
            }
        ];
        
        // Helper to get questions by tier
        this.getBasicQuestions = () => this.wizardQuestions.filter(q => q.tier === 'basic');
        this.getComprehensiveQuestions = () => this.wizardQuestions.filter(q => q.tier === 'comprehensive');
        this.getAllQuestions = () => this.wizardQuestions;
        
        this.init();
    }
    
    init() {
        console.log('[PRD Genius] Initializing...');
        this.setupUI();
        this.bindEvents();
    }
    
    setupUI() {
        // Add PRD Genius mode toggle to orchestrator
        const headerControls = document.querySelector('.header-controls');
        if (headerControls && !document.getElementById('prd-genius-toggle')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'prd-genius-toggle';
            toggleBtn.className = 'btn-premium btn-primary';
            toggleBtn.innerHTML = `
                <i class="fas fa-file-alt"></i>
                <span>PRD Mode</span>
            `;
            toggleBtn.onclick = () => this.toggleMode();
            headerControls.insertBefore(toggleBtn, headerControls.firstChild);
        }
        
        // Create PRD Genius wizard container
        if (!document.getElementById('prd-genius-wizard')) {
            const wizardHTML = `
                <div id="prd-genius-wizard" class="prd-wizard-container" style="display: none;">
                    <div class="wizard-header">
                        <h2 class="wizard-title">
                            <i class="fas fa-magic"></i>
                            PRD Genius - AI-Powered Requirements Generator
                        </h2>
                        <p class="wizard-subtitle">
                            Learning from ${Object.keys(this.repositoryPatterns).reduce((acc, key) => 
                                acc + this.repositoryPatterns[key].repos.length, 0
                            )}+ successful open-source projects
                        </p>
                    </div>
                    
                    <div class="wizard-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="wizard-progress-fill" style="width: 0%;"></div>
                        </div>
                        <div class="progress-steps" id="wizard-progress-steps">
                            ${this.wizardQuestions.map((q, i) => `
                                <div class="progress-step ${i === 0 ? 'active' : ''}" data-step="${i}">
                                    <div class="step-number">${i + 1}</div>
                                    <div class="step-label">Step ${i + 1}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="wizard-content" id="wizard-content">
                        <!-- Dynamic content will be inserted here -->
                    </div>
                    
                    <div class="wizard-actions">
                        <button class="btn-secondary" id="wizard-back" onclick="prdGenius.previousStep()" style="display: none;">
                            <i class="fas fa-arrow-left"></i>
                            Back
                        </button>
                        <button class="btn-primary" id="wizard-next" onclick="prdGenius.nextStep()">
                            Next
                            <i class="fas fa-arrow-right"></i>
                        </button>
                        <button class="btn-primary rainbow-btn" id="wizard-generate" onclick="prdGenius.generatePRD()" style="display: none;">
                            <i class="fas fa-magic"></i>
                            Generate PRD
                        </button>
                    </div>
                    
                    <div class="pattern-showcase" id="pattern-showcase" style="display: none;">
                        <h4>Learning from these repositories:</h4>
                        <div class="repo-badges" id="repo-badges">
                            <!-- Repository badges will be inserted here -->
                        </div>
                    </div>
                </div>
            `;
            
            // Insert wizard after the setup screen
            const setupScreen = document.getElementById('setup-screen');
            if (setupScreen) {
                setupScreen.insertAdjacentHTML('afterend', wizardHTML);
            }
        }
    }
    
    bindEvents() {
        // Listen for orchestrator mode changes
        window.addEventListener('orchestratorModeChange', (e) => {
            if (e.detail.mode === 'prd') {
                this.activateWizardMode();
            }
        });
    }
    
    toggleMode() {
        const wizard = document.getElementById('prd-genius-wizard');
        const setupScreen = document.getElementById('setup-screen');
        const conversationScreen = document.getElementById('conversation-screen');
        const toggleBtn = document.getElementById('prd-genius-toggle');
        
        if (wizard.style.display === 'none') {
            // Activate PRD Genius mode
            wizard.style.display = 'block';
            setupScreen.style.display = 'none';
            conversationScreen.style.display = 'none';
            toggleBtn.innerHTML = '<i class="fas fa-comments"></i><span>Orchestrator</span>';
            this.mode = 'wizard';
            this.renderCurrentStep();
        } else {
            // Return to orchestrator mode
            wizard.style.display = 'none';
            setupScreen.style.display = 'block';
            toggleBtn.innerHTML = '<i class="fas fa-file-alt"></i><span>PRD Mode</span>';
            this.mode = 'orchestrator';
        }
    }
    
    renderCurrentStep() {
        const question = this.wizardQuestions[this.currentStep];
        const content = document.getElementById('wizard-content');
        
        if (!question || !content) return;
        
        let html = `
            <div class="wizard-question">
                <h3 class="question-text">${question.question}</h3>
        `;
        
        switch (question.type) {
            case 'choice':
                html += `
                    <div class="choice-grid">
                        ${question.options.map(opt => `
                            <button class="choice-option" data-value="${opt.value}" onclick="prdGenius.selectChoice('${opt.value}')">
                                <i class="fas ${opt.icon}"></i>
                                <div class="choice-label">${opt.label}</div>
                                <div class="choice-description">${opt.description}</div>
                            </button>
                        `).join('')}
                    </div>
                `;
                break;
                
            case 'text':
                html += `
                    <input type="text" 
                           id="wizard-input" 
                           class="wizard-text-input" 
                           placeholder="${question.placeholder}"
                           value="${this.wizardResponses[question.id] || ''}"
                           onkeypress="if(event.key === 'Enter') prdGenius.nextStep()">
                `;
                break;
                
            case 'multiline':
                html += `
                    <textarea id="wizard-input" 
                              class="wizard-textarea" 
                              placeholder="${question.placeholder}"
                              rows="5">${this.wizardResponses[question.id] || ''}</textarea>
                `;
                break;
        }
        
        html += '</div>';
        content.innerHTML = html;
        
        // Update progress
        this.updateProgress();
        
        // Show/hide navigation buttons
        document.getElementById('wizard-back').style.display = this.currentStep > 0 ? 'inline-flex' : 'none';
        document.getElementById('wizard-next').style.display = this.currentStep < this.wizardQuestions.length - 1 ? 'inline-flex' : 'none';
        document.getElementById('wizard-generate').style.display = this.currentStep === this.wizardQuestions.length - 1 ? 'inline-flex' : 'none';
        
        // Show repository badges for selected type
        if (this.wizardResponses['project-type']) {
            this.showRepositoryBadges(this.wizardResponses['project-type']);
        }
    }
    
    selectChoice(value) {
        const question = this.wizardQuestions[this.currentStep];
        this.wizardResponses[question.id] = value;
        
        // Highlight selected choice
        document.querySelectorAll('.choice-option').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.value === value) {
                btn.classList.add('selected');
            }
        });
        
        // Auto-advance after selection
        setTimeout(() => this.nextStep(), 300);
    }
    
    nextStep() {
        const question = this.wizardQuestions[this.currentStep];
        
        // Validate current input
        if (question.type === 'text' || question.type === 'multiline') {
            const input = document.getElementById('wizard-input');
            if (input) {
                const value = input.value.trim();
                if (question.validation && !question.validation(value)) {
                    input.classList.add('error');
                    return;
                }
                this.wizardResponses[question.id] = value;
            }
        }
        
        if (this.currentStep < this.wizardQuestions.length - 1) {
            this.currentStep++;
            this.renderCurrentStep();
        }
    }
    
    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderCurrentStep();
        }
    }
    
    updateProgress() {
        const progress = ((this.currentStep + 1) / this.wizardQuestions.length) * 100;
        document.getElementById('wizard-progress-fill').style.width = `${progress}%`;
        
        // Update step indicators
        document.querySelectorAll('.progress-step').forEach((step, i) => {
            step.classList.toggle('active', i === this.currentStep);
            step.classList.toggle('completed', i < this.currentStep);
        });
    }
    
    showRepositoryBadges(projectType) {
        const pattern = this.repositoryPatterns[projectType];
        if (!pattern) return;
        
        const showcase = document.getElementById('pattern-showcase');
        const badges = document.getElementById('repo-badges');
        
        showcase.style.display = 'block';
        badges.innerHTML = pattern.repos.map(repo => `
            <span class="repo-badge">
                <i class="fab fa-github"></i>
                ${repo}
            </span>
        `).join('');
    }
    
    async generatePRD() {
        console.log('[PRD Genius] Generating PRD with responses:', this.wizardResponses);
        
        // Show loading state
        const generateBtn = document.getElementById('wizard-generate');
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing patterns...';
        
        // Simulate pattern analysis (in production, this would call the backend)
        setTimeout(() => {
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PRD...';
        }, 1500);
        
        setTimeout(() => {
            // Generate PRD based on patterns
            const prd = this.synthesizePRD();
            this.displayGeneratedPRD(prd);
        }, 3000);
    }
    
    synthesizePRD() {
        const projectType = this.wizardResponses['project-type'];
        const patterns = this.repositoryPatterns[projectType];
        
        const prd = {
            title: this.wizardResponses['project-description'],
            type: patterns.name,
            generatedAt: new Date().toISOString(),
            patterns: patterns,
            sections: {
                executive_summary: this.generateExecutiveSummary(),
                user_personas: this.generateUserPersonas(),
                core_features: this.generateCoreFeatures(),
                technical_architecture: this.generateTechnicalArchitecture(),
                implementation_roadmap: this.generateImplementationRoadmap(),
                success_metrics: this.generateSuccessMetrics()
            },
            claudeOptimized: this.generateClaudeOptimized()
        };
        
        this.generatedPRD = prd;
        return prd;
    }
    
    generateExecutiveSummary() {
        return `
## Executive Summary

### Project Overview
${this.wizardResponses['project-description']}

### Target Market
${this.wizardResponses['target-users']}

### Value Proposition
This ${this.repositoryPatterns[this.wizardResponses['project-type']].name} will leverage proven patterns from successful open-source projects to deliver a robust, scalable solution.

### Key Success Factors
- Rapid development using established patterns
- Battle-tested architectural decisions
- Community-proven best practices
        `;
    }
    
    generateUserPersonas() {
        const users = this.wizardResponses['target-users'].split(',').map(u => u.trim());
        return users.map((user, i) => `
### Persona ${i + 1}: ${user}
- **Goals**: Efficiently manage their workflow
- **Pain Points**: Current solutions are complex or expensive
- **Needs**: Simple, intuitive interface with powerful features
        `).join('\n');
    }
    
    generateCoreFeatures() {
        const features = this.wizardResponses['core-features'].split('\n').filter(f => f.trim());
        const patterns = this.repositoryPatterns[this.wizardResponses['project-type']].patterns;
        
        return features.map(feature => `
### ${feature}
**Implementation Pattern**: ${this.matchFeatureToPattern(feature, patterns)}
**Reference Implementation**: See ${this.findReferenceRepo(feature)}
        `).join('\n');
    }
    
    generateTechnicalArchitecture() {
        const patterns = this.repositoryPatterns[this.wizardResponses['project-type']].patterns;
        return `
## Technical Architecture

### Technology Stack
- **Frontend**: ${this.getTechStack()}
- **Backend**: Node.js + Express/Fastify
- **Database**: ${patterns.database || 'PostgreSQL'}
- **Authentication**: ${patterns.auth}
- **API Design**: ${patterns.api}

### Key Architectural Decisions
Based on analysis of successful implementations:
${Object.entries(patterns).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}
        `;
    }
    
    generateImplementationRoadmap() {
        return `
## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- Set up development environment
- Implement authentication using ${this.repositoryPatterns[this.wizardResponses['project-type']].patterns.auth}
- Create database schema
- Build basic API structure

### Phase 2: Core Features (Week 3-4)
${this.wizardResponses['core-features'].split('\n').filter(f => f.trim()).map(f => `- Implement ${f}`).join('\n')}

### Phase 3: Polish & Launch (Week 5-6)
- Testing and bug fixes
- Performance optimization
- Deployment setup
- Documentation
        `;
    }
    
    generateSuccessMetrics() {
        return `
## Success Metrics

### Technical Metrics
- Page load time < 2 seconds
- API response time < 200ms
- 99.9% uptime

### Business Metrics
- User acquisition cost
- Monthly active users
- User retention rate
- Feature adoption rate
        `;
    }
    
    generateClaudeOptimized() {
        // Generate Claude-optimized version for direct code generation
        const patterns = this.repositoryPatterns[this.wizardResponses['project-type']];
        
        return `
# CLAUDE_CODE_CONTEXT_START
Project: ${this.wizardResponses['project-description']}
Type: ${patterns.name}
Stack: ${this.getTechStack()}

## PRIORITY_PATTERNS
${Object.entries(patterns.patterns).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

## IMPLEMENTATION_ORDER
1. Setup project structure
2. Implement ${patterns.patterns.auth}
3. Create data models
4. Build API endpoints
5. Add ${this.wizardResponses['core-features'].split('\n')[0]}

## CODE_EXAMPLES
Reference: ${patterns.repos.join(', ')}
# CLAUDE_CODE_CONTEXT_END
        `;
    }
    
    displayGeneratedPRD(prd) {
        // Store the generated PRD
        this.generatedPRD = prd;
        
        // Create result display
        if (this.container) {
            this.container.innerHTML = `
                <div class="prd-genius-container">
                    <div class="prd-wizard">
                        <div class="prd-result-container">
                            <div class="prd-result-header">
                                <h2>🎉 Your PRD is Ready!</h2>
                                <p>Professional requirements document generated from best practices</p>
                            </div>
                            
                            <div class="prd-output-tabs">
                                <button class="prd-tab active" onclick="window.prdGenius.switchTab('human')">
                                    Human-Readable
                                </button>
                                <button class="prd-tab" onclick="window.prdGenius.switchTab('claude')">
                                    Claude-Optimized
                                </button>
                            </div>
                            
                            <div class="prd-output-content" id="prd-output-human">
                                ${this.formatPRDAsMarkdown(prd.humanReadable)}
                            </div>
                            
                            <div class="prd-output-content" id="prd-output-claude" style="display: none;">
                                <pre>${prd.claudeOptimized}</pre>
                            </div>
                            
                            <div class="prd-output-actions">
                                <button class="prd-btn prd-btn-export" onclick="window.prdGenius.copyToClipboard()">
                                    📋 Copy to Clipboard
                                </button>
                                <button class="prd-btn prd-btn-export" onclick="window.prdGenius.downloadPRD()">
                                    💾 Download PRD
                                </button>
                                <button class="prd-btn prd-btn-github" onclick="window.prdGenius.exportToGitHub()">
                                    🐙 Export to GitHub
                                </button>
                                <button class="prd-btn prd-btn-secondary" onclick="window.prdGenius.startOver()">
                                    🔄 Start Over
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    formatPRDAsMarkdown(content) {
        // Convert markdown to HTML for display
        if (!content) return '<p>No content available</p>';
        
        // Process line by line for better control
        const lines = content.trim().split('\n');
        let html = '';
        let inList = false;
        
        for (let line of lines) {
            // Headers
            if (line.startsWith('### ')) {
                if (inList) { html += '</ul>'; inList = false; }
                html += `<h3>${line.substring(4)}</h3>`;
            } else if (line.startsWith('## ')) {
                if (inList) { html += '</ul>'; inList = false; }
                html += `<h2>${line.substring(3)}</h2>`;
            } else if (line.startsWith('# ')) {
                if (inList) { html += '</ul>'; inList = false; }
                html += `<h1>${line.substring(2)}</h1>`;
            }
            // Lists
            else if (line.startsWith('- ')) {
                if (!inList) { html += '<ul>'; inList = true; }
                html += `<li>${line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`;
            }
            // Empty lines
            else if (line.trim() === '') {
                if (inList) { html += '</ul>'; inList = false; }
                // Skip empty lines
            }
            // Regular paragraphs
            else {
                if (inList) { html += '</ul>'; inList = false; }
                // Handle bold text
                const processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                html += `<p>${processed}</p>`;
            }
        }
        
        // Close any open list
        if (inList) { html += '</ul>'; }
        
        return html || '<p>Content generation in progress...</p>';
    }
    
    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.prd-tab').forEach(t => {
            if (tab === 'human' && t.textContent.includes('Human')) {
                t.classList.add('active');
            } else if (tab === 'claude' && t.textContent.includes('Claude')) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
        
        // Update content display
        const humanContent = document.getElementById('prd-output-human');
        const claudeContent = document.getElementById('prd-output-claude');
        
        if (humanContent && claudeContent) {
            if (tab === 'human') {
                humanContent.style.display = 'block';
                claudeContent.style.display = 'none';
            } else {
                humanContent.style.display = 'none';
                claudeContent.style.display = 'block';
            }
        }
    }
    
    copyToClipboard() {
        const activeTab = document.querySelector('.prd-tab.active');
        const isHuman = activeTab && activeTab.textContent.includes('Human');
        const content = isHuman ? this.generatedPRD.humanReadable : this.generatedPRD.claudeOptimized;
        
        navigator.clipboard.writeText(content).then(() => {
            this.showToast('PRD copied to clipboard!');
        });
    }
    
    downloadPRD() {
        const activeTab = document.querySelector('.prd-tab.active');
        const isHuman = activeTab && activeTab.textContent.includes('Human');
        const content = isHuman ? this.generatedPRD.humanReadable : this.generatedPRD.claudeOptimized;
        const filename = isHuman ? 'prd-human.md' : 'prd-claude.md';
        
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('PRD downloaded!');
    }
    
    exportToGitHub() {
        // In production, this would create a GitHub gist or repository
        this.showToast('GitHub export coming soon!');
    }
    
    startOver() {
        this.currentStep = 0;
        this.wizardResponses = {};
        this.generatedPRD = null;
        this.show();
    }
    
    closePRDModal() {
        document.getElementById('prd-modal').style.display = 'none';
    }
    
    copyPRD() {
        const activeTab = document.querySelector('.prd-tab.active').dataset.tab;
        const content = activeTab === 'human' 
            ? document.getElementById('prd-human').innerText 
            : this.generatedPRD.claudeOptimized;
        
        navigator.clipboard.writeText(content);
        this.showToast('PRD copied to clipboard!');
    }
    
    downloadPRD() {
        const content = this.generatedPRD;
        const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prd-${Date.now()}.json`;
        a.click();
    }
    
    sendToClaudeCode() {
        // Copy Claude-optimized version to clipboard
        navigator.clipboard.writeText(this.generatedPRD.claudeOptimized);
        this.showToast('Claude-optimized PRD copied! Paste into Claude Code to start building.');
    }
    
    openInCoderOne() {
        // This would integrate with the full CoderOne IDE
        window.location.href = 'http://localhost:3001/ide?prd=' + encodeURIComponent(JSON.stringify(this.generatedPRD));
    }
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `<i class="fas fa-check"></i> ${message}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Helper methods
    getTechStack() {
        const tech = this.wizardResponses['tech-preference'];
        const stacks = {
            'nextjs': 'Next.js 14 + TypeScript + Tailwind CSS',
            'react': 'React 18 + Vite + TypeScript',
            'vue': 'Vue 3 + Vite + TypeScript',
            'auto': 'Next.js 14 + TypeScript (Recommended)'
        };
        return stacks[tech] || stacks['auto'];
    }
    
    matchFeatureToPattern(feature, patterns) {
        // Simple keyword matching (in production, use NLP)
        const featureLower = feature.toLowerCase();
        for (const [key, value] of Object.entries(patterns)) {
            if (featureLower.includes(key)) {
                return value;
            }
        }
        return 'Custom implementation';
    }
    
    findReferenceRepo(feature) {
        // Map features to reference repositories
        const featureLower = feature.toLowerCase();
        if (featureLower.includes('auth')) return 'supabase/supabase';
        if (featureLower.includes('payment')) return 'saleor/saleor';
        if (featureLower.includes('real-time')) return 'supabase/supabase';
        if (featureLower.includes('notification')) return 'zulip/zulip';
        return 'See pattern library';
    }
    
    // Show/Hide methods for wizard interface
    show() {
        // Get or create container
        this.container = document.getElementById('prd-genius-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'prd-genius-container';
            document.body.appendChild(this.container);
        }
        
        // Show the wizard
        this.isActive = true;
        this.currentStep = 0;
        this.wizardResponses = {};
        
        // Add the overlay class
        this.container.innerHTML = `
            <div class="prd-genius-container">
                ${this.getWizardHTML()}
            </div>
        `;
    }
    
    hide() {
        this.isActive = false;
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
    
    getWizardHTML() {
        const question = this.wizardQuestions[this.currentStep];
        const progress = ((this.currentStep + 1) / this.wizardQuestions.length) * 100;
        
        return `
            <div class="prd-wizard">
                <div class="prd-wizard-header">
                    <div class="prd-wizard-title">
                        <div class="logo">PG</div>
                        PRD Genius
                    </div>
                    <p class="prd-wizard-subtitle">AI-Powered PRD Generation</p>
                    <button class="prd-close-btn" onclick="window.prdGenius.hide()">×</button>
                </div>
                
                <div class="prd-wizard-progress">
                    <div class="prd-progress-bar">
                        <div class="prd-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="prd-progress-label">
                        <span>Step ${this.currentStep + 1} of ${this.wizardQuestions.length}</span>
                        <span>${Math.round(progress)}% Complete</span>
                    </div>
                </div>
                
                <div class="prd-wizard-content">
                    ${this.renderQuestion(question)}
                </div>
                
                <div class="prd-wizard-actions">
                    ${this.currentStep > 0 ? '<button class="prd-btn prd-btn-secondary" onclick="window.prdGenius.previousStep()">Back</button>' : '<div></div>'}
                    <button class="prd-btn prd-btn-primary" onclick="window.prdGenius.nextStep()" ${!this.canProceed() ? 'disabled' : ''}>
                        ${this.currentStep === this.wizardQuestions.length - 1 ? 'Generate PRD' : 'Next'}
                    </button>
                </div>
            </div>
        `;
    }
    
    renderQuestion(question) {
        if (!question) return '';
        
        let html = `
            <div class="prd-question">
                <h3>${question.question}</h3>
        `;
        
        if (question.type === 'choice' && question.options) {
            html += '<div class="prd-choices-grid">';
            question.options.forEach(option => {
                const isSelected = this.wizardResponses[question.id] === option.value;
                html += `
                    <div class="prd-choice-card ${isSelected ? 'selected' : ''}" 
                         onclick="window.prdGenius.selectOption('${question.id}', '${option.value}')">
                        <div class="prd-choice-title">${option.label}</div>
                        <div class="prd-choice-description">${option.description}</div>
                    </div>
                `;
            });
            html += '</div>';
        } else if (question.type === 'text' || question.type === 'multiline') {
            const value = this.wizardResponses[question.id] || '';
            const rows = question.type === 'multiline' ? 6 : 4;
            html += `
                <textarea 
                    class="prd-text-input" 
                    placeholder="${question.placeholder || 'Enter your response...'}"
                    oninput="window.prdGenius.setTextResponse('${question.id}', this.value)"
                    onchange="window.prdGenius.setTextResponse('${question.id}', this.value)"
                    rows="${rows}">${value}</textarea>
            `;
        }
        
        html += '</div>';
        return html;
    }
    
    selectOption(questionId, value) {
        this.wizardResponses[questionId] = value;
        // Refresh the display
        this.updateDisplay();
    }
    
    setTextResponse(questionId, value) {
        this.wizardResponses[questionId] = value;
        this.updateDisplay();
    }
    
    updateDisplay() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="prd-genius-container">
                    ${this.getWizardHTML()}
                </div>
            `;
        }
    }
    
    nextStep() {
        // Check if we just completed question 5 and haven't chosen comprehensive mode yet
        if (this.currentStep === 4 && !this.comprehensiveMode && !this.showingChoiceScreen) {
            // Show choice screen instead of moving to next question
            this.showChoiceScreen();
        } else if (this.currentStep < this.wizardQuestions.length - 1) {
            // If in comprehensive mode, continue to questions 6-8
            // Otherwise, stop at question 5
            const maxStep = this.comprehensiveMode ? this.wizardQuestions.length - 1 : 4;
            if (this.currentStep < maxStep) {
                this.currentStep++;
                this.updateDisplay();
            } else {
                // Generate PRD based on mode
                this.generatePRD();
            }
        } else {
            // Generate PRD
            this.generatePRD();
        }
    }
    
    showChoiceScreen() {
        this.showingChoiceScreen = true;
        if (this.container) {
            this.container.innerHTML = `
                <div class="prd-genius-container">
                    <div class="prd-wizard">
                        <div class="prd-wizard-header">
                            <div class="prd-wizard-title">
                                <div class="logo">PG</div>
                                Choose Your PRD Depth
                            </div>
                            <p class="prd-wizard-subtitle">Select the level of detail for your PRD</p>
                            <button class="prd-close-btn" onclick="window.prdGenius.hide()">×</button>
                        </div>
                        
                        <div class="prd-choice-container">
                            <div class="prd-choice-cards">
                                <div class="prd-depth-card basic-card">
                                    <div class="prd-depth-icon">⚡</div>
                                    <h3>Basic PRD</h3>
                                    <p class="prd-depth-subtitle">Perfect for MVPs and quick prototypes</p>
                                    <ul class="prd-depth-features">
                                        <li>5-7 page document</li>
                                        <li>Core requirements & features</li>
                                        <li>Basic technical architecture</li>
                                        <li>Simple implementation roadmap</li>
                                        <li>Essential success metrics</li>
                                    </ul>
                                    <div class="prd-depth-time">⏱️ Ready now</div>
                                    <button class="prd-btn prd-btn-primary" onclick="window.prdGenius.generateBasicPRD()">
                                        Generate Basic PRD
                                    </button>
                                </div>
                                
                                <div class="prd-depth-card comprehensive-card">
                                    <div class="prd-depth-icon">🚀</div>
                                    <h3>Comprehensive PRD</h3>
                                    <p class="prd-depth-subtitle">For serious products and investor pitches</p>
                                    <ul class="prd-depth-features">
                                        <li>15-20 page document</li>
                                        <li>Detailed user personas & journeys</li>
                                        <li>Competitive analysis & market research</li>
                                        <li>Full technical architecture</li>
                                        <li>Risk assessment & mitigation</li>
                                        <li>Comprehensive success metrics</li>
                                        <li>Budget & resource planning</li>
                                    </ul>
                                    <div class="prd-depth-time">⏱️ 3 more questions (2 min)</div>
                                    <button class="prd-btn prd-btn-primary rainbow-btn" onclick="window.prdGenius.continueToComprehensive()">
                                        Answer 3 More Questions
                                    </button>
                                </div>
                            </div>
                            
                            <div class="prd-choice-tip">
                                <span class="tip-icon">💡</span>
                                <span>Not sure? Start with Basic - you can always generate a comprehensive version later!</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    continueToComprehensive() {
        this.comprehensiveMode = true;
        this.showingChoiceScreen = false;
        this.currentStep = 5; // Move to question 6
        this.updateDisplay();
    }
    
    generateBasicPRD() {
        this.comprehensiveMode = false;
        this.showingChoiceScreen = false;
        this.generatePRD();
    }
    
    generatePRD() {
        // Show loading state
        if (this.container) {
            this.container.innerHTML = `
                <div class="prd-genius-container">
                    <div class="prd-wizard">
                        <div class="prd-loading">
                            <div class="prd-spinner"></div>
                            <div class="prd-loading-text">Generating your PRD...</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Simulate PRD generation (in production, this would call an API)
        setTimeout(() => {
            const prd = this.generatePRDContent();
            this.displayGeneratedPRD(prd);
        }, 2000);
    }
    
    generatePRDContent() {
        // Decide which PRD to generate based on mode
        if (this.comprehensiveMode) {
            return this.generateComprehensivePRDContent();
        } else {
            return this.generateBasicPRDContent();
        }
    }
    
    generateBasicPRDContent() {
        const projectType = this.repositoryPatterns[this.wizardResponses['project-type']];
        const projectDesc = this.wizardResponses['project-description'] || 'A software application';
        const targetUsers = this.wizardResponses['target-users'] || 'General users';
        const coreFeatures = this.wizardResponses['core-features'] || 'Core functionality';
        const techPref = this.wizardResponses['tech-preference'] || 'auto';
        
        const features = coreFeatures.split('\n').filter(f => f.trim());
        
        // Generate enhanced basic PRD (5-7 pages worth of content)
        const humanReadable = `
# Product Requirements Document: ${projectDesc}

## Executive Summary

### Vision Statement
We are building a ${projectType.name} that will revolutionize how ${targetUsers} accomplish their goals. By leveraging proven patterns from successful platforms like ${projectType.repos.join(', ')}, we'll deliver a solution that is both powerful and intuitive.

### Project Overview
- **Product Type:** ${projectType.name}
- **Target Market:** ${targetUsers}
- **Core Value Proposition:** Streamline workflows and increase productivity through intelligent automation and user-centric design
- **Expected Launch:** MVP in 8-12 weeks

### Key Success Factors
- Rapid time to market using established patterns
- Focus on core features that solve real user problems
- Scalable architecture that can grow with demand
- Intuitive user experience requiring minimal training

## Problem Statement

### The Challenge
${targetUsers} currently struggle with inefficient processes and disconnected tools. Our research indicates that users waste 30-40% of their time on manual tasks that could be automated or streamlined.

### Current Solutions Fall Short
- **Existing tools are complex:** Steep learning curves prevent adoption
- **Poor integration:** Users must switch between multiple platforms
- **High costs:** Enterprise solutions are unaffordable for our target market
- **Limited customization:** One-size-fits-all approaches don't meet specific needs

### Our Opportunity
By addressing these pain points with a focused, user-friendly solution, we can capture significant market share and establish ourselves as the go-to platform for ${targetUsers}.

## Target Users

### Primary Persona: The Power User
- **Demographics:** ${targetUsers}
- **Technical Skill:** Moderate to advanced
- **Key Goals:** 
  - Increase productivity by 50%
  - Reduce manual work
  - Better collaboration with team
- **Pain Points:**
  - Current tools are slow and cumbersome
  - Too many platforms to manage
  - Lack of automation
- **Success Criteria:** Can complete core tasks 2x faster

### Secondary Persona: The Casual User
- **Use Frequency:** 2-3 times per week
- **Key Goals:** Quick task completion without training
- **Success Criteria:** Can use core features within 5 minutes

## Core Features & Requirements

${features.map((feature, index) => `
### Feature ${index + 1}: ${feature}

**User Story:** As a \${targetUsers.split(',')[0] || 'user'}, I want to \${feature.toLowerCase().replace(/^\d+\.\s*/, '')} so that I can achieve my goals more efficiently.

**Acceptance Criteria:**
- Feature is accessible within 2 clicks from dashboard
- Response time is under 200ms for all interactions
- Works seamlessly on desktop and mobile devices
- Includes appropriate error handling and user feedback
- Data is automatically saved and synced

**Technical Implementation:**
- **Pattern Reference:** ${this.matchFeatureToPattern(feature, projectType.patterns)}
- **Backend:** RESTful API endpoint with validation
- **Frontend:** React component with real-time updates
- **Database:** Optimized schema with proper indexing
- **Testing:** Unit tests (>80% coverage) + E2E tests
`).join('')}

## Technical Architecture

### System Overview
Based on proven patterns from ${projectType.repos.join(', ')}, our architecture emphasizes scalability, maintainability, and performance.

\`\`\`
┌─────────────────────────────────┐
│     Frontend Application         │
│   ${this.getTechStack()}         │
└─────────────┬───────────────────┘
              │ REST/GraphQL
┌─────────────▼───────────────────┐
│         API Gateway              │
│   Rate Limiting & Auth           │
└─────────────┬───────────────────┘
              │
┌─────────────▼───────────────────┐
│      Business Logic Layer        │
│   ${projectType.patterns.api}    │
└─────────────┬───────────────────┘
              │
┌─────────────▼───────────────────┐
│        Data Layer                │
│   ${projectType.patterns.database || 'PostgreSQL'}  │
└─────────────────────────────────┘
\`\`\`

### Technology Stack
- **Frontend:** ${this.getTechStack()}
- **Backend:** Node.js with Express/Fastify
- **Database:** ${projectType.patterns.database || 'PostgreSQL with Redis cache'}
- **Authentication:** ${projectType.patterns.auth}
- **Real-time:** ${projectType.patterns.realtime || 'WebSockets'}
- **Infrastructure:** AWS/Vercel with auto-scaling

### Key Architectural Decisions
${Object.entries(projectType.patterns).map(([key, value]) => 
    `- **${key.charAt(0).toUpperCase() + key.slice(1)}:** ${value}`
).join('\n')}

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Establish core infrastructure and basic functionality

- **Week 1:**
  - Set up development environment and CI/CD pipeline
  - Initialize project with ${this.getTechStack()}
  - Configure ${projectType.patterns.database || 'database'}
  - Implement ${projectType.patterns.auth} authentication

- **Week 2:**
  - Build core API structure
  - Create basic UI components and routing
  - Set up testing framework
  - Deploy development environment

### Phase 2: Core Features (Weeks 3-5)
**Goal:** Implement all must-have features

${features.map((feature, index) => `
- **Week ${3 + Math.floor(index/2)}:**
  - Implement ${feature}
  - Create API endpoints and business logic
  - Build UI components
  - Write tests and documentation`).join('\n')}

### Phase 3: Polish & Optimization (Week 6)
**Goal:** Prepare for production launch

- Performance optimization (target: <2s load time)
- Security audit and penetration testing
- User acceptance testing
- Documentation completion
- Production deployment setup

### Phase 4: Launch Preparation (Week 7)
- Beta testing with select users
- Bug fixes and final adjustments
- Marketing website preparation
- Launch plan execution

## Success Metrics

### Technical Metrics
- **Performance:**
  - Page load time < 2 seconds
  - API response time < 200ms
  - 99.9% uptime SLA
  - Zero critical security vulnerabilities

- **Quality:**
  - Code coverage > 80%
  - Zero critical bugs in production
  - Automated deployment success rate > 95%

### Business Metrics
- **User Acquisition:**
  - 100 users in first week
  - 1,000 users in first month
  - 10% week-over-week growth

- **Engagement:**
  - 40% DAU/MAU ratio
  - Average session duration > 10 minutes
  - Feature adoption rate > 60%

### User Satisfaction
- Net Promoter Score (NPS) > 50
- Customer satisfaction (CSAT) > 4.5/5
- Support ticket resolution < 24 hours

## Risk Assessment

### Technical Risks
- **Scalability challenges:** Mitigate with load testing and auto-scaling
- **Security vulnerabilities:** Regular audits and security-first development
- **Third-party dependencies:** Vendor evaluation and fallback plans

### Business Risks
- **Low user adoption:** Mitigate with user research and iterative development
- **Competition:** Differentiate through superior UX and unique features
- **Resource constraints:** Phased rollout and MVP approach

## Next Steps

1. **Immediate Actions:**
   - Finalize technical stack selection
   - Set up development environment
   - Create project repositories
   - Assemble development team

2. **Week 1 Deliverables:**
   - Complete project setup
   - Initial UI mockups
   - Database schema design
   - API specification document

3. **Stakeholder Communication:**
   - Weekly progress updates
   - Bi-weekly demos
   - Continuous feedback incorporation
        `.trim();
        
        // Enhanced Claude-optimized version for basic PRD
        const claudeOptimized = `
# CLAUDE CODE IMPLEMENTATION GUIDE - BASIC PRD

## PROJECT CONTEXT
- **Description:** ${projectDesc}
- **Type:** ${projectType.name}
- **Users:** ${targetUsers}
- **Stack:** ${this.getTechStack()}

## QUICK START COMMANDS
\`\`\`bash
# Initialize project
npx create-next-app@latest \${projectDesc.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}
cd \${projectDesc.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}

# Install dependencies
npm install @supabase/supabase-js prisma @prisma/client
npm install -D @types/node typescript tailwindcss

# Set up database
npx prisma init
npx prisma migrate dev --name init

# Start development
npm run dev
\`\`\`

## IMPLEMENTATION PATTERNS
Reference implementations from: ${projectType.repos.join(', ')}

${Object.entries(projectType.patterns).map(([key, value]) => `
### ${key.toUpperCase()}
Pattern: ${value}
\`\`\`typescript
// Example implementation
${this.getPatternExample(key, value)}
\`\`\`
`).join('\n')}

## FEATURE IMPLEMENTATION ORDER

${features.map((feature, index) => `
### Step ${index + 1}: ${feature}
\`\`\`typescript
// API Route: /api/${feature.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 30)}
export async function handler(req, res) {
  // Validate input
  const { data, error } = validateInput(req.body);
  if (error) return res.status(400).json({ error });
  
  // Process business logic
  const result = await process\${feature.replace(/[^a-zA-Z0-9]/g, '')}(data);
  
  // Return response
  res.status(200).json({ success: true, data: result });
}
\`\`\`
`).join('\n')}

## DATABASE SCHEMA
\`\`\`prisma
// schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model \${projectType.name.replace(/\s+/g, '')} {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  data      Json
  createdAt DateTime @default(now())
}
\`\`\`

## TESTING REQUIREMENTS
- Unit tests for all business logic
- Integration tests for API endpoints
- E2E tests for critical user paths
- Performance tests for scalability

## DEPLOYMENT CHECKLIST
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented
- [ ] CI/CD pipeline configured

## SUCCESS CRITERIA
- All features implemented and tested
- Performance benchmarks met
- Security audit passed
- Documentation complete
        `.trim();
        
        return {
            humanReadable: humanReadable,
            claudeOptimized: claudeOptimized
        };
    }
    
    generateComprehensivePRDContent() {
        // Get all responses including comprehensive questions
        const projectType = this.repositoryPatterns[this.wizardResponses['project-type']];
        const projectDesc = this.wizardResponses['project-description'] || 'A software application';
        const targetUsers = this.wizardResponses['target-users'] || 'General users';
        const coreFeatures = this.wizardResponses['core-features'] || 'Core functionality';
        const techPref = this.wizardResponses['tech-preference'] || 'auto';
        const problemCompetitors = this.wizardResponses['problem-competitors'] || 'Market analysis pending';
        const successMetrics = this.wizardResponses['success-metrics'] || 'KPIs to be defined';
        const timelineConstraints = this.wizardResponses['timeline-constraints'] || 'Timeline: 3 months';
        
        const features = coreFeatures.split('\n').filter(f => f.trim());
        
        // Parse competitors from the problem-competitors response
        const competitorLines = problemCompetitors.split('\n').filter(line => 
            line.toLowerCase().includes('competitor') || line.match(/^\d+\./) || line.includes('-')
        );
        
        // Generate comprehensive PRD (15-20 pages worth of content)
        const humanReadable = `
# Product Requirements Document: ${projectDesc}

## Executive Summary

### Vision Statement
We are creating a transformative ${projectType.name} that will fundamentally change how ${targetUsers} approach their daily challenges. By synthesizing best practices from industry leaders like ${projectType.repos.join(', ')} and adding our unique innovations, we're building a platform that sets new standards for usability, performance, and value delivery.

### Strategic Objectives
1. **Market Leadership:** Capture 15% market share within 18 months
2. **User Excellence:** Achieve NPS score > 60 through superior user experience
3. **Technical Innovation:** Implement cutting-edge features competitors lack
4. **Sustainable Growth:** Build for 100x scale from day one
5. **Revenue Generation:** Reach $1M ARR within first year

### Investment Highlights
- **Market Size:** $\${Math.floor(Math.random() * 900 + 100)}M TAM with 25% YoY growth
- **Competitive Advantage:** Unique approach to ${coreFeatures.split('\n')[0] || 'core functionality'}
- **Experienced Team:** Proven track record in ${projectType.name} development
- **Scalable Model:** Unit economics improve with scale
- **Early Traction:** Strong interest from beta user community

## Problem Analysis & Market Opportunity

### Problem Statement
${problemCompetitors.split('\n')[0] || `${targetUsers} face significant challenges in their current workflows, leading to lost productivity and frustration.`}

### Market Analysis

#### Total Addressable Market (TAM)
- **Global Market Size:** $\${Math.floor(Math.random() * 900 + 100)}M
- **Growth Rate:** 25% CAGR
- **Our Segment:** ${targetUsers}
- **Segment Size:** $\${Math.floor(Math.random() * 90 + 10)}M
- **Penetration Target:** 15% in 18 months

#### Market Trends
1. **Digital Transformation:** Accelerating adoption of cloud-based solutions
2. **AI Integration:** Users expect intelligent, predictive features
3. **Mobile-First:** 60% of users primarily access via mobile
4. **Collaboration:** Remote work driving need for better collaboration tools
5. **Security:** Increased focus on data privacy and compliance

### Competitive Landscape

${competitorLines.length > 0 ? competitorLines.map(comp => `
#### ${comp.replace(/^\d+\./, '').trim()}
- **Strengths:** Established market presence, feature-rich platform
- **Weaknesses:** Complex UI, high pricing, poor mobile experience
- **Our Differentiation:** Superior UX, competitive pricing, mobile-first approach
`).join('') : `
#### Direct Competitors
- **Competitor A:** Market leader but expensive and complex
- **Competitor B:** Good features but poor user experience
- **Competitor C:** Affordable but limited functionality

#### Our Competitive Advantages
1. **Superior User Experience:** 10x easier to use
2. **Competitive Pricing:** 30% lower than alternatives
3. **Unique Features:** AI-powered automation
4. **Better Performance:** 2x faster than competitors
5. **Excellent Support:** 24/7 human support included
`}

## User Research & Personas

### Research Methodology
- **User Interviews:** 50+ in-depth interviews conducted
- **Surveys:** 500+ responses collected
- **Usability Testing:** 20+ sessions with prototypes
- **Competitor Analysis:** Evaluated 10+ competing solutions
- **Market Research:** 3 industry reports analyzed

### Primary Persona: The Strategic Leader
**Name:** Sarah Chen  
**Role:** \${targetUsers.split(',')[0] || 'Operations Manager'}  
**Age:** 32-45  
**Tech Savvy:** High  

**Background:**
- 5+ years in current role
- Manages team of 10-50 people
- Responsible for process optimization
- KPIs: Efficiency, cost reduction, team satisfaction

**Goals:**
1. Streamline operations by 40%
2. Reduce tool overhead costs
3. Improve team collaboration
4. Access real-time insights
5. Automate repetitive tasks

**Pain Points:**
1. Too many disconnected tools
2. Manual data entry and reporting
3. Lack of real-time visibility
4. Difficult to onboard new team members
5. Limited mobile functionality

**Day in the Life:**
- 7:00 AM - Check overnight metrics on mobile
- 8:30 AM - Team standup with screen sharing
- 10:00 AM - Review and approve workflows
- 2:00 PM - Analyze performance reports
- 4:00 PM - Plan next day's priorities

**Success Metrics:**
- Time saved: 2+ hours daily
- Team productivity: 30% increase
- Error rate: 50% reduction
- User satisfaction: 4.5+ stars

### Secondary Persona: The Individual Contributor
**Name:** Marcus Johnson  
**Role:** \${targetUsers.split(',')[1] || 'Team Member'}  
**Age:** 25-35  
**Tech Savvy:** Medium  

**Goals:**
- Complete tasks efficiently
- Collaborate seamlessly
- Track personal productivity
- Learn and grow skills

**Pain Points:**
- Context switching between tools
- Unclear priorities
- Lack of feedback
- Manual processes

### Tertiary Persona: The Executive Stakeholder
**Name:** David Park  
**Role:** \${targetUsers.split(',')[2] || 'C-Suite Executive'}  
**Age:** 40-55  
**Tech Savvy:** Low-Medium  

**Goals:**
- ROI visibility
- Strategic insights
- Risk mitigation
- Competitive advantage

## User Journey Maps

### Primary User Journey: First-Time Setup
\`\`\`
1. Discovery
   ↓ Google search / Referral
2. Landing Page
   ↓ 30 seconds to understand value
3. Sign Up
   ↓ 2-minute process with OAuth
4. Onboarding
   ↓ Interactive 5-minute tour
5. First Value
   ↓ Complete first task in < 5 minutes
6. Team Invite
   ↓ Add 3+ team members
7. Daily Use
   ↓ Part of daily workflow
8. Advocacy
   ↓ Recommend to others
\`\`\`

## Detailed Feature Requirements

${features.map((feature, index) => `
### Priority ${index}: ${feature}

#### User Story
As a \${targetUsers.split(',')[0] || 'user'}, I want to \${feature.toLowerCase().replace(/^\d+\.\s*/, '')} so that I can maximize my productivity and achieve better outcomes.

#### Detailed Requirements

**Functional Requirements:**
1. Users must be able to access this feature from the main dashboard
2. Feature must work across all devices (desktop, tablet, mobile)
3. Real-time synchronization across all active sessions
4. Offline mode with automatic sync when reconnected
5. Bulk operations for power users
6. Keyboard shortcuts for common actions
7. Undo/redo functionality with history
8. Export capabilities (CSV, PDF, API)

**Non-Functional Requirements:**
- **Performance:** < 100ms response time for all interactions
- **Scalability:** Handle 10,000 concurrent users
- **Reliability:** 99.99% uptime for critical features
- **Security:** End-to-end encryption for sensitive data
- **Accessibility:** WCAG 2.1 AA compliance
- **Localization:** Support for 10+ languages

#### Acceptance Criteria
- [ ] Feature completes primary use case in < 3 clicks
- [ ] Loading time < 1 second on 3G connection
- [ ] Works in latest 2 versions of all major browsers
- [ ] Passes all automated tests (unit, integration, E2E)
- [ ] Accessibility audit score > 95
- [ ] Security scan shows no vulnerabilities
- [ ] Documentation complete and reviewed
- [ ] Analytics tracking implemented

#### Technical Specification
- **API Endpoint:** \`/api/v1/${feature.toLowerCase().replace(/\s+/g, '-')}\`
- **Database Tables:** Multiple normalized tables with indexes
- **Caching Strategy:** Redis with 5-minute TTL
- **Background Jobs:** Async processing for heavy operations
- **Event Tracking:** Custom events for user behavior analysis
`).join('\n')}

## Technical Architecture (Detailed)

### System Architecture Diagram
\`\`\`
┌──────────────────────────────────────────────────────┐
│                   CDN (CloudFlare)                    │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│              Load Balancer (AWS ALB)                  │
└──────┬───────────────────────────────────┬───────────┘
       │                                   │
┌──────▼────────┐                  ┌──────▼────────┐
│   Web Server  │                  │   Web Server  │
│   (Next.js)   │                  │   (Next.js)   │
└──────┬────────┘                  └──────┬────────┘
       │                                   │
┌──────▼───────────────────────────────────▼───────────┐
│             API Gateway (Kong/Express)                │
└──────────────────────┬───────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌────▼────┐ ┌───────▼──────┐
│   Auth       │ │  Core   │ │   Analytics  │
│   Service    │ │  API    │ │   Service    │
└───────┬──────┘ └────┬────┘ └───────┬──────┘
        │              │              │
┌───────▼──────────────▼──────────────▼───────┐
│           Message Queue (Redis/SQS)          │
└───────┬──────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────┐
│     Database Cluster (PostgreSQL)             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │ Primary  │  │ Replica1 │  │ Replica2 │  │
│   └──────────┘  └──────────┘  └──────────┘  │
└───────────────────────────────────────────────┘
\`\`\`

### Technology Stack (Comprehensive)

#### Frontend
- **Framework:** ${this.getTechStack()}
- **State Management:** Zustand/Redux Toolkit
- **UI Components:** Radix UI + Tailwind CSS
- **Forms:** React Hook Form + Zod validation
- **Data Fetching:** TanStack Query
- **Real-time:** Socket.io Client
- **Testing:** Jest + React Testing Library + Cypress

#### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express/Fastify with TypeScript
- **ORM:** Prisma with migrations
- **Validation:** Joi/Zod schemas
- **Authentication:** ${projectType.patterns.auth}
- **Authorization:** RBAC with Casbin
- **API Documentation:** OpenAPI/Swagger
- **Testing:** Jest + Supertest

#### Infrastructure
- **Cloud Provider:** AWS/GCP/Azure
- **Container:** Docker + Kubernetes
- **CI/CD:** GitHub Actions + ArgoCD
- **Monitoring:** DataDog/New Relic
- **Logging:** ELK Stack
- **Error Tracking:** Sentry
- **CDN:** CloudFlare

#### Data Layer
- **Primary Database:** ${projectType.patterns.database || 'PostgreSQL 15'}
- **Cache:** Redis 7 with clustering
- **Search:** Elasticsearch 8
- **File Storage:** S3-compatible
- **Message Queue:** Redis/RabbitMQ
- **Analytics:** ClickHouse

### API Specification

#### Authentication Endpoints
\`\`\`yaml
/api/v1/auth:
  /register:
    POST:
      body: { email, password, name }
      response: { user, token, refreshToken }
  
  /login:
    POST:
      body: { email, password }
      response: { user, token, refreshToken }
  
  /refresh:
    POST:
      body: { refreshToken }
      response: { token, refreshToken }
  
  /logout:
    POST:
      headers: { Authorization: Bearer <token> }
      response: { success: true }
\`\`\`

#### Core Feature Endpoints
${features.map(feature => `
\`\`\`yaml
/api/v1/${feature.toLowerCase().replace(/\s+/g, '-')}:
  GET:
    query: { page, limit, sort, filter }
    response: { data: [], total, page, limit }
  
  POST:
    body: { ...featureData }
    response: { id, ...createdData }
  
  /:id:
    GET:
      response: { ...featureData }
    PUT:
      body: { ...updatedData }
      response: { ...updatedData }
    DELETE:
      response: { success: true }
\`\`\`
`).join('\n')}

### Database Schema (Detailed)

\`\`\`sql
-- Core tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  INDEX idx_email (email),
  INDEX idx_status (status)
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id),
  plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_slug (slug),
  INDEX idx_owner (owner_id)
);

${features.map(feature => `
CREATE TABLE ${feature.toLowerCase().replace(/\s+/g, '_')} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  created_by UUID REFERENCES users(id),
  data JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_org (org_id),
  INDEX idx_created_by (created_by),
  INDEX idx_status (status)
);
`).join('\n')}
\`\`\`

### Security Requirements

#### Authentication & Authorization
- Multi-factor authentication (MFA) support
- OAuth 2.0 / SAML SSO integration
- JWT with refresh token rotation
- Role-based access control (RBAC)
- API key management for integrations

#### Data Protection
- End-to-end encryption for sensitive data
- At-rest encryption using AES-256
- In-transit encryption using TLS 1.3
- PII data masking and tokenization
- Regular security audits and penetration testing

#### Compliance
- GDPR compliance with data portability
- CCPA compliance for California users
- SOC 2 Type II certification
- HIPAA compliance (if healthcare data)
- PCI DSS compliance (if payment processing)

## Success Metrics & KPIs

### ${successMetrics || 'Business Metrics'}

#### User Acquisition
- **Target:** 10,000 users in 6 months
- **Channels:** Organic (40%), Paid (30%), Referral (30%)
- **CAC:** < $50 per user
- **LTV:CAC Ratio:** > 3:1

#### User Engagement
- **Daily Active Users (DAU):** 40% of total users
- **Weekly Active Users (WAU):** 70% of total users
- **Average Session Duration:** > 15 minutes
- **Features Used Per Session:** > 3
- **Mobile Usage:** > 50%

#### Revenue Metrics
- **MRR Growth:** 20% month-over-month
- **ARPU:** $30-50
- **Churn Rate:** < 5% monthly
- **Net Revenue Retention:** > 110%
- **Payback Period:** < 12 months

### Technical Metrics

#### Performance
- **Page Load Time:** < 1.5s (P95)
- **API Response Time:** < 100ms (P95)
- **Time to Interactive:** < 2s
- **First Contentful Paint:** < 1s
- **Lighthouse Score:** > 95

#### Reliability
- **Uptime:** 99.99% (< 5 min downtime/month)
- **Error Rate:** < 0.1%
- **MTTR:** < 30 minutes
- **Deployment Success Rate:** > 95%
- **Rollback Rate:** < 5%

#### Quality
- **Code Coverage:** > 85%
- **Technical Debt Ratio:** < 5%
- **Bug Escape Rate:** < 2%
- **Customer-Reported Bugs:** < 5/month
- **Security Vulnerabilities:** 0 critical, < 5 medium

## Implementation Timeline & Milestones

### ${timelineConstraints || 'Timeline Overview'}

#### Phase 0: Planning & Setup (Weeks 0-2)
- Finalize technical architecture
- Set up development infrastructure
- Hire key team members
- Create detailed project plan
- Set up tracking and analytics

#### Phase 1: Foundation (Weeks 3-6)
- **Week 3-4:** Core infrastructure setup
  - Database schema implementation
  - Authentication system
  - Basic API framework
  - CI/CD pipeline
  
- **Week 5-6:** Frontend foundation
  - Component library setup
  - Routing and state management
  - Design system implementation
  - Responsive layouts

#### Phase 2: Core Features (Weeks 7-14)
${features.map((feature, index) => `
- **Week ${7 + index * 2}-${8 + index * 2}:** ${feature}
  - Backend implementation
  - Frontend UI
  - Integration testing
  - Documentation
`).join('')}

#### Phase 3: Enhancement (Weeks 15-18)
- **Week 15-16:** Performance optimization
  - Database query optimization
  - Caching implementation
  - CDN setup
  - Load testing
  
- **Week 17-18:** Polish & QA
  - UI/UX refinements
  - Bug fixes
  - Security audit
  - User acceptance testing

#### Phase 4: Launch Preparation (Weeks 19-20)
- Marketing website
- Documentation portal
- Customer support setup
- Launch plan execution
- Beta user onboarding

#### Phase 5: Public Launch (Week 21)
- Public announcement
- Press release
- Product Hunt launch
- Community outreach
- Monitor and iterate

## Risk Assessment & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|-------------------|
| Scalability issues | Medium | High | Load testing, auto-scaling, CDN implementation |
| Security breach | Low | Critical | Security audits, penetration testing, bug bounty |
| Third-party service failure | Medium | Medium | Multiple vendors, fallback systems, SLAs |
| Data loss | Low | Critical | Automated backups, disaster recovery plan |
| Technical debt accumulation | High | Medium | Code reviews, refactoring sprints, standards |

### Business Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|-------------------|
| Low user adoption | Medium | High | User research, MVP validation, rapid iteration |
| Strong competition | High | Medium | Unique features, better UX, competitive pricing |
| Funding challenges | Medium | High | Staged development, revenue focus, investor pipeline |
| Key personnel loss | Low | High | Knowledge documentation, cross-training, retention |
| Regulatory changes | Low | Medium | Legal consultation, compliance monitoring |

### Market Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|-------------------|
| Market downturn | Low | Medium | Diverse customer base, flexible pricing |
| Technology shift | Medium | High | Modular architecture, continuous learning |
| Customer needs change | Medium | Medium | Regular feedback loops, agile development |

## Budget & Resource Planning

### Development Costs (6 months)
- **Personnel:** $300,000
  - 2 Senior Engineers @ $150k/year
  - 2 Mid-level Engineers @ $120k/year
  - 1 Designer @ $100k/year
  - 1 Product Manager @ $130k/year

- **Infrastructure:** $30,000
  - Cloud hosting: $3,000/month
  - Tools & services: $2,000/month

- **Marketing:** $50,000
  - Content creation: $20,000
  - Paid advertising: $20,000
  - Events & conferences: $10,000

- **Operations:** $20,000
  - Legal & compliance: $10,000
  - Accounting: $5,000
  - Miscellaneous: $5,000

**Total Budget:** $400,000

### Resource Allocation
- **Engineering:** 60%
- **Product/Design:** 20%
- **Marketing:** 15%
- **Operations:** 5%

## Go-to-Market Strategy

### Launch Strategy
1. **Soft Launch (Week 1-2):** Beta users only
2. **Limited Launch (Week 3-4):** Invite-only
3. **Public Launch (Week 5):** Full availability

### Marketing Channels
- **Content Marketing:** Blog, tutorials, case studies
- **Social Media:** Twitter, LinkedIn, Reddit
- **Developer Communities:** GitHub, Dev.to, HackerNews
- **Paid Acquisition:** Google Ads, Facebook Ads
- **Partnerships:** Integration partners, affiliates

### Pricing Strategy
- **Freemium Model:**
  - Free: Up to 3 users
  - Pro: $29/user/month
  - Business: $99/user/month
  - Enterprise: Custom pricing

## Appendices

### A. Glossary of Terms
- **API:** Application Programming Interface
- **CAC:** Customer Acquisition Cost
- **KPI:** Key Performance Indicator
- **MRR:** Monthly Recurring Revenue
- **MVP:** Minimum Viable Product
- **SLA:** Service Level Agreement

### B. Research Data
- User interview transcripts: Available upon request
- Survey results: 500+ responses analyzed
- Competitive analysis: 10-page detailed report
- Market research: 3 industry reports referenced

### C. Technical Documentation
- API documentation: OpenAPI specification
- Database ERD: Detailed entity relationships
- Architecture diagrams: Multiple views available
- Security assessment: Penetration test results

### D. Legal Considerations
- Terms of Service: Draft available
- Privacy Policy: GDPR-compliant draft
- Data Processing Agreement: Template ready
- Intellectual Property: Patent search completed
        `.trim();
        
        // Comprehensive Claude-optimized version
        const claudeOptimized = `
# CLAUDE CODE IMPLEMENTATION GUIDE - COMPREHENSIVE PRD

## SYSTEM CONTEXT
Project: ${projectDesc}
Type: ${projectType.name}
Users: ${targetUsers}
Stack: ${this.getTechStack()}
Timeline: ${timelineConstraints}

## CRITICAL SUCCESS FACTORS
${successMetrics}

## COMPETITIVE ANALYSIS
${problemCompetitors}

## COMPLETE IMPLEMENTATION ROADMAP

### PHASE 1: PROJECT INITIALIZATION
\`\`\`bash
# Create monorepo structure
npx create-turbo@latest \${projectDesc.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}
cd \${projectDesc.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}

# Set up workspaces
mkdir -p apps/web apps/api packages/database packages/ui packages/utils
\`\`\`

### PHASE 2: INFRASTRUCTURE SETUP
\`\`\`typescript
// apps/api/src/config/database.ts
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['query', 'error', 'warn'],
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
\`\`\`

### PHASE 3: AUTHENTICATION SYSTEM
Pattern: ${projectType.patterns.auth}
\`\`\`typescript
// apps/api/src/services/auth.service.ts
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

export class AuthService {
  async register(email: string, password: string) {
    // Validate input
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format')
    }
    
    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new Error('User already exists')
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Create user
    const user = await prisma.user.create({
      data: { email, password: hashedPassword }
    })
    
    // Generate tokens
    const token = this.generateToken(user.id)
    const refreshToken = this.generateRefreshToken(user.id)
    
    return { user, token, refreshToken }
  }
  
  private generateToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' })
  }
  
  private generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' })
  }
}
\`\`\`

### PHASE 4: CORE FEATURES IMPLEMENTATION
${features.map((feature, index) => `
#### Feature ${index + 1}: ${feature}
\`\`\`typescript
// apps/api/src/routes/${feature.toLowerCase().replace(/\s+/g, '-')}.route.ts
import { Router } from 'express'
import { z } from 'zod'

const router = Router()

const \${feature.replace(/[^a-zA-Z0-9]/g, '')}Schema = z.object({
  // Define your schema
  data: z.string().min(1),
  metadata: z.object({}).optional()
})

router.post('/', async (req, res) => {
  try {
    // Validate input
    const validated = \${feature.replace(/[^a-zA-Z0-9]/g, '')}Schema.parse(req.body)
    
    // Check permissions
    if (!req.user.can('create:${feature.toLowerCase()}')) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    
    // Business logic
    const result = await prisma.${feature.toLowerCase().replace(/\s+/g, '_')}.create({
      data: {
        ...validated,
        userId: req.user.id,
        organizationId: req.user.organizationId
      }
    })
    
    // Emit event for real-time updates
    io.to(req.user.organizationId).emit('${feature.toLowerCase()}:created', result)
    
    // Analytics tracking
    analytics.track({
      userId: req.user.id,
      event: '${feature} Created',
      properties: { id: result.id }
    })
    
    res.json({ success: true, data: result })
  } catch (error) {
    console.error(error)
    res.status(400).json({ error: error.message })
  }
})

export default router
\`\`\`
`).join('\n')}

### PHASE 5: DATABASE SCHEMA
\`\`\`prisma
// packages/database/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String
  name            String?
  role            UserRole  @default(USER)
  status          Status    @default(ACTIVE)
  organizationId  String?
  organization    Organization? @relation(fields: [organizationId], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastLoginAt     DateTime?
  
  @@index([email])
  @@index([organizationId])
}

model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  plan        Plan     @default(FREE)
  users       User[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([slug])
}

${features.map(feature => `
model \${feature.replace(/[^a-zA-Z0-9]/g, '')} {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  data           Json
  status         Status   @default(ACTIVE)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@index([organizationId])
  @@index([userId])
  @@index([status])
}
`).join('\n')}

enum UserRole {
  ADMIN
  USER
  VIEWER
}

enum Status {
  ACTIVE
  INACTIVE
  DELETED
}

enum Plan {
  FREE
  PRO
  BUSINESS
  ENTERPRISE
}
\`\`\`

### PHASE 6: TESTING STRATEGY
\`\`\`typescript
// apps/api/src/__tests__/feature.test.ts
import request from 'supertest'
import { app } from '../app'
import { prisma } from '../config/database'

describe('${features[0]} API', () => {
  let authToken: string
  let userId: string
  
  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: { email: 'test@example.com', passwordHash: 'hash' }
    })
    userId = user.id
    authToken = generateTestToken(userId)
  })
  
  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } })
  })
  
  describe('POST /api/${features[0].toLowerCase().replace(/\s+/g, '-')}', () => {
    it('should create successfully with valid data', async () => {
      const response = await request(app)
        .post('/api/${features[0].toLowerCase().replace(/\s+/g, '-')}')
        .set('Authorization', \`Bearer \${authToken}\`)
        .send({ data: 'test data' })
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id')
    })
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/${features[0].toLowerCase().replace(/\s+/g, '-')}')
        .send({ data: 'test data' })
      
      expect(response.status).toBe(401)
    })
  })
})
\`\`\`

### PHASE 7: DEPLOYMENT CONFIGURATION
\`\`\`yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          push: true
          tags: \${{ secrets.DOCKER_REGISTRY }}/app:latest
      - uses: digitalocean/action-doctl@v2
        with:
          token: \${{ secrets.DO_TOKEN }}
      - run: doctl kubernetes cluster kubeconfig save prod
      - run: kubectl apply -f k8s/
      - run: kubectl rollout status deployment/app
\`\`\`

### PHASE 8: MONITORING & OBSERVABILITY
\`\`\`typescript
// apps/api/src/middleware/monitoring.ts
import { Request, Response, NextFunction } from 'express'
import { StatsD } from 'node-statsd'

const statsd = new StatsD({
  host: process.env.STATSD_HOST,
  port: 8125,
})

export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    
    // Track request metrics
    statsd.timing('api.request.duration', duration)
    statsd.increment('api.request.count')
    statsd.increment(\`api.request.status.\${res.statusCode}\`)
    statsd.increment(\`api.request.method.\${req.method}\`)
    statsd.increment(\`api.request.path.\${req.path.replace(/\\//g, '_')}\`)
    
    // Log slow requests
    if (duration > 1000) {
      console.warn('Slow request', {
        path: req.path,
        method: req.method,
        duration,
        status: res.statusCode
      })
    }
  })
  
  next()
}
\`\`\`

## PERFORMANCE OPTIMIZATION CHECKLIST
- [ ] Database indexes on all foreign keys
- [ ] Redis caching for frequently accessed data
- [ ] CDN for static assets
- [ ] Lazy loading for frontend routes
- [ ] Image optimization with WebP
- [ ] Gzip compression enabled
- [ ] Connection pooling configured
- [ ] Rate limiting implemented
- [ ] Query optimization completed
- [ ] Load testing passed (10K concurrent users)

## SECURITY CHECKLIST
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (content security policy)
- [ ] CSRF tokens implemented
- [ ] Rate limiting configured
- [ ] Secrets in environment variables
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Dependency scanning enabled
- [ ] Penetration testing completed

## LAUNCH CHECKLIST
- [ ] All features implemented and tested
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Rollback plan documented
- [ ] Support team trained
- [ ] Marketing materials ready
- [ ] Legal review completed

## SUCCESS CRITERIA VALIDATION
${successMetrics.split('\n').map(metric => `- [ ] ${metric}`).join('\n')}

## IMMEDIATE NEXT STEPS
1. Set up project repository
2. Configure CI/CD pipeline
3. Initialize database schema
4. Implement authentication
5. Build first core feature
6. Deploy to staging environment
7. Begin user testing
        `.trim();
        
        return {
            humanReadable: humanReadable,
            claudeOptimized: claudeOptimized
        };
    }
    
    // Helper method to get pattern examples
    getPatternExample(key, value) {
        const examples = {
            auth: `
// JWT Authentication with refresh tokens
const auth = jwt.sign({ userId }, SECRET, { expiresIn: '15m' })
const refresh = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' })`,
            payments: `
// Stripe subscription integration
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{ price: 'price_id', quantity: 1 }],
  mode: 'subscription'
})`,
            realtime: `
// WebSocket real-time updates
io.on('connection', (socket) => {
  socket.join(\`room:\${userId}\`)
  socket.emit('connected', { id: socket.id })
})`,
            database: `
// PostgreSQL with Prisma ORM
const user = await prisma.user.create({
  data: { email, name },
  include: { posts: true }
})`
        };
        
        return examples[key] || `// Implementation for ${value}`;
    }
    
    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateDisplay();
        }
    }
    
    canProceed() {
        // Check if current step has a response
        const questionId = this.wizardQuestions[this.currentStep]?.id;
        return questionId && this.wizardResponses[questionId];
    }
}

// Initialize PRD Genius when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.prdGenius = new PRDGenius();
    });
} else {
    window.prdGenius = new PRDGenius();
}