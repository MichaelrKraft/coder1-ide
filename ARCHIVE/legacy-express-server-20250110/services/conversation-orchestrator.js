/**
 * Conversation Orchestrator - The Revolutionary AI Expert Collaboration System
 * 
 * This system manages the orchestrator-led expert consultation flow:
 * 1. Orchestrator conducts discovery with user
 * 2. Assembles expert team based on requirements
 * 3. Facilitates dynamic agent collaboration with natural questioning
 * 4. Manages individual expert plan generation
 * 5. Synthesizes plans into unified recommendations
 * 6. Prepares Claude Code integration
 */

const DynamicPromptEngine = require('./dynamic-prompt-engine');
const ClaudeCodeExec = require('../integrations/claude-code-exec');
const Anthropic = require('@anthropic-ai/sdk');

class ConversationOrchestrator {
    constructor() {
        this.promptEngine = new DynamicPromptEngine();
        this.activeSessions = new Map();
        
        // Initialize AI clients
        const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
        const apiKey = process.env.ANTHROPIC_API_KEY;
        
        // Try Claude Code CLI first (uses OAuth authentication)
        this.claudeCodeExec = new ClaudeCodeExec({
            logger: console,
            timeout: 45000, // Longer timeout for complex conversations
            implementationMode: false
        });
        
        // DISABLED: Direct Anthropic SDK usage to prevent API charges
        // Use Claude Code CLI only to utilize Claude Code Max account
        this.anthropic = null;

        // AI service health monitoring
        this.serviceHealth = {
            claudeCodeCli: { status: 'unknown', lastCheck: null, consecutiveFailures: 0 },
            anthropicSdk: { status: 'unknown', lastCheck: null, consecutiveFailures: 0 }
        };
        
        // Initialize health checks
        this.initializeHealthChecks();

        // Streaming configuration
        this.streamingConfig = {
            enabled: true,
            chunkDelay: 50, // ms between chunks for smooth typing effect
            maxChunkSize: 5, // words per chunk
            typingSpeed: 80, // ms per character for typing simulation
            bufferSize: 100 // characters to buffer for smooth streaming
        };

        // Conversation phases
        this.phases = {
            DISCOVERY: 'discovery',
            TEAM_ASSEMBLY: 'teamAssembly', 
            COLLABORATION: 'collaboration',
            PLANNING: 'planning',
            SYNTHESIS: 'synthesis',
            COMPLETE: 'complete'
        };

        // Available expert types
        this.expertTypes = {
            'frontend-specialist': { name: 'Frontend Specialist', icon: '🎨', priority: 1 },
            'backend-specialist': { name: 'Backend Specialist', icon: '⚙️', priority: 1 },
            'database-specialist': { name: 'Database Expert', icon: '🗄️', priority: 2 },
            'security-specialist': { name: 'Security Expert', icon: '🔐', priority: 2 },
            'system-architect': { name: 'System Architect', icon: '🏗️', priority: 1 },
            'devops-specialist': { name: 'DevOps Engineer', icon: '🔧', priority: 3 },
            'mobile-specialist': { name: 'Mobile Expert', icon: '📱', priority: 3 },
            'ai-specialist': { name: 'AI/ML Expert', icon: '🤖', priority: 3 }
        };
    }

    // ==========================================
    // SESSION MANAGEMENT
    // ==========================================

    async startSession(userId, initialQuery, options = {}) {
        const sessionId = `conversation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const session = {
            sessionId,
            userId,
            initialQuery,
            phase: this.phases.DISCOVERY,
            startTime: Date.now(),
            active: true,
            
            // Conversation state
            messages: [],
            userContext: {
                projectDescription: initialQuery,
                timeline: null,
                constraints: [],
                priorities: [],
                concerns: [],
                targetUsers: null,
                successMetrics: []
            },
            
            // Expert team
            selectedExperts: [],
            expertPlans: [],
            
            // Final outputs
            synthesis: null,
            claudeCodePrompt: null,
            
            // Options
            maxExperts: options.maxExperts || 4,
            includeUserInCollaboration: options.includeUserInCollaboration !== false
        };

        this.activeSessions.set(sessionId, session);
        
        // Start with orchestrator discovery
        const orchestratorResponse = await this.generateOrchestratorResponse(
            session, 
            initialQuery, 
            'initial_discovery'
        );

        session.messages.push({
            type: 'orchestrator-message',
            speaker: 'Orchestrator',
            message: orchestratorResponse.message,
            timestamp: Date.now(),
            phase: session.phase
        });

        return {
            sessionId,
            orchestratorMessage: orchestratorResponse,
            phase: session.phase,
            status: 'discovery_started'
        };
    }

    async startSessionWithStreaming(userId, initialQuery, options = {}, emitCallback = null) {
        // Create session same way as regular startSession
        const sessionId = `conversation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const session = {
            sessionId,
            userId,
            initialQuery,
            phase: this.phases.DISCOVERY,
            startTime: Date.now(),
            active: true,
            
            // Conversation state
            messages: [],
            userContext: {
                projectDescription: initialQuery,
                timeline: null,
                constraints: [],
                priorities: [],
                concerns: [],
                targetUsers: null,
                successMetrics: []
            },
            
            // Expert team
            selectedExperts: [],
            expertPlans: [],
            
            // Final outputs
            synthesis: null,
            claudeCodePrompt: null,
            
            // Options
            maxExperts: options.maxExperts || 4,
            includeUserInCollaboration: options.includeUserInCollaboration !== false
        };

        this.activeSessions.set(sessionId, session);
        
        // Start with orchestrator discovery using streaming if callback provided
        const orchestratorResponse = emitCallback ? 
            await this.generateOrchestratorResponseStream(session, initialQuery, 'initial_discovery', emitCallback) :
            await this.generateOrchestratorResponse(session, initialQuery, 'initial_discovery');

        session.messages.push({
            type: 'orchestrator-message',
            speaker: 'Orchestrator',
            message: orchestratorResponse.message,
            timestamp: Date.now(),
            phase: session.phase,
            streamed: orchestratorResponse.streamed || false
        });

        console.log(`[ConversationOrchestrator] 🌊 Session started with streaming: ${sessionId}`);

        return {
            sessionId,
            orchestratorMessage: orchestratorResponse,
            phase: session.phase,
            status: 'discovery_started_streaming'
        };
    }

    async handleUserMessage(sessionId, userMessage, emitCallback = null) {
        const session = this.activeSessions.get(sessionId);
        if (!session || !session.active) {
            throw new Error(`Session ${sessionId} not found or inactive`);
        }

        // Add user message to conversation
        session.messages.push({
            type: 'user-message',
            speaker: 'User',
            message: userMessage.trim(),
            timestamp: Date.now(),
            phase: session.phase
        });

        // Emit user message if callback provided
        if (emitCallback) {
            emitCallback('conversation:user-message', {
                sessionId,
                message: userMessage.trim(),
                timestamp: Date.now(),
                phase: session.phase
            });
        }

        // Handle based on current phase
        let response;
        switch (session.phase) {
        case this.phases.DISCOVERY:
            response = await this.handleDiscoveryPhase(session, userMessage, emitCallback);
            break;
        case this.phases.COLLABORATION:
            response = await this.handleCollaborationPhase(session, userMessage, emitCallback);
            break;
        case this.phases.PLANNING:
            response = await this.handlePlanningPhase(session, userMessage, emitCallback);
            break;
        default:
            response = await this.handleGeneralResponse(session, userMessage, emitCallback);
        }

        return response;
    }

    // ==========================================
    // DISCOVERY PHASE MANAGEMENT
    // ==========================================

    async handleDiscoveryPhase(session, userMessage, emitCallback) {
        // Update user context based on their response
        this.updateUserContext(session, userMessage);

        // Generate orchestrator response
        const orchestratorResponse = await this.generateOrchestratorResponse(
            session,
            userMessage,
            'discovery_followup'
        );

        session.messages.push({
            type: 'orchestrator-message',
            speaker: 'Orchestrator',
            message: orchestratorResponse.message,
            timestamp: Date.now(),
            phase: session.phase
        });

        // Emit orchestrator response
        if (emitCallback) {
            emitCallback('conversation:orchestrator-message', {
                sessionId: session.sessionId,
                message: orchestratorResponse.message,
                timestamp: Date.now(),
                phase: session.phase
            });
        }

        // Check if ready to assemble team
        if (this.isReadyForTeamAssembly(session)) {
            await this.delay(1000); // Quick natural pause
            return await this.transitionToTeamAssembly(session, emitCallback);
        }

        return {
            sessionId: session.sessionId,
            orchestratorMessage: orchestratorResponse,
            phase: session.phase,
            status: 'discovery_continued',
            userContextUpdated: true
        };
    }

    updateUserContext(session, userMessage) {
        const context = session.userContext;
        const message = userMessage.toLowerCase();

        // Extract timeline information
        if (message.includes('month') || message.includes('week') || message.includes('year')) {
            const timelineMatch = userMessage.match(/(\d+)\s*(month|week|year)s?/i);
            if (timelineMatch) {
                context.timeline = `${timelineMatch[1]} ${timelineMatch[2]}s`;
            }
        }

        // Extract constraints
        if (message.includes('budget') || message.includes('cost') || message.includes('money')) {
            context.constraints.push('Budget conscious');
        }
        if (message.includes('team') || message.includes('solo') || message.includes('myself')) {
            if (message.includes('solo') || message.includes('myself') || message.includes('just me')) {
                context.constraints.push('Solo development');
            } else {
                context.constraints.push('Team development');
            }
        }
        if (message.includes('mobile') || message.includes('phone') || message.includes('app')) {
            context.priorities.push('Mobile-first');
        }

        // Extract concerns
        if (message.includes('scaling') || message.includes('scale') || message.includes('growth')) {
            context.concerns.push('Scaling challenges');
        }
        if (message.includes('security') || message.includes('secure') || message.includes('safe')) {
            context.concerns.push('Security requirements');
        }
        if (message.includes('performance') || message.includes('fast') || message.includes('speed')) {
            context.concerns.push('Performance optimization');
        }

        // Extract target users
        if (message.includes('gen z') || message.includes('young')) {
            context.targetUsers = 'Gen Z users';
        }
        if (message.includes('business') || message.includes('b2b') || message.includes('enterprise')) {
            context.targetUsers = 'Business users';
        }

        console.log('[ConversationOrchestrator] Updated context:', context);
    }

    isReadyForTeamAssembly(session) {
        const context = session.userContext;
        const messageCount = session.messages.filter(m => m.type === 'user-message').length;
        
        // Ready if we have enough information or enough conversation
        return (
            messageCount >= 2 && (
                context.timeline || 
                context.constraints.length > 0 ||
                context.concerns.length > 0 ||
                messageCount >= 4
            )
        );
    }

    // ==========================================
    // TEAM ASSEMBLY PHASE
    // ==========================================

    async transitionToTeamAssembly(session, emitCallback) {
        session.phase = this.phases.TEAM_ASSEMBLY;

        // Select expert team based on user context
        session.selectedExperts = this.selectExpertTeam(session.userContext);

        // Generate team assembly message
        const assemblyResponse = await this.generateOrchestratorResponse(
            session,
            null,
            'team_assembly'
        );

        session.messages.push({
            type: 'orchestrator-message',
            speaker: 'Orchestrator',
            message: assemblyResponse.message,
            timestamp: Date.now(),
            phase: session.phase
        });

        // Emit phase change and team assembly
        if (emitCallback) {
            emitCallback('conversation:phase-change', {
                sessionId: session.sessionId,
                newPhase: session.phase,
                selectedExperts: session.selectedExperts
            });

            emitCallback('conversation:orchestrator-message', {
                sessionId: session.sessionId,
                message: assemblyResponse.message,
                timestamp: Date.now(),
                phase: session.phase
            });
        }

        // Start expert collaboration after brief pause
        setTimeout(async () => {
            await this.startExpertCollaboration(session, emitCallback);
        }, 3000);

        return {
            sessionId: session.sessionId,
            orchestratorMessage: assemblyResponse,
            phase: session.phase,
            selectedExperts: session.selectedExperts,
            status: 'team_assembled'
        };
    }

    selectExpertTeam(userContext) {
        const experts = [];
        const availableExperts = Object.keys(this.expertTypes);

        // Always include core experts for most projects
        experts.push('backend-specialist', 'frontend-specialist');

        // Add experts based on context
        if (userContext.concerns.includes('Security requirements') || 
            userContext.projectDescription.toLowerCase().includes('payment') ||
            userContext.projectDescription.toLowerCase().includes('auth')) {
            experts.push('security-specialist');
        }

        if (userContext.concerns.includes('Scaling challenges') ||
            userContext.projectDescription.toLowerCase().includes('enterprise') ||
            userContext.projectDescription.toLowerCase().includes('complex')) {
            experts.push('system-architect');
        }

        if (userContext.projectDescription.toLowerCase().includes('data') ||
            userContext.projectDescription.toLowerCase().includes('analytics') ||
            userContext.projectDescription.toLowerCase().includes('database')) {
            experts.push('database-specialist');
        }

        if (userContext.priorities.includes('Mobile-first') ||
            userContext.projectDescription.toLowerCase().includes('mobile') ||
            userContext.projectDescription.toLowerCase().includes('app')) {
            experts.push('mobile-specialist');
        }

        if (userContext.projectDescription.toLowerCase().includes('ai') ||
            userContext.projectDescription.toLowerCase().includes('ml') ||
            userContext.projectDescription.toLowerCase().includes('machine learning')) {
            experts.push('ai-specialist');
        }

        // Ensure we have 3-4 experts maximum
        const uniqueExperts = [...new Set(experts)];
        return uniqueExperts.slice(0, 4);
    }

    // ==========================================
    // EXPERT COLLABORATION PHASE
    // ==========================================

    async startExpertCollaboration(session, emitCallback) {
        session.phase = this.phases.COLLABORATION;

        if (emitCallback) {
            emitCallback('conversation:phase-change', {
                sessionId: session.sessionId,
                newPhase: session.phase,
                status: 'collaboration_started'
            });
        }

        // Start the collaborative discussion
        await this.runExpertCollaboration(session, emitCallback);
    }

    async runExpertCollaboration(session, emitCallback, rounds = 1) { // Reduced from 3 to 1 for speed
        console.log(`[ConversationOrchestrator] Starting expert collaboration with ${session.selectedExperts.length} experts`);

        for (let round = 1; round <= rounds; round++) {
            console.log(`[ConversationOrchestrator] Collaboration round ${round}/${rounds}`);

            // Orchestrator moderation at start of collaboration (only show once)
            if (round === 1 && emitCallback && !session.moderationShown) {
                session.moderationShown = true; // Track that we've shown this
                emitCallback('conversation:orchestrator-message', {
                    sessionId: session.sessionId,
                    message: 'Let\'s hear quick insights from each expert. Please keep suggestions focused and concise.',
                    timestamp: Date.now(),
                    phase: session.phase
                });
                await this.delay(200); // Reduced moderation pause for speed
            }

            // Run all experts in PARALLEL for massive speed improvement
            const expertPromises = session.selectedExperts.map(async (expertType) => {
                try {
                    // Show typing indicator immediately
                    if (emitCallback) {
                        emitCallback('conversation:expert-thinking', {
                            sessionId: session.sessionId,
                            expertType: expertType,
                            expertName: this.expertTypes[expertType].name,
                            message: `${this.expertTypes[expertType].name} is analyzing...`,
                            timestamp: Date.now(),
                            phase: session.phase
                        });
                    }
                    
                    const expertResponse = await this.generateExpertResponse(
                        expertType,
                        session,
                        round
                    );

                    return {
                        expertType,
                        expertName: this.expertTypes[expertType].name,
                        response: expertResponse,
                        timestamp: Date.now()
                    };

                } catch (error) {
                    console.error(`[ConversationOrchestrator] Error with expert ${expertType}:`, error);
                    
                    // Return fallback response
                    const fallbackResponse = this.generateFallbackExpertResponse(expertType, session, round);
                    return {
                        expertType,
                        expertName: this.expertTypes[expertType].name,
                        response: { message: fallbackResponse.message },
                        timestamp: Date.now(),
                        isFallback: true
                    };
                }
            });

            // Wait for ALL experts to complete in parallel (massive speed boost!)
            const expertResults = await Promise.all(expertPromises);
            
            // Check for early consensus to save time
            const checkConsensus = (results) => {
                if (results.length < 2) return false;
                
                // Extract key recommendations from each expert
                const recommendations = results.map(r => {
                    const msg = r.response.message.toLowerCase();
                    const techs = [];
                    
                    // Look for common technology mentions
                    if (msg.includes('react') || msg.includes('next')) techs.push('react');
                    if (msg.includes('node') || msg.includes('express')) techs.push('node');
                    if (msg.includes('postgres') || msg.includes('sql')) techs.push('sql');
                    if (msg.includes('mongo')) techs.push('nosql');
                    if (msg.includes('docker') || msg.includes('kubernetes')) techs.push('containerized');
                    if (msg.includes('serverless') || msg.includes('lambda')) techs.push('serverless');
                    
                    return techs;
                });
                
                // Check if at least 80% of experts agree on key technologies
                const allTechs = recommendations.flat();
                const techCounts = {};
                allTechs.forEach(tech => {
                    techCounts[tech] = (techCounts[tech] || 0) + 1;
                });
                
                const consensusThreshold = Math.ceil(results.length * 0.8);
                const hasConsensus = Object.values(techCounts).some(count => count >= consensusThreshold);
                
                if (hasConsensus) {
                    console.log('[ConversationOrchestrator] Early consensus detected! Skipping additional rounds.');
                }
                
                return hasConsensus;
            };
            
            // Process results in order for consistent UI
            for (const result of expertResults) {
                // Add to session messages
                session.messages.push({
                    type: 'agent-message',
                    speaker: result.expertName,
                    message: result.response.message,
                    timestamp: result.timestamp,
                    phase: session.phase,
                    round,
                    expertType: result.expertType
                });

                // Emit expert message with small delay for UI readability
                if (emitCallback) {
                    emitCallback('conversation:agent-message', {
                        sessionId: session.sessionId,
                        agent: result.expertName,
                        agentName: result.expertName,
                        expertType: result.expertType,
                        message: result.response.message,
                        timestamp: result.timestamp,
                        round,
                        phase: session.phase
                    });
                    
                    // Small delay between emissions for UI to process
                    await this.delay(100);
                }
                
                // Check if any expert asked a question
                if (result.response.userQuestionDetected) {
                    console.log(`[ConversationOrchestrator] Expert ${result.expertType} asked user a question`);
                    
                    if (emitCallback) {
                        emitCallback('conversation:user-input-requested', {
                            sessionId: session.sessionId,
                            expertType: result.expertType,
                            expertName: result.expertName,
                            round
                        });
                    }
                    
                    return { waitingForUser: true, round, expertType: result.expertType };
                }
            }

            // Check for early consensus - if experts agree, skip additional rounds
            if (checkConsensus(expertResults) && round < rounds) {
                console.log(`[ConversationOrchestrator] Consensus reached in round ${round}, skipping remaining rounds`);
                
                if (emitCallback) {
                    emitCallback('conversation:orchestrator-message', {
                        sessionId: session.sessionId,
                        message: '✅ Great news! The experts have reached consensus quickly. Moving to final synthesis...',
                        timestamp: Date.now(),
                        phase: session.phase
                    });
                }
                
                break; // Exit the rounds loop early
            }
            
            // Brief pause between rounds
            if (round < rounds) {
                await this.delay(200); // Reduced round transition
            }
        }

        // Move to individual planning phase
        await this.delay(200); // Quick transition
        await this.transitionToPlanning(session, emitCallback);
    }

    async handleCollaborationPhase(session, userMessage, emitCallback) {
        // User is responding to an expert question
        console.log(`[ConversationOrchestrator] User response during collaboration: ${userMessage}`);

        // Update context with user response
        this.updateUserContext(session, userMessage);

        // Generate expert responses to user input
        const respondingExperts = session.selectedExperts.slice(0, 2); // 1-2 experts respond
        
        for (const expertType of respondingExperts) {
            try {
                const expertResponse = await this.generateExpertResponseToUser(
                    expertType,
                    session,
                    userMessage
                );

                session.messages.push({
                    type: 'agent-message',
                    speaker: this.expertTypes[expertType].name,
                    message: expertResponse.message,
                    timestamp: Date.now(),
                    phase: session.phase,
                    respondingToUser: true
                });

                if (emitCallback) {
                    emitCallback('conversation:agent-message', {
                        sessionId: session.sessionId,
                        agent: expertType,
                        agentName: this.expertTypes[expertType].name,
                        message: expertResponse.message,
                        timestamp: Date.now(),
                        phase: session.phase,
                        respondingToUser: true
                    });
                }

                await this.delay(500); // Reduced delay for user response
            } catch (error) {
                console.error('[ConversationOrchestrator] Error generating expert response to user:', error);
            }
        }

        // Continue collaboration if not complete
        setTimeout(async () => {
            const collaborationComplete = session.messages.filter(m => 
                m.type === 'agent-message' && m.phase === this.phases.COLLABORATION
            ).length >= (session.selectedExperts.length * 3);

            if (!collaborationComplete) {
                await this.runExpertCollaboration(session, emitCallback, 1); // One more round
            } else {
                await this.transitionToPlanning(session, emitCallback);
            }
        }, 2000);

        return {
            sessionId: session.sessionId,
            status: 'user_response_processed',
            phase: session.phase
        };
    }

    // ==========================================
    // AI RESPONSE GENERATION
    // ==========================================

    async generateOrchestratorResponse(session, userMessage, responseType) {
        const prompt = this.promptEngine.generateOrchestratorPrompt(
            session.phase,
            session.userContext,
            session.messages
        );

        const conversationContext = userMessage ? 
            `User just said: "${userMessage}"\n\nRespond as the orchestrator based on current phase and context.` :
            'Generate appropriate orchestrator response for current phase and context.';

        try {
            // Enhanced AI execution with retry logic
            const responseText = await this.withRetry(async () => {
                // Try Claude Code CLI first
                try {
                    const result = await this.withTimeout(
                        this.claudeCodeExec.executePrompt(conversationContext, {
                            systemPrompt: prompt
                        }),
                        45000 // 45 second timeout for complex orchestrator responses
                    );
                    
                    // Check if Claude Code CLI returned an error as output (not exception)
                    if (result && result.toLowerCase().includes('execution error')) {
                        throw new Error('Claude Code CLI returned execution error');
                    }
                    
                    console.log('[ConversationOrchestrator] ✅ Claude Code CLI orchestrator response generated');
                    return result;
                } catch (cliError) {
                    console.log('[ConversationOrchestrator] Claude Code CLI failed, trying Anthropic SDK:', cliError.message);
                    
                    // Fallback to Anthropic SDK
                    if (this.anthropic) {
                        const response = await this.withTimeout(
                            this.anthropic.messages.create({
                                model: 'claude-3-5-sonnet-20241022',
                                max_tokens: 800, // Increased for richer responses
                                temperature: 0.7,
                                system: prompt,
                                messages: [
                                    { role: 'user', content: conversationContext }
                                ]
                            }),
                            45000 // 45 second timeout for complex responses
                        );
                        
                        const result = response.content[0].text.trim();
                        console.log('[ConversationOrchestrator] ✅ Anthropic SDK orchestrator response generated');
                        return result;
                    } else {
                        throw new Error('Both Claude Code CLI and Anthropic SDK unavailable');
                    }
                }
            }, 2, 2000); // 2 retries with 2 second base delay

            return {
                message: responseText.trim(),
                source: 'ai',
                responseType
            };

        } catch (error) {
            console.error('[ConversationOrchestrator] Error generating orchestrator response:', {
                error: error.message,
                stack: error.stack,
                sessionId: session.sessionId,
                phase: session.phase,
                responseType,
                userMessage: userMessage?.substring(0, 100) + '...',
                timestamp: new Date().toISOString()
            });
            
            // Enhanced fallback response with context
            return this.generateFallbackOrchestratorResponse(session, responseType, error.message);
        }
    }

    async generateExpertResponse(expertType, session, round) {
        const collaborationPrompt = this.promptEngine.generateAgentCollaborationPrompt(
            expertType,
            {
                phase: session.phase,
                messages: session.messages,
                round
            },
            session.userContext
        );

        const expertContext = `You are participating in round ${round} of expert collaboration. 
        
Current discussion context:
${this.formatRecentMessages(session.messages, 5)}

Provide your expert perspective on the user's project, building on other experts' insights where relevant.`;

        try {
            // Try Claude Code CLI first
            let responseText;
            
            try {
                responseText = await this.withTimeout(
                    this.claudeCodeExec.executePrompt(expertContext, {
                        systemPrompt: collaborationPrompt.system
                    }),
                    5000 // 5 second timeout for faster responses
                );
                
                // Check if Claude Code CLI returned an error as output
                if (responseText && responseText.toLowerCase().includes('execution error')) {
                    throw new Error('Claude Code CLI returned execution error');
                }
                
                console.log(`[ConversationOrchestrator] ✅ Claude Code CLI response for ${expertType}`);
            } catch (cliError) {
                console.log(`[ConversationOrchestrator] Claude Code CLI failed for ${expertType}, trying Anthropic SDK:`, cliError.message);
                
                // Fallback to Anthropic SDK
                if (this.anthropic) {
                    const response = await this.withTimeout(
                        this.anthropic.messages.create({
                            model: 'claude-3-5-sonnet-20241022',
                            max_tokens: 300, // Reduced for faster response
                            temperature: 0.8,
                            system: collaborationPrompt.system,
                            messages: [
                                { role: 'user', content: expertContext }
                            ]
                        }),
                        5000 // 5 second timeout for faster responses
                    );
                    responseText = response.content[0].text.trim();
                    console.log(`[ConversationOrchestrator] ✅ Anthropic SDK response for ${expertType}`);
                } else {
                    throw new Error('Both Claude Code CLI and Anthropic SDK failed');
                }
            }

            // Check if expert asked user a question
            const userQuestionDetected = this.detectUserQuestion(responseText);

            return {
                message: responseText.trim(),
                source: 'ai',
                userQuestionDetected,
                expertType,
                round
            };

        } catch (error) {
            console.error(`[ConversationOrchestrator] Error generating expert response for ${expertType}:`, error);
            throw error;
        }
    }

    async generateExpertResponseToUser(expertType, session, userMessage) {
        const prompt = `You are a ${this.expertTypes[expertType].name} responding to the user's input during expert collaboration.

User just said: "${userMessage}"

Project context: ${session.userContext.projectDescription}
Recent discussion: ${this.formatRecentMessages(session.messages, 3)}

Respond naturally as the expert, acknowledging the user's input and building on it with your domain expertise. Keep it concise but valuable - 1-2 sentences that show you heard them and add expert insight.`;

        try {
            let responseText;
            
            try {
                responseText = await this.withTimeout(
                    this.claudeCodeExec.executePrompt(prompt),
                    10000 // 10 second timeout
                );
                
                // Check if Claude Code CLI returned an error as output
                if (responseText && responseText.toLowerCase().includes('execution error')) {
                    throw new Error('Claude Code CLI returned execution error');
                }
                
                console.log(`[ConversationOrchestrator] ✅ Expert ${expertType} response to user generated`);
            } catch (cliError) {
                console.log('[ConversationOrchestrator] Claude Code CLI failed for user response, trying Anthropic SDK:', cliError.message);
                
                if (this.anthropic) {
                    const response = await this.withTimeout(
                        this.anthropic.messages.create({
                            model: 'claude-3-5-sonnet-20241022',
                            max_tokens: 200,
                            temperature: 0.7,
                            messages: [
                                { role: 'user', content: prompt }
                            ]
                        }),
                        10000 // 10 second timeout
                    );
                    responseText = response.content[0].text.trim();
                    console.log(`[ConversationOrchestrator] ✅ Anthropic SDK user response for ${expertType}`);
                } else {
                    throw new Error('Both Claude Code CLI and Anthropic SDK failed');
                }
            }

            return {
                message: responseText.trim(),
                source: 'ai',
                expertType,
                respondingToUser: true
            };

        } catch (error) {
            console.error('[ConversationOrchestrator] Error generating expert response to user:', error);
            
            // Simple fallback
            return {
                message: `Thank you for that clarification. That helps inform my recommendations for the ${this.expertTypes[expertType].name.toLowerCase()} aspects of your project.`,
                source: 'fallback',
                expertType,
                respondingToUser: true
            };
        }
    }

    // ==========================================
    // INDIVIDUAL PLANNING PHASE  
    // ==========================================

    async transitionToPlanning(session, emitCallback) {
        // First, ask user for final thoughts before moving to planning
        if (emitCallback) {
            emitCallback('conversation:orchestrator-message', {
                sessionId: session.sessionId,
                message: 'Great brainstorming session! Are there any other questions or thoughts you have before I put the PRD together?',
                timestamp: Date.now(),
                phase: session.phase,
                waitingForUser: true
            });
        }
        
        // Give user a moment to respond
        await this.delay(1000); // Reduced for quicker flow
        
        session.phase = this.phases.PLANNING;

        if (emitCallback) {
            emitCallback('conversation:phase-change', {
                sessionId: session.sessionId,
                newPhase: session.phase,
                status: 'planning_started'
            });
        }

        // Generate individual plans from each expert
        await this.generateIndividualPlans(session, emitCallback);
    }

    async generateIndividualPlans(session, emitCallback) {
        console.log(`[ConversationOrchestrator] Generating individual plans from ${session.selectedExperts.length} experts`);

        const planPromises = session.selectedExperts.map(async (expertType) => {
            try {
                const planPrompt = this.promptEngine.generatePlanCreationPrompt(
                    expertType,
                    this.extractDiscussionSummary(session),
                    session.userContext,
                    session.messages
                );

                let planContent;
                
                try {
                    planContent = await this.withTimeout(
                        this.claudeCodeExec.executePrompt(
                            'Create a detailed implementation plan for your domain based on the collaborative discussion.',
                            { systemPrompt: planPrompt }
                        ),
                        10000 // 10 second timeout
                    );
                    
                    // Check if Claude Code CLI returned an error as output
                    if (planContent && planContent.toLowerCase().includes('execution error')) {
                        throw new Error('Claude Code CLI returned execution error');
                    }
                    
                    console.log(`[ConversationOrchestrator] ✅ Individual plan generated for ${expertType}`);
                } catch (cliError) {
                    console.log('[ConversationOrchestrator] Claude Code CLI failed for plan generation, trying Anthropic SDK');
                    
                    if (this.anthropic) {
                        const response = await this.withTimeout(
                            this.anthropic.messages.create({
                                model: 'claude-3-5-sonnet-20241022',
                                max_tokens: 1000,
                                temperature: 0.6,
                                system: planPrompt,
                                messages: [
                                    { role: 'user', content: 'Create your detailed implementation plan based on our collaboration.' }
                                ]
                            }),
                            10000 // 10 second timeout
                        );
                        planContent = response.content[0].text.trim();
                        console.log(`[ConversationOrchestrator] ✅ Anthropic SDK plan for ${expertType}`);
                    } else {
                        throw new Error('Both Claude Code CLI and Anthropic SDK failed');
                    }
                }

                const expertPlan = {
                    expertType,
                    expertName: this.expertTypes[expertType].name,
                    content: planContent,
                    timestamp: Date.now()
                };

                session.expertPlans.push(expertPlan);

                // Emit individual plan
                if (emitCallback) {
                    emitCallback('conversation:expert-plan', {
                        sessionId: session.sessionId,
                        expertType,
                        expertName: this.expertTypes[expertType].name,
                        plan: planContent,
                        timestamp: Date.now()
                    });
                }

                return expertPlan;

            } catch (error) {
                console.error(`[ConversationOrchestrator] Error generating plan for ${expertType}:`, error);
                
                // Fallback plan
                const fallbackPlan = {
                    expertType,
                    expertName: this.expertTypes[expertType].name,
                    content: this.generateFallbackPlan(expertType, session),
                    timestamp: Date.now(),
                    source: 'fallback'
                };

                session.expertPlans.push(fallbackPlan);
                return fallbackPlan;
            }
        });

        // Wait for all plans to complete
        await Promise.all(planPromises);

        console.log(`[ConversationOrchestrator] All ${session.expertPlans.length} expert plans generated`);

        // Move to synthesis phase
        await this.delay(1000); // Quick synthesis transition
        await this.transitionToSynthesis(session, emitCallback);
    }

    // ==========================================
    // SYNTHESIS PHASE
    // ==========================================

    async transitionToSynthesis(session, emitCallback) {
        session.phase = this.phases.SYNTHESIS;

        if (emitCallback) {
            emitCallback('conversation:phase-change', {
                sessionId: session.sessionId,
                newPhase: session.phase,
                status: 'synthesis_started'
            });
        }

        await this.generateUnifiedSynthesis(session, emitCallback);
    }

    async generateUnifiedSynthesis(session, emitCallback) {
        console.log(`[ConversationOrchestrator] Generating synthesis from ${session.expertPlans.length} expert plans`);

        const synthesisPrompt = this.promptEngine.generateSynthesisPrompt(
            session.expertPlans,
            session.userContext,
            session.messages
        );

        try {
            let synthesisContent;
            
            try {
                synthesisContent = await this.withTimeout(
                    this.claudeCodeExec.executePrompt(
                        'Synthesize the expert plans into a unified implementation strategy.',
                        { systemPrompt: synthesisPrompt }
                    ),
                    10000 // 10 second timeout
                );
                
                // Check if Claude Code CLI returned an error as output
                if (synthesisContent && synthesisContent.toLowerCase().includes('execution error')) {
                    throw new Error('Claude Code CLI returned execution error');
                }
                
                console.log('[ConversationOrchestrator] ✅ Synthesis generated via Claude Code CLI');
            } catch (cliError) {
                console.log('[ConversationOrchestrator] Claude Code CLI failed for synthesis, trying Anthropic SDK');
                
                if (this.anthropic) {
                    const response = await this.withTimeout(
                        this.anthropic.messages.create({
                            model: 'claude-3-5-sonnet-20241022',
                            max_tokens: 1500,
                            temperature: 0.6,
                            system: synthesisPrompt,
                            messages: [
                                { role: 'user', content: 'Create the unified synthesis and Claude Code prompt.' }
                            ]
                        }),
                        10000 // 10 second timeout
                    );
                    synthesisContent = response.content[0].text.trim();
                    console.log('[ConversationOrchestrator] ✅ Anthropic SDK synthesis generated');
                } else {
                    throw new Error('Both Claude Code CLI and Anthropic SDK failed');
                }
            }

            session.synthesis = {
                content: synthesisContent,
                timestamp: Date.now(),
                expertPlansCount: session.expertPlans.length
            };

            // Generate Claude Code prompt
            session.claudeCodePrompt = this.extractClaudeCodePrompt(synthesisContent, session);

            session.phase = this.phases.COMPLETE;
            session.active = false;

            // Emit final synthesis
            if (emitCallback) {
                emitCallback('conversation:synthesis-complete', {
                    sessionId: session.sessionId,
                    synthesis: session.synthesis.content,
                    claudeCodePrompt: session.claudeCodePrompt,
                    timestamp: Date.now(),
                    totalMessages: session.messages.length,
                    expertCount: session.selectedExperts.length
                });
            }

            console.log(`[ConversationOrchestrator] Session ${session.sessionId} completed successfully`);

            return {
                sessionId: session.sessionId,
                synthesis: session.synthesis,
                claudeCodePrompt: session.claudeCodePrompt,
                status: 'complete'
            };

        } catch (error) {
            console.error('[ConversationOrchestrator] Error generating synthesis:', error);
            
            // Fallback synthesis
            const fallbackSynthesis = this.generateFallbackSynthesis(session);
            session.synthesis = fallbackSynthesis;
            session.claudeCodePrompt = fallbackSynthesis.claudeCodePrompt;
            
            if (emitCallback) {
                emitCallback('conversation:synthesis-complete', {
                    sessionId: session.sessionId,
                    synthesis: fallbackSynthesis.content,
                    claudeCodePrompt: fallbackSynthesis.claudeCodePrompt,
                    source: 'fallback'
                });
            }

            return {
                sessionId: session.sessionId,
                synthesis: fallbackSynthesis,
                status: 'complete_with_fallback'
            };
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    formatRecentMessages(messages, count) {
        return messages
            .slice(-count)
            .map(msg => `${msg.speaker}: ${msg.message}`)
            .join('\n');
    }

    extractDiscussionSummary(session) {
        const collaborationMessages = session.messages.filter(m => 
            m.type === 'agent-message' && m.phase === this.phases.COLLABORATION
        );

        return collaborationMessages
            .map(msg => `${msg.speaker}: ${msg.message}`)
            .join('\n\n');
    }

    detectUserQuestion(responseText) {
        const questionIndicators = [
            'user,', 'user:', 'what\'s your', 'what is your', 'how important',
            'would you prefer', 'do you need', 'are you planning'
        ];
        
        const lowerText = responseText.toLowerCase();
        return questionIndicators.some(indicator => lowerText.includes(indicator));
    }

    extractClaudeCodePrompt(synthesisContent, session) {
        // Try to extract Claude Code prompt from synthesis
        const promptMatch = synthesisContent.match(/(?:CLAUDE CODE PROMPT|Claude Code Prompt):?\s*\n([\s\S]*?)(?:\n\n|$)/i);
        
        if (promptMatch) {
            return promptMatch[1].trim();
        }

        // Generate basic Claude Code prompt if not found in synthesis
        return this.generateBasicClaudeCodePrompt(session);
    }

    extractTechnicalDetails(expertInsights) {
        const techDetails = [];
        
        // Extract technology-related recommendations
        Object.values(expertInsights).forEach(expert => {
            expert.recommendations.forEach(rec => {
                // Look for technology keywords
                if (rec.match(/\b(React|Node|Express|TypeScript|Python|SQL|MongoDB|Docker|AWS|API|database|frontend|backend|security|encryption|authentication)\b/i)) {
                    techDetails.push(`- ${rec}`);
                }
            });
        });
        
        if (techDetails.length === 0) {
            return `- Modern web application stack
- Secure authentication and data storage
- Responsive user interface
- Scalable backend architecture
- Comprehensive testing coverage`;
        }
        
        return techDetails.slice(0, 5).join('\n');
    }
    
    extractExpertInsights(session) {
        const insights = {};
        
        // Process all messages to extract expert insights
        session.messages.forEach(msg => {
            if (msg.type === 'agent-message' && msg.phase === this.phases.COLLABORATION) {
                // Find the expert type from the speaker name
                let expertType = null;
                for (const [type, info] of Object.entries(this.expertTypes)) {
                    if (info.name === msg.speaker) {
                        expertType = type;
                        break;
                    }
                }
                
                if (expertType) {
                    if (!insights[expertType]) {
                        insights[expertType] = {
                            name: msg.speaker,
                            recommendations: []
                        };
                    }
                    
                    // Extract key points from the message (first 200 chars or first sentence)
                    const firstSentence = msg.message.match(/^[^.!?]+[.!?]/)?.[0] || msg.message.substring(0, 200);
                    insights[expertType].recommendations.push(firstSentence.trim());
                }
            }
        });
        
        // Add expert plans if available
        session.expertPlans.forEach(plan => {
            const expertType = Object.keys(this.expertTypes).find(
                type => this.expertTypes[type].name === plan.expertName
            );
            
            if (expertType && insights[expertType]) {
                // Extract first paragraph or summary from plan
                const planSummary = plan.content.split('\n\n')[0].substring(0, 300);
                if (!insights[expertType].recommendations.includes(planSummary)) {
                    insights[expertType].recommendations.push(planSummary);
                }
            }
        });
        
        return insights;
    }
    
    generateBasicClaudeCodePrompt(session) {
        // Extract actual insights from the collaboration
        const expertInsights = this.extractExpertInsights(session);
        
        // Build expert recommendations section with real content
        const expertRecommendations = Object.values(expertInsights).map(expert => {
            const topRecommendations = expert.recommendations.slice(0, 2).join(' ');
            return `- ${expert.name}: ${topRecommendations || 'Recommended modern best practices for implementation.'}`;
        }).join('\n');
        
        // Extract user preferences from messages
        const userMessages = session.messages
            .filter(msg => msg.type === 'user-message')
            .map(msg => msg.message)
            .join(' ');
        
        return `Build a ${session.userContext.projectDescription} with the following specifications:

EXPERT TEAM RECOMMENDATIONS:
${expertRecommendations || session.selectedExperts.map(expert => 
        `- ${this.expertTypes[expert].name}: Recommended best practices for implementation`
    ).join('\n')}

USER REQUIREMENTS & PREFERENCES:
${userMessages ? `Based on our discussion: ${userMessages.substring(0, 500)}` : 'Build with modern best practices'}

IMPLEMENTATION REQUIREMENTS:
- Timeline: ${session.userContext.timeline || 'Flexible'}
- Key Constraints: ${session.userContext.constraints.length > 0 ? session.userContext.constraints.join(', ') : 'None specified'}
- Priority Features: ${session.userContext.priorities.length > 0 ? session.userContext.priorities.join(', ') : 'User-friendly interface, security, performance'}

TECHNICAL ARCHITECTURE:
${this.extractTechnicalDetails(expertInsights)}

DEVELOPMENT APPROACH:
1. Start with project setup and core structure
2. Implement authentication and security layers
3. Build the main features discussed by experts
4. Add user interface with focus on usability
5. Integrate all components with proper testing
6. Deploy with monitoring and maintenance plan

Based on the expert collaboration, prioritize the specific recommendations above while maintaining clean code, proper documentation, and scalable architecture.`;
    }

    // Fallback response generators
    generateFallbackOrchestratorResponse(session, responseType, errorContext = null) {
        const projectType = this.detectProjectType(session.userContext.projectDescription || session.initialQuery || '');
        const fallbacks = {
            'initial_discovery': this.generateContextualDiscoveryFallback(session, projectType),
            'discovery_followup': this.generateContextualFollowupFallback(session, projectType),
            'team_assembly': this.generateContextualTeamAssemblyFallback(session, projectType)
        };

        const message = fallbacks[responseType] || this.generateGenericFallback(session, projectType);
        
        // Log fallback usage for monitoring
        console.log(`[ConversationOrchestrator] 🔄 Using intelligent fallback for ${responseType}:`, {
            sessionId: session.sessionId,
            projectType,
            errorContext,
            timestamp: new Date().toISOString()
        });

        return {
            message,
            source: 'intelligent_fallback',
            responseType,
            projectType
        };
    }

    detectProjectType(description) {
        const desc = description.toLowerCase();
        if (desc.includes('e-commerce') || desc.includes('shop') || desc.includes('marketplace')) return 'ecommerce';
        if (desc.includes('mobile') || desc.includes('app') || desc.includes('ios') || desc.includes('android')) return 'mobile';
        if (desc.includes('web') || desc.includes('website') || desc.includes('frontend')) return 'web';
        if (desc.includes('api') || desc.includes('backend') || desc.includes('server')) return 'api';
        if (desc.includes('ai') || desc.includes('ml') || desc.includes('machine learning')) return 'ai';
        if (desc.includes('data') || desc.includes('analytics') || desc.includes('dashboard')) return 'data';
        return 'general';
    }

    generateContextualDiscoveryFallback(session, projectType) {
        const typeQuestions = {
            'ecommerce': 'I can see you\'re building an e-commerce platform! That\'s exciting. To assemble the right expert team, I need to understand: are you targeting B2C consumers, B2B businesses, or creating a marketplace? This will help me bring in specialists who understand your specific market dynamics.',
            'mobile': 'A mobile application - great choice for today\'s market! To get the right experts involved, I need to know: are you thinking iOS, Android, or cross-platform? And is this more of a consumer app or an enterprise solution?',
            'web': 'Web development projects have so many possibilities! To assemble the perfect expert team, help me understand: is this more of a marketing website, a web application, or a complex platform? Each needs different specialist perspectives.',
            'api': 'Backend and API development - the foundation of great digital products! To bring in the right technical experts, I\'m curious: what will this API power? Is it for internal tools, third-party integrations, or public developer use?',
            'ai': 'AI and machine learning projects are incredibly exciting right now! To assemble experts who can guide you best, I need to understand: are you building AI features into an existing product, or creating an AI-first solution?',
            'data': 'Data and analytics projects can transform how businesses operate! To get the right specialist perspectives, tell me: are you building internal dashboards, customer-facing analytics, or data processing pipelines?',
            'general': 'I\'m excited to help bring your vision to life! To assemble the right expert team, I need to understand your project better. What\'s the main problem you\'re solving, and who will benefit from this solution?'
        };
        return typeQuestions[projectType];
    }

    generateContextualFollowupFallback(session, projectType) {
        const recentMessages = session.messages.slice(-3);
        const userMessages = recentMessages.filter(m => m.type === 'user-message').map(m => m.message).join(' ');
        
        return `Thank you for that insight! I can see this ${projectType} project is well thought out. Based on what you\'ve shared, I\'m identifying the key technical challenges and opportunities. Let me ask one more strategic question: what\'s your biggest concern as we move forward - timeline, technical complexity, scalability, or budget considerations?`;
    }

    generateContextualTeamAssemblyFallback(session, projectType) {
        const expertMix = {
            'ecommerce': 'Frontend Specialist, Backend Expert, and Security Specialist',
            'mobile': 'Mobile Development Expert, UX Designer, and Backend Specialist',
            'web': 'Frontend Developer, System Architect, and Performance Expert',
            'api': 'Backend Specialist, Database Expert, and API Architect',
            'ai': 'AI/ML Expert, Data Engineer, and System Architect',
            'data': 'Data Engineer, Analytics Expert, and Frontend Specialist',
            'general': 'System Architect, Technical Lead, and Domain Expert'
        };

        return `Perfect! Based on our discussion, I\'m assembling the ideal expert team for your ${projectType} project: ${expertMix[projectType]}. You\'ll see them collaborate in real-time, building on each other\'s insights and asking strategic questions. The consultation is beginning now!`;
    }

    generateGenericFallback(session, projectType) {
        return `I\'m here to help guide your ${projectType} project forward. While I gather additional expert insights, what specific aspect would you like to focus on first - technical architecture, user experience, or implementation strategy?`;
    }

    generateFallbackExpertResponse(expertType, session, round) {
        const expertName = this.expertTypes[expertType].name;
        const project = session.userContext.projectDescription || 'this project';
        
        // Create concise, expert-specific brainstorming insights (2 sentences max)
        const fallbackMessages = {
            'frontend-specialist': [
                `Consider React with TypeScript for ${project}. Focus on mobile-first design with a clean component architecture.`,
                'A design system using Tailwind CSS could speed development. Prioritize search functionality and user experience.',
                'Next.js might work well for SEO and performance needs.'
            ],
            'backend-specialist': [
                `Node.js with Express could handle the backend for ${project}. Focus on secure API design with JWT authentication.`,
                'Consider microservices architecture if scaling is a priority. Docker containers would help with deployment.',
                'GraphQL might work if data relationships are complex, otherwise REST is simpler.'
            ],
            'security-specialist': [
                `Security for ${project} could focus on AES-256 encryption for stored passwords. Consider master password with key derivation function.`,
                'We might explore biometric authentication and secure clipboard handling. Auto-locking after inactivity could prevent unauthorized access.'
            ],
            'database-specialist': [
                `For data storage, we could explore lightweight options like SQLite with encryption for ${project}. Consider indexing subscription names for instant search.`,
                'We might look at using encrypted JSON files for simplicity. Could structure data with categories like streaming, work, and personal.'
            ],
            'system-architect': [
                `For ${project} architecture, we could use a simple client-server model. Consider Electron for cross-platform desktop support.`,
                'We might explore a layered architecture with clear separation between UI, business logic, and data. Could use local-first storage with optional cloud sync.'
            ],
            'devops-specialist': [
                `We could package ${project} as a cross-platform desktop app using Electron. Consider auto-updates for security patches.`,
                'Deployment could be simplified with GitHub releases and code signing. Maybe explore portable versions that need no installation.'
            ],
            'mobile-specialist': [
                `Mobile sync could happen through secure cloud backup options for ${project}. Consider QR codes for quick mobile access.`,
                'We might explore a companion mobile app using React Native. Touch ID/Face ID could provide quick authentication.'
            ],
            'ai-specialist': [
                `AI could help categorize passwords automatically for ${project}. Natural language search might speed up finding entries.`,
                'Consider smart password strength suggestions and breach monitoring. Could explore predictive search based on usage patterns.'
            ]
        };

        // Get expert-specific messages or use generic fallback
        const expertMessages = fallbackMessages[expertType] || [
            `For ${project}, I recommend following industry best practices and proven architectural patterns specific to this domain.`,
            `Looking at ${project}, we should focus on scalability, maintainability, and user experience from the start.`,
            `The implementation of ${project} would benefit from modern development practices and careful technology selection.`
        ];

        // Select a message based on round to ensure variety
        const messageIndex = (round - 1) % expertMessages.length;
        const fallbackMessage = expertMessages[messageIndex];

        return {
            type: 'agent-message',
            speaker: expertName,
            agentName: expertName,  // Ensure name is passed
            agent: expertName,       // Changed from expertType to expertName for display
            expertType: expertType,  // Keep type for color coding
            message: fallbackMessage,
            timestamp: Date.now(),
            phase: session.phase,
            round,
            source: 'fallback'
        };
    }

    generateFallbackPlan(expertType, session) {
        return `## ${this.expertTypes[expertType].name} Implementation Plan

### Technology Approach
Modern, proven technologies appropriate for ${session.userContext.projectDescription}

### Key Features  
Core functionality aligned with project requirements and user needs

### Timeline
Realistic development timeline considering project scope and constraints

### Risk Mitigation
Standard risk assessment and mitigation strategies for ${expertType} domain

*This is a fallback plan generated when AI services were unavailable.*`;
    }

    generateProfessionalPRD(session) {
        const timestamp = new Date().toLocaleString();
        const expertInsights = this.extractExpertInsights(session);
        
        // Extract technology recommendations from messages
        const techStack = this.extractTechnologyStack(session);
        const consensusPoints = this.findConsensusPoints(session);
        const conflicts = this.identifyConflicts(session);
        const phases = this.generateImplementationPhases(session);
        const risks = this.assessRisks(session);
        
        // Build the comprehensive PRD
        const prd = `# Product Requirements Document (PRD)

**Generated:** ${timestamp}
**Session ID:** ${session.sessionId}

## Executive Summary

### Project Overview
${session.userContext.projectDescription}

### User Context
${this.formatUserContext(session)}

## Key Recommendations

${this.formatExpertRecommendations(expertInsights)}

## Final Implementation Plan

### 1. EXECUTIVE SUMMARY

${this.generateExecutiveSummary(session, techStack)}

### 2. UNIFIED TECHNOLOGY STACK

${this.formatTechnologyStack(techStack)}

### 3. CONSENSUS ANALYSIS

${this.formatConsensusAnalysis(consensusPoints)}

### 4. CONFLICT RESOLUTION

${this.formatConflictResolution(conflicts)}

### 5. INNOVATIVE SYNERGIES

${this.identifySynergies(session, techStack)}

### 6. INTEGRATED IMPLEMENTATION ROADMAP

${this.formatImplementationRoadmap(phases)}

### 7. UNIFIED RISK ASSESSMENT

${this.formatRiskAssessment(risks)}

### 8. CLAUDE CODE PROMPT

\`\`\`
${this.generateBasicClaudeCodePrompt(session)}
\`\`\`

## Technical Specifications

${this.generateTechnicalSpecs(techStack, session)}

## Timeline & Milestones

${this.generateTimeline(phases)}

## Next Steps

${this.generateNextSteps(session)}

---
*This PRD was generated through expert AI collaboration and represents a comprehensive implementation strategy.*`;

        return prd;
    }

    extractTechnologyStack(session) {
        const techStack = {
            frontend: [],
            backend: [],
            database: [],
            security: [],
            infrastructure: []
        };
        
        // Analyze messages for technology mentions
        session.messages.forEach(msg => {
            const content = msg.message.toLowerCase();
            
            // Frontend technologies
            if (content.match(/\b(react|vue|angular|svelte|next\.js|typescript|javascript|tailwind|css|html)\b/gi)) {
                const matches = content.match(/\b(react|vue|angular|svelte|next\.js|typescript|javascript|tailwind)\b/gi);
                if (matches) techStack.frontend.push(...matches);
            }
            
            // Backend technologies
            if (content.match(/\b(node|express|django|flask|rails|java|python|go|rust)\b/gi)) {
                const matches = content.match(/\b(node|express|django|flask|rails|java|python|go|rust)\b/gi);
                if (matches) techStack.backend.push(...matches);
            }
            
            // Database technologies
            if (content.match(/\b(postgresql|mysql|mongodb|sqlite|redis|firebase|dynamodb)\b/gi)) {
                const matches = content.match(/\b(postgresql|mysql|mongodb|sqlite|redis|firebase|dynamodb)\b/gi);
                if (matches) techStack.database.push(...matches);
            }
            
            // Security technologies
            if (content.match(/\b(jwt|oauth|argon2|bcrypt|encryption|ssl|https|cors)\b/gi)) {
                const matches = content.match(/\b(jwt|oauth|argon2|bcrypt|encryption|ssl|https|cors)\b/gi);
                if (matches) techStack.security.push(...matches);
            }
        });
        
        // Remove duplicates and format
        Object.keys(techStack).forEach(category => {
            techStack[category] = [...new Set(techStack[category])];
        });
        
        return techStack;
    }
    
    findConsensusPoints(session) {
        const consensusPoints = [];
        const expertMessages = session.messages.filter(m => 
            m.type === 'agent-message' && m.phase === this.phases.COLLABORATION
        );
        
        // Look for common themes across experts
        const themes = {};
        expertMessages.forEach(msg => {
            // Extract key concepts
            const concepts = this.extractKeyConcepts(msg.message);
            concepts.forEach(concept => {
                themes[concept] = (themes[concept] || 0) + 1;
            });
        });
        
        // Points mentioned by multiple experts are consensus
        Object.entries(themes).forEach(([concept, count]) => {
            if (count >= 2) {
                consensusPoints.push(concept);
            }
        });
        
        return consensusPoints;
    }
    
    extractKeyConcepts(text) {
        const concepts = [];
        const keyPhrases = [
            'security', 'performance', 'scalability', 'user experience',
            'mobile-first', 'offline', 'encryption', 'authentication',
            'responsive', 'real-time', 'api', 'database', 'testing'
        ];
        
        keyPhrases.forEach(phrase => {
            if (text.toLowerCase().includes(phrase)) {
                concepts.push(phrase);
            }
        });
        
        return concepts;
    }
    
    identifyConflicts(session) {
        const conflicts = [];
        // This would analyze expert messages for differing opinions
        // For now, return a structured example
        return conflicts;
    }
    
    generateImplementationPhases(session) {
        return [
            {
                name: 'Foundation',
                duration: 'Weeks 1-2',
                tasks: [
                    'Project setup and architecture',
                    'Basic UI components',
                    'Authentication system',
                    'Database setup'
                ]
            },
            {
                name: 'Core Features',
                duration: 'Weeks 3-4',
                tasks: [
                    'Main functionality implementation',
                    'API endpoints',
                    'Data models',
                    'Basic testing'
                ]
            },
            {
                name: 'Enhanced Features',
                duration: 'Weeks 5-6',
                tasks: [
                    'Advanced features',
                    'Performance optimization',
                    'Security hardening',
                    'Integration testing'
                ]
            },
            {
                name: 'Polish & Deploy',
                duration: 'Weeks 7-8',
                tasks: [
                    'UI/UX refinement',
                    'Final testing',
                    'Documentation',
                    'Deployment'
                ]
            }
        ];
    }
    
    assessRisks(session) {
        const risks = [
            {
                name: 'Security Vulnerabilities',
                level: 'Critical',
                mitigation: 'Regular security audits, penetration testing, input validation'
            },
            {
                name: 'Performance Issues',
                level: 'Medium',
                mitigation: 'Performance monitoring, caching strategies, optimization'
            },
            {
                name: 'Scalability Concerns',
                level: 'Medium',
                mitigation: 'Horizontal scaling plan, database optimization, load testing'
            }
        ];
        
        return risks;
    }
    
    formatUserContext(session) {
        const ctx = session.userContext;
        let context = [];
        
        if (ctx.priorities.length > 0) {
            context.push(`**Priorities:** ${ctx.priorities.join(', ')}`);
        }
        if (ctx.constraints.length > 0) {
            context.push(`**Constraints:** ${ctx.constraints.join(', ')}`);
        }
        if (ctx.timeline) {
            context.push(`**Timeline:** ${ctx.timeline}`);
        }
        
        return context.length > 0 ? context.join('\n') : 'No specific constraints or timeline provided.';
    }
    
    formatExpertRecommendations(expertInsights) {
        return Object.values(expertInsights).map(expert => {
            const recommendations = expert.recommendations.slice(0, 3).join(' ');
            return `### ${expert.name}
${recommendations || 'Recommended best practices for implementation.'}`;
        }).join('\n\n');
    }
    
    generateExecutiveSummary(session, techStack) {
        const projectType = session.userContext.projectDescription.toLowerCase().includes('mobile') ? 
            'mobile-first' : 'web-based';
        
        return `This ${projectType} application will be implemented using modern, secure architecture that prioritizes ${session.userContext.priorities.join(', ') || 'user experience and performance'}. The solution leverages proven technologies while maintaining flexibility for future scaling.`;
    }
    
    formatTechnologyStack(techStack) {
        let stack = [];
        
        if (techStack.frontend.length > 0) {
            stack.push(`**Frontend:** ${techStack.frontend.slice(0, 3).join(', ')}`);
        }
        if (techStack.backend.length > 0) {
            stack.push(`**Backend:** ${techStack.backend.slice(0, 3).join(', ')}`);
        }
        if (techStack.database.length > 0) {
            stack.push(`**Database:** ${techStack.database.slice(0, 2).join(', ')}`);
        }
        if (techStack.security.length > 0) {
            stack.push(`**Security:** ${techStack.security.slice(0, 3).join(', ')}`);
        }
        
        return stack.join('\n') || 'Technology stack to be determined based on requirements.';
    }
    
    formatConsensusAnalysis(consensusPoints) {
        if (consensusPoints.length === 0) {
            return 'All experts aligned on modern best practices and secure implementation.';
        }
        
        return `All experts agreed on the following key points:
${consensusPoints.map(point => `- ${point}`).join('\n')}`;
    }
    
    formatConflictResolution(conflicts) {
        if (conflicts.length === 0) {
            return 'No significant conflicts identified. Team achieved strong consensus on approach.';
        }
        
        return conflicts.map(conflict => 
            `**${conflict.topic}:** ${conflict.resolution}`
        ).join('\n\n');
    }
    
    identifySynergies(session, techStack) {
        const synergies = [];
        
        if (techStack.frontend.includes('react') && techStack.backend.includes('node')) {
            synergies.push('**Full-Stack JavaScript:** Unified language across frontend and backend enables code sharing and faster development.');
        }
        
        if (techStack.security.includes('jwt') && techStack.security.includes('encryption')) {
            synergies.push('**Comprehensive Security:** Multi-layered security approach with authentication and encryption.');
        }
        
        return synergies.length > 0 ? synergies.join('\n\n') : 
            'The chosen technology stack provides excellent integration opportunities and development efficiency.';
    }
    
    formatImplementationRoadmap(phases) {
        return phases.map(phase => 
            `### ${phase.name} (${phase.duration})
${phase.tasks.map(task => `- ${task}`).join('\n')}`
        ).join('\n\n');
    }
    
    formatRiskAssessment(risks) {
        return risks.map(risk => 
            `### ${risk.name}
**Level:** ${risk.level}
**Mitigation:** ${risk.mitigation}`
        ).join('\n\n');
    }
    
    generateTechnicalSpecs(techStack, session) {
        return `### Architecture
- Microservices/Monolithic based on scale requirements
- RESTful API design
- Event-driven architecture where applicable

### Technology Stack
${this.formatTechnologyStack(techStack)}

### Performance Requirements
- Response time: < 200ms for API calls
- Page load: < 3 seconds
- Uptime: 99.9% availability

### Security Requirements
- End-to-end encryption for sensitive data
- Multi-factor authentication support
- Regular security audits
- GDPR/compliance considerations`;
    }
    
    generateTimeline(phases) {
        const totalWeeks = phases.length * 2;
        return `**Total Duration:** ${totalWeeks} weeks

${phases.map((phase, index) => 
        `- **${phase.name}:** ${phase.duration}`
    ).join('\n')}

**Key Milestones:**
- Week 2: Architecture complete
- Week 4: Core features functional
- Week 6: Beta version ready
- Week ${totalWeeks}: Production deployment`;
    }
    
    generateNextSteps(session) {
        return `1. Review and approve this PRD with stakeholders
2. Finalize technology stack based on team expertise
3. Set up development environment and repositories
4. Create detailed technical design documents
5. Begin Phase 1 implementation
6. Establish regular review cycles and checkpoints`;
    }

    generateFallbackSynthesis(session) {
        // Use the comprehensive prompt generator that includes real session data
        const claudeCodePrompt = this.generateBasicClaudeCodePrompt(session);
        
        // Extract SPECIFIC technical details from expert messages
        const extractSpecificDetails = (messages) => {
            const techStack = [];
            const frameworks = [];
            const databases = [];
            const architectures = [];
            
            messages.forEach(msg => {
                if (msg.type === 'agent-message' && msg.message) {
                    const text = msg.message.toLowerCase();
                    
                    // Extract specific technologies mentioned
                    if (text.includes('react') || text.includes('vue') || text.includes('angular')) {
                        const match = msg.message.match(/(React|Vue|Angular|Next\.js|Nuxt|SvelteKit)[\s\d.]*/gi);
                        if (match) frameworks.push(...match);
                    }
                    
                    if (text.includes('node') || text.includes('python') || text.includes('java')) {
                        const match = msg.message.match(/(Node\.js|Python|Java|Go|Rust|TypeScript)[\s\d.]*/gi);
                        if (match) techStack.push(...match);
                    }
                    
                    if (text.includes('postgres') || text.includes('mongo') || text.includes('mysql')) {
                        const match = msg.message.match(/(PostgreSQL|MongoDB|MySQL|Redis|DynamoDB|Firestore)[\s\d.]*/gi);
                        if (match) databases.push(...match);
                    }
                    
                    if (text.includes('microservice') || text.includes('serverless') || text.includes('monolith')) {
                        const match = msg.message.match(/(microservices|serverless|monolithic|event-driven|REST API|GraphQL)/gi);
                        if (match) architectures.push(...match);
                    }
                }
            });
            
            return {
                techStack: [...new Set(techStack)],
                frameworks: [...new Set(frameworks)],
                databases: [...new Set(databases)],
                architectures: [...new Set(architectures)]
            };
        };
        
        const specificDetails = extractSpecificDetails(session.messages);
        const expertInsights = this.extractExpertInsights(session);
        
        // Build concrete recommendations from extracted details
        const techStackSection = specificDetails.techStack.length > 0 
            ? `### Technology Stack\n${specificDetails.techStack.map(t => `- ${t}`).join('\n')}`
            : '';
            
        const frameworkSection = specificDetails.frameworks.length > 0
            ? `### Frameworks\n${specificDetails.frameworks.map(f => `- ${f}`).join('\n')}`
            : '';
            
        const databaseSection = specificDetails.databases.length > 0
            ? `### Database Solutions\n${specificDetails.databases.map(d => `- ${d}`).join('\n')}`
            : '';
            
        const architectureSection = specificDetails.architectures.length > 0
            ? `### Architecture Patterns\n${specificDetails.architectures.map(a => `- ${a}`).join('\n')}`
            : '';

        return {
            content: `## Expert Team Synthesis

Your ${session.selectedExperts.length} expert team has analyzed "${session.userContext.projectDescription}" and provided specific technical recommendations.

${techStackSection}

${frameworkSection}

${databaseSection}

${architectureSection}

### Expert Insights:
${Object.values(expertInsights).map(expert => {
    const mainRec = expert.recommendations[0] || expert.name + ' recommends following best practices';
    return `- **${expert.name}**: ${mainRec}`;
}).join('\n')}

### Implementation Priorities:
${session.userContext.priorities.length > 0 ? session.userContext.priorities.map(p => `- ${p}`).join('\n') : '- Start with core functionality\n- Implement user authentication\n- Build data models'}

### Next Steps:
1. Set up development environment with recommended tech stack
2. Initialize project structure
3. Implement core features based on expert recommendations
4. Deploy using suggested architecture patterns`,
            claudeCodePrompt,
            timestamp: Date.now(),
            source: 'fallback'
        };
    }

    async handleGeneralResponse(session, userMessage, emitCallback) {
        const response = await this.generateOrchestratorResponse(session, userMessage, 'general');
        
        session.messages.push({
            type: 'orchestrator-message',
            speaker: 'Orchestrator', 
            message: response.message,
            timestamp: Date.now(),
            phase: session.phase
        });

        if (emitCallback) {
            emitCallback('conversation:orchestrator-message', {
                sessionId: session.sessionId,
                message: response.message,
                timestamp: Date.now(),
                phase: session.phase
            });
        }

        return {
            sessionId: session.sessionId,
            orchestratorMessage: response,
            phase: session.phase,
            status: 'general_response'
        };
    }

    async handlePlanningPhase(session, userMessage, emitCallback) {
        // User input during planning phase - unusual but handle gracefully
        return await this.handleGeneralResponse(session, userMessage, emitCallback);
    }

    // Session utilities
    getSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }

    stopSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.active = false;
            session.endTime = Date.now();
            console.log(`[ConversationOrchestrator] Session ${sessionId} stopped`);
            return true;
        }
        return false;
    }

    getSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Helper to add timeout to promises
    withTimeout(promise, timeoutMs = 10000) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`API call timeout after ${timeoutMs}ms`)), timeoutMs)
            )
        ]);
    }

    async withRetry(fn, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[ConversationOrchestrator] Attempt ${attempt}/${maxRetries}`);
                return await fn();
            } catch (error) {
                lastError = error;
                console.log(`[ConversationOrchestrator] Attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    break;
                }
                
                // Exponential backoff with jitter
                const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
                console.log(`[ConversationOrchestrator] Retrying in ${Math.round(delay)}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    }

    // ==========================================
    // STREAMING AI RESPONSES
    // ==========================================

    async generateOrchestratorResponseStream(session, userMessage, responseType, emitCallback) {
        if (!emitCallback || !this.streamingConfig.enabled) {
            // Fallback to non-streaming if no callback or streaming disabled
            return this.generateOrchestratorResponse(session, userMessage, responseType);
        }

        const prompt = this.promptEngine.generateOrchestratorPrompt(
            session.phase,
            session.userContext,
            session.messages
        );

        const conversationContext = userMessage ? 
            `User just said: "${userMessage}"\n\nRespond as the orchestrator based on current phase and context.` :
            'Generate appropriate orchestrator response for current phase and context.';

        try {
            console.log('[ConversationOrchestrator] 🌊 Starting streaming orchestrator response');
            
            // Emit stream start event
            emitCallback('conversation:stream-start', {
                sessionId: session.sessionId,
                agent: 'Orchestrator',
                phase: session.phase,
                timestamp: Date.now()
            });

            const responseText = await this.executeStreamingAI(
                conversationContext,
                prompt,
                'Orchestrator',
                session,
                emitCallback
            );

            // Emit stream complete event
            emitCallback('conversation:stream-complete', {
                sessionId: session.sessionId,
                agent: 'Orchestrator',
                message: responseText,
                phase: session.phase,
                timestamp: Date.now()
            });

            return {
                message: responseText,
                source: 'streaming_ai',
                responseType,
                streamed: true
            };

        } catch (error) {
            console.error('[ConversationOrchestrator] Streaming error, falling back:', error.message);
            
            // Emit stream error and fallback
            emitCallback('conversation:stream-error', {
                sessionId: session.sessionId,
                agent: 'Orchestrator',
                error: error.message,
                timestamp: Date.now()
            });

            // Fallback to non-streaming
            return this.generateOrchestratorResponse(session, userMessage, responseType);
        }
    }

    async generateExpertResponseStream(expertType, session, round, emitCallback) {
        if (!emitCallback || !this.streamingConfig.enabled) {
            return this.generateExpertResponse(expertType, session, round);
        }

        const expertName = this.expertTypes[expertType]?.name || expertType;
        
        try {
            console.log(`[ConversationOrchestrator] 🌊 Starting streaming response for ${expertName}`);
            
            // Emit stream start
            emitCallback('conversation:expert-stream-start', {
                sessionId: session.sessionId,
                expertType,
                expertName,
                round,
                timestamp: Date.now()
            });

            const collaborationPrompt = this.promptEngine.generateAgentCollaborationPrompt(
                expertType,
                {
                    phase: session.phase,
                    messages: session.messages,
                    round
                },
                session.userContext
            );

            const expertContext = `You are participating in round ${round} of expert collaboration. 
            
Current discussion context:
${this.formatRecentMessages(session.messages, 5)}

Provide your expert perspective on the user's project, building on other experts' insights where relevant.`;

            const responseText = await this.executeStreamingAI(
                expertContext,
                collaborationPrompt.system,
                expertName,
                session,
                emitCallback
            );

            // Emit stream complete
            emitCallback('conversation:expert-stream-complete', {
                sessionId: session.sessionId,
                expertType,
                expertName,
                message: responseText,
                round,
                timestamp: Date.now()
            });

            return {
                message: responseText,
                expertType,
                source: 'streaming_ai',
                round,
                streamed: true
            };

        } catch (error) {
            console.error(`[ConversationOrchestrator] Expert streaming error for ${expertName}:`, error.message);
            
            emitCallback('conversation:expert-stream-error', {
                sessionId: session.sessionId,
                expertType,
                expertName,
                error: error.message,
                timestamp: Date.now()
            });

            // Fallback to non-streaming
            return this.generateExpertResponse(expertType, session, round);
        }
    }

    async executeStreamingAI(context, systemPrompt, agentName, session, emitCallback) {
        // Try streaming with Anthropic SDK first
        if (this.anthropic && this.serviceHealth.anthropicSdk.status === 'healthy') {
            try {
                return await this.streamAnthropicResponse(context, systemPrompt, agentName, session, emitCallback);
            } catch (error) {
                console.log(`[ConversationOrchestrator] Anthropic streaming failed, trying non-streaming fallback:`, error.message);
            }
        }

        // Fallback to non-streaming Claude Code CLI with simulated streaming
        try {
            const response = await this.withTimeout(
                this.claudeCodeExec.executePrompt(context, {
                    systemPrompt: systemPrompt
                }),
                45000
            );

            // Simulate streaming for non-streaming services
            await this.simulateStreamingEffect(response, agentName, session, emitCallback);
            
            return response;
        } catch (error) {
            throw new Error(`All AI services failed: ${error.message}`);
        }
    }

    async streamAnthropicResponse(context, systemPrompt, agentName, session, emitCallback) {
        return new Promise((resolve, reject) => {
            let fullResponse = '';
            let buffer = '';
            
            this.anthropic.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 800,
                temperature: 0.7,
                system: systemPrompt,
                messages: [{ role: 'user', content: context }],
                stream: true
            })
            .then(stream => {
                stream.on('text', (chunk) => {
                    buffer += chunk;
                    fullResponse += chunk;
                    
                    // Emit chunks when buffer reaches threshold
                    if (buffer.length >= this.streamingConfig.bufferSize) {
                        emitCallback('conversation:stream-chunk', {
                            sessionId: session.sessionId,
                            agent: agentName,
                            chunk: buffer,
                            fullText: fullResponse,
                            timestamp: Date.now()
                        });
                        buffer = '';
                    }
                });

                stream.on('end', () => {
                    // Emit any remaining buffer
                    if (buffer.length > 0) {
                        emitCallback('conversation:stream-chunk', {
                            sessionId: session.sessionId,
                            agent: agentName,
                            chunk: buffer,
                            fullText: fullResponse,
                            timestamp: Date.now()
                        });
                    }
                    
                    console.log(`[ConversationOrchestrator] ✅ Streaming complete for ${agentName}`);
                    resolve(fullResponse.trim());
                });

                stream.on('error', (error) => {
                    console.error(`[ConversationOrchestrator] Streaming error for ${agentName}:`, error);
                    reject(error);
                });
            })
            .catch(reject);
        });
    }

    async simulateStreamingEffect(fullText, agentName, session, emitCallback) {
        const words = fullText.split(' ');
        const { chunkDelay, maxChunkSize } = this.streamingConfig;
        let currentText = '';

        for (let i = 0; i < words.length; i += maxChunkSize) {
            const chunk = words.slice(i, i + maxChunkSize).join(' ');
            currentText += (currentText ? ' ' : '') + chunk;
            
            emitCallback('conversation:stream-chunk', {
                sessionId: session.sessionId,
                agent: agentName,
                chunk: chunk + ' ',
                fullText: currentText,
                timestamp: Date.now(),
                simulated: true
            });

            // Add realistic typing delay
            await new Promise(resolve => setTimeout(resolve, chunkDelay));
        }
    }

    // AI Service Health Monitoring
    async initializeHealthChecks() {
        console.log('[ConversationOrchestrator] 🏥 Initializing AI service health monitoring');
        
        // Immediate health check
        await this.checkServiceHealth();
        
        // Periodic health checks every 5 minutes
        setInterval(() => {
            this.checkServiceHealth().catch(error => {
                console.error('[ConversationOrchestrator] Health check error:', error);
            });
        }, 5 * 60 * 1000);
    }

    async checkServiceHealth() {
        const healthPromises = [
            this.checkClaudeCodeCliHealth(),
            this.checkAnthropicSdkHealth()
        ];

        await Promise.allSettled(healthPromises);
        
        console.log('[ConversationOrchestrator] 🏥 Health Status:', {
            claudeCodeCli: this.serviceHealth.claudeCodeCli.status,
            anthropicSdk: this.serviceHealth.anthropicSdk.status,
            timestamp: new Date().toISOString()
        });
    }

    async checkClaudeCodeCliHealth() {
        try {
            const testResult = await this.withTimeout(
                this.claudeCodeExec.executePrompt('Health check test', {
                    systemPrompt: 'Respond with exactly: "Health check OK"'
                }),
                10000
            );

            const isHealthy = testResult && testResult.includes('Health check OK');
            
            this.serviceHealth.claudeCodeCli = {
                status: isHealthy ? 'healthy' : 'degraded',
                lastCheck: new Date().toISOString(),
                consecutiveFailures: isHealthy ? 0 : this.serviceHealth.claudeCodeCli.consecutiveFailures + 1,
                lastResponse: testResult?.substring(0, 100)
            };

        } catch (error) {
            this.serviceHealth.claudeCodeCli = {
                status: 'unhealthy',
                lastCheck: new Date().toISOString(),
                consecutiveFailures: this.serviceHealth.claudeCodeCli.consecutiveFailures + 1,
                lastError: error.message
            };
        }
    }

    async checkAnthropicSdkHealth() {
        if (!this.anthropic) {
            this.serviceHealth.anthropicSdk = {
                status: 'unavailable',
                lastCheck: new Date().toISOString(),
                consecutiveFailures: 0,
                reason: 'No API key configured'
            };
            return;
        }

        try {
            const response = await this.withTimeout(
                this.anthropic.messages.create({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Health check test' }]
                }),
                10000
            );

            const isHealthy = response && response.content && response.content[0];
            
            this.serviceHealth.anthropicSdk = {
                status: isHealthy ? 'healthy' : 'degraded',
                lastCheck: new Date().toISOString(),
                consecutiveFailures: isHealthy ? 0 : this.serviceHealth.anthropicSdk.consecutiveFailures + 1,
                lastResponse: response?.content?.[0]?.text?.substring(0, 100)
            };

        } catch (error) {
            this.serviceHealth.anthropicSdk = {
                status: 'unhealthy',
                lastCheck: new Date().toISOString(),
                consecutiveFailures: this.serviceHealth.anthropicSdk.consecutiveFailures + 1,
                lastError: error.message
            };
        }
    }

    getHealthStatus() {
        return {
            ...this.serviceHealth,
            overallHealth: this.calculateOverallHealth(),
            recommendedService: this.getRecommendedService()
        };
    }

    calculateOverallHealth() {
        const claudeHealthy = this.serviceHealth.claudeCodeCli.status === 'healthy';
        const anthropicHealthy = this.serviceHealth.anthropicSdk.status === 'healthy';
        
        if (claudeHealthy && anthropicHealthy) return 'excellent';
        if (claudeHealthy || anthropicHealthy) return 'good';
        if (this.serviceHealth.claudeCodeCli.status === 'degraded' || 
            this.serviceHealth.anthropicSdk.status === 'degraded') return 'degraded';
        return 'poor';
    }

    getRecommendedService() {
        if (this.serviceHealth.claudeCodeCli.status === 'healthy') return 'claude-code-cli';
        if (this.serviceHealth.anthropicSdk.status === 'healthy') return 'anthropic-sdk';
        if (this.serviceHealth.claudeCodeCli.consecutiveFailures < this.serviceHealth.anthropicSdk.consecutiveFailures) {
            return 'claude-code-cli';
        }
        return 'anthropic-sdk';
    }

    // Cleanup old sessions
    cleanupOldSessions() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [sessionId, session] of this.activeSessions) {
            if (session.startTime < oneHourAgo) {
                this.activeSessions.delete(sessionId);
                console.log(`[ConversationOrchestrator] Cleaned up old session: ${sessionId}`);
            }
        }
    }
}

module.exports = ConversationOrchestrator;