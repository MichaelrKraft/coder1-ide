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

      {/* Right: Agent Detail */}
      {selectedAgentId && (
        <div className="flex-1 flex flex-col min-w-0">
          <AgentDetail
            agentId={selectedAgentId}
            onClose={() => setSelectedAgentId(null)}
            onAgentUpdated={() => setRefreshTrigger((n) => n + 1)}
          />
        </div>
      )}
    </div>
  );
}
