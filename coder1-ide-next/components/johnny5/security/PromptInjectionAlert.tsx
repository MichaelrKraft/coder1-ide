'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Shield,
  ShieldOff,
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  FileText,
  Terminal,
  Globe,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Bug,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Johnny5PromptInjectionAlert } from '@/types/johnny5';

interface PromptInjectionAlertCardProps {
  alert: Johnny5PromptInjectionAlert;
  onDismiss?: (id: string) => void;
  className?: string;
}

/**
 * PromptInjectionAlert Component
 *
 * Displays an alert card for suspicious patterns detected in inputs.
 * Shows the pattern, source, severity, and action taken.
 */
export function PromptInjectionAlertCard({
  alert,
  onDismiss,
  className
}: PromptInjectionAlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  // Get source icon
  const getSourceIcon = (source: Johnny5PromptInjectionAlert['source']) => {
    switch (source) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'file':
        return <FileText className="w-4 h-4" />;
      case 'terminal':
        return <Terminal className="w-4 h-4" />;
      case 'api':
        return <Globe className="w-4 h-4" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  // Get severity styling
  const getSeverityStyle = (severity: Johnny5PromptInjectionAlert['severity']) => {
    switch (severity) {
      case 'low':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          text: 'text-yellow-400',
          glow: 'shadow-[0_0_15px_rgba(234,179,8,0.15)]',
          label: 'Low Severity',
        };
      case 'medium':
        return {
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
          text: 'text-orange-400',
          glow: 'shadow-[0_0_15px_rgba(251,146,60,0.2)]',
          label: 'Medium Severity',
        };
      case 'high':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/40',
          text: 'text-red-400',
          glow: 'shadow-[0_0_20px_rgba(239,68,68,0.25)]',
          label: 'High Severity',
        };
    }
  };

  const severityStyle = getSeverityStyle(alert.severity);

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Truncate text
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div
      className={`
        rounded-xl border overflow-hidden transition-all duration-300
        ${severityStyle.bg} ${severityStyle.border} ${severityStyle.glow}
        ${alert.severity === 'high' ? 'animate-pulse-subtle' : ''}
        ${className || ''}
      `}
    >
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Alert icon with glow */}
            <div
              className={`
                p-2 rounded-lg ${severityStyle.bg} ${severityStyle.text}
                ${alert.severity === 'high' ? 'animate-pulse' : ''}
              `}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={`text-sm font-semibold ${severityStyle.text}`}>
                  Prompt Injection Detected
                </h4>
                <span
                  className={`
                    px-1.5 py-0.5 text-[10px] font-medium rounded
                    ${severityStyle.bg} ${severityStyle.text} ${severityStyle.border} border
                  `}
                >
                  {severityStyle.label}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1">
                {/* Source */}
                <span className="flex items-center gap-1 text-xs text-text-muted">
                  {getSourceIcon(alert.source)}
                  <span className="capitalize">{alert.source}</span>
                </span>

                {/* Timestamp */}
                <span className="flex items-center gap-1 text-xs text-text-muted">
                  <Clock className="w-3 h-3" />
                  {formatTimestamp(alert.timestamp)}
                </span>

                {/* Blocked status */}
                {alert.blocked ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <ShieldCheck className="w-3 h-3" />
                    Blocked
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <ShieldOff className="w-3 h-3" />
                    Not Blocked
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Expand/collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md hover:bg-bg-tertiary transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            )}
          </button>
        </div>

        {/* Pattern preview */}
        <div className="mt-3 p-2 bg-bg-tertiary/50 rounded-md">
          <div className="flex items-center gap-2 mb-1">
            <Bug className="w-3 h-3 text-text-muted" />
            <span className="text-[10px] font-medium text-text-muted uppercase">
              Detected Pattern
            </span>
          </div>
          <code className={`text-xs font-mono ${severityStyle.text}`}>
            {alert.pattern}
          </code>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Full suspicious text */}
          <div className="p-2 bg-bg-tertiary rounded-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-text-muted uppercase">
                Suspicious Content
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullText(!showFullText);
                }}
                className="flex items-center gap-1 text-[10px] text-coder1-cyan hover:underline"
              >
                {showFullText ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    Show all
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-text-secondary font-mono break-all">
              {showFullText ? alert.text : truncateText(alert.text, 150)}
            </p>
          </div>

          {/* Action taken */}
          <div className="p-2 bg-bg-tertiary rounded-md">
            <span className="text-[10px] font-medium text-text-muted uppercase">
              Action Taken
            </span>
            <p className="text-xs text-text-secondary mt-1">
              {alert.actionTaken}
            </p>
          </div>

          {/* Action buttons */}
          {onDismiss && !alert.blocked && (
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => onDismiss(alert.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium
                  bg-bg-tertiary hover:bg-bg-secondary border border-border-default rounded-lg transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark as Safe
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS for subtle pulse animation */}
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

// ============================================================================
// Alert List Component
// ============================================================================

interface PromptInjectionAlertsListProps {
  alerts: Johnny5PromptInjectionAlert[];
  onDismiss?: (id: string) => void;
  className?: string;
}

export default function PromptInjectionAlertsList({
  alerts,
  onDismiss,
  className
}: PromptInjectionAlertsListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Sort by severity and time
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const unblockedCount = alerts.filter(a => !a.blocked).length;
  const highSeverityCount = alerts.filter(a => a.severity === 'high').length;

  if (alerts.length === 0) {
    return (
      <div className={`bg-bg-tertiary rounded-xl p-4 ${className || ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-green-400" />
          <h3 className="text-sm font-semibold text-text-primary">Prompt Injection Monitor</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-400">
          <ShieldCheck className="w-4 h-4" />
          <span>No suspicious patterns detected</span>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Johnny5 is actively monitoring all inputs for prompt injection attempts.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-bg-tertiary rounded-xl overflow-hidden ${className || ''}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-5 h-5 ${highSeverityCount > 0 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`} />
          <h3 className="text-sm font-semibold text-text-primary">Prompt Injection Alerts</h3>
          <span className="text-xs text-text-muted">({alerts.length})</span>
        </div>

        <div className="flex items-center gap-2">
          {unblockedCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 rounded animate-pulse">
              {unblockedCount} unblocked
            </span>
          )}
          {highSeverityCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 rounded">
              {highSeverityCount} high severity
            </span>
          )}

          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </div>
      </button>

      {/* Alerts list */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-3">
          {sortedAlerts.map((alert) => (
            <PromptInjectionAlertCard
              key={alert.id}
              alert={alert}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
