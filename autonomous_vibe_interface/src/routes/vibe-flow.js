/**
 * Vibe Flow API Routes
 * 
 * Provides endpoints for enhanced token tracking, budget management,
 * and pattern detection for the Vibe Dashboard 2.0
 */

const express = require('express');
const router = express.Router();
const { getInstance: getVibeFlowAnalytics } = require('../services/vibe-flow-analytics');
const { getInstance: getTokenBudgetManager } = require('../services/token-budget-manager');

// Initialize services
const vibeFlowAnalytics = getVibeFlowAnalytics();
const tokenBudgetManager = getTokenBudgetManager();

/**
 * GET /api/vibe-flow/metrics
 * Get real-time vibe flow metrics
 */
router.get('/metrics', async (req, res) => {
    try {
        const metrics = await vibeFlowAnalytics.getRealtimeMetrics();
        res.json({
            success: true,
            ...metrics
        });
    } catch (error) {
        console.error('Error fetching vibe flow metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch metrics',
            message: error.message
        });
    }
});

/**
 * GET /api/vibe-flow/budget
 * Get token budget status and metrics
 */
router.get('/budget', async (req, res) => {
    try {
        const budgetMetrics = await tokenBudgetManager.getDashboardMetrics();
        res.json({
            success: true,
            ...budgetMetrics
        });
    } catch (error) {
        console.error('Error fetching budget metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch budget metrics',
            message: error.message
        });
    }
});

/**
 * POST /api/vibe-flow/track
 * Track a Claude request
 */
router.post('/track', async (req, res) => {
    try {
        const { request, response, tokens, cost, projectId } = req.body;
        
        // Track in analytics
        const analyticsResult = await vibeFlowAnalytics.trackRequest(
            request || '',
            response || '',
            tokens || 0,
            cost || 0
        );
        
        // Track in budget manager
        const budgetStatus = await tokenBudgetManager.trackUsage(
            projectId || 'default',
            tokens || 0,
            cost || 0
        );
        
        res.json({
            success: true,
            analytics: analyticsResult,
            budget: budgetStatus
        });
    } catch (error) {
        console.error('Error tracking request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track request',
            message: error.message
        });
    }
});

/**
 * GET /api/vibe-flow/patterns
 * Get detected patterns and automation suggestions
 */
router.get('/patterns', async (req, res) => {
    try {
        const patterns = await vibeFlowAnalytics.loadPatterns();
        const metrics = await vibeFlowAnalytics.getRealtimeMetrics();
        
        res.json({
            success: true,
            patterns: patterns.filter(p => p.frequency >= 3),
            automationOpportunities: metrics.automationOpportunities || [],
            patternSavingsPotential: metrics.efficiency?.patternSavingsPotential || 0
        });
    } catch (error) {
        console.error('Error fetching patterns:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch patterns',
            message: error.message
        });
    }
});

/**
 * GET /api/vibe-flow/insights
 * Get coaching insights based on usage
 */
router.get('/insights', async (req, res) => {
    try {
        const insights = await vibeFlowAnalytics.getCoachingInsights();
        res.json({
            success: true,
            insights
        });
    } catch (error) {
        console.error('Error fetching insights:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch insights',
            message: error.message
        });
    }
});

/**
 * POST /api/vibe-flow/budget/set
 * Set budget plan or custom limits
 */
router.post('/budget/set', async (req, res) => {
    try {
        const { plan, customLimits } = req.body;
        
        if (plan) {
            await tokenBudgetManager.setBudgetPlan(plan);
        } else if (customLimits) {
            await tokenBudgetManager.setCustomLimits(
                customLimits.dailyTokens,
                customLimits.monthlyTokens,
                customLimits.costLimit
            );
        }
        
        const budgetMetrics = await tokenBudgetManager.getDashboardMetrics();
        res.json({
            success: true,
            ...budgetMetrics
        });
    } catch (error) {
        console.error('Error setting budget:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to set budget',
            message: error.message
        });
    }
});

/**
 * POST /api/vibe-flow/project/allocate
 * Allocate tokens to a specific project
 */
router.post('/project/allocate', async (req, res) => {
    try {
        const { projectId, allocation } = req.body;
        
        await tokenBudgetManager.allocateToProject(projectId, allocation);
        
        res.json({
            success: true,
            message: `Tokens allocated to project ${projectId}`
        });
    } catch (error) {
        console.error('Error allocating tokens:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to allocate tokens',
            message: error.message
        });
    }
});

/**
 * GET /api/vibe-flow/usage-history
 * Get token usage history data for charts
 */
router.get('/usage-history', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7; // Default to 7 days
        const data = await vibeFlowAnalytics.getUsageHistory(days);
        
        res.json({
            success: true,
            labels: data.labels,
            datasets: data.datasets
        });
    } catch (error) {
        console.error('Error fetching usage history:', error);
        
        // Return mock data as fallback for demo purposes
        const mockData = generateMockUsageHistory(days);
        res.json({
            success: true,
            labels: mockData.labels,
            datasets: mockData.datasets,
            mock: true
        });
    }
});

// Helper function to generate mock usage history
function generateMockUsageHistory(days = 7) {
    const now = new Date();
    const data = {
        labels: [],
        datasets: [
            { data: [] }, // Daily usage
            { data: [] }  // Cumulative total
        ]
    };
    
    let cumulative = 0;
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Format label
        const label = date.toLocaleDateString('en', { 
            weekday: 'short', 
            month: 'numeric', 
            day: 'numeric' 
        });
        data.labels.push(label);
        
        // Generate realistic usage (higher on weekdays)
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const baseUsage = isWeekend ? 2000 : 8000;
        const randomVariation = Math.random() * 4000;
        const dailyUsage = Math.floor(baseUsage + randomVariation);
        
        cumulative += dailyUsage;
        
        data.datasets[0].data.push(dailyUsage);
        data.datasets[1].data.push(cumulative);
    }
    
    return data;
}

/**
 * GET /api/vibe-flow/project-breakdown
 * Get token usage breakdown by project
 */
router.get('/project-breakdown', async (req, res) => {
    try {
        const budgetManager = getTokenBudgetManager();
        const data = await budgetManager.getProjectBreakdown();
        
        res.json({
            success: true,
            projects: data.projects,
            totalTokens: data.totalTokens
        });
    } catch (error) {
        console.error('Error fetching project breakdown:', error);
        
        // Return mock data as fallback for demo purposes
        const mockData = generateMockProjectBreakdown();
        res.json({
            success: true,
            projects: mockData.projects,
            totalTokens: mockData.totalTokens,
            mock: true
        });
    }
});

// Helper function to generate mock project breakdown
function generateMockProjectBreakdown() {
    return {
        projects: [
            {
                name: 'Vibe Dashboard',
                tokens: 45000,
                percentage: 45,
                color: '#8b5cf6',
                lastActivity: '2 hours ago'
            },
            {
                name: 'E-commerce Site',
                tokens: 28000,
                percentage: 28,
                color: '#06b6d4',
                lastActivity: '1 day ago'
            },
            {
                name: 'Portfolio Website',
                tokens: 15000,
                percentage: 15,
                color: '#10b981',
                lastActivity: '3 days ago'
            },
            {
                name: 'Mobile App Prototype',
                tokens: 8000,
                percentage: 8,
                color: '#f59e0b',
                lastActivity: '1 week ago'
            },
            {
                name: 'Other Projects',
                tokens: 4000,
                percentage: 4,
                color: '#6b7280',
                lastActivity: '2 weeks ago'
            }
        ],
        totalTokens: 100000
    };
}

/**
 * GET /api/vibe-flow/export
 * Export session data for reports
 */
router.get('/export', async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const exportData = await vibeFlowAnalytics.exportSessionData(format);
        
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=vibe-flow-report.csv');
            res.send(exportData);
        } else {
            res.json({
                success: true,
                data: exportData
            });
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export data',
            message: error.message
        });
    }
});

// Note: WebSocket endpoint will be set up separately in app.js
// For now, clients should poll the /metrics and /budget endpoints

module.exports = router;