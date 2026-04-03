'use client';

import React, { useEffect, useState } from 'react';
import type { Task } from '@/lib/agent-hub/tasks';
import { PriorityChip } from './PriorityChip';

interface TaskCardProps {
  task: Task;
  agentName: string;
  onClick: () => void;
}

function useElapsedTime(startedAt: string | null): string {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!startedAt) return;

    const update = () => {
      const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      if (seconds < 60) setElapsed(`${seconds}s`);
      else if (seconds < 3600) setElapsed(`${Math.floor(seconds / 60)}m`);
      else setElapsed(`${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`);
    };

    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, [startedAt]);

  return elapsed;
}

export function TaskCard({ task, agentName, onClick }: TaskCardProps) {
  const elapsed = useElapsedTime(task.status === 'in_progress' ? task.startedAt : null);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-bg-secondary border border-border-default rounded-lg p-3 hover:border-coder1-cyan/40 transition-colors group"
    >
      <p className="text-sm text-text-primary font-medium line-clamp-2 group-hover:text-coder1-cyan transition-colors">
        {task.title}
      </p>

      <p className="text-xs text-text-muted mt-1 truncate">{agentName}</p>

      <div className="flex items-center justify-between mt-2">
        <PriorityChip priority={task.priority} />
        {task.status === 'in_progress' && elapsed && (
          <span className="text-xs text-coder1-cyan animate-pulse">{elapsed}</span>
        )}
      </div>
    </button>
  );
}
