/**
 * AI Team Management Routes - REAL AI INTEGRATION
 * 
 * API endpoints for spawning and managing REAL AI development teams
 * Uses AI Agent Orchestrator Service with Claude API integration
 */

const express = require('express');
const router = express.Router();

// Import real AI Agent Orchestrator (JavaScript version)
const { aiOrchestrator } = require('../services/ai-agent-orchestrator');

// Legacy activeTeams for compatibility - now just mirrors orchestrator
const activeTeams = new Map();

/**
 * Spawn AI Team - Create REAL AI development team with Claude integration
 */
router.post('/spawn', async (req, res) => {
    try {
        const { requirement, sessionId } = req.body;
        
        if (!requirement) {
            return res.status(400).json({
                success: false,
                error: 'Project requirement is required. Example: "I want to build a React todo app"'
            });
        }

        console.log(`🚀 [AI-TEAM] Spawning REAL AI team for: "${requirement}"`);
        
        // Use AI Agent Orchestrator to spawn real team
        const teamSession = await aiOrchestrator.spawnTeam(requirement);
        
        // Map orchestrator format to legacy API format for compatibility
        const compatibleTeam = {
            teamId: teamSession.teamId,
            sessionId: teamSession.sessionId,
            projectRequirement: teamSession.projectRequirement,
            workflow: teamSession.workflow,
            status: teamSession.status,
            agents: teamSession.agents.map((agent, index) => ({
                id: `agent_${index + 1}`,
                name: agent.agentName,
                role: agent.agentId,
                status: agent.status,
                progress: agent.progress,
                currentTask: agent.currentTask,
                completedTasks: agent.completedDeliverables,
                expertise: [] // Legacy field
            })),
            createdAt: teamSession.startTime.getTime(),
            startedAt: null,
            completedAt: null,
            progress: {
                overall: Math.floor(teamSession.agents.reduce((sum, a) => sum + a.progress, 0) / teamSession.agents.length),
                planning: 0,
                development: 0,
                testing: 0,
                deployment: 0
            },
            context: teamSession.context,
            files: teamSession.files
        };
        
        // Store in legacy activeTeams for compatibility
        activeTeams.set(teamSession.teamId, compatibleTeam);
        
        // Emit socket event for real-time updates
        if (global.io) {
            global.io.emit('ai-team:spawned', {
                teamId: teamSession.teamId,
                sessionId: teamSession.sessionId,
                agents: compatibleTeam.agents,
                status: teamSession.status,
                requirement: requirement,
                workflow: teamSession.workflow
            });
        }
        
        console.log(`✅ [AI-TEAM] REAL team spawned: ${teamSession.teamId}`);
        console.log(`📋 Workflow: ${teamSession.workflow}`);
        console.log(`👥 Agents: ${teamSession.agents.map(a => a.agentName).join(', ')}`);
        
        res.json({
            success: true,
            teamId: teamSession.teamId,
            sessionId: teamSession.sessionId,
            agents: compatibleTeam.agents,
            status: teamSession.status,
            workflow: teamSession.workflow,
            requirement: requirement,
            context: teamSession.context,
            message: `REAL AI Team spawned with ${teamSession.agents.length} agents`
        });
        
    } catch (error) {
        console.error('❌ [AI-TEAM] Real spawn error:', error);
        res.status(500).json({ 
            success: false,
            error: `Failed to spawn AI team: ${error.message}` 
        });
    }
});

/**
 * Start AI Team Work - Begin REAL AI development process
 * Note: The orchestrator automatically starts workflow execution on spawn,
 * so this endpoint mainly provides status updates and compatibility
 */
router.post('/:teamId/start', async (req, res) => {
    try {
        const { teamId } = req.params;
        
        // Get real team status from orchestrator
        const realTeam = aiOrchestrator.getTeamStatus(teamId);
        const legacyTeam = activeTeams.get(teamId);
        
        if (!realTeam || !legacyTeam) {
            return res.status(404).json({ 
                success: false,
                error: 'Team not found' 
            });
        }

        // Update legacy team with real orchestrator status
        legacyTeam.status = realTeam.status;
        legacyTeam.startedAt = Date.now();
        
        // Sync agent statuses from orchestrator
        legacyTeam.agents = realTeam.agents.map((agent, index) => ({
            id: `agent_${index + 1}`,
            name: agent.agentName,
            role: agent.agentId,
            status: agent.status,
            progress: agent.progress,
            currentTask: agent.currentTask,
            completedTasks: agent.completedDeliverables,
            expertise: []
        }));
        
        // Create checkpoint for AI team activation
        await createTeamCheckpoint(legacyTeam, 'REAL AI Team Started', 
            `Real AI development team with ${realTeam.workflow} workflow activated`);
        
        // Start real-time status monitoring instead of fake simulation
        startRealTimeMonitoring(teamId);
        
        // Emit socket event with real data
        if (global.io) {
            global.io.emit('ai-team:started', {
                teamId,
                sessionId: realTeam.sessionId,
                agents: legacyTeam.agents,
                status: realTeam.status,
                workflow: realTeam.workflow,
                requirement: realTeam.projectRequirement
            });
        }
        
        console.log(`🚀 [AI-TEAM] REAL team started: ${teamId}`);
        console.log(`📋 Workflow executing: ${realTeam.workflow}`);
        console.log(`👥 Agents working: ${realTeam.agents.map(a => `${a.agentName} (${a.status})`).join(', ')}`);
        
        res.json({
            success: true,
            teamId,
            agents: legacyTeam.agents,
            status: realTeam.status,
            workflow: realTeam.workflow,
            requirement: realTeam.projectRequirement,
            message: `REAL AI Team started - ${realTeam.workflow} workflow executing`
        });
        
    } catch (error) {
        console.error('❌ [AI-TEAM] Real start error:', error);
        res.status(500).json({ 
            success: false,
            error: `Failed to start AI team: ${error.message}` 
        });
    }
});

/**
 * Get AI Team Status - Retrieve REAL team progress from orchestrator
 */
router.get('/:teamId/status', (req, res) => {
    try {
        const { teamId } = req.params;
        
        // Get real-time status from orchestrator
        const realTeam = aiOrchestrator.getTeamStatus(teamId);
        const legacyTeam = activeTeams.get(teamId);
        
        if (!realTeam || !legacyTeam) {
            return res.status(404).json({ 
                success: false,
                error: 'Team not found' 
            });
        }
        
        // Update legacy format with real orchestrator data
        const updatedTeam = {
            ...legacyTeam,
            status: realTeam.status,
            agents: realTeam.agents.map((agent, index) => ({
                id: `agent_${index + 1}`,
                name: agent.agentName,
                role: agent.agentId,
                status: agent.status,
                progress: agent.progress,
                currentTask: agent.currentTask,
                completedTasks: agent.completedDeliverables,
                expertise: [],
                output: agent.output,
                files: agent.files.length
            })),
            progress: {
                overall: Math.floor(realTeam.agents.reduce((sum, a) => sum + a.progress, 0) / realTeam.agents.length),
                planning: realTeam.status === 'planning' ? 50 : (realTeam.status === 'completed' ? 100 : 25),
                development: realTeam.status === 'executing' ? 75 : (realTeam.status === 'completed' ? 100 : 0),
                testing: realTeam.status === 'integrating' ? 50 : (realTeam.status === 'completed' ? 100 : 0),
                deployment: realTeam.status === 'completed' ? 100 : 0
            },
            workflow: realTeam.workflow,
            requirement: realTeam.projectRequirement,
            context: realTeam.context,
            files: realTeam.files,
            generatedFiles: realTeam.files.length
        };
        
        // Update legacy storage
        activeTeams.set(teamId, updatedTeam);
        
        console.log(`📊 [AI-TEAM] Status check: ${teamId} - ${realTeam.status} (${updatedTeam.progress.overall}% complete)`);
        
        res.json({
            success: true,
            team: updatedTeam,
            realTimeData: {
                activeAgents: realTeam.agents.filter(a => a.status === 'working').length,
                completedAgents: realTeam.agents.filter(a => a.status === 'completed').length,
                generatedFiles: realTeam.files.length,
                workflow: realTeam.workflow,
                lastUpdate: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ [AI-TEAM] Status error:', error);
        res.status(500).json({ 
            success: false,
            error: `Failed to get team status: ${error.message}` 
        });
    }
});

/**
 * Stop AI Team - Halt all REAL agent work
 */
router.post('/:teamId/stop', async (req, res) => {
    try {
        const { teamId } = req.params;
        
        const realTeam = aiOrchestrator.getTeamStatus(teamId);
        const legacyTeam = activeTeams.get(teamId);
        
        if (!realTeam || !legacyTeam) {
            return res.status(404).json({ 
                success: false,
                error: 'Team not found' 
            });
        }
        
        console.log(`🛑 [AI-TEAM] Stopping REAL team: ${teamId}`);
        
        // Use orchestrator emergency stop for this specific team
        // Note: Current orchestrator only has global emergency stop
        // TODO: Add individual team stop functionality to orchestrator
        console.log('⚠️ [AI-TEAM] Individual team stop not implemented in orchestrator - using emergency stop');
        aiOrchestrator.emergencyStop();
        
        // Update legacy team status
        legacyTeam.status = 'stopped';
        legacyTeam.completedAt = Date.now();
        
        // Clear monitoring timer if exists
        if (legacyTeam.monitoringTimer) {
            clearInterval(legacyTeam.monitoringTimer);
            delete legacyTeam.monitoringTimer;
        }
        
        // Update agents to stopped status
        legacyTeam.agents = legacyTeam.agents.map(agent => ({
            ...agent,
            status: 'stopped',
            currentTask: 'Stopped by user'
        }));
        
        // Create final checkpoint
        await createTeamCheckpoint(legacyTeam, 'REAL AI Team Stopped', 
            `Real AI development team stopped by user. Generated ${realTeam.files.length} files.`);
        
        // Emit socket event
        if (global.io) {
            global.io.emit('ai-team:stopped', {
                teamId,
                sessionId: legacyTeam.sessionId,
                agents: legacyTeam.agents,
                status: legacyTeam.status,
                duration: legacyTeam.completedAt - legacyTeam.startedAt,
                generatedFiles: realTeam.files.length,
                workflow: realTeam.workflow
            });
        }
        
        console.log(`✅ [AI-TEAM] REAL team stopped: ${teamId} (Generated ${realTeam.files.length} files)`);
        
        res.json({
            success: true,
            teamId,
            status: legacyTeam.status,
            duration: legacyTeam.completedAt - legacyTeam.startedAt,
            generatedFiles: realTeam.files.length,
            workflow: realTeam.workflow,
            message: `REAL AI Team stopped - ${realTeam.files.length} files generated`
        });
        
    } catch (error) {
        console.error('❌ [AI-TEAM] Real stop error:', error);
        res.status(500).json({ 
            success: false,
            error: `Failed to stop AI team: ${error.message}` 
        });
    }
});

/**
 * List all active REAL AI teams
 */
router.get('/', (req, res) => {
    try {
        // Get all teams from orchestrator
        const realTeams = aiOrchestrator.getAllTeams();
        
        const teams = realTeams.map(realTeam => {
            const legacyTeam = activeTeams.get(realTeam.teamId);
            const overallProgress = Math.floor(
                realTeam.agents.reduce((sum, a) => sum + a.progress, 0) / realTeam.agents.length
            );
            
            return {
                teamId: realTeam.teamId,
                sessionId: realTeam.sessionId,
                status: realTeam.status,
                agentCount: realTeam.agents.length,
                progress: overallProgress,
                createdAt: realTeam.startTime.getTime(),
                duration: legacyTeam?.startedAt ? 
                    (legacyTeam.completedAt || Date.now()) - legacyTeam.startedAt : 0,
                workflow: realTeam.workflow,
                requirement: realTeam.projectRequirement,
                generatedFiles: realTeam.files.length,
                activeAgents: realTeam.agents.filter(a => a.status === 'working').length,
                completedAgents: realTeam.agents.filter(a => a.status === 'completed').length
            };
        });
        
        console.log(`📋 [AI-TEAM] Listed ${teams.length} REAL teams`);
        
        res.json({
            success: true,
            teams,
            total: teams.length,
            realTimeData: {
                totalActiveTeams: teams.filter(t => t.status === 'executing' || t.status === 'planning').length,
                totalGeneratedFiles: teams.reduce((sum, t) => sum + t.generatedFiles, 0),
                totalActiveAgents: teams.reduce((sum, t) => sum + t.activeAgents, 0),
                lastUpdate: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ [AI-TEAM] List error:', error);
        res.status(500).json({ 
            success: false,
            error: `Failed to list AI teams: ${error.message}` 
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
 * Monitor REAL AI team progress from orchestrator
 */
function startRealTimeMonitoring(teamId) {
    const legacyTeam = activeTeams.get(teamId);
    if (!legacyTeam) {
        console.error(`❌ [AI-TEAM] Cannot start monitoring - team ${teamId} not found`);
        return;
    }
    
    console.log(`📡 [AI-TEAM] Starting REAL monitoring for team: ${teamId}`);
    
    legacyTeam.monitoringTimer = setInterval(() => {
        try {
            // Get real-time status from orchestrator
            const realTeam = aiOrchestrator.getTeamStatus(teamId);
            if (!realTeam) {
                console.log(`⚠️ [AI-TEAM] Team ${teamId} not found in orchestrator - stopping monitoring`);
                clearInterval(legacyTeam.monitoringTimer);
                delete legacyTeam.monitoringTimer;
                return;
            }
            
            // Update legacy team with real orchestrator data
            legacyTeam.status = realTeam.status;
            legacyTeam.agents = realTeam.agents.map((agent, index) => ({
                id: `agent_${index + 1}`,
                name: agent.agentName,
                role: agent.agentId,
                status: agent.status,
                progress: agent.progress,
                currentTask: agent.currentTask,
                completedTasks: agent.completedDeliverables,
                expertise: [],
                output: agent.output,
                files: agent.files.length
            }));
            
            // Calculate real progress
            const overallProgress = Math.floor(
                realTeam.agents.reduce((sum, a) => sum + a.progress, 0) / realTeam.agents.length
            );
            
            legacyTeam.progress = {
                overall: overallProgress,
                planning: realTeam.status === 'planning' ? 50 : (realTeam.status === 'completed' ? 100 : 25),
                development: realTeam.status === 'executing' ? 75 : (realTeam.status === 'completed' ? 100 : 0),
                testing: realTeam.status === 'integrating' ? 50 : (realTeam.status === 'completed' ? 100 : 0),
                deployment: realTeam.status === 'completed' ? 100 : 0
            };
            
            legacyTeam.generatedFiles = realTeam.files.length;
            
            // Emit REAL progress update
            if (global.io) {
                global.io.emit('ai-team:progress', {
                    teamId,
                    sessionId: realTeam.sessionId,
                    agents: legacyTeam.agents,
                    progress: legacyTeam.progress,
                    status: realTeam.status,
                    workflow: realTeam.workflow,
                    generatedFiles: realTeam.files.length,
                    activeAgents: realTeam.agents.filter(a => a.status === 'working').length,
                    lastUpdate: new Date().toISOString()
                });
            }
            
            // Check if team completed
            if (realTeam.status === 'completed') {
                legacyTeam.status = 'completed';
                legacyTeam.completedAt = Date.now();
                clearInterval(legacyTeam.monitoringTimer);
                delete legacyTeam.monitoringTimer;
                
                // Create completion checkpoint
                createTeamCheckpoint(legacyTeam, 'REAL AI Team Completed', 
                    `All AI agents completed their tasks. Generated ${realTeam.files.length} files using ${realTeam.workflow} workflow.`);
                
                if (global.io) {
                    global.io.emit('ai-team:completed', {
                        teamId,
                        sessionId: realTeam.sessionId,
                        agents: legacyTeam.agents,
                        duration: legacyTeam.completedAt - legacyTeam.startedAt,
                        generatedFiles: realTeam.files.length,
                        workflow: realTeam.workflow,
                        files: realTeam.files
                    });
                }
                
                console.log(`🎉 [AI-TEAM] REAL team ${teamId} completed! Generated ${realTeam.files.length} files`);
                
                // Log generated files
                realTeam.files.forEach(file => {
                    console.log(`📁 Generated: ${file.path} (by ${file.agent})`);
                });
            }
            
            // Handle error states
            if (realTeam.status === 'error') {
                legacyTeam.status = 'error';
                clearInterval(legacyTeam.monitoringTimer);
                delete legacyTeam.monitoringTimer;
                
                console.error(`❌ [AI-TEAM] Team ${teamId} encountered an error`);
                
                if (global.io) {
                    global.io.emit('ai-team:error', {
                        teamId,
                        sessionId: realTeam.sessionId,
                        status: 'error',
                        message: 'AI team encountered an error during execution'
                    });
                }
            }
            
        } catch (error) {
            console.error(`❌ [AI-TEAM] Monitoring error for ${teamId}:`, error);
        }
        
    }, 2000); // Update every 2 seconds for real-time feel
}

module.exports = router;