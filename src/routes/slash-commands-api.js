/**
 * Slash Commands API Routes
 * Provides REST API endpoints for managing slash commands
 */

const express = require('express');
const TerminalSlashCommandIntegration = require('../integrations/terminal-slash-command-integration');

const router = express.Router();

// Initialize the integration
let slashCommandIntegration;

// Middleware to ensure integration is initialized
const ensureIntegration = (req, res, next) => {
    if (!slashCommandIntegration) {
        slashCommandIntegration = new TerminalSlashCommandIntegration({
            enableNotifications: true,
            notificationStyle: 'inline'
        });
    }
    req.slashCommands = slashCommandIntegration;
    next();
};

router.use(ensureIntegration);

/**
 * Track a command from terminal
 * POST /api/slash-commands/track
 * Body: { command: string, sessionId?: string }
 */
router.post('/track', (req, res) => {
    try {
        const { command, sessionId = 'default' } = req.body;
        
        if (!command) {
            return res.status(400).json({
                success: false,
                error: 'Command is required'
            });
        }
        
        const suggestion = req.slashCommands.trackCommand(command, sessionId);
        
        res.json({
            success: true,
            suggestion,
            message: suggestion ? 'Suggestion generated' : 'Command tracked'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Respond to a suggestion
 * POST /api/slash-commands/respond
 * Body: { sessionId: string, action: 'accept'|'decline'|'customize', customData?: object }
 */
router.post('/respond', async (req, res) => {
    try {
        const { sessionId, action, customData = {} } = req.body;
        
        if (!sessionId || !action) {
            return res.status(400).json({
                success: false,
                error: 'sessionId and action are required'
            });
        }
        
        const result = await req.slashCommands.processSuggestionResponse(sessionId, action, customData);
        
        res.json({
            success: true,
            ...result
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Execute a slash command
 * POST /api/slash-commands/execute
 * Body: { command: string, sessionId?: string }
 */
router.post('/execute', async (req, res) => {
    try {
        const { command, sessionId = 'default' } = req.body;
        
        if (!command) {
            return res.status(400).json({
                success: false,
                error: 'Command is required'
            });
        }
        
        // Handle system slash commands first
        if (command.startsWith('/')) {
            const systemResponse = req.slashCommands.handleSystemSlashCommand(command);
            if (systemResponse) {
                return res.json({
                    success: true,
                    type: 'system',
                    output: systemResponse,
                    command
                });
            }
        }
        
        // Try to execute as slash command
        const result = await req.slashCommands.executeSlashCommand(command, sessionId);
        
        if (result) {
            res.json({
                success: true,
                type: 'execution',
                ...result
            });
        } else {
            res.json({
                success: false,
                error: 'Not a slash command',
                suggestion: 'Use regular terminal execution'
            });
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get all slash commands
 * GET /api/slash-commands/list
 */
router.get('/list', (req, res) => {
    try {
        const commands = req.slashCommands.suggester.getSlashCommands();
        
        res.json({
            success: true,
            commands,
            count: commands.length
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get usage statistics
 * GET /api/slash-commands/stats
 */
router.get('/stats', (req, res) => {
    try {
        const stats = req.slashCommands.suggester.getStats();
        
        res.json({
            success: true,
            stats
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Create a slash command manually
 * POST /api/slash-commands/create
 * Body: { name: string, command: string, description?: string }
 */
router.post('/create', async (req, res) => {
    try {
        const { name, command, description } = req.body;
        
        if (!name || !command) {
            return res.status(400).json({
                success: false,
                error: 'name and command are required'
            });
        }
        
        // Create a mock suggestion for manual creation
        const mockSuggestion = {
            id: 'manual-' + Date.now(),
            originalCommand: command,
            suggestedName: name.startsWith('/') ? name : `/${name}`,
            usageCount: 0,
            timestamp: new Date().toISOString()
        };
        
        const slashCommand = await req.slashCommands.suggester.createSlashCommand(
            mockSuggestion, 
            { description }
        );
        
        res.json({
            success: true,
            slashCommand,
            message: `Slash command '${slashCommand.name}' created successfully`
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Delete a slash command
 * DELETE /api/slash-commands/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const commands = req.slashCommands.suggester.getSlashCommands();
        const command = commands.find(cmd => cmd.id === id);
        
        if (!command) {
            return res.status(404).json({
                success: false,
                error: 'Slash command not found'
            });
        }
        
        // Remove from internal storage
        req.slashCommands.suggester.createdSlashCommands.delete(command.command);
        
        // Save changes
        await req.slashCommands.suggester.saveSlashCommands();
        
        res.json({
            success: true,
            message: `Slash command '${command.name}' deleted successfully`
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get terminal-formatted output for a command
 * GET /api/slash-commands/terminal/:command
 */
router.get('/terminal/:command', (req, res) => {
    try {
        const { command } = req.params;
        
        let output;
        switch (command) {
        case 'list':
            output = req.slashCommands.getSlashCommandList();
            break;
        case 'stats':
            output = req.slashCommands.getStatsForTerminal();
            break;
        case 'help':
            output = req.slashCommands.getHelpText();
            break;
        default:
            output = `Unknown command: ${command}`;
        }
        
        res.json({
            success: true,
            output,
            formatted: true
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Health check endpoint
 * GET /api/slash-commands/health
 */
router.get('/health', (req, res) => {
    try {
        const stats = req.slashCommands.suggester.getStats();
        
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            stats: {
                totalCommands: stats.totalSlashCommands,
                totalUsage: stats.totalUsage
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'error',
            error: error.message
        });
    }
});

// Export the router and the integration getter
module.exports = {
    router,
    getIntegration: () => slashCommandIntegration
};