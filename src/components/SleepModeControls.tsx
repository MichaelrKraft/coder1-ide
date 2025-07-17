import React, { useState, useEffect } from 'react';
import { SleepModeService, SleepModeSettings, SleepModeStatus } from '../services/SleepModeService';
import './SleepModeControls.css';

interface SleepModeControlsProps {
  workspaceId: string;
  sleepModeService: SleepModeService;
}

export const SleepModeControls: React.FC<SleepModeControlsProps> = ({
  workspaceId,
  sleepModeService
}) => {
  const [status, setStatus] = useState<SleepModeStatus | null>(null);
  const [settings, setSettings] = useState<SleepModeSettings>({
    workspaceId,
    enabled: false,
    schedule: {
      timezone: 'UTC',
      sleepHours: { start: '22:00', end: '08:00' },
      weekendMode: true,
      holidayMode: true
    },
    autonomyLevel: 'balanced',
    qualityThresholds: {
      codeQuality: 80,
      testCoverage: 70,
      securityScore: 90,
      performanceScore: 75
    },
    escalationRules: [
      {
        condition: 'security_vulnerability',
        threshold: 1,
        action: 'escalate',
        priority: 'critical'
      },
      {
        condition: 'test_failure',
        threshold: 3,
        action: 'pause',
        priority: 'high'
      }
    ],
    notificationChannels: ['push', 'email']
  });
  const [isConfiguring, setIsConfiguring] = useState(false);

  useEffect(() => {
    const currentStatus = sleepModeService.getSleepModeStatus(workspaceId);
    setStatus(currentStatus);
  }, [workspaceId, sleepModeService]);

  const handleEnableSleepMode = async () => {
    try {
      await sleepModeService.enableSleepMode(workspaceId, settings);
      const newStatus = sleepModeService.getSleepModeStatus(workspaceId);
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to enable sleep mode:', error);
    }
  };

  const handleDisableSleepMode = async () => {
    try {
      const finalStatus = await sleepModeService.disableSleepMode(workspaceId);
      setStatus(null);
      
      if (finalStatus) {
        const summary = await sleepModeService.generateSleepModeSummary(workspaceId);
        alert(`Sleep Mode Summary:\n${summary}`);
      }
    } catch (error) {
      console.error('Failed to disable sleep mode:', error);
    }
  };

  const handlePauseSleepMode = async () => {
    try {
      await sleepModeService.pauseSleepMode(workspaceId, 'Manual pause by user');
      const newStatus = sleepModeService.getSleepModeStatus(workspaceId);
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to pause sleep mode:', error);
    }
  };

  const handleResumeSleepMode = async () => {
    try {
      await sleepModeService.resumeSleepMode(workspaceId);
      const newStatus = sleepModeService.getSleepModeStatus(workspaceId);
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to resume sleep mode:', error);
    }
  };

  const updateSettings = (key: keyof SleepModeSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedSettings = (parentKey: keyof SleepModeSettings, childKey: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey] as any,
        [childKey]: value
      }
    }));
  };

  return (
    <div className="sleep-mode-controls">
      <div className="sleep-mode-header">
        <h3>🌙 Sleep Mode Controls</h3>
        <div className="sleep-mode-status">
          {status ? (
            <div className={`status-indicator ${status.isActive ? 'active' : 'paused'}`}>
              {status.isActive ? '🟢 Active' : '⏸️ Paused'}
            </div>
          ) : (
            <div className="status-indicator inactive">⚫ Inactive</div>
          )}
        </div>
      </div>

      {status && (
        <div className="sleep-mode-stats">
          <div className="stat">
            <span className="stat-label">Decisions Made:</span>
            <span className="stat-value">{status.autonomousDecisionsMade}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Interventions:</span>
            <span className="stat-value">{status.interventionsRequested}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Quality Score:</span>
            <span className="stat-value">{status.qualityScore}%</span>
          </div>
          <div className="stat">
            <span className="stat-label">Duration:</span>
            <span className="stat-value">
              {Math.round((Date.now() - status.startTime.getTime()) / (1000 * 60 * 60) * 10) / 10}h
            </span>
          </div>
        </div>
      )}

      <div className="sleep-mode-actions">
        {!status ? (
          <button 
            className="btn btn-primary"
            onClick={handleEnableSleepMode}
          >
            🌙 Enable Sleep Mode
          </button>
        ) : (
          <div className="active-controls">
            {status.isActive ? (
              <button 
                className="btn btn-warning"
                onClick={handlePauseSleepMode}
              >
                ⏸️ Pause
              </button>
            ) : (
              <button 
                className="btn btn-success"
                onClick={handleResumeSleepMode}
              >
                ▶️ Resume
              </button>
            )}
            <button 
              className="btn btn-danger"
              onClick={handleDisableSleepMode}
            >
              🛑 Stop Sleep Mode
            </button>
          </div>
        )}
        
        <button 
          className="btn btn-secondary"
          onClick={() => setIsConfiguring(!isConfiguring)}
        >
          ⚙️ Configure
        </button>
      </div>

      {isConfiguring && (
        <div className="sleep-mode-config">
          <h4>Sleep Mode Configuration</h4>
          
          <div className="config-section">
            <label>Autonomy Level:</label>
            <select 
              value={settings.autonomyLevel}
              onChange={(e) => updateSettings('autonomyLevel', e.target.value)}
            >
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>

          <div className="config-section">
            <label>Sleep Schedule:</label>
            <div className="schedule-inputs">
              <input
                type="time"
                value={settings.schedule.sleepHours.start}
                onChange={(e) => updateNestedSettings('schedule', 'sleepHours', {
                  ...settings.schedule.sleepHours,
                  start: e.target.value
                })}
              />
              <span>to</span>
              <input
                type="time"
                value={settings.schedule.sleepHours.end}
                onChange={(e) => updateNestedSettings('schedule', 'sleepHours', {
                  ...settings.schedule.sleepHours,
                  end: e.target.value
                })}
              />
            </div>
          </div>

          <div className="config-section">
            <label>Quality Thresholds:</label>
            <div className="threshold-inputs">
              <div className="threshold-input">
                <label>Code Quality:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.qualityThresholds.codeQuality}
                  onChange={(e) => updateNestedSettings('qualityThresholds', 'codeQuality', parseInt(e.target.value))}
                />
                <span>%</span>
              </div>
              <div className="threshold-input">
                <label>Test Coverage:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.qualityThresholds.testCoverage}
                  onChange={(e) => updateNestedSettings('qualityThresholds', 'testCoverage', parseInt(e.target.value))}
                />
                <span>%</span>
              </div>
              <div className="threshold-input">
                <label>Security Score:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.qualityThresholds.securityScore}
                  onChange={(e) => updateNestedSettings('qualityThresholds', 'securityScore', parseInt(e.target.value))}
                />
                <span>%</span>
              </div>
            </div>
          </div>

          <div className="config-section">
            <label>Notification Channels:</label>
            <div className="notification-channels">
              {['push', 'email', 'sms', 'slack'].map(channel => (
                <label key={channel} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.notificationChannels.includes(channel)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateSettings('notificationChannels', [...settings.notificationChannels, channel]);
                      } else {
                        updateSettings('notificationChannels', settings.notificationChannels.filter(c => c !== channel));
                      }
                    }}
                  />
                  {channel.charAt(0).toUpperCase() + channel.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
