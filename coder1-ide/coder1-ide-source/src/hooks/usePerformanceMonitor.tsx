import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  renderTime: number;
  lastRenderTime: number;
  averageRenderTime: number;
  componentName: string;
}

interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  logThreshold?: number; // Log if render time exceeds this (ms)
  trackRenderCount?: boolean;
}

export const usePerformanceMonitor = (
  componentName: string,
  options: UsePerformanceMonitorOptions = {}
): PerformanceMetrics => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    logThreshold = 10,
    trackRenderCount = true
  } = options;

  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastRenderStartRef = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    renderTime: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    componentName
  });

  // Track render start
  useEffect(() => {
    if (!enabled) return;
    
    lastRenderStartRef.current = performance.now();
    
    if (trackRenderCount) {
      renderCountRef.current += 1;
    }
  });

  // Track render end and calculate metrics
  useEffect(() => {
    if (!enabled) return;
    
    const renderTime = performance.now() - lastRenderStartRef.current;
    renderTimesRef.current.push(renderTime);
    
    // Keep only last 100 render times to prevent memory growth
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current = renderTimesRef.current.slice(-100);
    }
    
    const averageRenderTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length;
    
    // Log slow renders
    if (renderTime > logThreshold) {
      console.warn(`🐌 Slow render in ${componentName}: ${renderTime.toFixed(2)}ms (avg: ${averageRenderTime.toFixed(2)}ms)`);
    }
    
    setMetrics({
      renderCount: renderCountRef.current,
      renderTime,
      lastRenderTime: renderTime,
      averageRenderTime,
      componentName
    });
  });

  return metrics;
};

// Hook for monitoring component mount/unmount performance
export const useMountPerformance = (componentName: string, enabled = process.env.NODE_ENV === 'development') => {
  const mountTimeRef = useRef<number>(0);
  
  useEffect(() => {
    if (!enabled) return;
    
    mountTimeRef.current = performance.now();
    
    return () => {
      const unmountTime = performance.now() - mountTimeRef.current;
      console.log(`🔄 ${componentName} lifecycle: ${unmountTime.toFixed(2)}ms`);
    };
  }, [componentName, enabled]);
  
  return mountTimeRef.current;
};

// Hook for monitoring heavy computations
export const useComputationMonitor = (computationName: string, enabled = process.env.NODE_ENV === 'development') => {
  const [isComputing, setIsComputing] = useState(false);
  const [lastComputationTime, setLastComputationTime] = useState(0);
  
  const startComputation = () => {
    if (!enabled) return Date.now();
    
    setIsComputing(true);
    return performance.now();
  };
  
  const endComputation = (startTime: number) => {
    if (!enabled) return;
    
    const computationTime = performance.now() - startTime;
    setLastComputationTime(computationTime);
    setIsComputing(false);
    
    if (computationTime > 5) { // Log computations over 5ms
      console.log(`🧮 ${computationName}: ${computationTime.toFixed(2)}ms`);
    }
  };
  
  return {
    isComputing,
    lastComputationTime,
    startComputation,
    endComputation
  };
};

export default usePerformanceMonitor;