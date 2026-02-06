'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lightbulb, Copy, Check, ThumbsDown, X } from 'lucide-react';
import type { KnownErrorMatchDetail } from '@/services/johnny5/error-pattern-library';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ErrorPatternCardProps {
  isVisible: boolean;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTO_HIDE_MS = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a date as a relative "X ago" string. */
function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ErrorPatternCard Component
 *
 * Compact card that appears when a recurring error is detected by the
 * ErrorPatternLibrary service. Listens to `johnny5:knownErrorMatch`
 * CustomEvents. Shows the error summary, when it was last resolved, what
 * fixed it, and offers "Apply Fix", "Copy Fix", and "Not Helpful" actions.
 *
 * Auto-hides after 30 seconds unless the user has hovered over the card.
 */
export default function ErrorPatternCard({ isVisible, onDismiss }: ErrorPatternCardProps) {
  const [matchData, setMatchData] = useState<KnownErrorMatchDetail | null>(null);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactedRef = useRef(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -----------------------------------------------------------------------
  // Listen for known error match events
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<KnownErrorMatchDetail>).detail;
      if (!detail || !detail.pattern) return;
      setMatchData(detail);
      setShow(true);
      setCopied(false);
      setApplied(false);
      interactedRef.current = false;
    };

    window.addEventListener('johnny5:knownErrorMatch', handler);
    return () => window.removeEventListener('johnny5:knownErrorMatch', handler);
  }, []);

  // -----------------------------------------------------------------------
  // Auto-hide after 30 seconds if not interacted with
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!show || !matchData) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (!interactedRef.current) {
        setShow(false);
      }
    }, AUTO_HIDE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show, matchData]);

  // -----------------------------------------------------------------------
  // Cleanup copied timer on unmount
  // -----------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleMouseEnter = useCallback(() => {
    interactedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleApplyFix = useCallback(() => {
    if (!matchData) return;
    interactedRef.current = true;
    setApplied(true);

    // Send resolution commands to the terminal.
    const commands = matchData.pattern.resolution.commandsRun;
    if (typeof window !== 'undefined' && commands.length > 0) {
      window.dispatchEvent(
        new CustomEvent('johnny5:sendToTerminal', {
          detail: { text: commands.join('\n') },
        }),
      );
    }

    // Fade out after brief confirmation.
    setTimeout(() => {
      setShow(false);
      onDismiss();
    }, 1500);
  }, [matchData, onDismiss]);

  const handleCopyFix = useCallback(() => {
    if (!matchData) return;
    interactedRef.current = true;

    const text = matchData.pattern.resolution.description;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      console.warn('[ErrorPatternCard] Clipboard write failed');
    });
  }, [matchData]);

  const handleNotHelpful = useCallback(() => {
    if (!matchData) return;
    interactedRef.current = true;

    // Dispatch dismiss event so the service can downgrade confidence.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('johnny5:errorPatternDismiss', {
          detail: { patternId: matchData.pattern.id },
        }),
      );
    }

    setShow(false);
    onDismiss();
  }, [matchData, onDismiss]);

  const handleClose = useCallback(() => {
    interactedRef.current = true;
    setShow(false);
    onDismiss();
  }, [onDismiss]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (!isVisible || !matchData || !show) return null;

  const { pattern } = matchData;
  const truncatedError =
    pattern.originalError.length > 120
      ? pattern.originalError.slice(0, 120) + '...'
      : pattern.originalError;

  const filesModified = pattern.resolution.filesModified;
  const commandsRun = pattern.resolution.commandsRun;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      className={`
        mx-2 mb-2 rounded-lg overflow-hidden
        bg-emerald-500/10 border border-emerald-500/30
        transition-all duration-300 ease-out
        ${show ? 'animate-in slide-in-from-top opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
            Known Fix Available
          </span>
        </div>
        <button
          onClick={handleClose}
          className="text-text-muted hover:text-text-secondary transition-colors p-0.5"
          aria-label="Dismiss error pattern card"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Body */}
      <div className="px-3 pb-2">
        {/* Error summary */}
        <p className="text-[10px] font-mono text-text-secondary leading-relaxed line-clamp-2 mb-1.5">
          {truncatedError}
        </p>

        {/* Metadata row */}
        <div className="flex items-center gap-3 text-[10px] text-text-muted mb-1.5">
          <span>
            Last resolved{' '}
            <span className="text-emerald-400 font-medium">
              {timeAgo(pattern.resolution.resolvedAt)}
            </span>
          </span>
          <span className="text-border-default">|</span>
          <span>
            Seen <span className="text-emerald-400 font-medium">{pattern.hitCount}x</span>
          </span>
          <span className="text-border-default">|</span>
          <span>
            {Math.round(matchData.confidence * 100)}% confidence
          </span>
        </div>

        {/* Resolution details */}
        <div className="bg-bg-secondary rounded p-1.5 mb-2 border border-border-default">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
            What fixed it:
          </p>
          {filesModified.length > 0 && (
            <p className="text-[10px] font-mono text-text-secondary leading-relaxed">
              Files: {filesModified.slice(0, 3).join(', ')}
              {filesModified.length > 3 ? ` +${filesModified.length - 3} more` : ''}
            </p>
          )}
          {commandsRun.length > 0 && (
            <p className="text-[10px] font-mono text-text-secondary leading-relaxed">
              Commands: {commandsRun.slice(0, 3).join(', ')}
              {commandsRun.length > 3 ? ` +${commandsRun.length - 3} more` : ''}
            </p>
          )}
          {filesModified.length === 0 && commandsRun.length === 0 && (
            <p className="text-[10px] text-text-muted italic">
              No specific steps captured
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Apply Fix button */}
          <button
            onClick={handleApplyFix}
            disabled={applied || commandsRun.length === 0}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium
              transition-all duration-200
              ${applied
                ? 'bg-green-500/20 text-green-400 cursor-default'
                : commandsRun.length === 0
                  ? 'bg-bg-tertiary text-text-muted cursor-not-allowed'
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:shadow-[0_0_8px_rgba(16,185,129,0.15)]'
              }
            `}
          >
            {applied ? (
              <>
                <Check className="w-3 h-3" />
                Sent
              </>
            ) : (
              'Apply Fix'
            )}
          </button>

          {/* Copy Fix button */}
          <button
            onClick={handleCopyFix}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium
              transition-all duration-200
              ${copied
                ? 'bg-green-500/20 text-green-400 cursor-default'
                : 'bg-bg-secondary text-text-muted hover:bg-bg-tertiary hover:text-text-secondary'
              }
            `}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>

          {/* Not Helpful button */}
          <button
            onClick={handleNotHelpful}
            className="
              flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium
              bg-bg-secondary text-text-muted
              hover:bg-red-500/10 hover:text-red-400
              transition-all duration-200
            "
          >
            <ThumbsDown className="w-3 h-3" />
            Not Helpful
          </button>
        </div>
      </div>
    </div>
  );
}
