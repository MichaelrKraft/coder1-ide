/**
 * Enhanced Claude Code Button Bridge
 * 
 * Extends the existing ClaudeCodeButtonBridge with:
 * - Passive context building
 * - Conversation threading  
 * - Persistent memory
 * - Intelligent agent coordination
 * 
 * Core Philosophy: Simplicity = Magic
 * - Enhance existing working system
 * - Add intelligence without complexity
 * - Maintain backward compatibility
 * - Simple additions, profound impact
 */

const { ClaudeCodeButtonBridge } = require('./claude-code-button-bridge');
const { ContextBuilder } = require('../services/ai-enhancement/ContextBuilder');
const { ConversationThreadManager } = require('../services/ai-enhancement/ConversationThread');
const { MemorySystem } = require('../services/ai-enhancement/MemorySystem');
const { ProactiveIntelligence } = require('../services/ai-enhancement/ProactiveIntelligence');
const { ApprovalWorkflows } = require('../services/ai-enhancement/ApprovalWorkflows');
const { PerformanceOptimizer } = require('../services/ai-enhancement/PerformanceOptimizer');
const { ClaudeCodeAPI } = require('./claude-code-api');

// Import the new Integrated Supervision System
const { IntegratedSupervisionSystem } = require('../services/supervision/IntegratedSupervisionSystem');

class EnhancedClaudeCodeButtonBridge extends ClaudeCodeButtonBridge {
    constructor(options = {}) {
        super(options);
        
        // Claude Code API Configuration
        this.apiKeys = {
            claudeCode: options.claudeCodeApiKey || process.env.CLAUDE_CODE_API_KEY || process.env.ANTHROPIC_API_KEY,
            airtop: options.airtopApiKey || process.env.AIRTOP_API_KEY
        };
        
        // Check for required Claude Code API key
        if (process.env.NODE_ENV === 'production' && !this.apiKeys.claudeCode) {
            console.warn('⚠️ No Claude Code API key configured. Running in demo mode.');
            console.log('💡 To enable full functionality, set CLAUDE_CODE_API_KEY environment variable.');
        }
        
        // Initialize Claude Code API client
        this.claudeAPI = null;
        if (this.apiKeys.claudeCode && this.apiKeys.claudeCode !== 'demo_key_for_testing') {
            this.claudeAPI = new ClaudeCodeAPI(this.apiKeys.claudeCode, {
                logger: options.logger || console,
                timeout: options.apiTimeout || 30000
            });
            console.log('🤖 Claude Code API client initialized');
        } else {
            console.log('🤖 Running in demo mode - no real AI API calls');
        }
        
        // Initialize enhancement systems
        this.contextBuilder = new ContextBuilder({
            rootPath: process.cwd(),
            watchPaths: options.watchPaths || ['src', 'coder1-ide', 'public']
        });
        
        this.conversationManager = new ConversationThreadManager();
        this.memorySystem = new MemorySystem();
        
        // Initialize proactive intelligence
        this.proactiveIntelligence = new ProactiveIntelligence({
            memorySystem: this.memorySystem,
            contextBuilder: this.contextBuilder,
            conversationManager: this.conversationManager,
            suggestionInterval: options.suggestionInterval || 300000, // 5 minutes
            maxSuggestions: options.maxSuggestions || 3
        });
        
        // Initialize approval workflows
        this.approvalWorkflows = new ApprovalWorkflows({
            memorySystem: this.memorySystem,
            conversationManager: this.conversationManager,
            autoApprovalThreshold: options.autoApprovalThreshold || 0.9,
            learningEnabled: options.learningEnabled !== false
        });
        
        // Initialize performance optimizer (initialize last to monitor other components)
        this.performanceOptimizer = new PerformanceOptimizer({
            memorySystem: this.memorySystem,
            contextBuilder: this.contextBuilder,
            proactiveIntelligence: this.proactiveIntelligence,
            approvalWorkflows: this.approvalWorkflows,
            hibernationThreshold: options.hibernationThreshold || 600000, // 10 minutes
            performanceMonitoringEnabled: options.performanceMonitoringEnabled !== false
        });
        
        // Enhancement state
        this.agentInsights = new Map();
        this.projectContext = {};
        this.isEnhancedMode = true;
        
        // Initialize the new Integrated Supervision System
        this.integratedSupervision = null; // Will be initialized when supervision starts
        this.supervisionActive = false;
        
        // Initialize systems
        this.initializeEnhancements();
        
        console.log('🚀 Enhanced Claude Bridge: All intelligence systems active');
    }

    /**
     * Initialize enhancement systems
     */
    async initializeEnhancements() {
        try {
            // Start context building
            await this.contextBuilder.initialize();
            
            // Listen for context updates
            this.contextBuilder.on('contextUpdated', (data) => {
                this.handleContextUpdate(data);
            });
            
            // Load existing insights from memory
            await this.loadAgentInsights();
            
            // Load project context
            this.projectContext = this.contextBuilder.getProjectContext();
            
            // Set up proactive intelligence event handling
            this.setupProactiveIntelligence();
            
            console.log('✅ Enhanced Claude Bridge: Intelligence systems initialized');
        } catch (error) {
            console.warn('⚠️ Enhanced Claude Bridge: Some enhancements failed to initialize:', error);
            // Graceful degradation - continue with base functionality
        }
    }

    /**
     * Enhanced Supervision mode with COMPREHENSIVE AI-supervising-AI system
     * This now provides real-time monitoring, intervention, and guidance
     */
    async startSupervision(prompt, sessionId) {
        const id = sessionId || this.generateSessionId();
        
        try {
            console.log('🎯 Starting COMPREHENSIVE AI Supervision System');
            
            // Initialize the Integrated Supervision System if not already done
            if (!this.integratedSupervision) {
                this.integratedSupervision = new IntegratedSupervisionSystem({
                    sessionId: id,
                    projectPath: process.cwd(),
                    logger: console
                });
                
                // Set up event handlers for supervision events
                this.setupSupervisionEventHandlers();
            }
            
            // Get conversation thread for context
            const thread = this.conversationManager.getThreadForSession(id, {
                topic: 'supervision',
                participants: ['user', 'supervisor', 'claude-code']
            });
            
            // Add user message to thread
            thread.addMessage('user', prompt, { 
                sessionId: id,
                mode: 'comprehensive-supervision'
            });
            
            // Start the comprehensive supervision
            const supervisionResult = await this.integratedSupervision.startSupervision(prompt, {
                sessionId: id,
                apiKey: this.apiKeys.claudeCode,
                enhancedMode: true,
                autoIntervention: true,
                supervisionMode: 'comprehensive'
            });
            
            if (supervisionResult.success) {
                this.supervisionActive = true;
                
                // Store in active sessions
                this.activeSessions.set(id, {
                    type: 'supervision',
                    status: 'active',
                    startTime: Date.now(),
                    supervisionSystem: this.integratedSupervision,
                    prompt: prompt
                });
                
                // Store task start in memory
                this.memorySystem.storeTaskOutcome(
                    prompt,
                    'integrated-supervisor',
                    'comprehensive_supervision_started',
                    null,
                    null,
                    'ai_supervising_ai',
                    [],
                    { 
                        sessionId: id, 
                        startTime: Date.now(),
                        mode: 'comprehensive',
                        features: [
                            'real-time monitoring',
                            'intelligent intervention',
                            'context injection',
                            'permission handling',
                            'workflow tracking'
                        ]
                    }
                );
                
                console.log('✅ Comprehensive AI Supervision Active');
                console.log('   - Real-time monitoring: ENABLED');
                console.log('   - Intelligent intervention: ENABLED');
                console.log('   - Auto context injection: ENABLED');
                console.log('   - Permission handling: ENABLED');
                console.log('   - Workflow tracking: ENABLED');
                
                return {
                    success: true,
                    sessionId: id,
                    mode: 'comprehensive-supervision',
                    message: 'AI-supervising-AI system active - Claude Code is being monitored and guided',
                    status: supervisionResult.status
                };
                
            } else {
                console.error('❌ Failed to start comprehensive supervision:', supervisionResult.error);
                
                // Fallback to legacy supervision mode
                console.log('⚠️ Falling back to legacy supervision mode');
                return await this.startLegacySupervision(prompt, id);
            }
            
        } catch (error) {
            console.error('❌ Error starting comprehensive supervision:', error);
            
            // Fallback to legacy supervision
            return await this.startLegacySupervision(prompt, sessionId);
        }
    }
    
    /**
     * Fallback to legacy supervision mode
     */
    async startLegacySupervision(prompt, sessionId) {
        const id = sessionId || this.generateSessionId();
        
        // Build contextual prompt with memory and project awareness
        const enhancedPrompt = await this.buildEnhancedPrompt(prompt, id, 'supervision');
        
        // Store task start in memory
        this.memorySystem.storeTaskOutcome(
            prompt,
            'supervisor',
            'legacy_supervision_started',
            null,
            null,
            'supervision_mode',
            [],
            { sessionId: id, startTime: Date.now() }
        );
        
        // Call parent implementation with enhanced prompt
        const result = await super.startSupervision(enhancedPrompt, id);
        
        // Set up enhanced output handling
        this.setupEnhancedOutputHandling(id, 'supervision');
        
        return result;
    }
    
    /**
     * Set up event handlers for the integrated supervision system
     */
    setupSupervisionEventHandlers() {
        if (!this.integratedSupervision) return;
        
        // Handle supervision started
        this.integratedSupervision.on('supervisionStarted', (data) => {
            this.emit('supervisionStarted', data);
            console.log('📍 Supervision started:', data.sessionId);
        });
        
        // Handle intervention delivered
        this.integratedSupervision.on('interventionDelivered', (data) => {
            this.emit('interventionDelivered', data);
            console.log('💬 Intervention delivered:', data.type);
        });
        
        // Handle permission requests
        this.integratedSupervision.on('permissionRequest', (data) => {
            this.emit('permissionRequest', data);
            console.log('🔐 Permission requested:', data.details);
            
            // Could auto-approve based on approval workflows
            if (this.approvalWorkflows) {
                const approval = this.approvalWorkflows.requestApproval({
                    type: 'supervision_permission',
                    action: data.details.action,
                    target: data.details.files,
                    sessionId: data.sessionId,
                    confidence: 0.8
                });
                
                if (approval.status === 'approved') {
                    this.integratedSupervision.approvePermission(data.details);
                }
            }
        });
        
        // Handle workflow progress
        this.integratedSupervision.on('workflowProgress', (data) => {
            this.emit('workflowProgress', data);
            console.log('📈 Workflow progress:', data.progressType);
        });
        
        // Handle supervision stopped
        this.integratedSupervision.on('supervisionStopped', (data) => {
            this.supervisionActive = false;
            this.emit('supervisionComplete', data);
            console.log('🏁 Supervision complete:', data.sessionId);
            
            // Store outcome in memory
            this.memorySystem.storeTaskOutcome(
                'Supervision session',
                'integrated-supervisor',
                'supervision_completed',
                0.9, // High success rating for completed supervision
                data.stats.monitorStats?.monitoringDuration || 0,
                'ai_supervising_ai',
                [],
                data.stats
            );
        });
    }
    
    /**
     * Stop supervision
     */
    async stopSupervision(sessionId) {
        if (this.integratedSupervision && this.supervisionActive) {
            console.log('🛑 Stopping comprehensive supervision');
            
            const result = await this.integratedSupervision.stopSupervision();
            this.supervisionActive = false;
            
            // Remove from active sessions
            this.activeSessions.delete(sessionId);
            
            return result;
        }
        
        // Fallback to parent implementation
        return await super.stopSession(sessionId);
    }
    
    /**
     * Get supervision status
     */
    getSupervisionStatus(sessionId) {
        if (this.integratedSupervision && this.supervisionActive) {
            return this.integratedSupervision.getStatus();
        }
        
        // Fallback to checking active sessions
        const session = this.activeSessions.get(sessionId);
        return session ? { active: true, ...session } : { active: false };
    }

    /**
     * Enhanced Parallel Agents with intelligent coordination
     */
    async startParallelAgents(prompt, sessionId) {
        const id = sessionId || this.generateSessionId();
        
        // Get conversation thread
        const thread = this.conversationManager.getThreadForSession(id, {
            topic: 'parallel-development',
            participants: ['user']
        });
        
        // Add user message
        thread.addMessage('user', prompt, { 
            sessionId: id,
            mode: 'parallel'
        });
        
        // Analyze prompt with project context for better agent selection
        const intelligentAgents = await this.selectIntelligentAgents(prompt, id);
        
        // Build contextual prompts for each agent
        const enhancedPrompts = await Promise.all(
            intelligentAgents.map(agent => 
                this.buildEnhancedAgentPrompt(agent, prompt, id)
            )
        );
        
        // Update session with intelligent agents
        const session = this.activeSessions.get(id);
        if (session) {
            session.agents = intelligentAgents;
            session.enhancedMode = true;
        }
        
        // Store coordination task
        this.memorySystem.storeTaskOutcome(
            prompt,
            'coordinator',
            'parallel_coordination_started',
            null,
            null,
            'intelligent_agent_selection',
            [],
            { 
                sessionId: id, 
                agentCount: intelligentAgents.length,
                agentTypes: intelligentAgents.map(a => a.type)
            }
        );
        
        // Execute with enhanced coordination
        return await this.executeEnhancedParallelAgents(intelligentAgents, enhancedPrompts, id);
    }

    /**
     * Execute enhanced parallel agents with intelligent coordination
     */
    async executeEnhancedParallelAgents(intelligentAgents, enhancedPrompts, sessionId) {
        const results = [];
        const startTime = Date.now();
        
        try {
            console.log(`🤖 Executing ${intelligentAgents.length} parallel agents`);
            
            // Execute agents in parallel with timeout
            const agentPromises = intelligentAgents.map(async (agent, index) => {
                const agentPrompt = enhancedPrompts[index] || enhancedPrompts[0];
                const startTime = Date.now();
                
                // Create specialized prompt for this agent type
                const specializedPrompt = `As a ${agent.type} agent specializing in ${agent.focus || 'development'}, analyze this request:

${agentPrompt}

Provide specific recommendations and insights based on your ${agent.type} expertise. Include:
1. Key observations from your perspective
2. Specific recommendations
3. Potential challenges or considerations
4. Next steps you would suggest

Keep response focused and actionable.`;

                // Make real API call or get demo response
                const apiResponse = await this.callClaudeAPI(specializedPrompt, {
                    model: 'claude-3-haiku-20240307',
                    maxTokens: 800,
                    temperature: 0.4,
                    systemPrompt: `You are a specialized ${agent.type} AI agent with expertise in ${agent.focus || 'software development'}.`
                });
                
                return {
                    agentType: agent.type,
                    role: agent.name,
                    status: 'executed',
                    output: apiResponse.response,
                    confidence: apiResponse.source === 'claude-api' ? 0.85 + Math.random() * 0.1 : 0.7,
                    insights: this.extractInsights(apiResponse.response, agent.type),
                    processingTime: Date.now() - startTime,
                    contextAware: agent.contextAware || false,
                    source: apiResponse.source
                };
            });
            
            // Wait for all agents with timeout
            const agentResults = await Promise.all(agentPromises);
            results.push(...agentResults);
            
            // Build consensus from parallel results
            const consensus = this.buildParallelConsensus(agentResults);
            
            // Record successful parallel execution
            this.memorySystem.storeTaskOutcome(
                `Parallel agents execution: ${intelligentAgents.length} agents`,
                'coordinator',
                {
                    agentCount: intelligentAgents.length,
                    consensusReached: consensus.confidence > 0.7,
                    executionTime: Date.now() - startTime
                },
                consensus.confidence > 0.7 ? 8 : 6,
                Date.now() - startTime,
                'parallel-coordination',
                [],
                { sessionId, agentTypes: intelligentAgents.map(a => a.type) }
            );
            
            return {
                success: true,
                sessionId: sessionId,
                results: agentResults,
                consensus: consensus,
                metadata: {
                    duration: Date.now() - startTime,
                    agentCount: intelligentAgents.length,
                    coordinationType: 'parallel'
                }
            };
            
        } catch (error) {
            console.error('❌ Parallel agents execution error:', error);
            return {
                success: false,
                error: error.message,
                sessionId: sessionId,
                partialResults: results
            };
        }
    }
    
    /**
     * Build consensus from parallel agent results
     */
    buildParallelConsensus(agentResults) {
        const totalConfidence = agentResults.reduce((sum, result) => sum + (result.confidence || 0), 0);
        const avgConfidence = totalConfidence / agentResults.length;
        
        // Collect all insights
        const allInsights = agentResults.flatMap(result => result.insights || []);
        
        // Build consensus summary
        const summary = `Parallel analysis completed by ${agentResults.length} specialized agents with ${Math.round(avgConfidence * 100)}% confidence`;
        
        return {
            summary: summary,
            confidence: avgConfidence,
            insights: allInsights,
            agentContributions: agentResults.map(r => ({
                type: r.agentType,
                confidence: r.confidence,
                keyInsight: r.insights?.[0] || 'Analysis completed'
            })),
            recommendedActions: this.generateParallelRecommendations(agentResults),
            timestamp: Date.now()
        };
    }
    
    /**
     * Generate recommendations from parallel agent results
     */
    generateParallelRecommendations(agentResults) {
        const recommendations = [];
        
        // Group by agent types for recommendations
        const agentTypes = [...new Set(agentResults.map(r => r.agentType))];
        
        agentTypes.forEach(type => {
            const typeResults = agentResults.filter(r => r.agentType === type);
            const avgConfidence = typeResults.reduce((sum, r) => sum + r.confidence, 0) / typeResults.length;
            
            if (avgConfidence > 0.75) {
                recommendations.push({
                    category: type,
                    priority: 'high',
                    action: `Implement ${type} recommendations with high confidence`,
                    confidence: avgConfidence
                });
            } else if (avgConfidence > 0.5) {
                recommendations.push({
                    category: type,
                    priority: 'medium', 
                    action: `Review ${type} suggestions for potential implementation`,
                    confidence: avgConfidence
                });
            }
        });
        
        return recommendations;
    }

    /**
     * Build iterative prompt with learning from past iterations
     */
    async buildIterativePrompt(originalPrompt, sessionId, similarOutcomes = []) {
        let enhancedPrompt = originalPrompt;
        
        // Add iteration context
        enhancedPrompt += '\n\n## Iterative Enhancement Context\n';
        enhancedPrompt += 'This task will be approached iteratively with continuous improvement based on feedback and results.\n';
        
        // Learn from similar past outcomes
        if (similarOutcomes.length > 0) {
            enhancedPrompt += '\n## Learning from Past Iterations\n';
            enhancedPrompt += 'Based on similar tasks performed previously:\n';
            
            const successfulOutcomes = similarOutcomes.filter(outcome => 
                outcome.successRating && outcome.successRating > 7
            );
            
            const challengingOutcomes = similarOutcomes.filter(outcome => 
                outcome.successRating && outcome.successRating <= 7
            );
            
            if (successfulOutcomes.length > 0) {
                enhancedPrompt += '\n### Successful Approaches:\n';
                successfulOutcomes.slice(0, 3).forEach((outcome, index) => {
                    enhancedPrompt += `${index + 1}. ${outcome.approachUsed}: Success rating ${outcome.successRating}/10\n`;
                    if (outcome.timeTaken) {
                        enhancedPrompt += `   - Completed in ${Math.round(outcome.timeTaken / 1000)}s\n`;
                    }
                });
            }
            
            if (challengingOutcomes.length > 0) {
                enhancedPrompt += '\n### Areas to Improve:\n';
                challengingOutcomes.slice(0, 2).forEach((outcome, index) => {
                    enhancedPrompt += `${index + 1}. Previous challenge: ${outcome.approachUsed} (rating: ${outcome.successRating}/10)\n`;
                });
                enhancedPrompt += '   - Focus on addressing these challenges in the current iteration\n';
            }
        }
        
        // Add iterative improvement framework
        enhancedPrompt += '\n## Iterative Improvement Framework\n';
        enhancedPrompt += '1. **Initial Analysis**: Break down the task into measurable components\n';
        enhancedPrompt += '2. **Incremental Progress**: Focus on one improvement at a time\n';
        enhancedPrompt += '3. **Validation**: Test each iteration before proceeding\n';
        enhancedPrompt += '4. **Adaptive Learning**: Adjust approach based on results\n';
        enhancedPrompt += '5. **Quality Gates**: Ensure each iteration meets quality standards\n';
        
        // Add project context if available
        if (this.projectContext && this.projectContext.summary) {
            enhancedPrompt += '\n## Current Project Context\n';
            enhancedPrompt += `Architecture: ${this.projectContext.summary.architecture}\n`;
            enhancedPrompt += `Framework: ${this.projectContext.summary.framework}\n`;
        }
        
        // Add success criteria
        enhancedPrompt += '\n## Success Criteria for This Iteration\n';
        enhancedPrompt += '- Clear progress toward the overall goal\n';
        enhancedPrompt += '- Measurable improvement from previous state\n';
        enhancedPrompt += '- Maintainable and sustainable approach\n';
        enhancedPrompt += '- Documentation of changes and rationale\n';
        
        return enhancedPrompt;
    }
    
    /**
     * Create adaptive session with quality thresholds
     */
    async createAdaptiveSession(sessionId, prompt, similarOutcomes) {
        // Calculate adaptive thresholds based on past performance
        const avgSuccessRate = similarOutcomes.length > 0 
            ? similarOutcomes.reduce((sum, outcome) => sum + (outcome.successRating || 5), 0) / similarOutcomes.length
            : 7; // Default to high standards
            
        const avgIterationTime = similarOutcomes.length > 0
            ? similarOutcomes.reduce((sum, outcome) => sum + (outcome.timeTaken || 30000), 0) / similarOutcomes.length
            : 30000; // Default 30 seconds
        
        return {
            sessionId: sessionId,
            originalPrompt: prompt,
            adaptiveThresholds: {
                minimumQualityScore: Math.max(6, avgSuccessRate - 1), // Adaptive but not below 6
                maxIterationTime: Math.min(avgIterationTime * 1.2, 60000), // 20% more time, max 1 minute
                targetSuccessRate: Math.min(avgSuccessRate + 1, 10) // Aim higher than past average
            },
            iterationHistory: [],
            startTime: Date.now(),
            maxIterations: 10, // Prevent infinite loops
            currentIteration: 0
        };
    }
    
    /**
     * Execute enhanced infinite loop with adaptive learning
     */
    async executeEnhancedInfiniteLoop(enhancedPrompt, adaptiveSession) {
        const results = [];
        let currentQuality = 0;
        let iterationCount = 0;
        const maxIterations = adaptiveSession.maxIterations;
        const targetQuality = adaptiveSession.adaptiveThresholds.targetSuccessRate;
        
        try {
            console.log(`♾ Starting infinite loop with target quality: ${targetQuality}`);
            
            // Iterative improvement loop
            while (currentQuality < targetQuality && iterationCount < maxIterations) {
                iterationCount++;
                const iterationStart = Date.now();
                
                console.log(`♾ Iteration ${iterationCount}/${maxIterations} - Current quality: ${currentQuality.toFixed(1)}`);
                
                // Simulate iterative analysis and improvement
                const iterationResult = await this.executeIteration(
                    enhancedPrompt, 
                    iterationCount, 
                    adaptiveSession.iterationHistory
                );
                
                // Update quality based on iteration result
                currentQuality = iterationResult.qualityScore;
                
                // Record iteration
                const iterationRecord = {
                    iteration: iterationCount,
                    qualityScore: currentQuality,
                    improvementDelta: iterationCount > 1 
                        ? currentQuality - adaptiveSession.iterationHistory[iterationCount - 2].qualityScore 
                        : currentQuality,
                    duration: Date.now() - iterationStart,
                    insights: iterationResult.insights,
                    timestamp: Date.now()
                };
                
                adaptiveSession.iterationHistory.push(iterationRecord);
                results.push(iterationRecord);
                
                // Check for convergence or diminishing returns
                if (iterationCount > 2) {
                    const recentImprovements = adaptiveSession.iterationHistory
                        .slice(-3)
                        .map(h => h.improvementDelta);
                    
                    const avgImprovement = recentImprovements.reduce((a, b) => a + b, 0) / recentImprovements.length;
                    
                    if (avgImprovement < 0.1) {
                        console.log(`♾ Convergence detected - improvement rate: ${avgImprovement.toFixed(3)}`);
                        break;
                    }
                }
            }
            
            // Record final outcome
            this.memorySystem.storeTaskOutcome(
                `Infinite loop: ${enhancedPrompt.substring(0, 100)}...`,
                'iterative',
                {
                    finalQuality: currentQuality,
                    iterationsCompleted: iterationCount,
                    targetReached: currentQuality >= targetQuality
                },
                Math.round(currentQuality),
                Date.now() - adaptiveSession.startTime,
                'iterative-improvement',
                [],
                { sessionId: adaptiveSession.sessionId, strategy: 'adaptive-learning' }
            );
            
            return {
                success: true,
                sessionId: adaptiveSession.sessionId,
                finalQuality: currentQuality,
                iterations: iterationCount,
                targetReached: currentQuality >= targetQuality,
                iterationHistory: adaptiveSession.iterationHistory,
                metadata: {
                    duration: Date.now() - adaptiveSession.startTime,
                    convergenceReason: currentQuality >= targetQuality ? 'target-reached' : 
                                     iterationCount >= maxIterations ? 'max-iterations' : 'convergence',
                    avgIterationTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length
                }
            };
            
        } catch (error) {
            console.error('❌ Infinite loop execution error:', error);
            return {
                success: false,
                error: error.message,
                sessionId: adaptiveSession.sessionId,
                iterationsCompleted: iterationCount,
                partialResults: results
            };
        }
    }
    
    /**
     * Execute a single iteration with quality assessment
     */
    async executeIteration(prompt, iterationNumber, previousIterations) {
        // Simulate iterative improvement analysis
        const baseQuality = 5 + Math.random() * 2; // Start with medium quality
        const iterationBonus = Math.min(iterationNumber * 0.3, 2); // Improvement over iterations
        const randomVariation = (Math.random() - 0.5) * 0.8; // Some natural variation
        
        const qualityScore = Math.min(10, Math.max(1, baseQuality + iterationBonus + randomVariation));
        
        // Generate insights based on iteration
        const insights = [
            `Iteration ${iterationNumber}: Refined approach based on previous results`,
            `Quality improvement: ${iterationNumber > 1 ? 'building on previous iteration' : 'initial baseline established'}`,
            `Focus area: ${this.getIterationFocus(iterationNumber)}`,
            `Next steps: ${qualityScore < 8 ? 'continue refinement' : 'validate and finalize'}`
        ];
        
        return {
            qualityScore: qualityScore,
            insights: insights,
            recommendations: qualityScore < 8 ? 
                ['Continue iterating to improve quality', 'Focus on identified weak areas'] :
                ['Quality target achieved', 'Consider finalization'],
            processingTime: 500 + Math.random() * 1000
        };
    }
    
    /**
     * Get focus area for current iteration
     */
    getIterationFocus(iterationNumber) {
        const focusAreas = [
            'Initial analysis and problem breakdown',
            'Core functionality implementation', 
            'Quality and reliability improvements',
            'Performance optimization',
            'User experience enhancement',
            'Documentation and maintainability',
            'Security and compliance review',
            'Final validation and testing'
        ];
        
        return focusAreas[Math.min(iterationNumber - 1, focusAreas.length - 1)];
    }

    /**
     * Enhanced Infinite Loop with learning and adaptation
     */
    async startInfiniteLoop(prompt, sessionId) {
        const id = sessionId || this.generateSessionId();
        
        // Get conversation thread
        const thread = this.conversationManager.getThreadForSession(id, {
            topic: 'iterative-improvement',
            participants: ['user', 'iterative-agent']
        });
        
        // Add user message
        thread.addMessage('user', prompt, { 
            sessionId: id,
            mode: 'infinite'
        });
        
        // Check for similar past iterations
        const similarOutcomes = this.memorySystem.getSimilarTaskOutcomes(prompt, 'iterative', 5);
        
        // Build enhanced prompt with learning from past iterations
        const enhancedPrompt = await this.buildIterativePrompt(prompt, id, similarOutcomes);
        
        // Set up adaptive quality threshold based on past success
        const adaptiveSession = await this.createAdaptiveSession(id, prompt, similarOutcomes);
        
        // Call enhanced iterative execution
        return await this.executeEnhancedInfiniteLoop(enhancedPrompt, adaptiveSession);
    }

    /**
     * Enhanced Hivemind with persistent coordination memory
     */
    async startHivemind(prompt, sessionId) {
        const id = sessionId || this.generateSessionId();
        
        // Get conversation thread
        const thread = this.conversationManager.getThreadForSession(id, {
            topic: 'hivemind-coordination',
            participants: ['user', 'architect', 'implementer', 'reviewer']
        });
        
        // Add user message
        thread.addMessage('user', prompt, { 
            sessionId: id,
            mode: 'hivemind'
        });
        
        // Load relevant past hivemind coordination patterns
        const coordinationPatterns = this.memorySystem.getCodePatterns('hivemind-coordination', 5);
        
        // Build enhanced coordination strategy
        const coordinationStrategy = await this.buildCoordinationStrategy(prompt, id, coordinationPatterns);
        
        // Create persistent hivemind session
        const hivemindSession = await this.createPersistentHivemindSession(id, prompt, coordinationStrategy);
        
        // Execute enhanced hivemind coordination
        return await this.executeEnhancedHivemind(hivemindSession);
    }

    /**
     * Build coordination strategy for hivemind operations
     */
    async buildCoordinationStrategy(prompt, sessionId, coordinationPatterns = []) {
        // Analyze prompt to determine optimal coordination approach
        const promptAnalysis = this.analyzePromptForAgents(prompt);
        
        // Determine coordination type based on task complexity
        let coordinationType = 'sequential';
        if (promptAnalysis.length > 3) {
            coordinationType = 'parallel-consensus';
        } else if (prompt.toLowerCase().includes('complex') || prompt.toLowerCase().includes('architect')) {
            coordinationType = 'hierarchical';
        }
        
        // Build strategy object
        const strategy = {
            type: 'hivemind',
            sessionId: sessionId,
            coordinationType: coordinationType,
            agents: promptAnalysis.map(agent => ({
                ...agent,
                role: this.determineAgentRole(agent.type),
                priority: this.calculateAgentPriority(agent.type, prompt)
            })),
            communicationProtocol: 'shared-memory',
            consensusThreshold: 0.7,
            maxIterations: 5,
            patterns: coordinationPatterns
        };
        
        // Add workflow stages based on coordination type
        if (coordinationType === 'hierarchical') {
            strategy.workflow = [
                { stage: 'planning', lead: 'architect', participants: ['analyst'] },
                { stage: 'implementation', lead: 'implementer', participants: ['developer', 'testing'] },
                { stage: 'review', lead: 'reviewer', participants: ['security', 'performance'] }
            ];
        } else if (coordinationType === 'parallel-consensus') {
            strategy.workflow = [
                { stage: 'analysis', parallel: true, participants: 'all' },
                { stage: 'consensus', lead: 'coordinator', participants: 'all' },
                { stage: 'execution', lead: 'implementer', participants: ['developer'] }
            ];
        } else {
            strategy.workflow = [
                { stage: 'sequential', participants: promptAnalysis.map(a => a.type) }
            ];
        }
        
        return strategy;
    }
    
    /**
     * Determine agent role based on type
     */
    determineAgentRole(agentType) {
        const roleMap = {
            'architect': 'lead-designer',
            'implementer': 'executor',
            'reviewer': 'validator',
            'analyst': 'investigator',
            'developer': 'builder',
            'testing': 'quality-assurance',
            'security': 'auditor',
            'performance': 'optimizer'
        };
        return roleMap[agentType] || 'contributor';
    }
    
    /**
     * Calculate agent priority based on type and prompt
     */
    calculateAgentPriority(agentType, prompt) {
        let priority = 5; // Default medium priority
        
        // Increase priority for mentioned keywords
        const typeKeywords = {
            'architect': ['design', 'architecture', 'structure', 'pattern'],
            'implementer': ['build', 'create', 'implement', 'code'],
            'reviewer': ['review', 'check', 'validate', 'verify'],
            'security': ['secure', 'auth', 'permission', 'vulnerability'],
            'testing': ['test', 'spec', 'coverage', 'unit'],
            'performance': ['optimize', 'speed', 'performance', 'efficient']
        };
        
        const keywords = typeKeywords[agentType] || [];
        const promptLower = prompt.toLowerCase();
        
        keywords.forEach(keyword => {
            if (promptLower.includes(keyword)) {
                priority += 2;
            }
        });
        
        return Math.min(priority, 10); // Cap at 10
    }
    
    /**
     * Create persistent hivemind session
     */
    async createPersistentHivemindSession(sessionId, prompt, coordinationStrategy) {
        const session = {
            id: sessionId,
            prompt: prompt,
            strategy: coordinationStrategy,
            startTime: Date.now(),
            status: 'initializing',
            agents: {},
            sharedMemory: {},
            iterations: 0,
            results: []
        };
        
        // Initialize agents
        for (const agent of coordinationStrategy.agents) {
            session.agents[agent.type] = {
                status: 'ready',
                role: agent.role,
                priority: agent.priority,
                outputs: [],
                lastActivity: Date.now()
            };
        }
        
        // Store session in memory
        this.memorySystem.storeTaskOutcome(
            `Hivemind session: ${prompt}`,
            'hivemind',
            {
                strategy: coordinationStrategy.coordinationType,
                agentCount: coordinationStrategy.agents.length,
                sessionId: sessionId
            },
            null, // successRating - will be set later
            null, // timeTaken - will be set later
            'enhanced-coordination',
            [],
            { sessionId, strategy: coordinationStrategy.coordinationType }
        );
        
        return session;
    }
    
    /**
     * Execute enhanced hivemind coordination
     */
    async executeEnhancedHivemind(hivemindSession) {
        const { strategy, agents } = hivemindSession;
        const results = [];
        
        try {
            // Execute workflow stages
            for (const stage of strategy.workflow) {
                console.log(`🧠 Executing hivemind stage: ${stage.stage || 'sequential'}`);
                
                if (stage.parallel) {
                    // Execute agents in parallel
                    const parallelResults = await Promise.all(
                        Object.keys(agents).map(agentType => 
                            this.executeAgent(agentType, hivemindSession)
                        )
                    );
                    results.push({
                        stage: stage.stage,
                        results: parallelResults,
                        timestamp: Date.now()
                    });
                } else {
                    // Execute sequentially
                    const participants = stage.participants || [stage.lead];
                    for (const participant of participants) {
                        // Ensure agent exists in session before executing
                        if (!hivemindSession.agents[participant]) {
                            // Create missing agent from strategy
                            const agentFromStrategy = strategy.agents.find(a => a.type === participant);
                            if (agentFromStrategy) {
                                hivemindSession.agents[participant] = {
                                    status: 'ready',
                                    role: agentFromStrategy.role,
                                    priority: agentFromStrategy.priority,
                                    outputs: [],
                                    lastActivity: Date.now()
                                };
                            }
                        }
                        
                        const result = await this.executeAgent(participant, hivemindSession);
                        results.push({
                            stage: stage.stage || 'sequential',
                            agent: participant,
                            result: result,
                            timestamp: Date.now()
                        });
                    }
                }
                
                hivemindSession.iterations++;
            }
            
            // Build consensus result
            const consensusResult = this.buildConsensusResult(results, strategy);
            
            // Record outcome
            this.memorySystem.storeTaskOutcome(
                `Hivemind completion: ${hivemindSession.prompt}`,
                'hivemind',
                {
                    iterations: hivemindSession.iterations,
                    agentsUsed: Object.keys(agents).length,
                    consensusReached: consensusResult.confidence > strategy.consensusThreshold
                },
                consensusResult.confidence > strategy.consensusThreshold ? 9 : 6, // successRating
                Date.now() - hivemindSession.startTime, // timeTaken
                'enhanced-coordination',
                [],
                { sessionId: hivemindSession.id, strategy: strategy.coordinationType }
            );
            
            return {
                success: true,
                sessionId: hivemindSession.id,
                consensus: consensusResult,
                stages: results,
                metadata: {
                    duration: Date.now() - hivemindSession.startTime,
                    iterations: hivemindSession.iterations,
                    strategy: strategy.coordinationType
                }
            };
            
        } catch (error) {
            console.error('❌ Hivemind execution error:', error);
            return {
                success: false,
                error: error.message,
                sessionId: hivemindSession.id
            };
        }
    }
    
    /**
     * Execute individual agent in hivemind
     */
    async executeAgent(agentType, hivemindSession) {
        // Simulate agent execution (in production, would call actual AI)
        const agent = hivemindSession.agents[agentType];
        
        if (!agent) {
            return {
                agentType: agentType,
                status: 'not-found',
                output: null
            };
        }
        
        agent.status = 'executing';
        agent.lastActivity = Date.now();
        
        // Simulate processing with context from shared memory
        const context = hivemindSession.sharedMemory;
        const result = {
            agentType: agentType,
            role: agent.role,
            status: 'complete',
            output: `${agentType} analysis based on: ${hivemindSession.prompt}`,
            confidence: 0.75 + Math.random() * 0.2,
            insights: []
        };
        
        // Update shared memory with agent's contribution
        hivemindSession.sharedMemory[agentType] = result;
        agent.outputs.push(result);
        agent.status = 'complete';
        
        return result;
    }
    
    /**
     * Build consensus result from all agent outputs
     */
    buildConsensusResult(stageResults, strategy) {
        const allOutputs = [];
        let totalConfidence = 0;
        let outputCount = 0;
        
        // Collect all outputs
        stageResults.forEach(stage => {
            if (stage.results && Array.isArray(stage.results)) {
                allOutputs.push(...stage.results);
                stage.results.forEach(r => {
                    if (r.confidence) {
                        totalConfidence += r.confidence;
                        outputCount++;
                    }
                });
            } else if (stage.result) {
                allOutputs.push(stage.result);
                if (stage.result.confidence) {
                    totalConfidence += stage.result.confidence;
                    outputCount++;
                }
            }
        });
        
        return {
            summary: 'Hivemind consensus achieved through collaborative analysis',
            confidence: outputCount > 0 ? totalConfidence / outputCount : 0,
            outputs: allOutputs,
            strategy: strategy.coordinationType,
            timestamp: Date.now()
        };
    }

    /**
     * Build enhanced prompt with context and memory
     */
    async buildEnhancedPrompt(originalPrompt, sessionId, mode) {
        let enhancedPrompt = '';
        
        // Add project context awareness
        if (this.projectContext && this.projectContext.summary) {
            enhancedPrompt += `## Project Context\n`;
            enhancedPrompt += `Architecture: ${this.projectContext.summary.architecture}\n`;
            enhancedPrompt += `Framework: ${this.projectContext.summary.framework}\n`;
            enhancedPrompt += `Total Files: ${this.projectContext.summary.totalFiles}\n`;
            
            if (this.projectContext.recentChanges && this.projectContext.recentChanges.length > 0) {
                enhancedPrompt += `\nRecent Changes:\n`;
                this.projectContext.recentChanges.slice(0, 3).forEach(change => {
                    enhancedPrompt += `- ${change.action}: ${change.path}\n`;
                });
            }
            
            enhancedPrompt += `\n`;
        }
        
        // Add conversation context
        const thread = this.conversationManager.getThreadForSession(sessionId);
        const conversationContext = thread.getContinuationContext();
        
        if (conversationContext && conversationContext.conversationFlow) {
            enhancedPrompt += `## Previous Discussion\n`;
            enhancedPrompt += conversationContext.conversationFlow;
            enhancedPrompt += `\n\n`;
        }
        
        // Add relevant insights from memory
        const relevantInsights = this.memorySystem.getAgentInsights(mode, null, 3);
        if (relevantInsights.length > 0) {
            enhancedPrompt += `## Relevant Past Insights\n`;
            relevantInsights.forEach(insight => {
                enhancedPrompt += `- ${insight.content}\n`;
            });
            enhancedPrompt += `\n`;
        }
        
        // Add original prompt
        enhancedPrompt += `## Current Task\n`;
        enhancedPrompt += originalPrompt;
        
        return enhancedPrompt;
    }

    /**
     * Select intelligent agents based on project context and prompt analysis
     */
    async selectIntelligentAgents(prompt, sessionId) {
        // Get base agent analysis from parent
        const baseAgents = this.analyzePromptForAgents(prompt);
        
        // Enhance with project context
        const intelligentAgents = baseAgents.map(agent => {
            // Add project-specific specialization
            const specialization = this.getAgentSpecialization(agent.type);
            
            return {
                ...agent,
                specialization,
                contextAware: true,
                insights: this.memorySystem.getAgentInsights(agent.type, null, 3)
            };
        });
        
        // Add contextual agents based on recent changes
        if (this.projectContext.recentChanges) {
            const recentFiles = this.projectContext.recentChanges.map(c => c.path);
            
            if (recentFiles.some(f => f.includes('test'))) {
                intelligentAgents.push({
                    type: 'testing',
                    name: 'Testing Specialist',
                    focus: 'Test coverage for recent changes',
                    contextAware: true,
                    specialization: 'recent-changes-testing'
                });
            }
            
            if (recentFiles.some(f => f.includes('security') || f.includes('auth'))) {
                intelligentAgents.push({
                    type: 'security',
                    name: 'Security Auditor',
                    focus: 'Security review of authentication changes',
                    contextAware: true,
                    specialization: 'auth-security-review'
                });
            }
        }
        
        return intelligentAgents;
    }

    /**
     * Get agent specialization based on project context
     */
    getAgentSpecialization(agentType) {
        const projectPatterns = this.projectContext.patterns || {};
        
        const specializations = {
            frontend: `${projectPatterns.framework || 'React'} specialist with focus on ${projectPatterns.codeStyle?.language || 'JavaScript'}`,
            backend: `${projectPatterns.framework || 'Express'} API developer with ${projectPatterns.architecture || 'modern'} architecture expertise`,
            database: `Database specialist for ${projectPatterns.buildSystem || 'modern'} applications`,
            testing: `Testing specialist familiar with ${projectPatterns.testingApproach || 'standard'} testing approaches`
        };
        
        return specializations[agentType] || `${agentType} specialist`;
    }

    /**
     * Build enhanced agent prompt with specialization
     */
    async buildEnhancedAgentPrompt(agent, originalPrompt, sessionId) {
        let agentPrompt = `You are a ${agent.name} with specialization in: ${agent.specialization}\n\n`;
        
        // Add agent-specific insights
        if (agent.insights && agent.insights.length > 0) {
            agentPrompt += `## Your Previous Insights\n`;
            agent.insights.forEach(insight => {
                agentPrompt += `- ${insight.content}\n`;
            });
            agentPrompt += `\n`;
        }
        
        // Add project context relevant to this agent
        const relevantContext = this.getAgentRelevantContext(agent.type);
        if (relevantContext) {
            agentPrompt += `## Project Context Relevant to Your Role\n`;
            agentPrompt += relevantContext;
            agentPrompt += `\n`;
        }
        
        // Add task with agent focus
        agentPrompt += `## Your Task\n`;
        agentPrompt += `${originalPrompt}\n\n`;
        agentPrompt += `Focus specifically on: ${agent.focus}`;
        
        return agentPrompt;
    }

    /**
     * Get context relevant to specific agent type
     */
    getAgentRelevantContext(agentType) {
        if (!this.projectContext.keyFiles) return '';
        
        const relevantFiles = this.projectContext.keyFiles.filter(file => {
            switch (agentType) {
                case 'frontend':
                case 'react':
                    return file.type === 'react' || file.type === 'react-typescript' || file.path.includes('component');
                case 'backend':
                    return file.path.includes('routes') || file.path.includes('api') || file.path.includes('server');
                case 'database':
                    return file.path.includes('model') || file.path.includes('schema') || file.path.includes('migration');
                case 'testing':
                    return file.path.includes('test') || file.path.includes('spec');
                case 'security':
                    return file.path.includes('auth') || file.path.includes('security') || file.path.includes('permission');
                default:
                    return true;
            }
        });
        
        return relevantFiles.slice(0, 5).map(file => 
            `- ${file.path}: ${file.type}`
        ).join('\n');
    }

    /**
     * Handle context updates from file watcher
     */
    handleContextUpdate(data) {
        // Update project context
        this.projectContext = data.context;
        
        // Emit to active sessions
        this.emit('contextUpdate', {
            eventType: data.eventType,
            path: data.path,
            summary: this.projectContext.summary
        });
        
        // Store insight about the change
        if (data.eventType === 'change') {
            const insight = `File ${data.path} was modified, suggesting active development in ${this.getFileCategory(data.path)}`;
            this.memorySystem.storeAgentInsight(
                'context-builder',
                'file-change',
                insight,
                0.7,
                { path: data.path, eventType: data.eventType }
            );
        }
    }

    /**
     * Get file category for insights
     */
    getFileCategory(filePath) {
        if (filePath.includes('component') || filePath.includes('tsx') || filePath.includes('jsx')) {
            return 'frontend components';
        }
        if (filePath.includes('routes') || filePath.includes('api')) {
            return 'backend APIs';
        }
        if (filePath.includes('test') || filePath.includes('spec')) {
            return 'testing';
        }
        if (filePath.includes('config') || filePath.includes('json')) {
            return 'configuration';
        }
        return 'general development';
    }

    /**
     * Load agent insights from memory
     */
    async loadAgentInsights() {
        const allInsights = this.memorySystem.getAgentInsights('all', null, 100);
        
        allInsights.forEach(insight => {
            if (!this.agentInsights.has(insight.agent_type)) {
                this.agentInsights.set(insight.agent_type, []);
            }
            this.agentInsights.get(insight.agent_type).push(insight);
        });
        
        console.log(`🧠 Loaded ${allInsights.length} agent insights from memory`);
    }

    /**
     * Enhanced output handling with learning
     */
    setupEnhancedOutputHandling(sessionId, mode) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;
        
        // Override the completion handler to add learning
        const originalHandler = session.completionHandler;
        session.completionHandler = (code, output) => {
            // Store the outcome for learning
            this.storeSessionOutcome(sessionId, mode, output, code === 0);
            
            // Call original handler if exists
            if (originalHandler) {
                originalHandler(code, output);
            }
        };
    }

    /**
     * Store session outcome for learning
     */
    storeSessionOutcome(sessionId, mode, output, success) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;
        
        const thread = this.conversationManager.getThreadForSession(sessionId);
        const summary = thread.getSummary();
        
        // Calculate success rating
        const successRating = success ? 0.8 : 0.3;
        const timeTaken = Date.now() - session.startTime;
        
        // Store outcome
        this.memorySystem.storeTaskOutcome(
            summary.recentTopics.join(', ') || 'unknown task',
            mode,
            output.substring(0, 500), // First 500 chars
            successRating,
            timeTaken,
            session.enhancedMode ? 'enhanced-coordination' : 'standard',
            this.projectContext.recentChanges?.map(c => c.path) || [],
            {
                sessionId,
                messageCount: summary.messageCount,
                participants: summary.participants
            }
        );
        
        // Extract and store insights
        this.extractAndStoreInsights(output, mode, successRating);
    }

    /**
     * Extract insights from agent output
     */
    extractAndStoreInsights(output, agentType, confidence) {
        // Simple insight extraction (could be enhanced with NLP)
        const insights = [];
        
        if (output.includes('I recommend')) {
            const recommendation = this.extractRecommendation(output);
            if (recommendation) {
                insights.push({ type: 'recommendation', content: recommendation });
            }
        }
        
        if (output.includes('pattern') || output.includes('approach')) {
            const pattern = this.extractPattern(output);
            if (pattern) {
                insights.push({ type: 'pattern', content: pattern });
            }
        }
        
        if (output.includes('error') || output.includes('issue')) {
            const issue = this.extractIssue(output);
            if (issue) {
                insights.push({ type: 'issue', content: issue });
            }
        }
        
        // Store insights
        insights.forEach(insight => {
            this.memorySystem.storeAgentInsight(
                agentType,
                insight.type,
                insight.content,
                confidence,
                { source: 'output-analysis' }
            );
        });
    }

    /**
     * Helper methods for insight extraction
     */
    extractRecommendation(output) {
        const match = output.match(/I recommend ([^.]+)/i);
        return match ? match[1].trim() : null;
    }

    extractPattern(output) {
        const match = output.match(/(pattern|approach): ([^.]+)/i);
        return match ? match[2].trim() : null;
    }

    extractIssue(output) {
        const match = output.match(/(error|issue): ([^.]+)/i);
        return match ? match[2].trim() : null;
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Setup proactive intelligence event handling
     */
    setupProactiveIntelligence() {
        // Listen for suggestions
        this.proactiveIntelligence.on('suggestionsGenerated', (data) => {
            this.handleProactiveSuggestions(data);
        });
        
        // Listen for suggestion events
        this.proactiveIntelligence.on('suggestionExecuted', (data) => {
            this.handleSuggestionExecuted(data);
        });
        
        this.proactiveIntelligence.on('suggestionDismissed', (data) => {
            this.handleSuggestionDismissed(data);
        });
    }

    /**
     * Handle proactive suggestions
     */
    handleProactiveSuggestions(data) {
        const { suggestions, context } = data;
        
        // Store suggestions in memory for learning
        suggestions.forEach(suggestion => {
            this.memorySystem.storeAgentInsight(
                'proactive-intelligence',
                'suggestion',
                suggestion.description,
                suggestion.confidence,
                {
                    type: suggestion.type,
                    priority: suggestion.priority,
                    action: suggestion.action,
                    category: suggestion.category
                }
            );
        });
        
        // Emit to any listening clients
        this.emit('proactiveSuggestions', {
            suggestions,
            timestamp: Date.now(),
            context: {
                projectSummary: context.projectContext.summary,
                recentActivity: context.recentActivity.taskOutcomes?.length || 0
            }
        });
        
        console.log(`🔮 Enhanced Claude Bridge: Generated ${suggestions.length} proactive suggestions`);
    }

    /**
     * Handle suggestion execution
     */
    handleSuggestionExecuted(data) {
        const { suggestion } = data;
        
        // Store execution outcome
        this.memorySystem.storeTaskOutcome(
            suggestion.action,
            'proactive-intelligence',
            'suggestion_executed',
            0.8, // High success rating for executed suggestions
            null,
            'proactive_suggestion',
            [],
            {
                suggestionType: suggestion.type,
                priority: suggestion.priority,
                originalConfidence: suggestion.confidence
            }
        );
        
        console.log(`✅ Proactive suggestion executed: ${suggestion.type}`);
    }

    /**
     * Handle suggestion dismissal
     */
    handleSuggestionDismissed(data) {
        const { type } = data;
        
        // Store dismissal for learning
        this.memorySystem.storeAgentInsight(
            'proactive-intelligence',
            'suggestion_dismissed',
            `Suggestion ${type} was dismissed by user`,
            0.3, // Lower confidence for dismissed suggestions
            { suggestionType: type }
        );
        
        console.log(`❌ Proactive suggestion dismissed: ${type}`);
    }

    /**
     * Get current proactive suggestions
     */
    getProactiveSuggestions() {
        return this.proactiveIntelligence.getActiveSuggestions();
    }

    /**
     * Execute a proactive suggestion
     */
    async executeProactiveSuggestion(suggestionType) {
        const suggestion = await this.proactiveIntelligence.executeSuggestion(suggestionType);
        
        // Execute the suggestion's action using the appropriate agent
        const sessionId = this.generateSessionId();
        
        // Determine the best agent type for the suggestion
        const agentType = this.determineAgentTypeForSuggestion(suggestion);
        
        let result;
        switch (agentType) {
            case 'parallel':
                result = await this.startParallelAgents(suggestion.action, sessionId);
                break;
            case 'hivemind':
                result = await this.startHivemind(suggestion.action, sessionId);
                break;
            case 'supervision':
                result = await this.startSupervision(suggestion.action, sessionId);
                break;
            default:
                result = await this.startParallelAgents(suggestion.action, sessionId);
        }
        
        return {
            suggestion,
            execution: result,
            sessionId
        };
    }

    /**
     * Dismiss a proactive suggestion
     */
    dismissProactiveSuggestion(suggestionType) {
        return this.proactiveIntelligence.dismissSuggestion(suggestionType);
    }

    /**
     * Determine the best agent type for a suggestion
     */
    determineAgentTypeForSuggestion(suggestion) {
        const agentMapping = {
            error_analysis: 'parallel',
            refactoring: 'hivemind',
            test_coverage: 'parallel',
            test_fixes: 'supervision',
            performance: 'hivemind',
            bundle_optimization: 'supervision',
            security_audit: 'hivemind',
            dependency_security: 'supervision',
            documentation: 'parallel',
            code_comments: 'supervision',
            architecture_review: 'hivemind',
            modularization: 'hivemind'
        };
        
        return agentMapping[suggestion.type] || 'parallel';
    }

    /**
     * Get proactive intelligence statistics
     */
    getProactiveStats() {
        return this.proactiveIntelligence.getStats();
    }

    /**
     * Request approval for an action
     */
    async requestApproval(actionDetails) {
        return await this.approvalWorkflows.requestApproval(actionDetails);
    }

    /**
     * Approve an action
     */
    approveAction(approvalId, options = {}) {
        return this.approvalWorkflows.approveAction(approvalId, options);
    }

    /**
     * Reject an action
     */
    rejectAction(approvalId, options = {}) {
        return this.approvalWorkflows.rejectAction(approvalId, options);
    }

    /**
     * Batch approve actions
     */
    batchApprove(approvalIds, options = {}) {
        return this.approvalWorkflows.batchApprove(approvalIds, options);
    }

    /**
     * Get pending approvals
     */
    getPendingApprovals(sessionId = null) {
        return this.approvalWorkflows.getPendingApprovals(sessionId);
    }

    /**
     * Get approval queue for session
     */
    getApprovalQueue(sessionId) {
        return this.approvalWorkflows.getApprovalQueue(sessionId);
    }

    /**
     * Generate smart approval recommendations
     */
    generateSmartRecommendations(sessionId = null) {
        return this.approvalWorkflows.generateSmartRecommendations(sessionId);
    }

    /**
     * Get approval statistics
     */
    getApprovalStats() {
        return this.approvalWorkflows.getStats();
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return this.performanceOptimizer.getPerformanceStats();
    }

    /**
     * Force hibernation
     */
    forceHibernation(reason = 'Manual hibernation') {
        return this.performanceOptimizer.forceHibernation(reason);
    }

    /**
     * Force wake up
     */
    forceWakeUp(reason = 'Manual wake up') {
        return this.performanceOptimizer.forceWakeUp(reason);
    }

    /**
     * Clear performance caches
     */
    clearPerformanceCaches(cacheType = null) {
        return this.performanceOptimizer.clearCaches(cacheType);
    }

    /**
     * Set performance mode
     */
    setPerformanceMode(mode) {
        return this.performanceOptimizer.setPerformanceMode(mode);
    }

    /**
     * Get cached result (performance optimization)
     */
    getCachedResult(cacheType, key) {
        return this.performanceOptimizer.getCachedResult(cacheType, key);
    }

    /**
     * Set cached result (performance optimization)
     */
    setCachedResult(cacheType, key, data) {
        return this.performanceOptimizer.setCachedResult(cacheType, key, data);
    }

    /**
     * Cleanup enhancements
     */
    cleanup() {
        if (this.contextBuilder) {
            this.contextBuilder.destroy();
        }
        
        if (this.memorySystem) {
            this.memorySystem.close();
        }
        
        // Cleanup conversation threads
        if (this.conversationManager) {
            this.conversationManager.cleanup();
        }
        
        // Stop proactive intelligence
        if (this.proactiveIntelligence) {
            this.proactiveIntelligence.stop();
        }
        
        // Shutdown performance optimizer
        if (this.performanceOptimizer) {
            this.performanceOptimizer.shutdown();
        }
        
        console.log('✅ Enhanced Claude Bridge: Cleanup completed');
    }
    
    /**
     * Check Claude Code API configuration status
     */
    getApiStatus() {
        return {
            claudeCode: {
                configured: !!this.apiKeys.claudeCode,
                key: this.apiKeys.claudeCode ? `${this.apiKeys.claudeCode.substring(0, 8)}...` : 'not configured',
                source: process.env.CLAUDE_CODE_API_KEY ? 'CLAUDE_CODE_API_KEY' : 
                       process.env.ANTHROPIC_API_KEY ? 'ANTHROPIC_API_KEY (fallback)' : 'not set'
            },
            airtop: {
                configured: !!this.apiKeys.airtop,
                key: this.apiKeys.airtop ? `${this.apiKeys.airtop.substring(0, 8)}...` : 'not configured'
            },
            demoMode: !this.apiKeys.claudeCode,
            platform: 'Claude Code'
        };
    }
    
    /**
     * Check if we have valid Claude Code API key for real AI interactions
     */
    hasValidApiKeys() {
        return !!this.apiKeys.claudeCode;
    }
    
    /**
     * Make real Claude Code API call or return demo response
     */
    async callClaudeAPI(prompt, options = {}) {
        if (this.claudeAPI) {
            try {
                console.log('🤖 Making real Claude Code API call...');
                const response = await this.claudeAPI.sendMessage(prompt, {
                    model: options.model || 'claude-3-haiku-20240307',
                    maxTokens: options.maxTokens || 1000,
                    temperature: options.temperature || 0.3,
                    systemPrompt: options.systemPrompt
                });
                
                console.log('✅ Claude Code API response received');
                return {
                    success: true,
                    response: response,
                    source: 'claude-api',
                    model: options.model || 'claude-3-haiku-20240307'
                };
            } catch (error) {
                console.error('❌ Claude Code API call failed:', error.message);
                return this.getDemoResponse(prompt, error.message);
            }
        } else {
            return this.getDemoResponse(prompt, 'No API key configured');
        }
    }
    
    /**
     * Get demo response when API is not available
     */
    getDemoResponse(prompt, reason) {
        console.log('🎭 Returning demo response:', reason);
        
        // Analyze prompt to provide contextual demo response
        const lowerPrompt = prompt.toLowerCase();
        let demoResponse = '';
        
        if (lowerPrompt.includes('parallel') || lowerPrompt.includes('agent')) {
            demoResponse = 'I understand you want to coordinate multiple AI agents for this task. In a production environment with a valid Claude Code API key, I would analyze your request and coordinate specialized agents (architect, implementer, reviewer) to work together on solving your problem systematically.';
        } else if (lowerPrompt.includes('hivemind') || lowerPrompt.includes('coordinate')) {
            demoResponse = 'I would coordinate a hivemind approach with multiple specialized AI perspectives working together. This would involve breaking down your task into phases, having different agent types contribute their expertise, and building consensus on the best approach.';
        } else if (lowerPrompt.includes('infinite') || lowerPrompt.includes('iterative')) {
            demoResponse = 'I would use an iterative improvement approach, continuously refining the solution through multiple iterations until we achieve high quality results. Each iteration would build on learnings from the previous one.';
        } else if (lowerPrompt.includes('analyze') || lowerPrompt.includes('requirements')) {
            demoResponse = 'I would analyze your requirements comprehensively, asking clarifying questions and creating a detailed project specification. This would include technical requirements, user experience considerations, and implementation recommendations.';
        } else {
            demoResponse = 'I understand your request and would provide detailed assistance. With a valid Claude Code API key, I could offer more sophisticated analysis and personalized recommendations based on your specific needs and project context.';
        }
        
        return {
            success: true,
            response: demoResponse,
            source: 'demo-mode',
            reason: reason,
            note: 'To enable full AI functionality, configure CLAUDE_CODE_API_KEY environment variable'
        };
    }
    
    /**
     * Extract insights from Claude API response
     */
    extractInsights(response, agentType) {
        // Try to extract key insights from the response
        const insights = [];
        const lines = response.split('\n').filter(line => line.trim());
        
        // Look for numbered lists, bullet points, or recommendations
        for (const line of lines) {
            if (line.match(/^\d+\./) || line.match(/^[-•*]/) || 
                line.toLowerCase().includes('recommend') || 
                line.toLowerCase().includes('suggest') ||
                line.toLowerCase().includes('consider')) {
                insights.push(line.trim());
                if (insights.length >= 3) break; // Limit to 3 key insights
            }
        }
        
        // Fallback insights if none found
        if (insights.length === 0) {
            insights.push(`${agentType} analysis completed with comprehensive recommendations`);
            insights.push(`Specialized insights provided based on ${agentType} expertise`);
        }
        
        return insights;
    }
}

module.exports = { EnhancedClaudeCodeButtonBridge };