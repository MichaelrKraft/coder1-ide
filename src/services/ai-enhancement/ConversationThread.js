/**
 * Conversation Threading - Agent Memory System
 * 
 * Maintains conversation history between agents and users,
 * enabling coherent, building conversations instead of isolated interactions.
 * 
 * Core Philosophy: Simplicity = Magic
 * - Simple message array, profound impact
 * - Agents remember previous discussions
 * - Coherent conversations that build on themselves
 * - Feels like talking to actual teammates
 */

const { EventEmitter } = require('events');

class ConversationThread extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.threadId = options.threadId || this.generateThreadId();
        this.participants = new Set(options.participants || []);
        this.messages = [];
        this.context = options.context || {};
        this.metadata = {
            created: Date.now(),
            lastActivity: Date.now(),
            messageCount: 0,
            topic: options.topic || 'general'
        };
        
        // Configuration
        this.maxMessages = options.maxMessages || 100;
        this.contextWindow = options.contextWindow || 20; // Messages to include in API calls
        this.summarizeThreshold = options.summarizeThreshold || 50;
    }

    /**
     * Add message to conversation thread
     */
    addMessage(role, content, metadata = {}) {
        const message = {
            id: this.generateMessageId(),
            role, // 'user', 'agent', 'system'
            content,
            timestamp: Date.now(),
            threadId: this.threadId,
            metadata: {
                agentType: metadata.agentType,
                sessionId: metadata.sessionId,
                confidence: metadata.confidence,
                ...metadata
            }
        };
        
        this.messages.push(message);
        this.metadata.messageCount++;
        this.metadata.lastActivity = Date.now();
        
        // Add participant if new
        if (metadata.agentType) {
            this.participants.add(metadata.agentType);
        }
        
        // Trim messages if too long
        if (this.messages.length > this.maxMessages) {
            this.trimMessages();
        }
        
        // Auto-summarize if needed
        if (this.messages.length > this.summarizeThreshold) {
            this.scheduleAutoSummarize();
        }
        
        this.emit('messageAdded', message);
        
        return message;
    }

    /**
     * Get messages for Claude API call (with context window)
     */
    getMessagesForAPI(options = {}) {
        const limit = options.limit || this.contextWindow;
        const includeSystem = options.includeSystem !== false;
        
        let messages = this.messages.slice(-limit);
        
        // Filter out system messages if requested
        if (!includeSystem) {
            messages = messages.filter(msg => msg.role !== 'system');
        }
        
        // Format for Claude API
        return messages.map(msg => ({
            role: msg.role === 'agent' ? 'assistant' : msg.role,
            content: this.formatMessageContent(msg)
        }));
    }

    /**
     * Format message content with context
     */
    formatMessageContent(message) {
        let content = message.content;
        
        // Add agent type context for agent messages
        if (message.role === 'agent' && message.metadata.agentType) {
            content = `[${message.metadata.agentType.toUpperCase()} AGENT]: ${content}`;
        }
        
        // Add confidence indicators if available
        if (message.metadata.confidence && message.metadata.confidence < 0.8) {
            content += ' (Note: This response has moderate confidence)';
        }
        
        return content;
    }

    /**
     * Get conversation summary for context
     */
    getSummary() {
        if (this.messages.length === 0) {
            return 'No previous conversation';
        }
        
        const recentMessages = this.messages.slice(-5);
        const topics = this.extractTopics();
        const keyDecisions = this.extractKeyDecisions();
        
        return {
            messageCount: this.messages.length,
            participants: Array.from(this.participants),
            recentTopics: topics.slice(-3),
            keyDecisions: keyDecisions.slice(-3),
            lastActivity: this.metadata.lastActivity,
            conversationAge: Date.now() - this.metadata.created,
            preview: this.generatePreview(recentMessages)
        };
    }

    /**
     * Generate conversation preview
     */
    generatePreview(messages = null) {
        const msgs = messages || this.messages.slice(-3);
        
        return msgs.map(msg => {
            const role = msg.role === 'agent' ? 
                `${msg.metadata.agentType || 'AI'}` : 
                msg.role.toUpperCase();
            
            const preview = msg.content.length > 100 ? 
                msg.content.substring(0, 100) + '...' : 
                msg.content;
            
            return `${role}: ${preview}`;
        }).join('\n');
    }

    /**
     * Extract topics from conversation
     */
    extractTopics() {
        const topics = new Set();
        
        this.messages.forEach(msg => {
            const content = msg.content.toLowerCase();
            
            // Simple keyword extraction
            if (content.includes('authentication') || content.includes('auth')) {
                topics.add('authentication');
            }
            if (content.includes('database') || content.includes('db')) {
                topics.add('database');
            }
            if (content.includes('api') || content.includes('endpoint')) {
                topics.add('api');
            }
            if (content.includes('frontend') || content.includes('ui')) {
                topics.add('frontend');
            }
            if (content.includes('test') || content.includes('testing')) {
                topics.add('testing');
            }
            if (content.includes('security') || content.includes('secure')) {
                topics.add('security');
            }
            if (content.includes('performance') || content.includes('optimize')) {
                topics.add('performance');
            }
        });
        
        return Array.from(topics);
    }

    /**
     * Extract key decisions from conversation
     */
    extractKeyDecisions() {
        const decisions = [];
        
        this.messages.forEach(msg => {
            const content = msg.content;
            
            // Look for decision indicators
            if (content.includes('I recommend') || 
                content.includes('We should') || 
                content.includes('Let\'s use') ||
                content.includes('The solution is')) {
                
                decisions.push({
                    decision: content.substring(0, 200),
                    timestamp: msg.timestamp,
                    participant: msg.role === 'agent' ? msg.metadata.agentType : msg.role
                });
            }
        });
        
        return decisions;
    }

    /**
     * Build contextual prompt for next message
     */
    buildContextualPrompt(newPrompt, options = {}) {
        const summary = this.getSummary();
        const recentMessages = this.getMessagesForAPI({ limit: 5 });
        
        let contextualPrompt = '';
        
        // Add conversation context if there's history
        if (this.messages.length > 0) {
            contextualPrompt += '## Conversation Context\n';
            contextualPrompt += `Previous discussion involved: ${summary.participants.join(', ')}\n`;
            
            if (summary.recentTopics.length > 0) {
                contextualPrompt += `Recent topics: ${summary.recentTopics.join(', ')}\n`;
            }
            
            if (summary.keyDecisions.length > 0) {
                contextualPrompt += '\nKey decisions made:\n';
                summary.keyDecisions.forEach(decision => {
                    contextualPrompt += `- ${decision.decision.substring(0, 100)}...\n`;
                });
            }
            
            contextualPrompt += '\n## Recent Messages\n';
            contextualPrompt += summary.preview;
            contextualPrompt += '\n\n## Current Request\n';
        }
        
        contextualPrompt += newPrompt;
        
        return contextualPrompt;
    }

    /**
     * Check if topic was recently discussed
     */
    wasRecentlyDiscussed(topic, timeWindow = 300000) { // 5 minutes
        const cutoff = Date.now() - timeWindow;
        
        return this.messages.some(msg => 
            msg.timestamp > cutoff && 
            msg.content.toLowerCase().includes(topic.toLowerCase())
        );
    }

    /**
     * Find related previous conversations
     */
    findRelatedMessages(query, limit = 5) {
        const queryWords = query.toLowerCase().split(' ');
        
        const scored = this.messages.map(msg => {
            const content = msg.content.toLowerCase();
            let score = 0;
            
            queryWords.forEach(word => {
                if (content.includes(word)) {
                    score++;
                }
            });
            
            return { message: msg, score };
        });
        
        return scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => item.message);
    }

    /**
     * Get continuation context for agents
     */
    getContinuationContext() {
        if (this.messages.length === 0) {
            return null;
        }
        
        const lastMessage = this.messages[this.messages.length - 1];
        const summary = this.getSummary();
        
        return {
            lastMessage: {
                role: lastMessage.role,
                content: lastMessage.content.substring(0, 200),
                agentType: lastMessage.metadata.agentType,
                timestamp: lastMessage.timestamp
            },
            conversationFlow: summary.preview,
            activeTopics: summary.recentTopics,
            participants: summary.participants,
            shouldContinue: this.shouldContinueConversation()
        };
    }

    /**
     * Determine if conversation should continue
     */
    shouldContinueConversation() {
        if (this.messages.length === 0) return false;
        
        const lastMessage = this.messages[this.messages.length - 1];
        const timeSinceLastMessage = Date.now() - lastMessage.timestamp;
        
        // Continue if last message was recent and seems incomplete
        return timeSinceLastMessage < 300000 && // 5 minutes
               (lastMessage.content.includes('Let me') ||
                lastMessage.content.includes('I will') ||
                lastMessage.content.includes('Next, I'));
    }

    /**
     * Trim old messages to keep conversation manageable
     */
    trimMessages() {
        if (this.messages.length <= this.maxMessages) return;
        
        // Keep first few messages (conversation start)
        const keepStart = this.messages.slice(0, 5);
        
        // Keep recent messages
        const keepEnd = this.messages.slice(-Math.floor(this.maxMessages * 0.8));
        
        // Combine and add summary of removed messages
        this.messages = [
            ...keepStart,
            {
                id: this.generateMessageId(),
                role: 'system',
                content: `[Conversation summary: ${this.messages.length - keepStart.length - keepEnd.length} messages about ${this.extractTopics().join(', ')} were summarized]`,
                timestamp: Date.now(),
                threadId: this.threadId,
                metadata: { type: 'summary' }
            },
            ...keepEnd
        ];
    }

    /**
     * Schedule auto-summarization
     */
    scheduleAutoSummarize() {
        // Simplified - in production might use actual AI summarization
        this.trimMessages();
    }

    /**
     * Helper methods
     */
    generateThreadId() {
        return `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    generateMessageId() {
        return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Export conversation for persistence
     */
    export() {
        return {
            threadId: this.threadId,
            participants: Array.from(this.participants),
            messages: this.messages,
            context: this.context,
            metadata: this.metadata
        };
    }

    /**
     * Import conversation from persistence
     */
    static import(data) {
        const thread = new ConversationThread({
            threadId: data.threadId,
            participants: data.participants,
            context: data.context
        });
        
        thread.messages = data.messages || [];
        thread.metadata = data.metadata || thread.metadata;
        
        return thread;
    }
}

/**
 * Conversation Thread Manager
 * Manages multiple conversation threads
 */
class ConversationThreadManager extends EventEmitter {
    constructor() {
        super();
        this.threads = new Map();
        this.activeThreads = new Map(); // sessionId -> threadId mapping
    }

    /**
     * Get or create thread for session
     */
    getThreadForSession(sessionId, options = {}) {
        let threadId = this.activeThreads.get(sessionId);
        
        if (!threadId || !this.threads.has(threadId)) {
            // Create new thread
            const thread = new ConversationThread({
                topic: options.topic || 'session',
                participants: options.participants || ['user'],
                context: options.context || {}
            });
            
            threadId = thread.threadId;
            this.threads.set(threadId, thread);
            this.activeThreads.set(sessionId, threadId);
            
            this.emit('threadCreated', { sessionId, threadId, thread });
        }
        
        return this.threads.get(threadId);
    }

    /**
     * Add message to session thread
     */
    addMessageToSession(sessionId, role, content, metadata = {}) {
        const thread = this.getThreadForSession(sessionId);
        return thread.addMessage(role, content, { ...metadata, sessionId });
    }

    /**
     * Get contextual prompt for session
     */
    getContextualPromptForSession(sessionId, newPrompt, options = {}) {
        const thread = this.getThreadForSession(sessionId);
        return thread.buildContextualPrompt(newPrompt, options);
    }

    /**
     * Get thread summary
     */
    getThreadSummary(sessionId) {
        const threadId = this.activeThreads.get(sessionId);
        if (!threadId) return null;
        
        const thread = this.threads.get(threadId);
        return thread ? thread.getSummary() : null;
    }

    /**
     * Cleanup old threads
     */
    cleanup(maxAge = 3600000) { // 1 hour
        const cutoff = Date.now() - maxAge;
        
        for (const [threadId, thread] of this.threads) {
            if (thread.metadata.lastActivity < cutoff) {
                this.threads.delete(threadId);
                
                // Remove from active sessions
                for (const [sessionId, activeThreadId] of this.activeThreads) {
                    if (activeThreadId === threadId) {
                        this.activeThreads.delete(sessionId);
                    }
                }
            }
        }
    }
}

module.exports = { 
    ConversationThread, 
    ConversationThreadManager 
};