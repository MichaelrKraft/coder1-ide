/**
 * Memory Optimizer Service for Alpha Deployment
 * 
 * Aggressively manages memory to stay within 512MB limit on Render Starter plan.
 * Monitors usage, triggers cleanup, and manages process lifecycle.
 */

const { EventEmitter } = require('events');

class MemoryOptimizer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration for 512MB limit
    this.config = {
      maxHeapMB: options.maxHeapMB || 400,
      warningThresholdMB: options.warningThresholdMB || 300,
      panicThresholdMB: options.panicThresholdMB || 380,
      checkIntervalMs: options.checkIntervalMs || 10000, // Check every 10 seconds
      ...options
    };
    
    this.isMonitoring = false;
    this.lastCleanup = Date.now();
    this.cleanupInProgress = false;
    
    // Track what can be cleaned
    this.disposables = new Set();
    this.processPool = new Map();
    this.sessionCache = new Map();
  }

  /**
   * Start memory monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.checkMemory();
    }, this.config.checkIntervalMs);
    
    console.log('🔍 Memory optimizer started - Max heap:', this.config.maxHeapMB, 'MB');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Check current memory usage and take action if needed
   */
  async checkMemory() {
    const usage = this.getMemoryUsage();
    
    if (usage.heapUsedMB > this.config.panicThresholdMB) {
      await this.panicCleanup(usage);
    } else if (usage.heapUsedMB > this.config.warningThresholdMB) {
      await this.warningCleanup(usage);
    }
    
    // Emit metrics for monitoring
    this.emit('memory-stats', usage);
  }

  /**
   * Get current memory usage stats
   */
  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    return {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
      externalMB: Math.round(memUsage.external / 1024 / 1024),
      percentage: Math.round((memUsage.heapUsed / 1024 / 1024 / this.config.maxHeapMB) * 100),
      timestamp: Date.now()
    };
  }

  /**
   * Warning level cleanup - gentle memory recovery
   */
  async warningCleanup(usage) {
    if (this.cleanupInProgress) return;
    
    console.warn(`⚠️ Memory warning: ${usage.heapUsedMB}MB / ${this.config.maxHeapMB}MB (${usage.percentage}%)`);
    
    this.cleanupInProgress = true;
    this.emit('cleanup-start', { level: 'warning', usage });
    
    try {
      // 1. Clear caches
      this.clearCaches();
      
      // 2. Close idle processes
      await this.closeIdleProcesses();
      
      // 3. Compact session data
      await this.compactSessions();
      
      // 4. Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
    } catch (error) {
      console.error('Warning cleanup error:', error);
    } finally {
      this.cleanupInProgress = false;
      this.lastCleanup = Date.now();
      this.emit('cleanup-end', { level: 'warning', usage: this.getMemoryUsage() });
    }
  }

  /**
   * Panic level cleanup - aggressive memory recovery
   */
  async panicCleanup(usage) {
    console.error(`🚨 Memory panic: ${usage.heapUsedMB}MB / ${this.config.maxHeapMB}MB (${usage.percentage}%)`);
    
    this.emit('cleanup-start', { level: 'panic', usage });
    
    try {
      // 1. Kill all non-essential processes
      await this.killAllProcesses();
      
      // 2. Clear ALL caches
      this.clearAllCaches();
      
      // 3. Reduce terminal buffers
      this.reduceBuffers();
      
      // 4. Queue new requests
      this.emit('queue-requests', true);
      
      // 5. Force multiple GC cycles
      if (global.gc) {
        global.gc();
        await this.delay(100);
        global.gc();
      }
      
      // 6. If still critical, trigger restart
      const newUsage = this.getMemoryUsage();
      if (newUsage.heapUsedMB > this.config.panicThresholdMB) {
        console.error('🔄 Memory critical - requesting restart');
        this.emit('request-restart');
      }
      
    } catch (error) {
      console.error('Panic cleanup error:', error);
    } finally {
      this.emit('cleanup-end', { level: 'panic', usage: this.getMemoryUsage() });
    }
  }

  /**
   * Clear non-essential caches
   */
  clearCaches() {
    let cleared = 0;
    
    // Clear session cache except active sessions
    for (const [key, session] of this.sessionCache) {
      if (!session.active) {
        this.sessionCache.delete(key);
        cleared++;
      }
    }
    
    // Clear disposable objects
    for (const disposable of this.disposables) {
      if (disposable.dispose) {
        disposable.dispose();
      }
    }
    this.disposables.clear();
    
    console.log(`🧹 Cleared ${cleared} cached items`);
  }

  /**
   * Clear ALL caches (panic mode)
   */
  clearAllCaches() {
    this.sessionCache.clear();
    this.disposables.clear();
    
    // Clear require cache for non-essential modules
    Object.keys(require.cache).forEach(key => {
      if (key.includes('node_modules') && !key.includes('critical')) {
        delete require.cache[key];
      }
    });
    
    console.log('🧹 Cleared ALL caches');
  }

  /**
   * Close idle Claude CLI processes
   */
  async closeIdleProcesses() {
    const now = Date.now();
    const idleThreshold = 60000; // 1 minute
    let closed = 0;
    
    for (const [id, process] of this.processPool) {
      if (now - process.lastActivity > idleThreshold) {
        try {
          if (process.pty && process.pty.kill) {
            process.pty.kill();
          }
          this.processPool.delete(id);
          closed++;
        } catch (error) {
          console.error(`Failed to close process ${id}:`, error);
        }
      }
    }
    
    if (closed > 0) {
      console.log(`🔚 Closed ${closed} idle processes`);
    }
  }

  /**
   * Kill all processes (panic mode)
   */
  async killAllProcesses() {
    for (const [id, process] of this.processPool) {
      try {
        if (process.pty && process.pty.kill) {
          process.pty.kill('SIGKILL');
        }
      } catch (error) {
        console.error(`Failed to kill process ${id}:`, error);
      }
    }
    this.processPool.clear();
    console.log('💀 Killed all processes');
  }

  /**
   * Compact session data to reduce memory
   */
  async compactSessions() {
    for (const [id, session] of this.sessionCache) {
      if (session.history && session.history.length > 100) {
        // Keep only recent history
        session.history = session.history.slice(-50);
      }
      
      // Clear large objects
      if (session.tempData) {
        delete session.tempData;
      }
    }
  }

  /**
   * Reduce terminal and other buffers
   */
  reduceBuffers() {
    // This would integrate with your terminal service
    this.emit('reduce-buffers', { maxSize: 5000 });
  }

  /**
   * Register a disposable resource
   */
  registerDisposable(resource) {
    this.disposables.add(resource);
  }

  /**
   * Register a process for tracking
   */
  registerProcess(id, process) {
    this.processPool.set(id, {
      ...process,
      lastActivity: Date.now()
    });
  }

  /**
   * Update process activity timestamp
   */
  updateProcessActivity(id) {
    const process = this.processPool.get(id);
    if (process) {
      process.lastActivity = Date.now();
    }
  }

  /**
   * Register a session for tracking
   */
  registerSession(id, session) {
    this.sessionCache.set(id, {
      ...session,
      active: true
    });
  }

  /**
   * Mark session as inactive
   */
  deactivateSession(id) {
    const session = this.sessionCache.get(id);
    if (session) {
      session.active = false;
    }
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get memory statistics for monitoring
   */
  getStats() {
    const usage = this.getMemoryUsage();
    return {
      ...usage,
      processCount: this.processPool.size,
      sessionCount: this.sessionCache.size,
      disposableCount: this.disposables.size,
      lastCleanup: this.lastCleanup,
      status: usage.percentage > 90 ? 'critical' : 
              usage.percentage > 75 ? 'warning' : 'healthy'
    };
  }
}

// Singleton instance
let optimizer = null;

function getMemoryOptimizer(options) {
  if (!optimizer) {
    optimizer = new MemoryOptimizer(options);
    
    // Enable GC if available
    if (global.gc) {
      console.log('✅ Manual GC enabled');
    } else {
      console.log('⚠️ Manual GC not available - start with --expose-gc flag');
    }
  }
  return optimizer;
}

module.exports = { MemoryOptimizer, getMemoryOptimizer };