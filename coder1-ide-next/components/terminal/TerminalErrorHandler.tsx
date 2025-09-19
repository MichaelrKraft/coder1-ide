/**
 * Terminal Error Handler
 * 
 * Comprehensive error handling for terminal operations
 * Includes retry logic, graceful degradation, and user feedback
 */

import React, { useState, useCallback, useRef } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Clock } from '@/lib/icons';

interface TerminalError {
  type: 'connection' | 'session' | 'socket' | 'xterm' | 'backend' | 'timeout';
  message: string;
  details?: string;
  timestamp: Date;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface TerminalErrorHandlerProps {
  onRetry?: () => void;
  onReset?: () => void;
  onFallback?: () => void;
  maxRetries?: number;
  retryDelay?: number;
}

export class TerminalErrorManager {
  private errors: TerminalError[] = [];
  private retryCount = 0;
  private maxRetries: number;
  private retryDelay: number;
  private retryTimeouts = new Map<string, NodeJS.Timeout>();
  private errorCallbacks = new Map<string, (error: TerminalError) => void>();

  constructor(maxRetries = 3, retryDelay = 1000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Add error callback handler
   */
  onError(type: TerminalError['type'], callback: (error: TerminalError) => void) {
    this.errorCallbacks.set(type, callback);
  }

  /**
   * Handle different types of errors
   */
  handleError(type: TerminalError['type'], message: string, details?: string): boolean {
    const error: TerminalError = {
      type,
      message,
      details,
      timestamp: new Date(),
      retryable: this.isRetryable(type),
      severity: this.getSeverity(type)
    };

    this.errors.push(error);
    console.error(`[Terminal Error] ${type}: ${message}`, details ? { details } : '');

    // Call specific error handler if registered
    const callback = this.errorCallbacks.get(type);
    if (callback) {
      callback(error);
    }

    // Attempt auto-recovery for retryable errors
    if (error.retryable && this.retryCount < this.maxRetries) {
      return this.attemptRetry(type, error);
    }

    // Log critical errors for monitoring
    if (error.severity === 'critical') {
      this.logCriticalError(error);
    }

    return false;
  }

  /**
   * Check if error type is retryable
   */
  private isRetryable(type: TerminalError['type']): boolean {
    switch (type) {
      case 'connection':
      case 'socket':
      case 'backend':
      case 'timeout':
        return true;
      case 'session':
      case 'xterm':
        return false;
      default:
        return false;
    }
  }

  /**
   * Get error severity level
   */
  private getSeverity(type: TerminalError['type']): TerminalError['severity'] {
    switch (type) {
      case 'connection':
      case 'socket':
        return 'high';
      case 'session':
        return 'critical';
      case 'xterm':
        return 'critical';
      case 'backend':
        return 'medium';
      case 'timeout':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Attempt automatic retry with exponential backoff
   */
  private attemptRetry(type: TerminalError['type'], error: TerminalError): boolean {
    const retryKey = `${type}-${Date.now()}`;
    const delay = this.retryDelay * Math.pow(2, this.retryCount);

    console.log(`[Terminal Error] Retrying ${type} in ${delay}ms (attempt ${this.retryCount + 1}/${this.maxRetries})`);

    const timeout = setTimeout(() => {
      this.retryCount++;
      
      // Trigger retry based on error type
      switch (type) {
        case 'connection':
          this.triggerConnectionRetry();
          break;
        case 'socket':
          this.triggerSocketRetry();
          break;
        case 'backend':
          this.triggerBackendRetry();
          break;
        case 'timeout':
          this.triggerTimeoutRetry();
          break;
      }

      this.retryTimeouts.delete(retryKey);
    }, delay);

    this.retryTimeouts.set(retryKey, timeout);
    return true;
  }

  /**
   * Trigger connection retry
   */
  private triggerConnectionRetry() {
    // Emit custom event for connection retry
    window.dispatchEvent(new CustomEvent('terminal:retry:connection'));
  }

  /**
   * Trigger socket retry
   */
  private triggerSocketRetry() {
    // Emit custom event for socket retry
    window.dispatchEvent(new CustomEvent('terminal:retry:socket'));
  }

  /**
   * Trigger backend retry
   */
  private triggerBackendRetry() {
    // Emit custom event for backend retry
    window.dispatchEvent(new CustomEvent('terminal:retry:backend'));
  }

  /**
   * Trigger timeout retry
   */
  private triggerTimeoutRetry() {
    // Emit custom event for timeout retry
    window.dispatchEvent(new CustomEvent('terminal:retry:timeout'));
  }

  /**
   * Log critical error for monitoring
   */
  private logCriticalError(error: TerminalError) {
    // In production, this would send to monitoring service
    console.error('[Terminal Critical Error]', {
      type: error.type,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp,
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Could integrate with services like Sentry, LogRocket, etc.
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'terminal_critical_error', {
        error_type: error.type,
        error_message: error.message
      });
    }
  }

  /**
   * Reset error state
   */
  reset() {
    this.errors = [];
    this.retryCount = 0;
    
    // Clear all retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    
    console.log('[Terminal Error] Error state reset');
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): TerminalError[] {
    return this.errors.slice(-limit);
  }

  /**
   * Get error summary
   */
  getErrorSummary() {
    const errorsByType = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const criticalErrors = this.errors.filter(e => e.severity === 'critical').length;
    const recentErrors = this.errors.filter(e => 
      Date.now() - e.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    ).length;

    return {
      total: this.errors.length,
      critical: criticalErrors,
      recent: recentErrors,
      byType: errorsByType,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    };
  }

  /**
   * Check if terminal is in error state
   */
  isInErrorState(): boolean {
    const recentCritical = this.errors.filter(e => 
      e.severity === 'critical' && 
      Date.now() - e.timestamp.getTime() < 2 * 60 * 1000 // Last 2 minutes
    );
    
    return recentCritical.length > 0 || this.retryCount >= this.maxRetries;
  }
}

/**
 * Terminal Error Handler Component
 */
export default function TerminalErrorHandler({ 
  onRetry, 
  onReset, 
  onFallback,
  maxRetries = 3,
  retryDelay = 1000 
}: TerminalErrorHandlerProps) {
  const [errors, setErrors] = useState<TerminalError[]>([]);
  const [retrying, setRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const errorManagerRef = useRef<TerminalErrorManager | null>(null);

  // Initialize error manager
  React.useEffect(() => {
    errorManagerRef.current = new TerminalErrorManager(maxRetries, retryDelay);
    
    // Setup error listeners
    const handleError = (error: TerminalError) => {
      setErrors(prev => [...prev.slice(-9), error]); // Keep last 10 errors
    };

    errorManagerRef.current.onError('connection', handleError);
    errorManagerRef.current.onError('session', handleError);
    errorManagerRef.current.onError('socket', handleError);
    errorManagerRef.current.onError('xterm', handleError);
    errorManagerRef.current.onError('backend', handleError);
    errorManagerRef.current.onError('timeout', handleError);

    // Setup retry listeners
    const retryEvents = [
      'terminal:retry:connection',
      'terminal:retry:socket', 
      'terminal:retry:backend',
      'terminal:retry:timeout'
    ];

    const handleRetryEvent = () => {
      setRetrying(true);
      setTimeout(() => setRetrying(false), 2000);
      if (onRetry) onRetry();
    };

    retryEvents.forEach(event => {
      window.addEventListener(event, handleRetryEvent);
    });

    return () => {
      retryEvents.forEach(event => {
        window.removeEventListener(event, handleRetryEvent);
      });
    };
  }, [maxRetries, retryDelay, onRetry]);

  /**
   * Handle manual retry
   */
  const handleRetry = useCallback(() => {
    if (errorManagerRef.current) {
      errorManagerRef.current.reset();
      setErrors([]);
    }
    if (onRetry) onRetry();
  }, [onRetry]);

  /**
   * Handle reset
   */
  const handleReset = useCallback(() => {
    if (errorManagerRef.current) {
      errorManagerRef.current.reset();
      setErrors([]);
    }
    if (onReset) onReset();
  }, [onReset]);

  /**
   * Get error icon
   */
  const getErrorIcon = (type: TerminalError['type']) => {
    switch (type) {
      case 'connection':
      case 'socket':
        return <WifiOff className="w-4 h-4" />;
      case 'timeout':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  /**
   * Get error color
   */
  const getErrorColor = (severity: TerminalError['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  if (errors.length === 0) {
    return null;
  }

  const latestError = errors[errors.length - 1];
  const errorSummary = errorManagerRef.current?.getErrorSummary();

  return (
    <div className="absolute top-4 right-4 z-50 max-w-md">
      {/* Error Toast */}
      <div className="bg-bg-secondary border border-red-500/30 rounded-lg p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${getErrorColor(latestError.severity)}`}>
            {getErrorIcon(latestError.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-text-primary">
                Terminal Error
              </h4>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-text-secondary hover:text-text-primary text-xs"
              >
                {showDetails ? 'Hide' : 'Details'}
              </button>
            </div>
            
            <p className="text-sm text-text-secondary mt-1">
              {latestError.message}
            </p>

            {showDetails && (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-text-tertiary">
                  <div>Type: {latestError.type}</div>
                  <div>Time: {latestError.timestamp.toLocaleTimeString()}</div>
                  {latestError.details && (
                    <div>Details: {latestError.details}</div>
                  )}
                  {errorSummary && (
                    <div>Retries: {errorSummary.retryCount}/{errorSummary.maxRetries}</div>
                  )}
                </div>
                
                {errors.length > 1 && (
                  <div className="text-xs text-text-tertiary">
                    Recent errors: {errors.length}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded border border-blue-500/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying...' : 'Retry'}
              </button>
              
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded border border-orange-500/30 transition-colors"
              >
                Reset
              </button>
              
              {onFallback && (
                <button
                  onClick={onFallback}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded border border-purple-500/30 transition-colors"
                >
                  Fallback
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export the error manager for use in terminal components
export { TerminalErrorManager };