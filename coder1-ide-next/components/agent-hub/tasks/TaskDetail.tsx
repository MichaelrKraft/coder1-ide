'use client';

import React, { useState } from 'react';
import { X, Play, Square, ExternalLink } from 'lucide-react';
import type { Task } from '@/lib/agent-hub/tasks';
import type { Agent } from '@/lib/agent-hub/agents';
import { PriorityChip } from './PriorityChip';
import { PreRunChecklist } from './PreRunChecklist';

interface TaskDetailProps {
  task: Task;
  agent: Agent | null;
  onClose: () => void;
  onTaskUpdated: () => void;
}

const STATUS_LABELS: Record<Task['status'], string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  cancelled: 'Cancelled',
};

export function TaskDetail({ task, agent, onClose, onTaskUpdated }: TaskDetailProps) {
  const [showChecklist, setShowChecklist] = useState(false);
  const [stopping, setStopping] = useState(false);

  const isRunning = task.status === 'in_progress';

  const handleRun = async () => {
    const res = await fetch(`/api/agent-hub/tasks/${task.id}/run`, { method: 'POST' });
    if (!res.ok) {
      const body = await res.json() as { error?: string };
      throw new Error(body.error ?? 'Failed to start run');
    }
    setShowChecklist(false);
    onTaskUpdated();
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

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-sm bg-bg-primary border-l border-border-default flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <h2 className="text-sm font-semibold text-text-primary">Task Detail</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <h3 className="text-base font-medium text-text-primary">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-text-muted mt-1">{task.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-text-muted mb-1">Status</p>
              <p className="text-text-secondary">{STATUS_LABELS[task.status]}</p>
            </div>
            <div>
              <p className="text-text-muted mb-1">Priority</p>
              <PriorityChip priority={task.priority} />
            </div>
            <div>
              <p className="text-text-muted mb-1">Agent</p>
              <p className="text-text-secondary">{agent?.name ?? task.agentId}</p>
            </div>
            <div>
              <p className="text-text-muted mb-1">Created</p>
              <p className="text-text-secondary">
                {new Date(task.createdAt).toLocaleDateString()}
              </p>
            </div>
            {task.startedAt && (
              <div>
                <p className="text-text-muted mb-1">Started</p>
                <p className="text-text-secondary">
                  {new Date(task.startedAt).toLocaleDateString()}
                </p>
              </div>
            )}
            {task.completedAt && (
              <div>
                <p className="text-text-muted mb-1">Completed</p>
                <p className="text-text-secondary">
                  {new Date(task.completedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {task.githubIssueUrl && (
            <a
              href={task.githubIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-coder1-cyan hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              GitHub Issue
            </a>
          )}

          {task.runIds.length > 0 && (
            <div>
              <p className="text-xs text-text-muted mb-2">Run History</p>
              <div className="space-y-1">
                {task.runIds.slice(-5).map((runId) => (
                  <p key={runId} className="text-xs font-mono text-text-muted truncate">
                    {runId}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-border-default flex gap-2">
          {isRunning ? (
            <button
              onClick={handleStop}
              disabled={stopping}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              {stopping ? 'Stopping…' : 'Stop'}
            </button>
          ) : (
            <button
              onClick={() => setShowChecklist(true)}
              disabled={!agent || agent.status === 'archived' || task.status === 'cancelled'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg bg-coder1-cyan text-bg-primary font-medium hover:bg-coder1-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Run
            </button>
          )}
        </div>
      </div>

      {showChecklist && agent && (
        <PreRunChecklist
          task={task}
          agent={agent}
          onConfirm={handleRun}
          onCancel={() => setShowChecklist(false)}
        />
      )}
    </>
  );
}
