'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, ChevronDown, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { Task } from '@/lib/agent-hub/tasks';
import type { Agent } from '@/lib/agent-hub/agents';
import { IssueForm } from './IssueForm';
import type { Agent } from '@/lib/agent-hub/agents';

const STATUS_ORDER: Task['status'][] = [
  'in_progress',
  'in_review',
  'todo',
  'backlog',
  'done',
  'cancelled',
];

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  in_progress: { label: 'IN PROGRESS', dot: 'bg-amber-400' },
  in_review: { label: 'IN REVIEW', dot: 'bg-purple-400' },
  todo: { label: 'TODO', dot: 'bg-blue-400' },
  backlog: { label: 'BACKLOG', dot: 'bg-gray-500' },
  done: { label: 'DONE', dot: 'bg-green-400' },
  cancelled: { label: 'CANCELLED', dot: 'bg-red-400' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDateGroup(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekStart = new Date(today.getTime() - today.getDay() * 86400000);
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 86400000);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekStart) return 'This Week';
  if (date >= lastWeekStart) return 'Last Week';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const FIXED_DATE_GROUPS = ['Today', 'Yesterday', 'This Week', 'Last Week'];

interface IssueListProps {
  selectedTaskId: string | null;
  onSelectTask: (task: Task | null, agent: Agent | null) => void;
  refreshKey?: number;
}

export default function IssueList({ selectedTaskId, onSelectTask, refreshKey = 0 }: IssueListProps) {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [formDefaultStatus, setFormDefaultStatus] = useState<string | undefined>();

  const fetchData = useCallback(async () => {
    const [tasksRes, agentsRes] = await Promise.all([
      fetch('/api/agent-hub/tasks'),
      fetch('/api/agent-hub/agents'),
    ]);
    const tasksData = await tasksRes.json() as { tasks: Task[] };
    const agentsData = await agentsRes.json() as { agents: Agent[] };
    setTasks(tasksData.tasks ?? []);
    setAgents(agentsData.agents ?? []);
  }, []);

  useEffect(() => {
    fetchData().catch(() => {});
  }, [fetchData, refreshKey]);

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  const grouped = STATUS_ORDER.reduce<Record<string, Task[]>>((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status);
    return acc;
  }, {});

  // History: completed/cancelled tasks grouped by date
  const historyTasks = tasks
    .filter((t) => t.status === 'done' || t.status === 'cancelled')
    .sort((a, b) => {
      const aDate = a.completedAt ?? a.createdAt;
      const bDate = b.completedAt ?? b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  const historyGrouped: Record<string, Task[]> = {};
  for (const task of historyTasks) {
    const group = getDateGroup(task.completedAt ?? task.createdAt);
    if (!historyGrouped[group]) historyGrouped[group] = [];
    historyGrouped[group].push(task);
  }

  // Stable ordering: fixed groups first, then month groups in chronological order (most recent first)
  const historyGroupOrder = [
    ...FIXED_DATE_GROUPS.filter((g) => historyGrouped[g]),
    ...Object.keys(historyGrouped)
      .filter((g) => !FIXED_DATE_GROUPS.includes(g) && g !== 'Unknown')
      .sort((a, b) => {
        // Parse "Month Year" strings and sort most recent first
        const da = new Date(a);
        const db = new Date(b);
        return db.getTime() - da.getTime();
      }),
    ...(historyGrouped['Unknown'] ? ['Unknown'] : []),
  ];

  const toggleCollapse = (status: string) => {
    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  const handleNewIssue = (defaultStatus?: string) => {
    setFormDefaultStatus(defaultStatus);
    setShowForm(true);
  };

  const handleFormCreated = () => {
    setShowForm(false);
    setFormDefaultStatus(undefined);
    fetchData().catch(() => {});
  };

  const handleTaskUpdated = () => {
    fetchData().catch(() => {});
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-text-primary">Tasks</h1>
          <div className="flex items-center gap-0.5 bg-bg-tertiary rounded p-0.5">
            <button
              onClick={() => setTab('active')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                tab === 'active'
                  ? 'bg-bg-secondary text-coder1-cyan'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setTab('history')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                tab === 'history'
                  ? 'bg-bg-secondary text-coder1-cyan'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              History
            </button>
          </div>
        </div>
        {tab === 'active' && (
          <button
            onClick={() => handleNewIssue()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-coder1-cyan text-bg-primary font-medium hover:bg-coder1-cyan/90 transition-colors"
          >
            <Plus className="w-3 h-3" />
            New Task
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'active' && STATUS_ORDER.map((status) => {
          const items = grouped[status] ?? [];
          const config = STATUS_CONFIG[status];
          const isCollapsed = collapsed[status];

          return (
            <div key={status}>
              {/* Group header */}
              <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border-b border-border-default sticky top-0 z-10">
                <button
                  onClick={() => toggleCollapse(status)}
                  className="flex items-center gap-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                  <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                  {config.label}
                  <span className="text-text-muted/60 font-normal ml-1">
                    {items.length}
                  </span>
                </button>
                <button
                  onClick={() => handleNewIssue(status)}
                  className="text-text-muted hover:text-coder1-cyan transition-colors"
                  title={`New ${config.label} task`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Group items */}
              {!isCollapsed &&
                items.map((task) => {
                  const agent = agentMap.get(task.agentId);
                  const isRunning = agent?.status === 'running';
                  return (
                    <button
                      key={task.id}
                      onClick={() => onSelectTask(task, agentMap.get(task.agentId) ?? null)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-border-default hover:bg-bg-tertiary transition-colors ${
                        selectedTaskId === task.id ? 'bg-bg-tertiary' : ''
                      }`}
                    >
                      {/* Status dot */}
                      <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />

                      {/* Issue number */}
                      <span className="text-xs text-text-muted font-mono shrink-0">
                        C1-{task.issueNumber ?? '?'}
                      </span>

                      {/* Title */}
                      <span className="text-xs text-text-primary truncate flex-1 min-w-0 flex items-center gap-1">
                        {task.title}
                        {task.scheduleEnabled && (
                          <Clock className="w-3 h-3 text-coder1-cyan shrink-0" title="Scheduled" />
                        )}
                      </span>

                      {/* Agent + live indicator */}
                      <span className="flex items-center gap-1.5 text-xs text-text-muted shrink-0">
                        {agent?.name ?? 'Unassigned'}
                        {isRunning && (
                          <span className="flex items-center gap-1 text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-[10px]">Live</span>
                          </span>
                        )}
                      </span>

                      {/* Date */}
                      <span className="text-[10px] text-text-muted shrink-0">
                        {formatDate(task.createdAt)}
                      </span>
                    </button>
                  );
                })}

              {/* Empty state */}
              {!isCollapsed && items.length === 0 && (
                <div className="px-4 py-3 text-xs text-text-muted/50 italic border-b border-border-default">
                  No tasks
                </div>
              )}
            </div>
          );
        })}

        {/* History view */}
        {tab === 'history' && (
          <>
            {historyTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                <CheckCircle2 className="w-8 h-8 mb-3 text-text-muted/30" />
                <p className="text-sm">No completed tasks yet</p>
                <p className="text-xs text-text-muted/50 mt-1">Tasks marked as done or cancelled will appear here</p>
              </div>
            )}
            {historyGroupOrder.map((group) => {
              const items = historyGrouped[group];
              const isCollapsed = collapsed[`history_${group}`];

              return (
                <div key={group}>
                  {/* Date group header */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border-b border-border-default sticky top-0 z-10">
                    <button
                      onClick={() => toggleCollapse(`history_${group}`)}
                      className="flex items-center gap-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest"
                    >
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                      />
                      {group}
                      <span className="text-text-muted/60 font-normal ml-1">
                        {items.length}
                      </span>
                    </button>
                  </div>

                  {/* History items */}
                  {!isCollapsed &&
                    items.map((task) => {
                      const agent = agentMap.get(task.agentId);
                      const isDone = task.status === 'done';
                      return (
                        <button
                          key={task.id}
                          onClick={() => onSelectTask(task, agentMap.get(task.agentId) ?? null)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-border-default hover:bg-bg-tertiary transition-colors ${
                            selectedTaskId === task.id ? 'bg-bg-tertiary' : ''
                          }`}
                        >
                          {/* Status icon */}
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          )}

                          {/* Issue number */}
                          <span className="text-xs text-text-muted font-mono shrink-0">
                            C1-{task.issueNumber ?? '?'}
                          </span>

                          {/* Title */}
                          <span className="text-xs text-text-primary truncate flex-1 min-w-0">
                            {task.title}
                          </span>

                          {/* Agent name */}
                          <span className="text-xs text-text-muted shrink-0">
                            {agent?.name ?? 'Unassigned'}
                          </span>

                          {/* Completed date */}
                          <span className="text-[10px] text-text-muted shrink-0">
                            {formatDate(task.completedAt ?? task.createdAt)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* New issue modal */}
      {showForm && (
        <IssueForm
          agents={agents}
          defaultStatus={formDefaultStatus}
          onClose={() => {
            setShowForm(false);
            setFormDefaultStatus(undefined);
          }}
          onCreated={handleFormCreated}
        />
      )}
    </div>
  );
}
