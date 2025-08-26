/**
 * Hook Performance Tracker
 * Measures and analyzes the effectiveness and ROI of AI-generated hooks
 */

const fs = require('fs').promises;
const path = require('path');

class HookPerformanceTracker {
    constructor() {
        this.metricsFile = path.join(__dirname, '../../data/hook-performance-metrics.json');
        this.sessionFile = path.join(__dirname, '../../data/hook-session-data.json');
        this.initializeTracking();
    }

    /**
     * Initialize tracking data structure
     */
    async initializeTracking() {
        try {
            const dataDir = path.dirname(this.metricsFile);
            await fs.mkdir(dataDir, { recursive: true });

            // Initialize metrics file
            try {
                await fs.access(this.metricsFile);
            } catch {
                const defaultMetrics = {
                    hooks: {},
                    globalStats: {
                        totalExecutions: 0,
                        totalTimeSaved: 0,
                        totalErrorsPrevented: 0,
                        averageExecutionTime: 0,
                        successRate: 0,
                        lastUpdated: new Date().toISOString()
                    },
                    performanceHistory: [],
                    roi: {
                        weeklyTimeSavings: 0,
                        monthlyTimeSavings: 0,
                        estimatedCostSavings: 0,
                        productivityGain: 0
                    }
                };
                await fs.writeFile(this.metricsFile, JSON.stringify(defaultMetrics, null, 2));
            }

            // Initialize session file
            try {
                await fs.access(this.sessionFile);
            } catch {
                const defaultSession = {
                    currentSession: {
                        startTime: null,
                        hooks: [],
                        metrics: {}
                    },
                    previousSessions: [],
                    sessionCount: 0
                };
                await fs.writeFile(this.sessionFile, JSON.stringify(defaultSession, null, 2));
            }
        } catch (error) {
            console.error('Failed to initialize hook performance tracking:', error);
        }
    }

    /**
     * Start tracking a new development session
     */
    async startSession(sessionId = null) {
        try {
            const sessionData = await this.loadSessionData();
            const sessionStartTime = new Date().toISOString();

            sessionData.currentSession = {
                id: sessionId || `session_${Date.now()}`,
                startTime: sessionStartTime,
                hooks: [],
                metrics: {
                    commandsExecuted: 0,
                    filesModified: 0,
                    errorsEncountered: 0,
                    timeSaved: 0,
                    automationsTriggered: 0
                },
                aiRecommendations: [],
                implementedHooks: []
            };

            await this.saveSessionData(sessionData);
            console.log(`🎯 Hook performance tracking started for session: ${sessionData.currentSession.id}`);
            
            return sessionData.currentSession.id;
        } catch (error) {
            console.error('Failed to start performance tracking session:', error);
            return null;
        }
    }

    /**
     * Track hook execution performance
     */
    async trackHookExecution(hookId, executionData) {
        try {
            const {
                executionTime = 0,
                success = true,
                errorMessage = null,
                timeSaved = 0,
                context = {}
            } = executionData;

            const metrics = await this.loadMetrics();
            const sessionData = await this.loadSessionData();

            // Update hook-specific metrics
            if (!metrics.hooks[hookId]) {
                metrics.hooks[hookId] = {
                    totalExecutions: 0,
                    successfulExecutions: 0,
                    totalExecutionTime: 0,
                    totalTimeSaved: 0,
                    errorCount: 0,
                    lastExecuted: null,
                    averageExecutionTime: 0,
                    successRate: 0,
                    impactScore: 0,
                    context: {}
                };
            }

            const hookMetrics = metrics.hooks[hookId];
            hookMetrics.totalExecutions++;
            hookMetrics.totalExecutionTime += executionTime;
            hookMetrics.lastExecuted = new Date().toISOString();

            if (success) {
                hookMetrics.successfulExecutions++;
                hookMetrics.totalTimeSaved += timeSaved;
            } else {
                hookMetrics.errorCount++;
                if (errorMessage) {
                    hookMetrics.lastError = errorMessage;
                }
            }

            // Recalculate derived metrics
            hookMetrics.averageExecutionTime = hookMetrics.totalExecutionTime / hookMetrics.totalExecutions;
            hookMetrics.successRate = hookMetrics.successfulExecutions / hookMetrics.totalExecutions;
            hookMetrics.impactScore = this.calculateImpactScore(hookMetrics);

            // Update global stats
            metrics.globalStats.totalExecutions++;
            metrics.globalStats.totalTimeSaved += timeSaved;
            if (!success) {
                metrics.globalStats.totalErrorsPrevented++;
            }

            // Update current session
            if (sessionData.currentSession.startTime) {
                sessionData.currentSession.metrics.commandsExecuted++;
                sessionData.currentSession.metrics.timeSaved += timeSaved;
                sessionData.currentSession.metrics.automationsTriggered++;
                
                if (!success) {
                    sessionData.currentSession.metrics.errorsEncountered++;
                }

                sessionData.currentSession.hooks.push({
                    hookId,
                    timestamp: new Date().toISOString(),
                    executionTime,
                    success,
                    timeSaved,
                    context
                });
            }

            // Add to performance history
            metrics.performanceHistory.push({
                timestamp: new Date().toISOString(),
                hookId,
                executionTime,
                success,
                timeSaved,
                sessionId: sessionData.currentSession.id
            });

            // Keep only last 1000 history entries
            if (metrics.performanceHistory.length > 1000) {
                metrics.performanceHistory = metrics.performanceHistory.slice(-1000);
            }

            metrics.globalStats.lastUpdated = new Date().toISOString();

            await Promise.all([
                this.saveMetrics(metrics),
                this.saveSessionData(sessionData)
            ]);

            return {
                success: true,
                hookMetrics: metrics.hooks[hookId],
                globalStats: metrics.globalStats
            };

        } catch (error) {
            console.error('Failed to track hook execution:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Track AI recommendation implementation
     */
    async trackAIRecommendation(recommendationId, implementationData) {
        try {
            const {
                hookIds = [],
                timeTaken = 0,
                success = true,
                userFeedback = null,
                measuredImpact = {}
            } = implementationData;

            const sessionData = await this.loadSessionData();

            if (sessionData.currentSession.startTime) {
                sessionData.currentSession.aiRecommendations.push({
                    id: recommendationId,
                    timestamp: new Date().toISOString(),
                    hookIds,
                    timeTaken,
                    success,
                    userFeedback,
                    measuredImpact
                });

                sessionData.currentSession.implementedHooks.push(...hookIds);
            }

            await this.saveSessionData(sessionData);
            return { success: true };

        } catch (error) {
            console.error('Failed to track AI recommendation:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * End current session and calculate ROI
     */
    async endSession(sessionFeedback = {}) {
        try {
            const sessionData = await this.loadSessionData();
            const metrics = await this.loadMetrics();

            if (!sessionData.currentSession.startTime) {
                return { success: false, error: 'No active session to end' };
            }

            const session = sessionData.currentSession;
            const sessionDuration = Date.now() - new Date(session.startTime).getTime();

            // Calculate session ROI
            const sessionROI = this.calculateSessionROI(session, sessionDuration);

            // Finalize session
            const finalizedSession = {
                ...session,
                endTime: new Date().toISOString(),
                duration: sessionDuration,
                roi: sessionROI,
                feedback: sessionFeedback
            };

            // Move to previous sessions
            sessionData.previousSessions.push(finalizedSession);
            sessionData.sessionCount++;

            // Keep only last 50 sessions
            if (sessionData.previousSessions.length > 50) {
                sessionData.previousSessions = sessionData.previousSessions.slice(-50);
            }

            // Clear current session
            sessionData.currentSession = {
                startTime: null,
                hooks: [],
                metrics: {}
            };

            // Update global ROI metrics
            this.updateGlobalROI(metrics, finalizedSession);

            await Promise.all([
                this.saveSessionData(sessionData),
                this.saveMetrics(metrics)
            ]);

            console.log(`📊 Session ${finalizedSession.id} completed. ROI: ${Math.round(sessionROI.timeEfficiency * 100)}% efficiency`);

            return {
                success: true,
                session: finalizedSession,
                roi: sessionROI
            };

        } catch (error) {
            console.error('Failed to end session:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get comprehensive performance analytics
     */
    async getPerformanceAnalytics(timeframe = 'week') {
        try {
            const metrics = await this.loadMetrics();
            const sessionData = await this.loadSessionData();

            const analytics = {
                summary: this.calculateSummaryMetrics(metrics),
                hookPerformance: this.analyzeHookPerformance(metrics),
                trends: this.calculateTrends(metrics, timeframe),
                roi: metrics.roi,
                recommendations: this.generateOptimizationRecommendations(metrics),
                topPerformers: this.getTopPerformingHooks(metrics),
                problemAreas: this.identifyProblemAreas(metrics)
            };

            return { success: true, analytics };

        } catch (error) {
            console.error('Failed to get performance analytics:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Calculate hook impact score
     */
    calculateImpactScore(hookMetrics) {
        const timeSavingsScore = Math.min(hookMetrics.totalTimeSaved / 3600, 10); // Max 10 for 1 hour saved
        const reliabilityScore = hookMetrics.successRate * 5; // Max 5 for 100% success
        const usageScore = Math.min(hookMetrics.totalExecutions / 100, 5); // Max 5 for 100+ executions

        return Math.round((timeSavingsScore + reliabilityScore + usageScore) * 10) / 10;
    }

    /**
     * Calculate session ROI
     */
    calculateSessionROI(session, duration) {
        const totalTimeSaved = session.metrics.timeSaved || 0;
        const timeEfficiency = duration > 0 ? (totalTimeSaved / (duration / 1000)) : 0;
        
        const automationValue = (session.metrics.automationsTriggered || 0) * 30; // 30 seconds value per automation
        const errorPreventionValue = (session.metrics.errorsEncountered || 0) * 300; // 5 minutes value per error prevented

        return {
            timeEfficiency: Math.min(timeEfficiency, 1), // Cap at 100% efficiency
            totalTimeSaved,
            automationValue,
            errorPreventionValue,
            overallValue: totalTimeSaved + automationValue + errorPreventionValue
        };
    }

    /**
     * Calculate summary metrics
     */
    calculateSummaryMetrics(metrics) {
        const totalHooks = Object.keys(metrics.hooks).length;
        const activeHooks = Object.values(metrics.hooks).filter(h => h.totalExecutions > 0).length;
        
        return {
            totalHooks,
            activeHooks,
            totalTimeSaved: Math.round(metrics.globalStats.totalTimeSaved / 60), // in minutes
            totalExecutions: metrics.globalStats.totalExecutions,
            averageSuccessRate: this.calculateAverageSuccessRate(metrics),
            mostValueableHook: this.getMostValuableHook(metrics)
        };
    }

    /**
     * Analyze individual hook performance
     */
    analyzeHookPerformance(metrics) {
        return Object.entries(metrics.hooks).map(([hookId, hookMetrics]) => ({
            id: hookId,
            executions: hookMetrics.totalExecutions,
            successRate: Math.round(hookMetrics.successRate * 100),
            avgExecutionTime: Math.round(hookMetrics.averageExecutionTime),
            timeSaved: Math.round(hookMetrics.totalTimeSaved / 60), // in minutes
            impactScore: hookMetrics.impactScore,
            lastUsed: hookMetrics.lastExecuted,
            trend: this.calculateHookTrend(hookId, metrics)
        })).sort((a, b) => b.impactScore - a.impactScore);
    }

    /**
     * Calculate performance trends
     */
    calculateTrends(metrics, timeframe) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 1));

        const recentHistory = metrics.performanceHistory.filter(
            entry => new Date(entry.timestamp) > cutoffDate
        );

        return {
            totalExecutions: recentHistory.length,
            successRate: recentHistory.filter(e => e.success).length / recentHistory.length,
            avgTimeSaved: recentHistory.reduce((sum, e) => sum + e.timeSaved, 0) / recentHistory.length,
            trendDirection: this.calculateTrendDirection(recentHistory)
        };
    }

    /**
     * Get top performing hooks
     */
    getTopPerformingHooks(metrics, limit = 5) {
        return Object.entries(metrics.hooks)
            .map(([id, hook]) => ({ id, ...hook }))
            .sort((a, b) => b.impactScore - a.impactScore)
            .slice(0, limit)
            .map(hook => ({
                id: hook.id,
                impactScore: hook.impactScore,
                timeSaved: Math.round(hook.totalTimeSaved / 60),
                successRate: Math.round(hook.successRate * 100),
                executions: hook.totalExecutions
            }));
    }

    /**
     * Identify problem areas
     */
    identifyProblemAreas(metrics) {
        const problems = [];

        Object.entries(metrics.hooks).forEach(([hookId, hook]) => {
            if (hook.successRate < 0.8 && hook.totalExecutions > 5) {
                problems.push({
                    type: 'low_success_rate',
                    hookId,
                    severity: hook.successRate < 0.5 ? 'high' : 'medium',
                    successRate: Math.round(hook.successRate * 100),
                    recommendation: 'Review hook configuration and error patterns'
                });
            }

            if (hook.averageExecutionTime > 5000 && hook.totalExecutions > 3) {
                problems.push({
                    type: 'slow_execution',
                    hookId,
                    severity: hook.averageExecutionTime > 10000 ? 'high' : 'medium',
                    avgTime: Math.round(hook.averageExecutionTime),
                    recommendation: 'Optimize hook implementation for better performance'
                });
            }
        });

        return problems.sort((a, b) => 
            (b.severity === 'high' ? 2 : 1) - (a.severity === 'high' ? 2 : 1)
        );
    }

    /**
     * Load metrics from file
     */
    async loadMetrics() {
        try {
            const data = await fs.readFile(this.metricsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load metrics:', error);
            return this.getDefaultMetrics();
        }
    }

    /**
     * Save metrics to file
     */
    async saveMetrics(metrics) {
        try {
            await fs.writeFile(this.metricsFile, JSON.stringify(metrics, null, 2));
        } catch (error) {
            console.error('Failed to save metrics:', error);
            throw error;
        }
    }

    /**
     * Load session data from file
     */
    async loadSessionData() {
        try {
            const data = await fs.readFile(this.sessionFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load session data:', error);
            return this.getDefaultSessionData();
        }
    }

    /**
     * Save session data to file
     */
    async saveSessionData(sessionData) {
        try {
            await fs.writeFile(this.sessionFile, JSON.stringify(sessionData, null, 2));
        } catch (error) {
            console.error('Failed to save session data:', error);
            throw error;
        }
    }

    /**
     * Helper methods for calculations
     */
    calculateAverageSuccessRate(metrics) {
        const hooks = Object.values(metrics.hooks).filter(h => h.totalExecutions > 0);
        if (hooks.length === 0) return 0;
        
        const totalRate = hooks.reduce((sum, hook) => sum + hook.successRate, 0);
        return Math.round((totalRate / hooks.length) * 100);
    }

    getMostValuableHook(metrics) {
        const hooks = Object.entries(metrics.hooks);
        if (hooks.length === 0) return null;

        const mostValuable = hooks.reduce((best, [id, hook]) => 
            hook.impactScore > (best.hook?.impactScore || 0) ? { id, hook } : best
        , {});

        return mostValuable.id || null;
    }

    calculateHookTrend(hookId, metrics) {
        const recentEntries = metrics.performanceHistory
            .filter(entry => entry.hookId === hookId)
            .slice(-10); // Last 10 executions

        if (recentEntries.length < 2) return 'stable';

        const recentSuccessRate = recentEntries.filter(e => e.success).length / recentEntries.length;
        const hook = metrics.hooks[hookId];
        
        if (recentSuccessRate > hook.successRate + 0.1) return 'improving';
        if (recentSuccessRate < hook.successRate - 0.1) return 'declining';
        return 'stable';
    }

    calculateTrendDirection(recentHistory) {
        if (recentHistory.length < 2) return 'stable';

        const midpoint = Math.floor(recentHistory.length / 2);
        const firstHalf = recentHistory.slice(0, midpoint);
        const secondHalf = recentHistory.slice(midpoint);

        const firstHalfSuccess = firstHalf.filter(e => e.success).length / firstHalf.length;
        const secondHalfSuccess = secondHalf.filter(e => e.success).length / secondHalf.length;

        if (secondHalfSuccess > firstHalfSuccess + 0.1) return 'improving';
        if (secondHalfSuccess < firstHalfSuccess - 0.1) return 'declining';
        return 'stable';
    }

    updateGlobalROI(metrics, session) {
        // Update weekly and monthly time savings
        const weeklyContribution = session.roi.totalTimeSaved / 7; // Assuming session is daily average
        const monthlyContribution = session.roi.totalTimeSaved / 30;

        metrics.roi.weeklyTimeSavings = (metrics.roi.weeklyTimeSavings || 0) + weeklyContribution;
        metrics.roi.monthlyTimeSavings = (metrics.roi.monthlyTimeSavings || 0) + monthlyContribution;

        // Estimate cost savings (assuming $50/hour developer rate)
        const hourlySavings = session.roi.totalTimeSaved / 3600;
        metrics.roi.estimatedCostSavings = (metrics.roi.estimatedCostSavings || 0) + (hourlySavings * 50);

        // Calculate productivity gain
        metrics.roi.productivityGain = session.roi.timeEfficiency;
    }

    generateOptimizationRecommendations(metrics) {
        const recommendations = [];

        // Check for underused hooks
        const underusedHooks = Object.entries(metrics.hooks)
            .filter(([id, hook]) => hook.totalExecutions < 5 && hook.impactScore > 5)
            .map(([id]) => id);

        if (underusedHooks.length > 0) {
            recommendations.push({
                type: 'increase_usage',
                priority: 'medium',
                message: `Consider promoting these valuable but underused hooks: ${underusedHooks.join(', ')}`,
                action: 'Review hook documentation and increase visibility'
            });
        }

        // Check for performance issues
        const slowHooks = Object.entries(metrics.hooks)
            .filter(([id, hook]) => hook.averageExecutionTime > 3000)
            .map(([id]) => id);

        if (slowHooks.length > 0) {
            recommendations.push({
                type: 'optimize_performance',
                priority: 'high',
                message: `These hooks have slow execution times: ${slowHooks.join(', ')}`,
                action: 'Review and optimize hook implementations'
            });
        }

        return recommendations;
    }

    getDefaultMetrics() {
        return {
            hooks: {},
            globalStats: {
                totalExecutions: 0,
                totalTimeSaved: 0,
                totalErrorsPrevented: 0,
                averageExecutionTime: 0,
                successRate: 0,
                lastUpdated: new Date().toISOString()
            },
            performanceHistory: [],
            roi: {
                weeklyTimeSavings: 0,
                monthlyTimeSavings: 0,
                estimatedCostSavings: 0,
                productivityGain: 0
            }
        };
    }

    getDefaultSessionData() {
        return {
            currentSession: {
                startTime: null,
                hooks: [],
                metrics: {}
            },
            previousSessions: [],
            sessionCount: 0
        };
    }
}

module.exports = HookPerformanceTracker;