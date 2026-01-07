'use client';

import React from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'thinking' | 'working' | 'completed' | 'error';
  progress: number;
  currentTask: string;
  icon: string;
}

interface AgentKanbanBoardProps {
  agents: Agent[];
}

// Kanban column definitions
const KANBAN_COLUMNS = [
  { id: 'queued', title: 'Queued', icon: '📋', color: 'text-gray-400' },
  { id: 'spec', title: 'Spec', icon: '📝', color: 'text-blue-400' },
  { id: 'coding', title: 'Coding', icon: '💻', color: 'text-purple-400' },
  { id: 'testing', title: 'Testing', icon: '🧪', color: 'text-yellow-400' },
  { id: 'review', title: 'Review', icon: '👀', color: 'text-orange-400' },
  { id: 'done', title: 'Done', icon: '✅', color: 'text-green-400' },
  { id: 'error', title: 'Error', icon: '❌', color: 'text-red-400' }
];

/**
 * Maps agent status and progress to a Kanban column
 */
function getAgentPhase(agent: Agent): string {
  if (agent.status === 'error') return 'error';
  if (agent.status === 'completed') return 'done';
  if (agent.status === 'idle') return 'queued';
  if (agent.status === 'thinking') return 'spec';

  // For 'working' status, map progress to phases
  if (agent.status === 'working') {
    if (agent.progress < 25) return 'spec';
    if (agent.progress < 50) return 'coding';
    if (agent.progress < 75) return 'testing';
    if (agent.progress < 95) return 'review';
    return 'review'; // 95%+ but not yet completed
  }

  return 'queued';
}

/**
 * Agent card component for Kanban board
 */
function AgentCard({ agent }: { agent: Agent }) {
  const isActive = agent.status === 'working' || agent.status === 'thinking';
  const isComplete = agent.status === 'completed';
  const isError = agent.status === 'error';

  return (
    <div
      className={`
        p-3 rounded-lg border transition-all duration-300 ease-in-out
        ${isActive ? 'bg-coder1-cyan/10 border-coder1-cyan/50 shadow-glow-cyan' : ''}
        ${isComplete ? 'bg-green-500/10 border-green-500/50' : ''}
        ${isError ? 'bg-red-500/10 border-red-500/50' : ''}
        ${!isActive && !isComplete && !isError ? 'bg-bg-secondary border-border-default' : ''}
      `}
    >
      {/* Agent Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{agent.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-text-primary text-sm truncate">{agent.name}</div>
          <div className="text-xs text-text-muted truncate">{agent.role}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isComplete ? 'bg-green-500' :
            isError ? 'bg-red-500' :
            'bg-gradient-to-r from-coder1-cyan to-blue-500'
          }`}
          style={{ width: `${agent.progress}%` }}
        />
      </div>

      {/* Progress Text */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-muted truncate flex-1">{agent.currentTask}</span>
        <span className={`text-xs font-medium ml-2 ${
          isComplete ? 'text-green-400' :
          isError ? 'text-red-400' :
          'text-coder1-cyan'
        }`}>
          {agent.progress}%
        </span>
      </div>
    </div>
  );
}

/**
 * Kanban column component
 */
function KanbanColumn({
  column,
  agents
}: {
  column: typeof KANBAN_COLUMNS[0];
  agents: Agent[]
}) {
  const hasActiveAgents = agents.some(a => a.status === 'working' || a.status === 'thinking');

  return (
    <div className={`
      flex flex-col min-w-[140px] max-w-[180px] flex-1
      ${hasActiveAgents ? 'bg-coder1-cyan/5' : ''}
      rounded-lg transition-colors duration-300
    `}>
      {/* Column Header */}
      <div className={`
        flex items-center justify-center gap-2 py-3 px-2
        border-b border-border-default
        ${hasActiveAgents ? 'border-coder1-cyan/30' : ''}
      `}>
        <span className="text-xl">{column.icon}</span>
        <span className={`text-sm font-medium ${column.color}`}>
          {column.title}
        </span>
        {agents.length > 0 && (
          <span className="text-xs bg-bg-tertiary px-1.5 py-0.5 rounded-full text-text-muted">
            {agents.length}
          </span>
        )}
      </div>

      {/* Column Body - Agent Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[400px]">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}

        {/* Empty State */}
        {agents.length === 0 && (
          <div className="h-20 flex items-center justify-center">
            <span className="text-text-muted text-xs opacity-50">—</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AgentKanbanBoard - Visual workflow board showing agents moving through phases
 *
 * Columns: Queued → Spec → Coding → Testing → Review → Done (+ Error)
 *
 * Agent placement is determined by:
 * - idle → Queued
 * - thinking → Spec
 * - working + progress < 25% → Spec
 * - working + progress 25-50% → Coding
 * - working + progress 50-75% → Testing
 * - working + progress 75-95% → Review
 * - completed → Done
 * - error → Error
 */
export default function AgentKanbanBoard({ agents }: AgentKanbanBoardProps) {
  // Group agents by their current phase
  const agentsByPhase = KANBAN_COLUMNS.reduce((acc, column) => {
    acc[column.id] = agents.filter(agent => getAgentPhase(agent) === column.id);
    return acc;
  }, {} as Record<string, Agent[]>);

  return (
    <div className="h-full flex flex-col">
      {/* Kanban Board */}
      <div className="flex-1 flex gap-1 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            agents={agentsByPhase[column.id] || []}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 py-2 border-t border-border-default text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-coder1-cyan animate-pulse" />
          Active
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Done
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Error
        </span>
      </div>
    </div>
  );
}
