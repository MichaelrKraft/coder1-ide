/**
 * Session Sharing Service
 * 
 * Enables users to package and share coding sessions with other agents
 * via slash commands like /share-session "authentication-implementation"
 * 
 * Creates labeled session packages in forOtherAgents/ directory that
 * agents can reference for learning and context
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class SessionSharingService extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.memoryDir = options.memoryDir || path.join(process.cwd(), '.coder1', 'memory');
        this.sharedSessionsDir = path.join(process.cwd(), '.coder1', 'forOtherAgents');
        
        // Ensure forOtherAgents directory exists
        this.initializeSharedDirectory().catch(console.error);
        
        console.log('📤 Session Sharing Service initialized');
    }

    /**
     * Initialize the forOtherAgents directory structure
     */
    async initializeSharedDirectory() {
        try {
            await fs.mkdir(this.sharedSessionsDir, { recursive: true });
            await fs.mkdir(path.join(this.sharedSessionsDir, 'sessions'), { recursive: true });
            await fs.mkdir(path.join(this.sharedSessionsDir, 'patterns'), { recursive: true });
            await fs.mkdir(path.join(this.sharedSessionsDir, 'solutions'), { recursive: true });
            
            // Create index file if it doesn't exist
            const indexFile = path.join(this.sharedSessionsDir, 'index.json');
            try {
                await fs.access(indexFile);
            } catch {
                await fs.writeFile(indexFile, JSON.stringify({
                    version: '1.0.0',
                    lastUpdated: null,
                    totalItems: 0,
                    categories: {
                        sessions: {
                            count: 0,
                            lastAdded: null,
                            items: []
                        },
                        patterns: {
                            count: 0,
                            lastAdded: null,
                            items: []
                        },
                        solutions: {
                            count: 0,
                            lastAdded: null,
                            items: []
                        }
                    },
                    sessions: {},
                    patterns: {},
                    solutions: {},
                    tags: {},
                    agentTypes: {},
                    searchIndex: {
                        byLabel: {},
                        byTag: {},
                        byAgentType: {},
                        byTimestamp: []
                    }
                }, null, 2));
            }
        } catch (error) {
            console.error('Error initializing shared directory:', error);
        }
    }

    /**
     * Handle slash command: /share-session "label" [tags]
     */
    async handleShareSessionCommand(commandText, currentSessionData = null) {
        try {
            // Parse command: /share-session "authentication-setup" frontend backend
            const match = commandText.match(/\/share-session\s+"([^"]+)"\s*(.*)/);
            if (!match) {
                return {
                    success: false,
                    message: 'Usage: /share-session "label" [tags...]\nExample: /share-session "authentication-setup" frontend backend api'
                };
            }

            const label = match[1].trim();
            const tags = match[2] ? match[2].split(/\s+/).filter(t => t) : [];

            // Get current session data if not provided
            if (!currentSessionData) {
                currentSessionData = await this.getCurrentSessionData();
            }

            // Create shareable session package
            const sharedSession = await this.createShareableSession(label, tags, currentSessionData);
            
            // Save to forOtherAgents directory
            const saved = await this.saveSharedSession(sharedSession);

            this.emit('sessionShared', sharedSession);

            return {
                success: true,
                message: `✅ Session shared as "${label}"\n📁 Location: .coder1/forOtherAgents/sessions/${saved.filename}\n🏷️ Tags: ${tags.join(', ') || 'none'}\n📊 ${saved.agentCount} agents, ${saved.taskCount} tasks`,
                sharedSession: saved
            };

        } catch (error) {
            console.error('Error handling share session command:', error);
            return {
                success: false,
                message: `❌ Failed to share session: ${error.message}`
            };
        }
    }

    /**
     * Handle slash command: /share-pattern "label" [description]
     */
    async handleSharePatternCommand(commandText, patternData = null) {
        try {
            const match = commandText.match(/\/share-pattern\s+"([^"]+)"\s*(.*)/);
            if (!match) {
                return {
                    success: false,
                    message: 'Usage: /share-pattern "label" [description]\nExample: /share-pattern "jwt-auth-pattern" "Secure JWT implementation with refresh tokens"'
                };
            }

            const label = match[1].trim();
            const description = match[2].trim() || '';

            // Get current code pattern if not provided
            if (!patternData) {
                patternData = await this.extractCurrentPattern();
            }

            const sharedPattern = await this.createShareablePattern(label, description, patternData);
            const saved = await this.saveSharedPattern(sharedPattern);

            return {
                success: true,
                message: `✅ Pattern shared as "${label}"\n📁 Location: .coder1/forOtherAgents/patterns/${saved.filename}\n📝 ${description || 'No description'}\n📄 ${saved.fileCount} files included`,
                sharedPattern: saved
            };

        } catch (error) {
            console.error('Error handling share pattern command:', error);
            return {
                success: false,
                message: `❌ Failed to share pattern: ${error.message}`
            };
        }
    }

    /**
     * Handle slash command: /share-solution "label" [problem-description]
     */
    async handleShareSolutionCommand(commandText, solutionData = null) {
        try {
            const match = commandText.match(/\/share-solution\s+"([^"]+)"\s*(.*)/);
            if (!match) {
                return {
                    success: false,
                    message: 'Usage: /share-solution "label" [problem-description]\nExample: /share-solution "cors-fix" "Fixed CORS issues in production deployment"'
                };
            }

            const label = match[1].trim();
            const problemDescription = match[2].trim() || '';

            if (!solutionData) {
                solutionData = await this.extractCurrentSolution();
            }

            const sharedSolution = await this.createShareableSolution(label, problemDescription, solutionData);
            const saved = await this.saveSharedSolution(sharedSolution);

            return {
                success: true,
                message: `✅ Solution shared as "${label}"\n📁 Location: .coder1/forOtherAgents/solutions/${saved.filename}\n🔧 ${problemDescription || 'No description'}\n⚡ Solution ready for reuse`,
                sharedSolution: saved
            };

        } catch (error) {
            console.error('Error handling share solution command:', error);
            return {
                success: false,
                message: `❌ Failed to share solution: ${error.message}`
            };
        }
    }

    /**
     * Create a shareable session package
     */
    async createShareableSession(label, tags, sessionData) {
        const timestamp = Date.now();
        const sessionId = `shared-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;

        return {
            id: sessionId,
            label,
            tags,
            type: 'session',
            created: timestamp,
            originalSessionId: sessionData.id,
            
            // Session metadata
            metadata: {
                duration: sessionData.duration,
                totalAgents: sessionData.totalAgents,
                tasksCompleted: sessionData.tasksCompleted,
                projectState: sessionData.projectState,
                summary: sessionData.summary
            },

            // Agent work summaries
            agents: this.sanitizeAgentDataForSharing(sessionData.agents),

            // Key learnings
            keyLearnings: this.extractKeyLearnings(sessionData),

            // Reusable patterns
            patterns: this.extractReusablePatterns(sessionData),

            // Problem-solution pairs
            solutions: this.extractSolutions(sessionData),

            // Usage context
            usageContext: {
                whenToUse: this.generateWhenToUseGuidance(sessionData, tags),
                applicableScenarios: this.generateApplicableScenarios(sessionData, tags),
                prerequisites: this.extractPrerequisites(sessionData),
                estimatedTime: this.estimateImplementationTime(sessionData)
            },

            // For agents to reference
            agentGuidance: {
                suggestedApproach: this.generateSuggestedApproach(sessionData),
                commonPitfalls: this.extractCommonPitfalls(sessionData),
                successMetrics: this.extractSuccessMetrics(sessionData),
                followUpTasks: this.generateFollowUpTasks(sessionData)
            }
        };
    }

    /**
     * Create a shareable code pattern
     */
    async createShareablePattern(label, description, patternData) {
        const timestamp = Date.now();
        const patternId = `pattern-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;

        return {
            id: patternId,
            label,
            description,
            type: 'pattern',
            created: timestamp,

            // Pattern definition
            pattern: {
                name: label,
                category: this.categorizePattern(patternData),
                files: patternData.files || [],
                codeSnippets: patternData.codeSnippets || [],
                dependencies: patternData.dependencies || []
            },

            // Usage guidance
            usage: {
                whenToUse: description,
                howToImplement: this.generateImplementationSteps(patternData),
                variations: this.extractPatternVariations(patternData),
                antipatterns: this.identifyAntipatterns(patternData)
            },

            // For agents
            agentInstructions: {
                implementationApproach: this.generatePatternImplementationApproach(patternData),
                testingStrategy: this.generatePatternTestingStrategy(patternData),
                commonMistakes: this.identifyPatternMistakes(patternData)
            }
        };
    }

    /**
     * Create a shareable solution
     */
    async createShareableSolution(label, problemDescription, solutionData) {
        const timestamp = Date.now();
        const solutionId = `solution-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;

        return {
            id: solutionId,
            label,
            type: 'solution',
            created: timestamp,

            // Problem definition
            problem: {
                description: problemDescription,
                symptoms: solutionData.symptoms || [],
                context: solutionData.context || {},
                errorMessages: solutionData.errorMessages || []
            },

            // Solution details
            solution: {
                steps: solutionData.steps || [],
                codeChanges: solutionData.codeChanges || [],
                configChanges: solutionData.configChanges || [],
                reasoning: solutionData.reasoning || ''
            },

            // Validation
            validation: {
                howToTest: solutionData.testingSteps || [],
                expectedResults: solutionData.expectedResults || [],
                successMetrics: solutionData.successMetrics || []
            },

            // For agents
            agentGuidance: {
                diagnosticApproach: this.generateDiagnosticApproach(solutionData),
                implementationOrder: this.generateImplementationOrder(solutionData),
                troubleshooting: this.generateTroubleshootingGuide(solutionData)
            }
        };
    }

    /**
     * Save shared session to forOtherAgents directory
     */
    async saveSharedSession(sharedSession) {
        try {
            const filename = `${sharedSession.label.replace(/[^a-zA-Z0-9-_]/g, '-')}-${Date.now()}.json`;
            const filePath = path.join(this.sharedSessionsDir, 'sessions', filename);

            await fs.writeFile(filePath, JSON.stringify(sharedSession, null, 2));

            // Update index
            await this.updateIndex('sessions', sharedSession, filename);

            console.log(`📤 Shared session saved: ${filename}`);

            return {
                filename,
                path: filePath,
                agentCount: sharedSession.metadata.totalAgents,
                taskCount: sharedSession.metadata.tasksCompleted
            };
        } catch (error) {
            console.error('Error saving shared session:', error);
            throw error;
        }
    }

    /**
     * Save shared pattern
     */
    async saveSharedPattern(sharedPattern) {
        try {
            const filename = `${sharedPattern.label.replace(/[^a-zA-Z0-9-_]/g, '-')}-${Date.now()}.json`;
            const filePath = path.join(this.sharedSessionsDir, 'patterns', filename);

            await fs.writeFile(filePath, JSON.stringify(sharedPattern, null, 2));
            await this.updateIndex('patterns', sharedPattern, filename);

            return {
                filename,
                path: filePath,
                fileCount: sharedPattern.pattern.files.length
            };
        } catch (error) {
            console.error('Error saving shared pattern:', error);
            throw error;
        }
    }

    /**
     * Save shared solution
     */
    async saveSharedSolution(sharedSolution) {
        try {
            const filename = `${sharedSolution.label.replace(/[^a-zA-Z0-9-_]/g, '-')}-${Date.now()}.json`;
            const filePath = path.join(this.sharedSessionsDir, 'solutions', filename);

            await fs.writeFile(filePath, JSON.stringify(sharedSolution, null, 2));
            await this.updateIndex('solutions', sharedSolution, filename);

            return {
                filename,
                path: filePath
            };
        } catch (error) {
            console.error('Error saving shared solution:', error);
            throw error;
        }
    }

    /**
     * Update the index file
     */
    async updateIndex(type, item, filename) {
        try {
            const indexFile = path.join(this.sharedSessionsDir, 'index.json');
            const index = JSON.parse(await fs.readFile(indexFile, 'utf8'));

            // Ensure the type property exists
            if (!index[type]) {
                index[type] = {};
            }

            // Ensure tags property exists
            if (!index.tags) {
                index.tags = {};
            }

            index[type][item.id] = {
                label: item.label,
                filename,
                created: item.created,
                tags: item.tags || [],
                type: item.type,
                description: item.description || item.metadata?.summary || ''
            };

            // Update tags index
            if (item.tags) {
                for (const tag of item.tags) {
                    if (!index.tags[tag]) index.tags[tag] = [];
                    index.tags[tag].push(item.id);
                }
            }

            // Update categories if they exist
            if (index.categories && index.categories[type]) {
                index.categories[type].count = Object.keys(index[type]).length;
                index.categories[type].lastAdded = Date.now();
            }

            index.lastUpdated = Date.now();
            index.totalItems = Object.keys(index.sessions || {}).length + 
                              Object.keys(index.patterns || {}).length + 
                              Object.keys(index.solutions || {}).length;

            await fs.writeFile(indexFile, JSON.stringify(index, null, 2));
        } catch (error) {
            console.error('Error updating index:', error);
        }
    }

    /**
     * Get list of shared sessions for agents to browse
     */
    async getSharedSessions(tags = [], type = null) {
        try {
            const indexFile = path.join(this.sharedSessionsDir, 'index.json');
            const index = JSON.parse(await fs.readFile(indexFile, 'utf8'));

            let items = [];

            // Collect items based on type filter
            if ((type === 'sessions' || !type) && index.sessions) {
                items.push(...Object.entries(index.sessions).map(([id, data]) => ({...data, id, type: 'sessions'})));
            }
            if ((type === 'patterns' || !type) && index.patterns) {
                items.push(...Object.entries(index.patterns).map(([id, data]) => ({...data, id, type: 'patterns'})));
            }
            if ((type === 'solutions' || !type) && index.solutions) {
                items.push(...Object.entries(index.solutions).map(([id, data]) => ({...data, id, type: 'solutions'})));
            }

            // Filter by tags if provided
            if (tags.length > 0) {
                items = items.filter(item => 
                    item.tags && item.tags.some(tag => tags.includes(tag))
                );
            }

            // Sort by creation date, newest first
            items.sort((a, b) => b.created - a.created);

            return items;
        } catch (error) {
            console.error('Error getting shared sessions:', error);
            return [];
        }
    }

    /**
     * Load a specific shared item for agent reference
     */
    async loadSharedItem(itemId, type = 'sessions') {
        try {
            const indexFile = path.join(this.sharedSessionsDir, 'index.json');
            const index = JSON.parse(await fs.readFile(indexFile, 'utf8'));

            const itemInfo = index[type][itemId];
            if (!itemInfo) {
                throw new Error(`Shared item ${itemId} not found`);
            }

            const itemPath = path.join(this.sharedSessionsDir, type, itemInfo.filename);
            const content = await fs.readFile(itemPath, 'utf8');
            
            return JSON.parse(content);
        } catch (error) {
            console.error(`Error loading shared item ${itemId}:`, error);
            return null;
        }
    }

    // Helper methods for data extraction and processing

    sanitizeAgentDataForSharing(agents) {
        const sanitized = {};
        for (const [agentId, agentData] of Object.entries(agents)) {
            sanitized[agentId] = {
                workCompleted: agentData.workCompleted,
                currentState: agentData.currentState,
                nextSteps: agentData.nextSteps,
                approach: agentData.approach || 'not specified',
                keyDecisions: agentData.keyDecisions || [],
                lessonsLearned: agentData.lessonsLearned || []
            };
        }
        return sanitized;
    }

    extractKeyLearnings(sessionData) {
        const learnings = [];
        for (const [agentId, agentData] of Object.entries(sessionData.agents)) {
            if (agentData.lessonsLearned) {
                learnings.push(...agentData.lessonsLearned.map(lesson => ({
                    agent: agentId,
                    learning: lesson
                })));
            }
        }
        return learnings;
    }

    extractReusablePatterns(sessionData) {
        // Extract patterns based on agent work
        const patterns = [];
        for (const [agentId, agentData] of Object.entries(sessionData.agents)) {
            if (agentData.patterns) {
                patterns.push(...agentData.patterns.map(pattern => ({
                    agent: agentId,
                    pattern: pattern
                })));
            }
        }
        return patterns;
    }

    generateWhenToUseGuidance(sessionData, tags) {
        const contexts = [];
        if (tags.includes('authentication')) contexts.push('When implementing user authentication');
        if (tags.includes('api')) contexts.push('When building REST APIs');
        if (tags.includes('frontend')) contexts.push('When creating user interfaces');
        if (tags.includes('database')) contexts.push('When setting up data persistence');
        return contexts.length > 0 ? contexts : ['When working on similar development tasks'];
    }

    generateSuggestedApproach(sessionData) {
        const steps = [];
        const agentOrder = Object.keys(sessionData.agents);
        
        if (agentOrder.includes('architect')) {
            steps.push('Start with architectural planning');
        }
        if (agentOrder.includes('backend-specialist')) {
            steps.push('Implement backend services and APIs');
        }
        if (agentOrder.includes('frontend-specialist')) {
            steps.push('Create user interface components');
        }
        
        return steps.length > 0 ? steps : ['Follow the agent work order from this session'];
    }

    async getCurrentSessionData() {
        // This would integrate with your session memory system
        // For now, return a minimal structure
        return {
            id: `session-${Date.now()}`,
            duration: 0,
            totalAgents: 0,
            tasksCompleted: 0,
            agents: {},
            summary: 'Current session data'
        };
    }

    async extractCurrentPattern() {
        // Extract current code patterns from workspace
        return {
            files: [],
            codeSnippets: [],
            dependencies: []
        };
    }

    async extractCurrentSolution() {
        // Extract current solution from recent work
        return {
            steps: [],
            codeChanges: [],
            reasoning: 'Solution extracted from current work'
        };
    }

    // Additional helper methods would be implemented here...
    categorizePattern(patternData) { return 'general'; }
    generateImplementationSteps(patternData) { return []; }
    extractPatternVariations(patternData) { return []; }
    identifyAntipatterns(patternData) { return []; }
    generatePatternImplementationApproach(patternData) { return ''; }
    generatePatternTestingStrategy(patternData) { return ''; }
    identifyPatternMistakes(patternData) { return []; }
    generateDiagnosticApproach(solutionData) { return ''; }
    generateImplementationOrder(solutionData) { return []; }
    generateTroubleshootingGuide(solutionData) { return ''; }
    extractSolutions(sessionData) { return []; }
    generateApplicableScenarios(sessionData, tags) { return []; }
    extractPrerequisites(sessionData) { return []; }
    estimateImplementationTime(sessionData) { return '1-2 hours'; }
    extractCommonPitfalls(sessionData) { return []; }
    extractSuccessMetrics(sessionData) { return []; }
    generateFollowUpTasks(sessionData) { return []; }
}

module.exports = { SessionSharingService };