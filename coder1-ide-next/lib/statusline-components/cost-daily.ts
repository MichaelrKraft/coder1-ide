/**
 * Daily Cost Component
 * 
 * Tracks daily Claude API usage costs with reset logic
 * Based on claude-code-statusline cost_daily.sh
 */

'use client';

// Mock logger for client-side usage
const logger = {
  debug: (...args: any[]) => console.debug('[CostDaily]', ...args),
  info: (...args: any[]) => console.info('[CostDaily]', ...args),
  warn: (...args: any[]) => console.warn('[CostDaily]', ...args),
  error: (...args: any[]) => console.error('[CostDaily]', ...args),
};

export interface DailyCostData {
  amount: number;
  currency: string;
  date: string;
  resetTime: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    requestCount: number;
  };
  breakdown: {
    [model: string]: {
      cost: number;
      tokens: number;
      requests: number;
    };
  };
}

export interface CostEntry {
  timestamp: number;
  amount: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  requestId?: string;
}

// Model pricing (per 1K tokens) - updated for current Claude models
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4.1': { input: 0.015, output: 0.075 },    // Premium
  'claude-sonnet-4': { input: 0.003, output: 0.015 },     // Balanced
  'claude-sonnet-3.7': { input: 0.003, output: 0.015 },   // Hybrid
  'claude-3.5-haiku': { input: 0.00025, output: 0.00125 }, // Fast
  'claude-3.5-sonnet': { input: 0.003, output: 0.015 },   // Legacy balanced
  // Fallback pricing
  'default': { input: 0.003, output: 0.015 }
};

export class DailyCostComponent {
  private storageKey = 'claude-daily-costs';
  private entries: CostEntry[] = [];
  private currentDate: string = '';
  private cachedData: DailyCostData | null = null;
  private cacheExpiry = 0;
  private subscribers: Set<(data: DailyCostData) => void> = new Set();

  constructor() {
    this.loadEntries();
    this.currentDate = this.getTodayDateString();
    logger.debug('[DailyCost] Component initialized for date:', this.currentDate);
  }

  /**
   * Add a new cost entry
   */
  public addCostEntry(
    model: string,
    inputTokens: number,
    outputTokens: number,
    requestId?: string
  ): void {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING.default;
    const amount = (inputTokens / 1000 * pricing.input) + (outputTokens / 1000 * pricing.output);
    
    const entry: CostEntry = {
      timestamp: Date.now(),
      amount,
      model,
      inputTokens,
      outputTokens,
      requestId
    };

    // Check if we need to reset for a new day
    const today = this.getTodayDateString();
    if (today !== this.currentDate) {
      this.resetForNewDay(today);
    }

    this.entries.push(entry);
    this.saveEntries();
    this.clearCache();
    
    logger.debug('[DailyCost] Added entry:', entry);
    
    // Notify subscribers
    this.notifySubscribers();
  }

  /**
   * Get current daily cost data
   */
  public getDailyCostData(): DailyCostData {
    const now = Date.now();
    
    // Return cached data if still valid (cache for 30 seconds)
    if (this.cachedData && now < this.cacheExpiry) {
      return this.cachedData;
    }

    const today = this.getTodayDateString();
    
    // Reset if date changed
    if (today !== this.currentDate) {
      this.resetForNewDay(today);
    }

    // Calculate totals
    let totalAmount = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalRequests = 0;
    const breakdown: DailyCostData['breakdown'] = {};

    this.entries.forEach(entry => {
      totalAmount += entry.amount;
      totalInputTokens += entry.inputTokens;
      totalOutputTokens += entry.outputTokens;
      totalRequests++;

      // Add to model breakdown
      if (!breakdown[entry.model]) {
        breakdown[entry.model] = { cost: 0, tokens: 0, requests: 0 };
      }
      breakdown[entry.model].cost += entry.amount;
      breakdown[entry.model].tokens += entry.inputTokens + entry.outputTokens;
      breakdown[entry.model].requests++;
    });

    // Calculate next reset time (midnight)
    const resetTime = this.getNextResetTime();

    this.cachedData = {
      amount: Math.round(totalAmount * 10000) / 10000, // Round to 4 decimal places
      currency: 'USD',
      date: today,
      resetTime,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        requestCount: totalRequests
      },
      breakdown
    };

    this.cacheExpiry = now + 30000; // Cache for 30 seconds

    return this.cachedData;
  }

  /**
   * Format cost for display
   */
  public formatDisplay(template: string = '${amount}', data?: DailyCostData): string {
    const costData = data || this.getDailyCostData();
    
    const formattedAmount = costData.amount < 0.01 && costData.amount > 0 
      ? '<$0.01' 
      : `$${costData.amount.toFixed(2)}`;

    return template
      .replace('{amount}', formattedAmount)
      .replace('{daily}', formattedAmount)
      .replace('{currency}', costData.currency)
      .replace('{date}', costData.date)
      .replace('{tokens}', costData.usage.totalTokens.toLocaleString())
      .replace('{requests}', costData.usage.requestCount.toString())
      .replace('{reset}', costData.resetTime);
  }

  /**
   * Subscribe to cost updates
   */
  public subscribe(callback: (data: DailyCostData) => void): () => void {
    this.subscribers.add(callback);
    
    // Send current data immediately
    try {
      callback(this.getDailyCostData());
    } catch (error) {
      logger.error('[DailyCost] Immediate callback error:', error);
    }
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get cost history for analysis
   */
  public getCostHistory(days: number = 7): Array<{ date: string; amount: number }> {
    try {
      const history = localStorage.getItem('claude-cost-history');
      if (!history) return [];
      
      const parsed = JSON.parse(history);
      return parsed.slice(-days);
    } catch (error) {
      logger.error('[DailyCost] Failed to load cost history:', error);
      return [];
    }
  }

  /**
   * Get detailed breakdown by model
   */
  public getModelBreakdown(): DailyCostData['breakdown'] {
    return this.getDailyCostData().breakdown;
  }

  /**
   * Reset costs for testing
   */
  public resetCosts(): void {
    this.entries = [];
    this.saveEntries();
    this.clearCache();
    this.notifySubscribers();
    
    logger.debug('[DailyCost] Costs reset');
  }

  /**
   * Get pricing information for a model
   */
  public getModelPricing(model: string): { input: number; output: number } {
    return MODEL_PRICING[model] || MODEL_PRICING.default;
  }

  // Private methods

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getNextResetTime(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return tomorrow.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  private resetForNewDay(newDate: string): void {
    // Archive current day's data to history
    if (this.entries.length > 0) {
      this.archiveDayData();
    }
    
    this.currentDate = newDate;
    this.entries = [];
    this.clearCache();
    
    logger.debug('[DailyCost] Reset for new day:', newDate);
  }

  private archiveDayData(): void {
    try {
      const dailyTotal = this.getDailyCostData().amount;
      const history = this.getCostHistory(30); // Keep 30 days
      
      history.push({
        date: this.currentDate,
        amount: dailyTotal
      });
      
      // Keep only last 30 days
      const recent = history.slice(-30);
      
      localStorage.setItem('claude-cost-history', JSON.stringify(recent));
      logger.debug('[DailyCost] Archived day data:', { date: this.currentDate, amount: dailyTotal });
    } catch (error) {
      logger.error('[DailyCost] Failed to archive day data:', error);
    }
  }

  private loadEntries(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.entries = data.entries || [];
        this.currentDate = data.date || this.getTodayDateString();
        
        logger.debug('[DailyCost] Loaded entries:', {
          count: this.entries.length,
          date: this.currentDate
        });
      }
    } catch (error) {
      logger.error('[DailyCost] Failed to load entries:', error);
      this.entries = [];
    }
  }

  private saveEntries(): void {
    try {
      const data = {
        entries: this.entries,
        date: this.currentDate,
        lastUpdate: Date.now()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      logger.error('[DailyCost] Failed to save entries:', error);
    }
  }

  private clearCache(): void {
    this.cachedData = null;
    this.cacheExpiry = 0;
  }

  private notifySubscribers(): void {
    const data = this.getDailyCostData();
    
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('[DailyCost] Subscriber callback error:', error);
      }
    });
  }
}

// Export singleton instance
export const dailyCostComponent = new DailyCostComponent();