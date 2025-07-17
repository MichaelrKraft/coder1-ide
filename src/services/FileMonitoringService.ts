import { ClaudeAgentSupervisor, SupervisionEngine } from './SupervisionEngine';
import { ProjectContext, CodeChange, FileChange } from '../types/supervision';

export interface MonitoringConfig {
  workspaceId: string;
  supervisor: ClaudeAgentSupervisor;
  enableRealTimeMonitoring: boolean;
  monitoringInterval: number;
  autoApprovalEnabled: boolean;
}

export class FileMonitoringService {
  private watchers: Map<string, FileSystemWatcher> = new Map();
  private decisionEngine: SupervisionEngine;
  private monitoringConfigs: Map<string, MonitoringConfig> = new Map();

  constructor() {
    this.decisionEngine = new SupervisionEngine();
  }

  async startMonitoring(config: MonitoringConfig): Promise<void> {
    this.monitoringConfigs.set(config.workspaceId, config);
    
    const watcher = new FileSystemWatcher(config.workspaceId);
    this.watchers.set(config.workspaceId, watcher);

    watcher.onFileChange(async (change: FileChange) => {
      if (this.detectClaudeCodeChanges(change)) {
        await this.triggerSupervisionEvaluation(change, config);
      }
    });

    if (config.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring(config.workspaceId);
    }
  }

  async stopMonitoring(workspaceId: string): Promise<void> {
    const watcher = this.watchers.get(workspaceId);
    if (watcher) {
      watcher.dispose();
      this.watchers.delete(workspaceId);
    }
    this.monitoringConfigs.delete(workspaceId);
  }

  isMonitoring(workspaceId: string): boolean {
    return this.monitoringConfigs.has(workspaceId);
  }

  watchFileChanges(workspaceId: string, callback: (change: CodeChange) => void): void {
    const watcher = this.watchers.get(workspaceId);
    if (watcher) {
      watcher.onCodeChange(callback);
    }
  }

  detectClaudeCodeChanges(change: FileChange): boolean {
    const claudeIndicators = [
      'claude-generated',
      'ai-assisted',
      'auto-generated',
      'claude-code'
    ];

    const hasClaudeComment = claudeIndicators.some(indicator => 
      change.content.toLowerCase().includes(indicator)
    );

    const isRapidChange = change.timestamp ? 
      Date.now() - change.timestamp.getTime() < 5000 : false;

    const hasAIPatterns = this.detectAICodePatterns(change.content);

    return hasClaudeComment || (isRapidChange && hasAIPatterns);
  }

  async triggerSupervisionEvaluation(change: FileChange, config: MonitoringConfig): Promise<void> {
    try {
      const codeChange: CodeChange = {
        id: this.generateChangeId(),
        workspaceId: config.workspaceId,
        filePath: change.filePath,
        content: change.content,
        changeType: change.changeType,
        timestamp: new Date(),
        source: 'claude-code',
        metadata: {
          fileSize: change.content.length,
          linesChanged: change.content.split('\n').length,
          changeReason: 'claude-generated'
        }
      };

      const context: ProjectContext = {
        workspaceId: config.workspaceId,
        projectType: this.detectProjectType(change.filePath),
        dependencies: [],
        testFramework: this.detectTestFramework(change.content),
        buildTool: 'npm'
      };

      const decision = await this.decisionEngine.evaluateClaudeOutput(
        change.content,
        context,
        config.supervisor
      );

      await this.handleSupervisionDecision(decision, codeChange, config);

    } catch (error) {
      console.error('Supervision evaluation failed:', error);
      await this.escalateToHuman(change, config, `Evaluation error: ${error}`);
    }
  }

  private async handleSupervisionDecision(
    decision: any,
    change: CodeChange,
    config: MonitoringConfig
  ): Promise<void> {
    switch (decision.action) {
      case 'approve':
        await this.autoApprove(change, config);
        break;
      case 'reject':
        await this.autoReject(change, config, decision.reason);
        break;
      case 'request_improvement':
        await this.requestClaudeImprovement(change, config, decision.suggestions);
        break;
      case 'escalate_to_human':
        await this.escalateToHuman(change, config, decision.reason);
        break;
    }
  }

  private async autoApprove(change: CodeChange, config: MonitoringConfig): Promise<void> {
    this.logSupervisionAction({
      workspaceId: config.workspaceId,
      action: 'auto_approve',
      changeId: change.id,
      reason: 'All quality gates passed',
      timestamp: new Date()
    });

    this.notifyUser({
      type: 'auto_approved',
      workspaceId: config.workspaceId,
      message: `Auto-approved change in ${change.filePath}`,
      priority: 'low'
    });
  }

  private async autoReject(change: CodeChange, config: MonitoringConfig, reason: string): Promise<void> {
    this.logSupervisionAction({
      workspaceId: config.workspaceId,
      action: 'auto_reject',
      changeId: change.id,
      reason,
      timestamp: new Date()
    });

    this.notifyUser({
      type: 'auto_rejected',
      workspaceId: config.workspaceId,
      message: `Auto-rejected change in ${change.filePath}: ${reason}`,
      priority: 'medium'
    });
  }

  private async requestClaudeImprovement(
    change: CodeChange,
    config: MonitoringConfig,
    suggestions: string[]
  ): Promise<void> {
    this.logSupervisionAction({
      workspaceId: config.workspaceId,
      action: 'request_improvement',
      changeId: change.id,
      reason: 'Quality improvements needed',
      timestamp: new Date()
    });

    this.notifyUser({
      type: 'improvement_requested',
      workspaceId: config.workspaceId,
      message: `Improvement requested for ${change.filePath}`,
      suggestions,
      priority: 'medium'
    });
  }

  private async escalateToHuman(
    change: FileChange | CodeChange,
    config: MonitoringConfig,
    reason: string
  ): Promise<void> {
    const changeId = 'id' in change ? change.id : change.filePath;
    
    this.logSupervisionAction({
      workspaceId: config.workspaceId,
      action: 'escalate',
      changeId,
      reason,
      timestamp: new Date()
    });

    this.notifyUser({
      type: 'human_intervention_required',
      workspaceId: config.workspaceId,
      message: `Human review needed: ${reason}`,
      priority: 'high',
      requiresAction: true
    });
  }

  private detectAICodePatterns(content: string): boolean {
    const aiPatterns = [
      /\/\*\s*AI[- ]generated/i,
      /\/\/\s*Generated by/i,
      /export\s+default\s+function\s+\w+Component/,
      /interface\s+\w+Props\s*{/,
      /const\s+\w+:\s*React\.FC/
    ];

    return aiPatterns.some(pattern => pattern.test(content));
  }

  private detectProjectType(filePath: string): string {
    if (filePath.includes('.tsx') || filePath.includes('.jsx')) return 'react';
    if (filePath.includes('.vue')) return 'vue';
    if (filePath.includes('.ts')) return 'typescript';
    if (filePath.includes('.js')) return 'javascript';
    return 'unknown';
  }

  private detectTestFramework(content: string): string {
    if (content.includes('jest') || content.includes('expect(')) return 'jest';
    if (content.includes('mocha') || content.includes('describe(')) return 'mocha';
    if (content.includes('vitest')) return 'vitest';
    return 'none';
  }

  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startRealTimeMonitoring(workspaceId: string): void {
    const config = this.monitoringConfigs.get(workspaceId);
    if (!config) return;

    setInterval(() => {
      this.performHealthCheck(workspaceId);
    }, config.monitoringInterval);
  }

  private performHealthCheck(workspaceId: string): void {
    const config = this.monitoringConfigs.get(workspaceId);
    if (!config) return;

    this.logSupervisionAction({
      workspaceId,
      action: 'health_check',
      changeId: 'system',
      reason: 'Periodic health check',
      timestamp: new Date()
    });
  }

  private logSupervisionAction(action: any): void {
    console.log('Supervision Action:', action);
  }

  private notifyUser(notification: any): void {
    console.log('User Notification:', notification);
    
    const event = new CustomEvent('supervision-notification', {
      detail: notification
    });
    window.dispatchEvent(event);
  }
}

class FileSystemWatcher {
  private workspaceId: string;
  private fileChangeCallbacks: ((change: FileChange) => void)[] = [];
  private codeChangeCallbacks: ((change: CodeChange) => void)[] = [];

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  onFileChange(callback: (change: FileChange) => void): void {
    this.fileChangeCallbacks.push(callback);
  }

  onCodeChange(callback: (change: CodeChange) => void): void {
    this.codeChangeCallbacks.push(callback);
  }

  dispose(): void {
    this.fileChangeCallbacks = [];
    this.codeChangeCallbacks = [];
  }

  simulateFileChange(filePath: string, content: string): void {
    const change: FileChange = {
      filePath,
      content,
      changeType: 'modify',
      timestamp: new Date()
    };

    this.fileChangeCallbacks.forEach(callback => callback(change));
  }
}
