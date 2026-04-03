'use client';

import React from 'react';
import AgentStatusChip from './AgentStatusChip';
import type { Agent } from '@/lib/agent-hub/agents';

interface Props {
  agents: Agent[];
  selectedAgentId: string | null;
  onAgentSelect: (id: string) => void;
}

const MAX_DEPTH = 10;

function AgentNode({
  agent,
  agents,
  selectedAgentId,
  onAgentSelect,
  depth,
}: {
  agent: Agent;
  agents: Agent[];
  selectedAgentId: string | null;
  onAgentSelect: (id: string) => void;
  depth: number;
}) {
  const children = agents.filter((a) => a.supervisorAgentId === agent.id);

  return (
    <div className={depth > 0 ? 'ml-6 border-l border-border-default pl-3' : ''}>
      <button
        onClick={() => onAgentSelect(agent.id)}
        className={`w-full text-left px-3 py-2 rounded-md hover:bg-bg-secondary transition-colors ${
          selectedAgentId === agent.id ? 'bg-bg-secondary border-l-2 border-coder1-cyan -ml-px' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-text-secondary truncate">
            {agent.name}
          </span>
          <AgentStatusChip status={agent.status} />
        </div>
        <p className="text-xs text-text-muted truncate mt-0.5">{agent.role}</p>
      </button>

      {depth < MAX_DEPTH && children.length > 0 && (
        <div className="mt-1 space-y-1">
          {children.map((child) => (
            <AgentNode
              key={child.id}
              agent={child}
              agents={agents}
              selectedAgentId={selectedAgentId}
              onAgentSelect={onAgentSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
      {depth >= MAX_DEPTH && children.length > 0 && (
        <p className="ml-6 text-xs text-text-muted italic py-1">...{children.length} more</p>
      )}
    </div>
  );
}

export default function AgentHierarchy({ agents, selectedAgentId, onAgentSelect }: Props) {
  // Root agents: no supervisorAgentId, or supervisorAgentId not in our agents list
  const agentIds = new Set(agents.map((a) => a.id));
  const roots = agents.filter(
    (a) => !a.supervisorAgentId || !agentIds.has(a.supervisorAgentId)
  );

  if (agents.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-muted text-sm">No agents yet.</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      {roots.map((root) => (
        <AgentNode
          key={root.id}
          agent={root}
          agents={agents}
          selectedAgentId={selectedAgentId}
          onAgentSelect={onAgentSelect}
          depth={0}
        />
      ))}
    </div>
  );
}
