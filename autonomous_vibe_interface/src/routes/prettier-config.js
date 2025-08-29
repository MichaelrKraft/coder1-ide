const express = require('express');
const router = express.Router();

// In-memory storage for user configs (in production, use database)
const userConfigs = new Map();

// Default Prettier configuration
const defaultConfig = {
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
    trailingComma: 'es5',
    bracketSpacing: true,
    jsxBracketSameLine: false,
    arrowParens: 'always',
    printWidth: 80,
    endOfLine: 'lf',
};

// Get user's Prettier configuration
router.get('/user/prettier-config', (req, res) => {
    try {
    // In production, get user ID from authentication
        const userId = req.headers['x-user-id'] || 'default-user';
    
        const config = userConfigs.get(userId) || defaultConfig;
        res.json(config);
    } catch (error) {
        console.error('Error fetching Prettier config:', error);
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
});

// Save user's Prettier configuration
router.post('/user/prettier-config', (req, res) => {
    try {
    // In production, get user ID from authentication
        const userId = req.headers['x-user-id'] || 'default-user';
    
        const config = {
            ...defaultConfig,
            ...req.body
        };
    
        userConfigs.set(userId, config);
    
        res.json({ 
            success: true, 
            message: 'Configuration saved successfully',
            config 
        });
    } catch (error) {
        console.error('Error saving Prettier config:', error);
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

// Reset to default configuration
router.post('/user/prettier-config/reset', (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || 'default-user';
    
        userConfigs.set(userId, defaultConfig);
    
        res.json({ 
            success: true, 
            message: 'Configuration reset to defaults',
            config: defaultConfig 
        });
    } catch (error) {
        console.error('Error resetting Prettier config:', error);
        res.status(500).json({ error: 'Failed to reset configuration' });
    }
});

// Get all available Prettier options (for UI)
router.get('/prettier-options', (req, res) => {
    res.json({
        options: {
            tabWidth: {
                type: 'number',
                default: 2,
                description: 'Number of spaces per indentation level',
                min: 1,
                max: 8
            },
            useTabs: {
                type: 'boolean',
                default: false,
                description: 'Use tabs instead of spaces'
            },
            semi: {
                type: 'boolean',
                default: true,
                description: 'Add semicolons at the end of statements'
            },
            singleQuote: {
                type: 'boolean',
                default: false,
                description: 'Use single quotes instead of double quotes'
            },
            trailingComma: {
                type: 'select',
                default: 'es5',
                options: ['none', 'es5', 'all'],
                description: 'Print trailing commas where possible'
            },
            bracketSpacing: {
                type: 'boolean',
                default: true,
                description: 'Print spaces between brackets in object literals'
            },
            jsxBracketSameLine: {
                type: 'boolean',
                default: false,
                description: 'Put JSX closing bracket on the same line'
            },
            arrowParens: {
                type: 'select',
                default: 'always',
                options: ['always', 'avoid'],
                description: 'Include parentheses around arrow function parameters'
            },
            printWidth: {
                type: 'number',
                default: 80,
                description: 'Line length that Prettier will wrap on',
                min: 40,
                max: 200
            },
            endOfLine: {
                type: 'select',
                default: 'lf',
                options: ['lf', 'crlf', 'cr', 'auto'],
                description: 'Line ending style'
            }
        }
    });
});

module.exports = router;