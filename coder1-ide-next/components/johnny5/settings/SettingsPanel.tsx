'use client';

import React, { useState } from 'react';
import {
  Settings,
  Link2,
  Brain,
  Shield,
  Eye,
  Save,
  RotateCcw,
  ChevronRight,
  Bell,
  Clock,
  Database,
  Trash2,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';
import IntegrationCard, { MOCK_INTEGRATIONS } from './IntegrationCard';
import PermissionBoundaries, { MOCK_PERMISSION_BOUNDARIES } from './PermissionBoundaries';
import { useJohnny5Store } from '@/stores/useJohnny5Store';

type SettingsTab = 'integrations' | 'behavior' | 'security' | 'privacy';

interface SettingsPanelProps {
  onShowSetupWizard?: () => void;
  onSave?: (settings: object) => void;
  className?: string;
}

/**
 * SettingsPanel Component
 *
 * Main settings view for Johnny5 with tabbed interface.
 * Tabs: Integrations, Behavior, Security, Privacy
 */
export default function SettingsPanel({
  onShowSetupWizard,
  onSave,
  className,
}: SettingsPanelProps) {
  const { reset: resetStore, setSetupStatus, setupStatus } = useJohnny5Store();
  const [activeTab, setActiveTab] = useState<SettingsTab>('integrations');
  const [hasChanges, setHasChanges] = useState(false);

  // Reset Johnny5 to show setup screen again
  const handleResetJohnny5 = () => {
    if (confirm('Are you sure you want to reset Johnny5? This will show the setup screen again.')) {
      setSetupStatus({ ...setupStatus, isComplete: false });
      // Optionally full reset: resetStore();
    }
  };

  // Settings state
  const [integrations, setIntegrations] = useState(MOCK_INTEGRATIONS);
  const [hiddenIntegrationIds, setHiddenIntegrationIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState(MOCK_PERMISSION_BOUNDARIES);
  const [behaviorSettings, setBehaviorSettings] = useState({
    proactivityLevel: 'medium' as 'low' | 'medium' | 'high',
    askBeforeExternalActions: true,
    autoActionsAllowed: false,
    logAllActions: true,
    morningBriefEnabled: true,
    morningBriefTime: '07:00',
    trendMonitoringEnabled: true,
  });
  const [securitySettings, setSecuritySettings] = useState({
    promptInjectionDetection: true,
    blockSuspiciousInputs: true,
    auditLogRetentionDays: 30,
    apiKeyEncryption: true,
    requireConfirmationForHighRisk: true,
  });
  const [privacySettings, setPrivacySettings] = useState({
    sessionHistoryDays: 30,
    analyticsDataDays: 90,
    shareAnonymousUsageData: false,
    clearDataOnDisconnect: false,
  });

  // Tab configuration
  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'integrations', label: 'Integrations', icon: <Link2 className="w-4 h-4" /> },
    { id: 'behavior', label: 'Behavior', icon: <Brain className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy', icon: <Eye className="w-4 h-4" /> },
  ];

  // Handle integration actions
  const handleConnectIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: 'connected' as const, connectedAt: new Date() }
          : i
      )
    );
    setHasChanges(true);
  };

  const handleDisconnectIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: 'disconnected' as const, connectedAt: undefined, lastUsedAt: undefined }
          : i
      )
    );
    setHasChanges(true);
  };

  const handleConfigureIntegration = (id: string) => {
    // TODO: Open configuration modal
    console.log('Configure integration:', id);
  };

  const handleHideIntegration = (id: string) => {
    setHiddenIntegrationIds((prev) => [...prev, id]);
    setHasChanges(true);
  };

  const handleRestoreIntegration = (id: string) => {
    setHiddenIntegrationIds((prev) => prev.filter((hid) => hid !== id));
    setHasChanges(true);
  };

  // Handle permission toggle
  const handleTogglePermission = (id: string, enabled: boolean) => {
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled } : p))
    );
    setHasChanges(true);
  };

  // Handle save
  const handleSave = () => {
    const settings = {
      integrations,
      permissions,
      behavior: behaviorSettings,
      security: securitySettings,
      privacy: privacySettings,
    };
    onSave?.(settings);
    setHasChanges(false);
  };

  // Handle reset
  const handleReset = () => {
    setIntegrations(MOCK_INTEGRATIONS);
    setHiddenIntegrationIds([]);
    setPermissions(MOCK_PERMISSION_BOUNDARIES);
    setBehaviorSettings({
      proactivityLevel: 'medium',
      askBeforeExternalActions: true,
      autoActionsAllowed: false,
      logAllActions: true,
      morningBriefEnabled: true,
      morningBriefTime: '07:00',
      trendMonitoringEnabled: true,
    });
    setSecuritySettings({
      promptInjectionDetection: true,
      blockSuspiciousInputs: true,
      auditLogRetentionDays: 30,
      apiKeyEncryption: true,
      requireConfirmationForHighRisk: true,
    });
    setPrivacySettings({
      sessionHistoryDays: 30,
      analyticsDataDays: 90,
      shareAnonymousUsageData: false,
      clearDataOnDisconnect: false,
    });
    setHasChanges(false);
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'integrations':
        const visibleIntegrations = integrations.filter(
          (i) => !hiddenIntegrationIds.includes(i.id)
        );
        const hiddenIntegrations = integrations.filter((i) =>
          hiddenIntegrationIds.includes(i.id)
        );

        return (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Connected Services</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Manage your connected integrations
                </p>
              </div>
              {onShowSetupWizard && (
                <button
                  onClick={onShowSetupWizard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coder1-cyan/10 hover:bg-coder1-cyan/20 text-coder1-cyan text-xs font-medium transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Run Setup Wizard
                </button>
              )}
            </div>

            {/* Visible Integration Cards */}
            <div className="space-y-3">
              {visibleIntegrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={handleConnectIntegration}
                  onDisconnect={handleDisconnectIntegration}
                  onConfigure={handleConfigureIntegration}
                  onHide={integration.status === 'disconnected' ? handleHideIntegration : undefined}
                />
              ))}
            </div>

            {/* Hidden Services Section */}
            {hiddenIntegrations.length > 0 && (
              <div className="pt-4 border-t border-border-default">
                <h4 className="text-xs font-medium text-text-muted mb-3">
                  Hidden Services ({hiddenIntegrations.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {hiddenIntegrations.map((integration) => (
                    <button
                      key={integration.id}
                      onClick={() => handleRestoreIntegration(integration.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary border border-border-default hover:border-coder1-cyan/30 transition-all group"
                    >
                      <span className="text-xs text-text-muted group-hover:text-text-primary">
                        {integration.name}
                      </span>
                      <span className="text-[10px] text-coder1-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                        + Restore
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'behavior':
        return (
          <div className="space-y-6">
            {/* Proactivity Level */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Proactivity Level
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((level) => {
                  const isSelected = behaviorSettings.proactivityLevel === level;
                  return (
                    <button
                      key={level}
                      onClick={() => {
                        setBehaviorSettings((prev) => ({ ...prev, proactivityLevel: level }));
                        setHasChanges(true);
                      }}
                      className={[
                        'p-3 rounded-lg border-2 transition-all text-center',
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400'
                          : 'bg-zinc-800 border-zinc-600 hover:border-cyan-400/50',
                      ].join(' ')}
                    >
                      <span className={`text-sm font-medium capitalize ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
                        {level}
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {level === 'low'
                          ? 'Always ask'
                          : level === 'medium'
                          ? 'Balanced'
                          : 'Autonomous'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary">Action Settings</h3>

              {/* Ask Before External */}
              <SettingToggle
                label="Ask Before External Actions"
                description="Require confirmation for actions involving external services"
                enabled={behaviorSettings.askBeforeExternalActions}
                onChange={(v) => {
                  setBehaviorSettings({ ...behaviorSettings, askBeforeExternalActions: v });
                  setHasChanges(true);
                }}
              />

              {/* Auto Actions */}
              <SettingToggle
                label="Allow Auto Actions"
                description="Let Johnny5 take routine actions without asking"
                enabled={behaviorSettings.autoActionsAllowed}
                onChange={(v) => {
                  setBehaviorSettings({ ...behaviorSettings, autoActionsAllowed: v });
                  setHasChanges(true);
                }}
                warning="Enables autonomous behavior"
              />

              {/* Log All Actions */}
              <SettingToggle
                label="Log All Actions"
                description="Record every action for the audit trail"
                enabled={behaviorSettings.logAllActions}
                onChange={(v) => {
                  setBehaviorSettings({ ...behaviorSettings, logAllActions: v });
                  setHasChanges(true);
                }}
              />
            </div>

            {/* Morning Brief */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary">Morning Brief</h3>

              <SettingToggle
                label="Enable Morning Brief"
                description="Get a daily summary of overnight work and trends"
                enabled={behaviorSettings.morningBriefEnabled}
                onChange={(v) => {
                  setBehaviorSettings({ ...behaviorSettings, morningBriefEnabled: v });
                  setHasChanges(true);
                }}
              />

              {behaviorSettings.morningBriefEnabled && (
                <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-text-muted" />
                      <span className="text-sm text-text-primary">Delivery Time</span>
                    </div>
                    <input
                      type="time"
                      value={behaviorSettings.morningBriefTime}
                      onChange={(e) => {
                        setBehaviorSettings({
                          ...behaviorSettings,
                          morningBriefTime: e.target.value,
                        });
                        setHasChanges(true);
                      }}
                      className="px-2 py-1 rounded bg-bg-secondary border border-border-default text-sm text-text-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Trend Monitoring */}
            <SettingToggle
              label="Trend Monitoring"
              description="Monitor industry trends and competitor activity"
              enabled={behaviorSettings.trendMonitoringEnabled}
              onChange={(v) => {
                setBehaviorSettings({ ...behaviorSettings, trendMonitoringEnabled: v });
                setHasChanges(true);
              }}
            />
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            {/* Permission Boundaries */}
            <PermissionBoundaries
              permissions={permissions}
              onTogglePermission={handleTogglePermission}
            />

            {/* Security Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary">Security Settings</h3>

              <SettingToggle
                label="Prompt Injection Detection"
                description="Scan inputs for potential prompt injection attacks"
                enabled={securitySettings.promptInjectionDetection}
                onChange={(v) => {
                  setSecuritySettings({ ...securitySettings, promptInjectionDetection: v });
                  setHasChanges(true);
                }}
              />

              <SettingToggle
                label="Block Suspicious Inputs"
                description="Automatically block detected malicious inputs"
                enabled={securitySettings.blockSuspiciousInputs}
                onChange={(v) => {
                  setSecuritySettings({ ...securitySettings, blockSuspiciousInputs: v });
                  setHasChanges(true);
                }}
              />

              <SettingToggle
                label="API Key Encryption"
                description="Encrypt stored API keys and tokens"
                enabled={securitySettings.apiKeyEncryption}
                onChange={(v) => {
                  setSecuritySettings({ ...securitySettings, apiKeyEncryption: v });
                  setHasChanges(true);
                }}
              />

              <SettingToggle
                label="Require Confirmation for High-Risk"
                description="Always ask before high-risk actions"
                enabled={securitySettings.requireConfirmationForHighRisk}
                onChange={(v) => {
                  setSecuritySettings({
                    ...securitySettings,
                    requireConfirmationForHighRisk: v,
                  });
                  setHasChanges(true);
                }}
              />

              {/* Audit Log Retention */}
              <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-text-primary">Audit Log Retention</span>
                    <p className="text-xs text-text-muted">How long to keep audit records</p>
                  </div>
                  <select
                    value={securitySettings.auditLogRetentionDays}
                    onChange={(e) => {
                      setSecuritySettings({
                        ...securitySettings,
                        auditLogRetentionDays: parseInt(e.target.value),
                      });
                      setHasChanges(true);
                    }}
                    className="px-2 py-1 rounded bg-bg-secondary border border-border-default text-sm text-text-primary"
                  >
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={365}>1 year</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            {/* Data Retention */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary">Data Retention</h3>

              {/* Session History */}
              <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-text-muted" />
                    <div>
                      <span className="text-sm text-text-primary">Session History</span>
                      <p className="text-xs text-text-muted">How long to keep session data</p>
                    </div>
                  </div>
                  <select
                    value={privacySettings.sessionHistoryDays}
                    onChange={(e) => {
                      setPrivacySettings({
                        ...privacySettings,
                        sessionHistoryDays: parseInt(e.target.value),
                      });
                      setHasChanges(true);
                    }}
                    className="px-2 py-1 rounded bg-bg-secondary border border-border-default text-sm text-text-primary"
                  >
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={365}>1 year</option>
                  </select>
                </div>
              </div>

              {/* Analytics Data */}
              <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-text-muted" />
                    <div>
                      <span className="text-sm text-text-primary">Analytics Data</span>
                      <p className="text-xs text-text-muted">How long to keep usage analytics</p>
                    </div>
                  </div>
                  <select
                    value={privacySettings.analyticsDataDays}
                    onChange={(e) => {
                      setPrivacySettings({
                        ...privacySettings,
                        analyticsDataDays: parseInt(e.target.value),
                      });
                      setHasChanges(true);
                    }}
                    className="px-2 py-1 rounded bg-bg-secondary border border-border-default text-sm text-text-primary"
                  >
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={180}>6 months</option>
                    <option value={365}>1 year</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Privacy Options */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary">Privacy Options</h3>

              <SettingToggle
                label="Share Anonymous Usage Data"
                description="Help improve Johnny5 by sharing anonymized usage statistics"
                enabled={privacySettings.shareAnonymousUsageData}
                onChange={(v) => {
                  setPrivacySettings({ ...privacySettings, shareAnonymousUsageData: v });
                  setHasChanges(true);
                }}
              />

              <SettingToggle
                label="Clear Data on Disconnect"
                description="Remove all data when disconnecting an integration"
                enabled={privacySettings.clearDataOnDisconnect}
                onChange={(v) => {
                  setPrivacySettings({ ...privacySettings, clearDataOnDisconnect: v });
                  setHasChanges(true);
                }}
              />
            </div>

            {/* Danger Zone */}
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
              </div>

              <div className="space-y-2">
                <button className="w-full p-3 rounded-lg bg-bg-tertiary border border-red-500/30 hover:bg-red-500/10 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-text-primary">Clear All Session Data</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-red-400" />
                </button>

                <button className="w-full p-3 rounded-lg bg-bg-tertiary border border-red-500/30 hover:bg-red-500/10 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-text-primary">Delete All Integrations</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-red-400" />
                </button>

                <button
                  onClick={handleResetJohnny5}
                  className="w-full p-3 rounded-lg bg-bg-tertiary border border-red-500/30 hover:bg-red-500/10 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-text-primary">Reset Johnny5 (Show Setup)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-red-400" />
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`h-full flex flex-col ${className || ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-coder1-cyan" />
            <h2 className="text-base font-bold text-text-primary">Settings</h2>
          </div>

          {/* Save/Reset Buttons */}
          {hasChanges && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-secondary text-text-muted hover:text-text-primary text-xs font-medium transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-coder1-cyan hover:bg-coder1-cyan/90 text-black text-xs font-medium transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 mt-4 p-1 bg-bg-tertiary rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all flex-1 justify-center
                ${activeTab === tab.id
                  ? 'bg-coder1-cyan/20 text-coder1-cyan'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
                }
              `}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {renderTabContent()}
      </div>
    </div>
  );
}

// Helper component for toggle settings
interface SettingToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  warning?: string;
}

function SettingToggle({
  label,
  description,
  enabled,
  onChange,
  warning,
}: SettingToggleProps) {
  return (
    <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">{label}</span>
            {warning && (
              <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />
                {warning}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
        </div>
        <button
          onClick={() => onChange(!enabled)}
          className={`
            relative w-12 h-6 rounded-full transition-all flex-shrink-0
            ${enabled ? 'bg-coder1-cyan' : 'bg-bg-secondary border border-border-default'}
          `}
        >
          <div
            className={`
              absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all
              ${enabled ? 'left-[26px]' : 'left-0.5'}
            `}
          />
        </button>
      </div>
    </div>
  );
}
