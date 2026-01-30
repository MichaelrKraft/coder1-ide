'use client';

import React, { useState, useMemo } from 'react';
import {
  Hammer,
  GitPullRequest,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  ChevronDown,
  Shield,
  Info,
} from 'lucide-react';
import PRReviewCard from './PRReviewCard';
import { useJohnny5Store } from '@/stores/useJohnny5Store';
import { PROACTIVE_BUILDER_RULES } from '@/services/johnny5/proactive-builder';
import type { Johnny5PRRequest } from '@/types';

interface BuilderTabProps {
  className?: string;
}

type PRStatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'merged';

/**
 * BuilderTab - Main view for Johnny5 Proactive Builder
 *
 * Shows:
 * - Safety rules and limits display
 * - Pending PRs awaiting review
 * - PR history (approved, rejected, merged)
 * - Quick stats on builder activity
 */
export default function BuilderTab({ className }: BuilderTabProps) {
  const { pendingPRs, setPendingPRs, updatePRStatus, addActivityEntry } = useJohnny5Store();
  const [loading, setLoading] = useState(false);
  const [expandedPRId, setExpandedPRId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PRStatusFilter>('all');
  const [showRules, setShowRules] = useState(false);

  // Filter PRs by status
  const filteredPRs = useMemo(() => {
    if (statusFilter === 'all') return pendingPRs;
    return pendingPRs.filter((pr) => pr.status === statusFilter);
  }, [pendingPRs, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const pending = pendingPRs.filter((pr) => pr.status === 'pending').length;
    const approved = pendingPRs.filter((pr) => pr.status === 'approved').length;
    const rejected = pendingPRs.filter((pr) => pr.status === 'rejected').length;
    const merged = pendingPRs.filter((pr) => pr.status === 'merged').length;
    const todayPRs = pendingPRs.filter((pr) => {
      const prDate = new Date(pr.createdAt);
      const today = new Date();
      return prDate.toDateString() === today.toDateString();
    }).length;

    return { pending, approved, rejected, merged, todayPRs };
  }, [pendingPRs]);

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API fetch
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const handleApprove = (prId: string) => {
    updatePRStatus(prId, 'approved');
    addActivityEntry({
      id: `activity_${Date.now()}`,
      timestamp: new Date(),
      type: 'completed',
      taskId: prId,
      description: `Approved PR: ${pendingPRs.find((pr) => pr.id === prId)?.title}`,
    });
  };

  const handleReject = (prId: string) => {
    updatePRStatus(prId, 'rejected');
    addActivityEntry({
      id: `activity_${Date.now()}`,
      timestamp: new Date(),
      type: 'failed',
      taskId: prId,
      description: `Rejected PR: ${pendingPRs.find((pr) => pr.id === prId)?.title}`,
    });
  };

  const toggleExpand = (prId: string) => {
    setExpandedPRId(expandedPRId === prId ? null : prId);
  };

  const filterOptions: { value: PRStatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: pendingPRs.length },
    { value: 'pending', label: 'Pending', count: stats.pending },
    { value: 'approved', label: 'Approved', count: stats.approved },
    { value: 'rejected', label: 'Rejected', count: stats.rejected },
    { value: 'merged', label: 'Merged', count: stats.merged },
  ];

  return (
    <div className={`h-full flex flex-col ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Hammer className="w-4 h-4 text-coder1-cyan" />
          <h3 className="text-sm font-semibold text-text-primary">Proactive Builder</h3>
          {stats.pending > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 text-[10px] font-bold">
              {stats.pending} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRules(!showRules)}
            className="p-1.5 rounded-md text-text-muted hover:text-coder1-cyan hover:bg-bg-tertiary transition-all"
            title="View safety rules"
          >
            <Shield className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 rounded-md text-text-muted hover:text-coder1-cyan hover:bg-bg-tertiary transition-all disabled:opacity-50"
            title="Refresh PRs"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Safety Rules Panel (Collapsible) */}
      {showRules && (
        <div className="px-3 py-2 border-b border-border-default bg-bg-tertiary/50">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-coder1-cyan" />
            <span className="text-xs font-semibold text-text-primary">Safety Rules</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Limits */}
            <div>
              <p className="text-text-muted mb-1">Limits</p>
              <ul className="space-y-0.5 text-text-secondary">
                <li className="flex items-center gap-1">
                  <span className={stats.todayPRs >= PROACTIVE_BUILDER_RULES.maxPRsPerDay ? 'text-red-400' : 'text-green-400'}>
                    {stats.todayPRs}/{PROACTIVE_BUILDER_RULES.maxPRsPerDay}
                  </span>
                  PRs today
                </li>
                <li>Max {PROACTIVE_BUILDER_RULES.maxFilesPerPR} files/PR</li>
                <li>Max {PROACTIVE_BUILDER_RULES.maxLinesChanged} lines/PR</li>
                <li className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                  Tests required
                </li>
              </ul>
            </div>

            {/* Forbidden */}
            <div>
              <p className="text-text-muted mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                Never Allowed
              </p>
              <ul className="space-y-0.5 text-red-400/80">
                {PROACTIVE_BUILDER_RULES.forbidden.slice(0, 4).map((rule, i) => (
                  <li key={i} className="truncate">{rule}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border-default bg-bg-secondary/50">
        <StatBadge
          icon={Clock}
          value={stats.pending}
          label="Pending"
          color="text-yellow-400"
          bgColor="bg-yellow-400/10"
        />
        <StatBadge
          icon={CheckCircle2}
          value={stats.approved}
          label="Approved"
          color="text-green-400"
          bgColor="bg-green-400/10"
        />
        <StatBadge
          icon={XCircle}
          value={stats.rejected}
          label="Rejected"
          color="text-red-400"
          bgColor="bg-red-400/10"
        />
        <StatBadge
          icon={GitPullRequest}
          value={stats.merged}
          label="Merged"
          color="text-purple-400"
          bgColor="bg-purple-400/10"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-default">
        <Filter className="w-3.5 h-3.5 text-text-muted" />
        <div className="flex gap-1">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`
                px-2 py-1 rounded-md text-[10px] font-medium transition-all
                ${statusFilter === option.value
                  ? 'bg-coder1-cyan/20 text-coder1-cyan'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
                }
              `}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>
      </div>

      {/* PR List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredPRs.length === 0 ? (
          <EmptyState filter={statusFilter} />
        ) : (
          filteredPRs.map((pr) => (
            <PRReviewCard
              key={pr.id}
              pr={pr}
              isExpanded={expandedPRId === pr.id}
              onToggleExpand={() => toggleExpand(pr.id)}
              onApprove={pr.status === 'pending' ? handleApprove : undefined}
              onReject={pr.status === 'pending' ? handleReject : undefined}
            />
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 border-t border-border-default bg-bg-secondary/30">
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <Info className="w-3 h-3" />
          <span>
            Johnny5 creates feature branches and waits for your approval before any merge.
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface StatBadgeProps {
  icon: typeof Clock;
  value: number;
  label: string;
  color: string;
  bgColor: string;
}

function StatBadge({ icon: Icon, value, label, color, bgColor }: StatBadgeProps) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${bgColor}`}>
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-xs font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-text-muted">{label}</span>
    </div>
  );
}

interface EmptyStateProps {
  filter: PRStatusFilter;
}

function EmptyState({ filter }: EmptyStateProps) {
  const messages: Record<PRStatusFilter, { title: string; subtitle: string }> = {
    all: {
      title: 'No PRs yet',
      subtitle: 'Johnny5 will create PRs when opportunities are detected.',
    },
    pending: {
      title: 'No pending PRs',
      subtitle: 'All PRs have been reviewed.',
    },
    approved: {
      title: 'No approved PRs',
      subtitle: 'Approved PRs will appear here.',
    },
    rejected: {
      title: 'No rejected PRs',
      subtitle: 'Rejected PRs will appear here.',
    },
    merged: {
      title: 'No merged PRs',
      subtitle: 'Successfully merged PRs will appear here.',
    },
  };

  const message = messages[filter];

  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-8">
      <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mb-3">
        <GitPullRequest className="w-6 h-6 text-text-muted" />
      </div>
      <p className="text-sm font-medium text-text-primary">{message.title}</p>
      <p className="text-xs text-text-muted mt-1 max-w-[200px]">{message.subtitle}</p>
    </div>
  );
}
