'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, X, Play } from 'lucide-react';
import type { MemoryEntry } from '@/services/johnny5/session-memory';

interface SessionMemoryPanelProps {
  isVisible: boolean;
  onDismiss: () => void;
}

const AUTO_HIDE_MS = 30_000;
const MAX_DISPLAYED = 3;

/**
 * Compact time-ago formatter. Returns strings like "2m ago", "3h ago", "5d ago".
 */
function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Truncate a list of file paths to a compact display string.
 */
function truncateFiles(files: string[], maxChars: number): string {
  if (files.length === 0) return 'no files';
  const names = files.map((f) => {
    const parts = f.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] ?? f;
  });
  let result = names[0] ?? '';
  if (names.length > 1) {
    result += `, +${names.length - 1} more`;
  }
  if (result.length > maxChars) {
    return result.slice(0, maxChars - 3) + '...';
  }
  return result;
}

/**
 * SessionMemoryPanel
 *
 * Compact memory recall card that appears inside the Johnny5 panel when
 * relevant past session memories are found. Listens to `johnny5:memoryRecall`
 * CustomEvents dispatched by the SessionMemory service.
 *
 * Actions:
 *   - "Resume" dispatches `johnny5:resumeFromMemory` with the entry
 *   - "Dismiss" hides the panel
 *
 * Auto-hides after 30 seconds if not interacted with (paused on hover).
 */
export default function SessionMemoryPanel({
  isVisible,
  onDismiss,
}: SessionMemoryPanelProps) {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactedRef = useRef(false);

  // -----------------------------------------------------------------------
  // Listen for memory recall events
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<MemoryEntry[]>).detail;
      if (!detail || detail.length === 0) return;
      setMemories(detail.slice(0, MAX_DISPLAYED));
      setShow(true);
      interactedRef.current = false;
    };

    window.addEventListener('johnny5:memoryRecall', handler);
    return () => window.removeEventListener('johnny5:memoryRecall', handler);
  }, []);

  // -----------------------------------------------------------------------
  // Auto-hide after 30 seconds if not interacted with
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!show || memories.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (!interactedRef.current) {
        setShow(false);
      }
    }, AUTO_HIDE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show, memories]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const handleResume = useCallback(
    (entry: MemoryEntry) => {
      interactedRef.current = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('johnny5:resumeFromMemory', { detail: entry }),
        );
      }
      setShow(false);
      onDismiss();
    },
    [onDismiss],
  );

  const handleDismiss = useCallback(() => {
    interactedRef.current = true;
    setShow(false);
    onDismiss();
  }, [onDismiss]);

  const handleMouseEnter = useCallback(() => {
    interactedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (!isVisible || !memories.length) return null;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      className={`
        mx-2 mb-2 rounded-lg overflow-hidden
        bg-violet-500/10 border border-violet-500/30
        transition-all duration-300 ease-out
        ${show ? 'animate-in slide-in-from-top opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
          <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
            Session Memory
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-text-muted hover:text-text-secondary transition-colors p-0.5"
          aria-label="Dismiss memories"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Memory entries */}
      <div className="px-3 pb-2 space-y-2">
        {memories.map((entry) => (
          <div
            key={entry.id}
            className="rounded bg-bg-tertiary/50 px-2 py-1.5"
          >
            {/* Session name and time */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-text-primary truncate">
                {entry.sessionName}
              </span>
              <span className="text-[10px] text-text-muted whitespace-nowrap flex-shrink-0">
                {timeAgo(entry.timestamp)}
              </span>
            </div>

            {/* Files involved */}
            <p className="text-[10px] text-text-muted font-mono mt-0.5 truncate">
              {truncateFiles(entry.filesModified, 60)}
            </p>

            {/* Accomplishments (first 2) */}
            {entry.accomplishments.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {entry.accomplishments.slice(0, 2).map((acc, i) => (
                  <p
                    key={i}
                    className="text-[10px] text-text-secondary truncate"
                  >
                    {acc}
                  </p>
                ))}
              </div>
            )}

            {/* Resume button */}
            <button
              onClick={() => handleResume(entry)}
              className="
                flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium
                bg-violet-500/20 text-violet-400
                hover:bg-violet-500/30 hover:shadow-[0_0_8px_rgba(139,92,246,0.15)]
                transition-all duration-200
              "
            >
              <Play className="w-2.5 h-2.5" />
              Resume
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
