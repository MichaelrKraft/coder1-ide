'use client';

import { useEffect, useState } from 'react';
import { Plus, List, GitBranch, LayoutGrid, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import AgentStatusChip from './AgentStatusChip';
import AgentForm from './AgentForm';
import { AgentFleetCard } from './AgentFleetCard';

const AgentHierarchy = dynamic(() => import('./AgentHierarchy'), { ssr: false });
import type { Agent } from '@/lib/agent-hub/agents';

interface Props {
  onAgentSelect: (id: string) => void;
  selectedAgentId: string | null;
  refreshTrigger?: number;
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

export default function AgentList({ onAgentSelect, selectedAgentId, refreshTrigger }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy' | 'fleet'>('list');

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
  }, [refreshTrigger]);

  async function handleDelete(agentId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this agent? This cannot be undone.')) return;
    try {
      await fetch(`/api/agent-hub/agents/${agentId}`, { method: 'DELETE' });
      setAgents(prev => prev.filter(a => a.id !== agentId));
    } catch {
      // Silent fail
    }
  }

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
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Agents
          </h2>
          <div className="flex items-center gap-0.5 bg-bg-tertiary rounded p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'list' ? 'bg-bg-secondary text-coder1-cyan' : 'text-text-muted hover:text-text-secondary'
              }`}
              title="List view"
            >
              <List size={12} />
            </button>
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'hierarchy' ? 'bg-bg-secondary text-coder1-cyan' : 'text-text-muted hover:text-text-secondary'
              }`}
              title="Hierarchy view"
            >
              <GitBranch size={12} />
            </button>
            <button
              onClick={() => setViewMode('fleet')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'fleet' ? 'bg-bg-secondary text-coder1-cyan' : 'text-text-muted hover:text-text-secondary'
              }`}
              title="Fleet view"
            >
              <LayoutGrid size={12} />
            </button>
          </div>
        </div>
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
        ) : viewMode === 'list' ? (
          <ul className="divide-y divide-border-default">
            {agents.map(agent => (
              <li key={agent.id} className="group relative">
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
                    <div className="flex items-center gap-1.5">
                      {agent.status === 'running' && agent.lastRunAt &&
                       (Date.now() - new Date(agent.lastRunAt).getTime() > 10 * 60 * 1000) && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="May be stuck" />
                      )}
                      <AgentStatusChip status={agent.status} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-muted truncate">{agent.role}</span>
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      {relativeTime(agent.lastRunAt)}
                    </span>
                  </div>
                </button>
                <button
                  onClick={(e) => void handleDelete(agent.id, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-400 hover:bg-red-400/10"
                  title="Delete agent"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : viewMode === 'fleet' ? (
          <div className="p-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {agents.map((agent) => (
              <AgentFleetCard
                key={agent.id}
                agent={agent}
                selected={selectedAgentId === agent.id}
                onSelect={onAgentSelect}
              />
            ))}
          </div>
        ) : (
          <AgentHierarchy
            agents={agents}
            selectedAgentId={selectedAgentId}
            onAgentSelect={onAgentSelect}
          />
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
