'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Clock, DollarSign, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import dynamic from 'next/dynamic';

const AgentHubCalendar = dynamic(
  () => import('@/components/agent-hub/calendar/AgentHubCalendar'),
  { ssr: false, loading: () => <div className="text-xs text-text-muted p-4">Loading calendar...</div> }
);

interface DashboardStats {
  agentsEnabled: number;
  agentsRunning: number;
  agentsIdle: number;
  agentsErrored: number;
  tasksInProgress: number;
  tasksOpen: number;
  tasksInReview: number;
  monthSpendCents: number;
  pendingApprovals: number;
}

interface RecentRun {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  cost_cents: number;
  agent_name: string | null;
  task_title: string | null;
}

interface StuckAgent {
  agentId: string;
  agentName: string;
  runId: string;
  startedAt: string;
  lastActivity: string | null;
  minutesIdle: number;
}

interface HumanInputRun {
  id: string;
  humanInputRequest: string | null;
  startedAt: string;
  agentName: string | null;
  taskTitle: string | null;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  created_at: string;
  agent_name: string | null;
}

interface AgentCost {
  agentId: string;
  agentName: string;
  totalCents: number;
}

interface BridgeStatus {
  connected: boolean;
  bridge: {
    id: string;
    connectedAt: string;
    platform: string;
    version: string;
  } | null;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getRunDescription(run: RecentRun): string {
  const agent = run.agent_name || 'Unknown agent';
  const task = run.task_title ? `'${run.task_title}'` : 'a task';
  switch (run.status) {
    case 'running':
      return `${agent} is running ${task}`;
    case 'completed':
      return `${agent} completed ${task}`;
    case 'failed':
      return `${agent} failed on ${task}`;
    case 'awaiting_approval':
      return `${agent} awaiting approval for ${task}`;
    case 'cancelled':
      return `${agent} cancelled ${task}`;
    case 'needs_human_input':
      return 'agent needs your input';
    default:
      return `${agent} started ${task}`;
  }
}

function getInitials(name: string | null): string {
  if (!name) return '??';
  return name.slice(0, 2).toUpperCase();
}

const STATUS_DOT_COLORS: Record<string, string> = {
  done: 'bg-green-500',
  completed: 'bg-green-500',
  in_progress: 'bg-amber-500',
  in_review: 'bg-blue-500',
  backlog: 'bg-gray-500',
  todo: 'bg-gray-400',
  cancelled: 'bg-red-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-blue-500/20 text-blue-400',
};

export default function AgentHubDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [stuckAgents, setStuckAgents] = useState<StuckAgent[]>([]);
  const [humanInputRuns, setHumanInputRuns] = useState<HumanInputRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [costByAgent, setCostByAgent] = useState<AgentCost[]>([]);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/agent-hub/dashboard');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setStats(data.stats);
        setRecentRuns(data.recentRuns || []);
        setRecentTasks(data.recentTasks || []);
        setStuckAgents(data.stuckAgents || []);
        setHumanInputRuns(
          (data.humanInputRuns ?? []).map((r: { id: string; human_input_request: string | null; started_at: string; agent_name: string | null; task_title: string | null }) => ({
            id: r.id,
            humanInputRequest: r.human_input_request,
            startedAt: r.started_at,
            agentName: r.agent_name,
            taskTitle: r.task_title,
          }))
        );
        setCostByAgent(data.costByAgent || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  useEffect(() => {
    const fetchBridgeStatus = async () => {
      try {
        const res = await fetch('/api/agent-hub/bridge-status');
        if (res.ok) setBridgeStatus(await res.json() as BridgeStatus);
      } catch { /* silent */ }
    };
    void fetchBridgeStatus();
    const interval = setInterval(() => void fetchBridgeStatus(), 15_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted text-sm">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400 text-sm">
        Error: {error}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      value: stats.agentsEnabled,
      label: 'Agents Enabled',
      subtitle: `${stats.agentsRunning} running, ${stats.agentsErrored} errored`,
      icon: Users,
    },
    {
      value: stats.tasksInProgress,
      label: 'Tasks In Progress',
      subtitle: `${stats.tasksOpen ?? 0} open, ${stats.tasksInReview ?? 0} in review`,
      icon: Clock,
    },
    {
      value: formatCents(stats.monthSpendCents),
      label: 'Month Spend',
      subtitle: 'Current billing period',
      icon: DollarSign,
    },
    {
      value: stats.pendingApprovals,
      label: 'Pending Approvals',
      subtitle: 'Awaiting review',
      icon: CheckCircle,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Needs Your Input */}
      {humanInputRuns.length > 0 && (
        <div className="bg-bg-secondary border border-amber-500/30 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            Needs Your Input ({humanInputRuns.length})
          </h3>
          <ul className="space-y-3">
            {humanInputRuns.map((run) => (
              <li key={run.id} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-secondary">
                    {run.agentName ?? 'Unknown'}{run.taskTitle ? ` · ${run.taskTitle}` : ''}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 truncate">
                    {run.humanInputRequest ?? 'Agent is waiting for input'}
                  </p>
                </div>
                <Link
                  href={`/ide/agent-hub/runs/${run.id}`}
                  className="shrink-0 text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
                >
                  Respond
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stuck Agents Alert */}
      {stuckAgents.length > 0 && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0" />
            <p className="text-sm font-medium text-cyan-400">
              {stuckAgents.length} agent{stuckAgents.length > 1 ? 's' : ''} may be stuck
            </p>
          </div>
          <div className="space-y-1.5">
            {stuckAgents.map((sa) => (
              <div key={sa.runId} className="flex items-center justify-between text-xs">
                <span className="text-text-secondary font-medium">{sa.agentName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">
                    No activity for {sa.minutesIdle}m (run {sa.runId.slice(0, 8)})
                  </span>
                  <button
                    onClick={() => {
                      fetch(`/api/agent-hub/runs/${sa.runId}/stop`, { method: 'POST' })
                        .then(() => setStuckAgents(prev => prev.filter(s => s.runId !== sa.runId)))
                        .catch(() => {});
                    }}
                    className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div data-tour="agent-hub-dashboard-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-bg-secondary border border-border-default rounded-lg p-4 flex items-start justify-between"
            >
              <div>
                <div className="text-2xl font-bold text-text-primary">{card.value}</div>
                <div className="text-xs uppercase tracking-wider text-text-secondary mt-1">
                  {card.label}
                </div>
                <div className="text-xs text-text-muted mt-1">{card.subtitle}</div>
              </div>
              <Icon className="w-5 h-5 text-text-muted shrink-0 mt-1" />
            </div>
          );
        })}
      </div>

      {/* Bridge Status — full-width row below stat cards */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-4 flex items-center gap-4">
        <span
          className={`w-3 h-3 rounded-full shrink-0 ${
            bridgeStatus === null
              ? 'bg-gray-400'
              : bridgeStatus.connected
              ? 'bg-green-400'
              : 'bg-red-400 animate-pulse'
          }`}
        />
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Bridge Status
          </span>
          <span className="text-xs text-text-muted ml-3">
            {bridgeStatus === null
              ? 'Checking...'
              : bridgeStatus.connected && bridgeStatus.bridge
              ? `Connected · ${bridgeStatus.bridge.platform} v${bridgeStatus.bridge.version}`
              : 'Not connected — run: coder1-bridge start'}
          </span>
        </div>
      </div>

      {/* Two-column layout: Recent Activity + Recent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-bg-secondary border border-border-default rounded-lg">
          <div className="px-4 py-3 border-b border-border-default">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-border-default">
            {recentRuns.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-muted text-sm">
                No recent activity
              </div>
            ) : (
              recentRuns.map((run) => (
                <div key={run.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-semibold text-text-secondary shrink-0">
                    {getInitials(run.agent_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary truncate">
                      {getRunDescription(run)}
                    </div>
                  </div>
                  <div className="text-xs text-text-muted shrink-0">
                    {relativeTime(run.started_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-bg-secondary border border-border-default rounded-lg">
          <div className="px-4 py-3 border-b border-border-default">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Recent Tasks
            </h2>
          </div>
          <div className="divide-y divide-border-default">
            {recentTasks.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-muted text-sm">
                No recent tasks
              </div>
            ) : (
              recentTasks.map((task) => (
                <div key={task.id} className="px-4 py-3 flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      STATUS_DOT_COLORS[task.status] || 'bg-gray-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary truncate">{task.title}</div>
                  </div>
                  {task.priority && PRIORITY_COLORS[task.priority] && (
                    <span
                      className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                        PRIORITY_COLORS[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>
                  )}
                  <div className="text-xs text-text-muted shrink-0">
                    {relativeTime(task.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cost by Agent */}
      {costByAgent.length > 0 && (
        <div className="bg-bg-secondary border border-border-default rounded-lg">
          <div className="px-4 py-3 border-b border-border-default">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Cost This Month by Agent
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {(() => {
              const localTotal = costByAgent.reduce((s, a) => s + a.totalCents, 0);
              return costByAgent.map((agent) => {
              const pct = localTotal > 0 ? Math.round((agent.totalCents / localTotal) * 100) : 0;
              return (
                <div key={agent.agentId} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary truncate w-32">{agent.agentName}</span>
                  <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-coder1-cyan/60 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-14 text-right">
                    {formatCents(agent.totalCents)}
                  </span>
                </div>
              );
            });
            })()}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-bg-secondary border border-border-default rounded-lg">
        <div className="px-4 py-3 border-b border-border-default flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            Calendar
          </h2>
        </div>
        <div className="p-4">
          <AgentHubCalendar />
        </div>
      </div>
    </div>
  );
}
