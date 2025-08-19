/**
 * TokenBudgetManager - Smart token allocation across projects
 * 
 * Helps vibe coders manage their Claude token budget intelligently,
 * allocating resources across multiple projects and warning before overuse.
 */

const fs = require('fs').promises;
const path = require('path');

class TokenBudgetManager {
    constructor() {
        this.configFile = path.join(__dirname, '../../data/token-budget-config.json');
        this.usageFile = path.join(__dirname, '../../data/token-usage-tracking.json');
        
        // Default budget plans (can be customized)
        this.budgetPlans = {
            'starter': {
                name: 'Starter',
                dailyTokens: 100000,
                monthlyTokens: 3000000,
                costLimit: 20
            },
            'pro': {
                name: 'Pro',
                dailyTokens: 500000,
                monthlyTokens: 15000000,
                costLimit: 100
            },
            'unlimited': {
                name: 'Unlimited',
                dailyTokens: null,
                monthlyTokens: null,
                costLimit: null
            }
        };
        
        // Current configuration
        this.config = {
            activePlan: 'starter',
            customLimits: {},
            projectAllocations: {},
            warningThresholds: {
                daily: 0.8,    // Warn at 80% of daily limit
                monthly: 0.9,  // Warn at 90% of monthly limit
                project: 0.75  // Warn at 75% of project allocation
            },
            smartAllocation: true // Automatically adjust based on usage patterns
        };
        
        // Real-time tracking
        this.currentUsage = {
            today: {
                tokens: 0,
                cost: 0,
                projects: {}
            },
            month: {
                tokens: 0,
                cost: 0,
                projects: {}
            }
        };
        
        this.initializeConfig();
    }
    
    async initializeConfig() {
        try {
            await fs.mkdir(path.dirname(this.configFile), { recursive: true });
            
            // Load or create config
            try {
                await fs.access(this.configFile);
                const data = await fs.readFile(this.configFile, 'utf8');
                this.config = { ...this.config, ...JSON.parse(data) };
            } catch {
                await this.saveConfig();
            }
            
            // Load usage tracking
            try {
                await fs.access(this.usageFile);
                const data = await fs.readFile(this.usageFile, 'utf8');
                const usage = JSON.parse(data);
                
                // Check if it's a new day/month
                const today = new Date().toDateString();
                const thisMonth = new Date().toISOString().slice(0, 7);
                
                if (usage.lastUpdated) {
                    const lastDate = new Date(usage.lastUpdated).toDateString();
                    const lastMonth = new Date(usage.lastUpdated).toISOString().slice(0, 7);
                    
                    if (lastDate === today) {
                        this.currentUsage.today = usage.today || this.currentUsage.today;
                    }
                    
                    if (lastMonth === thisMonth) {
                        this.currentUsage.month = usage.month || this.currentUsage.month;
                    }
                }
            } catch {
                await this.saveUsage();
            }
        } catch (error) {
            console.log('TokenBudgetManager initialization failed:', error.message);
        }
    }
    
    async saveConfig() {
        try {
            await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.log('Failed to save budget config:', error.message);
        }
    }
    
    async saveUsage() {
        try {
            const data = {
                ...this.currentUsage,
                lastUpdated: new Date().toISOString()
            };
            await fs.writeFile(this.usageFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.log('Failed to save usage data:', error.message);
        }
    }
    
    /**
     * Set the active budget plan
     */
    async setBudgetPlan(planName) {
        if (this.budgetPlans[planName]) {
            this.config.activePlan = planName;
            await this.saveConfig();
            return true;
        }
        return false;
    }
    
    /**
     * Set custom budget limits
     */
    async setCustomLimits(dailyTokens, monthlyTokens, costLimit) {
        this.config.customLimits = {
            dailyTokens,
            monthlyTokens,
            costLimit
        };
        this.config.activePlan = 'custom';
        await this.saveConfig();
    }
    
    /**
     * Allocate tokens to a specific project
     */
    async allocateToProject(projectId, allocation) {
        if (!this.config.projectAllocations[projectId]) {
            this.config.projectAllocations[projectId] = {
                dailyLimit: 0,
                priority: 'normal',
                autoAdjust: true
            };
        }
        
        this.config.projectAllocations[projectId] = {
            ...this.config.projectAllocations[projectId],
            ...allocation
        };
        
        await this.saveConfig();
    }
    
    /**
     * Track token usage for a request
     */
    async trackUsage(projectId, tokens, cost) {
        // Update today's usage
        this.currentUsage.today.tokens += tokens;
        this.currentUsage.today.cost += cost;
        
        if (!this.currentUsage.today.projects[projectId]) {
            this.currentUsage.today.projects[projectId] = { tokens: 0, cost: 0 };
        }
        this.currentUsage.today.projects[projectId].tokens += tokens;
        this.currentUsage.today.projects[projectId].cost += cost;
        
        // Update month's usage
        this.currentUsage.month.tokens += tokens;
        this.currentUsage.month.cost += cost;
        
        if (!this.currentUsage.month.projects[projectId]) {
            this.currentUsage.month.projects[projectId] = { tokens: 0, cost: 0 };
        }
        this.currentUsage.month.projects[projectId].tokens += tokens;
        this.currentUsage.month.projects[projectId].cost += cost;
        
        await this.saveUsage();
        
        // Check for warnings
        return this.checkBudgetStatus(projectId);
    }
    
    /**
     * Check budget status and generate warnings
     */
    checkBudgetStatus(projectId) {
        const warnings = [];
        const plan = this.config.activePlan === 'custom' ? 
            this.config.customLimits : 
            this.budgetPlans[this.config.activePlan];
        
        // Check daily limit
        if (plan.dailyTokens) {
            const dailyUsagePercent = this.currentUsage.today.tokens / plan.dailyTokens;
            
            if (dailyUsagePercent >= 1) {
                warnings.push({
                    type: 'error',
                    message: 'Daily token limit exceeded!',
                    severity: 'high',
                    action: 'stop'
                });
            } else if (dailyUsagePercent >= this.config.warningThresholds.daily) {
                warnings.push({
                    type: 'warning',
                    message: `${Math.floor(dailyUsagePercent * 100)}% of daily tokens used`,
                    severity: 'medium',
                    action: 'conserve'
                });
            }
        }
        
        // Check monthly limit
        if (plan.monthlyTokens) {
            const monthlyUsagePercent = this.currentUsage.month.tokens / plan.monthlyTokens;
            
            if (monthlyUsagePercent >= 1) {
                warnings.push({
                    type: 'error',
                    message: 'Monthly token limit exceeded!',
                    severity: 'high',
                    action: 'stop'
                });
            } else if (monthlyUsagePercent >= this.config.warningThresholds.monthly) {
                warnings.push({
                    type: 'warning',
                    message: `${Math.floor(monthlyUsagePercent * 100)}% of monthly tokens used`,
                    severity: 'medium',
                    action: 'slow_down'
                });
            }
        }
        
        // Check project allocation
        if (projectId && this.config.projectAllocations[projectId]) {
            const projectAllocation = this.config.projectAllocations[projectId];
            if (projectAllocation.dailyLimit) {
                const projectUsage = this.currentUsage.today.projects[projectId]?.tokens || 0;
                const projectPercent = projectUsage / projectAllocation.dailyLimit;
                
                if (projectPercent >= 1) {
                    warnings.push({
                        type: 'warning',
                        message: `Project "${projectId}" has used its daily allocation`,
                        severity: 'medium',
                        action: 'switch_project'
                    });
                } else if (projectPercent >= this.config.warningThresholds.project) {
                    warnings.push({
                        type: 'info',
                        message: `Project "${projectId}" at ${Math.floor(projectPercent * 100)}% of allocation`,
                        severity: 'low',
                        action: 'monitor'
                    });
                }
            }
        }
        
        return {
            warnings,
            canContinue: !warnings.some(w => w.action === 'stop'),
            shouldConserve: warnings.some(w => w.action === 'conserve' || w.action === 'slow_down')
        };
    }
    
    /**
     * Get budget recommendations for a request
     */
    async getRecommendations(requestType, estimatedTokens, projectId) {
        const recommendations = [];
        const budgetStatus = this.checkBudgetStatus(projectId);
        
        // Check if request would exceed limits
        const plan = this.config.activePlan === 'custom' ? 
            this.config.customLimits : 
            this.budgetPlans[this.config.activePlan];
        
        const remainingDaily = plan.dailyTokens ? 
            plan.dailyTokens - this.currentUsage.today.tokens : Infinity;
        
        if (estimatedTokens > remainingDaily) {
            recommendations.push({
                type: 'alternative',
                message: 'This request might exceed your daily limit',
                suggestion: 'Break it into smaller requests or wait until tomorrow',
                alternativeApproach: this.suggestAlternative(requestType)
            });
        }
        
        // Suggest optimal timing
        if (budgetStatus.shouldConserve) {
            recommendations.push({
                type: 'timing',
                message: 'Consider postponing non-critical requests',
                suggestion: 'Focus on essential features now, enhancements later'
            });
        }
        
        // Smart allocation suggestions
        if (this.config.smartAllocation) {
            const allocation = await this.suggestOptimalAllocation(projectId);
            if (allocation) {
                recommendations.push({
                    type: 'allocation',
                    message: 'Optimize your token distribution',
                    suggestion: allocation
                });
            }
        }
        
        return recommendations;
    }
    
    /**
     * Suggest alternatives for token-heavy requests
     */
    suggestAlternative(requestType) {
        const alternatives = {
            'full_app': 'Start with core features, add extras incrementally',
            'complex_ui': 'Build a simple version first, then enhance',
            'multiple_features': 'Implement one feature at a time',
            'large_refactor': 'Refactor in small, testable chunks',
            'comprehensive_docs': 'Document critical parts first'
        };
        
        return alternatives[requestType] || 'Consider a simpler approach first';
    }
    
    /**
     * Suggest optimal token allocation across projects
     */
    async suggestOptimalAllocation(currentProjectId) {
        const projectUsage = this.currentUsage.month.projects;
        const activeProjects = Object.keys(projectUsage);
        
        if (activeProjects.length <= 1) {
            return null;
        }
        
        // Calculate usage patterns
        const usagePatterns = activeProjects.map(projectId => {
            const usage = projectUsage[projectId];
            const allocation = this.config.projectAllocations[projectId];
            
            return {
                projectId,
                efficiency: usage.tokens > 0 ? (usage.cost / usage.tokens) : 0,
                utilizationRate: allocation?.dailyLimit ? 
                    (usage.tokens / allocation.dailyLimit) : 0,
                priority: allocation?.priority || 'normal'
            };
        });
        
        // Sort by efficiency and priority
        usagePatterns.sort((a, b) => {
            if (a.priority !== b.priority) {
                const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return a.efficiency - b.efficiency;
        });
        
        // Generate suggestion
        const topProject = usagePatterns[0];
        if (topProject.projectId !== currentProjectId && topProject.utilizationRate > 0.9) {
            return `Consider allocating more tokens to "${topProject.projectId}" - it's using tokens efficiently`;
        }
        
        return null;
    }
    
    /**
     * Get dashboard metrics
     */
    async getDashboardMetrics() {
        const plan = this.config.activePlan === 'custom' ? 
            this.config.customLimits : 
            this.budgetPlans[this.config.activePlan];
        
        const dailyProgress = plan.dailyTokens ? 
            (this.currentUsage.today.tokens / plan.dailyTokens) : 0;
        
        const monthlyProgress = plan.monthlyTokens ? 
            (this.currentUsage.month.tokens / plan.monthlyTokens) : 0;
        
        // Calculate burn rate
        const now = new Date();
        const dayStart = new Date(now.toDateString());
        const minutesSinceDayStart = (now - dayStart) / 60000;
        const burnRate = minutesSinceDayStart > 0 ? 
            Math.floor(this.currentUsage.today.tokens / minutesSinceDayStart) : 0;
        
        // Time until limit (if current rate continues)
        let timeUntilLimit = 'Unlimited';
        if (plan.dailyTokens && burnRate > 0) {
            const remainingTokens = plan.dailyTokens - this.currentUsage.today.tokens;
            const minutesRemaining = remainingTokens / burnRate;
            
            if (minutesRemaining > 0) {
                const hours = Math.floor(minutesRemaining / 60);
                const minutes = Math.floor(minutesRemaining % 60);
                timeUntilLimit = `${hours}h ${minutes}m`;
            } else {
                timeUntilLimit = 'Limit reached';
            }
        }
        
        // Project breakdown
        const projectBreakdown = Object.entries(this.currentUsage.today.projects || {})
            .map(([projectId, usage]) => ({
                projectId,
                tokens: usage.tokens,
                cost: usage.cost.toFixed(2),
                percentage: this.currentUsage.today.tokens > 0 ? 
                    Math.floor((usage.tokens / this.currentUsage.today.tokens) * 100) : 0
            }))
            .sort((a, b) => b.tokens - a.tokens);
        
        return {
            plan: plan.name || 'Custom',
            daily: {
                used: this.currentUsage.today.tokens,
                limit: plan.dailyTokens,
                progress: Math.floor(dailyProgress * 100),
                cost: this.currentUsage.today.cost.toFixed(2)
            },
            monthly: {
                used: this.currentUsage.month.tokens,
                limit: plan.monthlyTokens,
                progress: Math.floor(monthlyProgress * 100),
                cost: this.currentUsage.month.cost.toFixed(2)
            },
            burnRate,
            timeUntilLimit,
            projectBreakdown,
            warnings: this.checkBudgetStatus().warnings
        };
    }
    
    /**
     * Reset daily usage (called at midnight)
     */
    async resetDailyUsage() {
        this.currentUsage.today = {
            tokens: 0,
            cost: 0,
            projects: {}
        };
        await this.saveUsage();
    }
    
    /**
     * Reset monthly usage (called at month start)
     */
    async resetMonthlyUsage() {
        this.currentUsage.month = {
            tokens: 0,
            cost: 0,
            projects: {}
        };
        await this.saveUsage();
    }
}

// Singleton instance
let instance = null;

module.exports = {
    getInstance: () => {
        if (!instance) {
            instance = new TokenBudgetManager();
        }
        return instance;
    },
    TokenBudgetManager
};