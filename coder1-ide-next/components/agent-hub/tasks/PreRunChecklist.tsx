'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import type { Task } from '@/lib/agent-hub/tasks';
import type { Agent } from '@/lib/agent-hub/agents';

interface CheckItem {
  label: string;
  status: 'ok' | 'error' | 'pending';
  detail?: string;
}

interface PreRunChecklistProps {
  task: Task;
  agent: Agent;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

function CheckRow({ item }: { item: CheckItem }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {item.status === 'ok' && <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />}
      {item.status === 'error' && <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
      {item.status === 'pending' && <Loader2 className="w-4 h-4 text-text-muted mt-0.5 shrink-0 animate-spin" />}
      <div>
        <p className="text-sm text-text-primary">{item.label}</p>
        {item.detail && <p className="text-xs text-text-muted mt-0.5">{item.detail}</p>}
      </div>
    </div>
  );
}

export function PreRunChecklist({ task, agent, onConfirm, onCancel }: PreRunChecklistProps) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const concurrentBlocked = agent.status === 'running' && agent.maxConcurrentRuns <= 1;

  const checks: CheckItem[] = [
    { label: 'Agent selected', status: 'ok', detail: agent.name },
    {
      label: 'Agent not running',
      status: concurrentBlocked ? 'error' : 'ok',
      detail: concurrentBlocked ? 'Agent is already running a task' : undefined,
    },
    {
      label: 'Agent not archived',
      status: agent.status === 'archived' ? 'error' : 'ok',
      detail: agent.status === 'archived' ? 'Agent is archived — cannot run tasks' : undefined,
    },
    { label: 'Bridge connection', status: 'pending', detail: 'Verified on run start' },
  ];

  const hasBlocker = checks.some((c) => c.status === 'error');

  const handleConfirm = async () => {
    setRunning(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed to start');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-primary border border-border-default rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">Pre-Run Checklist</h2>
          <button onClick={onCancel} className="text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-text-muted mb-4 truncate">
          Task: <span className="text-text-secondary">{task.title}</span>
        </p>

        <div className="divide-y divide-border-default">
          {checks.map((item) => (
            <CheckRow key={item.label} item={item} />
          ))}
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm rounded-lg border border-border-default text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={hasBlocker || running}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-coder1-cyan text-bg-primary font-medium hover:bg-coder1-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {running && <Loader2 className="w-3 h-3 animate-spin" />}
            Confirm Run
          </button>
        </div>
      </div>
    </div>
  );
}
