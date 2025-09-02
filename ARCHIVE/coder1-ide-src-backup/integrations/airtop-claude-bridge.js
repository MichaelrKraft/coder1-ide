/**
 * Airtop Claude Code Bridge
 * 
 * Handles the integration between Coder1 and Claude Code via Airtop browser automation.
 * This bridge manages browser sessions, navigation to Replit.com, and Claude Code CLI interaction.
 */

const { AirtopClient } = require('@airtop/sdk');
const { getSessionManager } = require('../orchestration/airtop-session-manager');
const { getReplitOAuthManager } = require('./replit-oauth-manager');
const { getReplitProjectManager } = require('./replit-project-manager');

class AirtopClaudeBridge {
    constructor() {
        this.airtopClient = null;
        this.sessionManager = getSessionManager();
        this.isInitialized = false;
        
        console.log('🔧 AirtopClaudeBridge initialized');
    }
    
    /**
     * Initialize the Airtop client with retry logic
     */
    async initialize() {
        try {
            if (this.isInitialized) {
                console.log('✅ AirtopClaudeBridge already initialized');
                return { success: true };
            }
            
            console.log('🚀 Initializing Airtop client...');
            
            const apiKey = process.env.AIRTOP_API_KEY;
            if (!apiKey) {
                throw new Error('AIRTOP_API_KEY not found in environment variables');
            }
            
            // Add retry logic for initialization
            const maxRetries = 3;
            const baseDelay = 1000;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    this.airtopClient = new AirtopClient({
                        apiKey: apiKey,
                        timeout: 30000, // 30 second timeout
                        retries: 3
                    });
                    
                    // Initialize OAuth and project managers
                    this.oauthManager = getReplitOAuthManager(this.airtopClient);
                    this.projectManager = getReplitProjectManager(this.airtopClient, this.oauthManager);
                    
                    console.log('✅ Airtop client initialized successfully');
                    this.isInitialized = true;
                    
                    return { success: true };
                    
                } catch (initError) {
                    console.warn(`⚠️ Initialization attempt ${attempt} failed:`, initError.message);
                    
                    if (attempt === maxRetries) {
                        throw initError;
                    }
                    
                    const delay = baseDelay * Math.pow(2, attempt - 1);
                    console.log(`🔄 Retrying initialization in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize Airtop client after all retries:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Start a new Claude Code session
     */
    async startClaudeCodeSession(userId, projectData) {
        try {
            console.log(`🚀 Starting Claude Code session for user: ${userId}`);
            
            // Ensure client is initialized
            const initResult = await this.initialize();
            if (!initResult.success) {
                throw new Error(`Failed to initialize Airtop client: ${initResult.error}`);
            }
            
            // Create session in session manager
            const sessionResult = await this.sessionManager.createSession(userId, projectData);
            if (!sessionResult.success) {
                throw new Error(`Failed to create session: ${sessionResult.error}`);
            }
            
            const sessionId = sessionResult.sessionId;
            console.log(`📋 Created session: ${sessionId}`);
            
            // Start the enhanced browser automation process with OAuth
            await this.launchEnhancedBrowserSession(sessionId);
            
            return {
                success: true,
                sessionId: sessionId,
                data: {
                    sessionId: sessionId,
                    status: 'initializing',
                    message: 'Claude Code session started'
                }
            };
            
        } catch (error) {
            console.error(`❌ Failed to start Claude Code session:`, error);
            return {
                success: false,
                error: error.message,
                sessionId: null
            };
        }
    }
    
    /**
     * Launch enhanced browser session with OAuth authentication
     */
    async launchEnhancedBrowserSession(sessionId) {
        try {
            console.log(`🌍 Starting enhanced browser session for: ${sessionId}`);
            
            // Get session data for monitoring callback
            const sessionData = this.sessionManager.getSession(sessionId);
            const monitoringCallback = (message) => {
                console.log(`📺 [${sessionId}] ${message}`);
                this.sessionManager.updateSession(sessionId, {
                    progress: {
                        stage: 'authentication',
                        message: message
                    }
                });
            };
            
            // Step 1: Authenticate with Google OAuth
            monitoringCallback('🔐 Starting Google OAuth authentication...');
            const authResult = await this.oauthManager.authenticateWithGoogle(sessionId, monitoringCallback);
            if (!authResult.success) {
                throw new Error(`Authentication failed: ${authResult.error}`);
            }
            
            // Step 2: Create project with proper naming
            monitoringCallback('📜 Creating Replit project...');
            const projectResult = await this.projectManager.createProject(sessionId, sessionData.data.projectData, monitoringCallback);
            if (!projectResult.success) {
                throw new Error(`Project creation failed: ${projectResult.error}`);
            }
            
            // Step 3: Start Claude Code in the project
            monitoringCallback('🤖 Starting Claude Code in project...');
            await this.startClaudeCodeInProject(sessionId, projectResult, monitoringCallback);
            
            console.log(`✅ Enhanced browser session launched successfully: ${sessionId}`);
            
        } catch (error) {
            console.error(`❌ Failed to launch enhanced browser session for ${sessionId}:`, error);
            
            // Enhanced error handling with circuit breaker
            const errorType = this.classifyError(error);
            
            // Record error in session manager
            this.sessionManager.recordError(sessionId, errorType, error.message);
            
            this.sessionManager.updateSession(sessionId, {
                status: 'error',
                error: error.message,
                errorType: errorType,
                progress: {
                    stage: 'error',
                    percentage: 0,
                    message: `Error: ${error.message}`
                }
            });
            
            // Check if we should retry based on error type
            const shouldRetry = this.shouldRetryError(errorType);
            
            if (shouldRetry) {
                const retryResult = this.sessionManager.incrementRetry(sessionId);
                if (retryResult.success && retryResult.canRetry) {
                    const delay = this.calculateRetryDelay(retryResult.retryCount, errorType);
                    console.log(`🔄 Scheduling retry for session ${sessionId} in ${delay}ms`);
                    
                    setTimeout(() => {
                        this.launchEnhancedBrowserSession(sessionId);
                    }, delay);
                } else {
                    console.error(`❌ Max retries reached for session ${sessionId}`);
                    this.sessionManager.updateSession(sessionId, {
                        status: 'failed',
                        progress: {
                            stage: 'failed',
                            percentage: 0,
                            message: 'Session failed after maximum retries'
                        }
                    });
                }
            } else {
                console.error(`❌ Non-retryable error for session ${sessionId}: ${errorType}`);
                this.sessionManager.updateSession(sessionId, {
                    status: 'failed',
                    progress: {
                        stage: 'failed',
                        percentage: 0,
                        message: `Non-retryable error: ${errorType}`
                    }
                });
            }
            
            throw error;
        }
    }
    
    /**
     * Start Claude Code in created project
     */
    async startClaudeCodeInProject(sessionId, projectResult, monitoringCallback) {
        try {
            console.log(`🤖 Starting Claude Code in project: ${projectResult.projectName}`);
            
            const projectInfo = this.projectManager.getProjectInfo(sessionId);
            const airtopSessionId = projectInfo.airtopSessionId;
            const windowId = projectInfo.windowId;
            
            // Update session status
            this.sessionManager.updateSession(sessionId, {
                status: 'starting_claude_code',
                progress: {
                    stage: 'claude_code_start',
                    percentage: 70,
                    message: 'Starting Claude Code CLI in project...'
                }
            });
            
            // Open terminal in Replit
            await this.executeWithRetry(
                () => this.airtopClient.windows.pageQuery(airtopSessionId, windowId, {
                    prompt: 'Open the terminal or console in this Replit project. Look for a terminal tab, console button, or shell option.'
                }),
                'open_terminal',
                2,
                2000
            );
            
            // Wait for terminal to open
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Start Claude Code CLI
            await this.executeWithRetry(
                () => this.airtopClient.windows.pageQuery(airtopSessionId, windowId, {
                    prompt: 'Type "npx claude-code" in the terminal and press Enter to start Claude Code'
                }),
                'start_claude_code',
                2,
                2000
            );
            
            console.log(`🚀 Claude Code CLI started in project`);
            
            // Wait for Claude Code to initialize
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Send the comprehensive project brief
            const sessionData = this.sessionManager.getSession(sessionId);
            await this.sendProjectBrief(sessionId, airtopSessionId, windowId, sessionData.data.projectData);
            
            monitoringCallback('✅ Claude Code started successfully!');
            
        } catch (error) {
            console.error(`❌ Failed to start Claude Code in project:`, error);
            throw error;
        }
    }
    
    /**
     * Legacy launch browser session method (kept for compatibility)
     */
    async launchBrowserSession(sessionId) {
        try {
            console.log(`🌐 Launching browser session for: ${sessionId}`);
            
            // Update session status
            this.sessionManager.updateSession(sessionId, {
                status: 'launching_browser',
                progress: {
                    stage: 'browser_launch',
                    percentage: 10,
                    message: 'Launching cloud browser...'
                }
            });
            
            // Create Airtop browser session with enhanced error handling
            const createSessionResponse = await this.executeWithCircuitBreaker(
                () => this.executeWithRetry(
                    () => this.airtopClient.sessions.create({
                        configuration: {
                            timeoutMinutes: 10 // 10 minutes for cost savings
                        }
                    }),
                    'create_airtop_session',
                    3,
                    2000
                ),
                'create_airtop_session'
            );
            
            const airtopSessionId = createSessionResponse.data.id;
            console.log(`🌐 Airtop browser session created: ${airtopSessionId}`);
            
            // Update session with Airtop session ID
            this.sessionManager.updateSession(sessionId, {
                airtopSessionId: airtopSessionId,
                status: 'navigating_to_replit',
                progress: {
                    stage: 'navigation',
                    percentage: 20,
                    message: 'Navigating to Replit.com...'
                }
            });
            
            // Create window and navigate to Replit with enhanced error handling
            const windowResponse = await this.executeWithCircuitBreaker(
                () => this.executeWithRetry(
                    () => this.airtopClient.windows.create(airtopSessionId, {
                        url: 'https://replit.com'
                    }),
                    'create_window',
                    3,
                    1500
                ),
                'create_window'
            );
            
            const windowId = windowResponse.data.windowId;
            console.log(`🪟 Window created: ${windowId}`);
            
            // Update session with window ID
            this.sessionManager.updateSession(sessionId, {
                airtopWindowId: windowId,
                status: 'setting_up_replit',
                progress: {
                    stage: 'replit_setup',
                    percentage: 30,
                    message: 'Setting up Replit environment...'
                }
            });
            
            // Wait for page to load
            await this.waitForPageLoad(airtopSessionId, windowId);
            
            // Create new Replit project
            await this.createReplitProject(sessionId, airtopSessionId, windowId);
            
            // Start Claude Code
            await this.startClaudeCode(sessionId, airtopSessionId, windowId);
            
            console.log(`✅ Browser session launched successfully: ${sessionId}`);
            
        } catch (error) {
            console.error(`❌ Failed to launch browser session for ${sessionId}:`, error);
            
            // Enhanced error handling with circuit breaker
            const errorType = this.classifyError(error);
            
            // Record error in session manager
            this.sessionManager.recordError(sessionId, errorType, error.message);
            
            this.sessionManager.updateSession(sessionId, {
                status: 'error',
                error: error.message,
                errorType: errorType,
                progress: {
                    stage: 'error',
                    percentage: 0,
                    message: `Error: ${error.message}`
                }
            });
            
            // Check if we should retry
            const retryResult = this.sessionManager.incrementRetry(sessionId);
            if (retryResult.success && retryResult.canRetry) {
                console.log(`🔄 Scheduling retry for session ${sessionId}`);
                setTimeout(() => {
                    this.launchBrowserSession(sessionId);
                }, this.sessionManager.getRetryDelay(retryResult.retryCount));
            } else {
                console.error(`❌ Max retries reached for session ${sessionId}`);
                this.sessionManager.updateSession(sessionId, {
                    status: 'failed',
                    progress: {
                        stage: 'failed',
                        percentage: 0,
                        message: 'Session failed after maximum retries'
                    }
                });
            }
            
            throw error;
        }
    }
    
    /**
     * Wait for page to load
     */
    async waitForPageLoad(airtopSessionId, windowId, timeout = 30000) {
        console.log(`⏳ Waiting for page load...`);
        
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                const response = await this.airtopClient.windows.pageQuery(airtopSessionId, windowId, {
                    prompt: 'Check if the page has finished loading. Return "loaded" if the page is ready.'
                });
                
                if (response.data && response.data.content && response.data.content.includes('loaded')) {
                    console.log(`✅ Page loaded successfully`);
                    return;
                }
                
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                
            } catch (error) {
                console.warn(`⚠️ Page load check failed:`, error.message);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.warn(`⚠️ Page load timeout reached, continuing anyway`);
    }
    
    /**
     * Create a new Replit project
     */
    async createReplitProject(sessionId, airtopSessionId, windowId) {
        try {
            console.log(`📁 Creating new Replit project for session: ${sessionId}`);
            
            this.sessionManager.updateSession(sessionId, {
                status: 'creating_project',
                progress: {
                    stage: 'project_creation',
                    percentage: 40,
                    message: 'Creating new Replit project...'
                }
            });
            
            // Click on "Create Repl" or similar button with error handling
            await this.executeWithRetry(
                () => this.airtopClient.windows.pageQuery(airtopSessionId, windowId, {
                    prompt: 'Click on the "Create Repl" button or any button that creates a new project'
                }),
                'create_repl_project',
                2,
                3000
            );
            
            console.log(`✅ Replit project creation initiated`);
            
            // Wait for project creation
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Update session status
            this.sessionManager.updateSession(sessionId, {
                status: 'project_ready',
                progress: {
                    stage: 'project_ready',
                    percentage: 50,
                    message: 'Replit project created successfully'
                }
            });
            
        } catch (error) {
            console.error(`❌ Failed to create Replit project:`, error);
            throw error;
        }
    }
    
    /**
     * Start Claude Code CLI
     */
    async startClaudeCode(sessionId, airtopSessionId, windowId) {
        try {
            console.log(`🤖 Starting Claude Code CLI for session: ${sessionId}`);
            
            // Get session data to access project requirements
            const sessionData = this.sessionManager.getSession(sessionId);
            if (!sessionData.success) {
                throw new Error('Failed to get session data');
            }
            
            const projectData = sessionData.data;
            
            this.sessionManager.updateSession(sessionId, {
                status: 'starting_claude_code',
                progress: {
                    stage: 'claude_code_start',
                    percentage: 60,
                    message: 'Starting Claude Code CLI...'
                }
            });
            
            // Open terminal and start Claude Code with error handling
            await this.executeWithRetry(
                () => this.airtopClient.windows.pageQuery(airtopSessionId, windowId, {
                    prompt: 'Open the terminal or console in this Replit project'
                }),
                'open_terminal',
                2,
                2000
            );
            
            // Wait for terminal to open
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Start Claude Code CLI with error handling
            await this.executeWithRetry(
                () => this.airtopClient.windows.pageQuery(airtopSessionId, windowId, {
                    prompt: 'Type "npx claude-code" in the terminal and press Enter to start Claude Code'
                }),
                'start_claude_code',
                2,
                2000
            );
            
            console.log(`🚀 Claude Code CLI started`);
            
            // Wait for Claude Code to initialize
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Send the comprehensive project brief
            await this.sendProjectBrief(sessionId, airtopSessionId, windowId, projectData);
            
        } catch (error) {
            console.error(`❌ Failed to start Claude Code:`, error);
            throw error;
        }
    }
    
    /**
     * Send project brief to Claude Code
     */
    async sendProjectBrief(sessionId, airtopSessionId, windowId, projectData) {
        try {
            console.log(`📝 Sending project brief to Claude Code for session: ${sessionId}`);
            
            // Create comprehensive brief from project data
            const brief = this.createComprehensiveBrief(projectData);
            
            this.sessionManager.updateSession(sessionId, {
                status: 'sending_brief',
                progress: {
                    stage: 'brief_transmission',
                    percentage: 70,
                    message: 'Sending project requirements to Claude Code...'
                }
            });
            
            // Send the brief to Claude Code with error handling
            await this.executeWithRetry(
                () => this.airtopClient.windows.pageQuery(airtopSessionId, windowId, {
                    prompt: `Type or paste this project brief into Claude Code: "${brief}"`
                }),
                'send_project_brief',
                2,
                2000
            );
            
            console.log(`✅ Project brief sent successfully`);
            
            // Update session to active
            this.sessionManager.updateSession(sessionId, {
                status: 'active',
                progress: {
                    stage: 'building',
                    percentage: 80,
                    message: 'Claude Code is building your project...'
                }
            });
            
            // Start monitoring for completion
            this.startCompletionMonitoring(sessionId, airtopSessionId, windowId);
            
        } catch (error) {
            console.error(`❌ Failed to send project brief:`, error);
            throw error;
        }
    }
    
    /**
     * Create comprehensive brief from project data
     */
    createComprehensiveBrief(sessionData) {
        console.log(`📋 Creating comprehensive brief from session data`);
        
        // Access the actual project data from the session
        const projectData = sessionData.projectData || sessionData;
        
        let brief = `${projectData.originalRequest}\n\n`;
        
        if (projectData.questions && projectData.answers) {
            brief += "DETAILED REQUIREMENTS:\n";
            projectData.questions.forEach((question, index) => {
                const answer = projectData.answers[index];
                if (answer && answer.trim()) {
                    brief += `${question.question}\n`;
                    brief += `Answer: ${answer.trim()}\n\n`;
                }
            });
        }
        
        brief += "\nPlease build this project with modern, professional styling and best practices.";
        
        console.log(`📝 Brief created (${brief.length} characters)`);
        return brief;
    }
    
    /**
     * Start monitoring for completion indicators
     */
    async startCompletionMonitoring(sessionId, airtopSessionId, windowId) {
        try {
            console.log(`🔍 Starting completion monitoring for session: ${sessionId}`);
            
            const maxMonitoringTime = 8 * 60 * 1000; // 8 minutes (2 minutes before timeout)
            const checkInterval = 30000; // Check every 30 seconds
            const startTime = Date.now();
            
            const completionMonitor = setInterval(async () => {
                try {
                    const elapsed = Date.now() - startTime;
                    
                    // Stop monitoring if we've been running too long
                    if (elapsed > maxMonitoringTime) {
                        console.log(`⏰ Completion monitoring timeout for session: ${sessionId}`);
                        clearInterval(completionMonitor);
                        return;
                    }
                    
                    // Capture real-time terminal output
                    await this.captureTerminalOutput(sessionId, airtopSessionId, windowId);
                    
                    // Check for completion indicators
                    const isComplete = await this.checkForCompletion(sessionId, airtopSessionId, windowId);
                    
                    if (isComplete) {
                        console.log(`✅ Completion detected for session: ${sessionId}`);
                        clearInterval(completionMonitor);
                        
                        // Update session status to completed
                        this.sessionManager.updateSession(sessionId, {
                            status: 'completed',
                            progress: {
                                stage: 'completed',
                                percentage: 100,
                                message: 'Project build completed successfully!'
                            }
                        });
                        
                        // Export project as ZIP
                        await this.exportCompletedProject(sessionId);
                        
                        // Check for downloadable files
                        await this.checkForDownloadableFiles(sessionId, airtopSessionId, windowId);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error in completion monitoring:`, error);
                }
            }, checkInterval);
            
            // Store the interval reference for cleanup
            const session = this.sessionManager.getSession(sessionId);
            if (session.success) {
                session.data.completionMonitorInterval = completionMonitor;
            }
            
        } catch (error) {
            console.error(`❌ Failed to start completion monitoring:`, error);
        }
    }
    
    /**
     * Stream real-time terminal output from Claude Code session
     */
    async captureTerminalOutput(sessionId, airtopSessionId, windowId) {
        try {
            // Query the terminal for recent output with error handling
            const terminalResponse = await this.executeWithRetry(
                () => this.airtopClient.windows.pageQuery(airtopSessionId, windowId, {
                    prompt: 'Capture the latest terminal output from Claude Code CLI. Look for command executions, build progress, npm installs, file creation messages, and any console output. Return the last 10-15 lines of terminal text.'
                }),
                'capture_terminal_output',
                2,
                1000
            );
            
            if (terminalResponse.data && terminalResponse.data.content) {
                const content = terminalResponse.data.content;
                
                // Parse terminal lines
                const lines = content.split('\n').filter(line => line.trim().length > 0);
                
                // Update session with terminal output
                this.sessionManager.updateSession(sessionId, {
                    terminalOutput: {
                        timestamp: new Date(),
                        lines: lines.slice(-10), // Keep last 10 lines
                        rawContent: content
                    }
                });
                
                console.log(`📺 Terminal output captured for session: ${sessionId} (${lines.length} lines)`);
                return lines;
            }
            
            return [];
            
        } catch (error) {
            // Handle specific error types
            const errorType = this.classifyError(error);
            
            if (errorType === 'rate_limit') {
                console.warn(`🚦 Rate limit while capturing terminal output, skipping this cycle`);
                return [];
            }
            
            console.error(`❌ Error capturing terminal output (${errorType}):`, error.message);
            return [];
        }
    }
    
    /**
     * Enhanced completion detection with file monitoring
     */
    async checkForCompletion(sessionId, airtopSessionId, windowId) {
        try {
            // Check for completion indicators in terminal/UI with error handling
            const completionResponse = await this.executeWithRetry(
                () => this.airtopClient.windows.pageQuery(airtopSessionId, windowId, {
                    prompt: 'Check if Claude Code has finished building the project. Look for indicators like "Project completed", "Build successful", "All done", or similar completion messages. Also check for file creation notifications. Return "COMPLETED" if the project is finished, "BUILDING" if still in progress, or "ERROR" if there are errors.'
                }),
                'check_completion',
                2,
                1000
            );
            
            // Monitor file system changes with error handling
            const fileSystemResponse = await this.executeWithRetry(
                () => this.airtopClient.windows.pageQuery(airtopSessionId, windowId, {
                    prompt: 'Check the file explorer or project directory for newly created files. Look for build outputs, dist folders, generated files, or zip archives. Return details about any new files or folders created.'
                }),
                'check_file_system',
                2,
                1000
            );
            
            let hasCompletionIndicator = false;
            let hasErrorIndicator = false;
            let fileSystemChanges = [];
            
            // Process completion response
            if (completionResponse.data && completionResponse.data.content) {
                const content = completionResponse.data.content.toLowerCase();
                
                // Check for completion indicators
                const completionIndicators = [
                    'completed',
                    'build successful',
                    'all done',
                    'project finished',
                    'build complete',
                    'successfully built',
                    'ready for download',
                    'project created',
                    'files generated',
                    'zip file created'
                ];
                
                hasCompletionIndicator = completionIndicators.some(indicator => 
                    content.includes(indicator)
                );
                
                // Check for error indicators
                const errorIndicators = [
                    'error',
                    'failed',
                    'build failed',
                    'compilation error',
                    'fatal error'
                ];
                
                hasErrorIndicator = errorIndicators.some(indicator => 
                    content.includes(indicator)
                );
            }
            
            // Process file system changes
            if (fileSystemResponse.data && fileSystemResponse.data.content) {
                const fileContent = fileSystemResponse.data.content;
                
                // Look for new files/folders
                const fileIndicators = [
                    'new file',
                    'new folder',
                    'dist/',
                    'build/',
                    'output/',
                    '.zip',
                    'created file',
                    'generated'
                ];
                
                const hasNewFiles = fileIndicators.some(indicator => 
                    fileContent.toLowerCase().includes(indicator)
                );
                
                if (hasNewFiles) {
                    fileSystemChanges.push({
                        type: 'file_creation',
                        content: fileContent,
                        timestamp: new Date()
                    });
                }
            }
            
            // Update session with file system monitoring data
            if (fileSystemChanges.length > 0) {
                this.sessionManager.updateSession(sessionId, {
                    fileSystemChanges: fileSystemChanges,
                    progress: {
                        stage: 'file_generation',
                        percentage: 85,
                        message: 'Files being generated...'
                    }
                });
            }
            
            // Handle errors
            if (hasErrorIndicator) {
                console.log(`❌ Error detected in session: ${sessionId}`);
                this.sessionManager.updateSession(sessionId, {
                    status: 'error',
                    progress: {
                        stage: 'error',
                        percentage: 0,
                        message: 'Build encountered errors'
                    }
                });
                return true; // Stop monitoring
            }
            
            // Check for completion based on multiple indicators
            const isComplete = hasCompletionIndicator || fileSystemChanges.length > 0;
            
            if (isComplete) {
                console.log(`✅ Enhanced completion detected: UI indicators: ${hasCompletionIndicator}, File changes: ${fileSystemChanges.length}`);
            }
            
            return isComplete;
            
        } catch (error) {
            console.error(`❌ Error in enhanced completion detection:`, error);
            return false;
        }
    }
    
    /**
     * Automatic file download and extraction
     */
    async checkForDownloadableFiles(sessionId, airtopSessionId, windowId) {
        try {
            console.log(`📁 Checking for downloadable files in session: ${sessionId}`);
            
            // Query for download links or file creation indicators with error handling
            const downloadResponse = await this.executeWithRetry(
                () => this.airtopClient.windows.pageQuery(airtopSessionId, windowId, {
                    prompt: 'Look for download links, zip files, or any downloadable project files. Check the "Recent Files" section or any download buttons. Return information about available downloads including specific download URLs or file paths.'
                }),
                'check_downloads',
                2,
                1000
            );
            
            if (downloadResponse.data && downloadResponse.data.content) {
                const content = downloadResponse.data.content;
                
                // Try to identify and trigger downloads
                const downloadUrls = this.extractDownloadUrls(content);
                const downloadResults = [];
                
                for (const downloadUrl of downloadUrls) {
                    try {
                        const result = await this.initiateDownload(sessionId, airtopSessionId, windowId, downloadUrl);
                        downloadResults.push(result);
                    } catch (error) {
                        console.error(`❌ Failed to download ${downloadUrl}:`, error);
                    }
                }
                
                // Update session with download information
                this.sessionManager.updateSession(sessionId, {
                    downloadInfo: {
                        available: true,
                        content: content,
                        urls: downloadUrls,
                        results: downloadResults,
                        timestamp: new Date()
                    },
                    progress: {
                        stage: 'download_ready',
                        percentage: 100,
                        message: downloadResults.length > 0 ? 
                            `Project completed! ${downloadResults.length} files downloaded.` : 
                            'Project completed and ready for download!'
                    }
                });
                
                console.log(`📥 Download processing complete for session: ${sessionId} (${downloadResults.length} files)`);
            }
            
        } catch (error) {
            console.error(`❌ Error in automatic file download:`, error);
        }
    }
    
    /**
     * Extract download URLs from content
     */
    extractDownloadUrls(content) {
        const urls = [];
        
        // Look for common download patterns
        const downloadPatterns = [
            /https?:\/\/[^\s]+\.zip/gi,
            /https?:\/\/[^\s]+\/download[^\s]*/gi,
            /\/download\/[^\s]+/gi,
            /replit\.com\/[^\s]+\/download/gi
        ];
        
        downloadPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                urls.push(...matches);
            }
        });
        
        // Look for file references
        const filePatterns = [
            /[^\s]+\.zip/gi,
            /[^\s]+\.tar\.gz/gi,
            /[^\s]+\.rar/gi
        ];
        
        filePatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                urls.push(...matches);
            }
        });
        
        return [...new Set(urls)]; // Remove duplicates
    }
    
    /**
     * Initiate download of a file
     */
    async initiateDownload(sessionId, airtopSessionId, windowId, downloadUrl) {
        try {
            console.log(`📥 Initiating download for: ${downloadUrl}`);
            
            // Try to click download link or trigger download with error handling
            const downloadResponse = await this.executeWithRetry(
                () => this.airtopClient.windows.pageQuery(airtopSessionId, windowId, {
                    prompt: `Click on the download link or button for "${downloadUrl}". If it's a direct link, navigate to it. If it's a file name, look for the corresponding download button.`
                }),
                'initiate_download',
                2,
                1000
            );
            
            // Wait for download to start
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check if download was successful with error handling
            const downloadCheckResponse = await this.executeWithRetry(
                () => this.airtopClient.windows.pageQuery(airtopSessionId, windowId, {
                    prompt: 'Check if a download has started. Look for download progress, download notifications, or files in the downloads folder.'
                }),
                'check_download_status',
                2,
                1000
            );
            
            const result = {
                url: downloadUrl,
                initiated: true,
                status: downloadCheckResponse.data?.content || 'Download initiated',
                timestamp: new Date()
            };
            
            console.log(`✅ Download initiated for: ${downloadUrl}`);
            return result;
            
        } catch (error) {
            console.error(`❌ Error initiating download for ${downloadUrl}:`, error);
            return {
                url: downloadUrl,
                initiated: false,
                error: error.message,
                timestamp: new Date()
            };
        }
    }
    
    /**
     * Get session status
     */
    getSessionStatus(sessionId) {
        console.log(`📊 Getting status for session: ${sessionId}`);
        return this.sessionManager.getSession(sessionId);
    }
    
    /**
     * Terminate a session
     */
    async terminateSession(sessionId) {
        console.log(`🛑 Terminating session: ${sessionId}`);
        
        try {
            // Get session data to access Airtop session
            const sessionData = this.sessionManager.getSession(sessionId);
            if (sessionData.success && sessionData.data.airtopSessionId) {
                // Clean up completion monitoring interval
                if (sessionData.data.completionMonitorInterval) {
                    clearInterval(sessionData.data.completionMonitorInterval);
                    console.log(`🔍 Completion monitoring interval cleared for session: ${sessionId}`);
                }
                
                // Terminate Airtop session with error handling
                await this.executeWithRetry(
                    () => this.airtopClient.sessions.terminate(sessionData.data.airtopSessionId),
                    'terminate_airtop_session',
                    2,
                    1000
                );
                console.log(`✅ Airtop session terminated: ${sessionData.data.airtopSessionId}`);
            }
            
            // Terminate in session manager
            return await this.sessionManager.terminateSession(sessionId, 'Manual termination');
            
        } catch (error) {
            console.error(`❌ Failed to terminate session ${sessionId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get system status
     */
    getSystemStatus() {
        return {
            bridge: {
                initialized: this.isInitialized,
                airtopClient: !!this.airtopClient
            },
            sessions: this.sessionManager.getSystemStatus()
        };
    }
    
    /**
     * Enhanced error recovery: Execute operation with retry logic
     */
    async executeWithRetry(operation, operationName, maxRetries = 3, baseDelay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                console.warn(`⚠️ ${operationName} attempt ${attempt} failed:`, error.message);
                
                // Check if this is a rate limit error (429)
                if (error.response?.status === 429) {
                    const retryAfter = error.response?.headers?.['retry-after'];
                    const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt - 1);
                    
                    console.log(`🚦 Rate limit hit, waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                // Check if this is a temporary error
                if (this.isTemporaryError(error)) {
                    if (attempt < maxRetries) {
                        const delay = baseDelay * Math.pow(2, attempt - 1);
                        console.log(`🔄 Retrying ${operationName} in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                }
                
                // If we get here, either it's not retryable or we've exhausted retries
                throw error;
            }
        }
    }
    
    /**
     * Classify error type for intelligent retry decisions
     */
    classifyError(error) {
        if (error.response?.status === 429) {
            return 'rate_limit';
        }
        if (error.response?.status >= 500) {
            return 'server_error';
        }
        if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
            return 'connection_error';
        }
        if (error.message?.includes('timeout')) {
            return 'timeout';
        }
        if (error.response?.status === 401) {
            return 'authentication_error';
        }
        if (error.response?.status === 403) {
            return 'permission_error';
        }
        return 'unknown_error';
    }
    
    /**
     * Determine if an error should be retried
     */
    shouldRetryError(errorType) {
        const retryableErrors = [
            'rate_limit',
            'server_error',
            'connection_error',
            'timeout'
        ];
        return retryableErrors.includes(errorType);
    }
    
    /**
     * Calculate retry delay based on error type
     */
    calculateRetryDelay(retryCount, errorType) {
        let baseDelay = 1000; // 1 second base delay
        
        switch (errorType) {
            case 'rate_limit':
                baseDelay = 5000; // 5 seconds for rate limits
                break;
            case 'server_error':
                baseDelay = 2000; // 2 seconds for server errors
                break;
            case 'connection_error':
                baseDelay = 1000; // 1 second for connection errors
                break;
            case 'timeout':
                baseDelay = 3000; // 3 seconds for timeouts
                break;
        }
        
        // Exponential backoff with jitter
        const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
        const jitter = Math.random() * 1000; // Add up to 1 second of jitter
        
        return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
    }
    
    /**
     * Check if error is temporary and should be retried
     */
    isTemporaryError(error) {
        const temporaryErrors = [
            'ECONNRESET',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENOTFOUND'
        ];
        
        return temporaryErrors.includes(error.code) || 
               error.response?.status >= 500 ||
               error.response?.status === 429;
    }
    
    /**
     * Circuit breaker pattern for API calls
     */
    initializeCircuitBreaker() {
        this.circuitBreaker = {
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            failures: 0,
            lastFailureTime: null,
            timeout: 60000, // 1 minute timeout
            threshold: 5 // 5 failures to open circuit
        };
    }
    
    /**
     * Execute with circuit breaker protection
     */
    async executeWithCircuitBreaker(operation, operationName) {
        if (!this.circuitBreaker) {
            this.initializeCircuitBreaker();
        }
        
        const cb = this.circuitBreaker;
        
        // Check if circuit is open
        if (cb.state === 'OPEN') {
            const timeSinceLastFailure = Date.now() - cb.lastFailureTime;
            
            if (timeSinceLastFailure < cb.timeout) {
                throw new Error(`Circuit breaker is OPEN for ${operationName}. Try again in ${cb.timeout - timeSinceLastFailure}ms`);
            } else {
                cb.state = 'HALF_OPEN';
                console.log(`🔄 Circuit breaker moving to HALF_OPEN for ${operationName}`);
            }
        }
        
        try {
            const result = await operation();
            
            // Reset circuit breaker on success
            if (cb.state === 'HALF_OPEN') {
                cb.state = 'CLOSED';
                cb.failures = 0;
                console.log(`✅ Circuit breaker reset to CLOSED for ${operationName}`);
            }
            
            return result;
            
        } catch (error) {
            cb.failures++;
            cb.lastFailureTime = Date.now();
            
            if (cb.failures >= cb.threshold) {
                cb.state = 'OPEN';
                console.error(`🚨 Circuit breaker OPENED for ${operationName} after ${cb.failures} failures`);
            }
            
            throw error;
        }
    }
    
    /**
     * Export completed project as ZIP
     */
    async exportCompletedProject(sessionId) {
        try {
            console.log(`📦 Exporting completed project for session: ${sessionId}`);
            
            const monitoringCallback = (message) => {
                console.log(`📺 [${sessionId}] ${message}`);
            };
            
            const exportResult = await this.projectManager.exportProject(sessionId, monitoringCallback);
            
            if (exportResult.success) {
                this.sessionManager.updateSession(sessionId, {
                    exportInfo: {
                        exported: true,
                        projectName: exportResult.projectName,
                        exportFormat: exportResult.exportFormat,
                        timestamp: new Date()
                    }
                });
                
                console.log(`✅ Project exported successfully: ${exportResult.projectName}`);
            } else {
                console.error(`❌ Project export failed: ${exportResult.error}`);
            }
            
        } catch (error) {
            console.error(`❌ Error exporting project for session ${sessionId}:`, error);
        }
    }
}

// Export singleton instance
let bridgeInstance = null;

function getAirtopClaudeBridge() {
    if (!bridgeInstance) {
        bridgeInstance = new AirtopClaudeBridge();
    }
    return bridgeInstance;
}

module.exports = {
    AirtopClaudeBridge,
    getAirtopClaudeBridge
};