'use client';

import { useState } from 'react';
import AgentList from '@/components/agent-hub/agents/AgentList';
import AgentDetail from '@/components/agent-hub/agents/AgentDetail';

export default function AgentsPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="flex h-full bg-bg-primary">
      {/* Left: Agent List — 40% */}
      <div className="w-[40%] min-w-[240px] border-r border-border-default flex flex-col">
        <AgentList
          onAgentSelect={setSelectedAgentId}
          selectedAgentId={selectedAgentId}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Right: Agent Detail — 60% */}
      <div className="flex-1 flex flex-col">
        {selectedAgentId ? (
          <AgentDetail
            agentId={selectedAgentId}
            onClose={() => setSelectedAgentId(null)}
            onAgentUpdated={() => setRefreshTrigger((n) => n + 1)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            Select an agent to view details
          </div>
        )}
      </div>
    </div>
  );
}
