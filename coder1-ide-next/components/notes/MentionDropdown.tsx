'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { FileText } from 'lucide-react';
import type { VaultNoteStub } from '@/lib/vault-types';

export interface MentionDropdownProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (notePath: string, noteTitle: string) => void;
  onClose: () => void;
}

export default function MentionDropdown({ query, position, onSelect, onClose }: MentionDropdownProps) {
  const [results, setResults] = useState<VaultNoteStub[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const fetchResults = useCallback((q: string) => {
    const url = q.trim()
      ? `/api/vault?search=${encodeURIComponent(q)}`
      : '/api/vault?list=true';
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('unavailable');
        return res.json();
      })
      .then((data: VaultNoteStub[]) => setResults(data.slice(0, 8)))
      .catch(() => setUnavailable(true));
  }, []);

  // Debounced fetch on query change
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => fetchResults(query), 200);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, fetchResults]);

  // Reset active index when results change
  useEffect(() => setActiveIndex(0), [results]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = results[activeIndex];
        if (selected) onSelect(selected.path, selected.title);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, activeIndex, onSelect, onClose]);

  if (unavailable || results.length === 0) return null;

  return (
    <div
      className="fixed z-50 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden"
      style={{ top: position.top, left: position.left, minWidth: '220px', maxWidth: '320px' }}
    >
      <ul ref={listRef} className="py-1 max-h-64 overflow-y-auto">
        {results.map((note, index) => (
          <li key={note.path}>
            <button
              className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ${
                index === activeIndex ? 'bg-[#1e1b4b]' : 'hover:bg-[#252525]'
              }`}
              onClick={() => onSelect(note.path, note.title)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <FileText className="w-3.5 h-3.5 text-[#6b7280] flex-shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <div className="text-xs font-medium text-[#e2e8f0] truncate">{note.title}</div>
                <div className="text-[10px] text-[#4b5563] truncate">{note.path}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
