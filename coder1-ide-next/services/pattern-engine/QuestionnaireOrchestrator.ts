/**
 * Questionnaire Orchestrator - Smart questionnaire generation and management
 *
 * This orchestrator manages the complete questionnaire flow:
 * - Pattern-based question generation
 * - Adaptive follow-up questions
 * - Answer validation and analysis
 * - Intelligent completion detection
 *
 * Features:
 * - Smart question selection based on user context
 * - Dynamic question generation from multiple patterns
 * - Answer analysis and confidence scoring
 * - Completion optimization (5-8 questions max)
 */

import { EventEmitter } from 'events';
import { PatternEngine, Pattern, PatternEngineOptions } from './PatternEngine';
import { QuestionEngine, Question, Questionnaire, QuestionEngineOptions } from './QuestionEngine';

// ================================
// Type Definitions
// ================================

export type SessionStatus = 'pattern-selection' | 'pattern-refinement' | 'completion-check' | 'completed';

export interface OrchestratorOptions extends PatternEngineOptions, QuestionEngineOptions {
    patternEngine?: PatternEngine;
    questionEngine?: QuestionEngine;
}

export interface OrchestratorConfig {
    maxQuestions: number;
    minQuestions: number;
    confidenceThreshold: number;
    enableAdaptiveFollowups: boolean;
    enablePatternMixing: boolean;
}

export interface UserContext {
    category?: string;
    tags?: string[];
    description?: string;
    complexity?: string;
    businessModel?: string;
}

export interface QuestionnaireSession {
    id: string;
    userContext: UserContext;
    answers: Record<string, unknown>;
    questionHistory: Question[];
    currentQuestionIndex: number;
    candidatePatterns: Pattern[];
    selectedPattern: Pattern | null;
    confidenceScore: number;
    startTime: number;
    lastActivity: number;
    status: SessionStatus;
    completedAt?: number;
}

export interface SessionSummary {
    sessionId: string;
    status: SessionStatus;
    selectedPattern: Pattern | null;
    answers: Record<string, unknown>;
    questionCount: number;
    confidenceScore: number;
    duration: number;
    completedAt: string | null;
}

export interface SubmitAnswerResult {
    success: boolean;
    sessionStatus: SessionStatus;
}

export interface ActiveSessionInfo {
    id: string;
    status: SessionStatus;
    questionCount: number;
    lastActivity: number;
}

// ================================
// Questionnaire Orchestrator Class
// ================================

export class QuestionnaireOrchestrator extends EventEmitter {
    private logger: Console;
    private patternEngine: PatternEngine;
    private questionEngine: QuestionEngine;

    // Active questionnaire sessions
    private sessions: Map<string, QuestionnaireSession> = new Map();

    // Configuration
    private config: OrchestratorConfig = {
        maxQuestions: 8,
        minQuestions: 3,
        confidenceThreshold: 0.8,
        enableAdaptiveFollowups: true,
        enablePatternMixing: true
    };

    constructor(options: OrchestratorOptions = {}) {
        super();

        this.logger = options.logger || console;
        this.patternEngine = options.patternEngine || new PatternEngine(options);
        this.questionEngine = options.questionEngine || new QuestionEngine(options);

        this.logger.info('🎯 Questionnaire Orchestrator initialized');
    }

    /**
     * Initialize the orchestrator
     */
    async initialize(): Promise<boolean> {
        try {
            await this.patternEngine.initialize();

            this.logger.info('✅ Questionnaire Orchestrator ready');
            this.emit('ready');

            return true;
        } catch (error) {
            this.logger.error('❌ Questionnaire Orchestrator initialization failed:', error);
            throw error;
        }
    }

    /**
     * Start a new questionnaire session
     */
    async startQuestionnaire(sessionId: string, userContext: UserContext = {}): Promise<QuestionnaireSession> {
        try {
            const session: QuestionnaireSession = {
                id: sessionId,
                userContext,
                answers: {},
                questionHistory: [],
                currentQuestionIndex: 0,
                candidatePatterns: [],
                selectedPattern: null,
                confidenceScore: 0,
                startTime: Date.now(),
                lastActivity: Date.now(),
                status: 'pattern-selection'
            };

            // Find candidate patterns based on initial context
            if (userContext.category || userContext.tags || userContext.description) {
                session.candidatePatterns = await this.findCandidatePatterns(userContext);
            }

            this.sessions.set(sessionId, session);

            this.logger.info(`🎯 Started questionnaire session ${sessionId}`);
            this.emit('session-started', { sessionId, session });

            return session;
        } catch (error) {
            this.logger.error(`Failed to start questionnaire session ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Find candidate patterns based on user context
     */
    private async findCandidatePatterns(userContext: UserContext): Promise<Pattern[]> {
        const requirements = {
            category: userContext.category,
            tags: userContext.tags || [],
            complexity: userContext.complexity,
            businessModel: userContext.businessModel,
            limit: 5 // Top 5 candidate patterns
        };

        const patterns = await this.patternEngine.findPatterns(requirements);

        this.logger.info(`🔍 Found ${patterns.length} candidate patterns`);

        return patterns;
    }

    /**
     * Get the next question for a session
     */
    async getNextQuestion(sessionId: string): Promise<Question | null> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        session.lastActivity = Date.now();

        try {
            let question: Question | null = null;

            switch (session.status) {
                case 'pattern-selection':
                    question = await this.getPatternSelectionQuestion(session);
                    break;
                case 'pattern-refinement':
                    question = await this.getPatternRefinementQuestion(session);
                    break;
                case 'completion-check':
                    question = await this.getCompletionQuestion(session);
                    break;
                case 'completed':
                    return null; // No more questions
                default:
                    throw new Error(`Unknown session status: ${session.status}`);
            }

            if (question) {
                session.questionHistory.push(question);
                session.currentQuestionIndex++;
            }

            this.sessions.set(sessionId, session);
            return question;

        } catch (error) {
            this.logger.error(`Failed to get next question for session ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Get pattern selection question
     */
    private async getPatternSelectionQuestion(session: QuestionnaireSession): Promise<Question> {
        // If we already have candidate patterns, create a selection question
        if (session.candidatePatterns.length > 0) {
            return {
                id: 'pattern-selection',
                type: 'choice',
                text: 'Which type of application best describes what you want to build?',
                choices: session.candidatePatterns.map(pattern => ({
                    value: pattern.id,
                    label: pattern.metadata.name,
                    description: pattern.description,
                    impact: `Success rate: ${Math.round((pattern.metadata.successRate || 0) * 100)}%, Avg time to PMF: ${pattern.metadata.avgTimeToPMF || 'N/A'}`
                })),
                category: 'pattern-selection',
                priority: 1,
                required: true
            };
        }

        // Otherwise, create a general category question
        return {
            id: 'general-category',
            type: 'choice',
            text: 'What category of application do you want to build?',
            choices: [
                { value: 'saas', label: 'SaaS Platform', description: 'Software as a Service with subscriptions' },
                { value: 'ecommerce', label: 'E-commerce Platform', description: 'Online store or marketplace' },
                { value: 'collaboration', label: 'Collaboration Tool', description: 'Team productivity and communication' },
                { value: 'devtools', label: 'Developer Tools', description: 'Tools for developers and technical teams' },
                { value: 'social', label: 'Social Platform', description: 'Community and social networking' },
                { value: 'analytics', label: 'Analytics Platform', description: 'Data analysis and reporting' },
                { value: 'marketplace', label: 'Marketplace', description: 'Two-sided market connecting buyers and sellers' },
                { value: 'other', label: 'Other', description: 'Something else or unsure' }
            ],
            category: 'pattern-selection',
            priority: 1,
            required: true
        };
    }

    /**
     * Get pattern refinement question
     */
    private async getPatternRefinementQuestion(session: QuestionnaireSession): Promise<Question | null> {
        if (!session.selectedPattern) {
            throw new Error('No pattern selected for refinement questions');
        }

        const pattern = session.selectedPattern;

        // Generate questions based on the selected pattern
        const questionnaire: Questionnaire = await this.questionEngine.generateQuestionnaire(pattern, {
            userAnswers: session.answers
        });

        // Get the next unanswered question
        const nextQuestion = await this.questionEngine.getNextQuestion(questionnaire, session.answers);

        if (!nextQuestion) {
            // No more pattern questions, move to completion check
            session.status = 'completion-check';
            return this.getCompletionQuestion(session);
        }

        return nextQuestion;
    }

    /**
     * Get completion question if needed
     */
    private async getCompletionQuestion(session: QuestionnaireSession): Promise<Question | null> {
        const confidence = this.calculateSessionConfidence(session);

        // If confidence is high enough, complete the session
        if (confidence >= this.config.confidenceThreshold) {
            session.status = 'completed';
            session.confidenceScore = confidence;
            return null;
        }

        // If we've asked enough questions, complete anyway
        if (session.questionHistory.length >= this.config.maxQuestions) {
            session.status = 'completed';
            session.confidenceScore = confidence;
            return null;
        }

        // Generate an adaptive follow-up question
        return this.generateAdaptiveFollowup(session);
    }

    /**
     * Submit an answer for a question
     */
    async submitAnswer(sessionId: string, questionId: string, answer: unknown): Promise<SubmitAnswerResult> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        try {
            // Find the question to validate the answer
            const question = session.questionHistory.find(q => q.id === questionId);
            if (!question) {
                throw new Error(`Question ${questionId} not found in session history`);
            }

            // Validate the answer
            const isValid = this.questionEngine.validateAnswer(question, answer);
            if (!isValid) {
                throw new Error('Invalid answer format');
            }

            // Store the answer
            session.answers[questionId] = answer;
            session.lastActivity = Date.now();

            // Handle special questions
            await this.handleSpecialAnswers(session, questionId, answer);

            this.sessions.set(sessionId, session);

            this.logger.info(`📝 Answer submitted for ${sessionId}: ${questionId} = ${JSON.stringify(answer)}`);
            this.emit('answer-submitted', { sessionId, questionId, answer });

            return { success: true, sessionStatus: session.status };

        } catch (error) {
            this.logger.error(`Failed to submit answer for session ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Handle special answer logic
     */
    private async handleSpecialAnswers(session: QuestionnaireSession, questionId: string, answer: unknown): Promise<void> {
        switch (questionId) {
            case 'pattern-selection':
                // User selected a specific pattern
                session.selectedPattern = session.candidatePatterns.find(p => p.id === answer) || null;
                session.status = 'pattern-refinement';
                break;

            case 'general-category':
                // Find patterns for the selected category
                session.candidatePatterns = await this.patternEngine.findPatterns({
                    category: answer as string,
                    limit: 3
                });

                if (session.candidatePatterns.length === 1) {
                    // Only one pattern for this category, select it automatically
                    session.selectedPattern = session.candidatePatterns[0];
                    session.status = 'pattern-refinement';
                } else if (session.candidatePatterns.length > 1) {
                    // Multiple patterns, need selection question
                    session.status = 'pattern-selection';
                } else {
                    // No specific patterns, use general questions
                    session.status = 'completion-check';
                }
                break;
        }
    }

    /**
     * Calculate session confidence score
     */
    private calculateSessionConfidence(session: QuestionnaireSession): number {
        const baseConfidence = 0.5;
        let confidence = baseConfidence;

        // Pattern selection adds confidence
        if (session.selectedPattern) {
            confidence += 0.3;
        }

        // Each answered question adds confidence
        const questionCount = Object.keys(session.answers).length;
        confidence += (questionCount * 0.05);

        // High-priority questions add more confidence
        for (const question of session.questionHistory) {
            if (session.answers[question.id] && question.priority <= 2) {
                confidence += 0.1;
            }
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * Generate adaptive follow-up question
     */
    private generateAdaptiveFollowup(session: QuestionnaireSession): Question | null {
        const answers = session.answers;

        // Generate contextual follow-up questions based on answers
        if (answers['business-model'] === 'freemium' && !answers['monetization-strategy']) {
            return {
                id: 'monetization-strategy',
                type: 'choice',
                text: 'How will you convert free users to paid users?',
                choices: [
                    { value: 'usage-limits', label: 'Usage limits (storage, features)', impact: 'Metering system, usage tracking' },
                    { value: 'premium-features', label: 'Premium features only', impact: 'Feature gating, tier management' },
                    { value: 'support-priority', label: 'Priority support and SLA', impact: 'Support system, SLA tracking' },
                    { value: 'advanced-analytics', label: 'Advanced analytics and insights', impact: 'Analytics platform, reporting system' }
                ],
                category: 'business',
                priority: 2,
                required: false
            };
        }

        if (answers['user-scale'] === 'large' && !answers['infrastructure-preferences']) {
            return {
                id: 'infrastructure-preferences',
                type: 'choice',
                text: 'What are your infrastructure preferences for scaling?',
                choices: [
                    { value: 'cloud-native', label: 'Cloud-native (AWS, GCP, Azure)', impact: 'Container orchestration, auto-scaling' },
                    { value: 'serverless', label: 'Serverless architecture', impact: 'Function-based architecture, event-driven design' },
                    { value: 'hybrid', label: 'Hybrid cloud and on-premise', impact: 'Multi-cloud strategy, data sovereignty' },
                    { value: 'edge-computing', label: 'Edge computing for global scale', impact: 'CDN integration, edge processing' }
                ],
                category: 'technical',
                priority: 3,
                required: false
            };
        }

        // Default completion
        session.status = 'completed';
        return null;
    }

    /**
     * Get session summary
     */
    getSessionSummary(sessionId: string): SessionSummary {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        return {
            sessionId,
            status: session.status,
            selectedPattern: session.selectedPattern,
            answers: session.answers,
            questionCount: session.questionHistory.length,
            confidenceScore: session.confidenceScore,
            duration: Date.now() - session.startTime,
            completedAt: session.status === 'completed' ? new Date().toISOString() : null
        };
    }

    /**
     * Complete a questionnaire session
     */
    async completeSession(sessionId: string): Promise<SessionSummary> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        session.status = 'completed';
        session.confidenceScore = this.calculateSessionConfidence(session);
        session.completedAt = Date.now();

        this.sessions.set(sessionId, session);

        this.logger.info(`✅ Completed questionnaire session ${sessionId} with confidence ${session.confidenceScore}`);
        this.emit('session-completed', { sessionId, session });

        return this.getSessionSummary(sessionId);
    }

    /**
     * Clean up expired sessions
     */
    cleanupSessions(): void {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        const sessionEntries = Array.from(this.sessions.entries());
        for (const [sessionId, session] of sessionEntries) {
            if (now - session.lastActivity > maxAge) {
                this.sessions.delete(sessionId);
                this.logger.info(`🧹 Cleaned up expired session ${sessionId}`);
            }
        }
    }

    /**
     * Get all active sessions
     */
    getActiveSessions(): ActiveSessionInfo[] {
        const entries = Array.from(this.sessions.entries());
        return entries.map(([id, session]) => ({
            id,
            status: session.status,
            questionCount: session.questionHistory.length,
            lastActivity: session.lastActivity
        }));
    }

    /**
     * Get a specific session
     */
    getSession(sessionId: string): QuestionnaireSession | undefined {
        return this.sessions.get(sessionId);
    }
}

export default QuestionnaireOrchestrator;
