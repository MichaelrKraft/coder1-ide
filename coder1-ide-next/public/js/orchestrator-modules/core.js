/**
 * Orchestrator Core Module
 * Contains core state management and business logic
 */

// Ensure global namespace exists
window.OrchestratorModules = window.OrchestratorModules || {};

class OrchestratorCore {
    constructor() {
        this.session = null;
        this.messages = [];
        this.isLoading = false;
        this.uploadedFiles = [];
        this.joinedAgents = new Set();
        this.streamingMessages = new Map();
        this.typingIndicators = new Set();
        
        // Phase configuration
        this.phases = [
            { key: 'discovery', label: 'Discovery', description: 'Orchestrator analyzes your requirements' },
            { key: 'team', label: 'Team Assembly', description: 'Describe your project in a few sentences.' },
            { key: 'collaboration', label: 'Collaboration', description: 'Experts discuss and ask questions' },
            { key: 'planning', label: 'Individual Planning', description: 'Each expert creates individual plans' },
            { key: 'synthesis', label: 'Plan Synthesis', description: 'Best ideas combined into final plan' }
        ];
        
        this.currentPhase = null;
    }

    /**
     * Add a message to the conversation
     */
    addMessage(message) {
        this.messages.push({
            ...message,
            timestamp: new Date().toISOString()
        });
        
        // Trigger message added event
        this.dispatchEvent('messageAdded', message);
        
        return message;
    }

    /**
     * Get conversation history
     */
    getMessages() {
        return [...this.messages];
    }

    /**
     * Clear conversation
     */
    clearMessages() {
        this.messages = [];
        this.streamingMessages.clear();
        this.typingIndicators.clear();
        this.dispatchEvent('messagesCleared');
    }

    /**
     * Update loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        this.dispatchEvent('loadingStateChanged', loading);
    }

    /**
     * Add uploaded file
     */
    addUploadedFile(file) {
        this.uploadedFiles.push(file);
        this.dispatchEvent('fileUploaded', file);
    }

    /**
     * Get uploaded files
     */
    getUploadedFiles() {
        return [...this.uploadedFiles];
    }

    /**
     * Clear uploaded files
     */
    clearUploadedFiles() {
        this.uploadedFiles = [];
        this.dispatchEvent('filesCleared');
    }

    /**
     * Set current phase
     */
    setPhase(phase) {
        this.currentPhase = phase;
        this.dispatchEvent('phaseChanged', phase);
    }

    /**
     * Get current phase
     */
    getPhase() {
        return this.currentPhase;
    }

    /**
     * Track agent joining
     */
    addJoinedAgent(agentId) {
        this.joinedAgents.add(agentId);
        this.dispatchEvent('agentJoined', agentId);
    }

    /**
     * Check if agent has joined
     */
    hasAgentJoined(agentId) {
        return this.joinedAgents.has(agentId);
    }

    /**
     * Start streaming message
     */
    startStreamingMessage(messageId, initialContent = '') {
        this.streamingMessages.set(messageId, {
            content: initialContent,
            startTime: Date.now()
        });
        this.dispatchEvent('streamingStarted', messageId);
    }

    /**
     * Update streaming message
     */
    updateStreamingMessage(messageId, content) {
        const message = this.streamingMessages.get(messageId);
        if (message) {
            message.content = content;
            this.dispatchEvent('streamingUpdated', { messageId, content });
        }
    }

    /**
     * End streaming message
     */
    endStreamingMessage(messageId) {
        const message = this.streamingMessages.get(messageId);
        if (message) {
            this.streamingMessages.delete(messageId);
            this.dispatchEvent('streamingEnded', messageId);
            return message.content;
        }
        return null;
    }

    /**
     * Add typing indicator
     */
    addTypingIndicator(agentId) {
        this.typingIndicators.add(agentId);
        this.dispatchEvent('typingStarted', agentId);
    }

    /**
     * Remove typing indicator
     */
    removeTypingIndicator(agentId) {
        this.typingIndicators.delete(agentId);
        this.dispatchEvent('typingEnded', agentId);
    }

    /**
     * Get session data
     */
    getSessionData() {
        return {
            session: this.session,
            messages: this.getMessages(),
            uploadedFiles: this.getUploadedFiles(),
            currentPhase: this.currentPhase,
            joinedAgents: Array.from(this.joinedAgents)
        };
    }

    /**
     * Reset state
     */
    reset() {
        this.session = null;
        this.messages = [];
        this.isLoading = false;
        this.uploadedFiles = [];
        this.joinedAgents.clear();
        this.streamingMessages.clear();
        this.typingIndicators.clear();
        this.currentPhase = null;
        
        this.dispatchEvent('stateReset');
    }

    /**
     * Event dispatcher
     */
    dispatchEvent(eventName, data = null) {
        const event = new CustomEvent(`orchestrator:${eventName}`, {
            detail: data
        });
        window.dispatchEvent(event);
    }
}

// Register module
window.OrchestratorModules.core = {
    OrchestratorCore
};

// Export for ES modules
export { OrchestratorCore };