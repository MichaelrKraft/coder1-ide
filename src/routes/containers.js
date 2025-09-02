/**
 * Container Management API Routes - Express Backend
 * Provides real tmux/Docker container functionality
 */

const express = require('express');
const router = express.Router();

// GET /api/containers - List all active containers
router.get('/', async (req, res) => {
    try {
    // For now return empty until we implement the service
        return res.json({
            success: true,
            containers: [],
            stats: {
                totalContainers: 0,
                runningContainers: 0,
                enabled: false,
                fallback: 'tmux'
            },
            message: 'Container service initializing. Use enhanced tmux for isolation.'
        });
    } catch (error) {
        console.error('Container list error:', error);
        return res.status(500).json({
            success: false, 
            error: 'Failed to fetch containers' 
        });
    }
});

// POST /api/containers - Spawn new container
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        const { agentType } = body;
    
        // TODO: Implement real container spawning
        return res.json({
            success: false,
            error: 'Container spawning not yet implemented. Using tmux sandboxes instead.',
            fallback: 'tmux',
            message: 'Please use the Sandbox tab for isolated environments'
        });
    } catch (error) {
        console.error('Container create error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create container' 
        });
    }
});

// DELETE /api/containers - Cleanup all containers
router.delete('/', async (req, res) => {
    try {
        return res.json({
            success: true,
            message: 'No containers to clean up'
        });
    } catch (error) {
        console.error('Container cleanup error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to cleanup containers' 
        });
    }
});

module.exports = router;