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

const { EventEmitter } = require('events');

class QuestionEngine extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.logger = options.logger || console;
        
        // Question types and their handlers
        this.questionTypes = new Map();
        this.registerQuestionTypes();
        
        // Question generation rules
        this.rules = new Map();
        this.loadRules();
        
        this.logger.info('❓ Question Engine initialized');
    }

    /**
     * Register built-in question types
     */
    registerQuestionTypes() {
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
    loadRules() {
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
    async generateQuestionnaire(pattern, userContext = {}) {
        try {
            const questions = [];
            const context = {
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
    generatePatternQuestions(pattern) {
        const questions = [];
        
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
                this.logger.warn(`Failed to create question ${questionDef.id}:`, error.message);
            }
        }

        return questions;
    }

    /**
     * Generate conditional questions based on rules
     */
    generateConditionalQuestions(pattern, context) {
        const questions = [];
        
        for (const [ruleId, rule] of this.rules) {
            if (this.shouldApplyRule(rule, pattern, context)) {
                const question = this.generateRuleBasedQuestion(ruleId, rule, pattern);
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
    shouldApplyRule(rule, pattern, context) {
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
    generateRuleBasedQuestion(ruleId, rule, pattern) {
        const questionTemplates = {
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
                impact: 'Affects payment architecture, user management, and analytics needs'
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
                impact: 'Determines database choice, caching strategy, and infrastructure needs'
            },

            'realtime-features': {
                id: 'realtime-features',
                type: 'boolean',
                text: 'Do you need real-time features like live collaboration or instant messaging?',
                category: 'functional',
                priority: 3,
                impact: 'Requires WebSocket implementation, affects database design and caching'
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
                impact: 'Affects payment provider choice and billing architecture complexity'
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
                impact: 'Determines auth provider choice and security implementation'
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
                impact: 'Affects API design, webhook architecture, and development complexity'
            }
        };

        return questionTemplates[ruleId] || null;
    }

    /**
     * Create a question object from definition
     */
    createQuestion(questionDef) {
        const questionType = this.questionTypes.get(questionDef.type);
        if (!questionType) {
            throw new Error(`Unknown question type: ${questionDef.type}`);
        }

        return questionType.generate(questionDef);
    }

    /**
     * Prioritize questions by importance and dependencies
     */
    prioritizeQuestions(questions) {
        return questions.sort((a, b) => {
            // Sort by priority (lower number = higher priority)
            if (a.priority !== b.priority) {
                return (a.priority || 5) - (b.priority || 5);
            }
            
            // Then by category importance
            const categoryPriority = {
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
    async getNextQuestion(questionnaire, userAnswers) {
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
    areQuestionDependenciesMet(question, userAnswers) {
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
    validateAnswer(question, answer) {
        const questionType = this.questionTypes.get(question.type);
        if (!questionType) {
            throw new Error(`Unknown question type: ${question.type}`);
        }

        return questionType.validate(question, answer);
    }

    // Question type generators

    generateBooleanQuestion(def) {
        return {
            id: def.id,
            type: 'boolean',
            text: def.text || def.question,
            category: def.category || 'other',
            priority: def.priority || 5,
            impact: def.impact,
            dependencies: def.dependencies,
            required: def.required !== false
        };
    }

    generateChoiceQuestion(def) {
        return {
            id: def.id,
            type: 'choice',
            text: def.text || def.question,
            choices: def.choices || [],
            category: def.category || 'other',
            priority: def.priority || 5,
            impact: def.impact,
            dependencies: def.dependencies,
            required: def.required !== false,
            allowMultiple: def.allowMultiple || false
        };
    }

    generateScaleQuestion(def) {
        return {
            id: def.id,
            type: 'scale',
            text: def.text || def.question,
            min: def.min || 1,
            max: def.max || 5,
            labels: def.labels || {},
            category: def.category || 'other',
            priority: def.priority || 5,
            impact: def.impact,
            dependencies: def.dependencies,
            required: def.required !== false
        };
    }

    generateTextQuestion(def) {
        return {
            id: def.id,
            type: 'text',
            text: def.text || def.question,
            placeholder: def.placeholder,
            maxLength: def.maxLength || 500,
            category: def.category || 'other',
            priority: def.priority || 5,
            impact: def.impact,
            dependencies: def.dependencies,
            required: def.required !== false
        };
    }

    generateMultipleQuestion(def) {
        return {
            id: def.id,
            type: 'multiple',
            text: def.text || def.question,
            choices: def.choices || [],
            minChoices: def.minChoices || 0,
            maxChoices: def.maxChoices || def.choices?.length || 10,
            category: def.category || 'other',
            priority: def.priority || 5,
            impact: def.impact,
            dependencies: def.dependencies,
            required: def.required !== false
        };
    }

    // Answer validators

    validateBooleanAnswer(question, answer) {
        if (typeof answer !== 'boolean') {
            throw new Error('Boolean answer required');
        }
        return true;
    }

    validateChoiceAnswer(question, answer) {
        if (question.allowMultiple) {
            if (!Array.isArray(answer)) {
                throw new Error('Array of choices required');
            }
            const validChoices = question.choices.map(c => c.value);
            const invalidChoices = answer.filter(a => !validChoices.includes(a));
            if (invalidChoices.length > 0) {
                throw new Error(`Invalid choices: ${invalidChoices.join(', ')}`);
            }
        } else {
            const validChoices = question.choices.map(c => c.value);
            if (!validChoices.includes(answer)) {
                throw new Error('Invalid choice');
            }
        }
        return true;
    }

    validateScaleAnswer(question, answer) {
        const num = Number(answer);
        if (isNaN(num) || num < question.min || num > question.max) {
            throw new Error(`Answer must be between ${question.min} and ${question.max}`);
        }
        return true;
    }

    validateTextAnswer(question, answer) {
        if (typeof answer !== 'string') {
            throw new Error('Text answer required');
        }
        if (question.required && answer.trim().length === 0) {
            throw new Error('Answer is required');
        }
        if (answer.length > question.maxLength) {
            throw new Error(`Answer too long (max ${question.maxLength} characters)`);
        }
        return true;
    }

    validateMultipleAnswer(question, answer) {
        if (!Array.isArray(answer)) {
            throw new Error('Array of choices required');
        }
        if (answer.length < question.minChoices) {
            throw new Error(`Select at least ${question.minChoices} choices`);
        }
        if (answer.length > question.maxChoices) {
            throw new Error(`Select at most ${question.maxChoices} choices`);
        }
        const validChoices = question.choices.map(c => c.value);
        const invalidChoices = answer.filter(a => !validChoices.includes(a));
        if (invalidChoices.length > 0) {
            throw new Error(`Invalid choices: ${invalidChoices.join(', ')}`);
        }
        return true;
    }
}

module.exports = QuestionEngine;