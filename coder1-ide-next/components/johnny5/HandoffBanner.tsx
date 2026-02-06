'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, Copy, Check, FileDown, X } from 'lucide-react';
import {
  getHandoffGenerator,
  type HandoffSummary,
  type WarningLevel,
} from '@/services/johnny5/handoff-generator';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HandoffBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Theme mapping per warning level
// ---------------------------------------------------------------------------

interface LevelTheme {
  bg: string;
  border: string;
  iconColor: string;
  labelColor: string;
  label: string;
}

const LEVEL_THEMES: Record<WarningLevel, LevelTheme> = {
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
    labelColor: 'text-yellow-400',
    label: 'Context budget at 75%',
  },
  critical: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    labelColor: 'text-orange-400',
    label: 'Context running low',
  },
  urgent: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    iconColor: 'text-red-400',
    labelColor: 'text-red-400',
    label: 'Context nearly full',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HandoffBanner({ isVisible, onDismiss }: HandoffBannerProps) {
  const [warningLevel, setWarningLevel] = useState<WarningLevel | null>(null);
  const [percentage, setPercentage] = useState(0);
  const [handoff, setHandoff] = useState<HandoffSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -----------------------------------------------------------------------
  // Listen for context warning events
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ level: WarningLevel; percentage: number }>).detail;
      if (!detail) return;
      setWarningLevel(detail.level);
      setPercentage(detail.percentage);
      // Reset handoff state when a new threshold is crossed.
      setHandoff(null);
      setCopied(false);
    };

    window.addEventListener('johnny5:contextWarning', handler);
    return () => window.removeEventListener('johnny5:contextWarning', handler);
  }, []);

  // -----------------------------------------------------------------------
  // Generate handoff
  // -----------------------------------------------------------------------
  const handleGenerate = useCallback(() => {
    setGenerating(true);
    // Use a microtask so the UI updates before the synchronous generation runs.
    Promise.resolve().then(() => {
      try {
        const generator = getHandoffGenerator();
        const result = generator.generateHandoff();
        setHandoff(result);
      } catch (err) {
        console.warn('[HandoffBanner] Generation failed:', err);
      } finally {
        setGenerating(false);
      }
    });
  }, []);

  // -----------------------------------------------------------------------
  // Copy to clipboard
  // -----------------------------------------------------------------------
  const handleCopy = useCallback(() => {
    if (!handoff) return;

    navigator.clipboard.writeText(handoff.handoffText).then(() => {
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback: select-all in textarea.
      console.warn('[HandoffBanner] Clipboard write failed');
    });
  }, [handoff]);

  // -----------------------------------------------------------------------
  // Cleanup copied timer on unmount
  // -----------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (!isVisible || !warningLevel) return null;

  const theme = LEVEL_THEMES[warningLevel];

  return (
    <div
      className={`
        mx-2 mb-2 rounded-lg overflow-hidden
        ${theme.bg} border ${theme.border}
        transition-all duration-300 ease-out
        animate-in slide-in-from-top
      `}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className={`w-3.5 h-3.5 ${theme.iconColor} flex-shrink-0`} />
          <span className={`text-[10px] font-semibold ${theme.labelColor} uppercase tracking-wider`}>
            {theme.label}
          </span>
          <span className="text-[10px] text-text-muted ml-1">
            ({percentage}%)
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-text-muted hover:text-text-secondary transition-colors p-0.5"
          aria-label="Dismiss handoff banner"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Action area */}
      <div className="px-3 pb-2">
        {!handoff ? (
          <>
            <p className="text-xs text-text-secondary leading-relaxed mb-2">
              Save your session context before starting a new conversation.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium
                transition-all duration-200
                ${generating
                  ? 'bg-bg-tertiary text-text-muted cursor-wait'
                  : 'bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 hover:shadow-[0_0_8px_rgba(0,217,255,0.15)]'
                }
              `}
            >
              <FileDown className="w-3 h-3" />
              {generating ? 'Generating...' : 'Generate Handoff'}
            </button>
          </>
        ) : (
          <>
            {/* Handoff text preview */}
            <pre className="text-[10px] text-text-secondary font-mono leading-relaxed whitespace-pre-wrap bg-bg-secondary rounded p-2 mb-2 max-h-40 overflow-y-auto border border-border-default">
              {handoff.handoffText}
            </pre>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium
                  transition-all duration-200
                  ${copied
                    ? 'bg-green-500/20 text-green-400 cursor-default'
                    : 'bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 hover:shadow-[0_0_8px_rgba(0,217,255,0.15)]'
                  }
                `}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy for New Session
                  </>
                )}
              </button>
              <button
                onClick={onDismiss}
                className="
                  flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium
                  bg-bg-secondary text-text-muted
                  hover:bg-bg-tertiary hover:text-text-secondary
                  transition-all duration-200
                "
              >
                Dismiss
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
