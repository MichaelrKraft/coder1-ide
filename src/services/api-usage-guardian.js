/**
 * API Usage Guardian Service
 * 
 * Protects users from unexpected API charges by monitoring, limiting, and alerting
 * on all API usage across the platform.
 * 
 * Features:
 * - Real-time cost tracking
 * - Circuit breakers for cost protection
 * - Usage alerts and warnings
 * - Automatic API call blocking when limits reached
 * - Detailed logging for transparency
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class APIUsageGuardian extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Configuration
        this.config = {
            maxDailyCost: parseFloat(process.env.MAX_DAILY_COST_USD || '5.00'),
            maxDailyCalls: parseInt(process.env.MAX_DAILY_API_CALLS || '100'),
            requireConfirmation: process.env.REQUIRE_COST_CONFIRMATION === 'true',
            alertThreshold: 0.8, // Alert at 80% usage
            emergencyStopThreshold: 1.0, // Stop at 100%
            mockMode: process.env.USE_MOCK_RESPONSES === 'true',
            ...options
        };
        
        // Usage tracking
        this.usage = new Map(); // userId -> usage data
        this.globalUsage = {
            totalCalls: 0,
            totalCost: 0,
            startTime: Date.now(),
            lastReset: Date.now()
        };
        
        // Cost estimates per API call (in USD)
        this.costEstimates = {
            'anthropic': {
                'claude-3-opus': 0.015,      // ~$15/1M input tokens
                'claude-3-sonnet': 0.003,     // ~$3/1M input tokens
                'claude-3-haiku': 0.00025,    // ~$0.25/1M input tokens
                'claude-2.1': 0.008,          // ~$8/1M input tokens
                'claude-2': 0.008,            // ~$8/1M input tokens
                'claude-instant': 0.00163     // ~$1.63/1M input tokens
            },
            'openai': {
                'gpt-4': 0.03,                // ~$30/1M input tokens
                'gpt-4-turbo': 0.01,          // ~$10/1M input tokens
                'gpt-3.5-turbo': 0.0015,      // ~$1.50/1M input tokens
                'text-embedding-ada-002': 0.0001 // ~$0.10/1M tokens
            }
        };
        
        // Circuit breaker states
        this.circuitBreakers = new Map(); // userId -> breaker state
        
        // Initialize persistence
        this.usageFile = path.join(__dirname, '../../.coder1/usage/api-usage.json');
        this.loadUsageData();
        
        // Schedule daily reset
        this.scheduleDailyReset();
        
        // Set up auto-save
        setInterval(() => this.saveUsageData(), 60000); // Save every minute
    }
    
    /**
     * Check if an API call should be allowed
     */
    async checkAPICall(userId, service, model, estimatedTokens = 1000) {
        // In mock mode, always allow but log
        if (this.config.mockMode) {
            console.log(`🎭 [MOCK MODE] Would make API call: ${service}/${model}`);
            return {
                allowed: true,
                mock: true,
                reason: 'Mock mode enabled'
            };
        }
        
        // Get or create user usage
        const userUsage = this.getUserUsage(userId);
        
        // Estimate cost
        const estimatedCost = this.estimateCost(service, model, estimatedTokens);
        
        // Check circuit breaker
        if (this.isCircuitBreakerOpen(userId)) {
            return {
                allowed: false,
                reason: 'Circuit breaker open - daily limit exceeded',
                currentUsage: userUsage,
                limit: this.config.maxDailyCost
            };
        }
        
        // Check if would exceed daily cost limit
        if (userUsage.dailyCost + estimatedCost > this.config.maxDailyCost) {
            this.openCircuitBreaker(userId);
            this.emit('limit-exceeded', { userId, type: 'cost', current: userUsage.dailyCost, limit: this.config.maxDailyCost });
            
            return {
                allowed: false,
                reason: 'Would exceed daily cost limit',
                currentUsage: userUsage,
                estimatedCost,
                limit: this.config.maxDailyCost
            };
        }
        
        // Check if would exceed daily call limit
        if (userUsage.dailyCalls >= this.config.maxDailyCalls) {
            this.openCircuitBreaker(userId);
            this.emit('limit-exceeded', { userId, type: 'calls', current: userUsage.dailyCalls, limit: this.config.maxDailyCalls });
            
            return {
                allowed: false,
                reason: 'Daily API call limit exceeded',
                currentUsage: userUsage,
                limit: this.config.maxDailyCalls
            };
        }
        
        // Check if approaching limits (warning)
        const costPercentage = (userUsage.dailyCost + estimatedCost) / this.config.maxDailyCost;
        const callPercentage = (userUsage.dailyCalls + 1) / this.config.maxDailyCalls;
        
        if (costPercentage >= this.config.alertThreshold || callPercentage >= this.config.alertThreshold) {
            this.emit('approaching-limit', {
                userId,
                costPercentage: Math.round(costPercentage * 100),
                callPercentage: Math.round(callPercentage * 100),
                currentCost: userUsage.dailyCost,
                currentCalls: userUsage.dailyCalls
            });
        }
        
        return {
            allowed: true,
            estimatedCost,
            currentUsage: userUsage,
            requiresConfirmation: this.config.requireConfirmation && estimatedCost > 0.10
        };
    }
    
    /**
     * Record an API call
     */
    recordAPICall(userId, service, model, actualTokens, actualCost = null) {
        const userUsage = this.getUserUsage(userId);
        const cost = actualCost || this.estimateCost(service, model, actualTokens);
        
        // Update user usage
        userUsage.dailyCalls++;
        userUsage.dailyCost += cost;
        userUsage.totalCalls++;
        userUsage.totalCost += cost;
        userUsage.lastCall = Date.now();
        
        // Update call history
        userUsage.callHistory.push({
            timestamp: Date.now(),
            service,
            model,
            tokens: actualTokens,
            cost
        });
        
        // Keep only last 100 calls in memory
        if (userUsage.callHistory.length > 100) {
            userUsage.callHistory.shift();
        }
        
        // Update global usage
        this.globalUsage.totalCalls++;
        this.globalUsage.totalCost += cost;
        
        // Log the call
        console.log(`📊 API Call Recorded: User ${userId} | ${service}/${model} | Tokens: ${actualTokens} | Cost: $${cost.toFixed(4)}`);
        
        // Emit event for monitoring
        this.emit('api-call', {
            userId,
            service,
            model,
            tokens: actualTokens,
            cost,
            totalDailyCost: userUsage.dailyCost,
            totalDailyCalls: userUsage.dailyCalls
        });
        
        // Save data
        this.saveUsageData();
        
        return userUsage;
    }
    
    /**
     * Get or create user usage data
     */
    getUserUsage(userId) {
        if (!this.usage.has(userId)) {
            this.usage.set(userId, {
                userId,
                dailyCalls: 0,
                dailyCost: 0,
                totalCalls: 0,
                totalCost: 0,
                firstCall: Date.now(),
                lastCall: null,
                lastReset: Date.now(),
                callHistory: [],
                plan: 'free' // free, pro, byok
            });
        }
        return this.usage.get(userId);
    }
    
    /**
     * Estimate cost for an API call
     */
    estimateCost(service, model, tokens) {
        const serviceCosts = this.costEstimates[service.toLowerCase()];
        if (!serviceCosts) {
            console.warn(`⚠️ Unknown service for cost estimation: ${service}`);
            return 0.01; // Default conservative estimate
        }
        
        const costPer1000 = serviceCosts[model.toLowerCase()] || 0.01;
        return (tokens / 1000) * costPer1000;
    }
    
    /**
     * Circuit breaker management
     */
    isCircuitBreakerOpen(userId) {
        return this.circuitBreakers.get(userId) === 'open';
    }
    
    openCircuitBreaker(userId) {
        this.circuitBreakers.set(userId, 'open');
        console.log(`🚫 Circuit breaker OPENED for user ${userId}`);
        this.emit('circuit-breaker-open', { userId });
    }
    
    closeCircuitBreaker(userId) {
        this.circuitBreakers.set(userId, 'closed');
        console.log(`✅ Circuit breaker CLOSED for user ${userId}`);
        this.emit('circuit-breaker-closed', { userId });
    }
    
    /**
     * Reset daily usage
     */
    resetDailyUsage() {
        console.log('🔄 Resetting daily API usage for all users');
        
        for (const [userId, usage] of this.usage.entries()) {
            usage.dailyCalls = 0;
            usage.dailyCost = 0;
            usage.lastReset = Date.now();
            
            // Close circuit breakers
            this.closeCircuitBreaker(userId);
        }
        
        this.globalUsage.lastReset = Date.now();
        this.saveUsageData();
        
        this.emit('daily-reset', {
            timestamp: Date.now(),
            totalUsers: this.usage.size
        });
    }
    
    /**
     * Schedule daily reset at midnight
     */
    scheduleDailyReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const msUntilMidnight = tomorrow - now;
        
        setTimeout(() => {
            this.resetDailyUsage();
            // Schedule next reset
            setInterval(() => this.resetDailyUsage(), 24 * 60 * 60 * 1000);
        }, msUntilMidnight);
        
        console.log(`⏰ Daily reset scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
    }
    
    /**
     * Get usage report for a user
     */
    getUserReport(userId) {
        const usage = this.getUserUsage(userId);
        const now = Date.now();
        const hoursSinceReset = (now - usage.lastReset) / (1000 * 60 * 60);
        
        return {
            userId,
            daily: {
                calls: usage.dailyCalls,
                cost: usage.dailyCost,
                costLimit: this.config.maxDailyCost,
                callLimit: this.config.maxDailyCalls,
                percentUsedCost: Math.round((usage.dailyCost / this.config.maxDailyCost) * 100),
                percentUsedCalls: Math.round((usage.dailyCalls / this.config.maxDailyCalls) * 100),
                hoursRemaining: Math.round(24 - hoursSinceReset)
            },
            total: {
                calls: usage.totalCalls,
                cost: usage.totalCost,
                firstCall: usage.firstCall,
                lastCall: usage.lastCall
            },
            recentCalls: usage.callHistory.slice(-10),
            circuitBreakerOpen: this.isCircuitBreakerOpen(userId),
            plan: usage.plan
        };
    }
    
    /**
     * Get global usage statistics
     */
    getGlobalStats() {
        const userStats = Array.from(this.usage.values());
        
        return {
            totalUsers: userStats.length,
            totalCalls: this.globalUsage.totalCalls,
            totalCost: this.globalUsage.totalCost,
            averageCallsPerUser: userStats.length ? this.globalUsage.totalCalls / userStats.length : 0,
            averageCostPerUser: userStats.length ? this.globalUsage.totalCost / userStats.length : 0,
            topUsers: userStats
                .sort((a, b) => b.totalCost - a.totalCost)
                .slice(0, 5)
                .map(u => ({ userId: u.userId, totalCost: u.totalCost, totalCalls: u.totalCalls })),
            circuitBreakersOpen: Array.from(this.circuitBreakers.entries())
                .filter(([_, state]) => state === 'open')
                .map(([userId]) => userId),
            lastReset: this.globalUsage.lastReset
        };
    }
    
    /**
     * Emergency stop - disable all API calls
     */
    emergencyStop(reason = 'Manual emergency stop') {
        console.log(`🚨 EMERGENCY STOP ACTIVATED: ${reason}`);
        
        // Open all circuit breakers
        for (const userId of this.usage.keys()) {
            this.openCircuitBreaker(userId);
        }
        
        // Set config to maximum protection
        this.config.maxDailyCost = 0;
        this.config.maxDailyCalls = 0;
        this.config.mockMode = true;
        
        this.emit('emergency-stop', { reason, timestamp: Date.now() });
        
        return {
            success: true,
            message: 'All API calls blocked',
            reason
        };
    }
    
    /**
     * Load usage data from disk
     */
    async loadUsageData() {
        try {
            const data = await fs.readFile(this.usageFile, 'utf8');
            const parsed = JSON.parse(data);
            
            // Restore usage data
            for (const userData of parsed.users || []) {
                this.usage.set(userData.userId, userData);
            }
            
            // Restore global usage
            if (parsed.global) {
                this.globalUsage = parsed.global;
            }
            
            console.log(`📂 Loaded API usage data for ${this.usage.size} users`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error loading usage data:', error);
            }
        }
    }
    
    /**
     * Save usage data to disk
     */
    async saveUsageData() {
        try {
            const dir = path.dirname(this.usageFile);
            await fs.mkdir(dir, { recursive: true });
            
            const data = {
                users: Array.from(this.usage.values()),
                global: this.globalUsage,
                savedAt: Date.now()
            };
            
            await fs.writeFile(this.usageFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving usage data:', error);
        }
    }
}

// Export singleton instance
const guardian = new APIUsageGuardian();

module.exports = guardian;
module.exports.APIUsageGuardian = APIUsageGuardian;