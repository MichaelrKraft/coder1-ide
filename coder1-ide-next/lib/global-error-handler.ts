/**
 * Global Error Handler
 * 
 * Catches all unhandled errors across the application
 * Provides centralized error reporting and recovery
 * Prevents application crashes from unhandled errors
 */

import { logger } from './logger';

interface ErrorReport {
  timestamp: number;
  type: 'unhandledRejection' | 'uncaughtException' | 'windowError' | 'consoleError';
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  userAgent?: string;
  url?: string;
  additionalData?: any;
}

class GlobalErrorHandler {
  private errorHistory: ErrorReport[];
  private maxHistorySize: number;
  private errorCallbacks: Set<(error: ErrorReport) => void>;
  private isInitialized: boolean;
  private suppressedErrors: Set<string>;
  private errorCounts: Map<string, number>;
  
  constructor() {
    this.errorHistory = [];
    this.maxHistorySize = 100;
    this.errorCallbacks = new Set();
    this.isInitialized = false;
    this.suppressedErrors = new Set();
    this.errorCounts = new Map();
  }
  
  initialize(): void {
    if (this.isInitialized) {
      logger.warn('Global error handler already initialized');
      return;
    }
    
    this.isInitialized = true;
    
    // Browser environment
    if (typeof window !== 'undefined') {
      this.setupBrowserHandlers();
    }
    
    // Node.js environment
    if (typeof process !== 'undefined' && typeof process.on === 'function') {
      this.setupNodeHandlers();
    }
    
    logger.info('Global error handler initialized');
  }
  
  private setupBrowserHandlers(): void {
    // Handle window errors
    window.addEventListener('error', (event: ErrorEvent) => {
      const report: ErrorReport = {
        timestamp: Date.now(),
        type: 'windowError',
        message: event.message,
        stack: event.error?.stack,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      this.handleError(report);
      
      // Prevent default error handling if we successfully handled it
      if (this.shouldPreventDefault(report)) {
        event.preventDefault();
      }
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const report: ErrorReport = {
        timestamp: Date.now(),
        type: 'unhandledRejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      this.handleError(report);
      
      // Prevent default handling
      if (this.shouldPreventDefault(report)) {
        event.preventDefault();
      }
    });
    
    // Monkey-patch console.error to catch logged errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      const report: ErrorReport = {
        timestamp: Date.now(),
        type: 'consoleError',
        message,
        stack: new Error().stack,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      // Only track if it looks like an actual error
      if (message.toLowerCase().includes('error') || 
          message.toLowerCase().includes('exception') ||
          message.toLowerCase().includes('failed')) {
        this.handleError(report);
      }
      
      // Call original console.error
      originalConsoleError.apply(console, args);
    };
  }
  
  private setupNodeHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      const report: ErrorReport = {
        timestamp: Date.now(),
        type: 'uncaughtException',
        message: error.message,
        stack: error.stack
      };
      
      this.handleError(report);
      
      // In production, exit gracefully
      if (process.env.NODE_ENV === 'production') {
        logger.error('Uncaught exception - exiting gracefully', error);
        process.exit(1);
      }
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      const report: ErrorReport = {
        timestamp: Date.now(),
        type: 'unhandledRejection',
        message: reason?.message || String(reason),
        stack: reason?.stack,
        additionalData: { promise }
      };
      
      this.handleError(report);
    });
  }
  
  private handleError(report: ErrorReport): void {
    // Check if error should be suppressed
    const errorKey = this.getErrorKey(report);
    if (this.suppressedErrors.has(errorKey)) {
      return;
    }
    
    // Track error frequency
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
    
    // Suppress if occurring too frequently (likely infinite loop)
    if (currentCount > 10) {
      logger.warn(`Suppressing error due to high frequency: ${errorKey}`);
      this.suppressedErrors.add(errorKey);
      return;
    }
    
    // Add to history
    this.errorHistory.push(report);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
    
    // Log the error
    logger.error(`Global error caught [${report.type}]:`, {
      message: report.message,
      stack: report.stack,
      source: report.source
    });
    
    // Notify callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(report);
      } catch (e) {
        logger.error('Error in error callback:', e);
      }
    });
    
    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportToService(report);
    }
  }
  
  private getErrorKey(report: ErrorReport): string {
    // Create a unique key for error deduplication
    return `${report.type}_${report.message}_${report.source || 'unknown'}_${report.lineno || 0}`;
  }
  
  private shouldPreventDefault(report: ErrorReport): boolean {
    // Prevent default handling for known recoverable errors
    const recoverablePatterns = [
      /ResizeObserver/,
      /Non-Error promise rejection/,
      /Network request failed/,
      /Load failed/,
      /Hydration failed/
    ];
    
    return recoverablePatterns.some(pattern => 
      pattern.test(report.message)
    );
  }
  
  private reportToService(report: ErrorReport): void {
    // Placeholder for error tracking service integration
    try {
      // Example: Send to Sentry, LogRocket, etc.
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(report)
      // });
    } catch (e) {
      // Fail silently - don't want error reporting to cause errors
    }
  }
  
  // Public API
  
  addErrorListener(callback: (error: ErrorReport) => void): () => void {
    this.errorCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }
  
  suppressError(pattern: string | RegExp): void {
    if (typeof pattern === 'string') {
      this.suppressedErrors.add(pattern);
    } else {
      // For regex patterns, we need a different approach
      // Store as string representation
      this.suppressedErrors.add(pattern.toString());
    }
  }
  
  getErrorHistory(): ErrorReport[] {
    return [...this.errorHistory];
  }
  
  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    topErrors: Array<{ message: string; count: number }>;
    recentErrors: ErrorReport[];
  } {
    const byType: Record<string, number> = {};
    
    this.errorHistory.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1;
    });
    
    // Get top errors by frequency
    const topErrors = Array.from(this.errorCounts.entries())
      .map(([key, count]) => ({
        message: key.split('_')[1] || key,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      total: this.errorHistory.length,
      byType,
      topErrors,
      recentErrors: this.errorHistory.slice(-10).reverse()
    };
  }
  
  clearHistory(): void {
    this.errorHistory = [];
    this.errorCounts.clear();
    this.suppressedErrors.clear();
  }
  
  // Recovery strategies
  
  async attemptRecovery(error: ErrorReport): Promise<boolean> {
    logger.info('Attempting error recovery:', error.message);
    
    // Different recovery strategies based on error type
    if (error.message.includes('WebSocket') || error.message.includes('socket')) {
      return this.recoverWebSocket();
    }
    
    if (error.message.includes('memory') || error.message.includes('heap')) {
      return this.recoverMemory();
    }
    
    if (error.message.includes('storage') || error.message.includes('localStorage')) {
      return this.recoverStorage();
    }
    
    // Generic recovery: reload page (last resort)
    if (this.shouldReload(error)) {
      logger.warn('Reloading page due to unrecoverable error');
      window.location.reload();
      return true;
    }
    
    return false;
  }
  
  private async recoverWebSocket(): Promise<boolean> {
    logger.info('Attempting WebSocket recovery');
    
    // Dispatch event to reconnect WebSockets
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('websocket-reconnect'));
    }
    
    return true;
  }
  
  private async recoverMemory(): Promise<boolean> {
    logger.info('Attempting memory recovery');
    
    // Clear caches
    if (typeof window !== 'undefined') {
      // Clear image caches by removing images
      document.querySelectorAll('img').forEach(img => {
        img.src = '';
      });
      
      // Trigger garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
      }
    }
    
    return true;
  }
  
  private async recoverStorage(): Promise<boolean> {
    logger.info('Attempting storage recovery');
    
    try {
      // Clear old items from localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        const now = Date.now();
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              if (parsed.timestamp && now - parsed.timestamp > 7 * 24 * 60 * 60 * 1000) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // If parsing fails, it might be old format - remove it
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        logger.info(`Cleared ${keysToRemove.length} old storage items`);
      }
      
      return true;
    } catch (e) {
      logger.error('Storage recovery failed:', e);
      return false;
    }
  }
  
  private shouldReload(error: ErrorReport): boolean {
    // Only reload for critical errors, and not too frequently
    const criticalPatterns = [
      /Cannot read prop.*of undefined/,
      /Maximum call stack/,
      /out of memory/
    ];
    
    const isCritical = criticalPatterns.some(pattern => 
      pattern.test(error.message)
    );
    
    // Check if we've reloaded recently
    const lastReload = parseInt(sessionStorage.getItem('lastErrorReload') || '0');
    const timeSinceReload = Date.now() - lastReload;
    const minReloadInterval = 5 * 60 * 1000; // 5 minutes
    
    if (isCritical && timeSinceReload > minReloadInterval) {
      sessionStorage.setItem('lastErrorReload', Date.now().toString());
      return true;
    }
    
    return false;
  }
}

// Create singleton instance
const globalErrorHandler = new GlobalErrorHandler();

// Auto-initialize
if (typeof window !== 'undefined' || typeof process !== 'undefined') {
  globalErrorHandler.initialize();
}

// Export convenience functions
export const addErrorListener = (callback: (error: ErrorReport) => void) => 
  globalErrorHandler.addErrorListener(callback);

export const suppressError = (pattern: string | RegExp) => 
  globalErrorHandler.suppressError(pattern);

export const getErrorHistory = () => 
  globalErrorHandler.getErrorHistory();

export const getErrorStats = () => 
  globalErrorHandler.getErrorStats();

export const clearErrorHistory = () => 
  globalErrorHandler.clearHistory();

export const attemptErrorRecovery = (error: ErrorReport) => 
  globalErrorHandler.attemptRecovery(error);

export default globalErrorHandler;