'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface ContextUsageBarProps {
  used: number;
  limit: number;
  warningThreshold?: number; // percentage (default 80)
  criticalThreshold?: number; // percentage (default 95)
  className?: string;
}

/**
 * ContextUsageBar - Horizontal progress bar showing context window usage
 *
 * Features:
 * - Gradient fill based on usage level
 * - Warning indicator at 80%
 * - Critical state at 95%
 * - Animated fill
 * - Token count display
 */
export default function ContextUsageBar({
  used,
  limit,
  warningThreshold = 80,
  criticalThreshold = 95,
  className = '',
}: ContextUsageBarProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const percentage = limit > 0 ? (used / limit) * 100 : 0;

  // Animate the bar fill
  useEffect(() => {
    const duration = 800;
    const startTime = Date.now();
    const startValue = animatedPercentage;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValue + (percentage - startValue) * eased;

      setAnimatedPercentage(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [percentage]);

  // Determine status and colors
  const isWarning = percentage >= warningThreshold && percentage < criticalThreshold;
  const isCritical = percentage >= criticalThreshold;

  const getGradient = () => {
    if (isCritical) {
      return 'linear-gradient(90deg, rgb(239, 68, 68), rgb(220, 38, 38))';
    }
    if (isWarning) {
      return 'linear-gradient(90deg, rgb(251, 146, 60), rgb(234, 88, 12))';
    }
    return 'linear-gradient(90deg, rgb(0, 217, 255), rgb(139, 92, 246))';
  };

  const getGlow = () => {
    if (isCritical) return 'rgba(239, 68, 68, 0.4)';
    if (isWarning) return 'rgba(251, 146, 60, 0.4)';
    return 'rgba(0, 217, 255, 0.3)';
  };

  // Format token numbers
  const formatTokens = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className={`bg-bg-tertiary rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Context Usage
          </h4>
          {isWarning && !isCritical && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/20 rounded text-orange-400">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[9px] font-semibold">Warning</span>
            </div>
          )}
          {isCritical && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 rounded text-red-400 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[9px] font-semibold">Critical</span>
            </div>
          )}
        </div>

        <div className="text-right">
          <span
            className={`text-sm font-bold ${
              isCritical ? 'text-red-400' :
              isWarning ? 'text-orange-400' :
              'text-coder1-cyan'
            }`}
          >
            {Math.round(animatedPercentage)}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-4 rounded-full bg-bg-secondary overflow-hidden">
        {/* Background segments for reference */}
        <div className="absolute inset-0 flex">
          <div className="flex-1" />
          <div
            className="h-full w-px bg-orange-500/30"
            style={{ marginLeft: `${warningThreshold}%` }}
          />
          <div
            className="h-full w-px bg-red-500/30"
            style={{ marginLeft: `${criticalThreshold - warningThreshold}%` }}
          />
        </div>

        {/* Fill bar */}
        <div
          className="h-full rounded-full transition-all duration-300 relative"
          style={{
            width: `${animatedPercentage}%`,
            background: getGradient(),
            boxShadow: `0 0 12px ${getGlow()}`,
          }}
        >
          {/* Animated shine effect */}
          <div
            className="absolute inset-0 overflow-hidden rounded-full"
            style={{ opacity: 0.3 }}
          >
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              }}
            />
          </div>
        </div>

        {/* Warning threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-orange-500/50"
          style={{ left: `${warningThreshold}%` }}
        />

        {/* Critical threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500/50"
          style={{ left: `${criticalThreshold}%` }}
        />
      </div>

      {/* Token counts */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-text-muted">
          {formatTokens(used)} used
        </span>
        <span className="text-[10px] text-text-muted">
          {formatTokens(limit)} limit
        </span>
      </div>

      {/* Remaining tokens */}
      <div className="flex items-center justify-center mt-3 pt-3 border-t border-border-default">
        <div className="flex items-center gap-2 text-[11px]">
          <Info className="w-3 h-3 text-text-muted" />
          <span className="text-text-muted">
            <span className={`font-semibold ${
              isCritical ? 'text-red-400' :
              isWarning ? 'text-orange-400' :
              'text-green-400'
            }`}>
              {formatTokens(limit - used)}
            </span>
            {' '}tokens remaining
          </span>
        </div>
      </div>

      {/* Warning message */}
      {isWarning && !isCritical && (
        <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <p className="text-[10px] text-orange-400">
            Context is filling up. Consider summarizing the conversation or starting a new session.
          </p>
        </div>
      )}

      {isCritical && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-[10px] text-red-400">
            Context window nearly full! Start a new session to avoid truncation.
          </p>
        </div>
      )}

      {/* CSS for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
