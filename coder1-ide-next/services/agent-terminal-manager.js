/**
 * Agent Terminal Manager
 * Manages WebSocket routing for agent-specific terminal sessions
 * Part of Phase 2: Interactive Agent Terminal Tabs
 */

const EventEmitter = require('events');

class AgentTerminalSession {
  constructor(agentId, teamId, role) {
    this.agentId = agentId;
    this.teamId = teamId;
    this.role = role;
    this.connectedSockets = new Set();
    this.terminalBuffer = [];
    this.maxBufferSize = 1000;
    this.isInteractive = false; // Phase 2: Will be true when fully implemented
    this.createdAt = new Date();
  }

  addSocket(socket) {
    this.connectedSockets.add(socket);
  }

  removeSocket(socket) {
    this.connectedSockets.delete(socket);
  }

  appendToBuffer(data) {
    this.terminalBuffer.push(data);
    if (this.terminalBuffer.length > this.maxBufferSize) {
      this.terminalBuffer.shift();
    }
  }

  getBuffer() {
    return this.terminalBuffer.join('');
  }

  broadcastToSockets(eventName, data) {
    this.connectedSockets.forEach(socket => {
      if (socket.connected) {
        socket.emit(eventName, data);
      }
    });
  }
}

class AgentTerminalManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.maxSessions = 10;
    this.io = null;
    
    console.log('🤖 Agent Terminal Manager initialized');
  }

  setSocketIO(io) {
    this.io = io;
  }

  createAgentTerminalSession(agentId, teamId, role) {
    if (this.sessions.has(agentId)) {
      console.log(`♻️ Reusing existing agent terminal session: ${agentId}`);
      return this.sessions.get(agentId);
    }

    if (this.sessions.size >= this.maxSessions) {
      const oldestSession = Array.from(this.sessions.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      
      if (oldestSession) {
        console.log(`🗑️ Removing oldest agent terminal session: ${oldestSession[0]}`);
        this.sessions.delete(oldestSession[0]);
      }
    }

    const session = new AgentTerminalSession(agentId, teamId, role);
    this.sessions.set(agentId, session);
    
    console.log(`✅ Created agent terminal session: ${agentId} (${role})`);
    
    // Emit creation event
    this.emit('session:created', { agentId, teamId, role });
    
    return session;
  }

  getAgentTerminalSession(agentId) {
    return this.sessions.get(agentId);
  }

  connectSocketToAgentTerminal(agentId, socket) {
    const session = this.sessions.get(agentId);
    if (!session) {
      console.warn(`⚠️ Agent terminal session not found: ${agentId}`);
      return false;
    }

    session.addSocket(socket);
    
    // Send buffered output to the newly connected socket
    const buffer = session.getBuffer();
    if (buffer) {
      socket.emit('agent:terminal:buffer', { agentId, data: buffer });
    }
    
    console.log(`🔌 Socket connected to agent terminal: ${agentId}`);
    return true;
  }

  disconnectSocketFromAgentTerminal(agentId, socket) {
    const session = this.sessions.get(agentId);
    if (!session) {
      return false;
    }

    session.removeSocket(socket);
    console.log(`🔌 Socket disconnected from agent terminal: ${agentId}`);
    
    // Clean up session if no sockets remain
    if (session.connectedSockets.size === 0) {
      setTimeout(() => {
        if (session.connectedSockets.size === 0) {
          this.sessions.delete(agentId);
          console.log(`🗑️ Removed inactive agent terminal session: ${agentId}`);
        }
      }, 30000); // 30 seconds timeout
    }
    
    return true;
  }

  appendToAgentTerminal(agentId, data) {
    const session = this.sessions.get(agentId);
    if (!session) {
      console.warn(`⚠️ Cannot append to non-existent agent terminal: ${agentId}`);
      return false;
    }

    session.appendToBuffer(data);
    session.broadcastToSockets('agent:terminal:data', { agentId, data });
    
    // Emit data event for logging
    this.emit('data:appended', { agentId, dataLength: data.length });
    
    return true;
  }

  sendInputToAgentTerminal(agentId, input) {
    const session = this.sessions.get(agentId);
    if (!session) {
      console.warn(`⚠️ Cannot send input to non-existent agent terminal: ${agentId}`);
      return false;
    }

    if (!session.isInteractive) {
      console.warn(`⚠️ Agent terminal ${agentId} is not interactive (Phase 1: read-only)`);
      return false;
    }

    // Phase 2: This will send input to the actual Claude process
    // For now, just echo back
    this.appendToAgentTerminal(agentId, `> ${input}\n`);
    this.appendToAgentTerminal(agentId, `[Phase 2: Input handling will be implemented here]\n`);
    
    return true;
  }

  broadcastToAllAgents(teamId, eventName, data) {
    let broadcastCount = 0;
    
    this.sessions.forEach((session, agentId) => {
      if (session.teamId === teamId) {
        session.broadcastToSockets(eventName, data);
        broadcastCount++;
      }
    });
    
    console.log(`📢 Broadcast ${eventName} to ${broadcastCount} agents in team ${teamId}`);
    return broadcastCount;
  }

  getTeamAgents(teamId) {
    const agents = [];
    
    this.sessions.forEach((session, agentId) => {
      if (session.teamId === teamId) {
        agents.push({
          agentId,
          role: session.role,
          connectedSockets: session.connectedSockets.size,
          bufferSize: session.terminalBuffer.length,
          isInteractive: session.isInteractive,
          createdAt: session.createdAt
        });
      }
    });
    
    return agents;
  }

  clearAgentTerminal(agentId) {
    const session = this.sessions.get(agentId);
    if (!session) {
      return false;
    }

    session.terminalBuffer = [];
    session.broadcastToSockets('agent:terminal:clear', { agentId });
    
    console.log(`🧹 Cleared agent terminal buffer: ${agentId}`);
    return true;
  }

  removeAgentTerminalSession(agentId) {
    const session = this.sessions.get(agentId);
    if (!session) {
      return false;
    }

    // Notify all connected sockets
    session.broadcastToSockets('agent:terminal:closed', { agentId });
    
    // Clear sockets
    session.connectedSockets.clear();
    
    // Remove session
    this.sessions.delete(agentId);
    
    console.log(`❌ Removed agent terminal session: ${agentId}`);
    this.emit('session:removed', { agentId });
    
    return true;
  }

  removeTeamSessions(teamId) {
    let removedCount = 0;
    
    this.sessions.forEach((session, agentId) => {
      if (session.teamId === teamId) {
        this.removeAgentTerminalSession(agentId);
        removedCount++;
      }
    });
    
    console.log(`🧹 Removed ${removedCount} agent terminal sessions for team ${teamId}`);
    return removedCount;
  }

  getStats() {
    const stats = {
      totalSessions: this.sessions.size,
      totalSockets: 0,
      totalBufferSize: 0,
      sessions: []
    };
    
    this.sessions.forEach((session, agentId) => {
      stats.totalSockets += session.connectedSockets.size;
      stats.totalBufferSize += session.terminalBuffer.length;
      stats.sessions.push({
        agentId,
        teamId: session.teamId,
        role: session.role,
        sockets: session.connectedSockets.size,
        bufferSize: session.terminalBuffer.length,
        isInteractive: session.isInteractive,
        uptime: Date.now() - session.createdAt.getTime()
      });
    });
    
    return stats;
  }
}

// Singleton instance
let instance = null;

function getAgentTerminalManager() {
  if (!instance) {
    instance = new AgentTerminalManager();
  }
  return instance;
}

module.exports = {
  getAgentTerminalManager,
  AgentTerminalManager,
  AgentTerminalSession
};