/**
 * Claude File Activity Tracker
 * 
 * Tracks file operations performed by Claude Code agent and provides
 * real-time updates for UI components (especially FileExplorer).
 * 
 * Features:
 * - Track current file being worked on by Claude
 * - Emit events for real-time UI updates
 * - Support for multiple file operations (read, write, edit, analyze)
 * - Graceful error handling and fallbacks
 * - Session-based tracking with cleanup
 */

const EventEmitter = require('events');

class ClaudeFileTracker extends EventEmitter {
    constructor() {
        super();
        
        // Current file activity state
        this.currentActivity = {
            file: null,              // Currently active file path
            fileName: null,          // Display name of current file
            operation: 'idle',       // idle, reading, writing, editing, analyzing
            startTime: null,         // When current operation started
            sessionId: null,         // Current Claude session ID
            lastUpdate: null         // Last activity timestamp
        };
        
        // Activity history for analytics
        this.activityHistory = [];
        
        // Session tracking
        this.activeSessions = new Map();
        
        // Operation timeout (auto-reset to idle after inactivity)
        this.idleTimeout = null;
        this.IDLE_TIMEOUT_MS = 30000; // 30 seconds
        
        console.log('🎯 Claude File Tracker initialized');
    }
    
    /**
     * Track file operation by Claude Code agent
     */
    trackFileOperation(filePath, operation = 'reading', sessionId = null, metadata = {}) {
        try {
            // Clear existing idle timeout
            if (this.idleTimeout) {
                clearTimeout(this.idleTimeout);
            }
            
            const fileName = this.extractFileName(filePath);
            const timestamp = Date.now();
            
            // Update current activity
            const previousActivity = { ...this.currentActivity };
            this.currentActivity = {
                file: filePath,
                fileName: fileName,
                operation: operation,
                startTime: timestamp,
                sessionId: sessionId,
                lastUpdate: timestamp,
                metadata: metadata
            };
            
            // Add to history
            this.activityHistory.push({
                ...this.currentActivity,
                previousFile: previousActivity.file,
                previousOperation: previousActivity.operation
            });
            
            // Keep history manageable (last 100 operations)
            if (this.activityHistory.length > 100) {
                this.activityHistory = this.activityHistory.slice(-100);
            }
            
            // Update session tracking
            if (sessionId) {
                this.activeSessions.set(sessionId, {
                    currentFile: filePath,
                    operations: this.activeSessions.get(sessionId)?.operations || 0 + 1,
                    startTime: this.activeSessions.get(sessionId)?.startTime || timestamp,
                    lastActivity: timestamp
                });
            }
            
            console.log(`🎯 Claude File Tracker: ${operation} ${fileName}`);
            
            // Emit event for real-time updates
            this.emit('fileActivity', this.currentActivity);
            this.emit('activityChange', {
                type: 'fileOperation',
                data: this.currentActivity,
                timestamp: timestamp
            });
            
            // Set idle timeout
            this.setIdleTimeout();
            
            return true;
        } catch (error) {
            console.error('❌ Error tracking file operation:', error);
            return false;
        }
    }
    
    /**
     * Mark Claude as idle (no active file operations)
     */
    setIdle(sessionId = null) {
        try {
            const previousActivity = { ...this.currentActivity };
            
            this.currentActivity = {
                file: null,
                fileName: null,
                operation: 'idle',
                startTime: null,
                sessionId: sessionId,
                lastUpdate: Date.now()
            };
            
            console.log('🎯 Claude File Tracker: Set to idle');
            
            // Emit idle event
            this.emit('fileActivity', this.currentActivity);
            this.emit('activityChange', {
                type: 'idle',
                data: this.currentActivity,
                previousActivity: previousActivity,
                timestamp: Date.now()
            });
            
            // Clear idle timeout
            if (this.idleTimeout) {
                clearTimeout(this.idleTimeout);
                this.idleTimeout = null;
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error setting idle state:', error);
            return false;
        }
    }
    
    /**
     * Get current activity state
     */
    getCurrentActivity() {
        return { ...this.currentActivity };
    }
    
    /**
     * Get activity history
     */
    getActivityHistory(limit = 10) {
        return this.activityHistory.slice(-limit);
    }
    
    /**
     * Get status for UI display
     */
    getDisplayStatus() {
        const activity = this.currentActivity;
        
        if (activity.operation === 'idle' || !activity.file) {
            return {
                status: 'Ready',
                icon: '🤖',
                color: 'ready',
                details: 'Claude is ready to help'
            };
        }
        
        const operationMap = {
            reading: { verb: 'Reading', icon: '👀', color: 'reading' },
            writing: { verb: 'Writing', icon: '✍️', color: 'writing' },
            editing: { verb: 'Editing', icon: '✏️', color: 'editing' },
            analyzing: { verb: 'Analyzing', icon: '🔍', color: 'analyzing' }
        };
        
        const op = operationMap[activity.operation] || operationMap.reading;
        
        return {
            status: `${op.verb} ${activity.fileName}`,
            icon: op.icon,
            color: op.color,
            details: `Claude is ${activity.operation} ${activity.fileName}`,
            file: activity.file,
            fileName: activity.fileName,
            operation: activity.operation,
            duration: activity.startTime ? Date.now() - activity.startTime : 0
        };
    }
    
    /**
     * Parse file references from Claude Code agent responses
     */
    parseFileReferences(text) {
        if (!text || typeof text !== 'string') return [];
        
        const filePatterns = [
            // Common file paths
            /(?:\/[a-zA-Z0-9_.-]+)*\/[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+/g,
            // Relative paths
            /(?:\.\/|\.\.\/)?[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*\.[a-zA-Z0-9]+/g,
            // Quoted file paths
            /"([^"]+\.[a-zA-Z0-9]+)"/g,
            /'([^']+\.[a-zA-Z0-9]+)'/g,
            // Backtick file paths
            /`([^`]+\.[a-zA-Z0-9]+)`/g
        ];
        
        const foundFiles = new Set();
        
        filePatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    // Clean up the match
                    const cleaned = match.replace(/["`']/g, '');
                    if (this.isValidFilePath(cleaned)) {
                        foundFiles.add(cleaned);
                    }
                });
            }
        });
        
        return Array.from(foundFiles);
    }
    
    /**
     * Auto-detect operation type from context
     */
    detectOperation(context = '') {
        const contextLower = context.toLowerCase();
        
        if (contextLower.includes('writ') || contextLower.includes('creat') || contextLower.includes('sav')) {
            return 'writing';
        }
        if (contextLower.includes('edit') || contextLower.includes('modif') || contextLower.includes('updat')) {
            return 'editing';
        }
        if (contextLower.includes('analy') || contextLower.includes('examin') || contextLower.includes('inspect')) {
            return 'analyzing';
        }
        
        return 'reading'; // Default
    }
    
    /**
     * Clean up session when Claude session ends
     */
    cleanupSession(sessionId) {
        if (sessionId && this.activeSessions.has(sessionId)) {
            this.activeSessions.delete(sessionId);
            
            // If this was the current session, set to idle
            if (this.currentActivity.sessionId === sessionId) {
                this.setIdle();
            }
            
            console.log(`🎯 Claude File Tracker: Cleaned up session ${sessionId}`);
        }
    }
    
    /**
     * Get statistics for analytics
     */
    getStatistics() {
        const now = Date.now();
        const recent = this.activityHistory.filter(a => now - a.startTime < 3600000); // Last hour
        
        const operationCounts = {};
        const fileCounts = {};
        
        recent.forEach(activity => {
            operationCounts[activity.operation] = (operationCounts[activity.operation] || 0) + 1;
            fileCounts[activity.fileName] = (fileCounts[activity.fileName] || 0) + 1;
        });
        
        return {
            totalOperations: this.activityHistory.length,
            recentOperations: recent.length,
            activeSessions: this.activeSessions.size,
            currentActivity: this.currentActivity,
            operationBreakdown: operationCounts,
            mostActiveFiles: Object.entries(fileCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([file, count]) => ({ file, count }))
        };
    }
    
    // Private helper methods
    
    extractFileName(filePath) {
        if (!filePath) return null;
        return filePath.split('/').pop() || filePath;
    }
    
    isValidFilePath(path) {
        // Basic validation for file paths
        return path && 
               path.length > 0 && 
               path.includes('.') && 
               !path.includes('..') &&
               !/[<>:"|?*]/.test(path);
    }
    
    setIdleTimeout() {
        this.idleTimeout = setTimeout(() => {
            this.setIdle(this.currentActivity.sessionId);
        }, this.IDLE_TIMEOUT_MS);
    }
}

// Create singleton instance
const claudeFileTracker = new ClaudeFileTracker();

module.exports = claudeFileTracker;