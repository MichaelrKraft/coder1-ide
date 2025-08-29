/**
 * Repository Trends Updater
 * 
 * Automatically updates the list of popular repositories weekly
 * Keeps the pre-loading system current with GitHub trends
 * Runs in background without affecting server performance
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class RepositoryTrendsUpdater extends EventEmitter {
    constructor() {
        super();
        this.isRunning = false;
        this.updateInterval = null;
        this.lastUpdate = null;
        this.trendingPath = path.join(__dirname, '../../data/trending-repositories.json');
        
        // Configuration
        this.config = {
            enabled: false, // Disabled by default, enable in config
            updateInterval: 7 * 24 * 60 * 60 * 1000, // Weekly
            checkInterval: 60 * 60 * 1000, // Check every hour if update needed
            maxRetries: 3,
            retryDelay: 60 * 60 * 1000, // 1 hour between retries
            notificationThreshold: 10 // Notify if trends change by this many repos
        };
    }

    /**
     * Initialize the updater
     */
    async initialize(config = {}) {
        try {
            // Merge configuration
            this.config = { ...this.config, ...config };
            
            if (!this.config.enabled) {
                console.log('📅 [TRENDS] Repository trends updater is disabled');
                return false;
            }
            
            console.log('📈 [TRENDS] Initializing repository trends updater...');
            
            // Load last update time
            await this.loadLastUpdateTime();
            
            // Check if immediate update is needed
            if (this.needsUpdate()) {
                console.log('🔄 [TRENDS] Trends are outdated, scheduling update...');
                setTimeout(() => this.updateTrends(), 5000); // Update after 5 seconds
            }
            
            // Set up periodic check
            this.updateInterval = setInterval(() => {
                if (this.needsUpdate()) {
                    this.updateTrends();
                }
            }, this.config.checkInterval);
            
            console.log('✅ [TRENDS] Repository trends updater initialized');
            console.log('   Update frequency: Weekly');
            console.log(`   Last update: ${this.lastUpdate ? new Date(this.lastUpdate).toISOString() : 'Never'}`);
            
            return true;
            
        } catch (error) {
            console.error('❌ [TRENDS] Failed to initialize trends updater:', error);
            return false;
        }
    }

    /**
     * Check if trends need updating
     */
    needsUpdate() {
        if (!this.lastUpdate) {
            return true;
        }
        
        const timeSinceUpdate = Date.now() - this.lastUpdate;
        return timeSinceUpdate > this.config.updateInterval;
    }

    /**
     * Update trending repositories
     */
    async updateTrends() {
        if (this.isRunning) {
            console.log('⚠️ [TRENDS] Update already in progress');
            return;
        }
        
        this.isRunning = true;
        console.log('🔄 [TRENDS] Starting weekly trends update...');
        
        try {
            // Get current popular repositories
            const { getInstance: getPopularityService } = require('./repository-popularity-service');
            const popularityService = getPopularityService();
            
            const newTrends = await popularityService.getPopularRepositories({
                minStars: 1000,
                limit: 100,
                includeTrending: true,
                includeFrameworks: true,
                useCache: false // Force fresh fetch
            });
            
            // Load previous trends for comparison
            const previousTrends = await this.loadPreviousTrends();
            
            // Analyze changes
            const changes = this.analyzeTrendChanges(previousTrends, newTrends);
            
            // Save new trends
            await this.saveTrends(newTrends, changes);
            
            // Update last update time
            this.lastUpdate = Date.now();
            await this.saveLastUpdateTime();
            
            // Emit event with changes
            this.emit('trends:updated', {
                timestamp: this.lastUpdate,
                totalRepositories: newTrends.length,
                changes: changes
            });
            
            // Log summary
            this.logUpdateSummary(changes);
            
            // Notify if significant changes
            if (changes.newEntries.length >= this.config.notificationThreshold) {
                this.notifySignificantChanges(changes);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ [TRENDS] Failed to update trends:', error);
            this.emit('trends:error', error);
            
            // Schedule retry
            if (this.config.maxRetries > 0) {
                console.log(`⏰ [TRENDS] Scheduling retry in ${this.config.retryDelay / 1000 / 60} minutes...`);
                setTimeout(() => this.updateTrends(), this.config.retryDelay);
            }
            
            return false;
            
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Analyze changes between previous and new trends
     */
    analyzeTrendChanges(previous, current) {
        const changes = {
            newEntries: [],
            removed: [],
            risingStars: [],
            fallingStars: [],
            topMovers: []
        };
        
        // Create maps for easy lookup
        const prevMap = new Map(previous.map(r => [r.full_name, r]));
        const currMap = new Map(current.map(r => [r.full_name, r]));
        
        // Find new entries
        current.forEach(repo => {
            if (!prevMap.has(repo.full_name)) {
                changes.newEntries.push({
                    name: repo.full_name,
                    stars: repo.stars,
                    language: repo.language
                });
            }
        });
        
        // Find removed entries
        previous.forEach(repo => {
            if (!currMap.has(repo.full_name)) {
                changes.removed.push({
                    name: repo.full_name,
                    stars: repo.stars
                });
            }
        });
        
        // Find rising/falling stars
        current.forEach((repo, index) => {
            const prevRepo = prevMap.get(repo.full_name);
            if (prevRepo) {
                const prevIndex = previous.findIndex(r => r.full_name === repo.full_name);
                const rankChange = prevIndex - index;
                
                if (rankChange > 5) {
                    changes.risingStars.push({
                        name: repo.full_name,
                        rankChange: rankChange,
                        newRank: index + 1,
                        oldRank: prevIndex + 1
                    });
                } else if (rankChange < -5) {
                    changes.fallingStars.push({
                        name: repo.full_name,
                        rankChange: rankChange,
                        newRank: index + 1,
                        oldRank: prevIndex + 1
                    });
                }
                
                // Track top movers
                if (Math.abs(rankChange) > 10) {
                    changes.topMovers.push({
                        name: repo.full_name,
                        rankChange: rankChange,
                        direction: rankChange > 0 ? 'up' : 'down'
                    });
                }
            }
        });
        
        // Sort by significance
        changes.risingStars.sort((a, b) => b.rankChange - a.rankChange);
        changes.topMovers.sort((a, b) => Math.abs(b.rankChange) - Math.abs(a.rankChange));
        
        return changes;
    }

    /**
     * Save trending repositories
     */
    async saveTrends(trends, changes) {
        try {
            const data = {
                version: '1.0',
                lastUpdated: new Date().toISOString(),
                updateFrequency: 'weekly',
                totalRepositories: trends.length,
                changes: {
                    summary: {
                        newEntries: changes.newEntries.length,
                        removed: changes.removed.length,
                        risingStars: changes.risingStars.length,
                        fallingStars: changes.fallingStars.length
                    },
                    details: changes
                },
                repositories: trends
            };
            
            await fs.mkdir(path.dirname(this.trendingPath), { recursive: true });
            await fs.writeFile(this.trendingPath, JSON.stringify(data, null, 2));
            
            console.log(`💾 [TRENDS] Saved ${trends.length} trending repositories`);
            
        } catch (error) {
            console.error('❌ [TRENDS] Failed to save trends:', error);
            throw error;
        }
    }

    /**
     * Load previous trends
     */
    async loadPreviousTrends() {
        try {
            const data = await fs.readFile(this.trendingPath, 'utf8');
            const parsed = JSON.parse(data);
            return parsed.repositories || [];
        } catch (error) {
            // No previous trends
            return [];
        }
    }

    /**
     * Load last update time
     */
    async loadLastUpdateTime() {
        try {
            const data = await fs.readFile(this.trendingPath, 'utf8');
            const parsed = JSON.parse(data);
            if (parsed.lastUpdated) {
                this.lastUpdate = new Date(parsed.lastUpdated).getTime();
            }
        } catch (error) {
            // No previous update
            this.lastUpdate = null;
        }
    }

    /**
     * Save last update time
     */
    async saveLastUpdateTime() {
        // Time is saved with the trends data
    }

    /**
     * Log update summary
     */
    logUpdateSummary(changes) {
        console.log('\n' + '='.repeat(50));
        console.log('📊 WEEKLY TRENDS UPDATE COMPLETE');
        console.log('='.repeat(50));
        console.log(`🆕 New trending: ${changes.newEntries.length} repositories`);
        console.log(`📈 Rising stars: ${changes.risingStars.length} repositories`);
        console.log(`📉 Falling stars: ${changes.fallingStars.length} repositories`);
        console.log(`🔄 Top movers: ${changes.topMovers.length} repositories`);
        
        if (changes.newEntries.length > 0) {
            console.log('\n🌟 Top new entries:');
            changes.newEntries.slice(0, 5).forEach(repo => {
                console.log(`   • ${repo.name} (${repo.stars} stars)`);
            });
        }
        
        if (changes.risingStars.length > 0) {
            console.log('\n🚀 Fastest rising:');
            changes.risingStars.slice(0, 3).forEach(repo => {
                console.log(`   • ${repo.name} (↑${repo.rankChange} positions)`);
            });
        }
        
        console.log('='.repeat(50));
    }

    /**
     * Notify about significant changes
     */
    notifySignificantChanges(changes) {
        console.log('\n🔔 SIGNIFICANT TREND CHANGES DETECTED!');
        console.log(`   ${changes.newEntries.length} new repositories entered trending`);
        console.log('   Consider updating pre-load configuration');
        
        // Emit event for external handling
        this.emit('trends:significant-change', changes);
    }

    /**
     * Get current trends
     */
    async getCurrentTrends() {
        try {
            const data = await fs.readFile(this.trendingPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    /**
     * Force immediate update
     */
    async forceUpdate() {
        console.log('⚡ [TRENDS] Forcing immediate trends update...');
        return await this.updateTrends();
    }

    /**
     * Stop the updater
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('🛑 [TRENDS] Repository trends updater stopped');
    }
}

// Export singleton instance
let globalUpdater = null;

function getInstance() {
    if (!globalUpdater) {
        globalUpdater = new RepositoryTrendsUpdater();
    }
    return globalUpdater;
}

module.exports = {
    RepositoryTrendsUpdater,
    getInstance
};