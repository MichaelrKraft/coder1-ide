/**
 * AI Team Management Routes - REAL AI INTEGRATION
 * 
 * API endpoints for spawning and managing REAL AI development teams
 * Uses AI Agent Orchestrator Service with Claude API integration
 */

const express = require('express');
const router = express.Router();

// Import real AI Agent Orchestrator (JavaScript version) - FALLBACK ONLY
const { aiOrchestrator } = require('../services/ai-agent-orchestrator');

// Import cost-free Claude Code Bridge Service (PRIMARY)
// Note: Will need to access via HTTP to the unified Next.js server or create JS wrapper
let claudeCodeBridge = null;

// Initialize bridge service connection
async function initializeBridge() {
    try {
        // For now, we'll make HTTP calls to the unified Next.js server
        // This maintains separation between Express and Next.js services
        claudeCodeBridge = {
            spawnParallelTeam: async (requirement, sessionId) => {
                const response = await fetch('http://localhost:3001/api/claude-bridge/spawn', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requirement, sessionId })
                });
                
                if (!response.ok) {
                    throw new Error(`Bridge spawn failed: ${response.status} ${response.statusText}`);
                }
                
                return await response.json();
            },
            getTeamStatus: async (teamId) => {
                const response = await fetch(`http://localhost:3001/api/claude-bridge/status/${teamId}`);
                return await response.json();
            },
            getAllTeams: async () => {
                const response = await fetch('http://localhost:3001/api/claude-bridge/teams');
                const data = await response.json();
                return data.teams || [];
            },
            startMonitoring: async (teamId) => {
                const response = await fetch(`http://localhost:3001/api/claude-bridge/${teamId}/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                return await response.json();
            },
            mergeTeamWork: async (teamId) => {
                const response = await fetch(`http://localhost:3001/api/claude-bridge/${teamId}/merge`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                return await response.json();
            },
            stopTeam: async (teamId) => {
                const response = await fetch(`http://localhost:3001/api/claude-bridge/${teamId}/stop`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                return await response.json();
            }
        };
        console.log('✅ Claude Code Bridge Service initialized');
        return true;
    } catch (error) {
        console.warn('⚠️ Claude Code Bridge Service not available, using fallback orchestrator:', error.message);
        return false;
    }
}

// Legacy activeTeams for compatibility - now just mirrors orchestrator
const activeTeams = new Map();

/**
 * Spawn AI Team - Create cost-free automated team with Claude Code Bridge (with fallback)
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

        console.log(`🚀 [AI-TEAM] Spawning AI team for: "${requirement}"`);
        
        // Initialize bridge service if not already done
        if (!claudeCodeBridge) {
            const bridgeInitialized = await initializeBridge();
            if (!bridgeInitialized) {
                console.log('⚠️ [AI-TEAM] Bridge unavailable, using expensive orchestrator fallback');
            }
        }
        
        let teamSession = null;
        let usedBridge = false;
        let costSavings = false;
        
        // Try cost-free Claude Code Bridge first
        if (claudeCodeBridge) {
            try {
                console.log(`💰 [AI-TEAM] Attempting cost-free bridge spawn...`);
                
                const bridgeResponse = await claudeCodeBridge.spawnParallelTeam(requirement, sessionId);
                
                if (bridgeResponse.success) {
                    teamSession = bridgeResponse;
                    usedBridge = true;
                    costSavings = true;
                    console.log(`✅ [AI-TEAM] Cost-free bridge team spawned: ${bridgeResponse.teamId}`);
                    console.log(`💰 [AI-TEAM] Cost savings: ~$0.30 (vs expensive orchestrator)`);
                } else {
                    throw new Error(bridgeResponse.error || 'Bridge spawn failed');
                }
            } catch (bridgeError) {
                console.warn('⚠️ [AI-TEAM] Bridge spawn failed, falling back to expensive orchestrator:', bridgeError.message);
                // Fall through to expensive orchestrator
            }
        }
        
        // Fallback to expensive AI orchestrator if bridge failed
        if (!teamSession) {
            console.log(`💸 [AI-TEAM] Using EXPENSIVE orchestrator fallback...`);
            
            const orchestratorTeam = await aiOrchestrator.spawnTeam(requirement);
            
            // Transform orchestrator format to match API
            teamSession = {
                success: true,
                teamId: orchestratorTeam.teamId,
                sessionId: orchestratorTeam.sessionId,
                agents: orchestratorTeam.agents.map((agent, index) => ({
                    id: `agent_${index + 1}`,
                    name: agent.agentName,
                    role: agent.agentId,
                    status: agent.status,
                    progress: agent.progress,
                    currentTask: agent.currentTask,
                    completedTasks: agent.completedDeliverables,
                    expertise: [] // Legacy field
                })),
                status: orchestratorTeam.status,
                workflow: orchestratorTeam.workflow,
                requirement: requirement,
                context: orchestratorTeam.context,
                message: `Expensive AI Team spawned with ${orchestratorTeam.agents.length} agents`
            };
            
            usedBridge = false;
            costSavings = false;
        }
        
        // Create compatible team structure for storage
        const compatibleTeam = {
            teamId: teamSession.teamId,
            sessionId: teamSession.sessionId,
            projectRequirement: requirement,
            workflow: teamSession.workflow,
            status: teamSession.status,
            agents: teamSession.agents,
            createdAt: Date.now(),
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
            files: teamSession.files || [],
            usedBridge,
            costSavings,
            executionType: usedBridge ? 'automated-claude-code' : 'expensive-orchestrator'
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
                workflow: teamSession.workflow,
                costSavings,
                executionType: compatibleTeam.executionType
            });
        }
        
        console.log(`✅ [AI-TEAM] Team spawned: ${teamSession.teamId}`);
        console.log(`📋 Workflow: ${teamSession.workflow}`);
        console.log(`💰 Cost savings: ${costSavings ? '✅ FREE' : '❌ EXPENSIVE'}`);
        console.log(`🤖 Execution: ${compatibleTeam.executionType}`);
        console.log(`👥 Agents: ${teamSession.agents.map(a => a.name).join(', ')}`);
        
        res.json({
            success: true,
            teamId: teamSession.teamId,
            sessionId: teamSession.sessionId,
            agents: compatibleTeam.agents,
            status: teamSession.status,
            workflow: teamSession.workflow,
            requirement: requirement,
            context: teamSession.context,
            message: teamSession.message,
            costSavings,
            executionType: compatibleTeam.executionType,
            usedBridge
        });
        
    } catch (error) {
        console.error('❌ [AI-TEAM] Spawn error:', error);
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
 * Get AI Team Status - Retrieve team progress from bridge or orchestrator
 */
router.get('/:teamId/status', async (req, res) => {
    try {
        const { teamId } = req.params;
        const legacyTeam = activeTeams.get(teamId);
        
        if (!legacyTeam) {
            return res.status(404).json({ 
                success: false,
                error: 'Team not found' 
            });
        }

        let updatedTeam = null;
        
        // Check if this team was created with the bridge service
        if (legacyTeam.usedBridge && claudeCodeBridge) {
            try {
                console.log(`📊 [AI-TEAM] Checking bridge status for: ${teamId}`);
                
                const bridgeResponse = await claudeCodeBridge.getTeamStatus(teamId);
                
                if (bridgeResponse.success && bridgeResponse.team) {
                    const bridgeTeam = bridgeResponse.team;
                    
                    updatedTeam = {
                        ...legacyTeam,
                        status: bridgeTeam.status,
                        agents: bridgeTeam.agents,
                        progress: bridgeTeam.progress,
                        workflow: bridgeTeam.workflow,
                        requirement: bridgeTeam.requirement,
                        context: bridgeTeam.context,
                        files: bridgeTeam.files || [],
                        generatedFiles: bridgeTeam.generatedFiles,
                        startedAt: bridgeTeam.startedAt,
                        completedAt: bridgeTeam.completedAt
                    };
                    
                    console.log(`📊 [AI-TEAM] Bridge status: ${teamId} - ${bridgeTeam.status} (${bridgeTeam.progress.overall}% complete)`);
                } else {
                    throw new Error('Bridge team status not found');
                }
            } catch (bridgeError) {
                console.warn(`⚠️ [AI-TEAM] Bridge status failed, checking orchestrator: ${bridgeError.message}`);
                // Fall through to orchestrator check
            }
        }
        
        // Fallback to expensive orchestrator if bridge failed or wasn't used
        if (!updatedTeam) {
            const realTeam = aiOrchestrator.getTeamStatus(teamId);
            
            if (!realTeam) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Team not found in any service' 
                });
            }
            
            updatedTeam = {
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
            
            console.log(`📊 [AI-TEAM] Orchestrator status: ${teamId} - ${realTeam.status} (${updatedTeam.progress.overall}% complete)`);
        }
        
        // Update legacy storage
        activeTeams.set(teamId, updatedTeam);
        
        res.json({
            success: true,
            team: updatedTeam,
            realTimeData: {
                activeAgents: updatedTeam.agents.filter(a => a.status === 'working').length,
                completedAgents: updatedTeam.agents.filter(a => a.status === 'completed').length,
                generatedFiles: updatedTeam.generatedFiles,
                workflow: updatedTeam.workflow,
                lastUpdate: new Date().toISOString(),
                executionType: updatedTeam.executionType,
                costSavings: updatedTeam.costSavings
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