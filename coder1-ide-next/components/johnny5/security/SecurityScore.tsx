'use client';

import React from 'react';
import { Shield, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SecurityScoreProps {
  score: number;
  previousScore?: number;
  className?: string;
}

/**
 * SecurityScore Component
 *
 * Displays a circular gauge showing the security score (0-100).
 * Color-coded based on score:
 * - 0-50: Red (critical)
 * - 51-75: Yellow (warning)
 * - 76-100: Green (good)
 */
export default function SecurityScore({ score, previousScore, className }: SecurityScoreProps) {
  // Clamp score between 0 and 100
  const clampedScore = Math.min(100, Math.max(0, score));

  // Calculate color based on score
  const getScoreColor = (value: number): string => {
    if (value <= 50) return '#ef4444'; // red-500
    if (value <= 75) return '#eab308'; // yellow-500
    return '#22c55e'; // green-500
  };

  const getScoreGlowColor = (value: number): string => {
    if (value <= 50) return 'rgba(239, 68, 68, 0.5)';
    if (value <= 75) return 'rgba(234, 179, 8, 0.5)';
    return 'rgba(34, 197, 94, 0.5)';
  };

  const getScoreStatus = (value: number): string => {
    if (value <= 50) return 'Critical';
    if (value <= 75) return 'Warning';
    return 'Secure';
  };

  const getScoreDescription = (value: number): string => {
    if (value <= 50) return 'Immediate attention required';
    if (value <= 75) return 'Some concerns detected';
    return 'All systems nominal';
  };

  const scoreColor = getScoreColor(clampedScore);
  const glowColor = getScoreGlowColor(clampedScore);
  const status = getScoreStatus(clampedScore);
  const description = getScoreDescription(clampedScore);

  // Calculate trend if previous score is available
  const trend = previousScore !== undefined ? clampedScore - previousScore : 0;

  // SVG circle parameters
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className={`bg-bg-tertiary rounded-xl p-5 ${className || ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-coder1-cyan" />
          <h3 className="text-sm font-semibold text-text-primary">Security Score</h3>
        </div>

        {/* Trend indicator */}
        {previousScore !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {trend > 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>{trend > 0 ? '+' : ''}{trend}</span>
          </div>
        )}
        {previousScore !== undefined && trend === 0 && (
          <div className="flex items-center gap-1 text-xs font-medium text-text-muted">
            <Minus className="w-3.5 h-3.5" />
            <span>No change</span>
          </div>
        )}
      </div>

      {/* Circular gauge */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg
            width={size}
            height={size}
            className="transform -rotate-90"
            style={{
              filter: `drop-shadow(0 0 12px ${glowColor})`,
            }}
          >
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={strokeWidth}
            />

            {/* Progress circle with gradient */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={scoreColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />

            {/* Tick marks */}
            {[0, 25, 50, 75, 100].map((tick) => {
              const angle = (tick / 100) * 360 - 90;
              const tickRadius = radius + strokeWidth / 2 + 4;
              const x1 = size / 2 + tickRadius * Math.cos((angle * Math.PI) / 180);
              const y1 = size / 2 + tickRadius * Math.sin((angle * Math.PI) / 180);
              const x2 = size / 2 + (tickRadius + 6) * Math.cos((angle * Math.PI) / 180);
              const y2 = size / 2 + (tickRadius + 6) * Math.sin((angle * Math.PI) / 180);
              return (
                <line
                  key={tick}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Score display in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-4xl font-bold transition-colors duration-500"
              style={{ color: scoreColor }}
            >
              {clampedScore}
            </span>
            <span className="text-xs text-text-muted mt-0.5">/ 100</span>
          </div>
        </div>

        {/* Status text */}
        <div className="text-center mt-4">
          <div
            className="text-sm font-semibold transition-colors duration-500"
            style={{ color: scoreColor }}
          >
            {status}
          </div>
          <p className="text-xs text-text-muted mt-1">{description}</p>
        </div>
      </div>

      {/* Score breakdown legend */}
      <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-border-default">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[10px] text-text-muted">76-100</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-[10px] text-text-muted">51-75</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] text-text-muted">0-50</span>
        </div>
      </div>
    </div>
  );
}
