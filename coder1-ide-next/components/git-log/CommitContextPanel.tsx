'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { GitLogEntry } from './CommitList';
import { ScreenshotStrip } from '@/components/flowtrace/ScreenshotStrip';

interface CommitContext {
  id: string;
  commit_sha: string;
  branch: string;
  commit_message: string | null;
  commit_author: string | null;
  commit_timestamp: string | null;
  session_id: string | null;
  session_summary: string | null;
  summary_status: string;
  files_changed: string | null;
  created_at: string;
}

interface CommitContextPanelProps {
  entry: GitLogEntry | null;
  context: CommitContext | null;
  loading: boolean;
  onRetry: () => void;
  onClose: () => void;
}

function FilesList({ filesChangedJson }: { filesChangedJson: string | null }) {
  if (!filesChangedJson) return null;
  try {
    const files = JSON.parse(filesChangedJson) as { path: string; status: string }[];
    if (files.length === 0) return null;
    return (
      <div className="mt-4">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Files Changed ({files.length})
        </h4>
        <ul className="space-y-1">
          {files.map(f => (
            <li key={f.path} className="flex items-center gap-2 text-xs font-mono">
              <span
                className={`w-4 text-center font-bold ${
                  f.status === 'A' ? 'text-green-400' :
                  f.status === 'D' ? 'text-red-400' :
                  'text-yellow-400'
                }`}
              >
                {f.status}
              </span>
              <span className="text-gray-300 truncate">{f.path}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  } catch {
    return null;
  }
}

export function CommitContextPanel({
  entry,
  context,
  loading,
  onRetry,
  onClose,
}: CommitContextPanelProps) {
  const router = useRouter();

  if (!entry) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Select a commit to view context
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <code className="text-[#00D9FF] font-mono text-sm">{entry.shortSha}</code>
          <span className="text-gray-500 text-xs ml-2">{entry.date.slice(0, 10)}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 text-lg leading-none"
          aria-label="Close panel"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-white font-medium text-sm mb-1">{entry.message}</h3>
        <p className="text-gray-500 text-xs mb-4">
          {entry.author} &middot; {entry.date.slice(0, 10)}
        </p>

        {loading ? (
          <div className="text-gray-500 text-sm animate-pulse">Loading context...</div>
        ) : context ? (
          <>
            {context.session_summary && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  AI Context
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {context.session_summary}
                </p>
              </div>
            )}

            {context.summary_status === 'generating' && (
              <p className="text-yellow-500 text-xs animate-pulse mb-3">
                Generating summary...
              </p>
            )}
            {context.summary_status === 'failed' && (
              <div className="mb-3">
                <p className="text-red-400 text-xs mb-1">Summary generation failed.</p>
                <button
                  onClick={onRetry}
                  className="text-xs text-[#00D9FF] hover:underline"
                >
                  Retry
                </button>
              </div>
            )}
            {context.summary_status === 'no_session' && (
              <p className="text-gray-500 text-xs mb-3">
                Commit made outside of a Coder1 session &mdash; no AI context available.
              </p>
            )}

            <FilesList filesChangedJson={context.files_changed} />

            {context.session_id && <ScreenshotStrip sessionId={context.session_id} />}

            {context.session_id && (
              <div className="mt-6 pt-4 border-t border-gray-800">
                <button
                  onClick={() => router.push(`/memory?sessionId=${context.session_id}`)}
                  className="text-xs text-[#00D9FF] hover:underline"
                >
                  View Full Session &rarr;
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-sm">
            No context captured for this commit.
          </p>
        )}
      </div>
    </div>
  );
}
