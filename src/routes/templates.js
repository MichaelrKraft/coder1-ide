const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Base path for template data
const TEMPLATES_DATA_PATH = path.join(__dirname, '../data/coderone-templates');

// Cache for template data
let templatesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load all templates from JSON files
 */
async function loadTemplates(forceReload = false) {
    // Check cache
    if (!forceReload && templatesCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
        return templatesCache;
    }

    try {
        const files = await fs.readdir(TEMPLATES_DATA_PATH);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        const allTemplates = [];
        const categories = {};

        for (const file of jsonFiles) {
            const filePath = path.join(TEMPLATES_DATA_PATH, file);
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            
            // Store category information
            categories[data.categorySlug] = {
                name: data.category,
                slug: data.categorySlug,
                description: data.description,
                count: data.templates.length
            };
            
            // Add category info to each template
            const templatesWithCategory = data.templates.map(template => ({
                ...template,
                category: data.category,
                categorySlug: data.categorySlug
            }));
            
            allTemplates.push(...templatesWithCategory);
        }

        // Update cache
        templatesCache = { templates: allTemplates, categories };
        cacheTimestamp = Date.now();
        
        return templatesCache;
    } catch (error) {
        console.error('Error loading templates:', error);
        // Return empty data if error
        return { templates: [], categories: {} };
    }
}

/**
 * GET /api/templates
 * Get all templates with optional filtering
 */
router.get('/', async (req, res) => {
    try {
        const { category, search, sort = 'popular' } = req.query;
        const data = await loadTemplates();
        let templates = [...data.templates];

        // Filter by category
        if (category && category !== 'all') {
            templates = templates.filter(t => t.categorySlug === category);
        }

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            templates = templates.filter(t => 
                t.name.toLowerCase().includes(searchLower) ||
                t.description.toLowerCase().includes(searchLower) ||
                t.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }

        // Sorting
        switch (sort) {
        case 'popular':
            templates.sort((a, b) => b.stats.downloads - a.stats.downloads);
            break;
        case 'rating':
            templates.sort((a, b) => b.stats.rating - a.stats.rating);
            break;
        case 'recent':
            // Would sort by date if we had it
            break;
        case 'alphabetical':
            templates.sort((a, b) => a.name.localeCompare(b.name));
            break;
        }

        res.json({
            success: true,
            templates,
            total: templates.length
        });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch templates'
        });
    }
});

/**
 * GET /api/templates/categories
 * Get all categories with counts
 */
router.get('/categories', async (req, res) => {
    try {
        const data = await loadTemplates();
        const categories = Object.values(data.categories);
        
        // Add "all" category
        const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);
        categories.unshift({
            name: 'All Templates',
            slug: 'all',
            description: 'Browse all available templates',
            count: totalCount
        });

        res.json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories'
        });
    }
});

/**
 * GET /api/templates/clear-cache
 * Clear the templates cache
 */
router.get('/clear-cache', async (req, res) => {
    templatesCache = null;
    cacheTimestamp = null;
    res.json({
        success: true,
        message: 'Templates cache cleared'
    });
});

/**
 * GET /api/templates/check-mcp
 * Check which MCPs are installed
 */
router.get('/check-mcp', async (req, res) => {
    const os = require('os');
    const homedir = os.homedir();
    const mcpConfigPath = path.join(homedir, '.mcp.json');
    
    try {
        let installedMCPs = [];
        
        try {
            const configContent = await fs.readFile(mcpConfigPath, 'utf8');
            const mcpConfig = JSON.parse(configContent);
            
            if (mcpConfig.mcpServers) {
                installedMCPs = Object.keys(mcpConfig.mcpServers);
            }
        } catch (error) {
            // No config file or invalid JSON
            console.log('No MCP config found');
        }

        res.json({
            success: true,
            installedMCPs
        });

    } catch (error) {
        console.error('Error checking MCPs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check MCP status'
        });
    }
});

/**
 * GET /api/templates/check-system
 * Check system dependencies for MCP installation
 */
router.get('/check-system', async (req, res) => {
    const { spawn } = require('child_process');
    const os = require('os');
    
    try {
        const checks = {
            node: false,
            npm: false,
            npx: false,
            mcpConfigExists: false,
            platform: os.platform(),
            homeDir: os.homedir()
        };
        
        // Check Node.js
        try {
            await new Promise((resolve, reject) => {
                const nodeProcess = spawn('node', ['--version'], { stdio: 'pipe' });
                nodeProcess.on('close', (code) => {
                    checks.node = code === 0;
                    resolve();
                });
                nodeProcess.on('error', () => {
                    checks.node = false;
                    resolve();
                });
            });
        } catch (error) {
            checks.node = false;
        }
        
        // Check npm
        try {
            await new Promise((resolve, reject) => {
                const npmProcess = spawn('npm', ['--version'], { stdio: 'pipe' });
                npmProcess.on('close', (code) => {
                    checks.npm = code === 0;
                    resolve();
                });
                npmProcess.on('error', () => {
                    checks.npm = false;
                    resolve();
                });
            });
        } catch (error) {
            checks.npm = false;
        }
        
        // Check npx
        try {
            await new Promise((resolve, reject) => {
                const npxProcess = spawn('npx', ['--version'], { stdio: 'pipe' });
                npxProcess.on('close', (code) => {
                    checks.npx = code === 0;
                    resolve();
                });
                npxProcess.on('error', () => {
                    checks.npx = false;
                    resolve();
                });
            });
        } catch (error) {
            checks.npx = false;
        }
        
        // Check if ~/.mcp.json exists
        const mcpConfigPath = path.join(os.homedir(), '.mcp.json');
        try {
            await fs.access(mcpConfigPath);
            checks.mcpConfigExists = true;
        } catch (error) {
            checks.mcpConfigExists = false;
        }
        
        const allGood = checks.node && checks.npm && checks.npx;
        
        res.json({
            success: true,
            checks,
            ready: allGood,
            warnings: !allGood ? [
                !checks.node && 'Node.js not found',
                !checks.npm && 'npm not found', 
                !checks.npx && 'npx not found'
            ].filter(Boolean) : [],
            recommendations: !allGood ? [
                'Please install Node.js from https://nodejs.org/',
                'Ensure npm and npx are in your PATH'
            ] : []
        });
        
    } catch (error) {
        console.error('Error checking system:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check system dependencies'
        });
    }
});

/**
 * GET /api/templates/:id
 * Get a specific template by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await loadTemplates();
        const template = data.templates.find(t => t.id === id);

        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        res.json({
            success: true,
            template
        });
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch template'
        });
    }
});

/**
 * POST /api/templates/install
 * Install a template (mock implementation)
 */
router.post('/install', async (req, res) => {
    try {
        const { templateId } = req.body;
        
        if (!templateId) {
            return res.status(400).json({
                success: false,
                error: 'Template ID is required'
            });
        }

        const data = await loadTemplates();
        const template = data.templates.find(t => t.id === templateId);

        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        // Mock installation process
        // In production, this would:
        // 1. Download template files
        // 2. Install dependencies
        // 3. Configure project
        // 4. Update statistics

        // Simulate installation delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        res.json({
            success: true,
            message: `Template "${template.name}" installed successfully`,
            template: {
                id: template.id,
                name: template.name,
                command: template.installCommand
            }
        });
    } catch (error) {
        console.error('Error installing template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to install template'
        });
    }
});

/**
 * POST /api/templates/search
 * Advanced search with filters
 */
router.post('/search', async (req, res) => {
    try {
        const { 
            query = '', 
            categories = [], 
            tags = [], 
            minRating = 0,
            sortBy = 'relevance' 
        } = req.body;

        const data = await loadTemplates();
        let templates = [...data.templates];

        // Filter by categories
        if (categories.length > 0) {
            templates = templates.filter(t => categories.includes(t.categorySlug));
        }

        // Filter by tags
        if (tags.length > 0) {
            templates = templates.filter(t => 
                t.tags.some(tag => tags.includes(tag))
            );
        }

        // Filter by minimum rating
        if (minRating > 0) {
            templates = templates.filter(t => t.stats.rating >= minRating);
        }

        // Search query
        if (query) {
            const queryLower = query.toLowerCase();
            templates = templates.filter(t => {
                const searchString = `${t.name} ${t.description} ${t.tags.join(' ')}`.toLowerCase();
                return searchString.includes(queryLower);
            });

            // Sort by relevance (simple implementation)
            if (sortBy === 'relevance') {
                templates.sort((a, b) => {
                    const aRelevance = (a.name.toLowerCase().includes(queryLower) ? 10 : 0) +
                                      (a.description.toLowerCase().includes(queryLower) ? 5 : 0);
                    const bRelevance = (b.name.toLowerCase().includes(queryLower) ? 10 : 0) +
                                      (b.description.toLowerCase().includes(queryLower) ? 5 : 0);
                    return bRelevance - aRelevance;
                });
            }
        }

        res.json({
            success: true,
            templates,
            total: templates.length,
            query,
            filters: {
                categories,
                tags,
                minRating
            }
        });
    } catch (error) {
        console.error('Error searching templates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search templates'
        });
    }
});

/**
 * GET /api/templates/recommended
 * Get recommended templates based on user's project
 */
router.get('/recommended', async (req, res) => {
    try {
        const data = await loadTemplates();
        
        // Mock recommendation algorithm
        // In production, this would analyze:
        // - Current project dependencies
        // - File structure
        // - Recent activities
        // - Popular combinations
        
        const recommended = data.templates
            .filter(t => t.stats.rating >= 4.5)
            .sort((a, b) => b.stats.downloads - a.stats.downloads)
            .slice(0, 6);

        res.json({
            success: true,
            templates: recommended,
            reason: 'Based on popularity and ratings'
        });
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recommendations'
        });
    }
});

/**
 * POST /api/templates/install-mcp
 * Install an MCP by adding it to ~/.mcp.json and installing dependencies
 */
router.post('/install-mcp', async (req, res) => {
    const os = require('os');
    const { spawn } = require('child_process');
    const homedir = os.homedir();
    const mcpConfigPath = path.join(homedir, '.mcp.json');
    
    try {
        const { mcpId, config } = req.body;
        
        if (!mcpId || !config) {
            return res.status(400).json({
                success: false,
                error: 'MCP ID and configuration are required'
            });
        }

        // Read existing MCP configuration
        let mcpConfig = { mcpServers: {} };
        
        try {
            const existingConfig = await fs.readFile(mcpConfigPath, 'utf8');
            mcpConfig = JSON.parse(existingConfig);
            
            // Ensure mcpServers exists
            if (!mcpConfig.mcpServers) {
                mcpConfig.mcpServers = {};
            }
        } catch (error) {
            // File doesn't exist or is invalid, use default
            console.log('Creating new MCP config file');
        }

        // Check if MCP is already installed
        if (mcpConfig.mcpServers[mcpId]) {
            return res.json({
                success: true,
                message: `MCP "${mcpId}" is already installed`,
                alreadyInstalled: true
            });
        }

        // Check for environment variables that need to be set
        const needsEnvVars = [];
        if (config.env) {
            Object.entries(config.env).forEach(([key, value]) => {
                if (typeof value === 'string' && value.startsWith('YOUR_')) {
                    needsEnvVars.push(key);
                }
            });
        }

        if (needsEnvVars.length > 0) {
            return res.json({
                success: false,
                needsConfiguration: true,
                message: `MCP "${mcpId}" requires configuration of environment variables: ${needsEnvVars.join(', ')}`,
                requiredEnvVars: needsEnvVars,
                instructions: 'Please obtain the required API keys and configure them in your environment before installing this MCP.'
            });
        }

        // For npx-based installations, try to install the package first
        if (config.command === 'npx' && config.args && config.args.length > 0) {
            const packageName = config.args.find(arg => arg.startsWith('@') || arg.includes('/'));
            if (packageName && !packageName.startsWith('-')) {
                try {
                    console.log(`Installing package ${packageName}...`);
                    
                    // Install the package globally to ensure it's available
                    await new Promise((resolve, reject) => {
                        const installProcess = spawn('npm', ['install', '-g', packageName], { 
                            stdio: ['pipe', 'pipe', 'pipe'] 
                        });
                        
                        let stdout = '';
                        let stderr = '';
                        
                        installProcess.stdout.on('data', (data) => {
                            stdout += data.toString();
                        });
                        
                        installProcess.stderr.on('data', (data) => {
                            stderr += data.toString();
                        });
                        
                        installProcess.on('close', (code) => {
                            if (code === 0) {
                                console.log(`Successfully installed ${packageName}`);
                                resolve();
                            } else {
                                console.error(`Failed to install ${packageName}:`, stderr);
                                // Don't fail the entire installation if global install fails
                                resolve();
                            }
                        });
                        
                        installProcess.on('error', (error) => {
                            console.error(`Error installing ${packageName}:`, error);
                            // Don't fail the entire installation if global install fails
                            resolve();
                        });
                    });
                } catch (error) {
                    console.error('Error during package installation:', error);
                    // Continue with MCP configuration even if package install fails
                }
            }
        }

        // Add new MCP configuration
        mcpConfig.mcpServers[mcpId] = config;

        // Write updated configuration
        await fs.writeFile(
            mcpConfigPath, 
            JSON.stringify(mcpConfig, null, 2),
            'utf8'
        );

        res.json({
            success: true,
            message: `MCP "${mcpId}" installed successfully`,
            requiresRestart: true,
            instructions: 'Please restart Claude Code CLI to use the new MCP server.'
        });

    } catch (error) {
        console.error('Error installing MCP:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to install MCP: ' + error.message
        });
    }
});

module.exports = router;