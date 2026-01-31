'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Pencil,
  Terminal,
  Globe,
  GitPullRequest,
  ShieldOff,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Bot,
  ExternalLink,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Brain,
} from 'lucide-react';
import { Johnny5AuditEntry } from '@/types/johnny5';

type FilterType = 'all' | Johnny5AuditEntry['action'];
type RiskFilter = 'all' | Johnny5AuditEntry['risk'];
type SourceFilter = 'all' | Johnny5AuditEntry['source'];

interface AuditLogProps {
  entries: Johnny5AuditEntry[];
  className?: string;
  maxVisible?: number;
}

/**
 * AuditLog Component
 *
 * Displays a chronological log of AI actions with filtering capabilities.
 * Shows action type, target, source, risk level, and whether action was blocked.
 */
export default function AuditLog({ entries, className, maxVisible = 50 }: AuditLogProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [actionFilter, setActionFilter] = useState<FilterType>('all');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Get action icon and styling
  const getActionStyle = (action: Johnny5AuditEntry['action']) => {
    switch (action) {
      case 'file_read':
        return {
          icon: <FileText className="w-3.5 h-3.5" />,
          label: 'File Read',
          bg: 'bg-blue-500/20',
          text: 'text-blue-400',
        };
      case 'file_write':
        return {
          icon: <Pencil className="w-3.5 h-3.5" />,
          label: 'File Write',
          bg: 'bg-purple-500/20',
          text: 'text-purple-400',
        };
      case 'command_exec':
        return {
          icon: <Terminal className="w-3.5 h-3.5" />,
          label: 'Command',
          bg: 'bg-orange-500/20',
          text: 'text-orange-400',
        };
      case 'api_call':
        return {
          icon: <Globe className="w-3.5 h-3.5" />,
          label: 'API Call',
          bg: 'bg-cyan-500/20',
          text: 'text-coder1-cyan',
        };
      case 'pr_created':
        return {
          icon: <GitPullRequest className="w-3.5 h-3.5" />,
          label: 'PR Created',
          bg: 'bg-green-500/20',
          text: 'text-green-400',
        };
      case 'blocked':
        return {
          icon: <ShieldOff className="w-3.5 h-3.5" />,
          label: 'Blocked',
          bg: 'bg-red-500/20',
          text: 'text-red-400',
        };
      default:
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: 'Unknown',
          bg: 'bg-gray-500/20',
          text: 'text-gray-400',
        };
    }
  };

  // Get source icon
  const getSourceIcon = (source: Johnny5AuditEntry['source']) => {
    switch (source) {
      case 'user':
        return <User className="w-3 h-3" />;
      case 'ai':
        return <Bot className="w-3 h-3" />;
      case 'external':
        return <ExternalLink className="w-3 h-3" />;
      case 'scheduled':
        return <Calendar className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  // Get risk styling
  const getRiskStyle = (risk: Johnny5AuditEntry['risk']) => {
    switch (risk) {
      case 'low':
        return {
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          border: 'border-green-500/30',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-500/20',
          text: 'text-yellow-400',
          border: 'border-yellow-500/30',
        };
      case 'high':
        return {
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          border: 'border-red-500/30',
        };
    }
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }
    // Less than an hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    }
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    // More than a day
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (actionFilter !== 'all' && entry.action !== actionFilter) return false;
      if (riskFilter !== 'all' && entry.risk !== riskFilter) return false;
      if (sourceFilter !== 'all' && entry.source !== sourceFilter) return false;
      return true;
    }).slice(0, maxVisible);
  }, [entries, actionFilter, riskFilter, sourceFilter, maxVisible]);

  // Count stats
  const stats = useMemo(() => ({
    total: entries.length,
    blocked: entries.filter(e => e.blocked).length,
    highRisk: entries.filter(e => e.risk === 'high').length,
  }), [entries]);

  const actionOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All Actions' },
    { value: 'file_read', label: 'File Read' },
    { value: 'file_write', label: 'File Write' },
    { value: 'command_exec', label: 'Commands' },
    { value: 'api_call', label: 'API Calls' },
    { value: 'pr_created', label: 'PRs Created' },
    { value: 'blocked', label: 'Blocked' },
  ];

  const riskOptions: { value: RiskFilter; label: string }[] = [
    { value: 'all', label: 'All Risk' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  const sourceOptions: { value: SourceFilter; label: string }[] = [
    { value: 'all', label: 'All Sources' },
    { value: 'user', label: 'User' },
    { value: 'ai', label: 'AI' },
    { value: 'external', label: 'External' },
    { value: 'scheduled', label: 'Scheduled' },
  ];

  return (
    <div className={`bg-bg-tertiary rounded-xl overflow-hidden ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Clock className="w-5 h-5 text-coder1-cyan" />
          <h3 className="text-sm font-semibold text-text-primary">Audit Log</h3>
          <span className="text-xs text-text-muted">({stats.total})</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </button>

        <div className="flex items-center gap-2">
          {/* Quick stats */}
          {stats.blocked > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 rounded flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              {stats.blocked} blocked
            </span>
          )}
          {stats.highRisk > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-500/20 text-orange-400 rounded">
              {stats.highRisk} high risk
            </span>
          )}

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              p-1.5 rounded-md transition-all
              ${showFilters
                ? 'bg-coder1-cyan/20 text-coder1-cyan'
                : 'bg-bg-secondary text-text-muted hover:text-text-secondary'
              }
            `}
            title="Toggle filters"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && isExpanded && (
        <div className="p-3 border-b border-border-default bg-bg-secondary/50 flex flex-wrap gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as FilterType)}
            className="px-2 py-1 text-xs bg-bg-tertiary border border-border-default rounded-md text-text-secondary focus:outline-none focus:ring-1 focus:ring-coder1-cyan"
          >
            {actionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
            className="px-2 py-1 text-xs bg-bg-tertiary border border-border-default rounded-md text-text-secondary focus:outline-none focus:ring-1 focus:ring-coder1-cyan"
          >
            {riskOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
            className="px-2 py-1 text-xs bg-bg-tertiary border border-border-default rounded-md text-text-secondary focus:outline-none focus:ring-1 focus:ring-coder1-cyan"
          >
            {sourceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {(actionFilter !== 'all' || riskFilter !== 'all' || sourceFilter !== 'all') && (
            <button
              onClick={() => {
                setActionFilter('all');
                setRiskFilter('all');
                setSourceFilter('all');
              }}
              className="px-2 py-1 text-xs text-text-muted hover:text-text-secondary"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Log entries */}
      {isExpanded && (
        <div className="max-h-[400px] overflow-y-auto">
          {filteredEntries.length === 0 ? (
            <div className="p-4 text-center text-text-muted text-sm">
              {entries.length === 0 ? 'No audit entries yet' : 'No entries match filters'}
            </div>
          ) : (
            <div className="divide-y divide-border-default">
              {filteredEntries.map((entry) => {
                const actionStyle = getActionStyle(entry.action);
                const riskStyle = getRiskStyle(entry.risk);
                const isEntryExpanded = expandedEntryId === entry.id;

                return (
                  <div
                    key={entry.id}
                    className={`
                      p-3 transition-all cursor-pointer
                      ${isEntryExpanded ? 'bg-bg-secondary' : 'hover:bg-bg-secondary/30'}
                      ${entry.blocked ? 'border-l-2 border-l-red-500' : ''}
                    `}
                    onClick={() => setExpandedEntryId(isEntryExpanded ? null : entry.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Action icon */}
                      <div
                        className={`
                          p-1.5 rounded-md ${actionStyle.bg} ${actionStyle.text}
                          ${entry.action === 'blocked' ? 'animate-pulse' : ''}
                        `}
                      >
                        {actionStyle.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-xs font-medium ${actionStyle.text}`}>
                              {actionStyle.label}
                            </span>
                            {entry.blocked && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 rounded">
                                <XCircle className="w-3 h-3" />
                                Blocked
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Risk badge */}
                            <span
                              className={`
                                px-1.5 py-0.5 text-[10px] font-medium rounded border
                                ${riskStyle.bg} ${riskStyle.text} ${riskStyle.border}
                              `}
                            >
                              {entry.risk}
                            </span>

                            {/* Source icon */}
                            <span className="flex items-center gap-1 text-text-muted">
                              {getSourceIcon(entry.source)}
                            </span>

                            {/* Timestamp */}
                            <span className="text-[10px] text-text-muted">
                              {formatTimestamp(entry.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Target */}
                        <p className="text-xs text-text-secondary mt-1 font-mono truncate">
                          {entry.target}
                        </p>

                        {/* Expanded details */}
                        {isEntryExpanded && (
                          <div className="mt-3 pt-3 border-t border-border-default space-y-2">
                            {entry.reasoning && (
                              <div className="flex items-start gap-2">
                                <Brain className="w-3.5 h-3.5 text-purple-400 mt-0.5" />
                                <div>
                                  <span className="text-[10px] font-medium text-text-muted uppercase">
                                    Reasoning
                                  </span>
                                  <p className="text-xs text-text-secondary mt-0.5">
                                    {entry.reasoning}
                                  </p>
                                </div>
                              </div>
                            )}

                            {entry.blockReason && (
                              <div className="flex items-start gap-2">
                                <ShieldOff className="w-3.5 h-3.5 text-red-400 mt-0.5" />
                                <div>
                                  <span className="text-[10px] font-medium text-text-muted uppercase">
                                    Block Reason
                                  </span>
                                  <p className="text-xs text-red-400 mt-0.5">
                                    {entry.blockReason}
                                  </p>
                                </div>
                              </div>
                            )}

                            {entry.sessionId && (
                              <div className="text-[10px] text-text-muted">
                                Session: <span className="font-mono">{entry.sessionId}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load more indicator */}
          {entries.length > maxVisible && (
            <div className="p-3 text-center text-xs text-text-muted border-t border-border-default">
              Showing {filteredEntries.length} of {entries.length} entries
            </div>
          )}
        </div>
      )}
    </div>
  );
}
