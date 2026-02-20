'use client';

import React, { memo } from 'react';
import { GitPullRequest, ExternalLink, GitBranch, FileText } from 'lucide-react';
import type { TeamPullRequest } from '@/types/vcs';
import PRStatusBadge, { PRReviewBadge } from './PRStatusBadge';

interface PRCardProps {
  pr: TeamPullRequest;
}

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function PRCardComponent({ pr }: PRCardProps) {
  const diffSummary = `+${pr.additions} -${pr.deletions}`;

  return (
    <div className="bg-bg-tertiary rounded-lg p-3 space-y-2 hover:bg-bg-tertiary/80 transition-colors border border-transparent hover:border-border-default">
      {/* Header: Title + external link */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <GitPullRequest
            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
              pr.state === 'merged' ? 'text-purple-400' :
              pr.isDraft ? 'text-gray-400' :
              'text-green-400'
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-text-primary leading-tight truncate">
              {pr.isDraft && (
                <span className="text-[10px] text-gray-400 bg-gray-400/10 rounded px-1 py-0.5 mr-1.5 font-normal">
                  Draft
                </span>
              )}
              {pr.title}
            </h4>
            <p className="text-[11px] text-text-muted mt-0.5">
              {pr.repository.fullName}#{pr.number}
            </p>
          </div>
        </div>
        <a
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-coder1-cyan transition-colors p-0.5 flex-shrink-0"
          aria-label={`Open PR #${pr.number} on GitHub`}
          title="Open on GitHub"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Author + Branch */}
      <div className="flex items-center gap-2 text-[11px] text-text-muted">
        <div className="flex items-center gap-1">
          {pr.author.avatarUrl && (
            <img
              src={pr.author.avatarUrl}
              alt=""
              className="w-4 h-4 rounded-full"
              loading="lazy"
            />
          )}
          <span className="text-coder1-cyan">{pr.author.login}</span>
        </div>
        <span className="text-text-muted/40">|</span>
        <div className="flex items-center gap-1 min-w-0">
          <GitBranch className="w-3 h-3 flex-shrink-0" />
          <span className="font-mono truncate">{pr.headBranch}</span>
          <span className="text-text-muted/40">&rarr;</span>
          <span className="font-mono truncate">{pr.baseBranch}</span>
        </div>
      </div>

      {/* Status badges + metadata */}
      <div className="flex items-center gap-2 flex-wrap">
        <PRStatusBadge checksStatus={pr.checksStatus} />
        <PRReviewBadge reviewDecision={pr.reviewDecision} />

        {/* Diff stats */}
        <span className="text-[10px] text-text-muted ml-auto">
          <span className="text-green-400">+{pr.additions}</span>
          {' '}
          <span className="text-red-400">-{pr.deletions}</span>
        </span>

        {/* Changed files count */}
        {pr.changedFiles.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
            <FileText className="w-3 h-3" />
            {pr.changedFiles.length}
          </span>
        )}

        {/* Time */}
        <span className="text-[10px] text-text-muted/60 whitespace-nowrap">
          {timeAgo(pr.updatedAt)}
        </span>
      </div>

      {/* Reviewers */}
      {pr.reviewers.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <span>Reviewers:</span>
          {pr.reviewers.map(reviewer => (
            <span
              key={reviewer.login}
              className={`px-1 py-0.5 rounded ${
                reviewer.state === 'approved' ? 'bg-green-500/10 text-green-400' :
                reviewer.state === 'changes_requested' ? 'bg-orange-500/10 text-orange-400' :
                'bg-gray-500/10 text-gray-400'
              }`}
            >
              {reviewer.login}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Memoize to avoid re-renders when parent state changes
export default memo(PRCardComponent, (prev, next) => {
  return prev.pr.id === next.pr.id && prev.pr.updatedAt === next.pr.updatedAt;
});
