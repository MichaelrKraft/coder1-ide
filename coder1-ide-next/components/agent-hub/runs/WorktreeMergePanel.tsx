'use client';

import { useState, useEffect, useCallback } from 'react';
import { GitBranch, GitMerge, Trash2, Archive, AlertTriangle, Loader2 } from 'lucide-react';

interface WorktreeStatus {
  worktreePath: string;
  branch: string;
  filesChanged: number;
  files: string[];
  insertions: number;
  deletions: number;
  diff: string;
}

type PanelState = 'loading' | 'ready' | 'merging' | 'merged' | 'discarded' | 'conflict' | 'error' | 'not-found';

interface Props {
  runId: string;
}

export default function WorktreeMergePanel({ runId }: Props) {
  const [state, setState] = useState<PanelState>('loading');
  const [status, setStatus] = useState<WorktreeStatus | null>(null);
  const [message, setMessage] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent-hub/runs/${runId}/worktree`);
      if (res.status === 404) {
        setState('not-found');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as WorktreeStatus;
      setStatus(data);
      setState('ready');
    } catch {
      setState('error');
      setMessage('Failed to load worktree status');
    }
  }, [runId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  async function handleAction(action: 'merge' | 'discard' | 'keep') {
    setState('merging');
    setMessage('');
    try {
      const res = await fetch(`/api/agent-hub/runs/${runId}/worktree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json() as { success?: boolean; conflict?: boolean; message?: string; error?: string };

      if (res.status === 409 && data.conflict) {
        setState('conflict');
        setMessage(data.message ?? 'Merge conflict detected');
        return;
      }

      if (!res.ok) {
        setState('ready');
        setMessage(data.error ?? 'Operation failed');
        return;
      }

      if (action === 'merge') {
        setState('merged');
        setMessage('Changes merged successfully');
      } else if (action === 'discard') {
        setState('discarded');
        setMessage('Worktree discarded');
      } else {
        setState('ready');
        setMessage('Worktree kept');
      }
    } catch {
      setState('ready');
      setMessage('Network error');
    }
  }

  if (state === 'loading') {
    return (
      <div className="px-4 py-3 border-t border-border flex items-center gap-2 text-xs text-text-muted">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading worktree status...
      </div>
    );
  }

  if (state === 'not-found') return null;

  if (state === 'merged' || state === 'discarded') {
    return (
      <div className={`px-4 py-3 border-t ${state === 'merged' ? 'border-green-500/30 bg-green-900/10' : 'border-border bg-bg-tertiary'}`}>
        <p className={`text-xs ${state === 'merged' ? 'text-green-400' : 'text-text-muted'}`}>
          {message}
        </p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="px-4 py-3 border-t border-red-500/30 bg-red-900/10">
        <p className="text-xs text-red-400">{message}</p>
      </div>
    );
  }

  return (
    <div className="border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary border-b border-border">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3 h-3 text-coder1-cyan" />
          <span className="text-xs font-medium text-text-secondary">
            {status?.branch ?? 'Worktree'}
          </span>
        </div>
        {status && (
          <div className="flex items-center gap-3 text-[10px] text-text-muted">
            <span>{status.filesChanged} file{status.filesChanged !== 1 ? 's' : ''} changed</span>
            <span className="text-green-400">+{status.insertions}</span>
            <span className="text-red-400">-{status.deletions}</span>
          </div>
        )}
      </div>

      {/* File list */}
      {status && status.files.length > 0 && (
        <div className="px-4 py-2 max-h-24 overflow-y-auto">
          {status.files.map(file => (
            <div key={file} className="text-[10px] text-text-muted font-mono py-0.5 truncate">
              {file}
            </div>
          ))}
        </div>
      )}

      {/* Conflict warning */}
      {state === 'conflict' && (
        <div className="px-4 py-2 bg-yellow-900/10 border-y border-yellow-500/30">
          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>{message}</span>
          </div>
          <p className="text-[10px] text-text-muted mt-1">
            Resolve conflicts manually in the workspace, or discard the worktree.
          </p>
        </div>
      )}

      {/* Message */}
      {message && state === 'ready' && (
        <div className="px-4 py-1.5">
          <p className="text-[10px] text-text-muted">{message}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          onClick={() => void handleAction('merge')}
          disabled={state === 'merging' || state === 'conflict'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-coder1-cyan/10 text-coder1-cyan border border-coder1-cyan/30 rounded hover:bg-coder1-cyan/20 transition-colors disabled:opacity-40"
        >
          {state === 'merging' ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitMerge className="w-3 h-3" />}
          Squash Merge
        </button>

        <button
          onClick={() => void handleAction('keep')}
          disabled={state === 'merging'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted border border-border-default rounded hover:border-text-muted/40 transition-colors disabled:opacity-40"
        >
          <Archive className="w-3 h-3" />
          Keep Branch
        </button>

        {!confirmDiscard ? (
          <button
            onClick={() => setConfirmDiscard(true)}
            disabled={state === 'merging'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400/70 border border-red-500/20 rounded hover:border-red-500/40 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3 h-3" />
            Discard
          </button>
        ) : (
          <button
            onClick={() => { setConfirmDiscard(false); void handleAction('discard'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-900/20 border border-red-500/40 rounded hover:bg-red-900/30 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Confirm Discard
          </button>
        )}
      </div>
    </div>
  );
}
