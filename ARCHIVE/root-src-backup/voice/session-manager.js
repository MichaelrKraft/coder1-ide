const { v4: uuidv4 } = require('uuid');

class VoiceSessionManager {
    constructor() {
        this.sessions = new Map();
        this.cleanupInterval = setInterval(() => this.cleanup(), 300000); // Cleanup every 5 minutes
    }

    createSession(userId = null) {
        const sessionId = uuidv4();
        const session = {
            id: sessionId,
            userId: userId,
            startTime: new Date(),
            lastActivity: new Date(),
            context: {
                mode: 'chat', // chat, ide, requirements
                currentStep: null,
                history: [],
                preferences: {
                    voice: 'alloy',
                    language: 'en',
                    wakeWordEnabled: true
                }
            },
            stats: {
                messagesProcessed: 0,
                audioGenerated: 0,
                commandsExecuted: 0,
                totalDuration: 0
            }
        };

        this.sessions.set(sessionId, session);
        return session;
    }

    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = new Date();
        }
        return session;
    }

    updateSession(sessionId, updates) {
        const session = this.sessions.get(sessionId);
        if (session) {
            // Merge updates into session
            if (updates.context) {
                session.context = { ...session.context, ...updates.context };
            }
            if (updates.stats) {
                session.stats = { ...session.stats, ...updates.stats };
            }
            if (updates.preferences) {
                session.context.preferences = { ...session.context.preferences, ...updates.preferences };
            }
            
            session.lastActivity = new Date();
            return session;
        }
        return null;
    }

    addToHistory(sessionId, entry) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.context.history.push({
                timestamp: new Date(),
                type: entry.type, // 'user_speech', 'ai_response', 'command', 'navigation'
                content: entry.content,
                metadata: entry.metadata || {}
            });

            // Keep only last 50 entries
            if (session.context.history.length > 50) {
                session.context.history = session.context.history.slice(-50);
            }

            session.lastActivity = new Date();
            return true;
        }
        return false;
    }

    getHistory(sessionId, limit = 10) {
        const session = this.sessions.get(sessionId);
        if (session) {
            return session.context.history.slice(-limit);
        }
        return [];
    }

    updateStats(sessionId, statUpdates) {
        const session = this.sessions.get(sessionId);
        if (session) {
            Object.keys(statUpdates).forEach(key => {
                if (typeof statUpdates[key] === 'number') {
                    session.stats[key] = (session.stats[key] || 0) + statUpdates[key];
                } else {
                    session.stats[key] = statUpdates[key];
                }
            });
            session.lastActivity = new Date();
            return session.stats;
        }
        return null;
    }

    setMode(sessionId, mode, stepData = null) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.context.mode = mode;
            session.context.currentStep = stepData;
            session.lastActivity = new Date();
            
            this.addToHistory(sessionId, {
                type: 'mode_change',
                content: `Mode changed to: ${mode}`,
                metadata: { mode, stepData }
            });
            
            return true;
        }
        return false;
    }

    deleteSession(sessionId) {
        return this.sessions.delete(sessionId);
    }

    getAllSessions() {
        return Array.from(this.sessions.values());
    }

    getSessionsByUser(userId) {
        return Array.from(this.sessions.values()).filter(session => session.userId === userId);
    }

    cleanup() {
        const now = new Date();
        const expireTime = 3600000; // 1 hour

        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastActivity > expireTime) {
                console.log(`Cleaning up expired voice session: ${sessionId}`);
                this.sessions.delete(sessionId);
            }
        }
    }

    getSessionStats() {
        const sessions = Array.from(this.sessions.values());
        return {
            totalSessions: sessions.length,
            activeSessions: sessions.filter(s => (new Date() - s.lastActivity) < 300000).length, // Active in last 5 min
            totalMessages: sessions.reduce((sum, s) => sum + s.stats.messagesProcessed, 0),
            totalAudioGenerated: sessions.reduce((sum, s) => sum + s.stats.audioGenerated, 0),
            totalCommands: sessions.reduce((sum, s) => sum + s.stats.commandsExecuted, 0)
        };
    }

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.sessions.clear();
    }
}

// Export singleton instance
module.exports = new VoiceSessionManager();