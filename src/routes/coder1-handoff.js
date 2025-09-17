/**
 * Coder1 Handoff API Routes
 * 
 * Provides REST API endpoints for managing the transition from
 * PRD generation to Coder1 IDE implementation.
 */

const express = require('express');
const HandoffService = require('../services/coder1-integration/HandoffService');

const router = express.Router();

// Initialize handoff service (singleton)
let handoffService = null;

async function getHandoffService() {
    if (!handoffService) {
        handoffService = new HandoffService({
            logger: console
        });
        await handoffService.initialize();
    }
    return handoffService;
}

/**
 * Create a new handoff from PRD to Coder1
 */
router.post('/create', async (req, res) => {
    try {
        const { sessionId, prdResult, userPreferences = {} } = req.body;
        
        if (!sessionId || !prdResult) {
            return res.status(400).json({
                success: false,
                error: 'Missing sessionId or prdResult'
            });
        }
        
        const service = await getHandoffService();
        const handoff = await service.createHandoff(sessionId, prdResult, userPreferences);
        
        res.json({
            success: true,
            handoff: {
                id: handoff.id,
                sessionId: handoff.sessionId,
                status: handoff.status,
                steps: handoff.steps,
                projectSetup: handoff.projectSetup,
                coder1Context: handoff.coder1Context
            },
            message: 'Handoff created successfully'
        });
        
    } catch (error) {
        console.error('Error creating handoff:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create handoff',
            details: error.message
        });
    }
});

/**
 * Get handoff details
 */
router.get('/:handoffId', async (req, res) => {
    try {
        const { handoffId } = req.params;
        
        const service = await getHandoffService();
        const handoff = service.getHandoff(handoffId);
        
        if (!handoff) {
            return res.status(404).json({
                success: false,
                error: 'Handoff not found'
            });
        }
        
        res.json({
            success: true,
            handoff: {
                id: handoff.id,
                sessionId: handoff.sessionId,
                status: handoff.status,
                createdAt: handoff.createdAt,
                steps: handoff.steps,
                projectSetup: handoff.projectSetup,
                coder1Context: handoff.coder1Context
            }
        });
        
    } catch (error) {
        console.error('Error getting handoff:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get handoff',
            details: error.message
        });
    }
});

/**
 * Update step status
 */
router.post('/:handoffId/steps/:stepId/status', async (req, res) => {
    try {
        const { handoffId, stepId } = req.params;
        const { status } = req.body;
        
        if (!status || !['pending', 'in-progress', 'completed', 'skipped'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be one of: pending, in-progress, completed, skipped'
            });
        }
        
        const service = await getHandoffService();
        const handoff = service.updateStepStatus(handoffId, stepId, status);
        
        res.json({
            success: true,
            handoff: {
                id: handoff.id,
                status: handoff.status,
                steps: handoff.steps
            },
            message: 'Step status updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating step status:', error);
        
        if (error.message.includes('not found')) {
            res.status(404).json({
                success: false,
                error: error.message
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to update step status',
                details: error.message
            });
        }
    }
});

/**
 * Get setup commands for a handoff
 */
router.get('/:handoffId/setup-commands', async (req, res) => {
    try {
        const { handoffId } = req.params;
        
        const service = await getHandoffService();
        const handoff = service.getHandoff(handoffId);
        
        if (!handoff) {
            return res.status(404).json({
                success: false,
                error: 'Handoff not found'
            });
        }
        
        // Find the setup step
        const setupStep = handoff.steps.find(step => step.id === 'create-project');
        
        res.json({
            success: true,
            commands: setupStep?.action?.commands || [],
            projectSetup: handoff.projectSetup
        });
        
    } catch (error) {
        console.error('Error getting setup commands:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get setup commands',
            details: error.message
        });
    }
});

/**
 * Get implementation guidance for a handoff
 */
router.get('/:handoffId/guidance', async (req, res) => {
    try {
        const { handoffId } = req.params;
        
        const service = await getHandoffService();
        const handoff = service.getHandoff(handoffId);
        
        if (!handoff) {
            return res.status(404).json({
                success: false,
                error: 'Handoff not found'
            });
        }
        
        // Find the implementation step
        const implementStep = handoff.steps.find(step => step.id === 'implement-core');
        
        res.json({
            success: true,
            guidance: implementStep?.action?.guidance || {},
            coder1Context: handoff.coder1Context
        });
        
    } catch (error) {
        console.error('Error getting implementation guidance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get implementation guidance',
            details: error.message
        });
    }
});

/**
 * Launch Coder1 IDE with handoff context
 */
router.post('/:handoffId/launch-ide', async (req, res) => {
    try {
        const { handoffId } = req.params;
        
        const service = await getHandoffService();
        const handoff = service.getHandoff(handoffId);
        
        if (!handoff) {
            return res.status(404).json({
                success: false,
                error: 'Handoff not found'
            });
        }
        
        // Update the setup step as in-progress
        service.updateStepStatus(handoffId, 'setup-coder1', 'completed');
        
        // Generate IDE launch URL with context
        const ideUrl = `http://localhost:3001/ide?handoff=${handoffId}&project=${encodeURIComponent(handoff.projectSetup.projectName)}`;
        
        res.json({
            success: true,
            ideUrl,
            welcomeMessage: handoff.coder1Context.welcomeMessage,
            quickActions: handoff.coder1Context.quickActions,
            message: 'Ready to launch Coder1 IDE'
        });
        
    } catch (error) {
        console.error('Error launching IDE:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to launch IDE',
            details: error.message
        });
    }
});

/**
 * Get handoff analytics
 */
router.get('/analytics/overview', async (req, res) => {
    try {
        const service = await getHandoffService();
        const analytics = service.getHandoffAnalytics();
        
        res.json({
            success: true,
            analytics
        });
        
    } catch (error) {
        console.error('Error getting handoff analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get analytics',
            details: error.message
        });
    }
});

/**
 * Complete a handoff
 */
router.post('/:handoffId/complete', async (req, res) => {
    try {
        const { handoffId } = req.params;
        const { feedback, rating } = req.body;
        
        const service = await getHandoffService();
        const handoff = service.getHandoff(handoffId);
        
        if (!handoff) {
            return res.status(404).json({
                success: false,
                error: 'Handoff not found'
            });
        }
        
        // Update handoff as completed
        handoff.status = 'completed';
        handoff.completedAt = Date.now();
        handoff.feedback = feedback;
        handoff.rating = rating;
        
        res.json({
            success: true,
            handoff: {
                id: handoff.id,
                status: handoff.status,
                completedAt: handoff.completedAt
            },
            message: 'Handoff completed successfully'
        });
        
    } catch (error) {
        console.error('Error completing handoff:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete handoff',
            details: error.message
        });
    }
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
    try {
        const service = await getHandoffService();
        const analytics = service.getHandoffAnalytics();
        
        res.json({
            success: true,
            status: 'healthy',
            activeHandoffs: analytics.totalHandoffs,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

module.exports = router;