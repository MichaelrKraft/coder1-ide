/**
 * Repository Intelligence API Routes
 * Provides endpoints for repository analysis and code suggestions
 */

const express = require('express');
const router = express.Router();
const { getInstance: getRepositoryEngine } = require('../integrations/repository-intelligence-engine');

// Get repository status
router.get('/status', async (req, res) => {
    try {
        const engine = getRepositoryEngine();
        const status = engine.getRepositoryStatus();
        
        // Get active repository if any
        let activeRepository = null;
        if (status.repositories && status.repositories.length > 0) {
            // Get the most recently analyzed repository as active
            activeRepository = status.repositories[0];
        }
        
        res.json({
            success: true,
            ...status,
            activeRepository
        });
    } catch (error) {
        console.error('Error getting repository status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get repository status'
        });
    }
});

// Get code suggestions based on repository intelligence
router.post('/suggestions', async (req, res) => {
    try {
        const { repoId, currentCode, cursorPosition, lineContent, language } = req.body;
        
        if (!repoId) {
            return res.json({
                success: true,
                suggestions: [] // No suggestions without a repository
            });
        }
        
        const engine = getRepositoryEngine();
        const result = await engine.getCodeSuggestions(
            repoId,
            currentCode,
            cursorPosition,
            { lineContent, language }
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error getting code suggestions:', error);
        res.json({
            success: false,
            suggestions: [],
            error: error.message
        });
    }
});

// Analyze repository (can be called from frontend)
router.post('/analyze', async (req, res) => {
    try {
        const { url, forceRefresh } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'Repository URL is required'
            });
        }
        
        const engine = getRepositoryEngine();
        const result = await engine.analyzeRepository(url, { forceRefresh });
        
        res.json(result);
    } catch (error) {
        console.error('Error analyzing repository:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Query repository with a question
router.post('/query', async (req, res) => {
    try {
        const { repoId, question } = req.body;
        
        if (!repoId || !question) {
            return res.status(400).json({
                success: false,
                error: 'Repository ID and question are required'
            });
        }
        
        const engine = getRepositoryEngine();
        const result = await engine.queryRepository(repoId, question);
        
        res.json(result);
    } catch (error) {
        console.error('Error querying repository:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// List all analyzed repositories
router.get('/list', async (req, res) => {
    try {
        const engine = getRepositoryEngine();
        const status = engine.getRepositoryStatus();
        
        res.json({
            success: true,
            repositories: status.repositories || [],
            total: status.totalRepositories || 0
        });
    } catch (error) {
        console.error('Error listing repositories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list repositories'
        });
    }
});

module.exports = router;