/**
 * VibeCoach API Routes
 * 
 * Provides real coaching data endpoints for the new coder dashboard.
 * Replaces mock data with actual insights from coding activity.
 */

const express = require('express');
const router = express.Router();

// Use global VibeCoach service for consistency across the app
let vibeCoach;

// Middleware to ensure VibeCoach is ready
router.use((req, res, next) => {
    // Get global VibeCoach service
    vibeCoach = global.vibeCoachService;
    
    if (!vibeCoach) {
        return res.status(503).json({
            success: false,
            error: 'VibeCoach service not available',
            fallback: true
        });
    }
    next();
});

/**
 * GET /api/claude/coaching/progress
 * Returns real project progress data
 */
router.get('/progress', async (req, res) => {
    try {
        const coachingData = vibeCoach.getCoachingData();
        
        res.json({
            success: true,
            progress: {
                currentPhase: coachingData.progress.currentPhase,
                milestonesReached: coachingData.progress.milestonesReached,
                totalMilestones: coachingData.progress.totalMilestones,
                recentWin: coachingData.progress.recentWin || 'Just getting started! 🌱',
                filesCreated: coachingData.progress.filesCreated,
                filesModified: coachingData.progress.filesModified,
                sessionDuration: Math.floor((Date.now() - vibeCoach.sessionData.startTime) / 60000) // minutes
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting progress data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve progress data',
            fallback: true
        });
    }
});

/**
 * GET /api/claude/coaching/confidence  
 * Returns AI confidence levels with explanations
 */
router.get('/confidence', async (req, res) => {
    try {
        const coachingData = vibeCoach.getCoachingData();
        const confidence = coachingData.confidence;
        
        // Calculate confidence level from percentage
        let level, emoji;
        if (confidence.overallPercentage >= 80) {
            level = 'High';
            emoji = '💚';
        } else if (confidence.overallPercentage >= 60) {
            level = 'Good';
            emoji = '💛';
        } else {
            level = 'Building';
            emoji = '🧡';
        }
        
        res.json({
            success: true,
            confidence: {
                overall: {
                    level,
                    emoji,
                    percentage: confidence.overallPercentage
                },
                feelingGoodAbout: confidence.feelingGoodAbout,
                doubleCheckSuggestion: confidence.doubleCheckSuggestion,
                suggestionQuality: confidence.suggestionQuality,
                reasoning: `Based on your recent coding activity and error resolution patterns. Your ${level.toLowerCase()} confidence reflects ${confidence.overallPercentage}% positive indicators.`
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting confidence data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve confidence data',
            fallback: true
        });
    }
});

/**
 * GET /api/claude/coaching/next-steps
 * Returns personalized next steps based on current progress
 */
router.get('/next-steps', async (req, res) => {
    try {
        const coachingData = vibeCoach.getCoachingData();
        
        res.json({
            success: true,
            nextSteps: coachingData.nextSteps.map(step => ({
                ...step,
                id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            })),
            count: coachingData.nextSteps.length,
            generatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting next steps:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve next steps',
            fallback: true
        });
    }
});

/**
 * GET /api/claude/coaching/learning
 * Returns learning progress and skill development
 */
router.get('/learning', async (req, res) => {
    try {
        const coachingData = vibeCoach.getCoachingData();
        const learning = coachingData.learning;
        
        res.json({
            success: true,
            learning: {
                skills: learning.skills,
                htmlSkills: learning.htmlSkills,
                cssSkills: learning.cssSkills,
                jsSkills: learning.jsSkills,
                problemSolving: learning.problemSolving,
                activeLearning: learning.activeLearning,
                skillsLeveledUp: learning.skillsLeveledUp,
                nextSkill: learning.nextSkill,
                progressSummary: `You're making great progress! HTML: ${learning.htmlSkills}%, CSS: ${learning.cssSkills}%, JS: ${learning.jsSkills}%`,
                encouragement: getEncouragementMessage(learning.skills)
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting learning data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve learning data',
            fallback: true
        });
    }
});

/**
 * GET /api/claude/coaching/problems
 * Returns problem detection and health status
 */
router.get('/problems', async (req, res) => {
    try {
        const coachingData = vibeCoach.getCoachingData();
        const problems = coachingData.problems;
        
        res.json({
            success: true,
            problems: {
                currentStatus: problems.currentStatus,
                mostRecent: problems.mostRecent,
                healthScore: problems.healthScore,
                errorTracking: {
                    errorsToday: vibeCoach.sessionData.errorTracking.errorsToday,
                    errorsResolved: vibeCoach.sessionData.errorTracking.errorsResolved,
                    resolutionRate: vibeCoach.sessionData.errorTracking.errorsToday > 0 ? 
                        Math.round((vibeCoach.sessionData.errorTracking.errorsResolved / vibeCoach.sessionData.errorTracking.errorsToday) * 100) : 100
                },
                encouragement: getHealthEncouragement(problems.healthScore)
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting problems data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve problems data',
            fallback: true
        });
    }
});

/**
 * GET /api/claude/coaching/achievements
 * Returns recent achievements and accomplishments
 */
router.get('/achievements', async (req, res) => {
    try {
        const coachingData = vibeCoach.getCoachingData();
        
        res.json({
            success: true,
            achievements: coachingData.achievements.map(achievement => ({
                ...achievement,
                timeAgo: getTimeAgo(achievement.time),
                category: achievement.category || 'general'
            })),
            count: coachingData.achievements.length,
            latest: coachingData.achievements[0] || null
        });
        
    } catch (error) {
        console.error('Error getting achievements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve achievements',
            fallback: true
        });
    }
});

/**
 * POST /api/claude/coaching/track-activity
 * Track coding activity (file changes, etc.)
 */
router.post('/track-activity', async (req, res) => {
    try {
        const { eventType, filePath, metadata } = req.body;
        
        if (!eventType || !filePath) {
            return res.status(400).json({
                success: false,
                error: 'eventType and filePath are required'
            });
        }
        
        await vibeCoach.trackFileActivity(eventType, filePath, metadata);
        
        res.json({
            success: true,
            message: 'Activity tracked successfully',
            eventType,
            filePath
        });
        
    } catch (error) {
        console.error('Error tracking activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track activity'
        });
    }
});

/**
 * POST /api/claude/coaching/track-error
 * Track error events from Error Doctor
 */
router.post('/track-error', async (req, res) => {
    try {
        const { errorType, errorMessage, resolved = false } = req.body;
        
        if (!errorType) {
            return res.status(400).json({
                success: false,
                error: 'errorType is required'
            });
        }
        
        await vibeCoach.trackError(errorType, errorMessage, resolved);
        
        res.json({
            success: true,
            message: resolved ? 'Error resolution tracked' : 'Error tracked',
            errorType,
            resolved
        });
        
    } catch (error) {
        console.error('Error tracking error event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track error event'
        });
    }
});

/**
 * GET /api/claude/coaching/status
 * Get overall VibeCoach status and health
 */
router.get('/status', async (req, res) => {
    try {
        const coachingData = vibeCoach.getCoachingData();
        
        res.json({
            success: true,
            status: {
                serviceStatus: 'active',
                dataQuality: 'real', // vs 'fallback' or 'mock'
                lastUpdate: new Date().toISOString(),
                sessionDuration: Math.floor((Date.now() - vibeCoach.sessionData.startTime) / 60000),
                categories: {
                    progress: 'active',
                    confidence: 'active', 
                    learning: 'active',
                    problems: 'active',
                    achievements: 'active'
                },
                summary: generateStatusSummary(coachingData)
            }
        });
        
    } catch (error) {
        console.error('Error getting VibeCoach status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve VibeCoach status'
        });
    }
});

// Helper functions
function getEncouragementMessage(skills) {
    const avgSkill = Object.values(skills).reduce((a, b) => a + b, 0) / Object.keys(skills).length;
    
    if (avgSkill >= 70) return 'You\'re becoming a coding ninja! 🥷';
    if (avgSkill >= 50) return 'Great progress - you\'re really getting this! 🚀';
    if (avgSkill >= 30) return 'You\'re building solid foundations! 🏗️';
    return 'Every expert was once a beginner - keep going! 🌱';
}

function getHealthEncouragement(healthScore) {
    if (healthScore >= 90) return 'Your code health is excellent! 💚';
    if (healthScore >= 75) return 'Looking good - minor tweaks will make it perfect! 💛';
    if (healthScore >= 60) return 'Some areas to improve, but you\'re on the right track! 🧡';
    return 'Let\'s tackle these issues together - you\'ve got this! 💪';
}

function getTimeAgo(timestamp) {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function generateStatusSummary(coachingData) {
    const { progress, learning, problems } = coachingData;
    const avgSkill = Object.values(learning.skills).reduce((a, b) => a + b, 0) / Object.keys(learning.skills).length;
    
    let status = 'Getting started';
    if (avgSkill >= 60) status = 'Making great progress';
    if (avgSkill >= 40) status = 'Building solid skills';
    
    return `${status} - ${progress.currentPhase} with ${problems.healthScore}% code health`;
}

module.exports = router;