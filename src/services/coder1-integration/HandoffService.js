/**
 * Coder1 Handoff Service - Smart PRD to Implementation Bridge
 * 
 * This service manages the seamless transition from PRD generation to 
 * Coder1 IDE implementation. It creates project templates, sets up 
 * development environments, and provides contextual guidance.
 * 
 * Features:
 * - PRD-to-project template generation
 * - Coder1 IDE workspace setup
 * - Context-aware implementation guidance
 * - Progress tracking and analytics
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class HandoffService extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.logger = options.logger || console;
        this.templatesDir = options.templatesDir || path.join(__dirname, '../../data/templates');
        this.projectsDir = options.projectsDir || path.join(__dirname, '../../data/projects');
        
        // Active handoffs tracking
        this.handoffs = new Map();
        
        // Configuration
        this.config = {
            enableProjectGeneration: true,
            enableContextGuides: true,
            enableProgressTracking: true,
            defaultIDEPort: 3001
        };
        
        this.logger.info('🤝 Coder1 Handoff Service initialized');
    }

    /**
     * Initialize the handoff service
     */
    async initialize() {
        try {
            await this.ensureDirectories();
            await this.loadTemplates();
            
            this.logger.info('✅ Coder1 Handoff Service ready');
            return true;
        } catch (error) {
            this.logger.error('❌ Handoff Service initialization failed:', error);
            throw error;
        }
    }

    /**
     * Ensure required directories exist
     */
    async ensureDirectories() {
        const dirs = [this.templatesDir, this.projectsDir];
        
        for (const dir of dirs) {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
                this.logger.info(`📁 Created directory: ${dir}`);
            }
        }
    }

    /**
     * Load project templates
     */
    async loadTemplates() {
        // Templates will be loaded here
        // For now, we'll use built-in templates
        this.logger.info('📋 Templates loaded');
    }

    /**
     * Create a handoff from PRD to Coder1
     */
    async createHandoff(sessionId, prdResult, userPreferences = {}) {
        try {
            const handoffId = `handoff-${sessionId}-${Date.now()}`;
            
            const handoff = {
                id: handoffId,
                sessionId,
                prdResult,
                userPreferences,
                createdAt: Date.now(),
                status: 'created',
                steps: await this.generateHandoffSteps(prdResult),
                projectSetup: await this.generateProjectSetup(prdResult),
                coder1Context: await this.generateCoder1Context(prdResult)
            };

            this.handoffs.set(handoffId, handoff);
            
            this.logger.info(`🤝 Created handoff ${handoffId} for session ${sessionId}`);
            this.emit('handoff-created', { handoffId, handoff });

            return handoff;
            
        } catch (error) {
            this.logger.error('Failed to create handoff:', error);
            throw error;
        }
    }

    /**
     * Generate handoff steps for user guidance
     */
    async generateHandoffSteps(prdResult) {
        const pattern = prdResult.rawDocument?.pattern || prdResult.metadata?.pattern;
        
        const steps = [
            {
                id: 'review-prd',
                title: 'Review Your PRD',
                description: 'Take a moment to review the generated PRD and ensure it aligns with your vision.',
                status: 'pending',
                timeEstimate: '5 minutes',
                action: {
                    type: 'review',
                    target: 'prd-document'
                }
            },
            {
                id: 'setup-coder1',
                title: 'Launch Coder1 IDE',
                description: 'Open the Coder1 IDE to begin implementation with AI assistance.',
                status: 'pending',
                timeEstimate: '2 minutes',
                action: {
                    type: 'launch',
                    target: 'coder1-ide',
                    url: `http://localhost:${this.config.defaultIDEPort}/ide`
                }
            },
            {
                id: 'create-project',
                title: 'Create Project Structure',
                description: 'Set up the initial project structure based on your PRD specifications.',
                status: 'pending',
                timeEstimate: '10 minutes',
                action: {
                    type: 'command',
                    target: 'project-setup',
                    commands: await this.generateSetupCommands(prdResult)
                }
            },
            {
                id: 'implement-core',
                title: 'Implement Core Features',
                description: 'Begin implementing the core features with Claude Code assistance.',
                status: 'pending',
                timeEstimate: '30-60 minutes',
                action: {
                    type: 'development',
                    target: 'core-features',
                    guidance: await this.generateImplementationGuidance(prdResult)
                }
            },
            {
                id: 'deploy-mvp',
                title: 'Deploy MVP',
                description: 'Deploy your minimum viable product for testing and validation.',
                status: 'pending',
                timeEstimate: '15 minutes',
                action: {
                    type: 'deployment',
                    target: 'mvp-deployment',
                    platforms: ['Vercel', 'Netlify', 'Railway']
                }
            }
        ];

        return steps;
    }

    /**
     * Generate project setup configuration
     */
    async generateProjectSetup(prdResult) {
        const pattern = prdResult.rawDocument?.pattern;
        if (!pattern) return {};

        const setup = {
            projectName: prdResult.metadata?.projectName || 'My Project',
            template: this.getProjectTemplate(pattern),
            dependencies: this.getProjectDependencies(pattern),
            structure: this.getProjectStructure(pattern),
            configuration: this.getProjectConfiguration(pattern, prdResult)
        };

        return setup;
    }

    /**
     * Generate Coder1-specific context
     */
    async generateCoder1Context(prdResult) {
        const pattern = prdResult.rawDocument?.pattern;
        if (!pattern) return {};

        return {
            welcomeMessage: this.generateWelcomeMessage(prdResult),
            quickActions: this.generateQuickActions(pattern),
            aiPrompts: this.generateAIPrompts(pattern),
            learningResources: this.generateLearningResources(pattern),
            progressMilestones: this.generateProgressMilestones(pattern)
        };
    }

    /**
     * Generate setup commands for the project
     */
    async generateSetupCommands(prdResult) {
        const pattern = prdResult.rawDocument?.pattern;
        if (!pattern) return [];

        const commands = [];
        
        // Basic project setup
        commands.push('# 🚀 Project Setup Commands');
        commands.push('# Copy and paste these commands into your Coder1 terminal');
        commands.push('');
        
        // Frontend setup
        if (pattern.architecture?.frontend) {
            const tech = pattern.architecture.frontend.tech;
            if (tech.includes('Next.js')) {
                commands.push('npx create-next-app@latest . --typescript --tailwind --app');
            } else if (tech.includes('React')) {
                commands.push('npx create-react-app . --template typescript');
            } else if (tech.includes('Vue')) {
                commands.push('npm create vue@latest .');
            }
        }
        
        // Backend setup
        if (pattern.architecture?.backend) {
            commands.push('');
            commands.push('# Backend setup');
            commands.push('mkdir backend && cd backend');
            commands.push('npm init -y');
            commands.push('npm install express cors dotenv');
            
            const tech = pattern.architecture.backend.tech;
            if (tech.includes('GraphQL')) {
                commands.push('npm install graphql apollo-server-express');
            }
            if (tech.includes('Socket.io')) {
                commands.push('npm install socket.io');
            }
        }
        
        // Database setup
        if (pattern.architecture?.database) {
            commands.push('');
            commands.push('# Database setup');
            const tech = pattern.architecture.database.tech;
            if (tech.includes('PostgreSQL')) {
                commands.push('npm install pg @types/pg');
                commands.push('# Set up PostgreSQL connection in .env');
            }
            if (tech.includes('MongoDB')) {
                commands.push('npm install mongoose');
            }
            if (tech.includes('Redis')) {
                commands.push('npm install redis');
            }
        }
        
        commands.push('');
        commands.push('# 🎯 Ready to code with Claude Code assistance!');
        
        return commands;
    }

    /**
     * Generate implementation guidance
     */
    async generateImplementationGuidance(prdResult) {
        const pattern = prdResult.rawDocument?.pattern;
        if (!pattern) return {};

        return {
            overview: `You're building a ${pattern.metadata.name} following proven patterns from companies like ${pattern.metadata.examples?.join(', ') || 'industry leaders'}.`,
            priorities: [
                'Start with user authentication and basic UI',
                'Implement core business logic features',
                'Add real-time features if needed',
                'Integrate payment processing',
                'Set up monitoring and analytics'
            ],
            claudePrompts: [
                `Help me implement authentication for a ${pattern.metadata.name}`,
                `Create the database schema for ${pattern.metadata.category} application`,
                `Set up the main UI components following ${pattern.metadata.examples?.[0] || 'modern'} patterns`,
                `Implement the core ${pattern.metadata.category} functionality`
            ],
            commonPatterns: this.getImplementationPatterns(pattern),
            pitfalls: this.getCommonPitfalls(pattern)
        };
    }

    /**
     * Get project template for pattern
     */
    getProjectTemplate(pattern) {
        const templates = {
            'saas': 'nextjs-saas-starter',
            'ecommerce': 'ecommerce-platform',
            'collaboration': 'team-workspace',
            'devtools': 'developer-platform',
            'social': 'social-network',
            'analytics': 'analytics-dashboard',
            'marketplace': 'marketplace-platform'
        };
        
        return templates[pattern.metadata.category] || 'fullstack-starter';
    }

    /**
     * Get project dependencies
     */
    getProjectDependencies(pattern) {
        const baseDeps = ['react', 'next', 'typescript', 'tailwindcss'];
        const deps = [...baseDeps];
        
        // Add pattern-specific dependencies
        if (pattern.architecture?.realtime) {
            deps.push('socket.io-client');
        }
        if (pattern.architecture?.payments) {
            deps.push('@stripe/stripe-js');
        }
        if (pattern.architecture?.database?.tech?.includes('PostgreSQL')) {
            deps.push('pg', '@types/pg');
        }
        
        return deps;
    }

    /**
     * Get project structure
     */
    getProjectStructure(pattern) {
        const baseStructure = [
            'src/',
            'src/components/',
            'src/pages/',
            'src/hooks/',
            'src/utils/',
            'public/',
            'README.md',
            '.env.example'
        ];
        
        // Add pattern-specific structure
        if (pattern.metadata.category === 'saas') {
            baseStructure.push('src/auth/', 'src/billing/', 'src/dashboard/');
        }
        
        return baseStructure;
    }

    /**
     * Get project configuration
     */
    getProjectConfiguration(pattern, prdResult) {
        return {
            environment: {
                'NEXT_PUBLIC_APP_NAME': prdResult.metadata?.projectName || 'My App',
                'NEXT_PUBLIC_APP_DESCRIPTION': pattern.description || '',
                'DATABASE_URL': 'your-database-url',
                'NEXTAUTH_SECRET': 'your-auth-secret'
            },
            scripts: {
                'dev': 'next dev',
                'build': 'next build',
                'start': 'next start',
                'test': 'jest'
            }
        };
    }

    /**
     * Generate welcome message
     */
    generateWelcomeMessage(prdResult) {
        return `🎉 Welcome to your ${prdResult.metadata?.projectName || 'project'} implementation! 

Your PRD has been analyzed and we've prepared everything you need to start building. This project follows proven patterns from successful companies, giving you a strong foundation for success.

Ready to build something amazing? Let's start coding! 🚀`;
    }

    /**
     * Generate quick actions
     */
    generateQuickActions(pattern) {
        return [
            {
                title: '🎯 Create Component',
                description: 'Generate a new React component',
                command: 'claude create a new component for [describe functionality]'
            },
            {
                title: '🗄️ Setup Database',
                description: 'Configure database schema',
                command: 'claude help me set up the database schema for this project'
            },
            {
                title: '🔐 Add Authentication',
                description: 'Implement user authentication',
                command: 'claude implement authentication using NextAuth.js'
            },
            {
                title: '🎨 Style Components',
                description: 'Apply Tailwind styling',
                command: 'claude style this component using Tailwind CSS'
            }
        ];
    }

    /**
     * Generate AI prompts for Claude Code
     */
    generateAIPrompts(pattern) {
        const category = pattern.metadata.category;
        const examples = pattern.metadata.examples || [];
        
        return [
            `I'm building a ${category} application similar to ${examples[0] || 'industry leaders'}. Help me implement the core features.`,
            `Create the main dashboard component for a ${category} platform with modern UI patterns.`,
            `Set up the database schema for a ${category} application with proper relationships.`,
            `Implement user authentication and authorization for a ${category} platform.`,
            `Add real-time features using WebSocket for this ${category} application.`
        ];
    }

    /**
     * Generate learning resources
     */
    generateLearningResources(pattern) {
        return [
            {
                title: `${pattern.metadata.name} Architecture Guide`,
                description: 'Learn the proven patterns used by successful companies',
                type: 'documentation',
                url: '#'
            },
            {
                title: 'Coder1 IDE Tutorial',
                description: 'Master the Coder1 development environment',
                type: 'video',
                url: '#'
            },
            {
                title: 'Claude Code Best Practices',
                description: 'Get the most out of AI-assisted development',
                type: 'guide',
                url: '#'
            }
        ];
    }

    /**
     * Generate progress milestones
     */
    generateProgressMilestones(pattern) {
        return [
            {
                id: 'project-setup',
                title: 'Project Setup Complete',
                description: 'Basic project structure and dependencies installed',
                points: 100
            },
            {
                id: 'auth-implemented',
                title: 'Authentication Working',
                description: 'User registration and login functionality',
                points: 200
            },
            {
                id: 'core-features',
                title: 'Core Features Built',
                description: 'Main business logic implemented',
                points: 500
            },
            {
                id: 'mvp-deployed',
                title: 'MVP Deployed',
                description: 'Working application deployed and accessible',
                points: 1000
            }
        ];
    }

    /**
     * Get implementation patterns for the category
     */
    getImplementationPatterns(pattern) {
        const patterns = {
            'saas': [
                'Multi-tenant architecture',
                'Subscription billing integration',
                'Role-based access control',
                'Usage analytics and tracking'
            ],
            'ecommerce': [
                'Product catalog management',
                'Shopping cart and checkout',
                'Payment processing',
                'Order management system'
            ],
            'collaboration': [
                'Real-time synchronization',
                'Operational transform',
                'Presence indicators',
                'Permission management'
            ]
        };
        
        return patterns[pattern.metadata.category] || ['Component architecture', 'State management', 'API design', 'Database optimization'];
    }

    /**
     * Get common pitfalls for the category
     */
    getCommonPitfalls(pattern) {
        return [
            'Starting with complex features before validating core functionality',
            'Over-engineering the initial implementation',
            'Neglecting performance considerations early on',
            'Insufficient error handling and edge cases',
            'Poor database design that doesn\'t scale'
        ];
    }

    /**
     * Get handoff by ID
     */
    getHandoff(handoffId) {
        return this.handoffs.get(handoffId);
    }

    /**
     * Update handoff step status
     */
    updateStepStatus(handoffId, stepId, status) {
        const handoff = this.handoffs.get(handoffId);
        if (!handoff) {
            throw new Error(`Handoff ${handoffId} not found`);
        }
        
        const step = handoff.steps.find(s => s.id === stepId);
        if (step) {
            step.status = status;
            step.completedAt = status === 'completed' ? Date.now() : null;
            
            this.handoffs.set(handoffId, handoff);
            this.emit('step-updated', { handoffId, stepId, status });
        }
        
        return handoff;
    }

    /**
     * Get handoff analytics
     */
    getHandoffAnalytics() {
        const handoffs = Array.from(this.handoffs.values());
        
        return {
            totalHandoffs: handoffs.length,
            completedHandoffs: handoffs.filter(h => h.status === 'completed').length,
            averageCompletionTime: this.calculateAverageCompletionTime(handoffs),
            popularPatterns: this.getPopularPatterns(handoffs),
            conversionRate: this.calculateConversionRate(handoffs)
        };
    }

    /**
     * Calculate average completion time
     */
    calculateAverageCompletionTime(handoffs) {
        const completed = handoffs.filter(h => h.completedAt && h.createdAt);
        if (completed.length === 0) return 0;
        
        const totalTime = completed.reduce((sum, h) => sum + (h.completedAt - h.createdAt), 0);
        return Math.round(totalTime / completed.length / 1000 / 60); // minutes
    }

    /**
     * Get popular patterns
     */
    getPopularPatterns(handoffs) {
        const patterns = {};
        handoffs.forEach(h => {
            const pattern = h.prdResult?.metadata?.pattern;
            if (pattern) {
                patterns[pattern] = (patterns[pattern] || 0) + 1;
            }
        });
        
        return Object.entries(patterns)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([pattern, count]) => ({ pattern, count }));
    }

    /**
     * Calculate conversion rate (handoffs that lead to actual development)
     */
    calculateConversionRate(handoffs) {
        if (handoffs.length === 0) return 0;
        
        const activeHandoffs = handoffs.filter(h => 
            h.steps.some(step => step.status === 'completed' || step.status === 'in-progress')
        );
        
        return Math.round((activeHandoffs.length / handoffs.length) * 100);
    }
}

module.exports = HandoffService;