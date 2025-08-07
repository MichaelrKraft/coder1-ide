/**
 * Project Analytics Service
 * 
 * Collects and analyzes data throughout the project lifecycle to build proprietary
 * insights and competitive advantages for the Coder1 platform
 */

const { logger } = require('../monitoring/comprehensive-logger');
const fs = require('fs').promises;
const path = require('path');

class ProjectAnalytics {
    constructor(options = {}) {
        this.logger = options.logger || logger;
        this.analyticsDir = options.analyticsDir || path.join(__dirname, '../../analytics');
        this.projectsDir = options.projectsDir || path.join(__dirname, '../../projects');
        
        // Data collection points
        this.sessionData = new Map();
        this.userPatterns = new Map();
        this.projectMetrics = new Map();
        
        // Analytics collection categories
        this.collectionCategories = {
            userBehavior: new Map(),
            projectSuccess: new Map(),
            featureUsage: new Map(),
            timeAnalytics: new Map(),
            qualityMetrics: new Map(),
            marketTrends: new Map()
        };
        
        this.initializeAnalytics();
    }

    /**
     * Initialize analytics system and ensure directories exist
     */
    async initializeAnalytics() {
        try {
            await this.ensureDirectoryExists(this.analyticsDir);
            await this.loadExistingData();
            this.logger.info('📊 Project Analytics initialized successfully');
        } catch (error) {
            this.logger.error('❌ Failed to initialize analytics', { error: error.message });
        }
    }

    /**
     * Start tracking a new user session
     */
    async startSession(sessionId, userContext = {}) {
        try {
            const session = {
                id: sessionId,
                startTime: new Date().toISOString(),
                userContext,
                events: [],
                projects: [],
                interactions: {
                    questionsAnswered: 0,
                    prdGenerated: false,
                    wireframesCreated: false,
                    projectCompleted: false
                },
                metadata: {
                    userAgent: userContext.userAgent,
                    referrer: userContext.referrer,
                    location: userContext.location
                }
            };

            this.sessionData.set(sessionId, session);
            
            // Track session start
            await this.recordEvent(sessionId, 'session_start', {
                timestamp: session.startTime,
                context: userContext
            });

            this.logger.info('📈 New analytics session started', { sessionId });
            return session;

        } catch (error) {
            this.logger.error('❌ Failed to start analytics session', { 
                sessionId, 
                error: error.message 
            });
        }
    }

    /**
     * Record user interaction events
     */
    async recordEvent(sessionId, eventType, eventData = {}) {
        try {
            const session = this.sessionData.get(sessionId);
            if (!session) {
                this.logger.warn('Session not found for event recording', { sessionId, eventType });
                return;
            }

            const event = {
                type: eventType,
                timestamp: new Date().toISOString(),
                data: eventData,
                sessionId
            };

            session.events.push(event);

            // Update interaction counters
            this.updateInteractionCounters(session, eventType, eventData);

            // Store in appropriate collection category
            this.categorizeEvent(event);

            // Real-time analytics processing
            await this.processEventRealtime(event, session);

            this.logger.debug('📊 Event recorded', { sessionId, eventType });

        } catch (error) {
            this.logger.error('❌ Failed to record event', { 
                sessionId, 
                eventType, 
                error: error.message 
            });
        }
    }

    /**
     * Track project creation and requirements gathering
     */
    async trackProjectCreation(sessionId, projectData) {
        try {
            const projectMetrics = {
                projectId: projectData.id,
                sessionId,
                originalRequest: projectData.originalRequest,
                projectType: projectData.projectType,
                complexity: projectData.complexity,
                startTime: new Date().toISOString(),
                timeline: {
                    questioningStarted: new Date().toISOString(),
                    questioningCompleted: null,
                    prdGenerated: null,
                    wireframesCreated: null,
                    projectCompleted: null
                },
                userEngagement: {
                    questionsAsked: 0,
                    questionsAnswered: 0,
                    totalResponseLength: 0,
                    averageResponseLength: 0,
                    questionsSkipped: 0
                },
                qualityIndicators: {
                    requestClarityScore: this.assessRequestClarity(projectData.originalRequest),
                    requirementsCompleteness: 0,
                    confidence: projectData.confidence || 'medium'
                }
            };

            this.projectMetrics.set(projectData.id, projectMetrics);

            await this.recordEvent(sessionId, 'project_creation', {
                projectId: projectData.id,
                projectType: projectData.projectType,
                complexity: projectData.complexity,
                requestLength: projectData.originalRequest.length
            });

            return projectMetrics;

        } catch (error) {
            this.logger.error('❌ Failed to track project creation', { 
                sessionId, 
                error: error.message 
            });
        }
    }

    /**
     * Track question and answer interactions
     */
    async trackQuestionAnswering(sessionId, projectId, questionData, answerData) {
        try {
            const projectMetrics = this.projectMetrics.get(projectId);
            if (!projectMetrics) return;

            // Update engagement metrics
            projectMetrics.userEngagement.questionsAsked++;
            
            if (answerData && answerData.answer && answerData.answer.trim()) {
                projectMetrics.userEngagement.questionsAnswered++;
                projectMetrics.userEngagement.totalResponseLength += answerData.answer.length;
                projectMetrics.userEngagement.averageResponseLength = 
                    projectMetrics.userEngagement.totalResponseLength / projectMetrics.userEngagement.questionsAnswered;
            } else {
                projectMetrics.userEngagement.questionsSkipped++;
            }

            // Calculate requirements completeness
            const completeness = (projectMetrics.userEngagement.questionsAnswered / projectMetrics.userEngagement.questionsAsked) * 100;
            projectMetrics.qualityIndicators.requirementsCompleteness = Math.round(completeness);

            await this.recordEvent(sessionId, 'question_answered', {
                projectId,
                questionCategory: questionData.category,
                questionType: questionData.type,
                answered: !!answerData.answer,
                responseLength: answerData.answer ? answerData.answer.length : 0,
                timeToAnswer: answerData.timeToAnswer || null
            });

            // Store question-answer patterns for future optimization
            this.analyzeQuestionEffectiveness(questionData, answerData);

        } catch (error) {
            this.logger.error('❌ Failed to track question answering', { 
                sessionId, 
                projectId, 
                error: error.message 
            });
        }
    }

    /**
     * Track PRD generation success and quality
     */
    async trackPRDGeneration(sessionId, projectId, prdDocument) {
        try {
            const projectMetrics = this.projectMetrics.get(projectId);
            if (projectMetrics) {
                projectMetrics.timeline.prdGenerated = new Date().toISOString();
            }

            const prdMetrics = {
                projectId,
                sessionId,
                timestamp: new Date().toISOString(),
                quality: {
                    contentLength: prdDocument.content.length,
                    sectionsCount: this.countPRDSections(prdDocument.content),
                    confidence: prdDocument.metadata.confidence,
                    completeness: this.assessPRDCompleteness(prdDocument)
                },
                metadata: prdDocument.metadata
            };

            await this.recordEvent(sessionId, 'prd_generated', {
                projectId,
                contentLength: prdDocument.content.length,
                confidence: prdDocument.metadata.confidence,
                sectionsCount: prdMetrics.quality.sectionsCount
            });

            // Store PRD patterns for optimization
            this.analyzePRDPatterns(prdMetrics);

            return prdMetrics;

        } catch (error) {
            this.logger.error('❌ Failed to track PRD generation', { 
                sessionId, 
                projectId, 
                error: error.message 
            });
        }
    }

    /**
     * Track wireframe generation and user preferences
     */
    async trackWireframeGeneration(sessionId, projectId, wireframeData) {
        try {
            const projectMetrics = this.projectMetrics.get(projectId);
            if (projectMetrics) {
                projectMetrics.timeline.wireframesCreated = new Date().toISOString();
            }

            await this.recordEvent(sessionId, 'wireframes_generated', {
                projectId,
                wireframeCount: wireframeData.wireframes.length,
                projectType: wireframeData.projectType,
                styles: wireframeData.wireframes.map(w => w.style)
            });

            // Track wireframe style preferences
            this.analyzeWireframePreferences(wireframeData);

        } catch (error) {
            this.logger.error('❌ Failed to track wireframe generation', { 
                sessionId, 
                projectId, 
                error: error.message 
            });
        }
    }

    /**
     * Track user selections and preferences
     */
    async trackUserSelection(sessionId, selectionType, selectionData) {
        try {
            await this.recordEvent(sessionId, 'user_selection', {
                type: selectionType,
                selection: selectionData,
                timestamp: new Date().toISOString()
            });

            // Store user preference patterns
            this.analyzeUserPreferences(sessionId, selectionType, selectionData);

        } catch (error) {
            this.logger.error('❌ Failed to track user selection', { 
                sessionId, 
                error: error.message 
            });
        }
    }

    /**
     * End session and calculate final metrics
     */
    async endSession(sessionId, projectOutcome = {}) {
        try {
            const session = this.sessionData.get(sessionId);
            if (!session) return;

            session.endTime = new Date().toISOString();
            session.duration = new Date(session.endTime) - new Date(session.startTime);
            session.outcome = projectOutcome;

            // Calculate session success metrics
            const sessionMetrics = this.calculateSessionMetrics(session);

            await this.recordEvent(sessionId, 'session_end', {
                duration: session.duration,
                projectsCreated: session.projects.length,
                eventsRecorded: session.events.length,
                outcome: projectOutcome,
                metrics: sessionMetrics
            });

            // Store session data
            await this.storeSessionData(session);

            // Update global analytics
            await this.updateGlobalAnalytics(session, sessionMetrics);

            this.logger.info('📊 Analytics session ended', { 
                sessionId, 
                duration: session.duration,
                eventsCount: session.events.length
            });

            return sessionMetrics;

        } catch (error) {
            this.logger.error('❌ Failed to end analytics session', { 
                sessionId, 
                error: error.message 
            });
        }
    }

    /**
     * Generate analytics insights for platform optimization
     */
    async generateInsights(timeframe = '30d') {
        try {
            const insights = {
                timeframe,
                generatedAt: new Date().toISOString(),
                userBehavior: await this.analyzeUserBehavior(timeframe),
                projectPatterns: await this.analyzeProjectPatterns(timeframe),
                questionEffectiveness: await this.analyzeQuestionEffectiveness(timeframe),
                successFactors: await this.identifySuccessFactors(timeframe),
                optimization: await this.generateOptimizationRecommendations(timeframe)
            };

            // Store insights for historical tracking
            await this.storeInsights(insights);

            this.logger.info('🧠 Analytics insights generated', { timeframe });
            return insights;

        } catch (error) {
            this.logger.error('❌ Failed to generate analytics insights', { 
                timeframe, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Analyze user behavior patterns
     */
    async analyzeUserBehavior(timeframe) {
        const patterns = {
            sessionDuration: { average: 0, median: 0, distribution: {} },
            questioningPatterns: { 
                averageQuestionsAnswered: 0,
                skipRate: 0,
                responseQuality: 'medium'
            },
            projectTypes: {},
            conversionFunnel: {
                questionsStarted: 0,
                questionsCompleted: 0,
                prdGenerated: 0,
                wireframesCreated: 0,
                projectCompleted: 0
            }
        };

        // Calculate from stored data
        // This would involve loading and analyzing historical session data
        
        return patterns;
    }

    /**
     * Analyze project success patterns
     */
    async analyzeProjectPatterns(timeframe) {
        const patterns = {
            successRates: {},
            complexityCorrelation: {},
            timeToCompletion: {},
            commonFeatures: [],
            failurePoints: []
        };

        // Analyze project completion patterns
        // This would involve analyzing project lifecycle data
        
        return patterns;
    }

    /**
     * Identify success factors for completed projects
     */
    async identifySuccessFactors(timeframe) {
        const factors = {
            highPerformingQuestions: [],
            effectiveProjectTypes: [],
            optimalComplexityRange: {},
            userEngagementThresholds: {},
            qualityIndicators: []
        };

        // Analyze correlation between various factors and project success
        
        return factors;
    }

    /**
     * Generate platform optimization recommendations
     */
    async generateOptimizationRecommendations(timeframe) {
        const recommendations = {
            questioningFlow: [],
            uiImprovements: [],
            featureEnhancements: [],
            marketingInsights: [],
            technicalOptimizations: []
        };

        // Generate recommendations based on analytics insights
        
        return recommendations;
    }

    // Helper methods

    /**
     * Update interaction counters for session
     */
    updateInteractionCounters(session, eventType, eventData) {
        switch (eventType) {
            case 'question_answered':
                session.interactions.questionsAnswered++;
                break;
            case 'prd_generated':
                session.interactions.prdGenerated = true;
                break;
            case 'wireframes_generated':
                session.interactions.wireframesCreated = true;
                break;
            case 'project_completed':
                session.interactions.projectCompleted = true;
                break;
        }
    }

    /**
     * Categorize events into collection categories
     */
    categorizeEvent(event) {
        const { type, data } = event;

        if (type.includes('question') || type.includes('user_selection')) {
            this.collectionCategories.userBehavior.set(event.timestamp, event);
        }
        
        if (type.includes('project') || type.includes('prd') || type.includes('wireframe')) {
            this.collectionCategories.projectSuccess.set(event.timestamp, event);
        }
        
        if (type.includes('session') || type.includes('duration')) {
            this.collectionCategories.timeAnalytics.set(event.timestamp, event);
        }
    }

    /**
     * Process events in real-time for immediate insights
     */
    async processEventRealtime(event, session) {
        // Real-time processing for immediate feedback
        // This could trigger alerts, recommendations, or UI updates
        
        if (event.type === 'question_answered' && event.data.timeToAnswer > 300000) { // 5 minutes
            this.logger.info('User taking long time to answer - may need help', {
                sessionId: session.id,
                questionType: event.data.questionCategory
            });
        }
    }

    /**
     * Assess request clarity score
     */
    assessRequestClarity(request) {
        let score = 50; // Base score
        
        // Length factor
        if (request.length > 100) score += 10;
        if (request.length > 200) score += 10;
        
        // Specificity indicators
        const specificWords = ['specific', 'need', 'want', 'should', 'must', 'feature'];
        const specificCount = specificWords.filter(word => 
            request.toLowerCase().includes(word)
        ).length;
        score += specificCount * 5;
        
        // Technical terms
        const techTerms = ['database', 'api', 'responsive', 'mobile', 'payment'];
        const techCount = techTerms.filter(term => 
            request.toLowerCase().includes(term)
        ).length;
        score += techCount * 3;
        
        return Math.min(100, score);
    }

    /**
     * Count PRD sections
     */
    countPRDSections(content) {
        const sectionMarkers = content.match(/^##\s/gm);
        return sectionMarkers ? sectionMarkers.length : 0;
    }

    /**
     * Assess PRD completeness
     */
    assessPRDCompleteness(prdDocument) {
        const requiredSections = [
            'Executive Summary',
            'Target Audience',
            'Core Features',
            'Technical Requirements',
            'Success Metrics'
        ];
        
        const foundSections = requiredSections.filter(section => 
            prdDocument.content.includes(section)
        ).length;
        
        return (foundSections / requiredSections.length) * 100;
    }

    /**
     * Calculate comprehensive session metrics
     */
    calculateSessionMetrics(session) {
        return {
            engagement: {
                duration: session.duration,
                eventsCount: session.events.length,
                interactionRate: session.events.length / (session.duration / 60000), // events per minute
                questionsAnswered: session.interactions.questionsAnswered
            },
            completion: {
                prdGenerated: session.interactions.prdGenerated,
                wireframesCreated: session.interactions.wireframesCreated,
                projectCompleted: session.interactions.projectCompleted
            },
            quality: {
                averageResponseTime: this.calculateAverageResponseTime(session.events),
                completionRate: this.calculateCompletionRate(session)
            }
        };
    }

    /**
     * Calculate average response time for questions
     */
    calculateAverageResponseTime(events) {
        const questionEvents = events.filter(e => e.type === 'question_answered' && e.data.timeToAnswer);
        if (questionEvents.length === 0) return 0;
        
        const totalTime = questionEvents.reduce((sum, event) => sum + event.data.timeToAnswer, 0);
        return totalTime / questionEvents.length;
    }

    /**
     * Calculate completion rate for session
     */
    calculateCompletionRate(session) {
        let completionScore = 0;
        const maxScore = 4;
        
        if (session.interactions.questionsAnswered > 0) completionScore++;
        if (session.interactions.prdGenerated) completionScore++;
        if (session.interactions.wireframesCreated) completionScore++;
        if (session.interactions.projectCompleted) completionScore++;
        
        return (completionScore / maxScore) * 100;
    }

    /**
     * Store session data to persistent storage
     */
    async storeSessionData(session) {
        try {
            const sessionFile = path.join(this.analyticsDir, 'sessions', `${session.id}.json`);
            await this.ensureDirectoryExists(path.dirname(sessionFile));
            await fs.writeFile(sessionFile, JSON.stringify(session, null, 2), 'utf8');
        } catch (error) {
            this.logger.error('❌ Failed to store session data', { 
                sessionId: session.id, 
                error: error.message 
            });
        }
    }

    /**
     * Store analytics insights
     */
    async storeInsights(insights) {
        try {
            const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const insightsFile = path.join(this.analyticsDir, 'insights', `insights-${timestamp}.json`);
            await this.ensureDirectoryExists(path.dirname(insightsFile));
            await fs.writeFile(insightsFile, JSON.stringify(insights, null, 2), 'utf8');
        } catch (error) {
            this.logger.error('❌ Failed to store insights', { error: error.message });
        }
    }

    /**
     * Load existing analytics data
     */
    async loadExistingData() {
        try {
            // Load recent sessions and insights for continuity
            // This would involve reading from persistent storage
            this.logger.info('📊 Existing analytics data loaded');
        } catch (error) {
            this.logger.warn('No existing analytics data found, starting fresh');
        }
    }

    /**
     * Update global analytics aggregations
     */
    async updateGlobalAnalytics(session, sessionMetrics) {
        try {
            // Update running totals and averages
            // This would update global metrics files
            this.logger.debug('📈 Global analytics updated');
        } catch (error) {
            this.logger.error('❌ Failed to update global analytics', { error: error.message });
        }
    }

    /**
     * Analyze question effectiveness for optimization
     */
    analyzeQuestionEffectiveness(questionData, answerData) {
        // Track which questions get good responses vs skipped
        const effectiveness = {
            question: questionData.question,
            category: questionData.category,
            answered: !!answerData.answer,
            responseQuality: answerData.answer ? this.assessResponseQuality(answerData.answer) : 0,
            timestamp: new Date().toISOString()
        };
        
        // Store for future optimization
        this.collectionCategories.featureUsage.set(
            `question-${Date.now()}`, 
            effectiveness
        );
    }

    /**
     * Analyze PRD generation patterns
     */
    analyzePRDPatterns(prdMetrics) {
        // Track PRD quality patterns for improvement
        this.collectionCategories.qualityMetrics.set(
            `prd-${prdMetrics.projectId}`,
            prdMetrics
        );
    }

    /**
     * Analyze wireframe preferences
     */
    analyzeWireframePreferences(wireframeData) {
        // Track which wireframe styles are most popular
        this.collectionCategories.userBehavior.set(
            `wireframe-${wireframeData.projectId}`,
            {
                projectType: wireframeData.projectType,
                styles: wireframeData.wireframes.map(w => w.style),
                timestamp: new Date().toISOString()
            }
        );
    }

    /**
     * Analyze user preferences and patterns
     */
    analyzeUserPreferences(sessionId, selectionType, selectionData) {
        const patterns = this.userPatterns.get(sessionId) || {};
        patterns[selectionType] = patterns[selectionType] || [];
        patterns[selectionType].push({
            selection: selectionData,
            timestamp: new Date().toISOString()
        });
        this.userPatterns.set(sessionId, patterns);
    }

    /**
     * Assess response quality
     */
    assessResponseQuality(response) {
        let quality = 0;
        
        // Length factor
        if (response.length > 20) quality += 25;
        if (response.length > 50) quality += 25;
        if (response.length > 100) quality += 25;
        
        // Specificity factor
        const specificWords = ['specific', 'exactly', 'need', 'want', 'should', 'because'];
        const specificCount = specificWords.filter(word => 
            response.toLowerCase().includes(word)
        ).length;
        quality += Math.min(25, specificCount * 5);
        
        return quality;
    }

    /**
     * Ensure directory exists
     */
    async ensureDirectoryExists(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * Get current analytics summary for dashboard
     */
    getCurrentAnalyticsSummary() {
        const summary = {
            activeSessions: this.sessionData.size,
            totalEvents: 0,
            projectsInProgress: this.projectMetrics.size,
            recentActivity: []
        };

        // Calculate total events
        for (const session of this.sessionData.values()) {
            summary.totalEvents += session.events.length;
        }

        // Get recent activity
        const allEvents = [];
        for (const session of this.sessionData.values()) {
            allEvents.push(...session.events);
        }
        
        summary.recentActivity = allEvents
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);

        return summary;
    }
}

module.exports = {
    ProjectAnalytics
};