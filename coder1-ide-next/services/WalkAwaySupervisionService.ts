/**
 * Walk-Away Supervision Service
 * 
 * Simple, focused supervision that watches Claude Code sessions silently
 * and provides clear reports when the user returns
 */

import { logger } from '../lib/logger';
import { 
  WalkAwaySession, 
  SessionActivity, 
  WorkProgress, 
  WorkItem, 
  CriticalIssue, 
  WalkAwayReport, 
  WalkAwayConfig,
  SupervisionAlert,
  SecurityPattern,
  StuckDetection,
  WalkAwaySupervisionService as IWalkAwaySupervisionService
} from '@/types/walk-away-supervision';

export class WalkAwaySupervisionService implements IWalkAwaySupervisionService {
  private static instance: WalkAwaySupervisionService;
  private currentSession: WalkAwaySession | null = null;
  private activities: SessionActivity[] = [];
  private issues: CriticalIssue[] = [];
  private alerts: SupervisionAlert[] = [];
  private config: WalkAwayConfig | null = null;
  private stuckDetection: StuckDetection = {
    repeatingErrorCount: 0,
    lastError: '',
    timeSinceProgress: 0,
    stuckThreshold: 30 // 30 minutes default
  };

  // Security patterns to watch for
  private securityPatterns: SecurityPattern[] = [
    {
      pattern: /sql.*injection|SELECT.*FROM.*WHERE.*=.*\$/i,
      description: "Potential SQL injection vulnerability",
      severity: "high"
    },
    {
      pattern: /eval\(|innerHTML.*=|document\.write/i,
      description: "Potential XSS vulnerability",
      severity: "high"
    },
    {
      pattern: /password.*=.*['"][^'"]+['"]|api.*key.*=.*['"][^'"]+['"]/i,
      description: "Hardcoded credentials detected",
      severity: "high"
    },
    {
      pattern: /process\.env\.NODE_ENV.*===.*['"]production['"]/,
      description: "Production environment check missing",
      severity: "medium"
    },
    {
      pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/i,
      description: "Insecure HTTP connection in production",
      severity: "medium"
    }
  ];

  private constructor() {
    this.loadPersistedData();
    this.startPeriodicChecks();
  }

  public static getInstance(): WalkAwaySupervisionService {
    if (!WalkAwaySupervisionService.instance) {
      WalkAwaySupervisionService.instance = new WalkAwaySupervisionService();
    }
    return WalkAwaySupervisionService.instance;
  }

  // ================================================================================
  // Session Management
  // ================================================================================

  async startWalkAwaySession(task: string, config?: WalkAwayConfig): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      id: sessionId,
      originalTask: task,
      startTime: new Date(),
      userPresent: false,
      status: 'active'
    };

    this.config = config || this.getDefaultConfig();
    this.activities = [];
    this.issues = [];
    this.alerts = [];
    this.resetStuckDetection();

    // Save to localStorage for persistence
    this.persistData();

    logger.debug(`🔍 Walk-Away Supervision started for task: "${task}"`);
    
    return sessionId;
  }

  async pauseSession(sessionId: string): Promise<void> {
    if (this.currentSession?.id === sessionId) {
      this.currentSession.status = 'paused';
      this.persistData();
      logger.debug('⏸️ Walk-Away Supervision paused');
    }
  }

  async resumeSession(sessionId: string): Promise<void> {
    if (this.currentSession?.id === sessionId) {
      this.currentSession.status = 'active';
      this.persistData();
      logger.debug('▶️ Walk-Away Supervision resumed');
    }
  }

  async endSession(sessionId: string): Promise<WalkAwayReport> {
    if (this.currentSession?.id === sessionId) {
      this.currentSession.endTime = new Date();
      this.currentSession.status = 'completed';
      this.currentSession.userPresent = true; // User returned
    }

    const report = await this.generateReport(sessionId);
    
    // Clean up after generating report
    this.clearPersistedData();
    
    logger.debug('🏁 Walk-Away Supervision session completed');
    
    return report;
  }

  // ================================================================================
  // Real-time Monitoring
  // ================================================================================

  recordActivity(sessionId: string, activity: Omit<SessionActivity, 'timestamp'>): void {
    if (!this.currentSession || this.currentSession.id !== sessionId) return;

    const fullActivity: SessionActivity = {
      ...activity,
      timestamp: new Date()
    };

    this.activities.push(fullActivity);

    // Update stuck detection
    if (activity.type === 'error') {
      this.updateStuckDetection(activity.details?.errorMessage || 'Unknown error');
    } else if (activity.type === 'file-change' || activity.type === 'commit') {
      this.resetStuckDetection(); // Progress made
    }

    // Check for security issues in file changes
    if (activity.type === 'file-change' && activity.description) {
      this.checkSecurityPatterns(activity.description, activity.details?.filePath);
    }

    // Keep activities list manageable
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(-500); // Keep last 500
    }

    this.persistData();
  }

  async checkForIssues(sessionId: string): Promise<CriticalIssue[]> {
    if (!this.currentSession || this.currentSession.id !== sessionId) return [];

    const newIssues: CriticalIssue[] = [];

    // Check if Claude Code is stuck
    const stuckIssue = this.checkIfStuck();
    if (stuckIssue) {
      newIssues.push(stuckIssue);
    }

    // Check for task deviation (simplified heuristic)
    const deviationIssue = this.checkTaskDeviation();
    if (deviationIssue) {
      newIssues.push(deviationIssue);
    }

    // Add new issues and send alerts if critical
    for (const issue of newIssues) {
      if (!this.issues.find(existing => existing.id === issue.id)) {
        this.issues.push(issue);
        
        if (issue.requiresEscalation) {
          await this.sendCriticalAlert(issue);
        }
      }
    }

    return newIssues;
  }

  updateProgress(sessionId: string, progress: Partial<WorkProgress>): void {
    // This would integrate with external progress tracking
    // For now, we infer progress from activities
    logger.debug('Progress updated:', progress);
  }

  // ================================================================================
  // Report Generation
  // ================================================================================

  async generateReport(sessionId: string): Promise<WalkAwayReport> {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      throw new Error('Invalid session ID');
    }

    const duration = this.calculateSessionDuration();
    const progress = this.analyzeProgress();
    const codeQuality = this.analyzeCodeQuality();

    const report: WalkAwayReport = {
      session: this.currentSession,
      summary: {
        duration,
        totalActivities: this.activities.length,
        filesModified: this.countUniqueFiles(),
        commandsRun: this.activities.filter(a => a.type === 'terminal-command').length,
        commitsCreated: this.activities.filter(a => a.type === 'commit').length,
        errorsEncountered: this.activities.filter(a => a.type === 'error').length
      },
      progress,
      activities: this.activities.slice(-50), // Last 50 activities for the report
      issues: {
        critical: this.issues.filter(i => i.severity === 'high'),
        warnings: this.issues.filter(i => i.severity === 'medium').map(i => i.description),
        notes: this.issues.filter(i => i.severity === 'low').map(i => i.description)
      },
      recommendations: this.generateRecommendations(),
      codeQuality
    };

    return report;
  }

  getActiveSession(): WalkAwaySession | null {
    return this.currentSession;
  }

  // ================================================================================
  // Alert System
  // ================================================================================

  async sendCriticalAlert(issue: CriticalIssue): Promise<void> {
    const alert: SupervisionAlert = {
      id: `alert_${Date.now()}`,
      timestamp: new Date(),
      type: 'critical',
      title: issue.title,
      message: issue.description,
      dismissed: false,
      actions: [
        { label: 'Review Now', action: 'review' },
        { label: 'Pause Session', action: 'pause' },
        { label: 'Dismiss', action: 'ignore' }
      ]
    };

    this.alerts.push(alert);

    // Send notification based on config
    if (this.config?.escalationPreferences.notificationMethod === 'desktop' || 
        this.config?.escalationPreferences.notificationMethod === 'both') {
      this.sendDesktopNotification(alert);
    }

    logger.debug(`🚨 Critical Alert: ${issue.title}`);
  }

  dismissAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
    }
  }

  // ================================================================================
  // Private Helper Methods
  // ================================================================================

  private updateStuckDetection(errorMessage: string): void {
    if (errorMessage === this.stuckDetection.lastError) {
      this.stuckDetection.repeatingErrorCount++;
    } else {
      this.stuckDetection.lastError = errorMessage;
      this.stuckDetection.repeatingErrorCount = 1;
    }
    this.stuckDetection.timeSinceProgress = Date.now();
  }

  private resetStuckDetection(): void {
    this.stuckDetection.repeatingErrorCount = 0;
    this.stuckDetection.lastError = '';
    this.stuckDetection.timeSinceProgress = Date.now();
  }

  private checkIfStuck(): CriticalIssue | null {
    const timeSinceProgress = (Date.now() - this.stuckDetection.timeSinceProgress) / (1000 * 60); // minutes
    const threshold = this.config?.escalationPreferences.stuckTimeout || 30;

    if (this.stuckDetection.repeatingErrorCount >= 3 && timeSinceProgress > threshold) {
      return {
        id: `stuck_${Date.now()}`,
        timestamp: new Date(),
        severity: 'high',
        category: 'stuck',
        title: 'Claude Code appears to be stuck',
        description: `Same error repeated ${this.stuckDetection.repeatingErrorCount} times over ${Math.round(timeSinceProgress)} minutes: ${this.stuckDetection.lastError}`,
        suggestedAction: 'Review the error and provide additional context or modify the task',
        requiresEscalation: true
      };
    }

    return null;
  }

  private checkTaskDeviation(): CriticalIssue | null {
    // Simple heuristic: if recent activities don't mention keywords from original task
    const taskKeywords = this.extractTaskKeywords(this.currentSession?.originalTask || '');
    const recentActivities = this.activities.slice(-20);
    
    const relevantActivities = recentActivities.filter(activity => {
      const text = `${activity.description} ${activity.details?.filePath || ''}`.toLowerCase();
      return taskKeywords.some(keyword => text.includes(keyword.toLowerCase()));
    });

    const deviationRatio = 1 - (relevantActivities.length / Math.max(recentActivities.length, 1));
    const threshold = this.config?.escalationPreferences.deviationThreshold || 0.8;

    if (deviationRatio > threshold && recentActivities.length >= 10) {
      return {
        id: `deviation_${Date.now()}`,
        timestamp: new Date(),
        severity: 'medium',
        category: 'deviation',
        title: 'Possible task deviation detected',
        description: `Recent work appears unrelated to original task: "${this.currentSession?.originalTask}"`,
        suggestedAction: 'Review recent changes and redirect focus to original task',
        requiresEscalation: false
      };
    }

    return null;
  }

  private checkSecurityPatterns(content: string, filePath?: string): void {
    for (const pattern of this.securityPatterns) {
      if (pattern.pattern.test(content)) {
        const issue: CriticalIssue = {
          id: `security_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date(),
          severity: pattern.severity,
          category: 'security',
          title: 'Security issue detected',
          description: pattern.description,
          location: filePath,
          suggestedAction: 'Review the code change for security implications before proceeding',
          requiresEscalation: pattern.severity === 'high' && (this.config?.escalationPreferences.securityIssues !== false)
        };

        this.issues.push(issue);

        if (issue.requiresEscalation) {
          this.sendCriticalAlert(issue);
        }
      }
    }
  }

  private extractTaskKeywords(task: string): string[] {
    // Simple keyword extraction
    const words = task.toLowerCase().split(/\s+/);
    return words.filter(word => 
      word.length > 3 && 
      !['this', 'that', 'with', 'from', 'they', 'were', 'been', 'have', 'their', 'said', 'each', 'which', 'what', 'there'].includes(word)
    );
  }

  private analyzeProgress(): WorkProgress {
    // Infer progress from activities - this is a simplified heuristic
    const fileChanges = this.activities.filter(a => a.type === 'file-change');
    const commits = this.activities.filter(a => a.type === 'commit');
    const errors = this.activities.filter(a => a.type === 'error');

    const completed: WorkItem[] = commits.map(commit => ({
      description: commit.description,
      estimatedProgress: 100,
      lastActivity: commit.timestamp,
      files: [commit.details?.filePath || 'unknown'].filter(Boolean),
      relatedCommands: []
    }));

    const inProgress: WorkItem[] = fileChanges
      .filter(fc => !commits.some(c => c.details?.filePath === fc.details?.filePath))
      .map(fc => ({
        description: fc.description,
        estimatedProgress: 60,
        lastActivity: fc.timestamp,
        files: [fc.details?.filePath || 'unknown'].filter(Boolean),
        relatedCommands: []
      }));

    const blocked: WorkItem[] = errors
      .filter(e => this.activities.filter(a => a.type === 'error' && a.details?.errorMessage === e.details?.errorMessage).length > 2)
      .map(error => ({
        description: `Blocked by: ${error.description}`,
        estimatedProgress: 0,
        lastActivity: error.timestamp,
        files: [error.details?.filePath || 'unknown'].filter(Boolean),
        relatedCommands: []
      }));

    return {
      completed,
      inProgress,
      notStarted: [], // Hard to infer
      blocked
    };
  }

  private analyzeCodeQuality(): WalkAwayReport['codeQuality'] {
    // This would integrate with linters, test runners, etc.
    // For now, return basic metrics
    return {
      testCoverage: undefined,
      lintingIssues: this.issues.filter(i => i.category === 'security').length,
      securityWarnings: this.issues.filter(i => i.category === 'security').length,
      techDebtItems: []
    };
  }

  private generateRecommendations(): WalkAwayReport['recommendations'] {
    const nextSteps: string[] = [];
    const completionTasks: string[] = [];
    const qualityImprovements: string[] = [];

    // Based on issues found
    if (this.issues.some(i => i.category === 'security')) {
      qualityImprovements.push('Review and fix security vulnerabilities');
    }

    if (this.issues.some(i => i.category === 'stuck')) {
      nextSteps.push('Resolve blocking error to continue progress');
    }

    // Based on activities
    const hasTests = this.activities.some(a => a.details?.filePath?.includes('test') || a.details?.filePath?.includes('spec'));
    if (!hasTests && this.activities.some(a => a.type === 'file-change')) {
      completionTasks.push('Add unit tests for new functionality');
    }

    const hasCommits = this.activities.some(a => a.type === 'commit');
    if (!hasCommits && this.activities.some(a => a.type === 'file-change')) {
      nextSteps.push('Commit completed work');
    }

    return {
      nextSteps: nextSteps.length > 0 ? nextSteps : ['Continue with the current task'],
      completionTasks,
      qualityImprovements
    };
  }

  private calculateSessionDuration(): string {
    if (!this.currentSession) return '0 minutes';
    
    const start = this.currentSession.startTime.getTime();
    const end = this.currentSession.endTime?.getTime() || Date.now();
    const durationMs = end - start;
    
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`;
    }
    
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  private countUniqueFiles(): number {
    const files = new Set(
      this.activities
        .filter(a => a.details?.filePath)
        .map(a => a.details!.filePath!)
    );
    return files.size;
  }

  private sendDesktopNotification(alert: SupervisionAlert): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(alert.title, {
          body: alert.message,
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(alert.title, {
              body: alert.message,
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  }

  private getDefaultConfig(): WalkAwayConfig {
    return {
      taskDescription: '',
      escalationPreferences: {
        securityIssues: true,
        stuckTimeout: 30,
        deviationThreshold: 0.7,
        notificationMethod: 'desktop'
      },
      qualityGates: {
        requireTests: false,
        blockOnSecurityIssues: true,
        blockOnLintingErrors: false
      }
    };
  }

  private startPeriodicChecks(): void {
    // Check for issues every 2 minutes
    setInterval(async () => {
      if (this.currentSession?.status === 'active') {
        await this.checkForIssues(this.currentSession.id);
      }
    }, 2 * 60 * 1000);
  }

  private persistData(): void {
    if (typeof window !== 'undefined') {
      const data = {
        session: this.currentSession,
        activities: this.activities.slice(-100), // Keep last 100
        issues: this.issues,
        config: this.config,
        stuckDetection: this.stuckDetection
      };
      
      localStorage.setItem('walkaway-supervision-data', JSON.stringify(data));
    }
  }

  private loadPersistedData(): void {
    if (typeof window !== 'undefined') {
      try {
        const data = localStorage.getItem('walkaway-supervision-data');
        if (data) {
          const parsed = JSON.parse(data);
          this.currentSession = parsed.session;
          this.activities = parsed.activities || [];
          this.issues = parsed.issues || [];
          this.config = parsed.config;
          this.stuckDetection = parsed.stuckDetection || this.stuckDetection;
        }
      } catch (error) {
        logger.error('Failed to load persisted supervision data:', error);
      }
    }
  }

  private clearPersistedData(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('walkaway-supervision-data');
    }
  }
}