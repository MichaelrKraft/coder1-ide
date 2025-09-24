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
 * Install an MCP by adding it to ~/.mcp.json with enhanced validation
 */
router.post('/install-mcp', async (req, res) => {
    const os = require('os');
    const homedir = os.homedir();
    const mcpConfigPath = path.join(homedir, '.mcp.json');
    
    try {
        const { templateId } = req.body;
        
        if (!templateId) {
            return res.status(400).json({
                success: false,
                error: 'Template ID is required'
            });
        }

        // Load template data to get MCP configuration
        const data = await loadTemplates();
        const template = data.templates.find(t => t.id === templateId);
        
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        // Check if template has MCP configuration
        if (!template.mcpConfig) {
            return res.status(400).json({
                success: false,
                error: 'Template does not have MCP configuration'
            });
        }

        // Validate MCP configuration
        const { command, args, env } = template.mcpConfig;
        if (!command || !Array.isArray(args)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid MCP configuration format'
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
        if (mcpConfig.mcpServers[templateId]) {
            return res.json({
                success: true,
                message: `MCP "${template.name}" is already installed`,
                alreadyInstalled: true,
                template: {
                    id: template.id,
                    name: template.name
                }
            });
        }

        // Prepare MCP configuration for ~/.mcp.json
        const mcpServerConfig = {
            name: template.name,
            command: command,
            args: args,
            env: env || {}
        };

        // Add new MCP configuration
        mcpConfig.mcpServers[templateId] = mcpServerConfig;

        // Create backup of existing config
        try {
            if (await fs.access(mcpConfigPath).then(() => true).catch(() => false)) {
                const backupPath = `${mcpConfigPath}.backup-${Date.now()}`;
                await fs.copyFile(mcpConfigPath, backupPath);
                console.log(`Created backup: ${backupPath}`);
            }
        } catch (backupError) {
            console.warn('Could not create backup:', backupError.message);
        }

        // Write updated configuration
        await fs.writeFile(
            mcpConfigPath, 
            JSON.stringify(mcpConfig, null, 2),
            'utf8'
        );

        console.log(`✅ MCP "${template.name}" installed successfully`);

        res.json({
            success: true,
            message: `MCP "${template.name}" installed successfully`,
            requiresRestart: true,
            template: {
                id: template.id,
                name: template.name,
                command: template.mcpConfig.command
            },
            configPath: mcpConfigPath
        });

    } catch (error) {
        console.error('Error installing MCP:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to install MCP: ' + error.message
        });
    }
});

/**
 * GET /api/templates/install-status/:templateId
 * Check installation status and health of a specific MCP template
 */
router.get('/install-status/:templateId', async (req, res) => {
    const os = require('os');
    const homedir = os.homedir();
    const mcpConfigPath = path.join(homedir, '.mcp.json');
    
    try {
        const { templateId } = req.params;
        
        // Load template data
        const data = await loadTemplates();
        const template = data.templates.find(t => t.id === templateId);
        
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        let installStatus = {
            templateId,
            templateName: template.name,
            isInstalled: false,
            isConfigured: false,
            needsEnvironmentVars: false,
            missingEnvVars: [],
            status: 'not_installed',
            statusMessage: 'Not installed'
        };

        // Check if template has MCP configuration
        if (!template.mcpConfig) {
            installStatus.status = 'no_mcp_config';
            installStatus.statusMessage = 'Template does not support MCP installation';
            return res.json({
                success: true,
                ...installStatus
            });
        }

        // Check if already installed
        try {
            const configContent = await fs.readFile(mcpConfigPath, 'utf8');
            const mcpConfig = JSON.parse(configContent);
            
            if (mcpConfig.mcpServers && mcpConfig.mcpServers[templateId]) {
                installStatus.isInstalled = true;
                
                // Check if environment variables are configured
                const serverConfig = mcpConfig.mcpServers[templateId];
                const templateEnv = template.mcpConfig.env || {};
                const configuredEnv = serverConfig.env || {};
                
                const missingEnvVars = [];
                for (const [key, value] of Object.entries(templateEnv)) {
                    if (value.includes('YOUR_') || !configuredEnv[key] || configuredEnv[key].includes('YOUR_')) {
                        missingEnvVars.push(key);
                    }
                }
                
                if (missingEnvVars.length > 0) {
                    installStatus.needsEnvironmentVars = true;
                    installStatus.missingEnvVars = missingEnvVars;
                    installStatus.status = 'needs_config';
                    installStatus.statusMessage = `Installed but needs configuration: ${missingEnvVars.join(', ')}`;
                } else {
                    installStatus.isConfigured = true;
                    installStatus.status = 'installed';
                    installStatus.statusMessage = 'Installed and configured';
                }
            }
        } catch (error) {
            // MCP config file doesn't exist or is invalid
            installStatus.status = 'not_installed';
            installStatus.statusMessage = 'Not installed';
        }

        // Check if environment variables are required for installation
        if (!installStatus.isInstalled) {
            const templateEnv = template.mcpConfig.env || {};
            const requiredEnvVars = Object.keys(templateEnv).filter(key => 
                templateEnv[key].includes('YOUR_')
            );
            
            if (requiredEnvVars.length > 0) {
                installStatus.needsEnvironmentVars = true;
                installStatus.missingEnvVars = requiredEnvVars;
                installStatus.status = 'needs_setup';
                installStatus.statusMessage = `Requires setup: ${requiredEnvVars.join(', ')}`;
            } else {
                installStatus.status = 'ready_to_install';
                installStatus.statusMessage = 'Ready for one-click installation';
            }
        }

        res.json({
            success: true,
            ...installStatus
        });

    } catch (error) {
        console.error('Error checking install status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check installation status: ' + error.message
        });
    }
});

/**
 * GET /api/templates/bulk-install-status
 * Check installation status for all MCP templates
 */
router.get('/bulk-install-status', async (req, res) => {
    try {
        const data = await loadTemplates();
        const mcpTemplates = data.templates.filter(t => t.mcpConfig);
        
        const statusPromises = mcpTemplates.map(async (template) => {
            // Use the existing endpoint logic
            const response = await new Promise((resolve) => {
                const mockReq = { params: { templateId: template.id } };
                const mockRes = {
                    json: (data) => resolve(data),
                    status: () => mockRes
                };
                
                // Call the install-status logic directly
                router.handle(mockReq, mockRes, () => {});
            });
            
            return {
                templateId: template.id,
                templateName: template.name,
                category: template.category,
                ...response
            };
        });
        
        const statuses = await Promise.all(statusPromises);
        
        // Summary statistics
        const summary = {
            total: statuses.length,
            installed: statuses.filter(s => s.isInstalled).length,
            configured: statuses.filter(s => s.isConfigured).length,
            needsSetup: statuses.filter(s => s.needsEnvironmentVars).length,
            readyToInstall: statuses.filter(s => s.status === 'ready_to_install').length
        };
        
        res.json({
            success: true,
            summary,
            statuses
        });
        
    } catch (error) {
        console.error('Error checking bulk install status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check bulk installation status: ' + error.message
        });
    }
});

module.exports = router;