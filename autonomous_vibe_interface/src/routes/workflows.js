/**
 * Workflow API Routes
 * 
 * RESTful API for the revolutionary workflow automation system.
 * Provides endpoints for creating, executing, and managing workflows.
 */

const express = require('express');
const router = express.Router();
const WorkflowEngine = require('../workflows/engine/WorkflowEngine');
const WorkflowExecutor = require('../workflows/engine/WorkflowExecutor');
const WorkflowState = require('../workflows/engine/WorkflowState');

// Initialize workflow components
let workflowEngine = null;
let workflowExecutor = null;
let workflowState = null;

// Initialize on first use
function ensureInitialized() {
    if (!workflowEngine) {
        workflowEngine = new WorkflowEngine({
            maxConcurrent: 100,
            autoHeal: true,
            debug: process.env.NODE_ENV === 'development'
        });
        
        workflowExecutor = new WorkflowExecutor({
            maxWorkers: 8,
            timeout: 300000
        });
        
        workflowState = new WorkflowState({
            persistState: true,
            enableTimeTravel: true
        });
        
        console.log('✅ Workflow system initialized via API');
    }
}

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    ensureInitialized();
    
    res.json({
        status: 'healthy',
        engine: workflowEngine ? 'ready' : 'not initialized',
        executor: workflowExecutor ? 'ready' : 'not initialized',
        state: workflowState ? 'ready' : 'not initialized',
        timestamp: new Date().toISOString()
    });
});

/**
 * Get workflow engine statistics
 */
router.get('/stats', (req, res) => {
    ensureInitialized();
    
    res.json({
        engine: workflowEngine.getStats(),
        executor: workflowExecutor.getStats(),
        state: workflowState.getStats(),
        timestamp: new Date().toISOString()
    });
});

/**
 * List available workflow templates
 */
router.get('/templates', (req, res) => {
    ensureInitialized();
    
    const templates = Array.from(workflowEngine.templates.entries()).map(([name, Template]) => ({
        name,
        metadata: Template.metadata || {},
        description: Template.metadata?.description || 'No description available'
    }));
    
    res.json({
        templates,
        count: templates.length
    });
});

/**
 * Create and execute a new workflow
 */
router.post('/execute', async (req, res) => {
    ensureInitialized();
    
    try {
        const { definition, context = {} } = req.body;
        
        if (!definition) {
            return res.status(400).json({
                error: 'Workflow definition is required'
            });
        }
        
        // Add session context
        const enrichedContext = {
            ...context,
            sessionId: req.session?.id || 'api',
            userId: req.session?.userId || 'anonymous',
            timestamp: Date.now()
        };
        
        // Execute workflow
        const result = await workflowEngine.executeWorkflow(definition, enrichedContext);
        
        res.json({
            success: true,
            ...result
        });
        
    } catch (error) {
        console.error('Workflow execution error:', error);
        res.status(500).json({
            error: 'Workflow execution failed',
            message: error.message
        });
    }
});

/**
 * Execute a workflow from a template
 */
router.post('/execute-template', async (req, res) => {
    ensureInitialized();
    
    try {
        const { template, params = {}, context = {} } = req.body;
        
        if (!template) {
            return res.status(400).json({
                error: 'Template name is required'
            });
        }
        
        // Create workflow definition from template
        const definition = {
            type: 'template',
            template,
            params
        };
        
        // Add session context
        const enrichedContext = {
            ...context,
            sessionId: req.session?.id || 'api',
            userId: req.session?.userId || 'anonymous',
            timestamp: Date.now()
        };
        
        // Execute workflow
        const result = await workflowEngine.executeWorkflow(definition, enrichedContext);
        
        res.json({
            success: true,
            ...result
        });
        
    } catch (error) {
        console.error('Template execution error:', error);
        res.status(500).json({
            error: 'Template execution failed',
            message: error.message
        });
    }
});

/**
 * Get workflow status
 */
router.get('/status/:workflowId', (req, res) => {
    ensureInitialized();
    
    const { workflowId } = req.params;
    const status = workflowEngine.getWorkflowStatus(workflowId);
    
    if (status.status === 'not_found') {
        return res.status(404).json({
            error: 'Workflow not found',
            workflowId
        });
    }
    
    res.json(status);
});

/**
 * Cancel a running workflow
 */
router.post('/cancel/:workflowId', (req, res) => {
    ensureInitialized();
    
    const { workflowId } = req.params;
    const cancelled = workflowEngine.cancelWorkflow(workflowId);
    
    if (!cancelled) {
        return res.status(404).json({
            error: 'Workflow not found or already completed',
            workflowId
        });
    }
    
    res.json({
        success: true,
        message: 'Workflow cancelled',
        workflowId
    });
});

/**
 * Get workflow state
 */
router.get('/state/:workflowId', (req, res) => {
    ensureInitialized();
    
    const { workflowId } = req.params;
    const state = workflowState.getWorkflowState(workflowId);
    
    res.json({
        workflowId,
        state,
        history: workflowState.getHistory(workflowId, 50)
    });
});

/**
 * Set workflow state value
 */
router.post('/state/:workflowId', async (req, res) => {
    ensureInitialized();
    
    try {
        const { workflowId } = req.params;
        const { key, value } = req.body;
        
        if (!key) {
            return res.status(400).json({
                error: 'State key is required'
            });
        }
        
        await workflowState.setState(workflowId, key, value);
        
        res.json({
            success: true,
            workflowId,
            key,
            value
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to set state',
            message: error.message
        });
    }
});

/**
 * Create workflow snapshot
 */
router.post('/snapshot/:workflowId', (req, res) => {
    ensureInitialized();
    
    try {
        const { workflowId } = req.params;
        const { label } = req.body;
        
        const snapshotId = workflowState.createSnapshot(workflowId, label);
        
        res.json({
            success: true,
            snapshotId,
            workflowId,
            label
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to create snapshot',
            message: error.message
        });
    }
});

/**
 * Restore from snapshot
 */
router.post('/snapshot/restore/:snapshotId', async (req, res) => {
    ensureInitialized();
    
    try {
        const { snapshotId } = req.params;
        
        const snapshot = await workflowState.restoreSnapshot(snapshotId);
        
        res.json({
            success: true,
            snapshot
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to restore snapshot',
            message: error.message
        });
    }
});

/**
 * Create checkpoint
 */
router.post('/checkpoint/:workflowId', (req, res) => {
    ensureInitialized();
    
    try {
        const { workflowId } = req.params;
        const { name, metadata = {} } = req.body;
        
        if (!name) {
            return res.status(400).json({
                error: 'Checkpoint name is required'
            });
        }
        
        const checkpointId = workflowState.createCheckpoint(workflowId, name, metadata);
        
        res.json({
            success: true,
            checkpointId,
            name,
            workflowId
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to create checkpoint',
            message: error.message
        });
    }
});

/**
 * Time travel endpoints
 */

/**
 * Enable time travel for workflow
 */
router.post('/timetravel/:workflowId/enable', (req, res) => {
    ensureInitialized();
    
    try {
        const { workflowId } = req.params;
        
        workflowState.enableTimeTravel(workflowId);
        
        res.json({
            success: true,
            message: 'Time travel enabled',
            workflowId,
            timeline: workflowState.getTimeline(workflowId)
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to enable time travel',
            message: error.message
        });
    }
});

/**
 * Disable time travel
 */
router.post('/timetravel/disable', (req, res) => {
    ensureInitialized();
    
    try {
        workflowState.disableTimeTravel();
        
        res.json({
            success: true,
            message: 'Time travel disabled'
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to disable time travel',
            message: error.message
        });
    }
});

/**
 * Step forward in time
 */
router.post('/timetravel/forward', async (req, res) => {
    ensureInitialized();
    
    try {
        const snapshot = await workflowState.stepForward();
        
        if (!snapshot) {
            return res.json({
                success: false,
                message: 'Already at latest point in timeline'
            });
        }
        
        res.json({
            success: true,
            snapshot,
            currentTime: snapshot.timestamp
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to step forward',
            message: error.message
        });
    }
});

/**
 * Step backward in time
 */
router.post('/timetravel/backward', async (req, res) => {
    ensureInitialized();
    
    try {
        const snapshot = await workflowState.stepBackward();
        
        if (!snapshot) {
            return res.json({
                success: false,
                message: 'Already at earliest point in timeline'
            });
        }
        
        res.json({
            success: true,
            snapshot,
            currentTime: snapshot.timestamp
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to step backward',
            message: error.message
        });
    }
});

/**
 * Jump to specific time
 */
router.post('/timetravel/jump', async (req, res) => {
    ensureInitialized();
    
    try {
        const { timestamp } = req.body;
        
        if (!timestamp) {
            return res.status(400).json({
                error: 'Timestamp is required'
            });
        }
        
        const snapshot = await workflowState.travelToTime(timestamp);
        
        res.json({
            success: true,
            snapshot,
            currentTime: snapshot.timestamp
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to travel to time',
            message: error.message
        });
    }
});

/**
 * Get time travel timeline
 */
router.get('/timetravel/timeline/:workflowId?', (req, res) => {
    ensureInitialized();
    
    const { workflowId } = req.params;
    const timeline = workflowState.getTimeline(workflowId);
    
    res.json({
        timeline,
        count: timeline.length,
        workflowId
    });
});

/**
 * Special workflow operations
 */

/**
 * Execute quantum workflow (parallel realities)
 */
router.post('/quantum/execute', async (req, res) => {
    ensureInitialized();
    
    try {
        const { branches, selectionCriteria = {}, context = {} } = req.body;
        
        if (!branches || !Array.isArray(branches)) {
            return res.status(400).json({
                error: 'Branches array is required for quantum workflow'
            });
        }
        
        const definition = {
            type: 'quantum',
            branches,
            selectionCriteria
        };
        
        const result = await workflowEngine.executeWorkflow(definition, context);
        
        res.json({
            success: true,
            ...result
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Quantum workflow execution failed',
            message: error.message
        });
    }
});

/**
 * Execute swarm workflow (multi-agent)
 */
router.post('/swarm/execute', async (req, res) => {
    ensureInitialized();
    
    try {
        const { agentCount = 10, tasks, specializations = [], context = {} } = req.body;
        
        if (!tasks || !Array.isArray(tasks)) {
            return res.status(400).json({
                error: 'Tasks array is required for swarm workflow'
            });
        }
        
        const definition = {
            type: 'swarm',
            agentCount,
            tasks,
            specializations
        };
        
        const result = await workflowEngine.executeWorkflow(definition, context);
        
        res.json({
            success: true,
            ...result
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Swarm workflow execution failed',
            message: error.message
        });
    }
});

/**
 * WebSocket support for real-time updates
 * NOTE: Requires express-ws middleware which will be added later
 */
// router.ws('/realtime', (ws, req) => {
//     ensureInitialized();
//     
//     console.log('🔌 WebSocket connection established for workflow updates');
//     
//     // Subscribe to workflow events
//     const eventHandlers = {
//         'workflow:started': (data) => {
//             ws.send(JSON.stringify({ event: 'workflow:started', ...data }));
//         },
//         'workflow:completed': (data) => {
//             ws.send(JSON.stringify({ event: 'workflow:completed', ...data }));
//         },
//         'workflow:failed': (data) => {
//             ws.send(JSON.stringify({ event: 'workflow:failed', ...data }));
//         },
//         'workflow:stuck': (data) => {
//             ws.send(JSON.stringify({ event: 'workflow:stuck', ...data }));
//         },
//         'state:changed': (data) => {
//             ws.send(JSON.stringify({ event: 'state:changed', ...data }));
//         }
//     };
//     
//     // Register event listeners
//     Object.entries(eventHandlers).forEach(([event, handler]) => {
//         workflowEngine.on(event, handler);
//     });
//     
//     // Handle incoming messages
//     ws.on('message', (msg) => {
//         try {
//             const data = JSON.parse(msg);
//             
//             if (data.type === 'subscribe') {
//                 console.log(`📡 Client subscribed to workflow: ${data.workflowId}`);
//             }
//             
//         } catch (error) {
//             console.error('WebSocket message error:', error);
//         }
//     });
//     
//     // Clean up on disconnect
//     ws.on('close', () => {
//         console.log('🔌 WebSocket connection closed');
//         
//         // Remove event listeners
//         Object.entries(eventHandlers).forEach(([event, handler]) => {
//             workflowEngine.removeListener(event, handler);
//         });
//     });
// });

module.exports = router;