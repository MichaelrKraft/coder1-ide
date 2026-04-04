'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Agent } from '@/lib/agent-hub/agents';

interface IssueFormProps {
  agents: Agent[];
  defaultStatus?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function IssueForm({ agents, defaultStatus, onClose, onCreated }: IssueFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agentId, setAgentId] = useState(agents[0]?.id ?? '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [labelsInput, setLabelsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const labels = labelsInput
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);

      const body: Record<string, unknown> = {
        title: title.trim(),
        description,
        agentId,
        priority,
        labels,
      };

      // If a default status was passed (from group header "+"), set it via a follow-up PATCH
      const res = await fetch('/api/agent-hub/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { task?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create issue');

      // If defaultStatus is set and different from backlog (the default), update it
      if (defaultStatus && defaultStatus !== 'backlog' && data.task?.id) {
        await fetch(`/api/agent-hub/tasks/${data.task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: defaultStatus }),
        });
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create issue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-primary border border-border-default rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">New Task</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className="text-xs text-text-muted block mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-text-muted block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={3}
              className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-coder1-cyan/50"
            />
          </div>

          {/* Agent + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">Assignee</label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-coder1-cyan/50"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-text-muted block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-coder1-cyan/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="text-xs text-text-muted block mb-1">Labels</label>
            <input
              value={labelsInput}
              onChange={(e) => setLabelsInput(e.target.value)}
              placeholder="bug, feature, ui (comma-separated)"
              className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
            />
          </div>

          {/* Default status indicator */}
          {defaultStatus && defaultStatus !== 'backlog' && (
            <p className="text-xs text-text-muted">
              Will be created with status:{' '}
              <span className="text-coder1-cyan font-medium">
                {defaultStatus.replace('_', ' ').toUpperCase()}
              </span>
            </p>
          )}
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm rounded-lg border border-border-default text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { handleSave().catch(() => {}); }}
            disabled={saving || !title.trim()}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-coder1-cyan text-bg-primary font-medium hover:bg-coder1-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
