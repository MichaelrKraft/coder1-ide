/**
 * Walk-Away Supervision Types
 * 
 * Simple, focused types for the walk-away supervision agent
 * that monitors Claude Code sessions and provides reports
 */

// ================================================================================
// Core Session Tracking Types
// ================================================================================

export interface WalkAwaySession {
  id: string;
  originalTask: string;
  startTime: Date;
  endTime?: Date;
  userPresent: boolean;
  status: 'active' | 'paused' | 'completed' | 'interrupted';
}

export interface SessionActivity {
  timestamp: Date;
  type: 'file-change' | 'terminal-command' | 'commit' | 'error' | 'test-run' | 'claude-action';
  description: string;
  details?: {
    filePath?: string;
    command?: string;
    errorMessage?: string;
    linesChanged?: number;
    success?: boolean;
  };
}

export interface WorkProgress {
  completed: WorkItem[];
  inProgress: WorkItem[];
  notStarted: WorkItem[];
  blocked: WorkItem[];
}

export interface WorkItem {
  description: string;
  estimatedProgress: number; // 0-100
  lastActivity: Date;
  files: string[];
  relatedCommands: string[];
}

// ================================================================================
// Critical Issue Detection
// ================================================================================

export interface CriticalIssue {
  id: string;
  timestamp: Date;
  severity: 'high' | 'medium' | 'low';
  category: 'security' | 'stuck' | 'deviation' | 'system-error';
  title: string;
  description: string;
  location?: string;
  suggestedAction: string;
  requiresEscalation: boolean;
}

export interface SecurityPattern {
  pattern: RegExp;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface StuckDetection {
  repeatingErrorCount: number;
  lastError: string;
  timeSinceProgress: number; // minutes
  stuckThreshold: number; // minutes
}

// ================================================================================
// Walk-Away Report Structure
// ================================================================================

export interface WalkAwayReport {
  session: WalkAwaySession;
  summary: {
    duration: string;
    totalActivities: number;
    filesModified: number;
    commandsRun: number;
    commitsCreated: number;
    errorsEncountered: number;
  };
  progress: WorkProgress;
  activities: SessionActivity[];
  issues: {
    critical: CriticalIssue[];
    warnings: string[];
    notes: string[];
  };
  recommendations: {
    nextSteps: string[];
    completionTasks: string[];
    qualityImprovements: string[];
  };
  codeQuality: {
    testCoverage?: number;
    lintingIssues?: number;
    securityWarnings?: number;
    techDebtItems?: string[];
  };
}

// ================================================================================
// Notification System
// ================================================================================

export interface SupervisionAlert {
  id: string;
  timestamp: Date;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actions?: AlertAction[];
  dismissed: boolean;
}

export interface AlertAction {
  label: string;
  action: 'approve' | 'reject' | 'pause' | 'review' | 'ignore';
  callback?: () => void;
}

// ================================================================================
// Configuration Types (Simplified)
// ================================================================================

export interface WalkAwayConfig {
  taskDescription: string;
  escalationPreferences: {
    securityIssues: boolean;
    stuckTimeout: number; // minutes
    deviationThreshold: number; // 0-1 scale
    notificationMethod: 'email' | 'desktop' | 'both';
  };
  qualityGates: {
    requireTests: boolean;
    minCoverage?: number;
    blockOnSecurityIssues: boolean;
    blockOnLintingErrors: boolean;
  };
}

// ================================================================================
// Service Interface
// ================================================================================

export interface WalkAwaySupervisionService {
  // Session Management
  startWalkAwaySession(task: string, config?: WalkAwayConfig): Promise<string>;
  pauseSession(sessionId: string): Promise<void>;
  resumeSession(sessionId: string): Promise<void>;
  endSession(sessionId: string): Promise<WalkAwayReport>;
  
  // Real-time Monitoring
  recordActivity(sessionId: string, activity: Omit<SessionActivity, 'timestamp'>): void;
  checkForIssues(sessionId: string): Promise<CriticalIssue[]>;
  updateProgress(sessionId: string, progress: Partial<WorkProgress>): void;
  
  // Reporting
  generateReport(sessionId: string): Promise<WalkAwayReport>;
  getActiveSession(): WalkAwaySession | null;
  
  // Alerts
  sendCriticalAlert(issue: CriticalIssue): Promise<void>;
  dismissAlert(alertId: string): void;
}