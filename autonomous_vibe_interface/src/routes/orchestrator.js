/**
 * Orchestrator REST API Routes
 * Fallback API endpoints for when Socket.IO is not available
 */

const express = require('express');
const router = express.Router();

// Use shared singleton instance to maintain sessions across all handlers
const conversationOrchestrator = require('../services/conversation-orchestrator-singleton');

// Store for tracking active sessions (in production, use Redis or database)
const activeSessions = new Map();

/**
 * POST /api/orchestrator/start
 * Start a new AI expert consultation session
 */
router.post('/start', async (req, res) => {
    try {
        const { query, files = [], options = {} } = req.body;
        
        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Query is required to start consultation'
            });
        }
        
        console.log(`🎭 [ORCHESTRATOR-API] Starting session for query: ${query.substring(0, 100)}...`);
        
        // Start orchestrator session
        const session = await conversationOrchestrator.startSession(
            req.ip, // Use IP as userId for REST API
            query.trim(),
            {
                maxExperts: options.minAgents || 3,
                includeUserInCollaboration: true
            }
        );
        
        // Store session for tracking
        activeSessions.set(session.sessionId, {
            ...session,
            lastActivity: Date.now()
        });
        
        res.json({
            success: true,
            data: {
                sessionId: session.sessionId,
                query: query.trim(),
                phase: session.phase,
                orchestratorMessage: session.orchestratorMessage,
                agents: session.selectedExperts || []
            }
        });
        
        console.log(`🎭 [ORCHESTRATOR-API] Session started: ${session.sessionId}`);
        
    } catch (error) {
        console.error('🎭 [ORCHESTRATOR-API] Error starting session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start consultation. Please try again.'
        });
    }
});

/**
 * POST /api/orchestrator/message
 * Send a message to an active consultation session
 */
router.post('/message', async (req, res) => {
    try {
        const { sessionId, message } = req.body;
        
        if (!sessionId || !message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: 'SessionId and message are required'
            });
        }
        
        console.log(`🎭 [ORCHESTRATOR-API] Message for ${sessionId}: ${message.substring(0, 100)}...`);
        
        // Update last activity
        const session = activeSessions.get(sessionId);
        if (session) {
            session.lastActivity = Date.now();
        }
        
        // Handle user message (no emit callback for REST API)
        const response = await conversationOrchestrator.handleUserMessage(sessionId, message.trim());
        
        res.json({
            success: true,
            data: response
        });
        
    } catch (error) {
        console.error('🎭 [ORCHESTRATOR-API] Error handling message:', error);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: 'Session not found or expired'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to process message. Please try again.'
        });
    }
});

/**
 * GET /api/orchestrator/session/:sessionId
 * Get current session status and recent messages
 */
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = activeSessions.get(sessionId);
        
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found or expired'
            });
        }
        
        // Update last activity
        session.lastActivity = Date.now();
        
        res.json({
            success: true,
            data: {
                sessionId: session.sessionId,
                phase: session.phase,
                agents: session.selectedExperts || [],
                messages: session.messages || [],
                active: session.active,
                startTime: session.startTime,
                lastActivity: session.lastActivity
            }
        });
        
    } catch (error) {
        console.error('🎭 [ORCHESTRATOR-API] Error getting session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve session status'
        });
    }
});

/**
 * POST /api/orchestrator/export
 * Export conversation results (placeholder)
 */
router.post('/export', async (req, res) => {
    try {
        const { sessionId, exportType } = req.body;
        
        if (!sessionId || !exportType) {
            return res.status(400).json({
                success: false,
                error: 'SessionId and exportType are required'
            });
        }
        
        console.log(`🎭 [ORCHESTRATOR-API] Export request: ${sessionId} (${exportType})`);
        
        // TODO: Implement actual export functionality
        res.json({
            success: true,
            data: {
                message: 'Export functionality coming soon!',
                exportType,
                sessionId
            }
        });
        
    } catch (error) {
        console.error('🎭 [ORCHESTRATOR-API] Export error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export conversation'
        });
    }
});

/**
 * POST /api/orchestrator/upload
 * Handle file uploads for consultation context
 */
router.post('/upload', async (req, res) => {
    try {
        const { sessionId, files = [] } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'SessionId is required'
            });
        }
        
        console.log(`🎭 [ORCHESTRATOR-API] File upload for ${sessionId}: ${files.length} files`);
        
        // TODO: Implement file processing and integration with AI context
        res.json({
            success: true,
            data: {
                message: 'File upload functionality coming soon!',
                filesReceived: files.length
            }
        });
        
    } catch (error) {
        console.error('🎭 [ORCHESTRATOR-API] Upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process file upload'
        });
    }
});

/**
 * GET /api/orchestrator/health
 * Health check endpoint with AI service monitoring
 */
router.get('/health', (req, res) => {
    const orchestratorHealth = conversationOrchestrator.getHealthStatus();
    
    res.json({
        success: true,
        status: orchestratorHealth.overallHealth,
        activeSessions: activeSessions.size,
        uptime: process.uptime(),
        timestamp: Date.now(),
        aiServices: {
            claudeCodeCli: orchestratorHealth.claudeCodeCli,
            anthropicSdk: orchestratorHealth.anthropicSdk,
            recommendedService: orchestratorHealth.recommendedService
        }
    });
});

// Clean up expired sessions (runs every 10 minutes)
setInterval(() => {
    const now = Date.now();
    const expiredSessions = [];
    
    for (const [sessionId, session] of activeSessions.entries()) {
        // Remove sessions inactive for more than 1 hour
        if (now - session.lastActivity > 3600000) {
            expiredSessions.push(sessionId);
        }
    }
    
    expiredSessions.forEach(sessionId => {
        activeSessions.delete(sessionId);
        console.log(`🎭 [ORCHESTRATOR-API] Cleaned up expired session: ${sessionId}`);
    });
    
    if (expiredSessions.length > 0) {
        console.log(`🎭 [ORCHESTRATOR-API] Cleaned up ${expiredSessions.length} expired sessions`);
    }
}, 600000); // 10 minutes

module.exports = router;