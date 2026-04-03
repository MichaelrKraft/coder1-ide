'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import AgentStatusChip from './AgentStatusChip';
import AgentForm from './AgentForm';
import type { Agent } from '@/lib/agent-hub/agents';

interface Props {
  onAgentSelect: (id: string) => void;
  selectedAgentId: string | null;
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AgentList({ onAgentSelect, selectedAgentId }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function loadAgents() {
    try {
      const res = await fetch('/api/agent-hub/agents');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json() as { agents: Agent[] };
      setAgents(data.agents);
    } catch {
      // Silent fail — empty list shown
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAgents();
  }, []);

  function handleSave(agent: Agent) {
    setAgents(prev => {
      const exists = prev.find(a => a.id === agent.id);
      if (exists) return prev.map(a => (a.id === agent.id ? agent : a));
      return [agent, ...prev];
    });
    setShowForm(false);
    onAgentSelect(agent.id);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Agents
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-coder1-cyan/10 hover:bg-coder1-cyan/20 text-coder1-cyan text-xs font-medium border border-coder1-cyan/30 transition-colors"
        >
          <Plus size={13} />
          New Agent
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-text-muted text-sm">Loading...</div>
        ) : agents.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-text-muted text-sm">
              Create your first agent — give it a role and a project to work in.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-coder1-cyan text-xs underline underline-offset-2"
            >
              Create agent
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border-default">
            {agents.map(agent => (
              <li key={agent.id}>
                <button
                  onClick={() => onAgentSelect(agent.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-bg-secondary transition-colors ${
                    selectedAgentId === agent.id ? 'bg-bg-secondary border-l-2 border-coder1-cyan' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-text-secondary truncate">
                      {agent.name}
                    </span>
                    <AgentStatusChip status={agent.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-muted truncate">{agent.role}</span>
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      {relativeTime(agent.lastRunAt)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* New Agent Modal */}
      {showForm && (
        <AgentForm
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
