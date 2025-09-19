const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// In-memory session storage (no external dependencies)
const sessions = new Map();

// Simple mock implementation without InfiniteLoopManager dependency
router.get('/test-connection', (req, res) => {
    console.log('Testing infinite loop connection (mock)');
    res.json({
        success: true,
        message: 'Connection test successful (mock mode)',
        capabilities: ['infinite-loop', 'supervision', 'parallel-agents', 'hivemind']
    });
});

router.post('/start', (req, res) => {
    const { command } = req.body;
    const sessionId = uuidv4();
    
    console.log('Starting infinite loop session (mock):', sessionId);
    console.log('Command:', command);
    
    // Create session
    const session = {
        id: sessionId,
        command: command || 'create innovative React components',
        status: 'running',
        startTime: Date.now(),
        currentWave: 1,
        totalGenerated: 0,
        components: []
    };
    
    sessions.set(sessionId, session);
    
    // Simulate component generation
    const interval = setInterval(() => {
        const session = sessions.get(sessionId);
        if (!session || session.status !== 'running') {
            clearInterval(interval);
            return;
        }
        
        // Generate mock component
        session.totalGenerated++;
        session.components.push({
            id: uuidv4(),
            name: `Component_${session.totalGenerated}`,
            wave: session.currentWave,
            timestamp: Date.now()
        });
        
        // Progress waves
        if (session.totalGenerated % 5 === 0) {
            session.currentWave++;
        }
        
        // Auto-stop after 20 components for demo
        if (session.totalGenerated >= 20) {
            session.status = 'completed';
            clearInterval(interval);
        }
    }, 3000); // Generate component every 3 seconds
    
    res.json({
        success: true,
        sessionId: sessionId,
        message: 'Infinite loop started successfully (mock mode)'
    });
});

router.get('/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (!session) {
        return res.json({
            success: false,
            message: 'Session not found'
        });
    }
    
    res.json({
        success: true,
        sessionId: session.id,
        status: session.status,
        currentWave: session.currentWave,
        totalGenerated: session.totalGenerated,
        runtime: Date.now() - session.startTime,
        lastComponent: session.components[session.components.length - 1] || null
    });
});

router.post('/stop/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (!session) {
        return res.json({
            success: false,
            message: 'Session not found'
        });
    }
    
    session.status = 'stopped';
    
    res.json({
        success: true,
        message: 'Session stopped successfully',
        finalStats: {
            totalGenerated: session.totalGenerated,
            waves: session.currentWave,
            runtime: Date.now() - session.startTime
        }
    });
});

router.get('/sessions', (req, res) => {
    const activeSessions = Array.from(sessions.values())
        .filter(s => s.status === 'running')
        .map(s => ({
            id: s.id,
            command: s.command,
            currentWave: s.currentWave,
            totalGenerated: s.totalGenerated,
            runtime: Date.now() - s.startTime
        }));
    
    res.json({
        success: true,
        sessions: activeSessions,
        count: activeSessions.length
    });
});

// Health check for this route
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Infinite loop routes are healthy',
        activeSessions: sessions.size
    });
});

module.exports = router;