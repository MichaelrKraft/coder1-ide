const express = require('express');
const router = express.Router();

// In-memory storage for demo purposes
let analyticsEvents = [];

// Log analytics event
router.post('/event', async (req, res) => {
    try {
        const event = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            sessionId: req.body.sessionId || 'anonymous',
            projectId: req.body.projectId,
            eventType: req.body.eventType,
            eventData: req.body.eventData || {},
            userAgent: req.headers['user-agent'],
            ip: req.ip
        };

        // Store event (in production, this would go to a database)
        analyticsEvents.push(event);
        
        // Keep only last 1000 events to prevent memory issues
        if (analyticsEvents.length > 1000) {
            analyticsEvents = analyticsEvents.slice(-1000);
        }

        console.log(`Analytics event logged: ${event.eventType} for project ${event.projectId}`);

        res.json({
            success: true,
            eventId: event.id,
            message: 'Event logged successfully'
        });
    } catch (error) {
        console.error('Analytics event error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to log analytics event',
            message: error.message
        });
    }
});

// Get analytics summary (bonus endpoint)
router.get('/summary/:projectId?', (req, res) => {
    try {
        const { projectId } = req.params;
        
        // Filter events by project if specified
        let filteredEvents = analyticsEvents;
        if (projectId) {
            filteredEvents = analyticsEvents.filter(e => e.projectId === projectId);
        }

        const summary = {
            totalEvents: filteredEvents.length,
            eventTypes: {},
            recentEvents: filteredEvents.slice(-10),
            timeRange: {
                start: filteredEvents.length > 0 ? filteredEvents[0].timestamp : null,
                end: filteredEvents.length > 0 ? filteredEvents[filteredEvents.length - 1].timestamp : null
            }
        };

        // Count event types
        filteredEvents.forEach(event => {
            summary.eventTypes[event.eventType] = (summary.eventTypes[event.eventType] || 0) + 1;
        });

        res.json(summary);
    } catch (error) {
        console.error('Analytics summary error:', error);
        res.status(500).json({
            error: 'Failed to generate analytics summary',
            message: error.message
        });
    }
});

module.exports = router;