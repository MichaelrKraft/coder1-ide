const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Store session mappings
const sessionMap = new Map();

// Adapter endpoint to create terminal session
router.post('/create', (req, res) => {
    try {
        // Generate a session ID
        const sessionId = uuidv4();
        
        // Store session data
        sessionMap.set(sessionId, {
            id: sessionId,
            created: new Date(),
            projectData: req.body.projectData || {}
        });
        
        res.json({
            success: true,
            sessionId: sessionId,
            message: 'Terminal session created. Connect via WebSocket to /terminal namespace'
        });
    } catch (error) {
        console.error('Error creating terminal session:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get session info
router.get('/session/:id', (req, res) => {
    const session = sessionMap.get(req.params.id);
    if (session) {
        res.json({
            success: true,
            session: session
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }
});

// Start Claude Code (mock endpoint for now)
router.post('/claude', (req, res) => {
    const { sessionId, enhancedBrief } = req.body;
    
    if (!sessionId) {
        return res.status(400).json({
            success: false,
            message: 'Session ID required'
        });
    }
    
    // In a real implementation, this would trigger Claude Code in the terminal
    res.json({
        success: true,
        message: 'Claude Code start command sent to terminal',
        sessionId: sessionId,
        brief: enhancedBrief
    });
});

module.exports = router;