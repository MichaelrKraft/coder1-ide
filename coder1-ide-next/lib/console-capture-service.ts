/**
 * Console Capture Service - Phase 1: Safe Console Monitoring
 * 
 * Captures console.error, console.warn, and console.log calls
 * with memory management and easy rollback capabilities.
 */

export interface CapturedConsoleError {
  id: string;
  type: 'error' | 'warn' | 'log' | 'info';
  message: string;
  timestamp: string;
  stack?: string;
  args: any[];
}

class ConsoleCaptureService {
  private errors: CapturedConsoleError[] = [];
  private isActive = false;
  private originalMethods: { [key: string]: Function } = {};
  private readonly MAX_ERRORS = 50; // Prevent memory leaks
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private cleanupTimer?: NodeJS.Timeout;
  private captureAll = false; // Toggle to capture all console types

  constructor() {
    // Store original console methods for safe restoration
    this.originalMethods = {
      error: console.error,
      warn: console.warn,
      log: console.log,
      info: console.info
    };
  }

  /**
   * Start capturing console errors
   */
  start(): void {
    if (this.isActive) return;

    console.log('🔍 Console Capture Service: Starting error monitoring');
    
    this.isActive = true;
    this.interceptConsole();
    this.startCleanupTimer();
  }

  /**
   * Stop capturing and restore original console methods
   */
  stop(): void {
    if (!this.isActive) return;

    console.log('🔍 Console Capture Service: Stopping error monitoring');
    
    this.isActive = false;
    this.restoreConsole();
    this.stopCleanupTimer();
  }

  /**
   * Safely intercept console methods
   */
  private interceptConsole(): void {
    const methodsToCapture = ['error', 'warn', 'log', 'info'] as const;
    
    methodsToCapture.forEach(method => {
      const original = this.originalMethods[method];
      
      (console as any)[method] = (...args: any[]) => {
        // Always call original method first (non-blocking)
        try {
          original.apply(console, args);
        } catch (e) {
          // Fallback - ensure original console still works
        }

        // Then capture for Error Doctor (with error handling)
        try {
          this.captureConsoleCall(method, args);
        } catch (e) {
          // Silent failure - don't break user's console
        }
      };
    });
  }

  /**
   * Restore original console methods
   */
  private restoreConsole(): void {
    Object.keys(this.originalMethods).forEach(method => {
      (console as any)[method] = this.originalMethods[method];
    });
  }

  /**
   * Set whether to capture all console types or just errors/warnings
   */
  setCaptureAll(captureAll: boolean): void {
    this.captureAll = captureAll;
    console.log(`🔍 Console Capture: ${captureAll ? 'Capturing ALL types' : 'Capturing errors/warnings only'}`);
  }
  
  /**
   * Enable debug mode (captures all console output)
   */
  enableDebugMode(): void {
    this.setCaptureAll(true);
  }
  
  /**
   * Capture a console call
   */
  private captureConsoleCall(type: CapturedConsoleError['type'], args: any[]): void {
    // Only capture errors and warnings by default (reduce noise)
    // Unless captureAll is enabled (debug mode)
    if (!this.captureAll && type !== 'error' && type !== 'warn') return;

    const error: CapturedConsoleError = {
      id: Math.random().toString(36).substring(2, 15),
      type,
      message: args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' '),
      timestamp: new Date().toISOString(),
      stack: new Error().stack,
      args: args.slice(0, 5) // Limit to prevent memory issues
    };

    this.errors.push(error);
    this.enforceMemoryLimits();
  }

  /**
   * Prevent memory leaks by limiting stored errors
   */
  private enforceMemoryLimits(): void {
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors = this.errors.slice(-this.MAX_ERRORS);
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      this.errors = this.errors.filter(error => error.timestamp > oneHourAgo);
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get all captured errors
   */
  getErrors(): CapturedConsoleError[] {
    return [...this.errors]; // Return copy to prevent mutations
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: CapturedConsoleError['type']): CapturedConsoleError[] {
    return this.errors.filter(error => error.type === type);
  }

  /**
   * Clear all captured errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * Check if service is active
   */
  isCapturing(): boolean {
    return this.isActive;
  }

  /**
   * Get formatted error report for Claude Code
   */
  getFormattedReport(): string {
    if (this.errors.length === 0) {
      return 'No console errors captured.';
    }

    return `CONSOLE ERROR REPORT
Generated: ${new Date().toISOString()}
Total Errors: ${this.errors.length}

${this.errors.map((error, index) => `
${index + 1}. [${error.type.toUpperCase()}] ${error.timestamp}
Message: ${error.message}
${error.stack ? `Stack: ${error.stack.split('\n')[1] || 'No stack trace'}` : ''}
---`).join('\n')}`;
  }
}

// Create singleton instance
export const consoleCaptureService = new ConsoleCaptureService();

// 🚨 AUTO-START DISABLED (Oct 23, 2025) - Prevents console spam
// The service was capturing ALL console calls (259 in Terminal.tsx alone)
// This created thousands of "Hidden" messages in browser DevTools
// To re-enable: Uncomment the code below and restart dev server
// 
// Auto-start in development mode
// if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
//   // Start capture after a short delay to avoid interfering with initial page load
//   setTimeout(() => {
//     consoleCaptureService.start();
//   }, 1000);
// }