'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Task } from '@/lib/agent-hub/tasks';
import type { Agent } from '@/lib/agent-hub/agents';
import { TaskCard } from './TaskCard';
import { TaskDetail } from './TaskDetail';
import { TaskForm } from './TaskForm';

type Status = Task['status'];
type Priority = Task['priority'] | 'all';

const COLUMNS: { status: Status; label: string }[] = [
  { status: 'backlog', label: 'Backlog' },
  { status: 'todo', label: 'Todo' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'in_review', label: 'In Review' },
  { status: 'done', label: 'Done' },
];

export function TaskKanban() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, agentsRes] = await Promise.all([
        fetch('/api/agent-hub/tasks'),
        fetch('/api/agent-hub/agents'),
      ]);
      const [tasksData, agentsData] = await Promise.all([
        tasksRes.json() as Promise<{ tasks?: Task[] }>,
        agentsRes.json() as Promise<{ agents?: Agent[] }>,
      ]);
      setTasks(tasksData.tasks ?? []);
      setAgents(agentsData.agents ?? []);
    } catch (err) {
      console.error('[TaskKanban] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const id = setInterval(() => void fetchData(), 15000);
    return () => clearInterval(id);
  }, [fetchData]);

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));

  const filtered = tasks.filter((t) => {
    if (agentFilter !== 'all' && t.agentId !== agentFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  const byStatus = (status: Status) => filtered.filter((t) => t.status === status);

  const handleTaskUpdated = () => {
    void fetchData();
    if (selectedTask) {
      // Refresh the selected task from the new data
      setSelectedTask((prev) => {
        if (!prev) return null;
        return tasks.find((t) => t.id === prev.id) ?? null;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        Loading tasks…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center gap-3">
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="bg-bg-secondary border border-border-default rounded-lg px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-coder1-cyan/50"
          >
            <option value="all">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority)}
            className="bg-bg-secondary border border-border-default rounded-lg px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-coder1-cyan/50"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-coder1-cyan text-bg-primary font-medium hover:bg-coder1-cyan/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Task
        </button>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 p-4 min-w-max h-full">
          {COLUMNS.map(({ status, label }) => {
            const colTasks = byStatus(status);
            return (
              <div key={status} className="w-56 flex flex-col shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    {label}
                  </span>
                  <span className="text-xs text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                  {colTasks.length === 0 && (
                    <div className="text-xs text-text-muted text-center py-6 border border-dashed border-border-default rounded-lg">
                      Empty
                    </div>
                  )}
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      agentName={agentMap[task.agentId]?.name ?? '—'}
                      onClick={() => setSelectedTask(task)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side panel */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          agent={agentMap[selectedTask.agentId] ?? null}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}

      {/* Create form */}
      {showForm && (
        <TaskForm
          agents={agents}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            void fetchData();
          }}
        />
      )}
    </div>
  );
}
