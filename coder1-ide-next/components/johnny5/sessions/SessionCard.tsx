'use client';

import React from 'react';
import {
  Clock,
  Wrench,
  FileText,
  Coins,
  Brain,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import type { Johnny5SessionSummary } from '@/types';

interface SessionCardProps {
  session: Johnny5SessionSummary;
  isSelected: boolean;
  onSelect: (sessionId: string) => void;
}

/**
 * SessionCard - Individual session card for the Johnny5 Sessions tab
 *
 * Displays session summary information including:
 * - Name and status
 * - Time information (start time, duration)
 * - Key metrics (tool calls, tokens used, files modified)
 * - Thinking level indicator
 */
export default function SessionCard({ session, isSelected, onSelect }: SessionCardProps) {
  // Format time for display
  const formatTime = (date: Date): string => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format duration
  const formatDuration = (minutes?: number): string => {
    if (!minutes) return '--';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get status styling
  const getStatusStyles = () => {
    switch (session.status) {
      case 'active':
        return {
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
          bg: 'bg-coder1-cyan/20',
          text: 'text-coder1-cyan',
          border: 'border-coder1-cyan/40',
          label: 'Running',
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-3.5 h-3.5" />,
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          border: 'border-green-500/40',
          label: 'Completed',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          border: 'border-red-500/40',
          label: 'Error',
        };
      default:
        return {
          icon: null,
          bg: 'bg-gray-500/20',
          text: 'text-gray-400',
          border: 'border-gray-500/40',
          label: 'Unknown',
        };
    }
  };

  // Get thinking level indicator
  const getThinkingLevelStyles = () => {
    switch (session.thinkingLevel) {
      case 'high':
        return {
          bars: 3,
          color: 'bg-purple-400',
          label: 'Deep thinking',
        };
      case 'medium':
        return {
          bars: 2,
          color: 'bg-coder1-cyan',
          label: 'Moderate thinking',
        };
      case 'low':
        return {
          bars: 1,
          color: 'bg-green-400',
          label: 'Quick response',
        };
      default:
        return {
          bars: 1,
          color: 'bg-gray-400',
          label: 'Unknown',
        };
    }
  };

  const status = getStatusStyles();
  const thinking = getThinkingLevelStyles();

  return (
    <button
      onClick={() => onSelect(session.id)}
      className={`
        w-full text-left p-3 rounded-lg border transition-all duration-200
        hover:bg-bg-tertiary group
        ${isSelected
          ? 'bg-bg-tertiary border-coder1-cyan/50 shadow-[0_0_15px_rgba(0,217,255,0.15)]'
          : 'bg-bg-secondary/50 border-border-default hover:border-coder1-cyan/30'
        }
      `}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary truncate group-hover:text-coder1-cyan transition-colors">
            {session.name}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-text-muted">
              {formatDate(session.startTime)} at {formatTime(session.startTime)}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`
            flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            ${status.bg} ${status.text} border ${status.border}
          `}
        >
          {status.icon}
          <span>{status.label}</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="flex items-center gap-3 mt-3">
        {/* Duration */}
        <div className="flex items-center gap-1 text-xs text-text-muted" title="Duration">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDuration(session.duration)}</span>
        </div>

        {/* Tool Calls */}
        <div className="flex items-center gap-1 text-xs text-text-muted" title="Tool Calls">
          <Wrench className="w-3.5 h-3.5" />
          <span>{session.toolCalls}</span>
        </div>

        {/* Files Modified */}
        <div className="flex items-center gap-1 text-xs text-text-muted" title="Files Modified">
          <FileText className="w-3.5 h-3.5" />
          <span>{session.filesModified.length}</span>
        </div>

        {/* Tokens Used */}
        <div className="flex items-center gap-1 text-xs text-text-muted" title="Tokens Used">
          <Coins className="w-3.5 h-3.5" />
          <span>{session.tokensUsed.toLocaleString()}</span>
        </div>

        {/* Thinking Level Indicator */}
        <div
          className="flex items-center gap-1 ml-auto"
          title={`${thinking.label} (${session.thinkingLevel})`}
        >
          <Brain className="w-3.5 h-3.5 text-text-muted" />
          <div className="flex items-end gap-0.5 h-3">
            {[1, 2, 3].map((bar) => (
              <div
                key={bar}
                className={`
                  w-1 rounded-sm transition-all
                  ${bar <= thinking.bars ? thinking.color : 'bg-gray-600'}
                `}
                style={{ height: `${bar * 4}px` }}
              />
            ))}
          </div>
        </div>

        {/* Expand Arrow */}
        <ChevronRight
          className={`
            w-4 h-4 text-text-muted transition-transform
            ${isSelected ? 'rotate-90 text-coder1-cyan' : 'group-hover:translate-x-0.5'}
          `}
        />
      </div>
    </button>
  );
}
