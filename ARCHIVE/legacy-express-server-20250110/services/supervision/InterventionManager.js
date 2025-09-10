/**
 * Intervention Manager - Intelligent Response System
 * 
 * Manages intelligent interventions when Claude Code needs help.
 * Decides when to intervene, what type of intervention to provide,
 * and how to deliver the intervention effectively.
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class InterventionManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.sessionId = options.sessionId || `intervention-${Date.now()}`;
        this.projectPath = options.projectPath || process.cwd();
        this.logger = options.logger || console;
        
        // Intervention strategies
        this.strategies = {
            clarification_needed: {
                priority: 'immediate',
                method: 'direct_response',
                template: 'provide_specific_guidance'
            },
            requirements_missing: {
                priority: 'immediate',
                method: 'context_injection',
                template: 'inject_requirements'
            },
            claude_md_missing: {
                priority: 'immediate',
                method: 'file_creation',
                template: 'create_claude_md'
            },
            file_not_found: {
                priority: 'high',
                method: 'path_guidance',
                template: 'provide_file_structure'
            },
            permission_request: {
                priority: 'immediate',
                method: 'user_approval',
                template: 'request_permission'
            },
            general_confusion: {
                priority: 'medium',
                method: 'comprehensive_guidance',
                template: 'explain_context'
            },
            error_recovery: {
                priority: 'high',
                method: 'error_resolution',
                template: 'fix_error'
            }
        };
        
        // Intervention history
        this.interventionHistory = [];
        this.activeInterventions = new Map();
        
        // Context cache
        this.contextCache = {
            projectStructure: null,
            requirements: null,
            claudeMdContent: null,
            lastUpdated: null
        };
        
        // Response templates
        this.responseTemplates = {
            provide_specific_guidance: {
                intro: 'I understand you need clarification. Let me provide specific guidance:',
                structure: 'step_by_step',
                includeContext: true
            },
            inject_requirements: {
                intro: 'Here are the project requirements you need:',
                structure: 'requirements_list',
                includeContext: true
            },
            create_claude_md: {
                intro: 'I\'ll create the CLAUDE.md file with the necessary requirements:',
                structure: 'file_content',
                includeContext: true
            },
            provide_file_structure: {
                intro: 'Here\'s the current project structure to help you navigate:',
                structure: 'tree_view',
                includeContext: true
            },
            explain_context: {
                intro: 'Let me explain the full context of what we\'re building:',
                structure: 'comprehensive',
                includeContext: true
            }
        };
        
        // Statistics
        this.stats = {
            totalInterventions: 0,
            successfulInterventions: 0,
            failedInterventions: 0,
            averageResponseTime: 0,
            interventionTypes: {}
        };
        
        this.logger.log('🎯 InterventionManager: Initialized intelligent response system');
    }

    /**
     * Process intervention request and generate response
     */
    async processInterventionRequest(request) {
        const startTime = Date.now();
        
        try {
            this.logger.log(`🔄 InterventionManager: Processing ${request.type} intervention`);
            
            // Create intervention record
            const intervention = {
                id: `int-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: request.type,
                request: request,
                startTime: startTime,
                status: 'processing'
            };
            
            this.activeInterventions.set(intervention.id, intervention);
            
            // Get strategy for this intervention type
            const strategy = this.strategies[request.type] || this.strategies.general_confusion;
            
            // Refresh context if needed
            await this.refreshContextIfNeeded();
            
            // Generate intervention response
            const response = await this.generateInterventionResponse(request, strategy);
            
            // Record intervention
            intervention.response = response;
            intervention.endTime = Date.now();
            intervention.duration = intervention.endTime - intervention.startTime;
            intervention.status = 'completed';
            
            this.recordIntervention(intervention);
            
            // Emit intervention ready
            this.emit('interventionReady', {
                sessionId: this.sessionId,
                intervention: intervention,
                response: response
            });
            
            return response;
            
        } catch (error) {
            this.logger.error('❌ InterventionManager: Failed to process intervention:', error);
            this.stats.failedInterventions++;
            
            return this.generateFallbackResponse(request);
        }
    }

    /**
     * Generate intervention response based on strategy
     */
    async generateInterventionResponse(request, strategy) {
        const template = this.responseTemplates[strategy.template];
        
        let response = {
            type: request.type,
            priority: strategy.priority,
            method: strategy.method,
            content: '',
            actions: [],
            context: null
        };
        
        // Add introduction
        response.content = template.intro + '\n\n';
        
        // Generate content based on intervention type
        switch (request.type) {
        case 'requirements_missing':
        case 'clarification_needed':
            response = await this.generateRequirementsResponse(response, request);
            break;
                
        case 'claude_md_missing':
            response = await this.generateClaudeMdResponse(response, request);
            break;
                
        case 'file_not_found':
        case 'path_error':
            response = await this.generateFileGuidanceResponse(response, request);
            break;
                
        case 'permission_request':
            response = await this.generatePermissionResponse(response, request);
            break;
                
        case 'error_recovery':
            response = await this.generateErrorRecoveryResponse(response, request);
            break;
                
        case 'question_response':
            response = await this.generateQuestionResponse(response, request);
            break;
                
        default:
            response = await this.generateGeneralGuidanceResponse(response, request);
        }
        
        // Add context if needed
        if (template.includeContext && this.contextCache.requirements) {
            response.context = {
                requirements: this.contextCache.requirements,
                projectStructure: this.contextCache.projectStructure,
                timestamp: Date.now()
            };
        }
        
        return response;
    }

    /**
     * Generate requirements response
     */
    async generateRequirementsResponse(response, request) {
        response.content += '## Project Requirements\n\n';
        
        if (this.contextCache.requirements && this.contextCache.requirements.length > 0) {
            this.contextCache.requirements.forEach((req, index) => {
                response.content += `${index + 1}. ${req}\n`;
            });
            
            response.content += '\n## What to do next:\n';
            response.content += '1. Start by creating the main application file\n';
            response.content += '2. Implement each requirement one by one\n';
            response.content += '3. Test as you build\n';
            response.content += '4. Ask for help if you need clarification on any requirement\n';
            
            response.actions.push({
                type: 'provide_requirements',
                status: 'completed'
            });
        } else {
            // Fallback if no requirements cached
            response.content += 'I need to provide you with the project requirements. ';
            response.content += 'Please implement a basic application structure and I\'ll guide you through the specific requirements.\n';
            
            response.actions.push({
                type: 'fetch_requirements',
                status: 'pending'
            });
        }
        
        return response;
    }

    /**
     * Generate CLAUDE.md creation response
     */
    async generateClaudeMdResponse(response, request) {
        response.content += '## Creating CLAUDE.md File\n\n';
        
        // Generate CLAUDE.md content
        const claudeMdContent = this.generateClaudeMdContent();
        
        // Save to file
        const claudeMdPath = path.join(this.projectPath, 'CLAUDE.md');
        
        try {
            await fs.writeFile(claudeMdPath, claudeMdContent, 'utf8');
            
            response.content += '✅ CLAUDE.md file has been created with the project requirements.\n\n';
            response.content += 'The file contains:\n';
            response.content += '- Project overview\n';
            response.content += '- Complete requirements list\n';
            response.content += '- Implementation guidelines\n\n';
            response.content += 'You can now proceed with the implementation based on these requirements.\n';
            
            response.actions.push({
                type: 'create_file',
                path: 'CLAUDE.md',
                status: 'completed'
            });
            
            // Cache the content
            this.contextCache.claudeMdContent = claudeMdContent;
            
        } catch (error) {
            response.content += '⚠️ I tried to create CLAUDE.md but encountered an issue.\n';
            response.content += 'Here\'s the content you need:\n\n';
            response.content += '```markdown\n' + claudeMdContent + '\n```\n';
            
            response.actions.push({
                type: 'provide_content',
                status: 'completed'
            });
        }
        
        return response;
    }

    /**
     * Generate file guidance response
     */
    async generateFileGuidanceResponse(response, request) {
        response.content += '## Project Structure Guidance\n\n';
        
        if (this.contextCache.projectStructure) {
            response.content += 'Here\'s the current project structure:\n\n';
            response.content += '```\n';
            response.content += this.formatProjectStructure(this.contextCache.projectStructure);
            response.content += '```\n\n';
            
            response.content += '## Recommended file locations:\n';
            response.content += '- Main application: `src/app.js` or `index.js`\n';
            response.content += '- Components: `src/components/`\n';
            response.content += '- Routes/APIs: `src/routes/`\n';
            response.content += '- Utilities: `src/utils/`\n';
            response.content += '- Tests: `tests/` or `__tests__/`\n';
            
            response.actions.push({
                type: 'provide_structure',
                status: 'completed'
            });
        } else {
            response.content += 'The project is currently empty. Start by creating:\n';
            response.content += '1. A main application file (e.g., `index.js` or `app.js`)\n';
            response.content += '2. A `package.json` file for dependencies\n';
            response.content += '3. Source directories as needed (`src/`, `components/`, etc.)\n';
        }
        
        return response;
    }

    /**
     * Generate permission response
     */
    async generatePermissionResponse(response, request) {
        response.content += '## Permission Request\n\n';
        
        // Parse the permission request
        const permissionDetails = this.parsePermissionRequest(request);
        
        response.content += `Claude Code is requesting permission to: **${permissionDetails.action}**\n\n`;
        
        if (permissionDetails.files && permissionDetails.files.length > 0) {
            response.content += 'Files affected:\n';
            permissionDetails.files.forEach(file => {
                response.content += `- ${file}\n`;
            });
            response.content += '\n';
        }
        
        response.content += 'This action is part of the implementation process.\n';
        response.content += '**Recommendation**: This appears to be a necessary step for the project.\n';
        
        response.actions.push({
            type: 'permission_request',
            action: permissionDetails.action,
            files: permissionDetails.files,
            status: 'pending_approval'
        });
        
        // Emit permission event for UI handling
        this.emit('permissionRequested', {
            sessionId: this.sessionId,
            details: permissionDetails,
            recommendation: 'approve'
        });
        
        return response;
    }

    /**
     * Generate error recovery response
     */
    async generateErrorRecoveryResponse(response, request) {
        response.content += '## Error Recovery Assistance\n\n';
        
        // Analyze the error
        const errorAnalysis = this.analyzeError(request);
        
        response.content += `I see you've encountered an error: ${errorAnalysis.type}\n\n`;
        
        response.content += '## Suggested solutions:\n';
        errorAnalysis.solutions.forEach((solution, index) => {
            response.content += `${index + 1}. ${solution}\n`;
        });
        
        response.content += '\n## Alternative approach:\n';
        response.content += errorAnalysis.alternative || 'Try a different implementation approach for this requirement.\n';
        
        response.actions.push({
            type: 'error_recovery',
            errorType: errorAnalysis.type,
            status: 'guidance_provided'
        });
        
        return response;
    }

    /**
     * Generate question response
     */
    async generateQuestionResponse(response, request) {
        response.content += '## Answer to Your Question\n\n';
        
        // Analyze the question type
        const questionAnalysis = this.analyzeQuestion(request);
        
        response.content += questionAnalysis.answer + '\n\n';
        
        if (questionAnalysis.additionalGuidance) {
            response.content += '## Additional guidance:\n';
            response.content += questionAnalysis.additionalGuidance + '\n';
        }
        
        response.actions.push({
            type: 'question_answered',
            questionType: questionAnalysis.type,
            status: 'completed'
        });
        
        return response;
    }

    /**
     * Generate general guidance response
     */
    async generateGeneralGuidanceResponse(response, request) {
        response.content += '## General Guidance\n\n';
        
        response.content += 'I understand you need help. Here\'s what I recommend:\n\n';
        
        response.content += '1. **Current Focus**: ';
        if (request.context && request.context.currentActivity) {
            response.content += `Continue with ${request.context.currentActivity}\n`;
        } else {
            response.content += 'Start with the main application structure\n';
        }
        
        response.content += '2. **Next Steps**:\n';
        response.content += '   - Review the requirements in CLAUDE.md\n';
        response.content += '   - Implement one feature at a time\n';
        response.content += '   - Test each feature as you build\n';
        response.content += '   - Ask specific questions when you need help\n\n';
        
        response.content += '3. **Best Practices**:\n';
        response.content += '   - Keep code modular and clean\n';
        response.content += '   - Add comments for complex logic\n';
        response.content += '   - Handle errors appropriately\n';
        response.content += '   - Follow the project structure guidelines\n';
        
        response.actions.push({
            type: 'general_guidance',
            status: 'completed'
        });
        
        return response;
    }

    /**
     * Refresh context cache if needed
     */
    async refreshContextIfNeeded() {
        const cacheAge = this.contextCache.lastUpdated ? 
            Date.now() - this.contextCache.lastUpdated : Infinity;
        
        // Refresh if cache is older than 5 minutes
        if (cacheAge > 300000) {
            await this.refreshContext();
        }
    }

    /**
     * Refresh context cache
     */
    async refreshContext() {
        this.logger.log('🔄 InterventionManager: Refreshing context cache');
        
        try {
            // Scan project structure
            this.contextCache.projectStructure = await this.scanProjectStructure();
            
            // Try to read CLAUDE.md
            try {
                const claudeMdPath = path.join(this.projectPath, 'CLAUDE.md');
                this.contextCache.claudeMdContent = await fs.readFile(claudeMdPath, 'utf8');
                
                // Extract requirements from CLAUDE.md
                this.contextCache.requirements = this.extractRequirementsFromContent(
                    this.contextCache.claudeMdContent
                );
            } catch (error) {
                // CLAUDE.md doesn't exist yet
                this.contextCache.claudeMdContent = null;
            }
            
            this.contextCache.lastUpdated = Date.now();
            
        } catch (error) {
            this.logger.error('❌ Failed to refresh context:', error);
        }
    }

    /**
     * Scan project structure
     */
    async scanProjectStructure() {
        const structure = {};
        
        try {
            const items = await fs.readdir(this.projectPath, { withFileTypes: true });
            
            for (const item of items) {
                if (item.name.startsWith('.') || item.name === 'node_modules') {
                    continue;
                }
                
                if (item.isDirectory()) {
                    structure[item.name] = 'directory';
                    
                    // Scan subdirectory (one level deep)
                    const subPath = path.join(this.projectPath, item.name);
                    const subItems = await fs.readdir(subPath, { withFileTypes: true });
                    structure[item.name] = {};
                    
                    for (const subItem of subItems) {
                        if (!subItem.name.startsWith('.')) {
                            structure[item.name][subItem.name] = subItem.isDirectory() ? 'directory' : 'file';
                        }
                    }
                } else {
                    structure[item.name] = 'file';
                }
            }
        } catch (error) {
            this.logger.error('❌ Failed to scan project structure:', error);
        }
        
        return structure;
    }

    /**
     * Format project structure for display
     */
    formatProjectStructure(structure, indent = '') {
        let output = '';
        
        for (const [name, value] of Object.entries(structure)) {
            if (typeof value === 'string') {
                output += `${indent}${name}${value === 'directory' ? '/' : ''}\n`;
            } else {
                output += `${indent}${name}/\n`;
                output += this.formatProjectStructure(value, indent + '  ');
            }
        }
        
        return output;
    }

    /**
     * Helper methods for parsing and analysis
     */
    parsePermissionRequest(request) {
        const details = {
            action: 'unknown',
            files: []
        };
        
        if (request.analysis) {
            const patterns = request.analysis.patterns || [];
            for (const pattern of patterns) {
                if (pattern.type === 'create_permission') {
                    details.action = 'Create files';
                } else if (pattern.type === 'modify_permission') {
                    details.action = 'Modify files';
                } else if (pattern.type === 'delete_permission') {
                    details.action = 'Delete files';
                }
            }
        }
        
        // Extract file names from line if possible
        if (request.line) {
            const fileMatches = request.line.match(/['"]([\w\-/.]+\.\w+)['"]/g);
            if (fileMatches) {
                details.files = fileMatches.map(f => f.replace(/['"]/g, ''));
            }
        }
        
        return details;
    }

    analyzeError(request) {
        const analysis = {
            type: 'general_error',
            solutions: [],
            alternative: null
        };
        
        if (request.line) {
            const line = request.line.toLowerCase();
            
            if (line.includes('command not found')) {
                analysis.type = 'Command not found';
                analysis.solutions = [
                    'Check if the command is installed',
                    'Use the correct command syntax',
                    'Try an alternative command'
                ];
            } else if (line.includes('permission denied')) {
                analysis.type = 'Permission denied';
                analysis.solutions = [
                    'Check file permissions',
                    'Run with appropriate permissions',
                    'Use a different location'
                ];
            } else if (line.includes('file not found')) {
                analysis.type = 'File not found';
                analysis.solutions = [
                    'Create the missing file',
                    'Check the file path',
                    'Use an existing file'
                ];
            }
        }
        
        if (analysis.solutions.length === 0) {
            analysis.solutions = [
                'Review the error message carefully',
                'Check for typos or syntax errors',
                'Try a different approach'
            ];
        }
        
        return analysis;
    }

    analyzeQuestion(request) {
        const analysis = {
            type: 'general_question',
            answer: '',
            additionalGuidance: null
        };
        
        if (request.analysis && request.analysis.patterns) {
            const questionPattern = request.analysis.patterns.find(p => p.category === 'question');
            
            if (questionPattern) {
                switch (questionPattern.type) {
                case 'file_selection':
                    analysis.type = 'file_selection';
                    analysis.answer = 'Create files in the `src/` directory for source code, or in the root for configuration files.';
                    analysis.additionalGuidance = 'Follow the standard project structure for the framework you\'re using.';
                    break;
                        
                case 'location_question':
                    analysis.type = 'location';
                    analysis.answer = 'Place new files in appropriate directories based on their purpose.';
                    break;
                        
                case 'implementation_question':
                    analysis.type = 'implementation';
                    analysis.answer = 'Implement the feature following best practices and the requirements provided.';
                    analysis.additionalGuidance = 'Start simple and iterate. Test as you build.';
                    break;
                        
                case 'next_step_question':
                    analysis.type = 'next_step';
                    analysis.answer = 'Continue with the next requirement in the list, or complete the current feature first.';
                    break;
                        
                default:
                    analysis.answer = 'Proceed with the implementation based on the requirements and best practices.';
                }
            }
        }
        
        if (!analysis.answer) {
            analysis.answer = 'Based on the requirements, proceed with implementing the core functionality first, then add features incrementally.';
        }
        
        return analysis;
    }

    extractRequirementsFromContent(content) {
        const requirements = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (line.match(/^\d+\./) || (line.match(/^[-•*]/) && line.length > 10)) {
                const requirement = line.replace(/^\d+\.|\s*[-•*]\s*/, '').trim();
                if (requirement.length > 5) {
                    requirements.push(requirement);
                }
            }
        }
        
        return requirements;
    }

    generateClaudeMdContent() {
        let content = '# Project Requirements\n\n';
        
        if (this.contextCache.requirements && this.contextCache.requirements.length > 0) {
            content += '## Requirements List\n\n';
            this.contextCache.requirements.forEach((req, index) => {
                content += `${index + 1}. ${req}\n`;
            });
        } else {
            content += '## General Requirements\n\n';
            content += '1. Build a functional application\n';
            content += '2. Follow best practices\n';
            content += '3. Include error handling\n';
            content += '4. Write clean, maintainable code\n';
        }
        
        content += '\n## Implementation Guidelines\n\n';
        content += '- Start with the core functionality\n';
        content += '- Test each feature as you build\n';
        content += '- Use modular code structure\n';
        content += '- Add comments for complex logic\n';
        
        return content;
    }

    /**
     * Generate fallback response when intervention fails
     */
    generateFallbackResponse(request) {
        return {
            type: request.type,
            priority: 'high',
            method: 'fallback',
            content: 'I understand you need assistance. Please continue with the implementation based on the requirements provided, and I\'ll help guide you through any specific issues.',
            actions: [{
                type: 'fallback_guidance',
                status: 'completed'
            }],
            context: null
        };
    }

    /**
     * Record intervention for statistics
     */
    recordIntervention(intervention) {
        this.interventionHistory.push(intervention);
        this.activeInterventions.delete(intervention.id);
        
        // Update statistics
        this.stats.totalInterventions++;
        
        if (intervention.status === 'completed') {
            this.stats.successfulInterventions++;
        } else {
            this.stats.failedInterventions++;
        }
        
        // Update type statistics
        if (!this.stats.interventionTypes[intervention.type]) {
            this.stats.interventionTypes[intervention.type] = 0;
        }
        this.stats.interventionTypes[intervention.type]++;
        
        // Update average response time
        const totalTime = this.interventionHistory.reduce((sum, int) => 
            sum + (int.duration || 0), 0);
        this.stats.averageResponseTime = totalTime / this.interventionHistory.length;
        
        // Keep history size manageable
        if (this.interventionHistory.length > 100) {
            this.interventionHistory = this.interventionHistory.slice(-100);
        }
    }

    /**
     * Get intervention statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeInterventions: this.activeInterventions.size,
            historySize: this.interventionHistory.length,
            successRate: this.stats.totalInterventions > 0 ? 
                this.stats.successfulInterventions / this.stats.totalInterventions : 0
        };
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.interventionHistory = [];
        this.activeInterventions.clear();
        this.contextCache = {
            projectStructure: null,
            requirements: null,
            claudeMdContent: null,
            lastUpdated: null
        };
        
        this.logger.log('🧹 InterventionManager: Cleaned up resources');
    }
}

module.exports = { InterventionManager };