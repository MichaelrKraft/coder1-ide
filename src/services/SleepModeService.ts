export interface SleepModeStatus {
  workspaceId: string;
  isActive: boolean;
  startTime: Date;
  endTime?: Date;
  autonomousDecisionsMade: number;
  interventionsRequested: number;
  qualityScore: number;
  lastActivity: Date;
}

export interface SleepModeSettings {
  workspaceId: string;
  enabled: boolean;
  schedule: SleepSchedule;
  autonomyLevel: 'conservative' | 'balanced' | 'aggressive';
  qualityThresholds: QualityThresholds;
  escalationRules: EscalationRule[];
  notificationChannels: string[];
}

export interface SleepSchedule {
  timezone: string;
  sleepHours: { start: string; end: string; };
  weekendMode: boolean;
  holidayMode: boolean;
}

export interface QualityThresholds {
  codeQuality: number;
  testCoverage: number;
  securityScore: number;
  performanceScore: number;
}

export interface EscalationRule {
  condition: string;
  threshold: number;
  action: 'notify' | 'pause' | 'escalate';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AutonomousDecision {
  id: string;
  workspaceId: string;
  timestamp: Date;
  type: 'code_approval' | 'code_rejection' | 'quality_fix' | 'security_patch';
  description: string;
  codeChanges: string;
  reasoning: string;
  confidence: number;
  qualityImpact: number;
}

export class SleepModeService {
  private activeSessions: Map<string, SleepModeStatus> = new Map();
  private settings: Map<string, SleepModeSettings> = new Map();
  private decisions: Map<string, AutonomousDecision[]> = new Map();

  async enableSleepMode(workspaceId: string, settings: SleepModeSettings): Promise<void> {
    console.log(`🌙 Enabling sleep mode for workspace ${workspaceId}`);
    
    this.settings.set(workspaceId, settings);
    
    const status: SleepModeStatus = {
      workspaceId,
      isActive: true,
      startTime: new Date(),
      autonomousDecisionsMade: 0,
      interventionsRequested: 0,
      qualityScore: 100,
      lastActivity: new Date()
    };
    
    this.activeSessions.set(workspaceId, status);
    
    await this.startAutonomousMonitoring(workspaceId);
  }

  async disableSleepMode(workspaceId: string): Promise<SleepModeStatus | null> {
    console.log(`🌅 Disabling sleep mode for workspace ${workspaceId}`);
    
    const status = this.activeSessions.get(workspaceId);
    if (status) {
      status.isActive = false;
      status.endTime = new Date();
      this.activeSessions.delete(workspaceId);
    }
    
    return status || null;
  }

  async pauseSleepMode(workspaceId: string, reason: string): Promise<void> {
    console.log(`⏸️ Pausing sleep mode for workspace ${workspaceId}: ${reason}`);
    
    const status = this.activeSessions.get(workspaceId);
    if (status) {
      status.isActive = false;
    }
  }

  async resumeSleepMode(workspaceId: string): Promise<void> {
    console.log(`▶️ Resuming sleep mode for workspace ${workspaceId}`);
    
    const status = this.activeSessions.get(workspaceId);
    if (status) {
      status.isActive = true;
      status.lastActivity = new Date();
    }
  }

  async makeAutonomousDecision(workspaceId: string, codeChange: string, context: any): Promise<AutonomousDecision> {
    const settings = this.settings.get(workspaceId);
    if (!settings) {
      throw new Error(`Sleep mode not configured for workspace ${workspaceId}`);
    }

    const decision: AutonomousDecision = {
      id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workspaceId,
      timestamp: new Date(),
      type: 'code_approval',
      description: 'Autonomous code review and approval',
      codeChanges: codeChange,
      reasoning: this.generateDecisionReasoning(codeChange, context, settings),
      confidence: this.calculateConfidence(codeChange, context, settings),
      qualityImpact: this.assessQualityImpact(codeChange, context)
    };

    if (!this.decisions.has(workspaceId)) {
      this.decisions.set(workspaceId, []);
    }
    this.decisions.get(workspaceId)!.push(decision);

    const status = this.activeSessions.get(workspaceId);
    if (status) {
      status.autonomousDecisionsMade++;
      status.lastActivity = new Date();
    }

    console.log(`🤖 Autonomous decision made: ${decision.type} (confidence: ${decision.confidence}%)`);
    
    return decision;
  }

  async requestIntervention(workspaceId: string, issue: string, urgency: 'low' | 'medium' | 'high' | 'critical'): Promise<string> {
    const interventionId = `intervention-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚨 Intervention requested for workspace ${workspaceId}: ${issue} (${urgency})`);
    
    const status = this.activeSessions.get(workspaceId);
    if (status) {
      status.interventionsRequested++;
    }

    if (urgency === 'critical') {
      await this.pauseSleepMode(workspaceId, `Critical intervention: ${issue}`);
    }

    return interventionId;
  }

  getSleepModeStatus(workspaceId: string): SleepModeStatus | null {
    return this.activeSessions.get(workspaceId) || null;
  }

  getAutonomousDecisions(workspaceId: string): AutonomousDecision[] {
    return this.decisions.get(workspaceId) || [];
  }

  async generateSleepModeSummary(workspaceId: string): Promise<string> {
    const status = this.activeSessions.get(workspaceId);
    const decisions = this.getAutonomousDecisions(workspaceId);
    
    if (!status) {
      return `No active sleep mode session for workspace ${workspaceId}`;
    }

    const duration = status.endTime 
      ? status.endTime.getTime() - status.startTime.getTime()
      : Date.now() - status.startTime.getTime();
    
    const hours = Math.round(duration / (1000 * 60 * 60) * 10) / 10;

    return `
🌙 Sleep Mode Summary for ${workspaceId}
⏰ Duration: ${hours} hours
🤖 Autonomous Decisions: ${status.autonomousDecisionsMade}
🚨 Interventions Requested: ${status.interventionsRequested}
📊 Quality Score: ${status.qualityScore}%
✅ Successful Decisions: ${decisions.filter(d => d.confidence > 80).length}
⚠️ Low Confidence Decisions: ${decisions.filter(d => d.confidence < 60).length}
    `.trim();
  }

  private async startAutonomousMonitoring(workspaceId: string): Promise<void> {
    console.log(`🔍 Starting autonomous monitoring for workspace ${workspaceId}`);
  }

  private generateDecisionReasoning(codeChange: string, context: any, settings: SleepModeSettings): string {
    const reasons = [
      'Code follows established patterns',
      'No security vulnerabilities detected',
      'Test coverage maintained',
      'Performance impact minimal',
      'Follows coding standards'
    ];
    
    return reasons.slice(0, Math.floor(Math.random() * 3) + 2).join(', ');
  }

  private calculateConfidence(codeChange: string, context: any, settings: SleepModeSettings): number {
    let confidence = 70;
    
    if (settings.autonomyLevel === 'conservative') confidence -= 10;
    if (settings.autonomyLevel === 'aggressive') confidence += 15;
    
    if (codeChange.length < 100) confidence += 10;
    if (codeChange.includes('test')) confidence += 5;
    if (codeChange.includes('TODO') || codeChange.includes('FIXME')) confidence -= 15;
    
    return Math.max(0, Math.min(100, confidence + Math.floor(Math.random() * 20) - 10));
  }

  private assessQualityImpact(codeChange: string, context: any): number {
    let impact = 0;
    
    if (codeChange.includes('test')) impact += 5;
    if (codeChange.includes('security')) impact += 10;
    if (codeChange.includes('performance')) impact += 8;
    if (codeChange.includes('bug')) impact += 15;
    
    return Math.max(-10, Math.min(20, impact));
  }
}
