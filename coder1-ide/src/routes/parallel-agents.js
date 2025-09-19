// Parallel Agents API Routes
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// In-memory storage for parallel agent sessions
const parallelSessions = new Map();

// Start a new parallel agents session
router.post('/start', (req, res) => {
    try {
        const { type, templateId, template, plan } = req.body;
        
        const sessionId = uuidv4();
        const agentCount = type === 'template' && template ? template.agents.length : 3;
        
        // Create session
        const session = {
            id: sessionId,
            type: type,
            templateId: templateId,
            template: template,
            customPlan: plan,
            status: 'running',
            agents: [],
            startTime: new Date(),
            completedAgents: 0,
            totalAgents: agentCount
        };
        
        // Initialize agents
        for (let i = 0; i < agentCount; i++) {
            session.agents.push({
                id: `agent-${i + 1}`,
                name: type === 'template' && template ? template.agents[i] : `Agent ${i + 1}`,
                status: 'running',
                branch: `parallel-${sessionId}-agent-${i + 1}`,
                startTime: new Date()
            });
        }
        
        parallelSessions.set(sessionId, session);
        
        // Simulate agents working (in production, this would trigger actual Claude agents)
        simulateAgentWork(session);
        
        res.json({
            success: true,
            sessionId: sessionId,
            agentCount: agentCount,
            message: `Started parallel execution with ${agentCount} agents`
        });
        
    } catch (error) {
        console.error('Error starting parallel agents:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start parallel agents',
            error: error.message
        });
    }
});

// Get session status
router.get('/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = parallelSessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }
    
    res.json({
        success: true,
        sessionId: session.id,
        status: session.status,
        completedAgents: session.completedAgents,
        totalAgents: session.totalAgents,
        successfulAgents: session.agents.filter(a => a.status === 'completed').length,
        failedAgents: session.agents.filter(a => a.status === 'failed').length,
        agents: session.agents.map(agent => ({
            id: agent.id,
            name: agent.name,
            status: agent.status,
            branch: agent.branch
        }))
    });
});

// Stop a session
router.post('/stop/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = parallelSessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }
    
    // Mark session as stopped
    session.status = 'stopped';
    session.endTime = new Date();
    
    // Stop all running agents
    session.agents.forEach(agent => {
        if (agent.status === 'running') {
            agent.status = 'stopped';
            agent.endTime = new Date();
        }
    });
    
    res.json({
        success: true,
        message: 'Parallel agents session stopped'
    });
});

// List active sessions
router.get('/sessions', (req, res) => {
    const activeSessions = Array.from(parallelSessions.values())
        .filter(session => session.status === 'running')
        .map(session => ({
            id: session.id,
            type: session.type,
            templateId: session.templateId,
            startTime: session.startTime,
            completedAgents: session.completedAgents,
            totalAgents: session.totalAgents
        }));
    
    res.json({
        success: true,
        sessions: activeSessions
    });
});

// Simulate agent work (mock implementation)
function simulateAgentWork(session) {
    session.agents.forEach((agent, index) => {
        // Simulate random completion time between 5-20 seconds
        const completionTime = 5000 + Math.random() * 15000;
        
        setTimeout(() => {
            // 90% success rate
            const success = Math.random() > 0.1;
            
            agent.status = success ? 'completed' : 'failed';
            agent.endTime = new Date();
            
            if (success) {
                agent.result = {
                    filesCreated: Math.floor(Math.random() * 10) + 5,
                    linesOfCode: Math.floor(Math.random() * 500) + 100,
                    testsWritten: Math.floor(Math.random() * 20) + 5
                };
            } else {
                agent.error = 'Simulated failure for demo purposes';
            }
            
            session.completedAgents++;
            
            // Check if all agents are done
            if (session.completedAgents === session.totalAgents) {
                session.status = 'completed';
                session.endTime = new Date();
            }
        }, completionTime);
    });
}

// Clean up old sessions (run every hour)
setInterval(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [sessionId, session] of parallelSessions.entries()) {
        if (session.endTime && session.endTime < oneHourAgo) {
            parallelSessions.delete(sessionId);
        }
    }
}, 60 * 60 * 1000);

module.exports = router;