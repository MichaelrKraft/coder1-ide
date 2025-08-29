/**
 * VibeCoach AI Service
 * 
 * Provides real-time coaching insights for new coders by collecting and analyzing
 * actual coding activity, errors, and learning patterns.
 * 
 * Core Philosophy: Educational transparency and confidence building for beginners
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class VibeCoachService extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            memoryPath: options.memoryPath || path.join(__dirname, '../../../.coder1/memory'),
            refreshInterval: options.refreshInterval || 30000, // 30 seconds
            maxHistoryItems: options.maxHistoryItems || 100,
            confidenceThreshold: options.confidenceThreshold || 0.7
        };
        
        // Data storage
        this.sessionData = {
            startTime: Date.now(),
            projectProgress: {
                filesCreated: 0,
                filesModified: 0,
                currentPhase: 'Getting Started 🌱',
                milestonesReached: 0,
                totalMilestones: 10,
                recentWin: null
            },
            skillDevelopment: {
                htmlConcepts: new Set(),
                cssConcepts: new Set(),
                jsConcepts: new Set(),
                problemsSolved: 0,
                skillLevels: {
                    html: 20,
                    css: 15,
                    js: 10,
                    problemSolving: 25
                }
            },
            aiConfidence: {
                overallLevel: 'Medium',
                overallPercentage: 75,
                feelingGoodAbout: 'Your HTML structure',
                doubleCheckSuggestion: 'Let\'s review CSS positioning',
                suggestionQuality: 80,
                lastAnalysis: Date.now()
            },
            errorTracking: {
                errorsToday: 0,
                errorsResolved: 0,
                commonErrors: [],
                healthScore: 85,
                lastErrorTime: null
            },
            achievements: [],
            nextSteps: []
        };
        
        // Initialize service
        this.initialize();
    }
    
    async initialize() {
        try {
            await this.loadPersistedData();
            this.startDataCollection();
            console.log('✅ VibeCoach Service initialized successfully');
        } catch (error) {
            console.error('❌ VibeCoach Service initialization failed:', error);
        }
    }
    
    // Load persisted coaching data
    async loadPersistedData() {
        try {
            const vibeMetricsPath = path.join(this.config.memoryPath, 'vibe-metrics.json');
            
            try {
                const data = await fs.readFile(vibeMetricsPath, 'utf8');
                const persistedData = JSON.parse(data);
                
                // Merge with current session data
                this.sessionData = {
                    ...this.sessionData,
                    ...persistedData,
                    startTime: Date.now() // Reset session start time
                };
                
                console.log('📊 Loaded persisted VibeCoach data');
            } catch (fileError) {
                console.log('📝 No existing vibe metrics found, starting fresh');
                await this.saveData();
            }
            
            // Load agent insights for additional context
            await this.loadAgentInsights();
            
        } catch (error) {
            console.warn('⚠️ Could not load persisted data:', error.message);
        }
    }
    
    // Load existing agent insights for context
    async loadAgentInsights() {
        try {
            const insightsPath = path.join(this.config.memoryPath, 'agent-insights.json');
            const insightsData = await fs.readFile(insightsPath, 'utf8');
            const insights = JSON.parse(insightsData);
            
            // Extract learning patterns from insights
            this.analyzeInsightsForLearning(insights);
            
        } catch (error) {
            console.log('📝 No agent insights available yet');
        }
    }
    
    // Analyze agent insights to extract learning patterns
    analyzeInsightsForLearning(insights) {
        if (!Array.isArray(insights)) return;
        
        insights.forEach(insight => {
            // Track different types of learning activity
            if (insight.metadata) {
                switch (insight.metadata.category) {
                case 'codeQuality':
                    this.sessionData.skillDevelopment.problemsSolved++;
                    break;
                case 'testing':
                    this.sessionData.skillDevelopment.jsConcepts.add('testing');
                    break;
                case 'documentation':
                    this.sessionData.skillDevelopment.htmlConcepts.add('documentation');
                    break;
                }
            }
            
            // Update confidence based on insight usage
            if (insight.confidence > 0.8) {
                this.sessionData.aiConfidence.overallPercentage = Math.min(95, 
                    this.sessionData.aiConfidence.overallPercentage + 2);
            }
        });
        
        this.updateSkillLevels();
    }
    
    // Update skill levels based on collected data
    updateSkillLevels() {
        const { skillDevelopment } = this.sessionData;
        
        // Calculate skill levels based on concepts learned and usage
        skillDevelopment.skillLevels = {
            html: Math.min(95, 20 + (skillDevelopment.htmlConcepts.size * 8)),
            css: Math.min(90, 15 + (skillDevelopment.cssConcepts.size * 10)),
            js: Math.min(85, 10 + (skillDevelopment.jsConcepts.size * 12)),
            problemSolving: Math.min(90, 25 + (skillDevelopment.problemsSolved * 5))
        };
    }
    
    // Track file system activity
    async trackFileActivity(eventType, filePath, metadata = {}) {
        const { projectProgress } = this.sessionData;
        
        switch (eventType) {
        case 'created':
            projectProgress.filesCreated++;
            this.addAchievement(`Created ${path.basename(filePath)}! 📄`, 'file_creation');
            break;
                
        case 'modified':
            projectProgress.filesModified++;
                
            // Detect file types for skill tracking
            const ext = path.extname(filePath).toLowerCase();
            if (ext === '.html') {
                this.sessionData.skillDevelopment.htmlConcepts.add('file_editing');
            } else if (ext === '.css') {
                this.sessionData.skillDevelopment.cssConcepts.add('styling');
            } else if (ext === '.js') {
                this.sessionData.skillDevelopment.jsConcepts.add('scripting');
            }
            break;
        }
        
        // Update project phase based on activity
        this.updateProjectPhase();
        
        // Save updated data
        await this.saveData();
        
        // Emit event for real-time updates
        this.emit('activity', { eventType, filePath, projectProgress });
    }
    
    // Update project phase based on progress
    updateProjectPhase() {
        const { filesCreated, filesModified } = this.sessionData.projectProgress;
        const totalActivity = filesCreated + Math.floor(filesModified / 3);
        
        if (totalActivity > 15) {
            this.sessionData.projectProgress.currentPhase = 'Building Features 🏗️';
            this.sessionData.projectProgress.milestonesReached = Math.min(8, Math.floor(totalActivity / 2));
        } else if (totalActivity > 8) {
            this.sessionData.projectProgress.currentPhase = 'Developing Structure 🏛️';
            this.sessionData.projectProgress.milestonesReached = Math.min(5, Math.floor(totalActivity / 1.5));
        } else if (totalActivity > 3) {
            this.sessionData.projectProgress.currentPhase = 'Getting Organized 📁';
            this.sessionData.projectProgress.milestonesReached = Math.min(3, totalActivity);
        }
    }
    
    // Track error events from Error Doctor
    async trackError(errorType, errorMessage, resolved = false) {
        const { errorTracking } = this.sessionData;
        
        if (resolved) {
            errorTracking.errorsResolved++;
            this.addAchievement(`Fixed ${errorType} error! 🔧`, 'error_resolution');
            
            // Boost confidence when errors are resolved
            this.sessionData.aiConfidence.overallPercentage = Math.min(95, 
                this.sessionData.aiConfidence.overallPercentage + 5);
                
        } else {
            errorTracking.errorsToday++;
            errorTracking.lastErrorTime = Date.now();
            
            // Track common error types
            const existingError = errorTracking.commonErrors.find(e => e.type === errorType);
            if (existingError) {
                existingError.count++;
            } else {
                errorTracking.commonErrors.push({ type: errorType, count: 1, message: errorMessage });
            }
        }
        
        // Update health score
        const resolution_rate = errorTracking.errorsToday > 0 ? 
            (errorTracking.errorsResolved / errorTracking.errorsToday) * 100 : 100;
        errorTracking.healthScore = Math.max(50, Math.min(100, resolution_rate));
        
        await this.saveData();
        this.emit('error', { errorType, resolved, healthScore: errorTracking.healthScore });
    }
    
    // Add achievement with timestamp
    addAchievement(message, category = 'general') {
        const achievement = {
            message,
            category,
            time: Date.now(),
            emoji: this.getAchievementEmoji(category)
        };
        
        this.sessionData.achievements.unshift(achievement);
        
        // Keep only recent achievements
        if (this.sessionData.achievements.length > this.config.maxHistoryItems) {
            this.sessionData.achievements = this.sessionData.achievements.slice(0, this.config.maxHistoryItems);
        }
        
        // Update recent win
        this.sessionData.projectProgress.recentWin = message;
        
        this.emit('achievement', achievement);
    }
    
    // Get appropriate emoji for achievement category
    getAchievementEmoji(category) {
        const emojiMap = {
            file_creation: '📄',
            error_resolution: '🔧',
            skill_milestone: '🎓',
            productivity: '🚀',
            learning: '💡',
            general: '✨'
        };
        return emojiMap[category] || '🎉';
    }
    
    // Generate next steps based on current progress
    generateNextSteps() {
        const steps = [];
        const { skillLevels } = this.sessionData.skillDevelopment;
        const { errorsToday, commonErrors } = this.sessionData.errorTracking;
        
        // Skill-based suggestions
        if (skillLevels.html < 50) {
            steps.push({
                category: 'Learning',
                icon: '📚',
                content: 'Try adding semantic HTML elements like <header>, <nav>, and <main> to your page',
                timeEstimate: '20 min',
                priority: 'High Impact 🎯',
                confidence: 0.9,
                reasoning: 'Semantic HTML is a foundation skill that makes everything else easier'
            });
        }
        
        if (skillLevels.css < 40) {
            steps.push({
                category: 'Styling',
                icon: '🎨',
                content: 'Practice CSS flexbox by centering some content - it\'s a superpower once you get it!',
                timeEstimate: '30 min',
                priority: 'Quick Win ⚡',
                confidence: 0.85,
                reasoning: 'Flexbox solves many layout challenges and builds confidence'
            });
        }
        
        // Error-based suggestions
        if (commonErrors.length > 0) {
            const mostCommon = commonErrors.sort((a, b) => b.count - a.count)[0];
            steps.push({
                category: 'Debug Help',
                icon: '🔍',
                content: `Let's prevent ${mostCommon.type} errors - I'll show you the pattern to watch for`,
                timeEstimate: '15 min',
                priority: 'Problem Solver 🛠️',
                confidence: 0.8,
                reasoning: `You've seen this ${mostCommon.count} times, so let's tackle it once and for all`
            });
        }
        
        // Progress-based suggestions
        if (this.sessionData.projectProgress.filesCreated > 3) {
            steps.push({
                category: 'Organization',
                icon: '📁',
                content: 'Great progress! Consider organizing your files into folders for better structure',
                timeEstimate: '10 min',
                priority: 'Best Practice 📋',
                confidence: 0.75,
                reasoning: 'Good file organization becomes more important as projects grow'
            });
        }
        
        this.sessionData.nextSteps = steps.slice(0, 4); // Keep top 4 suggestions
        return steps;
    }
    
    // Get current coaching data for API responses
    getCoachingData() {
        this.updateSkillLevels();
        this.generateNextSteps();
        
        return {
            progress: this.sessionData.projectProgress,
            confidence: this.sessionData.aiConfidence,
            learning: {
                skills: this.sessionData.skillDevelopment.skillLevels,
                htmlSkills: this.sessionData.skillDevelopment.skillLevels.html,
                cssSkills: this.sessionData.skillDevelopment.skillLevels.css,
                jsSkills: this.sessionData.skillDevelopment.skillLevels.js,
                problemSolving: this.sessionData.skillDevelopment.skillLevels.problemSolving,
                activeLearning: this.getActiveLearningFocus(),
                skillsLeveledUp: this.getSkillsLeveledUp(),
                nextSkill: this.getNextSkillRecommendation()
            },
            problems: {
                currentStatus: this.getHealthStatus(),
                mostRecent: this.getMostRecentProblem(),
                healthScore: this.sessionData.errorTracking.healthScore
            },
            nextSteps: this.sessionData.nextSteps,
            achievements: this.sessionData.achievements.slice(0, 10) // Recent achievements
        };
    }
    
    // Helper methods for learning insights
    getActiveLearningFocus() {
        const { skillLevels } = this.sessionData.skillDevelopment;
        const lowestSkill = Object.entries(skillLevels).sort((a, b) => a[1] - b[1])[0];
        
        const focusMap = {
            html: 'HTML Structure & Semantics',
            css: 'CSS Styling & Layout',
            js: 'JavaScript Fundamentals',
            problemSolving: 'Debugging & Problem Solving'
        };
        
        return focusMap[lowestSkill[0]] || 'Web Development Basics';
    }
    
    getSkillsLeveledUp() {
        // Count skills that have improved recently (simplified for demo)
        return Math.floor(Object.values(this.sessionData.skillDevelopment.skillLevels).reduce((a, b) => a + b, 0) / 100);
    }
    
    getNextSkillRecommendation() {
        const { skillLevels } = this.sessionData.skillDevelopment;
        
        if (skillLevels.html < 60) return 'HTML Forms & Inputs';
        if (skillLevels.css < 50) return 'CSS Grid Layout';
        if (skillLevels.js < 40) return 'JavaScript Functions';
        return 'Advanced CSS Animations';
    }
    
    getHealthStatus() {
        const { healthScore } = this.sessionData.errorTracking;
        if (healthScore > 80) return 'All looking great! 🎉';
        if (healthScore > 60) return 'Minor issues spotted 💡';
        return 'A few things to review 🔍';
    }
    
    getMostRecentProblem() {
        const { commonErrors, lastErrorTime } = this.sessionData.errorTracking;
        if (!lastErrorTime || commonErrors.length === 0) {
            return 'No recent issues detected';
        }
        
        const recentError = commonErrors[0];
        return `${recentError.type} (happened ${this.getTimeAgo(lastErrorTime)})`;
    }
    
    getTimeAgo(timestamp) {
        const minutes = Math.floor((Date.now() - timestamp) / 60000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    }
    
    // Save data to persistent storage
    async saveData() {
        try {
            const vibeMetricsPath = path.join(this.config.memoryPath, 'vibe-metrics.json');
            
            // Ensure directory exists
            await fs.mkdir(this.config.memoryPath, { recursive: true });
            
            // Save current session data
            await fs.writeFile(vibeMetricsPath, JSON.stringify(this.sessionData, null, 2));
            
        } catch (error) {
            console.warn('⚠️ Could not save VibeCoach data:', error.message);
        }
    }
    
    // Start periodic data collection and analysis
    startDataCollection() {
        setInterval(() => {
            this.saveData();
            this.emit('update', this.getCoachingData());
        }, this.config.refreshInterval);
    }
}

module.exports = VibeCoachService;