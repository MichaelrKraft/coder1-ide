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
  notificationChannels: ('email' | 'sms' | 'push' | 'slack')[];
}

export interface EscalationRule {
  condition: string;
  action: 'notify' | 'pause' | 'escalate';
  threshold: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SleepModeStatus {
  isActive: boolean;
  startTime?: Date;
  endTime?: Date;
  changesApproved: number;
  changesRejected: number;
  escalationsTriggered: number;
  lastActivity?: Date;
}

export interface NightSupervisorConfig {
  workspaceId: string;
  persona: string;
  autonomyLevel: 'conservative' | 'balanced' | 'aggressive';
  approvalThresholds: {
    codeQuality: number;
    securityRisk: number;
    performanceImpact: number;
    testCoverage: number;
  };
  monitoringInterval: number;
  maxConsecutiveApprovals: number;
  requiresBreakAfterRejections: number;
}
