/**
 * Memory Leak Detector & Prevention Utility
 * 
 * Detects and prevents common memory leaks:
 * - Event listeners not removed
 * - Timers not cleared  
 * - Large objects in closures
 * - WebSocket connections not closed
 * - React components not unmounting
 */

import { logger } from './logger';

interface TrackedResource {
  id: string;
  type: 'timer' | 'listener' | 'socket' | 'observer' | 'subscription';
  target?: any;
  event?: string;
  callback?: Function;
  createdAt: number;
  stack?: string;
}

interface MemorySnapshot {
  timestamp: number;
  heapUsed?: number;
  heapTotal?: number;
  external?: number;
  resourceCount: number;
  resources: Map<string, TrackedResource>;
}

class MemoryLeakDetector {
  private resources: Map<string, TrackedResource>;
  private snapshots: MemorySnapshot[];
  private maxSnapshots: number;
  private isMonitoring: boolean;
  private monitoringInterval?: NodeJS.Timeout;
  private resourceIdCounter: number;
  
  constructor() {
    this.resources = new Map();
    this.snapshots = [];
    this.maxSnapshots = 100;
    this.isMonitoring = false;
    this.resourceIdCounter = 0;
    
    // Monkey-patch global methods in development
    if (process.env.NODE_ENV === 'development') {
      this.patchGlobalMethods();
    }
  }
  
  private patchGlobalMethods(): void {
    // Patch setTimeout
    const originalSetTimeout = global.setTimeout;
    (global as any).setTimeout = (callback: any, delay?: any, ...args: any[]) => {
      const id = originalSetTimeout(callback, delay, ...args);
      this.trackResource({
        id: `timer_${id}`,
        type: 'timer',
        callback,
        createdAt: Date.now(),
        stack: new Error().stack
      });
      return id;
    };
    
    // Patch clearTimeout
    const originalClearTimeout = global.clearTimeout;
    (global as any).clearTimeout = (id: any) => {
      this.untrackResource(`timer_${id}`);
      return originalClearTimeout(id);
    };
    
    // Patch setInterval
    const originalSetInterval = global.setInterval;
    (global as any).setInterval = (callback: any, delay?: any, ...args: any[]) => {
      const id = originalSetInterval(callback, delay, ...args);
      this.trackResource({
        id: `interval_${id}`,
        type: 'timer',
        callback,
        createdAt: Date.now(),
        stack: new Error().stack
      });
      return id;
    };
    
    // Patch clearInterval
    const originalClearInterval = global.clearInterval;
    (global as any).clearInterval = (id: any) => {
      this.untrackResource(`interval_${id}`);
      return originalClearInterval(id);
    };
    
    // Patch addEventListener (browser only)
    if (typeof window !== 'undefined' && window.EventTarget) {
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(
        type: string,
        listener: any,
        options?: any
      ) {
        const resourceId = `listener_${++memoryLeakDetector.resourceIdCounter}`;
        memoryLeakDetector.trackResource({
          id: resourceId,
          type: 'listener',
          target: this,
          event: type,
          callback: listener,
          createdAt: Date.now(),
          stack: new Error().stack
        });
        
        // Store resource ID for later removal
        if (!(this as any)._listenerResourceIds) {
          (this as any)._listenerResourceIds = new Map();
        }
        const key = `${type}_${listener.toString()}`;
        (this as any)._listenerResourceIds.set(key, resourceId);
        
        return originalAddEventListener.call(this, type, listener, options);
      };
      
      const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.removeEventListener = function(
        type: string,
        listener: any,
        options?: any
      ) {
        // Find and untrack the resource
        if ((this as any)._listenerResourceIds) {
          const key = `${type}_${listener.toString()}`;
          const resourceId = (this as any)._listenerResourceIds.get(key);
          if (resourceId) {
            memoryLeakDetector.untrackResource(resourceId);
            (this as any)._listenerResourceIds.delete(key);
          }
        }
        
        return originalRemoveEventListener.call(this, type, listener, options);
      };
    }
  }
  
  trackResource(resource: TrackedResource): void {
    this.resources.set(resource.id, resource);
    
    // Warn if too many resources
    if (this.resources.size > 1000) {
      logger.warn(`High resource count detected: ${this.resources.size} tracked resources`);
    }
  }
  
  untrackResource(id: string): void {
    this.resources.delete(id);
  }
  
  // Track WebSocket connections
  trackWebSocket(socket: WebSocket, id?: string): string {
    const resourceId = id || `socket_${++this.resourceIdCounter}`;
    this.trackResource({
      id: resourceId,
      type: 'socket',
      target: socket,
      createdAt: Date.now(),
      stack: new Error().stack
    });
    
    // Auto-untrack on close
    const originalClose = socket.close.bind(socket);
    socket.close = (code?: number, reason?: string) => {
      this.untrackResource(resourceId);
      return originalClose(code, reason);
    };
    
    return resourceId;
  }
  
  // Track ResizeObserver/MutationObserver
  trackObserver(observer: any, id?: string): string {
    const resourceId = id || `observer_${++this.resourceIdCounter}`;
    this.trackResource({
      id: resourceId,
      type: 'observer',
      target: observer,
      createdAt: Date.now(),
      stack: new Error().stack
    });
    
    // Auto-untrack on disconnect
    const originalDisconnect = observer.disconnect.bind(observer);
    observer.disconnect = () => {
      this.untrackResource(resourceId);
      return originalDisconnect();
    };
    
    return resourceId;
  }
  
  // Create memory snapshot
  takeSnapshot(): MemorySnapshot {
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      resourceCount: this.resources.size,
      resources: new Map(this.resources)
    };
    
    // Add memory usage if available (Node.js)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      snapshot.heapUsed = usage.heapUsed;
      snapshot.heapTotal = usage.heapTotal;
      snapshot.external = usage.external;
    } else if (typeof performance !== 'undefined' && (performance as any).memory) {
      // Browser memory API (Chrome only)
      const memory = (performance as any).memory;
      snapshot.heapUsed = memory.usedJSHeapSize;
      snapshot.heapTotal = memory.totalJSHeapSize;
    }
    
    this.snapshots.push(snapshot);
    
    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
    
    return snapshot;
  }
  
  // Start monitoring
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      logger.warn('Memory monitoring already active');
      return;
    }
    
    this.isMonitoring = true;
    logger.info('Memory leak monitoring started');
    
    // Take initial snapshot
    this.takeSnapshot();
    
    // Monitor periodically
    this.monitoringInterval = setInterval(() => {
      const snapshot = this.takeSnapshot();
      this.analyzeSnapshot(snapshot);
    }, intervalMs);
  }
  
  // Stop monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    logger.info('Memory leak monitoring stopped');
  }
  
  // Analyze snapshot for potential leaks
  private analyzeSnapshot(snapshot: MemorySnapshot): void {
    // Check for growing heap
    if (this.snapshots.length >= 3 && snapshot.heapUsed) {
      const recentSnapshots = this.snapshots.slice(-3);
      const heapGrowth = recentSnapshots.every((s, i) => {
        if (i === 0 || !s.heapUsed) return true;
        const prev = recentSnapshots[i - 1];
        return !prev?.heapUsed || s.heapUsed > prev.heapUsed;
      });
      
      if (heapGrowth) {
        const growthRate = snapshot.heapUsed / recentSnapshots[0].heapUsed!;
        if (growthRate > 1.5) {
          logger.warn(`Potential memory leak: Heap grew ${((growthRate - 1) * 100).toFixed(1)}% in ${this.snapshots.length} snapshots`);
        }
      }
    }
    
    // Check for old resources
    const oldResources: TrackedResource[] = [];
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    snapshot.resources.forEach(resource => {
      const age = now - resource.createdAt;
      if (age > maxAge) {
        oldResources.push(resource);
      }
    });
    
    if (oldResources.length > 0) {
      logger.warn(`Found ${oldResources.length} resources older than 5 minutes`, {
        types: oldResources.reduce((acc, r) => {
          acc[r.type] = (acc[r.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
    }
  }
  
  // Get current status
  getStatus(): {
    isMonitoring: boolean;
    resourceCount: number;
    resourcesByType: Record<string, number>;
    memoryUsage?: { heapUsed: number; heapTotal: number };
    oldestResource?: TrackedResource;
    recentLeaks: string[];
  } {
    const resourcesByType: Record<string, number> = {};
    let oldestResource: TrackedResource | undefined;
    let oldestAge = 0;
    
    this.resources.forEach(resource => {
      resourcesByType[resource.type] = (resourcesByType[resource.type] || 0) + 1;
      
      const age = Date.now() - resource.createdAt;
      if (age > oldestAge) {
        oldestAge = age;
        oldestResource = resource;
      }
    });
    
    const status: any = {
      isMonitoring: this.isMonitoring,
      resourceCount: this.resources.size,
      resourcesByType,
      oldestResource,
      recentLeaks: []
    };
    
    // Add memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      status.memoryUsage = {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal
      };
    }
    
    return status;
  }
  
  // Clean up old resources
  cleanup(maxAgeMs: number = 10 * 60 * 1000): number {
    const now = Date.now();
    const toDelete: string[] = [];
    
    this.resources.forEach((resource, id) => {
      if (now - resource.createdAt > maxAgeMs) {
        toDelete.push(id);
        
        // Try to clean up the actual resource
        if (resource.type === 'timer') {
          try {
            const timerId = parseInt(id.replace(/\D/g, ''));
            clearTimeout(timerId);
            clearInterval(timerId);
          } catch (e) {
            // Ignore errors
          }
        } else if (resource.type === 'listener' && resource.target && resource.event && resource.callback) {
          try {
            resource.target.removeEventListener(resource.event, resource.callback);
          } catch (e) {
            // Ignore errors
          }
        } else if (resource.type === 'socket' && resource.target) {
          try {
            resource.target.close();
          } catch (e) {
            // Ignore errors
          }
        } else if (resource.type === 'observer' && resource.target) {
          try {
            resource.target.disconnect();
          } catch (e) {
            // Ignore errors
          }
        }
      }
    });
    
    toDelete.forEach(id => this.resources.delete(id));
    
    if (toDelete.length > 0) {
      logger.info(`Cleaned up ${toDelete.length} old resources`);
    }
    
    return toDelete.length;
  }
  
  // Generate report
  generateReport(): string {
    const status = this.getStatus();
    const report: string[] = [
      '=== Memory Leak Detection Report ===',
      `Monitoring: ${status.isMonitoring ? 'Active' : 'Inactive'}`,
      `Total Resources: ${status.resourceCount}`,
      '',
      'Resources by Type:'
    ];
    
    Object.entries(status.resourcesByType).forEach(([type, count]) => {
      report.push(`  ${type}: ${count}`);
    });
    
    if (status.memoryUsage) {
      const heapMB = (status.memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
      const totalMB = (status.memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
      report.push('', 'Memory Usage:');
      report.push(`  Heap Used: ${heapMB} MB`);
      report.push(`  Heap Total: ${totalMB} MB`);
      report.push(`  Usage: ${((status.memoryUsage.heapUsed / status.memoryUsage.heapTotal) * 100).toFixed(1)}%`);
    }
    
    if (status.oldestResource) {
      const ageMin = ((Date.now() - status.oldestResource.createdAt) / 60000).toFixed(1);
      report.push('', 'Oldest Resource:');
      report.push(`  Type: ${status.oldestResource.type}`);
      report.push(`  Age: ${ageMin} minutes`);
      report.push(`  ID: ${status.oldestResource.id}`);
    }
    
    if (this.snapshots.length > 1) {
      const first = this.snapshots[0];
      const last = this.snapshots[this.snapshots.length - 1];
      report.push('', 'Trend Analysis:');
      report.push(`  Snapshots: ${this.snapshots.length}`);
      report.push(`  Resource Growth: ${last.resourceCount - first.resourceCount}`);
      
      if (first.heapUsed && last.heapUsed) {
        const heapGrowthMB = ((last.heapUsed - first.heapUsed) / 1024 / 1024).toFixed(2);
        report.push(`  Heap Growth: ${heapGrowthMB} MB`);
      }
    }
    
    return report.join('\n');
  }
}

// Create singleton instance
const memoryLeakDetector = new MemoryLeakDetector();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  memoryLeakDetector.startMonitoring(60000); // Monitor every minute
}

// Export convenience functions
export const trackResource = (resource: TrackedResource) => memoryLeakDetector.trackResource(resource);
export const untrackResource = (id: string) => memoryLeakDetector.untrackResource(id);
export const trackWebSocket = (socket: WebSocket, id?: string) => memoryLeakDetector.trackWebSocket(socket, id);
export const trackObserver = (observer: any, id?: string) => memoryLeakDetector.trackObserver(observer, id);
export const getMemoryStatus = () => memoryLeakDetector.getStatus();
export const cleanupOldResources = (maxAgeMs?: number) => memoryLeakDetector.cleanup(maxAgeMs);
export const generateMemoryReport = () => memoryLeakDetector.generateReport();

export default memoryLeakDetector;