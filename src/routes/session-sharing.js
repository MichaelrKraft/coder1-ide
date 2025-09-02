/**
 * Session Sharing API Routes
 * 
 * Handles slash commands for sharing sessions, patterns, and solutions
 * with other agents via the /share-session, /share-pattern, /share-solution commands
 */

const express = require('express');
const router = express.Router();
const { SessionSharingService } = require('../services/session-sharing-service');
const { AgentSessionMemory } = require('../services/agent-session-memory');

// Initialize services
const sharingService = new SessionSharingService();
const sessionMemory = new AgentSessionMemory();

/**
 * Handle slash command: /share-session "label" [tags]
 */
router.post('/share-session', async (req, res) => {
    try {
        const { command, sessionData } = req.body;
        
        if (!command || !command.startsWith('/share-session')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid command. Use: /share-session "label" [tags...]'
            });
        }

        // Get current session data if not provided
        let currentSessionData = sessionData;
        if (!currentSessionData) {
            currentSessionData = await sessionMemory.getCurrentSessionSummary();
        }

        const result = await sharingService.handleShareSessionCommand(command, currentSessionData);
        
        res.json(result);

    } catch (error) {
        console.error('Error handling share-session command:', error);
        res.status(500).json({
            success: false,
            message: `Internal server error: ${error.message}`
        });
    }
});

/**
 * Handle slash command: /share-pattern "label" [description]
 */
router.post('/share-pattern', async (req, res) => {
    try {
        const { command, patternData } = req.body;
        
        if (!command || !command.startsWith('/share-pattern')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid command. Use: /share-pattern "label" [description]'
            });
        }

        const result = await sharingService.handleSharePatternCommand(command, patternData);
        
        res.json(result);

    } catch (error) {
        console.error('Error handling share-pattern command:', error);
        res.status(500).json({
            success: false,
            message: `Internal server error: ${error.message}`
        });
    }
});

/**
 * Handle slash command: /share-solution "label" [problem-description]
 */
router.post('/share-solution', async (req, res) => {
    try {
        const { command, solutionData } = req.body;
        
        if (!command || !command.startsWith('/share-solution')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid command. Use: /share-solution "label" [problem-description]'
            });
        }

        const result = await sharingService.handleShareSolutionCommand(command, solutionData);
        
        res.json(result);

    } catch (error) {
        console.error('Error handling share-solution command:', error);
        res.status(500).json({
            success: false,
            message: `Internal server error: ${error.message}`
        });
    }
});

/**
 * Universal slash command handler - detects command type and routes appropriately
 */
router.post('/slash-command', async (req, res) => {
    try {
        const { command, context = {} } = req.body;
        
        if (!command || !command.startsWith('/')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid slash command format. Commands must start with /'
            });
        }

        let result;
        
        if (command.startsWith('/share-session')) {
            result = await sharingService.handleShareSessionCommand(command, context.sessionData);
        } else if (command.startsWith('/share-pattern')) {
            result = await sharingService.handleSharePatternCommand(command, context.patternData);
        } else if (command.startsWith('/share-solution')) {
            result = await sharingService.handleShareSolutionCommand(command, context.solutionData);
        } else {
            return res.status(400).json({
                success: false,
                message: `Unknown slash command: ${command.split(' ')[0]}\n\nAvailable commands:\n- /share-session "label" [tags...]\n- /share-pattern "label" [description]\n- /share-solution "label" [problem-description]`
            });
        }
        
        res.json(result);

    } catch (error) {
        console.error('Error handling slash command:', error);
        res.status(500).json({
            success: false,
            message: `Internal server error: ${error.message}`
        });
    }
});

/**
 * Get list of shared sessions/patterns/solutions for agents to browse
 */
router.get('/shared-items', async (req, res) => {
    try {
        const { tags, type } = req.query;
        const tagFilter = tags ? tags.split(',').map(t => t.trim()) : [];
        
        const items = await sharingService.getSharedSessions(tagFilter, type);
        
        res.json({
            success: true,
            items,
            totalCount: items.length,
            filters: {
                tags: tagFilter,
                type: type || 'all'
            }
        });

    } catch (error) {
        console.error('Error getting shared items:', error);
        res.status(500).json({
            success: false,
            message: `Error retrieving shared items: ${error.message}`
        });
    }
});

/**
 * Load a specific shared item (session/pattern/solution) by ID
 */
router.get('/shared-items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { type = 'sessions' } = req.query;
        
        const item = await sharingService.loadSharedItem(id, type);
        
        if (!item) {
            return res.status(404).json({
                success: false,
                message: `Shared item ${id} not found`
            });
        }
        
        res.json({
            success: true,
            item
        });

    } catch (error) {
        console.error(`Error loading shared item ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            message: `Error loading shared item: ${error.message}`
        });
    }
});

/**
 * Get available tags for filtering
 */
router.get('/tags', async (req, res) => {
    try {
        const indexFile = require('path').join(process.cwd(), '.coder1', 'forOtherAgents', 'index.json');
        const index = JSON.parse(require('fs').readFileSync(indexFile, 'utf8'));
        
        const tags = Object.keys(index.tags || {}).map(tag => ({
            tag,
            count: index.tags[tag].length
        })).sort((a, b) => b.count - a.count);
        
        res.json({
            success: true,
            tags
        });

    } catch (error) {
        console.error('Error getting tags:', error);
        res.json({
            success: true,
            tags: []
        });
    }
});

/**
 * Health check for session sharing system
 */
router.get('/health', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const forOtherAgentsDir = path.join(process.cwd(), '.coder1', 'forOtherAgents');
        const sessionsDir = path.join(forOtherAgentsDir, 'sessions');
        const patternsDir = path.join(forOtherAgentsDir, 'patterns');
        const solutionsDir = path.join(forOtherAgentsDir, 'solutions');
        
        const health = {
            status: 'healthy',
            directories: {
                forOtherAgents: fs.existsSync(forOtherAgentsDir),
                sessions: fs.existsSync(sessionsDir),
                patterns: fs.existsSync(patternsDir),
                solutions: fs.existsSync(solutionsDir)
            },
            counts: {
                sessions: fs.existsSync(sessionsDir) ? fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json')).length : 0,
                patterns: fs.existsSync(patternsDir) ? fs.readdirSync(patternsDir).filter(f => f.endsWith('.json')).length : 0,
                solutions: fs.existsSync(solutionsDir) ? fs.readdirSync(solutionsDir).filter(f => f.endsWith('.json')).length : 0
            },
            services: {
                sessionSharingService: !!sharingService,
                agentSessionMemory: !!sessionMemory
            }
        };
        
        res.json(health);
        
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

module.exports = router;