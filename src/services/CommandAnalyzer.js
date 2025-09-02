const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

/**
 * CommandAnalyzer Service
 * Analyzes terminal commands and suggests appropriate agent collaborations
 * Part of the Agent Swarm Intelligence system
 * Integrates with existing sub-agent-manager and rules engine
 */
class CommandAnalyzer extends EventEmitter {
    constructor(options = {}) {
        super();
    
        this.options = {
            analysisThreshold: 0.7,
            maxSuggestions: 3,
            enableAutoSuggest: true,
            ...options
        };
    
        this.rulesPath = path.join(__dirname, '../../.coder1/agents/rules.json');
        this.subAgentManager = options.subAgentManager || null;
        this.rules = null;
        this.commandPatterns = new Map();
    
        this.initialize();
    }
  
    async initialize() {
        try {
            await this.loadRules();
            this.setupCommandPatterns();
      
            // Try to get sub-agent manager if not provided
            if (!this.subAgentManager) {
                try {
                    const SubAgentManager = require('./sub-agent-manager');
                    this.subAgentManager = new SubAgentManager();
                    await this.subAgentManager.initialize();
                } catch (error) {
                    console.warn('SubAgentManager not available, using fallback mode');
                }
            }
      
            this.emit('initialized', { rulesLoaded: !!this.rules });
        } catch (error) {
            console.error('❌ CommandAnalyzer initialization failed:', error);
            this.emit('error', error);
        }
    }
  
    async loadRules() {
        try {
            const rulesData = await fs.readFile(this.rulesPath, 'utf8');
            this.rules = JSON.parse(rulesData);
            console.log(`✅ Loaded agent collaboration rules v${this.rules.version}`);
        } catch (error) {
            console.warn('Could not load rules.json, using fallback patterns');
            this.rules = null;
        }
    }
  
    extractSpecialties(agentData) {
        const specialties = [];
    
        if (agentData.instructions) {
            const instructions = agentData.instructions.toLowerCase();
      
            if (instructions.includes('architecture') || instructions.includes('system design')) {
                specialties.push('architecture');
            }
            if (instructions.includes('frontend') || instructions.includes('ui') || instructions.includes('react')) {
                specialties.push('frontend');
            }
            if (instructions.includes('backend') || instructions.includes('api') || instructions.includes('database')) {
                specialties.push('backend');
            }
            if (instructions.includes('security') || instructions.includes('vulnerability')) {
                specialties.push('security');
            }
            if (instructions.includes('performance') || instructions.includes('optimization')) {
                specialties.push('performance');
            }
            if (instructions.includes('test') || instructions.includes('qa')) {
                specialties.push('testing');
            }
            if (instructions.includes('debug') || instructions.includes('error')) {
                specialties.push('debugging');
            }
            if (instructions.includes('refactor') || instructions.includes('code quality')) {
                specialties.push('refactoring');
            }
        }
    
        return specialties;
    }
  
    setupCommandPatterns() {
    // Use rules.json if available, otherwise fallback to basic patterns
        if (this.rules && this.rules.triggerConditions?.commandTriggers) {
            for (const [command, agents] of Object.entries(this.rules.triggerConditions.commandTriggers)) {
                const pattern = new RegExp(command.replace(/\s+/g, '\\s+'), 'i');
                this.commandPatterns.set(pattern, agents);
            }
        } else {
            // Fallback patterns
            this.commandPatterns.set(/npm (install|i|add)/, ['dependency-manager', 'security-auditor']);
            this.commandPatterns.set(/npm (test|run test)/, ['test-engineer', 'qa-testing']);
            this.commandPatterns.set(/npm run build/, ['optimizer', 'performance-optimizer']);
            this.commandPatterns.set(/git (commit|push|pull)/, ['commit-specialist', 'code-reviewer']);
            this.commandPatterns.set(/docker/, ['devops-engineer', 'cloud-architect']);
            this.commandPatterns.set(/deploy/, ['devops-engineer', 'cloud-architect', 'security-auditor']);
            this.commandPatterns.set(/debug|error|fix/, ['debugger', 'error-doctor']);
            this.commandPatterns.set(/refactor/, ['refactoring-expert', 'architect']);
            this.commandPatterns.set(/optimize|performance/, ['performance-optimizer', 'optimizer']);
            this.commandPatterns.set(/security|vulnerability/, ['security-auditor', 'security-analyst']);
            this.commandPatterns.set(/claude/, ['architect', 'implementer']);
        }
    }
  
    analyzeCommand(command) {
        const analysis = {
            command,
            timestamp: Date.now(),
            suggestedAgents: [],
            confidence: 0,
            reasoning: '',
            patterns: []
        };
    
        const commandLower = command.toLowerCase();
    
        for (const [pattern, agentTypes] of this.commandPatterns) {
            if (pattern.test(commandLower)) {
                analysis.patterns.push(pattern.source);
        
                for (const agentType of agentTypes) {
                    const matchingAgents = this.findAgentsBySpecialty(agentType);
                    analysis.suggestedAgents.push(...matchingAgents);
                }
            }
        }
    
        analysis.suggestedAgents = this.deduplicateAndRank(analysis.suggestedAgents);
        analysis.suggestedAgents = analysis.suggestedAgents.slice(0, this.options.maxSuggestions);
    
        if (analysis.suggestedAgents.length > 0) {
            analysis.confidence = Math.min(1, analysis.patterns.length * 0.3);
            analysis.reasoning = this.generateReasoning(command, analysis);
        }
    
        this.emit('analysis', analysis);
        return analysis;
    }
  
    findAgentsBySpecialty(specialty) {
        const matchingAgents = [];
    
        // Use sub-agent-manager if available
        if (this.subAgentManager && this.subAgentManager.researchPrompts) {
            const availableAgents = Object.keys(this.subAgentManager.researchPrompts);
      
            for (const agentId of availableAgents) {
                // Direct match or contains specialty
                if (agentId === specialty || agentId.includes(specialty)) {
                    matchingAgents.push({
                        id: agentId,
                        name: this.formatAgentName(agentId),
                        description: this.getAgentDescription(agentId),
                        color: this.getAgentColor(agentId),
                        relevance: 1.0
                    });
                }
            }
        }
    
        return matchingAgents;
    }
  
    formatAgentName(agentId) {
        return agentId
            .replace(/[@-]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
  
    getAgentDescription(agentId) {
        if (this.subAgentManager && this.subAgentManager.researchPrompts[agentId]) {
            // Extract first line of prompt as description
            const prompt = this.subAgentManager.researchPrompts[agentId];
            const lines = prompt.split('\n');
            return lines.find(line => line.includes('specialist') || line.includes('expert') || line.includes('engineer')) || 
             `${this.formatAgentName(agentId)} specialist`;
        }
        return `${this.formatAgentName(agentId)} specialist`;
    }
  
    getAgentColor(agentId) {
    // Map agent types to colors
        const colorMap = {
            'architect': 'orange',
            'frontend': 'blue',
            'backend': 'green',
            'security': 'red',
            'test': 'purple',
            'debug': 'yellow',
            'performance': 'cyan',
            'devops': 'gray'
        };
    
        for (const [type, color] of Object.entries(colorMap)) {
            if (agentId.includes(type)) {
                return color;
            }
        }
    
        return 'default';
    }
  
    deduplicateAndRank(agents) {
        const agentMap = new Map();
    
        for (const agent of agents) {
            if (!agentMap.has(agent.id)) {
                agentMap.set(agent.id, agent);
            } else {
                const existing = agentMap.get(agent.id);
                existing.relevance = Math.min(1, existing.relevance + 0.2);
            }
        }
    
        return Array.from(agentMap.values())
            .sort((a, b) => b.relevance - a.relevance);
    }
  
    generateReasoning(command, analysis) {
        const reasons = [];
    
        if (command.includes('npm')) {
            reasons.push('Package management detected');
        }
        if (command.includes('test')) {
            reasons.push('Testing operation identified');
        }
        if (command.includes('build')) {
            reasons.push('Build process initiated');
        }
        if (command.includes('git')) {
            reasons.push('Version control operation');
        }
        if (command.includes('error') || command.includes('fix')) {
            reasons.push('Error handling or debugging needed');
        }
        if (command.includes('claude')) {
            reasons.push('AI assistance requested');
        }
    
        return reasons.join(', ');
    }
  
    async suggestCollaboration(context) {
        const suggestions = {
            timestamp: Date.now(),
            context,
            recommendations: [],
            workflow: null
        };
    
        if (context.recentCommands && context.recentCommands.length > 0) {
            const analyses = context.recentCommands.map(cmd => this.analyzeCommand(cmd));
      
            const allAgents = new Map();
            for (const analysis of analyses) {
                for (const agent of analysis.suggestedAgents) {
                    if (!allAgents.has(agent.id)) {
                        allAgents.set(agent.id, agent);
                    }
                }
            }
      
            suggestions.recommendations = Array.from(allAgents.values());
      
            suggestions.workflow = this.generateWorkflow(context, suggestions.recommendations);
        }
    
        if (context.errors && context.errors.length > 0) {
            const errorSpecialists = this.findAgentsBySpecialty('debugging');
            suggestions.recommendations.push(...errorSpecialists);
        }
    
        this.emit('collaboration-suggested', suggestions);
        return suggestions;
    }
  
    generateWorkflow(context, agents) {
        const workflow = {
            name: 'Suggested Collaboration Workflow',
            steps: [],
            parallel: [],
            estimated_time: '5-10 minutes'
        };
    
        if (agents.some(a => a.id === 'architecture')) {
            workflow.steps.push({
                agent: 'architecture',
                action: 'Review system design and suggest improvements',
                order: 1
            });
        }
    
        const parallelAgents = agents.filter(a => 
            ['frontend', 'backend', 'test-engineer'].includes(a.id)
        );
    
        if (parallelAgents.length > 0) {
            workflow.parallel = parallelAgents.map(a => ({
                agent: a.id,
                action: `Analyze ${a.id} aspects`,
                concurrent: true
            }));
        }
    
        if (agents.some(a => a.id === 'security')) {
            workflow.steps.push({
                agent: 'security',
                action: 'Perform security audit',
                order: workflow.steps.length + 1
            });
        }
    
        return workflow;
    }
  
    async recordCommandExecution(command, result) {
        const record = {
            command,
            result,
            timestamp: Date.now(),
            analysis: this.analyzeCommand(command)
        };
    
        try {
            const historyPath = path.join(__dirname, '../../.coder1/memory/command-history.json');
            let history = [];
      
            try {
                const existing = await fs.readFile(historyPath, 'utf8');
                history = JSON.parse(existing);
            } catch (err) {
                // File doesn't exist yet
            }
      
            history.push(record);
      
            if (history.length > 1000) {
                history = history.slice(-1000);
            }
      
            await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
      
            this.emit('command-recorded', record);
        } catch (error) {
            console.error('Error recording command:', error);
        }
    }
  
    getAgentCapabilities(agentId) {
        if (this.subAgentManager && this.subAgentManager.researchPrompts[agentId]) {
            return {
                id: agentId,
                name: this.formatAgentName(agentId),
                description: this.getAgentDescription(agentId),
                prompt: this.subAgentManager.researchPrompts[agentId],
                model: 'claude-3-5-sonnet-20241022',
                color: this.getAgentColor(agentId)
            };
        }
    
        return null;
    }
  
    getAllAgents() {
        if (this.subAgentManager && this.subAgentManager.researchPrompts) {
            return Object.keys(this.subAgentManager.researchPrompts).map(agentId => ({
                id: agentId,
                name: this.formatAgentName(agentId),
                description: this.getAgentDescription(agentId),
                color: this.getAgentColor(agentId)
            }));
        }
    
        return [];
    }
  
    // New method to get preset teams from rules
    getPresetTeams() {
        if (this.rules && this.rules.presetTeams) {
            return this.rules.presetTeams;
        }
    
        // Fallback presets
        return {
            'frontend-trio': {
                agents: ['frontend-specialist', 'ui-ux-designer', 'accessibility-expert'],
                description: 'Complete frontend development team'
            },
            'backend-squad': {
                agents: ['backend-specialist', 'database-specialist', 'api-designer'],
                description: 'Full backend development team'
            },
            'full-stack': {
                agents: ['architect', 'frontend-specialist', 'backend-specialist'],
                description: 'Complete full-stack team'
            }
        };
    }
}

module.exports = CommandAnalyzer;