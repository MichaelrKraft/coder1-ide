/**
 * Question Engine - Intelligent questionnaire generation system
 *
 * This engine creates adaptive questions based on selected patterns and user responses.
 * It learns from previous answers to ask increasingly relevant questions.
 *
 * Features:
 * - Dynamic question generation based on patterns
 * - Adaptive follow-up questions
 * - Context-aware question ordering
 * - Impact preview for technical decisions
 */

import { EventEmitter } from 'events';
import type { Pattern, PatternQuestion } from './PatternEngine';

// ================================
// Type Definitions
// ================================

export type QuestionType = 'boolean' | 'choice' | 'scale' | 'text' | 'multiple';

export interface Choice {
    value: string;
    label: string;
    description?: string;
    impact?: string;
}

export interface Question {
    id: string;
    type: QuestionType;
    text: string;
    choices?: Choice[];
    category: string;
    priority: number;
    impact?: string;
    dependencies?: string[];
    required: boolean;
    // Type-specific properties
    allowMultiple?: boolean;
    min?: number;
    max?: number;
    labels?: Record<string, string>;
    placeholder?: string;
    maxLength?: number;
    minChoices?: number;
    maxChoices?: number;
}

export interface QuestionRule {
    priority: number;
    conditions: string[];
    impacts: string[];
}

export interface QuestionTypeHandler {
    generate: (def: PatternQuestion | QuestionDefinition) => Question;
    validate: (question: Question, answer: unknown) => boolean;
}

export interface QuestionDefinition {
    id: string;
    type: QuestionType;
    text?: string;
    question?: string;
    choices?: Choice[];
    category?: string;
    priority?: number;
    impact?: string;
    dependencies?: string[];
    required?: boolean;
    allowMultiple?: boolean;
    min?: number;
    max?: number;
    labels?: Record<string, string>;
    placeholder?: string;
    maxLength?: number;
    minChoices?: number;
    maxChoices?: number;
}

export interface Questionnaire {
    questions: Question[];
    estimatedTime: number;
    context: QuestionnaireContext;
}

export interface QuestionnaireContext {
    pattern: Pattern;
    userAnswers: Record<string, unknown>;
}

export interface UserContext {
    userAnswers?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface QuestionEngineOptions {
    logger?: Console;
}

// ================================
// Question Engine Class
// ================================

export class QuestionEngine extends EventEmitter {
    private logger: Console;

    // Question types and their handlers
    private questionTypes: Map<QuestionType, QuestionTypeHandler> = new Map();

    // Question generation rules
    private rules: Map<string, QuestionRule> = new Map();

    constructor(options: QuestionEngineOptions = {}) {
        super();

        this.logger = options.logger || console;

        this.registerQuestionTypes();
        this.loadRules();

        this.logger.info('❓ Question Engine initialized');
    }

    /**
     * Register built-in question types
     */
    private registerQuestionTypes(): void {
        this.questionTypes.set('boolean', {
            generate: this.generateBooleanQuestion.bind(this),
            validate: this.validateBooleanAnswer.bind(this)
        });

        this.questionTypes.set('choice', {
            generate: this.generateChoiceQuestion.bind(this),
            validate: this.validateChoiceAnswer.bind(this)
        });

        this.questionTypes.set('scale', {
            generate: this.generateScaleQuestion.bind(this),
            validate: this.validateScaleAnswer.bind(this)
        });

        this.questionTypes.set('text', {
            generate: this.generateTextQuestion.bind(this),
            validate: this.validateTextAnswer.bind(this)
        });

        this.questionTypes.set('multiple', {
            generate: this.generateMultipleQuestion.bind(this),
            validate: this.validateMultipleAnswer.bind(this)
        });
    }

    /**
     * Load question generation rules
     */
    private loadRules(): void {
        // Business model rules
        this.rules.set('business-model', {
            priority: 1,
            conditions: ['always'],
            impacts: ['pricing-architecture', 'user-management', 'analytics']
        });

        // Scale rules
        this.rules.set('user-scale', {
            priority: 2,
            conditions: ['always'],
            impacts: ['database-choice', 'caching-strategy', 'infrastructure']
        });

        // Real-time features
        this.rules.set('realtime-features', {
            priority: 3,
            conditions: ['category:collaboration', 'category:social'],
            impacts: ['websocket-architecture', 'database-triggers', 'caching']
        });

        // Payment processing
        this.rules.set('payment-complexity', {
            priority: 2,
            conditions: ['business-model:paid', 'category:saas', 'category:ecommerce'],
            impacts: ['payment-provider', 'subscription-management', 'compliance']
        });

        // Authentication complexity
        this.rules.set('auth-requirements', {
            priority: 2,
            conditions: ['user-scale:medium', 'user-scale:large'],
            impacts: ['auth-provider', 'session-management', 'security-features']
        });

        // Integration needs
        this.rules.set('integration-scope', {
            priority: 3,
            conditions: ['category:productivity', 'category:devtools'],
            impacts: ['api-design', 'webhook-system', 'third-party-apis']
        });
    }

    /**
     * Generate questions for a specific pattern
     */
    async generateQuestionnaire(pattern: Pattern, userContext: UserContext = {}): Promise<Questionnaire> {
        try {
            const questions: Question[] = [];
            const context: QuestionnaireContext = {
                pattern,
                userAnswers: {},
                ...userContext
            };

            // Start with pattern-specific questions
            const patternQuestions = this.generatePatternQuestions(pattern);
            questions.push(...patternQuestions);

            // Add conditional questions based on rules
            const conditionalQuestions = this.generateConditionalQuestions(pattern, context);
            questions.push(...conditionalQuestions);

            // Sort by priority and remove duplicates
            const sortedQuestions = this.prioritizeQuestions(questions);

            // Limit to optimal number of questions (5-8)
            const finalQuestions = sortedQuestions.slice(0, 8);

            this.logger.info(`❓ Generated ${finalQuestions.length} questions for pattern ${pattern.id}`);

            return {
                questions: finalQuestions,
                estimatedTime: finalQuestions.length * 30, // 30 seconds per question
                context
            };

        } catch (error) {
            this.logger.error('Failed to generate questionnaire:', error);
            throw error;
        }
    }

    /**
     * Generate questions from pattern definition
     */
    private generatePatternQuestions(pattern: Pattern): Question[] {
        const questions: Question[] = [];

        if (!pattern.questions || !Array.isArray(pattern.questions)) {
            return questions;
        }

        for (const questionDef of pattern.questions) {
            try {
                const question = this.createQuestion(questionDef);
                if (question) {
                    questions.push(question);
                }
            } catch (error) {
                const err = error as Error;
                this.logger.warn(`Failed to create question ${questionDef.id}:`, err.message);
            }
        }

        return questions;
    }

    /**
     * Generate conditional questions based on rules
     */
    private generateConditionalQuestions(pattern: Pattern, context: QuestionnaireContext): Question[] {
        const questions: Question[] = [];

        const ruleEntries = Array.from(this.rules.entries());
        for (const [ruleId, rule] of ruleEntries) {
            if (this.shouldApplyRule(rule, pattern, context)) {
                const question = this.generateRuleBasedQuestion(ruleId);
                if (question) {
                    questions.push(question);
                }
            }
        }

        return questions;
    }

    /**
     * Check if a rule should apply to this pattern/context
     */
    private shouldApplyRule(rule: QuestionRule, pattern: Pattern, context: QuestionnaireContext): boolean {
        if (!rule.conditions) return false;

        for (const condition of rule.conditions) {
            if (condition === 'always') {
                return true;
            }

            // Category conditions
            if (condition.startsWith('category:')) {
                const requiredCategory = condition.split(':')[1];
                if (pattern.metadata.category === requiredCategory) {
                    return true;
                }
            }

            // Business model conditions
            if (condition.startsWith('business-model:')) {
                const requiredModel = condition.split(':')[1];
                if (context.userAnswers?.['business-model'] === requiredModel) {
                    return true;
                }
            }

            // Scale conditions
            if (condition.startsWith('user-scale:')) {
                const requiredScale = condition.split(':')[1];
                if (context.userAnswers?.['user-scale'] === requiredScale) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Generate a question based on a rule
     */
    private generateRuleBasedQuestion(ruleId: string): Question | null {
        const questionTemplates: Record<string, Question> = {
            'business-model': {
                id: 'business-model',
                type: 'choice',
                text: 'How will you monetize this application?',
                choices: [
                    { value: 'free', label: 'Free (ad-supported or lead generation)', impact: 'Simple architecture, focus on analytics' },
                    { value: 'freemium', label: 'Freemium (basic free, premium paid)', impact: 'User tier management, feature gating' },
                    { value: 'subscription', label: 'Subscription-based (monthly/yearly)', impact: 'Recurring billing, subscription management' },
                    { value: 'usage', label: 'Usage-based pricing', impact: 'Metering, complex billing calculations' },
                    { value: 'marketplace', label: 'Marketplace (commission-based)', impact: 'Multi-user payments, escrow, reporting' }
                ],
                category: 'business',
                priority: 1,
                impact: 'Affects payment architecture, user management, and analytics needs',
                required: true
            },

            'user-scale': {
                id: 'user-scale',
                type: 'choice',
                text: 'What scale of users do you expect?',
                choices: [
                    { value: 'small', label: '10-100 users (team/small company)', impact: 'Simple hosting, basic database' },
                    { value: 'medium', label: '100-10K users (growing startup)', impact: 'Scalable architecture, performance optimization' },
                    { value: 'large', label: '10K+ users (established product)', impact: 'Enterprise architecture, high availability' }
                ],
                category: 'technical',
                priority: 2,
                impact: 'Determines database choice, caching strategy, and infrastructure needs',
                required: true
            },

            'realtime-features': {
                id: 'realtime-features',
                type: 'boolean',
                text: 'Do you need real-time features like live collaboration or instant messaging?',
                category: 'functional',
                priority: 3,
                impact: 'Requires WebSocket implementation, affects database design and caching',
                required: true
            },

            'payment-complexity': {
                id: 'payment-complexity',
                type: 'choice',
                text: 'How complex are your payment requirements?',
                choices: [
                    { value: 'simple', label: 'Simple payments (one-time or basic subscriptions)', impact: 'Standard Stripe integration' },
                    { value: 'complex', label: 'Complex billing (usage-based, multi-tier)', impact: 'Advanced billing system, metering' },
                    { value: 'marketplace', label: 'Marketplace payments (split payments)', impact: 'Multi-party payments, escrow, reporting' }
                ],
                category: 'business',
                priority: 2,
                impact: 'Affects payment provider choice and billing architecture complexity',
                required: true
            },

            'auth-requirements': {
                id: 'auth-requirements',
                type: 'multiple',
                text: 'What authentication features do you need?',
                choices: [
                    { value: 'email-password', label: 'Email/password login' },
                    { value: 'social', label: 'Social login (Google, GitHub, etc.)' },
                    { value: 'sso', label: 'Single Sign-On (SSO) for enterprise' },
                    { value: 'mfa', label: 'Multi-factor authentication' },
                    { value: 'magic-links', label: 'Magic link login' }
                ],
                category: 'security',
                priority: 2,
                impact: 'Determines auth provider choice and security implementation',
                required: true,
                minChoices: 0,
                maxChoices: 5
            },

            'integration-scope': {
                id: 'integration-scope',
                type: 'choice',
                text: 'How important are third-party integrations?',
                choices: [
                    { value: 'none', label: 'No integrations needed', impact: 'Simple, self-contained system' },
                    { value: 'basic', label: 'A few key integrations (Google, Slack)', impact: 'Standard OAuth and API integrations' },
                    { value: 'extensive', label: 'Many integrations (Zapier-style)', impact: 'Robust webhook system, integration marketplace' }
                ],
                category: 'functional',
                priority: 3,
                impact: 'Affects API design, webhook architecture, and development complexity',
                required: true
            }
        };

        return questionTemplates[ruleId] || null;
    }

    /**
     * Create a question object from definition
     */
    private createQuestion(questionDef: PatternQuestion | QuestionDefinition): Question {
        const questionType = this.questionTypes.get(questionDef.type as QuestionType);
        if (!questionType) {
            throw new Error(`Unknown question type: ${questionDef.type}`);
        }

        return questionType.generate(questionDef);
    }

    /**
     * Prioritize questions by importance and dependencies
     */
    private prioritizeQuestions(questions: Question[]): Question[] {
        return questions.sort((a, b) => {
            // Sort by priority (lower number = higher priority)
            if (a.priority !== b.priority) {
                return (a.priority || 5) - (b.priority || 5);
            }

            // Then by category importance
            const categoryPriority: Record<string, number> = {
                'business': 1,
                'technical': 2,
                'functional': 3,
                'security': 4,
                'other': 5
            };

            const aPriority = categoryPriority[a.category] || 5;
            const bPriority = categoryPriority[b.category] || 5;

            return aPriority - bPriority;
        });
    }

    /**
     * Generate next question based on previous answers
     */
    async getNextQuestion(questionnaire: Questionnaire, userAnswers: Record<string, unknown>): Promise<Question | null> {
        const answeredQuestions = new Set(Object.keys(userAnswers));
        const remainingQuestions = questionnaire.questions.filter(q =>
            !answeredQuestions.has(q.id)
        );

        if (remainingQuestions.length === 0) {
            return null; // Questionnaire complete
        }

        // Find the next question considering dependencies
        for (const question of remainingQuestions) {
            if (this.areQuestionDependenciesMet(question, userAnswers)) {
                return question;
            }
        }

        // If no dependencies are met, return first remaining question
        return remainingQuestions[0];
    }

    /**
     * Check if question dependencies are satisfied
     */
    private areQuestionDependenciesMet(question: Question, userAnswers: Record<string, unknown>): boolean {
        if (!question.dependencies) {
            return true;
        }

        for (const dependency of question.dependencies) {
            const [questionId, expectedValue] = dependency.split(':');
            if (userAnswers[questionId] !== expectedValue) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validate user answer for a question
     */
    validateAnswer(question: Question, answer: unknown): boolean {
        const questionType = this.questionTypes.get(question.type);
        if (!questionType) {
            throw new Error(`Unknown question type: ${question.type}`);
        }

        return questionType.validate(question, answer);
    }

    // Question type generators

    private generateBooleanQuestion(def: PatternQuestion | QuestionDefinition): Question {
        return {
            id: def.id,
            type: 'boolean',
            text: def.text || def.question || '',
            category: def.category || 'other',
            priority: def.priority || 5,
            impact: def.impact,
            dependencies: def.dependencies,
            required: def.required !== false
        };
    }

    private generateChoiceQuestion(def: PatternQuestion | QuestionDefinition): Question {
        return {
            id: def.id,
            type: 'choice',
            text: def.text || def.question || '',
            choices: def.choices || [],
            category: def.category || 'other',
            priority: def.priority || 5,
            impact: def.impact,
            dependencies: def.dependencies,
            required: def.required !== false,
            allowMultiple: (def as QuestionDefinition).allowMultiple || false
        };
    }

    private generateScaleQuestion(def: PatternQuestion | QuestionDefinition): Question {
        const qdef = def as QuestionDefinition;
        return {
            id: def.id,
            type: 'scale',
            text: def.text || def.question || '',
            min: qdef.min || 1,
            max: qdef.max || 5,
            labels: qdef.labels || {},
            category: def.category || 'other',
            priority: def.priority || 5,
            impact: def.impact,
            dependencies: def.dependencies,
            required: def.required !== false
        };
    }

    private generateTextQuestion(def: PatternQuestion | QuestionDefinition): Question {
        const qdef = def as QuestionDefinition;
        return {
            id: def.id,
            type: 'text',
            text: def.text || def.question || '',
            placeholder: qdef.placeholder,
            maxLength: qdef.maxLength || 500,
            category: def.category || 'other',
            priority: def.priority || 5,
            impact: def.impact,
            dependencies: def.dependencies,
            required: def.required !== false
        };
    }

    private generateMultipleQuestion(def: PatternQuestion | QuestionDefinition): Question {
        const qdef = def as QuestionDefinition;
        return {
            id: def.id,
            type: 'multiple',
            text: def.text || def.question || '',
            choices: def.choices || [],
            minChoices: qdef.minChoices || 0,
            maxChoices: qdef.maxChoices || def.choices?.length || 10,
            category: def.category || 'other',
            priority: def.priority || 5,
            impact: def.impact,
            dependencies: def.dependencies,
            required: def.required !== false
        };
    }

    // Answer validators

    private validateBooleanAnswer(_question: Question, answer: unknown): boolean {
        if (typeof answer !== 'boolean') {
            throw new Error('Boolean answer required');
        }
        return true;
    }

    private validateChoiceAnswer(question: Question, answer: unknown): boolean {
        if (question.allowMultiple) {
            if (!Array.isArray(answer)) {
                throw new Error('Array of choices required');
            }
            const validChoices = question.choices?.map(c => c.value) || [];
            const answerArray = answer as string[];
            const invalidChoices = answerArray.filter(a => !validChoices.includes(a));
            if (invalidChoices.length > 0) {
                throw new Error(`Invalid choices: ${invalidChoices.join(', ')}`);
            }
        } else {
            const validChoices = question.choices?.map(c => c.value) || [];
            if (!validChoices.includes(answer as string)) {
                throw new Error('Invalid choice');
            }
        }
        return true;
    }

    private validateScaleAnswer(question: Question, answer: unknown): boolean {
        const num = Number(answer);
        const min = question.min || 1;
        const max = question.max || 5;
        if (isNaN(num) || num < min || num > max) {
            throw new Error(`Answer must be between ${min} and ${max}`);
        }
        return true;
    }

    private validateTextAnswer(question: Question, answer: unknown): boolean {
        if (typeof answer !== 'string') {
            throw new Error('Text answer required');
        }
        if (question.required && answer.trim().length === 0) {
            throw new Error('Answer is required');
        }
        const maxLength = question.maxLength || 500;
        if (answer.length > maxLength) {
            throw new Error(`Answer too long (max ${maxLength} characters)`);
        }
        return true;
    }

    private validateMultipleAnswer(question: Question, answer: unknown): boolean {
        if (!Array.isArray(answer)) {
            throw new Error('Array of choices required');
        }
        const answerArray = answer as string[];
        const minChoices = question.minChoices || 0;
        const maxChoices = question.maxChoices || question.choices?.length || 10;

        if (answerArray.length < minChoices) {
            throw new Error(`Select at least ${minChoices} choices`);
        }
        if (answerArray.length > maxChoices) {
            throw new Error(`Select at most ${maxChoices} choices`);
        }
        const validChoices = question.choices?.map(c => c.value) || [];
        const invalidChoices = answerArray.filter(a => !validChoices.includes(a));
        if (invalidChoices.length > 0) {
            throw new Error(`Invalid choices: ${invalidChoices.join(', ')}`);
        }
        return true;
    }
}

export default QuestionEngine;
