import { useState, useCallback, useRef } from 'react';

interface LoadingStates {
  [key: string]: boolean;
}

/**
 * Hook to manage multiple loading states and prevent concurrent operations
 */
export function useLoadingStates(initialStates: string[] = []) {
  const [loadingStates, setLoadingStates] = useState<LoadingStates>(() => {
    const initial: LoadingStates = {};
    initialStates.forEach(key => {
      initial[key] = false;
    });
    return initial;
  });

  const operationQueues = useRef<Map<string, Array<() => Promise<void>>>>(new Map());

  /**
   * Set loading state for a specific operation
   */
  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading
    }));
  }, []);

  /**
   * Check if a specific operation is loading
   */
  const isLoading = useCallback((key: string): boolean => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  /**
   * Check if any operation is loading
   */
  const isAnyLoading = useCallback((): boolean => {
    return Object.values(loadingStates).some(loading => loading);
  }, [loadingStates]);

  /**
   * Execute an async operation with loading state management
   * Prevents multiple concurrent operations of the same type
   */
  const withLoading = useCallback(async <T>(
    key: string, 
    operation: () => Promise<T>,
    options: {
      preventConcurrent?: boolean;
      queueConcurrent?: boolean;
    } = {}
  ): Promise<T | null> => {
    const { preventConcurrent = true, queueConcurrent = false } = options;

    // If already loading and we should prevent concurrent operations
    if (preventConcurrent && loadingStates[key]) {
      if (queueConcurrent) {
        // Add to queue
        return new Promise((resolve, reject) => {
          const queue = operationQueues.current.get(key) || [];
          queue.push(async () => {
            try {
              const result = await operation();
              resolve(result);
            } catch (error) {
              reject(error);
            }
          });
          operationQueues.current.set(key, queue);
        });
      } else {
        // REMOVED: // REMOVED: console.log(`Operation ${key} already in progress, skipping`);
        return null;
      }
    }

    setLoading(key, true);

    try {
      const result = await operation();
      
      // Process any queued operations
      const queue = operationQueues.current.get(key);
      if (queue && queue.length > 0) {
        const nextOperation = queue.shift();
        if (nextOperation) {
          // Execute next operation after a brief delay
          setTimeout(() => nextOperation(), 50);
        }
        if (queue.length === 0) {
          operationQueues.current.delete(key);
        } else {
          operationQueues.current.set(key, queue);
        }
      }
      
      return result;
    } catch (error) {
      logger?.error(`Operation ${key} failed:`, error);
      throw error;
    } finally {
      setLoading(key, false);
    }
  }, [loadingStates, setLoading]);

  /**
   * Clear all loading states
   */
  const clearAll = useCallback(() => {
    setLoadingStates({});
    operationQueues.current.clear();
  }, []);

  /**
   * Clear specific loading state
   */
  const clear = useCallback((key: string) => {
    setLoadingStates(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
    operationQueues.current.delete(key);
  }, []);

  return {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading,
    withLoading,
    clear,
    clearAll
  };
}