/**
 * Johnny5 Usage Tracker Service
 *
 * Tracks and persists token usage data for real analytics.
 *
 * Now uses SQLite database instead of file-based storage.
 */

import {
  initializeDb,
  trackUsage as dbTrackUsage,
  getUsageStats as dbGetUsageStats,
  getTodayUsage as dbGetTodayUsage,
} from '@/lib/johnny5-db';
import { getSessionSummaries } from './session-tracker';

// Types
export interface UsageRecord {
  id: string;
  timestamp: Date;
  sessionId: string;
  source: 'moltbot' | 'direct' | 'mock' | 'fallback';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  model?: string;
}

export interface UsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  messageCount: number;
  bySource: {
    moltbot: number;
    direct: number;
    mock: number;
    fallback: number;
  };
}

export interface DailyUsage {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  messageCount: number;
}

// Cost per token (approximate - adjust based on actual pricing)
const COST_PER_INPUT_TOKEN = 0.000003;  // $3 per 1M tokens
const COST_PER_OUTPUT_TOKEN = 0.000015; // $15 per 1M tokens

// In-memory cache for detailed records (DB only stores daily aggregates)
let usageCache: UsageRecord[] = [];

/**
 * Generate unique ID
 */
function generateId(): string {
  return `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate cost from tokens
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * COST_PER_INPUT_TOKEN) + (outputTokens * COST_PER_OUTPUT_TOKEN);
}

/**
 * Track a new usage record
 */
export async function trackUsage(params: {
  sessionId: string;
  source: 'moltbot' | 'direct' | 'mock' | 'fallback';
  inputTokens: number;
  outputTokens: number;
  model?: string;
}): Promise<UsageRecord> {
  await initializeDb();

  const record: UsageRecord = {
    id: generateId(),
    timestamp: new Date(),
    sessionId: params.sessionId,
    source: params.source,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    totalTokens: params.inputTokens + params.outputTokens,
    cost: calculateCost(params.inputTokens, params.outputTokens),
    model: params.model,
  };

  // Add to in-memory cache for detailed queries
  usageCache.push(record);
  // Keep cache bounded
  if (usageCache.length > 10000) {
    usageCache = usageCache.slice(-5000);
  }

  // Track in DB (aggregated by day)
  await dbTrackUsage(params.inputTokens, params.outputTokens);

  console.log('[UsageTracker] Recorded usage:', {
    source: record.source,
    tokens: record.totalTokens,
    cost: `$${record.cost.toFixed(4)}`,
  });

  return record;
}

/**
 * Get usage records for a time range (from in-memory cache)
 */
export function getUsageRecords(params: {
  startDate?: Date;
  endDate?: Date;
  sessionId?: string;
  source?: string;
  limit?: number;
}): UsageRecord[] {
  let filtered = [...usageCache];

  if (params.startDate) {
    filtered = filtered.filter(r => r.timestamp >= params.startDate!);
  }

  if (params.endDate) {
    filtered = filtered.filter(r => r.timestamp <= params.endDate!);
  }

  if (params.sessionId) {
    filtered = filtered.filter(r => r.sessionId === params.sessionId);
  }

  if (params.source) {
    filtered = filtered.filter(r => r.source === params.source);
  }

  // Sort by timestamp descending
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (params.limit) {
    filtered = filtered.slice(0, params.limit);
  }

  return filtered;
}

/**
 * Get aggregated usage stats for a time range
 */
export async function getUsageStats(params: {
  startDate?: Date;
  endDate?: Date;
}): Promise<UsageStats> {
  await initializeDb();

  // Get from DB for broader time ranges
  const days = params.startDate && params.endDate
    ? Math.ceil((params.endDate.getTime() - params.startDate.getTime()) / (24 * 60 * 60 * 1000))
    : 30;

  const dbStats = await dbGetUsageStats(days);

  // Aggregate DB stats
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalSessions = 0;

  for (const stat of dbStats) {
    totalInputTokens += stat.tokens_input;
    totalOutputTokens += stat.tokens_output;
    totalSessions += stat.sessions_count;
  }

  // Get source breakdown from in-memory cache
  const records = getUsageRecords(params);
  const bySource = {
    moltbot: 0,
    direct: 0,
    mock: 0,
    fallback: 0,
  };

  for (const record of records) {
    bySource[record.source] += record.totalTokens;
  }

  return {
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalCost: calculateCost(totalInputTokens, totalOutputTokens),
    messageCount: records.length || totalSessions,
    bySource,
  };
}

/**
 * Get daily usage breakdown for a time range
 */
export async function getDailyUsage(params: {
  startDate: Date;
  endDate: Date;
}): Promise<DailyUsage[]> {
  await initializeDb();

  const days = Math.ceil((params.endDate.getTime() - params.startDate.getTime()) / (24 * 60 * 60 * 1000));
  const dbStats = await dbGetUsageStats(days);

  // Convert DB stats to DailyUsage format
  const byDate = new Map<string, DailyUsage>();

  for (const stat of dbStats) {
    byDate.set(stat.date, {
      date: stat.date,
      inputTokens: stat.tokens_input,
      outputTokens: stat.tokens_output,
      totalTokens: stat.tokens_input + stat.tokens_output,
      cost: calculateCost(stat.tokens_input, stat.tokens_output),
      messageCount: stat.sessions_count,
    });
  }

  // Fill in missing days with zeros
  const result: DailyUsage[] = [];
  const current = new Date(params.startDate);
  const end = new Date(params.endDate);

  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0];

    if (byDate.has(dateKey)) {
      result.push(byDate.get(dateKey)!);
    } else {
      result.push({
        date: dateKey,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        messageCount: 0,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Get hourly usage for last 24 hours (from in-memory cache)
 */
export function getHourlyUsage(): { hour: string; tokens: number; inputTokens: number; outputTokens: number; cost: number }[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const records = getUsageRecords({
    startDate: yesterday,
    endDate: now,
  });

  // Group by hour
  const byHour = new Map<string, { tokens: number; inputTokens: number; outputTokens: number; cost: number }>();

  for (const record of records) {
    const hourKey = record.timestamp.toISOString().slice(0, 13); // "2025-01-29T14"

    if (!byHour.has(hourKey)) {
      byHour.set(hourKey, { tokens: 0, inputTokens: 0, outputTokens: 0, cost: 0 });
    }

    const hour = byHour.get(hourKey)!;
    hour.tokens += record.totalTokens;
    hour.inputTokens += record.inputTokens;
    hour.outputTokens += record.outputTokens;
    hour.cost += record.cost;
  }

  // Fill in all 24 hours
  const result: { hour: string; tokens: number; inputTokens: number; outputTokens: number; cost: number }[] = [];
  const current = new Date(yesterday);

  while (current <= now) {
    const hourKey = current.toISOString().slice(0, 13);

    if (byHour.has(hourKey)) {
      result.push({ hour: hourKey, ...byHour.get(hourKey)! });
    } else {
      result.push({ hour: hourKey, tokens: 0, inputTokens: 0, outputTokens: 0, cost: 0 });
    }

    current.setHours(current.getHours() + 1);
  }

  return result;
}

/**
 * Calculate burn rate (tokens per hour)
 */
export function getBurnRate(hours: number = 24): {
  rate: number;
  trend: 'up' | 'down' | 'stable';
} {
  const now = new Date();
  const startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const midDate = new Date(now.getTime() - (hours / 2) * 60 * 60 * 1000);

  const recentRecords = getUsageRecords({
    startDate: midDate,
    endDate: now,
  });

  const olderRecords = getUsageRecords({
    startDate: startDate,
    endDate: midDate,
  });

  const recentTotal = recentRecords.reduce((sum, r) => sum + r.totalTokens, 0);
  const olderTotal = olderRecords.reduce((sum, r) => sum + r.totalTokens, 0);

  const rate = Math.round(recentTotal / (hours / 2));

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (recentTotal > olderTotal * 1.1) {
    trend = 'up';
  } else if (recentTotal < olderTotal * 0.9) {
    trend = 'down';
  }

  return { rate, trend };
}

/**
 * Get efficiency metrics
 */
export async function getEfficiencyMetrics(days: number = 7): Promise<{
  tokensPerSession: number;
  averageSessionDuration: number;
  successRate: number;
  messagesPerDay: number;
}> {
  await initializeDb();

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const records = getUsageRecords({ startDate, endDate: now });

  // Count unique sessions
  const sessions = new Set(records.map(r => r.sessionId));
  const sessionCount = sessions.size || 1;

  // Calculate metrics
  const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
  const tokensPerSession = Math.round(totalTokens / sessionCount);

  // Success rate (non-mock, non-fallback)
  const successfulMessages = records.filter(r =>
    r.source === 'moltbot' || r.source === 'direct'
  ).length;
  const successRate = records.length > 0
    ? Math.round((successfulMessages / records.length) * 100)
    : 100;

  // Messages per day
  const messagesPerDay = Math.round(records.length / days);

  // Average session duration from real session data
  let avgDuration = 0;
  try {
    const sessions = await getSessionSummaries({ status: 'completed', limit: 200 });
    const inRange = sessions.filter((s) => s.startTime >= startDate);
    if (inRange.length > 0) {
      const totalDuration = inRange.reduce((sum, s) => sum + (s.duration ?? 0), 0);
      avgDuration = Math.round(totalDuration / inRange.length);
    }
  } catch (err) {
    console.warn('[UsageTracker] Failed to get session durations:', err);
  }

  return {
    tokensPerSession,
    averageSessionDuration: avgDuration,
    successRate,
    messagesPerDay,
  };
}

/**
 * Get today's usage summary
 */
export async function getTodayUsageSummary(): Promise<{
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  sessionsCount: number;
  tasksCount: number;
}> {
  await initializeDb();

  const todayStats = await dbGetTodayUsage();

  return {
    inputTokens: todayStats.tokens_input,
    outputTokens: todayStats.tokens_output,
    totalTokens: todayStats.tokens_input + todayStats.tokens_output,
    cost: calculateCost(todayStats.tokens_input, todayStats.tokens_output),
    sessionsCount: todayStats.sessions_count,
    tasksCount: todayStats.tasks_count,
  };
}

/**
 * Clear all usage data (for testing)
 */
export function clearUsageData(): void {
  usageCache = [];
  console.log('[UsageTracker] Cache cleared');
}

// Export singleton-style functions
export const UsageTracker = {
  trackUsage,
  getUsageRecords,
  getUsageStats,
  getDailyUsage,
  getHourlyUsage,
  getBurnRate,
  getEfficiencyMetrics,
  getTodayUsageSummary,
  clearUsageData,
};

export default UsageTracker;
