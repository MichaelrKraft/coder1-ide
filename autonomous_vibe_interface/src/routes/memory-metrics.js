/**
 * Memory Metrics API Routes
 * 
 * Provides endpoints for accessing memory system performance metrics,
 * monitoring data, and optimization recommendations.
 */

const express = require('express');
const { MemoryPerformanceMonitor } = require('../services/monitoring/MemoryPerformanceMonitor');
const { VectorMemoryEnhancer } = require('../services/ai-enhancement/VectorMemoryEnhancer');
const { ErrorPatternMemory } = require('../services/memory/ErrorPatternMemory');

const router = express.Router();

/**
 * GET /api/memory-metrics/current
 * Get current performance metrics
 */
router.get('/current', async (req, res) => {
    try {
        const monitor = MemoryPerformanceMonitor.getInstance();
        const metrics = monitor.currentMetrics;
        
        // Add real-time data from memory systems
        const vectorMemory = VectorMemoryEnhancer.getInstance();
        const errorMemory = ErrorPatternMemory.getInstance();
        
        const enhancedMetrics = {
            ...metrics,
            realtime: {
                vectorMemory: vectorMemory.getMetrics(),
                errorPatterns: errorMemory.getMetrics(),
                timestamp: Date.now()
            }
        };
        
        res.json({
            success: true,
            data: enhancedMetrics
        });
        
    } catch (error) {
        console.error('Failed to get current metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve current metrics'
        });
    }
});

/**
 * GET /api/memory-metrics/performance-report
 * Get comprehensive performance report with trends and recommendations
 */
router.get('/performance-report', async (req, res) => {
    try {
        const monitor = MemoryPerformanceMonitor.getInstance();
        const report = monitor.getPerformanceReport();
        
        res.json({
            success: true,
            data: report,
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('Failed to generate performance report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate performance report'
        });
    }
});

/**
 * GET /api/memory-metrics/alerts
 * Get active and recent alerts
 */
router.get('/alerts', async (req, res) => {
    try {
        const monitor = MemoryPerformanceMonitor.getInstance();
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        const activeAlerts = monitor.alerts.filter(a => now - a.timestamp < oneHour);
        const recentAlerts = monitor.alerts.slice(-20);
        
        res.json({
            success: true,
            data: {
                active: activeAlerts,
                recent: recentAlerts,
                total: monitor.alerts.length
            }
        });
        
    } catch (error) {
        console.error('Failed to get alerts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve alerts'
        });
    }
});

/**
 * GET /api/memory-metrics/health
 * Get system health status
 */
router.get('/health', async (req, res) => {
    try {
        const monitor = MemoryPerformanceMonitor.getInstance();
        const vectorMemory = VectorMemoryEnhancer.getInstance();
        const errorMemory = ErrorPatternMemory.getInstance();
        
        // Check vector memory health
        const vectorMetrics = vectorMemory.getMetrics();
        const vectorHealth = {
            isOperational: vectorMetrics.embeddingsGenerated !== undefined,
            workerPool: vectorMetrics.workerPool || { isInitialized: false },
            queueBacklog: vectorMetrics.queueSize > 50,
            averageEmbeddingTime: vectorMetrics.averageEmbeddingTime || 0
        };
        
        // Check error pattern memory health
        const errorMetrics = errorMemory.getMetrics();
        const errorHealth = {
            isOperational: errorMetrics.totalPatterns !== undefined,
            patternCount: errorMetrics.totalPatterns || 0,
            matchRate: errorMetrics.matchRate || 0,
            avgRetrievalTime: errorMetrics.avgRetrievalTime || 0
        };
        
        // Overall health score
        let healthScore = 100;
        const issues = [];
        
        // Vector memory checks
        if (!vectorHealth.workerPool.isInitialized) {
            healthScore -= 30;
            issues.push('Worker pool not initialized');
        }
        if (vectorHealth.queueBacklog) {
            healthScore -= 20;
            issues.push('Embedding queue backlog detected');
        }
        if (vectorHealth.averageEmbeddingTime > 5000) {
            healthScore -= 15;
            issues.push('Slow embedding generation');
        }
        
        // Error pattern checks
        if (!errorHealth.isOperational) {
            healthScore -= 20;
            issues.push('Error pattern memory not operational');
        }
        if (errorHealth.avgRetrievalTime > 1000) {
            healthScore -= 10;
            issues.push('Slow error pattern retrieval');
        }
        
        // Memory checks
        const memUsage = process.memoryUsage();
        const memoryRatio = memUsage.heapUsed / memUsage.heapTotal;
        if (memoryRatio > 0.9) {
            healthScore -= 25;
            issues.push('Critical memory usage');
        } else if (memoryRatio > 0.8) {
            healthScore -= 10;
            issues.push('High memory usage');
        }
        
        const status = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical';
        
        res.json({
            success: true,
            data: {
                status,
                healthScore: Math.max(0, Math.round(healthScore)),
                issues,
                components: {
                    vectorMemory: vectorHealth,
                    errorPatterns: errorHealth,
                    memory: {
                        heapUsed: memUsage.heapUsed,
                        heapTotal: memUsage.heapTotal,
                        usage: Math.round(memoryRatio * 100)
                    }
                },
                timestamp: Date.now()
            }
        });
        
    } catch (error) {
        console.error('Failed to get health status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve health status'
        });
    }
});

/**
 * GET /api/memory-metrics/historical
 * Get historical metrics data
 */
router.get('/historical', async (req, res) => {
    try {
        const monitor = MemoryPerformanceMonitor.getInstance();
        const hours = parseInt(req.query.hours) || 24;
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        
        const historicalData = monitor.historicalMetrics
            .filter(m => m.timestamp > cutoff)
            .map(m => ({
                timestamp: m.timestamp,
                embedding: {
                    totalGenerated: m.embedding.totalGenerated,
                    averageTime: m.embedding.averageTime,
                    queueLength: m.embedding.queueLength
                },
                vectorSearch: {
                    totalSearches: m.vectorSearch.totalSearches,
                    averageTime: m.vectorSearch.averageTime
                },
                memory: {
                    heapUsed: m.memory.heapUsed,
                    heapTotal: m.memory.heapTotal
                },
                errors: {
                    total: m.errors.total,
                    rate: m.errors.rate
                }
            }));
        
        res.json({
            success: true,
            data: {
                metrics: historicalData,
                timeRange: {
                    start: cutoff,
                    end: Date.now(),
                    hours
                }
            }
        });
        
    } catch (error) {
        console.error('Failed to get historical metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve historical metrics'
        });
    }
});

/**
 * GET /api/memory-metrics/operations
 * Get recent operation performance data
 */
router.get('/operations', async (req, res) => {
    try {
        const monitor = MemoryPerformanceMonitor.getInstance();
        const limit = parseInt(req.query.limit) || 100;
        const type = req.query.type; // Filter by operation type
        
        let operations = monitor.recentOperations.slice(-limit);
        
        if (type) {
            operations = operations.filter(op => 
                op.metadata && op.metadata.type === type
            );
        }
        
        // Calculate aggregates
        const successful = operations.filter(op => op.success).length;
        const failed = operations.filter(op => !op.success).length;
        const avgDuration = operations.reduce((sum, op) => sum + op.duration, 0) / operations.length || 0;
        
        res.json({
            success: true,
            data: {
                operations: operations.reverse(), // Most recent first
                summary: {
                    total: operations.length,
                    successful,
                    failed,
                    successRate: successful / (successful + failed) || 0,
                    averageDuration: Math.round(avgDuration)
                }
            }
        });
        
    } catch (error) {
        console.error('Failed to get operations data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve operations data'
        });
    }
});

/**
 * POST /api/memory-metrics/track
 * Manually track a performance operation
 */
router.post('/track', async (req, res) => {
    try {
        const { operationId, type, metadata } = req.body;
        
        if (!operationId || !type) {
            return res.status(400).json({
                success: false,
                error: 'operationId and type are required'
            });
        }
        
        const monitor = MemoryPerformanceMonitor.getInstance();
        monitor.startTracking(operationId, { type, ...metadata });
        
        res.json({
            success: true,
            data: {
                operationId,
                startTime: Date.now()
            }
        });
        
    } catch (error) {
        console.error('Failed to start tracking:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start operation tracking'
        });
    }
});

/**
 * PUT /api/memory-metrics/track/:operationId
 * Complete tracking for an operation
 */
router.put('/track/:operationId', async (req, res) => {
    try {
        const { operationId } = req.params;
        const { success = true, additionalData = {} } = req.body;
        
        const monitor = MemoryPerformanceMonitor.getInstance();
        const result = monitor.endTracking(operationId, success, additionalData);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Operation not found or already completed'
            });
        }
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Failed to complete tracking:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete operation tracking'
        });
    }
});

module.exports = router;