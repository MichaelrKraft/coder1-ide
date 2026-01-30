'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Flame, Zap } from 'lucide-react';

interface BurnRateGaugeProps {
  burnRate: number; // tokens per hour
  trend: 'up' | 'down' | 'stable';
  className?: string;
}

/**
 * BurnRateGauge - Real-time tokens/hour indicator
 *
 * Shows current token consumption rate with:
 * - Animated circular gauge
 * - Trend indicator (up/down/stable)
 * - Color-coded intensity
 * - Live pulsing animation
 */
export default function BurnRateGauge({ burnRate, trend, className = '' }: BurnRateGaugeProps) {
  const [animatedRate, setAnimatedRate] = useState(0);

  // Animate the value on change
  useEffect(() => {
    const duration = 800;
    const startTime = Date.now();
    const startValue = animatedRate;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (burnRate - startValue) * eased;

      setAnimatedRate(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [burnRate]);

  // Determine intensity level (0-100 scale for gauge)
  // Assuming max reasonable burn rate is ~50000 tokens/hour
  const maxBurnRate = 50000;
  const percentage = Math.min((burnRate / maxBurnRate) * 100, 100);

  // Intensity color based on burn rate
  const getIntensityColor = () => {
    if (percentage < 33) return { color: 'rgb(34, 197, 94)', glow: 'rgba(34, 197, 94, 0.5)' }; // Green - low
    if (percentage < 66) return { color: 'rgb(0, 217, 255)', glow: 'rgba(0, 217, 255, 0.5)' }; // Cyan - medium
    if (percentage < 85) return { color: 'rgb(251, 146, 60)', glow: 'rgba(251, 146, 60, 0.5)' }; // Orange - high
    return { color: 'rgb(239, 68, 68)', glow: 'rgba(239, 68, 68, 0.5)' }; // Red - critical
  };

  const intensityColors = getIntensityColor();

  // Format number for display
  const formatRate = (rate: number): string => {
    if (rate >= 1000000) return `${(rate / 1000000).toFixed(1)}M`;
    if (rate >= 1000) return `${(rate / 1000).toFixed(1)}K`;
    return Math.round(rate).toString();
  };

  // Trend icon component
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-orange-400' : trend === 'down' ? 'text-green-400' : 'text-text-muted';

  // Gauge dimensions
  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`bg-bg-tertiary rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          Burn Rate
        </h4>
        <div className={`flex items-center gap-1 text-[10px] ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span>{trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable'}</span>
        </div>
      </div>

      <div className="flex items-center justify-center">
        {/* Circular Gauge */}
        <div className="relative" style={{ width: size, height: size }}>
          {/* Background circle */}
          <svg className="absolute inset-0 transform -rotate-90" width={size} height={size}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={strokeWidth}
            />
            {/* Progress arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={intensityColors.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: 'stroke-dashoffset 0.8s ease-out',
                filter: `drop-shadow(0 0 6px ${intensityColors.glow})`,
              }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="text-xl font-bold transition-colors duration-300"
              style={{ color: intensityColors.color }}
            >
              {formatRate(animatedRate)}
            </div>
            <div className="text-[9px] text-text-muted">tokens/hr</div>
          </div>

          {/* Pulsing glow effect when active */}
          {burnRate > 0 && (
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{
                background: `radial-gradient(circle, ${intensityColors.glow}, transparent)`,
                animationDuration: '2s',
              }}
            />
          )}
        </div>
      </div>

      {/* Intensity scale */}
      <div className="mt-4">
        <div className="flex justify-between text-[9px] text-text-muted mb-1">
          <span>Low</span>
          <span>High</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden bg-bg-secondary">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percentage}%`,
              background: `linear-gradient(90deg, rgb(34, 197, 94), rgb(0, 217, 255), rgb(251, 146, 60), rgb(239, 68, 68))`,
              backgroundSize: '400% 100%',
              backgroundPosition: `${100 - percentage}% 0`,
            }}
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px]">
        <div className="flex items-center gap-1 text-text-muted">
          <Zap className="w-3 h-3 text-coder1-cyan" />
          <span>{Math.round(burnRate / 60)}</span>
          <span className="opacity-60">/min</span>
        </div>
        <div className="w-px h-3 bg-border-default" />
        <div className="flex items-center gap-1 text-text-muted">
          <Zap className="w-3 h-3 text-purple-400" />
          <span>{formatRate(burnRate * 24)}</span>
          <span className="opacity-60">/day</span>
        </div>
      </div>
    </div>
  );
}
