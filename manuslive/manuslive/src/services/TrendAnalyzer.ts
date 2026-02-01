import { TrendData, TrendItem } from './TrendCollector.js';

/**
 * Alert types for trend analysis
 */
export type TrendAlertType = 'spike' | 'emerging' | 'competitor';

/**
 * Alert severity levels
 */
export type AlertLevel = 'critical' | 'important' | 'fyi';

/**
 * A trend alert detected by the analyzer
 */
export interface TrendAlert {
  type: TrendAlertType;
  source: string;
  keyword: string;
  message: string;
  level: AlertLevel;
  timestamp: number;
  data: {
    current?: number;
    average?: number;
    multiplier?: number;
    items?: TrendItem[];
    previousRank?: number;
    currentRank?: number;
    launchKeywords?: string[];
  };
}

/**
 * Configuration for trend analysis
 */
export interface TrendAnalyzerConfig {
  spikeMultiplierThreshold: number; // Default: 3x
  emergingTopN: number; // Default: 10 (top N to track for emerging)
  launchKeywords: string[]; // Keywords that indicate a product launch
}

/**
 * Default analyzer configuration
 */
const DEFAULT_ANALYZER_CONFIG: TrendAnalyzerConfig = {
  spikeMultiplierThreshold: 3,
  emergingTopN: 10,
  launchKeywords: [
    'launched',
    'launching',
    'announcing',
    'introducing',
    'released',
    'releasing',
    'now available',
    'beta',
    'v1.0',
    '1.0',
    'general availability',
    'ga',
    'public launch',
    'open source',
    'open-source',
  ],
};

/**
 * Statistics for keyword mentions over time
 */
interface KeywordStats {
  keyword: string;
  counts: number[]; // Array of counts per collection period
  average: number;
  total: number;
}

/**
 * TrendAnalyzer - Analyzes collected trends to detect patterns
 *
 * Detection types:
 * - Spike: Mention count > 3x 7-day average
 * - Emerging: New term appearing in top 10 that wasn't there before
 * - Competitor: Configured competitor mentioned with launch keywords
 */
export class TrendAnalyzer {
  private config: TrendAnalyzerConfig;

  constructor(config?: Partial<TrendAnalyzerConfig>) {
    this.config = { ...DEFAULT_ANALYZER_CONFIG, ...config };
  }

  /**
   * Analyze current trends against historical data
   */
  analyze(current: TrendData, historical: TrendData[]): TrendAlert[] {
    const alerts: TrendAlert[] = [];

    // Detect spikes
    const spikeAlerts = this.detectSpikes(current, historical);
    alerts.push(...spikeAlerts);

    // Detect emerging trends
    const emergingAlerts = this.detectEmerging(current, historical);
    alerts.push(...emergingAlerts);

    // Detect competitor launches
    const competitorAlerts = this.detectCompetitorLaunches(current);
    alerts.push(...competitorAlerts);

    return alerts;
  }

  /**
   * Get the alert level for an alert
   */
  getAlertLevel(alert: TrendAlert): AlertLevel {
    // Competitor alerts are always critical
    if (alert.type === 'competitor') {
      return 'critical';
    }

    // Spikes with high multiplier are important
    if (alert.type === 'spike') {
      const multiplier = alert.data.multiplier || 0;
      if (multiplier >= 5) return 'critical';
      if (multiplier >= 3) return 'important';
      return 'fyi';
    }

    // Emerging in top 5 is important
    if (alert.type === 'emerging') {
      const rank = alert.data.currentRank || 100;
      if (rank <= 3) return 'important';
      if (rank <= 10) return 'fyi';
      return 'fyi';
    }

    return alert.level;
  }

  // ============ SPIKE DETECTION ============

  /**
   * Detect mention spikes compared to 7-day average
   */
  private detectSpikes(current: TrendData, historical: TrendData[]): TrendAlert[] {
    const alerts: TrendAlert[] = [];

    // Build keyword stats from historical data
    const keywordStats = this.buildKeywordStats(historical);

    // Count current mentions for each keyword
    const currentCounts = this.countKeywordMentions(current);

    // Check for spikes
    for (const [keyword, currentCount] of currentCounts.entries()) {
      const stats = keywordStats.get(keyword);
      const average = stats?.average || 0;

      // If we have enough historical data and current is significantly higher
      if (average > 0 && currentCount > average * this.config.spikeMultiplierThreshold) {
        const multiplier = currentCount / average;
        const level = this.getSpikeLevel(multiplier);

        alerts.push({
          type: 'spike',
          source: 'all',
          keyword,
          message: `Spike detected: "${keyword}" mentioned ${currentCount} times (${multiplier.toFixed(1)}x the 7-day average of ${average.toFixed(1)})`,
          level,
          timestamp: Date.now(),
          data: {
            current: currentCount,
            average,
            multiplier,
            items: this.getItemsForKeyword(current, keyword),
          },
        });
      }
    }

    return alerts;
  }

  /**
   * Build statistics for each tracked keyword from historical data
   */
  private buildKeywordStats(historical: TrendData[]): Map<string, KeywordStats> {
    const stats = new Map<string, KeywordStats>();

    for (const data of historical) {
      const counts = this.countKeywordMentions(data);

      for (const [keyword, count] of counts.entries()) {
        let existing = stats.get(keyword);
        if (!existing) {
          existing = {
            keyword,
            counts: [],
            average: 0,
            total: 0,
          };
          stats.set(keyword, existing);
        }

        existing.counts.push(count);
        existing.total += count;
      }
    }

    // Calculate averages
    for (const [, stat] of stats) {
      if (stat.counts.length > 0) {
        stat.average = stat.total / stat.counts.length;
      }
    }

    return stats;
  }

  /**
   * Count mentions of each matched keyword in trend data
   */
  private countKeywordMentions(data: TrendData): Map<string, number> {
    const counts = new Map<string, number>();

    for (const match of data.keywordMatches) {
      const current = counts.get(match.keyword) || 0;
      counts.set(match.keyword, current + 1);
    }

    return counts;
  }

  /**
   * Get items that match a keyword
   */
  private getItemsForKeyword(data: TrendData, keyword: string): TrendItem[] {
    return data.keywordMatches
      .filter(m => m.keyword === keyword)
      .map(m => m.item);
  }

  /**
   * Determine spike alert level based on multiplier
   */
  private getSpikeLevel(multiplier: number): AlertLevel {
    if (multiplier >= 5) return 'critical';
    if (multiplier >= 3) return 'important';
    return 'fyi';
  }

  // ============ EMERGING TREND DETECTION ============

  /**
   * Detect new terms appearing in top rankings
   */
  private detectEmerging(current: TrendData, historical: TrendData[]): TrendAlert[] {
    const alerts: TrendAlert[] = [];

    // Get current top N by score for each source
    const currentTopHN = this.getTopN(current.sources.hackernews, this.config.emergingTopN);
    const currentTopGH = this.getTopN(current.sources.github, this.config.emergingTopN);
    const currentTopReddit = this.getTopN(current.sources.reddit, this.config.emergingTopN);

    // Build historical top N sets
    const historicalTopHN = this.buildHistoricalTopSet(historical, 'hackernews');
    const historicalTopGH = this.buildHistoricalTopSet(historical, 'github');
    const historicalTopReddit = this.buildHistoricalTopSet(historical, 'reddit');

    // Check for new entries in top N
    this.checkEmerging(currentTopHN, historicalTopHN, 'hackernews', alerts);
    this.checkEmerging(currentTopGH, historicalTopGH, 'github', alerts);
    this.checkEmerging(currentTopReddit, historicalTopReddit, 'reddit', alerts);

    return alerts;
  }

  /**
   * Get top N items by score
   */
  private getTopN(items: TrendItem[], n: number): TrendItem[] {
    return [...items].sort((a, b) => b.score - a.score).slice(0, n);
  }

  /**
   * Build a set of item IDs that were in historical top N
   */
  private buildHistoricalTopSet(
    historical: TrendData[],
    source: 'hackernews' | 'github' | 'reddit'
  ): Set<string> {
    const topSet = new Set<string>();

    for (const data of historical) {
      const items = data.sources[source];
      const topN = this.getTopN(items, this.config.emergingTopN);
      for (const item of topN) {
        topSet.add(item.id);
      }
    }

    return topSet;
  }

  /**
   * Check for emerging items in current top that weren't in historical
   */
  private checkEmerging(
    currentTop: TrendItem[],
    historicalSet: Set<string>,
    source: string,
    alerts: TrendAlert[]
  ): void {
    for (let i = 0; i < currentTop.length; i++) {
      const item = currentTop[i];
      const rank = i + 1;

      // Check if this item is new to top N
      if (!historicalSet.has(item.id)) {
        const level = rank <= 3 ? 'important' : 'fyi';

        alerts.push({
          type: 'emerging',
          source,
          keyword: this.extractKeywords(item.title).join(', '),
          message: `Emerging trend on ${source}: "${item.title}" is now #${rank} (score: ${item.score})`,
          level,
          timestamp: Date.now(),
          data: {
            currentRank: rank,
            items: [item],
          },
        });
      }
    }
  }

  /**
   * Extract significant keywords from a title
   */
  private extractKeywords(title: string): string[] {
    // Simple keyword extraction - take words > 3 chars, remove common words
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
      'has', 'have', 'this', 'that', 'with', 'from', 'they', 'will',
      'what', 'when', 'where', 'which', 'how', 'was', 'were', 'been',
      'being', 'about', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'under', 'again', 'further', 'then',
      'once', 'here', 'there', 'why', 'some', 'more', 'most', 'other',
      'only', 'same', 'than', 'too', 'very', 'just', 'now',
    ]);

    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 5);
  }

  // ============ COMPETITOR LAUNCH DETECTION ============

  /**
   * Detect competitor mentions with launch keywords
   */
  private detectCompetitorLaunches(current: TrendData): TrendAlert[] {
    const alerts: TrendAlert[] = [];

    for (const mention of current.competitorMentions) {
      const titleLower = mention.item.title.toLowerCase();
      const matchedLaunchKeywords: string[] = [];

      // Check for launch keywords
      for (const launchKeyword of this.config.launchKeywords) {
        if (titleLower.includes(launchKeyword.toLowerCase())) {
          matchedLaunchKeywords.push(launchKeyword);
        }
      }

      // If any launch keywords found, create alert
      if (matchedLaunchKeywords.length > 0) {
        alerts.push({
          type: 'competitor',
          source: mention.source,
          keyword: mention.competitor,
          message: `Competitor alert: ${mention.competitor} may have a launch - "${mention.item.title}"`,
          level: 'critical',
          timestamp: Date.now(),
          data: {
            items: [mention.item],
            launchKeywords: matchedLaunchKeywords,
          },
        });
      }
    }

    return alerts;
  }

  // ============ HELPER METHODS ============

  /**
   * Format an alert as a human-readable string
   */
  formatAlert(alert: TrendAlert): string {
    const levelEmoji = {
      critical: '🚨',
      important: '⚠️',
      fyi: 'ℹ️',
    };

    const typeLabel = {
      spike: 'Spike',
      emerging: 'Emerging',
      competitor: 'Competitor',
    };

    let message = `${levelEmoji[alert.level]} [${typeLabel[alert.type]}] ${alert.message}`;

    if (alert.data.items && alert.data.items.length > 0) {
      message += '\n  Top items:';
      for (const item of alert.data.items.slice(0, 3)) {
        message += `\n    - ${item.title.slice(0, 60)}${item.title.length > 60 ? '...' : ''} (${item.score} points)`;
      }
    }

    return message;
  }

  /**
   * Summarize a set of alerts
   */
  summarizeAlerts(alerts: TrendAlert[]): string {
    if (alerts.length === 0) {
      return 'No significant trends detected.';
    }

    const byLevel = {
      critical: alerts.filter(a => a.level === 'critical'),
      important: alerts.filter(a => a.level === 'important'),
      fyi: alerts.filter(a => a.level === 'fyi'),
    };

    const lines: string[] = [];
    lines.push(`📊 Trend Analysis Summary (${alerts.length} alerts)`);
    lines.push('');

    if (byLevel.critical.length > 0) {
      lines.push(`🚨 CRITICAL (${byLevel.critical.length}):`);
      for (const alert of byLevel.critical) {
        lines.push(`  - ${alert.message}`);
      }
      lines.push('');
    }

    if (byLevel.important.length > 0) {
      lines.push(`⚠️ IMPORTANT (${byLevel.important.length}):`);
      for (const alert of byLevel.important) {
        lines.push(`  - ${alert.message}`);
      }
      lines.push('');
    }

    if (byLevel.fyi.length > 0) {
      lines.push(`ℹ️ FYI (${byLevel.fyi.length}):`);
      for (const alert of byLevel.fyi.slice(0, 5)) {
        // Limit FYIs to 5
        lines.push(`  - ${alert.message}`);
      }
      if (byLevel.fyi.length > 5) {
        lines.push(`  ... and ${byLevel.fyi.length - 5} more`);
      }
    }

    return lines.join('\n');
  }
}
