'use client';

import React, { useEffect } from 'react';
import { BarChart3, RefreshCw, Calendar, Loader2 } from 'lucide-react';
import { useJohnny5Store } from '@/stores/useJohnny5Store';
import { Johnny5AnalyticsRange } from '@/types/johnny5';
import TokenUsageChart from './TokenUsageChart';
import BurnRateGauge from './BurnRateGauge';
import EfficiencyMetrics from './EfficiencyMetrics';

interface AnalyticsTabProps {
  className?: string;
}

/**
 * AnalyticsTab - Main analytics view for Johnny5
 *
 * Features:
 * - Time range selector (24h, 7d, 30d)
 * - Token usage chart
 * - Real-time burn rate gauge
 * - Efficiency metrics cards
 */
export default function AnalyticsTab({ className = '' }: AnalyticsTabProps) {
  const {
    analytics,
    analyticsRange,
    analyticsLoading,
    setAnalyticsRange,
    setAnalytics,
    setAnalyticsLoading,
  } = useJohnny5Store();

  // Load mock data on mount or range change
  useEffect(() => {
    loadAnalytics(analyticsRange);
  }, [analyticsRange]);

  const loadAnalytics = async (range: Johnny5AnalyticsRange) => {
    setAnalyticsLoading(true);

    try {
      // Fetch REAL analytics data from API
      const response = await fetch(`/api/johnny5/analytics?range=${range}`);
      const result = await response.json();

      if (result.success && result.data) {
        setAnalytics(result.data);
      } else {
        console.error('[AnalyticsTab] API error:', result.error);
        // Set empty state on error
        setAnalytics({
          range,
          tokenUsage: [],
          burnRate: 0,
          burnRateTrend: 'stable',
          efficiency: {
            tokensPerSession: 0,
            successRate: 0,
            averageSessionDuration: 0,
            tasksCompleted: 0,
            prsCreated: 0,
          },
        });
      }
    } catch (error) {
      console.error('[AnalyticsTab] Failed to load analytics:', error);
      // Set empty state on error
      setAnalytics({
        range,
        tokenUsage: [],
        burnRate: 0,
        burnRateTrend: 'stable',
        efficiency: {
          tokensPerSession: 0,
          successRate: 0,
          averageSessionDuration: 0,
          tasksCompleted: 0,
          prsCreated: 0,
        },
      });
    }

    setAnalyticsLoading(false);
  };

  const handleRefresh = () => {
    loadAnalytics(analyticsRange);
  };

  const timeRanges: { value: Johnny5AnalyticsRange; label: string }[] = [
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
  ];

  // Calculate total stats
  const totalTokens = analytics?.tokenUsage.reduce((sum, d) => sum + d.totalTokens, 0) ?? 0;
  const totalCost = analytics?.tokenUsage.reduce((sum, d) => sum + (d.cost ?? 0), 0) ?? 0;

  return (
    <div className={`p-4 space-y-4 ${className}`}>
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-coder1-cyan" />
          <h3 className="text-sm font-semibold text-text-primary">Analytics</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Toggle */}
          <div className="flex bg-bg-tertiary rounded-lg p-0.5">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setAnalyticsRange(range.value)}
                className={`
                  px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all
                  ${analyticsRange === range.value
                    ? 'bg-coder1-cyan/20 text-coder1-cyan'
                    : 'text-text-muted hover:text-text-secondary'
                  }
                `}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={analyticsLoading}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary
              hover:bg-bg-tertiary transition-all disabled:opacity-50"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {analyticsLoading && !analytics && (
        <div className="flex flex-col items-center justify-center py-12 text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-coder1-cyan mb-3" />
          <p className="text-sm">Loading analytics...</p>
        </div>
      )}

      {/* Analytics Content */}
      {analytics && (
        <>
          {/* Summary Stats Bar */}
          <div className="flex items-center justify-between bg-bg-tertiary rounded-lg p-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-[10px] text-text-muted">
                {analyticsRange === '24h' ? 'Last 24 Hours' :
                 analyticsRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs font-bold text-text-primary">
                  {totalTokens >= 1000000 ? `${(totalTokens / 1000000).toFixed(1)}M` :
                   totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(0)}K` :
                   totalTokens}
                </div>
                <div className="text-[9px] text-text-muted">Total Tokens</div>
              </div>
              <div className="w-px h-6 bg-border-default" />
              <div className="text-right">
                <div className="text-xs font-bold text-green-400">
                  ${totalCost.toFixed(2)}
                </div>
                <div className="text-[9px] text-text-muted">Est. Cost</div>
              </div>
            </div>
          </div>

          {/* Token Usage Chart */}
          <TokenUsageChart
            data={analytics.tokenUsage}
            className={analyticsLoading ? 'opacity-50' : ''}
          />

          {/* Burn Rate Gauge */}
          <BurnRateGauge
            burnRate={analytics.burnRate}
            trend={analytics.burnRateTrend}
            className={analyticsLoading ? 'opacity-50' : ''}
          />

          {/* Efficiency Metrics */}
          <EfficiencyMetrics
            metrics={analytics.efficiency}
            className={analyticsLoading ? 'opacity-50' : ''}
          />
        </>
      )}

      {/* Empty State */}
      {!analyticsLoading && !analytics && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="w-12 h-12 text-text-muted opacity-50 mb-3" />
          <h4 className="text-sm font-semibold text-text-secondary mb-1">
            No Analytics Data
          </h4>
          <p className="text-xs text-text-muted max-w-xs">
            Start using Johnny5 to collect usage data and see your analytics here.
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-coder1-cyan/20 text-coder1-cyan text-xs font-semibold
              rounded-lg hover:bg-coder1-cyan/30 transition-all"
          >
            Load Sample Data
          </button>
        </div>
      )}
    </div>
  );
}
