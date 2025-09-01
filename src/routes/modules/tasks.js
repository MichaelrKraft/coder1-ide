/**
 * Tasks Module
 * Handles task creation and management
 */

const express = require('express');
const router = express.Router();

// In-memory task storage (replace with database in production)
const tasks = new Map();

// Create a new task
router.post('/create', (req, res) => {
    try {
        const { description, metadata = {} } = req.body;
        
        if (!description) {
            return res.status(400).json({
                success: false,
                error: 'Task description is required'
            });
        }
        
        const task = {
            id: `task_${Date.now()}`,
            description,
            metadata,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        tasks.set(task.id, task);
        
        console.log(`✅ Created task: ${task.id}`);
        
        res.json({
            success: true,
            task
        });
        
    } catch (error) {
        console.error('❌ Task creation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create task'
        });
    }
});

// Get all tasks
router.get('/', (req, res) => {
    const allTasks = Array.from(tasks.values());
    
    res.json({
        success: true,
        count: allTasks.length,
        tasks: allTasks
    });
});

// Get a specific task
router.get('/:taskId', (req, res) => {
    const { taskId } = req.params;
    const task = tasks.get(taskId);
    
    if (!task) {
        return res.status(404).json({
            success: false,
            error: 'Task not found'
        });
    }
    
    res.json({
        success: true,
        task
    });
});

// Update task status
router.patch('/:taskId/status', (req, res) => {
    const { taskId } = req.params;
    const { status } = req.body;
    
    const task = tasks.get(taskId);
    
    if (!task) {
        return res.status(404).json({
            success: false,
            error: 'Task not found'
        });
    }
    
    if (!['pending', 'in_progress', 'completed', 'failed'].includes(status)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid status. Must be: pending, in_progress, completed, or failed'
        });
    }
    
    task.status = status;
    task.updatedAt = new Date().toISOString();
    
    if (status === 'completed') {
        task.completedAt = new Date().toISOString();
    }
    
    tasks.set(taskId, task);
    
    res.json({
        success: true,
        task
    });
});

// Delete a task
router.delete('/:taskId', (req, res) => {
    const { taskId } = req.params;
    
    if (!tasks.has(taskId)) {
        return res.status(404).json({
            success: false,
            error: 'Task not found'
        });
    }
    
    tasks.delete(taskId);
    
    res.json({
        success: true,
        message: 'Task deleted successfully'
    });
});

module.exports = router;