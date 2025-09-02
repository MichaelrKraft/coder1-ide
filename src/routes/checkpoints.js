/**
 * Checkpoints API Routes
 * 
 * Provides session checkpoint management for coding sessions,
 * allowing users to save, restore, and export development milestones.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class CheckpointManager {
    constructor() {
        this.checkpointsPath = path.join(process.cwd(), '.coder1', 'checkpoints');
        this.checkpoints = new Map();
        this.initialized = false;
        this.initialize();
    }

    async initialize() {
        try {
            // Ensure checkpoints directory exists
            await fs.mkdir(this.checkpointsPath, { recursive: true });
            
            // Load existing checkpoints
            await this.loadCheckpoints();
            this.initialized = true;
            
            console.log('✅ Checkpoint Manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Checkpoint Manager:', error);
        }
    }

    async loadCheckpoints() {
        try {
            const files = await fs.readdir(this.checkpointsPath);
            const checkpointFiles = files.filter(file => file.endsWith('.json'));
            
            for (const file of checkpointFiles) {
                try {
                    const filePath = path.join(this.checkpointsPath, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const checkpoint = JSON.parse(content);
                    this.checkpoints.set(checkpoint.id, checkpoint);
                } catch (error) {
                    console.warn(`Warning: Failed to load checkpoint ${file}:`, error.message);
                }
            }
            
            console.log(`📂 Loaded ${this.checkpoints.size} checkpoints from disk`);
        } catch (error) {
            console.log('📂 No existing checkpoints found, starting fresh');
        }
    }

    async saveCheckpoint(checkpoint) {
        try {
            const filePath = path.join(this.checkpointsPath, `${checkpoint.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(checkpoint, null, 2));
            this.checkpoints.set(checkpoint.id, checkpoint);
        } catch (error) {
            console.error(`❌ Failed to save checkpoint ${checkpoint.id}:`, error);
            throw error;
        }
    }

    async deleteCheckpoint(checkpointId) {
        try {
            const filePath = path.join(this.checkpointsPath, `${checkpointId}.json`);
            await fs.unlink(filePath);
            this.checkpoints.delete(checkpointId);
        } catch (error) {
            console.error(`❌ Failed to delete checkpoint ${checkpointId}:`, error);
            throw error;
        }
    }

    getCheckpoint(checkpointId) {
        return this.checkpoints.get(checkpointId);
    }

    getAllCheckpoints() {
        return Array.from(this.checkpoints.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    getCheckpointsByProject(projectName) {
        return this.getAllCheckpoints()
            .filter(checkpoint => checkpoint.projectName === projectName);
    }

    async createCheckpoint(data) {
        const checkpoint = {
            id: uuidv4(),
            name: data.name || `Checkpoint ${new Date().toLocaleString()}`,
            description: data.description || '',
            projectName: data.projectName || 'Unknown Project',
            createdAt: new Date().toISOString(),
            type: data.type || 'manual', // manual, auto, milestone
            tags: data.tags || [],
            
            // Session data
            sessionData: {
                files: data.sessionData?.files || [],
                terminalHistory: data.sessionData?.terminalHistory || [],
                gitStatus: data.sessionData?.gitStatus || {},
                openTabs: data.sessionData?.openTabs || [],
                workingDirectory: data.sessionData?.workingDirectory || process.cwd(),
            },
            
            // Metrics
            metrics: {
                codingTime: data.metrics?.codingTime || 0,
                linesChanged: data.metrics?.linesChanged || 0,
                filesModified: data.metrics?.filesModified || 0,
                testsPassing: data.metrics?.testsPassing || null,
                buildStatus: data.metrics?.buildStatus || 'unknown',
            },
            
            // AI Context
            aiContext: {
                currentTask: data.aiContext?.currentTask || '',
                recentPrompts: data.aiContext?.recentPrompts || [],
                modelUsed: data.aiContext?.modelUsed || 'Claude',
                tokensUsed: data.aiContext?.tokensUsed || 0,
            }
        };

        await this.saveCheckpoint(checkpoint);
        return checkpoint;
    }

    async exportCheckpoints(format = 'json', filters = {}) {
        let checkpoints = this.getAllCheckpoints();
        
        // Apply filters
        if (filters.projectName) {
            checkpoints = checkpoints.filter(c => c.projectName === filters.projectName);
        }
        if (filters.startDate) {
            checkpoints = checkpoints.filter(c => new Date(c.createdAt) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
            checkpoints = checkpoints.filter(c => new Date(c.createdAt) <= new Date(filters.endDate));
        }
        if (filters.type) {
            checkpoints = checkpoints.filter(c => c.type === filters.type);
        }

        switch (format) {
        case 'markdown':
            return this.exportAsMarkdown(checkpoints);
        case 'csv':
            return this.exportAsCSV(checkpoints);
        case 'json':
        default:
            return JSON.stringify(checkpoints, null, 2);
        }
    }

    exportAsMarkdown(checkpoints) {
        let markdown = '# Development Checkpoints\n\n';
        markdown += `Generated on: ${new Date().toISOString()}\n`;
        markdown += `Total checkpoints: ${checkpoints.length}\n\n`;

        checkpoints.forEach(checkpoint => {
            markdown += `## ${checkpoint.name}\n\n`;
            markdown += `**Created**: ${new Date(checkpoint.createdAt).toLocaleString()}\n`;
            markdown += `**Project**: ${checkpoint.projectName}\n`;
            markdown += `**Type**: ${checkpoint.type}\n\n`;
            
            if (checkpoint.description) {
                markdown += `**Description**: ${checkpoint.description}\n\n`;
            }

            markdown += '**Metrics**:\n';
            markdown += `- Coding time: ${checkpoint.metrics.codingTime} minutes\n`;
            markdown += `- Lines changed: ${checkpoint.metrics.linesChanged}\n`;
            markdown += `- Files modified: ${checkpoint.metrics.filesModified}\n`;
            markdown += `- Build status: ${checkpoint.metrics.buildStatus}\n\n`;

            if (checkpoint.aiContext.currentTask) {
                markdown += `**AI Context**: ${checkpoint.aiContext.currentTask}\n\n`;
            }

            if (checkpoint.tags.length > 0) {
                markdown += `**Tags**: ${checkpoint.tags.join(', ')}\n\n`;
            }

            markdown += '---\n\n';
        });

        return markdown;
    }

    exportAsCSV(checkpoints) {
        const headers = ['ID', 'Name', 'Project', 'Created', 'Type', 'Description', 'Coding Time', 'Lines Changed', 'Files Modified', 'Build Status', 'Tags'];
        let csv = headers.join(',') + '\n';

        checkpoints.forEach(checkpoint => {
            const row = [
                checkpoint.id,
                `"${checkpoint.name.replace(/"/g, '""')}"`,
                `"${checkpoint.projectName.replace(/"/g, '""')}"`,
                checkpoint.createdAt,
                checkpoint.type,
                `"${(checkpoint.description || '').replace(/"/g, '""')}"`,
                checkpoint.metrics.codingTime,
                checkpoint.metrics.linesChanged,
                checkpoint.metrics.filesModified,
                checkpoint.metrics.buildStatus,
                `"${checkpoint.tags.join(', ').replace(/"/g, '""')}"`
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }
}

// Global checkpoint manager instance
const checkpointManager = new CheckpointManager();

// API Routes

/**
 * GET /api/checkpoints/list
 * Returns all checkpoints with optional filtering
 */
router.get('/list', async (req, res) => {
    try {
        const { project, type, limit, offset } = req.query;
        let checkpoints = checkpointManager.getAllCheckpoints();
        
        // Apply filters
        if (project) {
            checkpoints = checkpointManager.getCheckpointsByProject(project);
        }
        if (type) {
            checkpoints = checkpoints.filter(c => c.type === type);
        }
        
        // Pagination
        const total = checkpoints.length;
        const start = parseInt(offset) || 0;
        const count = parseInt(limit) || 50;
        checkpoints = checkpoints.slice(start, start + count);

        res.json({
            success: true,
            checkpoints,
            pagination: {
                total,
                offset: start,
                limit: count,
                hasMore: start + count < total
            },
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error fetching checkpoints:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/checkpoints/:id
 * Returns a specific checkpoint
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const checkpoint = checkpointManager.getCheckpoint(id);
        
        if (!checkpoint) {
            return res.status(404).json({
                success: false,
                error: 'Checkpoint not found'
            });
        }

        res.json({
            success: true,
            checkpoint,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error fetching checkpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/checkpoints/create
 * Creates a new checkpoint
 */
router.post('/create', async (req, res) => {
    try {
        const checkpointData = req.body;
        
        // Validate required fields
        if (!checkpointData.name) {
            return res.status(400).json({
                success: false,
                error: 'Checkpoint name is required'
            });
        }

        const checkpoint = await checkpointManager.createCheckpoint(checkpointData);

        res.json({
            success: true,
            checkpoint,
            message: 'Checkpoint created successfully',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error creating checkpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/checkpoints/:id
 * Updates an existing checkpoint
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const checkpoint = checkpointManager.getCheckpoint(id);
        if (!checkpoint) {
            return res.status(404).json({
                success: false,
                error: 'Checkpoint not found'
            });
        }

        // Apply updates
        const updatedCheckpoint = {
            ...checkpoint,
            ...updates,
            id, // Ensure ID can't be changed
            updatedAt: new Date().toISOString()
        };

        await checkpointManager.saveCheckpoint(updatedCheckpoint);

        res.json({
            success: true,
            checkpoint: updatedCheckpoint,
            message: 'Checkpoint updated successfully',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error updating checkpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/checkpoints/:id
 * Deletes a checkpoint
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const checkpoint = checkpointManager.getCheckpoint(id);
        if (!checkpoint) {
            return res.status(404).json({
                success: false,
                error: 'Checkpoint not found'
            });
        }

        await checkpointManager.deleteCheckpoint(id);

        res.json({
            success: true,
            message: 'Checkpoint deleted successfully',
            deletedCheckpoint: checkpoint,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error deleting checkpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/checkpoints/export
 * Exports checkpoints in various formats
 */
router.get('/export', async (req, res) => {
    try {
        const { format = 'json', project, type, startDate, endDate } = req.query;
        
        const filters = {};
        if (project) filters.projectName = project;
        if (type) filters.type = type;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const exportData = await checkpointManager.exportCheckpoints(format, filters);
        
        // Set appropriate headers based on format
        let contentType = 'application/json';
        let filename = `checkpoints-${new Date().toISOString().split('T')[0]}.json`;
        
        switch (format) {
        case 'markdown':
            contentType = 'text/markdown';
            filename = `checkpoints-${new Date().toISOString().split('T')[0]}.md`;
            break;
        case 'csv':
            contentType = 'text/csv';
            filename = `checkpoints-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        }

        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`
        });

        res.send(exportData);
    } catch (error) {
        console.error('Error exporting checkpoints:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/checkpoints/stats
 * Returns checkpoint statistics and analytics
 */
router.get('/stats', async (req, res) => {
    try {
        const checkpoints = checkpointManager.getAllCheckpoints();
        const projects = new Set(checkpoints.map(c => c.projectName));
        const types = new Set(checkpoints.map(c => c.type));
        
        // Calculate totals
        const totalCodingTime = checkpoints.reduce((sum, c) => sum + (c.metrics.codingTime || 0), 0);
        const totalLinesChanged = checkpoints.reduce((sum, c) => sum + (c.metrics.linesChanged || 0), 0);
        const totalFilesModified = checkpoints.reduce((sum, c) => sum + (c.metrics.filesModified || 0), 0);
        
        // Recent activity (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentCheckpoints = checkpoints.filter(c => new Date(c.createdAt) > weekAgo);
        
        // Project breakdown
        const projectStats = Array.from(projects).map(project => {
            const projectCheckpoints = checkpointManager.getCheckpointsByProject(project);
            return {
                name: project,
                count: projectCheckpoints.length,
                codingTime: projectCheckpoints.reduce((sum, c) => sum + (c.metrics.codingTime || 0), 0),
                latestCheckpoint: projectCheckpoints[0]?.createdAt || null
            };
        });

        res.json({
            success: true,
            stats: {
                total: checkpoints.length,
                projects: projects.size,
                types: Array.from(types),
                totals: {
                    codingTime: totalCodingTime,
                    linesChanged: totalLinesChanged,
                    filesModified: totalFilesModified
                },
                recent: {
                    count: recentCheckpoints.length,
                    codingTime: recentCheckpoints.reduce((sum, c) => sum + (c.metrics.codingTime || 0), 0)
                },
                projectBreakdown: projectStats
            },
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error fetching checkpoint stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/checkpoints/auto-create
 * Creates an automatic checkpoint based on current session state
 */
router.post('/auto-create', async (req, res) => {
    try {
        const { reason = 'auto', context = {} } = req.body;
        
        // Gather current session information
        const sessionData = {
            workingDirectory: process.cwd(),
            timestamp: new Date().toISOString(),
            reason,
            ...context
        };

        // Try to get git status
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            const { stdout: gitStatus } = await execAsync('git status --porcelain');
            const { stdout: gitBranch } = await execAsync('git branch --show-current');
            
            sessionData.gitStatus = {
                hasChanges: gitStatus.trim().length > 0,
                branch: gitBranch.trim(),
                changedFiles: gitStatus.trim().split('\n').filter(Boolean)
            };
        } catch (error) {
            sessionData.gitStatus = { error: 'Not a git repository or git not available' };
        }

        // Create auto-checkpoint
        const checkpoint = await checkpointManager.createCheckpoint({
            name: `Auto-checkpoint (${reason})`,
            description: `Automatic checkpoint created: ${reason}`,
            type: 'auto',
            tags: ['auto-generated', reason],
            sessionData,
            aiContext: {
                currentTask: context.currentTask || 'Auto-checkpoint',
                modelUsed: 'Claude Code',
                tokensUsed: 0
            }
        });

        res.json({
            success: true,
            checkpoint,
            message: 'Auto-checkpoint created successfully',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error creating auto-checkpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Export checkpoint manager for use by other services
module.exports = { 
    router,
    checkpointManager
};