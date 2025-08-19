/**
 * Repository Usage Tracker
 * 
 * Tracks which repositories users analyze and query
 * Provides personalized pre-loading based on actual usage patterns
 * Privacy-focused: Only tracks repository URLs, no user data
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class RepositoryUsageTracker extends EventEmitter {
    constructor() {
        super();
        this.usageStats = new Map();
        this.sessionStats = new Map();
        this.dataPath = path.join(__dirname, '../../data/repository-usage-stats.json');
        this.saveInterval = null;
        this.isDirty = false;
        
        // Configuration
        this.config = {
            autoSave: true,
            saveIntervalMs: 60000, // Save every minute
            maxTrackedRepos: 1000,
            minUsageForRecommendation: 3,
            decayFactor: 0.95, // Decay old usage over time
            privacyMode: true // Don't track user identifiers
        };
        
        this.initialize();
    }

    /**
     * Initialize the tracker
     */
    async initialize() {
        try {
            // Load existing usage statistics
            await this.loadUsageStats();
            
            // Set up auto-save
            if (this.config.autoSave) {
                this.saveInterval = setInterval(() => {
                    if (this.isDirty) {
                        this.saveUsageStats();
                    }
                }, this.config.saveIntervalMs);
            }
            
            console.log('📊 [USAGE-TRACKER] Repository usage tracking initialized');
            
        } catch (error) {
            console.error('❌ [USAGE-TRACKER] Failed to initialize:', error);
        }
    }

    /**
     * Track repository analysis
     */
    trackAnalysis(repoUrl, metadata = {}) {
        try {
            const repoId = this.normalizeRepoUrl(repoUrl);
            
            if (!repoId) return;
            
            // Get or create usage record
            let usage = this.usageStats.get(repoId) || {
                url: repoUrl,
                firstSeen: Date.now(),
                lastUsed: Date.now(),
                analysisCount: 0,
                queryCount: 0,
                totalInteractions: 0,
                score: 0,
                metadata: {}
            };
            
            // Update usage statistics
            usage.analysisCount++;
            usage.totalInteractions++;
            usage.lastUsed = Date.now();
            usage.score = this.calculateUsageScore(usage);
            
            // Update metadata (language, stars, etc.)
            if (metadata) {
                usage.metadata = { ...usage.metadata, ...metadata };
            }
            
            this.usageStats.set(repoId, usage);
            this.isDirty = true;
            
            // Update session stats
            this.updateSessionStats(repoId, 'analysis');
            
            // Emit event for real-time monitoring
            this.emit('repository:analyzed', {
                repository: repoId,
                usage: usage
            });
            
            console.log(`📈 [USAGE-TRACKER] Tracked analysis: ${repoId} (count: ${usage.analysisCount})`);
            
        } catch (error) {
            console.error('❌ [USAGE-TRACKER] Failed to track analysis:', error);
        }
    }

    /**
     * Track repository query
     */
    trackQuery(repoUrl, query = '') {
        try {
            const repoId = this.normalizeRepoUrl(repoUrl);
            
            if (!repoId) return;
            
            // Get or create usage record
            let usage = this.usageStats.get(repoId) || {
                url: repoUrl,
                firstSeen: Date.now(),
                lastUsed: Date.now(),
                analysisCount: 0,
                queryCount: 0,
                totalInteractions: 0,
                score: 0,
                queries: [],
                metadata: {}
            };
            
            // Update usage statistics
            usage.queryCount++;
            usage.totalInteractions++;
            usage.lastUsed = Date.now();
            usage.score = this.calculateUsageScore(usage);
            
            // Track query types (optional)
            if (query && usage.queries) {
                if (!usage.queries) usage.queries = [];
                usage.queries.push({
                    timestamp: Date.now(),
                    type: this.categorizeQuery(query)
                });
                
                // Keep only recent queries
                if (usage.queries.length > 10) {
                    usage.queries = usage.queries.slice(-10);
                }
            }
            
            this.usageStats.set(repoId, usage);
            this.isDirty = true;
            
            // Update session stats
            this.updateSessionStats(repoId, 'query');
            
            // Emit event
            this.emit('repository:queried', {
                repository: repoId,
                usage: usage
            });
            
        } catch (error) {
            console.error('❌ [USAGE-TRACKER] Failed to track query:', error);
        }
    }

    /**
     * Get most used repositories for pre-loading
     */
    getMostUsedRepositories(limit = 20) {
        try {
            // Convert to array and sort by score
            const sorted = Array.from(this.usageStats.values())
                .filter(usage => usage.totalInteractions >= this.config.minUsageForRecommendation)
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
            
            return sorted.map(usage => ({
                url: usage.url,
                score: usage.score,
                analysisCount: usage.analysisCount,
                queryCount: usage.queryCount,
                lastUsed: usage.lastUsed,
                metadata: usage.metadata
            }));
            
        } catch (error) {
            console.error('❌ [USAGE-TRACKER] Failed to get most used:', error);
            return [];
        }
    }

    /**
     * Get personalized recommendations
     */
    getPersonalizedRecommendations(limit = 10) {
        try {
            const recentlyUsed = this.getRecentlyUsed(5);
            const frequentlyUsed = this.getFrequentlyUsed(10);
            const recommendations = new Map();
            
            // Combine recent and frequent
            [...recentlyUsed, ...frequentlyUsed].forEach(repo => {
                if (!recommendations.has(repo.url)) {
                    recommendations.set(repo.url, repo);
                }
            });
            
            // Add related repositories based on patterns
            const related = this.getRelatedRepositories(recentlyUsed);
            related.forEach(repo => {
                if (!recommendations.has(repo.url)) {
                    recommendations.set(repo.url, repo);
                }
            });
            
            return Array.from(recommendations.values()).slice(0, limit);
            
        } catch (error) {
            console.error('❌ [USAGE-TRACKER] Failed to get recommendations:', error);
            return [];
        }
    }

    /**
     * Get recently used repositories
     */
    getRecentlyUsed(limit = 10) {
        return Array.from(this.usageStats.values())
            .sort((a, b) => b.lastUsed - a.lastUsed)
            .slice(0, limit);
    }

    /**
     * Get frequently used repositories
     */
    getFrequentlyUsed(limit = 10) {
        return Array.from(this.usageStats.values())
            .sort((a, b) => b.totalInteractions - a.totalInteractions)
            .slice(0, limit);
    }

    /**
     * Get related repositories based on usage patterns
     */
    getRelatedRepositories(repositories) {
        const related = [];
        
        // Simple pattern matching - can be enhanced with ML
        const patterns = {
            'react': ['next.js', 'gatsby', 'redux', 'react-router'],
            'vue': ['nuxt', 'vuex', 'vue-router', 'pinia'],
            'angular': ['rxjs', 'ngrx', 'angular-material'],
            'express': ['koa', 'fastify', 'nestjs', 'hapi'],
            'tailwind': ['postcss', 'autoprefixer', 'headlessui']
        };
        
        repositories.forEach(repo => {
            const repoName = repo.url.split('/').pop().toLowerCase();
            Object.keys(patterns).forEach(key => {
                if (repoName.includes(key)) {
                    patterns[key].forEach(suggestion => {
                        related.push({
                            url: `github.com/${suggestion}`,
                            reason: `Related to ${repoName}`,
                            score: repo.score * 0.5
                        });
                    });
                }
            });
        });
        
        return related;
    }

    /**
     * Calculate usage score with time decay
     */
    calculateUsageScore(usage) {
        const now = Date.now();
        const daysSinceLastUse = (now - usage.lastUsed) / (1000 * 60 * 60 * 24);
        const recencyFactor = Math.pow(this.config.decayFactor, daysSinceLastUse);
        
        // Weighted score
        const score = (
            usage.analysisCount * 10 +
            usage.queryCount * 5 +
            usage.totalInteractions * 2
        ) * recencyFactor;
        
        return Math.round(score);
    }

    /**
     * Update session statistics
     */
    updateSessionStats(repoId, action) {
        const sessionId = this.getCurrentSessionId();
        
        if (!this.sessionStats.has(sessionId)) {
            this.sessionStats.set(sessionId, {
                startTime: Date.now(),
                repositories: new Set(),
                actions: []
            });
        }
        
        const session = this.sessionStats.get(sessionId);
        session.repositories.add(repoId);
        session.actions.push({
            repository: repoId,
            action: action,
            timestamp: Date.now()
        });
        
        // Keep only last 100 actions
        if (session.actions.length > 100) {
            session.actions = session.actions.slice(-100);
        }
    }

    /**
     * Get current session ID (simplified)
     */
    getCurrentSessionId() {
        // Use date as session ID for simplicity
        const date = new Date();
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }

    /**
     * Normalize repository URL
     */
    normalizeRepoUrl(url) {
        try {
            // Extract owner/repo from various URL formats
            const patterns = [
                /github\.com\/([^\/]+\/[^\/\?#]+)/,
                /^([^\/]+\/[^\/]+)$/
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                    return match[1].replace('.git', '');
                }
            }
            
            return url;
            
        } catch (error) {
            return null;
        }
    }

    /**
     * Categorize query type
     */
    categorizeQuery(query) {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('how') || lowerQuery.includes('what')) {
            return 'explanation';
        } else if (lowerQuery.includes('example') || lowerQuery.includes('code')) {
            return 'example';
        } else if (lowerQuery.includes('error') || lowerQuery.includes('bug')) {
            return 'debugging';
        } else if (lowerQuery.includes('test')) {
            return 'testing';
        } else if (lowerQuery.includes('auth') || lowerQuery.includes('security')) {
            return 'security';
        } else {
            return 'general';
        }
    }

    /**
     * Load usage statistics from file
     */
    async loadUsageStats() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf8');
            const parsed = JSON.parse(data);
            
            // Convert array to Map
            if (Array.isArray(parsed)) {
                parsed.forEach(usage => {
                    const repoId = this.normalizeRepoUrl(usage.url);
                    if (repoId) {
                        this.usageStats.set(repoId, usage);
                    }
                });
            } else if (parsed.repositories) {
                parsed.repositories.forEach(usage => {
                    const repoId = this.normalizeRepoUrl(usage.url);
                    if (repoId) {
                        this.usageStats.set(repoId, usage);
                    }
                });
            }
            
            console.log(`📂 [USAGE-TRACKER] Loaded ${this.usageStats.size} repository usage records`);
            
        } catch (error) {
            // File doesn't exist or is invalid - start fresh
            console.log('📝 [USAGE-TRACKER] Starting with fresh usage statistics');
        }
    }

    /**
     * Save usage statistics to file
     */
    async saveUsageStats() {
        try {
            // Apply decay to old entries
            this.applyDecay();
            
            // Remove very old or unused entries
            this.pruneOldEntries();
            
            const data = {
                version: '1.0',
                lastUpdated: new Date().toISOString(),
                repositories: Array.from(this.usageStats.values())
            };
            
            await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
            await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
            
            this.isDirty = false;
            console.log(`💾 [USAGE-TRACKER] Saved ${this.usageStats.size} usage records`);
            
        } catch (error) {
            console.error('❌ [USAGE-TRACKER] Failed to save usage stats:', error);
        }
    }

    /**
     * Apply time decay to scores
     */
    applyDecay() {
        this.usageStats.forEach((usage, repoId) => {
            usage.score = this.calculateUsageScore(usage);
            
            // Remove if score is too low
            if (usage.score < 1) {
                this.usageStats.delete(repoId);
            }
        });
    }

    /**
     * Prune old entries to prevent unbounded growth
     */
    pruneOldEntries() {
        if (this.usageStats.size > this.config.maxTrackedRepos) {
            // Sort by score and keep top entries
            const sorted = Array.from(this.usageStats.entries())
                .sort((a, b) => b[1].score - a[1].score)
                .slice(0, this.config.maxTrackedRepos);
            
            this.usageStats.clear();
            sorted.forEach(([key, value]) => {
                this.usageStats.set(key, value);
            });
        }
    }

    /**
     * Get usage analytics
     */
    getAnalytics() {
        const analytics = {
            totalRepositories: this.usageStats.size,
            totalAnalyses: 0,
            totalQueries: 0,
            mostAnalyzed: [],
            mostQueried: [],
            recentActivity: [],
            popularLanguages: {},
            queryTypes: {}
        };
        
        // Calculate totals and find top repos
        const analysisList = [];
        const queryList = [];
        
        this.usageStats.forEach(usage => {
            analytics.totalAnalyses += usage.analysisCount;
            analytics.totalQueries += usage.queryCount;
            
            analysisList.push({
                repository: usage.url,
                count: usage.analysisCount
            });
            
            queryList.push({
                repository: usage.url,
                count: usage.queryCount
            });
            
            // Track languages
            if (usage.metadata?.language) {
                const lang = usage.metadata.language;
                analytics.popularLanguages[lang] = (analytics.popularLanguages[lang] || 0) + 1;
            }
        });
        
        // Sort and get top entries
        analytics.mostAnalyzed = analysisList
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        analytics.mostQueried = queryList
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        // Get recent activity
        analytics.recentActivity = this.getRecentlyUsed(5).map(usage => ({
            repository: usage.url,
            lastUsed: new Date(usage.lastUsed).toISOString()
        }));
        
        return analytics;
    }

    /**
     * Clean up on shutdown
     */
    async shutdown() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }
        
        if (this.isDirty) {
            await this.saveUsageStats();
        }
        
        console.log('👋 [USAGE-TRACKER] Shutdown complete');
    }
}

// Export singleton instance
let globalTracker = null;

function getInstance() {
    if (!globalTracker) {
        globalTracker = new RepositoryUsageTracker();
    }
    return globalTracker;
}

module.exports = {
    RepositoryUsageTracker,
    getInstance
};