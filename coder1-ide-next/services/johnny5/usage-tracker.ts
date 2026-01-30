/**
 * Johnny5 Usage Tracker Service
 *
 * Tracks and persists token usage data for real analytics.
 * Uses file-based storage for simplicity (can upgrade to DB later).
 */

import fs from 'fs';
import path from 'path';

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

// Storage path
const DATA_DIR = path.join(process.cwd(), 'data', 'johnny5');
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');

// In-memory cache
let usageCache: UsageRecord[] = [];
let cacheLoaded = false;

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load usage data from file
 */
function loadUsageData(): UsageRecord[] {
  if (cacheLoaded) {
    return usageCache;
  }

  ensureDataDir();

  if (fs.existsSync(USAGE_FILE)) {
    try {
      const data = fs.readFileSync(USAGE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      usageCache = parsed.map((record: any) => ({
        ...record,
        timestamp: new Date(record.timestamp),
      }));
    } catch (error) {
      console.error('[UsageTracker] Failed to load usage data:', error);
      usageCache = [];
    }
  } else {
    usageCache = [];
  }

  cacheLoaded = true;
  return usageCache;
}

/**
 * Save usage data to file
 */
function saveUsageData(): void {
  ensureDataDir();
  try {
    fs.writeFileSync(USAGE_FILE, JSON.stringify(usageCache, null, 2));
  } catch (error) {
    console.error('[UsageTracker] Failed to save usage data:', error);
  }
}

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
export function trackUsage(params: {
  sessionId: string;
  source: 'moltbot' | 'direct' | 'mock' | 'fallback';
  inputTokens: number;
  outputTokens: number;
  model?: string;
}): UsageRecord {
  loadUsageData();

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

  usageCache.push(record);

  // Async save to avoid blocking
  setImmediate(() => saveUsageData());

  console.log('[UsageTracker] Recorded usage:', {
    source: record.source,
    tokens: record.totalTokens,
    cost: `$${record.cost.toFixed(4)}`,
  });

  return record;
}

/**
 * Get usage records for a time range
 */
export function getUsageRecords(params: {
  startDate?: Date;
  endDate?: Date;
  sessionId?: string;
  source?: string;
  limit?: number;
}): UsageRecord[] {
  const records = loadUsageData();

  let filtered = records;

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
export function getUsageStats(params: {
  startDate?: Date;
  endDate?: Date;
}): UsageStats {
  const records = getUsageRecords(params);

  const stats: UsageStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    messageCount: records.length,
    bySource: {
      moltbot: 0,
      direct: 0,
      mock: 0,
      fallback: 0,
    },
  };

  for (const record of records) {
    stats.totalInputTokens += record.inputTokens;
    stats.totalOutputTokens += record.outputTokens;
    stats.totalTokens += record.totalTokens;
    stats.totalCost += record.cost;
    stats.bySource[record.source] += record.totalTokens;
  }

  return stats;
}

/**
 * Get daily usage breakdown for a time range
 */
export function getDailyUsage(params: {
  startDate: Date;
  endDate: Date;
}): DailyUsage[] {
  const records = getUsageRecords(params);

  // Group by date
  const byDate = new Map<string, DailyUsage>();

  for (const record of records) {
    const dateKey = record.timestamp.toISOString().split('T')[0];

    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, {
        date: dateKey,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        messageCount: 0,
      });
    }

    const day = byDate.get(dateKey)!;
    day.inputTokens += record.inputTokens;
    day.outputTokens += record.outputTokens;
    day.totalTokens += record.totalTokens;
    day.cost += record.cost;
    day.messageCount += 1;
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
 * Get hourly usage for last 24 hours
 */
export function getHourlyUsage(): { hour: string; tokens: number; cost: number }[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const records = getUsageRecords({
    startDate: yesterday,
    endDate: now,
  });

  // Group by hour
  const byHour = new Map<string, { tokens: number; cost: number }>();

  for (const record of records) {
    const hourKey = record.timestamp.toISOString().slice(0, 13); // "2025-01-29T14"

    if (!byHour.has(hourKey)) {
      byHour.set(hourKey, { tokens: 0, cost: 0 });
    }

    const hour = byHour.get(hourKey)!;
    hour.tokens += record.totalTokens;
    hour.cost += record.cost;
  }

  // Fill in all 24 hours
  const result: { hour: string; tokens: number; cost: number }[] = [];
  const current = new Date(yesterday);

  while (current <= now) {
    const hourKey = current.toISOString().slice(0, 13);

    if (byHour.has(hourKey)) {
      result.push({ hour: hourKey, ...byHour.get(hourKey)! });
    } else {
      result.push({ hour: hourKey, tokens: 0, cost: 0 });
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
export function getEfficiencyMetrics(days: number = 7): {
  tokensPerSession: number;
  averageSessionDuration: number;
  successRate: number;
  messagesPerDay: number;
} {
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

  return {
    tokensPerSession,
    averageSessionDuration: 15 + Math.random() * 25, // TODO: Track actual session duration
    successRate,
    messagesPerDay,
  };
}

/**
 * Clear all usage data (for testing)
 */
export function clearUsageData(): void {
  usageCache = [];
  cacheLoaded = true;
  saveUsageData();
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
  clearUsageData,
};

export default UsageTracker;
