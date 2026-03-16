'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CommitList, type GitLogEntry } from '@/components/git-log/CommitList';
import { CommitContextPanel } from '@/components/git-log/CommitContextPanel';
import { ArrowLeft } from 'lucide-react';

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

function GitLogPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [entries, setEntries] = useState<GitLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [context, setContext] = useState<CommitContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  const loadGitLog = useCallback(async () => {
    try {
      setLogLoading(true);
      const res = await fetch('/api/git-log?limit=100');
      if (!res.ok) return;
      const data = await res.json() as { entries?: GitLogEntry[] };
      setEntries(data.entries ?? []);
    } catch {
      // Non-fatal
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGitLog();
  }, [loadGitLog]);

  // Pre-select commit from ?sha= URL param (e.g. from ErrorDoctor "seen before" links).
  // Accepts both full SHA and 7-char short SHA.
  const initialSha = searchParams.get('sha');
  useEffect(() => {
    if (!initialSha || entries.length === 0 || selectedSha) return;
    const match = entries.find(
      (e) => e.sha === initialSha || e.shortSha === initialSha || e.sha.startsWith(initialSha)
    );
    if (match) handleSelectCommit(match.sha);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSha, entries.length]);

  // Socket.IO real-time updates omitted: getSocket is async and requires
  // session auth — polling via loadGitLog on mount is sufficient for now.

  const loadContextForSha = useCallback(async (sha: string) => {
    setContextLoading(true);
    setContext(null);
    try {
      const res = await fetch(`/api/commit-contexts/${sha}`);
      if (res.ok) {
        const data = await res.json() as { context?: CommitContext };
        setContext(data.context ?? null);
      }
    } finally {
      setContextLoading(false);
    }
  }, []);

  const handleSelectCommit = useCallback((sha: string) => {
    setSelectedSha(sha);
    void loadContextForSha(sha);
  }, [loadContextForSha]);

  const handleRetry = useCallback(async () => {
    if (!selectedSha) return;
    await fetch(`/api/commit-contexts/${selectedSha}/retry-summary`, { method: 'POST' });
    setContext(prev => prev ? { ...prev, summary_status: 'pending' } : null);
  }, [selectedSha]);

  const handleClose = useCallback(() => {
    setSelectedSha(null);
    setContext(null);
  }, []);

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <div className={`flex flex-col border-r border-gray-800 overflow-hidden ${selectedSha ? 'w-96' : 'flex-1'}`}>
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/ide')}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              title="Back to IDE"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-semibold text-gray-200">Git History</h1>
          </div>
          <button
            onClick={loadGitLog}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Refresh
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <CommitList
            entries={entries}
            selectedSha={selectedSha}
            onSelectCommit={handleSelectCommit}
            loading={logLoading}
          />
        </div>
      </div>

      {selectedSha && (
        <div className="flex-1 overflow-hidden">
          <CommitContextPanel
            entry={entries.find(e => e.sha === selectedSha) ?? null}
            context={context}
            loading={contextLoading}
            onRetry={handleRetry}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
}

export default function GitLogPage() {
  return (
    <Suspense fallback={<div className="flex h-screen bg-gray-950" />}>
      <GitLogPageContent />
    </Suspense>
  );
}
