/**
 * Project Pipeline API Routes
 * 
 * Handles project lifecycle management from idea to deployment
 */

const express = require('express');
const router = express.Router();
const { getInstance: getProjectPipelineManager } = require('../services/project-pipeline/ProjectPipelineManager');

// Initialize manager
const pipelineManager = getProjectPipelineManager();

/**
 * GET /api/project-pipeline/active
 * Get the active project (most recently updated)
 */
router.get('/active', async (req, res) => {
    try {
        const projects = pipelineManager.getAllProjects();
        
        if (projects.length === 0) {
            return res.json({ project: null });
        }
        
        // Get most recently updated project
        const activeProject = projects.sort((a, b) => b.updatedAt - a.updatedAt)[0];
        
        res.json({
            success: true,
            project: activeProject
        });
    } catch (error) {
        console.error('Error fetching active project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch active project',
            message: error.message
        });
    }
});

/**
 * GET /api/project-pipeline/projects
 * Get all projects
 */
router.get('/projects', async (req, res) => {
    try {
        const projects = pipelineManager.getAllProjects();
        
        res.json({
            success: true,
            projects
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch projects',
            message: error.message
        });
    }
});

/**
 * GET /api/project-pipeline/project/:id
 * Get a specific project by ID
 */
router.get('/project/:id', async (req, res) => {
    try {
        const project = pipelineManager.getProject(req.params.id);
        
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        
        res.json({
            success: true,
            project
        });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project',
            message: error.message
        });
    }
});

/**
 * POST /api/project-pipeline/create
 * Create a new project
 */
router.post('/create', async (req, res) => {
    try {
        const { name, description, type, estimatedTokens } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Project name is required'
            });
        }
        
        const project = await pipelineManager.createProject(
            name,
            description || '',
            type || 'webapp',
            estimatedTokens || null
        );
        
        res.json(project);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create project',
            message: error.message
        });
    }
});

/**
 * POST /api/project-pipeline/stage
 * Update project stage
 */
router.post('/stage', async (req, res) => {
    try {
        const { projectId, newStage, completedTasks } = req.body;
        
        if (!projectId || !newStage) {
            return res.status(400).json({
                success: false,
                error: 'Project ID and new stage are required'
            });
        }
        
        const project = await pipelineManager.updateProjectStage(
            projectId,
            newStage,
            completedTasks || []
        );
        
        res.json(project);
    } catch (error) {
        console.error('Error updating project stage:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update project stage',
            message: error.message
        });
    }
});

/**
 * POST /api/project-pipeline/task/complete
 * Mark a task as complete
 */
router.post('/task/complete', async (req, res) => {
    try {
        const { projectId, taskId } = req.body;
        
        if (!projectId || !taskId) {
            return res.status(400).json({
                success: false,
                error: 'Project ID and task ID are required'
            });
        }
        
        const project = await pipelineManager.completeTask(projectId, taskId);
        
        res.json(project);
    } catch (error) {
        console.error('Error completing task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete task',
            message: error.message
        });
    }
});

/**
 * GET /api/project-pipeline/suggestions/:projectId
 * Get suggestions for a project
 */
router.get('/suggestions/:projectId', async (req, res) => {
    try {
        const suggestions = await pipelineManager.suggestNextActions(req.params.projectId);
        
        res.json(suggestions);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch suggestions',
            message: error.message
        });
    }
});

/**
 * POST /api/project-pipeline/webhook
 * Add a webhook to a project
 */
router.post('/webhook', async (req, res) => {
    try {
        const { projectId, url, events } = req.body;
        
        if (!projectId || !url) {
            return res.status(400).json({
                success: false,
                error: 'Project ID and webhook URL are required'
            });
        }
        
        const webhook = await pipelineManager.addWebhook(
            projectId,
            url,
            events || ['stage_change']
        );
        
        res.json({
            success: true,
            webhook
        });
    } catch (error) {
        console.error('Error adding webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add webhook',
            message: error.message
        });
    }
});

/**
 * GET /api/project-pipeline/metrics
 * Get pipeline metrics across all projects
 */
router.get('/metrics', async (req, res) => {
    try {
        const metrics = await pipelineManager.getPipelineMetrics();
        
        res.json({
            success: true,
            ...metrics
        });
    } catch (error) {
        console.error('Error fetching pipeline metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch metrics',
            message: error.message
        });
    }
});

/**
 * DELETE /api/project-pipeline/project/:id
 * Delete a project (archive it)
 */
router.delete('/project/:id', async (req, res) => {
    try {
        const project = pipelineManager.getProject(req.params.id);
        
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        
        // Archive instead of delete
        project.archived = true;
        project.archivedAt = Date.now();
        await pipelineManager.saveProjects();
        
        res.json({
            success: true,
            message: 'Project archived successfully'
        });
    } catch (error) {
        console.error('Error archiving project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to archive project',
            message: error.message
        });
    }
});

module.exports = router;