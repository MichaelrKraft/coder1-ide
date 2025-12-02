'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ResilientPollingConfig {
  /** Polling function to execute */
  pollFn: () => Promise<boolean>; // Returns true on success, false on failure
  /** Initial polling interval in ms (default: 2000) */
  initialInterval?: number;
  /** Maximum polling interval in ms (default: 30000) */
  maxInterval?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Number of consecutive failures before circuit opens (default: 5) */
  maxConsecutiveFailures?: number;
  /** Maximum number of error logs before suppression (default: 10) */
  maxErrorLogs?: number;
  /** Unique identifier for this polling instance */
  pollerId: string;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
  /** Callback when circuit breaker opens */
  onCircuitOpen?: () => void;
  /** Callback when service recovers */
  onRecovery?: () => void;
}

export interface ResilientPollingState {
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Whether circuit breaker is open (polling stopped due to failures) */
  isCircuitOpen: boolean;
  /** Current number of consecutive failures */
  consecutiveFailures: number;
  /** Current polling interval in ms */
  currentInterval: number;
  /** Number of errors logged (before suppression) */
  errorLogsCount: number;
  /** Total error count (including suppressed) */
  totalErrorCount: number;
  /** Last error message */
  lastError: string | null;
}

export interface UseResilientPollingReturn extends ResilientPollingState {
  /** Manually retry polling (resets circuit breaker) */
  retry: () => void;
  /** Stop polling */
  stop: () => void;
  /** Start polling */
  start: () => void;
}

/**
 * useResilientPolling - A hook for resilient polling with exponential backoff and circuit breaker
 *
 * Features:
 * - Exponential backoff on failures (2s → 4s → 8s → 16s → 30s capped)
 * - Circuit breaker: stops polling after N consecutive failures
 * - Error log limiting: only logs first N errors, then suppresses
 * - Auto-recovery: resets on success
 * - Manual retry function for user-initiated recovery
 */
export function useResilientPolling(config: ResilientPollingConfig): UseResilientPollingReturn {
  const {
    pollFn,
    initialInterval = 2000,
    maxInterval = 30000,
    backoffMultiplier = 2,
    maxConsecutiveFailures = 5,
    maxErrorLogs = 10,
    pollerId,
    enabled = true,
    onCircuitOpen,
    onRecovery,
  } = config;

  const [state, setState] = useState<ResilientPollingState>({
    isPolling: enabled,
    isCircuitOpen: false,
    consecutiveFailures: 0,
    currentInterval: initialInterval,
    errorLogsCount: 0,
    totalErrorCount: 0,
    lastError: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasCircuitOpen = useRef(false);

  // Log error with limiting
  const logError = useCallback((message: string, error?: unknown) => {
    setState(prev => {
      const newErrorLogsCount = prev.errorLogsCount + 1;
      const newTotalErrorCount = prev.totalErrorCount + 1;

      if (newErrorLogsCount <= maxErrorLogs) {
        console.error(`[${pollerId}] ${message}`, error);
      } else if (newErrorLogsCount === maxErrorLogs + 1) {
        console.error(`[${pollerId}] Further errors suppressed (${newTotalErrorCount}+ occurred)`);
      }
      // After maxErrorLogs + 1, we're completely silent

      return {
        ...prev,
        errorLogsCount: newErrorLogsCount,
        totalErrorCount: newTotalErrorCount,
        lastError: message,
      };
    });
  }, [pollerId, maxErrorLogs]);

  // Execute poll with error handling
  const executePoll = useCallback(async () => {
    try {
      const success = await pollFn();

      if (success) {
        // Reset on success
        setState(prev => {
          const wasOpen = prev.isCircuitOpen;
          if (wasOpen && onRecovery) {
            onRecovery();
          }
          return {
            ...prev,
            consecutiveFailures: 0,
            currentInterval: initialInterval,
            isCircuitOpen: false,
            errorLogsCount: 0, // Reset error log count on success
            lastError: null,
          };
        });
      } else {
        // Handle failure
        setState(prev => {
          const newFailures = prev.consecutiveFailures + 1;
          const shouldOpenCircuit = newFailures >= maxConsecutiveFailures;
          const newInterval = Math.min(
            prev.currentInterval * backoffMultiplier,
            maxInterval
          );

          if (shouldOpenCircuit && !prev.isCircuitOpen && onCircuitOpen) {
            onCircuitOpen();
          }

          return {
            ...prev,
            consecutiveFailures: newFailures,
            currentInterval: newInterval,
            isCircuitOpen: shouldOpenCircuit,
          };
        });

        logError('Poll returned failure');
      }
    } catch (error) {
      // Handle exception
      setState(prev => {
        const newFailures = prev.consecutiveFailures + 1;
        const shouldOpenCircuit = newFailures >= maxConsecutiveFailures;
        const newInterval = Math.min(
          prev.currentInterval * backoffMultiplier,
          maxInterval
        );

        if (shouldOpenCircuit && !prev.isCircuitOpen && onCircuitOpen) {
          onCircuitOpen();
        }

        return {
          ...prev,
          consecutiveFailures: newFailures,
          currentInterval: newInterval,
          isCircuitOpen: shouldOpenCircuit,
        };
      });

      logError('Poll error:', error);
    }
  }, [pollFn, initialInterval, maxInterval, backoffMultiplier, maxConsecutiveFailures, onCircuitOpen, onRecovery, logError]);

  // Set up polling interval
  useEffect(() => {
    if (!enabled || !state.isPolling || state.isCircuitOpen) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Execute immediately on first run
    executePoll();

    // Set up interval
    intervalRef.current = setInterval(executePoll, state.currentInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, state.isPolling, state.isCircuitOpen, state.currentInterval, executePoll]);

  // Retry function - resets circuit breaker and restarts polling
  const retry = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPolling: true,
      isCircuitOpen: false,
      consecutiveFailures: 0,
      currentInterval: initialInterval,
      errorLogsCount: 0,
      lastError: null,
    }));
  }, [initialInterval]);

  // Stop polling
  const stop = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPolling: false,
    }));
  }, []);

  // Start polling
  const start = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPolling: true,
      isCircuitOpen: false,
      consecutiveFailures: 0,
      currentInterval: initialInterval,
      errorLogsCount: 0,
    }));
  }, [initialInterval]);

  return {
    ...state,
    retry,
    stop,
    start,
  };
}

export default useResilientPolling;
