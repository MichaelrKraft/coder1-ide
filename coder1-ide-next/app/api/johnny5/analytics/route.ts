/**
 * Johnny5 Analytics API
 *
 * GET /api/johnny5/analytics - Returns REAL token usage and efficiency metrics
 *
 * This endpoint provides analytics data including:
 * - Token usage over time (from actual API calls)
 * - Burn rate and trends
 * - Efficiency metrics (tasks completed, success rate, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Johnny5APIResponse,
  Johnny5Analytics,
  Johnny5AnalyticsRange,
  Johnny5TokenUsage,
  Johnny5EfficiencyMetrics
} from '@/types/johnny5';
import {
  getUsageStats,
  getDailyUsage,
  getHourlyUsage,
  getBurnRate,
  getEfficiencyMetrics,
} from '@/services/johnny5/usage-tracker';

// Force dynamic rendering - analytics data changes frequently
export const dynamic = 'force-dynamic';

/**
 * Get real token usage data from the usage tracker
 */
async function getRealTokenUsage(range: Johnny5AnalyticsRange): Promise<Johnny5TokenUsage[]> {
  const now = new Date();

  if (range === '24h') {
    // Get hourly data for 24h view with real input/output breakdown
    const hourlyData = getHourlyUsage();
    return hourlyData.map(h => ({
      date: h.hour.slice(11, 16), // Extract "HH:mm" from ISO string
      inputTokens: h.inputTokens,
      outputTokens: h.outputTokens,
      totalTokens: h.tokens,
      cost: h.cost,
    }));
  }

  // For 7d and 30d, get daily data
  const days = range === '7d' ? 7 : 30;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const dailyData = await getDailyUsage({ startDate, endDate: now });

  return dailyData.map(d => ({
    date: d.date,
    inputTokens: d.inputTokens,
    outputTokens: d.outputTokens,
    totalTokens: d.totalTokens,
    cost: d.cost,
  }));
}

/**
 * Get real efficiency metrics from the usage tracker
 */
async function getRealEfficiencyMetrics(range: Johnny5AnalyticsRange): Promise<Johnny5EfficiencyMetrics> {
  const days = range === '24h' ? 1 : range === '7d' ? 7 : 30;
  const metrics = await getEfficiencyMetrics(days);

  return {
    tokensPerSession: metrics.tokensPerSession,
    successRate: metrics.successRate,
    averageSessionDuration: Math.round(metrics.averageSessionDuration),
    tasksCompleted: metrics.messagesPerDay * days,
    prsCreated: 0, // Augmented client-side from TerminalActivityCollector
  };
}

/**
 * Get real burn rate from the usage tracker
 */
function getRealBurnRate(range: Johnny5AnalyticsRange): { burnRate: number; trend: 'up' | 'down' | 'stable' } {
  const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720;
  return getBurnRate(hours);
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || '24h') as Johnny5AnalyticsRange;

    // Validate range
    if (!['24h', '7d', '30d'].includes(range)) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Invalid range. Must be one of: 24h, 7d, 30d',
        timestamp: new Date()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get REAL usage data from usage tracker
    const tokenUsage = await getRealTokenUsage(range);
    const { rate: burnRate, trend: burnRateTrend } = getRealBurnRate(range);
    const efficiency = await getRealEfficiencyMetrics(range);

    const analytics: Johnny5Analytics = {
      range,
      tokenUsage,
      burnRate,
      burnRateTrend,
      efficiency
    };

    const response: Johnny5APIResponse<Johnny5Analytics> = {
      success: true,
      data: analytics,
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Analytics API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch analytics',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 500 });
  }
}
