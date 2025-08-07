/**
 * Proactive Intelligence System
 * 
 * Automatically detects opportunities for improvement and suggests actions.
 * The system watches project activity and proactively recommends helpful tasks.
 * 
 * Core Philosophy: Simplicity = Magic
 * - Passive observation, proactive suggestions
 * - Context-aware recommendations
 * - Non-intrusive but valuable insights
 * - Learning from project patterns
 */

const { EventEmitter } = require('events');
const path = require('path');

class ProactiveIntelligence extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.memorySystem = options.memorySystem;
        this.contextBuilder = options.contextBuilder;
        this.conversationManager = options.conversationManager;
        
        // Configuration
        this.config = {
            suggestionInterval: options.suggestionInterval || 300000, // 5 minutes
            maxSuggestions: options.maxSuggestions || 3,
            confidenceThreshold: options.confidenceThreshold || 0.6,
            learningEnabled: options.learningEnabled !== false
        };
        
        // State
        this.activeSuggestions = new Map();
        this.suggestionHistory = [];
        this.lastAnalysis = Date.now();
        this.analysisPatterns = new Map();
        
        // Suggestion categories and their patterns
        this.suggestionTypes = {
            // Code quality improvements
            codeQuality: {
                patterns: [
                    {
                        condition: (context) => this.hasRecentErrors(context),
                        suggestion: (context) => ({
                            type: 'error_analysis',
                            title: 'Analyze Recent Errors',
                            description: 'I noticed some errors in recent development. Would you like me to analyze and suggest fixes?',
                            action: 'run parallel agents to analyze and fix recent errors',
                            priority: 'high',
                            confidence: 0.8
                        })
                    },
                    {
                        condition: (context) => this.hasLargeFiles(context),
                        suggestion: (context) => ({
                            type: 'refactoring',
                            title: 'Code Refactoring Opportunity',
                            description: 'Some files are getting quite large. Consider breaking them into smaller, more maintainable components.',
                            action: 'analyze large files and suggest refactoring opportunities',
                            priority: 'medium',
                            confidence: 0.7
                        })
                    }
                ],
                cooldown: 1800000 // 30 minutes
            },
            
            // Testing suggestions
            testing: {
                patterns: [
                    {
                        condition: (context) => this.needsTestCoverage(context),
                        suggestion: (context) => ({
                            type: 'test_coverage',
                            title: 'Improve Test Coverage',
                            description: 'New code has been added without corresponding tests. Shall I create comprehensive test coverage?',
                            action: 'create tests for recently modified files',
                            priority: 'medium',
                            confidence: 0.75
                        })
                    },
                    {
                        condition: (context) => this.hasFailingTests(context),
                        suggestion: (context) => ({
                            type: 'test_fixes',
                            title: 'Fix Failing Tests',
                            description: 'Some tests appear to be failing. Let me analyze and fix them for you.',
                            action: 'analyze and fix failing tests',
                            priority: 'high',
                            confidence: 0.9
                        })
                    }
                ],
                cooldown: 900000 // 15 minutes
            },
            
            // Performance optimizations
            performance: {
                patterns: [
                    {
                        condition: (context) => this.hasPerformanceOpportunities(context),
                        suggestion: (context) => ({
                            type: 'performance',
                            title: 'Performance Optimization',
                            description: 'I see opportunities to optimize performance. Would you like me to analyze and improve slow areas?',
                            action: 'run performance analysis and optimization',
                            priority: 'medium',
                            confidence: 0.65
                        })
                    },
                    {
                        condition: (context) => this.hasLargeBundles(context),
                        suggestion: (context) => ({
                            type: 'bundle_optimization',
                            title: 'Bundle Size Optimization',
                            description: 'The application bundle is quite large. I can help optimize it for better loading times.',
                            action: 'analyze and optimize bundle size',
                            priority: 'low',
                            confidence: 0.6
                        })
                    }
                ],
                cooldown: 3600000 // 1 hour
            },
            
            // Security improvements
            security: {
                patterns: [
                    {
                        condition: (context) => this.hasSecurityConcerns(context),
                        suggestion: (context) => ({
                            type: 'security_audit',
                            title: 'Security Audit Recommended',
                            description: 'I noticed potential security concerns in recent changes. Shall I perform a security audit?',
                            action: 'perform comprehensive security audit',
                            priority: 'high',
                            confidence: 0.8
                        })
                    },
                    {
                        condition: (context) => this.needsDependencyUpdate(context),
                        suggestion: (context) => ({
                            type: 'dependency_security',
                            title: 'Update Vulnerable Dependencies',
                            description: 'Some dependencies may have security vulnerabilities. Let me check and update them safely.',
                            action: 'audit and update dependencies for security issues',
                            priority: 'medium',
                            confidence: 0.7
                        })
                    }
                ],
                cooldown: 2700000 // 45 minutes
            },
            
            // Documentation improvements
            documentation: {
                patterns: [
                    {
                        condition: (context) => this.needsDocumentation(context),
                        suggestion: (context) => ({
                            type: 'documentation',
                            title: 'Documentation Update Needed',
                            description: 'New features have been added that would benefit from documentation. Shall I create or update docs?',
                            action: 'create documentation for new features',
                            priority: 'low',
                            confidence: 0.6
                        })
                    },
                    {
                        condition: (context) => this.hasComplexCode(context),
                        suggestion: (context) => ({
                            type: 'code_comments',
                            title: 'Add Code Comments',
                            description: 'Some complex code sections could benefit from better comments and documentation.',
                            action: 'add comprehensive comments to complex code sections',
                            priority: 'low',
                            confidence: 0.5
                        })
                    }
                ],
                cooldown: 1800000 // 30 minutes
            },
            
            // Architecture suggestions
            architecture: {
                patterns: [
                    {
                        condition: (context) => this.hasArchitecturalDebt(context),
                        suggestion: (context) => ({
                            type: 'architecture_review',
                            title: 'Architecture Review Suggested',
                            description: 'The codebase has grown significantly. A architecture review could identify improvement opportunities.',
                            action: 'perform comprehensive architecture review and suggest improvements',
                            priority: 'medium',
                            confidence: 0.65
                        })
                    },
                    {
                        condition: (context) => this.hasModularizationOpportunity(context),
                        suggestion: (context) => ({
                            type: 'modularization',
                            title: 'Modularization Opportunity',
                            description: 'Some code could be better organized into reusable modules. Shall I suggest improvements?',
                            action: 'analyze code structure and suggest modularization improvements',
                            priority: 'low',
                            confidence: 0.6
                        })
                    }
                ],
                cooldown: 7200000 // 2 hours
            }
        };
        
        // Start the proactive analysis loop
        this.startProactiveAnalysis();
        
        console.log('🔮 Proactive Intelligence: Initialized and watching for opportunities');
    }

    /**
     * Start the proactive analysis loop
     */
    startProactiveAnalysis() {
        // Initial analysis
        setTimeout(() => this.performAnalysis(), 60000); // Wait 1 minute after startup
        
        // Regular analysis interval
        this.analysisInterval = setInterval(() => {
            this.performAnalysis();
        }, this.config.suggestionInterval);
        
        // Listen for context changes to trigger immediate analysis
        if (this.contextBuilder) {
            this.contextBuilder.on('contextUpdated', (data) => {
                this.handleContextChange(data);
            });
        }
    }

    /**
     * Perform proactive analysis and generate suggestions
     */
    async performAnalysis() {
        try {
            // Get current project context
            const context = await this.gatherAnalysisContext();
            
            // Generate suggestions based on context
            const suggestions = await this.generateSuggestions(context);
            
            // Filter and prioritize suggestions
            const actionableSuggestions = this.filterSuggestions(suggestions);
            
            // Store suggestions and emit events
            this.storeSuggestions(actionableSuggestions);
            
            // Emit suggestions if any are found
            if (actionableSuggestions.length > 0) {
                this.emit('suggestionsGenerated', {
                    suggestions: actionableSuggestions,
                    context,
                    timestamp: Date.now()
                });
            }
            
            this.lastAnalysis = Date.now();
            console.log(`🔮 Proactive Intelligence: Generated ${actionableSuggestions.length} suggestions`);
            
        } catch (error) {
            console.error('Proactive Intelligence: Analysis failed:', error);
        }
    }

    /**
     * Gather context for analysis
     */
    async gatherAnalysisContext() {
        const context = {
            timestamp: Date.now(),
            projectContext: this.contextBuilder ? this.contextBuilder.getProjectContext() : {},
            recentActivity: await this.getRecentActivity(),
            memoryInsights: await this.getMemoryInsights(),
            systemMetrics: await this.getSystemMetrics()
        };
        
        return context;
    }

    /**
     * Get recent activity from memory system
     */
    async getRecentActivity() {
        if (!this.memorySystem) return {};
        
        try {
            const recentOutcomes = this.memorySystem.getSimilarTaskOutcomes('', null, 10);
            const recentInsights = this.memorySystem.getAgentInsights('all', null, 20);
            
            return {
                taskOutcomes: recentOutcomes,
                agentInsights: recentInsights,
                lastActivity: this.memorySystem.getLastActivity()
            };
        } catch (error) {
            console.warn('Proactive Intelligence: Failed to get recent activity:', error);
            return {};
        }
    }

    /**
     * Get memory insights for analysis
     */
    async getMemoryInsights() {
        if (!this.memorySystem) return {};
        
        try {
            const stats = this.memorySystem.getStats();
            const patterns = this.memorySystem.getCodePatterns(null, 10);
            
            return {
                stats,
                patterns,
                knowledge: this.memorySystem.getProjectKnowledge('analysis')
            };
        } catch (error) {
            console.warn('Proactive Intelligence: Failed to get memory insights:', error);
            return {};
        }
    }

    /**
     * Get system metrics
     */
    async getSystemMetrics() {
        return {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            analysisCount: this.suggestionHistory.length,
            lastAnalysisAge: Date.now() - this.lastAnalysis
        };
    }

    /**
     * Generate suggestions based on context
     */
    async generateSuggestions(context) {
        const suggestions = [];
        
        for (const [categoryName, category] of Object.entries(this.suggestionTypes)) {
            // Check cooldown
            if (this.isCategoryOnCooldown(categoryName, category.cooldown)) {
                continue;
            }
            
            // Check each pattern in the category
            for (const pattern of category.patterns) {
                try {
                    if (pattern.condition(context)) {
                        const suggestion = pattern.suggestion(context);
                        suggestion.category = categoryName;
                        suggestion.timestamp = Date.now();
                        suggestion.contextHash = this.generateContextHash(context);
                        
                        suggestions.push(suggestion);
                    }
                } catch (error) {
                    console.warn(`Proactive Intelligence: Pattern check failed for ${categoryName}:`, error);
                }
            }
        }
        
        return suggestions;
    }

    /**
     * Check if a category is on cooldown
     */
    isCategoryOnCooldown(categoryName, cooldownTime) {
        const lastSuggestion = this.suggestionHistory
            .filter(s => s.category === categoryName)
            .sort((a, b) => b.timestamp - a.timestamp)[0];
        
        if (!lastSuggestion) return false;
        
        return (Date.now() - lastSuggestion.timestamp) < cooldownTime;
    }

    /**
     * Filter and prioritize suggestions
     */
    filterSuggestions(suggestions) {
        return suggestions
            .filter(s => s.confidence >= this.config.confidenceThreshold)
            .filter(s => !this.isDuplicate(s))
            .sort((a, b) => {
                // Sort by priority first, then confidence
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                
                if (priorityDiff !== 0) return priorityDiff;
                return b.confidence - a.confidence;
            })
            .slice(0, this.config.maxSuggestions);
    }

    /**
     * Check if suggestion is a duplicate
     */
    isDuplicate(suggestion) {
        return this.suggestionHistory.some(existing => 
            existing.type === suggestion.type &&
            existing.contextHash === suggestion.contextHash &&
            (Date.now() - existing.timestamp) < 3600000 // 1 hour
        );
    }

    /**
     * Store suggestions
     */
    storeSuggestions(suggestions) {
        suggestions.forEach(suggestion => {
            this.activeSuggestions.set(suggestion.type, suggestion);
            this.suggestionHistory.push(suggestion);
        });
        
        // Trim history to last 100 suggestions
        if (this.suggestionHistory.length > 100) {
            this.suggestionHistory = this.suggestionHistory.slice(-100);
        }
    }

    /**
     * Handle context changes for immediate analysis
     */
    handleContextChange(data) {
        // Immediate analysis for critical changes
        if (data.eventType === 'change' && data.path) {
            const criticalPaths = ['package.json', 'security', 'auth', 'test'];
            
            if (criticalPaths.some(critical => data.path.includes(critical))) {
                setTimeout(() => this.performAnalysis(), 5000); // Analyze in 5 seconds
            }
        }
    }

    /**
     * Generate context hash for duplicate detection
     */
    generateContextHash(context) {
        const hashData = {
            fileCount: context.projectContext.summary?.totalFiles || 0,
            recentChanges: context.projectContext.recentChanges?.length || 0,
            taskOutcomes: context.recentActivity.taskOutcomes?.length || 0
        };
        
        return JSON.stringify(hashData);
    }

    // ===== CONDITION CHECKER METHODS =====

    /**
     * Check if there are recent errors
     */
    hasRecentErrors(context) {
        const recentOutcomes = context.recentActivity.taskOutcomes || [];
        return recentOutcomes.some(outcome => 
            outcome.successRating < 0.5 || 
            (outcome.outcome && typeof outcome.outcome === 'string' && 
             outcome.outcome.toLowerCase().includes('error'))
        );
    }

    /**
     * Check for large files that need refactoring
     */
    hasLargeFiles(context) {
        const keyFiles = context.projectContext.keyFiles || [];
        return keyFiles.some(file => 
            file.size > 1000 || // More than 1000 lines (estimated)
            file.complexity === 'high'
        );
    }

    /**
     * Check if test coverage is needed
     */
    needsTestCoverage(context) {
        const recentChanges = context.projectContext.recentChanges || [];
        const hasNewCode = recentChanges.some(change => 
            change.action === 'added' && !change.path.includes('test')
        );
        
        const hasTestFiles = (context.projectContext.keyFiles || [])
            .some(file => file.path.includes('test') || file.path.includes('spec'));
        
        return hasNewCode && !hasTestFiles;
    }

    /**
     * Check for failing tests
     */
    hasFailingTests(context) {
        const recentOutcomes = context.recentActivity.taskOutcomes || [];
        return recentOutcomes.some(outcome =>
            outcome.agentType === 'testing' && outcome.successRating < 0.7
        );
    }

    /**
     * Check for performance optimization opportunities
     */
    hasPerformanceOpportunities(context) {
        const insights = context.recentActivity.agentInsights || [];
        return insights.some(insight =>
            insight.content.toLowerCase().includes('slow') ||
            insight.content.toLowerCase().includes('performance')
        );
    }

    /**
     * Check for large bundles
     */
    hasLargeBundles(context) {
        const buildFiles = (context.projectContext.keyFiles || [])
            .filter(file => file.path.includes('build') || file.path.includes('dist'));
        
        return buildFiles.some(file => file.size > 5000); // Large build files
    }

    /**
     * Check for security concerns
     */
    hasSecurityConcerns(context) {
        const recentChanges = context.projectContext.recentChanges || [];
        return recentChanges.some(change =>
            change.path.includes('auth') ||
            change.path.includes('security') ||
            change.path.includes('password') ||
            change.path.includes('token')
        );
    }

    /**
     * Check if dependencies need updates
     */
    needsDependencyUpdate(context) {
        const packageFiles = (context.projectContext.keyFiles || [])
            .filter(file => file.path.includes('package.json'));
        
        // Suggest dependency updates periodically
        return packageFiles.length > 0 && Math.random() < 0.1; // 10% chance
    }

    /**
     * Check if documentation is needed
     */
    needsDocumentation(context) {
        const recentChanges = context.projectContext.recentChanges || [];
        const hasNewFeatures = recentChanges.some(change =>
            change.action === 'added' && !change.path.includes('test')
        );
        
        const hasReadme = (context.projectContext.keyFiles || [])
            .some(file => file.path.toLowerCase().includes('readme'));
        
        return hasNewFeatures && !hasReadme;
    }

    /**
     * Check for complex code that needs comments
     */
    hasComplexCode(context) {
        const keyFiles = context.projectContext.keyFiles || [];
        return keyFiles.some(file => file.complexity === 'high');
    }

    /**
     * Check for architectural debt
     */
    hasArchitecturalDebt(context) {
        const totalFiles = context.projectContext.summary?.totalFiles || 0;
        const complexity = context.projectContext.summary?.complexity || 'low';
        
        return totalFiles > 50 && complexity === 'high';
    }

    /**
     * Check for modularization opportunities
     */
    hasModularizationOpportunity(context) {
        const keyFiles = context.projectContext.keyFiles || [];
        const largeFiles = keyFiles.filter(file => file.size > 500);
        
        return largeFiles.length > 3;
    }

    // ===== PUBLIC API METHODS =====

    /**
     * Get current active suggestions
     */
    getActiveSuggestions() {
        return Array.from(this.activeSuggestions.values());
    }

    /**
     * Dismiss a suggestion
     */
    dismissSuggestion(suggestionType) {
        if (this.activeSuggestions.has(suggestionType)) {
            this.activeSuggestions.delete(suggestionType);
            this.emit('suggestionDismissed', { type: suggestionType });
            return true;
        }
        return false;
    }

    /**
     * Execute a suggestion
     */
    async executeSuggestion(suggestionType) {
        const suggestion = this.activeSuggestions.get(suggestionType);
        if (!suggestion) {
            throw new Error(`Suggestion ${suggestionType} not found`);
        }
        
        // Mark as executed
        suggestion.executed = true;
        suggestion.executedAt = Date.now();
        
        this.emit('suggestionExecuted', { suggestion });
        
        // Remove from active suggestions
        this.activeSuggestions.delete(suggestionType);
        
        return suggestion;
    }

    /**
     * Get suggestion history
     */
    getSuggestionHistory(limit = 20) {
        return this.suggestionHistory
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            activeSuggestions: this.activeSuggestions.size,
            totalSuggestions: this.suggestionHistory.length,
            lastAnalysis: this.lastAnalysis,
            analysisInterval: this.config.suggestionInterval,
            categoryStats: this.getCategoryStats()
        };
    }

    /**
     * Get category statistics
     */
    getCategoryStats() {
        const stats = {};
        
        for (const categoryName of Object.keys(this.suggestionTypes)) {
            const categorySuggestions = this.suggestionHistory
                .filter(s => s.category === categoryName);
            
            stats[categoryName] = {
                total: categorySuggestions.length,
                executed: categorySuggestions.filter(s => s.executed).length,
                avgConfidence: categorySuggestions.length > 0 ?
                    categorySuggestions.reduce((sum, s) => sum + s.confidence, 0) / categorySuggestions.length :
                    0
            };
        }
        
        return stats;
    }

    /**
     * Stop proactive analysis
     */
    stop() {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
        }
        console.log('🔮 Proactive Intelligence: Stopped');
    }
}

module.exports = { ProactiveIntelligence };