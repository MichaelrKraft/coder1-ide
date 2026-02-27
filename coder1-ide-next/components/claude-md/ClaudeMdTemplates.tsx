'use client';

import React, { useEffect, useState } from 'react';
import type { ClaudeMdTemplate } from '@/types/claude-md';

// ============================================================================
// Types
// ============================================================================

interface ClaudeMdTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (template: ClaudeMdTemplate, mode: 'replace' | 'append') => void;
  currentContent: string;
}

// ============================================================================
// Helpers
// ============================================================================

const CATEGORY_COLORS: Record<ClaudeMdTemplate['category'], string> = {
  web: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  api: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  mobile: 'bg-green-500/20 text-green-300 border-green-500/30',
  data: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  general: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

// ============================================================================
// Component
// ============================================================================

export function ClaudeMdTemplates({
  isOpen,
  onClose,
  onApply,
  currentContent,
}: ClaudeMdTemplatesProps): React.ReactElement | null {
  const [templates, setTemplates] = useState<ClaudeMdTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ClaudeMdTemplate | null>(null);

  // Load templates when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);

    fetch('/api/claude-md/templates')
      .then((r) => r.json())
      .then((body: { templates?: ClaudeMdTemplate[]; error?: string }) => {
        if (body.error) throw new Error(body.error);
        setTemplates(body.templates ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const hasCurrentContent = currentContent.trim().length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60"
        onClick={() => {
          setSelected(null);
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-60 flex items-center justify-center p-6"
        style={{ zIndex: 60 }}
      >
        <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
            <h2 className="text-base font-semibold text-text-primary">
              Start from a Template
            </h2>
            <button
              onClick={() => {
                setSelected(null);
                onClose();
              }}
              className="text-text-muted hover:text-text-primary transition-colors"
              aria-label="Close templates"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-text-muted">
                Loading templates…
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-sm text-red-400">
                {error}
              </div>
            ) : selected ? (
              // Confirmation view
              <div className="space-y-4">
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to templates
                </button>

                <div className="p-4 bg-bg-primary rounded border border-border-default">
                  <h3 className="text-sm font-semibold text-text-primary mb-1">
                    {selected.name}
                  </h3>
                  <p className="text-xs text-text-muted">{selected.description}</p>
                </div>

                <p className="text-sm text-text-secondary">
                  How would you like to apply this template?
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      onApply(selected, 'replace');
                      setSelected(null);
                      onClose();
                    }}
                    className="flex-1 px-4 py-3 text-sm bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded transition-all"
                  >
                    Replace all
                    <span className="block text-xs text-red-400/70 mt-0.5">
                      Overwrites your current content
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onApply(selected, 'append');
                      setSelected(null);
                      onClose();
                    }}
                    disabled={!hasCurrentContent}
                    className="flex-1 px-4 py-3 text-sm bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Append to existing
                    <span className="block text-xs text-cyan-400/70 mt-0.5">
                      Adds template below current content
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              // Grid view
              <div className="grid grid-cols-2 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelected(template)}
                    className="text-left p-4 bg-bg-primary hover:bg-bg-primary/80 border border-border-default hover:border-cyan-500/40 rounded-lg transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-text-primary group-hover:text-cyan-400 transition-colors">
                        {template.name}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize shrink-0 ${CATEGORY_COLORS[template.category]}`}
                      >
                        {template.category}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted line-clamp-2 mb-2">
                      {template.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 bg-bg-secondary border border-border-default rounded text-text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
