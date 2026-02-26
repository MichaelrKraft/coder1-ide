'use client';

import React, { useEffect, useState } from 'react';
import type { ClaudeMdVersion } from '@/types/claude-md';
import { analyzeClaudeMd } from '@/lib/claude-md-analysis';
import { ClaudeMdEditor } from './ClaudeMdEditor';
import { ClaudeMdTemplates } from './ClaudeMdTemplates';
import type { ClaudeMdTemplate } from '@/types/claude-md';

// ============================================================================
// Types
// ============================================================================

interface ClaudeMdTabProps {
  teamId: string | null;
}

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  } catch {
    return iso;
  }
}

type WarnLevel = 'ok' | 'warning' | 'error';

function levelColor(level: WarnLevel): string {
  if (level === 'error') return 'text-red-400';
  if (level === 'warning') return 'text-amber-400';
  return 'text-green-400';
}

// ============================================================================
// Component
// ============================================================================

export function ClaudeMdTab({ teamId }: ClaudeMdTabProps): React.ReactElement {
  const [version, setVersion] = useState<ClaudeMdVersion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    setIsLoading(true);

    fetch(`/api/team/${teamId}/claude-md`)
      .then((r) => r.json())
      .then((body: { version: ClaudeMdVersion | null }) => {
        setVersion(body.version);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [teamId]);

  const handleTemplateApply = (template: ClaudeMdTemplate, mode: 'replace' | 'append') => {
    if (!teamId) return;
    const content =
      mode === 'append' && version
        ? `${version.content}\n\n${template.content}`
        : template.content;

    fetch(`/api/team/${teamId}/claude-md`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, savedByName: 'You', changeNote: `Applied template: ${template.name}` }),
    })
      .then((r) => r.json())
      .then((body: { version?: ClaudeMdVersion }) => {
        if (body.version) setVersion(body.version);
      })
      .catch(console.error);

    setShowTemplates(false);
  };

  // No team
  if (!teamId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <svg
          className="w-10 h-10 text-text-muted/30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-sm text-text-muted">
          Join or create a team to access Team Brain
        </p>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400" />
      </div>
    );
  }

  // Empty state
  if (!version) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
          <svg
            className="w-10 h-10 text-text-muted/30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">
              No CLAUDE.md yet
            </p>
            <p className="text-xs text-text-muted">
              Your team hasn&apos;t set up their CLAUDE.md yet
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditor(true)}
              className="px-4 py-2 text-sm bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 rounded transition-all"
            >
              Create from scratch
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="px-4 py-2 text-sm bg-bg-primary hover:bg-bg-primary/80 border border-border-default text-text-secondary hover:text-text-primary rounded transition-all"
            >
              Use a template
            </button>
          </div>
        </div>

        <ClaudeMdTemplates
          isOpen={showTemplates}
          onClose={() => setShowTemplates(false)}
          onApply={handleTemplateApply}
          currentContent=""
        />

        {showEditor && (
          <ClaudeMdEditor
            teamId={teamId}
            isOpen={showEditor}
            onClose={() => {
              setShowEditor(false);
              // Refresh version after close
              fetch(`/api/team/${teamId}/claude-md`)
                .then((r) => r.json())
                .then((body: { version: ClaudeMdVersion | null }) => {
                  setVersion(body.version);
                })
                .catch(console.error);
            }}
          />
        )}
      </>
    );
  }

  // Has version — show summary card
  const analysis = analyzeClaudeMd(version.content);

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Team Brain</h3>
        <p className="text-xs text-text-muted">
          Your shared CLAUDE.md gives Claude context about your project, tech stack, and coding standards.
        </p>

        {/* Summary card */}
        <div className="p-4 bg-bg-tertiary rounded-lg border border-border-default space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-text-muted">v{version.version}</span>
                <span className="text-xs text-text-muted">·</span>
                <span className="text-xs text-text-muted">
                  {version.savedByName} · {formatRelativeTime(version.createdAt)}
                </span>
              </div>
              {version.changeNote && (
                <p className="text-xs text-text-muted italic">{version.changeNote}</p>
              )}
            </div>
            <button
              onClick={() => setShowEditor(true)}
              className="shrink-0 px-3 py-1.5 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 hover:border-cyan-500/60 text-cyan-400 rounded transition-all"
            >
              Open Editor
            </button>
          </div>

          {/* Metrics row */}
          <div className="flex gap-4 pt-1 border-t border-border-default">
            <div className="text-xs">
              <span className="text-text-muted">Tokens: </span>
              <span className={levelColor(analysis.tokenWarningLevel)}>
                ~{analysis.estimatedTokens.toLocaleString()}
              </span>
            </div>
            <div className="text-xs">
              <span className="text-text-muted">Instructions: </span>
              <span className={levelColor(analysis.instructionWarningLevel)}>
                {analysis.instructionCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showEditor && (
        <ClaudeMdEditor
          teamId={teamId}
          isOpen={showEditor}
          onClose={() => {
            setShowEditor(false);
            // Refresh version after close
            fetch(`/api/team/${teamId}/claude-md`)
              .then((r) => r.json())
              .then((body: { version: ClaudeMdVersion | null }) => {
                setVersion(body.version);
              })
              .catch(console.error);
          }}
        />
      )}
    </>
  );
}
