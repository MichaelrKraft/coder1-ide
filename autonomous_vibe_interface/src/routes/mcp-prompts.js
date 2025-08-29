/**
 * MCP Prompts API Routes
 * Serves prompt library and handles prompt execution
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Load prompt library
let promptLibrary = null;
const PROMPTS_FILE = path.join(__dirname, '../data/mcp-prompts-library.json');

async function loadPromptLibrary() {
    try {
        const data = await fs.readFile(PROMPTS_FILE, 'utf8');
        promptLibrary = JSON.parse(data);
        console.log(`[MCP Prompts] Loaded ${promptLibrary.prompts.length} prompts`);
    } catch (error) {
        console.error('[MCP Prompts] Failed to load prompt library:', error);
        // Return default prompts if file not found
        promptLibrary = {
            version: '1.0.0',
            prompts: [
                {
                    id: 'quick-start',
                    command: '/coder1/quick-start',
                    title: 'Quick Start Guide',
                    description: 'Learn what I can do for you',
                    icon: '🚀',
                    category: 'getting-started',
                    examples: ['Shows all available commands'],
                    contextTriggers: ['general']
                }
            ]
        };
    }
}

// Initialize on startup
loadPromptLibrary();

/**
 * GET /api/mcp-prompts/library
 * Returns the complete prompt library
 */
router.get('/library', async (req, res) => {
    if (!promptLibrary) {
        await loadPromptLibrary();
    }
    
    // Filter by context if provided
    const { context, category, search } = req.query;
    let filteredPrompts = [...promptLibrary.prompts];
    
    if (category) {
        filteredPrompts = filteredPrompts.filter(p => p.category === category);
    }
    
    if (context) {
        const contexts = context.split(',');
        filteredPrompts = filteredPrompts.filter(p => 
            p.contextTriggers?.some(trigger => contexts.includes(trigger))
        );
    }
    
    if (search) {
        const searchLower = search.toLowerCase();
        filteredPrompts = filteredPrompts.filter(p => 
            p.title.toLowerCase().includes(searchLower) ||
            p.description.toLowerCase().includes(searchLower) ||
            p.command.toLowerCase().includes(searchLower)
        );
    }
    
    // Sort by priority if available
    filteredPrompts.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    res.json({
        version: promptLibrary.version,
        prompts: filteredPrompts,
        total: filteredPrompts.length
    });
});

/**
 * GET /api/mcp-prompts/categories
 * Returns available prompt categories
 */
router.get('/categories', async (req, res) => {
    if (!promptLibrary) {
        await loadPromptLibrary();
    }
    
    const categories = {};
    promptLibrary.prompts.forEach(prompt => {
        if (!categories[prompt.category]) {
            categories[prompt.category] = {
                name: prompt.category,
                count: 0,
                icon: prompt.icon
            };
        }
        categories[prompt.category].count++;
    });
    
    res.json({
        categories: Object.values(categories),
        total: Object.keys(categories).length
    });
});

/**
 * GET /api/mcp-prompts/:id
 * Returns a specific prompt by ID
 */
router.get('/prompt/:id', async (req, res) => {
    if (!promptLibrary) {
        await loadPromptLibrary();
    }
    
    const prompt = promptLibrary.prompts.find(p => p.id === req.params.id);
    
    if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' });
    }
    
    res.json(prompt);
});

/**
 * POST /api/mcp-prompts/execute
 * Execute a prompt command
 */
router.post('/execute', async (req, res) => {
    const { command, context = {} } = req.body;
    
    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }
    
    try {
        // Log execution for analytics
        console.log(`[MCP Prompts] Executing: ${command}`);
        
        // Here we would integrate with the actual MCP server
        // For now, we'll simulate execution
        
        // Check if it's a coder1 command
        if (command.startsWith('/coder1/')) {
            // Extract the action
            const action = command.replace('/coder1/', '');
            
            // Simulate different responses based on action
            let response = {
                success: true,
                command: command,
                action: action,
                timestamp: new Date().toISOString()
            };
            
            // Add context-specific responses
            switch(action) {
            case 'quick-start':
                response.message = 'Welcome to Coder1! Here are your available commands...';
                response.data = {
                    commands: [
                        '/coder1/implement - Build features',
                        '/coder1/debug - Fix issues',
                        '/coder1/optimize - Improve performance'
                    ]
                };
                break;
                    
            case 'find-bugs':
                response.message = 'Scanning for bugs...';
                response.data = {
                    bugsFound: Math.floor(Math.random() * 5),
                    severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
                };
                break;
                    
            case 'optimize':
                response.message = 'Analyzing performance...';
                response.data = {
                    optimizations: Math.floor(Math.random() * 10) + 1,
                    estimatedImprovement: `${Math.floor(Math.random() * 50) + 10}%`
                };
                break;
                    
            default:
                response.message = `Executing ${action}...`;
                response.data = { status: 'processing' };
            }
            
            // Send response
            res.json(response);
            
            // Emit event for real-time updates
            if (global.io) {
                global.io.emit('prompt-executed', {
                    command,
                    action,
                    timestamp: response.timestamp
                });
            }
            
        } else {
            // Handle non-coder1 commands
            res.json({
                success: true,
                command: command,
                message: 'Command forwarded to MCP server',
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('[MCP Prompts] Execution error:', error);
        res.status(500).json({
            error: 'Failed to execute prompt',
            message: error.message
        });
    }
});

/**
 * POST /api/mcp-prompts/track
 * Track prompt usage for analytics
 */
router.post('/track', async (req, res) => {
    const { promptId, event, metadata = {} } = req.body;
    
    // Log analytics event
    console.log(`[MCP Analytics] Event: ${event} for prompt: ${promptId}`, metadata);
    
    // Here you could save to a database or analytics service
    
    res.json({ success: true });
});

/**
 * GET /api/mcp-prompts/suggestions
 * Get contextual prompt suggestions
 */
router.get('/suggestions', async (req, res) => {
    if (!promptLibrary) {
        await loadPromptLibrary();
    }
    
    const { 
        fileType, 
        hasErrors, 
        idleTime = 0, 
        timeOfDay = 'general',
        recentPrompts = []
    } = req.query;
    
    let suggestions = [...promptLibrary.prompts];
    
    // Filter out recently used prompts
    if (recentPrompts.length > 0) {
        const recent = recentPrompts.split(',');
        suggestions = suggestions.filter(p => !recent.includes(p.id));
    }
    
    // Priority scoring based on context
    suggestions = suggestions.map(prompt => {
        let score = prompt.priority || 5;
        
        // Boost score for matching contexts
        if (hasErrors === 'true' && prompt.category === 'debugging') {
            score += 3;
        }
        
        if (fileType && prompt.contextTriggers?.includes(fileType)) {
            score += 2;
        }
        
        if (parseInt(idleTime) > 300000 && prompt.category === 'learning') {
            score += 1;
        }
        
        if (timeOfDay === 'morning' && prompt.category === 'getting-started') {
            score += 2;
        }
        
        return { ...prompt, score };
    });
    
    // Sort by score and return top suggestions
    suggestions.sort((a, b) => b.score - a.score);
    
    res.json({
        suggestions: suggestions.slice(0, 10),
        context: { fileType, hasErrors, idleTime, timeOfDay }
    });
});

/**
 * POST /api/mcp-prompts/feedback
 * Collect user feedback on prompts
 */
router.post('/feedback', async (req, res) => {
    const { promptId, rating, feedback } = req.body;
    
    console.log(`[MCP Feedback] Prompt: ${promptId}, Rating: ${rating}, Feedback: ${feedback}`);
    
    // Here you could save feedback to improve prompt recommendations
    
    res.json({ success: true, message: 'Thank you for your feedback!' });
});

/**
 * GET /api/mcp-prompts/stats
 * Get usage statistics
 */
router.get('/stats', async (req, res) => {
    // This would normally query a database
    // For now, return mock stats
    
    res.json({
        totalPrompts: promptLibrary?.prompts.length || 0,
        mostUsed: [
            { id: 'quick-start', count: 150 },
            { id: 'find-bugs', count: 120 },
            { id: 'optimize', count: 95 }
        ],
        categories: {
            'getting-started': 15,
            'debugging': 12,
            'performance': 8,
            'testing': 10
        },
        lastUpdated: promptLibrary?.lastUpdated || new Date().toISOString()
    });
});

module.exports = router;