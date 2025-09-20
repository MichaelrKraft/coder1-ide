/**
 * Agent Terminal Manager Service
 * 
 * Manages terminal sessions for AI agents with WebSocket routing.
 * Connects agent terminals to Claude CLI process output streams.
 * Part of Phase 2: Interactive Agent Terminals implementation.
 */

import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import { getClaudeCodeBridgeService } from './claude-code-bridge';

export interface AgentTerminalSession {
  agentId: string;
  teamId: string;
  role: string;
  terminalBuffer: string[];
  lastActivity: Date;
  processId?: number;
  isInteractive: boolean;
  connectedSockets: Set<any>;
}

export class AgentTerminalManager extends EventEmitter {
  private sessions: Map<string, AgentTerminalSession> = new Map();
  private bridgeService: any;
  private io: any; // Socket.IO instance
  
  constructor(io?: any) {
    super();
    this.io = io;
    this.bridgeService = getClaudeCodeBridgeService();
    this.setupBridgeListeners();
  }
  
  /**
   * Set Socket.IO instance for WebSocket communication
   */
  public setSocketIO(io: any): void {
    this.io = io;
  }
  
  /**
   * Create an agent terminal session
   */
  public createAgentTerminalSession(agentId: string, teamId: string, role: string): AgentTerminalSession {
    const session: AgentTerminalSession = {
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
  public connectSocket(agentId: string, socket: any): boolean {
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
  public appendToAgentTerminal(agentId: string, data: string): void {
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
  public handleAgentInput(agentId: string, input: string): void {
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
  private setupBridgeListeners(): void {
    if (!this.bridgeService) {
      console.warn('⚠️ Claude Code Bridge Service not available');
      return;
    }
    
    // Listen for agent progress updates
    this.bridgeService.on('agent:progress', (data: any) => {
      const { agentId, currentTask, progress, status } = data;
      
      // Format progress update for terminal display
      const progressBar = this.createProgressBar(progress);
      const statusLine = `\r\n[${status.toUpperCase()}] ${progressBar} ${progress}% - ${currentTask}\r\n`;
      
      this.appendToAgentTerminal(agentId, statusLine);
    });
    
    // Listen for team spawned events
    this.bridgeService.on('team:spawned', (data: any) => {
      const { teamId, agents } = data;
      console.log(`🚀 Team spawned: ${teamId} with ${agents} agents`);
      
      // Create terminal sessions for each agent
      // This is handled by the Terminal.tsx component when it creates agent tabs
    });
    
    // Listen for team completion
    this.bridgeService.on('team:completed', (data: any) => {
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
  private createProgressBar(progress: number): string {
    const width = 20;
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }
  
  /**
   * Get session by agent ID
   */
  public getSession(agentId: string): AgentTerminalSession | undefined {
    return this.sessions.get(agentId);
  }
  
  /**
   * Clean up agent terminal session
   */
  public cleanupSession(agentId: string): void {
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
  public enableInteractiveMode(agentId: string): void {
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
  public getAllSessions(): AgentTerminalSession[] {
    return Array.from(this.sessions.values());
  }
  
  /**
   * Clean up old sessions (1 hour inactive)
   */
  public cleanupInactiveSessions(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    this.sessions.forEach((session, agentId) => {
      if (session.lastActivity < oneHourAgo) {
        this.cleanupSession(agentId);
      }
    });
  }
}

// Singleton instance
let instance: AgentTerminalManager | null = null;

export function getAgentTerminalManager(io?: any): AgentTerminalManager {
  if (!instance) {
    instance = new AgentTerminalManager(io);
  } else if (io && !instance.io) {
    instance.setSocketIO(io);
  }
  return instance;
}