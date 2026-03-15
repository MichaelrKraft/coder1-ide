'use client';

import React, { useEffect, useState } from 'react';
import { Link } from 'lucide-react';
import type { BacklinkEntry } from '@/lib/vault-types';

export interface BacklinksPanelProps {
  notePath: string;
  onNoteSelect: (path: string) => void;
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

export default function BacklinksPanel({ notePath, onNoteSelect }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<BacklinkEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!notePath) return;
    setLoading(true);
    const encoded = encodeURIComponent(notePath);
    fetch(`/api/vault/backlinks?path=${encoded}`)
      .then((res) => {
        if (!res.ok) throw new Error('unavailable');
        return res.json();
      })
      .then((data: BacklinkEntry[]) => {
        setBacklinks(data);
        setLoading(false);
      })
      .catch(() => {
        setUnavailable(true);
        setLoading(false);
      });
  }, [notePath]);

  if (unavailable) return null;

  return (
    <div className="flex flex-col text-xs">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#2a2a2a] text-[#6b7280]">
        <Link className="w-3 h-3" />
        <span className="font-semibold uppercase tracking-wider">Backlinks</span>
        {!loading && (
          <span className="ml-auto text-[#4b5563]">{backlinks.length}</span>
        )}
      </div>

      {loading && (
        <div className="px-3 py-3 text-[#4b5563]">Loading...</div>
      )}

      {!loading && backlinks.length === 0 && (
        <div className="px-3 py-3 text-[#4b5563] italic">No backlinks yet.</div>
      )}

      <ul>
        {backlinks.map((entry) => (
          <li key={entry.sourcePath}>
            <button
              className="w-full text-left px-3 py-2 hover:bg-[#1a1a1a] transition-colors"
              onClick={() => onNoteSelect(entry.sourcePath)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#e2e8f0] truncate">{entry.sourceTitle}</span>
                <span className="text-[#4b5563] ml-2 flex-shrink-0">
                  {formatRelativeDate(entry.modifiedAt)}
                </span>
              </div>
              {entry.excerpt && (
                <p className="text-[#6b7280] truncate mt-0.5">{entry.excerpt}</p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
