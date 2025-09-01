/**
 * Agent Execution Store
 * Persistent storage and analytics for agent execution history
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class AgentExecutionStore extends EventEmitter {
    constructor(options = {}) {
        super();
        this.storePath = options.storePath || path.join(process.cwd(), 'data', 'agent-executions');
        this.historyFile = path.join(this.storePath, 'execution-history.json');
        this.metricsFile = path.join(this.storePath, 'performance-metrics.json');
        this.configFile = path.join(this.storePath, 'agent-configs.json');
        
        this.history = [];
        this.metrics = {};
        this.configs = {};
        
        this.maxHistorySize = options.maxHistorySize || 1000;
        this.init();
    }
    
    async init() {
        try {
            // Ensure storage directory exists
            await fs.mkdir(this.storePath, { recursive: true });
            
            // Load existing data
            await this.loadHistory();
            await this.loadMetrics();
            await this.loadConfigs();
            
            console.log('✅ Agent Execution Store initialized');
        } catch (error) {
            console.error('Failed to initialize execution store:', error);
        }
    }
    
    // Load execution history from disk
    async loadHistory() {
        try {
            const data = await fs.readFile(this.historyFile, 'utf-8');
            this.history = JSON.parse(data);
        } catch (error) {
            // File doesn't exist yet
            this.history = [];
        }
    }
    
    // Load performance metrics from disk
    async loadMetrics() {
        try {
            const data = await fs.readFile(this.metricsFile, 'utf-8');
            this.metrics = JSON.parse(data);
            // Ensure required properties exist
            if (!this.metrics.byAgent) this.metrics.byAgent = {};
            if (!this.metrics.overall) {
                this.metrics.overall = {
                    totalExecutions: 0,
                    successRate: 0,
                    avgDuration: 0,
                    totalCost: 0
                };
            }
        } catch (error) {
            // Initialize default metrics
            this.metrics = {
                byAgent: {},
                overall: {
                    totalExecutions: 0,
                    successRate: 0,
                    avgDuration: 0,
                    totalCost: 0
                }
            };
        }
    }
    
    // Load agent configurations
    async loadConfigs() {
        try {
            const data = await fs.readFile(this.configFile, 'utf-8');
            this.configs = JSON.parse(data);
        } catch (error) {
            // Initialize default configs
            this.configs = {
                agents: {
                    'architect': { enabled: true, priority: 1, maxTokens: 4096, temperature: 0.7 },
                    'frontend-specialist': { enabled: true, priority: 2, maxTokens: 4096, temperature: 0.7 },
                    'backend-specialist': { enabled: true, priority: 2, maxTokens: 4096, temperature: 0.7 },
                    'optimizer': { enabled: true, priority: 3, maxTokens: 2048, temperature: 0.5 },
                    'debugger': { enabled: true, priority: 1, maxTokens: 4096, temperature: 0.3 },
                    'implementer': { enabled: true, priority: 2, maxTokens: 8192, temperature: 0.6 }
                },
                presets: {
                    'frontend-focused': ['frontend-specialist', 'architect', 'optimizer'],
                    'backend-focused': ['backend-specialist', 'architect', 'optimizer'],
                    'full-stack': ['architect', 'frontend-specialist', 'backend-specialist'],
                    'debug-mode': ['debugger', 'implementer', 'optimizer']
                }
            };
        }
    }
    
    // Save all data to disk
    async save() {
        try {
            await fs.writeFile(this.historyFile, JSON.stringify(this.history, null, 2));
            await fs.writeFile(this.metricsFile, JSON.stringify(this.metrics, null, 2));
            await fs.writeFile(this.configFile, JSON.stringify(this.configs, null, 2));
        } catch (error) {
            console.error('Failed to save execution data:', error);
        }
    }
    
    // Record a new agent execution
    async recordExecution(execution) {
        const record = {
            id: execution.id || `exec-${Date.now()}`,
            agentType: execution.agentType,
            agentId: execution.agentId,
            task: execution.task,
            command: execution.command,
            status: execution.status || 'pending',
            startTime: execution.startTime || new Date(),
            endTime: execution.endTime,
            duration: execution.duration,
            success: execution.success,
            error: execution.error,
            output: execution.output,
            sessionId: execution.sessionId,
            userId: execution.userId,
            cost: execution.cost || 0,
            tokensUsed: execution.tokensUsed || 0,
            metadata: execution.metadata || {}
        };
        
        // Add to history
        this.history.unshift(record);
        
        // Trim history if too large
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(0, this.maxHistorySize);
        }
        
        // Update metrics
        await this.updateMetrics(record);
        
        // Save to disk
        await this.save();
        
        // Emit event
        this.emit('execution-recorded', record);
        
        return record;
    }
    
    // Update performance metrics
    async updateMetrics(execution) {
        // Update overall metrics
        this.metrics.overall.totalExecutions++;
        
        if (execution.success !== undefined) {
            const successCount = this.history.filter(e => e.success).length;
            this.metrics.overall.successRate = (successCount / this.history.length) * 100;
        }
        
        if (execution.duration) {
            const totalDuration = this.history.reduce((sum, e) => sum + (e.duration || 0), 0);
            this.metrics.overall.avgDuration = totalDuration / this.history.length;
        }
        
        if (execution.cost) {
            this.metrics.overall.totalCost += execution.cost;
        }
        
        // Update per-agent metrics
        const agentType = execution.agentType;
        if (!this.metrics.byAgent[agentType]) {
            this.metrics.byAgent[agentType] = {
                executions: 0,
                successRate: 0,
                avgDuration: 0,
                totalCost: 0,
                lastUsed: null
            };
        }
        
        const agentMetrics = this.metrics.byAgent[agentType];
        agentMetrics.executions++;
        agentMetrics.lastUsed = new Date();
        
        if (execution.cost) {
            agentMetrics.totalCost += execution.cost;
        }
        
        // Calculate agent-specific success rate and duration
        const agentHistory = this.history.filter(e => e.agentType === agentType);
        if (agentHistory.length > 0) {
            const successCount = agentHistory.filter(e => e.success).length;
            agentMetrics.successRate = (successCount / agentHistory.length) * 100;
            
            const totalDuration = agentHistory.reduce((sum, e) => sum + (e.duration || 0), 0);
            agentMetrics.avgDuration = totalDuration / agentHistory.length;
        }
    }
    
    // Get execution history with filters
    getHistory(filters = {}) {
        let filtered = [...this.history];
        
        if (filters.agentType) {
            filtered = filtered.filter(e => e.agentType === filters.agentType);
        }
        
        if (filters.status) {
            filtered = filtered.filter(e => e.status === filters.status);
        }
        
        if (filters.startDate) {
            filtered = filtered.filter(e => new Date(e.startTime) >= new Date(filters.startDate));
        }
        
        if (filters.endDate) {
            filtered = filtered.filter(e => new Date(e.startTime) <= new Date(filters.endDate));
        }
        
        if (filters.limit) {
            filtered = filtered.slice(0, filters.limit);
        }
        
        return filtered;
    }
    
    // Get performance analytics
    getAnalytics() {
        return {
            metrics: this.metrics,
            topAgents: this.getTopAgents(),
            recentActivity: this.getRecentActivity(),
            performanceTrend: this.getPerformanceTrend(),
            costAnalysis: this.getCostAnalysis()
        };
    }
    
    // Get most used agents
    getTopAgents() {
        if (!this.metrics.byAgent || typeof this.metrics.byAgent !== 'object') {
            return [];
        }
        return Object.entries(this.metrics.byAgent)
            .map(([agent, metrics]) => ({ agent, ...metrics }))
            .sort((a, b) => b.executions - a.executions)
            .slice(0, 5);
    }
    
    // Get recent activity summary
    getRecentActivity() {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent = this.history.filter(e => new Date(e.startTime) >= last24h);
        
        return {
            count: recent.length,
            successRate: recent.length > 0 
                ? (recent.filter(e => e.success).length / recent.length) * 100 
                : 0,
            agents: [...new Set(recent.map(e => e.agentType))]
        };
    }
    
    // Get performance trend over time
    getPerformanceTrend() {
        const days = 7;
        const trend = [];
        
        for (let i = 0; i < days; i++) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(date.setHours(0, 0, 0, 0));
            const dayEnd = new Date(date.setHours(23, 59, 59, 999));
            
            const dayExecutions = this.history.filter(e => {
                const execTime = new Date(e.startTime);
                return execTime >= dayStart && execTime <= dayEnd;
            });
            
            trend.push({
                date: dayStart.toISOString().split('T')[0],
                executions: dayExecutions.length,
                successRate: dayExecutions.length > 0
                    ? (dayExecutions.filter(e => e.success).length / dayExecutions.length) * 100
                    : 0,
                avgDuration: dayExecutions.length > 0
                    ? dayExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / dayExecutions.length
                    : 0
            });
        }
        
        return trend.reverse();
    }
    
    // Get cost analysis
    getCostAnalysis() {
        const costByAgent = {};
        const costByDay = {};
        
        this.history.forEach(exec => {
            if (exec.cost) {
                // By agent
                if (!costByAgent[exec.agentType]) {
                    costByAgent[exec.agentType] = 0;
                }
                costByAgent[exec.agentType] += exec.cost;
                
                // By day
                const day = new Date(exec.startTime).toISOString().split('T')[0];
                if (!costByDay[day]) {
                    costByDay[day] = 0;
                }
                costByDay[day] += exec.cost;
            }
        });
        
        // Ensure metrics structure exists
        const totalCost = this.metrics?.overall?.totalCost || 0;
        const totalExecutions = this.metrics?.overall?.totalExecutions || 0;
        
        return {
            totalCost: totalCost,
            costByAgent,
            costByDay,
            avgCostPerExecution: totalExecutions > 0 ? totalCost / totalExecutions : 0
        };
    }
    
    // Update agent configuration
    async updateAgentConfig(agentType, config) {
        if (!this.configs.agents[agentType]) {
            this.configs.agents[agentType] = {};
        }
        
        Object.assign(this.configs.agents[agentType], config);
        await this.save();
        
        this.emit('config-updated', { agentType, config });
        
        return this.configs.agents[agentType];
    }
    
    // Get agent configuration
    getAgentConfig(agentType) {
        return this.configs.agents[agentType] || {};
    }
    
    // Save a preset
    async savePreset(name, agents) {
        this.configs.presets[name] = agents;
        await this.save();
        
        this.emit('preset-saved', { name, agents });
        
        return this.configs.presets;
    }
    
    // Get all presets
    getPresets() {
        return this.configs.presets;
    }
}

// Create singleton instance
const agentExecutionStore = new AgentExecutionStore();

module.exports = agentExecutionStore;