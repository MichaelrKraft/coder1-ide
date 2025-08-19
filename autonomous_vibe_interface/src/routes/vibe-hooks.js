/**
 * Vibe Hooks API Routes
 * 
 * Manages pattern-based automation hooks for vibe coders.
 * Different from regular Claude Code hooks - these are created from detected patterns.
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Data storage paths
const VIBE_HOOKS_FILE = path.join(__dirname, '../../data/vibe-hooks.json');
const HOOK_USAGE_FILE = path.join(__dirname, '../../data/vibe-hook-usage.json');

// Initialize data files
async function initializeVibeHooksData() {
    try {
        const dataDir = path.dirname(VIBE_HOOKS_FILE);
        await fs.mkdir(dataDir, { recursive: true });
        
        // Initialize vibe hooks file
        try {
            await fs.access(VIBE_HOOKS_FILE);
        } catch {
            const defaultHooks = {
                hooks: [],
                totalHooks: 0,
                activeHooks: 0,
                lastUpdated: new Date().toISOString()
            };
            await fs.writeFile(VIBE_HOOKS_FILE, JSON.stringify(defaultHooks, null, 2));
        }
        
        // Initialize usage tracking file
        try {
            await fs.access(HOOK_USAGE_FILE);
        } catch {
            const defaultUsage = {
                executions: [],
                stats: {
                    totalExecutions: 0,
                    totalTokensSaved: 0,
                    averageExecutionTime: 0
                },
                lastUpdated: new Date().toISOString()
            };
            await fs.writeFile(HOOK_USAGE_FILE, JSON.stringify(defaultUsage, null, 2));
        }
    } catch (error) {
        console.log('Failed to initialize vibe hooks data:', error.message);
    }
}

// Load hooks data
async function loadVibeHooks() {
    try {
        const data = await fs.readFile(VIBE_HOOKS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('Failed to load vibe hooks:', error.message);
        return { hooks: [], totalHooks: 0, activeHooks: 0 };
    }
}

// Save hooks data
async function saveVibeHooks(data) {
    try {
        data.lastUpdated = new Date().toISOString();
        await fs.writeFile(VIBE_HOOKS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('Failed to save vibe hooks:', error.message);
        throw error;
    }
}

// Generate unique hook ID
function generateHookId() {
    return `vibe_hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validate hook data
function validateHookData(hookData) {
    const errors = [];
    
    if (!hookData.name || hookData.name.trim().length === 0) {
        errors.push('Hook name is required');
    }
    
    if (!hookData.prompt || hookData.prompt.trim().length === 0) {
        errors.push('Hook prompt is required');
    }
    
    if (hookData.trigger && hookData.trigger.trim().length > 0) {
        // Validate trigger format (alphanumeric, hyphens, underscores only)
        if (!/^[a-zA-Z0-9_-]+$/.test(hookData.trigger.trim())) {
            errors.push('Trigger command can only contain letters, numbers, hyphens, and underscores');
        }
    }
    
    return errors;
}

// Initialize on module load
initializeVibeHooksData();

// Routes

/**
 * GET /api/vibe-hooks/list
 * Get all vibe hooks for the current user
 */
router.get('/list', async (req, res) => {
    try {
        const hooksData = await loadVibeHooks();
        
        res.json({
            success: true,
            hooks: hooksData.hooks.map(hook => ({
                id: hook.id,
                name: hook.name,
                trigger: hook.trigger,
                isActive: hook.isActive,
                createdAt: hook.createdAt,
                lastUsed: hook.lastUsed,
                usageCount: hook.usageCount || 0,
                estimatedSavings: hook.estimatedSavings || 0
            })),
            stats: {
                totalHooks: hooksData.totalHooks,
                activeHooks: hooksData.activeHooks
            }
        });
    } catch (error) {
        console.error('Error listing vibe hooks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load vibe hooks'
        });
    }
});

/**
 * POST /api/vibe-hooks/create
 * Create a new vibe hook from pattern detection
 */
router.post('/create', async (req, res) => {
    try {
        const hookData = req.body;
        
        // Validate hook data
        const validationErrors = validateHookData(hookData);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
        }
        
        const hooksData = await loadVibeHooks();
        
        // Check if trigger command already exists
        if (hookData.trigger && hookData.trigger.trim()) {
            const existingHook = hooksData.hooks.find(
                h => h.trigger && h.trigger.toLowerCase() === hookData.trigger.trim().toLowerCase()
            );
            if (existingHook) {
                return res.status(400).json({
                    success: false,
                    error: `Trigger command "${hookData.trigger}" already exists`
                });
            }
        }
        
        // Create new vibe hook
        const newHook = {
            id: generateHookId(),
            name: hookData.name.trim(),
            trigger: hookData.trigger ? hookData.trigger.trim() : null,
            prompt: hookData.prompt.trim(),
            isActive: hookData.isActive !== false, // Default to true
            createdAt: hookData.createdAt || new Date().toISOString(),
            usageCount: 0,
            estimatedSavings: hookData.estimatedSavings || 0,
            lastUsed: null,
            type: 'pattern-based', // Distinguish from template-based hooks
            source: 'vibe-dashboard', // Source of creation
            metadata: {
                createdBy: 'vibe-dashboard',
                version: '1.0',
                patternFrequency: hookData.patternFrequency || 0
            }
        };
        
        // Add hook to data
        hooksData.hooks.push(newHook);
        hooksData.totalHooks = hooksData.hooks.length;
        hooksData.activeHooks = hooksData.hooks.filter(h => h.isActive).length;
        
        // Save to file
        await saveVibeHooks(hooksData);
        
        res.json({
            success: true,
            hook: {
                id: newHook.id,
                name: newHook.name,
                trigger: newHook.trigger,
                isActive: newHook.isActive,
                createdAt: newHook.createdAt,
                estimatedSavings: newHook.estimatedSavings
            },
            message: 'Vibe hook created successfully'
        });
        
    } catch (error) {
        console.error('Error creating vibe hook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create vibe hook'
        });
    }
});

/**
 * GET /api/vibe-hooks/:id
 * Get a specific vibe hook by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const hookId = req.params.id;
        const hooksData = await loadVibeHooks();
        
        const hook = hooksData.hooks.find(h => h.id === hookId);
        if (!hook) {
            return res.status(404).json({
                success: false,
                error: 'Vibe hook not found'
            });
        }
        
        res.json({
            success: true,
            hook: hook
        });
        
    } catch (error) {
        console.error('Error fetching vibe hook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vibe hook'
        });
    }
});

/**
 * PUT /api/vibe-hooks/:id
 * Update an existing vibe hook
 */
router.put('/:id', async (req, res) => {
    try {
        const hookId = req.params.id;
        const updateData = req.body;
        
        const hooksData = await loadVibeHooks();
        const hookIndex = hooksData.hooks.findIndex(h => h.id === hookId);
        
        if (hookIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Vibe hook not found'
            });
        }
        
        // Validate updated data
        const validationErrors = validateHookData(updateData);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
        }
        
        // Check trigger uniqueness (excluding current hook)
        if (updateData.trigger && updateData.trigger.trim()) {
            const existingHook = hooksData.hooks.find(
                h => h.id !== hookId && h.trigger && 
                h.trigger.toLowerCase() === updateData.trigger.trim().toLowerCase()
            );
            if (existingHook) {
                return res.status(400).json({
                    success: false,
                    error: `Trigger command "${updateData.trigger}" already exists`
                });
            }
        }
        
        // Update hook
        const existingHook = hooksData.hooks[hookIndex];
        hooksData.hooks[hookIndex] = {
            ...existingHook,
            name: updateData.name.trim(),
            trigger: updateData.trigger ? updateData.trigger.trim() : null,
            prompt: updateData.prompt.trim(),
            isActive: updateData.isActive !== false,
            updatedAt: new Date().toISOString()
        };
        
        // Update active count
        hooksData.activeHooks = hooksData.hooks.filter(h => h.isActive).length;
        
        await saveVibeHooks(hooksData);
        
        res.json({
            success: true,
            hook: hooksData.hooks[hookIndex],
            message: 'Vibe hook updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating vibe hook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update vibe hook'
        });
    }
});

/**
 * DELETE /api/vibe-hooks/:id
 * Delete a vibe hook
 */
router.delete('/:id', async (req, res) => {
    try {
        const hookId = req.params.id;
        const hooksData = await loadVibeHooks();
        
        const hookIndex = hooksData.hooks.findIndex(h => h.id === hookId);
        if (hookIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Vibe hook not found'
            });
        }
        
        // Remove hook
        const deletedHook = hooksData.hooks.splice(hookIndex, 1)[0];
        
        // Update counts
        hooksData.totalHooks = hooksData.hooks.length;
        hooksData.activeHooks = hooksData.hooks.filter(h => h.isActive).length;
        
        await saveVibeHooks(hooksData);
        
        res.json({
            success: true,
            message: `Vibe hook "${deletedHook.name}" deleted successfully`
        });
        
    } catch (error) {
        console.error('Error deleting vibe hook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete vibe hook'
        });
    }
});

/**
 * POST /api/vibe-hooks/:id/toggle
 * Toggle vibe hook active status
 */
router.post('/:id/toggle', async (req, res) => {
    try {
        const hookId = req.params.id;
        const hooksData = await loadVibeHooks();
        
        const hookIndex = hooksData.hooks.findIndex(h => h.id === hookId);
        if (hookIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Vibe hook not found'
            });
        }
        
        // Toggle active status
        hooksData.hooks[hookIndex].isActive = !hooksData.hooks[hookIndex].isActive;
        hooksData.hooks[hookIndex].updatedAt = new Date().toISOString();
        
        // Update active count
        hooksData.activeHooks = hooksData.hooks.filter(h => h.isActive).length;
        
        await saveVibeHooks(hooksData);
        
        res.json({
            success: true,
            hook: hooksData.hooks[hookIndex],
            message: `Vibe hook ${hooksData.hooks[hookIndex].isActive ? 'activated' : 'deactivated'}`
        });
        
    } catch (error) {
        console.error('Error toggling vibe hook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle vibe hook'
        });
    }
});

/**
 * GET /api/vibe-hooks/stats
 * Get vibe hook usage statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const hooksData = await loadVibeHooks();
        
        // Calculate stats
        const totalUsage = hooksData.hooks.reduce((sum, hook) => sum + (hook.usageCount || 0), 0);
        const totalEstimatedSavings = hooksData.hooks.reduce((sum, hook) => sum + (hook.estimatedSavings || 0), 0);
        
        // Most used hooks
        const mostUsedHooks = hooksData.hooks
            .filter(h => h.usageCount > 0)
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, 5)
            .map(h => ({
                id: h.id,
                name: h.name,
                usageCount: h.usageCount,
                lastUsed: h.lastUsed,
                estimatedSavings: h.estimatedSavings
            }));
        
        res.json({
            success: true,
            stats: {
                totalHooks: hooksData.totalHooks,
                activeHooks: hooksData.activeHooks,
                totalUsage: totalUsage,
                totalEstimatedSavings: totalEstimatedSavings,
                averageUsagePerHook: hooksData.totalHooks > 0 ? Math.round(totalUsage / hooksData.totalHooks) : 0,
                mostUsedHooks: mostUsedHooks,
                weeklyTokenSavings: Math.round(totalEstimatedSavings * 7)
            }
        });
        
    } catch (error) {
        console.error('Error fetching vibe hook stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vibe hook statistics'
        });
    }
});

module.exports = router;