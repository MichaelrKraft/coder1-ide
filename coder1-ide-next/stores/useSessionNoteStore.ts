'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ================================================================================
// Session Note Store — Feature #14: Session Live Notes
// Manages the lifecycle of a live session note that auto-appends events as the
// user works. Does NOT use persist middleware — session notes are ephemeral.
// ================================================================================

interface SessionNoteState {
  sessionId: string | null;
  notePath: string | null;
  pendingLines: string[];
  isRecording: boolean;
  lastFlushAt: number;
  flushIntervalId: ReturnType<typeof setInterval> | null;

  initSession: (sessionId: string) => Promise<void>;
  appendLine: (line: string) => void;
  flush: () => Promise<void>;
  stopRecording: () => Promise<void>;
}

export const useSessionNoteStore = create<SessionNoteState>()(
  devtools(
    (set, get) => ({
      sessionId: null,
      notePath: null,
      pendingLines: [],
      isRecording: false,
      lastFlushAt: 0,
      flushIntervalId: null,

      initSession: async (sessionId: string) => {
        const state = get();

        // Guard: already initialized for this session
        if (state.sessionId === sessionId && state.isRecording) {
          return;
        }

        const notePath = `Sessions/session-${sessionId}.md`;

        set({
          sessionId,
          notePath,
          isRecording: true,
          pendingLines: [],
        });

        // Create the note in the vault — ignore if it already exists
        try {
          await fetch('/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: notePath,
              title: `Session ${sessionId.slice(0, 8)}`,
              content: '# Session Log\n\n',
            }),
          });
        } catch {
          // Non-critical — note may already exist, continue regardless
        }

        // Start auto-flush every 30 seconds
        const id = setInterval(() => {
          get().flush();
        }, 30_000);

        set({ flushIntervalId: id });
      },

      appendLine: (line: string) => {
        const state = get();
        if (!state.isRecording) return;

        const truncated = line.slice(0, 200);
        const updated = [...state.pendingLines, truncated];
        set({ pendingLines: updated });

        if (updated.length >= 5) {
          get().flush();
        }
      },

      flush: async () => {
        const state = get();
        if (state.pendingLines.length === 0 || !state.notePath) return;

        // Capture lines and clear the queue optimistically
        const lines = [...state.pendingLines];
        set({ pendingLines: [] });

        try {
          // Fetch current note content
          const getRes = await fetch(
            `/api/vault?path=${encodeURIComponent(state.notePath)}`
          );
          const getData = getRes.ok ? await getRes.json() : null;
          const existingContent: string =
            getData?.content ?? getData?.note?.content ?? '# Session Log\n\n';

          const newContent = existingContent + '\n' + lines.join('\n');

          await fetch(
            `/api/vault?path=${encodeURIComponent(state.notePath)}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: newContent }),
            }
          );

          set({ lastFlushAt: Date.now() });
        } catch {
          // On error, restore lines to the front of the queue
          set((s) => ({ pendingLines: [...lines, ...s.pendingLines] }));
        }
      },

      stopRecording: async () => {
        const state = get();

        if (state.flushIntervalId !== null) {
          clearInterval(state.flushIntervalId);
        }

        // Final flush before marking as stopped
        await get().flush();

        set({ isRecording: false, flushIntervalId: null });
      },
    }),
    { name: 'session-note-store' }
  )
);
