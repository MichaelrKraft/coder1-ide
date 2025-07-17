import { ClaudeAgentSupervisor } from './SupervisionEngine';
import { ClaudePersona } from '../types/supervision';
import { FileMonitoringService } from './FileMonitoringService';
import { NotificationService } from './NotificationService';
import { GitService } from './GitService';

export interface SleepModeConfig {
  autonomyLevel: 'conservative' | 'balanced' | 'aggressive';
  thresholds: {
    codeQuality: number;
    securityRisk: number;
    performanceImpact: number;
    testCoverage: number;
  };
  escalationRules: EscalationRule[];
  maxChangesPerHour: number;
  autoCommit: boolean;
  requiresHumanReview: boolean;
  notificationChannels: ('email' | 'sms' | 'push')[];
}

export interface EscalationRule {
  condition: string;
  action: 'notify' | 'pause' | 'escalate';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SleepModeStatus {
  isActive: boolean;
  startTime: Date;
  workspacesMonitored: string[];
  changesApproved: number;
  changesRejected: number;
  interventionsRequired: number;
  lastActivity: Date;
}

export class SleepModeManager {
  private monitoringService: FileMonitoringService;
  private notificationService: NotificationService;
  private gitService: GitService;
  private activeSleepSessions: Map<string, SleepSession> = new Map();

  constructor() {
    this.monitoringService = new FileMonitoringService();
    this.notificationService = new NotificationService();
    this.gitService = new GitService();
  }

  async enableSleepMode(workspaceId: string, userPreferences: SleepModeConfig): Promise<void> {
    const supervisor = await this.createNightSupervisor(workspaceId, {
      autonomyLevel: userPreferences.autonomyLevel,
      approvalThresholds: userPreferences.thresholds,
      escalationRules: userPreferences.escalationRules,
      maxChangesPerHour: userPreferences.maxChangesPerHour
    });

    const sleepSession: SleepSession = {
      id: this.generateSessionId(),
      workspaceId,
      supervisor,
      config: userPreferences,
      startTime: new Date(),
      status: 'active',
      metrics: {
        changesApproved: 0,
        changesRejected: 0,
        interventionsRequired: 0,
        qualityScore: 100
      }
    };

    this.activeSleepSessions.set(workspaceId, sleepSession);

    await this.monitoringService.startMonitoring({
      workspaceId,
      supervisor,
      enableRealTimeMonitoring: true,
      monitoringInterval: 30000,
      autoApprovalEnabled: true
    });

    if (userPreferences.autoCommit) {
      await this.gitService.enableAutoCommit(workspaceId, {
        branchStrategy: 'feature-branches',
        commitMessage: 'Auto-approved by Claude Agent Supervisor',
        requiresReview: userPreferences.requiresHumanReview
      });
    }

    await this.notificationService.send({
      type: 'sleep_mode_active',
      message: `Claude Agent Supervisor is now monitoring ${workspaceId}. Sleep well! 😴`,
      channels: userPreferences.notificationChannels,
      priority: 'low'
    });

    this.startSleepModeMonitoring(workspaceId);
  }

  async disableSleepMode(workspaceId: string): Promise<SleepModeStatus> {
    const session = this.activeSleepSessions.get(workspaceId);
    if (!session) {
      throw new Error(`No active sleep session found for workspace ${workspaceId}`);
    }

    await this.monitoringService.stopMonitoring(workspaceId);
    await this.gitService.disableAutoCommit(workspaceId);

    const status: SleepModeStatus = {
      isActive: false,
      startTime: session.startTime,
      workspacesMonitored: [workspaceId],
      changesApproved: session.metrics.changesApproved,
      changesRejected: session.metrics.changesRejected,
      interventionsRequired: session.metrics.interventionsRequired,
      lastActivity: new Date()
    };

    await this.notificationService.send({
      type: 'sleep_summary',
      message: this.generateSleepSummary(session),
      channels: session.config.notificationChannels,
      priority: 'low'
    });

    this.activeSleepSessions.delete(workspaceId);
    return status;
  }

  async createNightSupervisor(workspaceId: string, config: SupervisorConfig): Promise<ClaudeAgentSupervisor> {
    return {
      id: this.generateSupervisorId(),
      workspaceId,
      status: 'monitoring',
      persona: this.selectOptimalPersona(config.autonomyLevel),
      autonomyLevel: config.autonomyLevel,
      approvalThresholds: config.approvalThresholds,
      monitoringRules: this.generateMonitoringRules(config),
      interventionHistory: []
    };
  }

  async handleAutonomousDecisions(decisions: DecisionResult[]): Promise<void> {
    for (const decision of decisions) {
      const session = this.activeSleepSessions.get(decision.workspaceId);
      if (!session) continue;

      await this.processDecision(decision, session);
      this.updateSessionMetrics(session, decision);

      if (this.shouldEscalate(decision, session)) {
        await this.escalateDecision(decision, session);
      }
    }
  }

  getSleepModeStatus(workspaceId: string): SleepModeStatus | null {
    const session = this.activeSleepSessions.get(workspaceId);
    if (!session) return null;

    return {
      isActive: true,
      startTime: session.startTime,
      workspacesMonitored: [workspaceId],
      changesApproved: session.metrics.changesApproved,
      changesRejected: session.metrics.changesRejected,
      interventionsRequired: session.metrics.interventionsRequired,
      lastActivity: new Date()
    };
  }

  getAllActiveSessions(): SleepModeStatus[] {
    return Array.from(this.activeSleepSessions.values()).map(session => ({
      isActive: true,
      startTime: session.startTime,
      workspacesMonitored: [session.workspaceId],
      changesApproved: session.metrics.changesApproved,
      changesRejected: session.metrics.changesRejected,
      interventionsRequired: session.metrics.interventionsRequired,
      lastActivity: new Date()
    }));
  }

  private async processDecision(decision: DecisionResult, session: SleepSession): Promise<void> {
    switch (decision.action) {
      case 'approve':
        await this.handleAutoApproval(decision, session);
        break;
      case 'reject':
        await this.handleAutoRejection(decision, session);
        break;
      case 'escalate':
        await this.handleEscalation(decision, session);
        break;
    }
  }

  private async handleAutoApproval(decision: DecisionResult, session: SleepSession): Promise<void> {
    session.metrics.changesApproved++;

    if (session.config.autoCommit) {
      await this.gitService.autoCommit(session.workspaceId, {
        message: `Auto-approved: ${decision.reason}`,
        files: [decision.filePath]
      });
    }

    await this.notificationService.send({
      type: 'auto_approved',
      message: `✅ Auto-approved change in ${decision.filePath}`,
      channels: ['push'],
      priority: 'low'
    });
  }

  private async handleAutoRejection(decision: DecisionResult, session: SleepSession): Promise<void> {
    session.metrics.changesRejected++;

    await this.notificationService.send({
      type: 'auto_rejected',
      message: `❌ Auto-rejected change: ${decision.reason}`,
      channels: session.config.notificationChannels,
      priority: 'medium'
    });
  }

  private async handleEscalation(decision: DecisionResult, session: SleepSession): Promise<void> {
    session.metrics.interventionsRequired++;

    await this.notificationService.send({
      type: 'intervention_required',
      message: `⚠️ Manual review needed: ${decision.reason}`,
      channels: session.config.notificationChannels,
      priority: 'high',
      requiresAction: true,
      actionButtons: [
        { id: 'approve', title: 'Approve' },
        { id: 'reject', title: 'Reject' },
        { id: 'review', title: 'Review Later' }
      ]
    });
  }

  private updateSessionMetrics(session: SleepSession, decision: DecisionResult): void {
    session.metrics.qualityScore = this.calculateQualityScore(session);
    
    if (session.metrics.changesApproved + session.metrics.changesRejected > session.config.maxChangesPerHour) {
      this.pauseSleepMode(session.workspaceId, 'Rate limit exceeded');
    }
  }

  private shouldEscalate(decision: DecisionResult, session: SleepSession): boolean {
    return session.config.escalationRules.some(rule => {
      return this.evaluateEscalationRule(rule, decision, session);
    });
  }

  private evaluateEscalationRule(rule: EscalationRule, decision: DecisionResult, session: SleepSession): boolean {
    switch (rule.condition) {
      case 'low_confidence':
        return decision.confidence < 70;
      case 'security_risk':
        return decision.concerns.some(concern => concern.includes('security'));
      case 'multiple_rejections':
        return session.metrics.changesRejected > 3;
      default:
        return false;
    }
  }

  private async escalateDecision(decision: DecisionResult, session: SleepSession): Promise<void> {
    await this.notificationService.send({
      type: 'escalation',
      message: `🚨 Escalation triggered: ${decision.reason}`,
      channels: session.config.notificationChannels,
      priority: 'critical'
    });
  }

  private async pauseSleepMode(workspaceId: string, reason: string): Promise<void> {
    const session = this.activeSleepSessions.get(workspaceId);
    if (session) {
      session.status = 'paused';
      await this.notificationService.send({
        type: 'sleep_mode_paused',
        message: `⏸️ Sleep mode paused: ${reason}`,
        channels: session.config.notificationChannels,
        priority: 'high'
      });
    }
  }

  private startSleepModeMonitoring(workspaceId: string): void {
    setInterval(() => {
      this.performSleepModeHealthCheck(workspaceId);
    }, 300000); // Every 5 minutes
  }

  private performSleepModeHealthCheck(workspaceId: string): void {
    const session = this.activeSleepSessions.get(workspaceId);
    if (!session) return;

    const hoursSinceStart = (Date.now() - session.startTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceStart > 8) { // 8 hour sleep session
      this.sendSleepSummary(session);
    }
  }

  private async sendSleepSummary(session: SleepSession): Promise<void> {
    const summary = this.generateSleepSummary(session);
    await this.notificationService.send({
      type: 'sleep_summary',
      message: summary,
      channels: session.config.notificationChannels,
      priority: 'low'
    });
  }

  private generateSleepSummary(session: SleepSession): string {
    const duration = Math.round((Date.now() - session.startTime.getTime()) / (1000 * 60 * 60));
    return `🌙 Sleep summary (${duration}h): ${session.metrics.changesApproved} approved, ${session.metrics.changesRejected} rejected, ${session.metrics.interventionsRequired} interventions. Quality score: ${session.metrics.qualityScore}%`;
  }

  private selectOptimalPersona(autonomyLevel: string): ClaudePersona {
    switch (autonomyLevel) {
      case 'conservative': return 'qa';
      case 'balanced': return 'analyzer';
      case 'aggressive': return 'architect';
      default: return 'analyzer';
    }
  }

  private generateMonitoringRules(config: SupervisorConfig): any[] {
    return [
      {
        id: 'quality_threshold',
        name: 'Code Quality Check',
        condition: `quality_score >= ${config.approvalThresholds.codeQuality}`,
        action: 'approve',
        priority: 1
      },
      {
        id: 'security_check',
        name: 'Security Validation',
        condition: `security_risk <= ${config.approvalThresholds.securityRisk}`,
        action: 'reject',
        priority: 0
      }
    ];
  }

  private calculateQualityScore(session: SleepSession): number {
    const total = session.metrics.changesApproved + session.metrics.changesRejected;
    if (total === 0) return 100;
    return Math.round((session.metrics.changesApproved / total) * 100);
  }

  private generateSessionId(): string {
    return `sleep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSupervisorId(): string {
    return `supervisor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface SleepSession {
  id: string;
  workspaceId: string;
  supervisor: ClaudeAgentSupervisor;
  config: SleepModeConfig;
  startTime: Date;
  status: 'active' | 'paused' | 'stopped';
  metrics: {
    changesApproved: number;
    changesRejected: number;
    interventionsRequired: number;
    qualityScore: number;
  };
}

interface SupervisorConfig {
  autonomyLevel: 'conservative' | 'balanced' | 'aggressive';
  approvalThresholds: any;
  escalationRules: EscalationRule[];
  maxChangesPerHour: number;
}

interface DecisionResult {
  action: string;
  confidence: number;
  reason: string;
  concerns: string[];
  workspaceId: string;
  filePath: string;
}
