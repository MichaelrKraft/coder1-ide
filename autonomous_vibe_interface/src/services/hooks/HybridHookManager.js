/**
 * HybridHookManager - Lightweight bash triggers with AI delegation
 * 
 * Implements a high-performance hybrid hook system that combines
 * fast bash scripts with intelligent AI delegation when needed.
 * 
 * Inspired by Paul Duvall's Claude Code architecture
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');
const SubAgentManager = require('../sub-agent-manager');

class HybridHookManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.logger = options.logger || console;
        this.projectRoot = options.projectRoot || process.cwd();
        this.hooksDir = path.join(this.projectRoot, 'hooks');
        this.triggersDir = path.join(this.hooksDir, 'triggers');
        this.libDir = path.join(this.hooksDir, 'lib');
        this.delegatesDir = path.join(this.hooksDir, 'ai-delegates');
        
        // Performance tracking
        this.metrics = {
            bashExecutions: 0,
            aiDelegations: 0,
            totalTime: 0,
            bashTime: 0,
            aiTime: 0
        };
        
        // Delegation thresholds
        this.thresholds = {
            filesChanged: 5,
            linesChanged: 100,
            complexityScore: 0.7,
            errorCount: 3
        };
        
        // Initialize sub-agent manager for AI delegation
        this.subAgentManager = new SubAgentManager({
            logger: this.logger,
            projectRoot: this.projectRoot
        });
        
        // Cache for loaded triggers
        this.triggerCache = new Map();
        
        // AI delegation queue
        this.delegationQueue = [];
        this.processingDelegation = false;
    }

    /**
     * Initialize the hybrid hook system
     */
    async initialize() {
        try {
            // Ensure directory structure exists
            await this.ensureDirectoryStructure();
            
            // Initialize sub-agent manager
            await this.subAgentManager.initialize();
            
            // Load available triggers
            await this.loadTriggers();
            
            // Setup delegation processor
            this.startDelegationProcessor();
            
            this.logger.info('✅ HybridHookManager initialized');
            this.logger.info(`📂 Loaded ${this.triggerCache.size} triggers`);
            this.emit('initialized');
            
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize HybridHookManager:', error);
            throw error;
        }
    }

    /**
     * Ensure hook directory structure exists
     */
    async ensureDirectoryStructure() {
        const dirs = [this.hooksDir, this.triggersDir, this.libDir, this.delegatesDir];
        
        for (const dir of dirs) {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
                this.logger.info(`Created directory: ${dir}`);
            }
        }
    }

    /**
     * Load available trigger scripts
     */
    async loadTriggers() {
        try {
            const files = await fs.readdir(this.triggersDir);
            const triggers = files.filter(f => f.endsWith('.sh'));
            
            for (const trigger of triggers) {
                const triggerPath = path.join(this.triggersDir, trigger);
                const name = trigger.replace('.sh', '');
                
                // Load trigger metadata if available
                const metadataPath = triggerPath.replace('.sh', '.json');
                let metadata = {};
                
                try {
                    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
                    metadata = JSON.parse(metadataContent);
                } catch {
                    // No metadata file, use defaults
                    metadata = {
                        name,
                        description: `Hybrid hook trigger: ${name}`,
                        delegates: [],
                        thresholds: {}
                    };
                }
                
                this.triggerCache.set(name, {
                    path: triggerPath,
                    metadata
                });
            }
        } catch (error) {
            this.logger.warn('Failed to load triggers:', error.message);
        }
    }

    /**
     * Execute a hybrid hook
     */
    async executeHook(hookName, context = {}) {
        const startTime = Date.now();
        
        try {
            // Check if trigger exists
            const trigger = this.triggerCache.get(hookName);
            if (!trigger) {
                throw new Error(`Trigger not found: ${hookName}`);
            }
            
            // Execute bash trigger
            const bashResult = await this.executeBashTrigger(trigger, context);
            const bashTime = Date.now() - startTime;
            
            // Update metrics
            this.metrics.bashExecutions++;
            this.metrics.bashTime += bashTime;
            
            // Check if AI delegation is needed
            if (bashResult.delegateToAI) {
                const aiStartTime = Date.now();
                const aiResult = await this.delegateToAI(
                    bashResult.agent || trigger.metadata.delegates[0],
                    bashResult.context || context,
                    bashResult.task || hookName
                );
                const aiTime = Date.now() - aiStartTime;
                
                // Update metrics
                this.metrics.aiDelegations++;
                this.metrics.aiTime += aiTime;
                
                // Emit performance event
                this.emit('hook-executed', {
                    hook: hookName,
                    type: 'hybrid',
                    bashTime,
                    aiTime,
                    totalTime: Date.now() - startTime,
                    delegated: true,
                    result: aiResult
                });
                
                return {
                    success: true,
                    type: 'hybrid',
                    bashResult,
                    aiResult,
                    performance: {
                        bashTime,
                        aiTime,
                        totalTime: Date.now() - startTime
                    }
                };
            }
            
            // No delegation needed, return bash result
            this.emit('hook-executed', {
                hook: hookName,
                type: 'bash-only',
                bashTime,
                totalTime: bashTime,
                delegated: false,
                result: bashResult
            });
            
            return {
                success: true,
                type: 'bash-only',
                result: bashResult,
                performance: {
                    bashTime,
                    totalTime: bashTime
                }
            };
            
        } catch (error) {
            this.logger.error(`Failed to execute hook ${hookName}:`, error);
            this.emit('hook-error', { hook: hookName, error });
            
            return {
                success: false,
                error: error.message,
                performance: {
                    totalTime: Date.now() - startTime
                }
            };
        } finally {
            this.metrics.totalTime += Date.now() - startTime;
        }
    }

    /**
     * Execute bash trigger script
     */
    async executeBashTrigger(trigger, context) {
        return new Promise((resolve, reject) => {
            // Prepare environment variables for context
            const env = {
                ...process.env,
                HOOK_CONTEXT: JSON.stringify(context),
                HOOK_NAME: trigger.metadata.name,
                HOOKS_LIB_DIR: this.libDir,
                AI_DELEGATES_DIR: this.delegatesDir
            };
            
            // Execute bash script
            const child = spawn('bash', [trigger.path], {
                env,
                cwd: this.projectRoot
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            child.on('close', (code) => {
                // Parse output for delegation instructions
                let result = {
                    code,
                    stdout,
                    stderr,
                    delegateToAI: false
                };
                
                // Check for delegation markers in output
                if (stdout.includes('DELEGATE_TO_AI:')) {
                    const delegateMatch = stdout.match(/DELEGATE_TO_AI:(.+)/);
                    if (delegateMatch) {
                        try {
                            const delegateInfo = JSON.parse(delegateMatch[1]);
                            result.delegateToAI = true;
                            result.agent = delegateInfo.agent;
                            result.context = delegateInfo.context;
                            result.task = delegateInfo.task;
                        } catch (e) {
                            this.logger.warn('Failed to parse delegation info:', e);
                        }
                    }
                }
                
                if (code === 0) {
                    resolve(result);
                } else {
                    reject(new Error(`Bash trigger failed with code ${code}: ${stderr}`));
                }
            });
            
            child.on('error', reject);
        });
    }

    /**
     * Delegate task to AI agent
     */
    async delegateToAI(agentName, context, task) {
        // Queue delegation for processing
        return new Promise((resolve, reject) => {
            this.delegationQueue.push({
                agent: agentName,
                context,
                task,
                resolve,
                reject
            });
            
            // Start processing if not already running
            if (!this.processingDelegation) {
                this.processDelegationQueue();
            }
        });
    }

    /**
     * Process AI delegation queue
     */
    async processDelegationQueue() {
        if (this.delegationQueue.length === 0) {
            this.processingDelegation = false;
            return;
        }
        
        this.processingDelegation = true;
        const delegation = this.delegationQueue.shift();
        
        try {
            // Get agent configuration
            const agent = this.subAgentManager.getAgent(delegation.agent) || {
                name: delegation.agent,
                description: 'Dynamic agent'
            };
            
            // Get research prompt for the agent
            const prompt = this.subAgentManager.getResearchPrompt(delegation.agent);
            
            // Combine prompt with task context
            const fullPrompt = `
${prompt}

TASK: ${delegation.task}
CONTEXT: ${JSON.stringify(delegation.context, null, 2)}

Provide your research and recommendations based on the above context.
`;
            
            // For now, return a structured response
            // In production, this would call the actual AI API
            const result = {
                agent: agent.name,
                task: delegation.task,
                recommendations: this.generateMockRecommendations(delegation.task, delegation.context),
                timestamp: new Date().toISOString()
            };
            
            delegation.resolve(result);
            
        } catch (error) {
            delegation.reject(error);
        }
        
        // Process next item in queue
        setTimeout(() => this.processDelegationQueue(), 100);
    }

    /**
     * Generate mock recommendations (placeholder for actual AI integration)
     */
    generateMockRecommendations(task, context) {
        const recommendations = {
            'smart-commit': {
                message: `feat: ${context.filesChanged || 'update'} files with ${context.linesChanged || 'various'} changes`,
                type: 'feat',
                scope: context.scope || 'general',
                breaking: false
            },
            'security-check': {
                issues: [],
                severity: 'low',
                recommendations: ['Consider adding input validation', 'Review authentication flow']
            },
            'test-selection': {
                tests: ['unit', 'integration'],
                priority: 'high',
                estimatedTime: '2m'
            },
            'performance-analysis': {
                bottlenecks: [],
                optimizations: ['Consider memoization', 'Optimize database queries']
            },
            'debug-assistance': {
                likelyCause: 'Type mismatch in function parameters',
                suggestions: ['Check variable types', 'Add type guards'],
                relevantDocs: []
            }
        };
        
        return recommendations[task] || {
            general: 'Analysis complete',
            suggestions: ['Review code quality', 'Add tests']
        };
    }

    /**
     * Start delegation processor
     */
    startDelegationProcessor() {
        // Periodic processing of delegation queue
        setInterval(() => {
            if (!this.processingDelegation && this.delegationQueue.length > 0) {
                this.processDelegationQueue();
            }
        }, 1000);
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        const avgBashTime = this.metrics.bashExecutions > 0 
            ? this.metrics.bashTime / this.metrics.bashExecutions 
            : 0;
        
        const avgAITime = this.metrics.aiDelegations > 0
            ? this.metrics.aiTime / this.metrics.aiDelegations
            : 0;
        
        const delegationRate = this.metrics.bashExecutions > 0
            ? (this.metrics.aiDelegations / this.metrics.bashExecutions) * 100
            : 0;
        
        return {
            ...this.metrics,
            avgBashTime,
            avgAITime,
            delegationRate: `${delegationRate.toFixed(1)}%`,
            performance: {
                bashOnly: `~${Math.round(avgBashTime)}ms`,
                withAI: `~${Math.round(avgBashTime + avgAITime)}ms`
            }
        };
    }

    /**
     * Update delegation thresholds
     */
    updateThresholds(newThresholds) {
        this.thresholds = {
            ...this.thresholds,
            ...newThresholds
        };
        
        this.emit('thresholds-updated', this.thresholds);
    }

    /**
     * Get available triggers
     */
    getAvailableTriggers() {
        return Array.from(this.triggerCache.entries()).map(([name, trigger]) => ({
            name,
            ...trigger.metadata,
            path: trigger.path
        }));
    }

    /**
     * Register a new trigger
     */
    async registerTrigger(name, scriptContent, metadata = {}) {
        const triggerPath = path.join(this.triggersDir, `${name}.sh`);
        const metadataPath = path.join(this.triggersDir, `${name}.json`);
        
        // Write script file
        await fs.writeFile(triggerPath, scriptContent, { mode: 0o755 });
        
        // Write metadata file
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        
        // Add to cache
        this.triggerCache.set(name, {
            path: triggerPath,
            metadata: {
                name,
                ...metadata
            }
        });
        
        this.logger.info(`Registered new trigger: ${name}`);
        this.emit('trigger-registered', { name, metadata });
        
        return true;
    }
}

module.exports = HybridHookManager;