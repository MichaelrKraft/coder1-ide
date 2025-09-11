/**
 * Supervision Alerts Component
 * 
 * Displays critical alerts from the walk-away supervision system
 */

'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle, Info, Pause, Play, Eye } from 'lucide-react';
import { SupervisionAlert, CriticalIssue } from '@/types/walk-away-supervision';

interface SupervisionAlertsProps {
  alerts: SupervisionAlert[];
  criticalIssues: CriticalIssue[];
  onDismissAlert: (alertId: string) => void;
  onPauseSession?: () => void;
  onResumeSession?: () => void;
  onReviewIssue?: (issue: CriticalIssue) => void;
  isSessionPaused?: boolean;
}

export default function SupervisionAlerts({
  alerts,
  criticalIssues,
  onDismissAlert,
  onPauseSession,
  onResumeSession,
  onReviewIssue,
  isSessionPaused = false
}: SupervisionAlertsProps) {
  const [minimized, setMinimized] = useState(false);

  // Don&apos;t render if no alerts or issues
  if (alerts.length === 0 && criticalIssues.length === 0) return null;

  const getAlertIcon = (type: SupervisionAlert['type']) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'info': return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getIssueIcon = (severity: CriticalIssue['severity']) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'medium': return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'low': return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getAlertStyles = (type: SupervisionAlert['type']) => {
    switch (type) {
      case 'critical': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'info': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    }
  };

  const getIssueStyles = (severity: CriticalIssue['severity']) => {
    switch (severity) {
      case 'high': return 'bg-red-500/10 border-red-500/30';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  if (minimized) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="bg-red-500 hover:bg-red-400 text-white px-3 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">
            {alerts.length + criticalIssues.length} Alert{alerts.length + criticalIssues.length !== 1 ? 's' : ''}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full space-y-3">
      {/* Active Alerts */}
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`border rounded-lg p-4 shadow-lg backdrop-blur-sm ${getAlertStyles(alert.type)}`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {getAlertIcon(alert.type)}
              <h3 className="font-medium text-sm">{alert.title}</h3>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setMinimized(true)}
                className="text-white/60 hover:text-white p-1"
                title="Minimize"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          <p className="text-sm opacity-90 mb-3">{alert.message}</p>
          
          {alert.actions && alert.actions.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {alert.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (action.action === 'pause' && onPauseSession) {
                      onPauseSession();
                    } else if (action.action === 'review' && criticalIssues.length > 0 && onReviewIssue) {
                      onReviewIssue(criticalIssues[0]);
                    } else if (action.action === 'ignore') {
                      onDismissAlert(alert.id);
                    }
                    if (action.callback) {
                      action.callback();
                    }
                  }}
                  className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Critical Issues Summary */}
      {criticalIssues.length > 0 && (
        <div className="bg-gray-900/90 border border-gray-700 rounded-lg p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="font-medium text-white">Supervision Issues ({criticalIssues.length})</h3>
            </div>
            <button
              onClick={() => setMinimized(true)}
              className="text-gray-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {criticalIssues.slice(0, 3).map((issue, index) => (
              <div
                key={issue.id}
                className={`border rounded p-3 ${getIssueStyles(issue.severity)}`}
              >
                <div className="flex items-start gap-2">
                  {getIssueIcon(issue.severity)}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm font-medium">{issue.title}</h4>
                    <p className="text-gray-300 text-xs mt-1 line-clamp-2">{issue.description}</p>
                    {issue.location && (
                      <p className="text-gray-400 text-xs mt-1">📍 {issue.location}</p>
                    )}
                  </div>
                  {onReviewIssue && (
                    <button
                      onClick={() => onReviewIssue(issue)}
                      className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      Review
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {criticalIssues.length > 3 && (
              <div className="text-center text-gray-400 text-xs py-2">
                +{criticalIssues.length - 3} more issue{criticalIssues.length - 3 !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Session Control */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
            {!isSessionPaused && onPauseSession && (
              <button
                onClick={onPauseSession}
                className="flex items-center gap-1 text-xs px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded transition-colors"
              >
                <Pause className="w-3 h-3" />
                Pause Session
              </button>
            )}
            
            {isSessionPaused && onResumeSession && (
              <button
                onClick={onResumeSession}
                className="flex items-center gap-1 text-xs px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors"
              >
                <Play className="w-3 h-3" />
                Resume Session
              </button>
            )}
            
            <button
              onClick={() => {
                // Dismiss all alerts
                alerts.forEach(alert => onDismissAlert(alert.id));
              }}
              className="flex items-center gap-1 text-xs px-3 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded transition-colors ml-auto"
            >
              Dismiss All
            </button>
          </div>
        </div>
      )}

      {/* Session Status Indicator */}
      {isSessionPaused && (
        <div className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2">
            <Pause className="w-4 h-4" />
            <span className="font-medium">Session Paused</span>
          </div>
          <p className="text-xs mt-1 opacity-90">
            Walk-away supervision is paused. Resume to continue monitoring.
          </p>
        </div>
      )}
    </div>
  );
}