/**
 * Usage Tracking Service
 * Periodically collects Claude usage data and tracks costs
 */

import { logger } from './logger';

class UsageTracker {
  private intervalId: NodeJS.Timeout | null = null;
  private isTracking = false;
  private lastTokenCount = 0;
  
  constructor(private intervalMs: number = 60000) {} // Default 1 minute

  /**
   * Start tracking usage
   */
  async start(sessionId?: string) {
    if (this.isTracking) {
      logger.debug('Usage tracking already active');
      return;
    }

    this.isTracking = true;
    logger.info('Starting usage tracking service');

    // Initial collection
    await this.collectUsage(sessionId);

    // Set up periodic collection
    this.intervalId = setInterval(async () => {
      await this.collectUsage(sessionId);
    }, this.intervalMs);
  }

  /**
   * Stop tracking usage
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isTracking = false;
    logger.info('Stopped usage tracking service');
  }

  /**
   * Collect current usage data
   */
  private async collectUsage(sessionId?: string) {
    try {
      const response = await fetch('/api/claude/usage/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId,
          model: 'claude-3-5-sonnet' 
        })
      });

      if (!response.ok) {
        throw new Error(`Usage tracking failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Log significant changes
      if (data.current.tokens !== this.lastTokenCount) {
        const tokenDiff = data.current.tokens - this.lastTokenCount;
        if (tokenDiff > 0) {
          logger.debug(`Usage update: +${tokenDiff} tokens, Total: ${data.current.tokens}, Cost: ${data.current.formattedCost}`);
        }
        this.lastTokenCount = data.current.tokens;
      }

      return data;
    } catch (error) {
      logger.error('Failed to collect usage:', error);
    }
  }

  /**
   * Get current tracking status
   */
  getStatus() {
    return {
      isTracking: this.isTracking,
      intervalMs: this.intervalMs,
      lastTokenCount: this.lastTokenCount
    };
  }

  /**
   * Update tracking interval
   */
  setInterval(intervalMs: number) {
    this.intervalMs = intervalMs;
    
    // Restart if currently tracking
    if (this.isTracking) {
      this.stop();
      this.start();
    }
  }
}

// Export singleton instance
export const usageTracker = new UsageTracker();