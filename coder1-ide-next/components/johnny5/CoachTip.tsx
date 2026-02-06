'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import type { CoachTip as CoachTipData, CoachTipType } from '@/services/johnny5/session-coach';
import { getSessionCoach } from '@/services/johnny5/session-coach';

interface CoachTipProps {
  isVisible: boolean;
  onDismiss: () => void;
}

const AUTO_HIDE_MS = 15_000;

/**
 * CoachTip Component
 *
 * Subtle, non-intrusive cyan/teal coaching tip card. Listens to
 * `johnny5:coachTip` CustomEvents emitted by the SessionCoach service.
 * Displays one tip at a time with an action button, "Got it" dismiss,
 * and "Don't show again" preference. Auto-hides after 15 seconds,
 * paused on hover.
 */
export default function CoachTip({ isVisible, onDismiss }: CoachTipProps) {
  const [tip, setTip] = useState<CoachTipData | null>(null);
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactedRef = useRef(false);

  // -----------------------------------------------------------------------
  // Listen for new coaching tips from the SessionCoach service
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CoachTipData>).detail;
      if (!detail) return;
      setTip(detail);
      setShow(true);
      interactedRef.current = false;
    };

    window.addEventListener('johnny5:coachTip', handler);
    return () => window.removeEventListener('johnny5:coachTip', handler);
  }, []);

  // -----------------------------------------------------------------------
  // Auto-hide after 15 seconds if not interacted with
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!show || !tip) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (!interactedRef.current) {
        setShow(false);
      }
    }, AUTO_HIDE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show, tip]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  /** Execute the suggested action. */
  const handleAction = useCallback(() => {
    if (!tip) return;
    interactedRef.current = true;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(tip.action, {
          detail: tip.actionPayload ? { command: tip.actionPayload } : undefined,
        }),
      );
    }

    // Close after dispatching action.
    setTimeout(() => {
      setShow(false);
      onDismiss();
    }, 300);
  }, [tip, onDismiss]);

  /** Dismiss with "Got it" -- just hide, no preference saved. */
  const handleGotIt = useCallback(() => {
    interactedRef.current = true;
    setShow(false);
    onDismiss();
  }, [onDismiss]);

  /** Dismiss with "Don't show again" -- hide AND save preference. */
  const handleDontShowAgain = useCallback(() => {
    if (!tip) return;
    interactedRef.current = true;

    const coach = getSessionCoach();
    coach.dismissType(tip.type as CoachTipType);

    setShow(false);
    onDismiss();
  }, [tip, onDismiss]);

  /** Pause auto-hide on hover. */
  const handleMouseEnter = useCallback(() => {
    interactedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (!isVisible || !tip || !show) return null;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      className={`
        mx-2 mb-2 rounded-lg overflow-hidden
        bg-teal-500/10 border border-teal-500/30
        transition-all duration-300 ease-out
        ${show ? 'animate-in slide-in-from-top opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
          <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider">
            Session Coach
          </span>
        </div>
        <button
          onClick={handleGotIt}
          className="text-text-muted hover:text-text-secondary transition-colors p-0.5"
          aria-label="Dismiss tip"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Tip body */}
      <div className="px-3 pb-2">
        <p className="text-xs text-text-secondary leading-relaxed">
          {tip.message}
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleAction}
            className="
              flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium
              bg-teal-500/20 text-teal-400
              hover:bg-teal-500/30 hover:shadow-[0_0_8px_rgba(20,184,166,0.15)]
              transition-all duration-200
            "
          >
            <Sparkles className="w-3 h-3" />
            {tip.actionLabel}
          </button>
          <button
            onClick={handleGotIt}
            className="
              flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium
              bg-bg-secondary text-text-muted
              hover:bg-bg-tertiary hover:text-text-secondary
              transition-all duration-200
            "
          >
            Got it
          </button>
        </div>

        {/* Don't show again link */}
        <button
          onClick={handleDontShowAgain}
          className="
            mt-1.5 text-[10px] text-text-muted underline
            hover:text-text-secondary transition-colors
          "
        >
          Don&apos;t show again
        </button>
      </div>
    </div>
  );
}
