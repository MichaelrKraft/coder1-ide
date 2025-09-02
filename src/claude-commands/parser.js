/**
 * Claude Commands Parser
 * Processes and executes structured Claude commands from wcygan dotfiles
 * 
 * This system integrates wcygan's 88 structured command templates into Coder1 IDE
 * providing systematic AI-assisted development workflows.
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class ClaudeCommandsParser extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            commandsPath: path.join(__dirname, 'registry'),
            enableAIIntegration: true,
            maxExecutionTime: 30000, // 30 seconds
            enableContextAnalysis: true,
            ...options
        };
        
        this.commands = new Map();
        this.executionHistory = new Map();
        this.contextAnalyzer = null;
        this.aiService = null;
        
        // Initialize the parser
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('[ClaudeCommands] Initializing parser...');
            
            // Load all command definitions
            await this.loadCommandDefinitions();
            
            // Set up AI integration if available
            if (this.options.enableAIIntegration) {
                await this.initializeAIIntegration();
            }
            
            // Set up context analyzer
            if (this.options.enableContextAnalysis) {
                this.setupContextAnalyzer();
            }
            
            console.log(`[ClaudeCommands] Parser initialized with ${this.commands.size} commands`);
            this.emit('initialized', { commandCount: this.commands.size });
            
        } catch (error) {
            console.error('[ClaudeCommands] Initialization failed:', error);
            this.emit('error', error);
        }
    }
    
    /**
     * Load command definitions from the registry
     */
    async loadCommandDefinitions() {
        // For now, we'll create the core commands directly in code
        // Later we can load them from markdown files like wcygan's repo
        
        const coreCommands = [
            {
                name: 'debug',
                alias: ['/debug', '/fix', '/troubleshoot'],
                description: 'Systematic debugging workflow with root cause analysis',
                category: 'debugging',
                template: this.getDebugTemplate(),
                requiredContext: ['error', 'code', 'logs'],
                parameters: [
                    { name: 'target', type: 'string', required: false, description: 'Error message or code to debug' }
                ]
            },
            {
                name: 'explain',
                alias: ['/explain', '/doc', '/understand'],
                description: 'Comprehensive technical explanations with examples',
                category: 'documentation',
                template: this.getExplainTemplate(),
                requiredContext: ['code'],
                parameters: [
                    { name: 'target', type: 'string', required: true, description: 'Code or concept to explain' }
                ]
            },
            {
                name: 'refactor',
                alias: ['/refactor', '/improve', '/optimize'],
                description: 'Code refactoring with best practices',
                category: 'improvement',
                template: this.getRefactorTemplate(),
                requiredContext: ['code'],
                parameters: [
                    { name: 'target', type: 'string', required: false, description: 'File or function to refactor' }
                ]
            },
            {
                name: 'plan',
                alias: ['/plan', '/design', '/architect'],
                description: 'Project planning and architecture design',
                category: 'planning',
                template: this.getPlanTemplate(),
                requiredContext: ['requirements'],
                parameters: [
                    { name: 'project', type: 'string', required: true, description: 'Project or feature to plan' }
                ]
            },
            {
                name: 'review',
                alias: ['/review', '/audit', '/assess'],
                description: 'Strategic code and architecture review',
                category: 'quality',
                template: this.getReviewTemplate(),
                requiredContext: ['code'],
                parameters: [
                    { name: 'target', type: 'string', required: false, description: 'Code or system to review' }
                ]
            },
            {
                name: 'test',
                alias: ['/test', '/spec', '/validate'],
                description: 'Test strategy and implementation guidance',
                category: 'testing',
                template: this.getTestTemplate(),
                requiredContext: ['code'],
                parameters: [
                    { name: 'target', type: 'string', required: false, description: 'Code to test' }
                ]
            }
        ];
        
        // Register all core commands
        coreCommands.forEach(command => {
            this.commands.set(command.name, command);
            
            // Register aliases
            command.alias.forEach(alias => {
                this.commands.set(alias, command);
            });
        });
        
        console.log(`[ClaudeCommands] Loaded ${coreCommands.length} core commands`);
    }
    
    /**
     * Initialize AI service integration
     */
    async initializeAIIntegration() {
        try {
            // Try to load existing AI services from the project
            const ClaudeService = require('../services/claude-service');
            this.aiService = new ClaudeService();
            console.log('[ClaudeCommands] AI integration enabled');
        } catch (error) {
            console.warn('[ClaudeCommands] AI service not available:', error.message);
        }
    }
    
    /**
     * Set up context analyzer for smart command suggestions
     */
    setupContextAnalyzer() {
        this.contextAnalyzer = {
            analyzeTerminalError: (terminalOutput) => {
                // Analyze terminal output for error patterns
                const errorPatterns = [
                    /error|Error|ERROR/,
                    /exception|Exception/,
                    /failed|Failed|FAILED/,
                    /not found|command not found/,
                    /permission denied/,
                    /syntax error|SyntaxError/
                ];
                
                return errorPatterns.some(pattern => pattern.test(terminalOutput));
            },
            
            analyzeCodeContext: (fileContent) => {
                // Analyze code for complexity and potential issues
                const complexityIndicators = [
                    /function.*{[\s\S]*?function/,  // Nested functions
                    /if.*{[\s\S]*?if/,             // Nested conditionals
                    /TODO|FIXME|BUG/i,             // Code comments indicating issues
                    /console\.error|throw new/      // Error handling patterns
                ];
                
                return complexityIndicators.some(pattern => pattern.test(fileContent));
            },
            
            suggestCommand: (context) => {
                // Suggest appropriate command based on context
                if (context.hasError) {
                    return this.commands.get('debug');
                }
                if (context.hasComplexCode) {
                    return this.commands.get('refactor');
                }
                if (context.hasNewFeature) {
                    return this.commands.get('plan');
                }
                
                return null;
            }
        };
    }
    
    /**
     * Execute a Claude command
     */
    async executeCommand(commandName, parameters = {}, context = {}) {
        try {
            console.log(`[ClaudeCommands] Executing command: ${commandName}`);
            
            // Find the command
            const command = this.commands.get(commandName) || this.commands.get(`/${commandName}`);
            if (!command) {
                throw new Error(`Unknown command: ${commandName}`);
            }
            
            // Validate parameters
            this.validateParameters(command, parameters);
            
            // Gather execution context
            const executionContext = await this.gatherContext(command, context);
            
            // Process the command template
            const processedTemplate = this.processTemplate(command.template, {
                ...parameters,
                ...executionContext,
                ARGUMENTS: parameters.target || Object.values(parameters).join(' ')
            });
            
            // Execute through AI service if available
            let result;
            if (this.aiService) {
                result = await this.executeWithAI(command, processedTemplate, executionContext);
            } else {
                result = {
                    success: true,
                    output: processedTemplate,
                    type: 'template',
                    command: commandName
                };
            }
            
            // Track execution
            this.trackExecution(command, parameters, result);
            
            this.emit('commandExecuted', { command: commandName, result });
            return result;
            
        } catch (error) {
            console.error('[ClaudeCommands] Command execution failed:', error);
            const errorResult = {
                success: false,
                error: error.message,
                command: commandName
            };
            
            this.emit('commandError', { command: commandName, error });
            return errorResult;
        }
    }
    
    /**
     * Validate command parameters
     */
    validateParameters(command, parameters) {
        for (const param of command.parameters) {
            if (param.required && !parameters[param.name]) {
                throw new Error(`Required parameter '${param.name}' is missing for command '${command.name}'`);
            }
        }
    }
    
    /**
     * Gather execution context based on command requirements
     */
    async gatherContext(command, providedContext = {}) {
        const context = { ...providedContext };
        
        // Add current working directory
        context.cwd = process.cwd();
        
        // Add timestamp
        context.timestamp = new Date().toISOString();
        
        // If code context is needed, try to get current file information
        if (command.requiredContext.includes('code') && !context.code) {
            // This would be enhanced to get actual code from IDE editor
            context.code = 'No code context available';
        }
        
        // If error context is needed, check for recent terminal errors
        if (command.requiredContext.includes('error') && !context.error) {
            context.error = 'No error context available';
        }
        
        return context;
    }
    
    /**
     * Process command template with variables
     */
    processTemplate(template, variables) {
        let processed = template;
        
        // Replace all $VARIABLE patterns
        Object.entries(variables).forEach(([key, value]) => {
            const pattern = new RegExp(`\\$${key.toUpperCase()}`, 'g');
            processed = processed.replace(pattern, value || `[${key} not provided]`);
        });
        
        return processed;
    }
    
    /**
     * Execute command through AI service
     */
    async executeWithAI(command, processedTemplate, context) {
        try {
            const prompt = `
You are a specialized AI assistant executing a structured command workflow.

Command: ${command.name}
Description: ${command.description}
Category: ${command.category}

Template:
${processedTemplate}

Context:
${JSON.stringify(context, null, 2)}

Please execute this command workflow and provide a comprehensive response following the template structure.
`;

            const aiResponse = await this.aiService.generateResponse(prompt);
            
            return {
                success: true,
                output: aiResponse,
                type: 'ai-enhanced',
                command: command.name,
                template: processedTemplate,
                context: context
            };
            
        } catch (error) {
            console.warn('[ClaudeCommands] AI execution failed, falling back to template:', error.message);
            
            return {
                success: true,
                output: processedTemplate,
                type: 'template-fallback',
                command: command.name,
                aiError: error.message
            };
        }
    }
    
    /**
     * Track command execution for analytics
     */
    trackExecution(command, parameters, result) {
        const execution = {
            command: command.name,
            parameters,
            success: result.success,
            timestamp: new Date().toISOString(),
            executionTime: result.executionTime || 0
        };
        
        if (!this.executionHistory.has(command.name)) {
            this.executionHistory.set(command.name, []);
        }
        
        this.executionHistory.get(command.name).push(execution);
        
        // Keep only last 100 executions per command
        const history = this.executionHistory.get(command.name);
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }
    }
    
    /**
     * Get list of all available commands
     */
    getCommandList() {
        const commands = Array.from(this.commands.values())
            .filter((command, index, self) => 
                // Remove duplicates (aliases point to same command object)
                self.findIndex(c => c.name === command.name) === index
            );
            
        return commands.map(command => ({
            name: command.name,
            aliases: command.alias,
            description: command.description,
            category: command.category,
            parameters: command.parameters
        }));
    }
    
    /**
     * Get command execution statistics
     */
    getStatistics() {
        const stats = {
            totalCommands: this.commands.size,
            totalExecutions: 0,
            commandStats: new Map()
        };
        
        this.executionHistory.forEach((executions, commandName) => {
            stats.totalExecutions += executions.length;
            stats.commandStats.set(commandName, {
                executions: executions.length,
                successRate: executions.filter(e => e.success).length / executions.length,
                lastUsed: executions[executions.length - 1]?.timestamp
            });
        });
        
        return stats;
    }
    
    /**
     * Suggest command based on context
     */
    suggestCommand(context = {}) {
        if (!this.contextAnalyzer) return null;
        
        return this.contextAnalyzer.suggestCommand(context);
    }
    
    // Command templates based on wcygan's repository structure
    
    getDebugTemplate() {
        return `Help debug issue: $ARGUMENTS

Steps:

1. Understand the problem:
   - Parse error messages and stack traces
   - **JavaScript/Node.js**: Analyze full stack trace, check error chains
   - **TypeScript**: Review type errors and compilation issues
   - **React**: Check component lifecycle and prop issues
   - Locate the exact file and line where error occurs
   - Check logs at INFO/DEBUG/TRACE levels
   - Review browser console for client-side issues

2. Analyze the code path:
   - Trace execution flow leading to the error
   - Identify all variables and their states
   - Check function signatures and calls
   - Review recent changes that might have introduced the bug

3. Suggest debugging strategies:
   - Add console.log statements at key points
   - Use debugger; statements for breakpoints
   - Check network requests in browser dev tools
   - Verify API endpoints and data flow
   - Test with minimal reproduction case

4. Identify common pitfalls:
   - Async/await error handling
   - React state updates and re-renders
   - API response handling and edge cases
   - Environment variable configuration
   - Package version compatibility

5. Create minimal reproduction:
   - Isolate the problem code
   - Remove unnecessary dependencies
   - Create simple test case that reproduces the issue
   - Document steps to reproduce

6. Propose solutions:
   - Provide specific code fixes with examples
   - Add proper error handling (try/catch)
   - Implement validation and null checks
   - Add comprehensive logging
   - Include unit tests to prevent regression

Output format:
- Root cause analysis
- Step-by-step debugging plan
- Specific code changes needed
- Test cases to verify the fix
- Prevention strategies`;
    }
    
    getExplainTemplate() {
        return `Provide comprehensive explanation for: $ARGUMENTS

Explanation Structure:

1. **Overview & Purpose**
   - What this code/concept does
   - Why it exists and its role
   - High-level context and importance

2. **Detailed Breakdown**
   - Step-by-step analysis
   - Key components and their interactions
   - Data flow and logic explanation
   - Important variables and functions

3. **Code Examples**
   - Practical usage examples
   - Common patterns and variations
   - Before/after scenarios if applicable

4. **Real-World Context**
   - When and where to use this
   - Best practices and conventions
   - Common use cases and scenarios

5. **Potential Issues & Gotchas**
   - Common mistakes to avoid
   - Edge cases and limitations
   - Performance considerations
   - Security implications if relevant

6. **Learning Resources**
   - Related concepts to explore
   - Documentation links
   - Additional reading suggestions

Format the explanation progressively from basic concepts to advanced details.
Use clear analogies and examples that connect to familiar concepts.`;
    }
    
    getRefactorTemplate() {
        return `Refactor and improve: $ARGUMENTS

Refactoring Process:

1. **Read and Understand**
   - Analyze current code structure and purpose
   - Identify main functions and data flow
   - Document existing behavior and constraints
   - Note any existing tests or documentation

2. **Identify Issues**
   - Code smells (long functions, nested conditions, duplicated code)
   - Performance bottlenecks
   - Maintainability concerns
   - Security vulnerabilities
   - Accessibility issues (for UI code)

3. **Refactoring Strategy**
   - Extract functions/components for reusability
   - Simplify complex conditional logic
   - Remove code duplication
   - Improve naming conventions
   - Optimize imports and dependencies
   - Enhance error handling

4. **Specific Improvements**
   - **JavaScript/TypeScript**: Use modern ES6+ features, proper type annotations
   - **React**: Component composition, custom hooks, prop optimization
   - **Node.js**: Async/await patterns, proper middleware structure
   - **CSS**: Semantic class names, responsive design, accessibility

5. **Quality Assurance**
   - Verify existing functionality remains intact
   - Add/update tests for refactored code
   - Check performance impact
   - Validate accessibility compliance
   - Review security implications

6. **Documentation**
   - Update code comments and documentation
   - Add JSDoc annotations for functions
   - Update README if architecture changed
   - Document breaking changes if any

Provide specific code examples with before/after comparisons.
Prioritize changes by impact and complexity.`;
    }
    
    getPlanTemplate() {
        return `Create development plan for: $ARGUMENTS

Planning Structure:

1. **Project Analysis**
   - Understand requirements and goals
   - Identify key features and functionality
   - Analyze technical constraints and dependencies
   - Define success criteria

2. **Architecture Design**
   - Choose appropriate technology stack
   - Design system architecture and data flow
   - Plan API structure and endpoints
   - Consider scalability and performance requirements

3. **Implementation Phases**
   - Break down into manageable milestones
   - Prioritize features by importance and dependencies
   - Estimate effort and timeline for each phase
   - Identify potential risks and mitigation strategies

4. **Technical Specifications**
   - Database schema and data models
   - API endpoints and request/response formats
   - Component structure and interfaces
   - Security and authentication approach

5. **Development Workflow**
   - Set up development environment
   - Configure build and deployment pipeline
   - Establish testing strategy
   - Plan code review and quality assurance process

6. **Deliverables**
   - List of specific tasks and subtasks
   - Timeline with milestones and deadlines
   - Resource requirements and team responsibilities
   - Success metrics and validation criteria

Include specific technical recommendations and best practices.
Consider both immediate implementation and future maintenance.`;
    }
    
    getReviewTemplate() {
        return `Provide strategic review of: $ARGUMENTS

Review Focus Areas:

**Strengths**: What's working well
- Well-structured code and architecture
- Good performance and optimization
- Proper security implementations
- Clear documentation and maintainability

**Weaknesses**: Key issues or gaps
- Code quality and maintainability concerns
- Performance bottlenecks or inefficiencies
- Security vulnerabilities or risks
- Missing documentation or unclear logic

**Improvements**: Top 2-3 actionable recommendations
- Specific code changes with examples
- Architecture improvements
- Performance optimizations
- Security enhancements

Keep analysis concise and actionable.
Focus on high-impact improvements that provide the most value.
Include specific code examples where relevant.`;
    }
    
    getTestTemplate() {
        return `Create testing strategy for: $ARGUMENTS

Testing Approach:

1. **Test Planning**
   - Identify critical functionality to test
   - Define test coverage goals
   - Choose appropriate testing frameworks
   - Plan test data and environment setup

2. **Test Categories**
   - **Unit Tests**: Individual functions and components
   - **Integration Tests**: API endpoints and data flow
   - **End-to-End Tests**: Complete user workflows
   - **Performance Tests**: Load and stress testing
   - **Security Tests**: Vulnerability and penetration testing

3. **Test Implementation**
   - Write comprehensive test suites
   - Use mocking and stubbing appropriately
   - Implement test helpers and utilities
   - Set up continuous integration testing

4. **Test Scenarios**
   - Happy path testing (normal usage)
   - Edge cases and boundary conditions
   - Error handling and failure scenarios
   - Cross-browser and device compatibility

5. **Quality Metrics**
   - Code coverage targets and measurement
   - Performance benchmarks and thresholds
   - Accessibility compliance testing
   - Security vulnerability assessment

6. **Maintenance**
   - Regular test updates and maintenance
   - Test result monitoring and analysis
   - Automated test reporting
   - Continuous improvement process

Provide specific test examples with assertions and expected outcomes.
Include both testing code and setup instructions.`;
    }
}

module.exports = ClaudeCommandsParser;