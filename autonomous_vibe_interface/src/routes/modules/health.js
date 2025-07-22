/**
 * Health Module
 * Handles system health checks and status monitoring
 */

const express = require('express');
const router = express.Router();
const os = require('os');

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
    const status = {
        operational: true,
        timestamp: new Date().toISOString(),
        services: {
            api: 'operational',
            ai: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not configured',
            openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
            database: 'in-memory',
            websocket: 'operational'
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
    // Check if essential services are configured
    const isReady = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
    
    if (isReady) {
        res.json({
            ready: true,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(503).json({
            ready: false,
            message: 'Service not ready - API keys not configured',
            timestamp: new Date().toISOString()
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

module.exports = router;