'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';

interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  ownerId: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  dueDate?: string;
  taskIds: string[];
  progressPercent: number;
  turn: 'user' | 'claude' | 'done';
  createdAt: string;
  updatedAt: string;
}

interface GoalCardProps {
  goal: Goal;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function turnLabel(turn: string, status: string): string {
  if (turn === 'done' || status === 'completed') return 'Completed';
  if (turn === 'claude') return 'Claude is working...';
  return 'Needs your input';
}

function statusDot(turn: string, status: string): string {
  if (turn === 'done' || status === 'completed') return 'bg-gray-400';
  if (turn === 'claude') return 'bg-teal-400 animate-pulse';
  return 'bg-amber-400';
}

export default function GoalCard({ goal, isExpanded, onToggle }: GoalCardProps) {
  const dotClass = statusDot(goal.turn, goal.status);
  const label = turnLabel(goal.turn, goal.status);

  return (
    <div className="border border-border-default rounded-md bg-bg-secondary">
      <button
        onClick={() => onToggle(goal.id)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-tertiary transition-colors rounded-md"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
        )}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
        <span className="text-sm text-text-primary truncate flex-1">{goal.title}</span>
        <span className="flex items-center gap-1 text-xs text-text-muted flex-shrink-0">
          <Clock className="w-3 h-3" />
          {relativeTime(goal.updatedAt)}
        </span>
      </button>

      {goal.progressPercent > 0 && (
        <div className="px-3 pb-1">
          <div className="h-1 rounded-full bg-bg-tertiary overflow-hidden">
            <div
              className="h-full rounded-full bg-coder1-cyan transition-all"
              style={{ width: `${goal.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border-default">
          {goal.description && (
            <p className="text-xs text-text-secondary">{goal.description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {goal.taskIds.length > 0
                ? `${goal.taskIds.length} task${goal.taskIds.length === 1 ? '' : 's'} linked`
                : 'No tasks linked'}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">
              {goal.status}
            </span>
          </div>
          <p className="text-xs text-text-muted italic">{label}</p>
          <a
            href="/ide/agent-hub/goals"
            className="text-xs text-coder1-cyan hover:underline"
          >
            View in Agent Hub &rarr;
          </a>
        </div>
      )}
    </div>
  );
}
