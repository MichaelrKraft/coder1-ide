/**
 * Embedding Worker Pool
 * 
 * Manages a pool of worker threads for embedding generation.
 * Provides load balancing, error recovery, and performance monitoring.
 */

const { Worker } = require('worker_threads');
const { EventEmitter } = require('events');
const path = require('path');
const crypto = require('crypto');

class EmbeddingWorkerPool extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            poolSize: Math.min(4, Math.max(1, Math.floor(require('os').cpus().length / 2))), // Half of CPU cores
            maxQueueSize: 1000,
            workerTimeout: 30000, // 30 seconds
            retryAttempts: 2,
            model: 'Xenova/all-MiniLM-L6-v2',
            ...options
        };
        
        // Worker management
        this.workers = [];
        this.availableWorkers = [];
        this.busyWorkers = new Set();
        
        // Task queue
        this.taskQueue = [];
        this.activeTasks = new Map(); // taskId -> { resolve, reject, timeout }
        
        // Performance metrics
        this.metrics = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            averageProcessingTime: 0,
            workerUtilization: 0,
            queueLength: 0
        };
        
        // State
        this.isInitialized = false;
        this.isShuttingDown = false;
        
        // Initialize the pool
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log(`🧠 Initializing embedding worker pool (${this.options.poolSize} workers)...`);
            
            // Create worker threads
            for (let i = 0; i < this.options.poolSize; i++) {
                await this.createWorker(i);
            }
            
            // Start task processor
            this.startTaskProcessor();
            
            this.isInitialized = true;
            console.log(`✅ Embedding worker pool ready with ${this.workers.length} workers`);
            
            this.emit('ready');
        } catch (error) {
            console.error('❌ Failed to initialize worker pool:', error);
            this.emit('error', error);
        }
    }
    
    async createWorker(id) {
        return new Promise((resolve, reject) => {
            try {
                const workerPath = path.join(__dirname, 'embedding-worker.js');
                const worker = new Worker(workerPath, {
                    workerData: {
                        id,
                        model: this.options.model
                    }
                });
                
                worker.workerId = id;
                worker.isReady = false;
                worker.taskCount = 0;
                worker.lastUsed = Date.now();
                
                // Handle worker messages
                worker.on('message', (message) => {
                    this.handleWorkerMessage(worker, message);
                });
                
                // Handle worker errors
                worker.on('error', (error) => {
                    console.error(`Worker ${id} error:`, error);
                    this.handleWorkerError(worker, error);
                });
                
                // Handle worker exit
                worker.on('exit', (code) => {
                    console.warn(`Worker ${id} exited with code ${code}`);
                    this.handleWorkerExit(worker, code);
                });
                
                this.workers.push(worker);
                
                // Wait for worker to be ready
                const readyTimeout = setTimeout(() => {
                    reject(new Error(`Worker ${id} initialization timeout`));
                }, 30000);
                
                const onReady = () => {
                    clearTimeout(readyTimeout);
                    resolve(worker);
                };
                
                worker.once('ready', onReady);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    handleWorkerMessage(worker, message) {
        switch (message.type) {
        case 'ready':
            worker.isReady = true;
            this.availableWorkers.push(worker);
            worker.emit('ready');
            console.log(`Worker ${worker.workerId} ready`);
            break;
                
        case 'result':
            this.handleTaskResult(message);
            this.returnWorkerToPool(worker);
            break;
                
        case 'batch_result':
            this.handleTaskResult(message);
            this.returnWorkerToPool(worker);
            break;
                
        case 'error':
            this.handleTaskError(message);
            this.returnWorkerToPool(worker);
            break;
                
        case 'health_response':
            // Handle health check response
            break;
                
        default:
            console.warn(`Unknown message type from worker: ${message.type}`);
        }
    }
    
    handleTaskResult(message) {
        const task = this.activeTasks.get(message.id);
        if (task) {
            clearTimeout(task.timeout);
            this.activeTasks.delete(message.id);
            
            this.metrics.completedTasks++;
            this.updateAverageProcessingTime(Date.now() - task.startTime);
            
            task.resolve(message);
        }
    }
    
    handleTaskError(message) {
        const task = this.activeTasks.get(message.id);
        if (task) {
            clearTimeout(task.timeout);
            this.activeTasks.delete(message.id);
            
            this.metrics.failedTasks++;
            
            task.reject(new Error(message.error));
        }
    }
    
    handleWorkerError(worker, error) {
        // Remove worker from available pool
        const index = this.availableWorkers.indexOf(worker);
        if (index > -1) {
            this.availableWorkers.splice(index, 1);
        }
        this.busyWorkers.delete(worker);
        
        // Try to restart worker if not shutting down
        if (!this.isShuttingDown) {
            console.log(`Restarting failed worker ${worker.workerId}...`);
            this.createWorker(worker.workerId).catch(console.error);
        }
    }
    
    handleWorkerExit(worker, code) {
        // Clean up worker references
        const index = this.availableWorkers.indexOf(worker);
        if (index > -1) {
            this.availableWorkers.splice(index, 1);
        }
        this.busyWorkers.delete(worker);
    }
    
    returnWorkerToPool(worker) {
        this.busyWorkers.delete(worker);
        this.availableWorkers.push(worker);
        worker.lastUsed = Date.now();
        
        // Process next task if available
        this.processNextTask();
    }
    
    startTaskProcessor() {
        // Process tasks every 10ms
        this.taskProcessor = setInterval(() => {
            this.processNextTask();
            this.updateMetrics();
        }, 10);
    }
    
    processNextTask() {
        if (this.taskQueue.length === 0 || this.availableWorkers.length === 0) {
            return;
        }
        
        const task = this.taskQueue.shift();
        const worker = this.availableWorkers.shift();
        
        this.busyWorkers.add(worker);
        worker.taskCount++;
        
        // Set up task tracking
        const taskId = task.id;
        const timeout = setTimeout(() => {
            this.handleTaskTimeout(taskId);
        }, this.options.workerTimeout);
        
        this.activeTasks.set(taskId, {
            ...task,
            timeout,
            startTime: Date.now()
        });
        
        // Send task to worker
        worker.postMessage({
            type: task.type,
            id: taskId,
            ...task.data
        });
    }
    
    handleTaskTimeout(taskId) {
        const task = this.activeTasks.get(taskId);
        if (task) {
            this.activeTasks.delete(taskId);
            this.metrics.failedTasks++;
            task.reject(new Error('Task timeout'));
        }
    }
    
    /**
     * Generate embedding for a single text
     */
    async generateEmbedding(text, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Worker pool not initialized');
        }
        
        if (this.taskQueue.length >= this.options.maxQueueSize) {
            throw new Error('Task queue full');
        }
        
        return new Promise((resolve, reject) => {
            const taskId = crypto.randomBytes(8).toString('hex');
            
            const task = {
                id: taskId,
                type: 'generate',
                data: { text },
                resolve,
                reject
            };
            
            this.taskQueue.push(task);
            this.metrics.totalTasks++;
            
            // Try to process immediately if worker available
            this.processNextTask();
        });
    }
    
    /**
     * Generate embeddings for multiple texts in batch
     */
    async generateBatchEmbeddings(items) {
        if (!this.isInitialized) {
            throw new Error('Worker pool not initialized');
        }
        
        if (this.taskQueue.length >= this.options.maxQueueSize) {
            throw new Error('Task queue full');
        }
        
        return new Promise((resolve, reject) => {
            const taskId = crypto.randomBytes(8).toString('hex');
            
            const task = {
                id: taskId,
                type: 'batch',
                data: { items },
                resolve,
                reject
            };
            
            this.taskQueue.push(task);
            this.metrics.totalTasks++;
            
            // Try to process immediately if worker available
            this.processNextTask();
        });
    }
    
    updateAverageProcessingTime(duration) {
        const count = this.metrics.completedTasks;
        this.metrics.averageProcessingTime = 
            (this.metrics.averageProcessingTime * (count - 1) + duration) / count;
    }
    
    updateMetrics() {
        this.metrics.queueLength = this.taskQueue.length;
        this.metrics.workerUtilization = this.busyWorkers.size / this.workers.length;
    }
    
    /**
     * Get pool status and metrics
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            poolSize: this.workers.length,
            availableWorkers: this.availableWorkers.length,
            busyWorkers: this.busyWorkers.size,
            queueLength: this.taskQueue.length,
            activeTasks: this.activeTasks.size,
            metrics: { ...this.metrics }
        };
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        if (!this.isInitialized) {
            return { healthy: false, reason: 'Not initialized' };
        }
        
        const status = this.getStatus();
        
        return {
            healthy: true,
            status,
            readyWorkers: this.availableWorkers.length,
            totalWorkers: this.workers.length
        };
    }
    
    /**
     * Shutdown the worker pool
     */
    async shutdown() {
        console.log('🔄 Shutting down embedding worker pool...');
        
        this.isShuttingDown = true;
        
        // Clear task processor
        if (this.taskProcessor) {
            clearInterval(this.taskProcessor);
        }
        
        // Terminate all workers
        const terminationPromises = this.workers.map(worker => {
            return new Promise((resolve) => {
                worker.once('exit', resolve);
                worker.terminate();
            });
        });
        
        await Promise.all(terminationPromises);
        
        // Clear task queue and active tasks
        this.taskQueue.length = 0;
        this.activeTasks.clear();
        
        console.log('✅ Embedding worker pool shutdown complete');
    }
}

module.exports = { EmbeddingWorkerPool };