'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, MessageSquare, Activity, Send, Play, Square, Tag } from 'lucide-react';
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

  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.backlog;
  const priorityCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const isRunning = task.status === 'in_progress';

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl bg-bg-primary border-l border-border-default flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>Issues</span>
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
                Run this issue with <strong className="text-text-primary">{agent?.name ?? 'agent'}</strong>?
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
        </div>
      </div>
    </div>
  );
}
