'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Target,
  ListTodo,
  Play,
  Eye,
  CheckCircle2,
  Activity,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import TaskCard from './TaskCard';
import ActivityLog from './ActivityLog';
import { useJohnny5Store } from '@/stores/useJohnny5Store';
import type { Johnny5Task, Johnny5TaskStatus } from '@/types';

interface MissionControlTabProps {
  className?: string;
}

/**
 * MissionControlTab - Main Kanban view for Johnny5 tasks
 *
 * Features:
 * - 4 column Kanban board: Queued, In Progress, Review, Completed
 * - Task cards with type, priority, and duration
 * - Collapsible activity log at bottom
 * - Real-time task status updates
 */
export default function MissionControlTab({ className }: MissionControlTabProps) {
  const { tasks, activityLog, tasksLoading, setTasks, setTasksLoading } = useJohnny5Store();
  const [selectedTask, setSelectedTask] = useState<Johnny5Task | null>(null);
  const [activityExpanded, setActivityExpanded] = useState(true);

  // Fetch tasks from API on mount
  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const response = await fetch('/api/johnny5/tasks');
      if (response.ok) {
        const data = await response.json();
        // API returns: { success, data: { items, total, page, pageSize, hasMore } }
        const tasks = data.data?.items || [];
        setTasks(tasks);
      } else {
        console.error('[MissionControlTab] Failed to fetch tasks:', response.status);
        setTasks([]);
      }
    } catch (error) {
      console.error('[MissionControlTab] Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [setTasks, setTasksLoading]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<Johnny5TaskStatus, Johnny5Task[]> = {
      queued: [],
      in_progress: [],
      review: [],
      completed: [],
      failed: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort each column by priority and creation date
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    Object.keys(grouped).forEach((status) => {
      grouped[status as Johnny5TaskStatus].sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });

    return grouped;
  }, [tasks]);

  const handleTaskSelect = (task: Johnny5Task) => {
    setSelectedTask(selectedTask?.id === task.id ? null : task);
  };

  const handleActivityTaskClick = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setSelectedTask(task);
    }
  };

  const handleRefresh = () => {
    fetchTasks();
  };

  // Columns configuration
  const columns: {
    status: Johnny5TaskStatus;
    title: string;
    icon: typeof ListTodo;
    accentColor: string;
  }[] = [
    {
      status: 'queued',
      title: 'Queued',
      icon: ListTodo,
      accentColor: 'text-gray-400',
    },
    {
      status: 'in_progress',
      title: 'In Progress',
      icon: Play,
      accentColor: 'text-coder1-cyan',
    },
    {
      status: 'review',
      title: 'Review',
      icon: Eye,
      accentColor: 'text-yellow-400',
    },
    {
      status: 'completed',
      title: 'Completed',
      icon: CheckCircle2,
      accentColor: 'text-green-400',
    },
  ];

  return (
    <div className={`h-full flex flex-col ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-coder1-cyan" />
          <h3 className="text-sm font-semibold text-text-primary">Mission Control</h3>
          <span className="px-1.5 py-0.5 rounded bg-bg-tertiary text-[10px] text-text-muted">
            {tasks.length} tasks
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={tasksLoading}
          className="
            p-1.5 rounded-md text-text-muted hover:text-coder1-cyan
            hover:bg-bg-tertiary transition-all disabled:opacity-50
          "
          title="Refresh tasks"
        >
          {tasksLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-x-auto">
          <div className="flex gap-2 p-3 min-w-max h-full">
            {columns.map((column) => (
              <KanbanColumn
                key={column.status}
                title={column.title}
                icon={column.icon}
                accentColor={column.accentColor}
                tasks={tasksByStatus[column.status]}
                selectedTaskId={selectedTask?.id}
                onTaskSelect={handleTaskSelect}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Activity Log (Collapsible) */}
      <div className="border-t border-border-default">
        <button
          onClick={() => setActivityExpanded(!activityExpanded)}
          className="
            w-full flex items-center justify-between px-3 py-2
            hover:bg-bg-tertiary transition-colors
          "
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-text-muted" />
            <span className="text-xs font-medium text-text-secondary">Activity Log</span>
            <span className="px-1.5 py-0.5 rounded bg-bg-tertiary text-[10px] text-text-muted">
              {activityLog.length}
            </span>
          </div>
          {activityExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          )}
        </button>

        {activityExpanded && (
          <div className="max-h-48 overflow-y-auto px-2 pb-2">
            <ActivityLog
              entries={activityLog}
              maxEntries={20}
              onTaskClick={handleActivityTaskClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Kanban Column Component
// ============================================================================

interface KanbanColumnProps {
  title: string;
  icon: typeof ListTodo;
  accentColor: string;
  tasks: Johnny5Task[];
  selectedTaskId?: string;
  onTaskSelect: (task: Johnny5Task) => void;
}

function KanbanColumn({
  title,
  icon: Icon,
  accentColor,
  tasks,
  selectedTaskId,
  onTaskSelect,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col w-64 min-w-[16rem] flex-shrink-0">
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon className={`w-4 h-4 ${accentColor}`} />
        <span className="text-xs font-semibold text-text-secondary">{title}</span>
        <span className="ml-auto px-1.5 py-0.5 rounded-full bg-bg-tertiary text-[10px] text-text-muted">
          {tasks.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        className="
          flex-1 overflow-y-auto space-y-2 p-1
          rounded-lg bg-bg-secondary/30
          border border-border-default/50
        "
      >
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-text-muted/50">
            <span className="text-xs">No tasks</span>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isSelected={selectedTaskId === task.id}
              onSelect={onTaskSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
