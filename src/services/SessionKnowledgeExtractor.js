const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Session Knowledge Extractor
 * Analyzes coding sessions to extract patterns, learnings, and insights
 * Part of the Living Documentation system
 */
class SessionKnowledgeExtractor extends EventEmitter {
    constructor(options = {}) {
        super();
    
        this.options = {
            extractionInterval: 5 * 60 * 1000, // 5 minutes
            minEventsForExtraction: 10,
            knowledgeCategories: [
                'patterns', 'errors', 'solutions', 'workflows', 
                'commands', 'dependencies', 'configurations'
            ],
            ...options
        };
    
        this.memoryDir = path.join(__dirname, '../../.coder1/memory');
        this.knowledgeBase = new Map();
        this.sessionEvents = [];
        this.extractionTimer = null;
    
        this.initialize();
    }
  
    async initialize() {
        try {
            await this.ensureDirectories();
            await this.loadExistingKnowledge();
            this.startExtractionCycle();
            this.emit('initialized', { categories: this.options.knowledgeCategories });
        } catch (error) {
            console.error('❌ SessionKnowledgeExtractor initialization failed:', error);
            this.emit('error', error);
        }
    }
  
    async ensureDirectories() {
        const dirs = [
            this.memoryDir,
            path.join(this.memoryDir, 'knowledge'),
            path.join(this.memoryDir, 'sessions')
        ];
    
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                // Directory already exists
            }
        }
    }
  
    async loadExistingKnowledge() {
        try {
            const knowledgePath = path.join(this.memoryDir, 'knowledge', 'base.json');
            const data = await fs.readFile(knowledgePath, 'utf8');
            const knowledge = JSON.parse(data);
      
            for (const [category, items] of Object.entries(knowledge)) {
                this.knowledgeBase.set(category, items);
            }
      
            console.log(`✅ Loaded ${this.knowledgeBase.size} knowledge categories`);
        } catch (error) {
            // No existing knowledge base
            this.initializeKnowledgeBase();
        }
    }
  
    initializeKnowledgeBase() {
        for (const category of this.options.knowledgeCategories) {
            this.knowledgeBase.set(category, []);
        }
    }
  
    startExtractionCycle() {
        this.extractionTimer = setInterval(() => {
            if (this.sessionEvents.length >= this.options.minEventsForExtraction) {
                this.extractKnowledge();
            }
        }, this.options.extractionInterval);
    }
  
    recordEvent(event) {
        const enrichedEvent = {
            ...event,
            timestamp: Date.now(),
            sessionId: this.getCurrentSessionId()
        };
    
        this.sessionEvents.push(enrichedEvent);
        this.emit('event-recorded', enrichedEvent);
    
        // Also update task outcomes if this is a task-related event
        if (event.type === 'task-completion' || event.type === 'task-creation') {
            this.updateTaskOutcomes(enrichedEvent);
        }
    
        if (this.sessionEvents.length >= this.options.minEventsForExtraction * 2) {
            this.extractKnowledge();
        }
    }
  
    async updateTaskOutcomes(event) {
        try {
            const outcomesPath = path.join(this.memoryDir, 'task-outcomes.json');
            let outcomes = [];
      
            try {
                const existingData = await fs.readFile(outcomesPath, 'utf8');
                outcomes = JSON.parse(existingData);
            } catch (error) {
                // File doesn't exist
            }
      
            if (event.type === 'task-completion') {
                const outcome = {
                    id: `task-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
                    type: 'completion',
                    task: event.task || 'Unknown task',
                    success: event.success !== false,
                    duration: event.duration || null,
                    agent: event.agent || 'human',
                    sessionId: event.sessionId,
                    timestamp: event.timestamp,
                    metadata: {
                        category: event.category || 'general',
                        difficulty: event.difficulty || 'medium',
                        tools: event.tools || [],
                        errors: event.errors || []
                    }
                };
        
                outcomes.push(outcome);
            }
      
            // Keep last 500 outcomes
            if (outcomes.length > 500) {
                outcomes = outcomes.slice(-500);
            }
      
            await fs.writeFile(outcomesPath, JSON.stringify(outcomes, null, 2));
      
        } catch (error) {
            console.error('Error updating task outcomes:', error);
        }
    }
  
    getCurrentSessionId() {
        if (!this.currentSessionId) {
            this.currentSessionId = crypto.randomBytes(8).toString('hex');
        }
        return this.currentSessionId;
    }
  
    async extractKnowledge() {
        if (this.sessionEvents.length === 0) return;
    
        const extraction = {
            sessionId: this.getCurrentSessionId(),
            timestamp: Date.now(),
            eventCount: this.sessionEvents.length,
            patterns: [],
            errors: [],
            solutions: [],
            workflows: [],
            commands: [],
            dependencies: [],
            configurations: []
        };
    
        // Extract patterns
        extraction.patterns = this.extractPatterns();
    
        // Extract errors and solutions
        const errorData = this.extractErrorsAndSolutions();
        extraction.errors = errorData.errors;
        extraction.solutions = errorData.solutions;
    
        // Extract workflows
        extraction.workflows = this.extractWorkflows();
    
        // Extract commands
        extraction.commands = this.extractCommands();
    
        // Extract dependencies
        extraction.dependencies = this.extractDependencies();
    
        // Extract configurations
        extraction.configurations = this.extractConfigurations();
    
        // Update knowledge base
        await this.updateKnowledgeBase(extraction);
    
        // Save session knowledge
        await this.saveSessionKnowledge(extraction);
    
        // Clear processed events
        this.sessionEvents = [];
    
        this.emit('knowledge-extracted', extraction);
        return extraction;
    }
  
    extractPatterns() {
        const patterns = [];
        const commandSequences = {};
    
        for (let i = 0; i < this.sessionEvents.length - 1; i++) {
            const current = this.sessionEvents[i];
            const next = this.sessionEvents[i + 1];
      
            if (current.type === 'command' && next.type === 'command') {
                const sequence = `${current.command} -> ${next.command}`;
                commandSequences[sequence] = (commandSequences[sequence] || 0) + 1;
            }
        }
    
        for (const [sequence, count] of Object.entries(commandSequences)) {
            if (count >= 2) {
                patterns.push({
                    type: 'command-sequence',
                    pattern: sequence,
                    frequency: count,
                    confidence: Math.min(1, count / 10)
                });
            }
        }
    
        const filePatterns = this.sessionEvents
            .filter(e => e.type === 'file-edit')
            .reduce((acc, e) => {
                const ext = path.extname(e.file);
                acc[ext] = (acc[ext] || 0) + 1;
                return acc;
            }, {});
    
        for (const [ext, count] of Object.entries(filePatterns)) {
            patterns.push({
                type: 'file-type-focus',
                pattern: `Frequently editing ${ext} files`,
                frequency: count,
                confidence: Math.min(1, count / 5)
            });
        }
    
        return patterns;
    }
  
    extractErrorsAndSolutions() {
        const errors = [];
        const solutions = [];
    
        for (let i = 0; i < this.sessionEvents.length; i++) {
            const event = this.sessionEvents[i];
      
            if (event.type === 'error') {
                const error = {
                    message: event.message,
                    stack: event.stack,
                    timestamp: event.timestamp,
                    context: event.context
                };
        
                // Look for solution in next events
                for (let j = i + 1; j < Math.min(i + 10, this.sessionEvents.length); j++) {
                    const nextEvent = this.sessionEvents[j];
          
                    if (nextEvent.type === 'fix' || nextEvent.type === 'solution') {
                        solutions.push({
                            error: error.message,
                            solution: nextEvent.solution || nextEvent.command,
                            confidence: 0.8,
                            timestamp: nextEvent.timestamp
                        });
                        break;
                    }
          
                    if (nextEvent.type === 'command' && nextEvent.success) {
                        solutions.push({
                            error: error.message,
                            solution: nextEvent.command,
                            confidence: 0.6,
                            timestamp: nextEvent.timestamp
                        });
                        break;
                    }
                }
        
                errors.push(error);
            }
        }
    
        return { errors, solutions };
    }
  
    extractWorkflows() {
        const workflows = [];
        const sessionSegments = this.segmentSession();
    
        for (const segment of sessionSegments) {
            if (segment.length >= 3) {
                const workflow = {
                    name: this.inferWorkflowName(segment),
                    steps: segment.map(e => ({
                        type: e.type,
                        action: e.command || e.action,
                        timestamp: e.timestamp
                    })),
                    duration: segment[segment.length - 1].timestamp - segment[0].timestamp,
                    frequency: 1
                };
        
                workflows.push(workflow);
            }
        }
    
        return workflows;
    }
  
    segmentSession() {
        const segments = [];
        let currentSegment = [];
        let lastTimestamp = 0;
    
        for (const event of this.sessionEvents) {
            if (event.timestamp - lastTimestamp > 5 * 60 * 1000) {
                if (currentSegment.length > 0) {
                    segments.push(currentSegment);
                    currentSegment = [];
                }
            }
      
            currentSegment.push(event);
            lastTimestamp = event.timestamp;
        }
    
        if (currentSegment.length > 0) {
            segments.push(currentSegment);
        }
    
        return segments;
    }
  
    inferWorkflowName(segment) {
        const commands = segment.filter(e => e.type === 'command').map(e => e.command);
    
        if (commands.some(c => c.includes('test'))) {
            return 'Testing Workflow';
        }
        if (commands.some(c => c.includes('build'))) {
            return 'Build Workflow';
        }
        if (commands.some(c => c.includes('git'))) {
            return 'Version Control Workflow';
        }
        if (commands.some(c => c.includes('npm install'))) {
            return 'Dependency Management Workflow';
        }
    
        return 'Development Workflow';
    }
  
    extractCommands() {
        const commandStats = {};
    
        this.sessionEvents
            .filter(e => e.type === 'command')
            .forEach(e => {
                const baseCommand = e.command.split(' ')[0];
                if (!commandStats[baseCommand]) {
                    commandStats[baseCommand] = {
                        command: baseCommand,
                        count: 0,
                        variations: new Set(),
                        success_rate: 0,
                        successes: 0
                    };
                }
        
                commandStats[baseCommand].count++;
                commandStats[baseCommand].variations.add(e.command);
        
                if (e.success) {
                    commandStats[baseCommand].successes++;
                }
            });
    
        return Object.values(commandStats).map(stat => ({
            ...stat,
            variations: Array.from(stat.variations),
            success_rate: stat.count > 0 ? stat.successes / stat.count : 0
        }));
    }
  
    extractDependencies() {
        const dependencies = new Set();
    
        this.sessionEvents.forEach(event => {
            if (event.type === 'command') {
                const npmInstallMatch = event.command.match(/npm (?:install|i|add) (.+)/);
                if (npmInstallMatch) {
                    dependencies.add(npmInstallMatch[1]);
                }
            }
      
            if (event.type === 'file-edit' && event.file.includes('package.json')) {
                // Could parse package.json changes here
            }
        });
    
        return Array.from(dependencies).map(dep => ({
            name: dep,
            timestamp: Date.now(),
            source: 'command'
        }));
    }
  
    extractConfigurations() {
        const configs = [];
    
        this.sessionEvents
            .filter(e => e.type === 'file-edit')
            .forEach(event => {
                if (event.file.match(/\.(json|yaml|yml|env|config\.\w+)$/)) {
                    configs.push({
                        file: event.file,
                        type: path.extname(event.file),
                        timestamp: event.timestamp,
                        action: event.action || 'modified'
                    });
                }
            });
    
        return configs;
    }
  
    async updateKnowledgeBase(extraction) {
        for (const [category, items] of Object.entries(extraction)) {
            if (this.knowledgeBase.has(category)) {
                const existing = this.knowledgeBase.get(category);
                const merged = this.mergeKnowledge(existing, items);
                this.knowledgeBase.set(category, merged);
            }
        }
    
        await this.saveKnowledgeBase();
    
        // Also update existing agent-insights.json system
        await this.updateAgentInsights(extraction);
    }
  
    async updateAgentInsights(extraction) {
        try {
            const insightsPath = path.join(this.memoryDir, 'agent-insights.json');
            let insights = [];
      
            try {
                const existingData = await fs.readFile(insightsPath, 'utf8');
                insights = JSON.parse(existingData);
            } catch (error) {
                // File doesn't exist or is invalid
            }
      
            // Add new insights from extraction
            if (extraction.patterns && extraction.patterns.length > 0) {
                const patternInsight = {
                    id: `${Date.now()}-pattern-${crypto.randomBytes(4).toString('hex')}`,
                    agentType: 'session-knowledge-extractor',
                    insightType: 'pattern-discovery',
                    content: `Discovered ${extraction.patterns.length} new coding patterns from recent session`,
                    confidence: Math.max(...extraction.patterns.map(p => p.confidence || 0.7)),
                    usageCount: 1,
                    createdAt: Date.now(),
                    lastUsed: Date.now(),
                    metadata: {
                        patterns: extraction.patterns.slice(0, 3), // Top 3 patterns
                        sessionId: extraction.sessionId,
                        category: 'learning'
                    }
                };
        
                insights.push(patternInsight);
            }
      
            if (extraction.solutions && extraction.solutions.length > 0) {
                const solutionInsight = {
                    id: `${Date.now()}-solution-${crypto.randomBytes(4).toString('hex')}`,
                    agentType: 'session-knowledge-extractor',
                    insightType: 'solution-discovery',
                    content: `Found ${extraction.solutions.length} effective error solutions`,
                    confidence: 0.8,
                    usageCount: 1,
                    createdAt: Date.now(),
                    lastUsed: Date.now(),
                    metadata: {
                        solutions: extraction.solutions.slice(0, 2), // Top 2 solutions
                        sessionId: extraction.sessionId,
                        category: 'problem-solving'
                    }
                };
        
                insights.push(solutionInsight);
            }
      
            // Keep only the most recent 100 insights
            if (insights.length > 100) {
                insights = insights.sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
            }
      
            await fs.writeFile(insightsPath, JSON.stringify(insights, null, 2));
            this.emit('insights-updated', { count: insights.length });
      
        } catch (error) {
            console.error('Error updating agent insights:', error);
        }
    }
  
    mergeKnowledge(existing, newItems) {
        if (!Array.isArray(newItems)) return existing;
    
        const merged = [...existing];
    
        for (const item of newItems) {
            const similarIndex = merged.findIndex(e => 
                this.calculateSimilarity(e, item) > 0.8
            );
      
            if (similarIndex >= 0) {
                // Update frequency or confidence
                if (merged[similarIndex].frequency !== undefined) {
                    merged[similarIndex].frequency++;
                }
                if (merged[similarIndex].confidence !== undefined) {
                    merged[similarIndex].confidence = Math.min(1, 
                        merged[similarIndex].confidence + 0.1
                    );
                }
            } else {
                merged.push(item);
            }
        }
    
        // Keep only the most relevant items
        return merged
            .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
            .slice(0, 100);
    }
  
    calculateSimilarity(item1, item2) {
        const str1 = JSON.stringify(item1).toLowerCase();
        const str2 = JSON.stringify(item2).toLowerCase();
    
        if (str1 === str2) return 1;
    
        const words1 = str1.split(/\W+/);
        const words2 = str2.split(/\W+/);
        const intersection = words1.filter(w => words2.includes(w));
    
        return intersection.length / Math.max(words1.length, words2.length);
    }
  
    async saveKnowledgeBase() {
        const knowledgePath = path.join(this.memoryDir, 'knowledge', 'base.json');
        const data = Object.fromEntries(this.knowledgeBase);
    
        await fs.writeFile(knowledgePath, JSON.stringify(data, null, 2));
        this.emit('knowledge-saved', { categories: Object.keys(data) });
    }
  
    async saveSessionKnowledge(extraction) {
        const sessionPath = path.join(
            this.memoryDir, 
            'sessions', 
            `${extraction.sessionId}.json`
        );
    
        await fs.writeFile(sessionPath, JSON.stringify(extraction, null, 2));
    }
  
    async queryKnowledge(query) {
        const results = {
            query,
            timestamp: Date.now(),
            matches: []
        };
    
        const queryLower = query.toLowerCase();
    
        for (const [category, items] of this.knowledgeBase) {
            for (const item of items) {
                const itemStr = JSON.stringify(item).toLowerCase();
                if (itemStr.includes(queryLower)) {
                    results.matches.push({
                        category,
                        item,
                        relevance: this.calculateRelevance(queryLower, itemStr)
                    });
                }
            }
        }
    
        results.matches.sort((a, b) => b.relevance - a.relevance);
        results.matches = results.matches.slice(0, 10);
    
        this.emit('knowledge-queried', results);
        return results;
    }
  
    calculateRelevance(query, text) {
        const queryWords = query.split(/\W+/);
        let relevance = 0;
    
        for (const word of queryWords) {
            if (text.includes(word)) {
                relevance += 1 / queryWords.length;
            }
        }
    
        return relevance;
    }
  
    async generateInsights() {
        const insights = {
            timestamp: Date.now(),
            patterns: [],
            recommendations: [],
            statistics: {}
        };
    
        // Analyze patterns
        const patterns = this.knowledgeBase.get('patterns') || [];
        insights.patterns = patterns
            .filter(p => p.confidence > 0.7)
            .slice(0, 5);
    
        // Generate recommendations
        const errors = this.knowledgeBase.get('errors') || [];
        const solutions = this.knowledgeBase.get('solutions') || [];
    
        if (errors.length > 5) {
            insights.recommendations.push({
                type: 'error-prevention',
                message: 'Consider adding more error handling',
                priority: 'high'
            });
        }
    
        const commands = this.knowledgeBase.get('commands') || [];
        const failingCommands = commands.filter(c => c.success_rate < 0.5);
    
        if (failingCommands.length > 0) {
            insights.recommendations.push({
                type: 'command-improvement',
                message: `Commands with low success rate: ${failingCommands.map(c => c.command).join(', ')}`,
                priority: 'medium'
            });
        }
    
        // Calculate statistics
        insights.statistics = {
            total_events: this.sessionEvents.length,
            knowledge_categories: this.knowledgeBase.size,
            total_patterns: patterns.length,
            total_solutions: solutions.length,
            total_errors: errors.length
        };
    
        this.emit('insights-generated', insights);
        return insights;
    }
  
    destroy() {
        if (this.extractionTimer) {
            clearInterval(this.extractionTimer);
        }
        this.removeAllListeners();
    }
}

module.exports = SessionKnowledgeExtractor;