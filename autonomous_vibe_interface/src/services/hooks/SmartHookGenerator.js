/**
 * Smart Hook Configuration Generator
 * Uses AI analysis to automatically generate optimized hook configurations
 * Integrates with existing Claude Code hooks infrastructure
 */

const AIHookAnalyzer = require('./AIHookAnalyzer');
const HookTemplates = require('./HookTemplates');
const HookConfigGenerator = require('./HookConfigGenerator');

class SmartHookGenerator {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.analyzer = new AIHookAnalyzer(projectPath);
        this.templates = new HookTemplates();
        this.configGenerator = new HookConfigGenerator();
        this.aiEnabled = true;
    }

    /**
     * Generate AI-optimized hook configuration for the project
     */
    async generateSmartConfiguration(options = {}) {
        const {
            includePerformance = true,
            includeSecurity = true,
            includeQuality = true,
            includeWorkflow = true,
            aggressiveOptimization = false,
            scope = 'project'
        } = options;

        try {
            console.log('🧠 Analyzing project with AI...');
            
            // Run AI analysis
            const aiAnalysis = await this.analyzer.analyzeProject();
            
            console.log(`📊 Analysis complete - Health Score: ${aiAnalysis.codebaseHealth.score}/100`);
            
            // Generate smart hook selections
            const smartHooks = this.selectOptimalHooks(aiAnalysis, {
                includePerformance,
                includeSecurity,
                includeQuality,
                includeWorkflow,
                aggressiveOptimization
            });

            // Generate configuration with AI customization
            const config = await this.generateAICustomizedConfig(smartHooks, aiAnalysis);
            
            // Add AI metadata
            const smartConfig = {
                ...config,
                aiGenerated: true,
                analysisTimestamp: aiAnalysis.timestamp,
                healthScore: aiAnalysis.codebaseHealth.score,
                optimizations: smartHooks.optimizations,
                recommendations: aiAnalysis.aiRecommendations,
                metadata: {
                    generator: 'SmartHookGenerator',
                    version: '1.0.0',
                    projectType: aiAnalysis.projectType,
                    confidence: this.calculateOverallConfidence(aiAnalysis),
                    estimatedBenefits: this.calculateEstimatedBenefits(smartHooks)
                }
            };

            return {
                success: true,
                config: smartConfig,
                analysis: aiAnalysis,
                selectedHooks: smartHooks.hooks,
                optimizations: smartHooks.optimizations,
                implementation: this.generateImplementationPlan(smartHooks, aiAnalysis)
            };

        } catch (error) {
            console.error('Smart configuration generation failed:', error);
            return this.getFallbackConfiguration(options);
        }
    }

    /**
     * Select optimal hooks based on AI analysis
     */
    selectOptimalHooks(aiAnalysis, options) {
        const selectedHooks = [];
        const optimizations = [];
        const reasoning = [];

        // Core quality hooks (always include)
        selectedHooks.push('prettier-format', 'command-logger');
        reasoning.push('Core productivity hooks');

        // Security-based selections
        if (options.includeSecurity && aiAnalysis.securityRisks.vulnerabilities.length > 0) {
            selectedHooks.push('security-scanner', 'secret-detector');
            optimizations.push({
                type: 'security',
                hooks: ['security-scanner', 'secret-detector'],
                reason: `${aiAnalysis.securityRisks.vulnerabilities.length} security issues detected`,
                impact: 'high'
            });
        }

        // Performance-based selections
        if (options.includePerformance) {
            const buildTime = aiAnalysis.performanceBottlenecks.buildTime?.average || 0;
            if (buildTime > 30000) { // >30 seconds
                selectedHooks.push('build-optimizer', 'dependency-analyzer');
                optimizations.push({
                    type: 'performance',
                    hooks: ['build-optimizer', 'dependency-analyzer'],
                    reason: `Build time is ${Math.round(buildTime/1000)} seconds`,
                    impact: 'high',
                    estimatedSavings: `${Math.round(buildTime/2000)} seconds per build`
                });
            }

            // Bundle size optimization
            if (aiAnalysis.performanceBottlenecks.dependencySize?.totalSize > 50 * 1024 * 1024) {
                selectedHooks.push('bundle-analyzer');
                optimizations.push({
                    type: 'bundle',
                    hooks: ['bundle-analyzer'],
                    reason: 'Large dependency footprint detected',
                    impact: 'medium'
                });
            }
        }

        // Code quality selections
        if (options.includeQuality) {
            const healthScore = aiAnalysis.codebaseHealth.score;
            
            if (healthScore < 80) {
                selectedHooks.push('eslint-fix', 'code-complexity-monitor');
                optimizations.push({
                    type: 'quality',
                    hooks: ['eslint-fix', 'code-complexity-monitor'],
                    reason: `Code health score is ${healthScore}/100`,
                    impact: 'medium'
                });
            }

            // Duplication detection
            if (aiAnalysis.codebaseHealth.metrics.duplicationScore > 0.3) {
                selectedHooks.push('duplication-detector');
                optimizations.push({
                    type: 'duplication',
                    hooks: ['duplication-detector'],
                    reason: `${Math.round(aiAnalysis.codebaseHealth.metrics.duplicationScore * 100)}% code duplication`,
                    impact: 'medium'
                });
            }
        }

        // Workflow optimizations
        if (options.includeWorkflow) {
            const commitFreq = aiAnalysis.workflowPatterns.commitFrequency?.frequency || 1;
            
            if (commitFreq < 0.5) {
                selectedHooks.push('commit-reminder', 'commit-template');
                optimizations.push({
                    type: 'workflow',
                    hooks: ['commit-reminder', 'commit-template'],
                    reason: 'Infrequent commit pattern detected',
                    impact: 'low'
                });
            }

            // Testing workflow
            const testCoverage = aiAnalysis.workflowPatterns.testingHabits?.coverage || 0;
            if (testCoverage < 0.7) {
                selectedHooks.push('test-runner', 'coverage-reporter');
                optimizations.push({
                    type: 'testing',
                    hooks: ['test-runner', 'coverage-reporter'],
                    reason: `Test coverage is ${Math.round(testCoverage * 100)}%`,
                    impact: 'high'
                });
            }
        }

        // Project-specific optimizations
        selectedHooks.push(...this.getProjectTypeHooks(aiAnalysis.projectType));

        // Aggressive optimization mode
        if (options.aggressiveOptimization) {
            selectedHooks.push(
                'auto-formatter',
                'import-organizer',
                'dead-code-eliminator',
                'performance-monitor'
            );
            optimizations.push({
                type: 'aggressive',
                hooks: ['auto-formatter', 'import-organizer', 'dead-code-eliminator', 'performance-monitor'],
                reason: 'Aggressive optimization mode enabled',
                impact: 'very-high'
            });
        }

        // Remove duplicates and ensure hooks exist
        const uniqueHooks = [...new Set(selectedHooks)].filter(hookId => 
            this.templates.getTemplate(hookId) !== null
        );

        return {
            hooks: uniqueHooks,
            optimizations,
            reasoning,
            confidence: this.calculateSelectionConfidence(aiAnalysis, uniqueHooks)
        };
    }

    /**
     * Get project-type specific hooks
     */
    getProjectTypeHooks(projectType) {
        const typeHooks = {
            'react': ['react-performance-monitor', 'jsx-a11y-checker'],
            'vue': ['vue-linter', 'vue-performance-tracker'],
            'angular': ['angular-cli-optimizer', 'ng-lint'],
            'nextjs': ['nextjs-analyzer', 'ssg-optimizer'],
            'nodejs': ['node-security-scanner', 'npm-audit'],
            'python': ['black-formatter', 'pylint'],
            'rust': ['cargo-fmt', 'clippy'],
            'go': ['go-fmt', 'go-vet'],
            'typescript': ['typescript-check', 'tsc-strict']
        };

        return typeHooks[projectType] || [];
    }

    /**
     * Generate AI-customized configuration
     */
    async generateAICustomizedConfig(smartHooks, aiAnalysis) {
        const config = { hooks: {} };

        // Build configuration based on AI analysis
        for (const hookId of smartHooks.hooks) {
            const template = this.templates.getTemplate(hookId);
            if (!template) continue;

            // Customize hook based on AI analysis
            const customizedHook = this.customizeHookForProject(template, aiAnalysis);
            
            // Organize by trigger type
            const triggerType = customizedHook.trigger || 'on-edit';
            if (!config.hooks[triggerType]) {
                config.hooks[triggerType] = [];
            }

            config.hooks[triggerType].push(customizedHook.config || customizedHook);
        }

        // Add AI-specific configurations
        config.ai = {
            enabled: true,
            analysisInterval: this.getOptimalAnalysisInterval(aiAnalysis),
            adaptiveOptimization: true,
            learningMode: true,
            notifications: {
                healthScore: aiAnalysis.codebaseHealth.score < 70,
                performance: aiAnalysis.performanceBottlenecks.buildTime?.average > 20000,
                security: aiAnalysis.securityRisks.vulnerabilities.length > 0
            }
        };

        return config;
    }

    /**
     * Customize individual hooks based on project analysis
     */
    customizeHookForProject(template, aiAnalysis) {
        const customizations = {
            // Prettier formatting based on project style
            'prettier-format': {
                ...template.config,
                config: {
                    ...template.config.config,
                    printWidth: this.getOptimalLineWidth(aiAnalysis),
                    tabWidth: this.detectTabWidth(aiAnalysis),
                    semi: this.detectSemicolonPreference(aiAnalysis)
                }
            },

            // ESLint based on detected issues
            'eslint-fix': {
                ...template.config,
                severity: aiAnalysis.codebaseHealth.score < 70 ? 'strict' : 'standard'
            },

            // Test runner based on testing habits
            'test-runner': {
                ...template.config,
                coverage: aiAnalysis.workflowPatterns.testingHabits?.coverage < 0.5,
                parallel: aiAnalysis.performanceBottlenecks.buildTime?.average > 30000
            },

            // Security scanner based on risk assessment
            'security-scanner': {
                ...template.config,
                sensitivity: aiAnalysis.securityRisks.vulnerabilities.length > 3 ? 'high' : 'medium'
            },

            // Build optimizer based on performance analysis
            'build-optimizer': {
                ...template.config,
                caching: true,
                incremental: aiAnalysis.performanceBottlenecks.buildTime?.average > 20000,
                parallel: true
            }
        };

        return customizations[template.id] || template;
    }

    /**
     * Calculate optimal analysis interval
     */
    getOptimalAnalysisInterval(aiAnalysis) {
        const commitFreq = aiAnalysis.workflowPatterns.commitFrequency?.frequency || 1;
        
        if (commitFreq > 2) return 'hourly';
        if (commitFreq > 0.5) return 'daily';
        return 'weekly';
    }

    /**
     * Detect optimal line width
     */
    getOptimalLineWidth(aiAnalysis) {
        // Default to 80, increase for larger projects
        const fileCount = aiAnalysis.codebaseHealth.metrics.totalFiles || 0;
        return fileCount > 100 ? 120 : 80;
    }

    /**
     * Detect tab width preference
     */
    detectTabWidth(aiAnalysis) {
        // Would analyze existing code style
        return 2; // Default to 2 spaces
    }

    /**
     * Detect semicolon preference
     */
    detectSemicolonPreference(aiAnalysis) {
        // Would analyze existing code style
        return true; // Default to semicolons
    }

    /**
     * Calculate overall confidence
     */
    calculateOverallConfidence(aiAnalysis) {
        const factors = [
            aiAnalysis.codebaseHealth.score / 100,
            aiAnalysis.aiRecommendations.length > 0 ? 0.8 : 0.3,
            aiAnalysis.projectType !== 'general' ? 0.9 : 0.5
        ];

        return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
    }

    /**
     * Calculate estimated benefits
     */
    calculateEstimatedBenefits(smartHooks) {
        const benefits = {
            timeSavings: 0,
            qualityImprovement: 0,
            errorReduction: 0,
            performanceGain: 0
        };

        for (const opt of smartHooks.optimizations) {
            switch (opt.impact) {
                case 'very-high':
                    benefits.timeSavings += 60; // minutes per week
                    benefits.qualityImprovement += 30;
                    break;
                case 'high':
                    benefits.timeSavings += 30;
                    benefits.qualityImprovement += 20;
                    break;
                case 'medium':
                    benefits.timeSavings += 15;
                    benefits.qualityImprovement += 10;
                    break;
                case 'low':
                    benefits.timeSavings += 5;
                    benefits.qualityImprovement += 5;
                    break;
            }
        }

        return benefits;
    }

    /**
     * Calculate selection confidence
     */
    calculateSelectionConfidence(aiAnalysis, selectedHooks) {
        const baseConfidence = this.calculateOverallConfidence(aiAnalysis);
        const hookRelevance = selectedHooks.length > 0 ? 0.8 : 0.2;
        
        return (baseConfidence + hookRelevance) / 2;
    }

    /**
     * Generate implementation plan
     */
    generateImplementationPlan(smartHooks, aiAnalysis) {
        const plan = {
            phases: [],
            estimatedTime: 0,
            prerequisites: ['Claude Code CLI installed', 'Project initialized'],
            postImplementation: []
        };

        // Phase 1: Critical hooks (security, quality)
        const criticalHooks = smartHooks.optimizations
            .filter(opt => ['security', 'quality'].includes(opt.type))
            .flatMap(opt => opt.hooks);

        if (criticalHooks.length > 0) {
            plan.phases.push({
                name: 'Critical Setup',
                order: 1,
                hooks: criticalHooks,
                description: 'Security and code quality essentials',
                estimatedTime: '5-10 minutes',
                priority: 'high'
            });
            plan.estimatedTime += 10;
        }

        // Phase 2: Performance optimizations
        const performanceHooks = smartHooks.optimizations
            .filter(opt => ['performance', 'bundle'].includes(opt.type))
            .flatMap(opt => opt.hooks);

        if (performanceHooks.length > 0) {
            plan.phases.push({
                name: 'Performance Optimization',
                order: 2,
                hooks: performanceHooks,
                description: 'Build and runtime performance improvements',
                estimatedTime: '10-15 minutes',
                priority: 'medium'
            });
            plan.estimatedTime += 15;
        }

        // Phase 3: Workflow enhancements
        const workflowHooks = smartHooks.optimizations
            .filter(opt => ['workflow', 'testing'].includes(opt.type))
            .flatMap(opt => opt.hooks);

        if (workflowHooks.length > 0) {
            plan.phases.push({
                name: 'Workflow Enhancement',
                order: 3,
                hooks: workflowHooks,
                description: 'Development workflow and collaboration tools',
                estimatedTime: '5-10 minutes',
                priority: 'low'
            });
            plan.estimatedTime += 10;
        }

        // Post-implementation tasks
        plan.postImplementation = [
            'Monitor hook execution for 24-48 hours',
            'Review AI analysis recommendations',
            'Adjust hook configurations based on team feedback',
            'Schedule periodic re-analysis (recommended: weekly)'
        ];

        return plan;
    }

    /**
     * Fallback configuration when AI analysis fails
     */
    getFallbackConfiguration(options) {
        const fallbackHooks = ['prettier-format', 'command-logger', 'eslint-fix'];
        
        return {
            success: true,
            config: {
                hooks: {
                    'on-edit': fallbackHooks.map(hookId => this.templates.getTemplate(hookId)?.config)
                        .filter(Boolean),
                },
                aiGenerated: false,
                fallback: true
            },
            selectedHooks: fallbackHooks,
            optimizations: [],
            implementation: {
                phases: [{
                    name: 'Basic Setup',
                    hooks: fallbackHooks,
                    estimatedTime: '5 minutes'
                }],
                estimatedTime: 5
            }
        };
    }

    /**
     * Update existing configuration with AI recommendations
     */
    async updateConfigurationWithAI(existingConfig, options = {}) {
        try {
            const aiAnalysis = await this.analyzer.analyzeProject();
            const improvements = this.suggestConfigImprovements(existingConfig, aiAnalysis);
            
            return {
                success: true,
                currentConfig: existingConfig,
                suggestedImprovements: improvements,
                analysis: aiAnalysis,
                implementationPlan: this.generateUpdatePlan(improvements)
            };
        } catch (error) {
            console.error('Configuration update failed:', error);
            return {
                success: false,
                error: 'Failed to analyze configuration for improvements',
                currentConfig: existingConfig
            };
        }
    }

    /**
     * Suggest improvements to existing configuration
     */
    suggestConfigImprovements(config, aiAnalysis) {
        const improvements = [];

        // Check if critical hooks are missing
        const existingHooks = this.extractHookIdsFromConfig(config);
        const recommendedHooks = this.selectOptimalHooks(aiAnalysis, {
            includePerformance: true,
            includeSecurity: true,
            includeQuality: true,
            includeWorkflow: true
        }).hooks;

        const missingHooks = recommendedHooks.filter(hook => !existingHooks.includes(hook));
        
        if (missingHooks.length > 0) {
            improvements.push({
                type: 'missing_hooks',
                severity: 'medium',
                message: `${missingHooks.length} recommended hooks are missing`,
                suggestion: `Consider adding: ${missingHooks.slice(0, 3).join(', ')}`,
                hooks: missingHooks
            });
        }

        // Check for outdated configurations
        if (!config.ai?.enabled) {
            improvements.push({
                type: 'ai_enhancement',
                severity: 'low',
                message: 'AI-powered optimizations not enabled',
                suggestion: 'Enable AI analysis for automatic optimizations',
                enhancement: 'Add AI configuration section'
            });
        }

        return improvements;
    }

    /**
     * Extract hook IDs from configuration
     */
    extractHookIdsFromConfig(config) {
        const hookIds = [];
        
        if (config.hooks) {
            for (const triggerHooks of Object.values(config.hooks)) {
                if (Array.isArray(triggerHooks)) {
                    hookIds.push(...triggerHooks.map(hook => hook.id || hook.name).filter(Boolean));
                }
            }
        }
        
        return hookIds;
    }

    /**
     * Generate update plan for configuration improvements
     */
    generateUpdatePlan(improvements) {
        return {
            steps: improvements.map((improvement, index) => ({
                step: index + 1,
                type: improvement.type,
                action: improvement.suggestion,
                priority: improvement.severity,
                estimatedTime: this.getImprovementTime(improvement.type)
            })),
            totalTime: improvements.length * 3, // 3 minutes average per improvement
            rollbackPlan: 'Backup current configuration before applying changes'
        };
    }

    /**
     * Get estimated time for improvement type
     */
    getImprovementTime(type) {
        const times = {
            'missing_hooks': '5 minutes',
            'ai_enhancement': '2 minutes',
            'outdated_config': '3 minutes',
            'performance_tuning': '10 minutes'
        };
        
        return times[type] || '3 minutes';
    }
}

module.exports = SmartHookGenerator;