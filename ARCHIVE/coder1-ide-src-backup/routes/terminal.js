/**
 * Terminal Routes
 * 
 * HTTP endpoints for terminal session management
 * Works alongside WebSocket connections for terminal functionality
 */

const express = require('express');
const router = express.Router();
const { getTerminalManager } = require('../integrations/terminal-manager');

// Get terminal manager instance
const terminalManager = getTerminalManager();

/**
 * Create a new terminal session
 */
router.post('/sessions', async (req, res) => {
    try {
        const { userId, projectData } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }
        
        console.log(`📝 Creating terminal session via HTTP for user: ${userId}`);
        
        const result = await terminalManager.createSession(userId, projectData);
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ Terminal session creation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get session status
 */
router.get('/sessions/:sessionId/status', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const result = terminalManager.getSessionStatus(sessionId);
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ Session status error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get all sessions for a user
 */
router.get('/users/:userId/sessions', (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = terminalManager.getUserSessions(userId);
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ User sessions error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Send input to terminal session
 */
router.post('/sessions/:sessionId/input', (req, res) => {
    try {
        const { sessionId } = req.params;
        const { input } = req.body;
        
        if (!input) {
            return res.status(400).json({
                success: false,
                error: 'Input is required'
            });
        }
        
        console.log(`📝 Sending input to session ${sessionId}: ${input.substring(0, 50)}...`);
        
        const success = terminalManager.sendInput(sessionId, input);
        
        res.json({
            success,
            sessionId,
            message: success ? 'Input sent successfully' : 'Failed to send input'
        });
        
    } catch (error) {
        console.error('❌ Send input error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Send prompt response (quick action for Claude Code prompts)
 */
router.post('/sessions/:sessionId/prompt-response', (req, res) => {
    try {
        const { sessionId } = req.params;
        const { responseKey } = req.body;
        
        if (!responseKey) {
            return res.status(400).json({
                success: false,
                error: 'Response key is required (e.g., "1", "y", "n")'
            });
        }
        
        console.log(`🎯 Sending prompt response to session ${sessionId}: ${responseKey}`);
        
        const result = terminalManager.sendPromptResponse(sessionId, responseKey);
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ Prompt response error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Terminate a session
 */
router.delete('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        console.log(`🛑 Terminating session via HTTP: ${sessionId}`);
        
        const result = await terminalManager.terminateSession(sessionId);
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ Session termination error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get system statistics
 */
router.get('/stats', (req, res) => {
    try {
        const stats = terminalManager.getSystemStats();
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('❌ System stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Health check for terminal system
 */
router.get('/health', (req, res) => {
    try {
        const stats = terminalManager.getSystemStats();
        
        res.json({
            success: true,
            message: 'Terminal system is healthy',
            stats: stats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Terminal health check error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Test endpoint for terminal functionality
 */
router.get('/test', async (req, res) => {
    try {
        console.log('🧪 Running terminal system test');
        
        // Test project data
        const testProjectData = {
            originalRequest: 'Create a simple HTML page with "Hello, World!" message and modern styling'
        };
        
        const testUserId = `test-terminal-${Date.now()}`;
        
        // Create test session
        const result = await terminalManager.createSession(testUserId, testProjectData);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Terminal system test successful',
                testSession: result,
                instructions: 'Connect via WebSocket to start Claude Code terminal'
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error,
                message: 'Terminal system test failed'
            });
        }
        
    } catch (error) {
        console.error('❌ Terminal test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Terminal system test failed'
        });
    }
});

module.exports = router;