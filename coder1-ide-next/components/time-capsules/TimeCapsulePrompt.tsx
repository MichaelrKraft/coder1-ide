'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimeCapsulePromptProps {
  commitSha: string;
  commitMessage: string;
  sessionDuration: number; // milliseconds
  onSave: () => Promise<void>;
  onDismiss: () => void;
}

type PromptPhase = 'idle' | 'saving' | 'saved' | 'error';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a millisecond duration into a compact human-readable string. */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 && minutes < 10 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/** Truncate a string to `maxLen` characters, appending an ellipsis if needed. */
function truncate(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen).trimEnd() + '\u2026';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTO_DISMISS_MS = 30_000;
const SAVED_DISMISS_MS = 1_500;
const ERROR_DISMISS_MS = 3_000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TimeCapsulePrompt({
  commitSha,
  commitMessage,
  sessionDuration,
  onSave,
  onDismiss,
}: TimeCapsulePromptProps) {
  const [phase, setPhase] = useState<PromptPhase>('idle');
  const [isExiting, setIsExiting] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_DISMISS_MS);

  const mountTimeRef = useRef(Date.now());
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Dismiss with exit animation ----------------------------------------

  const dismiss = useCallback(() => {
    setIsExiting(true);
    // Allow the CSS exit transition to complete before unmounting.
    setTimeout(onDismiss, 250);
  }, [onDismiss]);

  // ---- Auto-dismiss countdown (only while idle) ----------------------------

  useEffect(() => {
    if (phase !== 'idle') return;

    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, AUTO_DISMISS_MS - elapsed);
      setCountdown(remaining);

      if (remaining <= 0) {
        dismiss();
      }
    }, 100);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [phase, dismiss]);

  // ---- Cleanup on unmount --------------------------------------------------

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ---- Handlers ------------------------------------------------------------

  const handleSave = async () => {
    if (phase !== 'idle') return;
    setPhase('saving');

    try {
      await onSave();
      setPhase('saved');
      dismissTimerRef.current = setTimeout(dismiss, SAVED_DISMISS_MS);
    } catch {
      setPhase('error');
      dismissTimerRef.current = setTimeout(dismiss, ERROR_DISMISS_MS);
    }
  };

  // ---- Derived values ------------------------------------------------------

  const shortSha = commitSha.slice(0, 7);
  const shortMessage = truncate(commitMessage, 40);
  const duration = formatDuration(sessionDuration);
  const countdownProgress = countdown / AUTO_DISMISS_MS; // 1 -> 0

  // ---- Render --------------------------------------------------------------

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        relative overflow-hidden
        bg-zinc-800/90 border border-zinc-700 rounded-lg
        shadow-lg backdrop-blur-sm
        transition-all duration-250 ease-out
        ${isExiting ? 'opacity-0 -translate-y-2' : 'animate-slide-down opacity-100 translate-y-0'}
      `}
      style={{
        // Inline keyframes for the entrance animation so we don't need to
        // extend the Tailwind config. The `animate-slide-down` class is
        // defined with an inline @keyframes via the style prop as a fallback.
        animation: isExiting ? 'none' : 'tc-slide-down 0.25s ease-out',
      }}
    >
      {/* Entrance animation keyframes (injected once) */}
      <style>{`
        @keyframes tc-slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Auto-dismiss countdown bar */}
      {phase === 'idle' && (
        <div className="absolute top-0 left-0 h-0.5 bg-blue-500/60 transition-all duration-100 ease-linear"
          style={{ width: `${countdownProgress * 100}%` }}
        />
      )}

      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Capsule icon */}
        <div className="flex-shrink-0 text-blue-400" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
          </svg>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* Prompt text or status text */}
          {phase === 'idle' && (
            <span className="text-sm text-zinc-200 whitespace-nowrap">
              Save this session as a Time Capsule?
            </span>
          )}
          {phase === 'saving' && (
            <span className="text-sm text-zinc-300 flex items-center gap-2">
              <LoadingSpinner />
              Saving capsule...
            </span>
          )}
          {phase === 'saved' && (
            <span className="text-sm text-green-400 font-medium">
              Saved!
            </span>
          )}
          {phase === 'error' && (
            <span className="text-sm text-red-400 font-medium">
              Failed to save. Try again later.
            </span>
          )}

          {/* Metadata pills */}
          {phase === 'idle' && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span
                className="font-mono bg-zinc-700/60 px-1.5 py-0.5 rounded"
                title={commitSha}
              >
                {shortSha}
              </span>
              <span
                className="truncate max-w-[240px]"
                title={commitMessage}
              >
                {shortMessage}
              </span>
              <span className="text-zinc-500" aria-hidden="true">&middot;</span>
              <span className="whitespace-nowrap">{duration}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {phase === 'idle' && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleSave}
              className="
                px-3 py-1 text-sm font-medium rounded
                bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                text-white
                transition-colors duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-800
              "
            >
              Save
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="
                px-3 py-1 text-sm rounded
                text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50
                transition-colors duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-800
              "
            >
              Not this time
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-blue-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Export helper for external use
// ---------------------------------------------------------------------------

export { formatDuration };
