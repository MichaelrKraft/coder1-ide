'use client';

import React, { useState } from 'react';
import { X, Loader2, ChevronDown } from 'lucide-react';
import type { Agent } from '@/lib/agent-hub/agents';

interface ProposedTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

interface TaskFormProps {
  agents: Agent[];
  onClose: () => void;
  onCreated: () => void;
}

export function TaskForm({ agents, onClose, onCreated }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agentId, setAgentId] = useState(agents[0]?.id ?? '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'monthly' | 'once'>('daily');
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [scheduleDay, setScheduleDay] = useState(1);

  // PRD decompose state
  const [showPrd, setShowPrd] = useState(false);
  const [prdText, setPrdText] = useState('');
  const [decomposing, setDecomposing] = useState(false);
  const [proposed, setProposed] = useState<ProposedTask[] | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const handleDecompose = async () => {
    if (!prdText.trim() || !agentId) return;
    setDecomposing(true);
    setError(null);
    try {
      const res = await fetch('/api/agent-hub/tasks/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText, agentId }),
      });
      const data = await res.json() as { tasks?: ProposedTask[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Decompose failed');
      setProposed(data.tasks ?? []);
      setSelectedIndices(new Set((data.tasks ?? []).map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decompose failed');
    } finally {
      setDecomposing(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() && !proposed) return;
    setSaving(true);
    setError(null);

    try {
      if (proposed) {
        // Create all selected proposed tasks
        const tasksToCreate = proposed.filter((_, i) => selectedIndices.has(i));
        for (const t of tasksToCreate) {
          await fetch('/api/agent-hub/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: t.title, description: t.description, agentId, priority: t.priority }),
          });
        }
      } else {
        const res = await fetch('/api/agent-hub/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description,
            agentId,
            priority,
            ...(scheduleEnabled ? {
              scheduleType,
              scheduleTime,
              scheduleDay: scheduleType === 'weekly' || scheduleType === 'monthly' ? scheduleDay : null,
              scheduleEnabled: true,
            } : {}),
          }),
        });
        const data = await res.json() as { error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Failed to create task');
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelected = (i: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
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

        {/* PRD decompose toggle */}
        <button
          onClick={() => setShowPrd((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-coder1-cyan mb-4"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${showPrd ? 'rotate-180' : ''}`} />
          Decompose from PRD
        </button>

        {showPrd && (
          <div className="mb-4 space-y-2">
            <textarea
              value={prdText}
              onChange={(e) => setPrdText(e.target.value)}
              placeholder="Paste your PRD or feature spec here…"
              rows={5}
              className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-coder1-cyan/50"
            />
            <button
              onClick={handleDecompose}
              disabled={!prdText.trim() || decomposing}
              className="px-3 py-1.5 text-xs rounded-lg bg-coder1-cyan/10 border border-coder1-cyan/30 text-coder1-cyan hover:bg-coder1-cyan/20 disabled:opacity-40 flex items-center gap-1.5"
            >
              {decomposing && <Loader2 className="w-3 h-3 animate-spin" />}
              Generate Tasks
            </button>

            {proposed && (
              <div className="space-y-2 mt-2">
                <p className="text-xs text-text-muted">{proposed.length} tasks proposed — select to create:</p>
                {proposed.map((t, i) => (
                  <label key={i} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIndices.has(i)}
                      onChange={() => toggleSelected(i)}
                      className="mt-0.5 accent-coder1-cyan"
                    />
                    <div>
                      <p className="text-xs text-text-primary font-medium">{t.title}</p>
                      <p className="text-xs text-text-muted">{t.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {!proposed && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
              />
            </div>

            <div>
              <label className="text-xs text-text-muted block mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details…"
                rows={3}
                className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-coder1-cyan/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-muted block mb-1">Agent *</label>
                <select
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-coder1-cyan/50"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
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
            {/* Schedule section */}
            <div className="border-t border-border-default pt-3 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="accent-coder1-cyan"
                />
                <span className="text-xs text-text-muted">Enable recurring schedule</span>
              </label>

              {scheduleEnabled && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Frequency</label>
                      <select
                        value={scheduleType}
                        onChange={(e) => setScheduleType(e.target.value as typeof scheduleType)}
                        className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-coder1-cyan/50"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="once">One-time</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Time (UTC)</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-coder1-cyan/50"
                      />
                    </div>
                  </div>

                  {scheduleType === 'weekly' && (
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Day of week</label>
                      <select
                        value={scheduleDay}
                        onChange={(e) => setScheduleDay(Number(e.target.value))}
                        className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-coder1-cyan/50"
                      >
                        <option value={0}>Sunday</option>
                        <option value={1}>Monday</option>
                        <option value={2}>Tuesday</option>
                        <option value={3}>Wednesday</option>
                        <option value={4}>Thursday</option>
                        <option value={5}>Friday</option>
                        <option value={6}>Saturday</option>
                      </select>
                    </div>
                  )}

                  {scheduleType === 'monthly' && (
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Day of month</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={scheduleDay}
                        onChange={(e) => setScheduleDay(Number(e.target.value))}
                        className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-coder1-cyan/50"
                      />
                    </div>
                  )}

                  <p className="text-xs text-text-muted">All times are in UTC.</p>
                </div>
              )}
            </div>
          </div>
        )}

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
            onClick={handleSave}
            disabled={saving || (!proposed && !title.trim()) || (proposed !== null && selectedIndices.size === 0)}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-coder1-cyan text-bg-primary font-medium hover:bg-coder1-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            {proposed ? `Create ${selectedIndices.size} Tasks` : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
