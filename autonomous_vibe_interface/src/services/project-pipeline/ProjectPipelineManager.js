/**
 * ProjectPipelineManager - Visual project tracking from idea to deployment
 * 
 * Manages the complete lifecycle of vibe coder projects, integrating with
 * the MemorySystem for learning and persistence.
 */

const { MemorySystem } = require('../ai-enhancement/MemorySystem');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ProjectPipelineManager {
    constructor() {
        this.memorySystem = MemorySystem.getInstance();
        this.dataFile = path.join(__dirname, '../../../data/project-pipelines.json');
        
        // Project stages with metadata
        this.stages = {
            'idea': {
                name: 'Idea',
                icon: '💡',
                description: 'Initial concept and brainstorming',
                avgDuration: 1, // days
                tasks: ['Define concept', 'Research feasibility', 'Create basic outline']
            },
            'design': {
                name: 'Design',
                icon: '🎨',
                description: 'UI/UX design and architecture planning',
                avgDuration: 2,
                tasks: ['Create wireframes', 'Design components', 'Plan architecture']
            },
            'development': {
                name: 'Development',
                icon: '⚙️',
                description: 'Building the application',
                avgDuration: 5,
                tasks: ['Set up project', 'Build features', 'Integrate APIs']
            },
            'testing': {
                name: 'Testing',
                icon: '🧪',
                description: 'Testing and bug fixes',
                avgDuration: 2,
                tasks: ['Write tests', 'Fix bugs', 'Performance optimization']
            },
            'deployment': {
                name: 'Deployment',
                icon: '🚀',
                description: 'Deploy to production',
                avgDuration: 1,
                tasks: ['Configure hosting', 'Deploy application', 'Monitor launch']
            },
            'live': {
                name: 'Live',
                icon: '✅',
                description: 'Project is live and running',
                avgDuration: 0,
                tasks: ['Monitor performance', 'Gather feedback', 'Plan updates']
            }
        };
        
        // Active projects
        this.projects = new Map();
        
        // Webhook triggers
        this.webhookTriggers = {
            'stage_change': 'When project moves to a new stage',
            'task_complete': 'When a task is completed',
            'project_complete': 'When project reaches live stage',
            'milestone': 'When reaching 25%, 50%, 75% completion'
        };
        
        this.initialize();
    }
    
    async initialize() {
        try {
            await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
            await this.loadProjects();
            console.log('🚀 ProjectPipelineManager: Initialized');
        } catch (error) {
            console.log('ProjectPipelineManager initialization failed:', error.message);
        }
    }
    
    async loadProjects() {
        try {
            await fs.access(this.dataFile);
            const data = await fs.readFile(this.dataFile, 'utf8');
            const projects = JSON.parse(data);
            
            projects.forEach(project => {
                this.projects.set(project.id, project);
            });
            
            console.log(`Loaded ${this.projects.size} projects`);
        } catch {
            // No existing projects file
            await this.saveProjects();
        }
    }
    
    async saveProjects() {
        try {
            const projects = Array.from(this.projects.values());
            await fs.writeFile(this.dataFile, JSON.stringify(projects, null, 2));
        } catch (error) {
            console.log('Failed to save projects:', error.message);
        }
    }
    
    /**
     * Create a new project
     */
    async createProject(name, description, type = 'webapp', estimatedTokens = null) {
        const projectId = this.generateProjectId(name);
        
        const project = {
            id: projectId,
            name,
            description,
            type,
            stage: 'idea',
            progress: 0,
            tasks: this.generateTasksForStage('idea'),
            completedTasks: [],
            estimatedTokens,
            actualTokens: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            stageHistory: [{
                stage: 'idea',
                enteredAt: Date.now(),
                tasks: this.generateTasksForStage('idea')
            }],
            velocity: null, // Will be calculated as project progresses
            estimatedCompletion: this.estimateCompletion('idea'),
            webhooks: [],
            metadata: {
                techStack: [],
                githubRepo: null,
                deploymentUrl: null,
                teamSize: 1
            }
        };
        
        this.projects.set(projectId, project);
        await this.saveProjects();
        
        // Store in memory system for learning
        this.memorySystem.storeProjectKnowledge(
            'projects',
            projectId,
            { name, description, type },
            'ProjectPipelineManager',
            0.9
        );
        
        return project;
    }
    
    /**
     * Update project stage
     */
    async updateProjectStage(projectId, newStage, completedTasks = []) {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project ${projectId} not found`);
        }
        
        const oldStage = project.stage;
        project.stage = newStage;
        project.updatedAt = Date.now();
        
        // Update stage history
        project.stageHistory.push({
            stage: newStage,
            enteredAt: Date.now(),
            tasks: this.generateTasksForStage(newStage),
            completedTasks: []
        });
        
        // Generate new tasks for the stage
        project.tasks = this.generateTasksForStage(newStage);
        project.completedTasks = completedTasks;
        
        // Calculate progress
        project.progress = this.calculateProjectProgress(project);
        
        // Update velocity
        project.velocity = this.calculateVelocity(project);
        
        // Update estimated completion
        project.estimatedCompletion = this.estimateCompletion(newStage, project.velocity);
        
        // Store stage transition in memory
        this.memorySystem.storeAgentInsight(
            'pipeline',
            'stage_transition',
            `${oldStage} → ${newStage}`,
            0.8,
            { projectId, duration: this.getStageDuration(project, oldStage) }
        );
        
        await this.saveProjects();
        
        // Trigger webhooks
        await this.triggerWebhooks(projectId, 'stage_change', {
            oldStage,
            newStage,
            progress: project.progress
        });
        
        return project;
    }
    
    /**
     * Complete a task
     */
    async completeTask(projectId, taskId) {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project ${projectId} not found`);
        }
        
        if (!project.completedTasks.includes(taskId)) {
            project.completedTasks.push(taskId);
            project.updatedAt = Date.now();
            project.progress = this.calculateProjectProgress(project);
            
            // Update current stage history
            const currentStageHistory = project.stageHistory[project.stageHistory.length - 1];
            if (currentStageHistory) {
                currentStageHistory.completedTasks = currentStageHistory.completedTasks || [];
                currentStageHistory.completedTasks.push(taskId);
            }
            
            await this.saveProjects();
            
            // Check for milestone
            const milestone = this.checkMilestone(project.progress);
            if (milestone) {
                await this.triggerWebhooks(projectId, 'milestone', {
                    milestone,
                    progress: project.progress
                });
            }
            
            // Trigger task complete webhook
            await this.triggerWebhooks(projectId, 'task_complete', {
                taskId,
                progress: project.progress
            });
        }
        
        return project;
    }
    
    /**
     * Add webhook to project
     */
    async addWebhook(projectId, url, events = ['stage_change']) {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project ${projectId} not found`);
        }
        
        const webhook = {
            id: this.generateWebhookId(),
            url,
            events,
            createdAt: Date.now(),
            lastTriggered: null,
            failureCount: 0
        };
        
        project.webhooks = project.webhooks || [];
        project.webhooks.push(webhook);
        
        await this.saveProjects();
        return webhook;
    }
    
    /**
     * Trigger webhooks for an event
     */
    async triggerWebhooks(projectId, event, data) {
        const project = this.projects.get(projectId);
        if (!project || !project.webhooks) return;
        
        const webhooks = project.webhooks.filter(w => w.events.includes(event));
        
        for (const webhook of webhooks) {
            try {
                // In a real implementation, this would make an HTTP POST request
                // For now, we'll just log it
                console.log(`Webhook triggered: ${webhook.url}`, {
                    event,
                    projectId,
                    projectName: project.name,
                    data,
                    timestamp: Date.now()
                });
                
                webhook.lastTriggered = Date.now();
                webhook.failureCount = 0;
            } catch (error) {
                webhook.failureCount++;
                console.error(`Webhook failed: ${webhook.url}`, error);
            }
        }
        
        await this.saveProjects();
    }
    
    /**
     * Get project by ID
     */
    getProject(projectId) {
        return this.projects.get(projectId);
    }
    
    /**
     * Get all projects
     */
    getAllProjects() {
        return Array.from(this.projects.values());
    }
    
    /**
     * Get projects by stage
     */
    getProjectsByStage(stage) {
        return Array.from(this.projects.values())
            .filter(p => p.stage === stage);
    }
    
    /**
     * Calculate project progress
     */
    calculateProjectProgress(project) {
        const stageWeights = {
            'idea': 0,
            'design': 0.15,
            'development': 0.5,
            'testing': 0.75,
            'deployment': 0.9,
            'live': 1.0
        };
        
        const baseProgress = stageWeights[project.stage] || 0;
        
        // Add task completion within current stage
        if (project.tasks && project.tasks.length > 0) {
            const taskProgress = project.completedTasks.length / project.tasks.length;
            const stageContribution = 0.15; // Each stage contributes up to 15% more
            return Math.min(1, baseProgress + (taskProgress * stageContribution));
        }
        
        return baseProgress;
    }
    
    /**
     * Calculate project velocity
     */
    calculateVelocity(project) {
        if (project.stageHistory.length < 2) return null;
        
        const totalDuration = Date.now() - project.createdAt;
        const daysElapsed = totalDuration / (1000 * 60 * 60 * 24);
        const progress = this.calculateProjectProgress(project);
        
        return daysElapsed > 0 ? progress / daysElapsed : 0;
    }
    
    /**
     * Estimate completion date
     */
    estimateCompletion(currentStage, velocity = null) {
        if (!velocity) {
            // Use average durations
            const stagesLeft = this.getStagesAfter(currentStage);
            const daysRemaining = stagesLeft.reduce((sum, stage) => 
                sum + this.stages[stage].avgDuration, 0);
            
            return Date.now() + (daysRemaining * 24 * 60 * 60 * 1000);
        }
        
        // Use actual velocity
        const currentProgress = this.calculateProjectProgress({ stage: currentStage, tasks: [], completedTasks: [] });
        const remainingProgress = 1 - currentProgress;
        const daysRemaining = remainingProgress / velocity;
        
        return Date.now() + (daysRemaining * 24 * 60 * 60 * 1000);
    }
    
    /**
     * Get stages after a given stage
     */
    getStagesAfter(stage) {
        const stageOrder = Object.keys(this.stages);
        const currentIndex = stageOrder.indexOf(stage);
        return stageOrder.slice(currentIndex + 1);
    }
    
    /**
     * Generate tasks for a stage
     */
    generateTasksForStage(stage) {
        const stageConfig = this.stages[stage];
        if (!stageConfig) return [];
        
        return stageConfig.tasks.map((task, index) => ({
            id: `${stage}_task_${index}`,
            name: task,
            stage,
            createdAt: Date.now()
        }));
    }
    
    /**
     * Get stage duration
     */
    getStageDuration(project, stage) {
        const history = project.stageHistory.find(h => h.stage === stage);
        if (!history) return 0;
        
        const nextStage = project.stageHistory[project.stageHistory.indexOf(history) + 1];
        const endTime = nextStage ? nextStage.enteredAt : Date.now();
        
        return endTime - history.enteredAt;
    }
    
    /**
     * Check for milestones
     */
    checkMilestone(progress) {
        const percentage = Math.floor(progress * 100);
        if (percentage === 25) return '25%';
        if (percentage === 50) return '50%';
        if (percentage === 75) return '75%';
        if (percentage === 100) return '100%';
        return null;
    }
    
    /**
     * Get pipeline metrics
     */
    async getPipelineMetrics() {
        const projects = Array.from(this.projects.values());
        
        const metrics = {
            totalProjects: projects.length,
            byStage: {},
            averageVelocity: 0,
            completedProjects: 0,
            activeProjects: 0,
            estimatedTokenSavings: 0
        };
        
        // Count by stage
        Object.keys(this.stages).forEach(stage => {
            metrics.byStage[stage] = projects.filter(p => p.stage === stage).length;
        });
        
        // Calculate averages
        const velocities = projects.map(p => p.velocity).filter(v => v !== null);
        if (velocities.length > 0) {
            metrics.averageVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        }
        
        metrics.completedProjects = projects.filter(p => p.stage === 'live').length;
        metrics.activeProjects = projects.filter(p => p.stage !== 'live').length;
        
        // Get insights from memory system
        const insights = this.memorySystem.getAgentInsights('pipeline', 'stage_transition');
        metrics.commonTransitions = insights.slice(0, 3).map(i => i.content);
        
        return metrics;
    }
    
    /**
     * Suggest next actions for a project
     */
    async suggestNextActions(projectId) {
        const project = this.projects.get(projectId);
        if (!project) return [];
        
        const suggestions = [];
        
        // Get uncompleted tasks
        const incompleteTasks = project.tasks.filter(t => 
            !project.completedTasks.includes(t.id)
        );
        
        if (incompleteTasks.length > 0) {
            suggestions.push({
                type: 'task',
                action: `Complete task: ${incompleteTasks[0].name}`,
                priority: 'high'
            });
        }
        
        // Check if ready for next stage
        if (project.completedTasks.length === project.tasks.length && 
            project.stage !== 'live') {
            const stageOrder = Object.keys(this.stages);
            const currentIndex = stageOrder.indexOf(project.stage);
            const nextStage = stageOrder[currentIndex + 1];
            
            suggestions.push({
                type: 'stage',
                action: `Move to ${this.stages[nextStage].name} stage`,
                priority: 'high'
            });
        }
        
        // Webhook suggestions
        if (!project.webhooks || project.webhooks.length === 0) {
            suggestions.push({
                type: 'webhook',
                action: 'Add deployment webhook for automatic updates',
                priority: 'medium'
            });
        }
        
        // Token optimization
        if (project.actualTokens > project.estimatedTokens * 1.2) {
            suggestions.push({
                type: 'optimization',
                action: 'Review token usage - exceeding estimates by 20%',
                priority: 'medium'
            });
        }
        
        return suggestions;
    }
    
    /**
     * Generate project ID
     */
    generateProjectId(name) {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substr(2, 5);
        const nameSlug = name.toLowerCase().replace(/\s+/g, '-').substr(0, 10);
        return `${nameSlug}-${timestamp}-${randomStr}`;
    }
    
    /**
     * Generate webhook ID
     */
    generateWebhookId() {
        return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Singleton instance
let instance = null;

module.exports = {
    getInstance: () => {
        if (!instance) {
            instance = new ProjectPipelineManager();
        }
        return instance;
    },
    ProjectPipelineManager
};