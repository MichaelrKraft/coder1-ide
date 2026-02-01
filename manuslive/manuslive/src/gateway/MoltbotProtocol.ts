/**
 * MoltbotProtocol - WebSocket protocol handler for Coder1 IDE Dashboard integration
 *
 * Implements the Moltbot protocol expected by MoltbotBridge in Coder1 IDE.
 * This enables Johnny5 to be controlled and monitored through the Johnny5 Dashboard.
 */

import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

// Protocol version
const PROTOCOL_VERSION = 3;

// Message types
export type MessageType = 'req' | 'res' | 'evt';

export interface MoltbotRequest {
  type: 'req';
  id: string;
  method: string;
  params?: Record<string, any>;
}

export interface MoltbotResponse {
  type: 'res';
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MoltbotEvent {
  type: 'evt';
  event: string;
  payload: any;
}

export type MoltbotMessage = MoltbotRequest | MoltbotResponse | MoltbotEvent;

// Session types
export interface DashboardSession {
  id: string;
  channelId: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  tokenCount: number;
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Analytics types
export interface UsageStats {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  sessionCount: number;
  messageCount: number;
}

// Security types
export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: string;
  channel: string;
  userId: string;
  details?: string;
}

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  type: 'prompt_injection' | 'rate_limit' | 'unauthorized';
  severity: 'low' | 'medium' | 'high';
  message: string;
  blocked: boolean;
}

// Project types
export interface ProjectSummary {
  name: string;
  path: string;
  priority: 'high' | 'medium' | 'low';
  healthScore: number;
  lastActivity: Date;
  branch: string;
  pendingTasks: number;
  alerts: string[];
}

// Trend types
export interface TrendSummary {
  collectedAt: Date;
  keywordMatches: number;
  competitorMentions: number;
  topStories: Array<{
    title: string;
    url: string;
    source: string;
    score: number;
  }>;
}

export interface TrendAlert {
  type: 'spike' | 'emerging' | 'competitor';
  source: string;
  keyword: string;
  message: string;
  level: 'critical' | 'important' | 'fyi';
  timestamp: Date;
}

// Context types
export interface ContextState {
  memoryPath: string;
  userProfilePath: string;
  factsCount: number;
  lastUpdated: Date;
  activeSessions: number;
}

// Mission types
export interface MissionTask {
  id: string;
  title: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress?: number;
}

// Brief types
export interface MorningBrief {
  date: Date;
  summary: string;
  projectsNeedingAttention: string[];
  trendAlerts: TrendAlert[];
  tasksCompleted: number;
  tasksQueued: number;
}

export interface MoltbotProtocolConfig {
  authToken?: string;
  pingInterval?: number;
  onMessage?: (sessionId: string, message: string) => Promise<AsyncGenerator<string, void, unknown>>;
  onGetSessions?: () => Promise<DashboardSession[]>;
  onGetSessionMessages?: (sessionId: string, limit?: number) => Promise<SessionMessage[]>;
  onGetUsageStats?: () => Promise<UsageStats>;
  onGetAuditLog?: (limit?: number) => Promise<AuditEntry[]>;
  onGetSecurityAlerts?: () => Promise<SecurityAlert[]>;
  // New Phase 8 & 9 callbacks
  onGetProjects?: () => Promise<ProjectSummary[]>;
  onGetProjectDetail?: (projectName: string) => Promise<ProjectSummary | null>;
  onGetProjectAlerts?: () => Promise<Array<{ project: string; alert: string; level: string }>>;
  onGetTrendSummary?: () => Promise<TrendSummary | null>;
  onGetTrendAlerts?: () => Promise<TrendAlert[]>;
  onGetContext?: () => Promise<ContextState>;
  onGetMissionTasks?: () => Promise<MissionTask[]>;
  onCreateMissionTask?: (title: string, priority: string) => Promise<MissionTask>;
  onGetMorningBrief?: () => Promise<MorningBrief | null>;
}

/**
 * Handles a single dashboard WebSocket connection using Moltbot protocol
 */
export class MoltbotProtocolHandler extends EventEmitter {
  private ws: WebSocket;
  private config: MoltbotProtocolConfig;
  private authenticated: boolean = false;
  private connectionId: string;
  private pingTimer: NodeJS.Timeout | null = null;

  constructor(ws: WebSocket, connectionId: string, config: MoltbotProtocolConfig) {
    super();
    this.ws = ws;
    this.connectionId = connectionId;
    this.config = config;

    this.setupHandlers();
    this.sendChallenge();
  }

  private setupHandlers(): void {
    this.ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as MoltbotMessage;
        this.handleMessage(message);
      } catch (error) {
        console.error('[MoltbotProtocol] Failed to parse message:', error);
        this.sendError('0', -32700, 'Parse error');
      }
    });

    this.ws.on('close', () => {
      this.cleanup();
      this.emit('disconnected', this.connectionId);
    });

    this.ws.on('error', (error) => {
      console.error(`[MoltbotProtocol] Connection error (${this.connectionId}):`, error);
    });
  }

  private sendChallenge(): void {
    // Send connect.challenge event
    const nonce = this.generateNonce();
    this.sendEvent('connect.challenge', {
      nonce,
      ts: Date.now(),
    });
  }

  private handleMessage(message: MoltbotMessage): void {
    if (message.type === 'req') {
      this.handleRequest(message);
    } else if (message.type === 'evt') {
      this.handleEvent(message);
    }
  }

  private async handleRequest(req: MoltbotRequest): Promise<void> {
    const { id, method, params } = req;

    try {
      switch (method) {
        case 'connect':
          await this.handleConnect(id, params);
          break;
        case 'ping':
          this.handlePing(id);
          break;
        case 'chat.send':
          await this.handleChatSend(id, params);
          break;
        case 'chat.history':
          await this.handleChatHistory(id, params);
          break;
        case 'sessions.list':
          await this.handleSessionsList(id, params);
          break;
        case 'sessions.preview':
          await this.handleSessionsPreview(id, params);
          break;
        case 'analytics.usage':
          await this.handleAnalyticsUsage(id);
          break;
        case 'security.audit':
          await this.handleSecurityAudit(id, params);
          break;
        case 'security.alerts':
          await this.handleSecurityAlerts(id);
          break;
        case 'reasoning.steps':
          await this.handleReasoningSteps(id, params);
          break;
        // Phase 8: Project Tracking
        case 'projects.list':
          await this.handleProjectsList(id);
          break;
        case 'projects.detail':
          await this.handleProjectsDetail(id, params);
          break;
        case 'projects.alerts':
          await this.handleProjectsAlerts(id);
          break;
        // Phase 9: Trend Monitoring
        case 'trends.summary':
          await this.handleTrendsSummary(id);
          break;
        case 'trends.alerts':
          await this.handleTrendsAlerts(id);
          break;
        // Context, Mission, Brief
        case 'context.state':
          await this.handleContextState(id);
          break;
        case 'mission.list':
          await this.handleMissionList(id);
          break;
        case 'mission.create':
          await this.handleMissionCreate(id, params);
          break;
        case 'brief.today':
          await this.handleBriefToday(id);
          break;
        default:
          this.sendError(id, -32601, `Method not found: ${method}`);
      }
    } catch (error) {
      console.error(`[MoltbotProtocol] Error handling ${method}:`, error);
      this.sendError(id, -32603, 'Internal error', {
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private handleEvent(evt: MoltbotEvent): void {
    // Handle client-side events (currently none expected)
    console.log(`[MoltbotProtocol] Received event: ${evt.event}`);
  }

  private async handleConnect(id: string, params?: Record<string, any>): Promise<void> {
    const { auth, minProtocol, maxProtocol: _maxProtocol } = params || {};

    // Check protocol version
    if (minProtocol && minProtocol > PROTOCOL_VERSION) {
      this.sendError(id, 1001, 'Protocol version not supported');
      return;
    }

    // Validate auth token if configured
    if (this.config.authToken) {
      const token = auth?.token;
      if (!token || token !== this.config.authToken) {
        this.sendError(id, 1002, 'Authentication failed');
        this.ws.close(4001, 'Unauthorized');
        return;
      }
    }

    this.authenticated = true;

    // Send success response
    this.sendResponse(id, {
      protocol: PROTOCOL_VERSION,
      sessionId: this.connectionId,
      capabilities: ['chat', 'sessions', 'analytics', 'security', 'reasoning', 'projects', 'trends', 'context', 'mission', 'brief'],
    });

    // Send connect.success event
    this.sendEvent('connect.success', {
      connectionId: this.connectionId,
      timestamp: new Date().toISOString(),
    });

    // Start ping interval
    this.startPingInterval();

    console.log(`[MoltbotProtocol] Dashboard connected: ${this.connectionId}`);
  }

  private handlePing(id: string): void {
    this.sendResponse(id, { pong: true, ts: Date.now() });
  }

  private async handleChatSend(id: string, params?: Record<string, any>): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    const { sessionKey, message, idempotencyKey: _idempotencyKey } = params || {};

    if (!message) {
      this.sendError(id, -32602, 'Invalid params: message required');
      return;
    }

    // Generate run ID for this chat
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Acknowledge the request with runId
    this.sendResponse(id, { runId });

    // Send chat.running event
    // Use a persistent session ID so history is preserved across reconnections
    const persistentSessionId = sessionKey || 'dashboard:main';
    this.sendEvent('chat.running', {
      runId,
      sessionKey: persistentSessionId,
    });

    // Process message through agent
    if (this.config.onMessage) {
      try {
        const sessionId = persistentSessionId;
        const responseGenerator = await this.config.onMessage(sessionId, message);

        let fullContent = '';
        let chunkIndex = 0;

        // Stream response chunks
        for await (const chunk of responseGenerator) {
          fullContent += chunk;

          // Send agent.delta event for each chunk
          this.sendEvent('agent', {
            runId,
            type: 'delta',
            delta: {
              type: 'text',
              text: chunk,
            },
            index: chunkIndex++,
          });
        }

        // Send agent.done event
        this.sendEvent('agent', {
          runId,
          type: 'done',
          content: fullContent,
        });

        // Send chat.done event
        this.sendEvent('chat.done', {
          runId,
          sessionKey,
          finalState: 'completed',
        });

      } catch (error) {
        console.error('[MoltbotProtocol] Chat error:', error);

        // Send error event
        this.sendEvent('chat.error', {
          runId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      // No handler configured - send mock response
      this.sendEvent('agent', {
        runId,
        type: 'delta',
        delta: { type: 'text', text: 'Johnny5 is connected but no message handler is configured.' },
        index: 0,
      });

      this.sendEvent('agent', {
        runId,
        type: 'done',
        content: 'Johnny5 is connected but no message handler is configured.',
      });

      this.sendEvent('chat.done', {
        runId,
        sessionKey,
        finalState: 'completed',
      });
    }
  }

  private async handleChatHistory(id: string, params?: Record<string, any>): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    const { sessionKey, limit = 50 } = params || {};

    if (this.config.onGetSessionMessages && sessionKey) {
      const messages = await this.config.onGetSessionMessages(sessionKey, limit);
      this.sendResponse(id, { messages });
    } else {
      this.sendResponse(id, { messages: [] });
    }
  }

  private async handleSessionsList(id: string, _params?: Record<string, any>): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    if (this.config.onGetSessions) {
      const sessions = await this.config.onGetSessions();
      this.sendResponse(id, {
        sessions: sessions.map(s => ({
          id: s.id,
          channelId: s.channelId,
          userId: s.userId,
          createdAt: s.createdAt.toISOString(),
          lastActivity: s.lastActivity.toISOString(),
          messageCount: s.messageCount,
          tokenCount: s.tokenCount,
        }))
      });
    } else {
      this.sendResponse(id, { sessions: [] });
    }
  }

  private async handleSessionsPreview(id: string, params?: Record<string, any>): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    const { sessionId, limit = 20 } = params || {};

    if (!sessionId) {
      this.sendError(id, -32602, 'Invalid params: sessionId required');
      return;
    }

    if (this.config.onGetSessionMessages) {
      const messages = await this.config.onGetSessionMessages(sessionId, limit);
      this.sendResponse(id, {
        sessionId,
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        }))
      });
    } else {
      this.sendResponse(id, { sessionId, messages: [] });
    }
  }

  private async handleAnalyticsUsage(id: string): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    if (this.config.onGetUsageStats) {
      const stats = await this.config.onGetUsageStats();
      this.sendResponse(id, stats);
    } else {
      this.sendResponse(id, {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        sessionCount: 0,
        messageCount: 0,
      });
    }
  }

  private async handleSecurityAudit(id: string, params?: Record<string, any>): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    const { limit = 100 } = params || {};

    if (this.config.onGetAuditLog) {
      const entries = await this.config.onGetAuditLog(limit);
      this.sendResponse(id, {
        entries: entries.map(e => ({
          id: e.id,
          timestamp: e.timestamp.toISOString(),
          action: e.action,
          channel: e.channel,
          userId: e.userId,
          details: e.details,
        }))
      });
    } else {
      this.sendResponse(id, { entries: [] });
    }
  }

  private async handleSecurityAlerts(id: string): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    if (this.config.onGetSecurityAlerts) {
      const alerts = await this.config.onGetSecurityAlerts();
      this.sendResponse(id, {
        alerts: alerts.map(a => ({
          id: a.id,
          timestamp: a.timestamp.toISOString(),
          type: a.type,
          severity: a.severity,
          message: a.message,
          blocked: a.blocked,
        }))
      });
    } else {
      this.sendResponse(id, { alerts: [] });
    }
  }

  private async handleReasoningSteps(id: string, params?: Record<string, any>): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    const { sessionId, runId } = params || {};

    // Reasoning steps would come from extended thinking if available
    // For now, return empty - will be enhanced in Phase 4
    this.sendResponse(id, {
      sessionId,
      runId,
      steps: []
    });
  }

  // ============ Phase 8: Project Tracking ============

  private async handleProjectsList(id: string): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    if (this.config.onGetProjects) {
      const projects = await this.config.onGetProjects();
      this.sendResponse(id, {
        projects: projects.map(p => ({
          name: p.name,
          path: p.path,
          priority: p.priority,
          healthScore: p.healthScore,
          lastActivity: p.lastActivity.toISOString(),
          branch: p.branch,
          pendingTasks: p.pendingTasks,
          alerts: p.alerts,
        }))
      });
    } else {
      this.sendResponse(id, { projects: [] });
    }
  }

  private async handleProjectsDetail(id: string, params?: Record<string, any>): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    const { projectName } = params || {};
    if (!projectName) {
      this.sendError(id, -32602, 'Invalid params: projectName required');
      return;
    }

    if (this.config.onGetProjectDetail) {
      const project = await this.config.onGetProjectDetail(projectName);
      if (project) {
        this.sendResponse(id, {
          project: {
            name: project.name,
            path: project.path,
            priority: project.priority,
            healthScore: project.healthScore,
            lastActivity: project.lastActivity.toISOString(),
            branch: project.branch,
            pendingTasks: project.pendingTasks,
            alerts: project.alerts,
          }
        });
      } else {
        this.sendError(id, 404, 'Project not found');
      }
    } else {
      this.sendError(id, -32603, 'Project detail not available');
    }
  }

  private async handleProjectsAlerts(id: string): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    if (this.config.onGetProjectAlerts) {
      const alerts = await this.config.onGetProjectAlerts();
      this.sendResponse(id, { alerts });
    } else {
      this.sendResponse(id, { alerts: [] });
    }
  }

  // ============ Phase 9: Trend Monitoring ============

  private async handleTrendsSummary(id: string): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    if (this.config.onGetTrendSummary) {
      const summary = await this.config.onGetTrendSummary();
      if (summary) {
        this.sendResponse(id, {
          collectedAt: summary.collectedAt.toISOString(),
          keywordMatches: summary.keywordMatches,
          competitorMentions: summary.competitorMentions,
          topStories: summary.topStories,
        });
      } else {
        this.sendResponse(id, { message: 'No trend data collected yet' });
      }
    } else {
      this.sendResponse(id, { message: 'Trend monitoring not configured' });
    }
  }

  private async handleTrendsAlerts(id: string): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    if (this.config.onGetTrendAlerts) {
      const alerts = await this.config.onGetTrendAlerts();
      this.sendResponse(id, {
        alerts: alerts.map(a => ({
          type: a.type,
          source: a.source,
          keyword: a.keyword,
          message: a.message,
          level: a.level,
          timestamp: a.timestamp.toISOString(),
        }))
      });
    } else {
      this.sendResponse(id, { alerts: [] });
    }
  }

  // ============ Context, Mission, Brief ============

  private async handleContextState(id: string): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    if (this.config.onGetContext) {
      const context = await this.config.onGetContext();
      this.sendResponse(id, {
        memoryPath: context.memoryPath,
        userProfilePath: context.userProfilePath,
        factsCount: context.factsCount,
        lastUpdated: context.lastUpdated.toISOString(),
        activeSessions: context.activeSessions,
      });
    } else {
      this.sendResponse(id, {
        memoryPath: '~/.manuslive/workspace/MEMORY.md',
        userProfilePath: '~/.manuslive/workspace/USER.md',
        factsCount: 0,
        lastUpdated: new Date().toISOString(),
        activeSessions: 0,
      });
    }
  }

  private async handleMissionList(id: string): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    if (this.config.onGetMissionTasks) {
      const tasks = await this.config.onGetMissionTasks();
      this.sendResponse(id, {
        tasks: tasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          createdAt: t.createdAt.toISOString(),
          startedAt: t.startedAt?.toISOString(),
          completedAt: t.completedAt?.toISOString(),
          progress: t.progress,
        }))
      });
    } else {
      this.sendResponse(id, { tasks: [] });
    }
  }

  private async handleMissionCreate(id: string, params?: Record<string, any>): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    const { title, priority = 'medium' } = params || {};
    if (!title) {
      this.sendError(id, -32602, 'Invalid params: title required');
      return;
    }

    if (this.config.onCreateMissionTask) {
      const task = await this.config.onCreateMissionTask(title, priority);
      this.sendResponse(id, {
        task: {
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          createdAt: task.createdAt.toISOString(),
        }
      });
    } else {
      this.sendError(id, -32603, 'Mission task creation not available');
    }
  }

  private async handleBriefToday(id: string): Promise<void> {
    if (!this.authenticated) {
      this.sendError(id, 1003, 'Not authenticated');
      return;
    }

    if (this.config.onGetMorningBrief) {
      const brief = await this.config.onGetMorningBrief();
      if (brief) {
        this.sendResponse(id, {
          date: brief.date.toISOString(),
          summary: brief.summary,
          projectsNeedingAttention: brief.projectsNeedingAttention,
          trendAlerts: brief.trendAlerts.map(a => ({
            type: a.type,
            source: a.source,
            keyword: a.keyword,
            message: a.message,
            level: a.level,
            timestamp: a.timestamp.toISOString(),
          })),
          tasksCompleted: brief.tasksCompleted,
          tasksQueued: brief.tasksQueued,
        });
      } else {
        this.sendResponse(id, { message: 'No brief available for today' });
      }
    } else {
      this.sendResponse(id, { message: 'Morning brief not configured' });
    }
  }

  // Message sending helpers

  private sendResponse(id: string, result: any): void {
    const response: MoltbotResponse = { type: 'res', id, result };
    this.send(response);
  }

  private sendError(id: string, code: number, message: string, data?: any): void {
    const response: MoltbotResponse = {
      type: 'res',
      id,
      error: { code, message, data }
    };
    this.send(response);
  }

  private sendEvent(event: string, payload: any): void {
    const evt: MoltbotEvent = { type: 'evt', event, payload };
    this.send(evt);
  }

  private send(message: MoltbotMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Utility methods

  private generateNonce(): string {
    return Math.random().toString(36).substr(2, 16);
  }

  private startPingInterval(): void {
    const interval = this.config.pingInterval || 30000;
    this.pingTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.sendEvent('ping', { ts: Date.now() });
      }
    }, interval);
  }

  private cleanup(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // Public methods for external use

  /**
   * Send a message event to the dashboard (for Telegram messages mirroring)
   */
  public notifyMessage(sessionId: string, message: SessionMessage): void {
    this.sendEvent('message.new', {
      sessionId,
      message: {
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
      },
    });
  }

  /**
   * Send a security alert to the dashboard
   */
  public notifySecurityAlert(alert: SecurityAlert): void {
    this.sendEvent('security.alert', {
      id: alert.id,
      timestamp: alert.timestamp.toISOString(),
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      blocked: alert.blocked,
    });
  }

  /**
   * Notify dashboard of session activity
   */
  public notifySessionActivity(sessionId: string, activity: string): void {
    this.sendEvent('session.activity', {
      sessionId,
      activity,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if this connection is authenticated and ready
   */
  public isReady(): boolean {
    return this.authenticated && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get the connection ID
   */
  public getConnectionId(): string {
    return this.connectionId;
  }
}
