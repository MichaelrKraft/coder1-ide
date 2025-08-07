/**
 * Tasks Route Module
 * 
 * Handles task creation, management, and lifecycle operations
 * Now integrated with Real Autonomous Builder
 */

const express = require('express');
const router = express.Router();
const { RealAutonomousBuilder } = require('../../integrations/real-autonomous-builder');

// Initialize real autonomous builder
const autonomousBuilder = new RealAutonomousBuilder({
    logger: console,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    vercelToken: process.env.VERCEL_TOKEN,
    netlifyToken: process.env.NETLIFY_TOKEN,
    githubToken: process.env.GITHUB_TOKEN,
    githubUsername: process.env.GITHUB_USERNAME
});

// In-memory task storage for demo purposes
// TODO: Replace with persistent database for production
let tasks = [];
let taskCounter = 0;

/**
 * Delete all tasks
 */
router.delete("/", (req, res) => {
    try {
        console.log('🗑️ Clearing all tasks');
        tasks = [];
        taskCounter = 0;
        
        res.json({
            success: true,
            message: 'All tasks cleared',
            remainingTasks: 0
        });
    } catch (error) {
        console.error('❌ Error clearing tasks:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Create a new task
 */
router.post("/", async (req, res) => {
    try {
        const { description, autoExecute, priority = 'medium' } = req.body;
        
        if (!description) {
            return res.status(400).json({
                success: false,
                error: 'Task description is required'
            });
        }

        taskCounter++;
        const task = {
            id: `task-${Date.now()}-${taskCounter}`,
            description: description.substring(0, 200), // Limit description length
            status: 'pending',
            priority,
            autoExecute: Boolean(autoExecute),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        tasks.push(task);
        
        console.log(`📝 Task created: ${task.id} - ${task.description.substring(0, 50)}...`);

        // Simulate auto-execution if requested
        if (autoExecute) {
            setTimeout(async () => {
                await simulateTaskExecution(task.id);
            }, 2000);
        }

        res.json({
            success: true,
            task,
            message: `Task created${autoExecute ? ' and queued for execution' : ''}`
        });

    } catch (error) {
        console.error('❌ Error creating task:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get all tasks with status counts
 */
router.get("/", async (req, res) => {
    try {
        const statusCounts = {
            pending: tasks.filter(t => t.status === 'pending').length,
            active: tasks.filter(t => t.status === 'active').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            failed: tasks.filter(t => t.status === 'failed').length
        };

        res.json({
            success: true,
            tasks: tasks.map(task => ({
                ...task,
                description: task.description.length > 100 
                    ? task.description.substring(0, 100) + '...' 
                    : task.description
            })),
            counts: statusCounts,
            total: tasks.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching tasks:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Update task status
 */
router.patch("/:taskId/status", (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['pending', 'active', 'completed', 'failed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }
        
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }
        
        task.status = status;
        task.updatedAt = new Date().toISOString();
        
        console.log(`📋 Task ${taskId} status updated to: ${status}`);
        
        res.json({
            success: true,
            task,
            message: `Task status updated to ${status}`
        });
        
    } catch (error) {
        console.error('❌ Error updating task status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Delete specific task
 */
router.delete("/:taskId", (req, res) => {
    try {
        const { taskId } = req.params;
        
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }
        
        const deletedTask = tasks.splice(taskIndex, 1)[0];
        
        console.log(`🗑️ Task deleted: ${taskId}`);
        
        res.json({
            success: true,
            task: deletedTask,
            message: 'Task deleted successfully'
        });
        
    } catch (error) {
        console.error('❌ Error deleting task:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Build autonomous project from enhanced brief (REAL IMPLEMENTATION)
 */
router.post("/build-autonomous", async (req, res) => {
    try {
        const { enhancedBrief, options = {} } = req.body;
        
        if (!enhancedBrief) {
            return res.status(400).json({
                success: false,
                error: 'Enhanced brief is required for autonomous building'
            });
        }
        
        console.log('🚀 Starting real autonomous build');
        console.log(`📝 Brief: ${enhancedBrief.substring(0, 100)}...`);
        
        // Set default options for API builds
        const buildOptions = {
            strategy: options.strategy || 'hybrid', // claude-only, generator-only, hybrid
            createGitHubRepo: options.createGitHubRepo !== false,
            deploy: options.deploy !== false,
            deploymentPlatform: options.deploymentPlatform || 'vercel',
            privateRepo: options.privateRepo || false,
            enableGitHubPages: options.enableGitHubPages !== false,
            ...options
        };
        
        // Start autonomous build
        const buildResult = await autonomousBuilder.buildAutonomousProject(enhancedBrief, buildOptions);
        
        if (buildResult.success) {
            console.log(`✅ Autonomous build completed: ${buildResult.buildId}`);
            console.log(`🌐 Live URL: ${buildResult.liveUrl}`);
            console.log(`🐙 Repository: ${buildResult.repositoryUrl}`);
            
            // Create task entry for tracking
            const taskId = `build-${buildResult.buildId}`;
            const task = {
                id: taskId,
                description: `Autonomous project build: ${buildResult.summary.metrics.framework} application`,
                status: 'completed',
                priority: 'high',
                autoExecute: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                buildId: buildResult.buildId,
                result: {
                    liveUrl: buildResult.liveUrl,
                    repositoryUrl: buildResult.repositoryUrl,
                    duration: buildResult.duration,
                    summary: buildResult.summary
                }
            };
            
            tasks.push(task);
            taskCounter++;
            
            res.json({
                success: true,
                message: 'Autonomous build completed successfully',
                buildId: buildResult.buildId,
                taskId,
                results: {
                    liveUrl: buildResult.liveUrl,
                    repositoryUrl: buildResult.repositoryUrl,
                    deploymentUrl: buildResult.deployment?.deploymentUrl,
                    duration: buildResult.duration,
                    summary: buildResult.summary
                }
            });
        } else {
            console.error(`❌ Autonomous build failed: ${buildResult.error}`);
            
            // Create failed task entry
            const taskId = `build-failed-${Date.now()}`;
            const task = {
                id: taskId,
                description: `Failed autonomous build`,
                status: 'failed',
                priority: 'high',
                autoExecute: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                error: buildResult.error
            };
            
            tasks.push(task);
            taskCounter++;
            
            res.status(500).json({
                success: false,
                error: buildResult.error,
                buildId: buildResult.buildId,
                taskId
            });
        }
        
    } catch (error) {
        console.error('❌ Error in autonomous build:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get autonomous build status
 */
router.get("/build-status/:buildId", (req, res) => {
    try {
        const { buildId } = req.params;
        
        const buildStatus = autonomousBuilder.getBuildStatus(buildId);
        
        if (!buildStatus) {
            return res.status(404).json({
                success: false,
                error: 'Build not found'
            });
        }
        
        res.json({
            success: true,
            buildStatus
        });
        
    } catch (error) {
        console.error('❌ Error getting build status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get autonomous builder metrics
 */
router.get("/metrics", (req, res) => {
    try {
        const metrics = autonomousBuilder.getMetrics();
        
        res.json({
            success: true,
            metrics
        });
        
    } catch (error) {
        console.error('❌ Error getting metrics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get all active builds
 */
router.get("/active-builds", (req, res) => {
    try {
        const activeBuilds = autonomousBuilder.getActiveBuilds();
        
        res.json({
            success: true,
            activeBuilds
        });
        
    } catch (error) {
        console.error('❌ Error getting active builds:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get build history
 */
router.get("/build-history", (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const buildHistory = autonomousBuilder.getBuildHistory(limit);
        
        res.json({
            success: true,
            buildHistory
        });
        
    } catch (error) {
        console.error('❌ Error getting build history:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Simulate task execution (for demo purposes)
 */
async function simulateTaskExecution(taskId) {
    try {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Start execution
        task.status = 'active';
        task.updatedAt = new Date().toISOString();
        console.log(`🚀 Starting execution of task: ${taskId}`);

        // Simulate work with random duration
        const duration = 3000 + Math.random() * 7000; // 3-10 seconds
        
        await new Promise(resolve => setTimeout(resolve, duration));

        // Complete with 90% success rate
        const success = Math.random() > 0.1;
        task.status = success ? 'completed' : 'failed';
        task.updatedAt = new Date().toISOString();
        
        if (success) {
            task.result = 'Task completed successfully';
        } else {
            task.error = 'Simulated execution failure';
        }

        console.log(`${success ? '✅' : '❌'} Task ${taskId} execution ${success ? 'completed' : 'failed'}`);

    } catch (error) {
        console.error(`❌ Error simulating task execution for ${taskId}:`, error);
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'failed';
            task.error = error.message;
            task.updatedAt = new Date().toISOString();
        }
    }
}

module.exports = router;