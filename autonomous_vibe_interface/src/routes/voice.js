const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Store active voice sessions
const voiceSessions = new Map();

// Create voice session
router.post('/session', async (req, res) => {
    try {
        const { userId } = req.body;
        const sessionId = uuidv4();
        
        voiceSessions.set(sessionId, {
            sessionId,
            userId: userId || 'anonymous',
            createdAt: new Date(),
            commands: []
        });
        
        console.log(`✅ Voice session created: ${sessionId} for user: ${userId}`);
        
        res.json({
            success: true,
            sessionId,
            message: 'Voice session created successfully'
        });
    } catch (error) {
        console.error('Failed to create voice session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create voice session'
        });
    }
});

// Process voice command
router.post('/command', async (req, res) => {
    try {
        const { sessionId, command, action } = req.body;
        
        if (!voiceSessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Voice session not found'
            });
        }
        
        const session = voiceSessions.get(sessionId);
        session.commands.push({
            command,
            action,
            timestamp: new Date()
        });
        
        console.log(`🎤 Voice command received - Session: ${sessionId}, Command: "${command}", Action: ${action}`);
        
        // For Claude commands, we could integrate with terminal manager here
        if (action === 'run-claude') {
            console.log('🤖 Would start Claude Code CLI here');
            // TODO: Integrate with terminal manager to actually start Claude
        }
        
        res.json({
            success: true,
            message: 'Voice command processed',
            command,
            action
        });
    } catch (error) {
        console.error('Failed to process voice command:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process voice command'
        });
    }
});

// Get session info
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!voiceSessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Voice session not found'
            });
        }
        
        const session = voiceSessions.get(sessionId);
        res.json({
            success: true,
            session
        });
    } catch (error) {
        console.error('Failed to get session info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get session info'
        });
    }
});

// Placeholder for transcribe endpoint (keeping for compatibility)
router.post('/transcribe', async (req, res) => {
    res.status(501).json({ 
        error: 'Voice transcription endpoint not implemented',
        message: 'This endpoint needs to be configured with proper voice services'
    });
});

module.exports = router;