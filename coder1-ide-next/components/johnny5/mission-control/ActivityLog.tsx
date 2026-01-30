'use client';

import React, { useMemo } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Plus,
  ShieldOff,
  Clock,
  Activity,
} from 'lucide-react';
import type { Johnny5ActivityEntry } from '@/types';

interface ActivityLogProps {
  entries: Johnny5ActivityEntry[];
  maxEntries?: number;
  className?: string;
  onTaskClick?: (taskId: string) => void;
}

/**
 * ActivityLog - Chronological activity feed for Mission Control
 *
 * Shows a timeline of task events:
 * - Task started
 * - Task completed
 * - Task failed
 * - Task created
 * - Task blocked
 */
export default function ActivityLog({
  entries,
  maxEntries = 50,
  className,
  onTaskClick,
}: ActivityLogProps) {
  const displayedEntries = useMemo(() => {
    return entries.slice(0, maxEntries);
  }, [entries, maxEntries]);

  if (displayedEntries.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-6 text-center ${className || ''}`}>
        <Activity className="w-8 h-8 text-text-muted/50 mb-2" />
        <p className="text-sm text-text-muted">No activity yet</p>
        <p className="text-xs text-text-muted/70 mt-1">
          Tasks will appear here as Johnny5 works
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className || ''}`}>
      {/* Timeline Line */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-border-default" />

      {/* Entries */}
      <div className="space-y-1">
        {displayedEntries.map((entry, index) => (
          <ActivityEntry
            key={entry.id}
            entry={entry}
            isFirst={index === 0}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      {/* Show more indicator */}
      {entries.length > maxEntries && (
        <div className="mt-3 text-center">
          <span className="text-xs text-text-muted">
            +{entries.length - maxEntries} more entries
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Activity Entry Component
// ============================================================================

interface ActivityEntryProps {
  entry: Johnny5ActivityEntry;
  isFirst: boolean;
  onTaskClick?: (taskId: string) => void;
}

function ActivityEntry({ entry, isFirst, onTaskClick }: ActivityEntryProps) {
  const config = getEntryConfig(entry.type);
  const timeAgo = formatTimeAgo(entry.timestamp);

  const handleClick = () => {
    onTaskClick?.(entry.taskId);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        group relative flex items-start gap-3 py-2 px-2 rounded-md
        transition-colors cursor-pointer
        hover:bg-bg-tertiary
      `}
    >
      {/* Timeline Dot */}
      <div
        className={`
          relative z-10 flex-shrink-0 w-6 h-6 rounded-full
          flex items-center justify-center
          ${config.bgColor} ${isFirst ? 'ring-2 ring-bg-secondary' : ''}
        `}
      >
        <config.icon className={`w-3 h-3 ${config.textColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-xs text-text-primary line-clamp-2 group-hover:text-coder1-cyan transition-colors">
          {entry.description}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-text-muted flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {timeAgo}
          </span>
          <span className={`text-[10px] font-medium ${config.textColor}`}>
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getEntryConfig(type: Johnny5ActivityEntry['type']): {
  icon: typeof Play;
  label: string;
  bgColor: string;
  textColor: string;
} {
  switch (type) {
    case 'started':
      return {
        icon: Play,
        label: 'Started',
        bgColor: 'bg-coder1-cyan/20',
        textColor: 'text-coder1-cyan',
      };
    case 'completed':
      return {
        icon: CheckCircle2,
        label: 'Completed',
        bgColor: 'bg-green-500/20',
        textColor: 'text-green-400',
      };
    case 'failed':
      return {
        icon: XCircle,
        label: 'Failed',
        bgColor: 'bg-red-500/20',
        textColor: 'text-red-400',
      };
    case 'created':
      return {
        icon: Plus,
        label: 'Created',
        bgColor: 'bg-purple-500/20',
        textColor: 'text-purple-400',
      };
    case 'blocked':
      return {
        icon: ShieldOff,
        label: 'Blocked',
        bgColor: 'bg-yellow-500/20',
        textColor: 'text-yellow-400',
      };
    default:
      return {
        icon: Activity,
        label: 'Activity',
        bgColor: 'bg-gray-500/20',
        textColor: 'text-gray-400',
      };
  }
}

function formatTimeAgo(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Format as date for older entries
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
