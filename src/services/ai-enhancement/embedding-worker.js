/**
 * Embedding Worker Thread
 * 
 * Handles CPU-intensive embedding generation in a separate thread
 * to prevent blocking the main application thread. Uses Xenova
 * transformers for local embedding generation.
 */

const { parentPort, workerData } = require('worker_threads');
const { pipeline } = require('@xenova/transformers');

class EmbeddingWorker {
    constructor() {
        this.embedder = null;
        this.isReady = false;
        this.model = workerData?.model || 'Xenova/all-MiniLM-L6-v2';
        
        // Initialize the embedding model
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log(`[Worker] Initializing embedding model: ${this.model}`);
            
            // Load the model
            this.embedder = await pipeline('feature-extraction', this.model);
            this.isReady = true;
            
            // Notify main thread that we're ready
            parentPort.postMessage({
                type: 'ready',
                message: 'Embedding worker initialized successfully'
            });
            
            console.log('[Worker] Embedding model loaded and ready');
        } catch (error) {
            console.error('[Worker] Failed to initialize embedding model:', error);
            parentPort.postMessage({
                type: 'error',
                error: error.message
            });
        }
    }
    
    async generateEmbedding(text) {
        if (!this.isReady) {
            throw new Error('Worker not ready - model still loading');
        }
        
        const startTime = Date.now();
        
        try {
            // Clean and preprocess text
            const cleanText = this.preprocessText(text);
            
            // Generate embedding
            const output = await this.embedder(cleanText, {
                pooling: 'mean',
                normalize: true
            });
            
            // Convert to array
            const embedding = Array.from(output.data);
            
            const duration = Date.now() - startTime;
            
            return {
                embedding,
                duration,
                textLength: cleanText.length
            };
        } catch (error) {
            console.error('[Worker] Embedding generation failed:', error);
            throw error;
        }
    }
    
    preprocessText(text) {
        return text
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 512); // Model token limits
    }
    
    async processBatch(items) {
        const results = [];
        const errors = [];
        
        for (let i = 0; i < items.length; i++) {
            try {
                const result = await this.generateEmbedding(items[i].text);
                results.push({
                    id: items[i].id,
                    ...result
                });
            } catch (error) {
                errors.push({
                    id: items[i].id,
                    error: error.message
                });
            }
        }
        
        return { results, errors };
    }
}

// Initialize worker
const worker = new EmbeddingWorker();

// Listen for messages from main thread
parentPort.on('message', async (message) => {
    try {
        switch (message.type) {
        case 'generate':
            const result = await worker.generateEmbedding(message.text);
            parentPort.postMessage({
                type: 'result',
                id: message.id,
                ...result
            });
            break;
                
        case 'batch':
            const batchResult = await worker.processBatch(message.items);
            parentPort.postMessage({
                type: 'batch_result',
                id: message.id,
                ...batchResult
            });
            break;
                
        case 'health':
            parentPort.postMessage({
                type: 'health_response',
                isReady: worker.isReady,
                model: worker.model
            });
            break;
                
        default:
            parentPort.postMessage({
                type: 'error',
                error: `Unknown message type: ${message.type}`
            });
        }
    } catch (error) {
        parentPort.postMessage({
            type: 'error',
            id: message.id,
            error: error.message
        });
    }
});