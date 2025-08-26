/**
 * Workflow State Management
 * 
 * Manages workflow state persistence, snapshots, and time-travel debugging.
 * This is critical for the Time Travel Debugger and state recovery features.
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class WorkflowState extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            persistState: options.persistState !== false,
            stateDirectory: options.stateDirectory || path.join(process.cwd(), '.workflow-state'),
            maxSnapshots: options.maxSnapshots || 100,
            snapshotInterval: options.snapshotInterval || 1000, // Snapshot every second
            compressSnapshots: options.compressSnapshots || true,
            enableTimeTravel: options.enableTimeTravel !== false
        };
        
        // State storage
        this.currentState = new Map();
        this.stateHistory = [];
        this.snapshots = new Map();
        this.checkpoints = new Map();
        
        // Time travel state
        this.timeTravelEnabled = false;
        this.currentTimeIndex = -1;
        this.timeTravelSnapshots = [];
        
        // Persistence
        this.persistenceQueue = [];
        this.isPersisting = false;
        
        this.initialize();
    }
    
    /**
     * Initialize state management
     */
    async initialize() {
        console.log('🗂️ WorkflowState: Initializing state management...');
        
        // Create state directory if needed
        if (this.config.persistState) {
            await this.ensureStateDirectory();
        }
        
        // Start snapshot interval
        if (this.config.enableTimeTravel) {
            this.startSnapshotInterval();
        }
        
        // Load any existing state
        await this.loadPersistedState();
        
        console.log('✅ WorkflowState: Ready for state management');
        this.emit('state:ready');
    }
    
    /**
     * Ensure state directory exists
     */
    async ensureStateDirectory() {
        try {
            await fs.mkdir(this.config.stateDirectory, { recursive: true });
        } catch (error) {
            console.warn('⚠️ Could not create state directory:', error.message);
        }
    }
    
    /**
     * Set workflow state
     */
    async setState(workflowId, key, value) {
        if (!this.currentState.has(workflowId)) {
            this.currentState.set(workflowId, {});
        }
        
        const workflowState = this.currentState.get(workflowId);
        const oldValue = workflowState[key];
        workflowState[key] = value;
        
        // Record state change
        const stateChange = {
            workflowId,
            key,
            oldValue,
            newValue: value,
            timestamp: Date.now()
        };
        
        this.stateHistory.push(stateChange);
        
        // Emit state change event
        this.emit('state:changed', stateChange);
        
        // Queue for persistence
        if (this.config.persistState) {
            this.queuePersistence(workflowId);
        }
        
        return value;
    }
    
    /**
     * Get workflow state
     */
    getState(workflowId, key) {
        const workflowState = this.currentState.get(workflowId);
        
        if (!workflowState) {
            return undefined;
        }
        
        return key ? workflowState[key] : workflowState;
    }
    
    /**
     * Get full state for workflow
     */
    getWorkflowState(workflowId) {
        return this.currentState.get(workflowId) || {};
    }
    
    /**
     * Create state snapshot
     */
    createSnapshot(workflowId, label) {
        const snapshot = {
            id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            workflowId,
            label,
            timestamp: Date.now(),
            state: JSON.parse(JSON.stringify(this.getWorkflowState(workflowId))),
            metadata: {
                historyLength: this.stateHistory.filter(h => h.workflowId === workflowId).length
            }
        };
        
        // Store snapshot
        if (!this.snapshots.has(workflowId)) {
            this.snapshots.set(workflowId, []);
        }
        
        const workflowSnapshots = this.snapshots.get(workflowId);
        workflowSnapshots.push(snapshot);
        
        // Limit snapshots
        if (workflowSnapshots.length > this.config.maxSnapshots) {
            workflowSnapshots.shift();
        }
        
        // Store for time travel
        if (this.config.enableTimeTravel) {
            this.timeTravelSnapshots.push(snapshot);
            if (this.timeTravelSnapshots.length > this.config.maxSnapshots * 2) {
                this.timeTravelSnapshots.shift();
            }
        }
        
        console.log(`📸 Created snapshot: ${snapshot.id} (${label || 'unlabeled'})`);
        
        this.emit('snapshot:created', snapshot);
        
        return snapshot.id;
    }
    
    /**
     * Restore from snapshot
     */
    async restoreSnapshot(snapshotId) {
        // Find snapshot
        let targetSnapshot = null;
        
        for (const [workflowId, snapshots] of this.snapshots) {
            const snapshot = snapshots.find(s => s.id === snapshotId);
            if (snapshot) {
                targetSnapshot = snapshot;
                break;
            }
        }
        
        if (!targetSnapshot) {
            // Check time travel snapshots
            targetSnapshot = this.timeTravelSnapshots.find(s => s.id === snapshotId);
        }
        
        if (!targetSnapshot) {
            throw new Error(`Snapshot ${snapshotId} not found`);
        }
        
        // Restore state
        this.currentState.set(targetSnapshot.workflowId, JSON.parse(JSON.stringify(targetSnapshot.state)));
        
        console.log(`♻️ Restored snapshot: ${snapshotId}`);
        
        this.emit('snapshot:restored', {
            snapshotId,
            workflowId: targetSnapshot.workflowId,
            timestamp: targetSnapshot.timestamp
        });
        
        return targetSnapshot;
    }
    
    /**
     * Create checkpoint (named snapshot)
     */
    createCheckpoint(workflowId, name, metadata = {}) {
        const checkpoint = {
            id: `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            workflowId,
            timestamp: Date.now(),
            state: JSON.parse(JSON.stringify(this.getWorkflowState(workflowId))),
            history: this.stateHistory.filter(h => h.workflowId === workflowId).slice(-100),
            metadata
        };
        
        this.checkpoints.set(name, checkpoint);
        
        console.log(`🏁 Created checkpoint: ${name}`);
        
        this.emit('checkpoint:created', checkpoint);
        
        return checkpoint.id;
    }
    
    /**
     * Restore from checkpoint
     */
    async restoreCheckpoint(name) {
        const checkpoint = this.checkpoints.get(name);
        
        if (!checkpoint) {
            throw new Error(`Checkpoint "${name}" not found`);
        }
        
        // Restore state
        this.currentState.set(checkpoint.workflowId, JSON.parse(JSON.stringify(checkpoint.state)));
        
        // Optionally restore history
        if (checkpoint.history) {
            // Find index in history and truncate
            const lastHistoryItem = checkpoint.history[checkpoint.history.length - 1];
            if (lastHistoryItem) {
                const index = this.stateHistory.findIndex(h => 
                    h.timestamp === lastHistoryItem.timestamp
                );
                if (index > -1) {
                    this.stateHistory = this.stateHistory.slice(0, index + 1);
                }
            }
        }
        
        console.log(`♻️ Restored checkpoint: ${name}`);
        
        this.emit('checkpoint:restored', {
            name,
            workflowId: checkpoint.workflowId,
            timestamp: checkpoint.timestamp
        });
        
        return checkpoint;
    }
    
    /**
     * Enable time travel mode
     */
    enableTimeTravel(workflowId) {
        this.timeTravelEnabled = true;
        this.currentTimeIndex = this.timeTravelSnapshots.length - 1;
        
        console.log(`⏰ Time travel enabled for workflow ${workflowId}`);
        
        // Create initial snapshot
        this.createSnapshot(workflowId, 'Time Travel Start');
        
        this.emit('timetravel:enabled', { workflowId });
    }
    
    /**
     * Disable time travel mode
     */
    disableTimeTravel() {
        this.timeTravelEnabled = false;
        this.currentTimeIndex = -1;
        
        console.log('⏰ Time travel disabled');
        
        this.emit('timetravel:disabled');
    }
    
    /**
     * Travel to specific point in time
     */
    async travelToTime(timestamp) {
        if (!this.timeTravelEnabled) {
            throw new Error('Time travel is not enabled');
        }
        
        // Find closest snapshot
        let closestSnapshot = null;
        let closestDiff = Infinity;
        
        for (let i = 0; i < this.timeTravelSnapshots.length; i++) {
            const snapshot = this.timeTravelSnapshots[i];
            const diff = Math.abs(snapshot.timestamp - timestamp);
            
            if (diff < closestDiff) {
                closestDiff = diff;
                closestSnapshot = snapshot;
                this.currentTimeIndex = i;
            }
        }
        
        if (closestSnapshot) {
            await this.restoreSnapshot(closestSnapshot.id);
            
            console.log(`⏰ Traveled to time: ${new Date(closestSnapshot.timestamp).toISOString()}`);
            
            this.emit('timetravel:jumped', {
                timestamp: closestSnapshot.timestamp,
                snapshotId: closestSnapshot.id
            });
            
            return closestSnapshot;
        }
        
        throw new Error('No snapshots available for time travel');
    }
    
    /**
     * Step forward in time
     */
    async stepForward() {
        if (!this.timeTravelEnabled) {
            throw new Error('Time travel is not enabled');
        }
        
        if (this.currentTimeIndex < this.timeTravelSnapshots.length - 1) {
            this.currentTimeIndex++;
            const snapshot = this.timeTravelSnapshots[this.currentTimeIndex];
            await this.restoreSnapshot(snapshot.id);
            
            console.log(`⏩ Stepped forward to: ${new Date(snapshot.timestamp).toISOString()}`);
            
            this.emit('timetravel:forward', {
                timestamp: snapshot.timestamp,
                snapshotId: snapshot.id
            });
            
            return snapshot;
        }
        
        return null; // Already at latest
    }
    
    /**
     * Step backward in time
     */
    async stepBackward() {
        if (!this.timeTravelEnabled) {
            throw new Error('Time travel is not enabled');
        }
        
        if (this.currentTimeIndex > 0) {
            this.currentTimeIndex--;
            const snapshot = this.timeTravelSnapshots[this.currentTimeIndex];
            await this.restoreSnapshot(snapshot.id);
            
            console.log(`⏪ Stepped backward to: ${new Date(snapshot.timestamp).toISOString()}`);
            
            this.emit('timetravel:backward', {
                timestamp: snapshot.timestamp,
                snapshotId: snapshot.id
            });
            
            return snapshot;
        }
        
        return null; // Already at earliest
    }
    
    /**
     * Get time travel timeline
     */
    getTimeline(workflowId) {
        const snapshots = workflowId ? 
            this.timeTravelSnapshots.filter(s => s.workflowId === workflowId) :
            this.timeTravelSnapshots;
        
        return snapshots.map(s => ({
            id: s.id,
            timestamp: s.timestamp,
            label: s.label,
            isCurrent: this.timeTravelSnapshots[this.currentTimeIndex]?.id === s.id
        }));
    }
    
    /**
     * Clear workflow state
     */
    clearWorkflowState(workflowId) {
        this.currentState.delete(workflowId);
        this.snapshots.delete(workflowId);
        
        // Remove from history
        this.stateHistory = this.stateHistory.filter(h => h.workflowId !== workflowId);
        this.timeTravelSnapshots = this.timeTravelSnapshots.filter(s => s.workflowId !== workflowId);
        
        // Remove checkpoints
        for (const [name, checkpoint] of this.checkpoints) {
            if (checkpoint.workflowId === workflowId) {
                this.checkpoints.delete(name);
            }
        }
        
        console.log(`🗑️ Cleared state for workflow ${workflowId}`);
        
        this.emit('state:cleared', { workflowId });
    }
    
    /**
     * Get state history
     */
    getHistory(workflowId, limit = 100) {
        const history = workflowId ? 
            this.stateHistory.filter(h => h.workflowId === workflowId) :
            this.stateHistory;
        
        return history.slice(-limit);
    }
    
    /**
     * Queue persistence
     */
    queuePersistence(workflowId) {
        if (!this.persistenceQueue.includes(workflowId)) {
            this.persistenceQueue.push(workflowId);
        }
        
        if (!this.isPersisting) {
            this.processPersistenceQueue();
        }
    }
    
    /**
     * Process persistence queue
     */
    async processPersistenceQueue() {
        if (this.persistenceQueue.length === 0) {
            this.isPersisting = false;
            return;
        }
        
        this.isPersisting = true;
        
        while (this.persistenceQueue.length > 0) {
            const workflowId = this.persistenceQueue.shift();
            await this.persistWorkflowState(workflowId);
        }
        
        this.isPersisting = false;
    }
    
    /**
     * Persist workflow state to disk
     */
    async persistWorkflowState(workflowId) {
        if (!this.config.persistState) {
            return;
        }
        
        try {
            const state = this.getWorkflowState(workflowId);
            const filePath = path.join(this.config.stateDirectory, `${workflowId}.json`);
            
            await fs.writeFile(filePath, JSON.stringify({
                workflowId,
                state,
                timestamp: Date.now(),
                snapshots: this.snapshots.get(workflowId) || []
            }, null, 2));
            
        } catch (error) {
            console.warn(`⚠️ Failed to persist state for ${workflowId}:`, error.message);
        }
    }
    
    /**
     * Load persisted state
     */
    async loadPersistedState() {
        if (!this.config.persistState) {
            return;
        }
        
        try {
            const files = await fs.readdir(this.config.stateDirectory);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(this.config.stateDirectory, file);
                        const content = await fs.readFile(filePath, 'utf8');
                        const data = JSON.parse(content);
                        
                        // Restore state
                        this.currentState.set(data.workflowId, data.state);
                        
                        // Restore snapshots
                        if (data.snapshots) {
                            this.snapshots.set(data.workflowId, data.snapshots);
                        }
                        
                        console.log(`📂 Loaded persisted state for ${data.workflowId}`);
                        
                    } catch (error) {
                        console.warn(`⚠️ Failed to load state from ${file}:`, error.message);
                    }
                }
            }
            
        } catch (error) {
            // Directory might not exist yet
        }
    }
    
    /**
     * Start snapshot interval
     */
    startSnapshotInterval() {
        this.snapshotInterval = setInterval(() => {
            // Create snapshots for all active workflows
            for (const [workflowId] of this.currentState) {
                this.createSnapshot(workflowId, 'Auto');
            }
        }, this.config.snapshotInterval);
    }
    
    /**
     * Get state statistics
     */
    getStats() {
        return {
            workflows: this.currentState.size,
            historyLength: this.stateHistory.length,
            totalSnapshots: Array.from(this.snapshots.values()).reduce((sum, s) => sum + s.length, 0),
            checkpoints: this.checkpoints.size,
            timeTravelSnapshots: this.timeTravelSnapshots.length,
            persistenceQueue: this.persistenceQueue.length,
            timeTravelEnabled: this.timeTravelEnabled,
            currentTimeIndex: this.currentTimeIndex
        };
    }
    
    /**
     * Shutdown state management
     */
    async shutdown() {
        console.log('🛑 Shutting down WorkflowState...');
        
        // Stop snapshot interval
        if (this.snapshotInterval) {
            clearInterval(this.snapshotInterval);
        }
        
        // Persist all pending states
        await this.processPersistenceQueue();
        
        // Final persistence
        for (const [workflowId] of this.currentState) {
            await this.persistWorkflowState(workflowId);
        }
        
        console.log('✅ WorkflowState shutdown complete');
    }
}

module.exports = WorkflowState;