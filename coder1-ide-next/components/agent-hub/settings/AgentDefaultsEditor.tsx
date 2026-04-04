'use client';

import { useState, useEffect } from 'react';
import { Save, Settings } from 'lucide-react';

const MODELS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
];

export default function AgentDefaultsEditor() {
  const [defaultModel, setDefaultModel] = useState('claude-sonnet-4-6');
  const [defaultBudgetCents, setDefaultBudgetCents] = useState(500);
  const [maxConcurrentRuns, setMaxConcurrentRuns] = useState(3);
  const [systemPromptTemplate, setSystemPromptTemplate] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/agent-hub/settings/agent-defaults')
      .then((r) => r.json())
      .then((data) => {
        if (data.defaultModel) setDefaultModel(data.defaultModel);
        if (data.defaultBudgetCents !== undefined) setDefaultBudgetCents(data.defaultBudgetCents);
        if (data.maxConcurrentRuns !== undefined) setMaxConcurrentRuns(data.maxConcurrentRuns);
        if (data.systemPromptTemplate !== undefined) setSystemPromptTemplate(data.systemPromptTemplate);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/agent-hub/settings/agent-defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultModel,
          defaultBudgetCents,
          maxConcurrentRuns,
          systemPromptTemplate,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-coder1-cyan" />
        <h2 className="text-sm font-semibold text-text-primary">Agent Defaults</h2>
      </div>
      <p className="text-xs text-text-muted">
        Default settings applied to new agents. Individual agents can override these.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-text-secondary mb-1">Default Model</label>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">
            Default Monthly Budget (dollars)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={defaultBudgetCents / 100}
            onChange={(e) => setDefaultBudgetCents(Math.max(0, Math.round(parseFloat(e.target.value || '0') * 100)))}
            className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50"
          />
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">
            Max Concurrent Runs (1-10)
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={maxConcurrentRuns}
            onChange={(e) => setMaxConcurrentRuns(Math.min(10, Math.max(1, parseInt(e.target.value || '1', 10))))}
            className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50"
          />
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">System Prompt Template</label>
          <textarea
            value={systemPromptTemplate}
            onChange={(e) => setSystemPromptTemplate(e.target.value.slice(0, 4096))}
            className="w-full h-32 bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 resize-y"
            placeholder="Optional system prompt injected into every agent run..."
          />
          <span className="text-[10px] text-text-muted font-mono">
            {systemPromptTemplate.length.toLocaleString()} / 4,096 chars
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-coder1-cyan/10 text-coder1-cyan text-xs font-medium rounded hover:bg-coder1-cyan/20 transition-colors disabled:opacity-50"
        >
          <Save className="w-3 h-3" />
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saved && <span className="text-xs text-green-400">Saved</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
