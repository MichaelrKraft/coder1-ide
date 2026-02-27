'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X, Save } from 'lucide-react';
import type { SlashCommand, CommandCategory } from '@/types/slash-command';

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(
  () => import('@monaco-editor/react').then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center bg-bg-primary rounded border border-border-default" style={{ height: 200 }}>
        <span className="text-text-muted text-xs">Loading editor…</span>
      </div>
    ),
  }
);

// ============================================================================
// Types
// ============================================================================

interface CommandEditorProps {
  initial?: Partial<SlashCommand>;
  teamId: string;
  onSave: (command: SlashCommand) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES: CommandCategory[] = [
  'workflow',
  'review',
  'testing',
  'docs',
  'git',
  'deployment',
  'debugging',
  'general',
];

// ============================================================================
// Helpers
// ============================================================================

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const SLUG_REGEX = /^[a-z0-9-]+$/;

// ============================================================================
// Component
// ============================================================================

export function CommandEditor({
  initial,
  teamId,
  onSave,
  onCancel,
  isLoading = false,
}: CommandEditorProps): React.ReactElement {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initial?.slug);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<CommandCategory>(initial?.category ?? 'general');
  const [content, setContent] = useState(initial?.content ?? '');
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(', '));
  const [argumentsDescription, setArgumentsDescription] = useState(initial?.argumentsDescription ?? '');
  const [slugError, setSlugError] = useState<string | null>(null);

  const hasArguments = content.includes('$ARGUMENTS');

  // Auto-generate slug from name unless manually edited
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited]);

  // Validate slug on change
  useEffect(() => {
    if (slug && !SLUG_REGEX.test(slug)) {
      setSlugError('Only lowercase letters, numbers, and hyphens allowed.');
    } else {
      setSlugError(null);
    }
  }, [slug]);

  const handleSlugChange = useCallback((value: string) => {
    setSlug(value);
    setSlugManuallyEdited(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim() || !slug.trim() || !content.trim()) return;
      if (slugError) return;

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const isEditing = !!initial?.id;
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing
        ? `/api/commands/team/${slug}`
        : '/api/commands/team';

      const body = isEditing
        ? {
            teamId,
            name,
            description,
            content,
            category,
            tags,
            argumentsDescription: hasArguments ? argumentsDescription : undefined,
            updatedBy: 'user',
            updatedByName: 'User',
          }
        : {
            teamId,
            slug,
            name,
            description,
            content,
            category,
            tags,
            argumentsDescription: hasArguments ? argumentsDescription : undefined,
            createdBy: 'user',
            createdByName: 'User',
          };

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          console.error('[CommandEditor] Save failed:', data.error);
          return;
        }

        const data = (await res.json()) as { command: SlashCommand };
        onSave(data.command);
      } catch (err) {
        console.error('[CommandEditor] Network error:', err);
      }
    },
    [
      name,
      slug,
      description,
      content,
      category,
      tagsInput,
      argumentsDescription,
      hasArguments,
      slugError,
      initial,
      teamId,
      onSave,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-3">
      {/* Name */}
      <div>
        <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Review Pull Request"
          required
          className="w-full bg-bg-tertiary border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 transition-colors"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">
          Slug
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="review-pr"
          required
          className={`w-full bg-bg-tertiary border rounded px-2.5 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none transition-colors ${
            slugError ? 'border-red-500/60' : 'border-border-default focus:border-coder1-cyan/50'
          }`}
        />
        {slugError && (
          <p className="text-red-400 text-[10px] mt-0.5">{slugError}</p>
        )}
        {!slugError && slug && (
          <p className="text-text-muted text-[10px] mt-0.5">
            Will be invoked as <span className="font-mono text-coder1-cyan">/{slug}</span>
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this command do?"
          rows={2}
          required
          className="w-full bg-bg-tertiary border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 transition-colors resize-none"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CommandCategory)}
          className="w-full bg-bg-tertiary border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50 transition-colors"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat} className="bg-bg-secondary">
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Content (Monaco) */}
      <div>
        <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">
          Content (Markdown)
        </label>
        <div className="border border-border-default rounded overflow-hidden">
          <Editor
            height={200}
            language="markdown"
            theme="vs-dark"
            value={content}
            onChange={(val) => setContent(val ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              wordWrap: 'on',
              lineNumbers: 'off',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 8, bottom: 8 },
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              renderValidationDecorations: 'off',
            }}
          />
        </div>
        <p className="text-text-muted text-[10px] mt-1">
          Use <span className="font-mono text-coder1-cyan">$ARGUMENTS</span> as a placeholder for dynamic input.{' '}
          Example: <span className="font-mono text-text-secondary">/project:fix-issue 1234</span>
        </p>
      </div>

      {/* Arguments Description (only when $ARGUMENTS detected) */}
      {hasArguments && (
        <div>
          <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">
            Arguments Description
          </label>
          <input
            type="text"
            value={argumentsDescription}
            onChange={(e) => setArgumentsDescription(e.target.value)}
            placeholder="e.g. Issue number or PR URL"
            className="w-full bg-bg-tertiary border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 transition-colors"
          />
        </div>
      )}

      {/* Tags */}
      <div>
        <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="pr, github, review"
          className="w-full bg-bg-tertiary border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 transition-colors"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isLoading || !!slugError || !name.trim() || !slug.trim() || !content.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-coder1-cyan/20 text-coder1-cyan border border-coder1-cyan/30 rounded text-xs font-medium hover:bg-coder1-cyan/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-3.5 h-3.5" />
          {isLoading ? 'Saving…' : initial?.id ? 'Update Command' : 'Create Command'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary text-text-muted border border-border-default rounded text-xs font-medium hover:text-text-secondary transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
    </form>
  );
}
