/**
 * Terminal Integration for Smart Slash Command Suggester
 * Hooks into terminal WebSocket to provide real-time suggestions
 */

const SmartSlashCommandSuggester = require('../services/smart-slash-suggester');

class TerminalSlashCommandIntegration {
    constructor(options = {}) {
        this.options = {
            enableNotifications: true,
            notificationStyle: 'inline', // 'inline' | 'popup' | 'toast'
            autoAcceptAfter: null, // Auto-accept after N seconds (null = disabled)
            ...options
        };
        
        this.suggester = new SmartSlashCommandSuggester();
        this.activeSuggestions = new Map(); // sessionId -> suggestion
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        // Listen for suggestions from the suggester
        this.suggester.on('suggestion', (suggestion) => {
            this.handleSuggestion(suggestion);
        });
        
        this.suggester.on('slash-command-created', (slashCommand) => {
            this.handleSlashCommandCreated(slashCommand);
        });
    }
    
    /**
     * Track a command from terminal session
     */
    trackCommand(command, sessionId = 'default') {
        const suggestion = this.suggester.trackCommand(command, sessionId);
        
        if (suggestion) {
            // Store suggestion for this session
            this.activeSuggestions.set(sessionId, suggestion);
            return suggestion;
        }
        
        return null;
    }
    
    /**
     * Handle a new suggestion
     */
    handleSuggestion(suggestion) {
        if (!this.options.enableNotifications) return;
        
        // Emit to WebSocket clients
        this.emitToTerminalClients('slash-command-suggestion', {
            ...suggestion,
            style: this.options.notificationStyle,
            actions: [
                { id: 'accept', label: 'Create [Y]', key: 'y' },
                { id: 'decline', label: 'Skip [N]', key: 'n' },
                { id: 'customize', label: 'Customize [C]', key: 'c' }
            ]
        });
    }
    
    /**
     * Handle slash command creation
     */
    handleSlashCommandCreated(slashCommand) {
        this.emitToTerminalClients('slash-command-created', {
            type: 'success',
            message: `✅ Slash command '${slashCommand.name}' created!`,
            command: slashCommand,
            usage: `Type '${slashCommand.name}' to use it`
        });
    }
    
    /**
     * Process user response to suggestion
     */
    async processSuggestionResponse(sessionId, action, customData = {}) {
        const suggestion = this.activeSuggestions.get(sessionId);
        if (!suggestion) {
            throw new Error('No active suggestion for this session');
        }
        
        switch (action) {
        case 'accept':
            const slashCommand = await this.suggester.createSlashCommand(suggestion, customData);
            this.activeSuggestions.delete(sessionId);
            return { success: true, slashCommand };
                
        case 'decline':
            this.activeSuggestions.delete(sessionId);
            return { success: true, declined: true };
                
        case 'customize':
            return { 
                success: true, 
                needsCustomization: true,
                suggestion,
                fields: [
                    { name: 'customName', label: 'Slash command name', default: suggestion.suggestedName },
                    { name: 'description', label: 'Description', default: `Quick access to: ${suggestion.originalCommand}` }
                ]
            };
                
        default:
            throw new Error(`Unknown action: ${action}`);
        }
    }
    
    /**
     * Execute a slash command
     */
    async executeSlashCommand(command, sessionId) {
        try {
            // Check if this is a slash command
            if (!command.startsWith('/')) {
                return null;
            }
            
            // Parse command and parameters
            const parts = command.split(' ');
            const slashName = parts[0];
            const params = this.parseSlashCommandParams(parts.slice(1));
            
            // Execute through suggester
            const expandedCommand = await this.suggester.executeSlashCommand(slashName, params);
            
            return {
                success: true,
                originalSlash: command,
                expandedCommand,
                message: `🎯 Executing: ${expandedCommand}`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                suggestion: 'Type \'/list\' to see available slash commands'
            };
        }
    }
    
    /**
     * Parse parameters from slash command
     */
    parseSlashCommandParams(args) {
        const params = {};
        
        for (let i = 0; i < args.length; i += 2) {
            if (args[i] && args[i + 1]) {
                const key = args[i].replace(/^--/, '');
                params[key] = args[i + 1];
            }
        }
        
        return params;
    }
    
    /**
     * Get terminal-formatted suggestion display
     */
    formatSuggestionForTerminal(suggestion) {
        const { originalCommand, suggestedName, usageCount, timeWindow } = suggestion;
        
        return [
            '',
            '\x1b[33m🎯 SLASH COMMAND SUGGESTION\x1b[0m',
            `\x1b[2m${'─'.repeat(50)}\x1b[0m`,
            `Command: \x1b[36m${originalCommand}\x1b[0m`,
            `Usage: \x1b[33m${usageCount} times\x1b[0m in \x1b[33m${timeWindow} minutes\x1b[0m`,
            `Suggested: \x1b[32m${suggestedName}\x1b[0m`,
            '',
            '\x1b[32m[Y]\x1b[0m Create  \x1b[31m[N]\x1b[0m Skip  \x1b[34m[C]\x1b[0m Customize',
            `\x1b[2m${'─'.repeat(50)}\x1b[0m`,
            ''
        ].join('\r\n');
    }
    
    /**
     * Get list of available slash commands
     */
    getSlashCommandList() {
        const commands = this.suggester.getSlashCommands();
        
        if (commands.length === 0) {
            return 'No slash commands created yet. Use commands repeatedly to get suggestions!';
        }
        
        const list = [
            '\x1b[33m⚡ AVAILABLE SLASH COMMANDS\x1b[0m',
            '\x1b[2m' + '─'.repeat(60) + '\x1b[0m'
        ];
        
        commands.forEach(cmd => {
            list.push(
                `\x1b[32m${cmd.name}\x1b[0m - ${cmd.description}`,
                `  \x1b[2m→ ${cmd.command}\x1b[0m`,
                `  \x1b[2mUsed ${cmd.usageCount} times\x1b[0m`,
                ''
            );
        });
        
        return list.join('\r\n');
    }
    
    /**
     * Get usage statistics for terminal display
     */
    getStatsForTerminal() {
        const stats = this.suggester.getStats();
        
        return [
            '\x1b[33m📊 SLASH COMMAND STATISTICS\x1b[0m',
            '\x1b[2m' + '─'.repeat(40) + '\x1b[0m',
            `Total Commands: \x1b[36m${stats.totalSlashCommands}\x1b[0m`,
            `Total Usage: \x1b[36m${stats.totalUsage}\x1b[0m`,
            `Suggestions Offered: \x1b[36m${stats.suggestionsOffered}\x1b[0m`,
            stats.mostUsed ? `Most Used: \x1b[32m${stats.mostUsed.name}\x1b[0m (${stats.mostUsed.usageCount} times)` : '',
            '\x1b[2m' + '─'.repeat(40) + '\x1b[0m'
        ].filter(Boolean).join('\r\n');
    }
    
    /**
     * Handle special slash command system commands
     */
    handleSystemSlashCommand(command) {
        switch (command) {
        case '/list':
        case '/slash':
            return this.getSlashCommandList();
                
        case '/stats':
            return this.getStatsForTerminal();
                
        case '/help-slash':
            return this.getHelpText();
                
        default:
            return null;
        }
    }
    
    /**
     * Get help text for slash commands
     */
    getHelpText() {
        return [
            '\x1b[33m❓ SLASH COMMAND HELP\x1b[0m',
            '\x1b[2m' + '─'.repeat(50) + '\x1b[0m',
            '',
            '\x1b[36mHow it works:\x1b[0m',
            '• Use any command 5+ times in 10 minutes',
            '• System automatically suggests creating a slash command',
            '• Press Y to accept, N to skip, C to customize',
            '',
            '\x1b[36mSystem commands:\x1b[0m',
            '\x1b[32m/list\x1b[0m    - List all your slash commands',
            '\x1b[32m/stats\x1b[0m   - Show usage statistics',
            '\x1b[32m/help-slash\x1b[0m - Show this help',
            '',
            '\x1b[36mExample:\x1b[0m',
            'Type "git status" 5 times → Get suggestion for "/gs"',
            'Then just type "/gs" instead of "git status"',
            '\x1b[2m' + '─'.repeat(50) + '\x1b[0m'
        ].join('\r\n');
    }
    
    /**
     * Emit to terminal WebSocket clients
     * This method should be overridden by the integrating system
     */
    emitToTerminalClients(event, data) {
        // Default implementation - should be overridden
        console.log(`[TERMINAL-SLASH] ${event}:`, data);
    }
    
    /**
     * Initialize with WebSocket server
     */
    initializeWithWebSocket(io) {
        this.io = io;
        
        // Override emit method to use actual WebSocket
        this.emitToTerminalClients = (event, data) => {
            io.emit(event, data);
        };
        
        // Set up WebSocket event handlers
        io.on('connection', (socket) => {
            socket.on('slash-command-response', async (data) => {
                try {
                    const result = await this.processSuggestionResponse(
                        data.sessionId, 
                        data.action, 
                        data.customData
                    );
                    socket.emit('slash-command-result', result);
                } catch (error) {
                    socket.emit('slash-command-error', { error: error.message });
                }
            });
        });
        
        return this;
    }
    
    /**
     * Get all data for handoff
     */
    getHandoffData() {
        return {
            service: this.suggester,
            stats: this.suggester.getStats(),
            commands: this.suggester.getSlashCommands(),
            integration: this
        };
    }
}

module.exports = TerminalSlashCommandIntegration;