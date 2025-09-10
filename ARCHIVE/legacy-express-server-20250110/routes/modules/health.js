/**
 * Health Module
 * Handles system health checks and status monitoring
 */

const express = require('express');
const router = express.Router();
const os = require('os');

// Import enhanced bridge to check AI systems status
let enhancedBridge = null;
try {
    const { EnhancedClaudeCodeButtonBridge } = require('../../integrations/enhanced-claude-bridge');
    // Create a bridge instance for health checks
    enhancedBridge = new EnhancedClaudeCodeButtonBridge({ 
        logger: { info: () => {}, error: () => {}, warn: () => {} } // Silent logger for health checks
    });
} catch (error) {
    console.warn('Enhanced bridge not available for health checks:', error.message);
}

// Main health check endpoint
router.get('/', (req, res) => {
    const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'Autonomous Vibe Interface',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        }
    };
    
    res.json(healthData);
});

// Detailed status endpoint
router.get('/status', (req, res) => {
    // Get AI systems status from enhanced bridge
    const aiStatus = enhancedBridge ? enhancedBridge.getApiStatus() : {
        claudeCode: { configured: false, key: 'bridge not available' },
        demoMode: true,
        platform: 'Unknown'
    };
    
    const status = {
        operational: true,
        timestamp: new Date().toISOString(),
        services: {
            api: 'operational',
            claudeCode: aiStatus.claudeCode.configured ? 'configured' : 'not configured',
            anthropic: process.env.ANTHROPIC_API_KEY ? 'configured (fallback)' : 'not configured',
            airtop: aiStatus.airtop?.configured ? 'configured' : 'not configured',
            database: 'json-persistent',
            websocket: 'operational',
            memorySystem: enhancedBridge ? 'operational' : 'not available',
            proactiveIntelligence: enhancedBridge ? 'operational' : 'not available',
            contextBuilder: enhancedBridge ? 'operational' : 'not available'
        },
        aiSystems: {
            platform: aiStatus.platform || 'Claude Code',
            demoMode: aiStatus.demoMode,
            intelligenceSystems: enhancedBridge ? {
                fileWatching: 'active',
                conversationThreading: 'active', 
                memorySystem: 'active',
                naturalLanguageParser: 'active',
                proactiveIntelligence: 'active',
                approvalWorkflows: 'active',
                performanceOptimizer: 'active',
                enhancedClaudeBridge: 'active'
            } : 'not available'
        },
        system: {
            platform: os.platform(),
            uptime: Math.round(process.uptime()) + ' seconds',
            memory: {
                free: Math.round(os.freemem() / 1024 / 1024) + ' MB',
                total: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
                usage: Math.round((1 - os.freemem() / os.totalmem()) * 100) + '%'
            },
            cpu: os.cpus().length + ' cores'
        },
        endpoints: {
            health: '/api/agent/health',
            status: '/api/agent/health/status',
            requirements: '/api/agent/requirements/analyze',
            brief: '/api/agent/requirements/generate-brief',
            chat: '/api/agent/chat'
        }
    };
    
    res.json(status);
});

// Readiness check for deployment systems
router.get('/ready', (req, res) => {
    // Check if Claude Code API key is configured (primary requirement)
    const hasClaudeCodeKey = !!(process.env.CLAUDE_CODE_API_KEY);
    const hasFallbackKey = !!(process.env.ANTHROPIC_API_KEY);
    const isReady = hasClaudeCodeKey || hasFallbackKey;
    
    const readinessDetails = {
        claudeCodeApi: hasClaudeCodeKey ? 'configured' : 'not configured',
        fallbackApi: hasFallbackKey ? 'configured' : 'not configured',
        aiSystems: enhancedBridge ? 'initialized' : 'not available',
        memorySystem: enhancedBridge ? 'operational' : 'not available'
    };
    
    if (isReady) {
        res.json({
            ready: true,
            timestamp: new Date().toISOString(),
            details: readinessDetails,
            recommendation: hasClaudeCodeKey ? 
                'Fully ready with Claude Code API' : 
                'Ready with fallback API - configure CLAUDE_CODE_API_KEY for full functionality'
        });
    } else {
        res.status(503).json({
            ready: false,
            message: 'Service not ready - No AI API keys configured',
            timestamp: new Date().toISOString(),
            details: readinessDetails,
            instructions: 'Set CLAUDE_CODE_API_KEY or ANTHROPIC_API_KEY environment variable'
        });
    }
});

// Liveness check for health monitoring
router.get('/live', (req, res) => {
    res.json({
        alive: true,
        timestamp: new Date().toISOString()
    });
});

// Claude Code API specific health check
router.get('/claude-api', async (req, res) => {
    if (!enhancedBridge) {
        return res.status(503).json({
            status: 'unavailable',
            message: 'Enhanced bridge not initialized',
            timestamp: new Date().toISOString()
        });
    }
    
    try {
        const apiStatus = enhancedBridge.getApiStatus();
        const hasValidKeys = enhancedBridge.hasValidApiKeys();
        
        // If we have a valid API key, try to make a test call
        if (hasValidKeys && enhancedBridge.claudeAPI) {
            try {
                const healthCheck = await enhancedBridge.claudeAPI.healthCheck();
                res.json({
                    status: healthCheck.status,
                    apiKeys: apiStatus,
                    healthCheck: healthCheck,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(503).json({
                    status: 'unhealthy',
                    apiKeys: apiStatus,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        } else {
            res.json({
                status: 'demo-mode',
                apiKeys: apiStatus,
                message: 'Running in demo mode - no real API calls available',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;