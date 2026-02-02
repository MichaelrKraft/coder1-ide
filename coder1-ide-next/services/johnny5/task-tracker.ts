/**
 * Johnny5 Task Tracker Service
 *
 * Tracks and persists tasks for Mission Control.
 * Shows queued, in-progress, completed, and failed tasks.
 *
 * Now uses SQLite database instead of file-based storage.
 */

import {
  initializeDb,
  createTask as dbCreateTask,
  getTask as dbGetTask,
  listTasks as dbListTasks,
  updateTask as dbUpdateTask,
  logAudit,
} from '@/lib/johnny5-db';
import type {
  Johnny5Task,
  Johnny5TaskStatus,
  Johnny5TaskType,
  Johnny5TaskTrigger
} from '@/types/johnny5';

// Extended metadata cache for fields not in DB schema
interface TaskMetadata {
  reasoning?: string;
  triggeredBy: Johnny5TaskTrigger;
  startedAt?: Date;
  duration?: number;
}
const metadataCache = new Map<string, TaskMetadata>();

/**
 * Map DB task to Johnny5Task type
 */
function mapDbTaskToJohnny5Task(
  dbTask: {
    id: string;
    title: string;
    description: string | null;
    type: string | null;
    priority: string;
    status: string;
    result: string | null;
    created_at: string;
    completed_at: string | null;
  },
  metadata?: TaskMetadata
): Johnny5Task {
  const createdAt = new Date(dbTask.created_at);
  const completedAt = dbTask.completed_at ? new Date(dbTask.completed_at) : undefined;

  // Calculate duration if we have metadata or completed_at
  let duration: number | undefined;
  if (metadata?.duration) {
    duration = metadata.duration;
  } else if (metadata?.startedAt && completedAt) {
    duration = completedAt.getTime() - metadata.startedAt.getTime();
  }

  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description || '',
    status: mapDbStatusToJohnny5Status(dbTask.status),
    type: (dbTask.type || 'build') as Johnny5TaskType,
    priority: dbTask.priority as 'low' | 'medium' | 'high' | 'urgent',
    createdAt,
    startedAt: metadata?.startedAt,
    completedAt,
    duration,
    reasoning: metadata?.reasoning || `Task created: ${dbTask.title}`,
    triggeredBy: metadata?.triggeredBy || 'user',
    result: dbTask.result ? JSON.parse(dbTask.result) : undefined,
  };
}

/**
 * Map DB status to Johnny5TaskStatus
 */
function mapDbStatusToJohnny5Status(status: string): Johnny5TaskStatus {
  // DB uses: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  // Johnny5 uses: 'queued' | 'in_progress' | 'completed' | 'failed' | 'review'
  switch (status) {
    case 'pending':
      return 'queued';
    case 'cancelled':
      return 'failed';
    default:
      return status as Johnny5TaskStatus;
  }
}

/**
 * Map Johnny5TaskStatus to DB status
 */
function mapJohnny5StatusToDbStatus(status: Johnny5TaskStatus): string {
  switch (status) {
    case 'queued':
      return 'pending';
    case 'review':
      return 'completed'; // DB doesn't have 'review', map to completed
    default:
      return status;
  }
}

/**
 * Create a new task
 */
export async function createTask(params: {
  title: string;
  description: string;
  type: Johnny5TaskType;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  reasoning?: string;
  triggeredBy?: Johnny5TaskTrigger;
  sessionId?: string;
}): Promise<Johnny5Task> {
  await initializeDb();

  // Map Johnny5TaskType to DB type
  const dbType = params.type === 'build' || params.type === 'fix' || params.type === 'cleanup' ||
                 params.type === 'deploy' || params.type === 'analyze' || params.type === 'other'
    ? 'custom' // Most Johnny5 types map to 'custom' in DB
    : params.type === 'code_review' ? 'code_review'
    : params.type === 'documentation' ? 'documentation'
    : params.type === 'research' ? 'research'
    : params.type === 'monitoring' ? 'monitoring'
    : 'custom';

  const dbTask = await dbCreateTask({
    title: params.title,
    description: params.description,
    type: dbType as 'research' | 'code_review' | 'documentation' | 'monitoring' | 'custom' | null,
    priority: params.priority || 'medium',
    status: 'pending',
    result: null,
    completed_at: null,
  });

  // Store extended metadata
  const metadata: TaskMetadata = {
    reasoning: params.reasoning || `Task created: ${params.title}`,
    triggeredBy: params.triggeredBy || 'user',
  };
  metadataCache.set(dbTask.id, metadata);

  console.log('[TaskTracker] Task created:', {
    id: dbTask.id,
    title: dbTask.title,
    type: params.type,
  });

  return mapDbTaskToJohnny5Task(dbTask, metadata);
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: Johnny5TaskStatus,
  result?: Johnny5Task['result']
): Promise<Johnny5Task | null> {
  await initializeDb();

  const dbTask = await dbGetTask(taskId);
  if (!dbTask) {
    return null;
  }

  // Get or create metadata
  let metadata = metadataCache.get(taskId);
  if (!metadata) {
    metadata = { triggeredBy: 'user' };
    metadataCache.set(taskId, metadata);
  }

  // Track startedAt if transitioning to in_progress
  if (status === 'in_progress' && !metadata.startedAt) {
    metadata.startedAt = new Date();
  }

  // Calculate duration if completing
  if (status === 'completed' || status === 'failed' || status === 'review') {
    if (metadata.startedAt) {
      metadata.duration = Date.now() - metadata.startedAt.getTime();
    }
  }

  // Update in DB
  await dbUpdateTask(taskId, {
    status: mapJohnny5StatusToDbStatus(status) as 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled',
    result: result ? JSON.stringify(result) : undefined,
  });

  // Fetch updated task
  const updatedDbTask = await dbGetTask(taskId);
  if (!updatedDbTask) {
    return null;
  }

  console.log('[TaskTracker] Task updated:', {
    id: taskId,
    status,
  });

  return mapDbTaskToJohnny5Task(updatedDbTask, metadata);
}

/**
 * Get tasks with optional filters
 */
export async function getTasks(filters?: {
  status?: Johnny5TaskStatus;
  type?: Johnny5TaskType;
  priority?: string;
  triggeredBy?: Johnny5TaskTrigger;
  limit?: number;
}): Promise<Johnny5Task[]> {
  await initializeDb();

  // Get tasks from DB, optionally filtered by status
  const dbStatus = filters?.status ? mapJohnny5StatusToDbStatus(filters.status) : undefined;
  let tasks = await dbListTasks(dbStatus);

  // Convert to Johnny5Task format
  let johnny5Tasks = tasks.map(t => {
    const metadata = metadataCache.get(t.id);
    return mapDbTaskToJohnny5Task(t, metadata);
  });

  // Apply additional filters not supported by DB query
  if (filters?.type) {
    johnny5Tasks = johnny5Tasks.filter(t => t.type === filters.type);
  }

  if (filters?.priority) {
    johnny5Tasks = johnny5Tasks.filter(t => t.priority === filters.priority);
  }

  if (filters?.triggeredBy) {
    johnny5Tasks = johnny5Tasks.filter(t => t.triggeredBy === filters.triggeredBy);
  }

  // Sort: in_progress first, then by priority, then by createdAt
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const statusOrder: Record<string, number> = { in_progress: 0, queued: 1, review: 2, completed: 3, failed: 4 };

  johnny5Tasks.sort((a, b) => {
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
    johnny5Tasks = johnny5Tasks.slice(0, filters.limit);
  }

  return johnny5Tasks;
}

/**
 * Get task by ID
 */
export async function getTaskById(taskId: string): Promise<Johnny5Task | null> {
  await initializeDb();

  const dbTask = await dbGetTask(taskId);
  if (!dbTask) {
    return null;
  }

  const metadata = metadataCache.get(taskId);
  return mapDbTaskToJohnny5Task(dbTask, metadata);
}

/**
 * Get task statistics
 */
export async function getTaskStats(): Promise<{
  total: number;
  queued: number;
  inProgress: number;
  completed: number;
  failed: number;
  review: number;
  byType: Record<string, number>;
  completedToday: number;
}> {
  await initializeDb();

  const tasks = await dbListTasks();
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
    const johnny5Status = mapDbStatusToJohnny5Status(task.status);

    // Status counts
    switch (johnny5Status) {
      case 'queued':
        stats.queued++;
        break;
      case 'in_progress':
        stats.inProgress++;
        break;
      case 'completed':
        stats.completed++;
        if (task.completed_at && new Date(task.completed_at) >= today) {
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
    const taskType = task.type || 'custom';
    stats.byType[taskType] = (stats.byType[taskType] || 0) + 1;
  }

  return stats;
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  await initializeDb();

  const dbTask = await dbGetTask(taskId);
  if (!dbTask) {
    return false;
  }

  // Mark as cancelled in DB (we don't have a delete function)
  await dbUpdateTask(taskId, { status: 'cancelled' });

  // Remove from metadata cache
  metadataCache.delete(taskId);

  await logAudit('task_deleted', { taskId });

  console.log('[TaskTracker] Task deleted:', taskId);
  return true;
}

/**
 * Create task from chat/conversation
 * Helper function for when Johnny5 decides to create a task from a conversation
 */
export async function createTaskFromConversation(params: {
  message: string;
  sessionId: string;
  type?: Johnny5TaskType;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}): Promise<Johnny5Task> {
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
