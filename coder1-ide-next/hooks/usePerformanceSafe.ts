/**
 * usePerformanceSafe - React hook for safe component lifecycle management
 * Prevents memory leaks and runaway intervals
 */

import { useEffect, useRef, useCallback } from 'react';
import { 
  createSafeInterval, 
  clearSafeInterval, 
  createSafeTimeout, 
  clearSafeTimeout, 
  registerComponent, 
  unregisterComponent 
} from '@/lib/performance-monitor';

export function usePerformanceSafe(componentName: string) {
  const isMountedRef = useRef(true);
  const intervalsRef = useRef<Set<number>>(new Set());
  const timeoutsRef = useRef<Set<number>>(new Set());

  // Register component on mount
  useEffect(() => {
    isMountedRef.current = true;
    registerComponent(componentName);
    
    return () => {
      isMountedRef.current = false;
      
      // Clear all intervals and timeouts created by this component
      intervalsRef.current.forEach(id => clearSafeInterval(id));
      timeoutsRef.current.forEach(id => clearSafeTimeout(id));
      intervalsRef.current.clear();
      timeoutsRef.current.clear();
      
      // Unregister component
      unregisterComponent(componentName);
    };
  }, [componentName]);

  const safeInterval = useCallback((
    callback: () => void,
    delay: number,
    description: string
  ): number => {
    if (!isMountedRef.current) {
      logger?.warn(`[${componentName}] Attempted to create interval on unmounted component`);
      return -1;
    }

    const intervalId = createSafeInterval(callback, delay, componentName, description);
    intervalsRef.current.add(intervalId);
    
    return intervalId;
  }, [componentName]);

  const safeClearInterval = useCallback((intervalId: number): void => {
    clearSafeInterval(intervalId);
    intervalsRef.current.delete(intervalId);
  }, []);

  const safeTimeout = useCallback((
    callback: () => void,
    delay: number,
    description: string
  ): number => {
    if (!isMountedRef.current) {
      logger?.warn(`[${componentName}] Attempted to create timeout on unmounted component`);
      return -1;
    }

    const timeoutId = createSafeTimeout(callback, delay, componentName, description);
    timeoutsRef.current.add(timeoutId);
    
    return timeoutId;
  }, [componentName]);

  const safeClearTimeout = useCallback((timeoutId: number): void => {
    clearSafeTimeout(timeoutId);
    timeoutsRef.current.delete(timeoutId);
  }, []);

  const isMounted = useCallback((): boolean => {
    return isMountedRef.current;
  }, []);

  const safeSetState = useCallback((setter: () => void): void => {
    if (!isMountedRef.current) {
      logger?.warn(`[${componentName}] Attempted setState on unmounted component`);
      return;
    }
    setter();
  }, [componentName]);

  return {
    isMounted,
    safeInterval,
    safeClearInterval,
    safeTimeout,
    safeClearTimeout,
    safeSetState
  };
}