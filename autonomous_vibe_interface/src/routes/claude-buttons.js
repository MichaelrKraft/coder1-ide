/**
 * Claude Code Button Routes
 * 
 * API endpoints for terminal header button functionality
 */

const express = require('express');
const router = express.Router();
const { EnhancedClaudeCodeButtonBridge } = require('../integrations/enhanced-claude-bridge');

// Create enhanced singleton instance with intelligence systems
const claudeBridge = new EnhancedClaudeCodeButtonBridge({
    logger: console,
    watchPaths: ['src', 'coder1-ide', 'public'] // Customize what to watch
});

// WebSocket connections map
const wsConnections = new Map();

// Register Socket.IO connection (not WebSocket)
router.registerWebSocket = (sessionId, socket) => {
    wsConnections.set(sessionId, socket);
    
    socket.on('disconnect', () => {
        wsConnections.delete(sessionId);
    });
};

// Forward Claude output to Socket.IO
claudeBridge.on('output', ({ sessionId, data }) => {
    const socket = wsConnections.get(sessionId);
    if (socket && socket.connected) {
        socket.emit('claude:output', {
            sessionId,
            data
        });
    }
});

// Session completion events
claudeBridge.on('sessionComplete', ({ sessionId, duration }) => {
    const socket = wsConnections.get(sessionId);
    if (socket && socket.connected) {
        socket.emit('claude:sessionComplete', {
            sessionId,
            duration
        });
    }
});

/**
 * Start Supervision mode
 */
router.post('/supervision/start', async (req, res) => {
    try {
        const { prompt, sessionId, explicit } = req.body;
        console.log(`[SUPERVISION] Start request received - sessionId: ${sessionId}, prompt: ${prompt?.substring(0, 50)}..., explicit: ${explicit}`);
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        
        // Block automatic supervision triggers - require explicit user action
        if (!explicit) {
            console.log('[SUPERVISION] Blocked auto-trigger - supervision must be explicitly started via button');
            return res.status(400).json({ 
                error: 'Supervision must be explicitly started',
                message: 'Use the supervision button in the terminal interface'
            });
        }
        
        // Start the existing supervision system
        console.log('[SUPERVISION] Starting claude bridge supervision...');
        const id = await claudeBridge.startSupervision(prompt, sessionId);
        console.log(`[SUPERVISION] Claude bridge returned session ID: ${id}`);
        
        // Also trigger PTY supervision if we have a WebSocket connection
        const socket = wsConnections.get(id);
        if (socket) {
            console.log(`🔗 Triggering PTY supervision for session ${id}`);
            socket.emit('supervision:start-pty', { sessionId: id });
        }
        
        res.json({
            success: true,
            sessionId: id,
            mode: 'supervision',
            message: 'Supervision mode started with PTY integration'
        });
    } catch (error) {
        console.error('Supervision start error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Start Parallel Agents
 */
router.post('/parallel/start', async (req, res) => {
    console.log('🤖 [PARALLEL AGENTS] API endpoint reached!');
    console.log('🤖 [PARALLEL AGENTS] Request body:', req.body);
    console.log('🤖 [PARALLEL AGENTS] Prompt length:', req.body.prompt?.length);
    console.log('🤖 [PARALLEL AGENTS] Session ID:', req.body.sessionId);
    try {
        const { prompt, sessionId } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        
        // Get the socket ID from the request headers (if available)
        const socketId = req.headers['x-socket-id'];
        
        const id = await claudeBridge.startParallelAgents(prompt, sessionId);
        
        // If we have a socket ID, try to find and register the socket
        if (socketId) {
            const io = req.app.get('io');
            if (io) {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    wsConnections.set(id, socket);
                    console.log(`Registered socket ${socketId} for session ${id}`);
                }
            }
        }
        
        res.json({
            success: true,
            sessionId: id,
            mode: 'parallel',
            message: 'Parallel agents started'
        });
    } catch (error) {
        console.error('Parallel agents start error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Start Infinite Loop
 */
router.post('/infinite/start', async (req, res) => {
    try {
        const { prompt, sessionId } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        
        // Get the socket ID from the request headers (if available)
        const socketId = req.headers['x-socket-id'];
        
        const id = await claudeBridge.startInfiniteLoop(prompt, sessionId);
        
        // If we have a socket ID, try to find and register the socket
        if (socketId) {
            const io = req.app.get('io');
            if (io) {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    wsConnections.set(id, socket);
                    console.log(`Registered socket ${socketId} for infinite loop session ${id}`);
                }
            }
        }
        
        res.json({
            success: true,
            sessionId: id,
            mode: 'infinite',
            message: 'Infinite loop started'
        });
    } catch (error) {
        console.error('Infinite loop start error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Start Hivemind
 */
router.post('/hivemind/start', async (req, res) => {
    try {
        const { prompt, sessionId } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        
        // Get the socket ID from the request headers (if available)
        const socketId = req.headers['x-socket-id'];
        
        const id = await claudeBridge.startHivemind(prompt, sessionId);
        
        // If we have a socket ID, try to find and register the socket
        if (socketId) {
            const io = req.app.get('io');
            if (io) {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    wsConnections.set(id, socket);
                    console.log(`Registered socket ${socketId} for hivemind session ${id}`);
                }
            }
        }
        
        res.json({
            success: true,
            sessionId: id,
            mode: 'hivemind',
            message: 'Hivemind started'
        });
    } catch (error) {
        console.error('Hivemind start error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Stop Hivemind
 */
router.post('/hivemind/stop', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }
        
        await claudeBridge.stopSession(sessionId);
        
        res.json({
            success: true,
            sessionId: sessionId,
            message: 'Hivemind stopped'
        });
    } catch (error) {
        console.error('Hivemind stop error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Stop a session
 */
router.post('/session/stop', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }
        
        await claudeBridge.stopSession(sessionId);
        
        res.json({
            success: true,
            message: 'Session stopped'
        });
    } catch (error) {
        console.error('Session stop error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get active sessions
 */
router.get('/sessions/active', (req, res) => {
    try {
        const sessions = claudeBridge.getActiveSessions();
        
        res.json({
            success: true,
            sessions
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get proactive suggestions
 */
router.get('/suggestions', (req, res) => {
    try {
        const suggestions = claudeBridge.getProactiveSuggestions();
        const stats = claudeBridge.getProactiveStats();
        
        res.json({
            success: true,
            suggestions,
            stats,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Get suggestions error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Execute proactive suggestion
 */
router.post('/suggestions/:type/execute', async (req, res) => {
    try {
        const { type } = req.params;
        
        if (!type) {
            return res.status(400).json({ error: 'Suggestion type is required' });
        }
        
        const result = await claudeBridge.executeProactiveSuggestion(type);
        
        res.json({
            success: true,
            result,
            message: `Executing proactive suggestion: ${type}`
        });
    } catch (error) {
        console.error('Execute suggestion error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Dismiss proactive suggestion
 */
router.post('/suggestions/:type/dismiss', (req, res) => {
    try {
        const { type } = req.params;
        
        if (!type) {
            return res.status(400).json({ error: 'Suggestion type is required' });
        }
        
        const dismissed = claudeBridge.dismissProactiveSuggestion(type);
        
        if (dismissed) {
            res.json({
                success: true,
                message: `Dismissed suggestion: ${type}`
            });
        } else {
            res.status(404).json({
                error: `Suggestion ${type} not found`
            });
        }
    } catch (error) {
        console.error('Dismiss suggestion error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get pending approvals
 */
router.get('/approvals', (req, res) => {
    try {
        const { sessionId } = req.query;
        const approvals = claudeBridge.getPendingApprovals(sessionId);
        const stats = claudeBridge.getApprovalStats();
        const recommendations = claudeBridge.generateSmartRecommendations(sessionId);
        
        res.json({
            success: true,
            approvals,
            stats,
            recommendations,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Get approvals error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Request approval for an action
 */
router.post('/approvals/request', async (req, res) => {
    try {
        const actionDetails = req.body;
        
        if (!actionDetails.type || !actionDetails.action) {
            return res.status(400).json({ error: 'Action type and action are required' });
        }
        
        const approval = await claudeBridge.requestApproval(actionDetails);
        
        res.json({
            success: true,
            approval,
            message: 'Approval request created'
        });
    } catch (error) {
        console.error('Request approval error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Approve an action
 */
router.post('/approvals/:id/approve', (req, res) => {
    try {
        const { id } = req.params;
        const options = req.body;
        
        const approval = claudeBridge.approveAction(id, options);
        
        res.json({
            success: true,
            approval,
            message: 'Action approved'
        });
    } catch (error) {
        console.error('Approve action error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Reject an action
 */
router.post('/approvals/:id/reject', (req, res) => {
    try {
        const { id } = req.params;
        const options = req.body;
        
        const approval = claudeBridge.rejectAction(id, options);
        
        res.json({
            success: true,
            approval,
            message: 'Action rejected'
        });
    } catch (error) {
        console.error('Reject action error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Batch approve actions
 */
router.post('/approvals/batch/approve', (req, res) => {
    try {
        const { approvalIds, ...options } = req.body;
        
        if (!approvalIds || !Array.isArray(approvalIds)) {
            return res.status(400).json({ error: 'Approval IDs array is required' });
        }
        
        const results = claudeBridge.batchApprove(approvalIds, options);
        
        res.json({
            success: true,
            results,
            message: `Batch approval completed: ${results.filter(r => r.status === 'approved').length} approved`
        });
    } catch (error) {
        console.error('Batch approve error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get performance statistics
 */
router.get('/performance', (req, res) => {
    try {
        const stats = claudeBridge.getPerformanceStats();
        
        res.json({
            success: true,
            performance: stats,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Get performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Set performance mode
 */
router.post('/performance/mode', (req, res) => {
    try {
        const { mode } = req.body;
        
        if (!mode || !['normal', 'performance', 'power-save'].includes(mode)) {
            return res.status(400).json({ error: 'Valid performance mode is required (normal, performance, power-save)' });
        }
        
        claudeBridge.setPerformanceMode(mode);
        
        res.json({
            success: true,
            mode,
            message: `Performance mode set to ${mode}`
        });
    } catch (error) {
        console.error('Set performance mode error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Force hibernation
 */
router.post('/performance/hibernate', (req, res) => {
    try {
        const { reason } = req.body;
        
        claudeBridge.forceHibernation(reason || 'Manual hibernation via API');
        
        res.json({
            success: true,
            message: 'System hibernation initiated'
        });
    } catch (error) {
        console.error('Force hibernation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Force wake up
 */
router.post('/performance/wakeup', (req, res) => {
    try {
        const { reason } = req.body;
        
        claudeBridge.forceWakeUp(reason || 'Manual wake up via API');
        
        res.json({
            success: true,
            message: 'System wake up initiated'
        });
    } catch (error) {
        console.error('Force wake up error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Clear performance caches
 */
router.post('/performance/clear-cache', (req, res) => {
    try {
        const { cacheType } = req.body;
        
        claudeBridge.clearPerformanceCaches(cacheType);
        
        res.json({
            success: true,
            message: cacheType ? `Cleared ${cacheType} cache` : 'Cleared all caches'
        });
    } catch (error) {
        console.error('Clear cache error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get project progress data for coaching dashboard
 */
router.get('/coaching/progress', async (req, res) => {
    try {
        const progressData = await claudeBridge.getProjectProgress();
        
        res.json({
            success: true,
            progress: progressData,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Get project progress error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get learning progress for skills tracking
 */
router.get('/coaching/learning', async (req, res) => {
    try {
        const learningData = await claudeBridge.getLearningProgress();
        
        res.json({
            success: true,
            learning: learningData,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Get learning progress error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get AI confidence levels
 */
router.get('/coaching/confidence', async (req, res) => {
    try {
        const confidenceData = await claudeBridge.getConfidenceLevels();
        
        res.json({
            success: true,
            confidence: confidenceData,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Get confidence levels error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get smart next-step recommendations
 */
router.get('/coaching/next-steps', async (req, res) => {
    try {
        const nextSteps = await claudeBridge.getSmartNextSteps();
        
        res.json({
            success: true,
            nextSteps,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Get next steps error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get recent achievements and wins
 */
router.get('/coaching/achievements', async (req, res) => {
    try {
        const achievements = await claudeBridge.getRecentAchievements();
        
        res.json({
            success: true,
            achievements,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Get achievements error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get problem detection and friendly warnings
 */
router.get('/coaching/problems', async (req, res) => {
    try {
        const problems = await claudeBridge.detectProblems();
        
        res.json({
            success: true,
            problems,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Get problems error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Session Summary Endpoint for Agent Handoff
router.post('/session-summary', async (req, res) => {
    try {
        console.log('📋 Session summary requested');
        
        const { sessionData, prompt } = req.body;
        
        if (!sessionData || !prompt) {
            return res.status(400).json({ 
                error: 'Session data and prompt are required',
                required: ['sessionData', 'prompt']
            });
        }

        // Generate session summary using enhanced claude bridge
        const result = await claudeBridge.generateSessionSummary(sessionData, prompt);
        
        console.log('✅ Session summary generated:', result.source);
        
        res.json({
            success: result.success,
            summary: result.summary,
            metadata: {
                source: result.source,
                timestamp: result.timestamp,
                note: result.note,
                error: result.error
            }
        });
        
    } catch (error) {
        console.error('❌ Session summary generation error:', error);
        res.status(500).json({ 
            error: 'Failed to generate session summary',
            details: error.message 
        });
    }
});

module.exports = router;