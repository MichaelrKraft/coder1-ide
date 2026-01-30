'use client';

import React, { useEffect, useState } from 'react';
import {
  Zap,
  CheckCircle,
  Clock,
  Target,
  GitPullRequest,
  TrendingUp,
} from 'lucide-react';
import { Johnny5EfficiencyMetrics as EfficiencyMetricsType } from '@/types/johnny5';

interface EfficiencyMetricsProps {
  metrics: EfficiencyMetricsType;
  className?: string;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  format?: 'number' | 'percentage' | 'duration';
  trend?: 'up' | 'down' | 'stable';
}

/**
 * AnimatedCounter - Smoothly animates numeric values
 */
function AnimatedCounter({
  value,
  format,
  suffix = '',
}: {
  value: number;
  format: 'number' | 'percentage' | 'duration';
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    const startValue = displayValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValue + (value - startValue) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const formatValue = () => {
    switch (format) {
      case 'percentage':
        return `${Math.round(displayValue)}%`;
      case 'duration':
        const mins = Math.round(displayValue);
        if (mins >= 60) {
          const hours = Math.floor(mins / 60);
          const remainingMins = mins % 60;
          return `${hours}h ${remainingMins}m`;
        }
        return `${mins}m`;
      default:
        if (displayValue >= 1000000) return `${(displayValue / 1000000).toFixed(1)}M`;
        if (displayValue >= 1000) return `${(displayValue / 1000).toFixed(1)}K`;
        return Math.round(displayValue).toLocaleString();
    }
  };

  return (
    <span>
      {formatValue()}
      {suffix}
    </span>
  );
}

/**
 * MetricCard - Individual metric display card
 */
function MetricCard({ icon, label, value, suffix, color, format = 'number', trend }: MetricCardProps) {
  return (
    <div className="bg-bg-secondary rounded-lg p-3 relative overflow-hidden group
      hover:bg-bg-secondary/80 transition-all duration-300">
      {/* Subtle glow effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${color}10, transparent)`,
        }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded-md"
            style={{ backgroundColor: `${color}20` }}
          >
            <span style={{ color }}>{icon}</span>
          </div>
        </div>
        {trend && (
          <TrendingUp
            className={`w-3 h-3 ${
              trend === 'up' ? 'text-green-400' :
              trend === 'down' ? 'text-red-400 rotate-180' :
              'text-text-muted'
            }`}
          />
        )}
      </div>

      <div className="mt-2 relative z-10">
        <div className="text-lg font-bold text-text-primary" style={{ color }}>
          <AnimatedCounter value={value} format={format} suffix={suffix} />
        </div>
        <div className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">
          {label}
        </div>
      </div>

      {/* Progress indicator for percentage values */}
      {format === 'percentage' && (
        <div className="mt-2 h-1 rounded-full bg-bg-tertiary overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.min(value, 100)}%`,
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}80`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * EfficiencyMetrics - Score cards grid for efficiency stats
 *
 * Displays key metrics:
 * - Tokens per session
 * - Success rate
 * - Average session duration
 * - Tasks completed
 * - PRs created
 */
export default function EfficiencyMetrics({ metrics, className = '' }: EfficiencyMetricsProps) {
  const metricCards: MetricCardProps[] = [
    {
      icon: <Zap className="w-3.5 h-3.5" />,
      label: 'Tokens/Session',
      value: metrics.tokensPerSession,
      color: 'rgb(0, 217, 255)', // Cyan
      format: 'number',
    },
    {
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      label: 'Success Rate',
      value: metrics.successRate,
      color: 'rgb(34, 197, 94)', // Green
      format: 'percentage',
    },
    {
      icon: <Clock className="w-3.5 h-3.5" />,
      label: 'Avg Duration',
      value: metrics.averageSessionDuration,
      color: 'rgb(139, 92, 246)', // Purple
      format: 'duration',
    },
    {
      icon: <Target className="w-3.5 h-3.5" />,
      label: 'Tasks Done',
      value: metrics.tasksCompleted,
      color: 'rgb(251, 146, 60)', // Orange
      format: 'number',
    },
    {
      icon: <GitPullRequest className="w-3.5 h-3.5" />,
      label: 'PRs Created',
      value: metrics.prsCreated,
      color: 'rgb(236, 72, 153)', // Pink
      format: 'number',
    },
  ];

  return (
    <div className={`bg-bg-tertiary rounded-lg p-4 ${className}`}>
      <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-green-400" />
        Efficiency Metrics
      </h4>

      <div className="grid grid-cols-2 gap-2">
        {metricCards.slice(0, 4).map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* PRs Created - Full width at bottom */}
      <div className="mt-2">
        <MetricCard {...metricCards[4]} />
      </div>

      {/* Summary stat */}
      <div className="mt-3 pt-3 border-t border-border-default">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-text-muted">Efficiency Score</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-coder1-cyan to-purple-500"
                style={{
                  width: `${Math.round((metrics.successRate * 0.6) + (Math.min(metrics.tasksCompleted / 10, 40)))}%`,
                }}
              />
            </div>
            <span className="text-coder1-cyan font-semibold">
              {Math.round((metrics.successRate * 0.6) + (Math.min(metrics.tasksCompleted / 10, 40)))}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
