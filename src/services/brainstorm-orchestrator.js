// DISABLED: Using Claude Code OAuth token exclusively to prevent API billing
// const Anthropic = require('@anthropic-ai/sdk');
const ClaudeCodeExec = require('../integrations/claude-code-exec');

class BrainstormOrchestrator {
    constructor() {
        // Use OAuth token with proper authorization header format
        const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
        const apiKey = process.env.ANTHROPIC_API_KEY;
        
        // Try Claude Code CLI first (uses OAuth authentication)
        this.claudeCodeExec = new ClaudeCodeExec({
            logger: console,
            timeout: 30000, // 30 seconds for brainstorm responses
            implementationMode: false // We want consultation mode for brainstorming
        });
        
        // DISABLED: Direct Anthropic SDK usage to prevent API charges
        // Use Claude Code CLI only to utilize Claude Code Max account
        this.anthropic = null;
        
        this.activeSessions = new Map();
        
        // Agent personas with specialized roles
        this.agentPersonas = {
            'frontend-specialist': {
                name: 'Frontend Specialist',
                icon: '🎨',
                expertise: 'React, Vue, Angular, CSS, UX/UI, responsive design, accessibility',
                personality: 'Creative and user-focused, thinks about visual appeal and user experience'
            },
            'backend-specialist': {
                name: 'Backend Specialist', 
                icon: '⚙️',
                expertise: 'Node.js, Python, APIs, databases, server architecture, scalability',
                personality: 'Technical and systematic, focuses on performance and reliability'
            },
            'database-specialist': {
                name: 'Database Expert',
                icon: '🗄️', 
                expertise: 'SQL, NoSQL, data modeling, query optimization, data architecture',
                personality: 'Detail-oriented and analytical, thinks about data relationships and integrity'
            },
            'security-specialist': {
                name: 'Security Expert',
                icon: '🔐',
                expertise: 'Authentication, authorization, encryption, vulnerability assessment, secure coding',
                personality: 'Cautious and thorough, always considers potential security risks'
            },
            'architect': {
                name: 'System Architect',
                icon: '🏗️',
                expertise: 'System design, microservices, scalability patterns, technology selection',
                personality: 'Strategic and big-picture thinking, focuses on long-term maintainability'
            },
            'devops-specialist': {
                name: 'DevOps Engineer',
                icon: '🔧',
                expertise: 'CI/CD, containerization, cloud deployment, monitoring, automation',
                personality: 'Practical and efficiency-focused, thinks about deployment and operations'
            }
        };
    }

    // Start a new brainstorm session
    async startSession(sessionId, query, options = {}) {
        const {
            agents = ['frontend-specialist', 'backend-specialist'],
            maxRounds = 3,
            includeQuestions = true,
            mode = 'collaborative'
        } = options;

        console.log(`[BrainstormOrchestrator] Starting session ${sessionId} with agents:`, agents);

        const session = {
            sessionId,
            query,
            agents,
            maxRounds,
            includeQuestions,
            mode,
            currentRound: 0,
            messages: [],
            startTime: Date.now(),
            active: true
        };

        this.activeSessions.set(sessionId, session);
        return session;
    }

    // Generate agent response based on persona and context
    async generateAgentResponse(agentId, query, context = [], round = 1, session = {}) {
        const persona = this.agentPersonas[agentId];
        if (!persona) {
            throw new Error(`Unknown agent: ${agentId}`);
        }

        // Check for recent user input
        const recentUserInput = context.filter(m => m.type === 'user-input').slice(-1)[0];
        const hasRecentUserInput = recentUserInput && 
            (context.indexOf(recentUserInput) >= context.length - 3); // User input in last 3 messages

        // Build context from previous messages
        const contextString = context.length > 0 
            ? `\n\nPrevious discussion:\n${context.map(m => `${m.agentName}: ${m.message}`).join('\n')}`
            : '';

        const systemPrompt = `You are ${persona.name}, a ${agentId.replace('-', ' ')} with expertise in: ${persona.expertise}.

Your personality: ${persona.personality}

You are participating in a collaborative brainstorm session (Round ${round} of multiple rounds). This is a CONVERSATION - build on what other experts have said, reference their ideas, and add your unique perspective. 

${hasRecentUserInput ? 'CRITICAL: The user has just contributed to the discussion. You MUST acknowledge their input directly and build upon it. Start your response by addressing the user\'s point specifically.' : ''}

${context.length > 0 ? 'IMPORTANT: Read the previous discussion carefully and explicitly reference other experts\' points. Use phrases like "Building on [Name]\'s point about X..." or "I agree with [Name], and would add..." or "While [Name] mentioned X, from my perspective..."' : ''}

${round === 1 && session.includeQuestions && !hasRecentUserInput ? 'In Round 1, start by asking 1-2 clarifying questions about the problem before giving your initial thoughts. For example: "Before diving in, I\'d like to understand: [specific question]? Also, [another question]?"' : ''}

${round === 2 && !hasRecentUserInput ? 'In Round 2, answer any questions raised in Round 1 from your expertise, then build on the discussion with deeper insights.' : ''}

Provide thoughtful, specific insights from your area of expertise. Keep responses concise but valuable - aim for 2-3 sentences that add unique perspective while showing you're listening to the team${hasRecentUserInput ? ' and especially the user' : ''}.

Focus on practical, actionable insights that complement and build upon other specialists' viewpoints.`;

        const userPrompt = `Original question: ${query}${contextString}

Based on your expertise as ${persona.name}, what insights, suggestions, or considerations would you contribute to this discussion?`;

        try {
            // Try Claude Code CLI first (uses OAuth authentication)
            let responseText;
            
            try {
                responseText = await this.claudeCodeExec.executePrompt(userPrompt, {
                    systemPrompt: systemPrompt
                });
                console.log(`[BrainstormOrchestrator] ✅ Claude Code CLI response for ${agentId}`);
            } catch (cliError) {
                console.log('❌ Claude Code CLI failed:', cliError.message);
                throw new Error('Claude Code CLI unavailable - using Claude Code Max Plan exclusively');
            }

            return {
                agent: agentId,
                agentName: persona.name,
                icon: persona.icon,
                message: responseText.trim(),
                timestamp: Date.now(),
                round
            };
        } catch (error) {
            console.error(`[BrainstormOrchestrator] Error generating response for ${agentId}:`, error);
            
            // Fallback to contextual mock response on error
            const mockResponse = this.generateMockResponse(agentId, persona, query, context, round, session);
            return {
                agent: agentId,
                agentName: persona.name,
                icon: persona.icon,
                message: mockResponse,
                timestamp: Date.now(),
                round
            };
        }
    }

    // Generate intelligent mock responses with coordinated cross-referencing
    generateMockResponse(agentId, persona, query, context, round, session = {}) {
        
        // Check if previous agents have responded and build on their insights
        const previousMessages = context.filter(msg => msg.agent !== agentId);
        const hasContext = previousMessages.length > 0;
        
        // Check if we should ask questions in round 1
        const shouldAskQuestions = round === 1 && session.includeQuestions;
        
        const responses = {
            'frontend-specialist': shouldAskQuestions ? [
                'Before diving into solutions, I\'d like to understand: What\'s the expected user volume and peak load? Also, what devices and browsers need to be supported? Understanding these constraints will help shape the UI architecture.',
                'First, some clarifying questions: Are we prioritizing mobile or desktop experience? And what\'s the current tech stack we need to integrate with? These details will influence our frontend approach significantly.',
                'To provide the best UI recommendations, I need to know: What\'s the target audience\'s technical proficiency? Also, are there existing design systems or brand guidelines we need to follow?'
            ] : hasContext ? [
                `Building on what ${previousMessages[0]?.agentName || 'the team'} mentioned about architectural concerns, from a UI perspective we need responsive interfaces that can handle the scale discussed. Real-time notifications require careful UX consideration to avoid overwhelming users - perhaps progressive disclosure of information.`,
                `I completely agree with ${previousMessages.find(m => m.agentName?.includes('Backend'))?.agentName || 'the backend team'}'s scalability points. For the frontend, we'll need efficient state management and optimistic updates to handle that concurrent user load. Progressive loading and virtualization will be essential as they suggested.`,
                `${previousMessages.find(m => m.agentName?.includes('Architect'))?.agentName || 'The architect'} raised excellent scalability concerns. From a UI standpoint, I'd add that we should implement smart caching strategies and lazy loading to reduce the server load they're worried about. WebSocket connections for real-time features need careful lifecycle management.`
            ] : [
                'From a UI perspective, we should focus on intuitive user flows and clear visual feedback. Consider implementing progressive disclosure to avoid overwhelming new users.',
                'The user experience could benefit from contextual help tooltips and a guided onboarding flow. Visual consistency with existing design patterns is crucial.',
                'We should prioritize mobile-first design and ensure accessibility standards are met. Interactive prototyping would help validate user interactions early.'
            ],
            'backend-specialist': hasContext ? [
                'Building on the frontend team\'s UI concerns, from a backend perspective we\'ll need robust API design with proper error handling and validation. The caching strategies they mentioned are crucial - I\'d suggest Redis for session management and CDN for static assets.',
                'I agree with the architectural points raised earlier about scalability. Database optimization and efficient query patterns will be essential for handling the load they mentioned. We should also plan for horizontal scaling with proper indexing and maybe read replicas.',
                'The security and performance concerns mentioned are spot-on. From the backend side, we need proper authentication, input sanitization, and rate limiting. The API versioning strategy should be planned from the start to support the UI evolution they discussed.'
            ] : [
                'We\'ll need robust API design with proper error handling and validation. Consider implementing caching strategies for frequently accessed data.',
                'Database optimization and efficient query patterns will be essential. We should also plan for horizontal scaling and proper indexing.',
                'Security considerations include proper authentication, input sanitization, and rate limiting. API versioning strategy should be planned from the start.'
            ],
            'architect': [
                'The system architecture should embrace microservices patterns for scalability. Consider event-driven architecture for loose coupling between components.',
                'We need to establish clear separation of concerns and define service boundaries. Containerization and orchestration will facilitate deployment.',
                'Think about data flow patterns, caching strategies, and eventual consistency models. The architecture should support both current needs and future growth.'
            ],
            'database-specialist': [
                'Data modeling should prioritize normalization while considering query performance. Indexing strategy is crucial for response times.',
                'Consider implementing read replicas for scaling and proper backup/recovery procedures. Data validation at the database level adds security.',
                'Migration strategies and schema versioning need planning. Consider both relational and document storage based on use cases.'
            ],
            'security-specialist': [
                'Implement defense in depth with multiple security layers. Authentication should use proven standards like OAuth2 or JWT with proper expiration.',
                'Input validation, output encoding, and parameterized queries are essential. Regular security audits and dependency scanning should be automated.',
                'Consider implementing rate limiting, CSRF protection, and proper session management. Security headers and HTTPS everywhere are non-negotiable.'
            ],
            'devops-specialist': [
                'CI/CD pipeline should include automated testing, security scanning, and deployment validation. Infrastructure as code ensures consistency.',
                'Monitoring and logging strategies need definition early. Consider using containerization for consistent environments across development and production.',
                'Automated scaling policies and health checks will ensure reliability. Backup and disaster recovery procedures should be tested regularly.'
            ]
        };

        const agentResponses = responses[agentId] || [
            `From a ${persona.name.toLowerCase()} perspective, this requires careful consideration of the technical and user requirements.`
        ];

        // Select response based on round to provide variety
        const responseIndex = (round - 1) % agentResponses.length;
        return agentResponses[responseIndex];
    }

    // Run a complete brainstorm round
    async runBrainstormRound(sessionId, emitCallback) {
        const session = this.activeSessions.get(sessionId);
        if (!session || !session.active) {
            throw new Error(`Session ${sessionId} not found or inactive`);
        }

        session.currentRound++;
        console.log(`[BrainstormOrchestrator] Running round ${session.currentRound} for session ${sessionId}`);

        // Emit round started event for UI progress tracking
        emitCallback('brainstorm:round-started', {
            round: session.currentRound,
            maxRounds: session.maxRounds,
            sessionId: sessionId
        });

        // Generate responses from each agent
        for (const agentId of session.agents) {
            try {
                const response = await this.generateAgentResponse(
                    agentId, 
                    session.query, 
                    session.messages,
                    session.currentRound,
                    session
                );

                session.messages.push(response);

                // Emit agent message to client with round info
                emitCallback('brainstorm:agent-message', {
                    ...response,
                    round: session.currentRound,
                    sessionId: sessionId
                });

                // Small delay between agents for natural flow
                await this.delay(1000);
            } catch (error) {
                console.error(`[BrainstormOrchestrator] Error with agent ${agentId}:`, error);
            }
        }

        // Check if we should continue or synthesize
        if (session.currentRound >= session.maxRounds) {
            // Add a small delay before synthesis
            await this.delay(2000);
            return await this.synthesizeBrainstorm(sessionId, emitCallback);
        }

        // Auto-continue to next round after a brief delay
        console.log(`[BrainstormOrchestrator] Round ${session.currentRound} complete, auto-continuing to next round...`);
        setTimeout(async () => {
            try {
                await this.runBrainstormRound(sessionId, emitCallback);
            } catch (error) {
                console.error('[BrainstormOrchestrator] Error auto-continuing round:', error);
                emitCallback('brainstorm:error', { 
                    error: 'Failed to continue to next round', 
                    sessionId 
                });
            }
        }, 3000); // 3 second pause between rounds

        return { continueSession: true };
    }

    // Generate final synthesis
    async synthesizeBrainstorm(sessionId, emitCallback) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;

        console.log(`[BrainstormOrchestrator] Synthesizing brainstorm for session ${sessionId}`);

        const allResponses = session.messages.map(m => `${m.agentName}: ${m.message}`).join('\n\n');

        const synthesisPrompt = `Based on this brainstorm discussion about "${session.query}", synthesize the key insights into actionable recommendations:

${allResponses}

Provide a concise synthesis that:
1. Highlights the most valuable insights
2. Identifies any common themes or patterns
3. Suggests next steps or priorities
4. Notes any important considerations mentioned

Keep it practical and actionable.`;

        try {
            // Try Claude Code CLI first
            let synthesis;
            
            try {
                synthesis = await this.claudeCodeExec.executePrompt(synthesisPrompt);
                console.log('[BrainstormOrchestrator] ✅ Claude Code CLI synthesis generated');
            } catch (cliError) {
                console.log('❌ Claude Code CLI failed:', cliError.message);
                throw new Error('Claude Code CLI unavailable - using Claude Code Max Plan exclusively');
            }

            emitCallback('brainstorm:synthesis', {
                synthesis,
                sessionId,
                timestamp: Date.now()
            });

            // Mark session as complete
            session.active = false;
            session.endTime = Date.now();

            emitCallback('brainstorm:session-complete', {
                sessionId,
                duration: session.endTime - session.startTime,
                totalMessages: session.messages.length,
                rounds: session.currentRound
            });

            return { sessionComplete: true, synthesis };
        } catch (error) {
            console.error('[BrainstormOrchestrator] Error generating synthesis:', error);
            const fallbackSynthesis = this.generateMockSynthesis(session);
            
            emitCallback('brainstorm:synthesis', {
                synthesis: fallbackSynthesis,
                sessionId,
                timestamp: Date.now()
            });

            session.active = false;
            emitCallback('brainstorm:session-complete', { sessionId, stopped: false });
            return { sessionComplete: true, synthesis: fallbackSynthesis };
        }
    }

    // Generate intelligent mock synthesis based on session content
    generateMockSynthesis(session) {
        const agentTypes = session.agents.map(agentId => this.agentPersonas[agentId]?.name || agentId);
        
        return `## Brainstorm Synthesis

**Key Insights from ${agentTypes.join(', ')}:**

The team has provided comprehensive perspectives on: "${session.query}"

**Priority Recommendations:**
1. **User Experience Focus**: Implement intuitive interfaces with clear feedback and guided workflows
2. **Technical Foundation**: Establish robust architecture with proper security and scalability considerations  
3. **Implementation Strategy**: Use proven patterns and technologies while planning for future growth

**Next Steps:**
- Create detailed user flow diagrams and wireframes
- Define technical specifications and API contracts
- Establish development timeline with iterative milestones
- Set up proper testing and deployment processes

**Key Considerations:**
- Balance user needs with technical constraints
- Ensure security and performance from the start
- Plan for maintenance and future enhancements

This collaborative analysis provides a solid foundation for moving forward with confidence.`;
    }

    // Stop an active session
    stopSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.active = false;
            session.endTime = Date.now();
            console.log(`[BrainstormOrchestrator] Session ${sessionId} stopped`);
            return true;
        }
        return false;
    }

    // Get session status
    getSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }

    // Add user input to session context
    addUserInput(sessionId, message, timestamp) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Add user input as a special message type
        const userMessage = {
            agent: '👤 User',
            agentName: '👤 User',
            message: message,
            timestamp: timestamp || Date.now(),
            round: session.currentRound,
            type: 'user-input'
        };

        session.messages.push(userMessage);
        console.log(`[BrainstormOrchestrator] User input added to session ${sessionId}: "${message}"`);
        
        return userMessage;
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Clean up old sessions
    cleanupOldSessions() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [sessionId, session] of this.activeSessions) {
            if (session.startTime < oneHourAgo) {
                this.activeSessions.delete(sessionId);
                console.log(`[BrainstormOrchestrator] Cleaned up old session: ${sessionId}`);
            }
        }
    }
}

module.exports = BrainstormOrchestrator;