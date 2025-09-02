/**
 * Agent Runtime Interface - Universal Abstraction Layer
 * Supports both tmux and container-based agent isolation
 * Enables runtime switching based on system capabilities
 */

/**
 * Core agent configuration interface
 */
class AgentConfig {
    constructor(options = {}) {
        this.agentType = options.agentType;           // 'frontend-engineer', 'backend-engineer', etc.
        this.agentId = options.agentId;               // Unique agent identifier
        this.teamId = options.teamId;                 // Team this agent belongs to
        this.workflow = options.workflow;             // Workflow template being executed
        this.tools = options.tools || ['read', 'write', 'bash', 'search'];
        this.memory = options.memory || '1GB';        // Memory limit
        this.cpu = options.cpu || '0.5';              // CPU limit (cores)
        this.environment = options.environment || {}; // Environment variables
        this.baseImage = options.baseImage || 'node:18'; // Docker base image (container runtime only)
        this.dependencies = options.dependencies || []; // Required packages/tools
    }
}

/**
 * Agent session information
 */
class AgentSession {
    constructor(options = {}) {
        this.agentId = options.agentId;
        this.agentType = options.agentType;
        this.teamId = options.teamId;
        this.status = options.status || 'initializing';
        this.runtime = options.runtime;               // 'tmux' or 'container'
        this.sessionId = options.sessionId;           // Runtime-specific session ID
        this.workspacePath = options.workspacePath;   // Agent's working directory
        this.startTime = options.startTime || new Date();
        this.lastActivity = options.lastActivity || new Date();
        this.resources = options.resources || {
            cpu: 0,
            memory: 0,
            disk: 0
        };
        this.metadata = options.metadata || {};
    }
}

/**
 * Command execution result
 */
class CommandResult {
    constructor(options = {}) {
        this.stdout = options.stdout || '';
        this.stderr = options.stderr || '';
        this.exitCode = options.exitCode || 0;
        this.duration = options.duration || 0;
        this.timestamp = options.timestamp || new Date();
    }
}

/**
 * Agent status information
 */
class AgentStatus {
    constructor(options = {}) {
        this.agentId = options.agentId;
        this.status = options.status;                 // 'running', 'idle', 'working', 'completed', 'error'
        this.currentTask = options.currentTask;       // Current task description
        this.progress = options.progress || 0;        // 0-100 completion percentage
        this.resources = options.resources || {};     // Current resource usage
        this.logs = options.logs || [];              // Recent log entries
        this.files = options.files || [];            // Files in workspace
        this.lastUpdate = options.lastUpdate || new Date();
    }
}

/**
 * Team workspace for multi-agent collaboration
 */
class TeamWorkspace {
    constructor(options = {}) {
        this.teamId = options.teamId;
        this.workspacePath = options.workspacePath;
        this.sharedPath = options.sharedPath;         // Inter-agent shared directory
        this.agents = options.agents || [];          // Active agents in this workspace
        this.createdAt = options.createdAt || new Date();
        this.metadata = options.metadata || {};
    }
}

/**
 * Universal Agent Runtime Interface
 * All runtime implementations must implement this interface
 */
class AgentRuntimeInterface {
    constructor() {
        this.runtimeType = 'base';
        this.isAvailable = false;
    }

    /**
   * Check if this runtime is available on the system
   */
    async checkAvailability() {
        throw new Error('checkAvailability must be implemented by runtime');
    }

    /**
   * Initialize the runtime system
   */
    async initialize() {
        throw new Error('initialize must be implemented by runtime');
    }

    // === Agent Lifecycle Management ===

    /**
   * Create a new isolated agent environment
   * @param {string} agentId - Unique agent identifier
   * @param {AgentConfig} config - Agent configuration
   * @returns {Promise<AgentSession>} - Created agent session
   */
    async createAgent(agentId, config) {
        throw new Error('createAgent must be implemented by runtime');
    }

    /**
   * Execute a command in the agent's environment
   * @param {string} agentId - Agent identifier
   * @param {string} command - Command to execute
   * @param {Object} options - Execution options
   * @returns {Promise<CommandResult>} - Command execution result
   */
    async executeCommand(agentId, command, options = {}) {
        throw new Error('executeCommand must be implemented by runtime');
    }

    /**
   * Transfer files between agents
   * @param {string} fromAgentId - Source agent
   * @param {string} toAgentId - Destination agent  
   * @param {string[]} files - Files to transfer
   * @returns {Promise<void>}
   */
    async transferFiles(fromAgentId, toAgentId, files) {
        throw new Error('transferFiles must be implemented by runtime');
    }

    /**
   * Destroy an agent and cleanup its environment
   * @param {string} agentId - Agent to destroy
   * @returns {Promise<void>}
   */
    async destroyAgent(agentId) {
        throw new Error('destroyAgent must be implemented by runtime');
    }

    // === Environment Management ===

    /**
   * Get current status and resource usage of an agent
   * @param {string} agentId - Agent identifier
   * @returns {Promise<AgentStatus>} - Current agent status
   */
    async getAgentStatus(agentId) {
        throw new Error('getAgentStatus must be implemented by runtime');
    }

    /**
   * Get recent logs from an agent
   * @param {string} agentId - Agent identifier
   * @param {number} lines - Number of log lines to retrieve
   * @returns {Promise<string[]>} - Log entries
   */
    async getAgentLogs(agentId, lines = 100) {
        throw new Error('getAgentLogs must be implemented by runtime');
    }

    /**
   * Reset an agent to fresh state
   * @param {string} agentId - Agent identifier
   * @returns {Promise<void>}
   */
    async resetAgent(agentId) {
        throw new Error('resetAgent must be implemented by runtime');
    }

    /**
   * List all files in agent's workspace
   * @param {string} agentId - Agent identifier
   * @returns {Promise<string[]>} - File paths
   */
    async listAgentFiles(agentId) {
        throw new Error('listAgentFiles must be implemented by runtime');
    }

    /**
   * Read file content from agent's workspace
   * @param {string} agentId - Agent identifier
   * @param {string} filePath - File to read
   * @returns {Promise<string>} - File content
   */
    async readAgentFile(agentId, filePath) {
        throw new Error('readAgentFile must be implemented by runtime');
    }

    /**
   * Write file to agent's workspace
   * @param {string} agentId - Agent identifier
   * @param {string} filePath - File to write
   * @param {string} content - File content
   * @returns {Promise<void>}
   */
    async writeAgentFile(agentId, filePath, content) {
        throw new Error('writeAgentFile must be implemented by runtime');
    }

    // === Multi-Tenant Team Management ===

    /**
   * Create a team workspace for multi-agent collaboration
   * @param {string} teamId - Team identifier
   * @param {Object} config - Team configuration
   * @returns {Promise<TeamWorkspace>} - Created team workspace
   */
    async createTeamWorkspace(teamId, config = {}) {
        throw new Error('createTeamWorkspace must be implemented by runtime');
    }

    /**
   * Destroy team workspace and all associated agents
   * @param {string} teamId - Team identifier
   * @returns {Promise<void>}
   */
    async destroyTeamWorkspace(teamId) {
        throw new Error('destroyTeamWorkspace must be implemented by runtime');
    }

    /**
   * List all active agents in a team
   * @param {string} teamId - Team identifier
   * @returns {Promise<AgentSession[]>} - Active agents
   */
    async listTeamAgents(teamId) {
        throw new Error('listTeamAgents must be implemented by runtime');
    }

    // === Runtime Information ===

    /**
   * Get runtime type identifier
   * @returns {string} - Runtime type ('tmux', 'container', etc.)
   */
    getRuntimeType() {
        return this.runtimeType;
    }

    /**
   * Get runtime capabilities and features
   * @returns {Object} - Runtime capabilities
   */
    getCapabilities() {
        return {
            isolation: 'none',
            resourceLimits: false,
            networking: false,
            persistence: false,
            sharing: false
        };
    }

    /**
   * Get runtime statistics
   * @returns {Object} - Runtime statistics
   */
    async getStats() {
        throw new Error('getStats must be implemented by runtime');
    }

    // === Cleanup and Maintenance ===

    /**
   * Cleanup orphaned resources
   * @returns {Promise<void>}
   */
    async cleanup() {
        throw new Error('cleanup must be implemented by runtime');
    }

    /**
   * Shutdown the runtime system
   * @returns {Promise<void>}
   */
    async shutdown() {
        throw new Error('shutdown must be implemented by runtime');
    }
}

module.exports = {
    AgentConfig,
    AgentSession,
    CommandResult,
    AgentStatus,
    TeamWorkspace,
    AgentRuntimeInterface
};