const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// In-memory session storage
const hivemindSessions = new Map();

// Mock Hivemind functionality
router.post('/start', (req, res) => {
    const sessionId = uuidv4();
    
    console.log('Starting Hivemind session:', sessionId);
    
    // Create session with three agents
    const session = {
        id: sessionId,
        status: 'active',
        startTime: Date.now(),
        agents: {
            alpha: {
                name: 'Alpha (Architect)',
                status: 'thinking',
                role: 'System Architecture & Design',
                lastAction: 'Analyzing project requirements'
            },
            beta: {
                name: 'Beta (Implementer)', 
                status: 'waiting',
                role: 'Code Implementation',
                lastAction: 'Awaiting architecture plans'
            },
            gamma: {
                name: 'Gamma (Analyst)',
                status: 'waiting',
                role: 'Code Review & Optimization',
                lastAction: 'Ready to analyze'
            }
        },
        queen: 'alpha',
        sharedMemory: [],
        tasksCompleted: 0
    };
    
    hivemindSessions.set(sessionId, session);
    
    // Simulate agent coordination
    setTimeout(() => {
        const session = hivemindSessions.get(sessionId);
        if (session) {
            session.agents.alpha.status = 'working';
            session.agents.beta.status = 'thinking';
            session.sharedMemory.push({
                from: 'alpha',
                type: 'architecture',
                content: 'Proposed microservices architecture with 3 core services'
            });
        }
    }, 3000);
    
    res.json({
        success: true,
        sessionId: sessionId,
        message: 'Hivemind coordination initiated'
    });
});

router.get('/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = hivemindSessions.get(sessionId);
    
    if (!session) {
        return res.json({
            success: false,
            message: 'Session not found'
        });
    }
    
    // Simulate progress
    if (session.status === 'active' && Math.random() > 0.7) {
        session.tasksCompleted++;
        
        // Rotate queen role
        const agents = ['alpha', 'beta', 'gamma'];
        const currentIndex = agents.indexOf(session.queen);
        session.queen = agents[(currentIndex + 1) % 3];
        
        // Update agent statuses
        Object.keys(session.agents).forEach(agent => {
            session.agents[agent].status = agent === session.queen ? 'leading' : 'collaborating';
        });
    }
    
    res.json({
        success: true,
        sessionId: session.id,
        status: session.status,
        queen: session.queen,
        agents: session.agents,
        tasksCompleted: session.tasksCompleted,
        memorySize: session.sharedMemory.length,
        runtime: Date.now() - session.startTime
    });
});

router.get('/demo/status', (req, res) => {
    // Demo data for visualization
    res.json({
        success: true,
        demo: true,
        agents: {
            alpha: {
                name: 'Alpha (Architect)',
                status: 'working',
                progress: 75,
                currentTask: 'Designing authentication system'
            },
            beta: {
                name: 'Beta (Implementer)',
                status: 'collaborating', 
                progress: 60,
                currentTask: 'Implementing user service'
            },
            gamma: {
                name: 'Gamma (Analyst)',
                status: 'analyzing',
                progress: 40,
                currentTask: 'Reviewing code quality metrics'
            }
        },
        queen: 'alpha',
        collectiveMemory: {
            size: 42,
            lastUpdate: Date.now() - 5000
        }
    });
});

module.exports = router;