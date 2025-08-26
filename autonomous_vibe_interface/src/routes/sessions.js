/**
 * Session Management Routes
 * 
 * API endpoints for session and checkpoint management
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// In-memory storage for development (replace with database in production)
const sessions = new Map();
const checkpoints = new Map();

// Data directory for persistence
const DATA_DIR = path.join(process.cwd(), 'data', 'sessions');

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to create data directory:', error);
    }
}

// Load persisted data on startup
async function loadPersistedData() {
    try {
        await ensureDataDir();
        
        // Load sessions
        try {
            const sessionsFile = path.join(DATA_DIR, 'sessions.json');
            const sessionsData = await fs.readFile(sessionsFile, 'utf8');
            const sessionsObj = JSON.parse(sessionsData);
            Object.entries(sessionsObj).forEach(([key, value]) => {
                sessions.set(key, value);
            });
            console.log(`📂 Loaded ${sessions.size} sessions from disk`);
        } catch (error) {
            console.log('📂 No existing sessions file found, starting fresh');
        }
        
        // Load checkpoints
        try {
            const checkpointsFile = path.join(DATA_DIR, 'checkpoints.json');
            const checkpointsData = await fs.readFile(checkpointsFile, 'utf8');
            const checkpointsObj = JSON.parse(checkpointsData);
            Object.entries(checkpointsObj).forEach(([key, value]) => {
                checkpoints.set(key, value);
            });
            console.log(`💾 Loaded ${checkpoints.size} checkpoints from disk`);
        } catch (error) {
            console.log('💾 No existing checkpoints file found, starting fresh');
        }
    } catch (error) {
        console.error('Failed to load persisted data:', error);
    }
}

// Save data to disk
async function saveDataToDisk() {
    try {
        await ensureDataDir();
        
        // Save sessions
        const sessionsObj = Object.fromEntries(sessions);
        const sessionsFile = path.join(DATA_DIR, 'sessions.json');
        await fs.writeFile(sessionsFile, JSON.stringify(sessionsObj, null, 2));
        
        // Save checkpoints
        const checkpointsObj = Object.fromEntries(checkpoints);
        const checkpointsFile = path.join(DATA_DIR, 'checkpoints.json');
        await fs.writeFile(checkpointsFile, JSON.stringify(checkpointsObj, null, 2));
        
        console.log('💾 Data persisted to disk');
    } catch (error) {
        console.error('Failed to save data to disk:', error);
    }
}

// Initialize data loading
loadPersistedData();

// Save data periodically
setInterval(saveDataToDisk, 30000); // Save every 30 seconds

/**
 * Create a new session
 */
router.post('/', (req, res) => {
    try {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sessionData = {
            id: sessionId,
            name: req.body.name || `Session ${new Date().toLocaleString()}`,
            description: req.body.description || '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            metadata: req.body.metadata || {}
        };
        
        sessions.set(sessionId, sessionData);
        
        res.json({
            success: true,
            session: sessionData
        });
    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get all sessions
 */
router.get('/', (req, res) => {
    try {
        const sessionList = Array.from(sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
        
        res.json({
            success: true,
            sessions: sessionList
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get a specific session
 */
router.get('/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({
            success: true,
            session
        });
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update a session
 */
router.put('/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const updatedSession = {
            ...session,
            ...req.body,
            id: sessionId, // Ensure ID doesn't change
            updatedAt: Date.now()
        };
        
        sessions.set(sessionId, updatedSession);
        
        res.json({
            success: true,
            session: updatedSession
        });
    } catch (error) {
        console.error('Update session error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete a session and all its checkpoints
 */
router.delete('/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessions.has(sessionId)) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        // Delete session
        sessions.delete(sessionId);
        
        // Delete all checkpoints for this session
        const sessionCheckpoints = Array.from(checkpoints.entries())
            .filter(([_, checkpoint]) => checkpoint.sessionId === sessionId);
        
        sessionCheckpoints.forEach(([checkpointId]) => {
            checkpoints.delete(checkpointId);
        });
        
        res.json({
            success: true,
            message: `Session and ${sessionCheckpoints.length} checkpoints deleted`
        });
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Create a checkpoint for a session
 */
router.post('/:sessionId/checkpoint', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessions.has(sessionId)) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const checkpointId = `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const checkpoint = {
            id: checkpointId,
            sessionId,
            name: req.body.name || `Checkpoint ${new Date().toLocaleTimeString()}`,
            description: req.body.description || '',
            timestamp: Date.now(),
            data: req.body.data || {},
            metadata: {
                version: '1.0',
                userAgent: req.headers['user-agent'] || '',
                timestamp: Date.now(),
                size: JSON.stringify(req.body.data || {}).length,
                hash: require('crypto').createHash('sha256').update(JSON.stringify(req.body.data || {})).digest('hex'),
                tags: req.body.tags || [],
                autoGenerated: req.body.autoGenerated || false,
                ...req.body.metadata
            }
        };
        
        checkpoints.set(checkpointId, checkpoint);
        
        // Update session timestamp
        const session = sessions.get(sessionId);
        session.updatedAt = Date.now();
        sessions.set(sessionId, session);
        
        res.json({
            success: true,
            checkpoint
        });
    } catch (error) {
        console.error('Create checkpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get all checkpoints for a session
 */
router.get('/:sessionId/checkpoints', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessions.has(sessionId)) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const sessionCheckpoints = Array.from(checkpoints.values())
            .filter(checkpoint => checkpoint.sessionId === sessionId)
            .sort((a, b) => b.timestamp - a.timestamp);
        
        res.json({
            success: true,
            checkpoints: sessionCheckpoints
        });
    } catch (error) {
        console.error('Get checkpoints error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get a specific checkpoint
 */
router.get('/:sessionId/checkpoints/:checkpointId', (req, res) => {
    try {
        const { sessionId, checkpointId } = req.params;
        
        if (!sessions.has(sessionId)) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const checkpoint = checkpoints.get(checkpointId);
        
        if (!checkpoint || checkpoint.sessionId !== sessionId) {
            return res.status(404).json({ error: 'Checkpoint not found' });
        }
        
        res.json({
            success: true,
            checkpoint
        });
    } catch (error) {
        console.error('Get checkpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete a checkpoint
 */
router.delete('/:sessionId/checkpoints/:checkpointId', (req, res) => {
    try {
        const { sessionId, checkpointId } = req.params;
        
        if (!sessions.has(sessionId)) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const checkpoint = checkpoints.get(checkpointId);
        
        if (!checkpoint || checkpoint.sessionId !== sessionId) {
            return res.status(404).json({ error: 'Checkpoint not found' });
        }
        
        checkpoints.delete(checkpointId);
        
        res.json({
            success: true,
            message: 'Checkpoint deleted'
        });
    } catch (error) {
        console.error('Delete checkpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Restore a checkpoint (returns checkpoint data for frontend to apply)
 */
router.post('/:sessionId/checkpoints/:checkpointId/restore', (req, res) => {
    try {
        const { sessionId, checkpointId } = req.params;
        
        if (!sessions.has(sessionId)) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const checkpoint = checkpoints.get(checkpointId);
        
        if (!checkpoint || checkpoint.sessionId !== sessionId) {
            return res.status(404).json({ error: 'Checkpoint not found' });
        }
        
        // Update session timestamp
        const session = sessions.get(sessionId);
        session.updatedAt = Date.now();
        sessions.set(sessionId, session);
        
        res.json({
            success: true,
            checkpoint,
            message: 'Checkpoint data retrieved for restoration'
        });
    } catch (error) {
        console.error('Restore checkpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Export checkpoints for a session
 */
router.get('/:sessionId/export', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessions.has(sessionId)) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const session = sessions.get(sessionId);
        const sessionCheckpoints = Array.from(checkpoints.values())
            .filter(checkpoint => checkpoint.sessionId === sessionId);
        
        const exportData = {
            version: '1.0',
            sessionId,
            session,
            exportedAt: Date.now(),
            checkpoints: sessionCheckpoints
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}-${Date.now()}.json"`);
        res.json(exportData);
    } catch (error) {
        console.error('Export session error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Import checkpoints from exported data
 */
router.post('/import', (req, res) => {
    try {
        const exportData = req.body;
        
        if (!exportData.checkpoints || !Array.isArray(exportData.checkpoints)) {
            return res.status(400).json({ error: 'Invalid export data format' });
        }
        
        let imported = 0;
        
        exportData.checkpoints.forEach(checkpoint => {
            // Generate new ID to avoid conflicts
            const newId = `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newCheckpoint = {
                ...checkpoint,
                id: newId,
                timestamp: Date.now(), // Update timestamp
                metadata: {
                    ...checkpoint.metadata,
                    imported: true,
                    originalId: checkpoint.id,
                    importedAt: Date.now()
                }
            };
            
            checkpoints.set(newId, newCheckpoint);
            imported++;
        });
        
        res.json({
            success: true,
            imported,
            message: `Successfully imported ${imported} checkpoints`
        });
    } catch (error) {
        console.error('Import checkpoints error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save data on process exit
process.on('SIGINT', async () => {
    console.log('Saving session data before exit...');
    await saveDataToDisk();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Saving session data before termination...');
    await saveDataToDisk();
    process.exit(0);
});

module.exports = router;