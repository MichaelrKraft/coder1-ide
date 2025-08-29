/**
 * Agent Dashboard API Routes
 * 
 * Provides real-time observability endpoints for multi-agent coordination
 * and performance monitoring in CoderOne.
 */

const express = require('express');
const router = express.Router();
const WebSocket = require('ws');
const SubAgentManager = require('../services/sub-agent-manager');

class AgentObserver extends SubAgentManager {
    constructor(options = {}) {
        super(options);
        
        // Real-time metrics storage
        this.agentMetrics = new Map();
        this.systemMetrics = {
            activeAgents: 0,
            avgResponseTime: 0,
            successRate: 100,
            queueLength: 0,
            lastUpdate: new Date()
        };
        
        // Task management
        this.taskQueue = [];
        this.taskHistory = [];
        
        // Coordination tracking
        this.coordinationGraph = {
            nodes: [],
            edges: [],
            lastUpdate: new Date()
        };
        
        // WebSocket clients for real-time updates
        this.wsClients = new Set();
        
        // Performance tracking
        this.performanceHistory = [];
        this.maxHistoryLength = 100;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen to agent lifecycle events
        this.on('agent-spawn', (agentData) => {
            this.handleAgentSpawn(agentData);
        });
        
        this.on('agent-complete', (agentData) => {
            this.handleAgentComplete(agentData);
        });
        
        this.on('agent-error', (agentData) => {
            this.handleAgentError(agentData);
        });
        
        this.on('task-queued', (taskData) => {
            this.handleTaskQueued(taskData);
        });
        
        this.on('coordination-event', (coordData) => {
            this.handleCoordinationEvent(coordData);
        });
    }

    // Agent lifecycle handlers
    handleAgentSpawn(agentData) {
        const agentId = agentData.id || `${agentData.role}-${Date.now()}`;
        const agent = {
            id: agentId,
            role: agentData.role,
            status: 'starting',
            spawnTime: new Date(),
            currentTask: agentData.task || null,
            metrics: {
                responseTime: null,
                confidence: null,
                resourceUsage: 'low'
            }
        };
        
        this.agentMetrics.set(agentId, agent);
        this.updateSystemMetrics();
        this.broadcastUpdate('agent-update', { agent });
        
        this.logger.info(`Agent spawned: ${agentId} (${agentData.role})`);
    }

    handleAgentComplete(agentData) {
        const agent = this.agentMetrics.get(agentData.id);
        if (agent) {
            agent.status = 'completed';
            agent.completionTime = new Date();
            agent.metrics.responseTime = agentData.responseTime || 
                ((agent.completionTime - agent.spawnTime) / 1000).toFixed(1) + 's';
            agent.metrics.confidence = agentData.confidence || null;
            
            this.updateSystemMetrics();
            this.broadcastUpdate('agent-update', { agent });
            
            // Move to history after 30 seconds
            setTimeout(() => {
                this.agentMetrics.delete(agentData.id);
                this.updateSystemMetrics();
            }, 30000);
        }
        
        this.logger.info(`Agent completed: ${agentData.id}`);
    }

    handleAgentError(agentData) {
        const agent = this.agentMetrics.get(agentData.id);
        if (agent) {
            agent.status = 'error';
            agent.errorTime = new Date();
            agent.errorMessage = agentData.error;
            
            this.updateSystemMetrics();
            this.broadcastUpdate('agent-update', { agent });
        }
        
        this.logger.error(`Agent error: ${agentData.id} - ${agentData.error}`);
    }

    handleTaskQueued(taskData) {
        const task = {
            id: taskData.id || `task-${Date.now()}`,
            title: taskData.title,
            priority: taskData.priority || 'medium',
            assignedAgent: taskData.assignedAgent,
            status: 'queued',
            createdAt: new Date(),
            ...taskData
        };
        
        this.taskQueue.push(task);
        this.updateSystemMetrics();
        this.broadcastUpdate('task-update', { tasks: this.getRecentTasks() });
        
        this.logger.info(`Task queued: ${task.id} - ${task.title}`);
    }

    handleCoordinationEvent(coordData) {
        // Update coordination graph
        this.coordinationGraph.lastUpdate = new Date();
        
        // Add or update nodes
        if (coordData.nodes) {
            coordData.nodes.forEach(node => {
                const existingNode = this.coordinationGraph.nodes.find(n => n.id === node.id);
                if (existingNode) {
                    Object.assign(existingNode, node);
                } else {
                    this.coordinationGraph.nodes.push(node);
                }
            });
        }
        
        // Add or update edges
        if (coordData.edges) {
            coordData.edges.forEach(edge => {
                const existingEdge = this.coordinationGraph.edges.find(
                    e => e.source === edge.source && e.target === edge.target
                );
                if (existingEdge) {
                    Object.assign(existingEdge, edge);
                } else {
                    this.coordinationGraph.edges.push(edge);
                }
            });
        }
        
        this.broadcastUpdate('coordination-update', { coordination: this.coordinationGraph });
    }

    updateSystemMetrics() {
        const activeAgents = Array.from(this.agentMetrics.values())
            .filter(agent => ['starting', 'analyzing', 'implementing', 'coordinating'].includes(agent.status));
        
        this.systemMetrics = {
            activeAgents: activeAgents.length,
            avgResponseTime: this.calculateAvgResponseTime(),
            successRate: this.calculateSuccessRate(),
            queueLength: this.taskQueue.filter(t => t.status === 'queued').length,
            lastUpdate: new Date()
        };
        
        this.broadcastUpdate('metrics-update', { metrics: this.systemMetrics });
    }

    calculateAvgResponseTime() {
        const completedAgents = Array.from(this.agentMetrics.values())
            .filter(agent => agent.metrics.responseTime);
        
        if (completedAgents.length === 0) return 0;
        
        const totalTime = completedAgents.reduce((sum, agent) => {
            const time = parseFloat(agent.metrics.responseTime.replace('s', ''));
            return sum + time;
        }, 0);
        
        return (totalTime / completedAgents.length).toFixed(1);
    }

    calculateSuccessRate() {
        const allAgents = Array.from(this.agentMetrics.values());
        if (allAgents.length === 0) return 100;
        
        const successfulAgents = allAgents.filter(agent => 
            ['completed', 'analyzing', 'implementing', 'coordinating'].includes(agent.status)
        );
        
        return Math.round((successfulAgents.length / allAgents.length) * 100);
    }

    getActiveAgents() {
        return Array.from(this.agentMetrics.values())
            .filter(agent => agent.status !== 'completed' && agent.status !== 'error')
            .sort((a, b) => b.spawnTime - a.spawnTime);
    }

    getRecentTasks(limit = 10) {
        return [...this.taskQueue]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
    }

    // WebSocket management
    addWebSocketClient(ws) {
        this.wsClients.add(ws);
        
        ws.on('close', () => {
            this.wsClients.delete(ws);
        });
        
        // Send initial data to new client
        ws.send(JSON.stringify({
            type: 'initial-data',
            data: {
                agents: this.getActiveAgents(),
                metrics: this.systemMetrics,
                tasks: this.getRecentTasks(),
                coordination: this.coordinationGraph
            }
        }));
    }

    broadcastUpdate(type, data) {
        const message = JSON.stringify({ type, ...data, timestamp: new Date() });
        
        this.wsClients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(message);
                } catch (error) {
                    this.logger.error('Failed to send WebSocket message:', error);
                    this.wsClients.delete(ws);
                }
            }
        });
    }

    // Simulate agent activity for demo purposes
    simulateAgentActivity() {
        const roles = ['architect', 'frontend-specialist', 'backend-specialist', 'optimizer', 'debugger'];
        const tasks = [
            'Analyzing system architecture',
            'Implementing React components',
            'Optimizing database queries',
            'Debugging authentication flow',
            'Coordinating with other agents'
        ];
        
        // Spawn random agent
        const role = roles[Math.floor(Math.random() * roles.length)];
        const task = tasks[Math.floor(Math.random() * tasks.length)];
        
        this.handleAgentSpawn({
            id: `${role}-${Date.now()}`,
            role,
            task
        });
        
        // Complete agent after random time
        setTimeout(() => {
            this.handleAgentComplete({
                id: `${role}-${Date.now()}`,
                responseTime: (Math.random() * 3 + 1).toFixed(1) + 's',
                confidence: Math.floor(Math.random() * 30 + 70)
            });
        }, Math.random() * 10000 + 2000);
    }
}

// Create global agent observer instance
const agentObserver = new AgentObserver({
    logger: console,
    projectRoot: process.cwd()
});

// Initialize observer
agentObserver.initialize().catch(console.error);

// Demo mode - simulate activity if no real agents
if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
        if (Math.random() < 0.3) { // 30% chance every 5 seconds
            agentObserver.simulateAgentActivity();
        }
    }, 5000);
}

// API Routes

/**
 * GET /api/agents/status
 * Returns current status of all active agents
 */
router.get('/status', (req, res) => {
    try {
        const agents = agentObserver.getActiveAgents();
        res.json({
            success: true,
            agents,
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/agents/metrics
 * Returns system performance metrics
 */
router.get('/metrics', (req, res) => {
    try {
        res.json({
            success: true,
            ...agentObserver.systemMetrics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/agents/tasks
 * Returns current task queue and recent tasks
 */
router.get('/tasks', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const tasks = agentObserver.getRecentTasks(limit);
        
        res.json({
            success: true,
            tasks,
            queueLength: agentObserver.taskQueue.length,
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/agents/coordination
 * Returns agent coordination graph data
 */
router.get('/coordination', (req, res) => {
    try {
        res.json({
            success: true,
            ...agentObserver.coordinationGraph
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/agents/simulate
 * Trigger agent simulation for demo purposes
 */
router.post('/simulate', (req, res) => {
    try {
        const { agentRole, task, count = 1 } = req.body;
        
        for (let i = 0; i < Math.min(count, 5); i++) {
            if (agentRole && task) {
                agentObserver.handleAgentSpawn({
                    id: `${agentRole}-${Date.now()}-${i}`,
                    role: agentRole,
                    task
                });
            } else {
                agentObserver.simulateAgentActivity();
            }
        }
        
        res.json({
            success: true,
            message: `Simulated ${count} agent(s)`,
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/agents/trigger
 * Trigger a specific agent with context and execute real Claude commands
 */
router.post('/trigger', async (req, res) => {
    try {
        const { agent, task, context = {} } = req.body;
        
        if (!agent) {
            return res.status(400).json({
                success: false,
                error: 'Agent name is required'
            });
        }
        
        if (!task) {
            return res.status(400).json({
                success: false,
                error: 'Task description is required'
            });
        }
        
        const agentId = `${agent}-${Date.now()}`;
        const startTime = new Date();
        
        // Emit agent spawn event
        agentObserver.emit('agent-spawn', {
            id: agentId,
            role: agent,
            task: task,
            status: 'spawning',
            timestamp: startTime,
            context: context
        });
        
        // Store execution in AgentExecutionStore
        const agentExecutionStore = require('../services/agent-execution-store');
        const executionRecord = await agentExecutionStore.recordExecution({
            id: agentId,
            agentType: agent,
            agentId: agentId,
            task: task,
            status: 'starting',
            startTime: startTime,
            context: context
        });
        
        // Respond immediately to avoid timeout
        res.json({
            success: true,
            agentId,
            message: `Agent ${agent} triggered successfully`,
            executionId: executionRecord.id
        });
        
        // Execute real Claude command asynchronously
        executeClaudeTask(agentId, agent, task, context).catch(error => {
            agentObserver.logger.error(`Agent execution failed for ${agentId}:`, error);
            
            // Emit error event
            agentObserver.emit('agent-error', {
                id: agentId,
                error: error.message,
                timestamp: new Date()
            });
            
            // Update execution record
            agentExecutionStore.recordExecution({
                id: agentId,
                status: 'error',
                endTime: new Date(),
                success: false,
                error: error.message,
                duration: Date.now() - startTime.getTime()
            });
        });
        
    } catch (error) {
        console.error('Error triggering agent:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Execute real Claude task using ClaudeCodeExec
 */
async function executeClaudeTask(agentId, agentType, task, context = {}) {
    const ClaudeCodeExec = require('../integrations/claude-code-exec');
    const agentExecutionStore = require('../services/agent-execution-store');
    
    try {
        // Emit execution start
        agentObserver.emit('agent-execute', {
            id: agentId,
            name: agentType,
            status: 'executing',
            timestamp: new Date()
        });
        
        // Get agent-specific system prompt
        const systemPrompt = getAgentSystemPrompt(agentType, context);
        
        // Create Claude Code executor
        const claudeExec = new ClaudeCodeExec({
            logger: agentObserver.logger,
            timeout: context.maxTokens > 6000 ? 600000 : 300000, // 10 min for complex tasks
            implementationMode: true
        });
        
        // Build context-aware prompt
        const contextPrompt = buildContextualPrompt(task, context, agentType);
        
        agentObserver.logger.info(`🚀 Executing ${agentType} agent with task: ${task.substring(0, 100)}...`);
        
        // Execute the prompt
        const result = await claudeExec.executePrompt(contextPrompt, {
            systemPrompt,
            maxTokens: context.maxTokens || 4096
        });
        
        const endTime = new Date();
        const duration = endTime - new Date(agentId.split('-').pop());
        
        // Emit completion event
        agentObserver.emit('agent-complete', {
            id: agentId,
            responseTime: (duration / 1000).toFixed(1) + 's',
            confidence: calculateConfidence(result)
        });
        
        // Update execution record with success
        await agentExecutionStore.recordExecution({
            id: agentId,
            status: 'completed',
            endTime: endTime,
            duration: duration,
            success: true,
            output: result.substring(0, 1000), // Store first 1000 chars
            tokensUsed: estimateTokens(result),
            cost: estimateCost(context.maxTokens || 4096)
        });
        
        agentObserver.logger.info(`✅ Agent ${agentType} completed successfully in ${duration}ms`);
        
        return result;
        
    } catch (error) {
        agentObserver.logger.error(`❌ Agent ${agentType} execution failed:`, error);
        throw error;
    }
}

/**
 * Get agent-specific system prompt
 */
function getAgentSystemPrompt(agentType, context) {
    const prompts = {
        'architect': 'You are a senior software architect. Focus on system design, architecture patterns, and technical strategy. Provide comprehensive analysis and recommendations.',
        'frontend-specialist': 'You are a frontend development expert. Focus on React, TypeScript, UI/UX, and modern frontend technologies. Provide practical implementation guidance.',
        'backend-specialist': 'You are a backend development expert. Focus on APIs, databases, server architecture, and scalability. Provide robust backend solutions.',
        'optimizer': 'You are a performance optimization expert. Focus on code efficiency, resource usage, and system performance improvements.',
        'debugger': 'You are a debugging specialist. Focus on identifying and fixing bugs, error analysis, and code quality improvement.',
        'code-reviewer': 'You are a senior code reviewer. Focus on best practices, security, maintainability, and code quality standards.',
        'documentation-writer': 'You are a technical documentation specialist. Focus on creating clear, comprehensive documentation and code comments.',
        'implementer': 'You are a senior developer focused on practical implementation. Write clean, production-ready code with proper error handling.'
    };
    
    const basePrompt = prompts[agentType] || prompts['implementer'];
    
    // Add context-specific instructions
    const contextInstructions = [];
    if (context.executionMode === 'thorough') contextInstructions.push('Provide detailed analysis with comprehensive explanations.');
    if (context.executionMode === 'debug') contextInstructions.push('Focus on identifying and fixing specific issues.');
    if (context.executionMode === 'performance') contextInstructions.push('Prioritize performance optimization and efficiency.');
    if (context.priority === 'urgent') contextInstructions.push('Focus on quick, practical solutions.');
    
    return contextInstructions.length > 0 
        ? `${basePrompt}\n\nSpecific instructions: ${contextInstructions.join(' ')}`
        : basePrompt;
}

/**
 * Build contextual prompt with project context
 */
function buildContextualPrompt(task, context, agentType) {
    let prompt = `Agent Role: ${agentType}\n\nTask: ${task}\n\n`;
    
    if (context.sessionContext) {
        prompt += 'Project Context: This is part of the CoderOne IDE project - an AI-first development environment.\n\n';
    }
    
    if (context.executionMode && context.executionMode !== 'standard') {
        prompt += `Execution Mode: ${context.executionMode} - adjust your approach accordingly.\n\n`;
    }
    
    if (context.priority && context.priority !== 'medium') {
        prompt += `Priority: ${context.priority} - ${context.priority === 'urgent' ? 'focus on quick solutions' : 'take time for thorough analysis'}.\n\n`;
    }
    
    prompt += 'Please provide a comprehensive response that addresses the task requirements. If this involves code, provide practical, production-ready solutions.';
    
    return prompt;
}

/**
 * Calculate confidence score based on response length and quality indicators
 */
function calculateConfidence(response) {
    const length = response.length;
    const hasCode = /```/.test(response);
    const hasExplanation = response.split('\n').length > 10;
    
    let confidence = 60; // Base confidence
    if (length > 500) confidence += 20;
    if (hasCode) confidence += 10;
    if (hasExplanation) confidence += 10;
    
    return Math.min(confidence, 95); // Cap at 95%
}

/**
 * Estimate tokens used (rough approximation)
 */
function estimateTokens(text) {
    return Math.ceil(text.length / 4); // Rough estimate: 1 token ≈ 4 characters
}

/**
 * Estimate cost based on tokens (rough approximation)
 */
function estimateCost(maxTokens) {
    // Rough estimate for Claude pricing: $0.25 per 1K tokens
    return (maxTokens / 1000) * 0.25;
}

/**
 * GET /api/agents/analytics
 * Returns comprehensive performance analytics
 */
router.get('/analytics', async (req, res) => {
    try {
        const agentExecutionStore = require('../services/agent-execution-store');
        const analytics = agentExecutionStore.getAnalytics();
        
        res.json({
            success: true,
            ...analytics,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/agents/history
 * Returns execution history with optional filters
 */
router.get('/history', (req, res) => {
    try {
        const agentExecutionStore = require('../services/agent-execution-store');
        const { agentType, status, startDate, endDate, limit } = req.query;
        
        const filters = {};
        if (agentType) filters.agentType = agentType;
        if (status) filters.status = status;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (limit) filters.limit = parseInt(limit);
        
        const history = agentExecutionStore.getHistory(filters);
        
        res.json({
            success: true,
            history,
            totalCount: history.length,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/agents/performance
 * Returns performance metrics and trends
 */
router.get('/performance', (req, res) => {
    try {
        const agentExecutionStore = require('../services/agent-execution-store');
        const analytics = agentExecutionStore.getAnalytics();
        
        res.json({
            success: true,
            overall: analytics.metrics.overall,
            byAgent: analytics.metrics.byAgent,
            trend: analytics.performanceTrend,
            topAgents: analytics.topAgents,
            recentActivity: analytics.recentActivity,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error fetching performance data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/agents/costs
 * Returns cost analysis and spending metrics
 */
router.get('/costs', (req, res) => {
    try {
        const agentExecutionStore = require('../services/agent-execution-store');
        const analytics = agentExecutionStore.getAnalytics();
        
        res.json({
            success: true,
            ...analytics.costAnalysis,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error fetching cost data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/agents/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        uptime: process.uptime(),
        activeAgents: agentObserver.systemMetrics.activeAgents,
        wsClients: agentObserver.wsClients.size,
        timestamp: new Date()
    });
});

// Make agentObserver globally available for other services
global.agentObserver = agentObserver;

// Export both router and observer for WebSocket integration
module.exports = {
    router,
    agentObserver
};