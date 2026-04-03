'use client';

import { useEffect, useState } from 'react';
import { X, Edit2, Archive } from 'lucide-react';
import AgentStatusChip from './AgentStatusChip';
import AgentForm from './AgentForm';
import type { Agent } from '@/lib/agent-hub/agents';

interface Props {
  agentId: string;
  onClose: () => void;
}

export default function AgentDetail({ agentId, onClose }: Props) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function loadAgent() {
    setLoading(true);
    try {
      const res = await fetch(`/api/agent-hub/agents/${agentId}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json() as { agent: Agent };
      setAgent(data.agent);
    } catch {
      setAgent(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  async function handleArchive() {
    if (!confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    setArchiving(true);
    try {
      await fetch(`/api/agent-hub/agents/${agentId}`, { method: 'DELETE' });
      onClose();
    } catch {
      // Silent fail
    } finally {
      setArchiving(false);
      setConfirmArchive(false);
    }
  }

  function handleSave(updated: Agent) {
    setAgent(updated);
    setShowEditForm(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm p-8">
        Loading...
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm p-8">
        Agent not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-border-default">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-text-secondary truncate">{agent.name}</h2>
            <AgentStatusChip status={agent.status} />
          </div>
          <p className="text-xs text-text-muted">{agent.role}</p>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-secondary ml-3">
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {agent.description && (
          <section>
            <Label>Description</Label>
            <p className="text-sm text-text-secondary">{agent.description}</p>
          </section>
        )}

        <section className="grid grid-cols-2 gap-4">
          <Field label="Model" value={agent.model} />
          <Field label="Max Concurrent Runs" value={String(agent.maxConcurrentRuns)} />
          <Field
            label="Monthly Budget"
            value={agent.monthlyBudgetCents === 0 ? 'No limit' : `$${(agent.monthlyBudgetCents / 100).toFixed(2)}`}
          />
          <Field label="Last Run" value={agent.lastRunAt ? new Date(agent.lastRunAt).toLocaleString() : 'Never'} />
        </section>

        <section>
          <Label>Workspace Path</Label>
          <code className="text-xs text-text-muted bg-bg-tertiary px-2 py-1 rounded block break-all">
            {agent.workspacePath}
          </code>
        </section>

        {agent.skills.length > 0 && (
          <section>
            <Label>Skills</Label>
            <div className="flex flex-wrap gap-1.5">
              {agent.skills.map(skill => (
                <span
                  key={skill}
                  className="px-2 py-0.5 text-xs rounded-full bg-bg-tertiary text-text-muted border border-border-default"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        <section>
          <Label>System Prompt</Label>
          <pre className="text-xs text-text-muted bg-bg-tertiary px-3 py-2 rounded whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {agent.systemPrompt}
          </pre>
        </section>

        <section>
          <Label>Created</Label>
          <p className="text-xs text-text-muted">{new Date(agent.createdAt).toLocaleString()}</p>
        </section>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-border-default">
        <button
          onClick={() => setShowEditForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-tertiary hover:bg-bg-secondary text-text-secondary text-xs font-medium border border-border-default transition-colors"
        >
          <Edit2 size={12} />
          Edit
        </button>
        <button
          onClick={() => void handleArchive()}
          disabled={archiving || agent.status === 'archived'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            confirmArchive
              ? 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
              : 'bg-bg-tertiary hover:bg-bg-secondary text-text-muted border-border-default'
          } disabled:opacity-40`}
        >
          <Archive size={12} />
          {confirmArchive ? 'Confirm Archive' : 'Archive'}
        </button>
        {confirmArchive && (
          <button
            onClick={() => setConfirmArchive(false)}
            className="text-xs text-text-muted underline"
          >
            Cancel
          </button>
        )}
      </div>

      {showEditForm && (
        <AgentForm
          agentId={agentId}
          onSave={handleSave}
          onClose={() => setShowEditForm(false)}
        />
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
      {children}
    </p>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="text-sm text-text-secondary">{value}</p>
    </div>
  );
}
