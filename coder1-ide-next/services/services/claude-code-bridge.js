"use strict";
/**
 * Claude Code Bridge Service
 *
 * Replaces expensive AI orchestrator with cost-free git work tree coordination.
 * Monitors external Claude Code sessions instead of spawning API-based agents.
 * Implements the YouTube transcript parallel development concept using
 * git work trees + Claude Code sessions + dashboard monitoring.
 *
 * Cost Impact: $90/month → $0/month (100% savings)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeCodeBridgeService = void 0;
exports.getClaudeCodeBridgeService = getClaudeCodeBridgeService;
const events_1 = require("events");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const logger_1 = require("../lib/logger");
const enhanced_tmux_service_1 = require("./enhanced-tmux-service");
class ClaudeCodeBridgeService extends events_1.EventEmitter {
    constructor() {
        super();
        this.teams = new Map();
        this.monitoringIntervals = new Map();
        this.claudeProcesses = new Map(); // Track Claude processes
        this.isInitialized = false;
        // Safety mechanisms
        this.MAX_CONCURRENT_TEAMS = 3;
        this.MAX_AGENTS_PER_TEAM = 5;
        this.PROCESS_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
        this.MAX_WORKTREE_SIZE_MB = 500; // Max size per work tree
        this.emergencyStopTriggered = false;
        this.processTimeouts = new Map();
        this.projectRoot = process.env.PROJECT_ROOT || process.cwd();
        this.workTreeRoot = path.join(this.projectRoot, '.claude-parallel-dev'); // Unified directory
        this.tmuxService = (0, enhanced_tmux_service_1.getEnhancedTmuxService)();
        this.initialize().catch(error => {
            logger_1.logger.error('❌ Bridge service initialization failed in constructor:', error);
            this.isInitialized = false;
        });
    }
    async initialize() {
        try {
            // Validate git repository state before anything else
            await this.validateRepositoryState();
            // Ensure work tree directory exists
            await fs_1.promises.mkdir(this.workTreeRoot, { recursive: true });
            // Validate Claude Code CLI availability
            await this.validateClaudeCodeCLI();
            // Clean up old work trees on startup
            await this.cleanupOrphanedWorkTrees();
            this.isInitialized = true;
            logger_1.logger.info('🔗 Claude Code Bridge Service initialized successfully');
            logger_1.logger.info(`📁 Unified work tree root: ${this.workTreeRoot}`);
            logger_1.logger.info(`🎯 Git repository: ${this.projectRoot}`);
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to initialize Claude Code Bridge Service:', error);
            this.isInitialized = false;
            throw new Error(`Bridge service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Check if the service is initialized
     */
    isServiceInitialized() {
        return this.isInitialized;
    }
    /**
     * Validate git repository state and permissions
     */
    async validateRepositoryState() {
        try {
            // Check if directory is a git repository
            const gitDir = path.join(this.projectRoot, '.git');
            await fs_1.promises.access(gitDir);
            // Check git status for uncommitted changes
            const gitStatus = await this.executeCommand('git status --porcelain', this.projectRoot);
            if (gitStatus.stdout.trim().length > 0) {
                logger_1.logger.warn('⚠️ Repository has uncommitted changes - work trees will be created from current HEAD');
                logger_1.logger.warn('💡 Consider committing changes before spawning parallel teams');
            }
            // Verify git permissions
            await this.executeCommand('git rev-parse HEAD', this.projectRoot);
            // Check if current directory allows work tree creation
            await this.executeCommand('git worktree list', this.projectRoot);
            logger_1.logger.debug('✅ Git repository state validated');
        }
        catch (error) {
            throw new Error(`Git repository validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Validate Claude Code CLI availability and authentication
     */
    async validateClaudeCodeCLI() {
        try {
            // Check if Claude CLI is available
            await this.executeCommand('which claude', this.projectRoot);
            // Test Claude CLI with a simple ping-like command
            const testResult = await this.executeCommand('claude --print --output-format json "test"', this.projectRoot);
            // If we get here without error, Claude CLI is working
            logger_1.logger.debug('✅ Claude Code CLI validated and authenticated');
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw new Error('Claude Code CLI is not installed or not in PATH. Please install Claude Code first.');
            }
            else if (error instanceof Error && error.message.includes('authentication')) {
                throw new Error('Claude Code CLI authentication failed. Please run "claude setup-token" first.');
            }
            else {
                logger_1.logger.warn('⚠️ Claude Code CLI validation warning - proceeding with caution');
                logger_1.logger.warn(`Details: ${error instanceof Error ? error.message : 'Unknown error'}`);
                // Don't throw - allow initialization to continue with warning
            }
        }
    }
    /**
     * Spawn a parallel development team using git work trees + automated Claude Code execution
     * This replaces the expensive AI orchestrator approach with cost-free coordination
     *
     * NEW: Now supports CLI Puppeteer mode for true automation when enabled
     */
    async spawnParallelTeam(requirement, sessionId) {
        // CHECK FOR CLI PUPPETEER MODE FIRST
        const puppeteerEnabled = process.env.ENABLE_CLI_PUPPETEER === 'true';
        if (puppeteerEnabled) {
            logger_1.logger.info('🎭 CLI Puppeteer enabled - delegating to puppet bridge system');
            try {
                // Dynamic import to avoid loading when disabled
                const { getCoordinatorService } = await Promise.resolve().then(() => __importStar(require('./agent-coordinator')));
                const coordinator = getCoordinatorService();
                // Use coordinator workflow system instead of manual work trees
                const analysis = coordinator.analyzeRequirement(requirement);
                logger_1.logger.info(`🎭 Selected workflow: ${analysis.workflowId} (confidence: ${analysis.confidence})`);
                const workflowResult = await coordinator.executeWorkflow(analysis.workflowId, requirement, {
                    sessionId: sessionId || `puppet-${Date.now()}`,
                    timeout: 600000 // 10 minutes
                });
                // Transform workflow result to ParallelTeam format for API compatibility
                const compatibleTeam = {
                    teamId: workflowResult.sessionId,
                    sessionId: workflowResult.sessionId,
                    projectRequirement: requirement,
                    agents: workflowResult.agents.map((agent, index) => ({
                        id: agent.agentId,
                        name: agent.role,
                        role: agent.role,
                        workTreePath: agent.workTreePath || '',
                        branchName: `puppet-${agent.role}`,
                        sandboxId: agent.agentId,
                        status: agent.status || 'working',
                        currentTask: agent.currentTask || `Working as ${agent.role}`,
                        progress: agent.progress || 0,
                        lastActivity: new Date(),
                        setupCommand: `# Automated via CLI Puppeteer - no manual setup needed`,
                        completedTasks: agent.completedTasks || [],
                        files: 0
                    })),
                    baseBranch: 'main',
                    workTreeRoot: '/tmp/puppet-work-trees', // Not used in puppet mode
                    status: 'completed',
                    createdAt: new Date(),
                    startedAt: new Date(),
                    completedAt: new Date(),
                    workflow: analysis.workflowId,
                    context: {
                        puppeteerMode: true,
                        workflowTemplate: analysis.template.name,
                        automated: true,
                        costSavings: true
                    },
                    files: 0,
                    progress: {
                        overall: 100,
                        planning: 100,
                        development: 100,
                        testing: 100,
                        deployment: 100
                    }
                };
                logger_1.logger.info(`🎭 Puppeteer team spawned successfully: ${compatibleTeam.teamId}`);
                return compatibleTeam;
            }
            catch (puppeteerError) {
                logger_1.logger.error('🎭 Puppeteer delegation failed, falling back to original bridge mode:', puppeteerError);
                // Fall through to original implementation
            }
        }
        if (!this.isInitialized) {
            throw new Error('Claude Code Bridge Service is not initialized. Check logs for initialization errors.');
        }
        // Safety checks
        if (this.emergencyStopTriggered) {
            throw new Error('Emergency stop is active. Cannot spawn new teams.');
        }
        if (this.teams.size >= this.MAX_CONCURRENT_TEAMS) {
            throw new Error(`Maximum concurrent teams reached (${this.MAX_CONCURRENT_TEAMS}). Please wait for existing teams to complete.`);
        }
        if (!requirement || requirement.trim().length === 0) {
            throw new Error('Project requirement is required and cannot be empty');
        }
        if (requirement.length > 1000) {
            throw new Error('Project requirement is too long (max 1000 characters)');
        }
        const teamId = `team-${Date.now()}`;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const teamWorkTreeRoot = path.join(this.workTreeRoot, `${teamId}-${timestamp}`);
        logger_1.logger.info(`🚀 Spawning parallel Claude Code team: ${teamId} (${this.teams.size + 1}/${this.MAX_CONCURRENT_TEAMS})`);
        logger_1.logger.info(`📋 Requirement: ${requirement}`);
        // Track created resources for cleanup on failure
        const createdResources = [];
        try {
            // Re-validate git state before creating work trees
            await this.validateRepositoryState();
            // Create work tree directory
            await fs_1.promises.mkdir(teamWorkTreeRoot, { recursive: true });
            createdResources.push(teamWorkTreeRoot);
            // Determine agent roles based on requirement (like current orchestrator)
            const agentRoles = this.determineAgentRoles(requirement);
            const workflow = this.determineWorkflow(requirement);
            // Create git work trees for parallel development
            const agents = [];
            for (const role of agentRoles) {
                try {
                    const agent = await this.createWorkTreeAgent(teamId, role, teamWorkTreeRoot, requirement);
                    agents.push(agent);
                    createdResources.push(agent.workTreePath);
                }
                catch (error) {
                    logger_1.logger.error(`❌ Failed to create agent for role ${role}:`, error);
                    // Clean up partial resources and rethrow
                    await this.cleanupResources(createdResources);
                    throw new Error(`Failed to create ${role} agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            const team = {
                teamId,
                sessionId: sessionId || `session-${teamId}`,
                projectRequirement: requirement,
                agents,
                baseBranch: await this.getCurrentBranch(),
                workTreeRoot: teamWorkTreeRoot,
                status: 'ready',
                createdAt: new Date(),
                workflow,
                context: {
                    requirement,
                    agentRoles,
                    workTreeRoot: teamWorkTreeRoot,
                    automated: true // Flag indicating this is automated (not manual)
                },
                files: 0,
                progress: {
                    overall: 0,
                    planning: 0,
                    development: 0,
                    testing: 0,
                    deployment: 0
                }
            };
            this.teams.set(teamId, team);
            // Set timeout for team safety
            this.setTeamTimeout(teamId);
            // Start automated Claude Code execution immediately
            await this.startAutomatedExecution(team);
            logger_1.logger.info(`✅ Team ${teamId} spawned with ${agents.length} automated agents`);
            logger_1.logger.info(`🤖 Automated execution started for all agents`);
            // Emit WebSocket event for team spawn
            this.emit('team:spawned', {
                teamId: team.teamId,
                agents: agents.length,
                requirement: requirement,
                status: team.status
            });
            // Forward to global WebSocket
            if (global.forwardBridgeEvent) {
                global.forwardBridgeEvent('bridge:team:spawned', {
                    teamId: team.teamId,
                    agents: agents.length,
                    requirement: requirement,
                    status: team.status
                });
            }
            return team;
        }
        catch (error) {
            logger_1.logger.error(`❌ Failed to spawn team ${teamId}:`, error);
            // Clean up any partial resources
            await this.cleanupResources(createdResources);
            throw new Error(`Team spawn failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Start automated Claude Code execution for all agents in a team
     */
    async startAutomatedExecution(team) {
        team.status = 'working';
        team.startedAt = new Date();
        logger_1.logger.info(`🤖 Starting automated execution for team ${team.teamId}`);
        // Start each agent's Claude Code process
        for (const agent of team.agents) {
            try {
                await this.startAgentProcess(team.teamId, agent);
                // Start monitoring immediately
                this.startAgentMonitoring(team.teamId, agent);
            }
            catch (error) {
                logger_1.logger.error(`❌ Failed to start process for agent ${agent.id}:`, error);
                agent.status = 'error';
                agent.currentTask = `Failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
        }
        this.emit('team:execution-started', {
            teamId: team.teamId,
            team,
            agentCount: team.agents.length,
            automatedProcesses: team.agents.filter(a => a.status !== 'error').length
        });
    }
    /**
     * Start Claude Code process for a specific agent
     */
    async startAgentProcess(teamId, agent) {
        const prompt = this.generateAgentPrompt(agent.role, agent);
        logger_1.logger.info(`🚀 Starting Claude process for ${agent.name} (${agent.id})`);
        logger_1.logger.debug(`📝 Prompt: ${prompt.substring(0, 100)}...`);
        try {
            // Generate unique session ID for this agent
            const agentSessionId = `${teamId}-${agent.role}-${Date.now()}`;
            // If using tmux sandbox, run Claude in the sandbox
            if (this.tmuxService && agent.sandboxId && !agent.sandboxId.startsWith('fallback') && !agent.sandboxId.startsWith('direct')) {
                try {
                    // Build the Claude command with OAuth token
                    const claudeCommand = `CLAUDE_CODE_OAUTH_TOKEN="${process.env.CLAUDE_CODE_OAUTH_TOKEN}" claude --print --output-format json --session-id "${agentSessionId}" --dangerously-skip-permissions "${prompt}"`;
                    logger_1.logger.info(`🏃 Running Claude in tmux sandbox ${agent.sandboxId}`);
                    // Execute in sandbox using Enhanced Tmux Service
                    const childProcess = await this.tmuxService.executeInSandbox(agent.sandboxId, 'claude', [
                        '--print',
                        '--output-format', 'json',
                        '--session-id', agentSessionId,
                        '--dangerously-skip-permissions',
                        prompt
                    ]);
                    // Track the process
                    this.claudeProcesses.set(agent.id, childProcess);
                    agent.status = 'working';
                    agent.currentTask = `Starting ${agent.role} work in sandbox...`;
                    agent.progress = 5;
                    // Add timeout protection (30 seconds for initial response)
                    const processTimeout = setTimeout(() => {
                        logger_1.logger.error(`⏱️ Agent ${agent.id} timed out after 30 seconds`);
                        childProcess.kill('SIGTERM');
                        agent.status = 'error';
                        agent.currentTask = 'Timed out - authentication may have failed';
                        this.claudeProcesses.delete(agent.id);
                    }, 30000);
                    // Handle process output
                    childProcess.stdout?.on('data', (data) => {
                        clearTimeout(processTimeout);
                        this.handleAgentOutput(agent, data.toString());
                    });
                    childProcess.stderr?.on('data', (data) => {
                        const stderr = data.toString();
                        logger_1.logger.warn(`⚠️ Agent ${agent.id} stderr: ${stderr}`);
                    });
                    childProcess.on('exit', (code) => {
                        clearTimeout(processTimeout);
                        this.handleAgentExit(agent, code);
                        this.claudeProcesses.delete(agent.id);
                    });
                    return; // Exit early - we're using sandbox
                }
                catch (sandboxError) {
                    logger_1.logger.warn(`⚠️ Failed to run in sandbox, falling back to direct execution:`, sandboxError);
                    // Fall through to direct execution
                }
            }
            // Fallback: Direct execution without sandbox
            const claudeProcess = (0, child_process_1.spawn)('claude', [
                '--print',
                '--output-format', 'json',
                '--session-id', agentSessionId,
                '--dangerously-skip-permissions' // For automation
                // Note: prompt will be sent via stdin, not as CLI argument
            ], {
                cwd: agent.workTreePath,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    // CRITICAL: Pass OAuth token for Claude CLI authentication
                    CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
                    CLAUDE_AGENT_ID: agent.id,
                    CLAUDE_AGENT_ROLE: agent.role,
                    CLAUDE_WORK_TREE: agent.workTreePath
                }
            });
            // Send prompt via stdin (CRITICAL FIX for file creation)
            claudeProcess.stdin.write(prompt + '\n');
            claudeProcess.stdin.end();
            // Track the process
            this.claudeProcesses.set(agent.id, claudeProcess);
            agent.status = 'working';
            agent.currentTask = `Starting ${agent.role} work...`;
            agent.progress = 5;
            // Add timeout protection (90 seconds for initial response - Claude needs time)
            const processTimeout = setTimeout(() => {
                logger_1.logger.error(`⏱️ Agent ${agent.id} timed out after 90 seconds`);
                claudeProcess.kill('SIGTERM');
                agent.status = 'error';
                agent.currentTask = 'Timed out - authentication may have failed';
                this.claudeProcesses.delete(agent.id);
            }, 90000); // 90 second timeout for Claude to authenticate and start
            // Handle process output
            claudeProcess.stdout?.on('data', (data) => {
                clearTimeout(processTimeout); // Clear timeout on first output
                this.handleAgentOutput(agent, data.toString());
            });
            claudeProcess.stderr?.on('data', (data) => {
                const stderr = data.toString();
                logger_1.logger.warn(`⚠️ Agent ${agent.id} stderr: ${stderr}`);
                // Don't mark as error immediately - Claude CLI often uses stderr for progress
            });
            claudeProcess.on('exit', (code) => {
                clearTimeout(processTimeout); // Clear timeout on exit
                this.handleAgentExit(agent, code);
                this.claudeProcesses.delete(agent.id);
            });
            claudeProcess.on('error', (error) => {
                logger_1.logger.error(`❌ Agent ${agent.id} process error:`, error);
                agent.status = 'error';
                agent.currentTask = `Process error: ${error.message}`;
                this.claudeProcesses.delete(agent.id);
            });
            logger_1.logger.debug(`✅ Claude process started for agent ${agent.id} (PID: ${claudeProcess.pid})`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Failed to start Claude process for agent ${agent.id}:`, error);
            throw error;
        }
    }
    /**
     * Handle output from Claude Code process
     */
    handleAgentOutput(agent, output) {
        // Phase 2: Send raw output to agent terminal manager
        try {
            const { getAgentTerminalManager } = require('./agent-terminal-manager');
            const terminalManager = getAgentTerminalManager();
            // Send raw terminal output
            terminalManager.appendToAgentTerminal(agent.id, output);
        }
        catch (error) {
            // Terminal manager not available - continue without it
            logger_1.logger.debug('Agent terminal manager not available:', error);
        }
        try {
            // Try to parse as JSON first (structured output)
            const parsed = JSON.parse(output);
            if (parsed.type === 'progress') {
                agent.currentTask = parsed.message || agent.currentTask;
                agent.progress = Math.min(agent.progress + 10, 85);
            }
        }
        catch {
            // Not JSON - treat as text output
            const lines = output.split('\n').filter(line => line.trim());
            if (lines.length > 0) {
                agent.currentTask = lines[lines.length - 1].substring(0, 100); // Last meaningful line
                agent.progress = Math.min(agent.progress + 2, 85);
            }
        }
        agent.lastActivity = new Date();
        // Emit WebSocket event for real-time progress update
        this.emit('agent:progress', {
            agentId: agent.id,
            role: agent.role,
            progress: agent.progress,
            currentTask: agent.currentTask,
            status: agent.status
        });
        // Forward to global WebSocket if available
        if (global.forwardBridgeEvent) {
            global.forwardBridgeEvent('bridge:agent:progress', {
                agentId: agent.id,
                role: agent.role,
                progress: agent.progress,
                currentTask: agent.currentTask,
                status: agent.status
            });
        }
    }
    /**
     * Handle Claude Code process exit
     */
    handleAgentExit(agent, exitCode) {
        if (exitCode === 0) {
            logger_1.logger.info(`✅ Agent ${agent.id} process completed successfully`);
            agent.currentTask = `${agent.role} work completed by Claude Code`;
            // Don't set to completed yet - wait for git monitoring to confirm
        }
        else {
            logger_1.logger.warn(`⚠️ Agent ${agent.id} process exited with code: ${exitCode}`);
            agent.currentTask = `Process completed with exit code: ${exitCode}`;
        }
    }
    /**
     * Generate appropriate prompt for agent role
     */
    generateAgentPrompt(role, agent) {
        const baseContext = `You are a ${agent.name} working on: ${agent.currentTask}
Working directory: ${agent.workTreePath}
Git branch: ${agent.branchName}

Please implement the ${role} aspects of this requirement. Work directly in the provided directory and commit your changes when complete.`;
        const rolePrompts = {
            'frontend': `${baseContext}

Focus on:
- React components with TypeScript
- Responsive design and user experience  
- Modern CSS or styled-components
- Proper component architecture
- User interface implementation`,
            'backend': `${baseContext}

Focus on:
- Node.js/Express API endpoints
- Database integration and models
- Authentication and authorization
- Error handling and validation
- Server-side logic and business rules`,
            'testing': `${baseContext}

Focus on:
- Unit tests for components and functions
- Integration tests for API endpoints
- Test setup and configuration
- Mocking and test utilities
- Test documentation and coverage`,
            'styling': `${baseContext}

Focus on:
- Modern CSS architecture
- Responsive design patterns
- Component styling and themes
- CSS-in-JS or styled-components
- Design system implementation`,
            'docs': `${baseContext}

Focus on:
- README files with setup instructions
- API documentation
- Code comments and inline documentation
- Usage examples and tutorials
- Contributing guidelines`
        };
        return rolePrompts[role] || baseContext;
    }
    /**
     * Create a git work tree for a specific agent role with unified directory approach
     */
    async createWorkTreeAgent(teamId, role, teamWorkTreeRoot, requirement) {
        const agentId = `${teamId}-${role}`;
        const branchName = `claude-agent/${teamId}/${role}`;
        const agentWorkTreePath = path.join(teamWorkTreeRoot, role);
        logger_1.logger.debug(`📁 Creating work tree agent: ${role} at ${agentWorkTreePath}`);
        try {
            // Create git work tree - this is the actual working directory
            await this.executeCommand(`git worktree add -b ${branchName} "${agentWorkTreePath}"`, this.projectRoot);
            // Verify work tree was created successfully
            await fs_1.promises.access(agentWorkTreePath);
            // Create sandbox metadata for tracking (but don't copy files - work directly in git work tree)
            const sandbox = await this.tmuxService.createSandbox({
                userId: 'claude-code-bridge',
                projectId: agentId,
                // No baseFrom - we work directly in the git work tree
                maxCpu: 50, // Limit resources per agent
                maxMemory: 2048, // 2GB max per agent
                timeLimit: 3600 // 1 hour timeout
            });
            // Generate initial task description
            const initialTask = this.getInitialTaskDescription(role, requirement);
            const agent = {
                id: agentId,
                name: this.getRoleName(role),
                role,
                workTreePath: agentWorkTreePath,
                branchName,
                sandboxId: sandbox.id,
                status: 'initializing',
                currentTask: initialTask,
                progress: 0,
                lastActivity: new Date(),
                setupCommand: '', // Will be set by automated execution
                completedTasks: [],
                files: 0
            };
            // Verify git work tree is properly configured
            await this.validateWorkTree(agent);
            logger_1.logger.info(`✅ Created unified work tree for ${agent.name}: ${agentWorkTreePath}`);
            logger_1.logger.debug(`🏷️  Branch: ${branchName}, Sandbox: ${sandbox.id}`);
            // Phase 2: Create agent terminal session
            try {
                const { getAgentTerminalManager } = require('./agent-terminal-manager');
                const terminalManager = getAgentTerminalManager();
                terminalManager.createAgentTerminalSession(agentId, teamId, role);
                logger_1.logger.info(`🤖 Created agent terminal session for ${agent.name}`);
            }
            catch (error) {
                logger_1.logger.warn(`⚠️ Could not create agent terminal session: ${error}`);
            }
            return agent;
        }
        catch (error) {
            logger_1.logger.error(`❌ Failed to create work tree agent ${role}:`, error);
            // Attempt cleanup on failure
            try {
                await this.executeCommand(`git worktree remove "${agentWorkTreePath}" --force`, this.projectRoot);
                await this.executeCommand(`git branch -D ${branchName}`, this.projectRoot);
            }
            catch (cleanupError) {
                logger_1.logger.warn(`⚠️ Cleanup failed for ${role}:`, cleanupError);
            }
            throw new Error(`Work tree creation failed for ${role}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Validate that a work tree is properly configured
     */
    async validateWorkTree(agent) {
        try {
            // Verify work tree directory exists and is a valid git repository
            await fs_1.promises.access(path.join(agent.workTreePath, '.git'));
            // Verify branch is correct
            const currentBranch = await this.executeCommand('git branch --show-current', agent.workTreePath);
            const actualBranch = currentBranch.stdout.trim();
            if (actualBranch !== agent.branchName.split('/').pop()) {
                throw new Error(`Branch mismatch: expected ${agent.branchName}, got ${actualBranch}`);
            }
            // Verify work tree is listed in git worktree list
            const worktreeList = await this.executeCommand('git worktree list', this.projectRoot);
            if (!worktreeList.stdout.includes(agent.workTreePath)) {
                throw new Error(`Work tree not found in git worktree list`);
            }
            logger_1.logger.debug(`✅ Work tree validation passed for ${agent.id}`);
        }
        catch (error) {
            throw new Error(`Work tree validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get initial task description for an agent role
     */
    getInitialTaskDescription(role, requirement) {
        const descriptions = {
            'frontend': `Implementing React frontend for: ${requirement}`,
            'backend': `Building backend services for: ${requirement}`,
            'testing': `Writing comprehensive tests for: ${requirement}`,
            'styling': `Creating styling and design for: ${requirement}`,
            'docs': `Writing documentation for: ${requirement}`
        };
        return descriptions[role] || `Working on ${role} for: ${requirement}`;
    }
    /**
     * Clean up partial resources on failure
     */
    async cleanupResources(resourcePaths) {
        logger_1.logger.info(`🧹 Cleaning up ${resourcePaths.length} partial resources`);
        for (const resourcePath of resourcePaths) {
            try {
                // Try to remove as work tree first
                if (resourcePath.includes('.claude-parallel-dev')) {
                    const pathParts = resourcePath.split('/');
                    const role = pathParts[pathParts.length - 1];
                    const teamDir = pathParts[pathParts.length - 2];
                    const branchName = `claude-agent/${teamDir}/${role}`;
                    try {
                        await this.executeCommand(`git worktree remove "${resourcePath}" --force`, this.projectRoot);
                        await this.executeCommand(`git branch -D ${branchName}`, this.projectRoot);
                        logger_1.logger.debug(`✅ Cleaned up work tree: ${resourcePath}`);
                    }
                    catch (workTreeError) {
                        // If work tree cleanup fails, try directory removal
                        await fs_1.promises.rm(resourcePath, { recursive: true, force: true });
                        logger_1.logger.debug(`✅ Cleaned up directory: ${resourcePath}`);
                    }
                }
                else {
                    // Regular directory cleanup
                    await fs_1.promises.rm(resourcePath, { recursive: true, force: true });
                    logger_1.logger.debug(`✅ Cleaned up directory: ${resourcePath}`);
                }
            }
            catch (error) {
                logger_1.logger.warn(`⚠️ Failed to clean up resource ${resourcePath}:`, error);
            }
        }
    }
    /**
     * Start monitoring Claude Code sessions in work trees
     */
    async startMonitoring(teamId) {
        const team = this.teams.get(teamId);
        if (!team) {
            logger_1.logger.error(`Team ${teamId} not found`);
            return;
        }
        team.status = 'working';
        team.startedAt = new Date();
        // Start monitoring each agent's work tree for changes
        for (const agent of team.agents) {
            this.startAgentMonitoring(teamId, agent);
        }
        logger_1.logger.info(`📡 Started monitoring team ${teamId}`);
        this.emit('team:monitoring-started', {
            teamId,
            agentCount: team.agents.length
        });
    }
    /**
     * Monitor individual agent progress by watching git changes
     */
    startAgentMonitoring(teamId, agent) {
        const checkProgress = async () => {
            try {
                const team = this.teams.get(teamId);
                if (!team) {
                    this.stopAgentMonitoring(agent);
                    return;
                }
                // Check for git changes in work tree
                const gitStatus = await this.executeCommand('git status --porcelain', agent.workTreePath);
                const hasChanges = gitStatus.stdout.trim().length > 0;
                // Check for commits
                const commitCount = await this.executeCommand(`git rev-list --count ${agent.branchName} 2>/dev/null || echo 0`, this.projectRoot);
                const commits = parseInt(commitCount.stdout.trim()) || 0;
                // Update agent status based on activity
                const previousStatus = agent.status;
                const previousProgress = agent.progress;
                if (hasChanges && agent.status === 'waiting') {
                    agent.status = 'working';
                    agent.currentTask = `Working on ${agent.role} tasks`;
                    agent.progress = Math.max(agent.progress, 10);
                }
                if (commits > 0) {
                    agent.status = 'working';
                    agent.progress = Math.min(10 + (commits * 15), 90);
                    agent.currentTask = `${commits} commits completed`;
                    agent.files = await this.countChangedFiles(agent.workTreePath);
                }
                // Check if work seems complete (no recent activity + commits exist)
                if (commits > 0) {
                    const lastCommit = await this.executeCommand(`git log -1 --format="%ar" ${agent.branchName} 2>/dev/null || echo "never"`, this.projectRoot).catch(() => ({ stdout: 'never' }));
                    // If last commit was more than 5 minutes ago and we have commits, consider complete
                    if (!lastCommit.stdout.includes('minute') && commits > 0) {
                        agent.status = 'completed';
                        agent.progress = 100;
                        agent.currentTask = `✅ ${agent.role} work completed`;
                    }
                }
                agent.lastActivity = new Date();
                // Emit progress update if status or progress changed
                if (previousStatus !== agent.status || previousProgress !== agent.progress) {
                    this.emit('agent:progress', {
                        teamId,
                        agentId: agent.id,
                        status: agent.status,
                        progress: agent.progress,
                        currentTask: agent.currentTask,
                        files: agent.files,
                        commits
                    });
                    // Update team overall progress
                    this.updateTeamProgress(teamId);
                }
            }
            catch (error) {
                logger_1.logger.error(`Error monitoring agent ${agent.id}:`, error);
                agent.status = 'error';
                agent.currentTask = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
        };
        // Check progress every 10 seconds
        const interval = setInterval(checkProgress, 10000);
        this.monitoringIntervals.set(agent.id, interval);
        // Initial check
        checkProgress();
    }
    /**
     * Stop monitoring an individual agent
     */
    stopAgentMonitoring(agent) {
        const interval = this.monitoringIntervals.get(agent.id);
        if (interval) {
            clearInterval(interval);
            this.monitoringIntervals.delete(agent.id);
        }
    }
    /**
     * Update team overall progress based on agent progress
     */
    updateTeamProgress(teamId) {
        const team = this.teams.get(teamId);
        if (!team)
            return;
        const agents = team.agents;
        const overallProgress = Math.round(agents.reduce((sum, a) => sum + a.progress, 0) / agents.length);
        team.progress = {
            overall: overallProgress,
            planning: Math.min(overallProgress, 25),
            development: Math.max(0, Math.min(overallProgress - 25, 50)),
            testing: Math.max(0, Math.min(overallProgress - 75, 20)),
            deployment: Math.max(0, overallProgress - 95)
        };
        // Update team files count
        team.files = agents.reduce((sum, a) => sum + a.files, 0);
        // Check if team completed
        if (agents.every(a => a.status === 'completed')) {
            team.status = 'completed';
            team.completedAt = new Date();
            // Stop all monitoring
            agents.forEach(agent => this.stopAgentMonitoring(agent));
            this.emit('team:completed', {
                teamId,
                team,
                duration: team.completedAt.getTime() - (team.startedAt?.getTime() || team.createdAt.getTime()),
                totalFiles: team.files,
                totalCommits: agents.reduce((sum, a) => sum + a.files, 0)
            });
        }
        else {
            this.emit('team:progress', {
                teamId,
                team,
                progress: team.progress,
                activeAgents: agents.filter(a => a.status === 'working').length,
                completedAgents: agents.filter(a => a.status === 'completed').length
            });
        }
    }
    /**
     * Merge completed work trees back to main branch
     */
    async mergeTeamWork(teamId) {
        const team = this.teams.get(teamId);
        if (!team)
            throw new Error(`Team ${teamId} not found`);
        team.status = 'merging';
        const mergedBranches = [];
        logger_1.logger.info(`🔀 Starting merge process for team ${teamId}`);
        try {
            // Switch back to base branch
            await this.executeCommand(`git checkout ${team.baseBranch}`, this.projectRoot);
            // Merge each completed agent's branch
            for (const agent of team.agents) {
                if (agent.status === 'completed') {
                    try {
                        // Check if branch has commits to merge
                        const commits = await this.executeCommand(`git rev-list --count ${agent.branchName} ^${team.baseBranch}`, this.projectRoot);
                        if (parseInt(commits.stdout.trim()) > 0) {
                            // Merge the agent's branch
                            await this.executeCommand(`git merge ${agent.branchName} --no-ff -m "Merge ${agent.role} work from Claude Code agent - ${team.projectRequirement}"`, this.projectRoot);
                            mergedBranches.push(agent.branchName);
                            logger_1.logger.info(`✅ Merged ${agent.role} branch: ${agent.branchName}`);
                        }
                        else {
                            logger_1.logger.info(`ℹ️ No commits to merge for ${agent.role} branch: ${agent.branchName}`);
                        }
                    }
                    catch (error) {
                        logger_1.logger.error(`❌ Failed to merge ${agent.role} branch:`, error);
                    }
                }
            }
            // Clean up work trees
            await this.cleanupTeamWorkTrees(team);
            team.status = 'completed';
            team.completedAt = new Date();
            logger_1.logger.info(`🎉 Team ${teamId} merge completed: ${mergedBranches.length}/${team.agents.length} branches merged`);
            this.emit('team:merged', {
                teamId,
                mergedBranches,
                totalBranches: team.agents.length,
                success: true
            });
            return { success: true, mergedBranches };
        }
        catch (error) {
            logger_1.logger.error(`❌ Merge failed for team ${teamId}:`, error);
            team.status = 'error';
            throw error;
        }
    }
    /**
     * Get team status (compatible with existing API)
     */
    getTeamStatus(teamId) {
        return this.teams.get(teamId) || null;
    }
    /**
     * List all teams (compatible with existing API)
     */
    getAllTeams() {
        return Array.from(this.teams.values());
    }
    /**
     * Emergency stop for a specific team
     */
    async stopTeam(teamId) {
        const team = this.teams.get(teamId);
        if (!team)
            return;
        team.status = 'stopped';
        team.completedAt = new Date();
        // Clear team timeout
        this.clearTeamTimeout(teamId);
        // Stop all agent monitoring
        team.agents.forEach(agent => {
            agent.status = 'stopped';
            agent.currentTask = 'Stopped by user';
            this.stopAgentMonitoring(agent);
        });
        logger_1.logger.info(`🛑 Stopped team ${teamId}`);
        this.emit('team:stopped', { teamId, team });
    }
    // Helper methods
    /**
     * Create an agent using tmux sandbox instead of git worktree
     */
    async createTmuxAgent(teamId, role, teamWorkTreeRoot, requirement) {
        const agentId = `agent-${role}-${Date.now()}`;
        const agentName = this.getAgentName(role);
        // Create tmux sandbox for this agent instead of git worktree
        let sandboxId = '';
        let workPath = '';
        if (this.tmuxService) {
            try {
                // Create sandbox using Enhanced Tmux Service
                const sandbox = await this.tmuxService.createSandbox({
                    userId: teamId,
                    projectId: role,
                    maxCpu: 50,
                    maxMemory: 2048,
                    maxDisk: 5120,
                    timeLimit: 3600 // 1 hour
                });
                sandboxId = sandbox.id;
                workPath = sandbox.path;
                logger_1.logger.info(`📦 Created tmux sandbox for ${agentName}: ${sandboxId}`);
            }
            catch (error) {
                logger_1.logger.warn(`⚠️ Tmux sandbox creation failed, using fallback directory`);
                // Fallback to simple directory if tmux fails
                workPath = path.join(teamWorkTreeRoot, role);
                await fs_1.promises.mkdir(workPath, { recursive: true });
                sandboxId = `fallback-${agentId}`;
            }
        }
        else {
            // No tmux service available, use simple directory
            workPath = path.join(teamWorkTreeRoot, role);
            await fs_1.promises.mkdir(workPath, { recursive: true });
            sandboxId = `direct-${agentId}`;
        }
        const agent = {
            id: agentId,
            name: agentName,
            role: role,
            workTreePath: workPath,
            branchName: `feature/${role}-${teamId}`,
            sandboxId: sandboxId,
            status: 'initializing',
            currentTask: 'Setting up development environment',
            progress: 0,
            lastActivity: new Date(),
            setupCommand: `claude --project ${role} "${requirement}"`,
            completedTasks: [],
            files: 0
        };
        return agent;
    }
    /**
     * Get friendly agent name based on role
     */
    getAgentName(role) {
        const roleNames = {
            'frontend': 'Frontend Developer',
            'backend': 'Backend Engineer',
            'database': 'Database Architect',
            'api': 'API Designer',
            'testing': 'QA Engineer',
            'devops': 'DevOps Specialist'
        };
        return roleNames[role] || `${role.charAt(0).toUpperCase()}${role.slice(1)} Agent`;
    }
    generateSetupInstructions(team) {
        return {
            teamId: team.teamId,
            requirement: team.projectRequirement,
            agents: team.agents.map(agent => ({
                role: agent.role,
                workTreePath: agent.workTreePath,
                branchName: agent.branchName,
                command: agent.setupCommand,
                description: this.getAgentDescription(agent.role)
            })),
            baseBranch: team.baseBranch,
            setupSteps: [
                '1. Open separate Claude Code sessions for each agent',
                '2. Copy and run the commands below in each session',
                '3. Monitor progress in the dashboard',
                '4. Merge completed work when all agents finish'
            ],
            mergeInstructions: `When all agents complete their work, the system will automatically merge the branches back to ${team.baseBranch}.`
        };
    }
    determineAgentRoles(requirement) {
        const base = ['frontend', 'backend'];
        const req = requirement.toLowerCase();
        if (req.includes('test') || req.includes('testing')) {
            base.push('testing');
        }
        if (req.includes('style') || req.includes('design') || req.includes('ui')) {
            base.push('styling');
        }
        if (req.includes('doc') || req.includes('readme')) {
            base.push('docs');
        }
        return base;
    }
    determineWorkflow(requirement) {
        if (requirement.toLowerCase().includes('full-stack')) {
            return 'full-stack-development';
        }
        if (requirement.toLowerCase().includes('api')) {
            return 'api-development';
        }
        if (requirement.toLowerCase().includes('ui') || requirement.toLowerCase().includes('frontend')) {
            return 'frontend-development';
        }
        return 'general-development';
    }
    getRoleName(role) {
        const names = {
            'frontend': 'Frontend Developer',
            'backend': 'Backend Developer',
            'testing': 'QA Engineer',
            'styling': 'UI/UX Designer',
            'docs': 'Documentation Writer'
        };
        return names[role] || role;
    }
    getAgentDescription(role) {
        const descriptions = {
            'frontend': 'React components, TypeScript, UI/UX implementation',
            'backend': 'APIs, server logic, database integration',
            'testing': 'Unit tests, integration tests, quality assurance',
            'styling': 'CSS, styling, responsive design',
            'docs': 'Documentation, README files, code comments'
        };
        return descriptions[role] || `${role} development tasks`;
    }
    getAgentCommand(role, requirement, workTreePath) {
        const commands = {
            'frontend': `cd "${workTreePath}" && claude "Build the React frontend components for: ${requirement}. Focus on TypeScript, responsive design, and user experience."`,
            'backend': `cd "${workTreePath}" && claude "Create the backend API and server logic for: ${requirement}. Focus on Node.js, Express, and database integration."`,
            'testing': `cd "${workTreePath}" && claude "Write comprehensive tests for: ${requirement}. Include unit tests, integration tests, and test documentation."`,
            'styling': `cd "${workTreePath}" && claude "Create beautiful CSS and styling for: ${requirement}. Focus on responsive design and modern UI patterns."`,
            'docs': `cd "${workTreePath}" && claude "Write documentation and README for: ${requirement}. Include setup instructions, API docs, and usage examples."`
        };
        return commands[role] || `cd "${workTreePath}" && claude "Work on ${role} aspects of: ${requirement}"`;
    }
    async getCurrentBranch() {
        try {
            const result = await this.executeCommand('git branch --show-current', this.projectRoot);
            return result.stdout.trim() || 'main';
        }
        catch {
            return 'main';
        }
    }
    async countChangedFiles(workTreePath) {
        try {
            const result = await this.executeCommand('git ls-files | wc -l', workTreePath);
            return parseInt(result.stdout.trim()) || 0;
        }
        catch {
            return 0;
        }
    }
    async executeCommand(command, cwd) {
        return new Promise((resolve, reject) => {
            (0, child_process_1.exec)(command, { cwd }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }
    async cleanupTeamWorkTrees(team) {
        try {
            // Remove git work trees
            for (const agent of team.agents) {
                try {
                    await this.executeCommand(`git worktree remove ${agent.workTreePath} --force`, this.projectRoot);
                    await this.executeCommand(`git branch -D ${agent.branchName}`, this.projectRoot);
                }
                catch (error) {
                    logger_1.logger.warn(`Could not cleanup work tree for ${agent.role}:`, error);
                }
            }
            // Remove work tree directory
            await fs_1.promises.rm(team.workTreeRoot, { recursive: true, force: true });
        }
        catch (error) {
            logger_1.logger.error('Error cleaning up team work trees:', error);
        }
    }
    async cleanupOrphanedWorkTrees() {
        try {
            // Clean up work tree directories older than 24 hours
            const entries = await fs_1.promises.readdir(this.workTreeRoot, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const dirPath = path.join(this.workTreeRoot, entry.name);
                    const stats = await fs_1.promises.stat(dirPath);
                    const age = Date.now() - stats.mtimeMs;
                    if (age > 24 * 60 * 60 * 1000) { // 24 hours
                        logger_1.logger.debug(`Removing old work tree: ${dirPath}`);
                        await fs_1.promises.rm(dirPath, { recursive: true, force: true });
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error cleaning up orphaned work trees:', error);
        }
    }
    /**
     * Shutdown service and cleanup
     */
    async shutdown() {
        // Stop all monitoring
        for (const interval of Array.from(this.monitoringIntervals.values())) {
            clearInterval(interval);
        }
        this.monitoringIntervals.clear();
        // Stop all teams
        for (const teamId of Array.from(this.teams.keys())) {
            await this.stopTeam(teamId);
        }
        logger_1.logger.info('🔗 Claude Code Bridge Service shutdown complete');
    }
    /**
     * Emergency stop - immediately halt all operations
     */
    async emergencyStop(reason = 'Manual trigger') {
        logger_1.logger.warn(`🚨 Emergency stop triggered: ${reason}`);
        this.emergencyStopTriggered = true;
        // Stop all teams immediately
        const stopPromises = Array.from(this.teams.keys()).map(teamId => this.stopTeam(teamId));
        await Promise.allSettled(stopPromises);
        // Kill all Claude processes immediately
        for (const [processId, process] of Array.from(this.claudeProcesses.entries())) {
            try {
                process.kill('SIGTERM');
                logger_1.logger.info(`🛑 Terminated Claude process: ${processId}`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to kill process ${processId}:`, error);
            }
        }
        this.claudeProcesses.clear();
        // Clear all timeouts
        for (const timeout of Array.from(this.processTimeouts.values())) {
            clearTimeout(timeout);
        }
        this.processTimeouts.clear();
        // Clear monitoring intervals
        for (const interval of Array.from(this.monitoringIntervals.values())) {
            clearInterval(interval);
        }
        this.monitoringIntervals.clear();
        logger_1.logger.warn('🛑 Emergency stop complete - all operations halted');
        this.emit('emergency-stop', { reason, timestamp: new Date() });
    }
    /**
     * Reset emergency stop state to allow new operations
     */
    resetEmergencyStop() {
        this.emergencyStopTriggered = false;
        logger_1.logger.info('✅ Emergency stop reset - service ready for new operations');
    }
    /**
     * Get service health status
     */
    getServiceHealth() {
        return {
            status: this.emergencyStopTriggered ? 'emergency' :
                this.teams.size >= this.MAX_CONCURRENT_TEAMS ? 'degraded' : 'healthy',
            teams: this.teams.size,
            maxTeams: this.MAX_CONCURRENT_TEAMS,
            emergencyStop: this.emergencyStopTriggered,
            processes: this.claudeProcesses.size,
            uptime: process.uptime()
        };
    }
    /**
     * Set timeout for team process
     */
    setTeamTimeout(teamId) {
        const timeout = setTimeout(async () => {
            logger_1.logger.warn(`⏰ Team ${teamId} timed out after ${this.PROCESS_TIMEOUT_MS}ms`);
            try {
                await this.stopTeam(teamId);
                this.emit('team-timeout', { teamId, timestamp: new Date() });
            }
            catch (error) {
                logger_1.logger.error(`Failed to stop timed out team ${teamId}:`, error);
            }
        }, this.PROCESS_TIMEOUT_MS);
        this.processTimeouts.set(teamId, timeout);
    }
    /**
     * Clear team timeout
     */
    clearTeamTimeout(teamId) {
        const timeout = this.processTimeouts.get(teamId);
        if (timeout) {
            clearTimeout(timeout);
            this.processTimeouts.delete(teamId);
        }
    }
}
exports.ClaudeCodeBridgeService = ClaudeCodeBridgeService;
// Singleton instance
let instance = null;
function getClaudeCodeBridgeService() {
    if (!instance) {
        instance = new ClaudeCodeBridgeService();
    }
    return instance;
}
