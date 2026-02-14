'use client';

import React from 'react';
import {
  GitPullRequest,
  Clock,
  FileCode,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Brain,
  Lightbulb,
} from 'lucide-react';
import type { Johnny5PRRequest } from '@/types';

interface PRReviewCardProps {
  pr: Johnny5PRRequest;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onApprove?: (prId: string) => void;
  onReject?: (prId: string) => void;
  className?: string;
}

/**
 * PRReviewCard - Displays a pending PR for review
 *
 * Shows:
 * - PR title and status indicator
 * - Files changed and lines count
 * - Test status
 * - Johnny5's reasoning
 * - Approve/Reject buttons for pending PRs
 */
export default function PRReviewCard({
  pr,
  isExpanded = false,
  onToggleExpand,
  onApprove,
  onReject,
  className,
}: PRReviewCardProps) {
  const statusConfig = {
    pending: {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/30',
      icon: AlertCircle,
      label: 'Pending Review',
    },
    approved: {
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/30',
      icon: CheckCircle2,
      label: 'Approved',
    },
    rejected: {
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400/30',
      icon: XCircle,
      label: 'Rejected',
    },
    merged: {
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      borderColor: 'border-purple-400/30',
      icon: GitPullRequest,
      label: 'Merged',
    },
  };

  const config = statusConfig[pr.status];
  const StatusIcon = config.icon;

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}m ago`;
  };

  return (
    <div
      className={`
        rounded-lg border transition-all duration-200
        ${config.borderColor} ${config.bgColor}
        hover:border-opacity-50
        ${className || ''}
      `}
    >
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div className={`mt-0.5 ${config.color}`}>
            <StatusIcon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-text-primary truncate">
                {pr.title}
              </h4>
              {pr.url && (
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-coder1-cyan transition-colors"
                  title="Open in GitHub"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(pr.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <FileCode className="w-3 h-3" />
                {pr.files.length} files
              </span>
              <span className={pr.linesChanged > 200 ? 'text-yellow-400' : ''}>
                +{pr.linesChanged} lines
              </span>
              <span className={`flex items-center gap-1 ${pr.testsPass ? 'text-green-400' : 'text-red-400'}`}>
                {pr.testsPass ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Tests pass
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" />
                    Tests fail
                  </>
                )}
              </span>
            </div>

            {/* Status Badge */}
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bgColor} ${config.color}`}>
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </span>
            </div>
          </div>

          {/* Expand Button */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border-default/50 px-3 py-3 space-y-3">
          {/* Opportunity Section */}
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1">Opportunity Detected</p>
              <p className="text-xs text-text-muted">{pr.opportunity}</p>
            </div>
          </div>

          {/* Reasoning Section */}
          <div className="flex items-start gap-2">
            <Brain className="w-4 h-4 text-coder1-cyan mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1">Johnny5&apos;s Reasoning</p>
              <p className="text-xs text-text-muted">{pr.reasoning}</p>
            </div>
          </div>

          {/* Files Changed */}
          <div>
            <p className="text-xs font-medium text-text-secondary mb-1.5">Files Changed</p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {pr.files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-xs text-text-muted font-mono"
                >
                  <FileCode className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{file}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Branch */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Branch:</span>
            <code className="px-1.5 py-0.5 rounded bg-bg-tertiary text-coder1-cyan font-mono">
              {pr.branch}
            </code>
          </div>

          {/* Action Buttons (only for pending PRs) */}
          {pr.status === 'pending' && (onApprove || onReject) && (
            <div className="flex items-center gap-2 pt-2 border-t border-border-default/50">
              {onApprove && (
                <button
                  onClick={() => onApprove(pr.id)}
                  className="
                    flex-1 flex items-center justify-center gap-1.5
                    px-3 py-2 rounded-md
                    bg-green-500/20 text-green-400 border border-green-500/30
                    hover:bg-green-500/30 hover:border-green-500/50
                    transition-all text-xs font-medium
                  "
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </button>
              )}
              {onReject && (
                <button
                  onClick={() => onReject(pr.id)}
                  className="
                    flex-1 flex items-center justify-center gap-1.5
                    px-3 py-2 rounded-md
                    bg-red-500/20 text-red-400 border border-red-500/30
                    hover:bg-red-500/30 hover:border-red-500/50
                    transition-all text-xs font-medium
                  "
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
