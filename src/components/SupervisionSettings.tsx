import React, { useState, useEffect } from 'react';
import { ClaudePersona, ApprovalThresholds } from '../types/supervision';
import { useProPlan } from './ProPlanGate';
import './SupervisionSettings.css';

interface SupervisionSettingsProps {
  workspaceId: string;
  onSettingsChange?: (settings: SupervisionConfig) => void;
}

export interface SupervisionConfig {
  enabled: boolean;
  autonomyLevel: 'conservative' | 'balanced' | 'aggressive';
  claudePersona: ClaudePersona;
  approvalThresholds: ApprovalThresholds;
  sleepModeEnabled: boolean;
  sleepModeSchedule: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    slack: boolean;
    escalationOnly: boolean;
  };
  autoFix: {
    enabled: boolean;
    maxAttempts: number;
    categories: string[];
  };
  mcpServers: {
    context7: boolean;
    sequential: boolean;
    magic: boolean;
    puppeteer: boolean;
  };
}

export const SupervisionSettings: React.FC<SupervisionSettingsProps> = ({
  workspaceId,
  onSettingsChange
}) => {
  const { isProPlan } = useProPlan();
  const [config, setConfig] = useState<SupervisionConfig>({
    enabled: true,
    autonomyLevel: 'balanced',
    claudePersona: 'analyzer',
    approvalThresholds: {
      codeQuality: 80,
      securityRisk: 20,
      performanceImpact: 30,
      testCoverage: 70
    },
    sleepModeEnabled: false,
    sleepModeSchedule: {
      enabled: false,
      startTime: '18:00',
      endTime: '09:00',
      timezone: 'UTC'
    },
    notifications: {
      email: true,
      push: true,
      slack: false,
      escalationOnly: false
    },
    autoFix: {
      enabled: true,
      maxAttempts: 3,
      categories: ['formatting', 'imports', 'linting']
    },
    mcpServers: {
      context7: true,
      sequential: true,
      magic: true,
      puppeteer: false
    }
  });

  const [activeTab, setActiveTab] = useState<'general' | 'thresholds' | 'sleep' | 'notifications' | 'advanced'>('general');

  useEffect(() => {
    loadSettings();
  }, [workspaceId]);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem(`supervision-settings-${workspaceId}`);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to load supervision settings:', error);
      }
    }
  };

  const saveSettings = (newConfig: SupervisionConfig) => {
    localStorage.setItem(`supervision-settings-${workspaceId}`, JSON.stringify(newConfig));
    if (onSettingsChange) {
      onSettingsChange(newConfig);
    }
  };

  const updateConfig = (updates: Partial<SupervisionConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    saveSettings(newConfig);
  };

  const updateThresholds = (thresholds: Partial<ApprovalThresholds>) => {
    const newThresholds = { ...config.approvalThresholds, ...thresholds };
    updateConfig({ approvalThresholds: newThresholds });
  };

  const personas: Array<{ value: ClaudePersona; label: string; description: string }> = [
    { value: 'analyzer', label: 'Analyzer', description: 'Focuses on code analysis and quality assessment' },
    { value: 'architect', label: 'Architect', description: 'Emphasizes system design and architecture' },
    { value: 'frontend', label: 'Frontend', description: 'Specializes in UI/UX and frontend technologies' },
    { value: 'backend', label: 'Backend', description: 'Focuses on server-side logic and APIs' },
    { value: 'security', label: 'Security', description: 'Prioritizes security and vulnerability assessment' },
    { value: 'qa', label: 'QA', description: 'Emphasizes testing and quality assurance' },
    { value: 'devops', label: 'DevOps', description: 'Focuses on deployment and infrastructure' },
    { value: 'performance', label: 'Performance', description: 'Optimizes for speed and efficiency' },
    { value: 'refactorer', label: 'Refactorer', description: 'Specializes in code improvement and cleanup' },
    { value: 'mentor', label: 'Mentor', description: 'Provides educational guidance and best practices' }
  ];

  return (
    <div className="supervision-settings">
      <div className="settings-header">
        <h2>Supervision Settings</h2>
        <p>Configure autonomous AI supervision for workspace: {workspaceId}</p>
      </div>

      <div className="settings-tabs">
        <button
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`tab ${activeTab === 'thresholds' ? 'active' : ''}`}
          onClick={() => setActiveTab('thresholds')}
        >
          Thresholds
        </button>
        <button
          className={`tab ${activeTab === 'sleep' ? 'active' : ''} ${!isProPlan ? 'pro-only' : ''}`}
          onClick={() => setActiveTab('sleep')}
          disabled={!isProPlan}
        >
          Sleep Mode {!isProPlan && '🔒'}
        </button>
        <button
          className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
        <button
          className={`tab ${activeTab === 'advanced' ? 'active' : ''} ${!isProPlan ? 'pro-only' : ''}`}
          onClick={() => setActiveTab('advanced')}
          disabled={!isProPlan}
        >
          Advanced {!isProPlan && '🔒'}
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'general' && (
          <div className="settings-section">
            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => updateConfig({ enabled: e.target.checked })}
                />
                Enable Autonomous Supervision
              </label>
              <p className="setting-description">
                Allow Claude to automatically review and approve code changes
              </p>
            </div>

            <div className="setting-group">
              <label className="setting-label">Autonomy Level</label>
              <select
                value={config.autonomyLevel}
                onChange={(e) => updateConfig({ autonomyLevel: e.target.value as any })}
                disabled={!config.enabled}
              >
                <option value="conservative">Conservative - Require approval for most changes</option>
                <option value="balanced">Balanced - Approve safe changes automatically</option>
                <option value="aggressive">Aggressive - Approve most changes automatically</option>
              </select>
            </div>

            <div className="setting-group">
              <label className="setting-label">Claude Persona</label>
              <select
                value={config.claudePersona}
                onChange={(e) => updateConfig({ claudePersona: e.target.value as ClaudePersona })}
                disabled={!config.enabled}
              >
                {personas.map(persona => (
                  <option key={persona.value} value={persona.value}>
                    {persona.label} - {persona.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={config.autoFix.enabled}
                  onChange={(e) => updateConfig({
                    autoFix: { ...config.autoFix, enabled: e.target.checked }
                  })}
                  disabled={!config.enabled}
                />
                Enable Auto-Fix
              </label>
              <p className="setting-description">
                Automatically fix common issues like formatting and imports
              </p>
            </div>
          </div>
        )}

        {activeTab === 'thresholds' && (
          <div className="settings-section">
            <h3>Approval Thresholds</h3>
            <p>Configure when changes require human approval</p>

            <div className="threshold-group">
              <label>Code Quality Threshold: {config.approvalThresholds.codeQuality}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={config.approvalThresholds.codeQuality}
                onChange={(e) => updateThresholds({ codeQuality: parseInt(e.target.value) })}
                disabled={!config.enabled}
              />
              <p className="threshold-description">
                Minimum code quality score required for auto-approval
              </p>
            </div>

            <div className="threshold-group">
              <label>Security Risk Threshold: {config.approvalThresholds.securityRisk}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={config.approvalThresholds.securityRisk}
                onChange={(e) => updateThresholds({ securityRisk: parseInt(e.target.value) })}
                disabled={!config.enabled}
              />
              <p className="threshold-description">
                Maximum security risk allowed for auto-approval
              </p>
            </div>

            <div className="threshold-group">
              <label>Performance Impact Threshold: {config.approvalThresholds.performanceImpact}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={config.approvalThresholds.performanceImpact}
                onChange={(e) => updateThresholds({ performanceImpact: parseInt(e.target.value) })}
                disabled={!config.enabled}
              />
              <p className="threshold-description">
                Maximum performance impact allowed for auto-approval
              </p>
            </div>

            <div className="threshold-group">
              <label>Test Coverage Threshold: {config.approvalThresholds.testCoverage}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={config.approvalThresholds.testCoverage}
                onChange={(e) => updateThresholds({ testCoverage: parseInt(e.target.value) })}
                disabled={!config.enabled}
              />
              <p className="threshold-description">
                Minimum test coverage required for auto-approval
              </p>
            </div>
          </div>
        )}

        {activeTab === 'sleep' && (
          <div className="settings-section">
            {!isProPlan ? (
              <div className="pro-upgrade-notice">
                <h3>🔒 Sleep Mode - Pro Feature</h3>
                <p>Upgrade to Coder1 Pro to enable 24/7 autonomous supervision</p>
              </div>
            ) : (
              <>
                <div className="setting-group">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={config.sleepModeEnabled}
                      onChange={(e) => updateConfig({ sleepModeEnabled: e.target.checked })}
                      disabled={!config.enabled}
                    />
                    Enable Sleep Mode
                  </label>
                  <p className="setting-description">
                    Continue autonomous supervision when you're away
                  </p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={config.sleepModeSchedule.enabled}
                      onChange={(e) => updateConfig({
                        sleepModeSchedule: { ...config.sleepModeSchedule, enabled: e.target.checked }
                      })}
                      disabled={!config.enabled || !config.sleepModeEnabled}
                    />
                    Scheduled Sleep Mode
                  </label>
                </div>

                {config.sleepModeSchedule.enabled && (
                  <div className="schedule-settings">
                    <div className="time-inputs">
                      <div>
                        <label>Start Time:</label>
                        <input
                          type="time"
                          value={config.sleepModeSchedule.startTime}
                          onChange={(e) => updateConfig({
                            sleepModeSchedule: { ...config.sleepModeSchedule, startTime: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <label>End Time:</label>
                        <input
                          type="time"
                          value={config.sleepModeSchedule.endTime}
                          onChange={(e) => updateConfig({
                            sleepModeSchedule: { ...config.sleepModeSchedule, endTime: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                    <div>
                      <label>Timezone:</label>
                      <select
                        value={config.sleepModeSchedule.timezone}
                        onChange={(e) => updateConfig({
                          sleepModeSchedule: { ...config.sleepModeSchedule, timezone: e.target.value }
                        })}
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="settings-section">
            <h3>Notification Preferences</h3>

            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={config.notifications.email}
                  onChange={(e) => updateConfig({
                    notifications: { ...config.notifications, email: e.target.checked }
                  })}
                />
                Email Notifications
              </label>
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={config.notifications.push}
                  onChange={(e) => updateConfig({
                    notifications: { ...config.notifications, push: e.target.checked }
                  })}
                />
                Push Notifications
              </label>
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={config.notifications.slack}
                  onChange={(e) => updateConfig({
                    notifications: { ...config.notifications, slack: e.target.checked }
                  })}
                />
                Slack Integration
              </label>
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={config.notifications.escalationOnly}
                  onChange={(e) => updateConfig({
                    notifications: { ...config.notifications, escalationOnly: e.target.checked }
                  })}
                />
                Escalation Only
              </label>
              <p className="setting-description">
                Only notify for issues that require human intervention
              </p>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="settings-section">
            {!isProPlan ? (
              <div className="pro-upgrade-notice">
                <h3>🔒 Advanced Settings - Pro Feature</h3>
                <p>Upgrade to Coder1 Pro to access MCP server configuration and advanced features</p>
              </div>
            ) : (
              <>
                <h3>MCP Server Configuration</h3>
                <p>Enable or disable specific MCP servers for this workspace</p>

                <div className="mcp-servers">
                  <div className="setting-group">
                    <label className="setting-label">
                      <input
                        type="checkbox"
                        checked={config.mcpServers.context7}
                        onChange={(e) => updateConfig({
                          mcpServers: { ...config.mcpServers, context7: e.target.checked }
                        })}
                      />
                      Context7 Server
                    </label>
                    <p className="setting-description">Context analysis and code understanding</p>
                  </div>

                  <div className="setting-group">
                    <label className="setting-label">
                      <input
                        type="checkbox"
                        checked={config.mcpServers.sequential}
                        onChange={(e) => updateConfig({
                          mcpServers: { ...config.mcpServers, sequential: e.target.checked }
                        })}
                      />
                      Sequential Server
                    </label>
                    <p className="setting-description">Step-by-step analysis and logical reasoning</p>
                  </div>

                  <div className="setting-group">
                    <label className="setting-label">
                      <input
                        type="checkbox"
                        checked={config.mcpServers.magic}
                        onChange={(e) => updateConfig({
                          mcpServers: { ...config.mcpServers, magic: e.target.checked }
                        })}
                      />
                      Magic Server
                    </label>
                    <p className="setting-description">UI generation and component creation</p>
                  </div>

                  <div className="setting-group">
                    <label className="setting-label">
                      <input
                        type="checkbox"
                        checked={config.mcpServers.puppeteer}
                        onChange={(e) => updateConfig({
                          mcpServers: { ...config.mcpServers, puppeteer: e.target.checked }
                        })}
                      />
                      Puppeteer Server
                    </label>
                    <p className="setting-description">Browser automation and testing</p>
                  </div>
                </div>

                <h3>Auto-Fix Configuration</h3>
                <div className="setting-group">
                  <label>Max Auto-Fix Attempts: {config.autoFix.maxAttempts}</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={config.autoFix.maxAttempts}
                    onChange={(e) => updateConfig({
                      autoFix: { ...config.autoFix, maxAttempts: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="settings-footer">
        <button className="reset-button" onClick={loadSettings}>
          Reset to Saved
        </button>
        <button className="save-button" onClick={() => saveSettings(config)}>
          Save Settings
        </button>
      </div>
    </div>
  );
};
