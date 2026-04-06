'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Edit2,
  Archive,
  ChevronRight,
  Bot,
  ListPlus,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Pause,
  Play,
  Brain,
  Search,
  Trash2,
  Hash,
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
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [availableMcpServers, setAvailableMcpServers] = useState<string[]>([]);

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
    <div className="flex flex-col h-full">
      {/* Breadcrumb header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <button onClick={onClose} className="hover:text-text-secondary">
            Agents
          </button>
          <ChevronRight size={12} />
          <span className="text-text-secondary">{agent.name}</span>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-secondary"
        >
          <X size={16} />
        </button>
      </div>

      {/* 50/50 split */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Command Center */}
        <div className="w-1/2 border-r border-border-default">
          <CommandCenter
            agentId={agent.id}
            agentName={agent.name}
            workspacePath={agent.workspacePath}
            systemPrompt={agent.systemPrompt}
          />
        </div>

        {/* Right: Stats & Analytics (scrollable) */}
        <div className="w-1/2 overflow-y-auto px-5 py-4 space-y-5">
          {/* Stuck run warning */}
          {stats?.stuckRun && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-400">Agent appears stuck</p>
                <p className="text-[10px] text-text-muted">
                  No activity for {stats.stuckRun.minutesIdle} minutes (run {stats.stuckRun.runId.slice(0, 8)})
                </p>
              </div>
            </div>
          )}

          {/* Agent identity + actions */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-bg-tertiary border border-border-default flex items-center justify-center shrink-0">
                <Bot size={20} className="text-text-muted" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-text-secondary truncate">
                    {agent.name}
                  </h2>
                  <AgentStatusChip status={agent.status} />
                </div>
                <p className="text-xs text-text-muted truncate">{agent.role}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0 ml-3">
              <button
                onClick={() => void handlePauseResume()}
                disabled={pausing || agent.status === 'archived'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  agent.status === 'paused'
                    ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                } disabled:opacity-40`}
              >
                {agent.status === 'paused' ? <Play size={12} /> : <Pause size={12} />}
                {agent.status === 'paused' ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={() => setShowEditForm(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-bg-tertiary hover:bg-bg-secondary text-text-secondary text-xs font-medium border border-border-default transition-colors"
              >
                <Edit2 size={12} />
                Edit
              </button>
              <button
                onClick={() =>
                  (window.location.href = '/ide/agent-hub/tasks')
                }
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-bg-tertiary hover:bg-bg-secondary text-text-secondary text-xs font-medium border border-border-default transition-colors"
              >
                <ListPlus size={12} />
                Assign Task
              </button>
              <button
                onClick={() => void handleArchive()}
                disabled={archiving || agent.status === 'archived'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  confirmArchive
                    ? 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
                    : 'bg-bg-tertiary hover:bg-bg-secondary text-text-muted border-border-default'
                } disabled:opacity-40`}
              >
                <Archive size={12} />
                {confirmArchive ? 'Confirm' : 'Archive'}
              </button>
              {confirmArchive && (
                <button
                  onClick={() => setConfirmArchive(false)}
                  className="text-xs text-text-muted underline"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Stat summary row */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard
              icon={<CheckCircle2 size={14} className="text-green-400" />}
              label="Total Runs"
              value={String(stats?.successRate.total ?? 0)}
            />
            <StatCard
              icon={<DollarSign size={14} className="text-amber-400" />}
              label="Total Spent"
              value={`$${((stats?.totalSpentCents ?? 0) / 100).toFixed(2)}`}
            />
            <StatCard
              icon={<Hash size={14} className="text-purple-400" />}
              label="Total Tokens"
              value={formatTokens(
                (stats?.tokenUsage?.input ?? 0) +
                (stats?.tokenUsage?.output ?? 0) +
                (stats?.tokenUsage?.cacheRead ?? 0)
              )}
            />
            <StatCard
              icon={<Clock size={14} className="text-blue-400" />}
              label="Last Run"
              value={
                agent.lastRunAt ? relativeTime(agent.lastRunAt) : 'Never'
              }
            />
          </div>

          {/* Latest run */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <Label>Latest Run</Label>
              {latestRun && (
                <span className="text-[10px] text-text-muted hover:text-text-secondary cursor-pointer flex items-center gap-0.5">
                  View details <ChevronRight size={10} />
                </span>
              )}
            </div>
            {latestRun ? (
              <div className="bg-bg-secondary border border-border-default rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${RUN_STATUS_COLORS[latestRun.status] ?? 'text-text-muted bg-bg-tertiary'}`}
                    >
                      {latestRun.status === 'approved' ||
                      latestRun.status === 'completed'
                        ? 'succeeded'
                        : latestRun.status}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">
                      {latestRun.id.slice(0, 8)}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted">
                    {relativeTime(latestRun.started_at)}
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  {latestRun.error_summary
                    ? latestRun.error_summary
                    : 'No errors. Clean run.'}
                </p>
                {latestRun.cost_cents > 0 && (
                  <p className="text-[10px] text-text-muted mt-1">
                    Cost: ${(latestRun.cost_cents / 100).toFixed(2)}
                  </p>
                )}
                {(latestRun.input_tokens || latestRun.output_tokens || latestRun.cache_read_tokens) && (
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Input: {formatTokens(latestRun.input_tokens ?? 0)} | Output: {formatTokens(latestRun.output_tokens ?? 0)} | Cache: {formatTokens(latestRun.cache_read_tokens ?? 0)}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-bg-secondary border border-border-default rounded-lg p-3">
                <p className="text-xs text-text-muted">No runs yet.</p>
              </div>
            )}
          </section>

          {/* Charts grid */}
          <section>
            <Label>Analytics</Label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <MiniBarChart
                data={
                  runActivityData.length > 0
                    ? runActivityData
                    : [{ label: 'No data', value: 0, color: '#22c55e' }]
                }
                title="Run Activity"
                subtitle="Last 14 days"
              />
              <SuccessRateCard
                total={stats?.successRate.total ?? 0}
                succeeded={stats?.successRate.succeeded ?? 0}
              />
              <MiniBarChart
                data={
                  priorityData.some((d) => d.value > 0)
                    ? priorityData
                    : [{ label: 'No tasks', value: 0, color: '#6b7280' }]
                }
                title="Tasks by Priority"
                subtitle="high / medium / low"
              />
              <MiniBarChart
                data={
                  statusData.length > 0
                    ? statusData
                    : [{ label: 'No tasks', value: 0, color: '#6b7280' }]
                }
                title="Tasks by Status"
                subtitle={statusKeys.join(' / ') || 'none'}
              />
            </div>
          </section>

          {/* Recent tasks */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <Label>Recent Tasks</Label>
              <button
                onClick={() =>
                  (window.location.href = '/ide/agent-hub/tasks')
                }
                className="text-[10px] text-text-muted hover:text-text-secondary flex items-center gap-0.5"
              >
                See all <ChevronRight size={10} />
              </button>
            </div>
            {(stats?.recentTasks ?? []).length > 0 ? (
              <div className="bg-bg-secondary border border-border-default rounded-lg divide-y divide-border-default">
                {stats!.recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${TASK_STATUS_COLORS[task.status] ?? 'bg-gray-500'}`}
                      />
                      <span className="text-xs text-text-secondary truncate">
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted shrink-0 ml-2">
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-bg-secondary border border-border-default rounded-lg p-3">
                <p className="text-xs text-text-muted">No tasks yet.</p>
              </div>
            )}
          </section>

          {/* Agent metadata (collapsed section) */}
          <section>
            <Label>Configuration</Label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Model" value={agent.model} />
              <Field
                label="Max Concurrent Runs"
                value={String(agent.maxConcurrentRuns)}
              />
              <Field
                label="Monthly Budget"
                value={
                  agent.monthlyBudgetCents === 0
                    ? 'No limit'
                    : `$${(agent.monthlyBudgetCents / 100).toFixed(2)}`
                }
              />
              <Field
                label="Workspace"
                value={agent.workspacePath}
              />
            </div>
            {/* Telegram Status */}
            <div className="flex items-center gap-2 text-xs mt-3">
              <span className="text-text-muted">Telegram:</span>
              {agent.telegramChatId ? (
                <span className="text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Connected (Chat: {agent.telegramChatId})
                </span>
              ) : (
                <span className="text-text-muted">Not configured</span>
              )}
            </div>
          </section>

          {/* Tools */}
          <section>
            <Label>Tools</Label>
            <div className="bg-bg-secondary border border-border-default rounded-lg p-3 space-y-3">
              {/* MCP Servers */}
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  MCP Servers
                </p>
                {agent.mcpServers && agent.mcpServers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {agent.mcpServers.map(server => {
                      const isMissing = !availableMcpServers.includes(server);
                      return (
                        <span
                          key={server}
                          className={`px-2 py-0.5 text-[10px] rounded-full border ${
                            isMissing
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-coder1-cyan/10 text-coder1-cyan border-coder1-cyan/30'
                          }`}
                          title={isMissing ? 'Not found in ~/.mcp.json' : ''}
                        >
                          {server}{isMissing ? ' (missing)' : ''}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">None configured</p>
                )}
              </div>

              {/* Skills */}
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Skills
                </p>
                {agent.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {agent.skills.map(skill => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 text-[10px] rounded-full bg-bg-tertiary text-text-muted border border-border-default"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">None configured</p>
                )}
              </div>

              {/* Edit button */}
              <button
                onClick={() => setShowEditForm(true)}
                className="text-[10px] text-coder1-cyan hover:text-coder1-cyan/80 transition-colors"
              >
                Edit tools &rarr;
              </button>
            </div>
          </section>

          {/* Agent Memory */}
          <AgentMemorySection agentId={agent.id} />
        </div>
      </div>

      {/* Edit form modal */}
      {showEditForm && (
        <AgentForm
          agentId={agentId}
          onSave={handleSave}
          onClose={() => setShowEditForm(false)}
        />
      )}
    </div>
  );
}

/* ── Shared sub-components ─────────────────────────── */

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-3 flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-md bg-bg-tertiary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-text-muted">{label}</p>
        <p className="text-sm font-semibold text-text-secondary truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
      {children}
    </p>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-xs text-text-secondary truncate" title={value}>
        {value}
      </p>
    </div>
  );
}
