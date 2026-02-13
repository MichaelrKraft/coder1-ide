'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import type { TaskQueueItem as TaskQueueItemType } from '@/stores/useTaskQueueStore';

interface TaskQueueItemProps {
  task: TaskQueueItemType;
  onRemove: (id: number) => void;
  onSelect: (task: TaskQueueItemType) => void;
}

export default function TaskQueueItem({ task, onRemove, onSelect }: TaskQueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 px-2 py-1.5 rounded-lg
        bg-bg-tertiary border border-border-default
        hover:bg-bg-secondary/50 transition-all group
        ${isDragging ? 'opacity-50 shadow-lg z-50' : ''}
      `}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 text-text-muted hover:text-text-secondary"
        title="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Task text */}
      <button
        onClick={() => onSelect(task)}
        className="flex-1 text-left text-xs text-text-secondary truncate hover:text-text-primary"
        title={task.task_text}
      >
        {task.task_text}
      </button>

      {/* Urgent badge */}
      {task.is_urgent && (
        <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-orange-500/20 text-orange-400 uppercase tracking-wide">
          Urgent
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(task.id);
        }}
        className="p-0.5 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remove task"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
