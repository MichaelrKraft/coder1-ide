'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Save, X } from 'lucide-react';
import { TokenCounter } from '@/components/shared/TokenCounter';
import type { AgentCategory, AgentPermissionLevel, AgentMarketplaceTemplate } from '@/types/agent-marketplace';

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(
  () => import('@monaco-editor/react').then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center bg-bg-primary rounded border border-border-default"
        style={{ height: 180 }}
      >
        <span className="text-text-muted text-xs">Loading editor…</span>
      </div>
    ),
  }
);

// ============================================================================
// Types
// ============================================================================

interface AgentBuilderProps {
  teamId: string;
  onCreated: (template: AgentMarketplaceTemplate) => void;
  onCancel: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES: AgentCategory[] = [
  'code-review', 'testing', 'documentation', 'security',
  'deployment', 'performance', 'accessibility', 'custom',
];

const PERMISSION_OPTIONS: { value: AgentPermissionLevel; label: string; description: string }[] = [
  { value: 'read-only', label: 'Read Only', description: 'Can read files and search code. Cannot modify anything.' },
  { value: 'file-write', label: 'File Write', description: 'Can read and write files. Cannot run terminal commands.' },
  { value: 'terminal', label: 'Terminal', description: 'Can read, write files, and run terminal commands.' },
];

const COLOR_PRESETS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

// ============================================================================
// Component
// ============================================================================

export function AgentBuilder({ teamId, onCreated, onCancel }: AgentBuilderProps): React.ReactElement {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AgentCategory>('custom');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<AgentPermissionLevel>('read-only');
  const [instructions, setInstructions] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !instructions.trim()) return;

      setIsSubmitting(true);
      setError(null);

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      try {
        const res = await fetch('/api/agent-marketplace/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId,
            name,
            description,
            longDescription,
            category,
            permissionLevel,
            tags,
            agentConfig: {
              name,
              description,
              instructions,
              tools: permissionLevel === 'read-only'
                ? ['Read', 'Grep', 'Glob']
                : permissionLevel === 'file-write'
                ? ['Read', 'Write', 'Edit', 'Grep', 'Glob']
                : ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
              color,
              model: 'claude-sonnet-4-6',
            },
          }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        const data = (await res.json()) as { template: AgentMarketplaceTemplate };
        onCreated(data.template);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create agent');
      } finally {
        setIsSubmitting(false);
      }
    },
    [teamId, name, description, longDescription, category, permissionLevel, instructions, color, tagsInput, onCreated]
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-text-primary">Create Custom Agent</h3>
        <button type="button" onClick={onCancel} className="p-1 rounded text-text-muted hover:text-text-primary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Name */}
      <FieldLabel label="Agent Name">
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="My Custom Agent" required
          className="w-full bg-bg-tertiary border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 transition-colors"
        />
      </FieldLabel>

      {/* Category */}
      <FieldLabel label="Category">
        <select
          value={category} onChange={(e) => setCategory(e.target.value as AgentCategory)}
          className="w-full bg-bg-tertiary border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50 transition-colors"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-bg-secondary">
              {c.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </option>
          ))}
        </select>
      </FieldLabel>

      {/* Description */}
      <FieldLabel label="Short Description">
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)}
          rows={2} required placeholder="What does this agent do?"
          className="w-full bg-bg-tertiary border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 transition-colors resize-none"
        />
      </FieldLabel>

      {/* Long Description */}
      <FieldLabel label="Long Description">
        <textarea
          value={longDescription} onChange={(e) => setLongDescription(e.target.value)}
          rows={3} placeholder="Detailed explanation shown in the detail panel…"
          className="w-full bg-bg-tertiary border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 transition-colors resize-none"
        />
      </FieldLabel>

      {/* Permission Level */}
      <div>
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Permission Level</p>
        <div className="space-y-1.5">
          {PERMISSION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors ${
                permissionLevel === opt.value
                  ? 'border-coder1-cyan/40 bg-coder1-cyan/5'
                  : 'border-border-default hover:border-border-default/60'
              }`}
            >
              <input
                type="radio" name="permissionLevel" value={opt.value}
                checked={permissionLevel === opt.value}
                onChange={() => setPermissionLevel(opt.value)}
                className="mt-0.5 accent-coder1-cyan"
              />
              <div>
                <p className="text-xs font-medium text-text-primary">{opt.label}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* System Instructions (Monaco) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">System Instructions</p>
          <TokenCounter content={instructions} warnAt={4000} errorAt={6000} />
        </div>
        <div className="border border-border-default rounded overflow-hidden">
          <Editor
            height={180} language="markdown" theme="vs-dark"
            value={instructions} onChange={(val) => setInstructions(val ?? '')}
            options={{
              minimap: { enabled: false }, fontSize: 12, wordWrap: 'on',
              lineNumbers: 'off', scrollBeyondLastLine: false,
              automaticLayout: true, padding: { top: 8, bottom: 8 },
              overviewRulerLanes: 0, hideCursorInOverviewRuler: true,
              overviewRulerBorder: false, renderValidationDecorations: 'off',
            }}
          />
        </div>
      </div>

      {/* Color */}
      <div>
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Agent Color</p>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset} type="button" onClick={() => setColor(preset)}
                className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                  color === preset ? 'ring-2 ring-white ring-offset-1 ring-offset-bg-secondary' : ''
                }`}
                style={{ backgroundColor: preset }}
                aria-label={`Color ${preset}`}
              />
            ))}
          </div>
          <input
            type="color" value={color} onChange={(e) => setColor(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
            title="Custom color"
          />
        </div>
      </div>

      {/* Tags */}
      <FieldLabel label="Tags (comma-separated)">
        <input
          type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
          placeholder="review, security, automation"
          className="w-full bg-bg-tertiary border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 transition-colors"
        />
      </FieldLabel>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit" disabled={isSubmitting || !name.trim() || !instructions.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-coder1-cyan/20 text-coder1-cyan border border-coder1-cyan/30 rounded text-xs font-medium hover:bg-coder1-cyan/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-3.5 h-3.5" />
          {isSubmitting ? 'Creating…' : 'Create Agent'}
        </button>
        <button
          type="button" onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary text-text-muted border border-border-default rounded text-xs font-medium hover:text-text-secondary transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Helper sub-component
// ============================================================================

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
