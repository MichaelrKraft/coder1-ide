import { logger } from './logger';

/**
 * Centralized Polling Manager
 * 
 * Prevents runaway API calls by coordinating all polling activities
 * across the application. Implements circuit breaker patterns,
 * resource sharing, and intelligent backoff strategies.
 */

interface PollingConfig {
  id: string;
  url: string;
  interval: number;
  timeout: number;
  maxFailures: number;
  backoffMultiplier: number;
  maxBackoff: number;
}

interface PollingState {
  isActive: boolean;
  failures: number;
  lastSuccess: number | null;
  lastFailure: number | null;
  currentInterval: number;
  nextRetry: number | null;
  subscribers: Set<(data: any) => void>;
  lastData: any;
  abortController: AbortController | null;
}

class PollingManager {
  private pollers: Map<string, PollingState> = new Map();
  private configs: Map<string, PollingConfig> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private globalCircuitBreaker = {
    isOpen: false,
    failures: 0,
    lastFailure: null as number | null,
    openUntil: null as number | null
  };

  constructor() {
    // Global circuit breaker configuration
    this.setupGlobalCircuitBreaker();
  }

  private setupGlobalCircuitBreaker() {
    // If too many pollers are failing, open global circuit breaker
    const GLOBAL_FAILURE_THRESHOLD = 5;
    const GLOBAL_RECOVERY_TIME = 60000; // 60 seconds

    setInterval(() => {
      const activePollers = Array.from(this.pollers.values());
      const failingPollers = activePollers.filter(p => p.failures >= 3);
      
      if (failingPollers.length >= GLOBAL_FAILURE_THRESHOLD && !this.globalCircuitBreaker.isOpen) {
        logger.warn('🚨 Global polling circuit breaker OPENED - too many failing pollers');
        this.globalCircuitBreaker.isOpen = true;
        this.globalCircuitBreaker.openUntil = Date.now() + GLOBAL_RECOVERY_TIME;
        
        // Pause all active polling
        this.pauseAllPolling();
      } else if (this.globalCircuitBreaker.isOpen && Date.now() > (this.globalCircuitBreaker.openUntil || 0)) {
        logger.debug('✅ Global polling circuit breaker CLOSED - resuming normal operation');
        this.globalCircuitBreaker.isOpen = false;
        this.globalCircuitBreaker.openUntil = null;
        
        // Resume polling with exponential backoff
        this.resumeAllPolling();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Register a polling endpoint
   */
  register(config: PollingConfig): void {
    this.configs.set(config.id, config);
    
    if (!this.pollers.has(config.id)) {
      this.pollers.set(config.id, {
        isActive: false,
        failures: 0,
        lastSuccess: null,
        lastFailure: null,
        currentInterval: config.interval,
        nextRetry: null,
        subscribers: new Set(),
        lastData: null,
        abortController: null
      });
    }

    logger.debug(`📡 Polling registered: ${config.id} (${config.url})`);
  }

  /**
   * Subscribe to polling data
   */
  subscribe(pollerId: string, callback: (data: any) => void): () => void {
    const poller = this.pollers.get(pollerId);
    if (!poller) {
      throw new Error(`Poller ${pollerId} not registered`);
    }

    poller.subscribers.add(callback);

    // If we have cached data, send it immediately
    if (poller.lastData !== null) {
      callback(poller.lastData);
    }

    // Start polling if this is the first subscriber
    if (poller.subscribers.size === 1 && !poller.isActive) {
      this.startPolling(pollerId);
    }

    // Return unsubscribe function
    return () => {
      poller.subscribers.delete(callback);
      
      // Stop polling if no more subscribers
      if (poller.subscribers.size === 0) {
        this.stopPolling(pollerId);
      }
    };
  }

  /**
   * Start polling for a specific endpoint
   */
  private async startPolling(pollerId: string): Promise<void> {
    const config = this.configs.get(pollerId);
    const poller = this.pollers.get(pollerId);

    if (!config || !poller) {
      logger.error(`Cannot start polling: ${pollerId} not found`);
      return;
    }

    if (poller.isActive) {
      logger.warn(`Polling already active for ${pollerId}`);
      return;
    }

    logger.debug(`🎯 Starting polling: ${pollerId}`);
    poller.isActive = true;
    
    this.scheduleNextPoll(pollerId);
  }

  /**
   * Stop polling for a specific endpoint
   */
  private stopPolling(pollerId: string): void {
    const poller = this.pollers.get(pollerId);
    
    if (!poller) return;

    logger.debug(`⏹️ Stopping polling: ${pollerId}`);
    
    poller.isActive = false;
    
    // Cancel any pending request
    if (poller.abortController) {
      poller.abortController.abort();
      poller.abortController = null;
    }
    
    // Clear timer
    const timer = this.timers.get(pollerId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(pollerId);
    }
  }

  /**
   * Schedule the next poll
   */
  private scheduleNextPoll(pollerId: string): void {
    const config = this.configs.get(pollerId);
    const poller = this.pollers.get(pollerId);

    if (!config || !poller || !poller.isActive) return;

    // Check global circuit breaker
    if (this.globalCircuitBreaker.isOpen) {
      logger.debug(`🚫 Skipping poll ${pollerId} - global circuit breaker open`);
      // Reschedule after global recovery time
      const timer = setTimeout(() => {
        this.scheduleNextPoll(pollerId);
      }, 30000);
      this.timers.set(pollerId, timer);
      return;
    }

    // Check individual circuit breaker
    const now = Date.now();
    if (poller.nextRetry && now < poller.nextRetry) {
      const delay = poller.nextRetry - now;
      logger.debug(`⏳ Delaying poll ${pollerId} for ${Math.round(delay/1000)}s due to failures`);
      
      const timer = setTimeout(() => {
        this.scheduleNextPoll(pollerId);
      }, delay);
      this.timers.set(pollerId, timer);
      return;
    }

    // Schedule the poll
    const timer = setTimeout(async () => {
      await this.executePoll(pollerId);
      
      if (poller.isActive) {
        this.scheduleNextPoll(pollerId);
      }
    }, poller.currentInterval);

    this.timers.set(pollerId, timer);
  }

  /**
   * Execute a single poll
   */
  private async executePoll(pollerId: string): Promise<void> {
    const config = this.configs.get(pollerId);
    const poller = this.pollers.get(pollerId);

    if (!config || !poller) return;

    try {
      // Create abort controller for this request
      poller.abortController = new AbortController();
      
      const response = await fetch(config.url, {
        signal: poller.abortController.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Success - reset failure state
      poller.failures = 0;
      poller.lastSuccess = Date.now();
      poller.lastFailure = null;
      poller.currentInterval = config.interval;
      poller.nextRetry = null;
      poller.lastData = data;
      poller.abortController = null;

      // Notify all subscribers
      poller.subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in polling callback for ${pollerId}:`, error);
        }
      });

    } catch (error) {
      // Skip error handling if request was aborted (normal cleanup)
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      logger.warn(`Poll failed for ${pollerId}:`, error);
      
      // Record failure
      poller.failures++;
      poller.lastFailure = Date.now();
      poller.abortController = null;

      // Implement exponential backoff
      if (poller.failures >= config.maxFailures) {
        poller.currentInterval = Math.min(
          poller.currentInterval * config.backoffMultiplier,
          config.maxBackoff
        );
        
        poller.nextRetry = Date.now() + poller.currentInterval;
        
        logger.warn(`Circuit breaker opened for ${pollerId} - backing off to ${Math.round(poller.currentInterval/1000)}s`);
      }
    }
  }

  /**
   * Pause all active polling (for global circuit breaker)
   */
  private pauseAllPolling(): void {
    this.timers.forEach((timer, pollerId) => {
      clearTimeout(timer);
      this.timers.delete(pollerId);
    });
  }

  /**
   * Resume all polling with backoff
   */
  private resumeAllPolling(): void {
    this.pollers.forEach((poller, pollerId) => {
      if (poller.isActive && poller.subscribers.size > 0) {
        // Resume with exponential backoff
        poller.currentInterval = Math.min(
          (this.configs.get(pollerId)?.interval || 30000) * 2,
          60000 // Max 60 second backoff
        );
        this.scheduleNextPoll(pollerId);
      }
    });
  }

  /**
   * Get status of all pollers
   */
  getStatus(): { [key: string]: any } {
    const status: { [key: string]: any } = {
      globalCircuitBreaker: this.globalCircuitBreaker,
      pollers: {}
    };

    this.pollers.forEach((poller, pollerId) => {
      const config = this.configs.get(pollerId);
      status.pollers[pollerId] = {
        isActive: poller.isActive,
        subscribers: poller.subscribers.size,
        failures: poller.failures,
        lastSuccess: poller.lastSuccess,
        lastFailure: poller.lastFailure,
        currentInterval: poller.currentInterval,
        nextRetry: poller.nextRetry,
        url: config?.url
      };
    });

    return status;
  }

  /**
   * Cleanup all polling
   */
  cleanup(): void {
    logger.debug('🧹 Cleaning up polling manager');
    
    // Stop all polling
    this.pollers.forEach((_, pollerId) => {
      this.stopPolling(pollerId);
    });
    
    // Clear all data structures
    this.pollers.clear();
    this.configs.clear();
    this.timers.clear();
  }
}

// Export singleton instance
export const pollingManager = new PollingManager();