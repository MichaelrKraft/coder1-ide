/**
 * Vector Memory Enhancer
 * 
 * Adds vector database capabilities to the existing MemorySystem
 * using ChromaDB for local vector storage and Xenova transformers
 * for embeddings. This creates a hybrid JSON+vector approach.
 * 
 * Core Philosophy: Enhance, don't replace. Keep JSON as backup.
 */

const { ChromaClient } = require('chromadb');
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Import existing MemorySystem to extend it
const { MemorySystem } = require('./MemorySystem');
const { ErrorPatternMemory } = require('../memory/ErrorPatternMemory');
const { EmbeddingWorkerPool } = require('./EmbeddingWorkerPool');
const { MemoryPerformanceMonitor } = require('../monitoring/MemoryPerformanceMonitor');

class VectorMemoryEnhancer extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            persistDirectory: path.join(process.cwd(), '.coder1', 'memory', 'vectors'),
            embeddingModel: 'Xenova/all-MiniLM-L6-v2', // Local, runs on CPU
            collections: {
                errors: 'error_patterns',
                conversations: 'conversations',
                codePatterns: 'code_patterns',
                insights: 'agent_insights'
            },
            similarityThreshold: 0.75,
            maxResults: 5,
            ...options
        };
        
        // Existing memory systems
        this.memorySystem = MemorySystem.getInstance();
        this.errorMemory = ErrorPatternMemory.getInstance();
        
        // ChromaDB client
        this.chromaClient = null;
        this.collections = {};
        
        // Worker pool for embedding generation
        this.workerPool = null;
        
        // Performance monitoring
        this.performanceMonitor = MemoryPerformanceMonitor.getInstance();
        
        // Performance tracking
        this.metrics = {
            embeddingsGenerated: 0,
            vectorSearches: 0,
            averageEmbeddingTime: 0,
            averageSearchTime: 0
        };
        
        // Queue for async embedding
        this.embeddingQueue = [];
        this.isProcessing = false;
        
        // Initialize
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('🚀 VectorMemoryEnhancer: Initializing...');
            
            // Ensure directory exists
            await fs.mkdir(this.options.persistDirectory, { recursive: true });
            
            // Initialize ChromaDB with correct configuration
            this.chromaClient = new ChromaClient({
                // Use default ChromaDB configuration (in-memory for now)
                // TODO: Set up proper persistent ChromaDB server for production
            });
            
            // Initialize worker pool for embedding generation
            console.log('🧠 Initializing embedding worker pool...');
            this.workerPool = new EmbeddingWorkerPool({
                model: this.options.embeddingModel,
                poolSize: Math.min(4, Math.max(1, Math.floor(require('os').cpus().length / 2)))
            });
            
            // Wait for worker pool to be ready
            await new Promise((resolve, reject) => {
                this.workerPool.once('ready', resolve);
                this.workerPool.once('error', reject);
            });
            console.log('✅ Embedding worker pool ready');
            
            // Create or get collections
            await this.initializeCollections();
            
            // Hook into existing memory systems
            this.attachListeners();
            
            // Start processing queue
            this.startQueueProcessor();
            
            // Migrate existing data (async, non-blocking)
            this.migrateExistingData().catch(err => {
                console.error('Migration error (non-critical):', err);
            });
            
            console.log('✨ VectorMemoryEnhancer: Ready!');
        } catch (error) {
            console.error('❌ VectorMemoryEnhancer initialization failed:', error);
            console.log('⚠️ Falling back to JSON-only mode');
        }
    }
    
    async initializeCollections() {
        try {
            // Get or create collections for different memory types
            for (const [key, name] of Object.entries(this.options.collections)) {
                try {
                    // Try to get existing collection
                    this.collections[key] = await this.chromaClient.getCollection({
                        name: name
                    });
                    console.log(`📚 Loaded existing collection: ${name}`);
                } catch (error) {
                    // Create new collection if doesn't exist
                    this.collections[key] = await this.chromaClient.createCollection({
                        name: name,
                        metadata: { 
                            description: `Vector storage for ${key}`,
                            created: new Date().toISOString()
                        }
                    });
                    console.log(`📚 Created new collection: ${name}`);
                }
            }
        } catch (error) {
            console.error('Failed to initialize collections:', error);
            throw error;
        }
    }
    
    /**
     * Generate embeddings for text using worker pool
     */
    async generateEmbedding(text) {
        const operationId = `embedding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        
        // Start performance tracking
        this.performanceMonitor.startTracking(operationId, { 
            type: 'embedding', 
            textLength: text.length 
        });
        
        try {
            if (!this.workerPool) {
                console.warn('Worker pool not available, skipping embedding generation');
                this.performanceMonitor.endTracking(operationId, false, { 
                    reason: 'worker_pool_unavailable' 
                });
                return null;
            }
            
            // Clean and preprocess text
            const cleanText = this.preprocessText(text);
            
            // Generate embedding using worker pool
            const result = await this.workerPool.generateEmbedding(cleanText);
            
            // Update metrics
            const totalDuration = Date.now() - startTime;
            this.updateEmbeddingMetrics(totalDuration);
            this.metrics.embeddingsGenerated++;
            
            // Record performance
            this.performanceMonitor.recordEmbedding(totalDuration, true, 1);
            this.performanceMonitor.endTracking(operationId, true, {
                embeddingSize: result.embedding?.length || 0,
                workerDuration: result.duration || 0
            });
            
            return result.embedding;
        } catch (error) {
            console.error('Embedding generation failed:', error);
            this.performanceMonitor.recordEmbedding(Date.now() - startTime, false, 1);
            this.performanceMonitor.endTracking(operationId, false, { 
                error: error.message 
            });
            return null;
        }
    }
    
    /**
     * Store item with vector embedding
     */
    async storeWithEmbedding(collectionKey, item) {
        try {
            const collection = this.collections[collectionKey];
            if (!collection) {
                console.warn(`Collection ${collectionKey} not found`);
                return false;
            }
            
            // Generate text representation for embedding
            const text = this.itemToText(item);
            
            // Add to embedding queue for async processing
            this.embeddingQueue.push({
                collectionKey,
                item,
                text,
                id: item.id || this.generateId()
            });
            
            // Process queue if not already processing
            if (!this.isProcessing) {
                this.processEmbeddingQueue();
            }
            
            return true;
        } catch (error) {
            console.error('Store with embedding failed:', error);
            return false;
        }
    }
    
    /**
     * Search for similar items using vector similarity
     */
    async searchSimilar(collectionKey, query, limit = 5) {
        const operationId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        
        // Start performance tracking
        this.performanceMonitor.startTracking(operationId, { 
            type: 'vector_search',
            collection: collectionKey,
            queryLength: query.length,
            limit
        });
        
        try {
            const collection = this.collections[collectionKey];
            if (!collection) {
                console.warn(`Collection ${collectionKey} not found`);
                this.performanceMonitor.endTracking(operationId, false, { 
                    reason: 'collection_not_found' 
                });
                return [];
            }
            
            // Generate query embedding
            const queryEmbedding = await this.generateEmbedding(query);
            if (!queryEmbedding) {
                console.warn('Failed to generate query embedding');
                this.performanceMonitor.endTracking(operationId, false, { 
                    reason: 'embedding_failed' 
                });
                return [];
            }
            
            // Search in vector database
            const results = await collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: limit
            });
            
            // Update metrics
            const duration = Date.now() - startTime;
            this.updateSearchMetrics(duration);
            
            // Filter by similarity threshold and format results
            if (results && results.ids && results.ids[0]) {
                const items = [];
                const distances = results.distances[0];
                const metadatas = results.metadatas[0];
                const documents = results.documents[0];
                
                for (let i = 0; i < results.ids[0].length; i++) {
                    const similarity = 1 - distances[i]; // Convert distance to similarity
                    if (similarity >= this.options.similarityThreshold) {
                        items.push({
                            id: results.ids[0][i],
                            similarity: similarity,
                            metadata: metadatas[i],
                            content: documents[i]
                        });
                    }
                }
                
                // Record successful search
                this.performanceMonitor.recordVectorSearch(duration, true, items.length, false);
                this.performanceMonitor.endTracking(operationId, true, {
                    totalResults: results.ids[0].length,
                    filteredResults: items.length,
                    avgSimilarity: items.reduce((sum, item) => sum + item.similarity, 0) / items.length || 0
                });
                
                return items;
            }
            
            // No results found
            this.performanceMonitor.recordVectorSearch(duration, true, 0, false);
            this.performanceMonitor.endTracking(operationId, true, { 
                totalResults: 0,
                filteredResults: 0 
            });
            
            return [];
        } catch (error) {
            console.error('Vector search failed:', error);
            this.performanceMonitor.recordVectorSearch(Date.now() - startTime, false, 0, false);
            this.performanceMonitor.endTracking(operationId, false, { 
                error: error.message 
            });
            return [];
        }
    }
    
    /**
     * Process embedding queue with batch optimization
     */
    async processEmbeddingQueue() {
        if (this.isProcessing || this.embeddingQueue.length === 0 || !this.workerPool) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            // Process in batches for better performance
            const batchSize = 20;
            while (this.embeddingQueue.length > 0) {
                const batch = this.embeddingQueue.splice(0, batchSize);
                
                try {
                    // Prepare batch for worker pool
                    const batchItems = batch.map(item => ({
                        id: item.id,
                        text: item.text
                    }));
                    
                    // Generate embeddings in batch
                    const batchResult = await this.workerPool.generateBatchEmbeddings(batchItems);
                    
                    // Store successful embeddings
                    for (let i = 0; i < batchResult.results.length; i++) {
                        const result = batchResult.results[i];
                        const originalItem = batch.find(item => item.id === result.id);
                        
                        if (originalItem && result.embedding) {
                            const collection = this.collections[originalItem.collectionKey];
                            
                            try {
                                // Store in vector database
                                await collection.add({
                                    ids: [result.id],
                                    embeddings: [result.embedding],
                                    documents: [originalItem.text],
                                    metadatas: [originalItem.item]
                                });
                            } catch (error) {
                                console.error('Failed to store embedding in ChromaDB:', error);
                            }
                        }
                    }
                    
                    // Log errors from batch processing
                    if (batchResult.errors.length > 0) {
                        console.warn(`Batch embedding errors: ${batchResult.errors.length}/${batch.length}`);
                        batchResult.errors.forEach(error => {
                            console.error(`Embedding error for ${error.id}:`, error.error);
                        });
                    }
                    
                } catch (error) {
                    console.error('Failed to process embedding batch:', error);
                    // Fall back to individual processing for this batch
                    for (const item of batch) {
                        try {
                            const embedding = await this.generateEmbedding(item.text);
                            if (embedding) {
                                const collection = this.collections[item.collectionKey];
                                await collection.add({
                                    ids: [item.id],
                                    embeddings: [embedding],
                                    documents: [item.text],
                                    metadatas: [item.item]
                                });
                            }
                        } catch (individualError) {
                            console.error('Failed to process individual embedding:', individualError);
                        }
                    }
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Start queue processor
     */
    startQueueProcessor() {
        // Process queue every 5 seconds
        this.queueInterval = setInterval(() => {
            if (this.embeddingQueue.length > 0) {
                this.processEmbeddingQueue();
            }
            
            // Update performance monitor with current metrics
            this.updatePerformanceMetrics();
        }, 5000);
    }
    
    /**
     * Update performance monitor with current metrics
     */
    updatePerformanceMetrics() {
        try {
            // Update vector memory metrics
            this.performanceMonitor.updateMetrics('vectorMemory', {
                embeddingsGenerated: this.metrics.embeddingsGenerated,
                vectorSearches: this.metrics.vectorSearches,
                queueSize: this.embeddingQueue.length,
                averageEmbeddingTime: this.metrics.averageEmbeddingTime,
                averageSearchTime: this.metrics.averageSearchTime
            });
            
            // Update worker pool metrics if available
            if (this.workerPool) {
                const workerStatus = this.workerPool.getStatus();
                this.performanceMonitor.updateMetrics('workerPool', workerStatus);
            }
        } catch (error) {
            console.error('Failed to update performance metrics:', error);
        }
    }
    
    /**
     * Attach listeners to existing memory systems
     */
    attachListeners() {
        // Listen to ErrorPatternMemory events
        this.errorMemory.on('pattern-created', (pattern) => {
            this.storeWithEmbedding('errors', pattern);
        });
        
        // Listen to MemorySystem events
        this.memorySystem.on('insight-stored', (insight) => {
            this.storeWithEmbedding('insights', insight);
        });
        
        this.memorySystem.on('conversation-stored', (conversation) => {
            this.storeWithEmbedding('conversations', conversation);
        });
        
        this.memorySystem.on('pattern-stored', (pattern) => {
            this.storeWithEmbedding('codePatterns', pattern);
        });
    }
    
    /**
     * Migrate existing JSON data to vectors (async)
     */
    async migrateExistingData() {
        try {
            console.log('🔄 Starting migration of existing data to vectors...');
            
            // Migrate error patterns
            const errorPatterns = Array.from(this.errorMemory.patterns.values());
            for (const pattern of errorPatterns) {
                await this.storeWithEmbedding('errors', pattern);
            }
            
            // Migrate agent insights (limit to recent ones)
            const insights = this.memorySystem.getAgentInsights('all', null, 100);
            for (const insight of insights) {
                await this.storeWithEmbedding('insights', insight);
            }
            
            console.log(`📊 Migration queued: ${errorPatterns.length} errors, ${insights.length} insights`);
        } catch (error) {
            console.error('Migration failed:', error);
        }
    }
    
    /**
     * Convert item to text for embedding
     */
    itemToText(item) {
        if (typeof item === 'string') {
            return item;
        }
        
        // Build text representation based on item type
        const parts = [];
        
        if (item.content) parts.push(item.content);
        if (item.message) parts.push(item.message);
        if (item.error) parts.push(item.error.message || item.error);
        if (item.solution) parts.push(item.solution.fix || item.solution);
        if (item.description) parts.push(item.description);
        if (item.code) parts.push(item.code);
        
        return parts.join(' ').slice(0, 512); // Limit to 512 chars
    }
    
    /**
     * Preprocess text for embedding
     */
    preprocessText(text) {
        return text
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 512); // Model has token limits
    }
    
    /**
     * Update embedding metrics
     */
    updateEmbeddingMetrics(duration) {
        const count = this.metrics.embeddingsGenerated;
        this.metrics.averageEmbeddingTime = 
            (this.metrics.averageEmbeddingTime * count + duration) / (count + 1);
    }
    
    /**
     * Update search metrics
     */
    updateSearchMetrics(duration) {
        const count = this.metrics.vectorSearches;
        this.metrics.averageSearchTime = 
            (this.metrics.averageSearchTime * count + duration) / (count + 1);
        this.metrics.vectorSearches++;
    }
    
    /**
     * Generate unique ID
     */
    generateId() {
        return `vec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }
    
    /**
     * Get metrics including worker pool status
     */
    getMetrics() {
        const baseMetrics = {
            ...this.metrics,
            queueSize: this.embeddingQueue.length,
            isProcessing: this.isProcessing
        };
        
        // Add worker pool metrics if available
        if (this.workerPool) {
            const workerStatus = this.workerPool.getStatus();
            baseMetrics.workerPool = {
                isInitialized: workerStatus.isInitialized,
                poolSize: workerStatus.poolSize,
                availableWorkers: workerStatus.availableWorkers,
                busyWorkers: workerStatus.busyWorkers,
                queueLength: workerStatus.queueLength,
                workerUtilization: workerStatus.workerUtilization,
                metrics: workerStatus.metrics
            };
        }
        
        return baseMetrics;
    }
    
    /**
     * Clean up
     */
    async close() {
        if (this.queueInterval) {
            clearInterval(this.queueInterval);
        }
        
        // Process remaining queue
        await this.processEmbeddingQueue();
        
        // Shutdown worker pool
        if (this.workerPool) {
            await this.workerPool.shutdown();
        }
        
        console.log('🔚 VectorMemoryEnhancer: Closed');
    }
}

// Singleton instance
let instance = null;

VectorMemoryEnhancer.getInstance = function(options = {}) {
    if (!instance) {
        instance = new VectorMemoryEnhancer(options);
    }
    return instance;
};

VectorMemoryEnhancer.reset = function() {
    if (instance) {
        instance.close();
    }
    instance = null;
};

module.exports = { VectorMemoryEnhancer };