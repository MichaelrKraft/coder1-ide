'use client';

import React, { useEffect, useState } from 'react';
import AgentStatusChip from './AgentStatusChip';
import type { Agent } from '@/lib/agent-hub/agents';
import type { CronTask } from '@/lib/agent-hub/db';

interface AgentStats {
  successRate: { total: number; succeeded: number };
  totalSpentCents: number;
  latestRun: { status: string; cost_cents: number; error_summary: string | null } | null;
  stuckRun: { runId: string } | null;
}

interface Props {
  agent: Agent;
  selected: boolean;
  onSelect: (id: string) => void;
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function successRatePct(stats: AgentStats): string {
  if (stats.successRate.total === 0) return '—';
  return `${Math.round((stats.successRate.succeeded / stats.successRate.total) * 100)}%`;
}

const STATUS_BORDER: Record<Agent['status'], string> = {
  running: 'border-coder1-cyan/50',
  idle: 'border-border-default',
  error: 'border-red-500/40',
  archived: 'border-border-default opacity-50',
  paused: 'border-border-default opacity-70',
};

const MODEL_SHORT: Record<string, string> = {
  'claude-haiku-4-5': 'Haiku',
  'claude-sonnet-4-6': 'Sonnet',
  'claude-opus-4-6': 'Opus',
};

function CronTaskBadge({ agentId }: { agentId: string }): React.ReactElement | null {
  const [activeCount, setActiveCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/agent-hub/cron-tasks?agentId=${encodeURIComponent(agentId)}`)
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json() as { tasks: CronTask[] };
        if (!cancelled) {
          const count = data.tasks.filter(t => t.status === 'active').length;
          setActiveCount(count);
        }
      })
      .catch(() => { /* badge is non-critical */ });
    return () => { cancelled = true; };
  }, [agentId]);

  if (activeCount === 0) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-coder1-cyan/10 text-coder1-cyan border border-coder1-cyan/20"
      title={`${activeCount} scheduled cron task${activeCount !== 1 ? 's' : ''}`}
    >
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {activeCount}
    </span>
  );
}

export function AgentFleetCard({ agent, selected, onSelect }: Props): React.ReactElement {
  const [stats, setStats] = useState<AgentStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/agent-hub/agents/${agent.id}/stats`)
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json() as AgentStats;
        if (!cancelled && data.successRate) setStats(data);
      })
      .catch((err: unknown) => {
        console.warn(`[agent-hub] failed to load stats for agent ${agent.id}:`, err);
      });
    return () => {
      cancelled = true;
    };
  }, [agent.id]);

  const borderClass = STATUS_BORDER[agent.status] ?? 'border-border-default';
  const isStuck =
    agent.status === 'running' &&
    agent.lastRunAt != null &&
    Date.now() - new Date(agent.lastRunAt).getTime() > 30 * 60 * 1000;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(agent.id)}
      className={`
        w-full text-left rounded-lg border bg-bg-secondary p-3 transition-all
        hover:bg-bg-tertiary hover:border-coder1-cyan/30
        ${borderClass}
        ${selected ? 'ring-1 ring-coder1-cyan/60 border-coder1-cyan/50' : ''}
      `}
    >
      {/* Avatar + name row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Initials avatar */}
          <div className="w-7 h-7 rounded-full bg-coder1-cyan/20 border border-coder1-cyan/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-coder1-cyan">
              {(agent.name + '??').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-text-secondary truncate">{agent.name}</p>
              <CronTaskBadge agentId={agent.id} />
            </div>
            <p className="text-xs text-text-muted truncate">{agent.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isStuck && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"
              title="May be stuck"
            />
          )}
          <AgentStatusChip status={agent.status} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
        <div>
          <p className="text-xs text-text-muted">Model</p>
          <p className="text-xs text-text-secondary font-medium">
            {MODEL_SHORT[agent.model] ?? agent.model}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Last active</p>
          <p className="text-xs text-text-secondary">{relativeTime(agent.lastRunAt)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Success rate</p>
          <p className="text-xs text-text-secondary font-medium">
            {stats ? successRatePct(stats) : '…'}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Month spend</p>
          <p className="text-xs text-text-secondary font-medium">
            {stats ? `$${(stats.totalSpentCents / 100).toFixed(2)}` : '…'}
          </p>
        </div>
      </div>
    </button>
  );
}
