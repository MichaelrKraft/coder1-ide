'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { ClaudeMdTemplate, ClaudeMdVersion } from '@/types/claude-md';
import { analyzeClaudeMd } from '@/lib/claude-md-analysis';
import type { PresenceUser } from '@/components/shared/PresenceAvatars';
import type { VersionEntry } from '@/components/shared/VersionHistoryDrawer';
import { PresenceAvatars } from '@/components/shared/PresenceAvatars';
import { VersionHistoryDrawer } from '@/components/shared/VersionHistoryDrawer';
import { ClaudeMdToolbar } from './ClaudeMdToolbar';
import { ClaudeMdSectionGuide } from './ClaudeMdSectionGuide';
import { ClaudeMdTemplates } from './ClaudeMdTemplates';

// Dynamic imports to avoid SSR issues
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => ({ default: m.default })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-bg-primary">
        <span className="text-text-muted text-sm">Loading editor…</span>
      </div>
    ),
  }
);

// ============================================================================
// Types
// ============================================================================

interface ClaudeMdEditorProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  presenceUsers?: PresenceUser[];
}

// ============================================================================
// Component
// ============================================================================

export function ClaudeMdEditor({
  teamId,
  isOpen,
  onClose,
  presenceUsers = [],
}: ClaudeMdEditorProps): React.ReactElement | null {
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [currentVersion, setCurrentVersion] = useState<ClaudeMdVersion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyVersions, setHistoryVersions] = useState<VersionEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const isMountedRef = useRef(true);

  const isDirty = content !== savedContent;
  const analysis = analyzeClaudeMd(content);

  // Load current CLAUDE.md on open
  useEffect(() => {
    if (!isOpen) return;
    isMountedRef.current = true;
    setIsLoading(true);

    fetch(`/api/team/${teamId}/claude-md`)
      .then((r) => r.json())
      .then((body: { version: ClaudeMdVersion | null; error?: string }) => {
        if (!isMountedRef.current) return;
        const loaded = body.version?.content ?? '';
        setContent(loaded);
        setSavedContent(loaded);
        setCurrentVersion(body.version);
      })
      .catch(console.error)
      .finally(() => {
        if (isMountedRef.current) setIsLoading(false);
      });

    return () => {
      isMountedRef.current = false;
    };
  }, [isOpen, teamId]);

  const handleSave = useCallback(
    (changeNote?: string) => {
      if (!isDirty) return;
      setIsSaving(true);

      fetch(`/api/team/${teamId}/claude-md`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, changeNote, savedByName: 'You' }),
      })
        .then((r) => r.json())
        .then((body: { version?: ClaudeMdVersion; error?: string }) => {
          if (!isMountedRef.current) return;
          if (body.version) {
            setSavedContent(content);
            setCurrentVersion(body.version);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (isMountedRef.current) setIsSaving(false);
        });
    },
    [content, isDirty, teamId]
  );

  const handleDeploy = useCallback(() => {
    // Placeholder: in a real implementation this would push the file to the project
    setIsDeploying(true);
    setTimeout(() => {
      if (isMountedRef.current) setIsDeploying(false);
    }, 1500);
  }, []);

  const handleHistoryToggle = useCallback(() => {
    setShowHistory((prev) => {
      const next = !prev;
      if (next) {
        setIsHistoryLoading(true);
        fetch(`/api/team/${teamId}/claude-md/history?limit=20`)
          .then((r) => r.json())
          .then((body: { versions?: ClaudeMdVersion[]; error?: string }) => {
            if (!isMountedRef.current) return;
            const entries: VersionEntry[] = (body.versions ?? []).map((v) => ({
              version: v.version,
              savedBy: v.savedBy,
              savedByName: v.savedByName,
              changeNote: v.changeNote,
              createdAt: v.createdAt,
            }));
            setHistoryVersions(entries);
          })
          .catch(console.error)
          .finally(() => {
            if (isMountedRef.current) setIsHistoryLoading(false);
          });
      }
      return next;
    });
  }, [teamId]);

  const handleRestore = useCallback(
    (version: number) => {
      const entry = historyVersions.find((v) => v.version === version);
      if (!entry) return;
      // We don't have the content in VersionEntry, so re-fetch full history to get it
      fetch(`/api/team/${teamId}/claude-md/history?limit=20`)
        .then((r) => r.json())
        .then((body: { versions?: ClaudeMdVersion[] }) => {
          const found = (body.versions ?? []).find((v) => v.version === version);
          if (found && isMountedRef.current) {
            setContent(found.content);
            setShowHistory(false);
          }
        })
        .catch(console.error);
    },
    [historyVersions, teamId]
  );

  const handleTemplateApply = useCallback(
    (template: ClaudeMdTemplate, mode: 'replace' | 'append') => {
      if (mode === 'replace') {
        setContent(template.content);
      } else {
        setContent((prev) => `${prev}\n\n${template.content}`);
      }
    },
    []
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Full-screen overlay */}
      <div
        className="fixed inset-0 z-[200] flex flex-col bg-bg-primary"
        aria-label="CLAUDE.md editor"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-default bg-bg-secondary shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
              aria-label="Close editor"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <span className="text-text-muted/40">|</span>
            <h1 className="text-sm font-semibold text-text-primary">
              CLAUDE.md — Team Brain
            </h1>
          </div>
          <PresenceAvatars users={presenceUsers} />
        </div>

        {/* Toolbar */}
        <div className="shrink-0">
          <ClaudeMdToolbar
            analysis={analysis}
            version={currentVersion?.version ?? 0}
            onSave={handleSave}
            onDeploy={handleDeploy}
            onHistoryToggle={handleHistoryToggle}
            isSaving={isSaving}
            isDeploying={isDeploying}
            isDirty={isDirty}
          />
        </div>

        {/* Main area: editor + section guide */}
        <div className="flex flex-1 overflow-hidden">
          {/* Monaco editor */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-sm text-text-muted">
                Loading…
              </div>
            ) : (
              <MonacoEditor
                height="100%"
                language="markdown"
                value={content}
                theme="vs-dark"
                onChange={(val) => setContent(val ?? '')}
                options={{
                  wordWrap: 'on',
                  minimap: { enabled: false },
                  fontSize: 14,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  overviewRulerLanes: 0,
                  renderValidationDecorations: 'off',
                }}
              />
            )}
          </div>

          {/* Section guide sidebar */}
          <div className="w-44 shrink-0 border-l border-border-default bg-bg-secondary overflow-y-auto p-3">
            <ClaudeMdSectionGuide content={content} />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-2 border-t border-border-default bg-bg-secondary flex items-center">
          <button
            onClick={() => setShowTemplates(true)}
            className="text-xs text-text-muted hover:text-cyan-400 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Start from template
          </button>
        </div>
      </div>

      {/* Version history drawer */}
      <VersionHistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        versions={historyVersions}
        currentVersion={currentVersion?.version ?? 0}
        onRestore={handleRestore}
        isLoading={isHistoryLoading}
      />

      {/* Templates modal */}
      <ClaudeMdTemplates
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onApply={handleTemplateApply}
        currentContent={content}
      />
    </>
  );
}
