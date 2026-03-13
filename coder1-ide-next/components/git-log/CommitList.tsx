'use client';

import React from 'react';

export type ContextStatus = 'done' | 'pending' | 'generating' | 'failed' | 'no_session' | 'none';

export interface GitLogEntry {
  sha: string;
  shortSha: string;
  author: string;
  date: string;
  message: string;
  contextStatus: ContextStatus;
}

interface CommitListProps {
  entries: GitLogEntry[];
  selectedSha: string | null;
  onSelectCommit: (sha: string) => void;
  loading: boolean;
}

function ContextBadge({ status }: { status: ContextStatus }) {
  if (status === 'none' || status === 'no_session') return null;

  const config: Record<string, { label: string; className: string }> = {
    done: {
      label: 'AI context',
      className: 'bg-green-900/40 text-green-400 border border-green-700/50',
    },
    generating: {
      label: 'generating...',
      className: 'bg-yellow-900/30 text-yellow-500 border border-yellow-700/40 animate-pulse',
    },
    pending: {
      label: 'queued',
      className: 'bg-blue-900/30 text-blue-400 border border-blue-700/40',
    },
    failed: {
      label: 'failed',
      className: 'bg-red-900/30 text-red-400 border border-red-700/40',
    },
  };

  const c = config[status];
  if (!c) return null;

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ml-2 ${c.className}`}>
      {c.label}
    </span>
  );
}

function formatRelativeDate(isoDate: string): string {
  try {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return isoDate.slice(0, 10);
  }
}

export function CommitList({ entries, selectedSha, onSelectCommit, loading }: CommitListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        Loading git history...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No commits found
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-gray-800">
      {entries.map(entry => (
        <button
          key={entry.sha}
          onClick={() => onSelectCommit(entry.sha)}
          className={`w-full text-left px-4 py-3 hover:bg-gray-800/60 transition-colors ${
            selectedSha === entry.sha ? 'bg-gray-800' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                entry.contextStatus === 'done' ? 'bg-green-400' : 'bg-gray-600'
              }`}
            />
            <code className="text-xs text-[#00D9FF] font-mono">{entry.shortSha}</code>
            <ContextBadge status={entry.contextStatus} />
            <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
              {formatRelativeDate(entry.date)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-300 truncate pl-4">
            {entry.message}
          </p>
          <p className="text-xs text-gray-600 pl-4 mt-0.5">{entry.author}</p>
        </button>
      ))}
    </div>
  );
}
