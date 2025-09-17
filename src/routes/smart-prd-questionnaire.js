/**
 * Smart PRD Questionnaire API Routes
 * 
 * Provides REST API endpoints for the Smart Repository Patterns PRD Generator
 * questionnaire system. Handles session management, question generation,
 * answer submission, and completion.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QuestionnaireOrchestrator = require('../services/pattern-engine/QuestionnaireOrchestrator');
const DocumentGenerator = require('../services/pattern-engine/DocumentGenerator');

const router = express.Router();

// Initialize orchestrator (singleton)
let orchestrator = null;

async function getOrchestrator() {
    if (!orchestrator) {
        orchestrator = new QuestionnaireOrchestrator({
            logger: console
        });
        await orchestrator.initialize();
    }
    return orchestrator;
}

/**
 * Start a new questionnaire session
 */
router.post('/sessions', async (req, res) => {
    try {
        const { userContext = {} } = req.body;
        const sessionId = uuidv4();
        
        const orch = await getOrchestrator();
        const session = await orch.startQuestionnaire(sessionId, userContext);
        
        res.json({
            success: true,
            sessionId,
            status: session.status,
            message: 'Questionnaire session started'
        });
        
    } catch (error) {
        console.error('Error starting questionnaire session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start questionnaire session',
            details: error.message
        });
    }
});

/**
 * Get the next question for a session
 */
router.get('/sessions/:sessionId/next-question', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const orch = await getOrchestrator();
        const question = await orch.getNextQuestion(sessionId);
        
        if (!question) {
            // Questionnaire is complete
            const summary = orch.getSessionSummary(sessionId);
            
            res.json({
                success: true,
                completed: true,
                summary,
                message: 'Questionnaire completed'
            });
        } else {
            res.json({
                success: true,
                completed: false,
                question,
                progress: await getSessionProgress(orch, sessionId)
            });
        }
        
    } catch (error) {
        console.error('Error getting next question:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get next question',
            details: error.message
        });
    }
});

/**
 * Submit an answer for a question
 */
router.post('/sessions/:sessionId/answers', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { questionId, answer } = req.body;
        
        if (!questionId || answer === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing questionId or answer'
            });
        }
        
        const orch = await getOrchestrator();
        const result = await orch.submitAnswer(sessionId, questionId, answer);
        
        res.json({
            success: true,
            result,
            message: 'Answer submitted successfully'
        });
        
    } catch (error) {
        console.error('Error submitting answer:', error);
        
        if (error.message.includes('not found') || error.message.includes('Invalid answer')) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to submit answer',
                details: error.message
            });
        }
    }
});

/**
 * Get session status and summary
 */
router.get('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const orch = await getOrchestrator();
        const summary = orch.getSessionSummary(sessionId);
        
        res.json({
            success: true,
            session: summary
        });
        
    } catch (error) {
        console.error('Error getting session summary:', error);
        
        if (error.message.includes('not found')) {
            res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to get session summary',
                details: error.message
            });
        }
    }
});

/**
 * Complete a questionnaire session
 */
router.post('/sessions/:sessionId/complete', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const orch = await getOrchestrator();
        const summary = await orch.completeSession(sessionId);
        
        res.json({
            success: true,
            completed: true,
            summary,
            message: 'Questionnaire session completed'
        });
        
    } catch (error) {
        console.error('Error completing session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete session',
            details: error.message
        });
    }
});

/**
 * Generate PRD from completed questionnaire
 */
router.post('/sessions/:sessionId/generate-prd', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { format = 'markdown', options = {} } = req.body;
        
        const orch = await getOrchestrator();
        const summary = orch.getSessionSummary(sessionId);
        
        if (summary.status !== 'completed') {
            return res.status(400).json({
                success: false,
                error: 'Questionnaire session not completed'
            });
        }
        
        if (!summary.selectedPattern) {
            return res.status(400).json({
                success: false,
                error: 'No pattern selected for PRD generation'
            });
        }
        
        // Generate PRD document
        const docGenerator = new DocumentGenerator();
        await docGenerator.initialize();
        
        const prd = await docGenerator.generatePRD(
            summary.selectedPattern,
            summary.answers,
            {
                format,
                sessionId,
                ...options
            }
        );
        
        res.json({
            success: true,
            prd,
            format,
            sessionSummary: summary,
            message: 'PRD generated successfully'
        });
        
    } catch (error) {
        console.error('Error generating PRD:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PRD',
            details: error.message
        });
    }
});

/**
 * Get available patterns (for browsing)
 */
router.get('/patterns', async (req, res) => {
    try {
        const { category, tags, complexity } = req.query;
        
        const orch = await getOrchestrator();
        const patterns = await orch.patternEngine.getAllPatterns({
            category,
            tags: tags ? tags.split(',') : undefined,
            complexity
        });
        
        // Return simplified pattern info for browsing
        const simplifiedPatterns = patterns.map(pattern => ({
            id: pattern.id,
            name: pattern.metadata.name,
            category: pattern.metadata.category,
            complexity: pattern.metadata.complexity,
            successRate: pattern.metadata.successRate,
            avgTimeToPMF: pattern.metadata.avgTimeToPMF,
            tags: pattern.metadata.tags,
            description: pattern.description
        }));
        
        res.json({
            success: true,
            patterns: simplifiedPatterns,
            count: simplifiedPatterns.length
        });
        
    } catch (error) {
        console.error('Error getting patterns:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get patterns',
            details: error.message
        });
    }
});

/**
 * Get pattern statistics
 */
router.get('/patterns/stats', async (req, res) => {
    try {
        const orch = await getOrchestrator();
        const stats = orch.patternEngine.getStatistics();
        
        res.json({
            success: true,
            statistics: stats
        });
        
    } catch (error) {
        console.error('Error getting pattern statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get pattern statistics',
            details: error.message
        });
    }
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
    try {
        const orch = await getOrchestrator();
        const activeSessions = orch.getActiveSessions();
        
        res.json({
            success: true,
            status: 'healthy',
            activeSessions: activeSessions.length,
            patternsLoaded: orch.patternEngine.patterns.size,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

/**
 * Helper function to calculate session progress
 */
async function getSessionProgress(orchestrator, sessionId) {
    try {
        const summary = orchestrator.getSessionSummary(sessionId);
        
        // Estimate progress based on questions answered and confidence
        const questionsAnswered = Object.keys(summary.answers).length;
        const estimatedTotal = Math.max(
            orchestrator.config.minQuestions,
            Math.min(orchestrator.config.maxQuestions, questionsAnswered + 3)
        );
        
        const progressPercentage = Math.round((questionsAnswered / estimatedTotal) * 100);
        
        return {
            questionsAnswered,
            estimatedTotal,
            progressPercentage,
            confidenceScore: summary.confidenceScore || 0,
            status: summary.status
        };
        
    } catch (error) {
        return {
            questionsAnswered: 0,
            estimatedTotal: 5,
            progressPercentage: 0,
            confidenceScore: 0,
            status: 'unknown'
        };
    }
}

// Cleanup expired sessions every hour
setInterval(() => {
    if (orchestrator) {
        orchestrator.cleanupSessions();
    }
}, 60 * 60 * 1000);

module.exports = router;