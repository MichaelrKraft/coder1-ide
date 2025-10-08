"use strict";
/**
 * Agent Terminal Manager Service
 *
 * Manages terminal sessions for AI agents with WebSocket routing.
 * Connects agent terminals to Claude CLI process output streams.
 * Part of Phase 2: Interactive Agent Terminals implementation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentTerminalManager = void 0;
exports.getAgentTerminalManager = getAgentTerminalManager;
const events_1 = require("events");
const claude_code_bridge_1 = require("./claude-code-bridge");
class AgentTerminalManager extends events_1.EventEmitter {
    constructor(io) {
        super();
        this.sessions = new Map();
        this.io = io;
        this.bridgeService = (0, claude_code_bridge_1.getClaudeCodeBridgeService)();
        this.setupBridgeListeners();
    }
    /**
     * Set Socket.IO instance for WebSocket communication
     */
    setSocketIO(io) {
        this.io = io;
    }
    /**
     * Create an agent terminal session
     */
    createAgentTerminalSession(agentId, teamId, role) {
        const session = {
            agentId,
            teamId,
            role,
            terminalBuffer: [],
            lastActivity: new Date(),
            isInteractive: false, // Phase 1: Read-only
            connectedSockets: new Set()
        };
        this.sessions.set(agentId, session);
        console.log(`🤖 Created agent terminal session: ${agentId} (${role})`);
        return session;
    }
    /**
     * Connect a socket to an agent terminal session
     */
    connectSocket(agentId, socket) {
        const session = this.sessions.get(agentId);
        if (!session) {
            console.error(`❌ Agent terminal session not found: ${agentId}`);
            return false;
        }
        session.connectedSockets.add(socket);
        // Send buffered terminal history
        if (session.terminalBuffer.length > 0) {
            const history = session.terminalBuffer.join('');
            socket.emit('agent:terminal:data', {
                agentId,
                data: history
            });
        }
        // Clean up on disconnect
        socket.on('disconnect', () => {
            session.connectedSockets.delete(socket);
        });
        console.log(`🔌 Socket connected to agent terminal: ${agentId}`);
        return true;
    }
    /**
     * Append data to agent terminal and broadcast to connected sockets
     */
    appendToAgentTerminal(agentId, data) {
        const session = this.sessions.get(agentId);
        if (!session) {
            console.warn(`⚠️ No terminal session for agent: ${agentId}`);
            return;
        }
        // Buffer the data
        session.terminalBuffer.push(data);
        // Limit buffer size to prevent memory issues
        if (session.terminalBuffer.length > 1000) {
            session.terminalBuffer = session.terminalBuffer.slice(-800);
        }
        session.lastActivity = new Date();
        // Broadcast to all connected sockets
        session.connectedSockets.forEach(socket => {
            if (socket.connected) {
                socket.emit('agent:terminal:data', {
                    agentId,
                    data
                });
            }
        });
    }
    /**
     * Handle input to agent terminal (Phase 2: Interactive mode)
     */
    handleAgentInput(agentId, input) {
        const session = this.sessions.get(agentId);
        if (!session) {
            console.error(`❌ No terminal session for agent: ${agentId}`);
            return;
        }
        if (!session.isInteractive) {
            console.warn(`⚠️ Agent ${agentId} is in read-only mode (Phase 1)`);
            this.appendToAgentTerminal(agentId, '\r\n⚠️ This terminal is read-only in Phase 1\r\n');
            return;
        }
        // Phase 2: Forward input to Claude CLI process
        // This will be implemented when we enable interactive mode
        console.log(`📝 Input for agent ${agentId}: ${input}`);
    }
    /**
     * Setup listeners for Claude Code Bridge events
     */
    setupBridgeListeners() {
        if (!this.bridgeService) {
            console.warn('⚠️ Claude Code Bridge Service not available');
            return;
        }
        // Listen for agent progress updates
        this.bridgeService.on('agent:progress', (data) => {
            const { agentId, currentTask, progress, status } = data;
            // Format progress update for terminal display
            const progressBar = this.createProgressBar(progress);
            const statusLine = `\r\n[${status.toUpperCase()}] ${progressBar} ${progress}% - ${currentTask}\r\n`;
            this.appendToAgentTerminal(agentId, statusLine);
        });
        // Listen for team spawned events
        this.bridgeService.on('team:spawned', (data) => {
            const { teamId, agents } = data;
            console.log(`🚀 Team spawned: ${teamId} with ${agents} agents`);
            // Create terminal sessions for each agent
            // This is handled by the Terminal.tsx component when it creates agent tabs
        });
        // Listen for team completion
        this.bridgeService.on('team:completed', (data) => {
            const { teamId, totalFiles, duration } = data;
            const completionMessage = `\r\n✅ Team ${teamId} completed!\r\n` +
                `   Files created: ${totalFiles}\r\n` +
                `   Duration: ${Math.round(duration / 1000)}s\r\n`;
            // Send completion message to all agents in the team
            this.sessions.forEach((session, agentId) => {
                if (session.teamId === teamId) {
                    this.appendToAgentTerminal(agentId, completionMessage);
                }
            });
        });
    }
    /**
     * Create a visual progress bar for terminal display
     */
    createProgressBar(progress) {
        const width = 20;
        const filled = Math.round((progress / 100) * width);
        const empty = width - filled;
        return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
    }
    /**
     * Get session by agent ID
     */
    getSession(agentId) {
        return this.sessions.get(agentId);
    }
    /**
     * Clean up agent terminal session
     */
    cleanupSession(agentId) {
        const session = this.sessions.get(agentId);
        if (session) {
            // Disconnect all sockets
            session.connectedSockets.forEach(socket => {
                socket.emit('agent:terminal:closed', { agentId });
            });
            session.connectedSockets.clear();
            this.sessions.delete(agentId);
            console.log(`🧹 Cleaned up agent terminal session: ${agentId}`);
        }
    }
    /**
     * Enable interactive mode for an agent (Phase 2)
     */
    enableInteractiveMode(agentId) {
        const session = this.sessions.get(agentId);
        if (session) {
            session.isInteractive = true;
            this.appendToAgentTerminal(agentId, '\r\n✅ Interactive mode enabled\r\n');
            console.log(`🎮 Interactive mode enabled for agent: ${agentId}`);
        }
    }
    /**
     * Get all active sessions
     */
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    /**
     * Clean up old sessions (1 hour inactive)
     */
    cleanupInactiveSessions() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        this.sessions.forEach((session, agentId) => {
            if (session.lastActivity < oneHourAgo) {
                this.cleanupSession(agentId);
            }
        });
    }
}
exports.AgentTerminalManager = AgentTerminalManager;
// Singleton instance
let instance = null;
function getAgentTerminalManager(io) {
    if (!instance) {
        instance = new AgentTerminalManager(io);
    }
    else if (io && !instance.io) {
        instance.setSocketIO(io);
    }
    return instance;
}
