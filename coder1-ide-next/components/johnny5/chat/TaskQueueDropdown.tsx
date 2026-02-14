'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ListOrdered, Plus, Minus } from 'lucide-react';
import { useTaskQueueStore, type TaskQueueItem as TaskQueueItemType } from '@/stores/useTaskQueueStore';
import TaskQueueItem from './TaskQueueItem';

interface TaskQueueDropdownProps {
  onTaskSelect: (taskText: string) => void;
}

export default function TaskQueueDropdown({ onTaskSelect }: TaskQueueDropdownProps) {
  const {
    tasks,
    isDropdownOpen,
    isLoading,
    fetchTasks,
    addTask,
    removeTask,
    updateTaskOrder,
    setDropdownOpen,
    pendingCount,
  } = useTaskQueueStore();

  const [newTaskText, setNewTaskText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDropdownOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen, setDropdownOpen]);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);
      const newOrder = arrayMove(tasks, oldIndex, newIndex);
      updateTaskOrder(newOrder.map(t => t.id));
    }
  };

  // Handle add task
  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;
    await addTask(newTaskText.trim());
    setNewTaskText('');
    inputRef.current?.focus();
  };

  // Handle task selection (load into chat and remove from queue)
  const handleTaskSelect = (task: TaskQueueItemType) => {
    onTaskSelect(task.task_text);
    removeTask(task.id);
    setDropdownOpen(false);
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  const count = pendingCount();

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Button */}
      <button
        onClick={() => setDropdownOpen(!isDropdownOpen)}
        className="px-2.5 py-1 rounded-lg bg-bg-tertiary hover:bg-bg-secondary text-[10px] text-text-muted hover:text-text-secondary transition-all flex items-center gap-1.5"
      >
        <ListOrdered className="w-3 h-3" />
        Q: Next Task
        {count > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-coder1-cyan text-black">
            {count}
          </span>
        )}
      </button>

      {/* Dropdown Panel - Full width of parent */}
      {isDropdownOpen && (
        <div className="absolute bottom-full mb-2 left-0 right-0 max-h-96 overflow-hidden rounded-xl bg-bg-primary border border-border-default shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-border-default relative">
            <h3 className="text-xs font-semibold text-text-primary mb-2 pr-6">
              Task Queue
            </h3>
            {/* Minimize button */}
            <button
              onClick={() => setDropdownOpen(false)}
              className="absolute top-2 right-2 p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-secondary transition-colors"
              title="Close"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Add task input - 2 lines */}
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                rows={2}
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add task... (type 'urgent' for priority)"
                className="flex-1 px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary placeholder-text-muted focus:border-coder1-cyan/50 focus:outline-none resize-none"
              />
              <button
                onClick={handleAddTask}
                disabled={!newTaskText.trim()}
                className="p-2 rounded-lg bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all self-end"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {isLoading ? (
              <div className="text-center py-4 text-xs text-text-muted">
                Loading...
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-text-muted">
                No tasks queued.
                <br />
                <span className="text-[10px]">Add tasks above to queue work for Johnny5.</span>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={tasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {tasks.map((task) => (
                    <TaskQueueItem
                      key={task.id}
                      task={task}
                      onRemove={removeTask}
                      onSelect={handleTaskSelect}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Footer hint */}
          {tasks.length > 0 && (
            <div className="px-3 py-2 border-t border-border-default text-[10px] text-text-muted">
              Click a task to load it • Drag to reorder • &quot;urgent&quot; = priority
            </div>
          )}
        </div>
      )}
    </div>
  );
}
