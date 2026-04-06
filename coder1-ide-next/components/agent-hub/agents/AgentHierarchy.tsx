'use client';

import React from 'react';
import type { Agent } from '@/lib/agent-hub/agents';

interface Props {
  agents: Agent[];
  selectedAgentId: string | null;
  onAgentSelect: (id: string) => void;
}

const MAX_DEPTH = 10;

const STATUS_DOT_COLORS: Record<Agent['status'], string> = {
  idle: 'bg-green-400',
  running: 'bg-amber-400',
  error: 'bg-red-400',
  archived: 'bg-gray-500',
};

function OrgNode({
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
  const isSelected = selectedAgentId === agent.id;

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <button
        onClick={() => onAgentSelect(agent.id)}
        className={`w-[180px] text-left px-4 py-3 rounded-lg bg-bg-secondary border transition-all cursor-pointer ${
          isSelected
            ? 'border-coder1-cyan shadow-[0_0_10px_rgba(0,217,255,0.15)]'
            : 'border-border-default hover:border-coder1-cyan/40'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-text-secondary truncate">
            {agent.name}
          </span>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_COLORS[agent.status]}`}
          />
        </div>
        <p className="text-xs text-text-muted truncate mt-1">{agent.role}</p>
        <p className="text-[10px] text-text-muted truncate mt-0.5">{agent.model}</p>
      </button>

      {/* Connectors + Children */}
      {depth < MAX_DEPTH && children.length > 0 && (
        <>
          {/* Vertical line from parent card down to horizontal bar */}
          <div className="w-0.5 h-5 bg-border-default" />

          {/* Children row with horizontal connector */}
          <div className="flex items-start relative">
            {/* Horizontal bar spanning from center of first child to center of last child */}
            {children.length > 1 && (
              <div
                className="absolute top-0 h-0.5 bg-border-default"
                style={{
                  left: `calc(${(100 / (2 * children.length))}%)`,
                  right: `calc(${(100 / (2 * children.length))}%)`,
                }}
              />
            )}

            {/* Each child with vertical connector line */}
            {children.map((child) => (
              <div key={child.id} className="flex flex-col items-center px-3">
                <div className="w-0.5 h-5 bg-border-default" />
                <OrgNode
                  agent={child}
                  agents={agents}
                  selectedAgentId={selectedAgentId}
                  onAgentSelect={onAgentSelect}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Max depth overflow indicator */}
      {depth >= MAX_DEPTH && children.length > 0 && (
        <>
          <div className="w-0.5 h-3 bg-border-default" />
          <p className="text-[10px] text-text-muted italic">
            ...{children.length} more
          </p>
        </>
      )}
    </div>
  );
}

export default function AgentHierarchy({
  agents,
  selectedAgentId,
  onAgentSelect,
}: Props) {
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
    <div className="overflow-auto p-6">
      <div className="flex items-start justify-center gap-8 min-w-max">
        {roots.map((root) => (
          <OrgNode
            key={root.id}
            agent={root}
            agents={agents}
            selectedAgentId={selectedAgentId}
            onAgentSelect={onAgentSelect}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}
