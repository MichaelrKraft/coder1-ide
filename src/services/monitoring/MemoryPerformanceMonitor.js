/**
 * Memory Performance Monitor
 * 
 * Comprehensive performance monitoring and metrics collection
 * for the Long-Term Memory & RAG System. Provides insights
 * into performance, usage patterns, and optimization opportunities.
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class MemoryPerformanceMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            metricsPath: path.join(process.cwd(), '.coder1', 'memory', 'metrics'),
            retentionDays: 7,
            alertThresholds: {
                embeddingTime: 5000,        // 5 seconds
                searchTime: 1000,           // 1 second
                queueLength: 100,           // 100 items
                errorRate: 0.1,             // 10%
                memoryUsage: 0.8,           // 80% of available
                workerUtilization: 0.9      // 90% worker utilization
            },
            collectInterval: 30000,         // 30 seconds
            ...options
        };
        
        // Metrics storage
        this.currentMetrics = {
            timestamp: Date.now(),
            embedding: {
                totalGenerated: 0,
                averageTime: 0,
                successRate: 0,
                queueLength: 0,
                batchEfficiency: 0
            },
            vectorSearch: {
                totalSearches: 0,
                averageTime: 0,
                successRate: 0,
                averageResults: 0,
                cacheHitRate: 0
            },
            memory: {
                heapUsed: 0,
                heapTotal: 0,
                external: 0,
                rss: 0
            },
            workers: {
                poolSize: 0,
                activeWorkers: 0,
                utilization: 0,
                tasksCompleted: 0,
                averageTaskTime: 0
            },
            errors: {
                total: 0,
                rate: 0,
                categories: {}
            },
            patterns: {
                errorPatterns: 0,
                solutionsProvided: 0,
                matchRate: 0,
                contextInjections: 0
            }
        };
        
        // Historical data
        this.historicalMetrics = [];
        this.alerts = [];
        
        // Performance tracking
        this.performanceTrackers = new Map(); // operationId -> startTime
        this.recentOperations = [];
        
        // Collection interval
        this.collectionInterval = null;
        
        // Initialize
        this.initialize();
    }
    
    async initialize() {
        try {
            // Ensure metrics directory exists
            await fs.mkdir(this.options.metricsPath, { recursive: true });
            
            // Load historical data
            await this.loadHistoricalMetrics();
            
            // Start metrics collection
            this.startCollection();
            
            console.log('📊 MemoryPerformanceMonitor: Initialized');
        } catch (error) {
            console.error('Failed to initialize performance monitor:', error);
        }
    }
    
    /**
     * Start tracking a performance operation
     */
    startTracking(operationId, metadata = {}) {
        this.performanceTrackers.set(operationId, {
            startTime: Date.now(),
            metadata
        });
    }
    
    /**
     * Stop tracking and record metrics
     */
    endTracking(operationId, success = true, additionalData = {}) {
        const tracker = this.performanceTrackers.get(operationId);
        if (!tracker) {
            return null;
        }
        
        const duration = Date.now() - tracker.startTime;
        
        // Record operation
        const operation = {
            id: operationId,
            duration,
            success,
            timestamp: Date.now(),
            metadata: tracker.metadata,
            ...additionalData
        };
        
        this.recentOperations.push(operation);
        
        // Keep only recent operations (last 1000)
        if (this.recentOperations.length > 1000) {
            this.recentOperations = this.recentOperations.slice(-1000);
        }
        
        this.performanceTrackers.delete(operationId);
        
        // Update relevant metrics
        this.updateOperationMetrics(operation);
        
        // Check for alerts
        this.checkAlerts(operation);
        
        return operation;
    }
    
    /**
     * Record embedding generation metrics
     */
    recordEmbedding(duration, success = true, batchSize = 1) {
        this.currentMetrics.embedding.totalGenerated++;
        
        // Update average time
        const count = this.currentMetrics.embedding.totalGenerated;
        this.currentMetrics.embedding.averageTime = 
            (this.currentMetrics.embedding.averageTime * (count - 1) + duration) / count;
        
        // Update success rate
        if (success) {
            const successes = Math.floor(this.currentMetrics.embedding.successRate * (count - 1)) + 1;
            this.currentMetrics.embedding.successRate = successes / count;
        } else {
            const successes = Math.floor(this.currentMetrics.embedding.successRate * (count - 1));
            this.currentMetrics.embedding.successRate = successes / count;
        }
        
        // Batch efficiency (items per second)
        if (batchSize > 1) {
            const itemsPerSecond = batchSize / (duration / 1000);
            this.currentMetrics.embedding.batchEfficiency = 
                (this.currentMetrics.embedding.batchEfficiency + itemsPerSecond) / 2;
        }
    }
    
    /**
     * Record vector search metrics
     */
    recordVectorSearch(duration, success = true, resultCount = 0, cacheHit = false) {
        this.currentMetrics.vectorSearch.totalSearches++;
        
        // Update average time
        const count = this.currentMetrics.vectorSearch.totalSearches;
        this.currentMetrics.vectorSearch.averageTime = 
            (this.currentMetrics.vectorSearch.averageTime * (count - 1) + duration) / count;
        
        // Update success rate
        if (success) {
            const successes = Math.floor(this.currentMetrics.vectorSearch.successRate * (count - 1)) + 1;
            this.currentMetrics.vectorSearch.successRate = successes / count;
        }
        
        // Update average results
        this.currentMetrics.vectorSearch.averageResults = 
            (this.currentMetrics.vectorSearch.averageResults * (count - 1) + resultCount) / count;
        
        // Update cache hit rate
        if (cacheHit) {
            const hits = Math.floor(this.currentMetrics.vectorSearch.cacheHitRate * (count - 1)) + 1;
            this.currentMetrics.vectorSearch.cacheHitRate = hits / count;
        }
    }
    
    /**
     * Record error pattern metrics
     */
    recordErrorPattern(patternMatched = false, solutionProvided = false) {
        this.currentMetrics.patterns.errorPatterns++;
        
        if (patternMatched) {
            const matches = this.currentMetrics.patterns.matchRate * 
                           (this.currentMetrics.patterns.errorPatterns - 1) + 1;
            this.currentMetrics.patterns.matchRate = matches / this.currentMetrics.patterns.errorPatterns;
        }
        
        if (solutionProvided) {
            this.currentMetrics.patterns.solutionsProvided++;
        }
    }
    
    /**
     * Record context injection
     */
    recordContextInjection() {
        this.currentMetrics.patterns.contextInjections++;
    }
    
    /**
     * Update metrics from external source
     */
    updateMetrics(source, metrics) {
        const timestamp = Date.now();
        
        switch (source) {
        case 'vectorMemory':
            if (metrics.embeddingsGenerated !== undefined) {
                this.currentMetrics.embedding.totalGenerated = metrics.embeddingsGenerated;
            }
            if (metrics.vectorSearches !== undefined) {
                this.currentMetrics.vectorSearch.totalSearches = metrics.vectorSearches;
            }
            if (metrics.queueSize !== undefined) {
                this.currentMetrics.embedding.queueLength = metrics.queueSize;
            }
            break;
                
        case 'workerPool':
            if (metrics.poolSize !== undefined) {
                this.currentMetrics.workers.poolSize = metrics.poolSize;
            }
            if (metrics.busyWorkers !== undefined) {
                this.currentMetrics.workers.activeWorkers = metrics.busyWorkers;
            }
            if (metrics.workerUtilization !== undefined) {
                this.currentMetrics.workers.utilization = metrics.workerUtilization;
            }
            break;
        }
        
        this.currentMetrics.timestamp = timestamp;
    }
    
    /**
     * Update operation-specific metrics
     */
    updateOperationMetrics(operation) {
        const { id, duration, success, metadata } = operation;
        
        // Track errors
        if (!success) {
            this.currentMetrics.errors.total++;
            
            // Categorize error
            const category = metadata.errorType || 'unknown';
            this.currentMetrics.errors.categories[category] = 
                (this.currentMetrics.errors.categories[category] || 0) + 1;
        }
        
        // Update error rate
        const totalOps = this.recentOperations.length;
        const errorCount = this.recentOperations.filter(op => !op.success).length;
        this.currentMetrics.errors.rate = errorCount / totalOps;
    }
    
    /**
     * Check for performance alerts
     */
    checkAlerts(operation) {
        const alerts = [];
        const thresholds = this.options.alertThresholds;
        
        // Check operation duration
        if (operation.duration > thresholds.embeddingTime && 
            operation.metadata.type === 'embedding') {
            alerts.push({
                type: 'slow_embedding',
                severity: 'warning',
                message: `Embedding took ${operation.duration}ms (threshold: ${thresholds.embeddingTime}ms)`,
                operation: operation.id
            });
        }
        
        // Check queue length
        if (this.currentMetrics.embedding.queueLength > thresholds.queueLength) {
            alerts.push({
                type: 'queue_backlog',
                severity: 'warning',
                message: `Embedding queue has ${this.currentMetrics.embedding.queueLength} items`,
                value: this.currentMetrics.embedding.queueLength
            });
        }
        
        // Check error rate
        if (this.currentMetrics.errors.rate > thresholds.errorRate) {
            alerts.push({
                type: 'high_error_rate',
                severity: 'critical',
                message: `Error rate is ${(this.currentMetrics.errors.rate * 100).toFixed(1)}%`,
                value: this.currentMetrics.errors.rate
            });
        }
        
        // Check worker utilization
        if (this.currentMetrics.workers.utilization > thresholds.workerUtilization) {
            alerts.push({
                type: 'high_worker_utilization',
                severity: 'warning',
                message: `Worker utilization is ${(this.currentMetrics.workers.utilization * 100).toFixed(1)}%`,
                value: this.currentMetrics.workers.utilization
            });
        }
        
        // Store and emit alerts
        for (const alert of alerts) {
            alert.timestamp = Date.now();
            this.alerts.push(alert);
            this.emit('alert', alert);
        }
        
        // Keep only recent alerts (last 100)
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }
    }
    
    /**
     * Collect system metrics
     */
    collectSystemMetrics() {
        const memUsage = process.memoryUsage();
        this.currentMetrics.memory = {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss
        };
        
        this.currentMetrics.timestamp = Date.now();
    }
    
    /**
     * Start metrics collection
     */
    startCollection() {
        this.collectionInterval = setInterval(() => {
            this.collectSystemMetrics();
            this.saveCurrentMetrics();
        }, this.options.collectInterval);
    }
    
    /**
     * Save current metrics to historical data
     */
    async saveCurrentMetrics() {
        try {
            const snapshot = {
                ...this.currentMetrics,
                timestamp: Date.now()
            };
            
            this.historicalMetrics.push(snapshot);
            
            // Keep only data within retention period
            const cutoff = Date.now() - (this.options.retentionDays * 24 * 60 * 60 * 1000);
            this.historicalMetrics = this.historicalMetrics.filter(m => m.timestamp > cutoff);
            
            // Save to file
            const filename = `metrics-${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(this.options.metricsPath, filename);
            
            await fs.writeFile(filepath, JSON.stringify({
                current: this.currentMetrics,
                historical: this.historicalMetrics.slice(-100), // Last 100 snapshots
                alerts: this.alerts.slice(-50) // Last 50 alerts
            }, null, 2));
            
        } catch (error) {
            console.error('Failed to save metrics:', error);
        }
    }
    
    /**
     * Load historical metrics
     */
    async loadHistoricalMetrics() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const filename = `metrics-${today}.json`;
            const filepath = path.join(this.options.metricsPath, filename);
            
            const data = await fs.readFile(filepath, 'utf8');
            const metrics = JSON.parse(data);
            
            if (metrics.historical) {
                this.historicalMetrics = metrics.historical;
            }
            
            if (metrics.alerts) {
                this.alerts = metrics.alerts;
            }
            
        } catch (error) {
            // File doesn't exist or is corrupted, start fresh
            console.log('Starting with fresh metrics data');
        }
    }
    
    /**
     * Get performance report
     */
    getPerformanceReport() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        const recentMetrics = this.historicalMetrics.filter(m => now - m.timestamp < oneHour);
        
        return {
            current: this.currentMetrics,
            trends: {
                embeddingPerformance: this.calculateTrend(recentMetrics, 'embedding.averageTime'),
                searchPerformance: this.calculateTrend(recentMetrics, 'vectorSearch.averageTime'),
                errorRate: this.calculateTrend(recentMetrics, 'errors.rate'),
                memoryUsage: this.calculateTrend(recentMetrics, 'memory.heapUsed')
            },
            alerts: {
                active: this.alerts.filter(a => now - a.timestamp < oneHour),
                recent: this.alerts.slice(-10)
            },
            recommendations: this.generateRecommendations()
        };
    }
    
    /**
     * Calculate trend for a metric
     */
    calculateTrend(data, path) {
        if (data.length < 2) return { trend: 'stable', change: 0 };
        
        const values = data.map(d => this.getNestedValue(d, path)).filter(v => v !== undefined);
        if (values.length < 2) return { trend: 'stable', change: 0 };
        
        const first = values[0];
        const last = values[values.length - 1];
        const change = ((last - first) / first) * 100;
        
        let trend = 'stable';
        if (change > 10) trend = 'increasing';
        else if (change < -10) trend = 'decreasing';
        
        return { trend, change: Math.round(change) };
    }
    
    getNestedValue(obj, path) {
        return path.split('.').reduce((o, p) => o && o[p], obj);
    }
    
    /**
     * Generate optimization recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        
        // Embedding performance
        if (this.currentMetrics.embedding.averageTime > 3000) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'Consider increasing worker pool size for faster embedding generation',
                metric: 'embedding.averageTime',
                value: this.currentMetrics.embedding.averageTime
            });
        }
        
        // Queue backlog
        if (this.currentMetrics.embedding.queueLength > 50) {
            recommendations.push({
                type: 'capacity',
                priority: 'medium',
                message: 'Embedding queue is building up, consider batch processing optimization',
                metric: 'embedding.queueLength',
                value: this.currentMetrics.embedding.queueLength
            });
        }
        
        // Memory usage
        const memUsageRatio = this.currentMetrics.memory.heapUsed / this.currentMetrics.memory.heapTotal;
        if (memUsageRatio > 0.8) {
            recommendations.push({
                type: 'memory',
                priority: 'high',
                message: 'High memory usage detected, consider implementing memory cleanup strategies',
                metric: 'memory.usage',
                value: Math.round(memUsageRatio * 100)
            });
        }
        
        // Low match rate
        if (this.currentMetrics.patterns.matchRate < 0.3 && this.currentMetrics.patterns.errorPatterns > 10) {
            recommendations.push({
                type: 'accuracy',
                priority: 'medium',
                message: 'Low pattern match rate, consider adjusting similarity thresholds or improving pattern storage',
                metric: 'patterns.matchRate',
                value: this.currentMetrics.patterns.matchRate
            });
        }
        
        return recommendations;
    }
    
    /**
     * Cleanup and shutdown
     */
    async shutdown() {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
        }
        
        // Save final metrics
        await this.saveCurrentMetrics();
        
        console.log('📊 MemoryPerformanceMonitor: Shutdown complete');
    }
}

// Singleton instance
let instance = null;

MemoryPerformanceMonitor.getInstance = function(options = {}) {
    if (!instance) {
        instance = new MemoryPerformanceMonitor(options);
    }
    return instance;
};

MemoryPerformanceMonitor.reset = function() {
    if (instance) {
        instance.shutdown();
    }
    instance = null;
};

module.exports = { MemoryPerformanceMonitor };