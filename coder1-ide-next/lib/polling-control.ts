/**
 * Global Polling Control System
 * 
 * PERMANENT SOLUTION to prevent runaway API calls by providing
 * centralized control over ALL background polling in the application.
 * 
 * This system:
 * 1. Provides a global kill switch for ALL polling
 * 2. Tracks all active polling intervals
 * 3. Allows for environment-based control
 * 4. Prevents zombie intervals
 */

import { useEffect, useState } from 'react';
import { logger } from './logger';

// Global configuration
const POLLING_CONFIG = {
  // Global kill switch - if true, NO polling will run
  DISABLED: (typeof window !== 'undefined' && localStorage.getItem('disable-all-polling') === 'true') ||
            (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') ||
            (typeof process !== 'undefined' && process.env?.DISABLE_ALL_POLLING === 'true'),
  
  // Development mode settings
  DEV_ONLY: (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'),
  
  // Default intervals (in milliseconds)
  DEFAULT_INTERVALS: {
    CLAUDE_USAGE: 300000,    // 5 minutes (was 2 minutes)
    MCP_STATUS: 300000,      // 5 minutes (was 1 minute)  
    BLOCK_TIMER: 60000,      // 1 minute (was 1 second)
    SCROLL_CHECK: 1000       // 1 second (was 150ms)
  }
};

interface PollingItem {
  id: string;
  name: string;
  intervalId: NodeJS.Timeout | null;
  callback: () => void | Promise<void>;
  intervalMs: number;
  isActive: boolean;
  lastRun: number;
  runCount: number;
  createdAt: number;
}

class PollingManager {
  private items: Map<string, PollingItem> = new Map();
  private isGloballyDisabled: boolean = POLLING_CONFIG.DISABLED;
  
  constructor() {
    // Set up global kill switch listener
    if (typeof window !== 'undefined') {
      // Allow runtime disabling via console
      (window as any).killAllPolling = () => this.killAll();
      (window as any).enablePolling = () => this.enableAll();
      (window as any).listPolling = () => this.getStatus();
    }
    
    // Log initialization
    logger.debug('🛡️ PollingManager initialized', {
      globallyDisabled: this.isGloballyDisabled,
      environment: process.env.NODE_ENV
    });
  }
  
  /**
   * Register a new polling function
   * Returns a cleanup function
   */
  register(
    id: string,
    name: string,
    callback: () => void | Promise<void>,
    intervalMs: number,
    startImmediately: boolean = false
  ): (() => void) {
    
    // Global kill switch
    if (this.isGloballyDisabled) {
      logger.debug(`🛑 Polling blocked by global kill switch: ${name}`);
      return () => {}; // Return no-op cleanup
    }
    
    // Remove existing item if it exists
    this.unregister(id);
    
    const item: PollingItem = {
      id,
      name,
      intervalId: null,
      callback,
      intervalMs,
      isActive: false,
      lastRun: 0,
      runCount: 0,
      createdAt: Date.now()
    };
    
    this.items.set(id, item);
    
    if (startImmediately) {
      this.start(id);
    }
    
    logger.debug(`📊 Registered polling: ${name} (${intervalMs}ms)`, {
      totalPollers: this.items.size,
      active: this.getActiveCount()
    });
    
    // Return cleanup function
    return () => this.unregister(id);
  }
  
  /**
   * Start a registered polling item
   */
  start(id: string): boolean {
    if (this.isGloballyDisabled) {
      logger.debug(`🛑 Polling start blocked by global kill switch: ${id}`);
      return false;
    }
    
    const item = this.items.get(id);
    if (!item) {
      logger.warn(`⚠️ Cannot start unknown polling item: ${id}`);
      return false;
    }
    
    if (item.isActive) {
      logger.debug(`⏭️ Polling already active: ${item.name}`);
      return true;
    }
    
    // Create safe wrapper that handles errors and tracks runs
    const safeCallback = async () => {
      try {
        item.lastRun = Date.now();
        item.runCount++;
        await item.callback();
      } catch (error) {
        logger.error(`💥 Polling error in ${item.name}:`, error);
        // Stop polling on repeated errors (max 3 failures)
        if (item.runCount > 3) {
          logger.error(`🚫 Stopping ${item.name} due to repeated failures`);
          this.stop(id);
        }
      }
    };
    
    item.intervalId = setInterval(safeCallback, item.intervalMs);
    item.isActive = true;
    
    logger.debug(`▶️ Started polling: ${item.name}`);
    return true;
  }
  
  /**
   * Stop a specific polling item
   */
  stop(id: string): boolean {
    const item = this.items.get(id);
    if (!item) {
      return false;
    }
    
    if (item.intervalId) {
      clearInterval(item.intervalId);
      item.intervalId = null;
    }
    
    item.isActive = false;
    logger.debug(`⏹️ Stopped polling: ${item.name}`);
    return true;
  }
  
  /**
   * Unregister and stop a polling item
   */
  unregister(id: string): boolean {
    const item = this.items.get(id);
    if (!item) {
      return false;
    }
    
    this.stop(id);
    this.items.delete(id);
    logger.debug(`🗑️ Unregistered polling: ${item.name}`);
    return true;
  }
  
  /**
   * NUCLEAR OPTION: Kill all polling immediately
   */
  killAll(): void {
    logger.debug('🚨 KILLING ALL POLLING - NUCLEAR OPTION ACTIVATED');
    
    this.items.forEach((item, id) => {
      this.stop(id);
    });
    
    this.isGloballyDisabled = true;
    
    // Persist the kill switch
    if (typeof window !== 'undefined') {
      localStorage.setItem('disable-all-polling', 'true');
    }
    
    logger.debug('☢️ All polling killed. Use enableAll() to restore.');
  }
  
  /**
   * Re-enable polling (after killAll)
   */
  enableAll(): void {
    logger.debug('🔄 Re-enabling polling...');
    
    this.isGloballyDisabled = false;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('disable-all-polling');
    }
    
    logger.debug('✅ Polling re-enabled. Use start() on individual items to activate.');
  }
  
  /**
   * Get current polling status
   */
  getStatus(): {
    globallyDisabled: boolean;
    totalItems: number;
    activeItems: number;
    items: Array<{
      id: string;
      name: string;
      isActive: boolean;
      intervalMs: number;
      runCount: number;
      lastRun: number;
      ageMs: number;
    }>;
  } {
    const now = Date.now();
    const items = Array.from(this.items.values()).map(item => ({
      id: item.id,
      name: item.name,
      isActive: item.isActive,
      intervalMs: item.intervalMs,
      runCount: item.runCount,
      lastRun: item.lastRun,
      ageMs: now - item.createdAt
    }));
    
    return {
      globallyDisabled: this.isGloballyDisabled,
      totalItems: this.items.size,
      activeItems: this.getActiveCount(),
      items
    };
  }
  
  /**
   * Get count of active polling items
   */
  private getActiveCount(): number {
    return Array.from(this.items.values()).filter(item => item.isActive).length;
  }
  
  /**
   * Clean up old, inactive items
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    const toRemove: string[] = [];
    this.items.forEach((item, id) => {
      if (!item.isActive && (now - item.createdAt) > maxAge) {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => this.unregister(id));
    
    if (toRemove.length > 0) {
      logger.debug(`🧹 Cleaned up ${toRemove.length} old polling items`);
    }
  }
}

// Create singleton instance
export const pollingManager = new PollingManager();

// Convenience hook for React components
export function usePolling(
  id: string,
  name: string,
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean = true
): {
  start: () => void;
  stop: () => void;
  isActive: boolean;
} {
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    if (!enabled) return;
    
    const cleanup = pollingManager.register(id, name, callback, intervalMs);
    
    return cleanup;
  }, [id, name, callback, intervalMs, enabled]);
  
  return {
    start: () => {
      if (pollingManager.start(id)) {
        setIsActive(true);
      }
    },
    stop: () => {
      if (pollingManager.stop(id)) {
        setIsActive(false);
      }
    },
    isActive
  };
}

// Export configuration for other modules
export { POLLING_CONFIG };

// Helper functions
export const isPollingDisabled = () => pollingManager.getStatus().globallyDisabled;
export const killAllPolling = () => pollingManager.killAll();
export const enableAllPolling = () => pollingManager.enableAll();
export const getPollingStatus = () => pollingManager.getStatus();

export default pollingManager;