/**
 * Task Bridge Service - Terminal to Task Management Integration
 * 
 * Bridges the gap between terminal errors/commands and the task management system.
 * Listens to ErrorDoctor events and automatically creates tasks in the Kanban board.
 * Part of the Learning Development Environment evolution.
 */

const EventEmitter = require('events');

class TaskBridgeService extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.logger = options.logger || console;
        this.io = options.io; // Socket.io instance
        this.isEnabled = true;
        
        // Task creation settings
        this.autoCreateTasks = true;
        this.taskPriority = {
            error: 'high',
            warning: 'medium',
            info: 'low'
        };
        
        // Track created tasks to avoid duplicates
        this.recentTasks = new Map(); // errorHash -> taskId
        this.taskTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Statistics
        this.stats = {
            tasksCreated: 0,
            errorsProcessed: 0,
            commandsTracked: 0,
            successfulFixes: 0
        };
        
        this.logger.log('🌉 Task Bridge Service initialized');
    }
    
    /**
     * Initialize the service and set up event listeners
     */
    initialize() {
        if (!this.io) {
            this.logger.warn('⚠️ Task Bridge: No Socket.io instance provided');
            return;
        }
        
        // Listen to main namespace for error events (not /terminal namespace)
        // The error-doctor:analysis events are emitted on the main socket connection
        this.io.on('connection', (socket) => {
            this.setupSocketListeners(socket);
        });
        
        this.logger.log('✅ Task Bridge: Listening for error-doctor events');
    }
    
    /**
     * Set up listeners for a connected socket
     */
    setupSocketListeners(socket) {
        // Listen for task-bridge specific error events
        // This is separate from error-doctor:analysis to avoid UI interference
        socket.on('task-bridge:error', (data) => {
            this.handleErrorAnalysis(socket, data);
        });
        
        // Listen for fix applications
        socket.on('error-doctor:fix-applied', (data) => {
            this.handleFixApplied(socket, data);
        });
        
        // Listen for command executions (future enhancement)
        socket.on('terminal:command', (data) => {
            this.handleCommand(socket, data);
        });
    }
    
    /**
     * Handle error analysis from ErrorDoctor
     */
    async handleErrorAnalysis(socket, data) {
        if (!this.isEnabled || !this.autoCreateTasks) {
            return;
        }
        
        try {
            const { analysis, sessionId, timestamp } = data;
            
            // Skip if no fixes available (might be a false positive)
            if (!analysis.fixes || analysis.fixes.length === 0) {
                return;
            }
            
            this.stats.errorsProcessed++;
            
            // Generate a hash to detect duplicate errors
            const errorHash = this.generateErrorHash(analysis);
            
            // Check if we've already created a task for this error recently
            if (this.recentTasks.has(errorHash)) {
                const existingTaskId = this.recentTasks.get(errorHash);
                this.logger.log(`📋 Task Bridge: Duplicate error, existing task: ${existingTaskId}`);
                return;
            }
            
            // Create a new task
            const task = this.createTaskFromError(analysis, sessionId);
            
            // Store the task to prevent duplicates
            this.recentTasks.set(errorHash, task.id);
            setTimeout(() => {
                this.recentTasks.delete(errorHash);
            }, this.taskTimeout);
            
            // Emit task creation event
            this.emitTaskCreation(socket, task);
            
            this.stats.tasksCreated++;
            this.logger.log(`✅ Task Bridge: Created task for error - ${task.title}`);
            
        } catch (error) {
            this.logger.error('❌ Task Bridge: Failed to create task from error:', error);
        }
    }
    
    /**
     * Handle successful fix application
     */
    handleFixApplied(socket, data) {
        try {
            const { fix, sessionId } = data;
            
            this.stats.successfulFixes++;
            
            // Find related task and mark as resolved
            const taskUpdate = {
                type: 'task:update',
                taskId: data.taskId, // If available
                status: 'resolved',
                resolution: fix.title,
                timestamp: Date.now()
            };
            
            // Emit task update
            socket.emit('task:updated', taskUpdate);
            socket.broadcast.emit('task:updated', taskUpdate);
            
            this.logger.log(`✅ Task Bridge: Task resolved via fix - ${fix.title}`);
            
        } catch (error) {
            this.logger.error('❌ Task Bridge: Failed to update task:', error);
        }
    }
    
    /**
     * Handle command execution (for future command tracking)
     */
    handleCommand(socket, data) {
        if (!this.isEnabled) {
            return;
        }
        
        try {
            const { command, sessionId, timestamp } = data;
            
            this.stats.commandsTracked++;
            
            // Analyze command for task-worthy patterns
            const taskableCommand = this.analyzeCommand(command);
            
            if (taskableCommand) {
                const task = this.createTaskFromCommand(taskableCommand, sessionId);
                this.emitTaskCreation(socket, task);
                this.stats.tasksCreated++;
            }
            
        } catch (error) {
            this.logger.error('❌ Task Bridge: Failed to process command:', error);
        }
    }
    
    /**
     * Create a task object from an error analysis
     */
    createTaskFromError(analysis, sessionId) {
        const primaryFix = analysis.fixes[0];
        const additionalFixes = analysis.fixes.slice(1);
        
        const task = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'error',
            status: 'backlog',
            priority: this.getPriorityFromConfidence(analysis.confidence),
            title: `Fix: ${this.extractErrorTitle(analysis)}`,
            description: analysis.explanation || 'Terminal error detected',
            source: 'terminal-error',
            sessionId: sessionId,
            createdAt: new Date().toISOString(),
            
            // Error-specific metadata
            error: {
                confidence: analysis.confidence,
                source: analysis.source
            },
            
            // Suggested fixes
            suggestedFix: {
                primary: {
                    title: primaryFix.title,
                    description: primaryFix.description,
                    command: primaryFix.command,
                    confidence: primaryFix.confidence,
                    requiresFileEdit: primaryFix.requiresFileEdit
                },
                alternatives: additionalFixes.map(fix => ({
                    title: fix.title,
                    description: fix.description,
                    command: fix.command,
                    confidence: fix.confidence
                }))
            },
            
            // Auto-fix capability
            autoFixAvailable: !!primaryFix.command && !primaryFix.requiresFileEdit,
            
            // Tags for filtering
            tags: this.generateTags(analysis)
        };
        
        return task;
    }
    
    /**
     * Create a task from a command (future enhancement)
     */
    createTaskFromCommand(commandAnalysis, sessionId) {
        return {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'command',
            status: 'in-progress',
            priority: 'medium',
            title: commandAnalysis.title,
            description: commandAnalysis.description,
            source: 'terminal-command',
            sessionId: sessionId,
            createdAt: new Date().toISOString(),
            
            command: {
                original: commandAnalysis.command,
                type: commandAnalysis.type,
                expectedOutcome: commandAnalysis.expectedOutcome
            },
            
            tags: commandAnalysis.tags || []
        };
    }
    
    /**
     * Emit task creation to all connected clients
     */
    emitTaskCreation(socket, task) {
        const event = {
            type: 'task:created',
            task: task,
            timestamp: Date.now()
        };
        
        // Emit to the current client
        socket.emit('task:created', event);
        
        // Broadcast to all other clients
        socket.broadcast.emit('task:created', event);
        
        // Also emit on the main namespace for the Kanban board
        if (this.io) {
            this.io.emit('task:created', event);
        }
        
        // Emit internal event
        this.emit('taskCreated', task);
    }
    
    /**
     * Generate a hash to identify duplicate errors
     */
    generateErrorHash(analysis) {
        const key = `${analysis.source}-${analysis.fixes[0]?.title || 'unknown'}`;
        return Buffer.from(key).toString('base64').substr(0, 16);
    }
    
    /**
     * Extract a readable title from error analysis
     */
    extractErrorTitle(analysis) {
        if (analysis.fixes && analysis.fixes[0]) {
            // Use the primary fix title as base
            const fixTitle = analysis.fixes[0].title;
            
            // Clean up common patterns
            return fixTitle
                .replace(/^Fix:\s*/i, '')
                .replace(/^Resolve:\s*/i, '')
                .replace(/^Error:\s*/i, '');
        }
        
        return 'Unknown Error';
    }
    
    /**
     * Determine priority based on confidence level
     */
    getPriorityFromConfidence(confidence) {
        switch (confidence) {
        case 'high':
            return 'high';
        case 'medium':
            return 'medium';
        case 'low':
            return 'low';
        default:
            return 'medium';
        }
    }
    
    /**
     * Generate tags for task filtering
     */
    generateTags(analysis) {
        const tags = [];
        
        // Add source tag
        if (analysis.source === 'quick-fix') {
            tags.push('quick-fix');
        } else if (analysis.source === 'ai-analysis') {
            tags.push('ai-suggested');
        }
        
        // Add confidence tag
        tags.push(`confidence-${analysis.confidence || 'unknown'}`);
        
        // Add error type tags
        if (analysis.fixes && analysis.fixes[0]) {
            const fixTitle = analysis.fixes[0].title.toLowerCase();
            
            if (fixTitle.includes('module') || fixTitle.includes('import')) {
                tags.push('dependency');
            }
            if (fixTitle.includes('syntax')) {
                tags.push('syntax');
            }
            if (fixTitle.includes('type')) {
                tags.push('type-error');
            }
            if (fixTitle.includes('permission')) {
                tags.push('permissions');
            }
            if (fixTitle.includes('port')) {
                tags.push('networking');
            }
        }
        
        // Add auto-fix capability tag
        if (analysis.fixes[0]?.command && !analysis.fixes[0]?.requiresFileEdit) {
            tags.push('auto-fixable');
        }
        
        return tags;
    }
    
    /**
     * Analyze a command for task-worthy patterns (future enhancement)
     */
    analyzeCommand(command) {
        // This is a placeholder for future command analysis
        // Will detect patterns like:
        // - TODO comments
        // - FIXME comments
        // - Failed builds
        // - Failed tests
        // - Git operations
        
        const patterns = {
            todo: /TODO:|FIXME:|XXX:/i,
            build: /npm run build|yarn build|make/i,
            test: /npm test|yarn test|jest|mocha/i,
            git: /git commit|git push|git pull/i
        };
        
        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(command)) {
                return {
                    command: command,
                    type: type,
                    title: `Complete: ${command.substr(0, 50)}`,
                    description: 'Task generated from command execution',
                    tags: [type, 'command-generated']
                };
            }
        }
        
        return null;
    }
    
    /**
     * Get current statistics
     */
    getStats() {
        return {
            ...this.stats,
            recentTasksCount: this.recentTasks.size,
            isEnabled: this.isEnabled,
            autoCreateTasks: this.autoCreateTasks
        };
    }
    
    /**
     * Toggle auto task creation
     */
    toggleAutoCreate(enabled) {
        this.autoCreateTasks = enabled;
        this.logger.log(`🔧 Task Bridge: Auto-create tasks ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Clear recent tasks cache
     */
    clearRecentTasks() {
        this.recentTasks.clear();
        this.logger.log('🧹 Task Bridge: Cleared recent tasks cache');
    }
}

module.exports = TaskBridgeService;