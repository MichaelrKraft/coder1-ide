/**
 * Agent Session Continuity - Usage Example
 * 
 * This example demonstrates how to use the new cross-session agent memory system
 * to provide continuity between coding sessions.
 */

const { AgentPersonalityLoader } = require('../utils/agent-personality-loader');
const { AgentSessionMemory } = require('../services/agent-session-memory');

class AgentSessionContinuityExample {
    constructor() {
        // Initialize with session continuity enabled
        this.personalityLoader = new AgentPersonalityLoader({
            enableSessionContinuity: true
        });
    }

    /**
     * Example: Start a new development session
     */
    async startDevelopmentSession() {
        console.log('🚀 Starting new development session...');

        // Load frontend agent with session continuity
        const frontendAgent = await this.personalityLoader.loadPersonalityWithContext(
            'frontend-specialist',
            'coder1-dashboard-project'
        );

        console.log('Frontend Agent loaded with context:');
        console.log('- Continuity Score:', frontendAgent.sessionContext?.continuityScore || 0);
        console.log('- Previous Sessions:', frontendAgent.sessionContext?.previousSessions?.length || 0);
        console.log('- Collaborator Updates:', frontendAgent.sessionContext?.collaboratorUpdates?.length || 0);

        // The agent's enhanced instructions now include session context
        console.log('\nEnhanced Instructions Preview:');
        console.log(frontendAgent.enhancedInstructions?.substring(0, 500) + '...');

        return frontendAgent;
    }

    /**
     * Example: Record agent work during session
     */
    async recordAgentWork() {
        console.log('\n📝 Recording agent work...');

        // Frontend agent completes some work
        await this.personalityLoader.recordAgentWorkCompletion('frontend-specialist', {
            completed: [
                'Created responsive dashboard layout with Tailwind CSS',
                'Implemented user authentication flow with TypeScript',
                'Added routing for dashboard and profile pages'
            ],
            state: 'Dashboard 80% complete, authentication working, needs user profile editing UI',
            nextSteps: [
                'Connect profile page to backend API',
                'Add form validation for profile editing',
                'Implement user avatar upload functionality'
            ],
            files: [
                'src/components/Dashboard.tsx',
                'src/components/auth/LoginForm.tsx',
                'src/routes/AppRouter.tsx'
            ],
            blockers: [
                'Waiting for user profile API endpoint from backend team'
            ],
            forOtherAgents: {
                'backend-specialist': 'Dashboard is ready, needs /api/user/profile endpoint with GET and PUT methods',
                'architect': 'Authentication flow complete, ready for role-based access control integration'
            },
            confidence: 0.85,
            completionPercent: 80
        });

        // Backend agent also completes work
        await this.personalityLoader.recordAgentWorkCompletion('backend-specialist', {
            completed: [
                'Built Express API with JWT authentication',
                'Created user registration and login endpoints',
                'Set up PostgreSQL database with user schema'
            ],
            state: 'Authentication API complete, user CRUD operations 70% done',
            nextSteps: [
                'Complete user profile GET/PUT endpoints',
                'Add role-based access control middleware',
                'Implement API rate limiting'
            ],
            files: [
                'src/api/auth.js',
                'src/models/User.js',
                'src/middleware/auth.js'
            ],
            blockers: [],
            forOtherAgents: {
                'frontend-specialist': 'User profile API will be ready by end of day - here are the endpoint specs',
                'qa-testing': 'Authentication endpoints ready for testing, see /api-docs for specs'
            },
            confidence: 0.9,
            completionPercent: 70
        });

        console.log('✅ Work recorded for both frontend and backend agents');
    }

    /**
     * Example: End session and finalize
     */
    async endSession() {
        console.log('\n🏁 Ending development session...');

        const sessionData = await this.personalityLoader.finalizeSession({
            description: 'User dashboard development session - authentication and basic UI complete',
            projectState: {
                phase: 'User Management Implementation',
                completionLevel: 75,
                lastActiveFile: 'src/components/Dashboard.tsx'
            }
        });

        console.log('Session finalized:', sessionData?.id);
        console.log('Total agents:', sessionData?.totalAgents);
        console.log('Tasks completed:', sessionData?.tasksCompleted);

        return sessionData;
    }

    /**
     * Example: Resume work in next session (simulated)
     */
    async resumeInNextSession() {
        console.log('\n\n🔄 === SIMULATING NEXT SESSION (User reopens IDE) ===');

        // Create new personality loader (simulates restart)
        const newPersonalityLoader = new AgentPersonalityLoader({
            enableSessionContinuity: true
        });

        // Frontend agent loads with full session context
        const frontendAgent = await newPersonalityLoader.loadPersonalityWithContext(
            'frontend-specialist',
            'coder1-dashboard-project'
        );

        console.log('\n🎉 Frontend Agent resumption context:');
        console.log('Continuity Score:', frontendAgent.sessionContext.continuityScore);
        
        if (frontendAgent.sessionContext.previousSessions.length > 0) {
            const lastSession = frontendAgent.sessionContext.previousSessions[0];
            console.log('\nLast session work:');
            console.log('- Completed:', lastSession.work.workCompleted.slice(0, 2).join(', '));
            console.log('- State:', lastSession.work.currentState);
            console.log('- Next steps:', lastSession.work.nextSteps.slice(0, 2).join(', '));
        }

        if (frontendAgent.sessionContext.collaboratorUpdates.length > 0) {
            console.log('\nCollaborator updates:');
            for (const update of frontendAgent.sessionContext.collaboratorUpdates.slice(0, 2)) {
                console.log(`- ${update.agentId}: ${update.work.workCompleted.slice(0, 2).join(', ')}`);
                if (update.relevantNotes) {
                    console.log(`  → Note: ${update.relevantNotes}`);
                }
            }
        }

        console.log('\nSuggested actions:');
        for (const action of frontendAgent.sessionContext.suggestedActions.slice(0, 3)) {
            console.log(`- [${action.priority}] ${action.action}`);
        }

        console.log('\nResumption Prompt (first 300 chars):');
        console.log(frontendAgent.sessionContext.resumptionPrompt.substring(0, 300) + '...');

        return frontendAgent;
    }

    /**
     * Run complete example
     */
    async runExample() {
        try {
            console.log('🧠 Agent Session Continuity Example\n');

            // Session 1: Start development work
            await this.startDevelopmentSession();
            await this.recordAgentWork();
            await this.endSession();

            // Session 2: Resume work with full context
            await this.resumeInNextSession();

            console.log('\n✅ Example completed successfully!');
            console.log('\nKey Benefits Demonstrated:');
            console.log('- Agents remember their previous work');
            console.log('- Agents know what other agents did since they last worked');
            console.log('- Automatic suggestions for continuing work');
            console.log('- Persistent context across IDE sessions');
            console.log('- Cross-agent collaboration awareness');

        } catch (error) {
            console.error('❌ Example failed:', error);
        }
    }
}

// Usage patterns for integration

/**
 * Integration Pattern 1: In your existing enhanced-claude-bridge.js
 */
async function integrateWithClaudeBridge() {
    // Initialize with session continuity
    const personalityLoader = new AgentPersonalityLoader({
        enableSessionContinuity: true
    });

    // When activating an agent, load with context
    const agentPersonality = await personalityLoader.loadPersonalityWithContext(
        'frontend-specialist', 
        'current-project-id'
    );

    // Use the enhanced personality (includes session context)
    const agentPrompt = `
        ${agentPersonality.enhancedInstructions}
        
        ${agentPersonality.sessionContext?.resumptionPrompt || ''}
        
        Current task: ${userRequest}
    `;

    // After agent completes work, record it
    await personalityLoader.recordAgentWorkCompletion('frontend-specialist', {
        completed: ['task completed'],
        state: 'current state description',
        nextSteps: ['next planned steps'],
        // ... other work data
    });
}

/**
 * Integration Pattern 2: Session lifecycle management
 */
class SessionLifecycleManager {
    constructor() {
        this.personalityLoader = new AgentPersonalityLoader({
            enableSessionContinuity: true
        });
    }

    // When IDE starts
    async onIDEStart() {
        console.log('🚀 IDE Starting - Session continuity available');
    }

    // When user starts working on project
    async onProjectOpen(projectId) {
        this.personalityLoader.updateProjectContext({
            projectId,
            phase: 'development',
            lastActiveFile: null
        });
    }

    // When agents complete tasks
    async onAgentTaskComplete(agentType, workData) {
        await this.personalityLoader.recordAgentWorkCompletion(agentType, workData);
    }

    // When IDE closes
    async onIDEClose() {
        await this.personalityLoader.finalizeSession({
            description: 'IDE session ended',
            projectState: {
                phase: 'development',
                lastActivity: Date.now()
            }
        });
        console.log('✅ Session finalized with continuity data');
    }
}

// Export example
module.exports = { 
    AgentSessionContinuityExample,
    integrateWithClaudeBridge,
    SessionLifecycleManager
};

// Run example if called directly
if (require.main === module) {
    const example = new AgentSessionContinuityExample();
    example.runExample().catch(console.error);
}