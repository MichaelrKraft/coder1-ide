/**
 * Claude Code Hooks Management API
 * Handles hook detection, configuration, and management
 */

const express = require('express');
const router = express.Router();
const ProjectDetector = require('../services/hooks/ProjectDetector');
const HookTemplates = require('../services/hooks/HookTemplates');
const HookConfigGenerator = require('../services/hooks/HookConfigGenerator');

// Initialize services
const templates = new HookTemplates();
const configGenerator = new HookConfigGenerator();

/**
 * GET /api/hooks/detect-project
 * Analyze current project and recommend hooks
 */
router.get('/detect-project', async (req, res) => {
    try {
        const detector = new ProjectDetector();
        const analysis = await detector.detectProject();
        
        res.json({
            success: true,
            analysis,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Project detection error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze project',
            message: error.message
        });
    }
});

/**
 * GET /api/hooks/templates
 * Get all available hook templates
 */
router.get('/templates', (req, res) => {
    try {
        const { category } = req.query;
        
        let result;
        if (category) {
            result = templates.getTemplatesByCategory(category);
        } else {
            result = templates.getAllTemplates();
        }

        res.json({
            success: true,
            templates: result,
            categories: templates.getCategories(),
            packs: templates.getRecommendationPacks()
        });
    } catch (error) {
        console.error('Templates fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch templates',
            message: error.message
        });
    }
});

/**
 * GET /api/hooks/templates/:id
 * Get specific template details
 */
router.get('/templates/:id', (req, res) => {
    try {
        const template = templates.getTemplate(req.params.id);
        
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
        console.error('Template fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch template',
            message: error.message
        });
    }
});

/**
 * POST /api/hooks/generate-config
 * Generate hook configuration from selected templates
 */
router.post('/generate-config', (req, res) => {
    try {
        const { 
            selectedHooks = [], 
            scope = 'project',
            mergeWithExisting = true,
            preview = false 
        } = req.body;

        if (!Array.isArray(selectedHooks) || selectedHooks.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No hooks selected'
            });
        }

        const result = configGenerator.generateConfiguration(selectedHooks, {
            scope,
            mergeWithExisting,
            backupExisting: !preview
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            ...result,
            selectedHooks,
            preview: preview || result.preview
        });

    } catch (error) {
        console.error('Config generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate configuration',
            message: error.message
        });
    }
});

/**
 * POST /api/hooks/save-config
 * Save hook configuration to file
 */
router.post('/save-config', async (req, res) => {
    try {
        const { 
            config, 
            scope = 'project',
            createBackup = true 
        } = req.body;

        if (!config) {
            return res.status(400).json({
                success: false,
                error: 'No configuration provided'
            });
        }

        const settingsPath = configGenerator.getSettingsPath(scope);
        const result = await configGenerator.saveConfiguration(config, settingsPath, {
            createBackup
        });

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json({
            success: true,
            message: 'Configuration saved successfully',
            path: result.path,
            backup: result.backup
        });

    } catch (error) {
        console.error('Config save error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save configuration',
            message: error.message
        });
    }
});

/**
 * GET /api/hooks/current-config
 * Get current hook configuration
 */
router.get('/current-config', (req, res) => {
    try {
        const { scope = 'project' } = req.query;
        const result = configGenerator.readConfiguration(scope);

        res.json({
            success: true,
            ...result,
            scope
        });

    } catch (error) {
        console.error('Config read error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to read configuration',
            message: error.message
        });
    }
});

/**
 * DELETE /api/hooks/remove
 * Remove specific hooks from configuration
 */
router.delete('/remove', (req, res) => {
    try {
        const { hookIds, scope = 'project' } = req.body;

        if (!Array.isArray(hookIds) || hookIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No hook IDs provided'
            });
        }

        const result = configGenerator.removeHooks(hookIds, scope);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json({
            success: true,
            message: `Removed ${hookIds.length} hook(s)`,
            removedHooks: hookIds,
            config: result.config
        });

    } catch (error) {
        console.error('Hook removal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove hooks',
            message: error.message
        });
    }
});

/**
 * GET /api/hooks/categories
 * Get all available categories
 */
router.get('/categories', (req, res) => {
    try {
        res.json({
            success: true,
            categories: templates.getCategories()
        });
    } catch (error) {
        console.error('Categories fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories',
            message: error.message
        });
    }
});

/**
 * GET /api/hooks/packs
 * Get all recommendation packs
 */
router.get('/packs', (req, res) => {
    try {
        res.json({
            success: true,
            packs: templates.getRecommendationPacks()
        });
    } catch (error) {
        console.error('Packs fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recommendation packs',
            message: error.message
        });
    }
});

/**
 * POST /api/hooks/install-pack
 * Install a complete recommendation pack
 */
router.post('/install-pack', (req, res) => {
    try {
        const { packId, scope = 'project' } = req.body;
        const packs = templates.getRecommendationPacks();
        const pack = packs[packId];

        if (!pack) {
            return res.status(404).json({
                success: false,
                error: 'Recommendation pack not found'
            });
        }

        // Generate configuration for the pack's hooks
        const result = configGenerator.generateConfiguration(pack.hooks, {
            scope,
            mergeWithExisting: true,
            backupExisting: true
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            message: `Installed ${pack.name} successfully`,
            pack,
            installedHooks: pack.hooks,
            config: result.config,
            preview: result.preview
        });

    } catch (error) {
        console.error('Pack installation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to install pack',
            message: error.message
        });
    }
});

/**
 * GET /api/hooks/status
 * Get overall hooks system status
 */
router.get('/status', (req, res) => {
    try {
        const projectConfig = configGenerator.readConfiguration('project');
        const userConfig = configGenerator.readConfiguration('user');
        
        const status = {
            project: {
                hasConfig: projectConfig.success && Object.keys(projectConfig.config).length > 0,
                path: projectConfig.path,
                hookCount: 0
            },
            user: {
                hasConfig: userConfig.success && Object.keys(userConfig.config).length > 0,
                path: userConfig.path,
                hookCount: 0
            },
            totalTemplates: Object.keys(templates.getAllTemplates()).length,
            categories: Object.keys(templates.getCategories()).length
        };

        // Count hooks in configurations
        if (projectConfig.success && projectConfig.config.hooks) {
            status.project.hookCount = Object.values(projectConfig.config.hooks)
                .flat().length;
        }

        if (userConfig.success && userConfig.config.hooks) {
            status.user.hookCount = Object.values(userConfig.config.hooks)
                .flat().length;
        }

        res.json({
            success: true,
            status
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get status',
            message: error.message
        });
    }
});

module.exports = router;