/**
 * Usage Service
 * Aggregates and formats usage data from agents/data/cost-tracker.json
 */

import fs from 'fs/promises';
import path from 'path';

interface DailyUsage {
  [date: string]: number;
}

interface CostTrackerData {
  monthlyUsage: number;
  requestCount: number;
  lastReset: number;
  dailyUsage: DailyUsage;
}

interface TokenUsageData {
  used: number;
  limit: number;
  burnRate: number;
  dailyUsage: number;
  weeklyUsage: number;
  monthlyUsage: number;
  requestCount: number;
  lastUpdated: string;
}

interface UsageHistoryEntry {
  date: string;
  tokens: number;
  cost: number;
}

interface UsageStats {
  tokenUsage: TokenUsageData;
  history: UsageHistoryEntry[];
  predictions: {
    timeUntilLimit: string;
    dailyProjection: number;
    weeklyProjection: number;
    efficiencyScore: number;
  };
  breakdown: {
    byDay: { [day: string]: number };
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

export class UsageService {
  private costTrackerPath: string;
  
  // Token pricing (approximate - adjust based on actual Claude pricing)
  private readonly COST_PER_1K_INPUT_TOKENS = 0.008; // $0.008 per 1K tokens
  private readonly COST_PER_1K_OUTPUT_TOKENS = 0.024; // $0.024 per 1K tokens
  private readonly AVERAGE_COST_PER_1K = 0.016; // Average
  
  // Default limits
  private readonly DEFAULT_MONTHLY_TOKEN_LIMIT = 1000000; // 1M tokens
  private readonly DEFAULT_DAILY_TOKEN_LIMIT = 50000; // 50K tokens

  constructor() {
    // Path to cost tracker in agents/ directory
    this.costTrackerPath = path.join(
      process.cwd(),
      '..',
      'agents',
      'data',
      'cost-tracker.json'
    );
  }

  /**
   * Read cost tracker data
   */
  private async readCostTracker(): Promise<CostTrackerData> {
    try {
      const data = await fs.readFile(this.costTrackerPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading cost tracker:', error);
      // Return empty data if file doesn't exist
      return {
        monthlyUsage: 0,
        requestCount: 0,
        lastReset: Date.now(),
        dailyUsage: {}
      };
    }
  }

  /**
   * Convert cost to approximate tokens
   */
  private costToTokens(cost: number): number {
    return Math.round((cost / this.AVERAGE_COST_PER_1K) * 1000);
  }

  /**
   * Convert tokens to cost
   */
  private tokensToCost(tokens: number): number {
    return (tokens / 1000) * this.AVERAGE_COST_PER_1K;
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Calculate burn rate (tokens per hour)
   */
  private calculateBurnRate(dailyUsage: DailyUsage): number {
    const today = this.getTodayDate();
    const todayTokens = dailyUsage[today] 
      ? this.costToTokens(dailyUsage[today])
      : 0;
    
    // Calculate hours elapsed today
    const now = new Date();
    const hoursElapsed = now.getHours() + (now.getMinutes() / 60);
    
    if (hoursElapsed === 0) return 0;
    
    return Math.round(todayTokens / hoursElapsed);
  }

  /**
   * Calculate weekly usage
   */
  private calculateWeeklyUsage(dailyUsage: DailyUsage): number {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    let weeklyTotal = 0;
    Object.entries(dailyUsage).forEach(([date, cost]) => {
      const entryDate = new Date(date);
      if (entryDate >= weekAgo) {
        weeklyTotal += cost;
      }
    });
    
    return this.costToTokens(weeklyTotal);
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(): Promise<UsageStats> {
    const data = await this.readCostTracker();
    
    // Convert costs to tokens
    const monthlyTokens = this.costToTokens(data.monthlyUsage);
    const todayDate = this.getTodayDate();
    const todayTokens = data.dailyUsage[todayDate]
      ? this.costToTokens(data.dailyUsage[todayDate])
      : 0;
    const weeklyTokens = this.calculateWeeklyUsage(data.dailyUsage);
    const burnRate = this.calculateBurnRate(data.dailyUsage);

    // Build token usage data
    const tokenUsage: TokenUsageData = {
      used: todayTokens,
      limit: this.DEFAULT_DAILY_TOKEN_LIMIT,
      burnRate: burnRate,
      dailyUsage: todayTokens,
      weeklyUsage: weeklyTokens,
      monthlyUsage: monthlyTokens,
      requestCount: data.requestCount,
      lastUpdated: new Date().toISOString()
    };

    // Build history (last 30 days)
    const history: UsageHistoryEntry[] = Object.entries(data.dailyUsage)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(-30)
      .map(([date, cost]) => ({
        date,
        tokens: this.costToTokens(cost),
        cost
      }));

    // Calculate predictions
    const avgDailyTokens = weeklyTokens / 7;
    const remainingTokens = this.DEFAULT_MONTHLY_TOKEN_LIMIT - monthlyTokens;
    const daysUntilLimit = remainingTokens / Math.max(avgDailyTokens, 1);
    
    const predictions = {
      timeUntilLimit: daysUntilLimit > 365 
        ? 'Beyond forecast' 
        : `${Math.round(daysUntilLimit)} days`,
      dailyProjection: Math.round(avgDailyTokens),
      weeklyProjection: Math.round(weeklyTokens),
      efficiencyScore: Math.round((data.requestCount / Math.max(monthlyTokens / 1000, 1)) * 100)
    };

    // Calculate breakdown and trend
    const sortedDays = Object.entries(data.dailyUsage)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
    
    const recentDays = sortedDays.slice(-7);
    const previousDays = sortedDays.slice(-14, -7);
    
    const recentAvg = recentDays.reduce((sum, [, cost]) => sum + cost, 0) / recentDays.length;
    const previousAvg = previousDays.length > 0
      ? previousDays.reduce((sum, [, cost]) => sum + cost, 0) / previousDays.length
      : recentAvg;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAvg > previousAvg * 1.1) trend = 'increasing';
    else if (recentAvg < previousAvg * 0.9) trend = 'decreasing';

    const breakdown = {
      byDay: Object.fromEntries(
        Object.entries(data.dailyUsage).map(([date, cost]) => [
          date,
          this.costToTokens(cost)
        ])
      ),
      trend
    };

    return {
      tokenUsage,
      history,
      predictions,
      breakdown
    };
  }

  /**
   * Get formatted stats for dashboard
   */
  async getDashboardStats() {
    try {
      const stats = await this.getUsageStats();
      
      return {
        success: true,
        data: {
          tokenUsage: stats.tokenUsage,
          history: stats.history,
          predictions: stats.predictions,
          breakdown: stats.breakdown
        },
        source: 'real-data',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'error',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const usageService = new UsageService();
