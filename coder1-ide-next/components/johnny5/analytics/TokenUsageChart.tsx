'use client';

import React from 'react';
import { Johnny5TokenUsage } from '@/types/johnny5';

interface TokenUsageChartProps {
  data: Johnny5TokenUsage[];
  className?: string;
}

/**
 * TokenUsageChart - CSS-based line chart for daily token usage
 *
 * Displays input vs output tokens over time with:
 * - Gradient-filled area charts
 * - Hover tooltips
 * - Responsive sizing
 * - Coder1 cyan/purple color scheme
 */
export default function TokenUsageChart({ data, className = '' }: TokenUsageChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`bg-bg-tertiary rounded-lg p-4 ${className}`}>
        <div className="h-32 flex items-center justify-center text-text-muted text-sm">
          No usage data available
        </div>
      </div>
    );
  }

  // Calculate max value for scaling
  const maxTokens = Math.max(...data.map(d => d.totalTokens));
  const chartHeight = 120;

  // Normalize data points to percentage heights
  const getHeight = (value: number) => {
    return maxTokens > 0 ? (value / maxTokens) * chartHeight : 0;
  };

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`bg-bg-tertiary rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
          Token Usage
        </h4>
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-coder1-cyan" />
            <span className="text-text-muted">Input</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-text-muted">Output</span>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative" style={{ height: `${chartHeight}px` }}>
        {/* Y-axis grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 w-full">
              <div className="h-px bg-border-default flex-1" />
              {i === 0 && (
                <span className="text-[9px] text-text-muted w-8 text-right">
                  {formatNumber(maxTokens)}
                </span>
              )}
              {i === 3 && (
                <span className="text-[9px] text-text-muted w-8 text-right">0</span>
              )}
            </div>
          ))}
        </div>

        {/* Bars */}
        <div className="absolute inset-0 flex items-end justify-between gap-1 px-1">
          {data.map((point, index) => {
            const inputHeight = getHeight(point.inputTokens);
            const outputHeight = getHeight(point.outputTokens);

            return (
              <div
                key={point.date}
                className="flex-1 flex flex-col items-center gap-0.5 group relative"
                style={{ maxWidth: '32px' }}
              >
                {/* Stacked bar */}
                <div className="w-full flex flex-col-reverse items-center">
                  {/* Input tokens (bottom) */}
                  <div
                    className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
                    style={{
                      height: `${inputHeight}px`,
                      background: 'linear-gradient(180deg, rgba(0, 217, 255, 0.8) 0%, rgba(0, 217, 255, 0.4) 100%)',
                      boxShadow: '0 0 8px rgba(0, 217, 255, 0.3)',
                    }}
                  />
                  {/* Output tokens (top) */}
                  <div
                    className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
                    style={{
                      height: `${outputHeight}px`,
                      background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.8) 0%, rgba(139, 92, 246, 0.4) 100%)',
                      boxShadow: '0 0 8px rgba(139, 92, 246, 0.3)',
                    }}
                  />
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2
                  opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-bg-secondary border border-border-default rounded-lg p-2
                    shadow-lg text-[10px] whitespace-nowrap">
                    <div className="font-semibold text-text-primary mb-1">
                      {formatDate(point.date)}
                    </div>
                    <div className="flex items-center gap-1.5 text-coder1-cyan">
                      <span className="w-1.5 h-1.5 rounded-full bg-coder1-cyan" />
                      Input: {formatNumber(point.inputTokens)}
                    </div>
                    <div className="flex items-center gap-1.5 text-purple-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Output: {formatNumber(point.outputTokens)}
                    </div>
                    <div className="border-t border-border-default mt-1 pt-1 text-text-muted">
                      Total: {formatNumber(point.totalTokens)}
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2
                    border-4 border-transparent border-t-bg-secondary" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 px-1">
        {data.length > 0 && (
          <>
            <span className="text-[9px] text-text-muted">{formatDate(data[0].date)}</span>
            <span className="text-[9px] text-text-muted">{formatDate(data[data.length - 1].date)}</span>
          </>
        )}
      </div>
    </div>
  );
}
