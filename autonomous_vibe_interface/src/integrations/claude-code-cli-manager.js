/**
 * Real Claude Code CLI Integration Manager
 * 
 * Replaces demo/simulation implementations with actual Claude Code CLI execution
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class ClaudeCodeCLIManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.projectsDir = options.projectsDir || path.join(__dirname, '../../projects');
        this.claudeCodeProEnabled = process.env.CLAUDE_CODE_PRO_ENABLED === 'true';
        this.anthropicApiKey = options.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
        this.timeout = options.timeout || 600000; // 10 minutes default
        this.logger = options.logger || console;
        
        // Active sessions tracking
        this.activeSessions = new Map();
        this.sessionHistory = [];
        
        // Performance metrics
        this.metrics = {
            sessionsStarted: 0,
            sessionsCompleted: 0,
            sessionsFailed: 0,
            averageSessionTime: 0,
            totalSessionTime: 0
        };
        
        this._ensureProjectsDirectory();
    }

    /**
     * Execute Claude Code CLI with enhanced brief for autonomous project creation
     */
    async executeAutonomousBuild(enhancedBrief, options = {}) {
        const sessionId = uuidv4();
        const projectId = `project-${Date.now()}`;
        const projectPath = path.join(this.projectsDir, projectId);
        
        try {
            this.logger.log(`🚀 Starting autonomous build session: ${sessionId}`);
            this.logger.log(`📁 Project path: ${projectPath}`);
            
            // Create project directory
            await fs.mkdir(projectPath, { recursive: true });
            
            // Create session tracking
            const session = {
                id: sessionId,
                projectId,
                projectPath,
                status: 'initializing',
                startTime: Date.now(),
                enhancedBrief,
                options,
                output: [],
                errors: [],
                metrics: {
                    filesCreated: 0,
                    linesOfCode: 0,
                    dependencies: 0
                }
            };
            
            this.activeSessions.set(sessionId, session);
            this.metrics.sessionsStarted++;
            
            // Update session status
            session.status = 'building';
            this.emit('sessionStarted', session);
            
            // Execute Claude Code CLI
            const result = await this._executeClaude(enhancedBrief, projectPath, session);
            
            // Process results
            session.status = 'completed';
            session.endTime = Date.now();
            session.duration = session.endTime - session.startTime;
            session.result = result;
            
            // Update metrics
            this.metrics.sessionsCompleted++;
            this._updateMetrics(session);
            
            // Analyze generated project
            const projectAnalysis = await this._analyzeGeneratedProject(projectPath);
            session.analysis = projectAnalysis;
            
            this.emit('sessionCompleted', session);
            this.logger.log(`✅ Build completed: ${sessionId} in ${session.duration}ms`);
            
            return {
                success: true,
                sessionId,
                projectId,
                projectPath,
                duration: session.duration,
                analysis: projectAnalysis,
                deploymentReady: projectAnalysis.hasMainFile
            };
            
        } catch (error) {
            this.logger.error(`❌ Build failed: ${sessionId}`, error);
            
            const session = this.activeSessions.get(sessionId);
            if (session) {
                session.status = 'failed';
                session.error = error.message;
                session.endTime = Date.now();
                session.duration = session.endTime - session.startTime;
            }
            
            this.metrics.sessionsFailed++;
            this.emit('sessionFailed', { sessionId, error: error.message });
            
            return {
                success: false,
                sessionId,
                error: error.message,
                projectPath
            };
        } finally {
            // Move to history and cleanup
            const session = this.activeSessions.get(sessionId);
            if (session) {
                this.sessionHistory.push(session);
                this.activeSessions.delete(sessionId);
            }
        }
    }

    /**
     * Execute Claude Code CLI with the enhanced brief
     */
    async _executeClaude(enhancedBrief, projectPath, session) {
        return new Promise((resolve, reject) => {
            // Prepare Claude Code command with auto-approval
            const claudeArgs = [
                '--dangerously-skip-permissions',
                '--auto-approve',
                '--project-path', projectPath,
                '--brief', enhancedBrief
            ];
            
            // Set environment variables
            const env = {
                ...process.env,
                NODE_ENV: 'production'
            };
            
            // Only add ANTHROPIC_API_KEY if we're not using Claude Code Pro
            if (!this.claudeCodeProEnabled && this.anthropicApiKey) {
                env.ANTHROPIC_API_KEY = this.anthropicApiKey;
            }
            
            if (this.claudeCodeProEnabled) {
                this.logger.log(`🚀 Using Claude Code Pro subscription - executing authenticated CLI`);
            } else {
                this.logger.log(`🤖 Using Anthropic API key - executing Claude Code CLI`);
            }
            this.logger.log(`🔧 Claude Code args:`, claudeArgs.slice(0, 4)); // Don't log the full brief
            
            // Spawn Claude Code process
            const claudeProcess = spawn('claude-code', claudeArgs, {
                cwd: projectPath,
                env,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            // Handle CLI not found error
            claudeProcess.on('error', (error) => {
                if (error.code === 'ENOENT') {
                    this.logger.error('❌ Claude Code CLI not found. Please install it first:');
                    this.logger.error('   npm install -g claude-code');
                    this.logger.error('   Then authenticate: claude-code auth');
                    
                    session.status = 'failed';
                    session.error = 'Claude Code CLI not installed';
                    session.endTime = Date.now();
                    
                    this.activeSessions.delete(sessionId);
                    this.sessionHistory.push(session);
                    this.metrics.sessionsFailed++;
                    
                    reject(new Error('Claude Code CLI not installed. Run: npm install -g claude-code'));
                    return;
                }
            });
            
            let stdout = '';
            let stderr = '';
            
            // Capture output
            claudeProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                session.output.push({ type: 'stdout', data: output, timestamp: Date.now() });
                this.emit('sessionOutput', { sessionId: session.id, type: 'stdout', data: output });
            });
            
            claudeProcess.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                session.errors.push({ type: 'stderr', data: output, timestamp: Date.now() });
                this.emit('sessionOutput', { sessionId: session.id, type: 'stderr', data: output });
            });
            
            // Handle process completion
            claudeProcess.on('close', (code) => {
                if (code === 0) {
                    this.logger.log(`✅ Claude Code completed successfully`);
                    resolve({ stdout, stderr, exitCode: code });
                } else {
                    this.logger.error(`❌ Claude Code exited with code ${code}`);
                    reject(new Error(`Claude Code failed with exit code ${code}: ${stderr}`));
                }
            });
            
            // Handle errors
            claudeProcess.on('error', (error) => {
                this.logger.error(`❌ Claude Code process error:`, error);
                reject(error);
            });
            
            // Set timeout
            setTimeout(() => {
                if (!claudeProcess.killed) {
                    claudeProcess.kill('SIGTERM');
                    reject(new Error(`Claude Code execution timed out after ${this.timeout}ms`));
                }
            }, this.timeout);
        });
    }

    /**
     * Analyze generated project structure and content
     */
    async _analyzeGeneratedProject(projectPath) {
        try {
            const analysis = {
                hasMainFile: false,
                files: [],
                directories: [],
                packageJson: null,
                dependencies: [],
                framework: 'unknown',
                buildCommand: null,
                startCommand: null,
                deploymentConfig: null
            };
            
            // Read directory structure
            const items = await fs.readdir(projectPath, { withFileTypes: true });
            
            for (const item of items) {
                const itemPath = path.join(projectPath, item.name);
                
                if (item.isDirectory()) {
                    analysis.directories.push(item.name);
                } else {
                    analysis.files.push(item.name);
                    
                    // Check for main files
                    if (['index.html', 'index.js', 'index.ts', 'app.js', 'main.js'].includes(item.name)) {
                        analysis.hasMainFile = true;
                    }
                    
                    // Analyze package.json
                    if (item.name === 'package.json') {
                        try {
                            const packageContent = await fs.readFile(itemPath, 'utf8');
                            analysis.packageJson = JSON.parse(packageContent);
                            analysis.dependencies = Object.keys(analysis.packageJson.dependencies || {});
                            analysis.buildCommand = analysis.packageJson.scripts?.build;
                            analysis.startCommand = analysis.packageJson.scripts?.start || analysis.packageJson.scripts?.dev;
                            
                            // Detect framework
                            if (analysis.dependencies.includes('react')) {
                                analysis.framework = 'react';
                            } else if (analysis.dependencies.includes('vue')) {
                                analysis.framework = 'vue';
                            } else if (analysis.dependencies.includes('angular')) {
                                analysis.framework = 'angular';
                            } else if (analysis.dependencies.includes('next')) {
                                analysis.framework = 'nextjs';
                            }
                        } catch (error) {
                            this.logger.warn(`Warning: Could not parse package.json`, error.message);
                        }
                    }
                    
                    // Check for deployment configs
                    if (['vercel.json', 'netlify.toml', 'Dockerfile'].includes(item.name)) {
                        analysis.deploymentConfig = item.name;
                    }
                }
            }
            
            // Calculate project metrics
            analysis.fileCount = analysis.files.length;
            analysis.directoryCount = analysis.directories.length;
            analysis.dependencyCount = analysis.dependencies.length;
            
            return analysis;
            
        } catch (error) {
            this.logger.error(`Error analyzing project:`, error);
            return {
                hasMainFile: false,
                files: [],
                directories: [],
                error: error.message
            };
        }
    }

    /**
     * Get session status and progress
     */
    getSessionStatus(sessionId) {
        const activeSession = this.activeSessions.get(sessionId);
        if (activeSession) {
            return {
                ...activeSession,
                isActive: true
            };
        }
        
        const historicalSession = this.sessionHistory.find(s => s.id === sessionId);
        if (historicalSession) {
            return {
                ...historicalSession,
                isActive: false
            };
        }
        
        return null;
    }

    /**
     * List all active sessions
     */
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }

    /**
     * Get session history
     */
    getSessionHistory(limit = 50) {
        return this.sessionHistory
            .slice(-limit)
            .sort((a, b) => b.startTime - a.startTime);
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            activeSessions: this.activeSessions.size,
            totalSessions: this.sessionHistory.length
        };
    }

    /**
     * Terminate an active session
     */
    async terminateSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found or not active`);
        }
        
        session.status = 'terminated';
        session.endTime = Date.now();
        session.duration = session.endTime - session.startTime;
        
        this.sessionHistory.push(session);
        this.activeSessions.delete(sessionId);
        
        this.emit('sessionTerminated', session);
        return session;
    }

    /**
     * Update performance metrics
     */
    _updateMetrics(session) {
        this.metrics.totalSessionTime += session.duration;
        this.metrics.averageSessionTime = this.metrics.totalSessionTime / this.metrics.sessionsCompleted;
    }

    /**
     * Ensure projects directory exists
     */
    async _ensureProjectsDirectory() {
        try {
            await fs.mkdir(this.projectsDir, { recursive: true });
        } catch (error) {
            this.logger.error(`Error creating projects directory:`, error);
        }
    }

    /**
     * Install dependencies for generated project
     */
    async installDependencies(projectPath) {
        return new Promise((resolve, reject) => {
            const packageJsonPath = path.join(projectPath, 'package.json');
            
            // Check if package.json exists
            fs.access(packageJsonPath)
                .then(() => {
                    this.logger.log(`📦 Installing dependencies in ${projectPath}`);
                    
                    const npmProcess = spawn('npm', ['install'], {
                        cwd: projectPath,
                        stdio: ['pipe', 'pipe', 'pipe']
                    });
                    
                    let output = '';
                    let error = '';
                    
                    npmProcess.stdout.on('data', (data) => {
                        output += data.toString();
                    });
                    
                    npmProcess.stderr.on('data', (data) => {
                        error += data.toString();
                    });
                    
                    npmProcess.on('close', (code) => {
                        if (code === 0) {
                            this.logger.log(`✅ Dependencies installed successfully`);
                            resolve({ success: true, output });
                        } else {
                            this.logger.error(`❌ npm install failed with code ${code}`);
                            reject(new Error(`npm install failed: ${error}`));
                        }
                    });
                    
                    npmProcess.on('error', (err) => {
                        reject(err);
                    });
                })
                .catch(() => {
                    // No package.json, resolve without installing
                    resolve({ success: true, message: 'No package.json found, skipping dependency installation' });
                });
        });
    }
}

module.exports = { ClaudeCodeCLIManager };