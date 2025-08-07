/**
 * HivemindService - Coordinated Multi-Agent Intelligence System
 * 
 * Transforms parallel agents into a unified swarm intelligence with:
 * - Shared collective memory between all agents
 * - Dynamic queen selection and task distribution
 * - Real-time context propagation
 * - WebSocket-based status updates
 */

const EventEmitter = require('events');

class HivemindService extends EventEmitter {
  constructor() {
    super();
    
    // Core hivemind state
    this.sessions = new Map(); // sessionId -> HivemindSession
    this.agentMemory = new Map(); // sessionId -> SharedMemory
    
    // Configuration
    this.config = {
      maxAgents: 3,
      defaultQueen: 0, // Agent 1 is default queen (0-indexed)
      memoryRetentionMs: 3600000, // 1 hour
      broadcastInterval: 2000 // 2 seconds
    };
    
    // Initialize shared memory structure
    this.memoryTemplate = {
      globalContext: {},      // Shared discoveries across all agents
      codePatterns: [],       // Successful code implementations
      taskHistory: [],        // Completed tasks for reference
      discoveries: [],        // Important findings to share instantly
      agentInsights: {},      // Per-agent specialized knowledge
      projectStructure: {},   // Understanding of project architecture
      dependencies: new Set() // Detected dependencies
    };
  }

  /**
   * Start a new hivemind session
   */
  async startSession(userId, projectBrief, taskDescription) {
    const sessionId = `hivemind-${userId}-${Date.now()}`;
    
    const session = {
      id: sessionId,
      userId,
      projectBrief,
      taskDescription,
      status: 'initializing',
      startTime: new Date(),
      agents: this.initializeAgents(),
      queen: this.config.defaultQueen,
      taskQueue: [],
      completedTasks: [],
      metrics: {
        tasksCompleted: 0,
        discoveryCount: 0,
        patternsIdentified: 0,
        contextSize: 0
      }
    };
    
    // Initialize shared memory for this session
    const memory = JSON.parse(JSON.stringify(this.memoryTemplate));
    memory.globalContext = {
      projectBrief,
      taskDescription,
      sessionId,
      startTime: session.startTime
    };
    
    this.sessions.set(sessionId, session);
    this.agentMemory.set(sessionId, memory);
    
    // Emit session start event
    this.emit('session:started', { sessionId, session });
    
    console.log(`🧠 Hivemind session started: ${sessionId}`);
    return { sessionId, session };
  }

  /**
   * Initialize agent configurations
   */
  initializeAgents() {
    return [
      {
        id: 0,
        name: 'Agent Alpha',
        role: 'architect',
        status: 'idle',
        currentTask: null,
        progress: 0,
        specialization: 'System architecture and design patterns',
        tasksCompleted: 0,
        discoveries: []
      },
      {
        id: 1,
        name: 'Agent Beta',
        role: 'implementer',
        status: 'idle',
        currentTask: null,
        progress: 0,
        specialization: 'Code implementation and optimization',
        tasksCompleted: 0,
        discoveries: []
      },
      {
        id: 2,
        name: 'Agent Gamma',
        role: 'analyst',
        status: 'idle',
        currentTask: null,
        progress: 0,
        specialization: 'Testing, debugging, and quality assurance',
        tasksCompleted: 0,
        discoveries: []
      }
    ];
  }

  /**
   * Get enhanced context for an agent including shared memory
   */
  getAgentContext(sessionId, agentId) {
    const session = this.sessions.get(sessionId);
    const memory = this.agentMemory.get(sessionId);
    
    if (!session || !memory) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const agent = session.agents[agentId];
    const isQueen = session.queen === agentId;
    
    // Build context with shared memory
    const context = {
      // Agent identity
      agentId,
      agentName: agent.name,
      agentRole: agent.role,
      isQueen,
      specialization: agent.specialization,
      
      // Shared memory access
      globalContext: memory.globalContext,
      discoveries: memory.discoveries,
      codePatterns: memory.codePatterns,
      projectStructure: memory.projectStructure,
      dependencies: Array.from(memory.dependencies),
      
      // Other agents' insights
      otherAgentInsights: Object.entries(memory.agentInsights)
        .filter(([id]) => parseInt(id) !== agentId)
        .reduce((acc, [id, insights]) => {
          acc[session.agents[id].name] = insights;
          return acc;
        }, {}),
      
      // Task context
      currentTask: agent.currentTask,
      taskHistory: memory.taskHistory.filter(task => task.agentId === agentId),
      globalTaskHistory: memory.taskHistory,
      
      // Queen-specific context
      ...(isQueen && {
        taskQueue: session.taskQueue,
        agentStatuses: session.agents.map(a => ({
          name: a.name,
          status: a.status,
          currentTask: a.currentTask,
          progress: a.progress
        }))
      })
    };
    
    return context;
  }

  /**
   * Update shared memory with agent discovery
   */
  addDiscovery(sessionId, agentId, discovery) {
    const memory = this.agentMemory.get(sessionId);
    const session = this.sessions.get(sessionId);
    
    if (!memory || !session) return;
    
    const agent = session.agents[agentId];
    
    // Add to global discoveries
    memory.discoveries.push({
      agentId,
      agentName: agent.name,
      timestamp: new Date(),
      type: discovery.type || 'general',
      content: discovery.content,
      importance: discovery.importance || 'normal'
    });
    
    // Keep only last 100 discoveries
    if (memory.discoveries.length > 100) {
      memory.discoveries = memory.discoveries.slice(-100);
    }
    
    // Update agent-specific insights
    if (!memory.agentInsights[agentId]) {
      memory.agentInsights[agentId] = [];
    }
    memory.agentInsights[agentId].push(discovery);
    
    // Update metrics
    session.metrics.discoveryCount++;
    session.metrics.contextSize = JSON.stringify(memory).length;
    
    // Emit discovery event for real-time updates
    this.emit('discovery:added', {
      sessionId,
      agentId,
      agentName: agent.name,
      discovery
    });
    
    console.log(`💡 Agent ${agent.name} made a discovery:`, discovery.content.substring(0, 100));
  }

  /**
   * Add successful code pattern to shared memory
   */
  addCodePattern(sessionId, agentId, pattern) {
    const memory = this.agentMemory.get(sessionId);
    const session = this.sessions.get(sessionId);
    
    if (!memory || !session) return;
    
    memory.codePatterns.push({
      agentId,
      timestamp: new Date(),
      name: pattern.name,
      description: pattern.description,
      code: pattern.code,
      usage: pattern.usage,
      category: pattern.category || 'general'
    });
    
    // Keep only last 50 patterns
    if (memory.codePatterns.length > 50) {
      memory.codePatterns = memory.codePatterns.slice(-50);
    }
    
    session.metrics.patternsIdentified++;
    
    this.emit('pattern:added', {
      sessionId,
      agentId,
      pattern
    });
  }

  /**
   * Update project structure understanding
   */
  updateProjectStructure(sessionId, agentId, structureUpdate) {
    const memory = this.agentMemory.get(sessionId);
    if (!memory) return;
    
    // Merge structure updates
    Object.assign(memory.projectStructure, structureUpdate);
    
    this.emit('structure:updated', {
      sessionId,
      agentId,
      update: structureUpdate
    });
  }

  /**
   * Add detected dependency
   */
  addDependency(sessionId, dependency) {
    const memory = this.agentMemory.get(sessionId);
    if (!memory) return;
    
    memory.dependencies.add(dependency);
  }

  /**
   * Assign task to agent
   */
  assignTask(sessionId, agentId, task) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const agent = session.agents[agentId];
    agent.status = 'working';
    agent.currentTask = task;
    agent.progress = 0;
    
    // Add to task history
    const memory = this.agentMemory.get(sessionId);
    if (memory) {
      memory.taskHistory.push({
        agentId,
        agentName: agent.name,
        task,
        startTime: new Date(),
        status: 'in-progress'
      });
    }
    
    this.emit('task:assigned', {
      sessionId,
      agentId,
      agentName: agent.name,
      task
    });
  }

  /**
   * Update agent progress
   */
  updateAgentProgress(sessionId, agentId, progress) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const agent = session.agents[agentId];
    agent.progress = Math.min(100, Math.max(0, progress));
    
    this.emit('progress:updated', {
      sessionId,
      agentId,
      agentName: agent.name,
      progress: agent.progress
    });
  }

  /**
   * Complete agent task
   */
  completeTask(sessionId, agentId, result) {
    const session = this.sessions.get(sessionId);
    const memory = this.agentMemory.get(sessionId);
    
    if (!session || !memory) return;
    
    const agent = session.agents[agentId];
    const completedTask = {
      ...agent.currentTask,
      result,
      completedBy: agent.name,
      completionTime: new Date()
    };
    
    // Update agent state
    agent.status = 'idle';
    agent.currentTask = null;
    agent.progress = 100;
    agent.tasksCompleted++;
    
    // Update session
    session.completedTasks.push(completedTask);
    session.metrics.tasksCompleted++;
    
    // Update task history
    const taskIndex = memory.taskHistory.findIndex(
      t => t.agentId === agentId && t.status === 'in-progress'
    );
    if (taskIndex !== -1) {
      memory.taskHistory[taskIndex].status = 'completed';
      memory.taskHistory[taskIndex].endTime = new Date();
      memory.taskHistory[taskIndex].result = result;
    }
    
    this.emit('task:completed', {
      sessionId,
      agentId,
      agentName: agent.name,
      task: completedTask
    });
  }

  /**
   * Select new queen based on task type
   */
  selectQueen(sessionId, taskType) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    let newQueen = this.config.defaultQueen;
    
    // Dynamic queen selection based on task type
    switch (taskType) {
      case 'architecture':
      case 'design':
        newQueen = 0; // Agent Alpha (architect)
        break;
      case 'implementation':
      case 'refactoring':
        newQueen = 1; // Agent Beta (implementer)
        break;
      case 'debugging':
      case 'testing':
        newQueen = 2; // Agent Gamma (analyst)
        break;
    }
    
    if (session.queen !== newQueen) {
      const oldQueen = session.agents[session.queen];
      const newQueenAgent = session.agents[newQueen];
      
      session.queen = newQueen;
      
      this.emit('queen:changed', {
        sessionId,
        oldQueen: oldQueen.name,
        newQueen: newQueenAgent.name,
        reason: `Task type: ${taskType}`
      });
      
      console.log(`👑 Queen changed from ${oldQueen.name} to ${newQueenAgent.name} for ${taskType} tasks`);
    }
  }

  /**
   * Get session status
   */
  getSessionStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    const memory = this.agentMemory.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    return {
      session: {
        ...session,
        agents: session.agents.map(agent => ({
          ...agent,
          discoveries: agent.discoveries.length
        }))
      },
      memory: {
        contextSize: JSON.stringify(memory).length,
        discoveryCount: memory.discoveries.length,
        patternCount: memory.codePatterns.length,
        dependencyCount: memory.dependencies.size
      }
    };
  }

  /**
   * Stop hivemind session
   */
  stopSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.status = 'stopped';
    session.endTime = new Date();
    
    // Calculate final metrics
    const duration = session.endTime - session.startTime;
    session.metrics.durationMs = duration;
    session.metrics.avgTaskTime = session.metrics.tasksCompleted > 0
      ? duration / session.metrics.tasksCompleted
      : 0;
    
    this.emit('session:stopped', {
      sessionId,
      metrics: session.metrics
    });
    
    // Clean up after delay (keep for review)
    setTimeout(() => {
      this.sessions.delete(sessionId);
      this.agentMemory.delete(sessionId);
    }, this.config.memoryRetentionMs);
    
    console.log(`🛑 Hivemind session stopped: ${sessionId}`);
    return session.metrics;
  }
}

// Export singleton instance
module.exports = new HivemindService();