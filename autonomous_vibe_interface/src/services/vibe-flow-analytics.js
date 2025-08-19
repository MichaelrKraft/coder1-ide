/**
 * VibeFlowAnalytics - Enhanced analytics with intent tracking for Vibe Coders
 * 
 * Tracks not just tokens, but the intent and context behind each Claude request.
 * Learns patterns, predicts needs, and optimizes workflow automatically.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class VibeFlowAnalytics {
    constructor() {
        this.dataFile = path.join(__dirname, '../../data/vibe-flow-analytics.json');
        this.patternsFile = path.join(__dirname, '../../data/detected-patterns.json');
        
        // Current session tracking
        this.currentSession = {
            id: this.generateSessionId(),
            startTime: Date.now(),
            requests: [],
            totalTokens: 0,
            totalCost: 0,
            intents: {},
            patterns: []
        };
        
        // Intent categories for vibe coders
        this.intentCategories = {
            'ui_building': ['button', 'form', 'layout', 'style', 'component', 'design'],
            'feature_adding': ['add', 'implement', 'create', 'feature', 'functionality'],
            'bug_fixing': ['fix', 'error', 'bug', 'issue', 'problem', 'debug'],
            'deployment': ['deploy', 'host', 'publish', 'live', 'production'],
            'testing': ['test', 'check', 'verify', 'validate', 'ensure'],
            'documentation': ['document', 'readme', 'explain', 'comment', 'describe'],
            'optimization': ['optimize', 'improve', 'faster', 'better', 'refactor'],
            'data_handling': ['database', 'api', 'fetch', 'store', 'save']
        };
        
        // Pattern detection settings
        this.patternThreshold = 3; // Minimum occurrences to detect pattern
        this.patternWindow = 5; // Look at last N requests for patterns
        
        this.initializeDataFiles();
    }
    
    generateSessionId() {
        return `vibe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    async initializeDataFiles() {
        try {
            await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
            
            // Initialize analytics file
            try {
                await fs.access(this.dataFile);
            } catch {
                const defaultData = {
                    sessions: [],
                    totalTokensAllTime: 0,
                    totalCostAllTime: 0,
                    intentDistribution: {},
                    commonPatterns: [],
                    efficiencyMetrics: {
                        tokensPerFeature: 0,
                        averageRequestSize: 0,
                        patternSavings: 0
                    },
                    lastUpdated: new Date().toISOString()
                };
                await this.saveData(defaultData);
            }
            
            // Initialize patterns file
            try {
                await fs.access(this.patternsFile);
            } catch {
                await this.savePatterns([]);
            }
        } catch (error) {
            console.log('VibeFlowAnalytics initialization failed:', error.message);
        }
    }
    
    async loadData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.log('Failed to load vibe flow data:', error.message);
            return {
                sessions: [],
                totalTokensAllTime: 0,
                totalCostAllTime: 0,
                intentDistribution: {},
                commonPatterns: [],
                efficiencyMetrics: {},
                lastUpdated: new Date().toISOString()
            };
        }
    }
    
    async saveData(data) {
        try {
            data.lastUpdated = new Date().toISOString();
            await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.log('Failed to save vibe flow data:', error.message);
        }
    }
    
    async loadPatterns() {
        try {
            const data = await fs.readFile(this.patternsFile, 'utf8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }
    
    async savePatterns(patterns) {
        try {
            await fs.writeFile(this.patternsFile, JSON.stringify(patterns, null, 2));
        } catch (error) {
            console.log('Failed to save patterns:', error.message);
        }
    }
    
    /**
     * Track a Claude API request with intent analysis
     */
    async trackRequest(request, response, tokens, cost) {
        const intent = this.detectIntent(request);
        const timestamp = Date.now();
        
        const requestData = {
            timestamp,
            request: request.substring(0, 200), // Store truncated for privacy
            intent,
            tokens,
            cost,
            success: !!response,
            sessionId: this.currentSession.id
        };
        
        // Update current session
        this.currentSession.requests.push(requestData);
        this.currentSession.totalTokens += tokens;
        this.currentSession.totalCost += cost;
        
        // Track intent distribution
        if (!this.currentSession.intents[intent]) {
            this.currentSession.intents[intent] = 0;
        }
        this.currentSession.intents[intent]++;
        
        // Detect patterns
        await this.detectPatterns();
        
        // Save to persistent storage
        await this.updatePersistentData(requestData);
        
        return {
            intent,
            sessionTokens: this.currentSession.totalTokens,
            sessionCost: this.currentSession.totalCost,
            patterns: this.currentSession.patterns
        };
    }
    
    /**
     * Detect the intent behind a Claude request
     */
    detectIntent(request) {
        const lowerRequest = request.toLowerCase();
        
        for (const [category, keywords] of Object.entries(this.intentCategories)) {
            for (const keyword of keywords) {
                if (lowerRequest.includes(keyword)) {
                    return category;
                }
            }
        }
        
        return 'general';
    }
    
    /**
     * Detect patterns in request sequences
     */
    async detectPatterns() {
        if (this.currentSession.requests.length < this.patternWindow) {
            return;
        }
        
        const recentRequests = this.currentSession.requests.slice(-this.patternWindow);
        const patterns = await this.loadPatterns();
        
        // Look for sequential intent patterns
        const intentSequence = recentRequests.map(r => r.intent).join(',');
        const sequenceHash = crypto.createHash('md5').update(intentSequence).digest('hex');
        
        // Check if this pattern exists
        let pattern = patterns.find(p => p.hash === sequenceHash);
        
        if (pattern) {
            pattern.frequency++;
            pattern.lastSeen = Date.now();
            
            // If pattern is frequent enough, suggest automation
            if (pattern.frequency >= this.patternThreshold) {
                this.currentSession.patterns.push({
                    sequence: pattern.sequence,
                    frequency: pattern.frequency,
                    potentialSavings: this.calculateSavings(pattern),
                    suggestion: this.generateHookSuggestion(pattern)
                });
            }
        } else {
            // New pattern discovered
            pattern = {
                hash: sequenceHash,
                sequence: recentRequests.map(r => r.intent),
                frequency: 1,
                averageTokens: recentRequests.reduce((sum, r) => sum + r.tokens, 0) / recentRequests.length,
                firstSeen: Date.now(),
                lastSeen: Date.now()
            };
            patterns.push(pattern);
        }
        
        await this.savePatterns(patterns);
    }
    
    /**
     * Calculate potential token savings from automating a pattern
     */
    calculateSavings(pattern) {
        const dailyOccurrences = pattern.frequency / 7; // Assume weekly data
        const tokensPerOccurrence = pattern.averageTokens;
        const potentialDailySavings = dailyOccurrences * tokensPerOccurrence * 0.8; // 80% savings
        
        return {
            dailyTokens: Math.floor(potentialDailySavings),
            weeklyCost: (potentialDailySavings * 7 * 0.0001).toFixed(2) // Rough cost estimate
        };
    }
    
    /**
     * Generate hook suggestion for a pattern
     */
    generateHookSuggestion(pattern) {
        const intentDescriptions = {
            'ui_building': 'Building UI components',
            'feature_adding': 'Adding new features',
            'bug_fixing': 'Fixing bugs',
            'deployment': 'Deploying changes',
            'testing': 'Running tests',
            'documentation': 'Updating documentation',
            'optimization': 'Optimizing code',
            'data_handling': 'Working with data'
        };
        
        const steps = pattern.sequence.map(intent => intentDescriptions[intent] || intent);
        
        return {
            name: `Auto-${steps[0]}`,
            description: `Automate: ${steps.join(' → ')}`,
            trigger: 'manual', // Can be customized
            estimatedSavings: this.calculateSavings(pattern).dailyTokens
        };
    }
    
    /**
     * Update persistent data storage
     */
    async updatePersistentData(requestData) {
        const data = await this.loadData();
        
        // Update totals
        data.totalTokensAllTime += requestData.tokens;
        data.totalCostAllTime += requestData.cost;
        
        // Update intent distribution
        if (!data.intentDistribution[requestData.intent]) {
            data.intentDistribution[requestData.intent] = 0;
        }
        data.intentDistribution[requestData.intent]++;
        
        // Calculate efficiency metrics
        const totalRequests = Object.values(data.intentDistribution).reduce((a, b) => a + b, 0);
        data.efficiencyMetrics.averageRequestSize = Math.floor(data.totalTokensAllTime / totalRequests);
        
        // Store session summary (keep last 100 sessions)
        if (this.currentSession.requests.length % 10 === 0) { // Save every 10 requests
            const sessionSummary = {
                id: this.currentSession.id,
                startTime: this.currentSession.startTime,
                endTime: Date.now(),
                totalTokens: this.currentSession.totalTokens,
                totalCost: this.currentSession.totalCost,
                intents: this.currentSession.intents,
                patterns: this.currentSession.patterns
            };
            
            data.sessions.push(sessionSummary);
            if (data.sessions.length > 100) {
                data.sessions = data.sessions.slice(-100);
            }
        }
        
        await this.saveData(data);
    }
    
    /**
     * Get real-time metrics for dashboard
     */
    async getRealtimeMetrics() {
        const data = await this.loadData();
        const patterns = await this.loadPatterns();
        
        // Calculate burn rate (tokens per minute)
        const sessionDuration = (Date.now() - this.currentSession.startTime) / 60000;
        const burnRate = sessionDuration > 0 ? 
            Math.floor(this.currentSession.totalTokens / sessionDuration) : 0;
        
        // Get top patterns that could be automated
        const automationOpportunities = patterns
            .filter(p => p.frequency >= this.patternThreshold)
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 3)
            .map(p => this.generateHookSuggestion(p));
        
        return {
            session: {
                id: this.currentSession.id,
                duration: Math.floor(sessionDuration),
                totalTokens: this.currentSession.totalTokens,
                totalCost: this.currentSession.totalCost.toFixed(2),
                burnRate,
                requestCount: this.currentSession.requests.length
            },
            intents: this.currentSession.intents,
            patterns: this.currentSession.patterns,
            automationOpportunities,
            efficiency: {
                tokensPerRequest: this.currentSession.requests.length > 0 ?
                    Math.floor(this.currentSession.totalTokens / this.currentSession.requests.length) : 0,
                mostCommonIntent: Object.entries(this.currentSession.intents)
                    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
                patternSavingsPotential: automationOpportunities
                    .reduce((sum, opp) => sum + (opp.estimatedSavings || 0), 0)
            },
            lifetime: {
                totalTokens: data.totalTokensAllTime,
                totalCost: data.totalCostAllTime.toFixed(2),
                totalSessions: data.sessions.length
            }
        };
    }
    
    /**
     * Get insights for coaching
     */
    async getCoachingInsights() {
        const metrics = await this.getRealtimeMetrics();
        const insights = [];
        
        // High burn rate warning
        if (metrics.session.burnRate > 100) {
            insights.push({
                type: 'warning',
                title: 'High Token Usage',
                message: `You're using ${metrics.session.burnRate} tokens/minute. Consider breaking requests into smaller chunks.`,
                priority: 'high'
            });
        }
        
        // Pattern automation opportunity
        if (metrics.automationOpportunities.length > 0) {
            const topOpp = metrics.automationOpportunities[0];
            insights.push({
                type: 'opportunity',
                title: 'Automate This Pattern',
                message: `You frequently ${topOpp.description}. Create a hook to save ~${topOpp.estimatedSavings} tokens daily.`,
                priority: 'medium',
                action: 'create_hook'
            });
        }
        
        // Intent-based suggestions
        if (metrics.efficiency.mostCommonIntent === 'bug_fixing' && metrics.session.requestCount > 5) {
            insights.push({
                type: 'tip',
                title: 'Debugging Tip',
                message: 'Try asking Claude to add comprehensive error handling upfront to reduce bug fixing requests.',
                priority: 'low'
            });
        }
        
        return insights;
    }
    
    /**
     * Export session data for reports
     */
    async exportSessionData(format = 'json') {
        const data = await this.loadData();
        const metrics = await this.getRealtimeMetrics();
        
        const exportData = {
            generated: new Date().toISOString(),
            currentSession: metrics.session,
            patterns: metrics.patterns,
            automationOpportunities: metrics.automationOpportunities,
            lifetime: metrics.lifetime,
            intentBreakdown: data.intentDistribution,
            efficiencyMetrics: data.efficiencyMetrics
        };
        
        if (format === 'csv') {
            // Convert to CSV format for spreadsheets
            const csv = this.convertToCSV(exportData);
            return csv;
        }
        
        return exportData;
    }
    
    convertToCSV(data) {
        // Simple CSV conversion for session data
        const rows = [
            ['Metric', 'Value'],
            ['Session ID', data.currentSession.id],
            ['Total Tokens', data.currentSession.totalTokens],
            ['Total Cost', data.currentSession.totalCost],
            ['Burn Rate', data.currentSession.burnRate],
            ['Request Count', data.currentSession.requestCount],
            ['Lifetime Tokens', data.lifetime.totalTokens],
            ['Lifetime Cost', data.lifetime.totalCost]
        ];
        
        return rows.map(row => row.join(',')).join('\n');
    }
    
    /**
     * Get usage history for chart visualization
     */
    async getUsageHistory(days = 7) {
        const data = await this.loadData();
        const now = new Date();
        const usageData = {
            labels: [],
            datasets: [
                { data: [] }, // Daily usage
                { data: [] }  // Cumulative total
            ]
        };
        
        let cumulative = 0;
        
        // Get last 'days' worth of data
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            // Format label
            const label = date.toLocaleDateString('en', { 
                weekday: 'short', 
                month: 'numeric', 
                day: 'numeric' 
            });
            usageData.labels.push(label);
            
            // Find sessions for this day
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            
            const daySessions = data.sessions.filter(session => {
                const sessionDate = new Date(session.startTime);
                return sessionDate >= dayStart && sessionDate <= dayEnd;
            });
            
            // Calculate daily usage
            const dailyUsage = daySessions.reduce((sum, session) => sum + (session.totalTokens || 0), 0);
            cumulative += dailyUsage;
            
            usageData.datasets[0].data.push(dailyUsage);
            usageData.datasets[1].data.push(cumulative);
        }
        
        return usageData;
    }
}

// Singleton instance
let instance = null;

module.exports = {
    getInstance: () => {
        if (!instance) {
            instance = new VibeFlowAnalytics();
        }
        return instance;
    },
    VibeFlowAnalytics
};