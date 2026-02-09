'use client';

import React, { useMemo } from 'react';
import {
  Search, Pen, BarChart3, Target, Lightbulb, ClipboardList,
  Play, CheckCircle2, AlertCircle, Activity, Clock,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ActivityEntry {
  id: string;
  crewMember: string;
  action: 'started' | 'completed' | 'error';
  message: string;
  timestamp: Date;
}

interface LiveFeedProps {
  entries: ActivityEntry[];
  maxEntries?: number;
}

// ============================================================================
// Constants
// ============================================================================

const CREW_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  researcher: Search,
  writer: Pen,
  analyst: BarChart3,
  strategist: Target,
  brainstormer: Lightbulb,
  assistant: ClipboardList,
};

const CREW_DISPLAY_NAMES: Record<string, string> = {
  researcher: 'Researcher',
  writer: 'Writer',
  analyst: 'Analyst',
  strategist: 'Strategist',
  brainstormer: 'Brainstormer',
  assistant: 'Assistant',
};

const ACTION_CONFIG: Record<string, { bgColor: string; textColor: string; label: string }> = {
  started: {
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-400',
    label: 'Started',
  },
  completed: {
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400',
    label: 'Completed',
  },
  error: {
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
    label: 'Error',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimeAgo(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 10) {
    return 'Just now';
  }
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
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
  return `${diffDays}d ago`;
}

// ============================================================================
// Component
// ============================================================================

/**
 * LiveFeed - Real-time activity feed for Johnny5 Crew
 *
 * Displays a scrollable list of recent crew activity entries,
 * showing which crew member performed what action and when.
 */
export function LiveFeed({ entries, maxEntries = 20 }: LiveFeedProps) {
  const displayedEntries = useMemo(() => {
    // Sort by timestamp descending (most recent first) and limit
    return [...entries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxEntries);
  }, [entries, maxEntries]);

  if (displayedEntries.length === 0) {
    return (
      <div className="h-48 border-t border-border-default bg-bg-secondary/40 flex flex-col items-center justify-center">
        <Activity className="w-6 h-6 text-text-muted/50 mb-2" />
        <p className="text-xs text-text-muted">No crew activity yet</p>
        <p className="text-[10px] text-text-muted/70 mt-0.5">
          Activate a crew member to get started
        </p>
      </div>
    );
  }

  return (
    <div className="h-56 border-t border-border-default bg-bg-secondary/40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default/50">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-coder1-cyan" />
          <span className="text-xs font-medium text-text-secondary">Live Feed</span>
        </div>
        <span className="text-[10px] text-text-muted">
          {displayedEntries.length} {displayedEntries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Scrollable Entry List */}
      <div className="flex-1 overflow-y-auto">
        {displayedEntries.map((entry) => (
          <FeedEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Feed Entry Component
// ============================================================================

interface FeedEntryProps {
  entry: ActivityEntry;
}

function FeedEntry({ entry }: FeedEntryProps) {
  const Icon = CREW_ICON_MAP[entry.crewMember] || Activity;
  const crewName = CREW_DISPLAY_NAMES[entry.crewMember] || entry.crewMember;
  const actionConfig = ACTION_CONFIG[entry.action];
  const timeAgo = formatTimeAgo(entry.timestamp);

  return (
    <div className="flex items-start gap-2 px-3 py-2 hover:bg-bg-tertiary/50 transition-colors">
      {/* Crew Member Icon */}
      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-coder1-cyan/10 flex items-center justify-center mt-0.5">
        <Icon className="w-3.5 h-3.5 text-coder1-cyan" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Crew Member Name */}
          <span className="text-xs font-semibold text-text-primary">
            {crewName}
          </span>

          {/* Action Badge */}
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${actionConfig.bgColor} ${actionConfig.textColor}`}
          >
            {actionConfig.label}
          </span>
        </div>

        {/* Message */}
        <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">
          {entry.message}
        </p>
      </div>

      {/* Timestamp */}
      <div className="flex-shrink-0 flex items-center gap-1 text-[10px] text-text-muted">
        <Clock className="w-2.5 h-2.5" />
        <span>{timeAgo}</span>
      </div>
    </div>
  );
}

export default LiveFeed;
