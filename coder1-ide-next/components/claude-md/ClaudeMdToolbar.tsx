'use client';

import React, { useState } from 'react';
import type { ClaudeMdAnalysis } from '@/types/claude-md';

// ============================================================================
// Types
// ============================================================================

interface ClaudeMdToolbarProps {
  analysis: ClaudeMdAnalysis;
  version: number;
  onSave: (changeNote?: string) => void;
  onDeploy: () => void;
  onHistoryToggle: () => void;
  isSaving?: boolean;
  isDeploying?: boolean;
  isDirty?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

type WarnLevel = 'ok' | 'warning' | 'error';

function levelColor(level: WarnLevel): string {
  if (level === 'error') return 'text-red-400';
  if (level === 'warning') return 'text-amber-400';
  return 'text-green-400';
}

// ============================================================================
// Component
// ============================================================================

export function ClaudeMdToolbar({
  analysis,
  version,
  onSave,
  onDeploy,
  onHistoryToggle,
  isSaving = false,
  isDeploying = false,
  isDirty = false,
}: ClaudeMdToolbarProps): React.ReactElement {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [changeNote, setChangeNote] = useState('');

  const handleSaveClick = () => {
    if (showNoteInput) {
      onSave(changeNote.trim() || undefined);
      setShowNoteInput(false);
      setChangeNote('');
    } else {
      setShowNoteInput(true);
    }
  };

  const handleCancelNote = () => {
    setShowNoteInput(false);
    setChangeNote('');
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-border-default bg-bg-secondary">
      {/* Metrics */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span
          className={`text-xs font-mono ${levelColor(analysis.tokenWarningLevel)}`}
          title="Estimated token count"
        >
          ~{analysis.estimatedTokens.toLocaleString()} tokens
        </span>

        <span className="text-text-muted/40 text-xs">|</span>

        <span
          className={`text-xs font-mono ${levelColor(analysis.instructionWarningLevel)}`}
          title="Number of instruction lines"
        >
          {analysis.instructionCount} instructions
        </span>

        <span className="text-text-muted/40 text-xs">|</span>

        <span className="text-xs text-text-muted">v{version}</span>

        {isDirty && (
          <span className="text-xs text-amber-400 font-medium">● unsaved</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Change note input (inline, shown after first Save click) */}
        {showNoteInput && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveClick();
                if (e.key === 'Escape') handleCancelNote();
              }}
              placeholder="Change note (optional)"
              className="px-2 py-1 text-xs bg-bg-primary border border-border-default rounded text-text-primary placeholder:text-text-muted w-44 focus:outline-none focus:border-cyan-500/60"
              autoFocus
            />
            <button
              onClick={handleCancelNote}
              className="text-xs text-text-muted hover:text-text-primary transition-colors px-1"
              aria-label="Cancel"
            >
              ✕
            </button>
          </div>
        )}

        {/* History */}
        <button
          onClick={onHistoryToggle}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary bg-transparent hover:bg-bg-primary border border-border-default rounded transition-all"
          aria-label="View version history"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          History
        </button>

        {/* Deploy */}
        <button
          onClick={onDeploy}
          disabled={isDeploying}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-purple-400 bg-transparent hover:bg-purple-500/10 border border-purple-500/40 hover:border-purple-500/60 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Deploy CLAUDE.md to project"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          {isDeploying ? 'Deploying…' : 'Deploy'}
        </button>

        {/* Save */}
        <button
          onClick={handleSaveClick}
          disabled={isSaving || !isDirty}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 hover:border-cyan-500/60 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={showNoteInput ? 'Confirm save' : 'Save CLAUDE.md'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
            />
          </svg>
          {isSaving ? 'Saving…' : showNoteInput ? 'Confirm' : 'Save'}
        </button>
      </div>
    </div>
  );
}
