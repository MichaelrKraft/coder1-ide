'use client';

import React from 'react';

// ============================================================================
// Types
// ============================================================================

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error' | 'offline';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  /** ISO timestamp shown as "Last synced Xm ago" when status is 'synced' */
  lastSyncedAt?: string;
  /** Shown on hover when status is 'error' */
  errorMessage?: string;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return 'just now';

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return `${Math.floor(diffHours / 24)}d ago`;
}

// ============================================================================
// Sub-components
// ============================================================================

function SpinnerIcon(): React.ReactElement {
  return (
    <svg
      className="w-3 h-3 animate-spin text-blue-500"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function Dot({ color }: { color: string }): React.ReactElement {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${color}`}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// Component
// ============================================================================

export function SyncStatusBadge({
  status,
  lastSyncedAt,
  errorMessage,
  className = '',
}: SyncStatusBadgeProps): React.ReactElement {
  const baseClass = 'inline-flex items-center gap-1.5 text-xs font-medium';

  if (status === 'syncing') {
    return (
      <span className={`${baseClass} text-blue-500 ${className}`} aria-label="Syncing">
        <SpinnerIcon />
        Syncing…
      </span>
    );
  }

  if (status === 'synced') {
    const label = lastSyncedAt ? `Last synced ${timeAgo(lastSyncedAt)}` : 'Synced';
    return (
      <span className={`${baseClass} text-green-500 ${className}`} aria-label={label}>
        <Dot color="bg-green-500" />
        {label}
      </span>
    );
  }

  if (status === 'pending') {
    return (
      <span className={`${baseClass} text-amber-500 ${className}`} aria-label="Pending sync">
        <Dot color="bg-amber-500" />
        Pending sync
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span
        className={`${baseClass} text-red-500 cursor-help ${className}`}
        aria-label="Sync failed"
        title={errorMessage ?? 'Sync failed'}
      >
        <Dot color="bg-red-500" />
        Sync failed
      </span>
    );
  }

  // offline
  return (
    <span className={`${baseClass} text-muted-foreground ${className}`} aria-label="Offline">
      <Dot color="bg-muted-foreground" />
      Offline
    </span>
  );
}
