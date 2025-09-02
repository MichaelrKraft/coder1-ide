/**
 * AI Coach Integration API Routes
 * 
 * Provides intelligent, context-aware development coaching and recommendations
 * using Claude Code CLI for personalized guidance and next steps.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class AICoachService {
    constructor() {
        this.claudeCodeExec = null;
        this.coachingHistory = [];
        this.userContext = {
            skill_level: 'intermediate',
            preferences: {},
            goals: [],
            recent_activities: []
        };
        this.initialize();
    }

    async initialize() {
        try {
            // Initialize Claude Code CLI integration
            const ClaudeCodeExec = require('../integrations/claude-code-exec');
            this.claudeCodeExec = new ClaudeCodeExec({
                implementationMode: false,
                timeout: 30000,
                logger: console
            });
            
            console.log('✅ AI Coach Service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize AI Coach Service:', error);
        }
    }

    async analyzeProjectContext() {
        const context = {
            projectType: 'unknown',
            technologies: [],
            complexity: 'medium',
            issues: [],
            opportunities: []
        };

        try {
            // Analyze project structure
            const files = await fs.readdir(process.cwd());
            
            // Detect project type
            if (files.includes('package.json')) {
                context.projectType = 'nodejs';
                const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
                
                // Extract technologies from dependencies
                const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                context.technologies = Object.keys(allDeps).slice(0, 10);
                
                // Determine complexity based on dependency count
                const depCount = Object.keys(allDeps).length;
                if (depCount > 50) context.complexity = 'high';
                else if (depCount < 10) context.complexity = 'low';
            }

            // Check for common issues
            if (!files.includes('README.md')) {
                context.issues.push('Missing project documentation');
            }
            
            if (!files.includes('.gitignore')) {
                context.issues.push('Missing .gitignore file');
            }

            if (!files.some(f => f.includes('test') || f.includes('spec'))) {
                context.issues.push('No test files detected');
            }

            // Check git status for opportunities
            try {
                const { stdout: gitStatus } = await execAsync('git status --porcelain 2>/dev/null');
                if (gitStatus.trim()) {
                    context.opportunities.push('Commit pending changes');
                }
                
                const { stdout: gitLog } = await execAsync('git log --oneline -5 2>/dev/null');
                if (!gitLog.trim()) {
                    context.opportunities.push('Initialize git repository');
                }
            } catch (error) {
                context.issues.push('Not a git repository');
            }

            // Analyze recent file modifications
            try {
                const { stdout: recentFiles } = await execAsync('find . -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" | head -10 2>/dev/null');
                context.recentFiles = recentFiles.trim().split('\n').filter(Boolean);
            } catch (error) {
                context.recentFiles = [];
            }

        } catch (error) {
            console.error('Error analyzing project context:', error);
        }

        return context;
    }

    async generateNextSteps() {
        try {
            const projectContext = await this.analyzeProjectContext();
            
            if (!this.claudeCodeExec) {
                // Fallback to rule-based recommendations
                return this.generateRuleBasedRecommendations(projectContext);
            }

            // Create context-aware prompt for Claude
            const prompt = this.buildCoachingPrompt(projectContext);
            
            console.log('🤖 Generating AI-powered coaching recommendations...');
            
            const response = await this.claudeCodeExec.executePrompt(prompt, {
                systemPrompt: this.getCoachSystemPrompt(),
                maxTokens: 2000
            });

            // Parse Claude's response
            const recommendations = this.parseAIResponse(response);
            
            // Store coaching history
            this.coachingHistory.push({
                timestamp: new Date().toISOString(),
                context: projectContext,
                recommendations,
                source: 'claude-ai'
            });

            return {
                success: true,
                recommendations,
                context: projectContext,
                confidence: 'high',
                source: 'ai-powered'
            };

        } catch (error) {
            console.error('AI coaching failed, falling back to rule-based:', error);
            const projectContext = await this.analyzeProjectContext();
            const recommendations = this.generateRuleBasedRecommendations(projectContext);
            
            return {
                success: true,
                recommendations,
                context: projectContext,
                confidence: 'medium',
                source: 'rule-based',
                fallback: true
            };
        }
    }

    buildCoachingPrompt(projectContext) {
        return `As an experienced software development coach, analyze this project and provide 3-5 personalized next steps:

PROJECT ANALYSIS:
- Type: ${projectContext.projectType}
- Technologies: ${projectContext.technologies.join(', ')}
- Complexity: ${projectContext.complexity}
- Issues Found: ${projectContext.issues.join(', ') || 'None'}
- Opportunities: ${projectContext.opportunities.join(', ') || 'None'}

CONTEXT:
- Recent files: ${projectContext.recentFiles?.slice(0, 5).join(', ') || 'None detected'}
- Working directory: ${process.cwd().split('/').pop()}

Please provide specific, actionable recommendations in this JSON format:
{
  "recommendations": [
    {
      "title": "Brief title (under 50 characters)",
      "description": "Clear explanation of what to do",
      "priority": "high|medium|low",
      "timeEstimate": "estimated time (e.g., '15 min')",
      "category": "code|documentation|testing|deployment|learning",
      "actionType": "implement|review|research|refactor|setup"
    }
  ]
}

Focus on practical, immediate actions that will improve code quality, productivity, or learning outcomes.`;
    }

    getCoachSystemPrompt() {
        return `You are an expert software development coach and mentor. Your role is to:

1. Provide actionable, specific guidance tailored to the developer's current project
2. Prioritize tasks that have immediate practical value
3. Balance technical improvement with learning opportunities
4. Consider the project's complexity and the developer's apparent skill level
5. Suggest concrete next steps rather than vague advice

Guidelines:
- Keep recommendations focused and achievable
- Prioritize high-impact, low-effort improvements
- Include learning opportunities when appropriate
- Always provide realistic time estimates
- Focus on best practices and industry standards
- Be encouraging and constructive

Remember: You're coaching a real developer working on a real project. Make your advice practical and immediately applicable.`;
    }

    parseAIResponse(response) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
                    return parsed.recommendations.map(rec => ({
                        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        title: rec.title || 'AI Recommendation',
                        description: rec.description || 'No description provided',
                        priority: rec.priority || 'medium',
                        timeEstimate: rec.timeEstimate || '10 min',
                        category: rec.category || 'general',
                        actionType: rec.actionType || 'implement',
                        source: 'ai-generated'
                    }));
                }
            }
        } catch (error) {
            console.warn('Failed to parse AI JSON response:', error);
        }

        // Fallback: extract recommendations from plain text
        const lines = response.split('\n').filter(line => line.trim());
        const recommendations = [];
        
        for (let i = 0; i < Math.min(lines.length, 5); i++) {
            const line = lines[i].trim();
            if (line.length > 10) {
                recommendations.push({
                    id: `ai-text-${Date.now()}-${i}`,
                    title: line.substring(0, 50).replace(/^\d+\.?\s*/, ''),
                    description: line,
                    priority: i === 0 ? 'high' : 'medium',
                    timeEstimate: '15 min',
                    category: 'general',
                    actionType: 'implement',
                    source: 'ai-text'
                });
            }
        }

        return recommendations.slice(0, 3);
    }

    generateRuleBasedRecommendations(projectContext) {
        const recommendations = [];
        
        // Priority recommendations based on issues
        if (projectContext.issues.includes('Missing project documentation')) {
            recommendations.push({
                id: 'add-readme',
                title: 'Create README.md',
                description: 'Add project documentation with setup instructions and usage examples',
                priority: 'high',
                timeEstimate: '20 min',
                category: 'documentation',
                actionType: 'setup'
            });
        }

        if (projectContext.issues.includes('No test files detected')) {
            recommendations.push({
                id: 'add-tests',
                title: 'Add unit tests',
                description: 'Set up testing framework and write basic test cases for core functionality',
                priority: 'high',
                timeEstimate: '45 min',
                category: 'testing',
                actionType: 'setup'
            });
        }

        if (projectContext.opportunities.includes('Commit pending changes')) {
            recommendations.push({
                id: 'commit-changes',
                title: 'Commit pending changes',
                description: 'Review and commit your current work to preserve progress',
                priority: 'high',
                timeEstimate: '5 min',
                category: 'code',
                actionType: 'implement'
            });
        }

        if (projectContext.issues.includes('Missing .gitignore file')) {
            recommendations.push({
                id: 'add-gitignore',
                title: 'Add .gitignore file',
                description: 'Create .gitignore to exclude build files and sensitive data from version control',
                priority: 'medium',
                timeEstimate: '10 min',
                category: 'setup',
                actionType: 'setup'
            });
        }

        // Technology-specific recommendations
        if (projectContext.technologies.includes('react')) {
            recommendations.push({
                id: 'react-optimization',
                title: 'Optimize React components',
                description: 'Review components for unnecessary re-renders and apply React.memo where appropriate',
                priority: 'medium',
                timeEstimate: '30 min',
                category: 'code',
                actionType: 'refactor'
            });
        }

        if (projectContext.projectType === 'nodejs' && projectContext.complexity === 'high') {
            recommendations.push({
                id: 'dependency-audit',
                title: 'Audit dependencies',
                description: 'Run security audit and update outdated packages',
                priority: 'medium',
                timeEstimate: '15 min',
                category: 'maintenance',
                actionType: 'review'
            });
        }

        // General improvement recommendations
        if (recommendations.length < 3) {
            recommendations.push(
                {
                    id: 'code-review',
                    title: 'Review recent code changes',
                    description: 'Take a moment to review and refactor recent code for clarity and performance',
                    priority: 'low',
                    timeEstimate: '20 min',
                    category: 'code',
                    actionType: 'review'
                },
                {
                    id: 'learn-something-new',
                    title: 'Explore a new feature',
                    description: 'Learn about a new technology or feature that could benefit your project',
                    priority: 'low',
                    timeEstimate: '30 min',
                    category: 'learning',
                    actionType: 'research'
                }
            );
        }

        return recommendations.slice(0, 5);
    }

    async getCoachingHistory(limit = 10) {
        return this.coachingHistory
            .slice(-limit)
            .reverse()
            .map(entry => ({
                timestamp: entry.timestamp,
                recommendationsCount: entry.recommendations.length,
                source: entry.source,
                confidence: entry.confidence || 'medium'
            }));
    }

    async updateUserContext(updates) {
        this.userContext = {
            ...this.userContext,
            ...updates,
            lastUpdated: new Date().toISOString()
        };
    }
}

// Global AI coach service instance
const aiCoachService = new AICoachService();

// API Routes

/**
 * GET /api/ai-coach/next-steps
 * Returns intelligent next steps and recommendations
 */
router.get('/next-steps', async (req, res) => {
    try {
        const result = await aiCoachService.generateNextSteps();
        
        res.json({
            success: true,
            suggestions: result.recommendations,
            context: result.context,
            confidence: result.confidence,
            source: result.source,
            fallback: result.fallback || false,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error generating next steps:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            suggestions: [
                {
                    id: 'fallback-1',
                    title: 'Keep coding!',
                    description: 'Continue with your current development tasks',
                    priority: 'medium',
                    timeEstimate: '∞',
                    category: 'general',
                    actionType: 'implement'
                }
            ]
        });
    }
});

/**
 * POST /api/ai-coach/feedback
 * Submit feedback on coaching recommendations
 */
router.post('/feedback', async (req, res) => {
    try {
        const { recommendationId, helpful, completed, notes } = req.body;
        
        // Store feedback for improvement
        const feedback = {
            id: recommendationId,
            helpful: Boolean(helpful),
            completed: Boolean(completed),
            notes: notes || '',
            timestamp: new Date().toISOString()
        };
        
        // TODO: Store feedback for ML improvement
        console.log('📝 AI Coach feedback received:', feedback);
        
        res.json({
            success: true,
            message: 'Feedback recorded',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error recording feedback:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/ai-coach/history
 * Returns coaching history and analytics
 */
router.get('/history', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const history = await aiCoachService.getCoachingHistory(parseInt(limit));
        
        res.json({
            success: true,
            history,
            totalSessions: aiCoachService.coachingHistory.length,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error fetching coaching history:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/ai-coach/context
 * Update user context and preferences
 */
router.put('/context', async (req, res) => {
    try {
        const updates = req.body;
        await aiCoachService.updateUserContext(updates);
        
        res.json({
            success: true,
            message: 'User context updated',
            context: aiCoachService.userContext,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error updating user context:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/ai-coach/health
 * Health check for AI coach service
 */
router.get('/health', async (req, res) => {
    try {
        const claudeAvailable = aiCoachService.claudeCodeExec !== null;
        
        res.json({
            success: true,
            status: 'healthy',
            claudeCodeIntegration: claudeAvailable,
            sessionsTotal: aiCoachService.coachingHistory.length,
            uptime: process.uptime(),
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Export AI coach service for use by other services
module.exports = { 
    router,
    aiCoachService
};