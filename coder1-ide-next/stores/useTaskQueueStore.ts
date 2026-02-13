import { create } from 'zustand';

export interface TaskQueueItem {
  id: number;
  task_text: string;
  is_urgent: boolean;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface TaskQueueStore {
  // State
  tasks: TaskQueueItem[];
  isLoading: boolean;
  isDropdownOpen: boolean;

  // Actions
  fetchTasks: () => Promise<void>;
  addTask: (taskText: string) => Promise<TaskQueueItem | null>;
  removeTask: (id: number) => Promise<void>;
  updateTaskOrder: (taskIds: number[]) => Promise<void>;
  markTaskInProgress: (id: number) => Promise<void>;
  markTaskComplete: (id: number) => Promise<void>;
  setDropdownOpen: (open: boolean) => void;

  // Computed helpers
  getPendingTasks: () => TaskQueueItem[];
  getNextTask: () => TaskQueueItem | null;
  pendingCount: () => number;
}

export const useTaskQueueStore = create<TaskQueueStore>((set, get) => ({
  tasks: [],
  isLoading: false,
  isDropdownOpen: false,

  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/task-queue');
      const data = await response.json();
      if (data.success) {
        set({ tasks: data.tasks });
      }
    } catch (error) {
      console.error('Failed to fetch task queue:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addTask: async (taskText: string) => {
    try {
      const response = await fetch('/api/task-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_text: taskText }),
      });
      const data = await response.json();
      if (data.success && data.task) {
        // Refetch to get correct ordering
        await get().fetchTasks();
        return data.task;
      }
      return null;
    } catch (error) {
      console.error('Failed to add task:', error);
      return null;
    }
  },

  removeTask: async (id: number) => {
    try {
      await fetch(`/api/task-queue?id=${id}`, { method: 'DELETE' });
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== id)
      }));
    } catch (error) {
      console.error('Failed to remove task:', error);
    }
  },

  updateTaskOrder: async (taskIds: number[]) => {
    // Optimistically update local state
    const currentTasks = get().tasks;
    const reorderedTasks = taskIds
      .map(id => currentTasks.find(t => t.id === id))
      .filter((t): t is TaskQueueItem => t !== undefined);

    set({ tasks: reorderedTasks });

    try {
      await fetch('/api/task-queue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskOrder: taskIds }),
      });
    } catch (error) {
      console.error('Failed to update task order:', error);
      // Revert on error
      set({ tasks: currentTasks });
    }
  },

  markTaskInProgress: async (id: number) => {
    try {
      await fetch('/api/task-queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'in_progress' }),
      });
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === id ? { ...t, status: 'in_progress' as const } : t
        )
      }));
    } catch (error) {
      console.error('Failed to mark task in progress:', error);
    }
  },

  markTaskComplete: async (id: number) => {
    try {
      await fetch('/api/task-queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'completed' }),
      });
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== id)
      }));
    } catch (error) {
      console.error('Failed to mark task complete:', error);
    }
  },

  setDropdownOpen: (open: boolean) => {
    set({ isDropdownOpen: open });
    if (open) {
      // Refresh tasks when opening
      get().fetchTasks();
    }
  },

  getPendingTasks: () => {
    return get().tasks.filter(t => t.status === 'pending');
  },

  getNextTask: () => {
    const pending = get().getPendingTasks();
    return pending.length > 0 ? pending[0] : null;
  },

  pendingCount: () => {
    return get().tasks.filter(t => t.status === 'pending').length;
  },
}));
