/**
 * Performance Monitor - Defensive programming utilities
 * Prevents runaway intervals and memory leaks
 */

// Global interval registry to track all active intervals
const activeIntervals = new Map<any, { 
  component: string, 
  description: string, 
  created: number,
  lastCheck: number
}>();

// Global timeout registry to track active timeouts
const activeTimeouts = new Map<any, {
  component: string,
  description: string,
  created: number
}>();

// Component mount tracking
const mountedComponents = new Set<string>();

/**
 * Safe interval wrapper - automatically cleans up and prevents duplicates
 */
export function createSafeInterval(
  callback: () => void,
  delay: number,
  component: string,
  description: string
): any {
  // Defensive check - prevent too frequent intervals
  if (delay < 100) {
    logger?.warn(`[PerformanceMonitor] Interval too frequent (${delay}ms) for ${component}:${description}`);
    delay = 100; // Minimum 100ms interval
  }

  // Clear any existing interval for this component+description
  const existingKey = `${component}:${description}`;
  const entries = Array.from(activeIntervals.entries());
  for (const [intervalId, info] of entries) {
    if (`${info.component}:${info.description}` === existingKey) {
      logger?.warn(`[PerformanceMonitor] Clearing duplicate interval for ${existingKey}`);
      clearInterval(intervalId);
      activeIntervals.delete(intervalId);
    }
  }

  const intervalId = setInterval(() => {
    try {
      // Check if component is still mounted
      if (!mountedComponents.has(component)) {
        logger?.warn(`[PerformanceMonitor] Auto-clearing interval for unmounted component: ${component}`);
        clearSafeInterval(intervalId);
        return;
      }

      // Update last check time
      const info = activeIntervals.get(intervalId);
      if (info) {
        info.lastCheck = Date.now();
      }

      callback();
    } catch (error) {
      logger?.error(`[PerformanceMonitor] Interval callback error in ${component}:${description}:`, error);
      // Don't clear interval on callback errors - let component handle it
    }
  }, delay);

  // Register the interval
  activeIntervals.set(intervalId, {
    component,
    description,
    created: Date.now(),
    lastCheck: Date.now()
  });

  // REMOVED: // REMOVED: console.log(`[PerformanceMonitor] Created interval ${intervalId} for ${component}:${description} (${delay}ms)`);
  return intervalId;
}

/**
 * Safe interval cleanup
 */
export function clearSafeInterval(intervalId: any): void {
  if (activeIntervals.has(intervalId)) {
    const info = activeIntervals.get(intervalId);
    // REMOVED: // REMOVED: console.log(`[PerformanceMonitor] Clearing interval ${intervalId} for ${info?.component}:${info?.description}`);
    clearInterval(intervalId);
    activeIntervals.delete(intervalId);
  }
}

/**
 * Safe timeout wrapper
 */
export function createSafeTimeout(
  callback: () => void,
  delay: number,
  component: string,
  description: string
): any {
  const timeoutId = setTimeout(() => {
    try {
      // Remove from registry when it executes
      activeTimeouts.delete(timeoutId);
      
      // Check if component is still mounted
      if (!mountedComponents.has(component)) {
        logger?.warn(`[PerformanceMonitor] Skipping timeout for unmounted component: ${component}`);
        return;
      }

      callback();
    } catch (error) {
      logger?.error(`[PerformanceMonitor] Timeout callback error in ${component}:${description}:`, error);
    }
  }, delay);

  // Register the timeout
  activeTimeouts.set(timeoutId, {
    component,
    description,
    created: Date.now()
  });

  return timeoutId;
}

/**
 * Safe timeout cleanup
 */
export function clearSafeTimeout(timeoutId: number): void {
  if (activeTimeouts.has(timeoutId)) {
    const info = activeTimeouts.get(timeoutId);
    // REMOVED: // REMOVED: console.log(`[PerformanceMonitor] Clearing timeout ${timeoutId} for ${info?.component}:${info?.description}`);
    clearTimeout(timeoutId);
    activeTimeouts.delete(timeoutId);
  }
}

/**
 * Component lifecycle management
 */
export function registerComponent(componentName: string): void {
  mountedComponents.add(componentName);
  // REMOVED: // REMOVED: console.log(`[PerformanceMonitor] Registered component: ${componentName}`);
}

export function unregisterComponent(componentName: string): void {
  mountedComponents.delete(componentName);
  
  // Clean up all intervals and timeouts for this component
  const intervalsToClean = [];
  const timeoutsToClean = [];
  
  const intervalEntries = Array.from(activeIntervals.entries());
  for (const [intervalId, info] of intervalEntries) {
    if (info.component === componentName) {
      intervalsToClean.push(intervalId);
    }
  }
  
  const timeoutEntries = Array.from(activeTimeouts.entries());
  for (const [timeoutId, info] of timeoutEntries) {
    if (info.component === componentName) {
      timeoutsToClean.push(timeoutId);
    }
  }
  
  // Clean them up
  intervalsToClean.forEach(id => clearSafeInterval(id));
  timeoutsToClean.forEach(id => clearSafeTimeout(id));
  
  // REMOVED: // REMOVED: console.log(`[PerformanceMonitor] Unregistered component: ${componentName} (cleaned ${intervalsToClean.length} intervals, ${timeoutsToClean.length} timeouts)`);
}

/**
 * Get performance stats
 */
export function getPerformanceStats() {
  const now = Date.now();
  return {
    activeIntervals: Array.from(activeIntervals.entries()).map(([id, info]) => ({
      id,
      component: info.component,
      description: info.description,
      ageMs: now - info.created,
      lastCheckMs: now - info.lastCheck
    })),
    activeTimeouts: Array.from(activeTimeouts.entries()).map(([id, info]) => ({
      id,
      component: info.component,
      description: info.description,
      ageMs: now - info.created
    })),
    mountedComponents: Array.from(mountedComponents)
  };
}

/**
 * Emergency cleanup - clears all intervals and timeouts
 */
export function emergencyCleanup(): void {
  logger?.warn('[PerformanceMonitor] EMERGENCY CLEANUP TRIGGERED');
  
  // Clear all intervals
  const intervalCount = activeIntervals.size;
  const intervalKeys = Array.from(activeIntervals.keys());
  for (const intervalId of intervalKeys) {
    clearInterval(intervalId);
  }
  activeIntervals.clear();
  
  // Clear all timeouts  
  const timeoutCount = activeTimeouts.size;
  const timeoutKeys = Array.from(activeTimeouts.keys());
  for (const timeoutId of timeoutKeys) {
    clearTimeout(timeoutId);
  }
  activeTimeouts.clear();
  
  logger?.warn(`[PerformanceMonitor] Emergency cleanup completed: ${intervalCount} intervals, ${timeoutCount} timeouts cleared`);
}

// Development mode monitoring (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Monitor for runaway intervals every 30 seconds in development
  const monitorInterval = setInterval(() => {
    const stats = getPerformanceStats();
    
    // Alert if too many intervals are running
    if (stats.activeIntervals.length > 10) {
      logger?.warn('[PerformanceMonitor] WARNING: High number of active intervals:', stats.activeIntervals.length);
      console.table(stats.activeIntervals);
    }
    
    // Alert if intervals haven't executed recently (potential stuck intervals)
    const stuckIntervals = stats.activeIntervals.filter(interval => interval.lastCheckMs > 10000);
    if (stuckIntervals.length > 0) {
      logger?.warn('[PerformanceMonitor] WARNING: Stuck intervals detected:', stuckIntervals);
    }
  }, 30000);

  // Make stats available globally for debugging
  (window as any).__performanceMonitor = {
    getStats: getPerformanceStats,
    emergencyCleanup,
    clearAllIntervals: () => {
      activeIntervals.forEach((_, id) => clearSafeInterval(id));
    },
    clearAllTimeouts: () => {
      activeTimeouts.forEach((_, id) => clearSafeTimeout(id));
    }
  };
  
  // REMOVED: // REMOVED: console.log('[PerformanceMonitor] Development monitoring active. Access via window.__performanceMonitor');
}