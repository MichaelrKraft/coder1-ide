/**
 * Singleton instance of ConversationOrchestrator
 * 
 * This ensures all parts of the application use the same orchestrator instance,
 * preventing session loss and maintaining state consistency across WebSocket,
 * REST API, and SafePTY manager.
 */

const ConversationOrchestrator = require('./conversation-orchestrator');

// Create single shared instance
const conversationOrchestrator = new ConversationOrchestrator();

console.log('🎭 [ORCHESTRATOR-SINGLETON] Created shared orchestrator instance');

module.exports = conversationOrchestrator;