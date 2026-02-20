'use client';

import React from 'react';
import type { TeamPullRequest } from '@/types/vcs';

interface PRStatusBadgeProps {
  checksStatus: TeamPullRequest['checksStatus'];
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; bgClass: string; textClass: string; dot: string }> = {
  success: {
    label: 'Passing',
    bgClass: 'bg-green-500/15',
    textClass: 'text-green-400',
    dot: 'bg-green-400',
  },
  failure: {
    label: 'Failing',
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-400',
    dot: 'bg-red-400',
  },
  pending: {
    label: 'Pending',
    bgClass: 'bg-yellow-500/15',
    textClass: 'text-yellow-400',
    dot: 'bg-yellow-400 animate-pulse',
  },
  neutral: {
    label: 'Neutral',
    bgClass: 'bg-gray-500/15',
    textClass: 'text-gray-400',
    dot: 'bg-gray-400',
  },
};

export default function PRStatusBadge({ checksStatus, size = 'sm' }: PRStatusBadgeProps) {
  if (!checksStatus) return null;

  const config = STATUS_CONFIG[checksStatus] ?? STATUS_CONFIG.neutral;
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgClass} ${config.textClass} ${sizeClasses}`}
      aria-label={`CI status: ${config.label}`}
      role="status"
    >
      <span className={`${dotSize} rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

interface PRReviewBadgeProps {
  reviewDecision: TeamPullRequest['reviewDecision'];
  size?: 'sm' | 'md';
}

const REVIEW_CONFIG: Record<string, { label: string; bgClass: string; textClass: string }> = {
  approved: {
    label: 'Approved',
    bgClass: 'bg-green-500/15',
    textClass: 'text-green-400',
  },
  changes_requested: {
    label: 'Changes',
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-400',
  },
  review_required: {
    label: 'Review needed',
    bgClass: 'bg-blue-500/15',
    textClass: 'text-blue-400',
  },
};

export function PRReviewBadge({ reviewDecision, size = 'sm' }: PRReviewBadgeProps) {
  if (!reviewDecision) return null;

  const config = REVIEW_CONFIG[reviewDecision] ?? REVIEW_CONFIG.review_required;
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.bgClass} ${config.textClass} ${sizeClasses}`}
      aria-label={`Review status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
