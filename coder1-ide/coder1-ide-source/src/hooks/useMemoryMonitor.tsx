// Stub file - performance monitoring removed to fix terminal issues
import { useState } from 'react';

interface MemoryUsage {
  usedJSMemorySize?: number;
  totalJSMemorySize?: number;
  limitJSMemorySize?: number;
}

const useMemoryMonitor = (interval: number = 10000) => {
  const [memoryUsage] = useState<MemoryUsage[]>([]);
  const [averageMemoryUsage] = useState(0);
  const [memoryTrend] = useState<'stable' | 'increasing' | 'decreasing'>('stable');
  
  return {
    memoryUsage,
    averageMemoryUsage,
    memoryTrend
  };
};

export default useMemoryMonitor;