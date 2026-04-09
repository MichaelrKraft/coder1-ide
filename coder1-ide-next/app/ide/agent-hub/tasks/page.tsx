'use client';

import { useState, useCallback } from 'react';
import { List, Columns } from 'lucide-react';
import dynamic from 'next/dynamic';
import IssueList from '@/components/agent-hub/issues/IssueList';
import { IssueDetail } from '@/components/agent-hub/issues/IssueDetail';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { Task } from '@/lib/agent-hub/tasks';
import type { Agent } from '@/lib/agent-hub/agents';

const TaskKanban = dynamic(() => import('@/components/agent-hub/tasks/TaskKanban').then(m => ({ default: m.TaskKanban })), { ssr: false });
const LivePage = dynamic(() => import('@/app/ide/agent-hub/live/page'), { ssr: false });

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectTask = useCallback((task: Task | null, agent: Agent | null) => {
    setSelectedTask(task);
    setSelectedAgent(agent);
  }, []);

  const handleTaskUpdated = useCallback(async () => {
    setRefreshKey(k => k + 1);
    if (selectedTask) {
      try {
        const res = await fetch(`/api/agent-hub/tasks/${selectedTask.id}`);
        if (res.ok) {
          const data = await res.json() as { task: Task };
          if (data.task) setSelectedTask(data.task);
        }
      } catch {
        // Non-critical — stale data is fine
      }
    }
  }, [selectedTask]);

  return (
    <div data-tour="agent-hub-tasks" className="h-screen flex">
      {/* Left column: task list + live activity */}
      <div className={`flex flex-col border-r border-border-default ${selectedTask ? 'w-[420px] shrink-0' : 'flex-1'}`}>
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

        {/* Resizable task list / live activity split */}
        <PanelGroup direction="vertical" className="flex-1 min-h-0">
          <Panel defaultSize={50} minSize={20} className="overflow-y-auto">
            {viewMode === 'list' ? (
              <IssueList
                selectedTaskId={selectedTask?.id ?? null}
                onSelectTask={handleSelectTask}
                refreshKey={refreshKey}
              />
            ) : (
              <TaskKanban />
            )}
          </Panel>
          <PanelResizeHandle className="h-1.5 bg-border-default hover:bg-coder1-cyan/50 cursor-row-resize transition-colors" />
          <Panel defaultSize={50} minSize={15} className="overflow-y-auto">
            <LivePage />
          </Panel>
        </PanelGroup>
      </div>

      {/* Right column: task detail */}
      {selectedTask && (
        <div className="flex-1 min-w-0 overflow-hidden">
          <IssueDetail
            task={selectedTask}
            agent={selectedAgent}
            onClose={() => setSelectedTask(null)}
            onTaskUpdated={handleTaskUpdated}
          />
        </div>
      )}
    </div>
  );
}
