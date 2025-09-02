/**
 * Claude Code SDK Integration
 * 
 * Uses the official @anthropic-ai/claude-code SDK for AI-powered code generation
 * This replaces the direct API calls with SDK-based implementation
 */

const { query } = require('@anthropic-ai/claude-code');
const fs = require('fs').promises;
const path = require('path');

class ClaudeCodeSDK {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.projectsDir = options.projectsDir || path.join(__dirname, '../../../projects');
        this.maxTurns = options.maxTurns || 5;
        this.timeout = options.timeout || 120000; // 2 minutes
    }

    /**
     * Set API key for a specific user request
     * @param {string} apiKey - User's Anthropic API key
     */
    setApiKey(apiKey) {
        // Set the API key for this request
        process.env.ANTHROPIC_API_KEY = apiKey;
    }

    /**
     * Generate a React component using Claude Code SDK
     * @param {string} userId - User ID for tracking
     * @param {string} prompt - Component generation prompt
     * @param {Object} context - Additional context (PRD, requirements, etc.)
     * @returns {Promise<Object>} Generated component and metadata
     */
    async generateComponent(userId, prompt, context = {}) {
        try {
            // Build comprehensive prompt with context
            const fullPrompt = this.buildComponentPrompt(prompt, context);
            
            this.logger.info('Starting Claude Code SDK component generation', {
                userId,
                promptLength: fullPrompt.length,
                hasContext: !!context.prd
            });

            // Track progress messages
            const messages = [];
            const generatedCode = {};
            let hasError = false;
            let errorMessage = null;
            
            // Use Claude Code SDK
            for await (const message of query({
                prompt: fullPrompt,
                options: {
                    maxTurns: this.maxTurns,
                    timeout: this.timeout,
                    nonInteractive: true,
                    // Enable code generation mode
                    systemPrompt: 'You are an expert React developer. Generate clean, modern React components with TypeScript support when requested. Always include proper error handling and follow React best practices.'
                }
            })) {
                messages.push(message);
                
                // Check for error messages
                if (message.type === 'result' && message.is_error) {
                    hasError = true;
                    errorMessage = message.result;
                    this.logger.error('Claude SDK error result:', message);
                }
                
                // Emit progress for real-time updates
                if (global.terminalEmitter && !hasError) {
                    global.terminalEmitter.emit('infinite-output', {
                        userId,
                        sessionId: context.sessionId,
                        output: message.content || message,
                        type: 'progress'
                    });
                }

                // Extract code blocks from the response
                if (!hasError) {
                    this.extractCodeBlocks(message, generatedCode);
                }
            }

            // Handle SDK errors
            if (hasError) {
                this.logger.error('SDK error in component generation:', { errorMessage, messages });
                
                if (errorMessage?.includes('Invalid API key')) {
                    throw new Error('Invalid Anthropic API key. Please check your API key from console.anthropic.com');
                }
                throw new Error(errorMessage || 'Claude Code SDK error');
            }

            // Save generated components
            const savedFiles = await this.saveGeneratedCode(userId, generatedCode, context.sessionId);

            return {
                success: true,
                files: savedFiles,
                messages,
                metadata: {
                    timestamp: new Date().toISOString(),
                    promptTokens: fullPrompt.length / 4, // Rough estimate
                    generatedFiles: Object.keys(generatedCode).length
                }
            };

        } catch (error) {
            this.logger.error('Claude Code SDK generation error:', error);
            
            // Check for specific error types
            if (error.message?.includes('API key') || error.message?.includes('Invalid API key')) {
                throw new Error('Invalid Anthropic API key. Please check your API key from console.anthropic.com');
            }
            if (error.message?.includes('rate limit')) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            if (error.message?.includes('exited with code')) {
                throw new Error('Claude Code SDK failed. Please check your Anthropic API key.');
            }
            
            throw error;
        }
    }

    /**
     * Build comprehensive prompt for component generation
     */
    buildComponentPrompt(prompt, context) {
        let fullPrompt = '';

        // Add PRD context if available
        if (context.prd) {
            fullPrompt += `<project_context>
${context.prd}
</project_context>\n\n`;
        }

        // Add requirements if available
        if (context.requirements) {
            fullPrompt += `<requirements>
${JSON.stringify(context.requirements, null, 2)}
</requirements>\n\n`;
        }

        // Add existing code context if available
        if (context.existingCode) {
            fullPrompt += `<existing_code>
${context.existingCode}
</existing_code>\n\n`;
        }

        // Add the main request
        fullPrompt += `<task>
${prompt}

Please generate a complete, working React component that:
1. Follows React best practices
2. Includes proper TypeScript types (if applicable)
3. Has error handling and loading states
4. Is production-ready
5. Includes basic styling (CSS-in-JS or CSS modules)

Format your response with clear file separators like:
--- Button.tsx ---
[component code]
--- Button.css ---
[styles]
</task>`;

        return fullPrompt;
    }

    /**
     * Extract code blocks from Claude's response
     */
    extractCodeBlocks(message, codeStore) {
        const content = message.content || message.toString();
        
        // Look for file markers
        const filePattern = /---\s*(.+?)\s*---\s*\n([\s\S]*?)(?=---|$)/g;
        let match;

        while ((match = filePattern.exec(content)) !== null) {
            const filename = match[1].trim();
            const code = match[2].trim();
            
            if (filename && code) {
                codeStore[filename] = code;
            }
        }

        // Also look for standard code blocks
        const codeBlockPattern = /```(?:jsx?|tsx?|css|scss)?\n([\s\S]*?)```/g;
        const codeBlocks = [];
        
        while ((match = codeBlockPattern.exec(content)) !== null) {
            codeBlocks.push(match[1]);
        }

        // If we found code blocks but no file markers, try to infer filenames
        if (codeBlocks.length > 0 && Object.keys(codeStore).length === 0) {
            codeBlocks.forEach((code, index) => {
                if (code.includes('export default') || code.includes('function') || code.includes('const')) {
                    // Likely a component
                    const componentMatch = code.match(/(?:function|const|export default)\s+(\w+)/);
                    const name = componentMatch ? componentMatch[1] : `Component${index + 1}`;
                    codeStore[`${name}.jsx`] = code;
                } else if (code.includes('{') && code.includes('}') && code.includes(':')) {
                    // Likely CSS
                    codeStore[`styles${index + 1}.css`] = code;
                }
            });
        }
    }

    /**
     * Save generated code to project directory
     */
    async saveGeneratedCode(userId, codeFiles, sessionId) {
        const savedFiles = [];
        const projectDir = path.join(this.projectsDir, userId, sessionId || 'default');

        // Create project directory
        await fs.mkdir(projectDir, { recursive: true });

        // Save each file
        for (const [filename, content] of Object.entries(codeFiles)) {
            const filePath = path.join(projectDir, filename);
            
            try {
                await fs.writeFile(filePath, content, 'utf8');
                savedFiles.push({
                    filename,
                    path: filePath,
                    size: content.length
                });
                
                this.logger.info(`Saved generated file: ${filename}`);
            } catch (error) {
                this.logger.error(`Failed to save file ${filename}:`, error);
            }
        }

        // Create a manifest file
        const manifest = {
            userId,
            sessionId,
            timestamp: new Date().toISOString(),
            files: savedFiles,
            prompt: 'Component generation session'
        };

        await fs.writeFile(
            path.join(projectDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2),
            'utf8'
        );

        return savedFiles;
    }

    /**
     * Analyze user request for requirements gathering
     */
    async analyzeRequest(apiKey, userRequest) {
        this.setApiKey(apiKey);

        const analysisPrompt = `Analyze this web development request and provide a structured analysis.

Request: "${userRequest}"

Provide a detailed analysis including:
1. Project type and complexity
2. Key features needed
3. Technical requirements
4. Missing information that should be clarified
5. Suggested questions to ask the user

Format your response as a clear, structured analysis.`;

        try {
            const messages = [];
            
            for await (const message of query({
                prompt: analysisPrompt,
                options: {
                    maxTurns: 1,
                    nonInteractive: true
                }
            })) {
                messages.push(message);
            }

            // Parse the analysis from the response
            const analysis = this.parseAnalysis(messages);
            return analysis;

        } catch (error) {
            this.logger.error('Request analysis failed:', error);
            // Return a basic analysis as fallback
            return {
                projectType: 'website',
                complexity: 'moderate',
                keyFeatures: ['responsive design', 'modern UI'],
                missingInfo: ['specific requirements', 'design preferences'],
                suggestedQuestions: [
                    'What is the main purpose of your website?',
                    'Who is your target audience?',
                    'Do you have any design preferences?'
                ]
            };
        }
    }

    /**
     * Parse analysis from Claude's response
     */
    parseAnalysis(messages) {
        const content = messages.map(m => m.content || m.toString()).join('\n');
        
        // Extract key information using patterns
        const analysis = {
            projectType: 'website',
            complexity: 'moderate',
            keyFeatures: [],
            missingInfo: [],
            suggestedQuestions: []
        };

        // Try to extract project type
        const typeMatch = content.match(/project type[:\s]+(\w+)/i);
        if (typeMatch) {
            analysis.projectType = typeMatch[1].toLowerCase();
        }

        // Extract features
        const featuresMatch = content.match(/features?[:\s]+([^.]+)/i);
        if (featuresMatch) {
            analysis.keyFeatures = featuresMatch[1].split(',').map(f => f.trim());
        }

        // Extract questions
        const questionMatches = content.match(/\?/g);
        if (questionMatches) {
            const questions = content.split('\n').filter(line => line.includes('?'));
            analysis.suggestedQuestions = questions.slice(0, 5);
        }

        return analysis;
    }

    /**
     * Generate enhanced brief from Q&A session
     */
    async generateEnhancedBrief(apiKey, originalRequest, questions, answers, analysis) {
        this.setApiKey(apiKey);

        const briefPrompt = `Create a comprehensive project brief based on this information:

Original Request: "${originalRequest}"

Q&A Session:
${questions.map((q, i) => `Q: ${q.question || q}\nA: ${answers[i] || 'No answer'}`).join('\n\n')}

Analysis: ${JSON.stringify(analysis, null, 2)}

Generate a detailed, actionable project brief that includes:
1. Clear project overview
2. Specific requirements and features
3. Technical specifications
4. Design guidelines
5. Success criteria

Make it comprehensive enough that a developer could build exactly what the user wants.`;

        try {
            const messages = [];
            
            for await (const message of query({
                prompt: briefPrompt,
                options: {
                    maxTurns: 1,
                    nonInteractive: true
                }
            })) {
                messages.push(message);
            }

            const enhancedBrief = messages.map(m => m.content || m.toString()).join('\n');

            return {
                originalRequest,
                analysis,
                requirements: this.organizeRequirements(questions, answers),
                enhancedBrief,
                confidence: 'high',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error('Enhanced brief generation failed:', error);
            throw error;
        }
    }

    /**
     * Organize Q&A into requirements structure
     */
    organizeRequirements(questions, answers) {
        const requirements = {
            functional: [],
            technical: [],
            design: [],
            other: []
        };

        questions.forEach((question, index) => {
            const answer = answers[index] || 'No answer provided';
            const q = question.question || question;
            
            // Categorize based on question content
            let category = 'other';
            if (q.toLowerCase().includes('feature') || q.toLowerCase().includes('function')) {
                category = 'functional';
            } else if (q.toLowerCase().includes('tech') || q.toLowerCase().includes('platform')) {
                category = 'technical';
            } else if (q.toLowerCase().includes('design') || q.toLowerCase().includes('style')) {
                category = 'design';
            }
            
            requirements[category].push({
                question: q,
                answer: answer
            });
        });

        return requirements;
    }

    /**
     * Test Claude Code SDK connection
     */
    async testConnection(apiKey) {
        this.setApiKey(apiKey);

        try {
            const messages = [];
            let hasError = false;
            let errorMessage = null;
            
            // Test with a simple prompt
            for await (const message of query({
                prompt: 'Say "Claude Code SDK is working!" and nothing else.',
                options: {
                    maxTurns: 1,
                    nonInteractive: true,
                    timeout: 10000
                }
            })) {
                messages.push(message);
                
                // Check for SDK error messages
                if (message.type === 'result' && message.is_error) {
                    hasError = true;
                    errorMessage = message.result;
                    this.logger.error('Claude SDK test error result:', message);
                }
            }

            // Handle SDK-specific errors
            if (hasError) {
                this.logger.error('SDK error details:', { errorMessage, messages });
                
                if (errorMessage?.includes('Invalid API key')) {
                    return {
                        success: false,
                        message: 'Invalid Anthropic API key. Please check your API key from console.anthropic.com',
                        apiStatus: 'invalid_key',
                        timestamp: new Date().toISOString()
                    };
                }
                return {
                    success: false,
                    message: errorMessage || 'Connection test failed',
                    apiStatus: 'error',
                    timestamp: new Date().toISOString()
                };
            }

            const response = messages.map(m => m.content || m.toString()).join('');
            const isWorking = response.includes('Claude Code SDK is working') || response.includes('working');

            return {
                success: isWorking,
                message: isWorking ? 'Connection successful' : 'Unexpected response',
                apiStatus: isWorking ? 'valid' : 'invalid_response',
                response: response.substring(0, 100),
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error('Claude SDK connection test error:', error);
            
            // Check for specific error types
            if (error.message?.includes('API key') || error.message?.includes('authentication')) {
                return {
                    success: false,
                    message: 'Invalid Anthropic API key. Please check your API key from console.anthropic.com',
                    apiStatus: 'invalid_key',
                    timestamp: new Date().toISOString()
                };
            }
            
            if (error.message?.includes('rate limit')) {
                return {
                    success: false,
                    message: 'Rate limit exceeded. Please try again later.',
                    apiStatus: 'rate_limited',
                    timestamp: new Date().toISOString()
                };
            }
            
            if (error.message?.includes('exited with code')) {
                return {
                    success: false,
                    message: 'Claude Code SDK connection failed. Please check your Anthropic API key.',
                    apiStatus: 'invalid_key',
                    timestamp: new Date().toISOString()
                };
            }

            return {
                success: false,
                message: error.message || 'Connection failed',
                apiStatus: 'error',
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = { ClaudeCodeSDK };