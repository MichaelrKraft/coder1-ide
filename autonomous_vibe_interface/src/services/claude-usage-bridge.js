/**
 * Claude Code Usage Monitor Bridge Service
 * Integrates with Claude Code Usage Monitor tool by Maciek-roboblog
 * Reads usage data from ~/.claude-monitor/last_used.json
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const EventEmitter = require('events');

class ClaudeUsageBridge extends EventEmitter {
    constructor() {
        super();
        this.monitorPath = path.join(os.homedir(), '.claude-monitor', 'last_used.json');
        this.isWatching = false;
        this.watchInterval = null;
        this.lastFileStats = null;
        this.cachedData = null;
        this.cacheTimestamp = 0;
        this.cacheTTL = 5000; // 5 seconds cache
    }

    /**
     * Initialize the bridge service
     */
    async initialize() {
        try {
            // Check if Claude Code Usage Monitor is installed
            const exists = await this.checkMonitorInstallation();
            if (!exists) {
                console.warn('⚠️ [USAGE-BRIDGE] Claude Code Usage Monitor not found at:', this.monitorPath);
                return false;
            }

            console.log('✅ [USAGE-BRIDGE] Claude Code Usage Monitor detected');
            return true;
        } catch (error) {
            console.error('❌ [USAGE-BRIDGE] Initialization failed:', error.message);
            return false;
        }
    }

    /**
     * Check if the Usage Monitor is installed and has data
     */
    async checkMonitorInstallation() {
        try {
            await fs.access(this.monitorPath);
            const stats = await fs.stat(this.monitorPath);
            return stats.isFile() && stats.size > 0;
        } catch {
            return false;
        }
    }

    /**
     * Read and parse usage data from the monitor file
     */
    async readUsageData() {
        try {
            // Return cached data if still valid
            const now = Date.now();
            if (this.cachedData && (now - this.cacheTimestamp) < this.cacheTTL) {
                return this.cachedData;
            }

            const data = await fs.readFile(this.monitorPath, 'utf8');
            const usageData = JSON.parse(data);
            
            // Cache the parsed data
            this.cachedData = this.parseUsageData(usageData);
            this.cacheTimestamp = now;
            
            return this.cachedData;
        } catch (error) {
            console.log('📊 [USAGE-BRIDGE] No usage data available yet:', error.message);
            return this.getMockData();
        }
    }

    /**
     * Parse raw usage data into dashboard-friendly format
     */
    parseUsageData(rawData) {
        const now = new Date();
        const today = now.toDateString();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Extract key metrics from Claude Code Usage Monitor data
        const metrics = {
            tokenUsage: {
                used: rawData.tokens_used || 0,
                limit: rawData.monthly_limit || 10000,
                thisMonth: rawData.monthly_usage || 0,
                dailyUsage: rawData.daily_usage || 0,
                burnRate: this.calculateBurnRate(rawData)
            },
            sessionAnalytics: {
                currentSession: {
                    duration: rawData.session_duration || 0,
                    commands: rawData.session_commands || 0,
                    tokensUsed: rawData.session_tokens || 0
                },
                totalSessions: rawData.total_sessions || 0,
                averageSessionLength: rawData.avg_session_length || 0
            },
            usage: {
                today: {
                    tokens: rawData.daily_usage || 0,
                    sessions: rawData.daily_sessions || 0,
                    duration: rawData.daily_duration || 0
                },
                week: {
                    tokens: rawData.weekly_usage || 0,
                    sessions: rawData.weekly_sessions || 0,
                    duration: rawData.weekly_duration || 0
                },
                month: {
                    tokens: rawData.monthly_usage || 0,
                    sessions: rawData.monthly_sessions || 0,
                    duration: rawData.monthly_duration || 0
                }
            },
            insights: {
                mostUsedModels: rawData.model_usage || {},
                peakUsageHours: rawData.peak_hours || [],
                averageTokensPerRequest: rawData.avg_tokens_per_request || 0,
                estimatedMonthlyCost: this.calculateMonthlyCost(rawData)
            },
            lastUpdated: rawData.last_updated || new Date().toISOString(),
            isRealData: true
        };

        return metrics;
    }

    /**
     * Calculate token burn rate (tokens per hour)
     */
    calculateBurnRate(data) {
        if (!data.session_duration || data.session_duration === 0) return 0;
        
        const hoursInSession = data.session_duration / 3600; // Convert seconds to hours
        const tokensUsed = data.session_tokens || 0;
        
        return Math.round(tokensUsed / hoursInSession);
    }

    /**
     * Estimate monthly cost based on usage patterns
     */
    calculateMonthlyCost(data) {
        const tokensUsed = data.monthly_usage || 0;
        // Rough estimate: $0.015 per 1K tokens for Claude 3.5 Sonnet
        const costPer1K = 0.015;
        return (tokensUsed / 1000) * costPer1K;
    }

    /**
     * Start watching for file changes
     */
    startWatching(intervalMs = 5000) {
        if (this.isWatching) return;

        this.isWatching = true;
        console.log('👁️ [USAGE-BRIDGE] Starting usage data monitoring...');

        this.watchInterval = setInterval(async () => {
            try {
                const stats = await fs.stat(this.monitorPath);
                
                // Check if file has been modified
                if (!this.lastFileStats || stats.mtimeMs > this.lastFileStats.mtimeMs) {
                    this.lastFileStats = stats;
                    
                    // Clear cache and emit update event
                    this.cachedData = null;
                    const newData = await this.readUsageData();
                    
                    this.emit('usageUpdate', newData);
                    console.log('📊 [USAGE-BRIDGE] Usage data updated');
                }
            } catch (error) {
                // File might not exist yet, continue watching
            }
        }, intervalMs);
    }

    /**
     * Stop watching for changes
     */
    stopWatching() {
        if (this.watchInterval) {
            clearInterval(this.watchInterval);
            this.watchInterval = null;
        }
        this.isWatching = false;
        console.log('⏹️ [USAGE-BRIDGE] Stopped usage data monitoring');
    }

    /**
     * Get mock data when real data is not available
     */
    getMockData() {
        const now = new Date();
        return {
            tokenUsage: {
                used: 2847,
                limit: 10000,
                thisMonth: 2847,
                dailyUsage: 156,
                burnRate: 240
            },
            sessionAnalytics: {
                currentSession: {
                    duration: 1850, // seconds
                    commands: 12,
                    tokensUsed: 156
                },
                totalSessions: 24,
                averageSessionLength: 1440
            },
            usage: {
                today: {
                    tokens: 156,
                    sessions: 1,
                    duration: 1850
                },
                week: {
                    tokens: 1230,
                    sessions: 8,
                    duration: 14400
                },
                month: {
                    tokens: 2847,
                    sessions: 24,
                    duration: 48600
                }
            },
            insights: {
                mostUsedModels: {
                    'claude-3-5-sonnet': 85,
                    'claude-3-haiku': 15
                },
                peakUsageHours: [14, 15, 16, 20, 21],
                averageTokensPerRequest: 420,
                estimatedMonthlyCost: 4.27
            },
            lastUpdated: now.toISOString(),
            isRealData: false
        };
    }

    /**
     * Get usage statistics for dashboard
     */
    async getUsageStats() {
        const data = await this.readUsageData();
        
        return {
            success: true,
            data,
            timestamp: new Date().toISOString(),
            source: data.isRealData ? 'claude-code-usage-monitor' : 'mock-data'
        };
    }

    /**
     * Get historical usage trends (if available)
     */
    async getHistoricalTrends() {
        try {
            // Try to read historical data if Usage Monitor provides it
            const historyPath = path.join(os.homedir(), '.claude-monitor', 'history.json');
            const historyData = await fs.readFile(historyPath, 'utf8');
            const history = JSON.parse(historyData);
            
            return {
                success: true,
                trends: this.parseHistoricalData(history),
                isRealData: true
            };
        } catch {
            // Return mock historical data
            return {
                success: true,
                trends: this.getMockHistoricalData(),
                isRealData: false
            };
        }
    }

    /**
     * Parse historical data for trends
     */
    parseHistoricalData(history) {
        // This would depend on the actual format from Usage Monitor
        // For now, return basic structure
        return {
            dailyUsage: history.daily || [],
            weeklyUsage: history.weekly || [],
            monthlyUsage: history.monthly || []
        };
    }

    /**
     * Get mock historical data for demo
     */
    getMockHistoricalData() {
        const days = 7;
        const dailyUsage = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            dailyUsage.push({
                date: date.toISOString().split('T')[0],
                tokens: Math.floor(Math.random() * 300) + 50,
                sessions: Math.floor(Math.random() * 5) + 1,
                duration: Math.floor(Math.random() * 7200) + 600
            });
        }
        
        return {
            dailyUsage,
            weeklyUsage: [],
            monthlyUsage: []
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopWatching();
        this.removeAllListeners();
        this.cachedData = null;
    }
}

// Export singleton instance
module.exports = new ClaudeUsageBridge();