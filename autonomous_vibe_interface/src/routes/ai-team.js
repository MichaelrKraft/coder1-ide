/**
 * AI Team Management Routes
 * 
 * API endpoints for spawning and managing AI development teams
 */

const express = require('express');
const router = express.Router();

// In-memory storage for active AI teams
const activeTeams = new Map();

/**
 * Spawn AI Team - Create a simulated multi-agent development team
 */
router.post('/spawn', (req, res) => {
    try {
        const { sessionId, projectType = 'web-app', complexity = 'medium' } = req.body;
        
        // Generate unique team ID
        const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Define AI agents based on project type
        const agentConfigs = {
            'web-app': [
                { name: 'Frontend Developer', role: 'frontend', expertise: ['React', 'TypeScript', 'Tailwind'] },
                { name: 'Backend Developer', role: 'backend', expertise: ['Node.js', 'Express', 'API Design'] },
                { name: 'UI/UX Designer', role: 'design', expertise: ['Figma', 'Design Systems', 'User Research'] },
                { name: 'QA Engineer', role: 'testing', expertise: ['Jest', 'Cypress', 'Test Automation'] },
                { name: 'DevOps Engineer', role: 'devops', expertise: ['Docker', 'CI/CD', 'Deployment'] },
                { name: 'Tech Lead', role: 'architect', expertise: ['Architecture', 'Code Review', 'Best Practices'] }
            ],
            'mobile-app': [
                { name: 'Mobile Developer', role: 'mobile', expertise: ['React Native', 'iOS', 'Android'] },
                { name: 'Backend Developer', role: 'backend', expertise: ['Node.js', 'GraphQL', 'Database'] },
                { name: 'UI/UX Designer', role: 'design', expertise: ['Mobile Design', 'Prototyping'] },
                { name: 'QA Engineer', role: 'testing', expertise: ['Mobile Testing', 'Device Testing'] }
            ]
        };
        
        const agents = agentConfigs[projectType] || agentConfigs['web-app'];
        
        // Create team configuration
        const team = {
            teamId,
            sessionId: sessionId || `session_${Date.now()}`,
            projectType,
            complexity,
            status: 'initializing',
            agents: agents.map((agent, index) => ({
                id: `agent_${index + 1}`,
                ...agent,
                status: 'idle',
                progress: 0,
                currentTask: null,
                completedTasks: []
            })),
            createdAt: Date.now(),
            startedAt: null,
            completedAt: null,
            progress: {
                overall: 0,
                planning: 0,
                development: 0,
                testing: 0,
                deployment: 0
            }
        };
        
        // Store active team
        activeTeams.set(teamId, team);
        
        // Emit socket event for real-time updates (if io is available)
        if (global.io) {
            global.io.emit('ai-team:spawned', {
                teamId,
                sessionId: team.sessionId,
                agents: team.agents,
                status: team.status
            });
        }
        
        console.log(`🤖 [AI-TEAM] Spawned team ${teamId} with ${agents.length} agents`);
        
        res.json({
            success: true,
            teamId,
            sessionId: team.sessionId,
            agents: team.agents,
            status: team.status,
            message: `AI Team spawned with ${agents.length} agents`
        });
        
    } catch (error) {
        console.error('AI Team spawn error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to spawn AI team' 
        });
    }
});

/**
 * Start AI Team Work - Begin the development process
 */
router.post('/:teamId/start', async (req, res) => {
    try {
        const { teamId } = req.params;
        const { tasks = [] } = req.body;
        
        const team = activeTeams.get(teamId);
        if (!team) {
            return res.status(404).json({ 
                success: false,
                error: 'Team not found' 
            });
        }
        
        // Update team status
        team.status = 'working';
        team.startedAt = Date.now();
        
        // Assign initial tasks to agents
        if (tasks.length > 0) {
            tasks.slice(0, team.agents.length).forEach((task, index) => {
                if (team.agents[index]) {
                    team.agents[index].currentTask = task;
                    team.agents[index].status = 'working';
                }
            });
        } else {
            // Default tasks based on roles
            team.agents.forEach(agent => {
                switch (agent.role) {
                    case 'frontend':
                        agent.currentTask = 'Setting up React components and UI structure';
                        break;
                    case 'backend':
                        agent.currentTask = 'Creating API endpoints and database schema';
                        break;
                    case 'design':
                        agent.currentTask = 'Designing user interface mockups';
                        break;
                    case 'testing':
                        agent.currentTask = 'Setting up test framework and writing initial tests';
                        break;
                    case 'devops':
                        agent.currentTask = 'Configuring deployment pipeline';
                        break;
                    case 'architect':
                        agent.currentTask = 'Reviewing architecture and coordinating team';
                        break;
                    default:
                        agent.currentTask = 'Analyzing project requirements';
                }
                agent.status = 'working';
            });
        }
        
        // Create checkpoint for AI team activation
        await createTeamCheckpoint(team, 'AI Team Started', 'AI development team activated and began work');
        
        // Start simulated progress updates
        startProgressSimulation(teamId);
        
        // Emit socket event
        if (global.io) {
            global.io.emit('ai-team:started', {
                teamId,
                sessionId: team.sessionId,
                agents: team.agents,
                status: team.status
            });
        }
        
        console.log(`🚀 [AI-TEAM] Started team ${teamId} with ${team.agents.length} agents working`);
        
        res.json({
            success: true,
            teamId,
            agents: team.agents,
            status: team.status,
            message: 'AI Team started working'
        });
        
    } catch (error) {
        console.error('AI Team start error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to start AI team' 
        });
    }
});

/**
 * Get AI Team Status - Retrieve current team progress
 */
router.get('/:teamId/status', (req, res) => {
    try {
        const { teamId } = req.params;
        
        const team = activeTeams.get(teamId);
        if (!team) {
            return res.status(404).json({ 
                success: false,
                error: 'Team not found' 
            });
        }
        
        res.json({
            success: true,
            team
        });
        
    } catch (error) {
        console.error('AI Team status error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get team status' 
        });
    }
});

/**
 * Stop AI Team - Halt all agent work
 */
router.post('/:teamId/stop', async (req, res) => {
    try {
        const { teamId } = req.params;
        
        const team = activeTeams.get(teamId);
        if (!team) {
            return res.status(404).json({ 
                success: false,
                error: 'Team not found' 
            });
        }
        
        // Update team status
        team.status = 'stopped';
        team.completedAt = Date.now();
        
        // Stop all agents
        team.agents.forEach(agent => {
            agent.status = 'stopped';
            agent.currentTask = null;
        });
        
        // Clear progress timer if exists
        if (team.progressTimer) {
            clearInterval(team.progressTimer);
            delete team.progressTimer;
        }
        
        // Create final checkpoint
        await createTeamCheckpoint(team, 'AI Team Stopped', 'AI development team stopped by user');
        
        // Emit socket event
        if (global.io) {
            global.io.emit('ai-team:stopped', {
                teamId,
                sessionId: team.sessionId,
                agents: team.agents,
                status: team.status,
                duration: team.completedAt - team.startedAt
            });
        }
        
        console.log(`🛑 [AI-TEAM] Stopped team ${teamId}`);
        
        res.json({
            success: true,
            teamId,
            status: team.status,
            duration: team.completedAt - team.startedAt,
            message: 'AI Team stopped'
        });
        
    } catch (error) {
        console.error('AI Team stop error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to stop AI team' 
        });
    }
});

/**
 * List all active teams
 */
router.get('/', (req, res) => {
    try {
        const teams = Array.from(activeTeams.values()).map(team => ({
            teamId: team.teamId,
            sessionId: team.sessionId,
            status: team.status,
            agentCount: team.agents.length,
            progress: team.progress.overall,
            createdAt: team.createdAt,
            duration: team.startedAt ? (team.completedAt || Date.now()) - team.startedAt : 0
        }));
        
        res.json({
            success: true,
            teams,
            total: teams.length
        });
        
    } catch (error) {
        console.error('AI Teams list error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to list AI teams' 
        });
    }
});

/**
 * Helper: Create checkpoint for team events
 */
async function createTeamCheckpoint(team, name, description) {
    try {
        // Use existing sessions API to create checkpoint
        const fetch = require('node-fetch');
        const response = await fetch(`http://localhost:3000/api/sessions/${team.sessionId}/checkpoint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                description,
                data: {
                    teamId: team.teamId,
                    agents: team.agents,
                    progress: team.progress,
                    status: team.status
                },
                tags: ['ai-team', 'auto'],
                autoGenerated: true
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log(`💾 [AI-TEAM] Created checkpoint: ${name}`);
            return result;
        }
    } catch (error) {
        console.error('Failed to create team checkpoint:', error);
    }
    return null;
}

/**
 * Helper: Simulate agent progress over time
 */
function startProgressSimulation(teamId) {
    const team = activeTeams.get(teamId);
    if (!team || team.status !== 'working') return;
    
    team.progressTimer = setInterval(() => {
        // Update individual agent progress
        team.agents.forEach(agent => {
            if (agent.status === 'working' && agent.progress < 100) {
                // Random progress increment (1-5%)
                const increment = Math.floor(Math.random() * 5) + 1;
                agent.progress = Math.min(agent.progress + increment, 100);
                
                // Simulate task completion
                if (agent.progress === 100 && agent.currentTask) {
                    agent.completedTasks.push(agent.currentTask);
                    agent.currentTask = `Completed: ${agent.currentTask}`;
                    agent.status = 'completed';
                }
            }
        });
        
        // Update overall progress
        const totalProgress = team.agents.reduce((sum, agent) => sum + agent.progress, 0);
        team.progress.overall = Math.floor(totalProgress / team.agents.length);
        
        // Emit progress update
        if (global.io) {
            global.io.emit('ai-team:progress', {
                teamId,
                sessionId: team.sessionId,
                agents: team.agents,
                progress: team.progress
            });
        }
        
        // Check if all agents completed
        const allCompleted = team.agents.every(agent => agent.progress >= 100);
        if (allCompleted) {
            team.status = 'completed';
            team.completedAt = Date.now();
            clearInterval(team.progressTimer);
            
            // Create completion checkpoint
            createTeamCheckpoint(team, 'AI Team Completed', 'All AI agents completed their assigned tasks');
            
            if (global.io) {
                global.io.emit('ai-team:completed', {
                    teamId,
                    sessionId: team.sessionId,
                    agents: team.agents,
                    duration: team.completedAt - team.startedAt
                });
            }
            
            console.log(`✅ [AI-TEAM] Team ${teamId} completed all tasks`);
        }
        
    }, 3000); // Update every 3 seconds
}

module.exports = router;