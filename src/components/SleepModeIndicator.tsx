import React, { useState, useEffect } from 'react';
import { SleepModeManager, SleepModeStatus } from '../services/SleepModeManager';
import './SleepModeIndicator.css';

interface SleepModeIndicatorProps {
  workspaceId: string;
  sleepModeManager: SleepModeManager;
}

export const SleepModeIndicator: React.FC<SleepModeIndicatorProps> = ({
  workspaceId,
  sleepModeManager
}) => {
  const [status, setStatus] = useState<SleepModeStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = sleepModeManager.getSleepModeStatus(workspaceId);
      setStatus(currentStatus);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [workspaceId, sleepModeManager]);

  if (!status) {
    return null;
  }

  const getStatusColor = () => {
    if (status.isActive) {
      return '#4caf50';
    }
    return '#666666';
  };

  const getStatusIcon = () => {
    if (status.isActive) {
      return '👁️';
    }
    return '⏸️';
  };

  const getStatusText = () => {
    if (status.isActive) {
      return 'Actively Supervising';
    }
    return 'Supervision Disabled';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="sleep-mode-indicator">
      <div 
        className="indicator-main"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ borderColor: getStatusColor() }}
      >
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{getStatusText()}</span>
        <span className="expand-arrow">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="indicator-details">
          <div className="detail-section">
            <h4>Current Status</h4>
            <div className="status-info">
              <div className="info-item">
                <span className="label">Mode:</span>
                <span className="value">{status.isActive ? 'Active' : 'Disabled'}</span>
              </div>
              <div className="info-item">
                <span className="label">Workspace:</span>
                <span className="value">{workspaceId}</span>
              </div>
              <div className="info-item">
                <span className="label">Last Activity:</span>
                <span className="value">{status.lastActivity ? formatTime(status.lastActivity) : 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Start Time:</span>
                <span className="value">{status.startTime ? formatTime(status.startTime) : 'N/A'}</span>
              </div>
            </div></div>

          <div className="detail-section">
            <h4>Activity Metrics</h4>
            <div className="metrics-info">
              <div className="info-item">
                <span className="label">Changes Approved:</span>
                <span className="value">{status.changesApproved}</span>
              </div>
              <div className="info-item">
                <span className="label">Changes Rejected:</span>
                <span className="value">{status.changesRejected}</span>
              </div>
              <div className="info-item">
                <span className="label">Escalations Triggered:</span>
                <span className="value">{status.escalationsTriggered}</span>
              </div>
              <div className="info-item">
                <span className="label">Workspace:</span>
                <span className="value">{workspaceId}</span>
              </div>
            </div>
          </div>


          <div className="detail-section">
            <h4>Quick Actions</h4>
            <div className="action-buttons">
              {!status.isActive ? (
                <button 
                  className="action-button enable"
                  onClick={() => sleepModeManager.enableSleepMode(workspaceId, {
                    autonomyLevel: 'balanced',
                    thresholds: { codeQuality: 80, securityRisk: 20, performanceImpact: 30, testCoverage: 70 },
                    escalationRules: [],
                    maxChangesPerHour: 10,
                    autoCommit: false,
                    requiresHumanReview: true,
                    notificationChannels: ['push']
                  })}
                >
                  Enable Supervision
                </button>
              ) : (
                <button 
                  className="action-button disable"
                  onClick={() => sleepModeManager.disableSleepMode(workspaceId)}
                >
                  Disable Supervision
                </button>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
