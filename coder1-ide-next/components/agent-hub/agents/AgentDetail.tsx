'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Edit2,
  ChevronRight,
  Bot,
  Pause,
  Play,
  Brain,
  Search,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import AgentStatusChip from './AgentStatusChip';
import AgentForm from './AgentForm';
import CommandCenter from './CommandCenter';
import type { Agent } from '@/lib/agent-hub/agents';

/* ── Agent Memory Section ─────────────────────────── */

function AgentMemorySection({ agentId }: { agentId: string }) {
  const [memories, setMemories] = useState<{ id: string; summary: string; createdAt: string; runId?: string }[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMemories = (q?: string) => {
    setLoading(true);
    const url = q
      ? `/api/agent-hub/agents/${agentId}/memory?q=${encodeURIComponent(q)}`
      : `/api/agent-hub/agents/${agentId}/memory`;
    fetch(url)
      .then(r => r.json())
      .then(data => setMemories(data.memories || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMemories(); }, [agentId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemories(query);
  };

  const handleClear = async () => {
    if (!confirm('Clear all memory for this agent? This cannot be undone.')) return;
    await fetch(`/api/agent-hub/agents/${agentId}/memory`, { method: 'DELETE' });
    setMemories([]);
  };

  return (
    <section className="bg-bg-secondary border border-border-default rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-coder1-cyan" />
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Agent Memory
          </h3>
          <span className="text-[10px] text-text-muted">({memories.length})</span>
        </div>
        {memories.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search memories..."
            className="w-full pl-7 pr-2 py-1.5 bg-bg-tertiary border border-border-default rounded text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-2.5 py-1.5 bg-coder1-cyan/10 text-coder1-cyan text-xs rounded hover:bg-coder1-cyan/20 disabled:opacity-50"
        >
          {loading ? '...' : 'Search'}
        </button>
      </form>

      {memories.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-3">
          No memories yet. Memories are auto-generated after completed runs.
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {memories.map(m => (
            <div key={m.id} className="bg-bg-tertiary rounded p-2.5 text-xs">
              <p className="text-text-primary whitespace-pre-wrap line-clamp-4">{m.summary}</p>
              <p className="text-[10px] text-text-muted mt-1">
                {new Date(m.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Types ─────────────────────────────────────────── */

interface AgentStats {
  latestRun: {
    id: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    cost_cents: number;
    error_summary: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    cache_read_tokens: number | null;
  } | null;
  runActivity: { date: string; succeeded: number; failed: number }[];
  tasksByPriority: Record<string, number>;
  tasksByStatus: Record<string, number>;
  successRate: { total: number; succeeded: number };
  totalSpentCents: number;
  tokenUsage?: { input: number; output: number; cacheRead: number };
  stuckRun?: {
    runId: string;
    startedAt: string;
    lastActivity: string | null;
    minutesIdle: number;
  } | null;
  recentTasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
  }[];
}

interface Props {
  agentId: string;
  onClose: () => void;
  onAgentUpdated?: () => void;
}

/* ── Color maps ────────────────────────────────────── */

const RUN_STATUS_COLORS: Record<string, string> = {
  running: 'text-amber-400 bg-amber-400/10',
  approved: 'text-green-400 bg-green-400/10',
  completed: 'text-green-400 bg-green-400/10',
  failed: 'text-red-400 bg-red-400/10',
  awaiting_approval: 'text-blue-400 bg-blue-400/10',
  rejected: 'text-red-400 bg-red-400/10',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  done: 'bg-green-400',
  in_progress: 'bg-amber-400',
  in_review: 'bg-blue-400',
  backlog: 'bg-gray-500',
  todo: 'bg-gray-400',
  cancelled: 'bg-red-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

/* ── Helpers ───────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/* ── Mini bar chart (pure CSS) ─────────────────────── */

function MiniBarChart({
  data,
  title,
  subtitle,
}: {
  data: { label: string; value: number; color: string }[];
  title: string;
  subtitle: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-3 flex-1 min-w-0">
      <p className="text-xs font-semibold text-text-secondary">{title}</p>
      <p className="text-[10px] text-text-muted mb-3">{subtitle}</p>
      <div className="flex items-end gap-1 h-16">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-end h-full"
          >
            <div
              className="w-full rounded-sm min-h-[2px]"
              style={{
                height: `${(d.value / max) * 100}%`,
                backgroundColor: d.color,
              }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Success rate card ─────────────────────────────── */

function SuccessRateCard({
  total,
  succeeded,
}: {
  total: number;
  succeeded: number;
}) {
  const pct = total > 0 ? Math.round((succeeded / total) * 100) : 0;
  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-3 flex-1 min-w-0">
      <p className="text-xs font-semibold text-text-secondary">Success Rate</p>
      <p className="text-[10px] text-text-muted mb-3">
        {succeeded}/{total} runs
      </p>
      <div className="flex items-end h-16">
        <span className="text-2xl font-bold text-green-400">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className="h-full bg-green-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Teaching Session List ─────────────────────────── */

function TeachingSessionList({ agentId }: { agentId: string }) {
  const [sessions, setSessions] = useState<Array<{
    id: string;
    status: string;
    title: string | null;
    skillName: string | null;
    skillVersion: number;
    messageCount: number;
    createdAt: string;
  }>>([]);

  useEffect(() => {
    fetch(`/api/agent-hub/agents/${agentId}/teaching-sessions`)
      .then(r => r.json())
      .then(data => setSessions(data.sessions || []))
      .catch(() => {});
  }, [agentId]);

  if (sessions.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
        Teaching Sessions
      </p>
      <div className="space-y-1">
        {sessions.slice(0, 5).map(s => (
          <div key={s.id} className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${
                s.status === 'converted' ? 'bg-green-400' :
                s.status === 'active' ? 'bg-amber-400' :
                s.status === 'completed' ? 'bg-blue-400' :
                'bg-text-muted'
              }`} />
              <span className="text-text-primary">
                {s.skillName ? `${s.skillName} v${s.skillVersion}` : s.title || 'Untitled session'}
              </span>
            </div>
            <span className="text-text-muted">
              {s.messageCount} msgs
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────── */

export default function AgentDetail({
  agentId,
  onClose,
  onAgentUpdated,
}: Props) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [availableMcpServers, setAvailableMcpServers] = useState<string[]>([]);
  const [skillMaturity, setSkillMaturity] = useState<Record<string, { taught: boolean; maturity?: { level: string; version: number; totalRuns: number; successRate: number } }>>({});

  async function loadAgent() {
    setLoading(true);
    try {
      const res = await fetch(`/api/agent-hub/agents/${agentId}`);
      if (!res.ok) throw new Error('Not found');
      const data = (await res.json()) as { agent: Agent };
      setAgent(data.agent);
    } catch {
      setAgent(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const res = await fetch(`/api/agent-hub/agents/${agentId}/stats`);
      if (res.ok) {
        const data = (await res.json()) as AgentStats;
        setStats(data);
      }
    } catch {
      /* silent */
    }
  }

  async function loadMcpServers() {
    try {
      const res = await fetch('/api/agent-hub/mcp-servers');
      if (res.ok) {
        const data = (await res.json()) as { servers: { name: string }[] };
        setAvailableMcpServers(data.servers.map(s => s.name));
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    void loadAgent();
    void loadStats();
    void loadMcpServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  useEffect(() => {
    if (!agent?.id) return;
    fetch(`/api/agent-hub/agents/${agent.id}/skills/maturity`)
      .then(r => r.json())
      .then(data => setSkillMaturity(data.maturity || {}))
      .catch(() => {});
  }, [agent?.id]);

  async function handleArchive() {
    if (!confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    setArchiving(true);
    try {
      await fetch(`/api/agent-hub/agents/${agentId}`, { method: 'DELETE' });
      onClose();
    } catch {
      // Silent fail
    } finally {
      setArchiving(false);
      setConfirmArchive(false);
    }
  }

  async function handlePauseResume() {
    if (!agent) return;
    setPausing(true);
    try {
      const newStatus = agent.status === 'paused' ? 'idle' : 'paused';
      const res = await fetch(`/api/agent-hub/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json() as { agent: Agent };
        setAgent(data.agent);
        onAgentUpdated?.();
      }
    } catch {
      /* silent */
    } finally {
      setPausing(false);
    }
  }

  function handleSave(updated: Agent) {
    setAgent(updated);
    setShowEditForm(false);
    onAgentUpdated?.();
  }

  /* ── Loading / not-found states ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm p-8">
        Loading...
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm p-8">
        Agent not found.
      </div>
    );
  }

  /* ── Chart data ── */

  const runActivityData = (stats?.runActivity ?? []).map((r) => ({
    label: r.date,
    value: r.succeeded,
    color: '#22c55e',
  }));

  const priorityData = ['high', 'medium', 'low'].map((p) => ({
    label: p,
    value: stats?.tasksByPriority[p] ?? 0,
    color: PRIORITY_COLORS[p] ?? '#6b7280',
  }));

  const statusKeys = Object.keys(stats?.tasksByStatus ?? {});
  const statusData = statusKeys.map((s) => ({
    label: s,
    value: stats?.tasksByStatus[s] ?? 0,
    color:
      TASK_STATUS_COLORS[s]?.replace('bg-', '').replace('-400', '') ===
      'green'
        ? '#22c55e'
        : TASK_STATUS_COLORS[s]?.includes('amber')
          ? '#f59e0b'
          : TASK_STATUS_COLORS[s]?.includes('blue')
            ? '#3b82f6'
            : TASK_STATUS_COLORS[s]?.includes('red')
              ? '#ef4444'
              : '#6b7280',
  }));

  const latestRun = stats?.latestRun ?? null;

  /* ── Render ── */

  return (
    <div className="flex flex-col h-full bg-bg-primary text-text-primary overflow-hidden relative">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-coder1-cyan" />
          <div>
            <span className="text-sm font-semibold text-text-primary">{agent.name}</span>
            <span className="ml-2 text-xs text-text-muted">{agent.role}</span>
          </div>
          <AgentStatusChip status={agent.status} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditForm(true)}
            className="p-1.5 rounded hover:bg-bg-secondary text-text-muted hover:text-text-primary"
            title="Edit agent"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => void handlePauseResume()}
            disabled={pausing || agent.status === 'archived'}
            className="p-1.5 rounded hover:bg-bg-secondary text-text-muted hover:text-text-primary disabled:opacity-40"
            title={agent.status === 'paused' ? 'Resume agent' : 'Pause agent'}
          >
            {agent.status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded hover:bg-bg-secondary text-text-muted hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Edit form overlay ───────────────────────── */}
      {showEditForm && (
        <div className="absolute inset-0 z-20 bg-bg-primary overflow-y-auto p-4">
          <AgentForm
            agentId={agentId}
            onSave={handleSave}
            onClose={() => setShowEditForm(false)}
          />
        </div>
      )}

      {/* ── Command Center (chat) — takes all remaining height ── */}
      <div className="flex-1 min-h-0">
        <CommandCenter
          agentId={agent.id}
          agentName={agent.name}
          workspacePath={agent.workspacePath}
          systemPrompt={agent.systemPrompt}
        />
      </div>

      {/* ── Accordion: secondary info ───────────────── */}
      <div className="shrink-0 border-t border-border-default">
        <button
          onClick={() => setAccordionOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-bg-secondary"
        >
          <span>Agent Info</span>
          <ChevronRight className={`w-3 h-3 transition-transform ${accordionOpen ? 'rotate-90' : ''}`} />
        </button>

        {accordionOpen && (
          <div className="px-4 pb-4 space-y-3 max-h-72 overflow-y-auto">
            {/* Stuck run warning */}
            {stats?.stuckRun && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-[10px] text-amber-400">
                  Agent appears stuck — no activity for {stats.stuckRun.minutesIdle} minutes
                </p>
              </div>
            )}

            {/* Quick stats */}
            <div className="flex flex-wrap gap-4 text-xs text-text-muted">
              <span>Model: <span className="text-text-primary">{agent.model}</span></span>
              <span>Runs: <span className="text-text-primary">{stats?.successRate.total ?? 0}</span></span>
              <span>Cost: <span className="text-text-primary">${((stats?.totalSpentCents ?? 0) / 100).toFixed(2)}</span></span>
              <span>Last run: <span className="text-text-primary">{agent.lastRunAt ? relativeTime(agent.lastRunAt) : 'Never'}</span></span>
            </div>

            <AgentMemorySection agentId={agent.id} />
          </div>
        )}
      </div>
    </div>
  );
}

