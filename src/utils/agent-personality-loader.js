/**
 * Agent Personality Loader
 * 
 * Loads and parses agent personality definitions from .claude/agents/*.md files
 * Extracts personality traits, response styles, and example formats
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { AgentSessionMemory } = require('../services/agent-session-memory');

class AgentPersonalityLoader {
    constructor(options = {}) {
        this.agentsDir = path.join(process.cwd(), '.claude', 'agents');
        this.loadedPersonalities = new Map();
        
        // Initialize session memory for cross-session continuity
        this.sessionMemory = options.sessionMemory || new AgentSessionMemory();
        this.enableSessionContinuity = options.enableSessionContinuity !== false;
        
        console.log(`🧠 Agent Personality Loader initialized ${this.enableSessionContinuity ? 'with' : 'without'} session continuity`);
    }

    /**
     * Load all agent personalities from .md files
     */
    async loadAllPersonalities() {
        try {
            const files = await fs.readdir(this.agentsDir);
            const mdFiles = files.filter(f => f.endsWith('.md'));
            
            for (const file of mdFiles) {
                const agentType = path.basename(file, '.md');
                const personality = await this.loadPersonality(agentType);
                if (personality) {
                    this.loadedPersonalities.set(agentType, personality);
                }
            }
            
            console.log(`📚 Loaded ${this.loadedPersonalities.size} agent personalities`);
            return this.loadedPersonalities;
        } catch (error) {
            console.error('Error loading agent personalities:', error);
            return this.getDefaultPersonalities();
        }
    }

    /**
     * Load a specific agent personality
     */
    async loadPersonality(agentType) {
        try {
            const filePath = path.join(this.agentsDir, `${agentType}.md`);
            const content = await fs.readFile(filePath, 'utf8');
            
            // Parse YAML frontmatter
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            let metadata = {};
            if (frontmatterMatch) {
                metadata = yaml.load(frontmatterMatch[1]);
            }
            
            // Extract personality sections
            const personality = {
                type: agentType,
                name: metadata.name || agentType,
                description: metadata.description || '',
                tools: metadata.tools || [],
                
                // Extract voice and personality
                voice: this.extractSection(content, 'VOICE'),
                personality: this.extractSection(content, 'PERSONALITY'),
                expertise: this.extractSection(content, 'MY EXPERTISE'),
                triggerPhrases: this.extractTriggerPhrases(content),
                responseStyle: this.extractResponseStyle(content),
                exampleFormat: this.extractSection(content, 'EXAMPLE RESPONSE FORMAT'),
                
                // Extract specific phrases
                signaturePhrase: this.extractSignaturePhrase(content),
                focusAreas: this.extractFocusAreas(content),
                
                // Temperature and model settings based on agent type
                temperature: this.getAgentTemperature(agentType),
                model: this.getAgentModel(agentType),
                maxTokens: this.getAgentMaxTokens(agentType)
            };
            
            return personality;
        } catch (error) {
            console.error(`Error loading personality for ${agentType}:`, error);
            return null;
        }
    }

    /**
     * Extract a section from the markdown content
     */
    extractSection(content, sectionName) {
        const regex = new RegExp(`\\*\\*${sectionName}\\*\\*:?\\s*([^\\n]+(?:\\n(?!\\*\\*)[^\\n]+)*)`, 'i');
        const match = content.match(regex);
        return match ? match[1].trim() : '';
    }

    /**
     * Extract trigger phrases
     */
    extractTriggerPhrases(content) {
        const section = this.extractSection(content, 'TRIGGER PHRASES I RESPOND TO');
        if (section) {
            // Extract phrases from quoted strings
            const phrases = section.match(/"([^"]+)"/g);
            return phrases ? phrases.map(p => p.replace(/"/g, '')) : [];
        }
        return [];
    }

    /**
     * Extract response style details
     */
    extractResponseStyle(content) {
        const section = this.extractSection(content, 'MY RESPONSE STYLE');
        const style = {};
        
        // Extract start phrase
        const startMatch = section.match(/Start with:\s*"([^"]+)"/);
        if (startMatch) style.startWith = startMatch[1];
        
        // Extract focus
        const focusMatch = section.match(/Focus on:\s*([^\n]+)/);
        if (focusMatch) style.focusOn = focusMatch[1];
        
        // Extract what to provide
        const provideMatch = section.match(/Provide:\s*([^\n]+)/);
        if (provideMatch) style.provide = provideMatch[1];
        
        // Extract length
        const lengthMatch = section.match(/Length:\s*([^\n]+)/);
        if (lengthMatch) style.length = lengthMatch[1];
        
        return style;
    }

    /**
     * Extract signature phrase
     */
    extractSignaturePhrase(content) {
        const style = this.extractResponseStyle(content);
        return style.startWith || '';
    }

    /**
     * Extract focus areas
     */
    extractFocusAreas(content) {
        const expertise = this.extractSection(content, 'MY EXPERTISE');
        if (expertise) {
            const lines = expertise.split('\n').filter(line => line.startsWith('-'));
            return lines.map(line => line.replace(/^-\s*/, '').trim());
        }
        return [];
    }

    /**
     * Get temperature setting for agent type
     */
    getAgentTemperature(agentType) {
        const temperatures = {
            'architect': 0.7,    // More creative for system design
            'implementer': 0.3,  // More precise for code
            'optimizer': 0.5,    // Balanced for analysis
            'frontend': 0.4,
            'backend': 0.3,
            'debugger': 0.2      // Very precise for debugging
        };
        return temperatures[agentType] || 0.4;
    }

    /**
     * Get model for agent type
     */
    getAgentModel(agentType) {
        // Can use different models for different agents if needed
        // For now, use haiku for speed
        return 'claude-3-haiku-20240307';
    }

    /**
     * Get max tokens for agent type
     */
    getAgentMaxTokens(agentType) {
        const tokens = {
            'architect': 1000,    // Longer for system design
            'implementer': 800,   // Medium for code
            'optimizer': 600,     // Shorter for focused analysis
            'frontend': 800,
            'backend': 800,
            'debugger': 500
        };
        return tokens[agentType] || 800;
    }

    /**
     * Get default personalities if loading fails
     */
    getDefaultPersonalities() {
        return new Map([
            ['architect', {
                type: 'architect',
                name: 'Architect',
                signaturePhrase: 'From an architectural perspective',
                temperature: 0.7,
                model: 'claude-3-haiku-20240307',
                maxTokens: 1000,
                focusAreas: ['System design', 'Architecture patterns', 'Scalability'],
                responseStyle: {
                    startWith: 'From an architectural perspective',
                    focusOn: 'Structure, patterns, and long-term decisions'
                }
            }],
            ['implementer', {
                type: 'implementer',
                name: 'Implementer',
                signaturePhrase: 'Here\'s how to implement this',
                temperature: 0.3,
                model: 'claude-3-haiku-20240307',
                maxTokens: 800,
                focusAreas: ['Code implementation', 'Practical solutions', 'Step-by-step guidance'],
                responseStyle: {
                    startWith: 'Here\'s how to implement this',
                    focusOn: 'Concrete code solutions and implementation steps'
                }
            }],
            ['optimizer', {
                type: 'optimizer',
                name: 'Optimizer',
                signaturePhrase: 'To optimize this',
                temperature: 0.5,
                model: 'claude-3-haiku-20240307',
                maxTokens: 600,
                focusAreas: ['Performance optimization', 'Best practices', 'Quality improvements'],
                responseStyle: {
                    startWith: 'To optimize this',
                    focusOn: 'Performance improvements and quality metrics'
                }
            }]
        ]);
    }

    /**
     * Get personality for a specific agent type
     */
    getPersonality(agentType) {
        return this.loadedPersonalities.get(agentType) || this.getDefaultPersonalities().get(agentType);
    }

    /**
     * Load personality with session continuity context
     */
    async loadPersonalityWithContext(agentType, projectId = 'default') {
        try {
            // Load base personality
            const basePersonality = await this.loadPersonality(agentType);
            
            // If session continuity is disabled, return base personality
            if (!this.enableSessionContinuity) {
                return basePersonality;
            }

            // Get session continuity context
            const continuityContext = await this.sessionMemory.getAgentResumptionContext(agentType, projectId);
            
            // Enhance personality with session context
            const enhancedPersonality = {
                ...basePersonality,
                sessionContext: {
                    resumptionPrompt: continuityContext.resumptionPrompt,
                    continuityScore: continuityContext.continuityScore,
                    suggestedActions: continuityContext.suggestedActions,
                    previousSessions: continuityContext.previousSessions.slice(0, 3), // Last 3 sessions
                    collaboratorUpdates: continuityContext.collaboratorWork.slice(0, 5), // Last 5 updates
                    projectState: continuityContext.projectState,
                    sessionId: continuityContext.sessionId
                },
                enhancedInstructions: this.generateEnhancedInstructions(
                    basePersonality,
                    continuityContext
                )
            };

            console.log(`🔄 Loaded ${agentType} with session continuity (score: ${continuityContext.continuityScore})`);
            
            return enhancedPersonality;
        } catch (error) {
            console.error(`Error loading personality with context for ${agentType}:`, error);
            // Fallback to base personality
            return await this.loadPersonality(agentType);
        }
    }

    /**
     * Generate enhanced instructions that include session continuity
     */
    generateEnhancedInstructions(basePersonality, continuityContext) {
        let instructions = basePersonality.description || '';
        
        // Add session continuity instructions if we have context
        if (continuityContext.continuityScore > 0.3) {
            instructions += `\n\nSESSION CONTINUITY INSTRUCTIONS:`;
            instructions += `\n- You are continuing from a previous session (continuity score: ${continuityContext.continuityScore})`;
            
            if (continuityContext.previousSessions.length > 0) {
                const lastSession = continuityContext.previousSessions[0];
                instructions += `\n- Your last work: ${lastSession.work.workCompleted.slice(0, 3).join(', ')}`;
                
                if (lastSession.work.currentState) {
                    instructions += `\n- Current state: ${lastSession.work.currentState}`;
                }
                
                if (lastSession.work.nextSteps.length > 0) {
                    instructions += `\n- Planned next steps: ${lastSession.work.nextSteps.slice(0, 3).join(', ')}`;
                }
            }
            
            if (continuityContext.collaboratorWork.length > 0) {
                instructions += `\n- Collaborator updates since your last session:`;
                for (const update of continuityContext.collaboratorWork.slice(0, 3)) {
                    instructions += `\n  - ${update.agentId}: ${update.work.workCompleted.slice(0, 2).join(', ')}`;
                    if (update.relevantNotes) {
                        instructions += `\n    Note for you: ${update.relevantNotes}`;
                    }
                }
            }
            
            if (continuityContext.suggestedActions.length > 0) {
                instructions += `\n- Suggested actions for this session:`;
                for (const action of continuityContext.suggestedActions.slice(0, 3)) {
                    instructions += `\n  - [${action.priority}] ${action.action}`;
                }
            }
            
            instructions += `\n\nAlways acknowledge the continuity context in your responses and build upon previous work.`;
        } else {
            instructions += `\n\nSESSION CONTINUITY: Starting fresh - no significant previous context available.`;
        }
        
        return instructions;
    }

    /**
     * Record agent work completion for session continuity
     */
    async recordAgentWorkCompletion(agentType, workData) {
        if (!this.enableSessionContinuity) {
            return;
        }

        try {
            await this.sessionMemory.recordAgentWork(agentType, workData);
            console.log(`📝 Recorded work completion for ${agentType}`);
        } catch (error) {
            console.error(`Error recording work completion for ${agentType}:`, error);
            // Don't throw - this is non-critical
        }
    }

    /**
     * Finalize session for all agents
     */
    async finalizeSession(sessionSummary = {}) {
        if (!this.enableSessionContinuity) {
            return;
        }

        try {
            const sessionData = await this.sessionMemory.finalizeSession(sessionSummary);
            console.log(`✅ Session finalized: ${sessionData.id}`);
            return sessionData;
        } catch (error) {
            console.error('Error finalizing session:', error);
            // Don't throw - this is non-critical
        }
    }

    /**
     * Get current session info
     */
    getCurrentSessionInfo() {
        if (!this.enableSessionContinuity) {
            return null;
        }
        
        return this.sessionMemory.getCurrentSessionInfo();
    }

    /**
     * Update project context
     */
    updateProjectContext(updates) {
        if (!this.enableSessionContinuity) {
            return;
        }
        
        this.sessionMemory.updateProjectContext(updates);
    }
}

module.exports = { AgentPersonalityLoader };