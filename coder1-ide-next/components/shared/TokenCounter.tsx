'use client';

import React from 'react';

// ============================================================================
// Types
// ============================================================================

interface TokenCounterProps {
  /** The text content to estimate token count for */
  content: string;
  /** Token count at which the indicator turns amber. Default: 4000 */
  warnAt?: number;
  /** Token count at which the indicator turns red. Default: 6000 */
  errorAt?: number;
  /** Display label. Default: "Tokens" */
  label?: string;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Rough token estimate: 1 token ≈ 4 characters */
function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

type Level = 'ok' | 'warn' | 'error';

function getLevel(count: number, warnAt: number, errorAt: number): Level {
  if (count >= errorAt) return 'error';
  if (count >= warnAt) return 'warn';
  return 'ok';
}

// ============================================================================
// Component
// ============================================================================

export function TokenCounter({
  content,
  warnAt = 4000,
  errorAt = 6000,
  label = 'Tokens',
  className = '',
}: TokenCounterProps): React.ReactElement {
  const count = estimateTokens(content);
  const level = getLevel(count, warnAt, errorAt);

  const colorClass: Record<Level, string> = {
    ok: 'text-green-500',
    warn: 'text-amber-500',
    error: 'text-red-500',
  };

  const icon: Record<Level, React.ReactElement | null> = {
    ok: null,
    warn: (
      <svg
        className="w-3.5 h-3.5 inline mr-0.5"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
    error: (
      <svg
        className="w-3.5 h-3.5 inline mr-0.5"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  return (
    <span className={`text-xs font-mono ${colorClass[level]} ${className}`} aria-label={`${count} tokens`}>
      {icon[level]}
      {label}: {count.toLocaleString()}
    </span>
  );
}
