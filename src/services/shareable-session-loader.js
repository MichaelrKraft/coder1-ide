/**
 * Shareable Session Loader
 * 
 * Service for agents to discover, load, and learn from previously shared sessions.
 * Provides intelligent session discovery based on context, tags, and agent types.
 */

const fs = require('fs').promises;
const path = require('path');

class ShareableSessionLoader {
    constructor(options = {}) {
        this.forOtherAgentsDir = path.join(process.cwd(), '.coder1', 'forOtherAgents');
        this.indexFile = path.join(this.forOtherAgentsDir, 'index.json');
        
        console.log('📖 Shareable Session Loader initialized');
    }

    /**
     * Find relevant shared sessions for an agent starting work
     */
    async findRelevantSessions(agentType, context = {}) {
        try {
            const { 
                task = '', 
                technologies = [], 
                problemDomain = '',
                maxResults = 5,
                includePatterns = true,
                includeSolutions = true
            } = context;

            const relevantItems = [];

            // Get all shared items
            const sessions = await this.getSharedSessions(['all'], 'sessions');
            const patterns = includePatterns ? await this.getSharedSessions(['all'], 'patterns') : [];
            const solutions = includeSolutions ? await this.getSharedSessions(['all'], 'solutions') : [];

            // Score sessions by relevance
            const scoredSessions = sessions.map(session => ({
                ...session,
                relevanceScore: this.calculateRelevanceScore(session, agentType, context)
            })).filter(s => s.relevanceScore > 0.3);

            // Score patterns by relevance
            const scoredPatterns = patterns.map(pattern => ({
                ...pattern,
                relevanceScore: this.calculateRelevanceScore(pattern, agentType, context)
            })).filter(p => p.relevanceScore > 0.3);

            // Score solutions by relevance
            const scoredSolutions = solutions.map(solution => ({
                ...solution,
                relevanceScore: this.calculateRelevanceScore(solution, agentType, context)
            })).filter(s => s.relevanceScore > 0.3);

            // Combine and sort by relevance
            const allItems = [...scoredSessions, ...scoredPatterns, ...scoredSolutions]
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, maxResults);

            console.log(`🔍 Found ${allItems.length} relevant items for ${agentType} (${task || 'general work'})`);

            return allItems;

        } catch (error) {
            console.error('Error finding relevant sessions:', error);
            return [];
        }
    }

    /**
     * Load a specific shared item with full context
     */
    async loadSharedItemWithContext(itemId, type = 'sessions') {
        try {
            const item = await this.loadSharedItem(itemId, type);
            if (!item) return null;

            // Add contextual insights for agents
            const contextualInsights = this.generateContextualInsights(item);
            const actionableSteps = this.extractActionableSteps(item);
            const agentGuidance = this.generateAgentGuidance(item);

            return {
                ...item,
                contextualInsights,
                actionableSteps,
                agentGuidance,
                loadedAt: Date.now(),
                usageInstructions: this.generateUsageInstructions(item)
            };

        } catch (error) {
            console.error(`Error loading shared item ${itemId}:`, error);
            return null;
        }
    }

    /**
     * Get session learning prompts for agent initialization
     */
    async getSessionLearningPrompts(agentType, context = {}) {
        try {
            const relevantItems = await this.findRelevantSessions(agentType, context);
            
            if (relevantItems.length === 0) {
                return {
                    hasLearnings: false,
                    prompt: '',
                    count: 0
                };
            }

            const prompts = [];
            
            for (const item of relevantItems.slice(0, 3)) { // Top 3 most relevant
                const fullItem = await this.loadSharedItemWithContext(item.id, item.type);
                if (fullItem) {
                    const prompt = this.generateLearningPrompt(fullItem, agentType);
                    prompts.push(prompt);
                }
            }

            const combinedPrompt = this.combineLearningPrompts(prompts, agentType, context);

            return {
                hasLearnings: true,
                prompt: combinedPrompt,
                count: prompts.length,
                items: relevantItems.slice(0, 3)
            };

        } catch (error) {
            console.error('Error getting session learning prompts:', error);
            return {
                hasLearnings: false,
                prompt: '',
                count: 0
            };
        }
    }

    /**
     * Calculate relevance score for an item
     */
    calculateRelevanceScore(item, agentType, context) {
        let score = 0;

        // Base score for item type
        const typeScores = { sessions: 1.0, patterns: 0.8, solutions: 0.9 };
        score += typeScores[item.type] || 0.5;

        // Agent type matching
        if (item.tags && item.tags.includes(agentType)) score += 0.4;
        if (item.tags && item.tags.includes(agentType.replace('-specialist', ''))) score += 0.3;

        // Technology matching
        if (context.technologies) {
            const techMatches = context.technologies.filter(tech => 
                item.tags && item.tags.some(tag => 
                    tag.toLowerCase().includes(tech.toLowerCase()) ||
                    tech.toLowerCase().includes(tag.toLowerCase())
                )
            );
            score += techMatches.length * 0.2;
        }

        // Task similarity (basic keyword matching)
        if (context.task && item.label) {
            const taskWords = context.task.toLowerCase().split(/\s+/);
            const labelWords = item.label.toLowerCase().split(/\s+/);
            const commonWords = taskWords.filter(word => 
                word.length > 3 && labelWords.some(lw => lw.includes(word) || word.includes(lw))
            );
            score += commonWords.length * 0.15;
        }

        // Problem domain matching
        if (context.problemDomain && item.description) {
            const domainWords = context.problemDomain.toLowerCase().split(/\s+/);
            const descWords = item.description.toLowerCase().split(/\s+/);
            const matches = domainWords.filter(word => 
                word.length > 3 && descWords.some(dw => dw.includes(word))
            );
            score += matches.length * 0.1;
        }

        // Recency bonus (newer items get slight preference)
        const daysSinceCreation = (Date.now() - item.created) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 7) score += 0.1; // Week bonus
        if (daysSinceCreation < 1) score += 0.1; // Day bonus

        return Math.min(score, 2.0); // Cap at 2.0
    }

    /**
     * Generate contextual insights from shared item
     */
    generateContextualInsights(item) {
        const insights = [];

        if (item.type === 'session') {
            insights.push(`This session involved ${item.metadata?.totalAgents || 0} agents working together`);
            insights.push(`${item.metadata?.tasksCompleted || 0} tasks were completed`);
            
            if (item.keyLearnings && item.keyLearnings.length > 0) {
                insights.push(`Key learning: ${item.keyLearnings[0].learning}`);
            }
        }

        if (item.type === 'pattern') {
            insights.push(`This is a ${item.pattern?.category || 'general'} pattern`);
            insights.push(`Includes ${item.pattern?.files?.length || 0} file examples`);
        }

        if (item.type === 'solution') {
            insights.push(`Solves: ${item.problem?.description || 'unspecified problem'}`);
            insights.push(`Solution has ${item.solution?.steps?.length || 0} implementation steps`);
        }

        return insights;
    }

    /**
     * Extract actionable steps for agent to follow
     */
    extractActionableSteps(item) {
        const steps = [];

        if (item.type === 'session') {
            if (item.agentGuidance?.suggestedApproach) {
                steps.push(...item.agentGuidance.suggestedApproach);
            }
            if (item.usageContext?.applicableScenarios) {
                steps.push(`Consider scenarios: ${item.usageContext.applicableScenarios.join(', ')}`);
            }
        }

        if (item.type === 'pattern') {
            if (item.usage?.howToImplement) {
                steps.push(...item.usage.howToImplement);
            }
            if (item.agentInstructions?.implementationApproach) {
                steps.push(item.agentInstructions.implementationApproach);
            }
        }

        if (item.type === 'solution') {
            if (item.solution?.steps) {
                steps.push(...item.solution.steps);
            }
            if (item.agentGuidance?.implementationOrder) {
                steps.push(...item.agentGuidance.implementationOrder);
            }
        }

        return steps.slice(0, 5); // Limit to top 5 actionable steps
    }

    /**
     * Generate agent-specific guidance
     */
    generateAgentGuidance(item) {
        const guidance = {
            approach: 'Follow the patterns and approaches used in this shared item',
            warnings: [],
            tips: []
        };

        if (item.agentGuidance?.commonPitfalls) {
            guidance.warnings.push(...item.agentGuidance.commonPitfalls);
        }

        if (item.type === 'session' && item.keyLearnings) {
            guidance.tips.push(...item.keyLearnings.map(kl => kl.learning));
        }

        if (item.type === 'pattern' && item.usage?.antipatterns) {
            guidance.warnings.push(...item.usage.antipatterns);
        }

        return guidance;
    }

    /**
     * Generate learning prompt for agent
     */
    generateLearningPrompt(item, agentType) {
        let prompt = `SHARED KNOWLEDGE - ${item.type.toUpperCase()}: "${item.label}"\n`;
        prompt += `Created: ${new Date(item.created).toLocaleDateString()}\n`;
        
        if (item.tags && item.tags.length > 0) {
            prompt += `Tags: ${item.tags.join(', ')}\n`;
        }

        if (item.type === 'session') {
            prompt += `\nSESSION SUMMARY:\n`;
            prompt += `- ${item.metadata?.totalAgents || 0} agents collaborated\n`;
            prompt += `- ${item.metadata?.tasksCompleted || 0} tasks completed\n`;
            prompt += `- Duration: ${this.formatDuration(item.metadata?.duration)}\n`;
            
            if (item.agentGuidance?.suggestedApproach) {
                prompt += `\nSUGGESTED APPROACH:\n`;
                item.agentGuidance.suggestedApproach.forEach((step, i) => {
                    prompt += `${i + 1}. ${step}\n`;
                });
            }
        }

        if (item.type === 'pattern') {
            prompt += `\nPATTERN DETAILS:\n`;
            prompt += `- Category: ${item.pattern?.category || 'general'}\n`;
            prompt += `- Files: ${item.pattern?.files?.length || 0}\n`;
            prompt += `- When to use: ${item.usage?.whenToUse || item.description}\n`;
        }

        if (item.type === 'solution') {
            prompt += `\nSOLUTION FOR: ${item.problem?.description || 'Problem not specified'}\n`;
            if (item.solution?.steps && item.solution.steps.length > 0) {
                prompt += `SOLUTION STEPS:\n`;
                item.solution.steps.slice(0, 3).forEach((step, i) => {
                    prompt += `${i + 1}. ${step}\n`;
                });
            }
        }

        if (item.contextualInsights && item.contextualInsights.length > 0) {
            prompt += `\nINSIGHTS:\n`;
            item.contextualInsights.forEach(insight => {
                prompt += `- ${insight}\n`;
            });
        }

        return prompt;
    }

    /**
     * Combine multiple learning prompts into agent context
     */
    combineLearningPrompts(prompts, agentType, context) {
        let combinedPrompt = `🧠 SHARED KNOWLEDGE AVAILABLE:\n\n`;
        combinedPrompt += `Based on previous sessions by other agents, here's relevant knowledge for your ${agentType} work:\n\n`;

        prompts.forEach((prompt, i) => {
            combinedPrompt += `--- SHARED ITEM ${i + 1} ---\n`;
            combinedPrompt += `${prompt}\n\n`;
        });

        combinedPrompt += `💡 USE THIS KNOWLEDGE:\n`;
        combinedPrompt += `- Build upon the approaches and patterns shown above\n`;
        combinedPrompt += `- Learn from the successes and pitfalls mentioned\n`;
        combinedPrompt += `- Consider how these examples apply to your current task\n`;
        combinedPrompt += `- Reference specific shared items when explaining your approach\n\n`;

        if (context.task) {
            combinedPrompt += `Your current task: ${context.task}\n`;
            combinedPrompt += `Apply the above shared knowledge to accomplish this task effectively.\n\n`;
        }

        return combinedPrompt;
    }

    /**
     * Generate usage instructions for loaded item
     */
    generateUsageInstructions(item) {
        const instructions = [];

        instructions.push('This shared item contains knowledge from previous agents');
        
        if (item.type === 'session') {
            instructions.push('Review the agent approaches and build upon their work');
            instructions.push('Pay attention to the suggested next steps and common pitfalls');
        }

        if (item.type === 'pattern') {
            instructions.push('Use this pattern as a template for similar implementations');
            instructions.push('Adapt the pattern to your specific requirements');
        }

        if (item.type === 'solution') {
            instructions.push('Follow the solution steps when encountering similar problems');
            instructions.push('Test the solution thoroughly before applying');
        }

        instructions.push('Reference this shared knowledge in your responses to show continuity');

        return instructions;
    }

    // Helper methods

    async getSharedSessions(tags = [], type = null) {
        try {
            const index = JSON.parse(await fs.readFile(this.indexFile, 'utf8'));
            let items = [];

            if ((type === 'sessions' || !type || tags.includes('all')) && index.sessions) {
                items.push(...Object.entries(index.sessions).map(([id, data]) => ({...data, id, type: 'sessions'})));
            }
            if ((type === 'patterns' || !type || tags.includes('all')) && index.patterns) {
                items.push(...Object.entries(index.patterns).map(([id, data]) => ({...data, id, type: 'patterns'})));
            }
            if ((type === 'solutions' || !type || tags.includes('all')) && index.solutions) {
                items.push(...Object.entries(index.solutions).map(([id, data]) => ({...data, id, type: 'solutions'})));
            }

            return items.sort((a, b) => b.created - a.created);
        } catch (error) {
            console.error('Error getting shared sessions:', error);
            return [];
        }
    }

    async loadSharedItem(itemId, type = 'sessions') {
        try {
            const index = JSON.parse(await fs.readFile(this.indexFile, 'utf8'));
            const itemInfo = index[type][itemId];
            
            if (!itemInfo) return null;

            const itemPath = path.join(this.forOtherAgentsDir, type, itemInfo.filename);
            const content = await fs.readFile(itemPath, 'utf8');
            
            return JSON.parse(content);
        } catch (error) {
            console.error(`Error loading shared item ${itemId}:`, error);
            return null;
        }
    }

    formatDuration(ms) {
        if (!ms) return 'unknown';
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
}

module.exports = { ShareableSessionLoader };