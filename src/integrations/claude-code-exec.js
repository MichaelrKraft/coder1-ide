/**
 * Claude Code CLI Execution Integration
 * 
 * Uses the installed Claude Code CLI instead of direct API calls
 * This leverages the user's existing Claude Code authentication
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');

class ClaudeCodeExec extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.logger = options.logger || console;
        // Longer timeout for implementation work vs consultation
        this.timeout = options.timeout || (options.implementationMode ? 600000 : 300000); // 10 vs 5 minutes
        this.claudePath = options.claudePath || 'claude';
        this.implementationMode = options.implementationMode || true; // Default to implementation
    }

    /**
     * Execute Claude Code CLI with a prompt
     * @param {string} prompt - The prompt to send to Claude
     * @param {Object} options - Additional options
     * @returns {Promise<string>} Claude's response
     */
    async executePrompt(prompt, options = {}) {
        return new Promise((resolve, reject) => {
            const { systemPrompt, model, maxTokens } = options;
            
            // Prepare the full prompt
            let fullPrompt = prompt;
            if (systemPrompt) {
                fullPrompt = `System: ${systemPrompt}\n\nUser: ${prompt}`;
            }

            this.logger.info('🤖 Executing Claude Code CLI...');
            this.logger.info(`📝 Prompt length: ${fullPrompt.length} characters`);
            
            // Use temp file to avoid escaping issues with complex prompts
            const fs = require('fs');
            const path = require('path');
            const os = require('os');
            const tempFile = path.join(os.tmpdir(), `claude-prompt-${Date.now()}.txt`);
            
            // Write prompt to temp file
            try {
                fs.writeFileSync(tempFile, fullPrompt, 'utf8');
            } catch (writeErr) {
                this.logger.error('Failed to write prompt to temp file:', writeErr);
                reject(writeErr);
                return;
            }
            
            // Remove ANTHROPIC_API_KEY from environment to use CLI auth
            const cleanEnv = { ...process.env };
            delete cleanEnv.ANTHROPIC_API_KEY;
            delete cleanEnv.CLAUDE_API_KEY;
            
            // Use cat to pipe file content to Claude CLI
            const shellCommand = `cat "${tempFile}" | ${this.claudePath}`;
            
            const claudeProcess = spawn('sh', ['-c', shellCommand], {
                env: cleanEnv,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';
            let hasResponded = false;

            // Set timeout
            const timeoutId = setTimeout(() => {
                if (!hasResponded) {
                    claudeProcess.kill();
                    reject(new Error('Claude Code CLI timeout'));
                }
            }, this.timeout);

            // Handle stdout
            claudeProcess.stdout.on('data', (data) => {
                const chunk = data.toString();
                output += chunk;
                this.emit('data', chunk);
                this.logger.info(`📤 Claude output chunk: ${chunk.substring(0, 100)}...`);
            });

            // Handle stderr
            claudeProcess.stderr.on('data', (data) => {
                const chunk = data.toString();
                errorOutput += chunk;
                this.emit('error-data', chunk);
                this.logger.error(`❌ Claude stderr: ${chunk}`);
            });

            // Handle process exit
            claudeProcess.on('close', (code) => {
                clearTimeout(timeoutId);
                hasResponded = true;
                
                // Clean up temp file
                try {
                    fs.unlinkSync(tempFile);
                } catch (cleanupErr) {
                    // Ignore cleanup errors
                }

                if (code !== 0) {
                    this.logger.error('Claude Code CLI error:', { code, errorOutput });
                    reject(new Error(`Claude Code CLI exited with code ${code}: ${errorOutput}`));
                } else {
                    this.logger.info('✅ Claude Code CLI response received');
                    resolve(output);
                }
            });

            // Handle process error
            claudeProcess.on('error', (err) => {
                clearTimeout(timeoutId);
                hasResponded = true;
                
                // Clean up temp file
                try {
                    fs.unlinkSync(tempFile);
                } catch (cleanupErr) {
                    // Ignore cleanup errors
                }
                
                this.logger.error('Failed to spawn Claude Code CLI:', err);
                reject(err);
            });
        });
    }

    /**
     * Execute parallel agents using Claude Code's native sub-agents
     * @param {string} prompt - The main prompt
     * @param {Array} agents - Array of agent configurations or names
     * @returns {Promise<Array>} Array of agent responses
     */
    async executeParallelAgents(prompt, agents = []) {
        // Default to our standard three agents
        const defaultAgentNames = ['architect', 'implementer', 'optimizer'];
        
        // If agents are provided as strings, use them; otherwise extract names
        const agentNames = agents.length > 0 
            ? (typeof agents[0] === 'string' ? agents : agents.map(a => a.name.toLowerCase()))
            : defaultAgentNames;
        
        this.logger.info(`🤖 Delegating to ${agentNames.length} sub-agents: ${agentNames.join(', ')}`);

        // Create delegation prompt for Claude Code
        const delegationPrompt = this.createSubAgentDelegationPrompt(prompt, agentNames);
        
        try {
            // Single CLI call with delegation to sub-agents
            const response = await this.executePrompt(delegationPrompt);
            
            // Parse the response to extract individual agent outputs
            const results = this.parseSubAgentResponses(response, agentNames);
            
            this.logger.info('✅ Sub-agent delegation completed');
            return results;
        } catch (error) {
            this.logger.error('Sub-agent delegation failed:', error);
            // Fallback to sequential execution if delegation fails
            return this.executeSequentialAgents(prompt, agentNames);
        }
    }

    /**
     * Create delegation prompt that triggers Claude Code's automatic subagent selection
     * @param {string} prompt - The main task prompt  
     * @param {Array} agentNames - Array of agent names to delegate to
     * @returns {string} Formatted delegation prompt
     */
    createSubAgentDelegationPrompt(prompt, agentNames) {
        // Simplest possible prompt - just the task with implementation emphasis
        // Claude CLI might be having issues with complex prompts
        return `${prompt}

Please implement this by creating actual working code files. Do not provide suggestions or advice - create the actual implementation directly.`;
    }

    /**
     * Execute Claude Code with automatic subagent delegation
     * @param {string} prompt - The main task prompt
     * @param {Array} agentNames - Array of agent names that should be triggered
     * @returns {Promise<Object>} Claude Code response with subagent work
     */
    async executeWithSubAgentDelegation(prompt, agentNames) {
        try {
            const delegationPrompt = this.createSubAgentDelegationPrompt(prompt, agentNames);
            this.logger.info('🤖 Delegating to Claude Code with subagent awareness...');
            this.logger.info(`📝 Expected subagents: ${agentNames.join(', ')}`);
            
            const response = await this.executePrompt(delegationPrompt);
            
            return {
                success: true,
                response: response,
                expectedAgents: agentNames,
                delegationType: 'automatic-subagent-delegation'
            };
        } catch (error) {
            this.logger.error('Failed to execute subagent delegation:', error);
            return {
                success: false,
                response: `Error: Failed to execute subagent delegation - ${error.message}`,
                expectedAgents: agentNames,
                delegationType: 'automatic-subagent-delegation'
            };
        }
    }

    /**
     * Parse sub-agent responses from delegation output
     * @param {string} response - The full response from Claude
     * @param {Array} agentNames - Expected agent names
     * @returns {Array} Parsed agent responses
     */
    parseSubAgentResponses(response, agentNames) {
        // Verify implementation vs consultation
        const implementationEvidence = ['created file', 'modified', 'wrote to', 'implemented', 'built', 'added', 'generated'];
        const consultationLanguage = ['suggest', 'recommend', 'consider', 'you could', 'here\'s how', 'would be', 'might want'];
        
        const hasImplementation = implementationEvidence.some(keyword => 
            response.toLowerCase().includes(keyword)
        );
        const hasConsultation = consultationLanguage.some(phrase => 
            response.toLowerCase().includes(phrase)
        );
        
        if (hasConsultation && !hasImplementation) {
            this.logger.warn('⚠️ Response appears to be consultation, not implementation');
            this.logger.warn('💡 Consider strengthening implementation requirements in prompt');
        }
        
        const results = [];
        
        // Try to parse structured responses
        for (const agentName of agentNames) {
            const agentSection = this.extractAgentSection(response, agentName);
            results.push({
                agent: agentName,
                role: this.getAgentRole(agentName),
                response: agentSection || 'No specific response found',
                success: !!agentSection,
                isImplementation: hasImplementation
            });
        }
        
        // If no structured responses found, return the whole response
        if (results.every(r => !r.success)) {
            results[0] = {
                agent: 'combined',
                role: 'All agents',
                response: response,
                success: true,
                isImplementation: hasImplementation
            };
        }
        
        return results;
    }

    /**
     * Extract a specific agent's section from the response
     * @param {string} response - Full response text
     * @param {string} agentName - Agent name to extract
     * @returns {string|null} Extracted section or null
     */
    extractAgentSection(response, agentName) {
        // Look for patterns like [Agent: architect] or **Architect:**
        const patterns = [
            new RegExp(`\\[${agentName}\\]([\\s\\S]*?)(?=\\[|$)`, 'i'),
            new RegExp(`\\*\\*${agentName}:\\*\\*([\\s\\S]*?)(?=\\*\\*|$)`, 'i'),
            new RegExp(`${agentName}:([\\s\\S]*?)(?=\\n[A-Z]|$)`, 'i')
        ];
        
        for (const pattern of patterns) {
            const match = response.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        
        return null;
    }

    /**
     * Get the role description for an agent
     * @param {string} agentName - Name of the agent
     * @returns {string} Role description
     */
    getAgentRole(agentName) {
        const roles = {
            'architect': 'System design and structure',
            'implementer': 'Core implementation',
            'optimizer': 'Performance and best practices',
            'frontend-specialist': 'UI/UX and React development',
            'backend-specialist': 'API and server logic',
            'debugger': 'Issue analysis and debugging'
        };
        
        return roles[agentName] || 'Specialized assistance';
    }

    /**
     * Fallback: Execute agents sequentially if delegation fails
     * @param {string} prompt - The main prompt
     * @param {Array} agentNames - Array of agent names
     * @returns {Promise<Array>} Array of agent responses
     */
    async executeSequentialAgents(prompt, agentNames) {
        this.logger.warn('Falling back to sequential agent execution');
        const results = [];
        
        for (const agentName of agentNames) {
            try {
                const agentPrompt = `As a ${agentName} specialist, ${prompt}`;
                const response = await this.executePrompt(agentPrompt);
                
                results.push({
                    agent: agentName,
                    role: this.getAgentRole(agentName),
                    response: response,
                    success: true
                });
            } catch (error) {
                results.push({
                    agent: agentName,
                    role: this.getAgentRole(agentName),
                    response: `Error: ${error.message}`,
                    success: false
                });
            }
        }
        
        return results;
    }

    /**
     * Test Claude Code CLI connection
     * @returns {Promise<Object>} Test result
     */
    async testConnection() {
        try {
            const testPrompt = 'Say "Claude Code CLI is working!" and nothing else.';
            const response = await this.executePrompt(testPrompt, { timeout: 5000 });
            
            const isWorking = response.includes('Claude Code CLI is working') || 
                              response.includes('working');

            return {
                success: isWorking,
                message: isWorking ? 'Claude Code CLI connection successful' : 'Unexpected response',
                response: response.substring(0, 200),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                message: `Claude Code CLI test failed: ${error.message}`,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Check if Claude Code CLI is available and authenticated
     * @returns {Promise<boolean>}
     */
    async isAvailable() {
        try {
            // Simple check - try to run claude with --version
            return new Promise((resolve) => {
                // Clean environment for CLI auth
                const cleanEnv = { ...process.env };
                delete cleanEnv.ANTHROPIC_API_KEY;
                delete cleanEnv.CLAUDE_API_KEY;
                
                const checkProcess = spawn(this.claudePath, ['--version'], {
                    env: cleanEnv,
                    timeout: 2000
                });
                
                let output = '';
                
                checkProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                checkProcess.on('close', (code) => {
                    // If claude --version works, CLI is available
                    // Check for either "Claude Code" or just the version number pattern
                    const isAvailable = code === 0 && (output.includes('Claude Code') || /\d+\.\d+\.\d+/.test(output));
                    console.log(`[ClaudeCodeExec] CLI availability check: code=${code}, output="${output.trim()}", isAvailable=${isAvailable}`);
                    resolve(isAvailable);
                });
                
                checkProcess.on('error', (err) => {
                    this.logger.error('Claude CLI check error:', err);
                    resolve(false);
                });
                
                // Timeout fallback
                setTimeout(() => {
                    checkProcess.kill();
                    resolve(false);
                }, 2000);
            });
        } catch (error) {
            this.logger.error('Error checking Claude CLI availability:', error);
            return false;
        }
    }
}

module.exports = ClaudeCodeExec;