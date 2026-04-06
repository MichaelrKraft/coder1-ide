'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { Run } from '@/lib/agent-hub/runs';
import { RunStatusChip } from './RunStatusChip';

interface Props {
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
}

function formatElapsed(startedAt: string, completedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const secs = Math.floor((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainder = secs % 60;
  return `${mins}m ${remainder}s`;
}

function formatCost(costCents: number): string {
  if (costCents === 0) return '$0.00';
  return `$${(costCents / 100).toFixed(2)}`;
}

const ACTIVE_STATUSES = new Set<Run['status']>(['running', 'awaiting_approval']);

export function RunList({ selectedRunId, onSelectRun }: Props): React.ReactElement {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/agent-hub/runs');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Run[];
      // Active runs first, then by startedAt desc
      const sorted = [...data].sort((a, b) => {
        const aActive = ACTIVE_STATUSES.has(a.status) ? 0 : 1;
        const bActive = ACTIVE_STATUSES.has(b.status) ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      });
      setRuns(sorted);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns]);

  // Poll every 10s when there are active runs
  useEffect(() => {
    const hasActive = runs.some((r) => ACTIVE_STATUSES.has(r.status));
    if (!hasActive) return;
    const interval = setInterval(() => { void fetchRuns(); }, 10000);
    return () => clearInterval(interval);
  }, [runs, fetchRuns]);

  if (loading) {
    return (
      <div className="p-4 text-text-secondary text-sm">Loading runs...</div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-400 text-sm">Error: {error}</div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="p-6 text-text-secondary text-sm text-center">
        No runs yet — run a task from the Tasks panel
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border overflow-y-auto">
      {runs.map((run) => (
        <button
          key={run.id}
          onClick={() => onSelectRun(run.id)}
          className={`w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors ${
            selectedRunId === run.id ? 'bg-surface-hover border-l-2 border-cyan-500' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <RunStatusChip status={run.status} />
            <span className="text-xs text-text-muted">
              {formatElapsed(run.startedAt, run.completedAt)}
            </span>
          </div>
          <div className="text-sm text-text-primary truncate">{run.taskId}</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-text-muted truncate">{run.model}</span>
            <span className="text-xs text-text-muted">{formatCost(run.costCents)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
