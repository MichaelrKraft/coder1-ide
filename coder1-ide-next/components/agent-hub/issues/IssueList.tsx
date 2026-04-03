'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import type { Task } from '@/lib/agent-hub/tasks';
import type { Agent } from '@/lib/agent-hub/agents';
import { IssueDetail } from './IssueDetail';
import { IssueForm } from './IssueForm';

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

export default function IssueList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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
  }, [fetchData]);

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  const grouped = STATUS_ORDER.reduce<Record<string, Task[]>>((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status);
    return acc;
  }, {});

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
    // Refresh the selected task if still open
    if (selectedTask) {
      const updated = tasks.find((t) => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Issues</h1>
        <button
          onClick={() => handleNewIssue()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-coder1-cyan text-bg-primary font-medium hover:bg-coder1-cyan/90 transition-colors"
        >
          <Plus className="w-3 h-3" />
          New Issue
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {STATUS_ORDER.map((status) => {
          const items = grouped[status] ?? [];
          const config = STATUS_CONFIG[status];
          const isCollapsed = collapsed[status];

          return (
            <div key={status}>
              {/* Group header */}
              <div className="flex items-center justify-between px-4 py-2 bg-bg-secondary border-b border-border-default sticky top-0 z-10">
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
                  title={`New ${config.label} issue`}
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
                      onClick={() => setSelectedTask(task)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-border-default hover:bg-bg-tertiary transition-colors ${
                        selectedTask?.id === task.id ? 'bg-bg-tertiary' : ''
                      }`}
                    >
                      {/* Status dot */}
                      <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />

                      {/* Issue number */}
                      <span className="text-xs text-text-muted font-mono shrink-0">
                        C1-{task.issueNumber ?? '?'}
                      </span>

                      {/* Title */}
                      <span className="text-xs text-text-primary truncate flex-1 min-w-0">
                        {task.title}
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
                  No issues
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Issue detail slide-over */}
      {selectedTask && (
        <IssueDetail
          task={selectedTask}
          agent={agentMap.get(selectedTask.agentId) ?? null}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}

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
