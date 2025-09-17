// Stub module to fix missing dependency
class SubAgentManager {
    constructor() {
        this.agents = new Map();
    }
    
    async initialize() {
        console.log('SubAgentManager: Initialized (stub)');
        return true;
    }
    
    async delegateTask(agentName, task) {
        console.log(`SubAgentManager: Delegating to ${agentName}`);
        return { success: true, message: 'Task delegated (stub)' };
    }
    
    async getAgentStatus(agentName) {
        return { available: false, reason: 'Stub implementation' };
    }
}

module.exports = SubAgentManager;