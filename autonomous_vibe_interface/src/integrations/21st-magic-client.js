/**
 * 21st.dev Magic MCP Client Integration
 * 
 * This service integrates 21st.dev Magic MCP functionality into our web-based IDE
 * by acting as an MCP client that communicates with the Magic server.
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs').promises;

class Magic21stClient extends EventEmitter {
    constructor(options = {}) {
        super();
        this.apiKey = options.apiKey || process.env.MAGIC_21ST_API_KEY;
        this.isConnected = false;
        this.mcpProcess = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
    }

    /**
     * Initialize the Magic MCP server connection
     */
    async initialize() {
        try {
            console.log('21st Magic: Initializing MCP client...');
            
            if (!this.apiKey) {
                throw new Error('21st.dev Magic API key not configured. Set MAGIC_21ST_API_KEY environment variable.');
            }

            // Start the MCP server process
            await this.startMcpServer();
            
            this.isConnected = true;
            console.log('21st Magic: Successfully connected to MCP server');
            
            return { success: true, message: 'Connected to 21st.dev Magic' };
        } catch (error) {
            console.error('21st Magic: Failed to initialize:', error);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Start the MCP server process
     */
    async startMcpServer() {
        return new Promise((resolve, reject) => {
            // Start the Magic MCP server
            this.mcpProcess = spawn('npx', ['-y', '@21st-dev/magic@latest'], {
                env: {
                    ...process.env,
                    API_KEY: this.apiKey
                },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let initialized = false;

            this.mcpProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log('21st Magic MCP:', output);
                
                if (!initialized && output.includes('Starting server')) {
                    initialized = true;
                    resolve();
                }
                
                this.handleMcpMessage(output);
            });

            this.mcpProcess.stderr.on('data', (data) => {
                console.error('21st Magic MCP Error:', data.toString());
            });

            this.mcpProcess.on('close', (code) => {
                console.log(`21st Magic MCP process exited with code ${code}`);
                this.isConnected = false;
                this.mcpProcess = null;
            });

            this.mcpProcess.on('error', (error) => {
                console.error('21st Magic MCP Process Error:', error);
                if (!initialized) {
                    reject(error);
                }
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!initialized) {
                    reject(new Error('MCP server failed to start within timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Handle messages from the MCP server
     */
    handleMcpMessage(message) {
        try {
            // Parse JSON RPC messages if they exist in the output
            const lines = message.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                if (line.startsWith('{') && line.endsWith('}')) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.id && this.pendingRequests.has(parsed.id)) {
                            const { resolve, reject } = this.pendingRequests.get(parsed.id);
                            this.pendingRequests.delete(parsed.id);
                            
                            if (parsed.error) {
                                reject(new Error(parsed.error.message || 'MCP request failed'));
                            } else {
                                resolve(parsed.result);
                            }
                        }
                    } catch (parseError) {
                        // Not a JSON message, ignore
                    }
                }
            }
        } catch (error) {
            console.error('21st Magic: Error handling MCP message:', error);
        }
    }

    /**
     * Send an MCP request to the server
     */
    async sendMcpRequest(method, params = {}) {
        if (!this.isConnected || !this.mcpProcess) {
            throw new Error('MCP server not connected');
        }

        const requestId = ++this.requestId;
        const request = {
            jsonrpc: '2.0',
            id: requestId,
            method,
            params
        };

        return new Promise((resolve, reject) => {
            // Store the promise handlers
            this.pendingRequests.set(requestId, { resolve, reject });

            // Send the request
            this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');

            // Timeout after 5 seconds for component generation (was 120 seconds)
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error('MCP request timeout'));
                }
            }, 5000);
        });
    }

    /**
     * Create a UI component using 21st.dev Magic with UI progress callbacks
     */
    async createUiComponent(options, onProgress = null) {
        try {
            const {
                message,
                searchQuery,
                currentFilePath = '/src/components/NewComponent.tsx',
                projectDirectory = process.cwd(),
                standaloneRequestQuery
            } = options;

            console.log('21st Magic: Creating UI component...', { message, searchQuery });

            // Notify UI of initialization
            onProgress?.({ 
                status: 'generating', 
                message: '🔧 Initializing Magic MCP...' 
            });

            // Check if we need to reconnect due to port issues
            if (!this.isReady()) {
                console.log('21st Magic: Client not ready, reinitializing...');
                onProgress?.({ 
                    status: 'generating', 
                    message: '🔄 Connecting to Magic server...' 
                });
                
                await this.disconnect();
                await this.initialize();
            }

            // Notify UI of generation start
            onProgress?.({ 
                status: 'generating', 
                message: '✨ Generating component with AI...' 
            });

            // Try different tool names as MCP servers may vary
            let result;
            const toolNames = ['create_ui_component', 'magic_create_ui_component', '21st_magic_component_builder'];
            let lastError;
            
            for (const toolName of toolNames) {
                try {
                    console.log(`21st Magic: Trying MCP tool: ${toolName}`);
                    result = await this.sendMcpRequest('tools/call', {
                        name: toolName,
                        arguments: {
                            message,
                            searchQuery,
                            absolutePathToCurrentFile: path.resolve(projectDirectory, currentFilePath.replace(/^\//, '')),
                            absolutePathToProjectDirectory: path.resolve(projectDirectory),
                            standaloneRequestQuery: standaloneRequestQuery || message
                        }
                    });
                    
                    if (result) {
                        console.log(`21st Magic: Success with tool: ${toolName}`);
                        break;
                    }
                } catch (error) {
                    console.log(`21st Magic: Tool ${toolName} failed:`, error.message);
                    lastError = error;
                }
            }
            
            if (!result) {
                throw lastError || new Error('All MCP tool names failed');
            }

            // Notify UI of processing
            onProgress?.({ 
                status: 'generating', 
                message: '🎨 Processing generated component...' 
            });

            // Parse the actual component code from the result
            let componentCode = result.content;
            if (Array.isArray(result.content)) {
                componentCode = result.content.map(item => item.text || item.content || item).join('\n');
            }

            // Extract actual React component from the response
            if (typeof componentCode === 'string' && componentCode.includes('[object Object]')) {
                // If we get [object Object], it means the response parsing failed
                throw new Error('Invalid component response format');
            }

            // Notify UI of successful completion
            onProgress?.({ 
                status: 'complete', 
                message: '🎉 Component generated successfully!' 
            });

            return {
                success: true,
                componentCode: componentCode,
                name: this.extractComponentName(componentCode) || 'MagicComponent',
                explanation: 'Component generated by REAL 21st.dev Magic',
                metadata: {
                    source: 'REAL 21st.dev Magic',
                    searchQuery,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('21st Magic: Failed to create UI component:', error);
            
            // Notify UI of error
            onProgress?.({ 
                status: 'error', 
                message: `❌ Magic failed: ${error.message}` 
            });
            
            // Return fallback component if Magic fails
            return this.createFallbackComponent(options);
        }
    }

    /**
     * Search for logos using 21st.dev Magic
     */
    async searchLogos(query) {
        try {
            const result = await this.sendMcpRequest('tools/call', {
                name: 'logo_search',
                arguments: {
                    query
                }
            });

            return {
                success: true,
                logos: result.content,
                source: '21st.dev Magic + SVGL'
            };
        } catch (error) {
            console.error('21st Magic: Failed to search logos:', error);
            return {
                success: false,
                error: error.message,
                logos: []
            };
        }
    }

    /**
     * Refine an existing UI component
     */
    async refineUiComponent(options) {
        try {
            const {
                currentCode,
                refinementRequest,
                currentFilePath = '/src/components/Component.tsx',
                projectDirectory = process.cwd()
            } = options;

            const result = await this.sendMcpRequest('tools/call', {
                name: '21st_magic_refine_ui',
                arguments: {
                    currentCode,
                    refinementRequest,
                    absolutePathToCurrentFile: path.resolve(projectDirectory, currentFilePath.replace(/^\//, '')),
                    absolutePathToProjectDirectory: path.resolve(projectDirectory)
                }
            });

            return {
                success: true,
                refinedCode: result.content,
                explanation: 'Component refined by 21st.dev Magic'
            };
        } catch (error) {
            console.error('21st Magic: Failed to refine UI component:', error);
            throw error;
        }
    }

    /**
     * Create a fallback component when Magic is unavailable
     */
    createFallbackComponent(options) {
        const { message, searchQuery } = options;
        
        // Generate a basic React component as fallback (JavaScript, not TypeScript)
        const componentName = this.generateComponentName(searchQuery || message);
        const componentCode = `import React from 'react';

const ${componentName} = ({ 
  className = "",
  children 
}) => {
  return (
    <div className={\`${this.generateTailwindClasses(message)} \${className}\`}>
      {children || "${this.generatePlaceholderText(message)}"}
    </div>
  );
};

export default ${componentName};`;

        return {
            success: true,
            componentCode,
            explanation: 'Fallback component generated (21st.dev Magic unavailable)',
            metadata: {
                source: 'Fallback Generator',
                fallback: true,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Generate component name from search query
     */
    generateComponentName(query) {
        return query
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('')
            .replace(/^./, match => match.toUpperCase()) || 'CustomComponent';
    }

    /**
     * Generate basic Tailwind classes based on component type
     */
    generateTailwindClasses(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('button')) {
            return 'inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors';
        } else if (lowerMessage.includes('card')) {
            return 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
        } else if (lowerMessage.includes('input')) {
            return 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
        } else if (lowerMessage.includes('nav')) {
            return 'flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4';
        } else {
            return 'p-4 bg-gray-50 border border-gray-200 rounded-md';
        }
    }

    /**
     * Generate placeholder text based on component type
     */
    generatePlaceholderText(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('button')) {
            return 'Click me';
        } else if (lowerMessage.includes('nav')) {
            return 'Navigation';
        } else if (lowerMessage.includes('card')) {
            return 'Card Content';
        } else {
            return 'Component Content';
        }
    }

    /**
     * Extract component name from generated code
     */
    extractComponentName(code) {
        try {
            // Look for function component pattern: const ComponentName = 
            const functionMatch = code.match(/(?:const|let|var)\s+(\w+)\s*=/);
            if (functionMatch) return functionMatch[1];
            
            // Look for function declaration pattern: function ComponentName
            const funcDeclMatch = code.match(/function\s+(\w+)/);
            if (funcDeclMatch) return funcDeclMatch[1];
            
            // Look for export default pattern
            const exportMatch = code.match(/export\s+(?:default\s+)?(?:const|let|var|function)?\s*(\w+)/);
            if (exportMatch) return exportMatch[1];
            
            return null;
        } catch (error) {
            console.warn('Failed to extract component name:', error);
            return null;
        }
    }

    /**
     * Check if the Magic client is connected and ready
     */
    isReady() {
        return this.isConnected && this.mcpProcess && !this.mcpProcess.killed;
    }

    /**
     * Disconnect from the MCP server
     */
    async disconnect() {
        if (this.mcpProcess && !this.mcpProcess.killed) {
            this.mcpProcess.kill('SIGTERM');
            this.mcpProcess = null;
        }
        
        this.isConnected = false;
        this.pendingRequests.clear();
        
        console.log('21st Magic: Disconnected from MCP server');
    }
}

// Singleton instance
let magicClientInstance = null;

function getMagicClient() {
    if (!magicClientInstance) {
        magicClientInstance = new Magic21stClient();
    }
    return magicClientInstance;
}

module.exports = { getMagicClient, Magic21stClient };