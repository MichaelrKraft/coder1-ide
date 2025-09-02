/**
 * Error Doctor Service - AI-Powered Error Analysis and Auto-Fix
 * 
 * Analyzes terminal errors, code errors, and runtime issues to provide
 * intelligent fix suggestions and automatic resolution capabilities.
 */

const { OpenAI } = require('openai');

class ErrorDoctorService {
    constructor(options = {}) {
        this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        }) : null;
        
        // DISABLED: Direct Anthropic SDK usage to prevent API charges
        // Use Claude Code CLI only to utilize Claude Code Max Plan
        this.anthropic = null;
        
        this.logger = options.logger || console;
        this.isEnabled = process.env.ENABLE_ERROR_DOCTOR !== 'false';
        
        // Dynamic state management - can be overridden by API toggle
        this.dynamicEnabled = true; // Default to enabled, can be toggled by user
        
        // Common error patterns and their fixes
        this.commonErrors = new Map([
            ['module not found', this.handleModuleNotFound],
            ['syntax error', this.handleSyntaxError],
            ['cannot find module', this.handleModuleNotFound],
            ['unexpected token', this.handleSyntaxError],
            ['reference error', this.handleReferenceError],
            ['type error', this.handleTypeError],
            ['permission denied', this.handlePermissionError],
            ['enoent', this.handleFileNotFound],
            ['port already in use', this.handlePortInUse],
            ['command not found', this.handleCommandNotFound]
        ]);
    }

    /**
     * Analyze an error and provide fix suggestions
     */
    async analyzeError(errorData) {
        if (!this.isEnabled || !this.dynamicEnabled) {
            const reason = !this.isEnabled ? 'Error Doctor is disabled by environment' : 'Error Doctor is disabled by user toggle';
            return { success: false, error: reason };
        }

        try {
            const {
                errorText,
                errorType = 'unknown',
                context = {},
                filePath,
                lineNumber,
                columnNumber,
                stackTrace
            } = errorData;

            this.logger.log('🔍 Error Doctor: Analyzing error:', errorText.substring(0, 100) + '...');

            // First try common error patterns for instant fixes
            const quickFix = this.tryQuickFix(errorText, context);
            if (quickFix.success) {
                this.logger.log('⚡ Quick fix found:', quickFix.fixes[0].title);
                return quickFix;
            }

            // For complex errors, use AI analysis
            const aiAnalysis = await this.performAIAnalysis(errorText, context, {
                filePath,
                lineNumber,
                columnNumber,
                stackTrace
            });

            return aiAnalysis;

        } catch (error) {
            this.logger.error('❌ Error Doctor analysis failed:', error);
            return {
                success: false,
                error: 'Error analysis failed',
                details: error.message
            };
        }
    }

    /**
     * Try to find quick fixes for common errors
     */
    tryQuickFix(errorText, context) {
        // Skip processing if this looks like Claude's normal output
        if (errorText.includes('Saving session') || 
            errorText.includes('Claude Code CLI') || 
            errorText.includes('interrupt)') ||
            errorText.includes('Germinating') ||
            errorText.includes('Smooshing')) {
            return { success: false };
        }
        
        const lowerError = errorText.toLowerCase();
        
        for (const [pattern, handler] of this.commonErrors) {
            if (lowerError.includes(pattern)) {
                const fix = handler.call(this, errorText, context);
                if (fix) {
                    return {
                        success: true,
                        source: 'quick-fix',
                        confidence: 'high',
                        fixes: [fix]
                    };
                }
            }
        }

        return { success: false };
    }

    /**
     * Use AI to analyze complex errors
     */
    async performAIAnalysis(errorText, context, errorLocation) {
        try {
            const analysisPrompt = this.buildAnalysisPrompt(errorText, context, errorLocation);
            
            let response;
            
            // Use Claude Code CLI for code analysis, fallback to OpenAI
            if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
                try {
                    const claudeCodeCommand = `echo "${analysisPrompt.replace(/"/g, '\\"')}" | claude --max-tokens 1000`;
                    const { exec } = require('child_process');
                    const { promisify } = require('util');
                    const execAsync = promisify(exec);
                    
                    const { stdout } = await execAsync(claudeCodeCommand, { 
                        timeout: 30000,
                        env: { ...process.env }
                    });
                    
                    const analysis = this.parseAIResponse(stdout);
                    return {
                        success: true,
                        source: 'claude-code-cli',
                        confidence: analysis.confidence,
                        fixes: analysis.fixes,
                        explanation: analysis.explanation
                    };
                } catch (cliError) {
                    this.logger.warn('❌ Claude Code CLI failed for error analysis:', cliError.message);
                    // Fall through to OpenAI if available
                }
            }
            
            if (this.openai) {
                response = await this.openai.chat.completions.create({
                    model: 'gpt-3.5-turbo',
                    max_tokens: 1000,
                    messages: [{
                        role: 'system',
                        content: 'You are an expert debugging assistant. Analyze errors and provide specific, actionable fixes.'
                    }, {
                        role: 'user',
                        content: analysisPrompt
                    }]
                });
                
                const analysis = this.parseAIResponse(response.choices[0].message.content);
                return {
                    success: true,
                    source: 'openai',
                    confidence: analysis.confidence,
                    fixes: analysis.fixes,
                    explanation: analysis.explanation
                };
            } else {
                return {
                    success: false,
                    error: 'No AI service available',
                    fixes: [{
                        title: 'AI Analysis Unavailable',
                        description: 'Configure OPENAI_API_KEY or ensure Claude Code CLI is available for AI-powered error analysis',
                        command: null,
                        confidence: 'low'
                    }]
                };
            }
        } catch (error) {
            this.logger.error('❌ AI analysis failed:', error);
            return {
                success: false,
                error: 'AI analysis failed',
                details: error.message
            };
        }
    }

    /**
     * Build comprehensive prompt for AI analysis
     */
    buildAnalysisPrompt(errorText, context, errorLocation) {
        let prompt = `Analyze this error and provide 2-3 specific fix suggestions:

ERROR:
${errorText}

CONTEXT:
- Working Directory: ${context.workingDirectory || 'unknown'}
- File: ${errorLocation.filePath || 'unknown'}
- Line: ${errorLocation.lineNumber || 'unknown'}
- Package.json exists: ${context.hasPackageJson ? 'yes' : 'no'}
- Node version: ${context.nodeVersion || 'unknown'}`;

        if (context.recentCommands) {
            prompt += `\nRECENT COMMANDS:\n${context.recentCommands.slice(-3).join('\n')}`;
        }

        if (errorLocation.stackTrace) {
            prompt += `\nSTACK TRACE:\n${errorLocation.stackTrace.substring(0, 500)}`;
        }

        prompt += `

Please respond in this JSON format:
{
  "confidence": "high|medium|low",
  "explanation": "Brief explanation of what's wrong",
  "fixes": [
    {
      "title": "Fix title (under 50 chars)",
      "description": "What this fix does",
      "command": "exact command to run (or null)",
      "confidence": "high|medium|low",
      "requiresFileEdit": false
    }
  ]
}`;

        return prompt;
    }

    /**
     * Parse AI response into structured format
     */
    parseAIResponse(responseText) {
        try {
            // Try to extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    confidence: parsed.confidence || 'medium',
                    explanation: parsed.explanation || 'Error analysis completed',
                    fixes: parsed.fixes || []
                };
            }
        } catch (error) {
            this.logger.warn('Failed to parse AI JSON response, using fallback');
        }

        // Fallback parsing for non-JSON responses
        return {
            confidence: 'medium',
            explanation: responseText.substring(0, 200),
            fixes: [{
                title: 'AI Suggestion',
                description: responseText.substring(0, 150) + '...',
                command: null,
                confidence: 'medium'
            }]
        };
    }

    // Quick fix handlers for common errors

    handleModuleNotFound(errorText, context) {
        const moduleMatch = errorText.match(/cannot find module ['"]([^'"]+)['"]/i);
        if (moduleMatch) {
            const moduleName = moduleMatch[1];
            const isRelative = moduleName.startsWith('./') || moduleName.startsWith('../');
            
            if (isRelative) {
                return {
                    title: 'Fix file path',
                    description: `Check if the file ${moduleName} exists and the path is correct`,
                    command: `ls -la ${moduleName}`,
                    confidence: 'medium'
                };
            } else {
                return {
                    title: 'Install missing package',
                    description: `Install the missing package ${moduleName}`,
                    command: `npm install ${moduleName}`,
                    confidence: 'high'
                };
            }
        }
        return null;
    }

    handleSyntaxError(errorText, context) {
        if (errorText.includes('unexpected token')) {
            return {
                title: 'Fix syntax error',
                description: 'Check for missing brackets, quotes, or semicolons',
                command: null,
                confidence: 'medium'
            };
        }
        return null;
    }

    handleReferenceError(errorText, context) {
        const varMatch = errorText.match(/(\w+) is not defined/i);
        if (varMatch) {
            const varName = varMatch[1];
            return {
                title: 'Define missing variable',
                description: `The variable '${varName}' is not defined. Check spelling or add declaration.`,
                command: null,
                confidence: 'high'
            };
        }
        return null;
    }

    handleTypeError(errorText, context) {
        if (errorText.includes('cannot read property')) {
            return {
                title: 'Fix null/undefined access',
                description: 'Add null check before accessing property',
                command: null,
                confidence: 'medium'
            };
        }
        return null;
    }

    handlePermissionError(errorText, context) {
        if (errorText.includes('EACCES') || errorText.includes('permission denied')) {
            return {
                title: 'Fix permissions',
                description: 'Run with sudo or fix file permissions',
                command: 'sudo chmod +x',
                confidence: 'medium'
            };
        }
        return null;
    }

    handleFileNotFound(errorText, context) {
        const fileMatch = errorText.match(/ENOENT.*'([^']+)'/);
        if (fileMatch) {
            const fileName = fileMatch[1];
            return {
                title: 'Create missing file',
                description: `Create the missing file: ${fileName}`,
                command: `touch ${fileName}`,
                confidence: 'medium'
            };
        }
        return null;
    }

    handlePortInUse(errorText, context) {
        const portMatch = errorText.match(/port (\d+)/i);
        if (portMatch) {
            const port = portMatch[1];
            return {
                title: 'Kill process using port',
                description: `Stop the process using port ${port}`,
                command: `lsof -ti:${port} | xargs kill -9`,
                confidence: 'high'
            };
        }
        return null;
    }

    handleCommandNotFound(errorText, context) {
        // Be more specific about what constitutes a "command not found" error
        // Exclude Claude's normal output and partial words
        if (errorText.includes('Saving session') || 
            errorText.includes('Claude Code CLI') || 
            errorText.includes('interrupt)')) {
            return null; // Not a real command error
        }
        
        const cmdMatch = errorText.match(/(?:bash:|sh:)\s*(\w+):\s*command not found/i) ||
                         errorText.match(/(\w+):\s*command not found/i);
        
        if (cmdMatch) {
            const command = cmdMatch[1];
            
            // Filter out obviously invalid commands or partial text
            if (command.length < 2 || 
                ['Saving', 'session', 'Germinating', 'Smooshing'].includes(command)) {
                return null; // Not a real command
            }
            
            const suggestions = {
                'node': 'Install Node.js from nodejs.org',
                'npm': 'Install Node.js (includes npm)',
                'git': 'Install Git',
                'python': 'Install Python',
                'pip': 'Install Python (includes pip)',
                'claude': 'Install Claude Code CLI from https://claude.ai/code'
            };
            
            return {
                title: `Install ${command}`,
                description: suggestions[command] || `Install the ${command} command`,
                command: null,
                confidence: 'high'
            };
        }
        return null;
    }

    /**
     * Apply a suggested fix
     */
    async applyFix(fixData) {
        try {
            const { command, filePath, fileContent, type } = fixData;
            
            if (type === 'command' && command) {
                // Return command to be executed in terminal
                return {
                    success: true,
                    action: 'execute_command',
                    command: command,
                    message: `Execute: ${command}`
                };
            } else if (type === 'file_edit' && filePath && fileContent) {
                // Return file edit instructions
                return {
                    success: true,
                    action: 'edit_file',
                    filePath: filePath,
                    content: fileContent,
                    message: `Update file: ${filePath}`
                };
            } else {
                return {
                    success: false,
                    error: 'Invalid fix data',
                    message: 'This fix requires manual intervention'
                };
            }
        } catch (error) {
            this.logger.error('❌ Fix application failed:', error);
            return {
                success: false,
                error: 'Fix application failed',
                details: error.message
            };
        }
    }

    /**
     * Get error context from current environment
     */
    async getErrorContext(workingDirectory) {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            const context = {
                workingDirectory,
                hasPackageJson: false,
                nodeVersion: process.version,
                timestamp: new Date().toISOString()
            };
            
            // Check for package.json
            try {
                await fs.access(path.join(workingDirectory, 'package.json'));
                context.hasPackageJson = true;
                
                // Read package.json for dependencies info
                const packageJson = JSON.parse(
                    await fs.readFile(path.join(workingDirectory, 'package.json'), 'utf8')
                );
                context.dependencies = Object.keys(packageJson.dependencies || {});
                context.devDependencies = Object.keys(packageJson.devDependencies || {});
            } catch (error) {
                // package.json doesn't exist
            }
            
            return context;
        } catch (error) {
            this.logger.error('Failed to get error context:', error);
            return {
                workingDirectory,
                nodeVersion: process.version,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * Set dynamic enabled state (for user toggle)
     */
    setDynamicEnabled(enabled) {
        this.dynamicEnabled = enabled;
        this.logger.log(`🔧 ErrorDoctorService: Dynamic state set to ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Get current enabled state (combines environment and dynamic)
     */
    getCurrentEnabledState() {
        return {
            environmentEnabled: this.isEnabled,
            dynamicEnabled: this.dynamicEnabled,
            fullyEnabled: this.isEnabled && this.dynamicEnabled
        };
    }
    
    /**
     * Check if Error Doctor is currently enabled
     */
    isCurrentlyEnabled() {
        return this.isEnabled && this.dynamicEnabled;
    }
}

module.exports = ErrorDoctorService;