import React, { useState, useEffect } from 'react';
import { SleepModeManager } from '../services/SleepModeManager';
import { MobileNotificationService } from '../services/MobileNotificationService';
import { SleepModeStatus, SleepModeConfig } from '../services/SleepModeConfig';
import './SleepModeManager.css';

interface SleepModeManagerProps {
  workspaceId: string;
  onStatusChange?: (status: SleepModeStatus) => void;
}

export const SleepModeManagerComponent: React.FC<SleepModeManagerProps> = ({
  workspaceId,
  onStatusChange
}) => {
  const [sleepModeManager] = useState(() => new SleepModeManager());
  const [notificationService] = useState(() => new MobileNotificationService());
  const [status, setStatus] = useState<SleepModeStatus>({
    isActive: false,
    changesApproved: 0,
    changesRejected: 0,
    escalationsTriggered: 0
  });
  const [config, setConfig] = useState<SleepModeConfig>({
    autonomyLevel: 'balanced',
    thresholds: {
      codeQuality: 80,
      securityRisk: 30,
      performanceImpact: 25,
      testCoverage: 70
    },
    escalationRules: [],
    maxChangesPerHour: 10,
    autoCommit: true,
    requiresHumanReview: false,
    notificationChannels: ['push']
  });

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = sleepModeManager.getSleepModeStatus(workspaceId);
      if (currentStatus) {
        setStatus(currentStatus);
        onStatusChange?.(currentStatus);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000);

    return () => clearInterval(interval);
  }, [workspaceId, sleepModeManager, onStatusChange]);

  const handleEnableSleepMode = async () => {
    try {
      await sleepModeManager.enableSleepMode(workspaceId, config);
      await notificationService.sendSleepModeUpdate(
        workspaceId,
        'enabled',
        `Sleep mode activated with ${config.autonomyLevel} autonomy level`
      );
      setStatus(prev => ({ ...prev, isActive: true, startTime: new Date() }));
    } catch (error) {
      console.error('Failed to enable sleep mode:', error);
    }
  };

  const handleDisableSleepMode = async () => {
    try {
      await sleepModeManager.disableSleepMode(workspaceId);
      await notificationService.sendSleepModeUpdate(
        workspaceId,
        'disabled',
        'Sleep mode has been disabled'
      );
      setStatus(prev => ({ ...prev, isActive: false, endTime: new Date() }));
    } catch (error) {
      console.error('Failed to disable sleep mode:', error);
    }
  };

  const handleConfigChange = (key: keyof SleepModeConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleThresholdChange = (key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      thresholds: { ...prev.thresholds, [key]: value }
    }));
  };

  return (
    <div className="sleep-mode-manager">
      <div className="sleep-mode-header">
        <h3>🌙 Sleep Mode Manager</h3>
        <div className={`status-indicator ${status.isActive ? 'active' : 'inactive'}`}>
          {status.isActive ? 'ACTIVE' : 'INACTIVE'}
        </div>
      </div>

      {status.isActive && (
        <div className="sleep-mode-stats">
          <div className="stat-item">
            <span className="stat-label">Changes Approved:</span>
            <span className="stat-value">{status.changesApproved}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Changes Rejected:</span>
            <span className="stat-value">{status.changesRejected}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Escalations:</span>
            <span className="stat-value">{status.escalationsTriggered}</span>
          </div>
          {status.startTime && (
            <div className="stat-item">
              <span className="stat-label">Active Since:</span>
              <span className="stat-value">{status.startTime.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      )}

      <div className="sleep-mode-config">
        <h4>Configuration</h4>
        
        <div className="config-group">
          <label>Autonomy Level:</label>
          <select
            value={config.autonomyLevel}
            onChange={(e) => handleConfigChange('autonomyLevel', e.target.value)}
            disabled={status.isActive}
          >
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>

        <div className="config-group">
          <label>Max Changes Per Hour:</label>
          <input
            type="number"
            value={config.maxChangesPerHour}
            onChange={(e) => handleConfigChange('maxChangesPerHour', parseInt(e.target.value))}
            disabled={status.isActive}
            min="1"
            max="100"
          />
        </div>

        <div className="config-group">
          <label>
            <input
              type="checkbox"
              checked={config.autoCommit}
              onChange={(e) => handleConfigChange('autoCommit', e.target.checked)}
              disabled={status.isActive}
            />
            Auto-commit approved changes
          </label>
        </div>

        <div className="config-group">
          <label>
            <input
              type="checkbox"
              checked={config.requiresHumanReview}
              onChange={(e) => handleConfigChange('requiresHumanReview', e.target.checked)}
              disabled={status.isActive}
            />
            Require human review for critical changes
          </label>
        </div>

        <div className="thresholds-section">
          <h5>Quality Thresholds</h5>
          
          <div className="threshold-item">
            <label>Code Quality: {config.thresholds.codeQuality}%</label>
            <input
              type="range"
              min="50"
              max="100"
              value={config.thresholds.codeQuality}
              onChange={(e) => handleThresholdChange('codeQuality', parseInt(e.target.value))}
              disabled={status.isActive}
            />
          </div>

          <div className="threshold-item">
            <label>Security Risk: {config.thresholds.securityRisk}%</label>
            <input
              type="range"
              min="0"
              max="50"
              value={config.thresholds.securityRisk}
              onChange={(e) => handleThresholdChange('securityRisk', parseInt(e.target.value))}
              disabled={status.isActive}
            />
          </div>

          <div className="threshold-item">
            <label>Performance Impact: {config.thresholds.performanceImpact}%</label>
            <input
              type="range"
              min="0"
              max="50"
              value={config.thresholds.performanceImpact}
              onChange={(e) => handleThresholdChange('performanceImpact', parseInt(e.target.value))}
              disabled={status.isActive}
            />
          </div>

          <div className="threshold-item">
            <label>Test Coverage: {config.thresholds.testCoverage}%</label>
            <input
              type="range"
              min="50"
              max="100"
              value={config.thresholds.testCoverage}
              onChange={(e) => handleThresholdChange('testCoverage', parseInt(e.target.value))}
              disabled={status.isActive}
            />
          </div>
        </div>
      </div>

      <div className="sleep-mode-actions">
        {!status.isActive ? (
          <button
            className="enable-sleep-mode-btn"
            onClick={handleEnableSleepMode}
          >
            🌙 Enable Sleep Mode
          </button>
        ) : (
          <button
            className="disable-sleep-mode-btn"
            onClick={handleDisableSleepMode}
          >
            ☀️ Disable Sleep Mode
          </button>
        )}
      </div>
    </div>
  );
};
