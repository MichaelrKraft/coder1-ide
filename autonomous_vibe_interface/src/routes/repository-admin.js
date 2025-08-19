/**
 * Repository Admin API Routes
 * 
 * Provides monitoring and management endpoints for repository pre-loading
 * Allows administrators to track usage and optimize pre-loading strategy
 */

const express = require('express');
const router = express.Router();

/**
 * Get pre-loading status
 */
router.get('/preload/status', async (req, res) => {
    try {
        const preloader = global.repositoryPreloader;
        
        if (!preloader) {
            return res.status(503).json({
                success: false,
                error: 'Pre-loader not initialized',
                message: 'Repository pre-loading will start after server stabilizes'
            });
        }
        
        const status = preloader.getStatus();
        
        res.json({
            success: true,
            status: {
                active: status.isPreloading,
                progress: {
                    total: status.queue.total,
                    completed: status.stats.successful + status.stats.failed + status.stats.skipped,
                    remaining: status.queue.remaining,
                    percentComplete: Math.round(((status.stats.successful + status.stats.failed + status.stats.skipped) / status.queue.total) * 100)
                },
                statistics: {
                    successful: status.stats.successful,
                    failed: status.stats.failed,
                    skipped: status.stats.skipped,
                    totalAttempted: status.stats.totalAttempted,
                    elapsedTimeMs: status.stats.elapsedTime,
                    averageTimeMs: status.stats.averageTime
                },
                preloadedRepositories: status.preloaded,
                failedRepositories: status.failed
            }
        });
        
    } catch (error) {
        console.error('Error getting pre-load status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get pre-loading status'
        });
    }
});

/**
 * Start pre-loading manually
 */
router.post('/preload/start', async (req, res) => {
    try {
        const preloader = global.repositoryPreloader;
        
        if (!preloader) {
            return res.status(503).json({
                success: false,
                error: 'Pre-loader not initialized'
            });
        }
        
        const status = preloader.getStatus();
        
        if (status.isPreloading) {
            return res.status(409).json({
                success: false,
                error: 'Pre-loading already in progress',
                currentProgress: {
                    completed: status.stats.successful + status.stats.failed,
                    total: status.queue.total
                }
            });
        }
        
        // Get options from request body
        const options = {
            batchSize: req.body.batchSize || 3,
            maxConcurrent: req.body.maxConcurrent || 2,
            delayBetweenBatches: req.body.delayBetweenBatches || 15000,
            lightweight: req.body.lightweight !== false
        };
        
        // Start pre-loading in background
        preloader.startPreloading(options)
            .then(() => {
                console.log('✅ [ADMIN] Manual pre-loading complete');
            })
            .catch(error => {
                console.error('❌ [ADMIN] Manual pre-loading failed:', error);
            });
        
        res.json({
            success: true,
            message: 'Pre-loading started in background',
            queueSize: status.queue.total,
            options
        });
        
    } catch (error) {
        console.error('Error starting pre-load:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start pre-loading'
        });
    }
});

/**
 * Stop pre-loading
 */
router.post('/preload/stop', async (req, res) => {
    try {
        const preloader = global.repositoryPreloader;
        
        if (!preloader) {
            return res.status(503).json({
                success: false,
                error: 'Pre-loader not initialized'
            });
        }
        
        const stopped = preloader.stopPreloading();
        const status = preloader.getStatus();
        
        if (stopped) {
            res.json({
                success: true,
                message: 'Pre-loading stopped',
                finalStats: {
                    successful: status.stats.successful,
                    failed: status.stats.failed,
                    skipped: status.stats.skipped
                }
            });
        } else {
            res.json({
                success: false,
                message: 'No pre-loading in progress'
            });
        }
        
    } catch (error) {
        console.error('Error stopping pre-load:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop pre-loading'
        });
    }
});

/**
 * Add repository to pre-load queue
 */
router.post('/preload/add', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'Repository URL is required'
            });
        }
        
        const preloader = global.repositoryPreloader;
        
        if (!preloader) {
            return res.status(503).json({
                success: false,
                error: 'Pre-loader not initialized'
            });
        }
        
        const added = preloader.addToQueue(url);
        
        res.json({
            success: added,
            message: added ? 'Repository added to queue' : 'Repository already in queue',
            url
        });
        
    } catch (error) {
        console.error('Error adding to pre-load queue:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add repository to queue'
        });
    }
});

/**
 * Get pre-loaded repositories list
 */
router.get('/preload/list', async (req, res) => {
    try {
        const preloader = global.repositoryPreloader;
        
        if (!preloader) {
            return res.status(503).json({
                success: false,
                error: 'Pre-loader not initialized'
            });
        }
        
        const status = preloader.getStatus();
        
        res.json({
            success: true,
            preloaded: status.preloaded,
            count: status.preloaded.length,
            failed: status.failed,
            failedCount: status.failed.length
        });
        
    } catch (error) {
        console.error('Error getting pre-loaded list:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get pre-loaded repositories'
        });
    }
});

/**
 * Get repository usage statistics
 */
router.get('/usage/stats', async (req, res) => {
    try {
        const { getInstance: getRepositoryEngine } = require('../integrations/repository-intelligence-engine');
        const engine = getRepositoryEngine();
        const engineStatus = engine.getRepositoryStatus();
        
        const preloader = global.repositoryPreloader;
        const preloadStatus = preloader ? preloader.getStatus() : null;
        
        res.json({
            success: true,
            usage: {
                totalRepositoriesAnalyzed: engineStatus.totalRepositories || 0,
                cachedRepositories: engineStatus.repositories ? engineStatus.repositories.length : 0,
                preloadedRepositories: preloadStatus ? preloadStatus.preloaded.length : 0,
                knowledgeCacheSize: engineStatus.cacheSize || 0
            },
            performance: {
                averageAnalysisTime: preloadStatus ? preloadStatus.stats.averageTime : 0,
                totalPreloadTime: preloadStatus ? preloadStatus.stats.elapsedTime : 0
            },
            recommendations: generateRecommendations(engineStatus, preloadStatus)
        });
        
    } catch (error) {
        console.error('Error getting usage stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get usage statistics'
        });
    }
});

/**
 * Generate recommendations based on usage patterns
 */
function generateRecommendations(engineStatus, preloadStatus) {
    const recommendations = [];
    
    // Check if pre-loading is effective
    if (preloadStatus && preloadStatus.stats.failed > preloadStatus.stats.successful) {
        recommendations.push({
            type: 'warning',
            message: 'High failure rate in pre-loading. Consider reviewing repository URLs.',
            action: 'Check failed repositories and update configuration'
        });
    }
    
    // Check cache efficiency
    if (engineStatus.totalRepositories > 50) {
        recommendations.push({
            type: 'info',
            message: 'Large number of repositories analyzed. Consider increasing cache size.',
            action: 'Monitor memory usage and adjust cache limits'
        });
    }
    
    // Suggest popular repositories to pre-load
    if (!preloadStatus || preloadStatus.preloaded.length < 10) {
        recommendations.push({
            type: 'suggestion',
            message: 'Pre-load more popular repositories for better user experience.',
            action: 'Add React, Vue, Angular, and other popular frameworks'
        });
    }
    
    return recommendations;
}

/**
 * Get popular repositories from dynamic service
 */
router.get('/popular', async (req, res) => {
    try {
        const { getInstance: getPopularityService } = require('../services/repository-popularity-service');
        const popularityService = getPopularityService();
        
        const options = {
            minStars: parseInt(req.query.minStars) || 5000,
            limit: parseInt(req.query.limit) || 50,
            useCache: req.query.noCache !== 'true'
        };
        
        const popularRepos = await popularityService.getPopularRepositories(options);
        
        res.json({
            success: true,
            count: popularRepos.length,
            repositories: popularRepos,
            cached: options.useCache,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting popular repositories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get popular repositories'
        });
    }
});

/**
 * Get repository usage analytics
 */
router.get('/analytics', async (req, res) => {
    try {
        const { getInstance: getUsageTracker } = require('../services/repository-usage-tracker');
        const usageTracker = getUsageTracker();
        
        const analytics = usageTracker.getAnalytics();
        const recommendations = usageTracker.getPersonalizedRecommendations(10);
        
        res.json({
            success: true,
            analytics,
            recommendations,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get analytics'
        });
    }
});

/**
 * Get trending repositories
 */
router.get('/trends', async (req, res) => {
    try {
        const { getInstance: getTrendsUpdater } = require('../services/repository-trends-updater');
        const trendsUpdater = getTrendsUpdater();
        
        const trends = await trendsUpdater.getCurrentTrends();
        
        if (!trends) {
            return res.json({
                success: false,
                message: 'No trends data available yet'
            });
        }
        
        res.json({
            success: true,
            lastUpdated: trends.lastUpdated,
            totalRepositories: trends.totalRepositories,
            changes: trends.changes,
            topTrending: trends.repositories?.slice(0, 10) || []
        });
        
    } catch (error) {
        console.error('Error getting trends:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get trends'
        });
    }
});

/**
 * Force update trends
 */
router.post('/trends/update', async (req, res) => {
    try {
        const { getInstance: getTrendsUpdater } = require('../services/repository-trends-updater');
        const trendsUpdater = getTrendsUpdater();
        
        // Start update in background
        trendsUpdater.forceUpdate()
            .then(() => console.log('✅ [ADMIN] Trends update complete'))
            .catch(error => console.error('❌ [ADMIN] Trends update failed:', error));
        
        res.json({
            success: true,
            message: 'Trends update started in background'
        });
        
    } catch (error) {
        console.error('Error starting trends update:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start trends update'
        });
    }
});

/**
 * Get popularity statistics
 */
router.get('/popularity/stats', async (req, res) => {
    try {
        const { getInstance: getPopularityService } = require('../services/repository-popularity-service');
        const popularityService = getPopularityService();
        
        const stats = await popularityService.getPopularityStats();
        
        res.json({
            success: true,
            statistics: stats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting popularity stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get popularity statistics'
        });
    }
});

module.exports = router;