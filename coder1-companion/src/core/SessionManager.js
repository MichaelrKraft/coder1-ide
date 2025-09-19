const fs = require('fs').promises;
const path = require('path');

class SessionManager {
  constructor(options) {
    this.logger = options.logger;
    this.claudeBridge = options.claudeBridge;
    
    // In-memory session storage
    this.sessions = new Map();
    this.sessionTimelines = new Map();
    
    // Persistent storage path
    this.storageDir = path.join(require('os').homedir(), '.coder1-companion', 'sessions');
    
    this.initialize();
  }

  async initialize() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await this.loadExistingSessions();
      
      this.logger.info('📚 Session Manager initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Session Manager:', error);
      throw error;
    }
  }

  async loadExistingSessions() {
    try {
      const files = await fs.readdir(this.storageDir);
      const sessionFiles = files.filter(file => file.endsWith('.json') && !file.includes('index'));
      
      for (const file of sessionFiles) {
        try {
          const sessionData = JSON.parse(await fs.readFile(path.join(this.storageDir, file), 'utf8'));
          this.sessions.set(sessionData.id, sessionData);
        } catch (error) {
          this.logger.warn(`Failed to load session file ${file}:`, error);
        }
      }
      
      this.logger.info(`📚 Loaded ${this.sessions.size} existing sessions`);
    } catch (error) {
      this.logger.debug('No existing sessions found');
    }
  }

  async createSession(sessionData) {
    const session = {
      id: sessionData.id || this.generateSessionId(),
      projectPath: sessionData.projectPath,
      startTime: new Date().toISOString(),
      metadata: {
        ...sessionData.metadata,
        connectionId: sessionData.connectionId
      },
      state: {
        files: new Map(),
        commands: [],
        checkpoints: [],
        timeline: []
      }
    };

    this.sessions.set(session.id, session);
    this.sessionTimelines.set(session.id, []);
    
    // Save to disk
    await this.saveSession(session);
    
    this.logger.info(`📚 Created session: ${session.id}`);
    return session;
  }

  async getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    return { ...session };
  }

  async updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update session data
    Object.assign(session, updates);
    session.lastUpdated = new Date().toISOString();
    
    // Save to disk
    await this.saveSession(session);
    
    this.logger.debug(`📚 Updated session: ${sessionId}`);
  }

  async addToTimeline(sessionId, event) {
    const timeline = this.sessionTimelines.get(sessionId) || [];
    
    const timelineEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type: event.type,
      data: event.data,
      duration: event.duration || null
    };

    timeline.push(timelineEvent);
    this.sessionTimelines.set(sessionId, timeline);
    
    // Update session
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state.timeline = timeline.slice(-100); // Keep last 100 events
      await this.saveSession(session);
    }

    return timelineEvent;
  }

  async getSessionTimeline(sessionId) {
    const timeline = this.sessionTimelines.get(sessionId) || [];
    
    // Enhance timeline with analysis if there are events
    if (timeline.length === 0) {
      return {
        events: [],
        analysis: null
      };
    }

    try {
      // Use Claude to analyze the session timeline
      const analysis = await this.analyzeSessionTimeline(sessionId, timeline);
      
      return {
        events: timeline,
        analysis
      };
    } catch (error) {
      this.logger.warn(`Failed to analyze timeline for session ${sessionId}:`, error);
      
      return {
        events: timeline,
        analysis: null
      };
    }
  }

  async analyzeSessionTimeline(sessionId, timeline) {
    const prompt = this.buildTimelineAnalysisPrompt(sessionId, timeline);
    
    try {
      const result = await this.claudeBridge.executeCommand({
        command: prompt,
        sessionId
      });

      return this.parseTimelineAnalysis(result.result);
    } catch (error) {
      throw new Error(`Timeline analysis failed: ${error.message}`);
    }
  }

  buildTimelineAnalysisPrompt(sessionId, timeline) {
    const recentEvents = timeline.slice(-20); // Last 20 events
    
    const eventSummary = recentEvents.map((event, index) => {
      const time = new Date(event.timestamp).toLocaleTimeString();
      const duration = event.duration ? ` (${event.duration}ms)` : '';
      return `${index + 1}. [${time}] ${event.type}: ${this.summarizeEventData(event.data)}${duration}`;
    }).join('\n');

    return `Analyze this development session timeline and provide insights:

SESSION: ${sessionId}
TOTAL EVENTS: ${timeline.length}
RECENT ACTIVITY:
${eventSummary}

Please provide a JSON response with:
{
  "sessionSummary": "Brief overview of what was accomplished",
  "productivity": "high|medium|low",
  "keyMilestones": ["milestone 1", "milestone 2"],
  "timeDistribution": {
    "coding": 0.6,
    "debugging": 0.2,
    "research": 0.1,
    "other": 0.1
  },
  "recommendations": ["recommendation 1", "recommendation 2"],
  "nextSteps": ["next step 1", "next step 2"]
}`;
  }

  summarizeEventData(data) {
    if (typeof data === 'string') {
      return data.substring(0, 50);
    }
    
    if (typeof data === 'object') {
      if (data.command) return data.command.substring(0, 50);
      if (data.file) return `file: ${data.file}`;
      if (data.type) return data.type;
    }
    
    return 'activity';
  }

  parseTimelineAnalysis(result) {
    try {
      const jsonStr = result.raw || result.content || '';
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          sessionSummary: parsed.sessionSummary || 'Development session',
          productivity: parsed.productivity || 'medium',
          keyMilestones: parsed.keyMilestones || [],
          timeDistribution: parsed.timeDistribution || { coding: 0.5, other: 0.5 },
          recommendations: parsed.recommendations || [],
          nextSteps: parsed.nextSteps || []
        };
      }
      
      return this.fallbackAnalysis();
    } catch (error) {
      this.logger.warn('Failed to parse timeline analysis:', error);
      return this.fallbackAnalysis();
    }
  }

  fallbackAnalysis() {
    return {
      sessionSummary: 'Development session in progress',
      productivity: 'medium',
      keyMilestones: [],
      timeDistribution: { coding: 0.5, other: 0.5 },
      recommendations: [],
      nextSteps: []
    };
  }

  async generateSessionSummary(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const timeline = this.sessionTimelines.get(sessionId) || [];
    
    if (timeline.length === 0) {
      return {
        sessionId,
        summary: 'No activity recorded in this session',
        details: null
      };
    }

    try {
      const prompt = this.buildSessionSummaryPrompt(session, timeline);
      
      const result = await this.claudeBridge.executeCommand({
        command: prompt,
        sessionId
      });

      const summary = this.parseSessionSummary(result.result);
      
      return {
        sessionId,
        summary: summary.main,
        details: {
          accomplishments: summary.accomplishments,
          challenges: summary.challenges,
          insights: summary.insights,
          timeSpent: this.calculateTimeSpent(timeline),
          commandCount: timeline.filter(e => e.type === 'command').length,
          fileCount: new Set(timeline.filter(e => e.data?.file).map(e => e.data.file)).size
        }
      };
    } catch (error) {
      this.logger.error(`Failed to generate session summary for ${sessionId}:`, error);
      throw error;
    }
  }

  buildSessionSummaryPrompt(session, timeline) {
    const duration = Date.now() - new Date(session.startTime).getTime();
    const durationHours = (duration / (1000 * 60 * 60)).toFixed(1);
    
    const commandEvents = timeline.filter(e => e.type === 'command');
    const fileEvents = timeline.filter(e => e.type === 'file-change');
    
    const recentCommands = commandEvents.slice(-10).map(e => 
      `- ${e.data?.command || e.data}`
    ).join('\n');
    
    return `Generate a comprehensive summary of this development session:

SESSION DETAILS:
- Duration: ${durationHours} hours
- Total Events: ${timeline.length}
- Commands Executed: ${commandEvents.length}
- Files Modified: ${fileEvents.length}
- Project: ${session.projectPath}

RECENT COMMANDS:
${recentCommands}

Please provide a JSON response with:
{
  "main": "Comprehensive summary of what was accomplished",
  "accomplishments": ["accomplishment 1", "accomplishment 2"],
  "challenges": ["challenge 1", "challenge 2"],
  "insights": ["insight 1", "insight 2"]
}`;
  }

  parseSessionSummary(result) {
    try {
      const jsonStr = result.raw || result.content || '';
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          main: parsed.main || 'Development session completed',
          accomplishments: parsed.accomplishments || [],
          challenges: parsed.challenges || [],
          insights: parsed.insights || []
        };
      }
      
      return {
        main: 'Development session completed',
        accomplishments: [],
        challenges: [],
        insights: []
      };
    } catch (error) {
      this.logger.warn('Failed to parse session summary:', error);
      return {
        main: 'Development session completed',
        accomplishments: [],
        challenges: [],
        insights: []
      };
    }
  }

  calculateTimeSpent(timeline) {
    if (timeline.length === 0) return 0;
    
    const start = new Date(timeline[0].timestamp).getTime();
    const end = new Date(timeline[timeline.length - 1].timestamp).getTime();
    
    return end - start;
  }

  async saveSession(session) {
    try {
      const sessionFile = path.join(this.storageDir, `${session.id}.json`);
      await fs.writeFile(sessionFile, JSON.stringify(session, null, 2));
      
      // Update index
      await this.updateSessionIndex();
    } catch (error) {
      this.logger.error(`Failed to save session ${session.id}:`, error);
      throw error;
    }
  }

  async updateSessionIndex() {
    try {
      const index = Array.from(this.sessions.values()).map(session => ({
        id: session.id,
        projectPath: session.projectPath,
        startTime: session.startTime,
        lastUpdated: session.lastUpdated,
        eventCount: this.sessionTimelines.get(session.id)?.length || 0
      }));
      
      const indexFile = path.join(this.storageDir, 'index.json');
      await fs.writeFile(indexFile, JSON.stringify(index, null, 2));
    } catch (error) {
      this.logger.warn('Failed to update session index:', error);
    }
  }

  async listSessions(limit = 20) {
    const sessions = Array.from(this.sessions.values())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);
    
    return sessions.map(session => ({
      id: session.id,
      projectPath: session.projectPath,
      startTime: session.startTime,
      lastUpdated: session.lastUpdated,
      eventCount: this.sessionTimelines.get(session.id)?.length || 0
    }));
  }

  async deleteSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Remove from memory
    this.sessions.delete(sessionId);
    this.sessionTimelines.delete(sessionId);
    
    // Remove from disk
    try {
      const sessionFile = path.join(this.storageDir, `${sessionId}.json`);
      await fs.unlink(sessionFile);
      
      await this.updateSessionIndex();
      
      this.logger.info(`📚 Deleted session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to delete session ${sessionId}:`, error);
      throw error;
    }
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  }

  async cleanup() {
    this.logger.info('🧹 Cleaning up Session Manager...');
    
    // Save all sessions before cleanup
    for (const session of this.sessions.values()) {
      try {
        await this.saveSession(session);
      } catch (error) {
        this.logger.warn(`Failed to save session ${session.id} during cleanup:`, error);
      }
    }
    
    await this.updateSessionIndex();
    
    this.sessions.clear();
    this.sessionTimelines.clear();
    
    this.logger.info('✅ Session Manager cleanup complete');
  }
}

module.exports = { SessionManager };