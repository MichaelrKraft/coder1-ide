'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useSessionNoteStore } from '@/stores/useSessionNoteStore';
import { useVaultStore } from '@/stores/useVaultStore';

// ================================================================================
// SessionNoteIndicator — Feature #14: Session Live Notes
// Renders a small pulsing "Live" badge in the Notes tab header when recording
// is active. Returns null when not recording.
// ================================================================================

export default function SessionNoteIndicator() {
  const isRecording = useSessionNoteStore((s) => s.isRecording);
  const notePath = useSessionNoteStore((s) => s.notePath);
  const [summarizing, setSummarizing] = useState(false);

  if (!isRecording) return null;

  const handleView = () => {
    if (!notePath) return;
    useVaultStore.getState().openNote(notePath);
  };

  const handleSummarize = async () => {
    if (!notePath || summarizing) return;
    setSummarizing(true);

    try {
      const getRes = await fetch(
        `/api/vault?path=${encodeURIComponent(notePath)}`
      );
      if (!getRes.ok) return;

      const data = await getRes.json();
      const content: string =
        data?.content ?? data?.note?.content ?? '';

      if (!content.trim()) return;

      await fetch('/api/vault/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: notePath, content }),
      });
    } catch {
      // Non-critical — summarize errors must not break UI
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <span className="flex items-center gap-1">
      {/* Pulsing recording dot */}
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />

      {/* Live label */}
      <span className="text-[10px] text-red-400 font-medium leading-none">
        Live
      </span>

      {/* Separator */}
      <span className="text-[#3a3a5e] text-[10px] leading-none">·</span>

      {/* View button */}
      <button
        type="button"
        onClick={handleView}
        title="View session note"
        className="flex items-center gap-0.5 text-[10px] text-[#8888aa] hover:text-white transition-colors leading-none"
      >
        <BookOpen size={10} />
        <span>View</span>
      </button>

      {/* Separator */}
      <span className="text-[#3a3a5e] text-[10px] leading-none">·</span>

      {/* Summarize button */}
      <button
        type="button"
        onClick={handleSummarize}
        disabled={summarizing}
        title="Summarize session note with AI"
        className="text-[10px] text-[#8888aa] hover:text-white transition-colors leading-none disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {summarizing ? 'Summarizing…' : 'Summarize'}
      </button>
    </span>
  );
}
