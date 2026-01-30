'use client';

import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Settings,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Bell,
  BellOff,
  CheckCircle,
} from 'lucide-react';
import SecurityScore from './SecurityScore';
import PermissionsList from './PermissionsList';
import AuditLog from './AuditLog';
import PromptInjectionAlertsList from './PromptInjectionAlert';
import {
  Johnny5SecurityState,
  Johnny5SecurityWarning,
} from '@/types/johnny5';

interface SecurityTabProps {
  security: Johnny5SecurityState;
  onUpdatePermission?: (id: string, status: 'allowed' | 'blocked' | 'risky') => void;
  onDismissWarning?: (id: string) => void;
  onDismissInjectionAlert?: (id: string) => void;
  onRefresh?: () => void;
  className?: string;
}

/**
 * SecurityTab Component
 *
 * Main security view for Johnny5 dashboard.
 * Key differentiator from competitors - provides full visibility into AI security.
 *
 * Features:
 * - Security Score gauge (0-100, color-coded)
 * - Active security warnings
 * - AI permissions management
 * - Full audit log with filtering
 * - Prompt injection detection alerts
 */
export default function SecurityTab({
  security,
  onUpdatePermission,
  onDismissWarning,
  onDismissInjectionAlert,
  onRefresh,
  className
}: SecurityTabProps) {
  const [showAllWarnings, setShowAllWarnings] = useState(false);

  // Calculate derived state
  const activeWarnings = useMemo(
    () => security.warnings.filter(w => !w.dismissed),
    [security.warnings]
  );

  const criticalWarnings = useMemo(
    () => activeWarnings.filter(w => w.severity === 'critical' || w.severity === 'high'),
    [activeWarnings]
  );

  const activeInjectionAlerts = useMemo(
    () => security.promptInjectionAlerts.filter(a => !a.blocked),
    [security.promptInjectionAlerts]
  );

  const riskyPermissions = useMemo(
    () => security.permissions.filter(p => p.status === 'risky'),
    [security.permissions]
  );

  // Format warning type
  const formatWarningType = (type: Johnny5SecurityWarning['type']): string => {
    switch (type) {
      case 'api_key_exposed':
        return 'API Key Exposure';
      case 'untrusted_source':
        return 'Untrusted Source';
      case 'permission_escalation':
        return 'Permission Escalation';
      case 'suspicious_activity':
        return 'Suspicious Activity';
      default:
        return 'Security Warning';
    }
  };

  // Get warning severity styling
  const getWarningSeverityStyle = (severity: Johnny5SecurityWarning['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-500/20',
          border: 'border-red-500/40',
          text: 'text-red-400',
          icon: <ShieldAlert className="w-4 h-4" />,
        };
      case 'high':
        return {
          bg: 'bg-orange-500/20',
          border: 'border-orange-500/40',
          text: 'text-orange-400',
          icon: <AlertTriangle className="w-4 h-4" />,
        };
      case 'medium':
        return {
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-500/40',
          text: 'text-yellow-400',
          icon: <AlertTriangle className="w-4 h-4" />,
        };
      case 'low':
        return {
          bg: 'bg-blue-500/20',
          border: 'border-blue-500/40',
          text: 'text-blue-400',
          icon: <Info className="w-4 h-4" />,
        };
    }
  };

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className={`h-full overflow-auto p-4 space-y-4 ${className || ''}`}>
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-coder1-cyan" />
          <h2 className="text-base font-bold text-text-primary">Security Monitor</h2>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-md bg-bg-tertiary hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-all"
              title="Refresh security status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            className="p-1.5 rounded-md bg-bg-tertiary hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-all"
            title="Security settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick status banner */}
      {security.scoreStatus === 'good' && activeWarnings.length === 0 ? (
        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <ShieldCheck className="w-5 h-5 text-green-400" />
          <div>
            <p className="text-sm font-medium text-green-400">All Systems Secure</p>
            <p className="text-xs text-text-muted">No security issues detected</p>
          </div>
        </div>
      ) : (
        criticalWarnings.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/40 rounded-lg animate-pulse">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">
                {criticalWarnings.length} Critical Issue{criticalWarnings.length > 1 ? 's' : ''} Detected
              </p>
              <p className="text-xs text-text-muted">Immediate attention required</p>
            </div>
          </div>
        )
      )}

      {/* Security Score */}
      <SecurityScore score={security.score} />

      {/* Active Warnings Section */}
      {activeWarnings.length > 0 && (
        <div className="bg-bg-tertiary rounded-xl overflow-hidden">
          <button
            onClick={() => setShowAllWarnings(!showAllWarnings)}
            className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-400" />
              <h3 className="text-sm font-semibold text-text-primary">Active Warnings</h3>
              <span className="text-xs text-text-muted">({activeWarnings.length})</span>
            </div>

            <div className="flex items-center gap-2">
              {criticalWarnings.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 rounded animate-pulse">
                  {criticalWarnings.length} critical
                </span>
              )}
              {showAllWarnings ? (
                <ChevronUp className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              )}
            </div>
          </button>

          {showAllWarnings && (
            <div className="px-4 pb-4 space-y-2">
              {activeWarnings.map((warning) => {
                const style = getWarningSeverityStyle(warning.severity);
                return (
                  <div
                    key={warning.id}
                    className={`
                      p-3 rounded-lg border
                      ${style.bg} ${style.border}
                      ${warning.severity === 'critical' ? 'animate-pulse-subtle' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={style.text}>{style.icon}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${style.text}`}>
                              {formatWarningType(warning.type)}
                            </span>
                            <span className="text-[10px] text-text-muted">
                              {formatRelativeTime(warning.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary mt-1">
                            {warning.message}
                          </p>
                          {warning.source && (
                            <p className="text-[10px] text-text-muted mt-1 font-mono">
                              Source: {warning.source}
                            </p>
                          )}
                        </div>
                      </div>

                      {onDismissWarning && (
                        <button
                          onClick={() => onDismissWarning(warning.id)}
                          className="p-1 rounded-md hover:bg-bg-tertiary transition-colors"
                          title="Dismiss warning"
                        >
                          <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Prompt Injection Alerts */}
      <PromptInjectionAlertsList
        alerts={security.promptInjectionAlerts}
        onDismiss={onDismissInjectionAlert}
      />

      {/* Permissions */}
      <PermissionsList
        permissions={security.permissions}
        onUpdatePermission={onUpdatePermission}
      />

      {/* Audit Log */}
      <AuditLog entries={security.auditLog} />

      {/* Security Tips */}
      <div className="bg-bg-tertiary rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-coder1-cyan" />
          <h3 className="text-sm font-semibold text-text-primary">Security Tips</h3>
        </div>

        <ul className="space-y-2 text-xs text-text-secondary">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
            <span>Johnny5 monitors all AI inputs for prompt injection attempts</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
            <span>All actions are logged in the audit trail for transparency</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
            <span>Risky permissions can be blocked to prevent unauthorized access</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
            <span>Security score updates in real-time based on detected threats</span>
          </li>
        </ul>
      </div>

      {/* CSS for subtle animations */}
      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
