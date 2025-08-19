/**
 * Smart Response Engine - Intelligent Decision Making for AI Supervision
 * 
 * This engine analyzes context from:
 * - CLAUDE.md project instructions
 * - PRD files and requirements
 * - Project structure and patterns
 * - User preferences and history
 * - File changes and impact assessment
 * 
 * Uses this context to make intelligent supervision decisions rather than
 * simple pattern matching.
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class SmartResponseEngine extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.projectRoot = options.projectRoot || process.cwd();
        this.logger = options.logger || console;
        this.sessionId = options.sessionId || `smart-${Date.now()}`;
        
        // Context analysis state
        this.projectContext = null;
        this.claudeMdContent = null;
        this.prdContent = null;
        this.userPreferences = {
            mode: 'balanced', // 'strict', 'balanced', 'permissive', 'auto'
            autoApproveThreshold: 0.8,
            requireConfirmation: ['file-deletion', 'structure-changes', 'external-apis'],
            trustPatterns: ['test-creation', 'documentation', 'formatting']
        };
        
        // Decision history for learning
        this.decisionHistory = [];
        this.interventionStats = {
            totalDecisions: 0,
            autoApproved: 0,
            manualReview: 0,
            rejected: 0,
            overrides: 0
        };
        
        // Smart patterns with context awareness
        this.smartPatterns = {
            // High-confidence auto-approve patterns
            safe_operations: [
                {
                    pattern: /create.*test/i,
                    confidence: 0.95,
                    reason: 'Test creation is generally safe and beneficial',
                    response: '2', // Don't ask again for tests
                    conditions: ['has_test_directory', 'follows_naming_convention']
                },
                {
                    pattern: /add.*comment|document/i,
                    confidence: 0.9,
                    reason: 'Documentation improvements are safe',
                    response: '2',
                    conditions: ['not_removing_existing_comments']
                },
                {
                    pattern: /format.*code|prettier/i,
                    confidence: 0.85,
                    reason: 'Code formatting is generally safe',
                    response: '2',
                    conditions: ['has_prettier_config']
                }
            ],
            
            // Contextual approval patterns
            contextual_safe: [
                {
                    pattern: /create.*component/i,
                    confidence: 0.8,
                    reason: 'Component creation based on project patterns',
                    response: '1',
                    conditions: ['matches_component_pattern', 'has_component_directory']
                },
                {
                    pattern: /update.*config/i,
                    confidence: 0.7,
                    reason: 'Configuration updates need context validation',
                    response: '1',
                    conditions: ['config_change_safe', 'follows_project_standards']
                }
            ],
            
            // Requires manual review
            requires_review: [
                {
                    pattern: /delete|remove.*file/i,
                    confidence: 0.3,
                    reason: 'File deletion requires careful review',
                    response: '3',
                    conditions: ['always_review_deletions']
                },
                {
                    pattern: /change.*database|modify.*schema/i,
                    confidence: 0.2,
                    reason: 'Database changes need manual approval',
                    response: '3',
                    conditions: ['database_changes_require_approval']
                },
                {
                    pattern: /external.*api|third.*party/i,
                    confidence: 0.4,
                    reason: 'External integrations need review',
                    response: '1',
                    conditions: ['external_apis_need_review']
                }
            ]
        };
        
        this.logger.log(`🧠 SmartResponseEngine initialized for session ${this.sessionId}`);
        
        // Initialize context analysis
        this.initializeContext();
    }
    
    /**
     * Initialize project context by reading key files
     */
    async initializeContext() {
        try {
            await this.loadClaudeMd();
            await this.loadPrdContent();
            await this.analyzeProjectStructure();
            
            this.emit('context-initialized', {
                sessionId: this.sessionId,
                hasClaudeMd: !!this.claudeMdContent,
                hasPrd: !!this.prdContent,
                projectType: this.projectContext?.type || 'unknown'
            });
            
            this.logger.log('🧠 Smart context analysis complete');
            
        } catch (error) {
            this.logger.error('⚠️ Context initialization failed:', error.message);
        }
    }
    
    /**
     * Load CLAUDE.md file for project-specific instructions
     */
    async loadClaudeMd() {
        const claudeMdPaths = [
            path.join(this.projectRoot, 'CLAUDE.md'),
            path.join(this.projectRoot, '.claude', 'CLAUDE.md'),
            path.join(this.projectRoot, 'docs', 'CLAUDE.md')
        ];
        
        for (const claudePath of claudeMdPaths) {
            try {
                this.claudeMdContent = await fs.readFile(claudePath, 'utf8');
                this.logger.log(`📋 Loaded CLAUDE.md from ${claudePath}`);
                
                // Extract key guidance from CLAUDE.md
                this.extractClaudeGuidance();
                return;
            } catch (error) {
                // File doesn't exist, try next path
            }
        }
        
        this.logger.log('📋 No CLAUDE.md found - using default guidance');
    }
    
    /**
     * Load PRD content for requirements context
     */
    async loadPrdContent() {
        const prdPaths = [
            path.join(this.projectRoot, 'PRD.md'),
            path.join(this.projectRoot, 'requirements.md'),
            path.join(this.projectRoot, 'docs', 'PRD.md'),
            path.join(this.projectRoot, 'docs', 'requirements.md')
        ];
        
        for (const prdPath of prdPaths) {
            try {
                this.prdContent = await fs.readFile(prdPath, 'utf8');
                this.logger.log(`📄 Loaded PRD from ${prdPath}`);
                return;
            } catch (error) {
                // File doesn't exist, try next path
            }
        }
        
        this.logger.log('📄 No PRD found - using project analysis only');
    }
    
    /**
     * Analyze project structure to understand patterns
     */
    async analyzeProjectStructure() {
        try {
            const packageJsonPath = path.join(this.projectRoot, 'package.json');
            let packageJson = null;
            
            try {
                const packageContent = await fs.readFile(packageJsonPath, 'utf8');
                packageJson = JSON.parse(packageContent);
            } catch (error) {
                // No package.json or invalid JSON
            }
            
            this.projectContext = {
                type: this.detectProjectType(packageJson),
                hasTests: await this.hasTestDirectory(),
                hasComponents: await this.hasComponentDirectory(),
                hasConfig: await this.hasConfigFiles(),
                frameworks: this.detectFrameworks(packageJson),
                testFramework: this.detectTestFramework(packageJson),
                buildTools: this.detectBuildTools(packageJson)
            };
            
            this.logger.log('📊 Project analysis:', this.projectContext);
            
        } catch (error) {
            this.logger.error('📊 Project analysis failed:', error.message);
            this.projectContext = { type: 'unknown' };
        }
    }
    
    /**
     * Make intelligent decision about Claude's request
     */
    async makeSmartDecision(questionMatch) {
        this.logger.log(`🧠 Making smart decision for: ${questionMatch.text}`);
        
        // 1. Analyze the request context
        const contextAnalysis = await this.analyzeRequestContext(questionMatch);
        
        // 2. Apply smart patterns with context
        const patternDecision = this.applySmartPatterns(questionMatch, contextAnalysis);
        
        // 3. Apply user preferences and project constraints
        const finalDecision = this.applyConstraints(patternDecision, contextAnalysis);
        
        // 4. Record decision for learning
        this.recordDecision(questionMatch, contextAnalysis, finalDecision);
        
        // 5. Generate response with reasoning
        const smartResponse = {
            option: finalDecision.response,
            confidence: finalDecision.confidence,
            reason: finalDecision.reason,
            context: contextAnalysis,
            shouldExplain: finalDecision.confidence < 0.7,
            metadata: {
                pattern: finalDecision.pattern?.pattern,
                conditions: finalDecision.conditions,
                overrides: finalDecision.overrides
            }
        };
        
        this.logger.log('🧠 Smart decision:', {
            option: smartResponse.option,
            confidence: smartResponse.confidence,
            reason: smartResponse.reason
        });
        
        this.emit('smart-decision', {
            sessionId: this.sessionId,
            decision: smartResponse,
            originalQuestion: questionMatch.text
        });
        
        return smartResponse;
    }
    
    /**
     * Analyze the context of the current request
     */
    async analyzeRequestContext(questionMatch) {
        const context = {
            fileContext: await this.analyzeFileContext(questionMatch.text),
            riskLevel: this.assessRiskLevel(questionMatch.text),
            alignment: this.checkProjectAlignment(questionMatch.text),
            precedent: this.checkDecisionHistory(questionMatch.text),
            urgency: this.assessUrgency(questionMatch.text),
            impact: this.assessImpact(questionMatch.text)
        };
        
        return context;
    }
    
    /**
     * Apply smart patterns with contextual conditions
     */
    applySmartPatterns(questionMatch, context) {
        const allPatterns = [
            ...this.smartPatterns.safe_operations,
            ...this.smartPatterns.contextual_safe,
            ...this.smartPatterns.requires_review
        ];
        
        let bestMatch = null;
        let highestConfidence = 0;
        
        for (const pattern of allPatterns) {
            const match = questionMatch.text.match(pattern.pattern);
            if (match) {
                // Check if contextual conditions are met
                const conditionsMet = this.checkConditions(pattern.conditions, context);
                const adjustedConfidence = conditionsMet ? 
                    pattern.confidence : 
                    pattern.confidence * 0.6; // Reduce confidence if conditions not met
                
                if (adjustedConfidence > highestConfidence) {
                    bestMatch = {
                        ...pattern,
                        confidence: adjustedConfidence,
                        conditionsMet,
                        match
                    };
                    highestConfidence = adjustedConfidence;
                }
            }
        }
        
        return bestMatch || {
            pattern: null,
            confidence: 0.5,
            reason: 'No specific pattern matched - using default logic',
            response: '1', // Default to proceed
            conditions: []
        };
    }
    
    /**
     * Check if pattern conditions are met
     */
    checkConditions(conditions, context) {
        if (!conditions || conditions.length === 0) return true;
        
        const conditionChecks = {
            'has_test_directory': () => this.projectContext?.hasTests,
            'has_component_directory': () => this.projectContext?.hasComponents,
            'has_prettier_config': () => this.projectContext?.hasConfig,
            'follows_naming_convention': () => context.alignment?.naming !== false,
            'not_removing_existing_comments': () => !context.fileContext?.removingComments,
            'matches_component_pattern': () => context.alignment?.componentPattern !== false,
            'config_change_safe': () => context.riskLevel < 0.7,
            'follows_project_standards': () => context.alignment?.standards !== false,
            'always_review_deletions': () => false, // Always require review for deletions
            'database_changes_require_approval': () => false, // Always require approval
            'external_apis_need_review': () => context.riskLevel > 0.5
        };
        
        return conditions.every(condition => {
            const check = conditionChecks[condition];
            return check ? check() : true; // Default to true for unknown conditions
        });
    }
    
    /**
     * Extract guidance from CLAUDE.md content
     */
    extractClaudeGuidance() {
        if (!this.claudeMdContent) return;
        
        // Look for supervision-specific guidance
        const supervisionSection = this.claudeMdContent.match(/## Supervision.*?(?=##|$)/is);
        if (supervisionSection) {
            this.logger.log('📋 Found supervision guidance in CLAUDE.md');
            // Parse supervision preferences
        }
        
        // Look for auto-approval patterns
        const autoApproveSection = this.claudeMdContent.match(/## Auto.?Approve.*?(?=##|$)/is);
        if (autoApproveSection) {
            this.logger.log('📋 Found auto-approval guidance in CLAUDE.md');
        }
        
        // Look for restricted operations
        const restrictedSection = this.claudeMdContent.match(/## Restricted|## Don.?t.*?(?=##|$)/is);
        if (restrictedSection) {
            this.logger.log('📋 Found restriction guidance in CLAUDE.md');
        }
    }
    
    /**
     * Detect project type from package.json
     */
    detectProjectType(packageJson) {
        if (!packageJson) return 'unknown';
        
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        if (deps.react || deps['@types/react']) return 'react';
        if (deps.vue || deps['@vue/cli']) return 'vue';
        if (deps.angular || deps['@angular/core']) return 'angular';
        if (deps.express || deps.fastify) return 'backend-api';
        if (deps.electron) return 'electron';
        if (deps.next) return 'nextjs';
        
        return 'javascript';
    }
    
    /**
     * Check for test directory
     */
    async hasTestDirectory() {
        const testDirs = ['test', 'tests', '__tests__', 'spec'];
        for (const dir of testDirs) {
            try {
                const stat = await fs.stat(path.join(this.projectRoot, dir));
                if (stat.isDirectory()) return true;
            } catch (error) {
                // Directory doesn't exist
            }
        }
        return false;
    }
    
    /**
     * Check for component directory
     */
    async hasComponentDirectory() {
        const componentDirs = ['components', 'src/components', 'app/components'];
        for (const dir of componentDirs) {
            try {
                const stat = await fs.stat(path.join(this.projectRoot, dir));
                if (stat.isDirectory()) return true;
            } catch (error) {
                // Directory doesn't exist
            }
        }
        return false;
    }
    
    /**
     * Check for config files
     */
    async hasConfigFiles() {
        const configFiles = ['.prettierrc', 'prettier.config.js', '.eslintrc', 'eslint.config.js'];
        for (const file of configFiles) {
            try {
                await fs.stat(path.join(this.projectRoot, file));
                return true;
            } catch (error) {
                // File doesn't exist
            }
        }
        return false;
    }
    
    /**
     * Additional utility methods for context analysis
     */
    detectFrameworks(packageJson) {
        if (!packageJson) return [];
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        const frameworks = [];
        
        if (deps.react) frameworks.push('react');
        if (deps.vue) frameworks.push('vue');
        if (deps.express) frameworks.push('express');
        if (deps.next) frameworks.push('nextjs');
        
        return frameworks;
    }
    
    detectTestFramework(packageJson) {
        if (!packageJson) return null;
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        if (deps.jest) return 'jest';
        if (deps.mocha) return 'mocha';
        if (deps.vitest) return 'vitest';
        if (deps.cypress) return 'cypress';
        
        return null;
    }
    
    detectBuildTools(packageJson) {
        if (!packageJson) return [];
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        const tools = [];
        
        if (deps.webpack) tools.push('webpack');
        if (deps.vite) tools.push('vite');
        if (deps.rollup) tools.push('rollup');
        if (deps.parcel) tools.push('parcel');
        
        return tools;
    }
    
    assessRiskLevel(text) {
        let risk = 0.1; // Base risk
        
        if (/delete|remove|drop/i.test(text)) risk += 0.5;
        if (/database|schema|migration/i.test(text)) risk += 0.4;
        if (/config|env|environment/i.test(text)) risk += 0.3;
        if (/external|api|third.?party/i.test(text)) risk += 0.3;
        if (/security|auth|password/i.test(text)) risk += 0.4;
        
        return Math.min(risk, 1.0);
    }
    
    checkProjectAlignment(text) {
        // Simplified alignment check
        return {
            naming: true,
            componentPattern: true,
            standards: true
        };
    }
    
    checkDecisionHistory(text) {
        // Check if we've made similar decisions before
        const similar = this.decisionHistory.filter(decision => 
            decision.text.toLowerCase().includes(text.toLowerCase().split(' ')[0])
        );
        
        return similar.length > 0 ? similar[similar.length - 1] : null;
    }
    
    assessUrgency(text) {
        if (/urgent|critical|asap|immediately/i.test(text)) return 0.9;
        if (/soon|quick|fast/i.test(text)) return 0.7;
        return 0.3;
    }
    
    assessImpact(text) {
        if (/breaking|major|significant/i.test(text)) return 0.9;
        if (/minor|small|simple/i.test(text)) return 0.3;
        return 0.5;
    }
    
    async analyzeFileContext(text) {
        // Simplified file context analysis
        return {
            removingComments: /remove.*comment/i.test(text),
            creatingFiles: /create.*file/i.test(text),
            modifyingConfig: /config|setting/i.test(text)
        };
    }
    
    applyConstraints(patternDecision, context) {
        // Apply user preferences and project constraints
        if (this.userPreferences.mode === 'strict' && patternDecision.confidence < 0.9) {
            return {
                ...patternDecision,
                response: '3',
                reason: 'Strict mode: requires manual approval for medium confidence decisions',
                confidence: 0.3
            };
        }
        
        if (this.userPreferences.mode === 'permissive' && patternDecision.confidence > 0.4) {
            return {
                ...patternDecision,
                response: patternDecision.response === '3' ? '1' : patternDecision.response,
                confidence: Math.min(patternDecision.confidence * 1.2, 1.0)
            };
        }
        
        return patternDecision;
    }
    
    recordDecision(questionMatch, contextAnalysis, finalDecision) {
        const decision = {
            timestamp: Date.now(),
            text: questionMatch.text,
            decision: finalDecision.response,
            confidence: finalDecision.confidence,
            reason: finalDecision.reason,
            context: contextAnalysis
        };
        
        this.decisionHistory.push(decision);
        this.updateStats(finalDecision.response);
        
        // Keep history manageable
        if (this.decisionHistory.length > 100) {
            this.decisionHistory = this.decisionHistory.slice(-50);
        }
    }
    
    updateStats(response) {
        this.interventionStats.totalDecisions++;
        
        switch(response) {
            case '1':
                this.interventionStats.autoApproved++;
                break;
            case '2':
                this.interventionStats.autoApproved++;
                break;
            case '3':
                this.interventionStats.manualReview++;
                break;
        }
    }
    
    /**
     * Get current supervision mode and settings
     */
    getSupervisionMode() {
        return {
            mode: this.userPreferences.mode,
            autoApproveThreshold: this.userPreferences.autoApproveThreshold,
            stats: this.interventionStats,
            contextStatus: {
                hasClaudeMd: !!this.claudeMdContent,
                hasPrd: !!this.prdContent,
                projectType: this.projectContext?.type || 'unknown'
            }
        };
    }
    
    /**
     * Update supervision mode
     */
    setSupervisionMode(mode, options = {}) {
        const validModes = ['strict', 'balanced', 'permissive', 'auto'];
        if (!validModes.includes(mode)) {
            throw new Error(`Invalid mode: ${mode}. Must be one of: ${validModes.join(', ')}`);
        }
        
        this.userPreferences.mode = mode;
        if (options.autoApproveThreshold !== undefined) {
            this.userPreferences.autoApproveThreshold = options.autoApproveThreshold;
        }
        
        this.logger.log(`🧠 Supervision mode updated to: ${mode}`);
        
        this.emit('mode-changed', {
            sessionId: this.sessionId,
            mode: mode,
            options: options
        });
    }
    
    /**
     * Get supervision statistics
     */
    getStats() {
        return {
            sessionId: this.sessionId,
            mode: this.userPreferences.mode,
            stats: this.interventionStats,
            recentDecisions: this.decisionHistory.slice(-5),
            projectContext: this.projectContext,
            contextHealth: {
                claudeMd: !!this.claudeMdContent,
                prd: !!this.prdContent,
                projectAnalysis: !!this.projectContext
            }
        };
    }
}

module.exports = { SmartResponseEngine };