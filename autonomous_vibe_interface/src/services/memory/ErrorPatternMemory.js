/**
 * Error Pattern Memory Service
 * 
 * Captures error patterns and their solutions for future reference.
 * This is the first step in building long-term memory with RAG.
 * 
 * Core Philosophy: Start with highest ROI - error→fix patterns
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

class ErrorPatternMemory extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Memory storage
        this.patterns = new Map();
        this.pendingErrors = new Map();
        
        // Configuration
        this.options = {
            dataPath: options.dataPath || path.join(process.cwd(), '.coder1', 'memory', 'error-patterns.json'),
            maxPatterns: options.maxPatterns || 1000,
            similarityThreshold: options.similarityThreshold || 0.8,
            errorTimeout: options.errorTimeout || 5 * 60 * 1000, // 5 minutes to wait for fix
            autoSaveInterval: options.autoSaveInterval || 30000, // 30 seconds
            ...options
        };
        
        // Performance tracking
        this.metrics = {
            totalErrors: 0,
            totalFixes: 0,
            matchesFound: 0,
            averageRetrievalTime: 0
        };
        
        // Initialize
        this.initialize();
    }
    
    async initialize() {
        try {
            // Load existing patterns
            await this.loadPatterns();
            
            // Start auto-save
            this.autoSaveInterval = setInterval(() => {
                this.savePatterns();
            }, this.options.autoSaveInterval);
            
            // Clean up old pending errors periodically
            this.cleanupInterval = setInterval(() => {
                this.cleanupPendingErrors();
            }, 60000); // Every minute
            
            console.log(`🧠 ErrorPatternMemory: Initialized with ${this.patterns.size} patterns`);
        } catch (error) {
            console.error('ErrorPatternMemory: Initialization failed:', error);
        }
    }
    
    /**
     * Capture an error occurrence
     */
    async captureError(error, context = {}) {
        try {
            const startTime = Date.now();
            
            // Extract error details
            const errorData = {
                id: this.generateId(),
                message: this.normalizeErrorMessage(error.message || error),
                type: error.type || this.classifyError(error.message || error),
                stack: error.stack,
                timestamp: Date.now(),
                context: {
                    lastCommands: context.lastCommands || [],
                    currentFile: context.currentFile,
                    workingDirectory: context.workingDirectory,
                    sessionId: context.sessionId,
                    ...context
                }
            };
            
            // Check for similar existing patterns
            const similarPattern = await this.findSimilarPattern(errorData);
            
            if (similarPattern) {
                // Found a match!
                this.metrics.matchesFound++;
                const retrievalTime = Date.now() - startTime;
                this.updateAverageRetrievalTime(retrievalTime);
                
                console.log(`✨ Found similar error pattern: ${similarPattern.solution ? 'WITH SOLUTION' : 'NO SOLUTION YET'}`);
                
                this.emit('pattern-matched', {
                    error: errorData,
                    pattern: similarPattern,
                    retrievalTime
                });
                
                // Update pattern usage
                similarPattern.usageCount = (similarPattern.usageCount || 0) + 1;
                similarPattern.lastUsed = Date.now();
                
                return {
                    matched: true,
                    pattern: similarPattern,
                    confidence: this.calculateSimilarity(errorData, similarPattern)
                };
            }
            
            // No match, store as pending
            this.pendingErrors.set(errorData.id, errorData);
            this.metrics.totalErrors++;
            
            // Set timeout to clean up if no fix arrives
            setTimeout(() => {
                if (this.pendingErrors.has(errorData.id)) {
                    this.pendingErrors.delete(errorData.id);
                    console.log(`⏱️ Error expired without fix: ${errorData.id}`);
                }
            }, this.options.errorTimeout);
            
            return {
                matched: false,
                errorId: errorData.id,
                message: 'Error captured, waiting for solution'
            };
            
        } catch (error) {
            console.error('ErrorPatternMemory: Failed to capture error:', error);
            return { error: error.message };
        }
    }
    
    /**
     * Capture a fix for a recent error
     */
    async captureFix(solution, errorId = null, context = {}) {
        try {
            let errorData;
            
            if (errorId && this.pendingErrors.has(errorId)) {
                // Direct match with error ID
                errorData = this.pendingErrors.get(errorId);
            } else {
                // Try to find recent error that might match
                const recentErrors = Array.from(this.pendingErrors.values())
                    .filter(e => (Date.now() - e.timestamp) < 60000) // Last minute
                    .sort((a, b) => b.timestamp - a.timestamp);
                
                if (recentErrors.length > 0) {
                    errorData = recentErrors[0];
                    errorId = errorData.id;
                }
            }
            
            if (!errorData) {
                console.log('⚠️ No recent error found to associate with fix');
                return { error: 'No recent error to link fix to' };
            }
            
            // Create pattern with error and solution
            const pattern = {
                id: this.generateId(),
                error: errorData,
                solution: {
                    fix: solution,
                    timestamp: Date.now(),
                    context: context
                },
                createdAt: Date.now(),
                usageCount: 0,
                successRate: 1.0
            };
            
            // Store pattern
            this.patterns.set(pattern.id, pattern);
            this.pendingErrors.delete(errorId);
            this.metrics.totalFixes++;
            
            // Trim if too many patterns
            if (this.patterns.size > this.options.maxPatterns) {
                this.trimPatterns();
            }
            
            console.log(`💡 Captured error→fix pattern: ${errorData.type}`);
            
            this.emit('pattern-created', pattern);
            
            return {
                success: true,
                patternId: pattern.id,
                message: 'Error-fix pattern captured successfully'
            };
            
        } catch (error) {
            console.error('ErrorPatternMemory: Failed to capture fix:', error);
            return { error: error.message };
        }
    }
    
    /**
     * Find similar error patterns
     */
    async findSimilarPattern(errorData) {
        let bestMatch = null;
        let bestScore = 0;
        
        for (const pattern of this.patterns.values()) {
            const similarity = this.calculateSimilarity(errorData, pattern.error);
            
            if (similarity > this.options.similarityThreshold && similarity > bestScore) {
                bestMatch = pattern;
                bestScore = similarity;
            }
        }
        
        return bestMatch;
    }
    
    /**
     * Calculate similarity between two errors
     */
    calculateSimilarity(error1, error2) {
        // Simple similarity based on message and type
        // This will be enhanced with embeddings later
        
        let score = 0;
        
        // Type match
        if (error1.type === error2.type) {
            score += 0.3;
        }
        
        // Message similarity (simple token overlap for now)
        const tokens1 = this.tokenize(error1.message);
        const tokens2 = this.tokenize(error2.message);
        const intersection = tokens1.filter(t => tokens2.includes(t));
        const union = [...new Set([...tokens1, ...tokens2])];
        
        if (union.length > 0) {
            score += (intersection.length / union.length) * 0.7;
        }
        
        return score;
    }
    
    /**
     * Tokenize error message for comparison
     */
    tokenize(message) {
        return message.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 2);
    }
    
    /**
     * Normalize error message
     */
    normalizeErrorMessage(message) {
        // Remove file paths, line numbers, etc. for better matching
        return message
            .replace(/\/[^\s]+/g, '<path>')
            .replace(/:\d+:\d+/g, ':<line>:<col>')
            .replace(/\d+/g, '<number>');
    }
    
    /**
     * Classify error type
     */
    classifyError(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('command not found')) return 'command-not-found';
        if (lowerMessage.includes('permission denied')) return 'permission-denied';
        if (lowerMessage.includes('cannot find module')) return 'module-not-found';
        if (lowerMessage.includes('syntaxerror')) return 'syntax-error';
        if (lowerMessage.includes('typeerror')) return 'type-error';
        if (lowerMessage.includes('referenceerror')) return 'reference-error';
        if (lowerMessage.includes('enoent')) return 'file-not-found';
        if (lowerMessage.includes('eacces')) return 'access-denied';
        if (lowerMessage.includes('timeout')) return 'timeout';
        if (lowerMessage.includes('connection')) return 'connection-error';
        
        return 'unknown';
    }
    
    /**
     * Clean up old pending errors
     */
    cleanupPendingErrors() {
        const now = Date.now();
        const expired = [];
        
        for (const [id, error] of this.pendingErrors.entries()) {
            if (now - error.timestamp > this.options.errorTimeout) {
                expired.push(id);
            }
        }
        
        expired.forEach(id => {
            this.pendingErrors.delete(id);
        });
        
        if (expired.length > 0) {
            console.log(`🧹 Cleaned up ${expired.length} expired pending errors`);
        }
    }
    
    /**
     * Trim oldest/least used patterns
     */
    trimPatterns() {
        const patterns = Array.from(this.patterns.values())
            .sort((a, b) => {
                // Sort by usage and recency
                const scoreA = (a.usageCount || 0) + (1 / (Date.now() - a.createdAt));
                const scoreB = (b.usageCount || 0) + (1 / (Date.now() - b.createdAt));
                return scoreA - scoreB;
            });
        
        // Remove bottom 10%
        const toRemove = Math.floor(patterns.length * 0.1);
        patterns.slice(0, toRemove).forEach(pattern => {
            this.patterns.delete(pattern.id);
        });
    }
    
    /**
     * Update average retrieval time
     */
    updateAverageRetrievalTime(newTime) {
        const count = this.metrics.matchesFound;
        this.metrics.averageRetrievalTime = 
            (this.metrics.averageRetrievalTime * (count - 1) + newTime) / count;
    }
    
    /**
     * Load patterns from disk
     */
    async loadPatterns() {
        try {
            const data = await fs.readFile(this.options.dataPath, 'utf8');
            const patterns = JSON.parse(data);
            
            patterns.forEach(pattern => {
                this.patterns.set(pattern.id, pattern);
            });
            
            console.log(`📂 Loaded ${this.patterns.size} error patterns from disk`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('📂 No existing error patterns file, starting fresh');
            } else {
                console.error('Failed to load error patterns:', error);
            }
        }
    }
    
    /**
     * Save patterns to disk
     */
    async savePatterns() {
        try {
            const patterns = Array.from(this.patterns.values());
            const dir = path.dirname(this.options.dataPath);
            
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.options.dataPath, JSON.stringify(patterns, null, 2));
            
            // console.log(`💾 Saved ${patterns.length} error patterns to disk`);
        } catch (error) {
            console.error('Failed to save error patterns:', error);
        }
    }
    
    /**
     * Get metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            patternsStored: this.patterns.size,
            pendingErrors: this.pendingErrors.size,
            hitRate: this.metrics.totalErrors > 0 
                ? (this.metrics.matchesFound / this.metrics.totalErrors * 100).toFixed(2) + '%'
                : '0%'
        };
    }
    
    /**
     * Generate unique ID
     */
    generateId() {
        return `error_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }
    
    /**
     * Clean up
     */
    close() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.savePatterns();
        console.log('🧠 ErrorPatternMemory: Closed and saved');
    }
}

// Singleton instance
let instance = null;

ErrorPatternMemory.getInstance = function(options = {}) {
    if (!instance) {
        instance = new ErrorPatternMemory(options);
    }
    return instance;
};

ErrorPatternMemory.reset = function() {
    if (instance) {
        instance.close();
    }
    instance = null;
};

module.exports = { ErrorPatternMemory };