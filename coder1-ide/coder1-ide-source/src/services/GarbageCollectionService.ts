// Stub file - performance monitoring removed to fix terminal issues
interface GCMetrics {
  totalCleanups: number;
  activeCleanups: number;
  lastGCTime: number;
  gcDuration: number;
  memoryFreed: number;
  errors: number;
}

class GarbageCollectionService {
  registerCleanup(id: string, cleanup: () => void, priority?: string, description?: string): void {}
  unregisterCleanup(id: string): boolean { return true; }
  forceGC(): Promise<GCMetrics> {
    return Promise.resolve({
      totalCleanups: 0,
      activeCleanups: 0,
      lastGCTime: 0,
      gcDuration: 0,
      memoryFreed: 0,
      errors: 0
    });
  }
  getMetrics(): GCMetrics {
    return {
      totalCleanups: 0,
      activeCleanups: 0,
      lastGCTime: 0,
      gcDuration: 0,
      memoryFreed: 0,
      errors: 0
    };
  }
  updateConfig(config: any): void {}
  cleanup(): void {}
}

const garbageCollectionService = new GarbageCollectionService();
export default garbageCollectionService;
export type { GCMetrics };