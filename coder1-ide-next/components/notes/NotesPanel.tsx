'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, Plus, Search, Trash2, Share2, Download } from 'lucide-react';
import type { VaultFolderTree, VaultNoteStub } from '@/lib/vault-types';
import { useVaultMention } from '@/hooks/useVaultMention';
import MentionDropdown from '@/components/notes/MentionDropdown';
import TemplatePickerModal, { NoteTemplate, TemplateContext } from './TemplatePickerModal';
import { useIDEStore } from '@/stores/useIDEStore';
import CodebaseGraph from '@/components/codebase/CodebaseGraph';

export interface NotesPanelProps {
  onNoteSelect: (path: string) => void;
  activeNotePath?: string;
  compact?: boolean;
}

/** Convert a session note path/title to a human-readable date string */
function getSessionDisplayTitle(note: { title?: string; path: string }): string {
  // Match 13-digit timestamp in path like "Sessions/session-1775507585845_a73..."
  const match = note.path.match(/[\/]?session[-_](\d{13})/i);
  if (match) {
    const d = new Date(parseInt(match[1]));
    return `Session – ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return note.title || note.path;
}

function getNoteTitle(note: { title?: string; path: string }): string {
  if (note.path.startsWith('Sessions/')) return getSessionDisplayTitle(note);
  return note.title || note.path;
}

function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface FolderNodeItemProps {
  node: VaultFolderTree;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth: number;
}

function FolderNodeItem({ node, selectedPath, onSelect, depth }: FolderNodeItemProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <button
        className={`w-full flex items-center gap-1 py-1 text-xs transition-colors ${
          isSelected
            ? 'bg-[#1a1a2e] text-[#8b5cf6]'
            : 'text-[#9ca3af] hover:bg-[#1a1a1a] hover:text-[#e2e8f0]'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: '8px' }}
        onClick={() => {
          if (hasChildren) setExpanded((v) => !v);
          onSelect(node.path);
        }}
      >
        <span className="w-3 h-3 flex-shrink-0">
          {hasChildren
            ? expanded
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />
            : null}
        </span>
        <Folder className="w-3 h-3 flex-shrink-0" />
        <span className="truncate flex-1 text-left">{node.name || 'Root'}</span>
        {node.name === 'Sessions' && (
          <span
            title="Auto-saved snapshots of your Claude Code sessions. Each entry is one full session with its conversation history."
            className="ml-0.5 text-[#4b5563] hover:text-[#6b7280] cursor-help flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        )}
        {node.noteCount > 0 && (
          <span className="text-[#4b5563] ml-1 flex-shrink-0">{node.noteCount}</span>
        )}
      </button>
      {expanded && hasChildren && node.children.map((child) => (
        <FolderNodeItem
          key={child.path}
          node={child}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function NotesPanel({ onNoteSelect, activeNotePath, compact }: NotesPanelProps) {
  // Tab state for Notes vs CodeNexus
  const [activeTab, setActiveTab] = useState<'notes' | 'codenexus'>('notes');

  const [folderTree, setFolderTree] = useState<VaultFolderTree[]>([]);
  const [notes, setNotes] = useState<VaultNoteStub[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [creatingNote, setCreatingNote] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Template picker (Change 1)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const newButtonRef = useRef<HTMLButtonElement | null>(null);
  // Orphan finder (Change 3)
  const [orphanPaths, setOrphanPaths] = useState<Set<string>>(new Set());
  const [orphanCount, setOrphanCount] = useState<number | null>(null);
  const [suggestingFor, setSuggestingFor] = useState<string | null>(null);
  const [linkSuggestions, setLinkSuggestions] = useState<Map<string, Array<{path: string; title: string; reason: string}>>>(new Map());
  // Semantic search (Change 4)
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');
  const [semanticResults, setSemanticResults] = useState<Array<{path: string; title: string; excerpt?: string; matchReason: string}> | null>(null);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [deletingEmpties, setDeletingEmpties] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [confirmDeletePath, setConfirmDeletePath] = useState<string | null>(null);
  const [confirmDeleteSessions, setConfirmDeleteSessions] = useState(false);
  // Ambient install CTA — pre-fetched token so user can paste it during setup
  const [ambientToken, setAmbientToken] = useState<string | null>(null);
  const [ambientCopied, setAmbientCopied] = useState<'cmd' | 'token' | null>(null);
  const { mentionState, handleInputChange: handleMentionChange, handleMentionSelect, closeMention } = useVaultMention();

  // Pre-fetch the Ambient API token so it's ready to copy from the empty state CTA
  useEffect(() => {
    fetch('/api/auth/token', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.token) setAmbientToken(data.token); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/vault?tree=true')
      .then((res) => { if (!res.ok) throw new Error('unavailable'); return res.json(); })
      .then((data: VaultFolderTree[]) => setFolderTree(data))
      .catch(() => setUnavailable(true));

    // Fetch graph data for orphan detection
    fetch('/api/vault/graph')
      .then(r => r.json())
      .then(data => {
        setOrphanCount(data.stats?.orphanCount ?? 0);
        const targetIds = new Set((data.links || []).map((l: {target: string | number}) => String(l.target)));
        const orphans = new Set<string>(
          (data.nodes || [])
            .filter((n: {id: number; path: string}) => !targetIds.has(String(n.id)))
            .map((n: {path: string}) => n.path)
        );
        setOrphanPaths(orphans);
      })
      .catch(() => {}); // silent failure
  }, []);

  const fetchNotes = useCallback((folder: string | null) => {
    setLoadingNotes(true);
    const url = folder
      ? `/api/vault?folder=${encodeURIComponent(folder)}`
      : '/api/vault?list=true';
    fetch(url)
      .then((res) => { if (!res.ok) throw new Error('unavailable'); return res.json(); })
      .then((data: VaultNoteStub[]) => {
        // Hide session notes from "All Notes" — they're accessible via the Sessions folder
        const filtered = folder === null
          ? data.filter(n => !n.path.startsWith('Sessions/'))
          : data;
        setNotes([...filtered].sort((a, b) => b.updatedAt - a.updatedAt));
        setLoadingNotes(false);
      })
      .catch(() => { setLoadingNotes(false); });
  }, []);

  useEffect(() => {
    if (!unavailable) fetchNotes(selectedFolder);
  }, [selectedFolder, unavailable, fetchNotes]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { fetchNotes(selectedFolder); return; }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setLoadingNotes(true);
      fetch(`/api/vault?search=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json())
        .then((data: VaultNoteStub[]) => { setNotes(data); setLoadingNotes(false); })
        .catch(() => setLoadingNotes(false));
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery, selectedFolder, fetchNotes]);

  // Semantic search effect (Change 4c)
  useEffect(() => {
    if (searchMode !== 'semantic' || searchQuery.length <= 2) {
      setSemanticResults(null);
      return;
    }
    setSemanticLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/vault/semantic-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery, topK: 8 }),
        });
        const data = await res.json();
        setSemanticResults(data.results || []);
      } catch {
        setSemanticResults([]);
      } finally {
        setSemanticLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMode]);

  const handleDeleteNote = useCallback(async (path: string) => {
    setConfirmDeletePath(null);
    setDeletingPath(path);
    try {
      const res = await fetch(`/api/vault?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.path !== path));
        if (activeNotePath === path) {
          onNoteSelect('');
        }
      }
    } catch { /* silently fail */ }
    setDeletingPath(null);
  }, [activeNotePath, onNoteSelect]);

  const isEmptySessionNote = (note: VaultNoteStub) =>
    note.path.startsWith('Sessions/') && !note.excerpt?.trim() && !(note.frontmatter?.summary as string | undefined);

  const handleDeleteEmptySessions = useCallback(async () => {
    const emptySessions = notes.filter(isEmptySessionNote);
    if (emptySessions.length === 0) return;
    setDeletingEmpties(true);
    await Promise.all(
      emptySessions.map(n =>
        fetch(`/api/vault?path=${encodeURIComponent(n.path)}`, { method: 'DELETE' }).catch(() => {})
      )
    );
    setNotes(prev => prev.filter(n => !isEmptySessionNote(n)));
    setDeletingEmpties(false);
  }, [notes]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShareDay = async () => {
    try {
      // Fetch the full note from vault API
      const res = await fetch(`/api/vault?path=${encodeURIComponent(activeNotePath || '')}`);
      if (!res.ok) throw new Error('Failed to fetch note');
      const data = await res.json();
      const note = data.note || data.notes?.[0];
      if (!note) throw new Error('Note not found');

      const { shareNote } = await import('@/lib/ambient-share-card');
      await shareNote(note);

      setShareToast('Card downloaded! Share it anywhere.');
      setTimeout(() => setShareToast(null), 3000);
    } catch (err) {
      console.error('Share failed:', err);
      setShareToast('Could not generate share card.');
      setTimeout(() => setShareToast(null), 3000);
    }
  };

  const handleExportMarkdown = async () => {
    if (!activeNotePath) return;
    try {
      const res = await fetch(`/api/vault?path=${encodeURIComponent(activeNotePath)}`);
      if (!res.ok) throw new Error('Failed to fetch note');
      const data = await res.json();
      const note = data.note || data.notes?.[0];
      if (!note) throw new Error('Note not found');
      const content = note.content || '';
      const filename = activeNotePath.split('/').pop() || 'note.md';
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleNewNote = useCallback(async (template: NoteTemplate) => {
    setCreatingNote(true);
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const ctx: TemplateContext = {
      date: dateStr,
      activeFile: useIDEStore.getState().editor.activeFile ?? '',
    };
    const filename = template.buildFilename(ctx);
    const safeName = filename.replace(/[^a-zA-Z0-9\-_]/g, '-').replace(/-+/g, '-');
    const folder = selectedFolder ? `${selectedFolder}/` : '';
    const path = `${folder}${safeName}.md`;
    const content = template.buildContent(ctx);
    try {
      await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, title: safeName, content }),
      });
      fetchNotes(selectedFolder);
      onNoteSelect(path);
    } finally {
      setCreatingNote(false);
    }
  }, [selectedFolder, fetchNotes, onNoteSelect]);

  if (unavailable && activeTab === 'notes') {
    // Only show unavailable for Notes tab - CodeNexus doesn't need vault
  }

  // Compact mode: slim note list only (no tabs, no folder tree) for use as sidebar alongside NoteDetailView
  if (compact) {
    return (
      <div className="flex flex-col h-full bg-[#0d0d0d]">
        <div className="flex items-center justify-between px-2 py-2 border-b border-[#2a2a2a] flex-shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">Notes</span>
          <button
            ref={newButtonRef}
            className="p-1 rounded text-[#6366f1] hover:bg-[#6366f1]/20 transition-colors disabled:opacity-50"
            onClick={() => setShowTemplatePicker(true)}
            disabled={creatingNote}
            title="New Note"
          >
            <Plus className="w-3 h-3" />
          </button>
          {showTemplatePicker && (
            <TemplatePickerModal
              anchorRef={newButtonRef as React.RefObject<HTMLButtonElement>}
              onSelect={(template) => { setShowTemplatePicker(false); handleNewNote(template); }}
              onDismiss={() => setShowTemplatePicker(false)}
            />
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingNotes && <div className="px-2 py-2 text-[10px] text-[#4b5563]">Loading...</div>}
          {!loadingNotes && notes.length === 0 && (
            <div className="px-2 py-4 text-center">
              <p className="text-[10px] text-[#4b5563]">No notes yet.</p>
              <p className="text-[10px] text-[#4b5563] mt-1">Click + to create one.</p>
            </div>
          )}
          {!loadingNotes && notes.map((note) => (
            <div
              key={note.path}
              className={`border-b border-[#1a1a1a] transition-colors ${
                activeNotePath === note.path ? 'bg-[#1e1b4b]' : 'hover:bg-[#1a1a1a]'
              }`}
            >
              <button
                className="w-full text-left px-2 py-2"
                onClick={() => onNoteSelect(note.path)}
              >
                <span className="text-[10px] font-medium text-[#e2e8f0] block truncate">
                  {getNoteTitle(note)}
                </span>
                <span className="text-[9px] text-[#4b5563] block mt-0.5">
                  {formatRelativeDate(note.updatedAt)}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      {/* Tab switcher */}
      <div className="flex border-b border-[#2a2a4e] flex-shrink-0">
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'notes'
              ? 'text-[#8b5cf6] border-b-2 border-[#8b5cf6]'
              : 'text-[#6b7280] hover:text-[#9ca3af]'
          }`}
        >
          Notes
        </button>
      </div>

      {/* CodeNexus tab content */}
      {activeTab === 'codenexus' && (
        <div className="flex-1 overflow-hidden">
          <CodebaseGraph />
        </div>
      )}

      {/* Notes tab content */}
      {activeTab === 'notes' && unavailable && (
        <div className="flex flex-col flex-1 items-center justify-center p-4">
          <p className="text-xs text-[#6b7280] text-center">Knowledge base is offline.</p>
          <p className="text-[10px] text-[#4b5563] text-center mt-1">Try reloading the page. If this persists, contact support.</p>
        </div>
      )}

      {activeTab === 'notes' && !unavailable && (
        <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] flex-shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Notes</span>
        <div className="flex items-center gap-1.5">
          {activeNotePath && (
            <>
              <button
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#0d1f12] hover:bg-[#1a3020] text-[#34d399] border border-[#1a3020] hover:border-[#065f46] transition-colors"
                onClick={handleExportMarkdown}
                title="Export to Obsidian (download .md)"
              >
                <Download className="w-3 h-3" />
                <span>Export</span>
              </button>
              <button
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#1a1a2e] hover:bg-[#2a1f4e] text-[#8b5cf6] border border-[#2a2a4e] hover:border-[#4c1d95] transition-colors"
                onClick={handleShareDay}
                title="Share your dev day"
              >
                <Share2 className="w-3 h-3" />
                <span>Share</span>
              </button>
            </>
          )}
          <button
            ref={newButtonRef}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-colors disabled:opacity-50"
            onClick={() => setShowTemplatePicker(true)}
            disabled={creatingNote}
            title="New Note"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>
        {showTemplatePicker && (
          <TemplatePickerModal
            anchorRef={newButtonRef as React.RefObject<HTMLButtonElement>}
            onSelect={(template) => {
              setShowTemplatePicker(false);
              handleNewNote(template);
            }}
            onDismiss={() => setShowTemplatePicker(false)}
          />
        )}
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-[#2a2a2a] flex-shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
          <Search className="w-3 h-3 text-[#4b5563] flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search notes... (type @ to mention)"
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              const rect = searchInputRef.current?.getBoundingClientRect();
              handleMentionChange(val, e.target.selectionStart ?? val.length, rect);
            }}
            onBlur={() => setTimeout(closeMention, 150)}
            className="flex-1 bg-transparent text-xs text-[#e2e8f0] placeholder-[#4b5563] outline-none"
          />
          {mentionState?.isOpen && (
            <MentionDropdown
              query={mentionState.query}
              position={mentionState.position}
              onSelect={(notePath, noteTitle) => {
                handleMentionSelect(searchQuery, notePath, noteTitle, (newVal) => {
                  setSearchQuery(newVal);
                });
              }}
              onClose={closeMention}
            />
          )}
        </div>
        <div className="flex gap-1 mt-1">
          {(['keyword', 'semantic'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => { setSearchMode(mode); setSemanticResults(null); }}
              title={mode === 'semantic'
                ? 'AI-powered search that understands meaning, not just keywords. Finds conceptually related notes even if they use different words.'
                : 'Exact word match search across note titles and content.'}
              className={`flex-1 text-[10px] py-0.5 rounded transition-colors ${
                searchMode === mode
                  ? 'bg-indigo-600/30 text-indigo-300'
                  : 'text-[#6b7280] hover:text-[#9ca3af]'
              }`}
            >
              {mode === 'keyword' ? 'Keyword' : 'Semantic ✦'}
            </button>
          ))}
        </div>
      </div>

      {/* Two-pane area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Folder tree (~40%) */}
        <div className="w-2/5 overflow-y-auto border-r border-[#2a2a2a] py-1 flex-shrink-0">
          <button
            className={`w-full flex items-center gap-1 px-2 py-1 text-xs transition-colors ${
              selectedFolder === null
                ? 'bg-[#1a1a2e] text-[#8b5cf6]'
                : 'text-[#9ca3af] hover:bg-[#1a1a1a] hover:text-[#e2e8f0]'
            }`}
            onClick={() => setSelectedFolder(null)}
          >
            <span className="w-3 h-3 flex-shrink-0" />
            <FileText className="w-3 h-3 flex-shrink-0" />
            <span className="truncate flex-1 text-left">All Notes</span>
          </button>
          {folderTree.map((node) => (
            <FolderNodeItem
              key={node.path}
              node={node}
              selectedPath={selectedFolder}
              onSelect={setSelectedFolder}
              depth={0}
            />
          ))}
          <button
            onClick={() => setSelectedFolder('__orphans__')}
            className={`w-full flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
              selectedFolder === '__orphans__'
                ? 'bg-[#1a1a2e] text-orange-400'
                : 'text-[#9ca3af] hover:text-[#e2e8f0] hover:bg-[#1a1a2e]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
            <span>Orphans</span>
            {orphanCount !== null && <span className="ml-auto text-[#6b7280]">{orphanCount}</span>}
          </button>
        </div>

        {/* Right: Note list (~60%) */}
        <div className="flex-1 overflow-y-auto">
          {/* Semantic search results overlay (Change 4d) */}
          {searchMode === 'semantic' && searchQuery.length > 2 && (
            semanticLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : semanticResults ? (
              <div className="space-y-1 p-1">
                {semanticResults.length === 0 && (
                  <div className="px-3 py-3 text-xs text-[#4b5563] italic">No semantic matches.</div>
                )}
                {semanticResults.map(result => (
                  <button
                    key={result.path}
                    onClick={() => onNoteSelect(result.path)}
                    className="w-full text-left px-2 py-2 rounded hover:bg-[#1a1a2e] transition-colors"
                  >
                    <p className="text-xs text-[#e2e8f0] truncate">{result.title}</p>
                    <p className="text-[10px] text-indigo-400 italic mt-0.5 line-clamp-2">{result.matchReason}</p>
                  </button>
                ))}
              </div>
            ) : null
          )}

          {/* Delete empty sessions banner */}
          {selectedFolder === 'Sessions' && !searchQuery && (() => {
            const emptyCount = notes.filter(isEmptySessionNote).length;
            if (emptyCount === 0) return null;
            return (
              <div className="px-3 py-2 border-b border-[#2a2a2a] flex items-center justify-between bg-[#1a1a1a]">
                <span className="text-[10px] text-[#6b7280]">{emptyCount} empty session{emptyCount !== 1 ? 's' : ''} hidden</span>
                <button
                  onClick={() => setConfirmDeleteSessions(true)}
                  disabled={deletingEmpties}
                  className="text-[10px] text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                >
                  {deletingEmpties ? 'Deleting...' : 'Delete all empty'}
                </button>
              </div>
            );
          })()}

          {/* Standard keyword results */}
          {(searchMode !== 'semantic' || searchQuery.length <= 2) && (
            <>
              {loadingNotes && (
                <div className="px-3 py-3 text-xs text-[#4b5563]">Loading...</div>
              )}
              {!loadingNotes && (() => {
                // Change 3d: filter to orphans when that folder is selected
                const displayedNotes = selectedFolder === '__orphans__'
                  ? notes.filter(n => orphanPaths.has(n.path))
                  : selectedFolder === 'Sessions'
                    ? notes.filter(n => !isEmptySessionNote(n))
                    : notes;
                return (
                  <>
                    {displayedNotes.length === 0 && (
                      <div className="px-3 py-4">
                        {selectedFolder === '__orphans__' ? (
                          <p className="text-xs text-[#4b5563] text-center py-4">No orphaned notes.</p>
                        ) : selectedFolder === 'Sessions' ? (
                          <div className="text-center py-4">
                            <p className="text-xs text-[#6b7280]">No sessions yet.</p>
                            <p className="text-[10px] text-[#4b5563] mt-1">
                              Sessions are saved automatically when you use Claude Code.
                            </p>
                          </div>
                        ) : selectedFolder !== null ? (
                          <div className="text-center py-4">
                            <p className="text-xs text-[#6b7280]">No notes in this folder.</p>
                            <button
                              onClick={() => setSelectedFolder(null)}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-1 underline"
                            >
                              View all notes
                            </button>
                          </div>
                        ) : !searchQuery ? (
                          <div className="px-2 py-4 text-left">
                            {/* Hero icon + headline */}
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600/40 to-purple-600/40 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-900/30">
                                <svg className="w-4.5 h-4.5 text-indigo-300" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white leading-tight">Supercharge your memory</p>
                                <p className="text-[10px] text-indigo-400 leading-tight">with Ambient AI</p>
                              </div>
                            </div>

                            {/* Benefit bullets */}
                            <div className="mb-3 space-y-1.5">
                              {[
                                { icon: '⚡', text: 'Auto-captures your screen activity' },
                                { icon: '✦', text: 'AI summarizes your daily work.' },
                                { icon: '↻', text: 'Daily summaries sync here automatically. Free.' },
                              ].map(({ icon, text }) => (
                                <div key={text} className="flex items-center gap-2">
                                  <span className="text-xs text-indigo-400 w-4 text-center">{icon}</span>
                                  <span className="text-xs text-[#9ca3af]">{text}</span>
                                </div>
                              ))}
                            </div>

                            {/* Divider */}
                            <div className="border-t border-[#2d2d3d] my-3" />

                            {/* Steps heading */}
                            <p className="text-sm font-semibold text-white text-center mb-3">Two steps to get started</p>

                            {/* Step 1: Open terminal */}
                            <div className="flex items-start gap-2 mb-2">
                              <span className="text-xs font-bold text-indigo-500 mt-0.5 w-3 flex-shrink-0">1</span>
                              <div>
                                <p className="text-xs text-[#9ca3af] font-medium">Open your Terminal app</p>
                                <p className="text-[11px] text-[#4b5563] mt-0.5">
                                  Mac: <kbd className="px-1 py-0.5 rounded bg-[#1a1a2e] border border-[#2d2d3d] text-[#9ca3af] font-mono text-[10px]">⌘ Space</kbd> → type <span className="text-[#9ca3af]">Terminal</span> → Enter
                                </p>
                              </div>
                            </div>

                            {/* Step 2: Run install command */}
                            <div className="flex items-start gap-2 mb-1.5">
                              <span className="text-xs font-bold text-indigo-500 mt-0.5 w-3 flex-shrink-0">2</span>
                              <p className="text-xs text-[#9ca3af] font-medium">Copy this command, paste it in Terminal, press Enter</p>
                            </div>
                            <div className="ml-5 bg-[#080814] border border-indigo-900/50 rounded-lg px-3 py-2 flex items-center gap-2 hover:border-indigo-700/50 transition-colors">
                              <code className="flex-1 text-[11px] font-mono text-[#c4b5fd] leading-relaxed">
                                npm i -g coder1-ambient && ambient setup
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText('npm install -g coder1-ambient && ambient setup');
                                  setAmbientCopied('cmd');
                                  setTimeout(() => setAmbientCopied(null), 2000);
                                }}
                                className="flex-shrink-0 text-[11px] px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-400 hover:bg-indigo-800/50 hover:text-indigo-300 transition-all"
                                title="Copy install command"
                              >
                                {ambientCopied === 'cmd' ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>

                            {/* Step 3: Token */}
                            {ambientToken && (
                              <>
                                <div className="flex items-start gap-2 mt-2.5 mb-1.5">
                                  <span className="text-xs font-bold text-indigo-500 mt-0.5 w-3 flex-shrink-0">3</span>
                                  <p className="text-xs text-[#9ca3af] font-medium">When setup asks for your token, copy &amp; paste this</p>
                                </div>
                                <div className="ml-5 bg-[#080814] border border-indigo-900/50 rounded-lg px-3 py-2 flex items-center gap-2 hover:border-indigo-700/50 transition-colors">
                                  <code className="flex-1 text-[11px] font-mono text-indigo-300 truncate">
                                    {ambientToken.slice(0, 24)}…
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(ambientToken);
                                      setAmbientCopied('token');
                                      setTimeout(() => setAmbientCopied(null), 2000);
                                    }}
                                    className="flex-shrink-0 text-[11px] px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-400 hover:bg-indigo-800/50 hover:text-indigo-300 transition-all"
                                    title="Copy your Coder1 token"
                                  >
                                    {ambientCopied === 'token' ? '✓ Copied' : 'Copy'}
                                  </button>
                                </div>
                              </>
                            )}

                            {/* Secondary CTA */}
                            <button
                              onClick={() => setShowTemplatePicker(true)}
                              className="mt-4 w-full text-[10px] text-[#4b5563] hover:text-[#6b7280] text-center transition-colors"
                            >
                              Or create a note manually
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-[#4b5563]">No notes match your search.</p>
                        )}
                      </div>
                    )}
                    {displayedNotes.map((note) => (
                      <div
                        key={note.path}
                        className={`group relative border-b border-[#1a1a1a] transition-colors ${
                          activeNotePath === note.path ? 'bg-[#1e1b4b]' : 'hover:bg-[#1a1a1a]'
                        }`}
                      >
                        <button
                          className="w-full text-left px-3 py-2 pr-8"
                          onClick={() => onNoteSelect(note.path)}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-semibold text-[#e2e8f0] truncate leading-4">
                              {getNoteTitle(note)}
                            </span>
                            <span className="text-[10px] text-[#4b5563] flex-shrink-0 mt-0.5">
                              {formatRelativeDate(note.updatedAt)}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#6b7280] truncate mt-0.5">
                            {(note.frontmatter?.summary as string | undefined) || note.excerpt || ''}
                          </p>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeletePath(note.path); }}
                          disabled={deletingPath === note.path}
                          title="Delete note"
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded text-[#4b5563] hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-30"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
        </>
      )}

      {/* Delete note confirmation modal */}
      {confirmDeletePath && (() => {
        const confirmNote = notes.find(n => n.path === confirmDeletePath);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setConfirmDeletePath(null)}
          >
            <div
              className="bg-[#1a1a2e] border border-[#2d2d3d] rounded-lg p-5 max-w-xs w-full mx-4 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <p className="text-sm text-[#e5e7eb] font-medium mb-1">Delete note?</p>
              <p className="text-[11px] text-[#6b7280] mb-3 truncate">
                {confirmNote?.title || confirmDeletePath}
              </p>
              <p className="text-[10px] text-[#4b5563] mb-4">This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeletePath(null)}
                  className="flex-1 text-xs py-1.5 rounded border border-[#2d2d3d] text-[#9ca3af] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteNote(confirmDeletePath)}
                  disabled={deletingPath === confirmDeletePath}
                  className="flex-1 text-xs py-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-900/40 transition-colors disabled:opacity-40"
                >
                  {deletingPath === confirmDeletePath ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Share toast */}
      {shareToast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg bg-[#1a1a2e] border border-[#8b5cf6] text-xs text-[#8b5cf6] shadow-lg animate-fade-in">
          {shareToast}
        </div>
      )}

      {/* Delete empty sessions confirmation modal */}
      {confirmDeleteSessions && (() => {
        const emptyCount = notes.filter(isEmptySessionNote).length;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setConfirmDeleteSessions(false)}
          >
            <div
              className="bg-[#1a1a2e] border border-[#2d2d3d] rounded-lg p-5 max-w-xs w-full mx-4 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <p className="text-sm text-[#e5e7eb] font-medium mb-1">Delete empty sessions?</p>
              <p className="text-[11px] text-[#6b7280] mb-3">
                {emptyCount} empty session{emptyCount !== 1 ? 's' : ''} will be permanently removed.
              </p>
              <p className="text-[10px] text-[#4b5563] mb-4">This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeleteSessions(false)}
                  className="flex-1 text-xs py-1.5 rounded border border-[#2d2d3d] text-[#9ca3af] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmDeleteSessions(false); handleDeleteEmptySessions(); }}
                  disabled={deletingEmpties}
                  className="flex-1 text-xs py-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-900/40 transition-colors disabled:opacity-40"
                >
                  {deletingEmpties ? 'Deleting…' : 'Delete all'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
