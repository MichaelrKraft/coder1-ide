/**
 * Sandbox Management API Routes - Express Backend
 * Provides real tmux-based sandbox environments
 */

const express = require('express');
const router = express.Router();
const { enhancedTmuxService } = require('../services/enhanced-tmux-service');

// GET /api/sandbox - List all sandboxes
router.get('/', async (req, res) => {
    try {
        const sandboxes = await enhancedTmuxService.listSandboxes();
        const stats = enhancedTmuxService.getStats();
    
        return res.json({
            success: true,
            sandboxes: sandboxes,
            stats: stats
        });
    } catch (error) {
        console.error('Sandbox list error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to list sandboxes'
        });
    }
});

// POST /api/sandbox - Create new sandbox
router.post('/', async (req, res) => {
    try {
        const { projectId, baseFrom, maxCpu, maxMemory } = req.body;
        const userId = req.headers['x-user-id'] || 'anonymous';
    
        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'Project ID is required'
            });
        }
    
        const sandbox = await enhancedTmuxService.createSandbox(userId, projectId, {
            baseFrom,
            maxCpu,
            maxMemory
        });
    
        return res.json({
            success: true,
            sandbox: sandbox
        });
    } catch (error) {
        console.error('Sandbox create error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to create sandbox'
        });
    }
});

// GET /api/sandbox/[sandboxId] - Get sandbox details  
router.get('/:sandboxId', async (req, res) => {
    try {
        const { sandboxId } = req.params;
    
        const sandbox = await enhancedTmuxService.getSandbox(sandboxId);
    
        if (!sandbox) {
            return res.status(404).json({
                success: false,
                error: 'Sandbox not found'
            });
        }
    
        return res.json({
            success: true,
            sandbox: sandbox
        });
    } catch (error) {
        console.error('Sandbox get error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get sandbox'
        });
    }
});

// POST /api/sandbox/[sandboxId] - Execute command in sandbox
router.post('/:sandboxId', async (req, res) => {
    try {
        const { sandboxId } = req.params;
        const { command, action } = req.body;
    
        // Handle different actions
        switch (action) {
        case 'run':
            if (!command) {
                return res.status(400).json({
                    success: false,
                    error: 'Command is required'
                });
            }
        
            const result = await enhancedTmuxService.runInSandbox(sandboxId, command);
            return res.json({
                success: true,
                result: result
            });
      
        case 'test':
            const testResults = await enhancedTmuxService.testSandbox(sandboxId);
            return res.json({
                success: true,
                test: testResults
            });
      
        case 'promote':
            const targetPath = req.body.targetPath;
            const promotion = await enhancedTmuxService.promoteSandbox(sandboxId, targetPath);
            return res.json({
                success: true,
                message: 'Sandbox promoted to main workspace',
                targetPath: promotion.targetPath
            });
      
        default:
            return res.status(400).json({
                success: false,
                error: `Unknown action: ${action}`
            });
        }
    } catch (error) {
        console.error('Sandbox execute error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to execute in sandbox'
        });
    }
});

// DELETE /api/sandbox/[sandboxId] - Destroy specific sandbox
router.delete('/:sandboxId', async (req, res) => {
    try {
        const { sandboxId } = req.params;
    
        await enhancedTmuxService.destroySandbox(sandboxId);
    
        return res.json({
            success: true,
            message: `Sandbox ${sandboxId} destroyed`
        });
    } catch (error) {
        console.error('Sandbox destroy error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to destroy sandbox'
        });
    }
});

module.exports = router;