/**
 * Real Autonomous Builder
 * 
 * Orchestrates the complete autonomous development pipeline:
 * Enhanced Brief → Real File Generation → Real Deployment → Real GitHub Repo
 */

const { ClaudeCodeCLIManager } = require('./claude-code-cli-manager');
const { ProjectGenerator } = require('./project-generator');
const { DeploymentManager } = require('./deployment-manager');
const { GitHubManager } = require('./github-manager');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const EventEmitter = require('events');

class RealAutonomousBuilder extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.logger = options.logger || console;
        this.projectsDir = options.projectsDir || path.join(__dirname, '../../projects');
        
        // Initialize real components
        this.claudeManager = new ClaudeCodeCLIManager({
            projectsDir: this.projectsDir,
            anthropicApiKey: options.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
            logger: this.logger
        });
        
        this.projectGenerator = new ProjectGenerator({
            projectsDir: this.projectsDir,
            logger: this.logger
        });
        
        this.deploymentManager = new DeploymentManager({
            vercelToken: options.vercelToken || process.env.VERCEL_TOKEN,
            netlifyToken: options.netlifyToken || process.env.NETLIFY_TOKEN,
            githubToken: options.githubToken || process.env.GITHUB_TOKEN,
            logger: this.logger
        });
        
        this.githubManager = new GitHubManager({
            githubToken: options.githubToken || process.env.GITHUB_TOKEN,
            username: options.githubUsername || process.env.GITHUB_USERNAME,
            logger: this.logger
        });
        
        // Check which features are enabled
        this.features = {
            github: this.githubManager.isEnabled,
            deployment: !!(options.vercelToken || process.env.VERCEL_TOKEN || options.netlifyToken || process.env.NETLIFY_TOKEN),
            claude: !!(options.anthropicApiKey || process.env.ANTHROPIC_API_KEY)
        };
        
        // Build session tracking
        this.activeBuildSessions = new Map();
        this.buildHistory = [];
        
        // Performance metrics
        this.metrics = {
            buildsStarted: 0,
            buildsCompleted: 0,
            buildsFailed: 0,
            averageBuildTime: 0,
            totalBuildTime: 0,
            filesGenerated: 0,
            deploymentsCreated: 0,
            repositoriesCreated: 0
        };
        
        // Set up event handlers
        this._setupEventHandlers();
    }

    /**
     * Main entry point: Build complete autonomous project from enhanced brief
     */
    async buildAutonomousProject(enhancedBrief, options = {}) {
        const buildId = uuidv4();
        const startTime = Date.now();
        
        try {
            this.logger.log(`🚀 Starting autonomous build: ${buildId}`);
            this.logger.log(`📝 Enhanced brief: ${enhancedBrief.substring(0, 100)}...`);
            
            // Create build session
            const buildSession = {
                id: buildId,
                enhancedBrief,
                options,
                status: 'initializing',
                startTime,
                progress: {
                    phase: 'initialization',
                    percentage: 0,
                    currentTask: 'Setting up build environment',
                    completedTasks: [],
                    estimatedTimeRemaining: 300000 // 5 minutes estimate
                },
                results: {},
                logs: []
            };
            
            this.activeBuildSessions.set(buildId, buildSession);
            this.metrics.buildsStarted++;
            this.emit('buildStarted', buildSession);
            
            // Phase 1: Choose build strategy
            const strategy = options.strategy || 'hybrid'; // 'claude-only', 'generator-only', 'hybrid'
            buildSession.strategy = strategy;
            
            let projectResult;
            
            if (strategy === 'claude-only') {
                // Use Claude Code CLI exclusively
                projectResult = await this._buildWithClaudeOnly(buildSession);
            } else if (strategy === 'generator-only') {
                // Use internal project generator
                projectResult = await this._buildWithGeneratorOnly(buildSession);
            } else {
                // Hybrid approach: Try Claude first, fallback to generator
                projectResult = await this._buildWithHybridApproach(buildSession);
            }
            
            buildSession.results.project = projectResult;
            buildSession.progress.percentage = 30;
            buildSession.progress.currentTask = 'Project generation completed';
            this.emit('buildProgress', buildSession);
            
            // Phase 2: Create GitHub Repository (if enabled)
            if (options.createGitHubRepo !== false) {
                buildSession.progress.phase = 'github-creation';
                buildSession.progress.currentTask = 'Creating GitHub repository';
                buildSession.progress.percentage = 40;
                this.emit('buildProgress', buildSession);
                
                const githubResult = await this._createGitHubRepository(buildSession, projectResult);
                buildSession.results.github = githubResult;
                
                if (githubResult.success) {
                    this.metrics.repositoriesCreated++;
                }
                
                buildSession.progress.percentage = 60;
                buildSession.progress.currentTask = 'GitHub repository created';
                this.emit('buildProgress', buildSession);
            }
            
            // Phase 3: Deploy Project (if enabled)
            if (options.deploy !== false) {
                buildSession.progress.phase = 'deployment';
                buildSession.progress.currentTask = 'Deploying project';
                buildSession.progress.percentage = 70;
                this.emit('buildProgress', buildSession);
                
                const deploymentResult = await this._deployProject(buildSession, projectResult, options.deploymentPlatform);
                buildSession.results.deployment = deploymentResult;
                
                if (deploymentResult.success) {
                    this.metrics.deploymentsCreated++;
                }
                
                buildSession.progress.percentage = 90;
                buildSession.progress.currentTask = 'Deployment completed';
                this.emit('buildProgress', buildSession);
            }
            
            // Phase 4: Finalization
            buildSession.status = 'completed';
            buildSession.endTime = Date.now();
            buildSession.duration = buildSession.endTime - buildSession.startTime;
            buildSession.progress.phase = 'completed';
            buildSession.progress.percentage = 100;
            buildSession.progress.currentTask = 'Build completed successfully';
            
            // Update metrics
            this.metrics.buildsCompleted++;
            this.metrics.totalBuildTime += buildSession.duration;
            this.metrics.averageBuildTime = this.metrics.totalBuildTime / this.metrics.buildsCompleted;
            
            // Generate final summary
            const summary = this._generateBuildSummary(buildSession);
            buildSession.summary = summary;
            
            this.emit('buildCompleted', buildSession);
            this.logger.log(`✅ Autonomous build completed: ${buildId} in ${buildSession.duration}ms`);
            
            return {
                success: true,
                buildId,
                duration: buildSession.duration,
                project: projectResult,
                github: buildSession.results.github,
                deployment: buildSession.results.deployment,
                summary,
                liveUrl: buildSession.results.deployment?.url,
                repositoryUrl: buildSession.results.github?.repository?.url
            };
            
        } catch (error) {
            this.logger.error(`❌ Autonomous build failed: ${buildId}`, error);
            
            const buildSession = this.activeBuildSessions.get(buildId);
            if (buildSession) {
                buildSession.status = 'failed';
                buildSession.error = error.message;
                buildSession.endTime = Date.now();
                buildSession.duration = buildSession.endTime - buildSession.startTime;
            }
            
            this.metrics.buildsFailed++;
            this.emit('buildFailed', { buildId, error: error.message });
            
            return {
                success: false,
                buildId,
                error: error.message
            };
        } finally {
            // Move to history and cleanup
            const buildSession = this.activeBuildSessions.get(buildId);
            if (buildSession) {
                this.buildHistory.push(buildSession);
                this.activeBuildSessions.delete(buildId);
            }
        }
    }

    /**
     * Build using Claude Code CLI only
     */
    async _buildWithClaudeOnly(buildSession) {
        this.logger.log(`🤖 Building with Claude Code CLI`);
        
        buildSession.progress.phase = 'claude-generation';
        buildSession.progress.currentTask = 'Executing Claude Code CLI';
        this.emit('buildProgress', buildSession);
        
        const result = await this.claudeManager.executeAutonomousBuild(
            buildSession.enhancedBrief,
            buildSession.options
        );
        
        if (!result.success) {
            throw new Error(`Claude Code execution failed: ${result.error}`);
        }
        
        // Install dependencies if needed
        if (result.analysis && result.analysis.packageJson) {
            await this.claudeManager.installDependencies(result.projectPath);
        }
        
        return result;
    }

    /**
     * Build using internal project generator only
     */
    async _buildWithGeneratorOnly(buildSession) {
        this.logger.log(`🏗️ Building with internal project generator`);
        
        buildSession.progress.phase = 'file-generation';
        buildSession.progress.currentTask = 'Generating project files';
        this.emit('buildProgress', buildSession);
        
        const result = await this.projectGenerator.generateProject(
            buildSession.enhancedBrief,
            buildSession.options
        );
        
        this.metrics.filesGenerated += result.files.length;
        
        return {
            success: true,
            projectId: result.id,
            projectPath: result.path,
            analysis: {
                hasMainFile: true,
                files: result.files.map(f => f.path),
                framework: result.requirements.framework,
                dependencies: result.requirements.features
            },
            deploymentReady: true
        };
    }

    /**
     * Build using hybrid approach (Claude first, fallback to generator)
     */
    async _buildWithHybridApproach(buildSession) {
        this.logger.log(`🔄 Building with hybrid approach`);
        
        try {
            // First, try Claude Code CLI
            buildSession.progress.currentTask = 'Attempting Claude Code CLI generation';
            this.emit('buildProgress', buildSession);
            
            const claudeResult = await this.claudeManager.executeAutonomousBuild(
                buildSession.enhancedBrief,
                { ...buildSession.options, timeout: 180000 } // 3 minute timeout for Claude
            );
            
            if (claudeResult.success && claudeResult.analysis.hasMainFile) {
                this.logger.log(`✅ Claude Code CLI succeeded`);
                
                // Install dependencies if needed
                if (claudeResult.analysis.packageJson) {
                    await this.claudeManager.installDependencies(claudeResult.projectPath);
                }
                
                return claudeResult;
            } else {
                this.logger.log(`⚠️ Claude Code CLI incomplete, falling back to generator`);
                throw new Error('Claude result incomplete or missing main file');
            }
            
        } catch (error) {
            this.logger.log(`⚠️ Claude Code CLI failed, using project generator: ${error.message}`);
            
            // Fallback to project generator
            buildSession.progress.currentTask = 'Falling back to project generator';
            this.emit('buildProgress', buildSession);
            
            return await this._buildWithGeneratorOnly(buildSession);
        }
    }

    /**
     * Create GitHub repository for the project
     */
    async _createGitHubRepository(buildSession, projectResult) {
        try {
            // Extract project name from enhanced brief or use project ID
            const projectName = this._extractProjectName(buildSession.enhancedBrief) || projectResult.projectId;
            
            const githubOptions = {
                description: `Autonomously generated project: ${projectName}`,
                private: buildSession.options.privateRepo || false,
                enablePages: buildSession.options.enableGitHubPages !== false,
                topics: ['coder1ide', 'autonomous-development', 'ai-generated'],
                homepage: buildSession.results.deployment?.url || ''
            };
            
            const result = await this.githubManager.createRepository(
                projectName,
                projectResult.projectPath,
                githubOptions
            );
            
            if (result.success) {
                this.logger.log(`🐙 GitHub repository created: ${result.repository.url}`);
            }
            
            return result;
            
        } catch (error) {
            this.logger.error(`❌ GitHub repository creation failed:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Deploy the project to specified platform
     */
    async _deployProject(buildSession, projectResult, platform = 'vercel') {
        try {
            const projectName = this._extractProjectName(buildSession.enhancedBrief) || projectResult.projectId;
            
            const deploymentOptions = {
                projectName,
                ...buildSession.options.deploymentOptions
            };
            
            const result = await this.deploymentManager.deployProject(
                projectResult.projectPath,
                platform,
                deploymentOptions
            );
            
            if (result.success) {
                this.logger.log(`🌐 Project deployed: ${result.url}`);
            }
            
            return result;
            
        } catch (error) {
            this.logger.error(`❌ Deployment failed:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate build summary
     */
    _generateBuildSummary(buildSession) {
        const summary = {
            buildId: buildSession.id,
            duration: buildSession.duration,
            strategy: buildSession.strategy,
            success: buildSession.status === 'completed',
            components: {
                projectGeneration: !!buildSession.results.project,
                githubRepository: !!buildSession.results.github?.success,
                deployment: !!buildSession.results.deployment?.success
            },
            metrics: {
                filesCreated: buildSession.results.project?.analysis?.files?.length || 0,
                framework: buildSession.results.project?.analysis?.framework || 'unknown',
                deploymentPlatform: buildSession.results.deployment?.platform || 'none'
            },
            urls: {
                live: buildSession.results.deployment?.url || null,
                repository: buildSession.results.github?.repository?.url || null,
                deploymentDashboard: buildSession.results.deployment?.deploymentUrl || null
            },
            timestamps: {
                started: new Date(buildSession.startTime).toISOString(),
                completed: new Date(buildSession.endTime).toISOString()
            }
        };
        
        return summary;
    }

    /**
     * Extract project name from enhanced brief
     */
    _extractProjectName(enhancedBrief) {
        // Try to extract project name from the brief
        const namePatterns = [
            /project name[:\s]+([^\n.]+)/i,
            /building[:\s]+([^\n.]+)/i,
            /create[:\s]+([^\n.]+)/i
        ];
        
        for (const pattern of namePatterns) {
            const match = enhancedBrief.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        return null;
    }

    /**
     * Set up event handlers for component monitoring
     */
    _setupEventHandlers() {
        // Claude Code CLI events
        this.claudeManager.on('sessionStarted', (session) => {
            this.emit('claudeSessionStarted', session);
        });
        
        this.claudeManager.on('sessionOutput', (data) => {
            this.emit('claudeOutput', data);
        });
        
        this.claudeManager.on('sessionCompleted', (session) => {
            this.emit('claudeSessionCompleted', session);
        });
        
        // Deployment events
        this.deploymentManager.on('deploymentStarted', (deployment) => {
            this.emit('deploymentStarted', deployment);
        });
        
        this.deploymentManager.on('deploymentCompleted', (deployment) => {
            this.emit('deploymentCompleted', deployment);
        });
    }

    /**
     * Get build session status
     */
    getBuildStatus(buildId) {
        const activeSession = this.activeBuildSessions.get(buildId);
        if (activeSession) {
            return { ...activeSession, isActive: true };
        }
        
        const historicalSession = this.buildHistory.find(s => s.id === buildId);
        if (historicalSession) {
            return { ...historicalSession, isActive: false };
        }
        
        return null;
    }

    /**
     * Get all active builds
     */
    getActiveBuilds() {
        return Array.from(this.activeBuildSessions.values());
    }

    /**
     * Get build history
     */
    getBuildHistory(limit = 50) {
        return this.buildHistory
            .slice(-limit)
            .sort((a, b) => b.startTime - a.startTime);
    }

    /**
     * Get comprehensive metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            activeBuilds: this.activeBuildSessions.size,
            totalBuilds: this.buildHistory.length,
            successRate: this.metrics.buildsStarted > 0 ? 
                (this.metrics.buildsCompleted / this.metrics.buildsStarted) * 100 : 0,
            components: {
                claude: this.claudeManager.getMetrics(),
                deployment: this.deploymentManager.getMetrics(),
                github: this.githubManager.getMetrics()
            }
        };
    }

    /**
     * Terminate an active build
     */
    async terminateBuild(buildId) {
        const buildSession = this.activeBuildSessions.get(buildId);
        if (!buildSession) {
            throw new Error(`Build ${buildId} not found or not active`);
        }
        
        buildSession.status = 'terminated';
        buildSession.endTime = Date.now();
        buildSession.duration = buildSession.endTime - buildSession.startTime;
        
        this.buildHistory.push(buildSession);
        this.activeBuildSessions.delete(buildId);
        
        this.emit('buildTerminated', buildSession);
        return buildSession;
    }
}

module.exports = { RealAutonomousBuilder };