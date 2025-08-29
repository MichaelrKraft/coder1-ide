/**
 * Claude File Activity API Routes
 * 
 * Provides REST endpoints and WebSocket functionality for real-time
 * file activity tracking from Claude Code agent.
 * 
 * Endpoints:
 * - GET /api/claude-file-activity/current - Get current activity
 * - GET /api/claude-file-activity/history - Get activity history
 * - GET /api/claude-file-activity/status - Get display status
 * - WebSocket /claude-file-activity - Real-time updates
 */

const express = require('express');
const router = express.Router();
const claudeFileTracker = require('../services/claude-file-tracker');

/**
 * Get current file activity
 */
router.get('/current', (req, res) => {
    try {
        const activity = claudeFileTracker.getCurrentActivity();
        res.json({
            success: true,
            data: activity,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('❌ Error getting current activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get current activity',
            message: error.message
        });
    }
});

/**
 * Get activity history
 */
router.get('/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const history = claudeFileTracker.getActivityHistory(limit);
        
        res.json({
            success: true,
            data: history,
            count: history.length,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('❌ Error getting activity history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get activity history',
            message: error.message
        });
    }
});

/**
 * Get display status for UI
 */
router.get('/status', (req, res) => {
    try {
        const status = claudeFileTracker.getDisplayStatus();
        res.json({
            success: true,
            data: status,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('❌ Error getting display status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get display status',
            message: error.message
        });
    }
});

/**
 * Get activity statistics
 */
router.get('/statistics', (req, res) => {
    try {
        const stats = claudeFileTracker.getStatistics();
        res.json({
            success: true,
            data: stats,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('❌ Error getting statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get statistics',
            message: error.message
        });
    }
});

/**
 * Manual file activity tracking endpoint (for testing)
 */
router.post('/track', (req, res) => {
    try {
        const { filePath, operation, sessionId, metadata } = req.body;
        
        if (!filePath && operation !== 'idle') {
            return res.status(400).json({
                success: false,
                error: 'File path is required for non-idle operations'
            });
        }
        
        let result;
        if (operation === 'idle') {
            result = claudeFileTracker.setIdle(sessionId);
        } else {
            result = claudeFileTracker.trackFileOperation(
                filePath,
                operation || 'reading',
                sessionId,
                metadata
            );
        }
        
        if (result) {
            res.json({
                success: true,
                message: 'File activity tracked successfully',
                timestamp: Date.now()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to track file activity'
            });
        }
    } catch (error) {
        console.error('❌ Error tracking file activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track file activity',
            message: error.message
        });
    }
});

/**
 * Setup WebSocket for real-time file activity updates
 */
function setupFileActivityWebSocket(io) {
    console.log('🎯 Setting up Claude File Activity WebSocket...');
    
    // Track connected file activity clients
    const fileActivityClients = new Set();
    
    // Remove any existing listeners to prevent duplicates
    claudeFileTracker.removeAllListeners('fileActivity');
    claudeFileTracker.removeAllListeners('activityChange');
    
    // Listen for file activity events and broadcast to clients
    claudeFileTracker.on('fileActivity', (activity) => {
        console.log('🎯 File activity event received:', activity);
        console.log('🎯 Connected clients:', fileActivityClients.size);
        
        if (fileActivityClients.size > 0) {
            console.log(`🎯 Broadcasting file activity to ${fileActivityClients.size} clients:`, activity.operation, activity.fileName);
            
            // Broadcast to all connected file activity clients
            fileActivityClients.forEach(socket => {
                if (socket.connected) {
                    socket.emit('claude-file-activity', {
                        type: 'activity',
                        data: activity,
                        timestamp: Date.now()
                    });
                    console.log(`🎯 Sent to socket ${socket.id}`);
                }
            });
        } else {
            console.log('🎯 No clients connected to broadcast to');
        }
    });
    
    // Listen for activity change events
    claudeFileTracker.on('activityChange', (change) => {
        console.log('🎯 Activity change event:', change.type);
        if (fileActivityClients.size > 0) {
            console.log(`🎯 Broadcasting activity change to ${fileActivityClients.size} clients:`, change.type);
            
            // Broadcast to all connected file activity clients
            fileActivityClients.forEach(socket => {
                if (socket.connected) {
                    socket.emit('claude-file-activity-change', change);
                }
            });
        }
    });
    
    // Handle new connections
    io.on('connection', (socket) => {
        // Handle file activity subscription
        socket.on('subscribe-file-activity', () => {
            console.log(`🎯 Client ${socket.id} subscribed to file activity updates`);
            fileActivityClients.add(socket);
            
            // Send current activity immediately
            const currentActivity = claudeFileTracker.getCurrentActivity();
            socket.emit('claude-file-activity', {
                type: 'current',
                data: currentActivity,
                timestamp: Date.now()
            });
            
            // Send acknowledgment
            socket.emit('file-activity-subscribed', { 
                success: true,
                message: 'Subscribed to file activity updates',
                currentActivity: currentActivity
            });
        });
        
        // Handle file activity unsubscription
        socket.on('unsubscribe-file-activity', () => {
            console.log(`🎯 Client ${socket.id} unsubscribed from file activity updates`);
            fileActivityClients.delete(socket);
            
            socket.emit('file-activity-unsubscribed', { 
                success: true,
                message: 'Unsubscribed from file activity updates'
            });
        });
        
        // Handle disconnection
        socket.on('disconnect', () => {
            if (fileActivityClients.has(socket)) {
                console.log(`🎯 Client ${socket.id} disconnected, removing from file activity clients`);
                fileActivityClients.delete(socket);
            }
        });
        
        // Handle manual file activity tracking via WebSocket
        socket.on('track-file-activity', (data) => {
            try {
                const { filePath, operation, sessionId, metadata } = data;
                
                let result;
                if (operation === 'idle') {
                    result = claudeFileTracker.setIdle(sessionId);
                } else {
                    result = claudeFileTracker.trackFileOperation(
                        filePath,
                        operation || 'reading',
                        sessionId,
                        metadata
                    );
                }
                
                socket.emit('file-activity-tracked', {
                    success: result,
                    message: result ? 'File activity tracked successfully' : 'Failed to track file activity',
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('❌ Error tracking file activity via WebSocket:', error);
                socket.emit('file-activity-tracked', {
                    success: false,
                    error: 'Failed to track file activity',
                    message: error.message,
                    timestamp: Date.now()
                });
            }
        });
        
        // Handle status requests
        socket.on('get-file-activity-status', () => {
            try {
                const status = claudeFileTracker.getDisplayStatus();
                socket.emit('file-activity-status', {
                    success: true,
                    data: status,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('❌ Error getting file activity status via WebSocket:', error);
                socket.emit('file-activity-status', {
                    success: false,
                    error: 'Failed to get status',
                    message: error.message,
                    timestamp: Date.now()
                });
            }
        });
    });
    
    console.log('✅ Claude File Activity WebSocket setup complete');
}

module.exports = router;
module.exports.setupFileActivityWebSocket = setupFileActivityWebSocket;