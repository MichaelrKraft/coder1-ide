/**
 * Smart Performance Optimization
 * 
 * Intelligent performance optimization for the AI enhancement systems.
 * Manages resource usage, caching, hibernation, and system optimization.
 * 
 * Core Philosophy: Simplicity = Magic
 * - Intelligent resource management
 * - Adaptive performance tuning
 * - Seamless hibernation and wake-up
 * - Smart caching strategies
 */

const { EventEmitter } = require('events');

class PerformanceOptimizer extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.memorySystem = options.memorySystem;
        this.contextBuilder = options.contextBuilder;
        this.proactiveIntelligence = options.proactiveIntelligence;
        this.approvalWorkflows = options.approvalWorkflows;
        
        // Configuration
        this.config = {
            hibernationThreshold: options.hibernationThreshold || 600000, // 10 minutes
            cacheMaxSize: options.cacheMaxSize || 1000, // Max cached items
            cacheMaxAge: options.cacheMaxAge || 3600000, // 1 hour
            memoryThreshold: options.memoryThreshold || 0.8, // 80% memory usage
            cleanupInterval: options.cleanupInterval || 300000, // 5 minutes
            performanceMonitoringEnabled: options.performanceMonitoringEnabled !== false
        };
        
        // State management
        this.state = {
            isHibernating: false,
            hibernationStartTime: null,
            performanceMode: 'normal', // normal, performance, power-save
            lastActivity: Date.now(),
            systemLoad: 'low' // low, medium, high
        };
        
        // Performance caches
        this.caches = {
            contextCache: new Map(),
            memoryQueryCache: new Map(),
            suggestionCache: new Map(),
            analysisCache: new Map()
        };
        
        // Performance metrics
        this.metrics = {
            hibernationCount: 0,
            cacheHits: 0,
            cacheMisses: 0,
            memoryOptimizations: 0,
            performanceWarnings: 0,
            systemRestarts: 0
        };
        
        // System components that can be hibernated/optimized
        this.optimizableComponents = new Map();
        
        // Initialize performance monitoring
        this.initializePerformanceMonitoring();
        
        console.log('⚡ Performance Optimizer: Initialized with intelligent resource management');
    }

    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.performMaintenance();
        }, this.config.cleanupInterval);
        
        // Monitor system performance
        if (this.config.performanceMonitoringEnabled) {
            this.performanceInterval = setInterval(() => {
                this.monitorSystemPerformance();
            }, 30000); // Every 30 seconds
        }
        
        // Listen for activity indicators
        this.setupActivityListeners();
    }

    /**
     * Setup activity listeners
     */
    setupActivityListeners() {
        // Listen for various system activities
        if (this.contextBuilder) {
            this.contextBuilder.on('contextUpdated', () => {
                this.recordActivity('context_update');
            });
        }
        
        if (this.proactiveIntelligence) {
            this.proactiveIntelligence.on('suggestionsGenerated', () => {
                this.recordActivity('suggestions_generated');
            });
        }
        
        if (this.approvalWorkflows) {
            this.approvalWorkflows.on('approvalRequested', () => {
                this.recordActivity('approval_requested');
            });
        }
    }

    /**
     * Record system activity
     */
    recordActivity(activityType) {
        this.state.lastActivity = Date.now();
        
        // Wake up if hibernating
        if (this.state.isHibernating) {
            this.wakeUp(`Activity detected: ${activityType}`);
        }
        
        // Adjust performance mode based on activity
        this.adjustPerformanceMode(activityType);
    }

    /**
     * Monitor system performance
     */
    monitorSystemPerformance() {
        try {
            const memoryUsage = process.memoryUsage();
            const uptime = process.uptime();
            
            // Calculate memory usage percentage
            const heapUsedPercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
            
            // Assess system load
            this.assessSystemLoad(memoryUsage, heapUsedPercent);
            
            // Check for hibernation opportunity
            this.checkHibernationOpportunity();
            
            // Optimize based on current state
            this.optimizeBasedOnLoad();
            
            // Emit performance metrics
            this.emit('performanceMetrics', {
                memoryUsage,
                heapUsedPercent,
                uptime,
                systemLoad: this.state.systemLoad,
                isHibernating: this.state.isHibernating,
                cacheStats: this.getCacheStats()
            });
            
        } catch (error) {
            console.error('Performance Optimizer: Monitoring failed:', error);
        }
    }

    /**
     * Assess system load
     */
    assessSystemLoad(memoryUsage, heapUsedPercent) {
        let load = 'low';
        
        if (heapUsedPercent > 0.8 || memoryUsage.external > 200 * 1024 * 1024) { // 200MB
            load = 'high';
        } else if (heapUsedPercent > 0.6 || memoryUsage.external > 100 * 1024 * 1024) { // 100MB
            load = 'medium';
        }
        
        if (load !== this.state.systemLoad) {
            console.log(`⚡ Performance Optimizer: System load changed from ${this.state.systemLoad} to ${load}`);
            this.state.systemLoad = load;
            this.emit('systemLoadChanged', { from: this.state.systemLoad, to: load });
        }
    }

    /**
     * Check for hibernation opportunity
     */
    checkHibernationOpportunity() {
        const timeSinceActivity = Date.now() - this.state.lastActivity;
        
        if (!this.state.isHibernating && 
            timeSinceActivity > this.config.hibernationThreshold &&
            this.state.systemLoad !== 'high') {
            
            this.hibernate('Inactivity detected');
        }
    }

    /**
     * Optimize based on current load
     */
    optimizeBasedOnLoad() {
        switch (this.state.systemLoad) {
            case 'high':
                this.enterPerformanceMode();
                break;
            case 'medium':
                this.enterNormalMode();
                break;
            case 'low':
                this.enterPowerSaveMode();
                break;
        }
    }

    /**
     * Enter hibernation mode
     */
    hibernate(reason = 'Performance optimization') {
        if (this.state.isHibernating) return;
        
        console.log(`💤 Performance Optimizer: Entering hibernation - ${reason}`);
        
        this.state.isHibernating = true;
        this.state.hibernationStartTime = Date.now();
        this.metrics.hibernationCount++;
        
        // Hibernate components
        this.hibernateComponents();
        
        // Clear non-essential caches
        this.clearNonEssentialCaches();
        
        // Reduce polling intervals
        this.reducePollingIntervals();
        
        this.emit('hibernationStarted', { reason, timestamp: Date.now() });
    }

    /**
     * Wake up from hibernation
     */
    wakeUp(reason = 'Activity detected') {
        if (!this.state.isHibernating) return;
        
        const hibernationDuration = Date.now() - this.state.hibernationStartTime;
        console.log(`🔋 Performance Optimizer: Waking up after ${Math.round(hibernationDuration / 1000)}s - ${reason}`);
        
        this.state.isHibernating = false;
        this.state.hibernationStartTime = null;
        
        // Wake up components
        this.wakeUpComponents();
        
        // Restore polling intervals
        this.restorePollingIntervals();
        
        this.emit('hibernationEnded', { 
            reason, 
            duration: hibernationDuration, 
            timestamp: Date.now() 
        });
    }

    /**
     * Hibernate system components
     */
    hibernateComponents() {
        // Reduce proactive intelligence frequency
        if (this.proactiveIntelligence) {
            this.optimizableComponents.set('proactiveIntelligence', {
                originalInterval: this.proactiveIntelligence.config?.suggestionInterval,
                hibernatedInterval: this.proactiveIntelligence.config?.suggestionInterval * 4 // 4x longer
            });
        }
        
        // Reduce context builder scanning
        if (this.contextBuilder) {
            this.optimizableComponents.set('contextBuilder', {
                originalScanFrequency: 'normal',
                hibernatedScanFrequency: 'reduced'
            });
        }
        
        // Reduce memory system auto-save frequency
        if (this.memorySystem && this.memorySystem.autoSaveInterval) {
            this.optimizableComponents.set('memorySystem', {
                originalAutoSave: 30000, // 30 seconds
                hibernatedAutoSave: 120000 // 2 minutes
            });
        }
    }

    /**
     * Wake up system components
     */
    wakeUpComponents() {
        // Restore component settings
        this.optimizableComponents.forEach((settings, component) => {
            // Component-specific restoration logic would go here
            console.log(`🔋 Restoring ${component} to normal operation`);
        });
        
        this.optimizableComponents.clear();
    }

    /**
     * Performance mode management
     */
    enterPerformanceMode() {
        if (this.state.performanceMode === 'performance') return;
        
        console.log('🚀 Performance Optimizer: Entering performance mode');
        this.state.performanceMode = 'performance';
        
        // Increase cache sizes
        this.config.cacheMaxSize = Math.floor(this.config.cacheMaxSize * 1.5);
        
        // Reduce cache eviction frequency
        this.config.cacheMaxAge = this.config.cacheMaxAge * 2;
        
        // Increase analysis frequencies
        if (this.proactiveIntelligence) {
            // Reduce suggestion interval for faster responses
        }
        
        this.emit('performanceModeChanged', { mode: 'performance' });
    }

    enterNormalMode() {
        if (this.state.performanceMode === 'normal') return;
        
        console.log('⚡ Performance Optimizer: Entering normal mode');
        this.state.performanceMode = 'normal';
        
        // Reset cache settings to defaults
        this.resetCacheSettings();
        
        this.emit('performanceModeChanged', { mode: 'normal' });
    }

    enterPowerSaveMode() {
        if (this.state.performanceMode === 'power-save') return;
        
        console.log('🔋 Performance Optimizer: Entering power-save mode');
        this.state.performanceMode = 'power-save';
        
        // Reduce cache sizes
        this.config.cacheMaxSize = Math.floor(this.config.cacheMaxSize * 0.7);
        
        // Increase cache eviction frequency
        this.config.cacheMaxAge = Math.floor(this.config.cacheMaxAge * 0.8);
        
        // Reduce analysis frequencies
        if (this.proactiveIntelligence) {
            // Increase suggestion interval to save resources
        }
        
        this.emit('performanceModeChanged', { mode: 'power-save' });
    }

    /**
     * Adjust performance mode based on activity
     */
    adjustPerformanceMode(activityType) {
        const highActivityTypes = ['parallel_agents', 'hivemind', 'infinite_loop'];
        const mediumActivityTypes = ['suggestions_generated', 'approval_requested'];
        
        if (highActivityTypes.includes(activityType)) {
            this.enterPerformanceMode();
        } else if (mediumActivityTypes.includes(activityType)) {
            this.enterNormalMode();
        }
    }

    /**
     * Smart caching system
     */
    getCachedResult(cacheType, key) {
        const cache = this.caches[cacheType];
        if (!cache) return null;
        
        const cached = cache.get(key);
        if (!cached) {
            this.metrics.cacheMisses++;
            return null;
        }
        
        // Check if cached result is still valid
        if (Date.now() - cached.timestamp > this.config.cacheMaxAge) {
            cache.delete(key);
            this.metrics.cacheMisses++;
            return null;
        }
        
        this.metrics.cacheHits++;
        cached.lastAccessed = Date.now();
        return cached.data;
    }

    setCachedResult(cacheType, key, data) {
        const cache = this.caches[cacheType];
        if (!cache) return;
        
        // Evict old entries if cache is full
        if (cache.size >= this.config.cacheMaxSize) {
            this.evictOldestCacheEntries(cache);
        }
        
        cache.set(key, {
            data,
            timestamp: Date.now(),
            lastAccessed: Date.now()
        });
    }

    /**
     * Cache maintenance
     */
    evictOldestCacheEntries(cache) {
        const entries = Array.from(cache.entries());
        
        // Sort by last accessed time
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        // Remove oldest 25% of entries
        const toRemove = Math.floor(entries.length * 0.25);
        for (let i = 0; i < toRemove; i++) {
            cache.delete(entries[i][0]);
        }
    }

    clearNonEssentialCaches() {
        // Clear suggestion cache (can be regenerated)
        this.caches.suggestionCache.clear();
        
        // Clear analysis cache (can be regenerated)
        this.caches.analysisCache.clear();
        
        // Keep context and memory caches (more expensive to regenerate)
        console.log('🧹 Performance Optimizer: Cleared non-essential caches');
    }

    clearAllCaches() {
        Object.values(this.caches).forEach(cache => cache.clear());
        console.log('🧹 Performance Optimizer: Cleared all caches');
    }

    /**
     * Polling interval management
     */
    reducePollingIntervals() {
        // Reduce monitoring frequency during hibernation
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
            this.performanceInterval = setInterval(() => {
                this.monitorSystemPerformance();
            }, 120000); // Every 2 minutes instead of 30 seconds
        }
    }

    restorePollingIntervals() {
        // Restore normal monitoring frequency
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
            this.performanceInterval = setInterval(() => {
                this.monitorSystemPerformance();
            }, 30000); // Back to 30 seconds
        }
    }

    /**
     * Maintenance and cleanup
     */
    performMaintenance() {
        try {
            // Clean expired cache entries
            this.cleanExpiredCacheEntries();
            
            // Optimize memory usage
            this.optimizeMemoryUsage();
            
            // Check for memory leaks
            this.checkMemoryLeaks();
            
            this.metrics.memoryOptimizations++;
            
        } catch (error) {
            console.error('Performance Optimizer: Maintenance failed:', error);
        }
    }

    cleanExpiredCacheEntries() {
        let totalCleaned = 0;
        
        Object.entries(this.caches).forEach(([cacheType, cache]) => {
            let cleaned = 0;
            const now = Date.now();
            
            for (const [key, entry] of cache.entries()) {
                if (now - entry.timestamp > this.config.cacheMaxAge) {
                    cache.delete(key);
                    cleaned++;
                }
            }
            
            totalCleaned += cleaned;
        });
        
        if (totalCleaned > 0) {
            console.log(`🧹 Performance Optimizer: Cleaned ${totalCleaned} expired cache entries`);
        }
    }

    optimizeMemoryUsage() {
        const memoryUsage = process.memoryUsage();
        const heapUsedPercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
        
        if (heapUsedPercent > this.config.memoryThreshold) {
            console.log('⚠️ Performance Optimizer: High memory usage detected, optimizing...');
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            // Reduce cache sizes
            this.reduceCacheSizes();
            
            this.metrics.performanceWarnings++;
        }
    }

    reduceCacheSizes() {
        Object.values(this.caches).forEach(cache => {
            if (cache.size > 100) {
                // Remove oldest 50% of entries
                const entries = Array.from(cache.entries());
                entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
                
                const toRemove = Math.floor(entries.length * 0.5);
                for (let i = 0; i < toRemove; i++) {
                    cache.delete(entries[i][0]);
                }
            }
        });
        
        console.log('🔧 Performance Optimizer: Reduced cache sizes due to memory pressure');
    }

    checkMemoryLeaks() {
        // Simple memory leak detection
        const memoryUsage = process.memoryUsage();
        
        if (!this.lastMemoryCheck) {
            this.lastMemoryCheck = memoryUsage;
            return;
        }
        
        const heapGrowth = memoryUsage.heapUsed - this.lastMemoryCheck.heapUsed;
        const externalGrowth = memoryUsage.external - this.lastMemoryCheck.external;
        
        // If memory consistently grows without bounds, warn
        if (heapGrowth > 50 * 1024 * 1024 || externalGrowth > 50 * 1024 * 1024) { // 50MB
            console.warn('⚠️ Performance Optimizer: Potential memory leak detected');
            this.metrics.performanceWarnings++;
        }
        
        this.lastMemoryCheck = memoryUsage;
    }

    /**
     * Performance tuning helpers
     */
    resetCacheSettings() {
        // Reset to original values (these would be stored during initialization)
        this.config.cacheMaxSize = 1000;
        this.config.cacheMaxAge = 3600000;
    }

    /**
     * Public API methods
     */
    getPerformanceStats() {
        return {
            state: this.state,
            metrics: this.metrics,
            cacheStats: this.getCacheStats(),
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        };
    }

    getCacheStats() {
        const stats = {};
        
        Object.entries(this.caches).forEach(([cacheType, cache]) => {
            stats[cacheType] = {
                size: cache.size,
                hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
            };
        });
        
        return stats;
    }

    forceHibernation(reason = 'Manual hibernation') {
        this.hibernate(reason);
    }

    forceWakeUp(reason = 'Manual wake up') {
        this.wakeUp(reason);
    }

    clearCaches(cacheType = null) {
        if (cacheType && this.caches[cacheType]) {
            this.caches[cacheType].clear();
            console.log(`🧹 Performance Optimizer: Cleared ${cacheType} cache`);
        } else {
            this.clearAllCaches();
        }
    }

    setPerformanceMode(mode) {
        switch (mode) {
            case 'performance':
                this.enterPerformanceMode();
                break;
            case 'normal':
                this.enterNormalMode();
                break;
            case 'power-save':
                this.enterPowerSaveMode();
                break;
            default:
                throw new Error(`Unknown performance mode: ${mode}`);
        }
    }

    /**
     * Cleanup and shutdown
     */
    shutdown() {
        // Clear all intervals
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
        }
        
        // Clear all caches
        this.clearAllCaches();
        
        // Wake up if hibernating
        if (this.state.isHibernating) {
            this.wakeUp('System shutdown');
        }
        
        console.log('⚡ Performance Optimizer: Shutdown completed');
    }
}

module.exports = { PerformanceOptimizer };