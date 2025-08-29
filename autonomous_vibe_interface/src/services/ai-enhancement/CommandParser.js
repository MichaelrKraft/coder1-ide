/**
 * Natural Language Command Parser
 * 
 * Converts natural language commands into structured actions for the AI system.
 * Makes the interface incredibly easy to use - just talk to it naturally.
 * 
 * Core Philosophy: Simplicity = Magic
 * - Natural conversation instead of complex interfaces
 * - Intelligent command recognition
 * - Context-aware parsing
 * - Seamless user experience
 */

const { EventEmitter } = require('events');

class CommandParser extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.confidence = options.confidence || 0.7;
        this.context = options.context || {};
        
        // Command patterns for different actions
        this.patterns = {
            // Agent coordination commands
            agents: {
                parallel: [
                    /(?:start|run|execute)\s+parallel\s+agents?\s+(?:to\s+|for\s+)?(.+)/i,
                    /(?:use|spawn|create)\s+multiple\s+agents?\s+(?:to\s+|for\s+)?(.+)/i,
                    /parallel\s+(?:work|development|coding)\s+(?:on\s+|for\s+)?(.+)/i,
                    /(?:let|have)\s+(?:multiple\s+)?agents?\s+work\s+(?:on\s+|together\s+on\s+)?(.+)/i
                ],
                hivemind: [
                    /(?:start|activate|enable)\s+hivemind\s+(?:mode\s+)?(?:to\s+|for\s+)?(.+)/i,
                    /(?:coordinate|orchestrate)\s+agents?\s+(?:to\s+|for\s+)?(.+)/i,
                    /hivemind\s+(?:coordination\s+)?(?:for\s+|on\s+)?(.+)/i,
                    /(?:smart|intelligent)\s+coordination\s+(?:to\s+|for\s+)?(.+)/i
                ],
                infinite: [
                    /(?:start|run)\s+infinite\s+loop\s+(?:to\s+|for\s+)?(.+)/i,
                    /(?:continuous|iterative)\s+(?:improvement|development)\s+(?:of\s+|on\s+|for\s+)?(.+)/i,
                    /(?:keep|continue)\s+(?:improving|working\s+on|refining)\s+(.+)/i,
                    /infinite\s+(?:mode\s+)?(?:for\s+|on\s+)?(.+)/i
                ],
                supervision: [
                    /(?:start|enable)\s+supervision\s+mode/i,
                    /(?:activate|turn\s+on)\s+supervision/i,
                    /supervision\s+mode\s+on/i
                ]
            },
            
            // File and project commands
            files: {
                create: [
                    /(?:create|make|generate)\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\s+file|\s+component|\s+class)?$/i,
                    /(?:add|build)\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\s+to\s+the\s+project)?$/i,
                    /(?:new\s+)(.+?)(?:\s+file|\s+component)?$/i
                ],
                modify: [
                    /(?:update|modify|change|edit)\s+(?:the\s+)?(.+)/i,
                    /(?:fix|repair|correct)\s+(?:the\s+)?(.+)/i,
                    /(?:improve|enhance|optimize)\s+(?:the\s+)?(.+)/i
                ],
                analyze: [
                    /(?:analyze|examine|review|check)\s+(?:the\s+)?(.+)/i,
                    /(?:what|how)\s+(?:is|does|are)\s+(?:the\s+)?(.+)/i,
                    /(?:show|display|list)\s+(?:me\s+)?(?:the\s+)?(.+)/i,
                    /(?:find|search\s+for|look\s+for)\s+(.+)/i
                ]
            },
            
            // Testing commands
            testing: {
                run: [
                    /(?:run|execute)\s+(?:the\s+)?tests?\s*(?:for\s+(.+))?/i,
                    /(?:test|check)\s+(?:the\s+)?(.+)/i,
                    /(?:verify|validate)\s+(?:that\s+)?(.+)/i
                ],
                create: [
                    /(?:write|create|generate)\s+tests?\s+(?:for\s+)?(.+)/i,
                    /(?:add|build)\s+test\s+coverage\s+(?:for\s+)?(.+)/i
                ]
            },
            
            // Deployment and build commands
            deployment: {
                build: [
                    /(?:build|compile|bundle)\s+(?:the\s+)?(?:project|app|application)/i,
                    /(?:prepare|ready)\s+(?:for\s+)?(?:deployment|production)/i,
                    /(?:make|create)\s+(?:a\s+)?(?:build|bundle)/i
                ],
                deploy: [
                    /(?:deploy|publish|release)\s+(?:the\s+)?(?:project|app|application)/i,
                    /(?:push|upload)\s+(?:to\s+)?(?:production|staging|server)/i
                ]
            },
            
            // Help and explanation commands
            help: {
                explain: [
                    /(?:explain|describe|tell\s+me\s+about)\s+(.+)/i,
                    /(?:what\s+is|what's)\s+(?:the\s+)?(.+?)(?:\s+system)?$/i,
                    /(?:what\s+are|how\s+does)\s+(.+?)(?:\s+work)?$/i,
                    /(?:help\s+me\s+understand|clarify)\s+(.+)/i
                ],
                guide: [
                    /(?:how\s+(?:do\s+i|to)|guide\s+me|show\s+me\s+how\s+to)\s+(.+)/i,
                    /(?:what\s+are\s+the\s+steps\s+to|how\s+can\s+i)\s+(.+)/i,
                    /(?:teach\s+me|walk\s+me\s+through)\s+(.+)/i
                ]
            },
            
            // Configuration commands
            config: {
                set: [
                    /(?:set|configure|setup)\s+(.+)/i,
                    /(?:change|update)\s+(?:the\s+)?(?:configuration|config|settings)\s+(?:for\s+|of\s+)?(.+)/i,
                    /(?:enable|disable)\s+(.+)/i
                ]
            },
            
            // Advanced AI and automation commands
            automation: {
                scaffold: [
                    /(?:scaffold|generate|create)\s+(?:a\s+|an\s+)?(.+?)\s+(?:project|application|app)/i,
                    /(?:bootstrap|initialize|init)\s+(?:a\s+|an\s+)?(.+?)\s+(?:with|using)\s+(.+)/i,
                    /(?:setup|create)\s+(?:a\s+|an\s+)?(?:new\s+)?(.+?)\s+(?:structure|template|boilerplate)/i
                ],
                refactor: [
                    /(?:refactor|restructure|reorganize)\s+(?:the\s+)?(.+?)(?:\s+to\s+use\s+(.+?))?/i,
                    /(?:convert|transform|migrate)\s+(?:the\s+)?(.+?)\s+(?:to|into)\s+(.+)/i,
                    /(?:modernize|upgrade)\s+(?:the\s+)?(.+?)(?:\s+using\s+(.+?))?/i
                ],
                optimize: [
                    /(?:optimize|improve|enhance)\s+(?:the\s+)?(.+?)\s+(?:performance|speed|efficiency)/i,
                    /(?:make|help)\s+(?:the\s+)?(.+?)\s+(?:faster|more\s+efficient|better)/i,
                    /(?:reduce|minimize)\s+(?:the\s+)?(.+?)\s+(?:size|memory|usage)/i
                ]
            },
            
            // Documentation and explanation commands
            documentation: {
                generate: [
                    /(?:document|write\s+docs\s+for|add\s+documentation\s+to)\s+(?:the\s+)?(.+)/i,
                    /(?:generate|create)\s+(?:api\s+docs|documentation|readme)\s+(?:for\s+)?(.+)/i,
                    /(?:explain|document)\s+(?:how|what)\s+(.+?)\s+(?:works|does)/i
                ],
                explain: [
                    /(?:explain|describe|break\s+down)\s+(?:the\s+)?(.+?)\s+(?:architecture|structure|design)/i,
                    /(?:what\s+does|how\s+does)\s+(?:the\s+)?(.+?)\s+(?:work|function|operate)/i,
                    /(?:give\s+me\s+an\s+overview\s+of|summarize)\s+(?:the\s+)?(.+)/i
                ]
            },
            
            // Security and compliance commands
            security: {
                audit: [
                    /(?:audit|scan|check)\s+(?:for\s+)?(?:security\s+)?(?:vulnerabilities|issues)\s+(?:in\s+)?(.+)/i,
                    /(?:review|analyze)\s+(?:the\s+)?(.+?)\s+(?:for\s+)?(?:security|safety|compliance)/i,
                    /(?:find|detect)\s+(?:security\s+)?(?:problems|issues|vulnerabilities)\s+(?:in\s+)?(.+)/i
                ],
                secure: [
                    /(?:secure|protect|harden)\s+(?:the\s+)?(.+)/i,
                    /(?:add|implement)\s+(?:security|authentication|authorization)\s+(?:to\s+)?(.+)/i,
                    /(?:encrypt|hash|protect)\s+(?:the\s+)?(.+?)\s+(?:data|information)/i
                ]
            },
            
            // Performance and monitoring commands
            performance: {
                analyze: [
                    /(?:analyze|profile|benchmark)\s+(?:the\s+)?(.+?)\s+(?:performance|speed|efficiency)/i,
                    /(?:measure|check|test)\s+(?:how\s+fast|the\s+speed\s+of)\s+(.+)/i,
                    /(?:profile|monitor)\s+(?:the\s+)?(.+?)\s+(?:resource\s+usage|memory|cpu)/i
                ],
                monitor: [
                    /(?:monitor|watch|track)\s+(?:the\s+)?(.+?)\s+(?:performance|health|status)/i,
                    /(?:setup|create|add)\s+(?:monitoring|alerts|notifications)\s+(?:for\s+)?(.+)/i,
                    /(?:log|record|track)\s+(?:the\s+)?(.+?)\s+(?:metrics|statistics|data)/i
                ]
            },
            
            // Database and data commands
            database: {
                design: [
                    /(?:design|create|build)\s+(?:a\s+|an\s+)?(?:database\s+)?(?:schema|model|structure)\s+(?:for\s+)?(.+)/i,
                    /(?:model|structure)\s+(?:the\s+)?(.+?)\s+(?:data|database|entities)/i,
                    /(?:setup|configure)\s+(?:a\s+|an\s+)?(?:database|db)\s+(?:for\s+)?(.+)/i
                ],
                query: [
                    /(?:write|create|generate)\s+(?:a\s+|an\s+)?(?:query|sql)\s+(?:to\s+)?(.+)/i,
                    /(?:find|search|get|retrieve)\s+(.+?)\s+(?:from\s+the\s+database|from\s+db)/i,
                    /(?:select|fetch|pull)\s+(.+?)\s+(?:data|records|information)/i
                ]
            },
            
            // API and integration commands
            api: {
                create: [
                    /(?:create|build|develop)\s+(?:an\s+|a\s+)?(?:api|endpoint|service)\s+(?:for\s+|to\s+)?(.+)/i,
                    /(?:implement|add)\s+(?:an\s+|a\s+)?(?:rest|graphql|api)\s+(?:endpoint\s+)?(?:for\s+)?(.+)/i,
                    /(?:expose|publish)\s+(.+?)\s+(?:as\s+an\s+api|via\s+api|through\s+endpoint)/i
                ],
                integrate: [
                    /(?:integrate|connect|link)\s+(?:with\s+|to\s+)?(.+?)(?:\s+api|\s+service)?/i,
                    /(?:setup|configure)\s+(?:integration\s+with|connection\s+to)\s+(.+)/i,
                    /(?:consume|use|call)\s+(?:the\s+)?(.+?)\s+(?:api|service|endpoint)/i
                ]
            },
            
            // UI/UX and frontend commands
            ui: {
                design: [
                    /(?:design|create|build)\s+(?:a\s+|an\s+)?(.+?)\s+(?:ui|interface|component|page)/i,
                    /(?:make|develop)\s+(?:the\s+)?(.+?)\s+(?:look\s+better|more\s+attractive|prettier)/i,
                    /(?:improve|enhance)\s+(?:the\s+)?(.+?)\s+(?:user\s+experience|ux|interface)/i
                ],
                responsive: [
                    /(?:make|ensure)\s+(?:the\s+)?(.+?)\s+(?:responsive|mobile-friendly|adaptive)/i,
                    /(?:optimize|adapt)\s+(?:the\s+)?(.+?)\s+(?:for\s+mobile|for\s+tablets|for\s+different\s+screens)/i,
                    /(?:add|implement)\s+(?:responsive|mobile)\s+(?:design|layout)\s+(?:to\s+)?(.+)/i
                ]
            }
        };
        
        // Context keywords for better understanding
        this.contextKeywords = {
            urgency: ['urgent', 'asap', 'quickly', 'fast', 'immediately', 'now'],
            quality: ['carefully', 'thoroughly', 'properly', 'best', 'optimal', 'quality'],
            scope: ['all', 'entire', 'complete', 'full', 'comprehensive'],
            tech: {
                frontend: ['ui', 'interface', 'component', 'react', 'frontend', 'client'],
                backend: ['api', 'server', 'database', 'backend', 'endpoint'],
                testing: ['test', 'spec', 'coverage', 'validation', 'verify'],
                security: ['secure', 'auth', 'permission', 'safety', 'protection']
            }
        };
    }

    /**
     * Parse natural language command into structured action
     */
    parseCommand(input, context = {}) {
        try {
            // Clean and normalize input
            const cleanInput = this.normalizeInput(input);
            
            // Extract context clues
            const extractedContext = this.extractContext(cleanInput, context);
            
            // Try to match command patterns
            const matches = this.matchPatterns(cleanInput);
            
            if (matches.length === 0) {
                return this.createFallbackCommand(cleanInput, extractedContext);
            }
            
            // Select best match
            const bestMatch = this.selectBestMatch(matches, extractedContext);
            
            // Build structured command
            const command = this.buildCommand(bestMatch, extractedContext, cleanInput);
            
            this.emit('commandParsed', { command, input: cleanInput, context: extractedContext });
            
            return command;
        } catch (error) {
            console.error('Command Parser: Failed to parse command:', error);
            return this.createErrorCommand(input, error);
        }
    }

    /**
     * Normalize input text
     */
    normalizeInput(input) {
        return input
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s.,!?]/g, '')
            .toLowerCase();
    }

    /**
     * Extract context from input
     */
    extractContext(input, providedContext = {}) {
        const context = {
            ...providedContext,
            urgency: 'normal',
            quality: 'standard',
            scope: 'focused',
            techStack: [],
            modifiers: []
        };
        
        // Check urgency
        if (this.contextKeywords.urgency.some(word => input.includes(word))) {
            context.urgency = 'high';
            context.modifiers.push('urgent');
        }
        
        // Check quality requirements
        if (this.contextKeywords.quality.some(word => input.includes(word))) {
            context.quality = 'high';
            context.modifiers.push('quality-focused');
        }
        
        // Check scope
        if (this.contextKeywords.scope.some(word => input.includes(word))) {
            context.scope = 'comprehensive';
            context.modifiers.push('comprehensive');
        }
        
        // Detect technology stack
        Object.entries(this.contextKeywords.tech).forEach(([tech, keywords]) => {
            if (keywords.some(keyword => input.includes(keyword))) {
                context.techStack.push(tech);
            }
        });
        
        return context;
    }

    /**
     * Match input against all patterns
     */
    matchPatterns(input) {
        const matches = [];
        
        Object.entries(this.patterns).forEach(([category, subcategories]) => {
            Object.entries(subcategories).forEach(([action, patterns]) => {
                patterns.forEach((pattern, index) => {
                    const match = input.match(pattern);
                    if (match) {
                        matches.push({
                            category,
                            action,
                            pattern: pattern.toString(),
                            match: match[0],
                            target: match[1] || '',
                            confidence: this.calculatePatternConfidence(pattern, match, index),
                            groups: match.slice(1)
                        });
                    }
                });
            });
        });
        
        return matches.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Calculate confidence score for pattern match
     */
    calculatePatternConfidence(pattern, match, patternIndex) {
        let confidence = 0.5;
        
        // Higher confidence for more specific patterns (later in array)
        confidence += patternIndex * 0.1;
        
        // Higher confidence for longer matches
        if (match[0].length > 20) confidence += 0.1;
        if (match[0].length > 40) confidence += 0.1;
        
        // Higher confidence if target is captured
        if (match[1] && match[1].trim().length > 0) {
            confidence += 0.2;
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * Select best match based on confidence and context
     */
    selectBestMatch(matches, context) {
        if (matches.length === 0) return null;
        
        // Boost confidence based on tech stack alignment
        matches.forEach(match => {
            if (context.techStack.length > 0) {
                const categoryTech = this.getCategoryTechAlignment(match.category);
                if (context.techStack.some(tech => categoryTech.includes(tech))) {
                    match.confidence += 0.15;
                }
            }
        });
        
        // Return highest confidence match
        return matches.sort((a, b) => b.confidence - a.confidence)[0];
    }

    /**
     * Get tech stack alignment for category
     */
    getCategoryTechAlignment(category) {
        const alignments = {
            agents: ['frontend', 'backend', 'testing', 'security'],
            files: ['frontend', 'backend'],
            testing: ['testing'],
            deployment: ['backend'],
            help: ['frontend', 'backend', 'testing', 'security'],
            config: ['backend', 'security']
        };
        
        return alignments[category] || [];
    }

    /**
     * Build structured command object
     */
    buildCommand(match, context, originalInput) {
        if (!match) return null;
        
        const command = {
            type: 'parsed_command',
            category: match.category,
            action: match.action,
            target: match.target.trim(),
            confidence: match.confidence,
            context: context,
            
            // API mapping
            apiEndpoint: this.getApiEndpoint(match.category, match.action),
            parameters: this.extractParameters(match, context),
            
            // Execution details
            priority: this.calculatePriority(context),
            estimatedComplexity: this.estimateComplexity(match, context),
            
            // User experience
            userFriendlyDescription: this.generateDescription(match, context),
            suggestedConfirmation: this.generateConfirmation(match, context),
            
            // Raw data
            originalInput,
            matchDetails: {
                pattern: match.pattern,
                matchedText: match.match,
                capturedGroups: match.groups
            }
        };
        
        return command;
    }

    /**
     * Get API endpoint for command
     */
    getApiEndpoint(category, action) {
        const endpoints = {
            agents: {
                parallel: '/api/claude-buttons/parallel/start',
                hivemind: '/api/claude-buttons/hivemind/start',
                infinite: '/api/claude-buttons/infinite/start',
                supervision: '/api/claude-buttons/supervision/start'
            },
            files: {
                create: '/api/agent/analyze-requirements',
                modify: '/api/agent/analyze-requirements',
                analyze: '/api/agent/analyze-requirements'
            },
            testing: {
                run: '/api/terminal/command',
                create: '/api/agent/analyze-requirements'
            },
            deployment: {
                build: '/api/terminal/command',
                deploy: '/api/terminal/command'
            },
            help: {
                explain: '/api/agent/analyze-requirements',
                guide: '/api/agent/analyze-requirements'
            },
            config: {
                set: '/api/agent/analyze-requirements'
            },
            automation: {
                scaffold: '/api/agent/analyze-requirements',
                refactor: '/api/agent/analyze-requirements',
                optimize: '/api/agent/analyze-requirements'
            },
            documentation: {
                generate: '/api/agent/analyze-requirements',
                explain: '/api/agent/analyze-requirements'
            },
            security: {
                audit: '/api/agent/analyze-requirements',
                secure: '/api/agent/analyze-requirements'
            },
            performance: {
                analyze: '/api/agent/analyze-requirements',
                monitor: '/api/agent/analyze-requirements'
            },
            database: {
                design: '/api/agent/analyze-requirements',
                query: '/api/agent/analyze-requirements'
            },
            api: {
                create: '/api/agent/analyze-requirements',
                integrate: '/api/agent/analyze-requirements'
            },
            ui: {
                design: '/api/agent/analyze-requirements',
                responsive: '/api/agent/analyze-requirements'
            }
        };
        
        return endpoints[category]?.[action] || '/api/agent/analyze-requirements';
    }

    /**
     * Extract parameters for API call
     */
    extractParameters(match, context) {
        const params = {
            prompt: match.target,
            sessionId: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        
        // Add context-specific parameters
        if (context.urgency === 'high') {
            params.priority = 'high';
        }
        
        if (context.quality === 'high') {
            params.qualityMode = true;
        }
        
        if (context.scope === 'comprehensive') {
            params.comprehensive = true;
        }
        
        // Add tech stack preferences
        if (context.techStack.length > 0) {
            params.techStack = context.techStack;
        }
        
        return params;
    }

    /**
     * Calculate execution priority
     */
    calculatePriority(context) {
        if (context.urgency === 'high') return 'high';
        if (context.quality === 'high') return 'medium';
        return 'normal';
    }

    /**
     * Estimate command complexity
     */
    estimateComplexity(match, context) {
        let complexity = 'medium';
        
        if (match.category === 'agents' && match.action === 'hivemind') {
            complexity = 'high';
        } else if (match.category === 'help') {
            complexity = 'low';
        } else if (context.scope === 'comprehensive') {
            complexity = 'high';
        } else if (match.target.length > 50) {
            complexity = 'high';
        }
        
        return complexity;
    }

    /**
     * Generate user-friendly description
     */
    generateDescription(match, context) {
        const templates = {
            agents: {
                parallel: `Run multiple AI agents in parallel to work on: ${match.target}`,
                hivemind: `Coordinate multiple AI agents with intelligent collaboration for: ${match.target}`,
                infinite: `Start continuous improvement loop for: ${match.target}`,
                supervision: `Monitor and supervise the development of: ${match.target}`
            },
            files: {
                create: `Create new ${match.target}`,
                modify: `Update and improve ${match.target}`,
                analyze: `Analyze and review ${match.target}`
            },
            testing: {
                run: `Run tests ${match.target ? 'for ' + match.target : ''}`,
                create: `Create test coverage for ${match.target}`
            }
        };
        
        const description = templates[match.category]?.[match.action] || 
                          `Execute ${match.action} operation on ${match.target}`;
        
        // Add context modifiers
        const modifiers = context.modifiers.join(', ');
        return modifiers ? `${description} (${modifiers})` : description;
    }

    /**
     * Generate confirmation message
     */
    generateConfirmation(match, context) {
        const baseConfirmation = `Would you like me to ${match.action} ${match.target}?`;
        
        if (context.urgency === 'high') {
            return `${baseConfirmation} I'll prioritize this for immediate execution.`;
        }
        
        if (context.quality === 'high') {
            return `${baseConfirmation} I'll focus on delivering high-quality results.`;
        }
        
        if (context.scope === 'comprehensive') {
            return `${baseConfirmation} I'll take a comprehensive approach to ensure completeness.`;
        }
        
        return baseConfirmation;
    }

    /**
     * Create fallback command for unrecognized input
     */
    createFallbackCommand(input, context) {
        return {
            type: 'fallback_command',
            category: 'general',
            action: 'analyze',
            target: input,
            confidence: 0.3,
            context,
            
            apiEndpoint: '/api/agent/analyze-requirements',
            parameters: {
                prompt: input,
                sessionId: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            },
            
            priority: 'normal',
            estimatedComplexity: 'medium',
            
            userFriendlyDescription: `Process request: ${input}`,
            suggestedConfirmation: 'I\'ll analyze your request and provide the best assistance possible.',
            
            originalInput: input,
            note: 'This command was processed using general analysis since no specific pattern was matched.'
        };
    }

    /**
     * Create error command
     */
    createErrorCommand(input, error) {
        return {
            type: 'error_command',
            category: 'error',
            action: 'handle_error',
            target: input,
            confidence: 0.0,
            
            error: error.message,
            userFriendlyDescription: `Failed to parse command: ${input}`,
            suggestedConfirmation: 'There was an issue processing your request. Please try rephrasing it.',
            
            originalInput: input
        };
    }

    /**
     * Get command suggestions based on input
     */
    getSuggestions(partialInput) {
        const suggestions = [];
        const input = partialInput.toLowerCase();
        
        // Common command suggestions
        const commonCommands = [
            'run parallel agents to build a new feature',
            'start hivemind coordination for the project',
            'create a new component',
            'analyze the codebase',
            'run tests',
            'build the project',
            'explain how the system works',
            'improve the performance'
        ];
        
        commonCommands.forEach(command => {
            if (command.toLowerCase().includes(input) || input.length < 3) {
                suggestions.push({
                    text: command,
                    category: this.predictCategory(command),
                    confidence: this.calculateSuggestionConfidence(command, input)
                });
            }
        });
        
        return suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);
    }

    /**
     * Predict category for suggestion
     */
    predictCategory(command) {
        if (command.includes('parallel') || command.includes('hivemind')) return 'agents';
        if (command.includes('create') || command.includes('build')) return 'files';
        if (command.includes('test')) return 'testing';
        if (command.includes('explain') || command.includes('how')) return 'help';
        return 'general';
    }

    /**
     * Calculate suggestion confidence
     */
    calculateSuggestionConfidence(suggestion, input) {
        if (input.length < 3) return 0.5;
        
        const inputWords = input.split(' ');
        const suggestionWords = suggestion.toLowerCase().split(' ');
        
        let matches = 0;
        inputWords.forEach(word => {
            if (suggestionWords.some(sugWord => sugWord.includes(word))) {
                matches++;
            }
        });
        
        return matches / inputWords.length;
    }
}

module.exports = { CommandParser };