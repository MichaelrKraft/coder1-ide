/**
 * Terminal Slash Command Integration
 * 
 * Handles slash commands typed in the terminal, specifically for session sharing
 * Integrates with the SessionSharingService to provide seamless UX
 */

const { SessionSharingService } = require('./session-sharing-service');
const { ShareableSessionLoader } = require('./shareable-session-loader');

class TerminalSlashCommands {
    constructor(options = {}) {
        this.sharingService = new SessionSharingService();
        this.sessionLoader = new ShareableSessionLoader();
        
        // Command patterns
        this.commandPatterns = [
            { pattern: /^\/share-session\s+"([^"]+)"\s*(.*)$/, handler: 'handleShareSession' },
            { pattern: /^\/share-pattern\s+"([^"]+)"\s*(.*)$/, handler: 'handleSharePattern' },
            { pattern: /^\/share-solution\s+"([^"]+)"\s*(.*)$/, handler: 'handleShareSolution' },
            { pattern: /^\/list-shared\s*(.*)$/, handler: 'handleListShared' },
            { pattern: /^\/load-shared\s+([^\s]+)\s*(.*)$/, handler: 'handleLoadShared' },
            { pattern: /^\/help-sharing$/, handler: 'handleHelpSharing' }
        ];
        
        console.log('⚡ Terminal Slash Commands initialized');
    }

    /**
     * Process a terminal command and return response
     */
    async processCommand(command, context = {}) {
        try {
            const trimmedCommand = command.trim();
            
            // Find matching command pattern
            for (const { pattern, handler } of this.commandPatterns) {
                const match = trimmedCommand.match(pattern);
                if (match) {
                    console.log(`🎯 Processing slash command: ${handler}`);
                    return await this[handler](match, context);
                }
            }
            
            // No matching slash command
            return null;

        } catch (error) {
            console.error('Error processing terminal slash command:', error);
            return {
                success: false,
                message: `❌ Error processing command: ${error.message}`,
                type: 'error'
            };
        }
    }

    /**
     * Handle /share-session "label" [tags]
     */
    async handleShareSession(match, context) {
        const [, label, tagsString] = match;
        const command = `/share-session "${label}" ${tagsString}`.trim();
        
        const result = await this.sharingService.handleShareSessionCommand(command, context.sessionData);
        
        return {
            ...result,
            type: 'share-session',
            formatted: this.formatShareSessionResponse(result)
        };
    }

    /**
     * Handle /share-pattern "label" [description]
     */
    async handleSharePattern(match, context) {
        const [, label, description] = match;
        const command = `/share-pattern "${label}" ${description}`.trim();
        
        const result = await this.sharingService.handleSharePatternCommand(command, context.patternData);
        
        return {
            ...result,
            type: 'share-pattern',
            formatted: this.formatSharePatternResponse(result)
        };
    }

    /**
     * Handle /share-solution "label" [problem-description]
     */
    async handleShareSolution(match, context) {
        const [, label, problemDescription] = match;
        const command = `/share-solution "${label}" ${problemDescription}`.trim();
        
        const result = await this.sharingService.handleShareSolutionCommand(command, context.solutionData);
        
        return {
            ...result,
            type: 'share-solution',
            formatted: this.formatShareSolutionResponse(result)
        };
    }

    /**
     * Handle /list-shared [filter]
     */
    async handleListShared(match, context) {
        const [, filter] = match;
        const filters = filter ? filter.split(/\s+/) : [];
        
        try {
            const items = await this.sharingService.getSharedSessions(filters);
            
            return {
                success: true,
                type: 'list-shared',
                items,
                message: this.formatListResponse(items, filters),
                formatted: this.formatListResponse(items, filters)
            };

        } catch (error) {
            return {
                success: false,
                type: 'list-shared',
                message: `❌ Error listing shared items: ${error.message}`,
                formatted: `❌ Error listing shared items: ${error.message}`
            };
        }
    }

    /**
     * Handle /load-shared <item-id> [type]
     */
    async handleLoadShared(match, context) {
        const [, itemId, type] = match;
        const itemType = type?.trim() || 'sessions';
        
        try {
            const item = await this.sessionLoader.loadSharedItemWithContext(itemId, itemType);
            
            if (!item) {
                return {
                    success: false,
                    type: 'load-shared',
                    message: `❌ Shared item '${itemId}' not found`,
                    formatted: `❌ Shared item '${itemId}' not found`
                };
            }
            
            return {
                success: true,
                type: 'load-shared',
                item,
                message: this.formatLoadResponse(item),
                formatted: this.formatLoadResponse(item)
            };

        } catch (error) {
            return {
                success: false,
                type: 'load-shared',
                message: `❌ Error loading shared item: ${error.message}`,
                formatted: `❌ Error loading shared item: ${error.message}`
            };
        }
    }

    /**
     * Handle /help-sharing
     */
    async handleHelpSharing(match, context) {
        const helpText = this.generateHelpText();
        
        return {
            success: true,
            type: 'help-sharing',
            message: helpText,
            formatted: helpText
        };
    }

    /**
     * Check if a command is a slash command
     */
    isSlashCommand(command) {
        if (!command || typeof command !== 'string') return false;
        
        return this.commandPatterns.some(({ pattern }) => 
            pattern.test(command.trim())
        ) || command.trim() === '/help-sharing';
    }

    /**
     * Format share session response for terminal display
     */
    formatShareSessionResponse(result) {
        if (!result.success) {
            return `❌ ${result.message}`;
        }

        const tags = result.sharedSession && result.sharedSession.tags 
            ? result.sharedSession.tags.join(', ') 
            : 'none';
            
        return `
✅ Session Shared Successfully!
📁 Label: "${result.sharedSession?.label || 'Unknown'}"
🏷️  Tags: ${tags}
📊 Summary: ${result.sharedSession?.agentCount || 0} agents, ${result.sharedSession?.taskCount || 0} tasks
💾 Location: .coder1/forOtherAgents/sessions/${result.sharedSession?.filename || 'unknown'}

Other agents can now reference this session for learning and context.
`.trim();
    }

    /**
     * Format share pattern response for terminal display
     */
    formatSharePatternResponse(result) {
        if (!result.success) {
            return `❌ ${result.message}`;
        }

        return `
✅ Pattern Shared Successfully!
📁 Label: "${result.sharedPattern?.label || 'Unknown'}"
📝 Description: ${result.sharedPattern?.description || 'No description'}
📄 Files: ${result.sharedPattern?.fileCount || 0} included
💾 Location: .coder1/forOtherAgents/patterns/${result.sharedPattern?.filename || 'unknown'}

Agents can now reuse this pattern in similar implementations.
`.trim();
    }

    /**
     * Format share solution response for terminal display
     */
    formatShareSolutionResponse(result) {
        if (!result.success) {
            return `❌ ${result.message}`;
        }

        return `
✅ Solution Shared Successfully!
📁 Label: "${result.sharedSolution?.label || 'Unknown'}"
🔧 Problem: ${result.sharedSolution?.problemDescription || 'No description'}
💾 Location: .coder1/forOtherAgents/solutions/${result.sharedSolution?.filename || 'unknown'}

Agents can now reference this solution when facing similar problems.
`.trim();
    }

    /**
     * Format list response for terminal display
     */
    formatListResponse(items, filters) {
        if (items.length === 0) {
            return filters.length > 0 
                ? `📝 No shared items found matching filters: ${filters.join(', ')}`
                : '📝 No shared items found. Use /share-session, /share-pattern, or /share-solution to create some!';
        }

        let response = `📚 Shared Items${filters.length > 0 ? ` (filtered by: ${filters.join(', ')})` : ''}:\n\n`;
        
        items.slice(0, 10).forEach((item, i) => {  // Show top 10
            const date = new Date(item.created).toLocaleDateString();
            const typeIcon = { sessions: '🎯', patterns: '🧩', solutions: '🔧' }[item.type] || '📄';
            
            response += `${typeIcon} ${item.label} (${item.type})\n`;
            response += `   ID: ${item.id}\n`;
            response += `   Created: ${date}\n`;
            if (item.tags && item.tags.length > 0) {
                response += `   Tags: ${item.tags.join(', ')}\n`;
            }
            response += '\n';
        });

        if (items.length > 10) {
            response += `... and ${items.length - 10} more items\n`;
        }

        response += '\n💡 Use /load-shared <id> to load a specific item';

        return response;
    }

    /**
     * Format load response for terminal display
     */
    formatLoadResponse(item) {
        let response = `📖 Loaded: "${item.label}" (${item.type})\n`;
        response += `Created: ${new Date(item.created).toLocaleDateString()}\n\n`;

        if (item.contextualInsights && item.contextualInsights.length > 0) {
            response += '🧠 Key Insights:\n';
            item.contextualInsights.forEach(insight => {
                response += `• ${insight}\n`;
            });
            response += '\n';
        }

        if (item.actionableSteps && item.actionableSteps.length > 0) {
            response += '⚡ Actionable Steps:\n';
            item.actionableSteps.slice(0, 5).forEach((step, i) => {
                response += `${i + 1}. ${step}\n`;
            });
            response += '\n';
        }

        if (item.usageInstructions && item.usageInstructions.length > 0) {
            response += '📋 Usage Instructions:\n';
            item.usageInstructions.forEach(instruction => {
                response += `• ${instruction}\n`;
            });
        }

        return response;
    }

    /**
     * Generate help text for slash commands
     */
    generateHelpText() {
        return `
🚀 Session Sharing Slash Commands

Share your work:
  /share-session "label" [tags...]     Share current session with label and optional tags
  /share-pattern "label" [description] Share code pattern with description
  /share-solution "label" [problem]    Share solution with problem description

Discover shared knowledge:
  /list-shared [filter...]             List available shared items (optionally filtered)
  /load-shared <item-id> [type]        Load specific shared item (sessions/patterns/solutions)

Examples:
  /share-session "jwt-authentication" backend security api
  /share-pattern "react-hook-pattern" "Custom hook for API calls"
  /share-solution "cors-fix" "Fixed CORS issues in production"
  /list-shared frontend
  /load-shared session-123456

Help:
  /help-sharing                        Show this help message

💡 Shared items help agents learn from previous work and maintain continuity
   across development sessions.
`.trim();
    }
}

module.exports = { TerminalSlashCommands };