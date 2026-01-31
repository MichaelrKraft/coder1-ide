/**
 * Johnny5 Task Tracker Service
 *
 * Tracks and persists tasks for Mission Control.
 * Shows queued, in-progress, completed, and failed tasks.
 */

import fs from 'fs';
import path from 'path';
import type {
  Johnny5Task,
  Johnny5TaskStatus,
  Johnny5TaskType,
  Johnny5TaskTrigger
} from '@/types/johnny5';

// Storage path
const DATA_DIR = path.join(process.cwd(), 'data', 'johnny5');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

// In-memory cache
let tasksCache: Johnny5Task[] = [];
let cacheLoaded = false;

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load tasks from disk
 */
function loadTasks(): Johnny5Task[] {
  if (cacheLoaded) {
    return tasksCache;
  }

  ensureDataDir();

  if (fs.existsSync(TASKS_FILE)) {
    try {
      const data = fs.readFileSync(TASKS_FILE, 'utf-8');
      tasksCache = JSON.parse(data).map((task: Johnny5Task) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        startedAt: task.startedAt ? new Date(task.startedAt) : undefined,
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
      }));
    } catch (error) {
      console.error('[TaskTracker] Failed to load tasks:', error);
      tasksCache = [];
    }
  } else {
    tasksCache = [];
  }

  cacheLoaded = true;
  return tasksCache;
}

/**
 * Save tasks to disk
 */
function saveTasks(): void {
  ensureDataDir();
  try {
    // Keep only last 200 tasks
    const toSave = tasksCache.slice(-200);
    fs.writeFileSync(TASKS_FILE, JSON.stringify(toSave, null, 2));
  } catch (error) {
    console.error('[TaskTracker] Failed to save tasks:', error);
  }
}

/**
 * Create a new task
 */
export function createTask(params: {
  title: string;
  description: string;
  type: Johnny5TaskType;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  reasoning?: string;
  triggeredBy?: Johnny5TaskTrigger;
  sessionId?: string;
}): Johnny5Task {
  loadTasks();

  const task: Johnny5Task = {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: params.title,
    description: params.description,
    status: 'queued',
    type: params.type,
    priority: params.priority || 'medium',
    createdAt: new Date(),
    reasoning: params.reasoning || `Task created: ${params.title}`,
    triggeredBy: params.triggeredBy || 'user',
  };

  tasksCache.push(task);
  setImmediate(() => saveTasks());

  console.log('[TaskTracker] Task created:', {
    id: task.id,
    title: task.title,
    type: task.type,
  });

  return task;
}

/**
 * Update task status
 */
export function updateTaskStatus(
  taskId: string,
  status: Johnny5TaskStatus,
  result?: Johnny5Task['result']
): Johnny5Task | null {
  loadTasks();

  const task = tasksCache.find(t => t.id === taskId);
  if (!task) {
    return null;
  }

  task.status = status;

  if (status === 'in_progress' && !task.startedAt) {
    task.startedAt = new Date();
  }

  if (status === 'completed' || status === 'failed' || status === 'review') {
    task.completedAt = new Date();
    if (task.startedAt) {
      task.duration = task.completedAt.getTime() - task.startedAt.getTime();
    }
    if (result) {
      task.result = result;
    }
  }

  setImmediate(() => saveTasks());

  console.log('[TaskTracker] Task updated:', {
    id: task.id,
    status: task.status,
  });

  return task;
}

/**
 * Get tasks with optional filters
 */
export function getTasks(filters?: {
  status?: Johnny5TaskStatus;
  type?: Johnny5TaskType;
  priority?: string;
  triggeredBy?: Johnny5TaskTrigger;
  limit?: number;
}): Johnny5Task[] {
  let tasks = loadTasks();

  if (filters?.status) {
    tasks = tasks.filter(t => t.status === filters.status);
  }

  if (filters?.type) {
    tasks = tasks.filter(t => t.type === filters.type);
  }

  if (filters?.priority) {
    tasks = tasks.filter(t => t.priority === filters.priority);
  }

  if (filters?.triggeredBy) {
    tasks = tasks.filter(t => t.triggeredBy === filters.triggeredBy);
  }

  // Sort: in_progress first, then by priority, then by createdAt
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const statusOrder: Record<string, number> = { in_progress: 0, queued: 1, review: 2, completed: 3, failed: 4 };

  tasks.sort((a, b) => {
    // First by status
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;

    // Then by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Finally by creation time (most recent first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (filters?.limit) {
    tasks = tasks.slice(0, filters.limit);
  }

  return tasks;
}

/**
 * Get task by ID
 */
export function getTaskById(taskId: string): Johnny5Task | null {
  loadTasks();
  return tasksCache.find(t => t.id === taskId) || null;
}

/**
 * Get task statistics
 */
export function getTaskStats(): {
  total: number;
  queued: number;
  inProgress: number;
  completed: number;
  failed: number;
  review: number;
  byType: Record<string, number>;
  completedToday: number;
} {
  const tasks = loadTasks();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = {
    total: tasks.length,
    queued: 0,
    inProgress: 0,
    completed: 0,
    failed: 0,
    review: 0,
    byType: {} as Record<string, number>,
    completedToday: 0,
  };

  for (const task of tasks) {
    // Status counts
    switch (task.status) {
      case 'queued':
        stats.queued++;
        break;
      case 'in_progress':
        stats.inProgress++;
        break;
      case 'completed':
        stats.completed++;
        if (task.completedAt && task.completedAt >= today) {
          stats.completedToday++;
        }
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'review':
        stats.review++;
        break;
    }

    // Type counts
    stats.byType[task.type] = (stats.byType[task.type] || 0) + 1;
  }

  return stats;
}

/**
 * Delete a task
 */
export function deleteTask(taskId: string): boolean {
  loadTasks();

  const index = tasksCache.findIndex(t => t.id === taskId);
  if (index === -1) {
    return false;
  }

  tasksCache.splice(index, 1);
  setImmediate(() => saveTasks());

  console.log('[TaskTracker] Task deleted:', taskId);
  return true;
}

/**
 * Create task from chat/conversation
 * Helper function for when Johnny5 decides to create a task from a conversation
 */
export function createTaskFromConversation(params: {
  message: string;
  sessionId: string;
  type?: Johnny5TaskType;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}): Johnny5Task {
  // Extract title from first line or first 50 chars
  const title = params.message.split('\n')[0].substring(0, 100);

  return createTask({
    title,
    description: params.message,
    type: params.type || 'build',
    priority: params.priority || 'medium',
    reasoning: `Created from conversation in session ${params.sessionId}`,
    triggeredBy: 'conversation',
  });
}

// Export singleton-style functions
export const TaskTracker = {
  createTask,
  updateTaskStatus,
  getTasks,
  getTaskById,
  getTaskStats,
  deleteTask,
  createTaskFromConversation,
};

export default TaskTracker;
