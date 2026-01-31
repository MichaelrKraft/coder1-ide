'use client';

import React, { useState } from 'react';
import { Settings, MessageSquare, FileCode, Wrench } from 'lucide-react';

interface ContextBreakdown {
  system: number;
  conversation: number;
  files: number;
  tools: number;
}

interface ContextPieChartProps {
  breakdown: ContextBreakdown;
  total: number;
  className?: string;
}

interface SegmentData {
  key: keyof ContextBreakdown;
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

/**
 * ContextPieChart - Visual breakdown of context composition
 *
 * Shows distribution of tokens across:
 * - System prompts
 * - Conversation history
 * - File contents
 * - Tool definitions/outputs
 */
export default function ContextPieChart({ breakdown, total, className = '' }: ContextPieChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<keyof ContextBreakdown | null>(null);

  const segments: SegmentData[] = [
    {
      key: 'system',
      label: 'System',
      value: breakdown.system,
      color: 'rgb(139, 92, 246)', // Purple
      icon: <Settings className="w-3 h-3" />,
    },
    {
      key: 'conversation',
      label: 'Conversation',
      value: breakdown.conversation,
      color: 'rgb(0, 217, 255)', // Cyan
      icon: <MessageSquare className="w-3 h-3" />,
    },
    {
      key: 'files',
      label: 'Files',
      value: breakdown.files,
      color: 'rgb(251, 146, 60)', // Orange
      icon: <FileCode className="w-3 h-3" />,
    },
    {
      key: 'tools',
      label: 'Tools',
      value: breakdown.tools,
      color: 'rgb(34, 197, 94)', // Green
      icon: <Wrench className="w-3 h-3" />,
    },
  ];

  // Calculate percentages and angles
  const getPercentage = (value: number) => total > 0 ? (value / total) * 100 : 0;

  // SVG pie chart dimensions
  const size = 120;
  const center = size / 2;
  const radius = 45;
  const strokeWidth = 16;

  // Calculate stroke-dasharray for each segment
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  const formatTokens = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className={`bg-bg-tertiary rounded-lg p-4 ${className}`}>
      <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">
        Context Composition
      </h4>

      <div className="flex items-center gap-4">
        {/* Pie Chart */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={strokeWidth}
            />

            {/* Segments */}
            {segments.map((segment) => {
              const percentage = getPercentage(segment.value);
              const dashLength = (percentage / 100) * circumference;
              const gapLength = circumference - dashLength;
              const offset = currentOffset;
              currentOffset += dashLength;

              const isHovered = hoveredSegment === segment.key;

              return (
                <circle
                  key={segment.key}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${dashLength} ${gapLength}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 8px ${segment.color})` : 'none',
                    opacity: hoveredSegment && !isHovered ? 0.5 : 1,
                  }}
                  onMouseEnter={() => setHoveredSegment(segment.key)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              );
            })}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {hoveredSegment ? (
              <>
                <div
                  className="text-lg font-bold"
                  style={{ color: segments.find(s => s.key === hoveredSegment)?.color }}
                >
                  {getPercentage(breakdown[hoveredSegment]).toFixed(0)}%
                </div>
                <div className="text-[9px] text-text-muted capitalize">
                  {hoveredSegment}
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-text-primary">
                  {formatTokens(total)}
                </div>
                <div className="text-[9px] text-text-muted">Total</div>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {segments.map((segment) => {
            const percentage = getPercentage(segment.value);
            const isHovered = hoveredSegment === segment.key;

            return (
              <div
                key={segment.key}
                className={`
                  flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-all
                  ${isHovered ? 'bg-bg-secondary' : 'hover:bg-bg-secondary/50'}
                `}
                onMouseEnter={() => setHoveredSegment(segment.key)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div
                  className="p-1 rounded"
                  style={{
                    backgroundColor: `${segment.color}20`,
                    color: segment.color,
                  }}
                >
                  {segment.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-text-primary">
                      {segment.label}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-1 h-1 rounded-full bg-bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: segment.color,
                        boxShadow: isHovered ? `0 0 6px ${segment.color}` : 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Token breakdown */}
      <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-border-default">
        {segments.map((segment) => (
          <div key={segment.key} className="text-center">
            <div className="text-[11px] font-bold" style={{ color: segment.color }}>
              {formatTokens(segment.value)}
            </div>
            <div className="text-[8px] text-text-muted uppercase">
              {segment.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
