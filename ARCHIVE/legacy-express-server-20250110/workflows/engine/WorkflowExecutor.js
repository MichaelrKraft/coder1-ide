/**
 * Workflow Executor - Handles parallel and distributed workflow execution
 * 
 * This executor manages the actual running of workflows, including:
 * - Parallel execution of multiple workflows
 * - Resource management and pooling
 * - Execution isolation and sandboxing
 * - Performance optimization
 */

const { Worker } = require('worker_threads');
const { EventEmitter } = require('events');
const os = require('os');

class WorkflowExecutor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            maxWorkers: options.maxWorkers || os.cpus().length,
            executionTimeout: options.timeout || 300000,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 1000,
            isolateExecution: options.isolate !== false,
            resourceLimits: options.resourceLimits || {
                maxMemory: 512 * 1024 * 1024, // 512MB per worker
                maxCpu: 80 // 80% CPU usage
            }
        };
        
        // Worker pool management
        this.workerPool = [];
        this.availableWorkers = [];
        this.busyWorkers = new Map();
        
        // Execution tracking
        this.executionQueue = [];
        this.activeExecutions = new Map();
        this.executionHistory = [];
        
        // Performance metrics
        this.metrics = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0,
            peakConcurrency: 0,
            workerUtilization: 0
        };
        
        this.initialize();
    }
    
    /**
     * Initialize the executor
     */
    async initialize() {
        console.log(`🔧 WorkflowExecutor: Initializing with ${this.config.maxWorkers} workers...`);
        
        // Create worker pool
        await this.createWorkerPool();
        
        // Start monitoring
        this.startMonitoring();
        
        console.log('✅ WorkflowExecutor: Ready for parallel execution');
        this.emit('executor:ready');
    }
    
    /**
     * Create pool of worker threads
     */
    async createWorkerPool() {
        for (let i = 0; i < this.config.maxWorkers; i++) {
            const worker = await this.createWorker(i);
            this.workerPool.push(worker);
            this.availableWorkers.push(worker);
        }
    }
    
    /**
     * Create a single worker
     */
    async createWorker(id) {
        // For now, we'll use a simple execution context
        // In production, this would spawn actual worker threads
        const worker = {
            id: `worker-${id}`,
            status: 'idle',
            currentTask: null,
            tasksCompleted: 0,
            totalExecutionTime: 0,
            errors: 0,
            
            // Execute function in worker context
            execute: async (task, context) => {
                worker.status = 'busy';
                worker.currentTask = task.id;
                const startTime = Date.now();
                
                try {
                    // Simulate isolated execution
                    const result = await this.executeInIsolation(task, context);
                    
                    worker.tasksCompleted++;
                    worker.totalExecutionTime += (Date.now() - startTime);
                    worker.status = 'idle';
                    worker.currentTask = null;
                    
                    return result;
                    
                } catch (error) {
                    worker.errors++;
                    worker.status = 'idle';
                    worker.currentTask = null;
                    throw error;
                }
            }
        };
        
        return worker;
    }
    
    /**
     * Execute task in isolation
     */
    async executeInIsolation(task, context) {
        // Create isolated execution context
        const isolatedContext = {
            ...context,
            sandbox: true,
            startTime: Date.now(),
            timeout: this.config.executionTimeout
        };
        
        // Set up timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Execution timeout')), this.config.executionTimeout);
        });
        
        // Execute task with timeout
        try {
            const result = await Promise.race([
                this.executeTask(task, isolatedContext),
                timeoutPromise
            ]);
            
            return {
                success: true,
                result,
                duration: Date.now() - isolatedContext.startTime
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                duration: Date.now() - isolatedContext.startTime
            };
        }
    }
    
    /**
     * Execute a single task
     */
    async executeTask(task, context) {
        const { type, action, params } = task;
        
        switch (type) {
        case 'compute':
            return await this.executeCompute(action, params, context);
            
        case 'transform':
            return await this.executeTransform(action, params, context);
            
        case 'analyze':
            return await this.executeAnalyze(action, params, context);
            
        case 'generate':
            return await this.executeGenerate(action, params, context);
            
        default:
            // Execute as generic function
            if (typeof action === 'function') {
                return await action(params, context);
            }
            throw new Error(`Unknown task type: ${type}`);
        }
    }
    
    /**
     * Execute computation task
     */
    async executeCompute(action, params, context) {
        // Placeholder for compute operations
        return { computed: true, action, params };
    }
    
    /**
     * Execute transformation task
     */
    async executeTransform(action, params, context) {
        const { input, transformation } = params;
        
        // Apply transformation
        if (transformation === 'uppercase') {
            return input.toUpperCase();
        } else if (transformation === 'reverse') {
            return input.split('').reverse().join('');
        } else if (transformation === 'json') {
            return JSON.parse(input);
        }
        
        return input;
    }
    
    /**
     * Execute analysis task
     */
    async executeAnalyze(action, params, context) {
        // Placeholder for analysis operations
        return { analyzed: true, action, params };
    }
    
    /**
     * Execute generation task
     */
    async executeGenerate(action, params, context) {
        // Placeholder for generation operations
        return { generated: true, action, params };
    }
    
    /**
     * Submit task for execution
     */
    async submit(task, context = {}) {
        const executionId = this.generateExecutionId();
        
        const execution = {
            id: executionId,
            task,
            context,
            status: 'pending',
            submitTime: Date.now(),
            attempts: 0
        };
        
        this.activeExecutions.set(executionId, execution);
        
        // Try to execute immediately if worker available
        const worker = this.getAvailableWorker();
        
        if (worker) {
            return await this.executeWithWorker(execution, worker);
        } else {
            // Queue for later execution
            this.executionQueue.push(execution);
            console.log(`📋 Queued execution ${executionId} (${this.executionQueue.length} in queue)`);
            
            return {
                executionId,
                status: 'queued',
                queuePosition: this.executionQueue.length
            };
        }
    }
    
    /**
     * Execute task with specific worker
     */
    async executeWithWorker(execution, worker) {
        const { id, task, context } = execution;
        
        execution.status = 'executing';
        execution.startTime = Date.now();
        execution.workerId = worker.id;
        
        // Move worker to busy pool
        this.markWorkerBusy(worker, execution.id);
        
        console.log(`⚡ Executing ${id} on ${worker.id}`);
        
        try {
            // Execute with retry logic
            let result;
            let lastError;
            
            for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
                execution.attempts = attempt;
                
                try {
                    result = await worker.execute(task, context);
                    break; // Success, exit retry loop
                    
                } catch (error) {
                    lastError = error;
                    console.log(`⚠️ Attempt ${attempt} failed for ${id}: ${error.message}`);
                    
                    if (attempt < this.config.retryAttempts) {
                        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
                    }
                }
            }
            
            if (!result && lastError) {
                throw lastError;
            }
            
            // Mark as successful
            execution.status = 'completed';
            execution.endTime = Date.now();
            execution.duration = execution.endTime - execution.startTime;
            execution.result = result;
            
            this.metrics.successfulExecutions++;
            this.updateMetrics(execution);
            
            console.log(`✅ Execution ${id} completed in ${execution.duration}ms`);
            
            this.emit('execution:completed', {
                executionId: id,
                result,
                duration: execution.duration
            });
            
            return {
                executionId: id,
                status: 'completed',
                result,
                duration: execution.duration
            };
            
        } catch (error) {
            // Mark as failed
            execution.status = 'failed';
            execution.endTime = Date.now();
            execution.duration = execution.endTime - execution.startTime;
            execution.error = error.message;
            
            this.metrics.failedExecutions++;
            this.updateMetrics(execution);
            
            console.error(`❌ Execution ${id} failed: ${error.message}`);
            
            this.emit('execution:failed', {
                executionId: id,
                error: error.message,
                duration: execution.duration
            });
            
            return {
                executionId: id,
                status: 'failed',
                error: error.message,
                duration: execution.duration
            };
            
        } finally {
            // Clean up
            this.markWorkerAvailable(worker);
            this.activeExecutions.delete(id);
            this.executionHistory.push(execution);
            
            // Process queue if there are waiting tasks
            this.processQueue();
        }
    }
    
    /**
     * Submit multiple tasks for parallel execution
     */
    async submitBatch(tasks, context = {}) {
        console.log(`🚀 Submitting batch of ${tasks.length} tasks for parallel execution`);
        
        const submissions = tasks.map(task => this.submit(task, context));
        return await Promise.all(submissions);
    }
    
    /**
     * Get available worker from pool
     */
    getAvailableWorker() {
        return this.availableWorkers.shift();
    }
    
    /**
     * Mark worker as busy
     */
    markWorkerBusy(worker, executionId) {
        const index = this.availableWorkers.indexOf(worker);
        if (index > -1) {
            this.availableWorkers.splice(index, 1);
        }
        this.busyWorkers.set(worker.id, executionId);
        
        // Update peak concurrency
        const currentConcurrency = this.busyWorkers.size;
        if (currentConcurrency > this.metrics.peakConcurrency) {
            this.metrics.peakConcurrency = currentConcurrency;
        }
    }
    
    /**
     * Mark worker as available
     */
    markWorkerAvailable(worker) {
        this.busyWorkers.delete(worker.id);
        this.availableWorkers.push(worker);
    }
    
    /**
     * Process execution queue
     */
    processQueue() {
        while (this.executionQueue.length > 0 && this.availableWorkers.length > 0) {
            const execution = this.executionQueue.shift();
            const worker = this.getAvailableWorker();
            
            if (worker) {
                this.executeWithWorker(execution, worker);
            } else {
                // Put back in queue
                this.executionQueue.unshift(execution);
                break;
            }
        }
    }
    
    /**
     * Update performance metrics
     */
    updateMetrics(execution) {
        this.metrics.totalExecutions++;
        
        // Update average execution time
        const currentAvg = this.metrics.averageExecutionTime;
        const newAvg = (currentAvg * (this.metrics.totalExecutions - 1) + execution.duration) / this.metrics.totalExecutions;
        this.metrics.averageExecutionTime = Math.round(newAvg);
        
        // Calculate worker utilization
        const totalWorkers = this.workerPool.length;
        const busyWorkers = this.busyWorkers.size;
        this.metrics.workerUtilization = Math.round((busyWorkers / totalWorkers) * 100);
    }
    
    /**
     * Start monitoring and maintenance
     */
    startMonitoring() {
        // Monitor worker health
        setInterval(() => {
            this.checkWorkerHealth();
        }, 10000); // Every 10 seconds
        
        // Report metrics
        setInterval(() => {
            this.reportMetrics();
        }, 60000); // Every minute
    }
    
    /**
     * Check health of all workers
     */
    checkWorkerHealth() {
        for (const worker of this.workerPool) {
            if (worker.status === 'busy' && worker.currentTask) {
                const execution = this.activeExecutions.get(worker.currentTask);
                if (execution) {
                    const runningTime = Date.now() - execution.startTime;
                    if (runningTime > this.config.executionTimeout) {
                        console.log(`⚠️ Worker ${worker.id} appears stuck on ${worker.currentTask}`);
                        // Could implement worker restart here
                    }
                }
            }
        }
    }
    
    /**
     * Report performance metrics
     */
    reportMetrics() {
        if (this.metrics.totalExecutions > 0) {
            console.log('📊 Executor Metrics:', {
                ...this.metrics,
                queueLength: this.executionQueue.length,
                activeExecutions: this.activeExecutions.size
            });
        }
    }
    
    /**
     * Generate unique execution ID
     */
    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get execution status
     */
    getExecutionStatus(executionId) {
        const execution = this.activeExecutions.get(executionId);
        
        if (execution) {
            return {
                id: execution.id,
                status: execution.status,
                duration: execution.startTime ? Date.now() - execution.startTime : 0,
                workerId: execution.workerId,
                attempts: execution.attempts
            };
        }
        
        // Check history
        const historical = this.executionHistory.find(e => e.id === executionId);
        if (historical) {
            return {
                id: historical.id,
                status: historical.status,
                duration: historical.duration,
                result: historical.result,
                error: historical.error
            };
        }
        
        return { status: 'not_found' };
    }
    
    /**
     * Cancel execution
     */
    cancelExecution(executionId) {
        const execution = this.activeExecutions.get(executionId);
        
        if (execution) {
            execution.status = 'cancelled';
            this.activeExecutions.delete(executionId);
            
            // If it's in queue, remove it
            const queueIndex = this.executionQueue.findIndex(e => e.id === executionId);
            if (queueIndex > -1) {
                this.executionQueue.splice(queueIndex, 1);
            }
            
            this.emit('execution:cancelled', { executionId });
            return true;
        }
        
        return false;
    }
    
    /**
     * Get executor statistics
     */
    getStats() {
        return {
            ...this.metrics,
            workers: {
                total: this.workerPool.length,
                available: this.availableWorkers.length,
                busy: this.busyWorkers.size
            },
            queue: {
                length: this.executionQueue.length,
                oldest: this.executionQueue[0]?.submitTime
            },
            history: {
                total: this.executionHistory.length,
                recent: this.executionHistory.slice(-10).map(e => ({
                    id: e.id,
                    status: e.status,
                    duration: e.duration
                }))
            }
        };
    }
    
    /**
     * Shutdown executor
     */
    async shutdown() {
        console.log('🛑 Shutting down WorkflowExecutor...');
        
        // Cancel all queued executions
        while (this.executionQueue.length > 0) {
            const execution = this.executionQueue.shift();
            this.cancelExecution(execution.id);
        }
        
        // Wait for active executions to complete
        const timeout = setTimeout(() => {
            console.log('⚠️ Force shutting down after timeout');
        }, 30000);
        
        while (this.activeExecutions.size > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        clearTimeout(timeout);
        
        console.log('✅ WorkflowExecutor shutdown complete');
    }
}

module.exports = WorkflowExecutor;