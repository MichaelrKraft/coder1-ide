'use client';

import { useState } from 'react';
import AgentList from '@/components/agent-hub/agents/AgentList';
import AgentDetail from '@/components/agent-hub/agents/AgentDetail';

export default function AgentsPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div data-tour="agent-hub-agents-list" className="flex h-full bg-bg-primary">
      {/* Left: Agent List — narrow when agent selected, full when not */}
      <div className={`${selectedAgentId ? 'w-[220px] min-w-[220px]' : 'w-full'} border-r border-border-default flex flex-col shrink-0`}>
        <AgentList
          onAgentSelect={setSelectedAgentId}
          selectedAgentId={selectedAgentId}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Right: Agent Detail — always rendered so data-tour is in DOM for the tour */}
      <div data-tour="agent-hub-command-center" className="flex-1 flex flex-col min-w-0">
        {selectedAgentId ? (
          <AgentDetail
            agentId={selectedAgentId}
            onClose={() => setSelectedAgentId(null)}
            onAgentUpdated={() => setRefreshTrigger((n) => n + 1)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted text-xs">
            Select an agent to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
