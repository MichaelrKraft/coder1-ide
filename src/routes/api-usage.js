/**
 * API Usage Tracking Routes
 * 
 * Endpoints for monitoring and managing API usage to prevent unexpected charges
 */

const express = require('express');
const router = express.Router();
const apiGuardian = require('../services/api-usage-guardian');

/**
 * GET /api/usage/report
 * Get usage report for current user
 */
router.get('/report', (req, res) => {
    const userId = req.session?.userId || req.ip || 'anonymous';
    const report = apiGuardian.getUserReport(userId);
    
    res.json({
        success: true,
        report,
        warnings: generateWarnings(report)
    });
});

/**
 * GET /api/usage/global
 * Get global usage statistics (admin only)
 */
router.get('/global', (req, res) => {
    // TODO: Add admin authentication check
    const stats = apiGuardian.getGlobalStats();
    
    res.json({
        success: true,
        stats
    });
});

/**
 * POST /api/usage/reset
 * Reset daily usage for a user (admin only)
 */
router.post('/reset', (req, res) => {
    // TODO: Add admin authentication check
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({
            success: false,
            error: 'userId required'
        });
    }
    
    const usage = apiGuardian.getUserUsage(userId);
    usage.dailyCalls = 0;
    usage.dailyCost = 0;
    usage.lastReset = Date.now();
    apiGuardian.closeCircuitBreaker(userId);
    
    res.json({
        success: true,
        message: `Usage reset for user ${userId}`,
        usage
    });
});

/**
 * POST /api/usage/emergency-stop
 * Activate emergency stop to block all API calls
 */
router.post('/emergency-stop', (req, res) => {
    // TODO: Add admin authentication check
    const { reason } = req.body;
    
    const result = apiGuardian.emergencyStop(reason);
    
    res.json(result);
});

/**
 * POST /api/usage/configure
 * Update usage limits and configuration
 */
router.post('/configure', (req, res) => {
    // TODO: Add admin authentication check
    const { maxDailyCost, maxDailyCalls, mockMode, requireConfirmation } = req.body;
    
    if (maxDailyCost !== undefined) {
        apiGuardian.config.maxDailyCost = parseFloat(maxDailyCost);
    }
    if (maxDailyCalls !== undefined) {
        apiGuardian.config.maxDailyCalls = parseInt(maxDailyCalls);
    }
    if (mockMode !== undefined) {
        apiGuardian.config.mockMode = mockMode;
    }
    if (requireConfirmation !== undefined) {
        apiGuardian.config.requireConfirmation = requireConfirmation;
    }
    
    res.json({
        success: true,
        config: apiGuardian.config
    });
});

/**
 * GET /api/usage/check
 * Check if an API call would be allowed
 */
router.post('/check', async (req, res) => {
    const { service = 'anthropic', model = 'claude-3-sonnet', tokens = 1000 } = req.body;
    const userId = req.session?.userId || req.ip || 'anonymous';
    
    const result = await apiGuardian.checkAPICall(userId, service, model, tokens);
    
    res.json({
        success: true,
        ...result
    });
});

/**
 * GET /api/usage/history
 * Get call history for current user
 */
router.get('/history', (req, res) => {
    const userId = req.session?.userId || req.ip || 'anonymous';
    const { limit = 50 } = req.query;
    
    const usage = apiGuardian.getUserUsage(userId);
    const history = usage.callHistory.slice(-limit);
    
    res.json({
        success: true,
        history,
        total: usage.callHistory.length
    });
});

/**
 * POST /api/usage/simulate
 * Simulate API usage for testing (dev only)
 */
router.post('/simulate', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            success: false,
            error: 'Simulation not allowed in production'
        });
    }
    
    const { userId = 'test-user', calls = 10, service = 'anthropic', model = 'claude-3-sonnet' } = req.body;
    
    for (let i = 0; i < calls; i++) {
        apiGuardian.recordAPICall(userId, service, model, Math.floor(Math.random() * 2000) + 500);
    }
    
    const report = apiGuardian.getUserReport(userId);
    
    res.json({
        success: true,
        message: `Simulated ${calls} API calls`,
        report
    });
});

/**
 * Generate warnings based on usage
 */
function generateWarnings(report) {
    const warnings = [];
    
    if (report.daily.percentUsedCost >= 90) {
        warnings.push({
            level: 'critical',
            message: `You've used ${report.daily.percentUsedCost}% of your daily cost limit!`
        });
    } else if (report.daily.percentUsedCost >= 75) {
        warnings.push({
            level: 'warning',
            message: `You've used ${report.daily.percentUsedCost}% of your daily cost limit`
        });
    }
    
    if (report.daily.percentUsedCalls >= 90) {
        warnings.push({
            level: 'critical',
            message: `You've used ${report.daily.percentUsedCalls}% of your daily API calls!`
        });
    } else if (report.daily.percentUsedCalls >= 75) {
        warnings.push({
            level: 'warning',
            message: `You've used ${report.daily.percentUsedCalls}% of your daily API calls`
        });
    }
    
    if (report.circuitBreakerOpen) {
        warnings.push({
            level: 'critical',
            message: 'API calls are currently blocked due to limit exceeded'
        });
    }
    
    if (report.daily.hoursRemaining <= 1) {
        warnings.push({
            level: 'info',
            message: `Daily limits reset in ${report.daily.hoursRemaining} hour${report.daily.hoursRemaining === 1 ? '' : 's'}`
        });
    }
    
    return warnings;
}

module.exports = router;