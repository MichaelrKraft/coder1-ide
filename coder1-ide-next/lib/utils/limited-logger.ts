/**
 * LimitedLogger - Prevents console log spam during cascading failures
 *
 * Problem: During resource exhaustion, polling loops can generate thousands
 * of console.error() calls, filling up the browser console and potentially
 * causing additional memory issues.
 *
 * Solution: Log first N errors per key, then suppress remaining with a summary.
 *
 * Usage:
 *   const logger = new LimitedLogger({ maxLogsPerKey: 10 });
 *   logger.error('api-fetch', 'Failed to fetch data', error);
 *   // After 10 calls, logs: "[api-fetch] Further errors suppressed (10+ occurred)"
 *   // After that, completely silent
 */

export interface LimitedLoggerConfig {
  /** Maximum number of logs per key before suppression (default: 10) */
  maxLogsPerKey?: number;
  /** Prefix for all log messages (default: '') */
  prefix?: string;
}

export interface LoggerStats {
  /** Number of errors logged (before suppression) */
  logged: number;
  /** Total error count (including suppressed) */
  total: number;
  /** Whether further errors are being suppressed */
  isSuppressed: boolean;
}

class LimitedLogger {
  private errorCounts = new Map<string, number>();
  private maxLogsPerKey: number;
  private prefix: string;

  constructor(config: LimitedLoggerConfig = {}) {
    this.maxLogsPerKey = config.maxLogsPerKey ?? 10;
    this.prefix = config.prefix ?? '';
  }

  /**
   * Log an error with automatic suppression after maxLogsPerKey
   */
  error(key: string, message: string, ...args: unknown[]): void {
    const count = (this.errorCounts.get(key) || 0) + 1;
    this.errorCounts.set(key, count);

    const prefixedKey = this.prefix ? `${this.prefix}:${key}` : key;

    if (count <= this.maxLogsPerKey) {
      console.error(`[${prefixedKey}] ${message}`, ...args);
    } else if (count === this.maxLogsPerKey + 1) {
      console.error(`[${prefixedKey}] Further errors suppressed (${count}+ occurred)`);
    }
    // After maxLogsPerKey + 1, completely silent
  }

  /**
   * Log a warning with automatic suppression
   */
  warn(key: string, message: string, ...args: unknown[]): void {
    const count = (this.errorCounts.get(key) || 0) + 1;
    this.errorCounts.set(key, count);

    const prefixedKey = this.prefix ? `${this.prefix}:${key}` : key;

    if (count <= this.maxLogsPerKey) {
      console.warn(`[${prefixedKey}] ${message}`, ...args);
    } else if (count === this.maxLogsPerKey + 1) {
      console.warn(`[${prefixedKey}] Further warnings suppressed (${count}+ occurred)`);
    }
  }

  /**
   * Reset the count for a specific key (call on success to allow future logging)
   */
  reset(key: string): void {
    this.errorCounts.delete(key);
  }

  /**
   * Reset all counts
   */
  resetAll(): void {
    this.errorCounts.clear();
  }

  /**
   * Get stats for a specific key
   */
  getStats(key: string): LoggerStats {
    const total = this.errorCounts.get(key) || 0;
    return {
      logged: Math.min(total, this.maxLogsPerKey),
      total,
      isSuppressed: total > this.maxLogsPerKey,
    };
  }

  /**
   * Get total error count across all keys
   */
  getTotalErrorCount(): number {
    let total = 0;
    this.errorCounts.forEach(count => {
      total += count;
    });
    return total;
  }

  /**
   * Check if any key is currently suppressed
   */
  hasSuppressions(): boolean {
    let hasSuppression = false;
    this.errorCounts.forEach((count) => {
      if (count > this.maxLogsPerKey) {
        hasSuppression = true;
      }
    });
    return hasSuppression;
  }
}

// Singleton instance for global use
let globalLogger: LimitedLogger | null = null;

/**
 * Get the global LimitedLogger instance
 */
export function getGlobalLogger(): LimitedLogger {
  if (!globalLogger) {
    globalLogger = new LimitedLogger({ maxLogsPerKey: 10, prefix: 'Coder1' });
  }
  return globalLogger;
}

/**
 * Create a new LimitedLogger instance with custom config
 */
export function createLogger(config?: LimitedLoggerConfig): LimitedLogger {
  return new LimitedLogger(config);
}

export { LimitedLogger };
export default LimitedLogger;
