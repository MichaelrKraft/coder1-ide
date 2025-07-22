/**
 * Terminal Manager
 * 
 * Manages terminal sessions with Claude Code CLI integration
 * Handles process spawning, session management, and real-time communication
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const WebSocket = require('ws');

class TerminalManager {
    constructor() {
        this.sessions = new Map(); // sessionId -> session data
        this.userSessions = new Map(); // userId -> sessionId[]
        this.projectsDir = path.join(__dirname, '../../projects');
        
        // Ensure projects directory exists (async but don't block constructor)
        this.ensureProjectsDirectory().catch(console.error);
        
        console.log('🖥️ TerminalManager initialized');
    }
    
    /**
     * Ensure projects directory exists
     */
    async ensureProjectsDirectory() {
        try {
            await fs.access(this.projectsDir);
        } catch {
            await fs.mkdir(this.projectsDir, { recursive: true });
            console.log(`📁 Created projects directory: ${this.projectsDir}`);
        }
    }
    
    /**
     * Create a new terminal session
     */
    async createSession(userId, projectData) {
        try {
            const sessionId = `terminal-${userId}-${Date.now()}`;
            const projectName = this.generateProjectName(projectData);
            const projectPath = path.join(this.projectsDir, projectName);
            
            // Create project directory
            await fs.mkdir(projectPath, { recursive: true });
            console.log(`📁 Created project directory: ${projectPath}`);
            
            // Create session data
            const sessionData = {
                sessionId,
                userId,
                projectName,
                projectPath,
                projectData,
                status: 'initializing',
                createdAt: new Date(),
                lastActivity: new Date(),
                process: null,
                websocket: null,
                buffer: '',
                stage: 'ready',
                waitingForInput: false,
                currentPrompt: null,
                autoApproveEnabled: true, // 95% auto-approve by default
                siteInspectionEnabled: true, // Enable Browser-Use for site inspection
                browserUseTaskId: null // Track browser automation tasks
            };
            
            this.sessions.set(sessionId, sessionData);
            
            // Add to user sessions
            if (!this.userSessions.has(userId)) {
                this.userSessions.set(userId, []);
            }
            this.userSessions.get(userId).push(sessionId);
            
            console.log(`✅ Terminal session created: ${sessionId}`);
            console.log(`📋 Project: ${projectName} at ${projectPath}`);
            
            return {
                success: true,
                sessionId,
                projectName,
                projectPath
            };
            
        } catch (error) {
            console.error('❌ Failed to create terminal session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Generate project name with timestamp
     */
    generateProjectName(projectData) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0].slice(0, 5).replace(':', '-'); // HH-MM
        
        // Determine project type from requirements
        let projectType = 'website';
        if (projectData?.originalRequest) {
            const request = projectData.originalRequest.toLowerCase();
            if (request.includes('landing page') || request.includes('landing')) {
                projectType = 'landing';
            } else if (request.includes('dashboard') || request.includes('admin')) {
                projectType = 'dashboard';
            } else if (request.includes('api') || request.includes('backend')) {
                projectType = 'api';
            } else if (request.includes('app') || request.includes('application')) {
                projectType = 'app';
            }
        }
        
        return `coder1-${projectType}-${dateStr}-${timeStr}`;
    }
    
    /**
     * Start Claude Code in a terminal session
     */
    async startClaudeCode(sessionId, websocket) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            
            console.log(`🚀 Starting Claude Code for session: ${sessionId}`);
            session.websocket = websocket;
            session.status = 'starting';
            session.stage = 'initializing';
            
            // Check if claude-code is available
            const claudeCodePath = await this.findClaudeCodePath();
            if (!claudeCodePath) {
                throw new Error('Claude Code CLI not found. Please install it first.');
            }
            
            // Spawn Claude Code process
            const claudeProcess = spawn(claudeCodePath, {
                cwd: session.projectPath,
                env: {
                    ...process.env,
                    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
                }
            });
            
            session.process = claudeProcess;
            session.status = 'active';
            
            // Handle process output
            claudeProcess.stdout.on('data', (data) => {
                const output = data.toString();
                session.buffer += output;
                session.lastActivity = new Date();
                
                // Detect Claude Code interactive prompts
                const promptData = this.detectInteractivePrompt(output, session);
                
                // Send to websocket with prompt detection
                if (websocket && websocket.readyState === WebSocket.OPEN) {
                    websocket.send(JSON.stringify({
                        type: promptData.isPrompt ? 'prompt' : 'output',
                        data: output,
                        sessionId: sessionId,
                        promptInfo: promptData.isPrompt ? promptData : undefined
                    }));
                }
            });
            
            claudeProcess.stderr.on('data', (data) => {
                const output = data.toString();
                session.buffer += output;
                session.lastActivity = new Date();
                
                // Send to websocket
                if (websocket && websocket.readyState === WebSocket.OPEN) {
                    websocket.send(JSON.stringify({
                        type: 'error',
                        data: output,
                        sessionId: sessionId
                    }));
                }
            });
            
            claudeProcess.on('close', (code) => {
                console.log(`📋 Claude Code process closed for session ${sessionId} with code ${code}`);
                session.status = code === 0 ? 'completed' : 'failed';
                session.process = null;
                
                // Send close notification
                if (websocket && websocket.readyState === WebSocket.OPEN) {
                    websocket.send(JSON.stringify({
                        type: 'close',
                        code: code,
                        sessionId: sessionId
                    }));
                }
            });
            
            claudeProcess.on('error', (error) => {
                console.error(`❌ Claude Code process error for session ${sessionId}:`, error);
                session.status = 'error';
                session.error = error.message;
                
                // Send error notification
                if (websocket && websocket.readyState === WebSocket.OPEN) {
                    websocket.send(JSON.stringify({
                        type: 'error',
                        data: `Process error: ${error.message}`,
                        sessionId: sessionId
                    }));
                }
            });
            
            // Send initial project brief
            if (session.projectData?.originalRequest) {
                setTimeout(() => {
                    this.sendProjectBrief(sessionId);
                }, 2000); // Give Claude Code time to start
            }
            
            console.log(`✅ Claude Code started for session: ${sessionId}`);
            
            return {
                success: true,
                sessionId,
                pid: claudeProcess.pid
            };
            
        } catch (error) {
            console.error(`❌ Failed to start Claude Code for session ${sessionId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Find Claude Code CLI path
     */
    async findClaudeCodePath() {
        // Try common installation paths
        const possiblePaths = [
            'claude-code',  // If in PATH
            '/usr/local/bin/claude-code',
            '/opt/homebrew/bin/claude-code',
            `${process.env.HOME}/.local/bin/claude-code`
        ];
        
        for (const claudePath of possiblePaths) {
            try {
                // Test if path exists and is executable
                const { spawn } = require('child_process');
                const testProcess = spawn(claudePath, ['--version'], { stdio: 'pipe' });
                
                const result = await new Promise((resolve) => {
                    testProcess.on('close', (code) => {
                        if (code === 0) {
                            resolve(claudePath);
                        } else {
                            resolve(null);
                        }
                    });
                    
                    testProcess.on('error', () => {
                        resolve(null);
                    });
                    
                    setTimeout(() => resolve(null), 2000); // Timeout after 2 seconds
                });
                
                // If we found a valid path, return it
                if (result) {
                    return result;
                }
                
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }
    
    /**
     * Send project brief to Claude Code
     */
    sendProjectBrief(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.process) {
            return;
        }
        
        const projectData = session.projectData;
        let brief = projectData.originalRequest || 'Create a modern web application';
        
        // Add any additional context from questions/answers
        if (projectData.questions && projectData.answers) {
            brief += '\n\nAdditional Requirements:\n';
            projectData.questions.forEach((question, index) => {
                if (projectData.answers[index]) {
                    brief += `- ${question.question}: ${projectData.answers[index]}\n`;
                }
            });
        }
        
        console.log(`📋 Sending project brief to session ${sessionId}`);
        
        // Send the brief to Claude Code
        if (session.process && session.process.stdin) {
            session.process.stdin.write(brief + '\n');
        }
        
        session.stage = 'coding';
    }
    
    /**
     * Detect Claude Code interactive prompts
     */
    detectInteractivePrompt(output, session) {
        const lowerOutput = output.toLowerCase();
        
        // Common Claude Code prompt patterns
        const promptPatterns = [
            {
                pattern: /do you want to proceed\?/i,
                type: 'proceed_confirmation',
                options: [
                    { key: '1', label: 'Proceed', action: '1\n' },
                    { key: '2', label: 'Cancel', action: '2\n' }
                ]
            },
            {
                pattern: /\[1\]\s*proceed/i,
                type: 'numbered_choice',
                options: [
                    { key: '1', label: 'Proceed', action: '1\n' },
                    { key: '2', label: 'Cancel', action: '2\n' }
                ]
            },
            {
                pattern: /press enter to continue|continue\?/i,
                type: 'continue_prompt',
                options: [
                    { key: 'enter', label: 'Continue', action: '\n' },
                    { key: 'q', label: 'Quit', action: 'q\n' }
                ]
            },
            {
                pattern: /\(y\/n\)/i,
                type: 'yes_no',
                options: [
                    { key: 'y', label: 'Yes', action: 'y\n' },
                    { key: 'n', label: 'No', action: 'n\n' }
                ]
            },
            {
                pattern: /choose an option:|select:|pick:/i,
                type: 'selection_prompt',
                options: [
                    { key: '1', label: 'Option 1', action: '1\n' },
                    { key: '2', label: 'Option 2', action: '2\n' },
                    { key: '3', label: 'Option 3', action: '3\n' }
                ]
            }
        ];
        
        for (const promptPattern of promptPatterns) {
            if (promptPattern.pattern.test(output)) {
                // Update session state
                session.waitingForInput = true;
                session.currentPrompt = {
                    type: promptPattern.type,
                    options: promptPattern.options,
                    timestamp: new Date(),
                    fullOutput: output
                };
                
                // Auto-approve logic - 95% of the time choose "proceed" option
                if (session.autoApproveEnabled) {
                    const shouldAutoApprove = Math.random() < 0.95; // 95% chance
                    
                    if (shouldAutoApprove) {
                        // Find the "proceed" or "yes" option
                        const proceedOption = promptPattern.options.find(opt => 
                            opt.key === '1' || opt.key === 'y' || 
                            opt.label.toLowerCase().includes('proceed') ||
                            opt.label.toLowerCase().includes('yes')
                        );
                        
                        if (proceedOption) {
                            console.log(`🤖 Auto-approving prompt: ${proceedOption.label}`);
                            
                            // Auto-send the response after a brief delay
                            setTimeout(() => {
                                this.sendPromptResponse(session.sessionId, proceedOption.key);
                            }, 1500); // 1.5 second delay to show the prompt briefly
                            
                            return {
                                isPrompt: true,
                                type: promptPattern.type,
                                options: promptPattern.options,
                                message: output.trim(),
                                autoApproving: true,
                                autoResponse: proceedOption
                            };
                        }
                    }
                }
                
                return {
                    isPrompt: true,
                    type: promptPattern.type,
                    options: promptPattern.options,
                    message: output.trim()
                };
            }
        }
        
        return { isPrompt: false };
    }
    
    /**
     * Send input to terminal session with prompt response handling
     */
    sendInput(sessionId, input) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.process) {
            return false;
        }
        
        session.lastActivity = new Date();
        
        // If responding to a prompt, clear the waiting state
        if (session.waitingForInput) {
            session.waitingForInput = false;
            session.currentPrompt = null;
        }
        
        if (session.process.stdin && !session.process.stdin.destroyed) {
            session.process.stdin.write(input);
            return true;
        }
        
        return false;
    }
    
    /**
     * Send quick prompt response
     */
    sendPromptResponse(sessionId, responseKey) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.process || !session.currentPrompt) {
            return { success: false, error: 'No active prompt found' };
        }
        
        // Find the matching option
        const option = session.currentPrompt.options.find(opt => opt.key === responseKey);
        if (!option) {
            return { 
                success: false, 
                error: `Invalid response key: ${responseKey}` 
            };
        }
        
        // Send the response
        const success = this.sendInput(sessionId, option.action);
        
        if (success) {
            console.log(`📝 Sent prompt response for session ${sessionId}: ${option.label} (${responseKey})`);
            
            // Send confirmation to websocket
            if (session.websocket && session.websocket.readyState === WebSocket.OPEN) {
                session.websocket.send(JSON.stringify({
                    type: 'prompt_response',
                    data: `> ${option.label}`,
                    sessionId: sessionId,
                    responseKey,
                    responseLabel: option.label
                }));
            }
        }
        
        return { success, action: option.action, label: option.label };
    }
    
    /**
     * Inspect local site using Browser-Use MCP
     */
    async inspectLocalSite(sessionId, url) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                return { success: false, error: 'Session not found' };
            }
            
            if (!session.siteInspectionEnabled) {
                return { success: false, error: 'Site inspection not enabled for this session' };
            }
            
            console.log(`🔍 Starting site inspection for session ${sessionId}: ${url}`);
            
            // Use Browser-Use MCP to inspect the site
            const browserAction = `Navigate to ${url} and analyze the page structure, content, and functionality. Provide a detailed report of what's working and what could be improved.`;
            
            // Make request to Browser-Use MCP
            const response = await fetch('/api/browser-use', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: url,
                    action: browserAction
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                session.browserUseTaskId = result.task_id;
                
                // Send inspection update to websocket
                if (session.websocket && session.websocket.readyState === WebSocket.OPEN) {
                    session.websocket.send(JSON.stringify({
                        type: 'site_inspection_started',
                        sessionId: sessionId,
                        url: url,
                        taskId: result.task_id
                    }));
                }
                
                console.log(`✅ Site inspection started for ${url}, task ID: ${result.task_id}`);
                return { success: true, taskId: result.task_id, url: url };
            } else {
                throw new Error(`Browser-Use request failed: ${response.status}`);
            }
            
        } catch (error) {
            console.error(`❌ Failed to inspect site for session ${sessionId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get Browser-Use inspection results
     */
    async getBrowserUseResults(sessionId) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session || !session.browserUseTaskId) {
                return { success: false, error: 'No active browser task found' };
            }
            
            // Get results from Browser-Use MCP
            const response = await fetch(`/api/browser-use/result/${session.browserUseTaskId}`);
            
            if (response.ok) {
                const result = await response.json();
                
                // Send results to websocket
                if (session.websocket && session.websocket.readyState === WebSocket.OPEN) {
                    session.websocket.send(JSON.stringify({
                        type: 'site_inspection_results',
                        sessionId: sessionId,
                        taskId: session.browserUseTaskId,
                        results: result
                    }));
                }
                
                return { success: true, results: result };
            } else {
                throw new Error(`Failed to get browser results: ${response.status}`);
            }
            
        } catch (error) {
            console.error(`❌ Failed to get browser results for session ${sessionId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Auto-inspect created sites
     */
    async autoInspectCreatedSite(sessionId, projectPath) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session || !session.siteInspectionEnabled) {
                return;
            }
            
            // Check if an index.html was created
            const indexPath = path.join(projectPath, 'index.html');
            try {
                await fs.access(indexPath);
                
                // Found index.html, start local server and inspect
                const localUrl = `http://localhost:${this.getNextAvailablePort()}`;
                
                console.log(`🚀 Auto-inspecting created site at ${localUrl}`);
                
                // Start simple HTTP server for the created site
                this.startLocalServer(projectPath, localUrl);
                
                // Wait a moment for server to start, then inspect
                setTimeout(() => {
                    this.inspectLocalSite(sessionId, localUrl);
                }, 3000);
                
            } catch (error) {
                // No index.html found, skip auto-inspection
                console.log(`📄 No index.html found in ${projectPath}, skipping auto-inspection`);
            }
            
        } catch (error) {
            console.error(`❌ Auto-inspection failed for session ${sessionId}:`, error);
        }
    }
    
    /**
     * Start a simple HTTP server for a project directory
     */
    startLocalServer(projectPath, url) {
        try {
            const express = require('express');
            const app = express();
            const port = new URL(url).port || 8080;
            
            app.use(express.static(projectPath));
            
            const server = app.listen(port, () => {
                console.log(`🌐 Local server started for project at ${url}`);
            });
            
            // Store server reference for cleanup
            this.localServers = this.localServers || new Map();
            this.localServers.set(projectPath, server);
            
        } catch (error) {
            console.error(`❌ Failed to start local server:`, error);
        }
    }
    
    /**
     * Get next available port for local servers
     */
    getNextAvailablePort() {
        const usedPorts = Array.from(this.sessions.values()).map(s => s.port || 0);
        let port = 8080;
        while (usedPorts.includes(port)) {
            port++;
        }
        return port;
    }
    
    /**
     * Get session status
     */
    getSessionStatus(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return {
                success: false,
                error: 'Session not found'
            };
        }
        
        return {
            success: true,
            data: {
                sessionId: session.sessionId,
                status: session.status,
                stage: session.stage,
                projectName: session.projectName,
                projectPath: session.projectPath,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity,
                bufferLength: session.buffer.length,
                waitingForInput: session.waitingForInput || false,
                currentPrompt: session.currentPrompt || null
            }
        };
    }
    
    /**
     * Terminate a session
     */
    async terminateSession(sessionId) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                return { success: false, error: 'Session not found' };
            }
            
            console.log(`🛑 Terminating session: ${sessionId}`);
            
            // Kill process if running
            if (session.process && !session.process.killed) {
                session.process.kill('SIGTERM');
                
                // Force kill after 5 seconds
                setTimeout(() => {
                    if (session.process && !session.process.killed) {
                        session.process.kill('SIGKILL');
                    }
                }, 5000);
            }
            
            // Close websocket
            if (session.websocket && session.websocket.readyState === WebSocket.OPEN) {
                session.websocket.close();
            }
            
            // Update session status
            session.status = 'terminated';
            
            console.log(`✅ Session terminated: ${sessionId}`);
            
            return { success: true };
            
        } catch (error) {
            console.error(`❌ Failed to terminate session ${sessionId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get all sessions for a user
     */
    getUserSessions(userId) {
        const sessionIds = this.userSessions.get(userId) || [];
        const sessions = sessionIds.map(id => this.sessions.get(id)).filter(Boolean);
        
        return {
            success: true,
            data: sessions.map(session => ({
                sessionId: session.sessionId,
                projectName: session.projectName,
                status: session.status,
                stage: session.stage,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity
            }))
        };
    }
    
    /**
     * Get system statistics
     */
    getSystemStats() {
        const allSessions = Array.from(this.sessions.values());
        
        return {
            totalSessions: allSessions.length,
            activeSessions: allSessions.filter(s => s.status === 'active').length,
            completedSessions: allSessions.filter(s => s.status === 'completed').length,
            failedSessions: allSessions.filter(s => s.status === 'failed').length,
            totalUsers: this.userSessions.size,
            projectsDirectory: this.projectsDir
        };
    }
}

// Export singleton instance
let terminalManagerInstance = null;

function getTerminalManager() {
    if (!terminalManagerInstance) {
        terminalManagerInstance = new TerminalManager();
    }
    return terminalManagerInstance;
}

module.exports = {
    TerminalManager,
    getTerminalManager
};