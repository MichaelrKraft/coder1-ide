'use client';

import { useState } from 'react';
import { List, Columns } from 'lucide-react';
import dynamic from 'next/dynamic';
import IssueList from '@/components/agent-hub/issues/IssueList';

const TaskKanban = dynamic(() => import('@/components/agent-hub/tasks/TaskKanban').then(m => ({ default: m.TaskKanban })), { ssr: false });

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  return (
    <div className="h-full flex flex-col">
      {/* View toggle */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-border-default shrink-0">
        <div className="flex items-center gap-0.5 bg-bg-tertiary rounded p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'list' ? 'bg-bg-secondary text-coder1-cyan' : 'text-text-muted hover:text-text-secondary'
            }`}
            title="List view"
          >
            <List size={14} />
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'board' ? 'bg-bg-secondary text-coder1-cyan' : 'text-text-muted hover:text-text-secondary'
            }`}
            title="Board view"
          >
            <Columns size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {viewMode === 'list' ? <IssueList /> : <TaskKanban />}
      </div>
    </div>
  );
}
