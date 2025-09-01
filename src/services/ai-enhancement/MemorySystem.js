/**
 * Memory System - Persistent AI Intelligence
 * 
 * JSON-based persistent memory system that allows AI agents to remember
 * conversations, decisions, and learnings across sessions.
 * 
 * Core Philosophy: Simplicity = Magic
 * - Simple JSON files, profound intelligence gain
 * - Agents remember everything across restarts
 * - Learning and adaptation over time
 * - Cross-session context and continuity
 * - No native dependencies, pure JavaScript
 */

const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');

class MemorySystem extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.memoryDir = options.memoryDir || path.join(process.cwd(), '.coder1', 'memory');
        this.data = {
            conversations: [],
            agentInsights: [],
            projectKnowledge: [],
            codePatterns: [],
            userPreferences: [],
            taskOutcomes: []
        };
        
        // Rate limiting configuration
        this.rateLimits = new Map(); // Track last recording time for each pattern
        this.RATE_LIMIT_WINDOW = options.rateLimitWindow || 5000; // 5 seconds default
        this.MAX_USAGE_COUNT = options.maxUsageCount || 50; // Max usage count per insight
        
        // Deduplication tracking
        this.recentRecordings = new Map(); // Track recent recordings for dedup
        this.DEDUP_WINDOW = options.dedupWindow || 60000; // 1 minute window
        
        // Ensure directory exists
        this.ensureDirectoryExists();
        
        // Load existing data
        this.loadAllData();
        
        // Auto-save interval (every 30 seconds)
        this.autoSaveInterval = setInterval(() => {
            this.saveAllData();
        }, 30000);
        
        // Clean up rate limit tracking periodically
        this.cleanupInterval = setInterval(() => {
            this.cleanupRateLimits();
        }, 60000); // Every minute
        
        console.log(`🧠 Memory System: Initialized at ${this.memoryDir}`);
    }

    /**
     * Ensure memory directory exists
     */
    ensureDirectoryExists() {
        if (!fs.existsSync(this.memoryDir)) {
            fs.mkdirSync(this.memoryDir, { recursive: true });
        }
    }

    /**
     * Load all data from JSON files
     */
    loadAllData() {
        try {
            const files = {
                conversations: path.join(this.memoryDir, 'conversations.json'),
                agentInsights: path.join(this.memoryDir, 'agent-insights.json'),
                projectKnowledge: path.join(this.memoryDir, 'project-knowledge.json'),
                codePatterns: path.join(this.memoryDir, 'code-patterns.json'),
                userPreferences: path.join(this.memoryDir, 'user-preferences.json'),
                taskOutcomes: path.join(this.memoryDir, 'task-outcomes.json')
            };

            for (const [key, filePath] of Object.entries(files)) {
                if (fs.existsSync(filePath)) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        this.data[key] = JSON.parse(content);
                    } catch (error) {
                        console.warn(`Memory System: Failed to load ${key}:`, error.message);
                        this.data[key] = [];
                    }
                } else {
                    this.data[key] = [];
                }
            }

            const totalItems = Object.values(this.data).reduce((sum, arr) => sum + arr.length, 0);
            console.log(`✅ Memory System: Loaded ${totalItems} items from persistent storage`);
        } catch (error) {
            console.error('❌ Memory System: Failed to load data:', error);
            // Continue with empty data
        }
    }

    /**
     * Save all data to JSON files
     */
    saveAllData() {
        try {
            const files = {
                conversations: path.join(this.memoryDir, 'conversations.json'),
                agentInsights: path.join(this.memoryDir, 'agent-insights.json'),
                projectKnowledge: path.join(this.memoryDir, 'project-knowledge.json'),
                codePatterns: path.join(this.memoryDir, 'code-patterns.json'),
                userPreferences: path.join(this.memoryDir, 'user-preferences.json'),
                taskOutcomes: path.join(this.memoryDir, 'task-outcomes.json')
            };

            for (const [key, filePath] of Object.entries(files)) {
                const content = JSON.stringify(this.data[key], null, 2);
                fs.writeFileSync(filePath, content, 'utf8');
            }
        } catch (error) {
            console.error('Memory System: Failed to save data:', error);
        }
    }

    /**
     * Store conversation message
     */
    storeConversation(threadId, sessionId, role, content, agentType = null, metadata = {}) {
        try {
            const conversation = {
                id: this.generateId(),
                threadId,
                sessionId,
                role,
                content,
                agentType,
                timestamp: Date.now(),
                metadata
            };
            
            this.data.conversations.push(conversation);
            this.trimArray(this.data.conversations, 1000); // Keep last 1000 conversations
            
            return conversation.id;
        } catch (error) {
            console.error('Memory System: Failed to store conversation:', error);
            return null;
        }
    }

    /**
     * Get conversation history
     */
    getConversationHistory(threadId, limit = 50) {
        try {
            return this.data.conversations
                .filter(conv => conv.threadId === threadId)
                .sort((a, b) => a.timestamp - b.timestamp)
                .slice(-limit);
        } catch (error) {
            console.error('Memory System: Failed to get conversation history:', error);
            return [];
        }
    }

    /**
     * Store agent insight with rate limiting
     */
    storeAgentInsight(agentType, insightType, content, confidence = 0.5, metadata = {}) {
        try {
            const now = Date.now();
            const insightKey = `${agentType}:${insightType}:${content}`;
            
            // Check rate limiting
            const lastRecorded = this.rateLimits.get(insightKey);
            if (lastRecorded && (now - lastRecorded) < this.RATE_LIMIT_WINDOW) {
                // Too soon, skip this recording
                console.log(`⏳ Rate limited insight: ${insightType} (wait ${Math.ceil((this.RATE_LIMIT_WINDOW - (now - lastRecorded)) / 1000)}s)`);
                return null;
            }
            
            // Check if similar insight exists
            const existingIndex = this.data.agentInsights.findIndex(insight =>
                insight.agentType === agentType &&
                insight.insightType === insightType &&
                insight.content === content
            );
            
            if (existingIndex !== -1) {
                // Update existing insight
                const existing = this.data.agentInsights[existingIndex];
                
                // Check if usage count is too high
                if (existing.usageCount >= this.MAX_USAGE_COUNT) {
                    // Don't increment if already at max
                    console.log(`📊 Insight at max usage count (${this.MAX_USAGE_COUNT}): ${insightType}`);
                    existing.lastUsed = now;
                    existing.confidence = Math.max(existing.confidence, confidence);
                    this.rateLimits.set(insightKey, now);
                    return existing.id;
                }
                
                existing.usageCount = (existing.usageCount || 1) + 1;
                existing.lastUsed = now;
                existing.confidence = Math.max(existing.confidence, confidence);
                
                // Update rate limit tracking
                this.rateLimits.set(insightKey, now);
                
                return existing.id;
            } else {
                // Insert new insight
                const insight = {
                    id: this.generateId(),
                    agentType,
                    insightType,
                    content,
                    confidence,
                    usageCount: 1,
                    createdAt: now,
                    lastUsed: now,
                    metadata
                };
                
                this.data.agentInsights.push(insight);
                this.trimArray(this.data.agentInsights, 500); // Keep last 500 insights
                
                // Update rate limit tracking
                this.rateLimits.set(insightKey, now);
                
                return insight.id;
            }
        } catch (error) {
            console.error('Memory System: Failed to store agent insight:', error);
            return null;
        }
    }

    /**
     * Get agent insights
     */
    getAgentInsights(agentType, insightType = null, limit = 20) {
        try {
            let insights = this.data.agentInsights;
            
            if (agentType !== 'all') {
                insights = insights.filter(insight => insight.agentType === agentType);
            }
            
            if (insightType) {
                insights = insights.filter(insight => insight.insightType === insightType);
            }
            
            return insights
                .sort((a, b) => {
                    // Sort by confidence desc, then usage count desc, then last used desc
                    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
                    if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
                    return b.lastUsed - a.lastUsed;
                })
                .slice(0, limit);
        } catch (error) {
            console.error('Memory System: Failed to get agent insights:', error);
            return [];
        }
    }

    /**
     * Store project knowledge
     */
    storeProjectKnowledge(namespace, key, value, source = null, confidence = 0.5, metadata = {}) {
        try {
            const now = Date.now();
            
            // Find existing knowledge
            const existingIndex = this.data.projectKnowledge.findIndex(item =>
                item.namespace === namespace && item.key === key
            );
            
            if (existingIndex !== -1) {
                // Update existing
                const existing = this.data.projectKnowledge[existingIndex];
                existing.value = value;
                existing.source = source;
                existing.confidence = confidence;
                existing.updatedAt = now;
                existing.metadata = metadata;
            } else {
                // Insert new
                const knowledge = {
                    id: this.generateId(),
                    namespace,
                    key,
                    value,
                    source,
                    confidence,
                    createdAt: now,
                    updatedAt: now,
                    metadata
                };
                
                this.data.projectKnowledge.push(knowledge);
            }
            
            return true;
        } catch (error) {
            console.error('Memory System: Failed to store project knowledge:', error);
            return false;
        }
    }

    /**
     * Get project knowledge
     */
    getProjectKnowledge(namespace, key = null) {
        try {
            let knowledge = this.data.projectKnowledge.filter(item => item.namespace === namespace);
            
            if (key) {
                const item = knowledge.find(item => item.key === key);
                return item || null;
            } else {
                return knowledge.sort((a, b) => {
                    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
                    return b.updatedAt - a.updatedAt;
                });
            }
        } catch (error) {
            console.error('Memory System: Failed to get project knowledge:', error);
            return key ? null : [];
        }
    }

    /**
     * Store code pattern
     */
    storeCodePattern(patternType, patternName, patternData, fileExamples = [], successRate = 0.5) {
        try {
            const now = Date.now();
            
            // Check if pattern exists
            const existingIndex = this.data.codePatterns.findIndex(pattern =>
                pattern.patternType === patternType && pattern.patternName === patternName
            );
            
            if (existingIndex !== -1) {
                // Update existing pattern
                const existing = this.data.codePatterns[existingIndex];
                existing.usageCount = (existing.usageCount || 1) + 1;
                existing.lastUsed = now;
                existing.successRate = (existing.successRate + successRate) / 2;
                
                return existing.id;
            } else {
                // Insert new pattern
                const pattern = {
                    id: this.generateId(),
                    patternType,
                    patternName,
                    patternData,
                    fileExamples,
                    successRate,
                    usageCount: 1,
                    createdAt: now,
                    lastUsed: now
                };
                
                this.data.codePatterns.push(pattern);
                this.trimArray(this.data.codePatterns, 200); // Keep last 200 patterns
                
                return pattern.id;
            }
        } catch (error) {
            console.error('Memory System: Failed to store code pattern:', error);
            return null;
        }
    }

    /**
     * Get code patterns
     */
    getCodePatterns(patternType = null, limit = 20) {
        try {
            let patterns = this.data.codePatterns;
            
            if (patternType) {
                patterns = patterns.filter(pattern => pattern.patternType === patternType);
            }
            
            return patterns
                .sort((a, b) => {
                    if (a.successRate !== b.successRate) return b.successRate - a.successRate;
                    return b.usageCount - a.usageCount;
                })
                .slice(0, limit);
        } catch (error) {
            console.error('Memory System: Failed to get code patterns:', error);
            return [];
        }
    }

    /**
     * Store user preference
     */
    storeUserPreference(category, key, value, confidence = 0.5, learnedFrom = null) {
        try {
            const now = Date.now();
            
            // Find existing preference
            const existingIndex = this.data.userPreferences.findIndex(pref =>
                pref.category === category && pref.preferenceKey === key
            );
            
            if (existingIndex !== -1) {
                // Update existing
                const existing = this.data.userPreferences[existingIndex];
                existing.preferenceValue = value;
                existing.confidence = confidence;
                existing.learnedFrom = learnedFrom;
                existing.updatedAt = now;
            } else {
                // Insert new
                const preference = {
                    id: this.generateId(),
                    category,
                    preferenceKey: key,
                    preferenceValue: value,
                    confidence,
                    learnedFrom,
                    createdAt: now,
                    updatedAt: now
                };
                
                this.data.userPreferences.push(preference);
            }
            
            return true;
        } catch (error) {
            console.error('Memory System: Failed to store user preference:', error);
            return false;
        }
    }

    /**
     * Get user preferences
     */
    getUserPreferences(category = null) {
        try {
            let preferences = this.data.userPreferences;
            
            if (category) {
                preferences = preferences.filter(pref => pref.category === category);
            }
            
            return preferences.sort((a, b) => {
                if (a.confidence !== b.confidence) return b.confidence - a.confidence;
                return b.updatedAt - a.updatedAt;
            });
        } catch (error) {
            console.error('Memory System: Failed to get user preferences:', error);
            return [];
        }
    }

    /**
     * Store task outcome
     */
    storeTaskOutcome(taskDescription, agentType, outcome, successRating = null, timeTaken = null, approachUsed = null, filesModified = [], metadata = {}) {
        try {
            const taskOutcome = {
                id: this.generateId(),
                taskDescription,
                agentType,
                outcome,
                successRating,
                timeTaken,
                approachUsed,
                filesModified,
                createdAt: Date.now(),
                metadata
            };
            
            this.data.taskOutcomes.push(taskOutcome);
            this.trimArray(this.data.taskOutcomes, 300); // Keep last 300 outcomes
            
            return taskOutcome.id;
        } catch (error) {
            console.error('Memory System: Failed to store task outcome:', error);
            return null;
        }
    }

    /**
     * Get similar task outcomes
     */
    getSimilarTaskOutcomes(taskDescription, agentType = null, limit = 10) {
        try {
            const keywords = this.extractKeywords(taskDescription);
            
            let outcomes = this.data.taskOutcomes;
            
            if (agentType) {
                outcomes = outcomes.filter(outcome => outcome.agentType === agentType);
            }
            
            // Score outcomes by keyword matching
            const scored = outcomes.map(outcome => {
                let score = 0;
                
                // Exact match gets highest score
                if (outcome.taskDescription.toLowerCase().includes(taskDescription.toLowerCase())) {
                    score += 3;
                }
                
                // Keyword matches
                keywords.forEach(keyword => {
                    if (outcome.taskDescription.toLowerCase().includes(keyword) ||
                        outcome.outcome.toLowerCase().includes(keyword)) {
                        score += 1;
                    }
                });
                
                return { outcome, score };
            });
            
            return scored
                .filter(item => item.score > 0)
                .sort((a, b) => {
                    if (a.score !== b.score) return b.score - a.score;
                    if (a.outcome.successRating !== b.outcome.successRating) {
                        return (b.outcome.successRating || 0) - (a.outcome.successRating || 0);
                    }
                    return b.outcome.createdAt - a.outcome.createdAt;
                })
                .slice(0, limit)
                .map(item => item.outcome);
        } catch (error) {
            console.error('Memory System: Failed to get similar task outcomes:', error);
            return [];
        }
    }

    /**
     * Get memory statistics
     */
    getStats() {
        try {
            const stats = {
                conversations: this.data.conversations.length,
                insights: this.data.agentInsights.length,
                knowledge: this.data.projectKnowledge.length,
                patterns: this.data.codePatterns.length,
                preferences: this.data.userPreferences.length,
                outcomes: this.data.taskOutcomes.length,
                dbSize: this.getMemorySize(),
                lastActivity: this.getLastActivity()
            };
            
            return stats;
        } catch (error) {
            console.error('Memory System: Failed to get stats:', error);
            return {};
        }
    }

    /**
     * Get memory size in KB
     */
    getMemorySize() {
        try {
            let totalSize = 0;
            const files = fs.readdirSync(this.memoryDir);
            
            files.forEach(file => {
                try {
                    const filePath = path.join(this.memoryDir, file);
                    const stats = fs.statSync(filePath);
                    totalSize += stats.size;
                } catch (error) {
                    // Ignore individual file errors
                }
            });
            
            return Math.round(totalSize / 1024); // KB
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get last activity timestamp
     */
    getLastActivity() {
        try {
            let lastTimestamp = 0;
            
            this.data.conversations.forEach(conv => {
                if (conv.timestamp > lastTimestamp) {
                    lastTimestamp = conv.timestamp;
                }
            });
            
            return lastTimestamp || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Extract keywords from text
     */
    extractKeywords(text) {
        // Simple keyword extraction
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'were'].includes(word));
        
        return words.slice(0, 5); // Top 5 keywords
    }

    /**
     * Trim array to maximum size (keep most recent)
     */
    trimArray(array, maxSize) {
        if (array.length > maxSize) {
            array.splice(0, array.length - maxSize);
        }
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Cleanup old data
     */
    cleanup(maxAge = 7776000000) { // 90 days
        try {
            const cutoff = Date.now() - maxAge;
            let totalDeleted = 0;
            
            // Clean old conversations
            const conversationsBefore = this.data.conversations.length;
            this.data.conversations = this.data.conversations.filter(conv => conv.timestamp >= cutoff);
            const conversationsDeleted = conversationsBefore - this.data.conversations.length;
            
            // Clean low-confidence insights that haven't been used recently
            const insightsBefore = this.data.agentInsights.length;
            this.data.agentInsights = this.data.agentInsights.filter(insight =>
                insight.confidence >= 0.3 || insight.lastUsed >= cutoff || insight.usageCount >= 2
            );
            const insightsDeleted = insightsBefore - this.data.agentInsights.length;
            
            totalDeleted = conversationsDeleted + insightsDeleted;
            
            console.log(`🧹 Memory System: Cleaned ${conversationsDeleted} old conversations, ${insightsDeleted} low-confidence insights`);
            
            // Save after cleanup
            this.saveAllData();
            
            return { deletedConversations: conversationsDeleted, deletedInsights: insightsDeleted };
        } catch (error) {
            console.error('Memory System: Cleanup failed:', error);
            return null;
        }
    }

    /**
     * Clean up old rate limit entries
     */
    cleanupRateLimits() {
        const now = Date.now();
        const cutoff = now - (this.RATE_LIMIT_WINDOW * 2); // Clean up entries older than 2x the window
        
        for (const [key, timestamp] of this.rateLimits.entries()) {
            if (timestamp < cutoff) {
                this.rateLimits.delete(key);
            }
        }
    }
    
    /**
     * Close memory system
     */
    close() {
        // Save data before closing
        this.saveAllData();
        
        // Clear intervals
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        console.log('🧠 Memory System: Closed and data saved');
    }
}

// Singleton instance
let instance = null;

// Export singleton getter
MemorySystem.getInstance = function(options = {}) {
    if (!instance) {
        instance = new MemorySystem(options);
    }
    return instance;
};

// Clean up method for testing or shutdown
MemorySystem.reset = function() {
    if (instance && instance.autoSaveInterval) {
        clearInterval(instance.autoSaveInterval);
    }
    instance = null;
};

module.exports = { MemorySystem };