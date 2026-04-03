'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import type { Agent } from '@/lib/agent-hub/agents';
import type { SkillInfo } from '@/lib/agent-hub/skills-registry';

interface Props {
  agentId?: string;
  onSave: (agent: Agent) => void;
  onClose: () => void;
}

const MODELS = [
  { value: 'claude-haiku-4-5', label: 'Claude Haiku (fast, cheap)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet (balanced)' },
  { value: 'claude-opus-4-6', label: 'Claude Opus (most capable)' },
] as const;

interface FormState {
  name: string;
  role: string;
  description: string;
  workspacePath: string;
  model: string;
  monthlyBudgetDollars: string;
  maxConcurrentRuns: string;
  skills: string[];
  systemPrompt: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  role: '',
  description: '',
  workspacePath: '',
  model: 'claude-sonnet-4-6',
  monthlyBudgetDollars: '0',
  maxConcurrentRuns: '1',
  skills: [],
  systemPrompt: '',
};

export default function AgentForm({ agentId, onSave, onClose }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableSkills, setAvailableSkills] = useState<SkillInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);

  useEffect(() => {
    void loadSkills();
    if (agentId) void loadAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  async function loadSkills() {
    try {
      const res = await fetch('/api/agent-hub/skills');
      if (!res.ok) return;
      const data = await res.json() as { skills: SkillInfo[] };
      setAvailableSkills(data.skills);
    } catch {
      // Skills list is optional
    }
  }

  async function loadAgent() {
    try {
      const res = await fetch(`/api/agent-hub/agents/${agentId}`);
      if (!res.ok) return;
      const data = await res.json() as { agent: Agent };
      const a = data.agent;
      setForm({
        name: a.name,
        role: a.role,
        description: a.description,
        workspacePath: a.workspacePath,
        model: a.model,
        monthlyBudgetDollars: String(a.monthlyBudgetCents / 100),
        maxConcurrentRuns: String(a.maxConcurrentRuns),
        skills: a.skills,
        systemPrompt: a.systemPrompt,
      });
    } catch {
      // Fall back to empty form
    }
  }

  function set(key: keyof FormState, value: string | string[]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  }

  function toggleSkill(name: string) {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(name)
        ? prev.skills.filter(s => s !== name)
        : [...prev.skills, name],
    }));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.role.trim()) newErrors.role = 'Role is required';
    if (!form.workspacePath.trim()) newErrors.workspacePath = 'Workspace path is required';
    if (!form.systemPrompt.trim()) newErrors.systemPrompt = 'System prompt is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleGeneratePrompt() {
    if (!form.role.trim()) {
      setErrors(prev => ({ ...prev, role: 'Role is required to generate a prompt' }));
      return;
    }
    setGeneratingPrompt(true);
    try {
      const res = await fetch('/api/agent-hub/agents/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, role: form.role, description: form.description }),
      });
      if (!res.ok) return;
      const data = await res.json() as { systemPrompt: string };
      set('systemPrompt', data.systemPrompt);
    } catch {
      // Silent fail
    } finally {
      setGeneratingPrompt(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const budgetCents = Math.round(parseFloat(form.monthlyBudgetDollars || '0') * 100);
      const payload = {
        name: form.name.trim(),
        role: form.role.trim(),
        description: form.description.trim(),
        workspacePath: form.workspacePath.trim(),
        model: form.model,
        monthlyBudgetCents: isNaN(budgetCents) ? 0 : budgetCents,
        maxConcurrentRuns: parseInt(form.maxConcurrentRuns, 10) || 1,
        skills: form.skills,
        systemPrompt: form.systemPrompt.trim(),
      };

      const url = agentId ? `/api/agent-hub/agents/${agentId}` : '/api/agent-hub/agents';
      const method = agentId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setErrors({ submit: err.error ?? 'Failed to save agent' });
        return;
      }

      const data = await res.json() as { agent: Agent };
      onSave(data.agent);
    } catch {
      setErrors({ submit: 'Network error — please try again' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-bg-secondary border border-border-default rounded-lg shadow-xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default sticky top-0 bg-bg-secondary z-10">
          <h2 className="text-sm font-semibold text-text-secondary">
            {agentId ? 'Edit Agent' : 'New Agent'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="px-5 py-4 space-y-4">
          <FormField label="Name" error={errors.name} required>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="My Frontend Agent"
              className="input-field"
            />
          </FormField>

          <FormField label="Role" error={errors.role} required>
            <input
              type="text"
              value={form.role}
              onChange={e => set('role', e.target.value)}
              placeholder="Frontend Developer"
              className="input-field"
            />
          </FormField>

          <FormField label="Description" error={errors.description}>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="What does this agent do?"
              rows={2}
              className="input-field resize-none"
            />
          </FormField>

          <FormField label="Workspace Path" error={errors.workspacePath} required>
            <input
              type="text"
              value={form.workspacePath}
              onChange={e => set('workspacePath', e.target.value)}
              placeholder="/Users/you/projects/my-app"
              className="input-field font-mono text-xs"
            />
          </FormField>

          <FormField label="Model">
            <select
              value={form.model}
              onChange={e => set('model', e.target.value)}
              className="input-field"
            >
              {MODELS.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Monthly Budget ($)" error={errors.monthlyBudgetDollars}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyBudgetDollars}
                onChange={e => set('monthlyBudgetDollars', e.target.value)}
                className="input-field"
              />
            </FormField>
            <FormField label="Max Concurrent Runs">
              <input
                type="number"
                min="1"
                max="10"
                value={form.maxConcurrentRuns}
                onChange={e => set('maxConcurrentRuns', e.target.value)}
                className="input-field"
              />
            </FormField>
          </div>

          {availableSkills.length > 0 && (
            <FormField label="Skills">
              <div className="flex flex-wrap gap-1.5 pt-1">
                {availableSkills.map(skill => (
                  <button
                    key={skill.name}
                    type="button"
                    onClick={() => toggleSkill(skill.name)}
                    title={skill.description}
                    className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                      form.skills.includes(skill.name)
                        ? 'bg-coder1-cyan/10 text-coder1-cyan border-coder1-cyan/40'
                        : 'bg-bg-tertiary text-text-muted border-border-default hover:border-border-default/80'
                    }`}
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            </FormField>
          )}

          <FormField label="System Prompt" error={errors.systemPrompt} required>
            <div className="space-y-1.5">
              <textarea
                value={form.systemPrompt}
                onChange={e => set('systemPrompt', e.target.value)}
                placeholder="You are a helpful AI assistant..."
                rows={6}
                className="input-field resize-none font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => void handleGeneratePrompt()}
                disabled={generatingPrompt}
                className="flex items-center gap-1.5 text-xs text-coder1-cyan hover:text-coder1-cyan/80 disabled:opacity-50"
              >
                <Sparkles size={12} />
                {generatingPrompt ? 'Generating...' : 'Generate system prompt'}
              </button>
            </div>
          </FormField>

          {errors.submit && (
            <p className="text-xs text-red-400">{errors.submit}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-text-muted hover:text-text-secondary border border-border-default rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium bg-coder1-cyan/10 hover:bg-coder1-cyan/20 text-coder1-cyan border border-coder1-cyan/30 rounded-md transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : agentId ? 'Save Changes' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 0.375rem 0.625rem;
          background: var(--bg-tertiary, #1a1a2e);
          border: 1px solid var(--border-default, #2a2a3e);
          border-radius: 0.375rem;
          color: var(--text-secondary, #a0a0b0);
          font-size: 0.8125rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus {
          border-color: var(--coder1-cyan, #00d9ff);
        }
        .input-field option {
          background: var(--bg-secondary, #141428);
        }
      `}</style>
    </div>
  );
}

function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
