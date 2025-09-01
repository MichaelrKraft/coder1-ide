/**
 * AGENTS.md Context API Routes
 * Provides API endpoints for integrating AGENTS.md context with Claude Code sessions
 */

const express = require('express');
const router = express.Router();
const AgentsContextIntegration = require('../services/agents-context-integration');

// Initialize the service
const agentsService = new AgentsContextIntegration();

// ==========================================
// MAIN CONTEXT INTEGRATION ENDPOINTS
// ==========================================

/**
 * POST /api/agents-context/enhance-prompt
 * Enhance a Claude Code prompt with AGENTS.md context
 */
router.post('/enhance-prompt', async (req, res) => {
    try {
        const { prompt, workingDirectory } = req.body;
        
        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        console.log(`[AgentsContext API] Enhancing prompt for directory: ${workingDirectory || 'current'}`);

        const result = await agentsService.enhanceClaudeCodePrompt(
            prompt, 
            workingDirectory || process.cwd()
        );

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('[AgentsContext API] Error enhancing prompt:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/agents-context/summary
 * Get a summary of available AGENTS.md context
 */
router.get('/summary', async (req, res) => {
    try {
        const { directory } = req.query;
        
        console.log(`[AgentsContext API] Getting context summary for: ${directory || 'current directory'}`);

        const summary = await agentsService.getContextSummary(
            directory || process.cwd()
        );

        res.json({
            success: true,
            summary
        });

    } catch (error) {
        console.error('[AgentsContext API] Error getting context summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/agents-context/find
 * Find AGENTS.md file in directory hierarchy
 */
router.get('/find', async (req, res) => {
    try {
        const { directory } = req.query;
        
        console.log(`[AgentsContext API] Finding AGENTS.md file from: ${directory || 'current directory'}`);

        const context = await agentsService.findAndParseAgentsFile(
            directory || process.cwd()
        );

        if (!context) {
            return res.json({
                success: true,
                found: false,
                message: 'No AGENTS.md file found in directory hierarchy'
            });
        }

        res.json({
            success: true,
            found: true,
            context: {
                filePath: context.filePath,
                overview: context.overview,
                buildCommandsCount: context.buildCommands.length,
                guidelinesCount: context.guidelines.length,
                sectionsCount: Object.keys(context.sections).length,
                metadata: context.metadata
            }
        });

    } catch (error) {
        console.error('[AgentsContext API] Error finding AGENTS.md:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/agents-context/parse
 * Parse a specific AGENTS.md file
 */
router.post('/parse', async (req, res) => {
    try {
        const { filePath } = req.body;
        
        if (!filePath) {
            return res.status(400).json({
                success: false,
                error: 'File path is required'
            });
        }

        console.log(`[AgentsContext API] Parsing AGENTS.md file: ${filePath}`);

        const context = await agentsService.parseAgentsFile(filePath);

        res.json({
            success: true,
            context: {
                filePath: context.filePath,
                overview: context.overview,
                buildCommands: context.buildCommands,
                guidelines: context.guidelines,
                projectStructure: context.projectStructure,
                sections: context.sections,
                metadata: context.metadata
            }
        });

    } catch (error) {
        console.error('[AgentsContext API] Error parsing AGENTS.md:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// CLAUDE CODE INTEGRATION ENDPOINTS
// ==========================================

/**
 * POST /api/agents-context/enhance-claude-integration
 * Enhance existing Claude Code integration with AGENTS.md context
 */
router.post('/enhance-claude-integration', async (req, res) => {
    try {
        const { synthesis, userContext, expertPlans, workingDirectory } = req.body;
        
        if (!synthesis || !userContext) {
            return res.status(400).json({
                success: false,
                error: 'Synthesis and userContext are required'
            });
        }

        console.log(`[AgentsContext API] Enhancing Claude integration for: ${userContext.projectDescription}`);

        const result = await agentsService.enhanceClaudeCodeIntegrationPrompt(
            synthesis,
            userContext,
            expertPlans || [],
            workingDirectory || process.cwd()
        );

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('[AgentsContext API] Error enhancing Claude integration:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// CACHE MANAGEMENT ENDPOINTS
// ==========================================

/**
 * DELETE /api/agents-context/cache
 * Clear the context cache
 */
router.delete('/cache', (req, res) => {
    try {
        agentsService.clearCache();
        
        res.json({
            success: true,
            message: 'Context cache cleared successfully'
        });

    } catch (error) {
        console.error('[AgentsContext API] Error clearing cache:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/agents-context/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', (req, res) => {
    try {
        const stats = agentsService.getCacheStats();
        
        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('[AgentsContext API] Error getting cache stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// HEALTH CHECK ENDPOINT
// ==========================================

/**
 * GET /api/agents-context/health
 * Health check for the AGENTS.md context service
 */
router.get('/health', (req, res) => {
    try {
        const stats = agentsService.getCacheStats();
        
        res.json({
            success: true,
            service: 'AGENTS.md Context Integration',
            status: 'healthy',
            cache: {
                entries: stats.entriesCount,
                timeout: stats.cacheTimeout
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[AgentsContext API] Health check failed:', error);
        res.status(500).json({
            success: false,
            service: 'AGENTS.md Context Integration',
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;