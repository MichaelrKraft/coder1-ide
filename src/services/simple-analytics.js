const fs = require('fs').promises;
const path = require('path');

class SimpleAnalyticsService {
    constructor() {
        this.dataFile = path.join(__dirname, '../../data/analytics.json');
        this.sessionStart = Date.now();
        this.commandHistory = [];
        this.fileActivity = [];
        this.gitActivity = [];
        this.apiUsage = [];
        
        // Initialize data file
        this.initializeDataFile();
    }

    async initializeDataFile() {
        try {
            await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
            
            // Check if file exists, if not create with default data
            try {
                await fs.access(this.dataFile);
            } catch {
                const defaultData = {
                    totalCodingTime: 0,
                    dailyStats: {},
                    commandHistory: [],
                    gitPushes: [],
                    tokenUsage: {
                        monthly: {},
                        total: 0
                    },
                    projectMilestones: [],
                    lastUpdated: new Date().toISOString()
                };
                await this.saveData(defaultData);
            }
        } catch (error) {
            console.log('Analytics data file initialization failed:', error.message);
        }
    }

    async loadData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.log('Failed to load analytics data, using defaults');
            return {
                totalCodingTime: 0,
                dailyStats: {},
                commandHistory: [],
                gitPushes: [],
                tokenUsage: { monthly: {}, total: 0 },
                projectMilestones: [],
                lastUpdated: new Date().toISOString()
            };
        }
    }

    async saveData(data) {
        try {
            data.lastUpdated = new Date().toISOString();
            await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.log('Failed to save analytics data:', error.message);
        }
    }

    // Track terminal command usage
    trackCommand(command) {
        const cleanCommand = command.trim().split(' ')[0]; // Get base command
        if (!cleanCommand || cleanCommand.length < 2) return;

        this.commandHistory.push({
            command: cleanCommand,
            fullCommand: command,
            timestamp: Date.now()
        });

        // Keep only last 1000 commands to prevent memory issues
        if (this.commandHistory.length > 1000) {
            this.commandHistory = this.commandHistory.slice(-1000);
        }
    }

    // Track git push events
    trackGitPush(success = true, branch = 'main') {
        this.gitActivity.push({
            type: 'push',
            success,
            branch,
            timestamp: Date.now()
        });
    }

    // Track API token usage
    trackTokenUsage(service, tokens) {
        this.apiUsage.push({
            service,
            tokens,
            timestamp: Date.now()
        });
    }

    // Track coding session time
    trackCodingTime(minutes) {
        const today = new Date().toDateString();
        // This would be called periodically to update session time
    }

    // Get dashboard metrics
    async getDashboardMetrics() {
        const data = await this.loadData();
        const now = new Date();
        const today = now.toDateString();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Calculate today's coding time (session time + saved time)
        const sessionTimeMinutes = Math.floor((Date.now() - this.sessionStart) / (1000 * 60));
        const todaysCodingTime = (data.dailyStats[today]?.codingTime || 0) + sessionTimeMinutes;

        // Get favorite command
        const commandCounts = {};
        [...data.commandHistory, ...this.commandHistory].forEach(entry => {
            commandCounts[entry.command] = (commandCounts[entry.command] || 0) + 1;
        });

        let favoriteCommand = { command: 'Getting started...', count: 0 };
        if (Object.keys(commandCounts).length > 0) {
            const topCommand = Object.entries(commandCounts)
                .sort(([,a], [,b]) => b - a)[0];
            favoriteCommand = { command: topCommand[0], count: topCommand[1] };
        }

        // Calculate git pushes
        const allGitPushes = [...data.gitPushes, ...this.gitActivity.filter(a => a.type === 'push')];
        const successfulPushes = allGitPushes.filter(push => push.success).length;
        
        // Calculate trend (last week vs previous week)
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
        
        const recentPushes = allGitPushes.filter(p => p.timestamp > oneWeekAgo).length;
        const previousPushes = allGitPushes.filter(p => p.timestamp > twoWeeksAgo && p.timestamp <= oneWeekAgo).length;
        
        let trend = 'stable';
        if (recentPushes > previousPushes) trend = 'up';
        else if (recentPushes < previousPushes) trend = 'down';

        // Calculate token usage
        const monthlyUsage = data.tokenUsage.monthly[thisMonth] || 0;
        const sessionUsage = this.apiUsage.reduce((sum, usage) => sum + usage.tokens, 0);
        const totalMonthlyUsage = monthlyUsage + sessionUsage;

        // Generate next steps based on current activity
        const nextSteps = this.generateNextSteps(data, todaysCodingTime, successfulPushes);

        // Calculate project progress based on PRD/todo.md analysis
        const projectProgress = await this.calculateProjectProgress();

        return {
            codingTime: {
                today: todaysCodingTime,
                week: todaysCodingTime * 4, // Simplified calculation
                total: data.totalCodingTime + sessionTimeMinutes
            },
            favoriteCommand,
            gitPushes: {
                count: successfulPushes,
                trend,
                thisWeek: recentPushes
            },
            nextSteps: {
                suggestions: nextSteps
            },
            projectProgress,
            tokenUsage: {
                used: totalMonthlyUsage,
                limit: 10000, // Default limit
                thisMonth: totalMonthlyUsage
            }
        };
    }

    generateNextSteps(data, codingTime, pushCount) {
        const suggestions = [];

        // Smart suggestions based on activity
        if (codingTime < 30) {
            suggestions.push({
                id: 'coding-time',
                title: 'Start your coding session',
                description: 'Open a file and begin working on your project',
                priority: 'high',
                timeEstimate: '5 min'
            });
        }

        if (pushCount === 0) {
            suggestions.push({
                id: 'first-commit',
                title: 'Make your first commit',
                description: 'Save your progress with git add, commit, and push',
                priority: 'high',
                timeEstimate: '10 min'
            });
        }

        if (pushCount > 0 && pushCount < 5) {
            suggestions.push({
                id: 'add-readme',
                title: 'Add a README file',
                description: 'Document your project with installation and usage instructions',
                priority: 'medium',
                timeEstimate: '15 min'
            });
        }

        if (pushCount >= 5) {
            suggestions.push({
                id: 'add-tests',
                title: 'Write some tests',
                description: 'Add unit tests to ensure your code works correctly',
                priority: 'medium',
                timeEstimate: '30 min'
            });
        }

        // Default suggestions if none generated
        if (suggestions.length === 0) {
            suggestions.push({
                id: 'keep-coding',
                title: 'Continue your great work!',
                description: 'You\'re making excellent progress on your project',
                priority: 'low',
                timeEstimate: '∞'
            });
        }

        return suggestions.slice(0, 3); // Return top 3 suggestions
    }

    async calculateProjectProgress() {
        try {
            // Try to read project files to determine progress
            const projectFiles = [
                path.join(process.cwd(), 'tasks/todo.md'),
                path.join(process.cwd(), 'CLAUDE.md'),
                path.join(process.cwd(), 'PROJECT_STATUS.md')
            ];

            let totalTasks = 0;
            let completedTasks = 0;
            let currentPhase = 'Getting Started';

            // Parse todo.md if it exists
            try {
                const todoContent = await fs.readFile(projectFiles[0], 'utf8');
                const lines = todoContent.split('\n');
                
                lines.forEach(line => {
                    if (line.includes('- [ ]')) totalTasks++;
                    if (line.includes('- [x]')) {
                        totalTasks++;
                        completedTasks++;
                    }
                });

                // Determine current phase based on content
                if (todoContent.includes('Phase 1')) currentPhase = 'Phase 1: Planning & Setup';
                if (todoContent.includes('Phase 2')) currentPhase = 'Phase 2: Core Development';
                if (todoContent.includes('Phase 3')) currentPhase = 'Phase 3: Enhancement & Polish';
                if (todoContent.includes('Phase 4')) currentPhase = 'Phase 4: Testing & Launch';
            } catch (error) {
                // File doesn't exist or can't be read
            }

            const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 15;

            return {
                percentage: Math.min(percentage, 100),
                currentPhase,
                completedMilestones: completedTasks,
                totalMilestones: totalTasks
            };
        } catch (error) {
            // Return default progress if analysis fails
            return {
                percentage: 15,
                currentPhase: 'Getting Started',
                completedMilestones: 0,
                totalMilestones: 10
            };
        }
    }

    // Save current session data
    async getVibeMetrics() {
        const data = await this.loadData();
        const today = new Date().toDateString();
        const todayStats = data.dailyStats[today] || { codingTime: 0, commands: 0, pushes: 0 };
        
        // Calculate coding time (in minutes)
        const sessionTime = Math.floor((Date.now() - this.sessionStart) / 60000);
        const totalTime = todayStats.codingTime + sessionTime;
        
        // Get top commands
        const commandCounts = {};
        const recentCommands = [...data.commandHistory, ...this.commandHistory];
        recentCommands.forEach(cmd => {
            if (cmd.command) {
                commandCounts[cmd.command] = (commandCounts[cmd.command] || 0) + 1;
            }
        });
        
        // Get git push count for today
        const todayPushes = data.gitPushes.filter(push => {
            const pushDate = new Date(push.timestamp).toDateString();
            return pushDate === today;
        }).length + this.gitActivity.filter(a => a.type === 'push').length;
        
        // Calculate streak
        const streak = this.calculateStreak(data.dailyStats);
        
        // Calculate project progress (0-100)
        const progress = await this.calculateProjectProgress();
        
        // Generate activity heatmap
        const heatmap = this.generateHeatmap();
        
        // Get next steps suggestions
        const nextSteps = this.generateNextSteps(todayPushes, commandCounts);
        
        return {
            codingTime: totalTime,
            topCommands: commandCounts,
            gitPushes: todayPushes,
            streak: streak,
            projectProgress: progress,
            activityHeatmap: heatmap,
            nextSteps: nextSteps
        };
    }
    
    calculateStreak(dailyStats) {
        const dates = Object.keys(dailyStats).sort((a, b) => new Date(b) - new Date(a));
        if (dates.length === 0) return 0;
        
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < dates.length; i++) {
            const date = new Date(dates[i]);
            date.setHours(0, 0, 0, 0);
            
            const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === streak) {
                streak++;
            } else if (daysDiff > streak) {
                break;
            }
        }
        
        return streak;
    }
    
    generateHeatmap() {
        const hour = new Date().getHours();
        const heatmap = {
            morning: 0,
            afternoon: 0,
            evening: 0
        };
        
        // Simple heatmap based on current hour and session time
        if (hour >= 6 && hour < 12) heatmap.morning = 1;
        else if (hour >= 12 && hour < 18) heatmap.afternoon = 1;
        else if (hour >= 18 && hour < 24) heatmap.evening = 1;
        
        return heatmap;
    }

    async saveSession() {
        const data = await this.loadData();
        const today = new Date().toDateString();
        const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

        // Update daily stats
        if (!data.dailyStats[today]) {
            data.dailyStats[today] = { codingTime: 0, commands: 0, pushes: 0 };
        }

        const sessionTimeMinutes = Math.floor((Date.now() - this.sessionStart) / (1000 * 60));
        data.dailyStats[today].codingTime += sessionTimeMinutes;
        data.dailyStats[today].commands += this.commandHistory.length;
        data.dailyStats[today].pushes += this.gitActivity.filter(a => a.type === 'push').length;

        // Update command history
        data.commandHistory.push(...this.commandHistory);
        if (data.commandHistory.length > 1000) {
            data.commandHistory = data.commandHistory.slice(-1000);
        }

        // Update git activity
        data.gitPushes.push(...this.gitActivity.filter(a => a.type === 'push'));

        // Update token usage
        const sessionTokens = this.apiUsage.reduce((sum, usage) => sum + usage.tokens, 0);
        data.tokenUsage.monthly[thisMonth] = (data.tokenUsage.monthly[thisMonth] || 0) + sessionTokens;
        data.tokenUsage.total += sessionTokens;

        // Update total coding time
        data.totalCodingTime += sessionTimeMinutes;

        await this.saveData(data);
    }
}

module.exports = new SimpleAnalyticsService();