/**
 * Direct Anthropic API Integration
 * Fallback for when Claude Code SDK fails
 */

const https = require('https');

class AnthropicDirect {
    constructor(options = {}) {
        this.apiKey = null;
        this.model = options.model || 'claude-3-haiku-20240307';
        this.logger = options.logger || console;
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    async query(prompt, options = {}) {
        if (!this.apiKey) {
            throw new Error('API key not set');
        }

        const data = JSON.stringify({
            model: this.model,
            max_tokens: options.maxTokens || 4096,
            messages: [{
                role: 'user',
                content: prompt
            }],
            system: options.systemPrompt || undefined
        });

        return new Promise((resolve, reject) => {
            const requestOptions = {
                hostname: 'api.anthropic.com',
                port: 443,
                path: '/v1/messages',
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = https.request(requestOptions, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (res.statusCode !== 200) {
                            if (response.error) {
                                reject(new Error(response.error.message));
                            } else {
                                reject(new Error(`API error: ${res.statusCode}`));
                            }
                            return;
                        }
                        
                        if (response.content && response.content[0]) {
                            resolve({
                                content: response.content[0].text,
                                usage: response.usage,
                                model: response.model
                            });
                        } else {
                            reject(new Error('No content in response'));
                        }
                    } catch (e) {
                        reject(new Error('Failed to parse API response'));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(data);
            req.end();
        });
    }

    async testConnection() {
        try {
            const result = await this.query('Say "API connection successful!" and nothing else.', {
                maxTokens: 50
            });
            
            return {
                success: true,
                message: 'Connection successful',
                apiStatus: 'valid',
                response: result.content,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logger.error('Direct API test error:', error);
            
            if (error.message?.includes('API key')) {
                return {
                    success: false,
                    message: 'Invalid API key',
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

    async generateComponent(prompt, context = {}) {
        const systemPrompt = `You are an expert React developer. Generate clean, modern React components with TypeScript support when requested. Always include proper error handling and follow React best practices.

Format your response with clear file separators like:
--- Button.tsx ---
[component code]
--- Button.css ---
[styles]`;

        try {
            const result = await this.query(prompt, {
                systemPrompt,
                maxTokens: 4096
            });

            // Extract code blocks
            const codeFiles = {};
            const filePattern = /---\s*(.+?)\s*---\s*\n([\s\S]*?)(?=---|$)/g;
            let match;

            while ((match = filePattern.exec(result.content)) !== null) {
                const filename = match[1].trim();
                const code = match[2].trim();
                if (filename && code) {
                    codeFiles[filename] = code;
                }
            }

            return {
                success: true,
                files: codeFiles,
                content: result.content,
                usage: result.usage
            };

        } catch (error) {
            this.logger.error('Component generation error:', error);
            throw error;
        }
    }
}

module.exports = { AnthropicDirect };