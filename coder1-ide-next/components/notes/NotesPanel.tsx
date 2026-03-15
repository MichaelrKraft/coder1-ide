'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, Plus, Search } from 'lucide-react';
import type { VaultFolderTree, VaultNoteStub } from '@/lib/vault-types';

export interface NotesPanelProps {
  onNoteSelect: (path: string) => void;
  activeNotePath?: string;
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

export default function NotesPanel({ onNoteSelect, activeNotePath }: NotesPanelProps) {
  const [folderTree, setFolderTree] = useState<VaultFolderTree[]>([]);
  const [notes, setNotes] = useState<VaultNoteStub[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/vault?tree=true')
      .then((res) => { if (!res.ok) throw new Error('unavailable'); return res.json(); })
      .then((data: VaultFolderTree[]) => setFolderTree(data))
      .catch(() => setUnavailable(true));
  }, []);

  const fetchNotes = useCallback((folder: string | null) => {
    setLoadingNotes(true);
    const url = folder
      ? `/api/vault?folder=${encodeURIComponent(folder)}`
      : '/api/vault?list=true';
    fetch(url)
      .then((res) => { if (!res.ok) throw new Error('unavailable'); return res.json(); })
      .then((data: VaultNoteStub[]) => {
        setNotes([...data].sort((a, b) => b.updatedAt - a.updatedAt));
        setLoadingNotes(false);
      })
      .catch(() => { setUnavailable(true); setLoadingNotes(false); });
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

  if (unavailable) return null;

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] flex-shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Notes</span>
        <button
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-colors"
          onClick={() => onNoteSelect('__new__')}
          title="New Note"
        >
          <Plus className="w-3 h-3" />
          <span>New</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-[#2a2a2a] flex-shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
          <Search className="w-3 h-3 text-[#4b5563] flex-shrink-0" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-[#e2e8f0] placeholder-[#4b5563] outline-none"
          />
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
        </div>

        {/* Right: Note list (~60%) */}
        <div className="flex-1 overflow-y-auto">
          {loadingNotes && (
            <div className="px-3 py-3 text-xs text-[#4b5563]">Loading...</div>
          )}
          {!loadingNotes && notes.length === 0 && (
            <div className="px-3 py-3 text-xs text-[#4b5563] italic">No notes here.</div>
          )}
          {!loadingNotes && notes.map((note) => (
            <button
              key={note.path}
              className={`w-full text-left px-3 py-2 border-b border-[#1a1a1a] transition-colors ${
                activeNotePath === note.path ? 'bg-[#1e1b4b]' : 'hover:bg-[#1a1a1a]'
              }`}
              onClick={() => onNoteSelect(note.path)}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-semibold text-[#e2e8f0] truncate leading-4">
                  {note.title}
                </span>
                <span className="text-[10px] text-[#4b5563] flex-shrink-0 mt-0.5">
                  {formatRelativeDate(note.updatedAt)}
                </span>
              </div>
              {note.excerpt && (
                <p className="text-[10px] text-[#6b7280] truncate mt-0.5">{note.excerpt}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
