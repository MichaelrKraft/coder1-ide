/**
 * HybridHookTemplates - Pre-configured hybrid hook combinations
 * 
 * Provides ready-to-use hybrid hook configurations that combine
 * lightweight bash triggers with intelligent AI delegation
 */

class HybridHookTemplates {
    constructor() {
        this.templates = this.initializeTemplates();
        this.packages = this.initializePackages();
    }

    /**
     * Initialize hybrid hook templates
     */
    initializeTemplates() {
        return {
            // Smart Commit Hook
            'hybrid-smart-commit': {
                id: 'hybrid-smart-commit',
                name: 'Intelligent Commit Messages',
                description: 'Generates context-aware commit messages with AI assistance for complex changes',
                category: 'git',
                type: 'hybrid',
                icon: '🎯',
                trigger: 'smart-commit.sh',
                delegates: ['@commit-specialist'],
                thresholds: {
                    filesChanged: 5,
                    linesChanged: 100,
                    complexity: 0.7
                },
                performance: {
                    bashTime: '~50ms',
                    aiTime: '~2s when delegated',
                    delegationRate: '~30%'
                },
                benefits: [
                    'Consistent commit message format',
                    'Automatic breaking change detection',
                    'Semantic versioning compliance',
                    'Context-aware descriptions'
                ],
                config: {
                    hooks: {
                        PreToolUse: [{
                            matcher: 'Bash',
                            condition: 'git commit',
                            command: '~/.claude/hooks/triggers/smart-commit.sh'
                        }]
                    }
                }
            },

            // Security Pre-Write Hook
            'hybrid-security-check': {
                id: 'hybrid-security-check',
                name: 'Security Guardian',
                description: 'Scans for security vulnerabilities before writing sensitive files',
                category: 'security',
                type: 'hybrid',
                icon: '🔒',
                trigger: 'pre-write-security.sh',
                delegates: ['@security-auditor'],
                thresholds: {
                    suspiciousPatterns: 1,
                    sensitiveFile: true
                },
                performance: {
                    bashTime: '~30ms',
                    aiTime: '~3s when delegated',
                    delegationRate: '~15%'
                },
                benefits: [
                    'Prevents credential leaks',
                    'Detects security anti-patterns',
                    'OWASP compliance checks',
                    'Real-time vulnerability scanning'
                ],
                config: {
                    hooks: {
                        PreToolUse: [{
                            matcher: 'Write|Edit|MultiEdit',
                            command: '~/.claude/hooks/triggers/pre-write-security.sh'
                        }]
                    }
                }
            },

            // Smart Test Runner
            'hybrid-test-runner': {
                id: 'hybrid-test-runner',
                name: 'Intelligent Test Selection',
                description: 'Automatically runs relevant tests based on code changes',
                category: 'testing',
                type: 'hybrid',
                icon: '🧪',
                trigger: 'smart-test-runner.sh',
                delegates: ['@test-engineer'],
                thresholds: {
                    filesChanged: 5,
                    configChanged: true
                },
                performance: {
                    bashTime: '~40ms',
                    aiTime: '~2.5s when delegated',
                    delegationRate: '~25%'
                },
                benefits: [
                    'Reduces test execution time',
                    'Focuses on affected tests',
                    'Smart test prioritization',
                    'Automatic regression detection'
                ],
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Edit|MultiEdit',
                            command: '~/.claude/hooks/triggers/smart-test-runner.sh'
                        }]
                    }
                }
            },

            // Performance Monitor
            'hybrid-performance-check': {
                id: 'hybrid-performance-check',
                name: 'Performance Watchdog',
                description: 'Monitors and analyzes performance implications of code changes',
                category: 'optimization',
                type: 'hybrid',
                icon: '⚡',
                trigger: 'performance-check.sh',
                delegates: ['@performance-optimizer'],
                thresholds: {
                    fileSize: 1048576,  // 1MB
                    lineCount: 500,
                    issuesFound: 3
                },
                performance: {
                    bashTime: '~60ms',
                    aiTime: '~3s when delegated',
                    delegationRate: '~20%'
                },
                benefits: [
                    'Early performance issue detection',
                    'Bundle size monitoring',
                    'Anti-pattern detection',
                    'Optimization recommendations'
                ],
                config: {
                    hooks: {
                        PostToolUse: [{
                            matcher: 'Write|Edit',
                            filePattern: '\\.(js|jsx|ts|tsx)$',
                            command: '~/.claude/hooks/triggers/performance-check.sh'
                        }]
                    }
                }
            },

            // Error Debugger
            'hybrid-error-debug': {
                id: 'hybrid-error-debug',
                name: 'AI Debug Assistant',
                description: 'Provides intelligent debugging assistance for errors',
                category: 'debugging',
                type: 'hybrid',
                icon: '🐛',
                trigger: 'on-error-debug.sh',
                delegates: ['@debugger'],
                thresholds: {
                    errorSeverity: 'high',
                    errorFrequency: 3
                },
                performance: {
                    bashTime: '~35ms',
                    aiTime: '~4s when delegated',
                    delegationRate: '~40%'
                },
                benefits: [
                    'Faster error resolution',
                    'Root cause analysis',
                    'Solution suggestions',
                    'Similar error detection'
                ],
                config: {
                    hooks: {
                        OnError: [{
                            command: '~/.claude/hooks/triggers/on-error-debug.sh'
                        }]
                    }
                }
            },

            // Code Review Assistant
            'hybrid-code-review': {
                id: 'hybrid-code-review',
                name: 'Automated Code Review',
                description: 'Reviews code changes for quality and best practices',
                category: 'quality',
                type: 'hybrid',
                icon: '👁️',
                trigger: 'code-review.sh',
                delegates: ['@code-reviewer'],
                thresholds: {
                    filesChanged: 3,
                    linesChanged: 50
                },
                performance: {
                    bashTime: '~45ms',
                    aiTime: '~3.5s when delegated',
                    delegationRate: '~35%'
                },
                benefits: [
                    'Consistent code quality',
                    'Best practice enforcement',
                    'SOLID principle checks',
                    'Refactoring suggestions'
                ]
            },

            // Documentation Generator
            'hybrid-doc-generator': {
                id: 'hybrid-doc-generator',
                name: 'Smart Documentation',
                description: 'Generates and updates documentation based on code changes',
                category: 'documentation',
                type: 'hybrid',
                icon: '📚',
                trigger: 'doc-generator.sh',
                delegates: ['@documentation-writer'],
                thresholds: {
                    publicAPIChanged: true,
                    newFunctions: 3
                },
                performance: {
                    bashTime: '~40ms',
                    aiTime: '~3s when delegated',
                    delegationRate: '~25%'
                },
                benefits: [
                    'Always up-to-date docs',
                    'JSDoc generation',
                    'README updates',
                    'API documentation'
                ]
            },

            // Database Migration Helper
            'hybrid-db-migration': {
                id: 'hybrid-db-migration',
                name: 'Database Migration Assistant',
                description: 'Helps create and validate database migrations',
                category: 'database',
                type: 'hybrid',
                icon: '🗄️',
                trigger: 'db-migration.sh',
                delegates: ['@database-specialist'],
                thresholds: {
                    schemaChanged: true,
                    tablesAffected: 2
                },
                performance: {
                    bashTime: '~55ms',
                    aiTime: '~4s when delegated',
                    delegationRate: '~30%'
                },
                benefits: [
                    'Safe migration generation',
                    'Rollback strategies',
                    'Performance impact analysis',
                    'Data integrity checks'
                ]
            }
        };
    }

    /**
     * Initialize hook packages (combinations)
     */
    initializePackages() {
        return {
            'hybrid-essentials': {
                id: 'hybrid-essentials',
                name: 'Hybrid Essentials Pack',
                description: 'Core hybrid hooks for everyday development',
                icon: '🎯',
                hooks: [
                    'hybrid-smart-commit',
                    'hybrid-security-check',
                    'hybrid-error-debug'
                ],
                estimatedPerformance: {
                    overhead: '~150ms average',
                    aiDelegationRate: '~25%'
                }
            },

            'hybrid-quality': {
                id: 'hybrid-quality',
                name: 'Quality Assurance Pack',
                description: 'Comprehensive quality and testing hooks',
                icon: '✨',
                hooks: [
                    'hybrid-test-runner',
                    'hybrid-code-review',
                    'hybrid-performance-check',
                    'hybrid-doc-generator'
                ],
                estimatedPerformance: {
                    overhead: '~180ms average',
                    aiDelegationRate: '~30%'
                }
            },

            'hybrid-full-stack': {
                id: 'hybrid-full-stack',
                name: 'Full Stack Developer Pack',
                description: 'Complete hybrid hook suite for full-stack development',
                icon: '🚀',
                hooks: [
                    'hybrid-smart-commit',
                    'hybrid-security-check',
                    'hybrid-test-runner',
                    'hybrid-performance-check',
                    'hybrid-error-debug',
                    'hybrid-code-review',
                    'hybrid-db-migration'
                ],
                estimatedPerformance: {
                    overhead: '~250ms average',
                    aiDelegationRate: '~28%'
                }
            },

            'hybrid-minimal': {
                id: 'hybrid-minimal',
                name: 'Minimal Performance Pack',
                description: 'Lightweight hooks with minimal overhead',
                icon: '⚡',
                hooks: [
                    'hybrid-smart-commit',
                    'hybrid-error-debug'
                ],
                estimatedPerformance: {
                    overhead: '~85ms average',
                    aiDelegationRate: '~35%'
                }
            }
        };
    }

    /**
     * Get all templates
     */
    getAllTemplates() {
        return this.templates;
    }

    /**
     * Get template by ID
     */
    getTemplate(id) {
        return this.templates[id] || null;
    }

    /**
     * Get templates by category
     */
    getTemplatesByCategory(category) {
        return Object.values(this.templates).filter(t => t.category === category);
    }

    /**
     * Get all packages
     */
    getAllPackages() {
        return this.packages;
    }

    /**
     * Get package by ID
     */
    getPackage(id) {
        return this.packages[id] || null;
    }

    /**
     * Get performance profile for a template
     */
    getPerformanceProfile(templateId) {
        const template = this.templates[templateId];
        if (!template) return null;

        return {
            id: templateId,
            name: template.name,
            performance: template.performance,
            thresholds: template.thresholds,
            estimatedImpact: this.calculateImpact(template)
        };
    }

    /**
     * Calculate performance impact
     */
    calculateImpact(template) {
        const bashTime = parseInt(template.performance.bashTime) || 50;
        const aiTime = parseInt(template.performance.aiTime) || 2000;
        const delegationRate = parseFloat(template.performance.delegationRate) / 100 || 0.25;

        const averageTime = bashTime + (aiTime * delegationRate);

        return {
            averageExecutionTime: `~${Math.round(averageTime)}ms`,
            worstCase: `~${aiTime}ms`,
            bestCase: `~${bashTime}ms`,
            impact: averageTime < 100 ? 'minimal' : averageTime < 500 ? 'low' : 'moderate'
        };
    }

    /**
     * Get recommended templates based on project type
     */
    getRecommendedTemplates(projectType) {
        const recommendations = {
            'react': ['hybrid-smart-commit', 'hybrid-performance-check', 'hybrid-code-review'],
            'node': ['hybrid-smart-commit', 'hybrid-security-check', 'hybrid-test-runner'],
            'fullstack': ['hybrid-full-stack'],
            'api': ['hybrid-security-check', 'hybrid-test-runner', 'hybrid-db-migration'],
            'frontend': ['hybrid-performance-check', 'hybrid-code-review', 'hybrid-doc-generator'],
            'backend': ['hybrid-security-check', 'hybrid-db-migration', 'hybrid-test-runner']
        };

        return recommendations[projectType] || ['hybrid-essentials'];
    }

    /**
     * Generate configuration for selected templates
     */
    generateConfiguration(templateIds) {
        const config = {
            hooks: {
                PreToolUse: [],
                PostToolUse: [],
                OnError: []
            },
            metadata: {
                type: 'hybrid',
                templates: templateIds,
                generatedAt: new Date().toISOString()
            }
        };

        for (const templateId of templateIds) {
            const template = this.templates[templateId];
            if (!template || !template.config) continue;

            // Merge hook configurations
            for (const [eventType, hooks] of Object.entries(template.config.hooks)) {
                if (config.hooks[eventType]) {
                    config.hooks[eventType].push(...hooks);
                }
            }
        }

        return config;
    }
}

module.exports = HybridHookTemplates;