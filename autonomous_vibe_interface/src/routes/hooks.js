/**
 * Claude Code Hooks Management API
 * Handles hook detection, configuration, and management
 */

const express = require('express');
const router = express.Router();
const ProjectDetector = require('../services/hooks/ProjectDetector');
const HookTemplates = require('../services/hooks/HookTemplates');
const HookConfigGenerator = require('../services/hooks/HookConfigGenerator');
const AIHookAnalyzer = require('../services/hooks/AIHookAnalyzer');
const SmartHookGenerator = require('../services/hooks/SmartHookGenerator');
const HookPerformanceTracker = require('../services/hooks/HookPerformanceTracker');
const HybridHookManager = require('../services/hooks/HybridHookManager');

// Initialize services
const templates = new HookTemplates();
const configGenerator = new HookConfigGenerator();
const aiAnalyzer = new AIHookAnalyzer();
const smartGenerator = new SmartHookGenerator();
const performanceTracker = new HookPerformanceTracker();
const hybridHookManager = new HybridHookManager();

// Initialize hybrid hook manager
hybridHookManager.initialize().catch(err => {
    console.error('Failed to initialize HybridHookManager:', err);
});

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

// =====================================================================
// AI-POWERED HOOKS ENDPOINTS
// =====================================================================

/**
 * POST /api/hooks/ai-analyze
 * Run comprehensive AI analysis of the project
 */
router.post('/ai-analyze', async (req, res) => {
    try {
        console.log('🧠 Starting AI project analysis...');
        const analysis = await aiAnalyzer.analyzeProject();
        
        res.json({
            success: true,
            analysis,
            recommendations: analysis.aiRecommendations,
            healthScore: analysis.codebaseHealth.score,
            timestamp: analysis.timestamp
        });
        
    } catch (error) {
        console.error('AI analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'AI analysis failed',
            message: error.message
        });
    }
});

/**
 * POST /api/hooks/smart-generate
 * Generate AI-optimized hook configuration
 */
router.post('/smart-generate', async (req, res) => {
    try {
        const options = req.body || {};
        
        console.log('🚀 Generating smart hook configuration...');
        const result = await smartGenerator.generateSmartConfiguration(options);
        
        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            config: result.config,
            selectedHooks: result.selectedHooks,
            optimizations: result.optimizations,
            implementation: result.implementation,
            analysis: {
                healthScore: result.analysis.codebaseHealth.score,
                projectType: result.analysis.projectType,
                confidence: result.config.metadata?.confidence || 0.5
            },
            estimatedBenefits: result.config.metadata?.estimatedBenefits
        });
        
    } catch (error) {
        console.error('Smart generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Smart configuration generation failed',
            message: error.message
        });
    }
});

/**
 * POST /api/hooks/smart-update
 * Update existing configuration with AI recommendations
 */
router.post('/smart-update', async (req, res) => {
    try {
        const { config: existingConfig, options = {} } = req.body;
        
        if (!existingConfig) {
            return res.status(400).json({
                success: false,
                error: 'Existing configuration required'
            });
        }

        console.log('🔄 Analyzing configuration for AI improvements...');
        const result = await smartGenerator.updateConfigurationWithAI(existingConfig, options);
        
        res.json({
            success: result.success,
            currentConfig: result.currentConfig,
            improvements: result.suggestedImprovements || [],
            analysis: result.analysis ? {
                healthScore: result.analysis.codebaseHealth.score,
                timestamp: result.analysis.timestamp
            } : null,
            implementationPlan: result.implementationPlan
        });
        
    } catch (error) {
        console.error('Smart update error:', error);
        res.status(500).json({
            success: false,
            error: 'Configuration update analysis failed',
            message: error.message
        });
    }
});

/**
 * GET /api/hooks/ai-recommendations
 * Get AI recommendations without full analysis
 */
router.get('/ai-recommendations', async (req, res) => {
    try {
        const { category, priority } = req.query;
        
        console.log('💡 Fetching AI recommendations...');
        const analysis = await aiAnalyzer.analyzeProject();
        
        let recommendations = analysis.aiRecommendations;
        
        // Filter by category if specified
        if (category) {
            recommendations = recommendations.filter(rec => 
                rec.id.includes(category) || rec.name.toLowerCase().includes(category.toLowerCase())
            );
        }
        
        // Filter by priority if specified
        if (priority) {
            recommendations = recommendations.filter(rec => rec.priority === priority);
        }
        
        res.json({
            success: true,
            recommendations,
            totalCount: analysis.aiRecommendations.length,
            filteredCount: recommendations.length,
            healthScore: analysis.codebaseHealth.score,
            projectType: analysis.projectType
        });
        
    } catch (error) {
        console.error('AI recommendations error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch AI recommendations',
            message: error.message
        });
    }
});

/**
 * POST /api/hooks/ai-preview
 * Preview AI-generated configuration without saving
 */
router.post('/ai-preview', async (req, res) => {
    try {
        const options = { ...req.body, preview: true };
        
        console.log('👀 Generating configuration preview...');
        const result = await smartGenerator.generateSmartConfiguration(options);
        
        if (!result.success) {
            return res.status(400).json(result);
        }

        // Generate preview text
        const preview = {
            summary: `AI will configure ${result.selectedHooks.length} hooks based on project analysis`,
            hooks: result.selectedHooks,
            optimizations: result.optimizations.map(opt => ({
                type: opt.type,
                impact: opt.impact,
                reason: opt.reason,
                hooks: opt.hooks
            })),
            estimatedTime: result.implementation.estimatedTime,
            confidence: result.config.metadata?.confidence || 0.5,
            healthImpact: this.calculateHealthImpact(result.optimizations)
        };

        res.json({
            success: true,
            preview,
            config: result.config,
            implementation: result.implementation
        });
        
    } catch (error) {
        console.error('AI preview error:', error);
        res.status(500).json({
            success: false,
            error: 'Configuration preview failed',
            message: error.message
        });
    }
});

/**
 * Helper function to calculate health impact
 */
function calculateHealthImpact(optimizations) {
    const impactMap = { 'very-high': 25, 'high': 15, 'medium': 8, 'low': 3 };
    return optimizations.reduce((total, opt) => total + (impactMap[opt.impact] || 0), 0);
}

// =====================================================================
// PERFORMANCE TRACKING ENDPOINTS
// =====================================================================

/**
 * POST /api/hooks/tracking/start-session
 * Start a new performance tracking session
 */
router.post('/tracking/start-session', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const sessionStarted = await performanceTracker.startSession(sessionId);
        
        res.json({
            success: true,
            sessionId: sessionStarted,
            message: 'Performance tracking session started'
        });
        
    } catch (error) {
        console.error('Failed to start tracking session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start performance tracking session',
            message: error.message
        });
    }
});

/**
 * POST /api/hooks/tracking/hook-execution
 * Track a hook execution
 */
router.post('/tracking/hook-execution', async (req, res) => {
    try {
        const { hookId, executionData } = req.body;
        
        if (!hookId) {
            return res.status(400).json({
                success: false,
                error: 'Hook ID is required'
            });
        }

        const result = await performanceTracker.trackHookExecution(hookId, executionData || {});
        
        res.json({
            success: result.success,
            hookMetrics: result.hookMetrics,
            globalStats: result.globalStats,
            error: result.error
        });
        
    } catch (error) {
        console.error('Failed to track hook execution:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track hook execution',
            message: error.message
        });
    }
});

/**
 * POST /api/hooks/tracking/end-session
 * End current tracking session and get ROI
 */
router.post('/tracking/end-session', async (req, res) => {
    try {
        const { feedback } = req.body;
        const result = await performanceTracker.endSession(feedback || {});
        
        res.json({
            success: result.success,
            session: result.session,
            roi: result.roi,
            error: result.error
        });
        
    } catch (error) {
        console.error('Failed to end tracking session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to end performance tracking session',
            message: error.message
        });
    }
});

/**
 * GET /api/hooks/analytics
 * Get comprehensive performance analytics
 */
router.get('/analytics', async (req, res) => {
    try {
        const { timeframe = 'week' } = req.query;
        const result = await performanceTracker.getPerformanceAnalytics(timeframe);
        
        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json({
            success: true,
            analytics: result.analytics,
            timeframe,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Failed to get performance analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get performance analytics',
            message: error.message
        });
    }
});

/**
 * POST /api/hooks/tracking/ai-recommendation
 * Track AI recommendation implementation
 */
router.post('/tracking/ai-recommendation', async (req, res) => {
    try {
        const { recommendationId, implementationData } = req.body;
        
        if (!recommendationId) {
            return res.status(400).json({
                success: false,
                error: 'Recommendation ID is required'
            });
        }

        const result = await performanceTracker.trackAIRecommendation(
            recommendationId, 
            implementationData || {}
        );
        
        res.json(result);
        
    } catch (error) {
        console.error('Failed to track AI recommendation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track AI recommendation',
            message: error.message
        });
    }
});

// =====================================================================
// HYBRID HOOK ENDPOINTS
// =====================================================================

/**
 * GET /api/hooks/hybrid/status
 * Get hybrid hook system status
 */
router.get('/hybrid/status', (req, res) => {
    try {
        const triggers = hybridHookManager.getAvailableTriggers();
        const metrics = hybridHookManager.getMetrics();
        
        res.json({
            success: true,
            status: {
                initialized: true,
                triggersCount: triggers.length,
                metrics,
                triggers: triggers.map(t => ({
                    name: t.name,
                    description: t.description,
                    delegates: t.delegates || []
                }))
            }
        });
    } catch (error) {
        console.error('Failed to get hybrid status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get hybrid hook status',
            message: error.message
        });
    }
});

/**
 * POST /api/hooks/hybrid/execute
 * Execute a hybrid hook
 */
router.post('/hybrid/execute', async (req, res) => {
    try {
        const { hookName, context = {} } = req.body;
        
        if (!hookName) {
            return res.status(400).json({
                success: false,
                error: 'Hook name is required'
            });
        }
        
        const result = await hybridHookManager.executeHook(hookName, context);
        
        res.json({
            success: result.success,
            ...result
        });
        
    } catch (error) {
        console.error('Failed to execute hybrid hook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to execute hybrid hook',
            message: error.message
        });
    }
});

/**
 * GET /api/hooks/hybrid/triggers
 * Get available hybrid triggers
 */
router.get('/hybrid/triggers', (req, res) => {
    try {
        const triggers = hybridHookManager.getAvailableTriggers();
        
        res.json({
            success: true,
            triggers,
            count: triggers.length
        });
        
    } catch (error) {
        console.error('Failed to get triggers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get hybrid triggers',
            message: error.message
        });
    }
});

/**
 * POST /api/hooks/hybrid/register
 * Register a new hybrid trigger
 */
router.post('/hybrid/register', async (req, res) => {
    try {
        const { name, script, metadata = {} } = req.body;
        
        if (!name || !script) {
            return res.status(400).json({
                success: false,
                error: 'Name and script are required'
            });
        }
        
        await hybridHookManager.registerTrigger(name, script, metadata);
        
        res.json({
            success: true,
            message: `Registered hybrid trigger: ${name}`
        });
        
    } catch (error) {
        console.error('Failed to register trigger:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register hybrid trigger',
            message: error.message
        });
    }
});

/**
 * GET /api/hooks/hybrid/metrics
 * Get hybrid hook performance metrics
 */
router.get('/hybrid/metrics', (req, res) => {
    try {
        const metrics = hybridHookManager.getMetrics();
        
        res.json({
            success: true,
            metrics,
            summary: {
                totalExecutions: metrics.bashExecutions,
                aiDelegations: metrics.aiDelegations,
                delegationRate: metrics.delegationRate,
                performance: metrics.performance
            }
        });
        
    } catch (error) {
        console.error('Failed to get metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get hybrid metrics',
            message: error.message
        });
    }
});

/**
 * PUT /api/hooks/hybrid/thresholds
 * Update delegation thresholds
 */
router.put('/hybrid/thresholds', (req, res) => {
    try {
        const thresholds = req.body;
        
        hybridHookManager.updateThresholds(thresholds);
        
        res.json({
            success: true,
            message: 'Thresholds updated',
            thresholds
        });
        
    } catch (error) {
        console.error('Failed to update thresholds:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update thresholds',
            message: error.message
        });
    }
});

module.exports = router;