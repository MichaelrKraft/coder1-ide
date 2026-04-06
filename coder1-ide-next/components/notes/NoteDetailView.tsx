'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Eye, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import type { VaultNote } from '@/lib/vault-types';
import NoteEditor from '@/components/notes/NoteEditor';
import NoteViewer from '@/components/notes/NoteViewer';
import BacklinksPanel from '@/components/notes/BacklinksPanel';
import ConflictBanner from '@/components/notes/ConflictBanner';
import { useVaultStore } from '@/stores/useVaultStore';

export interface NoteDetailViewProps {
  notePath: string;
  onClose?: () => void;
  onNavigate?: (path: string) => void;
}

export default function NoteDetailView({ notePath, onClose, onNavigate }: NoteDetailViewProps) {
  const [note, setNote] = useState<VaultNote | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'edit' | 'preview'>(
    notePath.startsWith('Sessions/') ? 'preview' : 'edit'
  );
  const [backlinksOpen, setBacklinksOpen] = useState(true);
  const [diskContent, setDiskContent] = useState<string | null>(null);
  const [summarizeStatus, setSummarizeStatus] = useState<'idle' | 'summarizing' | 'done'>('idle');
  const isSummarizingRef = useRef(false);
  const lastSummarizedAtRef = useRef(0);
  const [linkedFiles, setLinkedFiles] = useState<Array<{ filePath: string; line: number }>>([]);
  const [linkedFilesOpen, setLinkedFilesOpen] = useState(false);
  const { goBack, goForward, noteHistory, noteHistoryIndex, openNote } = useVaultStore();

  const fetchNote = useCallback((path: string) => {
    setLoading(true);
    setNotFound(false);
    setDiskContent(null);
    fetch(`/api/vault?path=${encodeURIComponent(path)}`)
      .then((res) => {
        if (res.status === 404) { setNotFound(true); setLoading(false); return null; }
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then((data: VaultNote | null) => {
        if (data) setNote(data);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, []);

  const fetchLinkedFiles = useCallback(async () => {
    if (!notePath) return;
    try {
      const res = await fetch(`/api/vault/file-links?note=${encodeURIComponent(notePath)}`);
      if (!res.ok) return;
      const data = await res.json();
      setLinkedFiles(data.links || []);
    } catch { /* silent */ }
  }, [notePath]);

  useEffect(() => {
    if (notePath) {
      setMode(notePath.startsWith('Sessions/') ? 'preview' : 'edit');
      fetchNote(notePath);
      void fetchLinkedFiles();
    }
  }, [notePath, fetchNote, fetchLinkedFiles]);

  const triggerAiSummarize = useCallback(async (path: string, content: string) => {
    // Debounce: don't re-summarize if we just did it within 5 seconds
    if (isSummarizingRef.current || Date.now() - lastSummarizedAtRef.current < 5000) return;
    isSummarizingRef.current = true;
    setSummarizeStatus('summarizing');

    try {
      const res = await fetch('/api/vault/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content, title: note?.title ?? path }),
      });
      const data = await res.json();
      if (data.summary) {
        // Patch the note's frontmatter to include the summary
        await fetch(`/api/vault?path=${encodeURIComponent(path)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            frontmatter: { ...(note?.frontmatter as Record<string, unknown> ?? {}), summary: data.summary },
          }),
        });
      }
      setSummarizeStatus('done');
      lastSummarizedAtRef.current = Date.now();
      setTimeout(() => setSummarizeStatus('idle'), 3000);
    } catch {
      setSummarizeStatus('idle');
    } finally {
      isSummarizingRef.current = false;
    }
  }, [note]);

  const handleSave = useCallback(async (content: string) => {
    await fetch(`/api/vault?path=${encodeURIComponent(notePath)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    // Re-fetch to get updated note (hash, updatedAt)
    fetchNote(notePath);
    // Trigger background AI summarization (non-blocking)
    void triggerAiSummarize(notePath, content);
  }, [notePath, fetchNote, triggerAiSummarize]);

  const handleCreate = useCallback(() => {
    const title = notePath.split('/').pop()?.replace(/\.md$/, '') ?? notePath;
    fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: notePath, title, content: '' }),
    }).then(() => fetchNote(notePath));
  }, [notePath, fetchNote]);

  const handleWikilinkClick = useCallback((target: string) => {
    if (onNavigate) onNavigate(target);
    else openNote(target);
  }, [onNavigate, openNote]);

  const canGoBack = noteHistoryIndex > 0;
  const canGoForward = noteHistoryIndex < noteHistory.length - 1;

  const title = note?.title ?? notePath.split('/').pop()?.replace(/\.md$/, '') ?? notePath;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a2a2a] flex-shrink-0">
        <button
          className="p-1 rounded text-[#6b7280] hover:text-[#e2e8f0] hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors"
          onClick={goBack}
          disabled={!canGoBack}
          title="Back (Cmd+[)"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1 rounded text-[#6b7280] hover:text-[#e2e8f0] hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors"
          onClick={goForward}
          disabled={!canGoForward}
          title="Forward (Cmd+])"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <span className="flex-1 text-xs font-semibold text-[#e2e8f0] truncate px-1">{title}</span>

        {summarizeStatus !== 'idle' && (
          <span className={`text-[10px] ${summarizeStatus === 'summarizing' ? 'text-[#9ca3af]' : 'text-green-400'} transition-colors`}>
            {summarizeStatus === 'summarizing' ? 'AI summarizing...' : 'Summarized \u2713'}
          </span>
        )}

        <button
          className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs transition-colors ${
            mode === 'preview'
              ? 'border-[#8b5cf6] text-[#8b5cf6]'
              : 'border-[#2a2a2a] text-[#6b7280] hover:border-[#4b5563]'
          }`}
          onClick={() => setMode((m) => (m === 'edit' ? 'preview' : 'edit'))}
        >
          {mode === 'edit' ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
          <span>{mode === 'edit' ? 'Preview' : 'Edit'}</span>
        </button>

        {onClose && (
          <button
            className="text-xs text-[#6b7280] hover:text-[#e2e8f0] transition-colors px-1"
            onClick={onClose}
          >
            Close
          </button>
        )}
      </div>

      {/* Conflict Banner */}
      {diskContent !== null && note && diskContent !== note.content && (
        <ConflictBanner
          onReload={() => { fetchNote(notePath); setDiskContent(null); }}
          onKeepMine={() => setDiskContent(null)}
          onShowDiff={() => {
            // Surface disk content in console for now — full diff view is out of scope
            console.info('[NoteDetailView] Disk content differs:', diskContent);
            setDiskContent(null);
          }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {loading && (
          <div className="flex items-center justify-center h-full text-xs text-[#4b5563]">
            Loading...
          </div>
        )}

        {!loading && notFound && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-xs text-[#6b7280]">
            <span>Note not found: <code className="text-[#fb923c]">{notePath}</code></span>
            <button
              className="px-3 py-1.5 rounded bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-colors"
              onClick={handleCreate}
            >
              Create it
            </button>
          </div>
        )}

        {!loading && !notFound && note && mode === 'edit' && (
          <NoteEditor
            notePath={notePath}
            initialContent={note.content}
            onSave={handleSave}
            onClose={onClose}
          />
        )}

        {!loading && !notFound && note && mode === 'preview' && (() => {
          const isEmptySession =
            notePath.startsWith('Sessions/') &&
            note.content.replace(/^#\s*Session Log\s*/i, '').trim().length === 0;
          return (
            <div className="h-full overflow-y-auto">
              {isEmptySession ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
                  <p className="text-sm font-semibold text-[#e2e8f0]">No activity recorded</p>
                  <p className="text-xs text-[#6b7280]">
                    This session ended before any files were opened or commands were run.
                    Future sessions will log file opens and terminal commands here automatically.
                  </p>
                </div>
              ) : (
                <NoteViewer
                  content={note.content}
                  onWikilinkClick={handleWikilinkClick}
                />
              )}
            </div>
          );
        })()}
      </div>

      {/* Backlinks Section */}
      {!loading && !notFound && note && (
        <div className="flex-shrink-0 border-t border-[#2a2a2a]">
          <button
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#6b7280] hover:bg-[#1a1a1a] transition-colors"
            onClick={() => setBacklinksOpen((v) => !v)}
          >
            {backlinksOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span className="font-semibold uppercase tracking-wider">Backlinks</span>
          </button>
          {backlinksOpen && (
            <div className="max-h-48 overflow-y-auto">
              <BacklinksPanel
                notePath={notePath}
                onNoteSelect={handleWikilinkClick}
              />
            </div>
          )}
        </div>
      )}

      {/* Linked Files Section */}
      {!loading && !notFound && note && linkedFiles.length > 0 && (
        <div className="border-t border-[#2a2a4e]">
          <button
            onClick={() => setLinkedFilesOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-[#9ca3af] hover:text-[#e2e8f0] transition-colors"
          >
            <span>Linked Files ({linkedFiles.length})</span>
            <span>{linkedFilesOpen ? '▾' : '▸'}</span>
          </button>
          {linkedFilesOpen && (
            <div className="px-4 pb-3 space-y-1">
              {linkedFiles.map((link, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] text-[#9ca3af]">
                  <span className="text-indigo-400 truncate flex-1">{link.filePath}</span>
                  <span className="text-[#6b7280] flex-shrink-0">:{link.line}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
