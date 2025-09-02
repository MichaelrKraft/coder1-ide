/**
 * Agent Session Memory System
 * 
 * Provides cross-session continuity for AI agents by tracking:
 * - What each agent accomplished in previous sessions
 * - Current state when sessions ended
 * - Handoff notes for other agents
 * - Session resumption context
 * 
 * Integrates with existing .coder1/memory/ system for persistence
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class AgentSessionMemory extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.memoryDir = options.memoryDir || path.join(process.cwd(), '.coder1', 'memory');
        this.sessionHistoryFile = path.join(this.memoryDir, 'agent-session-history.json');
        this.taskOutcomesFile = path.join(this.memoryDir, 'task-outcomes.json');
        
        // In-memory cache for current session
        this.currentSession = {
            id: this.generateSessionId(),
            startTime: Date.now(),
            agents: new Map(),
            projectContext: {}
        };
        
        // Cross-agent communication tracking
        this.agentCommunications = new Map();
        
        console.log(`🧠 Agent Session Memory initialized for session: ${this.currentSession.id}`);
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '');
        const random = Math.random().toString(36).substring(2, 8);
        return `session-${timestamp}-${random}`;
    }

    /**
     * Record agent work during current session
     */
    async recordAgentWork(agentId, workData) {
        try {
            const workRecord = {
                agentId,
                sessionId: this.currentSession.id,
                timestamp: Date.now(),
                workCompleted: workData.completed || [],
                currentState: workData.state || '',
                nextSteps: workData.nextSteps || [],
                filesModified: workData.files || [],
                blockers: workData.blockers || [],
                collaboratorNotes: workData.forOtherAgents || {},
                confidenceLevel: workData.confidence || 0.8,
                estimatedCompletion: workData.completionPercent || 0
            };

            // Store in current session
            this.currentSession.agents.set(agentId, workRecord);

            // Emit event for real-time updates
            this.emit('agentWorkRecorded', workRecord);

            console.log(`📝 Recorded work for agent ${agentId}: ${workData.completed?.length || 0} tasks completed`);
            
            return workRecord;
        } catch (error) {
            console.error('Error recording agent work:', error);
            throw error;
        }
    }

    /**
     * Get session resumption context for an agent
     */
    async getAgentResumptionContext(agentId, projectId = 'default') {
        try {
            // Get agent's previous work
            const agentHistory = await this.getAgentHistory(agentId);
            
            // Get updates from collaborating agents
            const collaboratorUpdates = await this.getCollaboratorUpdates(agentId);
            
            // Get overall project state
            const projectState = await this.getProjectState(projectId);
            
            // Generate resumption prompt
            const resumptionPrompt = this.generateResumptionPrompt(agentId, agentHistory, collaboratorUpdates, projectState);
            
            const context = {
                agentId,
                sessionId: this.currentSession.id,
                previousSessions: agentHistory,
                collaboratorWork: collaboratorUpdates,
                projectState,
                resumptionPrompt,
                suggestedActions: this.generateSuggestedActions(agentId, agentHistory, collaboratorUpdates),
                continuityScore: this.calculateContinuityScore(agentHistory)
            };

            console.log(`🔄 Generated resumption context for ${agentId} with continuity score: ${context.continuityScore}`);
            
            return context;
        } catch (error) {
            console.error(`Error getting resumption context for ${agentId}:`, error);
            return this.getDefaultResumptionContext(agentId);
        }
    }

    /**
     * Get agent's work history from previous sessions
     */
    async getAgentHistory(agentId, limit = 5) {
        try {
            const sessionHistory = await this.loadSessionHistory();
            const agentSessions = [];

            // Iterate through sessions to find agent's work
            for (const [sessionId, sessionData] of Object.entries(sessionHistory.sessions || {})) {
                if (sessionData.agents && sessionData.agents[agentId]) {
                    agentSessions.push({
                        sessionId,
                        timestamp: sessionData.timestamp,
                        work: sessionData.agents[agentId],
                        projectState: sessionData.projectState
                    });
                }
            }

            // Sort by timestamp, most recent first
            agentSessions.sort((a, b) => b.timestamp - a.timestamp);
            
            return agentSessions.slice(0, limit);
        } catch (error) {
            console.error(`Error loading agent history for ${agentId}:`, error);
            return [];
        }
    }

    /**
     * Get updates from other agents since this agent last worked
     */
    async getCollaboratorUpdates(agentId) {
        try {
            const sessionHistory = await this.loadSessionHistory();
            const collaboratorUpdates = [];

            // Find the last session where this agent was active
            let lastAgentSession = null;
            for (const [sessionId, sessionData] of Object.entries(sessionHistory.sessions || {})) {
                if (sessionData.agents && sessionData.agents[agentId]) {
                    lastAgentSession = sessionData.timestamp;
                    break;
                }
            }

            if (!lastAgentSession) {
                return []; // Agent has no previous work
            }

            // Find work by other agents since then
            for (const [sessionId, sessionData] of Object.entries(sessionHistory.sessions || {})) {
                if (sessionData.timestamp > lastAgentSession && sessionData.agents) {
                    for (const [otherAgentId, agentWork] of Object.entries(sessionData.agents)) {
                        if (otherAgentId !== agentId) {
                            collaboratorUpdates.push({
                                agentId: otherAgentId,
                                sessionId,
                                timestamp: sessionData.timestamp,
                                work: agentWork,
                                relevantNotes: agentWork.collaboratorNotes?.[agentId] || null
                            });
                        }
                    }
                }
            }

            return collaboratorUpdates.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error(`Error getting collaborator updates for ${agentId}:`, error);
            return [];
        }
    }

    /**
     * Generate resumption prompt for agent
     */
    generateResumptionPrompt(agentId, agentHistory, collaboratorUpdates, projectState) {
        let prompt = `\n=== SESSION RESUMPTION CONTEXT ===\n\n`;

        // Add agent's previous work
        if (agentHistory.length > 0) {
            const lastSession = agentHistory[0];
            prompt += `YOUR PREVIOUS WORK:\n`;
            prompt += `- Last session: ${new Date(lastSession.timestamp).toLocaleString()}\n`;
            prompt += `- Work completed: ${lastSession.work.workCompleted.join(', ')}\n`;
            prompt += `- Current state: ${lastSession.work.currentState}\n`;
            prompt += `- Next steps planned: ${lastSession.work.nextSteps.join(', ')}\n`;
            
            if (lastSession.work.blockers.length > 0) {
                prompt += `- Previous blockers: ${lastSession.work.blockers.join(', ')}\n`;
            }
            prompt += `\n`;
        }

        // Add collaborator updates
        if (collaboratorUpdates.length > 0) {
            prompt += `COLLABORATOR UPDATES (since your last session):\n`;
            for (const update of collaboratorUpdates.slice(0, 3)) {
                prompt += `- ${update.agentId}: ${update.work.workCompleted.join(', ')}\n`;
                if (update.relevantNotes) {
                    prompt += `  → Note for you: ${update.relevantNotes}\n`;
                }
            }
            prompt += `\n`;
        }

        // Add project state
        if (projectState.phase) {
            prompt += `PROJECT CONTEXT:\n`;
            prompt += `- Current phase: ${projectState.phase}\n`;
            prompt += `- Overall completion: ${projectState.completionLevel}%\n`;
            if (projectState.lastActiveFile) {
                prompt += `- Last active file: ${projectState.lastActiveFile}\n`;
            }
            prompt += `\n`;
        }

        prompt += `Continue from where you left off, taking into account the collaborator updates above.\n`;
        prompt += `=== END RESUMPTION CONTEXT ===\n`;

        return prompt;
    }

    /**
     * Generate suggested actions for agent resumption
     */
    generateSuggestedActions(agentId, agentHistory, collaboratorUpdates) {
        const actions = [];

        if (agentHistory.length > 0) {
            const lastSession = agentHistory[0];
            
            // Add next steps from last session
            actions.push(...lastSession.work.nextSteps.map(step => ({
                type: 'continuation',
                priority: 'high',
                action: step,
                source: 'previous_session'
            })));

            // Check for resolved blockers
            for (const blocker of lastSession.work.blockers) {
                const resolved = collaboratorUpdates.some(update => 
                    update.work.workCompleted.some(work => 
                        work.toLowerCase().includes(blocker.toLowerCase())
                    )
                );
                if (resolved) {
                    actions.push({
                        type: 'unblocked',
                        priority: 'high', 
                        action: `Continue work that was blocked by: ${blocker}`,
                        source: 'collaborator_resolution'
                    });
                }
            }
        }

        // Add actions based on collaborator work
        for (const update of collaboratorUpdates.slice(0, 2)) {
            if (update.relevantNotes) {
                actions.push({
                    type: 'collaboration',
                    priority: 'medium',
                    action: update.relevantNotes,
                    source: `${update.agentId}_handoff`
                });
            }
        }

        return actions.slice(0, 5); // Limit to top 5 actions
    }

    /**
     * Calculate continuity score (0-1) based on available context
     */
    calculateContinuityScore(agentHistory) {
        if (agentHistory.length === 0) return 0;

        let score = 0.3; // Base score for having any history

        const lastSession = agentHistory[0];
        
        // Higher score for recent work
        const daysSinceLastWork = (Date.now() - lastSession.timestamp) / (1000 * 60 * 60 * 24);
        if (daysSinceLastWork < 1) score += 0.3;
        else if (daysSinceLastWork < 7) score += 0.2;
        else score += 0.1;

        // Higher score for clear next steps
        if (lastSession.work.nextSteps.length > 0) score += 0.2;

        // Higher score for detailed state
        if (lastSession.work.currentState.length > 20) score += 0.1;

        // Higher score for file context
        if (lastSession.work.filesModified.length > 0) score += 0.1;

        return Math.min(1, score);
    }

    /**
     * Finalize current session and save to persistent storage
     */
    async finalizeSession(sessionSummary = {}) {
        try {
            const sessionData = {
                id: this.currentSession.id,
                startTime: this.currentSession.startTime,
                endTime: Date.now(),
                duration: Date.now() - this.currentSession.startTime,
                agents: Object.fromEntries(this.currentSession.agents),
                projectState: {
                    ...this.currentSession.projectContext,
                    ...sessionSummary.projectState
                },
                summary: sessionSummary.description || 'Session completed',
                totalAgents: this.currentSession.agents.size,
                tasksCompleted: Array.from(this.currentSession.agents.values())
                    .reduce((total, agent) => total + agent.workCompleted.length, 0)
            };

            // Save to session history
            await this.saveSessionToHistory(sessionData);

            // Update task outcomes with session context
            await this.updateTaskOutcomes(sessionData);

            console.log(`✅ Session ${this.currentSession.id} finalized with ${sessionData.totalAgents} agents and ${sessionData.tasksCompleted} tasks completed`);

            this.emit('sessionFinalized', sessionData);
            return sessionData;
        } catch (error) {
            console.error('Error finalizing session:', error);
            throw error;
        }
    }

    /**
     * Load session history from persistent storage
     */
    async loadSessionHistory() {
        try {
            await fs.access(this.sessionHistoryFile);
            const content = await fs.readFile(this.sessionHistoryFile, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            // File doesn't exist, return empty structure
            return {
                version: '1.0.0',
                created: Date.now(),
                sessions: {}
            };
        }
    }

    /**
     * Save session to persistent history
     */
    async saveSessionToHistory(sessionData) {
        try {
            const history = await this.loadSessionHistory();
            history.sessions[sessionData.id] = sessionData;
            history.lastUpdated = Date.now();

            // Keep only last 50 sessions to prevent file bloat
            const sessionIds = Object.keys(history.sessions).sort((a, b) => 
                history.sessions[b].endTime - history.sessions[a].endTime
            );
            
            if (sessionIds.length > 50) {
                for (const oldSessionId of sessionIds.slice(50)) {
                    delete history.sessions[oldSessionId];
                }
            }

            await fs.writeFile(this.sessionHistoryFile, JSON.stringify(history, null, 2));
        } catch (error) {
            console.error('Error saving session history:', error);
            throw error;
        }
    }

    /**
     * Update existing task outcomes with session context
     */
    async updateTaskOutcomes(sessionData) {
        try {
            // Load existing task outcomes
            let taskOutcomes = [];
            try {
                const content = await fs.readFile(this.taskOutcomesFile, 'utf8');
                taskOutcomes = JSON.parse(content);
            } catch (error) {
                // File doesn't exist or is invalid, start fresh
                taskOutcomes = [];
            }

            // Add session context to recent task outcomes
            for (const [agentId, agentWork] of Object.entries(sessionData.agents)) {
                const enhancedOutcome = {
                    id: `${sessionData.id}-${agentId}-${Date.now()}`,
                    sessionId: sessionData.id,
                    agentType: agentId,
                    taskDescription: `Session work: ${agentWork.workCompleted.join(', ')}`,
                    outcome: agentWork.currentState ? 'partially_completed' : 'completed',
                    successRating: agentWork.confidenceLevel,
                    timeTaken: sessionData.duration,
                    approachUsed: 'cross_session_continuity',
                    filesModified: agentWork.filesModified,
                    createdAt: sessionData.endTime,
                    sessionContext: {
                        workCompleted: agentWork.workCompleted,
                        currentState: agentWork.currentState,
                        nextSteps: agentWork.nextSteps,
                        blockers: agentWork.blockers,
                        collaboratorNotes: agentWork.collaboratorNotes,
                        continuityEnabled: true
                    },
                    metadata: {
                        sessionStartTime: sessionData.startTime,
                        sessionDuration: sessionData.duration,
                        agentsInSession: Object.keys(sessionData.agents),
                        projectPhase: sessionData.projectState?.phase || 'development'
                    }
                };

                taskOutcomes.push(enhancedOutcome);
            }

            // Keep only last 1000 outcomes to prevent file bloat
            if (taskOutcomes.length > 1000) {
                taskOutcomes = taskOutcomes.slice(-1000);
            }

            await fs.writeFile(this.taskOutcomesFile, JSON.stringify(taskOutcomes, null, 2));
        } catch (error) {
            console.error('Error updating task outcomes:', error);
            // Don't throw - this is non-critical
        }
    }

    /**
     * Get project state information
     */
    async getProjectState(projectId = 'default') {
        // This would integrate with your existing project tracking
        // For now, return basic state from current session
        return {
            id: projectId,
            phase: this.currentSession.projectContext.phase || 'development',
            completionLevel: this.currentSession.projectContext.completionLevel || 0,
            lastActiveFile: this.currentSession.projectContext.lastActiveFile || null,
            timestamp: Date.now()
        };
    }

    /**
     * Get default resumption context when history loading fails
     */
    getDefaultResumptionContext(agentId) {
        return {
            agentId,
            sessionId: this.currentSession.id,
            previousSessions: [],
            collaboratorWork: [],
            projectState: { phase: 'development', completionLevel: 0 },
            resumptionPrompt: `Starting fresh session. No previous context available.`,
            suggestedActions: [
                {
                    type: 'fresh_start',
                    priority: 'medium',
                    action: 'Begin new work session',
                    source: 'default'
                }
            ],
            continuityScore: 0
        };
    }

    /**
     * Update project context for current session
     */
    updateProjectContext(updates) {
        this.currentSession.projectContext = {
            ...this.currentSession.projectContext,
            ...updates,
            lastUpdated: Date.now()
        };
    }

    /**
     * Get current session info
     */
    getCurrentSessionInfo() {
        return {
            id: this.currentSession.id,
            startTime: this.currentSession.startTime,
            duration: Date.now() - this.currentSession.startTime,
            activeAgents: Array.from(this.currentSession.agents.keys()),
            projectContext: this.currentSession.projectContext
        };
    }

    /**
     * Get current session summary for sharing
     */
    async getCurrentSessionSummary() {
        try {
            const sessionInfo = this.getCurrentSessionInfo();
            const agents = {};
            
            // Build agent work summaries from current session
            for (const [agentId, agentWork] of this.currentSession.agents) {
                agents[agentId] = {
                    workCompleted: agentWork.workCompleted || [],
                    currentState: agentWork.currentState || '',
                    nextSteps: agentWork.nextSteps || [],
                    approach: agentWork.approach || '',
                    keyDecisions: agentWork.keyDecisions || [],
                    lessonsLearned: agentWork.lessonsLearned || [],
                    patterns: agentWork.patterns || [],
                    filesModified: agentWork.filesModified || [],
                    collaboratorNotes: agentWork.collaboratorNotes || {}
                };
            }

            // Calculate summary statistics
            const totalTasks = Object.values(agents).reduce((sum, agent) => sum + agent.workCompleted.length, 0);
            const totalNextSteps = Object.values(agents).reduce((sum, agent) => sum + agent.nextSteps.length, 0);
            
            return {
                id: sessionInfo.id,
                startTime: sessionInfo.startTime,
                duration: sessionInfo.duration,
                totalAgents: sessionInfo.activeAgents.length,
                tasksCompleted: totalTasks,
                agents,
                projectState: sessionInfo.projectContext,
                summary: `Session with ${sessionInfo.activeAgents.length} agents, ${totalTasks} tasks completed, ${totalNextSteps} next steps planned`
            };
        } catch (error) {
            console.error('Error getting current session summary:', error);
            // Return minimal session data as fallback
            return {
                id: `fallback-session-${Date.now()}`,
                startTime: Date.now() - 3600000, // 1 hour ago
                duration: 3600000,
                totalAgents: 0,
                tasksCompleted: 0,
                agents: {},
                projectState: {},
                summary: 'Fallback session data - no active session found'
            };
        }
    }
}

module.exports = { AgentSessionMemory };