// Loop Prevention Utilities for Live Preview
// Prevents runaway loops in editor <-> preview communication

interface UpdateTracker {
  file: string;
  content: string;
  timestamp: number;
  source: string;
}

interface CircuitBreakerConfig {
  maxUpdatesPerSecond: number;
  windowMs: number;
  cooldownMs: number;
}

export class PreviewLoopPrevention {
  private updateHistory: UpdateTracker[] = [];
  private isInCooldown = false;
  private updateCounter = 0;
  private windowStart = Date.now();
  
  private config: CircuitBreakerConfig = {
    maxUpdatesPerSecond: 5,
    windowMs: 1000,
    cooldownMs: 2000
  };

  /**
   * Circuit breaker to prevent excessive update frequency
   */
  canUpdate(source: string = 'unknown'): boolean {
    const now = Date.now();
    
    // Check if we're in cooldown
    if (this.isInCooldown) {
      return false;
    }
    
    // Reset counter if window expired
    if (now - this.windowStart > this.config.windowMs) {
      this.updateCounter = 0;
      this.windowStart = now;
    }
    
    // Check rate limit
    if (this.updateCounter >= this.config.maxUpdatesPerSecond) {
      console.warn(`Preview update rate limit exceeded (${this.config.maxUpdatesPerSecond}/sec). Entering cooldown.`);
      this.enterCooldown();
      return false;
    }
    
    this.updateCounter++;
    return true;
  }

  /**
   * Check for duplicate updates to prevent redundant processing
   */
  isDuplicateUpdate(file: string, content: string, source: string): boolean {
    const now = Date.now();
    
    // Clean old history (keep last 10 updates)
    this.updateHistory = this.updateHistory
      .filter(update => now - update.timestamp < 5000)
      .slice(-10);
    
    // Check for recent identical update
    const recentDuplicate = this.updateHistory.find(update => 
      update.file === file && 
      update.content === content &&
      update.source === source &&
      now - update.timestamp < 500 // 500ms window
    );
    
    if (recentDuplicate) {
      console.debug('Skipping duplicate preview update');
      return true;
    }
    
    // Record this update
    this.updateHistory.push({ file, content, timestamp: now, source });
    return false;
  }

  /**
   * Check for rapid sequential updates that might indicate a loop
   */
  isRapidSequence(file: string): boolean {
    const now = Date.now();
    const recentUpdates = this.updateHistory.filter(update => 
      update.file === file && 
      now - update.timestamp < 1000 // Last 1 second
    );
    
    if (recentUpdates.length >= 3) {
      console.warn('Rapid update sequence detected, potential loop risk');
      return true;
    }
    
    return false;
  }

  /**
   * Enter cooldown period to break potential loops
   */
  private enterCooldown(): void {
    this.isInCooldown = true;
    this.updateCounter = 0;
    
    setTimeout(() => {
      this.isInCooldown = false;
      console.log('Preview update cooldown period ended');
    }, this.config.cooldownMs);
  }

  /**
   * Reset all tracking (useful for cleanup)
   */
  reset(): void {
    this.updateHistory = [];
    this.updateCounter = 0;
    this.isInCooldown = false;
    this.windowStart = Date.now();
  }
}

// Debounced function creator with cancellation support
export function createDebouncedPreviewUpdate(
  updateFn: (file: string, content: string) => void,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout | null = null;
  let abortController: AbortController | null = null;

  return {
    update: (file: string, content: string) => {
      // Cancel previous update
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (abortController) {
        abortController.abort();
      }

      // Create new abort controller for this update
      abortController = new AbortController();
      
      timeoutId = setTimeout(() => {
        if (!abortController?.signal.aborted) {
          updateFn(file, content);
        }
        timeoutId = null;
        abortController = null;
      }, delay);
    },
    
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
    }
  };
}

// Request cache to prevent duplicate API calls
export class PreviewRequestCache {
  private cache = new Map<string, { response: any; timestamp: number }>();
  private readonly cacheDuration = 1000; // 1 second

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.response;
    }
    return null;
  }

  set(key: string, response: any): void {
    this.cache.set(key, { response, timestamp: Date.now() });
    this.cleanup();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheDuration * 2) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global instances for the preview system
export const previewLoopPrevention = new PreviewLoopPrevention();
export const previewRequestCache = new PreviewRequestCache();