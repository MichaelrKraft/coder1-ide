/**
 * Agent Terminal Manager Service
 * 
 * Manages terminal sessions for AI agents with WebSocket routing.
 * Connects agent terminals to Claude CLI process output streams.
 * Part of Phase 2: Interactive Agent Terminals implementation.
 */

import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';

// Optional: Claude Code Bridge Service for progress events
let getClaudeCodeBridgeService: any;
try {
  ({ getClaudeCodeBridgeService } = require('./claude-code-bridge'));
} catch (error) {
  console.warn('⚠️ Claude Code Bridge not available for agent progress events');
  getClaudeCodeBridgeService = () => null;
}

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
  private instanceId: string; // Unique instance identifier for debugging
  
  // Pending connections queue for race condition handling
  private pendingConnections: Map<string, Set<any>> = new Map();
  private pendingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(io?: any) {
    super();
    this.instanceId = `ATM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆔 AgentTerminalManager instance created: ${this.instanceId}`);
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
    console.log(`🔍 [${this.instanceId}] createAgentTerminalSession called for ${agentId}`);
    
    // Check if session already exists - don't overwrite connectedSockets!
    // This prevents losing socket connections when coordinator re-creates sessions during workflow execution
    const existingSession = this.sessions.get(agentId);
    if (existingSession) {
      console.log(`♻️ [${this.instanceId}] Agent session ${agentId} already exists - preserving ${existingSession.connectedSockets.size} socket connection(s)`);
      return existingSession;
    }
    
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
    console.log(`🤖 [${this.instanceId}] Created NEW agent terminal session: ${agentId} (${role})`);
    
    // Flush pending connections that were queued before session existed
    const pending = this.pendingConnections.get(agentId);
    if (pending && pending.size > 0) {
      console.log(`🔌 Flushing ${pending.size} pending connection(s) for ${agentId}`);
      pending.forEach(socket => {
        if (socket.connected) {
          // Now that session exists, connect the socket
          this.connectSocket(agentId, socket);
        } else {
          console.warn(`⚠️ Skipping disconnected socket during flush for ${agentId}`);
        }
      });
      
      // Clear the pending queue and timeout
      this.pendingConnections.delete(agentId);
      const timeout = this.pendingTimeouts.get(agentId);
      if (timeout) {
        clearTimeout(timeout);
        this.pendingTimeouts.delete(agentId);
      }
    }
    
    return session;
  }
  
  /**
   * Connect a socket to an agent terminal session
   */
  public connectSocket(agentId: string, socket: any): boolean {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🎯 [ATM-CONNECT] Connection request received`);
    console.log('   Requested Agent ID:', agentId);
    console.log('   Socket ID:', socket?.id);
    console.log('   Socket connected:', socket?.connected);
    console.log('   Available sessions:', Array.from(this.sessions.keys()));
    console.log('   Session exists for this ID:', this.sessions.has(agentId));
    console.log('═══════════════════════════════════════════════════════════');
    
    const session = this.sessions.get(agentId);
    if (!session) {
      // Session doesn't exist yet - queue the connection
      console.log(`⏳ [ATM-CONNECT] Session not ready for ${agentId}, queueing socket connection`);
      console.log(`   Pending queue size: ${this.pendingConnections.get(agentId)?.size || 0}`);
      
      if (!this.pendingConnections.has(agentId)) {
        this.pendingConnections.set(agentId, new Set());
        
        // Auto-expire pending connections after 30 seconds
        const timeout = setTimeout(() => {
          const pending = this.pendingConnections.get(agentId);
          if (pending) {
            console.warn(`⏰ Expired ${pending.size} pending connection(s) for ${agentId} (session never created)`);
            this.pendingConnections.delete(agentId);
            this.pendingTimeouts.delete(agentId);
          }
        }, 30000);
        
        this.pendingTimeouts.set(agentId, timeout);
      }
      
      this.pendingConnections.get(agentId)!.add(socket);
      
      // Remove from queue on disconnect
      socket.once('disconnect', () => {
        const pending = this.pendingConnections.get(agentId);
        if (pending) {
          pending.delete(socket);
          console.log(`🔌 Removed disconnected socket from pending queue for ${agentId}`);
        }
      });
      
      console.log(`📋 Queued socket for ${agentId} (total pending: ${this.pendingConnections.get(agentId)!.size})`);
      return false;
    }
    
    session.connectedSockets.add(socket);
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ [ATM-CONNECT] Socket ${socket.id} SUCCESSFULLY ADDED`);
    console.log('   Agent ID:', agentId);
    console.log('   Connected sockets count:', session.connectedSockets.size);
    console.log('   Instance ID:', this.instanceId);
    console.log('═══════════════════════════════════════════════════════════');
    
    // Send buffered terminal history
    if (session.terminalBuffer.length > 0) {
      const history = session.terminalBuffer.join('');
      socket.emit('agent:terminal:data', {
        agentId,
        data: history
      });
    }
    
    // Clean up on disconnect
    socket.on('disconnect', (reason) => {
      console.log(`🔌 [${this.instanceId}] Socket ${socket.id} DISCONNECTED for ${agentId} - Reason: ${reason}`);
      session.connectedSockets.delete(socket);
      console.log(`❌ [${this.instanceId}] Socket REMOVED from ${agentId} - Set size now: ${session.connectedSockets.size}`);
    });
    
    console.log(`🔌 Socket connected to agent terminal: ${agentId}`);
    return true;
  }
  
  /**
   * Append data to agent terminal and broadcast to connected sockets
   */
  public appendToAgentTerminal(agentId: string, data: string): void {
    console.log(`📡 [${this.instanceId}] appendToAgentTerminal called for ${agentId}`);
    
    // Add null/undefined safety check
    if (!data || data.trim().length === 0) {
      console.warn(`⚠️ Skipping empty output for agent ${agentId} (data: ${typeof data}, length: ${data?.length || 0})`);
      return;
    }
    
    const session = this.sessions.get(agentId);
    if (!session) {
      console.warn(`⚠️ [${this.instanceId}] No terminal session for agent: ${agentId}`);
      console.warn(`   Available sessions in this instance: ${Array.from(this.sessions.keys()).join(', ') || 'NONE'}`);
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
    console.log(`📤 [${this.instanceId}] Broadcasting to ${session.connectedSockets.size} socket(s) for agent ${agentId}, data length: ${data.length}`);
    session.connectedSockets.forEach(socket => {
      if (socket.connected) {
        console.log(`✅ [DEBUG] Emitting agent:terminal:data to socket ${socket.id}`);
        socket.emit('agent:terminal:data', {
          agentId,
          data
        });
      } else {
        console.warn(`⚠️ [DEBUG] Socket ${socket.id} not connected, skipping`);
      }
    });
    
    if (session.connectedSockets.size === 0) {
      console.error(`❌ [${this.instanceId}] NO SOCKETS CONNECTED for agent ${agentId} - data will be lost!`);
    }
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
    
    // Also clear any pending connections and timeouts
    this.pendingConnections.delete(agentId);
    const timeout = this.pendingTimeouts.get(agentId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingTimeouts.delete(agentId);
      console.log(`🧹 Cleared pending connections timeout for ${agentId}`);
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
  
  /**
   * Get statistics about active terminal sessions
   */
  public getStats(): { totalSessions: number; sessions: any[] } {
    const sessions = Array.from(this.sessions.values()).map(session => ({
      agentId: session.agentId,
      role: session.role,
      teamId: session.teamId,
      bufferSize: session.terminalBuffer.length,
      isInteractive: session.isInteractive,
      lastActivity: session.lastActivity,
      connectedSockets: session.connectedSockets.size
    }));
    
    return {
      totalSessions: this.sessions.size,
      sessions
    };
  }
}

// Singleton instance with global registry for cross-module stability
// This prevents multiple instances when Next.js HMR reloads modules
let instance: AgentTerminalManager | null = null;

// Extend global type for TypeScript
declare global {
  var __AGENT_TERMINAL_MANAGER__: AgentTerminalManager | undefined;
}

export function getAgentTerminalManager(io?: any): AgentTerminalManager {
  // Check global registry first (survives module reloads)
  if (global.__AGENT_TERMINAL_MANAGER__) {
    console.log('✅ Using existing AgentTerminalManager from global registry');
    instance = global.__AGENT_TERMINAL_MANAGER__;
    
    // Update Socket.IO if provided
    if (io && !instance.io) {
      instance.setSocketIO(io);
    }
    
    return instance;
  }
  
  // Create new instance if none exists
  if (!instance) {
    instance = new AgentTerminalManager(io);
    // Store in global registry
    global.__AGENT_TERMINAL_MANAGER__ = instance;
    console.log('🌍 Registered AgentTerminalManager in global registry');
  } else if (io && !instance.io) {
    instance.setSocketIO(io);
  }
  
  return instance;
}