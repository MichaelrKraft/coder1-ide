// Utility for debouncing API calls and preventing race conditions
export class APIDebouncer {
  private static timeouts = new Map<string, NodeJS.Timeout>();
  private static inFlight = new Set<string>();
  private static abortControllers = new Map<string, AbortController>();

  /**
   * Debounce an async function call by a specified delay
   * @param key - Unique identifier for this debounced operation
   * @param fn - Async function to debounce
   * @param delay - Delay in milliseconds (default: 300ms)
   * @returns Promise that resolves with the function result
   */
  static async debounce<T>(
    key: string,
    fn: (signal?: AbortSignal) => Promise<T>,
    delay: number = 300
  ): Promise<T | null> {
    // Cancel any existing timeout for this key
    const existingTimeout = this.timeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.timeouts.delete(key);
    }

    // Cancel any in-flight request for this key
    const existingController = this.abortControllers.get(key);
    if (existingController) {
      existingController.abort();
      this.abortControllers.delete(key);
    }

    return new Promise<T | null>((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try {
          // Check if already in flight
          if (this.inFlight.has(key)) {
            resolve(null);
            return;
          }

          // Mark as in flight
          this.inFlight.add(key);

          // Create abort controller for this request
          const controller = new AbortController();
          this.abortControllers.set(key, controller);

          try {
            const result = await fn(controller.signal);
            resolve(result);
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              resolve(null); // Request was cancelled
            } else {
              reject(error);
            }
          } finally {
            // Clean up
            this.inFlight.delete(key);
            this.abortControllers.delete(key);
            this.timeouts.delete(key);
          }
        } catch (error) {
          this.inFlight.delete(key);
          this.abortControllers.delete(key);
          this.timeouts.delete(key);
          reject(error);
        }
      }, delay);

      this.timeouts.set(key, timeout);
    });
  }

  /**
   * Cancel a debounced operation
   * @param key - Unique identifier for the operation to cancel
   */
  static cancel(key: string): void {
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }

    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(key);
    }

    this.inFlight.delete(key);
  }

  /**
   * Check if an operation is currently in progress
   * @param key - Unique identifier for the operation
   * @returns true if operation is in progress
   */
  static isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  /**
   * Clear all pending operations
   */
  static clear(): void {
    // Cancel all timeouts
    const timeoutValues = Array.from(this.timeouts.values());
    for (const timeout of timeoutValues) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();

    // Abort all controllers
    const controllerValues = Array.from(this.abortControllers.values());
    for (const controller of controllerValues) {
      controller.abort();
    }
    this.abortControllers.clear();

    // Clear in-flight tracking
    this.inFlight.clear();
  }
}

/**
 * Simple debouncer for functions that don't need abort control
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout | undefined;
  
  return ((...args: any[]) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  }) as T;
}

/**
 * Throttle function to limit execution frequency
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}