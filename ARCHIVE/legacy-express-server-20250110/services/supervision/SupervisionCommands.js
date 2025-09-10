/**
 * Supervision Commands - Simple terminal interface for supervision control
 * 
 * Provides easy-to-use commands for users to control the supervision system:
 * - sv status          - Show supervision status and stats
 * - sv mode [mode]     - Change supervision mode (strict/balanced/permissive/auto)
 * - sv history         - Show recent decisions
 * - sv teach [pattern] - Teach new patterns
 * - sv help            - Show available commands
 * 
 * These commands are designed to be simple and memorable for developers.
 */

class SupervisionCommands {
    constructor(supervisionAdapter) {
        this.adapter = supervisionAdapter;
        this.logger = supervisionAdapter.logger || console;
        
        // Command registry
        this.commands = {
            'sv': this.handleSupervisionCommand.bind(this),
            'supervision': this.handleSupervisionCommand.bind(this),
            'supervise': this.handleSupervisionCommand.bind(this)
        };
        
        // Subcommand handlers
        this.subcommands = {
            'status': this.handleStatus.bind(this),
            'mode': this.handleMode.bind(this),
            'history': this.handleHistory.bind(this),
            'stats': this.handleStats.bind(this),
            'teach': this.handleTeach.bind(this),
            'help': this.handleHelp.bind(this),
            'config': this.handleConfig.bind(this),
            'reset': this.handleReset.bind(this),
            'debug': this.handleDebug.bind(this)
        };
        
        this.logger.log('🔧 Supervision commands initialized');
    }
    
    /**
     * Check if a command line input is a supervision command
     */
    isSupervisionCommand(input) {
        const trimmed = input.trim().toLowerCase();
        return Object.keys(this.commands).some(cmd => 
            trimmed === cmd || trimmed.startsWith(cmd + ' ')
        );
    }
    
    /**
     * Parse and execute supervision command
     */
    async executeCommand(input) {
        const parts = input.trim().split(/\s+/);
        const command = parts[0].toLowerCase();
        const subcommand = parts[1]?.toLowerCase();
        const args = parts.slice(2);
        
        if (!this.commands[command]) {
            return {
                success: false,
                error: `Unknown command: ${command}`,
                suggestion: 'Try "sv help" for available commands'
            };
        }
        
        try {
            return await this.commands[command](subcommand, args);
        } catch (error) {
            this.logger.error('Command execution error:', error);
            return {
                success: false,
                error: error.message,
                suggestion: 'Try "sv help" for usage information'
            };
        }
    }
    
    /**
     * Main supervision command handler
     */
    async handleSupervisionCommand(subcommand, args) {
        if (!subcommand) {
            // Default to status if no subcommand provided
            return await this.handleStatus();
        }
        
        const handler = this.subcommands[subcommand];
        if (!handler) {
            return {
                success: false,
                error: `Unknown subcommand: ${subcommand}`,
                suggestion: 'Try "sv help" for available commands',
                available: Object.keys(this.subcommands)
            };
        }
        
        return await handler(args);
    }
    
    /**
     * Show supervision status
     */
    async handleStatus(args) {
        const stats = this.adapter.getStats();
        const mode = this.adapter.getSupervisionMode();
        
        const status = {
            active: stats.isActive,
            mode: mode.mode,
            interventions: stats.interventionCount,
            claudeDetected: stats.claudeCliDetected,
            version: stats.claudeCliVersion,
            lastIntervention: stats.lastIntervention?.type || 'none'
        };
        
        // Format status message
        const message = this.formatStatusMessage(status, stats);
        
        return {
            success: true,
            message,
            data: {
                status,
                detailed: args.includes('--detailed') ? stats : undefined
            }
        };
    }
    
    /**
     * Change supervision mode
     */
    async handleMode(args) {
        if (args.length === 0) {
            const currentMode = this.adapter.getSupervisionMode();
            return {
                success: true,
                message: `Current supervision mode: ${currentMode.mode}`,
                data: currentMode
            };
        }
        
        const newMode = args[0].toLowerCase();
        const validModes = ['strict', 'balanced', 'permissive', 'auto'];
        
        if (!validModes.includes(newMode)) {
            return {
                success: false,
                error: `Invalid mode: ${newMode}`,
                suggestion: `Valid modes: ${validModes.join(', ')}`
            };
        }
        
        // Parse additional options
        const options = {};
        for (let i = 1; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('--threshold=')) {
                options.autoApproveThreshold = parseFloat(arg.split('=')[1]);
            }
        }
        
        try {
            this.adapter.setSupervisionMode(newMode, options);
            
            return {
                success: true,
                message: `Supervision mode changed to: ${newMode}`,
                data: { mode: newMode, options }
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to change mode: ${error.message}`
            };
        }
    }
    
    /**
     * Show decision history
     */
    async handleHistory(args) {
        const history = this.adapter.getDecisionHistory();
        const limit = parseInt(args[0]) || 5;
        
        const recentHistory = history.slice(-limit);
        
        const message = this.formatHistoryMessage(recentHistory);
        
        return {
            success: true,
            message,
            data: {
                history: recentHistory,
                total: history.length
            }
        };
    }
    
    /**
     * Show detailed statistics
     */
    async handleStats(args) {
        const stats = this.adapter.getStats();
        const smartStats = stats.smartEngine;
        
        const message = this.formatStatsMessage(stats, smartStats);
        
        return {
            success: true,
            message,
            data: stats
        };
    }
    
    /**
     * Teach new patterns (future enhancement)
     */
    async handleTeach(args) {
        return {
            success: false,
            message: 'Pattern teaching not yet implemented',
            suggestion: 'This feature will be available in a future update'
        };
    }
    
    /**
     * Show help information
     */
    async handleHelp(args) {
        const helpMessage = `
🤖 Supervision Commands Help

Basic Commands:
  sv status              Show supervision status and activity
  sv mode [mode]         Change supervision mode
  sv history [count]     Show recent decisions (default: 5)
  sv stats              Show detailed statistics
  sv help               Show this help message

Supervision Modes:
  strict                Require approval for most actions
  balanced             Smart decisions with moderate approval
  permissive           Auto-approve most safe operations
  auto                 Fully autonomous with minimal intervention

Examples:
  sv status
  sv mode balanced
  sv mode strict --threshold=0.9
  sv history 10
  sv stats

Advanced:
  sv config             Show current configuration
  sv debug              Show debug information
  sv reset              Reset supervision statistics

For more information, see the CLAUDE.md file or supervision documentation.
        `.trim();
        
        return {
            success: true,
            message: helpMessage
        };
    }
    
    /**
     * Show configuration
     */
    async handleConfig(args) {
        const mode = this.adapter.getSupervisionMode();
        const stats = this.adapter.getStats();
        
        const config = {
            mode: mode.mode,
            autoApproveThreshold: mode.autoApproveThreshold,
            contextStatus: mode.contextStatus,
            smartEngine: !!stats.smartEngine
        };
        
        const message = `
📋 Supervision Configuration:
  Mode: ${config.mode}
  Auto-approve threshold: ${config.autoApproveThreshold || 'default'}
  Smart engine: ${config.smartEngine ? 'enabled' : 'disabled'}
  CLAUDE.md: ${config.contextStatus?.hasClaudeMd ? 'found' : 'missing'}
  PRD: ${config.contextStatus?.hasPrd ? 'found' : 'missing'}
  Project type: ${config.contextStatus?.projectType || 'unknown'}
        `.trim();
        
        return {
            success: true,
            message,
            data: config
        };
    }
    
    /**
     * Reset supervision statistics
     */
    async handleReset(args) {
        // Reset intervention count and history
        this.adapter.interventionCount = 0;
        this.adapter.lastIntervention = null;
        
        // Reset smart engine stats if available
        if (this.adapter.smartEngine) {
            this.adapter.smartEngine.decisionHistory = [];
            this.adapter.smartEngine.interventionStats = {
                totalDecisions: 0,
                autoApproved: 0,
                manualReview: 0,
                rejected: 0,
                overrides: 0
            };
        }
        
        return {
            success: true,
            message: 'Supervision statistics have been reset',
            data: { reset: true, timestamp: Date.now() }
        };
    }
    
    /**
     * Show debug information
     */
    async handleDebug(args) {
        const stats = this.adapter.getStats();
        
        const debugInfo = {
            session: stats.sessionId,
            active: stats.isActive,
            bufferSize: stats.bufferSize,
            waitingForResponse: stats.waitingForResponse,
            claudeCliDetected: stats.claudeCliDetected,
            patterns: Object.keys(this.adapter.patterns),
            smartEngine: !!stats.smartEngine,
            contextInitialized: stats.smartEngine?.contextHealth
        };
        
        const message = `
🔍 Debug Information:
  Session ID: ${debugInfo.session}
  Active: ${debugInfo.active}
  Buffer size: ${debugInfo.bufferSize}
  Waiting for response: ${debugInfo.waitingForResponse}
  Claude CLI detected: ${debugInfo.claudeCliDetected}
  Pattern categories: ${debugInfo.patterns.join(', ')}
  Smart engine: ${debugInfo.smartEngine ? 'enabled' : 'disabled'}
        `.trim();
        
        return {
            success: true,
            message,
            data: debugInfo
        };
    }
    
    /**
     * Format status message for display
     */
    formatStatusMessage(status, stats) {
        const statusIcon = status.active ? '✅' : '⚠️';
        const modeIcon = this.getModeIcon(status.mode);
        
        return `
${statusIcon} Supervision Status:
  ${modeIcon} Mode: ${status.mode}
  🤖 Claude CLI: ${status.claudeDetected ? 'detected' : 'not detected'}${status.version ? ` (v${status.version})` : ''}
  🔄 Interventions: ${status.interventions}
  📝 Last action: ${status.lastIntervention}
  
Use "sv help" for available commands
        `.trim();
    }
    
    /**
     * Format history message for display
     */
    formatHistoryMessage(history) {
        if (history.length === 0) {
            return 'No supervision decisions recorded yet';
        }
        
        const entries = history.map((decision, index) => {
            const time = new Date(decision.timestamp).toLocaleTimeString();
            const option = this.getOptionDescription(decision.decision);
            const confidence = decision.confidence ? ` (${(decision.confidence * 100).toFixed(0)}%)` : '';
            
            return `  ${index + 1}. [${time}] ${option}${confidence}: ${decision.text.substring(0, 60)}...`;
        }).join('\\n');
        
        return `
📋 Recent Supervision Decisions:
${entries}
        `.trim();
    }
    
    /**
     * Format statistics message for display
     */
    formatStatsMessage(stats, smartStats) {
        const message = `
📊 Supervision Statistics:
  Total interventions: ${stats.interventionCount}
  Session: ${stats.sessionId}
  Buffer size: ${stats.bufferSize}
        `;
        
        if (smartStats) {
            const smartInfo = `
  
🧠 Smart Engine Stats:
  Mode: ${smartStats.mode}
  Total decisions: ${smartStats.stats.totalDecisions}
  Auto-approved: ${smartStats.stats.autoApproved}
  Manual reviews: ${smartStats.stats.manualReview}
  Context health: ${smartStats.contextHealth.claudeMd ? 'CLAUDE.md ✅' : 'CLAUDE.md ❌'} ${smartStats.contextHealth.prd ? 'PRD ✅' : 'PRD ❌'}
            `;
            return message + smartInfo;
        }
        
        return message.trim();
    }
    
    /**
     * Get icon for supervision mode
     */
    getModeIcon(mode) {
        const icons = {
            strict: '🔒',
            balanced: '⚖️',
            permissive: '🔓',
            auto: '🚀',
            'pattern-only': '🔍'
        };
        return icons[mode] || '❓';
    }
    
    /**
     * Get description for option numbers
     */
    getOptionDescription(option) {
        switch (option) {
        case '1': return 'Proceed';
        case '2': return 'Proceed & don\'t ask';
        case '3': return 'Don\'t proceed';
        default: return `Option ${option}`;
        }
    }
}

module.exports = { SupervisionCommands };