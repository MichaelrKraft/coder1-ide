/**
 * useMetricsTracking Hook
 * Client-side hook for tracking performance metrics
 * Phase 0 - Safe, read-only tracking
 */

import { useEffect, useCallback } from 'react';

export function useMetricsTracking() {
  /**
   * Track API call performance
   */
  const trackApiCall = useCallback(async (
    endpoint: string,
    apiCall: () => Promise<any>
  ): Promise<any> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      // Track successful API call
      fetch('/api/metrics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'api-response',
          endpoint,
          value: duration
        })
      }).catch(() => {}); // Fire and forget
      
      // Track request
      fetch('/api/metrics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'request' })
      }).catch(() => {});
      
      return result;
      
    } catch (error) {
      // Track error
      fetch('/api/metrics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'error' })
      }).catch(() => {});
      
      throw error;
    }
  }, []);
  
  /**
   * Track component render time
   */
  const trackRenderTime = useCallback((componentName: string) => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      
      // Only track if render took more than 10ms
      if (duration > 10) {
        fetch('/api/metrics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'render-time',
            value: duration
          })
        }).catch(() => {});
      }
    };
  }, []);
  
  /**
   * Track session creation
   */
  const trackSessionCreation = useCallback((duration: number) => {
    fetch('/api/metrics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'session-creation',
        value: duration
      })
    }).catch(() => {});
  }, []);
  
  /**
   * Track generic error
   */
  const trackError = useCallback(() => {
    fetch('/api/metrics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'error' })
    }).catch(() => {});
  }, []);
  
  /**
   * Set up global error tracking
   */
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError();
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError();
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError]);
  
  return {
    trackApiCall,
    trackRenderTime,
    trackSessionCreation,
    trackError
  };
}