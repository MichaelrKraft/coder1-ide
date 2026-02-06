'use client';

import React from 'react';
import { useJohnny5Store } from '@/stores/useJohnny5Store';
import { useIDEStore } from '@/stores/useIDEStore';

interface ContextBudgetMiniProps {
  onClick?: () => void;
}

/**
 * ContextBudgetMini - Compact always-visible bar showing context token usage.
 *
 * Reads from Johnny5 store (contextComposition) first, falls back to
 * IDE store (aiState.tokenUsage) when the full composition isn't available yet.
 *
 * Height: 28px total (4px progress bar + small text row below).
 * Color thresholds:
 *   - Green  (#10B981) when < 60%
 *   - Yellow (#F59E0B) when 60-80%
 *   - Orange (#FB923C) when 80-95%
 *   - Red    (#EF4444) when > 95%
 */
export default function ContextBudgetMini({ onClick }: ContextBudgetMiniProps) {
  const contextComposition = useJohnny5Store((s) => s.contextComposition);
  const tokenUsage = useIDEStore((s) => s.aiState.tokenUsage);
  const isAIConnected = useIDEStore((s) => s.connections.ai);

  // --- Derive display values ------------------------------------------------

  let total = 0;
  let limit = 200000;
  let usagePercentage = 0;
  let hasData = false;

  if (contextComposition) {
    total = contextComposition.total;
    limit = contextComposition.limit || 200000;
    usagePercentage = contextComposition.usagePercentage;
    hasData = true;
  } else if (tokenUsage && tokenUsage.total > 0) {
    total = tokenUsage.total;
    usagePercentage = Math.round((total / limit) * 100);
    hasData = true;
  }

  // --- Helpers ---------------------------------------------------------------

  const formatTokens = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${Math.round(num / 1000)}K`;
    return String(num);
  };

  const getBarColor = (pct: number): string => {
    if (pct > 95) return '#EF4444';
    if (pct > 80) return '#FB923C';
    if (pct > 60) return '#F59E0B';
    return '#10B981';
  };

  // --- Disconnected state ----------------------------------------------------

  if (!isAIConnected) {
    return (
      <button
        onClick={onClick}
        className="w-full px-3 border-b border-border-default cursor-pointer
          hover:bg-bg-tertiary/50 transition-colors"
        style={{ height: 28 }}
      >
        <div className="h-1 w-full rounded-full bg-bg-tertiary mt-1" />
        <p className="text-[10px] text-text-muted leading-tight mt-1">
          Context: not connected
        </p>
      </button>
    );
  }

  // --- Waiting-for-data state ------------------------------------------------

  if (!hasData) {
    return (
      <button
        onClick={onClick}
        className="w-full px-3 border-b border-border-default cursor-pointer
          hover:bg-bg-tertiary/50 transition-colors"
        style={{ height: 28 }}
      >
        <div className="h-1 w-full rounded-full bg-bg-tertiary mt-1" />
        <p className="text-[10px] text-text-muted leading-tight mt-1">
          Context: waiting for data...
        </p>
      </button>
    );
  }

  // --- Normal display --------------------------------------------------------

  const barColor = getBarColor(usagePercentage);
  const clampedPct = Math.min(usagePercentage, 100);

  return (
    <button
      onClick={onClick}
      className="w-full px-3 border-b border-border-default cursor-pointer
        hover:bg-bg-tertiary/50 transition-colors text-left"
      style={{ height: 28 }}
    >
      {/* 4px progress bar */}
      <div className="h-1 w-full rounded-full bg-bg-tertiary mt-1 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clampedPct}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      {/* Token text */}
      <p className="text-[10px] text-text-muted leading-tight mt-1 truncate">
        ~{formatTokens(total)} / {formatTokens(limit)} tokens (estimated)
      </p>
    </button>
  );
}
