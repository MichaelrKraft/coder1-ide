'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Run } from '@/lib/agent-hub/runs';

const DiffEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.DiffEditor),
  { ssr: false }
);

interface Props {
  run: Run;
  onApproved: () => void;
  onRejected: () => void;
}

type ActionState = 'idle' | 'approving' | 'rejecting' | 'done';

export function RunApproval({ run, onApproved, onRejected }: Props): React.ReactElement {
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [showConfirm, setShowConfirm] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = actionState === 'approving' || actionState === 'rejecting';

  const handleApprove = async () => {
    setActionState('approving');
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/agent-hub/runs/${run.id}/approve`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setResultMessage('Changes committed successfully');
      setActionState('done');
      onApproved();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Approve failed');
      setActionState('idle');
    }
  };

  const handleRejectConfirmed = async () => {
    setShowConfirm(false);
    setActionState('rejecting');
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/agent-hub/runs/${run.id}/reject`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setResultMessage('Changes discarded');
      setActionState('done');
      onRejected();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Reject failed');
      setActionState('idle');
    }
  };

  const diffContent = run.gitDiff ?? '';
  const hasChanges = diffContent.length > 0;

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Review Agent Changes</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {hasChanges ? 'Changes ready for review' : 'No file changes detected'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isBusy || actionState === 'done'}
            className="px-3 py-1.5 text-xs rounded border border-gray-600 text-gray-400 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {actionState === 'rejecting' ? 'Rejecting...' : 'Reject'}
          </button>
          <button
            onClick={() => { void handleApprove(); }}
            disabled={isBusy || actionState === 'done'}
            className="px-3 py-1.5 text-xs rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {actionState === 'approving' ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>

      {/* Status messages */}
      {resultMessage && (
        <div className="mx-4 mt-3 px-3 py-2 rounded bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
          {resultMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mx-4 mt-3 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Diff viewer */}
      <div className="flex-1 min-h-0 mt-2">
        {hasChanges ? (
          <DiffEditor
            height="100%"
            theme="vs-dark"
            language="diff"
            original=""
            modified={diffContent}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              renderSideBySide: false,
            }}
          />
        ) : (
          <div className="p-6 text-text-muted text-sm text-center">
            No git diff available for this run
          </div>
        )}
      </div>

      {/* Reject confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-surface-elevated border border-border rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h4 className="text-sm font-semibold text-text-primary mb-2">Reject changes?</h4>
            <p className="text-xs text-text-secondary mb-4">
              This will discard all agent changes. They cannot be recovered. Proceed?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 text-xs rounded border border-border text-text-secondary hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { void handleRejectConfirmed(); }}
                className="px-3 py-1.5 text-xs rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Yes, discard changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
