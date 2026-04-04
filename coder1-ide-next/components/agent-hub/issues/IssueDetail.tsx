'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, MessageSquare, Activity, Send, Play, Square, Tag, Clock, Calendar } from 'lucide-react';
import type { Task } from '@/lib/agent-hub/tasks';
import type { Agent } from '@/lib/agent-hub/agents';

interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
}

interface IssueDetailProps {
  task: Task;
  agent: Agent | null;
  onClose: () => void;
  onTaskUpdated: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  in_progress: { label: 'In Progress', dot: 'bg-amber-400' },
  in_review: { label: 'In Review', dot: 'bg-purple-400' },
  todo: { label: 'Todo', dot: 'bg-blue-400' },
  backlog: { label: 'Backlog', dot: 'bg-gray-500' },
  done: { label: 'Done', dot: 'bg-green-400' },
  cancelled: { label: 'Cancelled', dot: 'bg-red-400' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-text-muted' },
  medium: { label: 'Medium', color: 'text-yellow-400' },
  high: { label: 'High', color: 'text-red-400' },
};

const ALL_STATUSES: Task['status'][] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];
const ALL_PRIORITIES: Task['priority'][] = ['low', 'medium', 'high'];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SCHEDULE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function computeNextRun(type: string, time: string, day?: number): string {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  if (type === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (type === 'weekly' && day !== undefined) {
    const daysUntil = (day - next.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntil);
    if (next <= now) next.setDate(next.getDate() + 7);
  } else if (type === 'monthly' && day !== undefined) {
    next.setDate(day);
    if (next <= now) next.setMonth(next.getMonth() + 1);
  }
  return next.toISOString();
}

export function IssueDetail({ task, agent, onClose, onTaskUpdated }: IssueDetailProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [stopping, setStopping] = useState(false);
  const [showRunConfirm, setShowRunConfirm] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent-hub/tasks/${task.id}/comments`);
      const data = (await res.json()) as { comments: Comment[] };
      setComments(data.comments ?? []);
    } catch {
      // silently fail
    }
  }, [task.id]);

  useEffect(() => {
    fetchComments().catch(() => {});
  }, [fetchComments]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/agent-hub/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      setNewComment('');
      await fetchComments();
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    await fetch(`/api/agent-hub/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    onTaskUpdated();
  };

  const handlePriorityChange = async (priority: string) => {
    await fetch(`/api/agent-hub/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority }),
    });
    onTaskUpdated();
  };

  const handleRun = async () => {
    const res = await fetch(`/api/agent-hub/tasks/${task.id}/run`, { method: 'POST' });
    if (res.ok) {
      setShowRunConfirm(false);
      onTaskUpdated();
    }
  };

  const handleStop = async () => {
    if (!task.runIds.length) return;
    setStopping(true);
    try {
      const lastRunId = task.runIds[task.runIds.length - 1];
      await fetch(`/api/agent-hub/runs/${lastRunId}/stop`, { method: 'POST' });
      onTaskUpdated();
    } finally {
      setStopping(false);
    }
  };

  const handleScheduleChange = async (updates: {
    scheduleEnabled?: boolean;
    scheduleType?: string;
    scheduleTime?: string;
    scheduleDay?: number;
  }) => {
    const enabled = updates.scheduleEnabled ?? task.scheduleEnabled;
    const type = updates.scheduleType ?? task.scheduleType ?? 'daily';
    const time = updates.scheduleTime ?? task.scheduleTime ?? '09:00';
    const day = updates.scheduleDay ?? task.scheduleDay ?? undefined;

    let nextRunAt: string | null = null;
    if (enabled && time) {
      nextRunAt = computeNextRun(type, time, day);
    }

    await fetch(`/api/agent-hub/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleEnabled: enabled,
        scheduleType: type,
        scheduleTime: time,
        scheduleDay: updates.scheduleDay ?? task.scheduleDay,
        nextRunAt,
      }),
    });
    onTaskUpdated();
  };

  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.backlog;
  const priorityCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const isRunning = task.status === 'in_progress';

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl bg-bg-primary border-l border-border-default flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>Tasks</span>
          <span>/</span>
          <span className="text-text-primary font-medium truncate max-w-[300px]">
            {task.title}
          </span>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex min-h-0">
        {/* Left: Main content */}
        <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
          {/* Issue ID + title */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${statusCfg.dot}`} />
              <span className="text-xs text-text-muted font-mono">
                C1-{task.issueNumber ?? '?'}
              </span>
            </div>
            <h1 className="text-lg font-semibold text-text-primary">{task.title}</h1>
          </div>

          {/* Description */}
          {task.description && (
            <div className="text-sm text-text-secondary leading-relaxed">
              {task.description}
            </div>
          )}

          {/* Labels */}
          {task.labels.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-3 h-3 text-text-muted" />
              {task.labels.map((label) => (
                <span
                  key={label}
                  className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-coder1-cyan/10 text-coder1-cyan border border-coder1-cyan/20"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Actions bar */}
          <div className="flex gap-2">
            {isRunning ? (
              <button
                onClick={handleStop}
                disabled={stopping}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
              >
                <Square className="w-3 h-3" />
                {stopping ? 'Stopping...' : 'Stop'}
              </button>
            ) : (
              <button
                onClick={() => setShowRunConfirm(true)}
                disabled={!agent || agent.status === 'archived' || task.status === 'cancelled'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-coder1-cyan/10 border border-coder1-cyan/30 text-coder1-cyan hover:bg-coder1-cyan/20 disabled:opacity-40 transition-colors"
              >
                <Play className="w-3 h-3" />
                Run
              </button>
            )}
          </div>

          {/* Run confirmation */}
          {showRunConfirm && (
            <div className="bg-bg-secondary border border-border-default rounded-lg p-3 space-y-2">
              <p className="text-xs text-text-secondary">
                Run this task with <strong className="text-text-primary">{agent?.name ?? 'agent'}</strong>?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRunConfirm(false)}
                  className="px-3 py-1 text-xs rounded border border-border-default text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRun}
                  className="px-3 py-1 text-xs rounded bg-coder1-cyan text-bg-primary font-medium hover:bg-coder1-cyan/90 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}

          {/* Tabs: Comments / Activity */}
          <div className="border-t border-border-default pt-4">
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-1.5 text-xs font-medium pb-1 border-b-2 transition-colors ${
                  activeTab === 'comments'
                    ? 'text-coder1-cyan border-coder1-cyan'
                    : 'text-text-muted border-transparent hover:text-text-secondary'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                Comments ({comments.length})
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex items-center gap-1.5 text-xs font-medium pb-1 border-b-2 transition-colors ${
                  activeTab === 'activity'
                    ? 'text-coder1-cyan border-coder1-cyan'
                    : 'text-text-muted border-transparent hover:text-text-secondary'
                }`}
              >
                <Activity className="w-3 h-3" />
                Activity
              </button>
            </div>

            {activeTab === 'comments' && (
              <div className="space-y-3">
                {comments.length === 0 && (
                  <p className="text-xs text-text-muted/50 italic">No comments yet</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="bg-bg-secondary rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-text-muted font-medium">
                        {c.userId === 'system' ? 'System' : 'You'}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {formatTimestamp(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">{c.content}</p>
                  </div>
                ))}

                {/* Add comment */}
                <div className="flex gap-2">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment().catch(() => {});
                      }
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
                  />
                  <button
                    onClick={() => { handleAddComment().catch(() => {}); }}
                    disabled={submitting || !newComment.trim()}
                    className="px-3 py-2 rounded-lg bg-coder1-cyan/10 border border-coder1-cyan/30 text-coder1-cyan hover:bg-coder1-cyan/20 disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-2">
                {task.runIds.length === 0 && (
                  <p className="text-xs text-text-muted/50 italic">No activity yet</p>
                )}
                {task.runIds.slice(-10).reverse().map((runId) => (
                  <div key={runId} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-coder1-cyan/50" />
                    <span className="text-text-muted font-mono truncate">{runId}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Properties sidebar */}
        <div className="w-[200px] shrink-0 border-l border-border-default px-4 py-4 space-y-4 overflow-y-auto">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
            Properties
          </p>

          {/* Status */}
          <div>
            <p className="text-[10px] text-text-muted mb-1">Status</p>
            <select
              value={task.status}
              onChange={(e) => { handleStatusChange(e.target.value).catch(() => {}); }}
              className="w-full bg-bg-secondary border border-border-default rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_CONFIG[s]?.label ?? s}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <p className="text-[10px] text-text-muted mb-1">Priority</p>
            <select
              value={task.priority}
              onChange={(e) => { handlePriorityChange(e.target.value).catch(() => {}); }}
              className="w-full bg-bg-secondary border border-border-default rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50"
            >
              {ALL_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_CONFIG[p]?.label ?? p}
                </option>
              ))}
            </select>
          </div>

          {/* Labels */}
          {task.labels.length > 0 && (
            <div>
              <p className="text-[10px] text-text-muted mb-1">Labels</p>
              <div className="flex flex-wrap gap-1">
                {task.labels.map((l) => (
                  <span
                    key={l}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-bg-tertiary text-text-secondary"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Assignee */}
          <div>
            <p className="text-[10px] text-text-muted mb-1">Assignee</p>
            <p className={`text-xs ${agent ? 'text-text-secondary' : 'text-text-muted italic'}`}>
              {agent?.name ?? 'Unassigned'}
            </p>
          </div>

          {/* Dates */}
          {task.startedAt && (
            <div>
              <p className="text-[10px] text-text-muted mb-1">Started</p>
              <p className="text-xs text-text-secondary">{formatDate(task.startedAt)}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] text-text-muted mb-1">Created</p>
            <p className="text-xs text-text-secondary">{formatDate(task.createdAt)}</p>
          </div>

          {task.completedAt && (
            <div>
              <p className="text-[10px] text-text-muted mb-1">Completed</p>
              <p className="text-xs text-text-secondary">{formatDate(task.completedAt)}</p>
            </div>
          )}

          {/* Schedule */}
          <div className="border-t border-border-default pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3 h-3 text-text-muted" />
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
                Schedule
              </p>
            </div>

            {/* Enable toggle */}
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <button
                type="button"
                role="switch"
                aria-checked={task.scheduleEnabled}
                onClick={() => { handleScheduleChange({ scheduleEnabled: !task.scheduleEnabled }).catch(() => {}); }}
                className={`relative w-7 h-4 rounded-full transition-colors ${
                  task.scheduleEnabled ? 'bg-coder1-cyan' : 'bg-bg-tertiary border border-border-default'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                    task.scheduleEnabled ? 'translate-x-3' : ''
                  }`}
                />
              </button>
              <span className="text-xs text-text-secondary">
                {task.scheduleEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>

            {task.scheduleEnabled && (
              <div className="space-y-2">
                {/* Frequency */}
                <div>
                  <p className="text-[10px] text-text-muted mb-1">Frequency</p>
                  <select
                    value={task.scheduleType ?? 'daily'}
                    onChange={(e) => { handleScheduleChange({ scheduleType: e.target.value }).catch(() => {}); }}
                    className="w-full bg-bg-secondary border border-border-default rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50"
                  >
                    {SCHEDULE_TYPES.map((st) => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                  </select>
                </div>

                {/* Time */}
                <div>
                  <p className="text-[10px] text-text-muted mb-1">Time</p>
                  <input
                    type="time"
                    value={task.scheduleTime ?? '09:00'}
                    onChange={(e) => { handleScheduleChange({ scheduleTime: e.target.value }).catch(() => {}); }}
                    className="w-full bg-bg-secondary border border-border-default rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50"
                  />
                </div>

                {/* Day picker - Weekly */}
                {task.scheduleType === 'weekly' && (
                  <div>
                    <p className="text-[10px] text-text-muted mb-1">Day of Week</p>
                    <select
                      value={task.scheduleDay ?? 1}
                      onChange={(e) => { handleScheduleChange({ scheduleDay: Number(e.target.value) }).catch(() => {}); }}
                      className="w-full bg-bg-secondary border border-border-default rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50"
                    >
                      {DAYS_OF_WEEK.map((day, i) => (
                        <option key={i} value={i}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Day picker - Monthly */}
                {task.scheduleType === 'monthly' && (
                  <div>
                    <p className="text-[10px] text-text-muted mb-1">Day of Month</p>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={task.scheduleDay ?? 1}
                      onChange={(e) => { handleScheduleChange({ scheduleDay: Number(e.target.value) }).catch(() => {}); }}
                      className="w-full bg-bg-secondary border border-border-default rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50"
                    />
                  </div>
                )}

                {/* Next run */}
                {task.nextRunAt && (
                  <div>
                    <p className="text-[10px] text-text-muted mb-1">Next Run</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-coder1-cyan" />
                      <p className="text-xs text-coder1-cyan">{formatTimestamp(task.nextRunAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
