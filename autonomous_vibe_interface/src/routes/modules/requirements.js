/**
 * Requirements Module
 * Handles project requirements analysis and brief generation
 */

const express = require('express');
const router = express.Router();
const { IntelligentQuestioner } = require('../../requirements/intelligent-questioner');

// Initialize questioner with Claude Code API key from environment
const questioner = new IntelligentQuestioner(
    process.env.CLAUDE_CODE_API_KEY || process.env.ANTHROPIC_API_KEY || 'demo_key_for_testing'
);

// Analyze requirements endpoint
router.post('/analyze', async (req, res) => {
    try {
        const { request, projectType = 'website' } = req.body;
        
        if (!request) {
            return res.status(400).json({
                success: false,
                error: 'Request description is required'
            });
        }

        console.log(`📋 Analyzing requirements for: ${request.substring(0, 50)}...`);
        
        // Get questions for the project type (using template-based approach)
        const templates = questioner.questionTemplates[projectType] || questioner.questionTemplates.website;
        const questions = templates.essential || [];
        
        res.json({
            success: true,
            projectType,
            questions,
            sessionId: `req_${Date.now()}`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Requirements analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to analyze requirements'
        });
    }
});

// Generate enhanced brief endpoint
router.post('/generate-brief', async (req, res) => {
    try {
        const { request, answers, projectType = 'website' } = req.body;
        
        if (!request) {
            return res.status(400).json({
                success: false,
                error: 'Request description is required'
            });
        }

        console.log(`📝 Generating enhanced brief for: ${request.substring(0, 50)}...`);
        
        // Generate enhanced brief from answers (simplified version)
        const brief = {
            originalRequest: request,
            projectType,
            answers: answers || {},
            timestamp: new Date().toISOString(),
            summary: `Project: ${projectType} - ${request}`,
            requirements: Object.entries(answers || {}).map(([q, a]) => ({
                question: q,
                answer: a
            }))
        };
        
        res.json({
            success: true,
            brief,
            projectType,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Brief generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate brief'
        });
    }
});

// Get question templates endpoint
router.get('/templates/:projectType?', (req, res) => {
    const { projectType = 'website' } = req.params;
    
    const templates = questioner.questionTemplates[projectType] || questioner.questionTemplates.website;
    
    res.json({
        success: true,
        projectType,
        templates,
        availableTypes: Object.keys(questioner.questionTemplates)
    });
});

module.exports = router;