/**
 * VibeCoach WebSocket Service
 * 
 * Provides real-time updates for the VibeCoach dashboard via WebSocket connections
 */

class VibeCoachWebSocket {
    constructor(io) {
        this.io = io;
        this.connectedClients = new Map();
        this.namespace = io.of('/vibe-coach');
        this.setupEventHandlers();
        console.log('✅ VibeCoach WebSocket service initialized');
    }

    setupEventHandlers() {
        this.namespace.on('connection', (socket) => {
            console.log(`📊 VibeCoach client connected: ${socket.id}`);
            
            // Track connected client
            this.connectedClients.set(socket.id, {
                connectedAt: Date.now(),
                lastActivity: Date.now(),
                subscriptions: new Set()
            });

            // Handle subscription to specific data types
            socket.on('subscribe', (dataTypes) => {
                const client = this.connectedClients.get(socket.id);
                if (client && Array.isArray(dataTypes)) {
                    dataTypes.forEach(type => client.subscriptions.add(type));
                    console.log(`📡 Client ${socket.id} subscribed to:`, dataTypes);
                    
                    // Send current data for subscribed types
                    this.sendCurrentData(socket, dataTypes);
                }
            });

            // Handle unsubscribe
            socket.on('unsubscribe', (dataTypes) => {
                const client = this.connectedClients.get(socket.id);
                if (client && Array.isArray(dataTypes)) {
                    dataTypes.forEach(type => client.subscriptions.delete(type));
                    console.log(`📡 Client ${socket.id} unsubscribed from:`, dataTypes);
                }
            });

            // Handle ping for keepalive
            socket.on('ping', () => {
                const client = this.connectedClients.get(socket.id);
                if (client) {
                    client.lastActivity = Date.now();
                }
                socket.emit('pong', { timestamp: Date.now() });
            });

            // Handle manual data request
            socket.on('request-data', (dataType) => {
                this.sendCurrentData(socket, [dataType]);
            });

            // Clean up on disconnect
            socket.on('disconnect', () => {
                console.log(`📊 VibeCoach client disconnected: ${socket.id}`);
                this.connectedClients.delete(socket.id);
            });
        });

        // Clean up stale connections periodically
        setInterval(() => {
            this.cleanupStaleConnections();
        }, 300000); // 5 minutes
    }

    /**
     * Send current coaching data to a specific socket
     */
    async sendCurrentData(socket, dataTypes) {
        try {
            // Import VibeCoachService here to avoid circular dependencies
            const VibeCoachService = require('./VibeCoachService');
            const vibeCoach = new VibeCoachService();
            const coachingData = vibeCoach.getCoachingData();

            dataTypes.forEach(dataType => {
                let data;
                switch (dataType) {
                    case 'progress':
                        data = {
                            currentPhase: coachingData.progress.currentPhase,
                            milestonesReached: coachingData.progress.milestonesReached,
                            totalMilestones: coachingData.progress.totalMilestones,
                            recentWin: coachingData.progress.recentWin,
                            filesCreated: coachingData.progress.filesCreated,
                            filesModified: coachingData.progress.filesModified,
                            sessionDuration: Math.floor((Date.now() - vibeCoach.sessionData.startTime) / 60000)
                        };
                        break;
                    case 'confidence':
                        data = coachingData.confidence;
                        break;
                    case 'learning':
                        data = coachingData.learning;
                        break;
                    case 'problems':
                        data = {
                            ...coachingData.problems,
                            errorTracking: {
                                errorsToday: vibeCoach.sessionData.errorTracking.errorsToday,
                                errorsResolved: vibeCoach.sessionData.errorTracking.errorsResolved,
                                resolutionRate: vibeCoach.sessionData.errorTracking.errorsToday > 0 ? 
                                    Math.round((vibeCoach.sessionData.errorTracking.errorsResolved / vibeCoach.sessionData.errorTracking.errorsToday) * 100) : 100
                            }
                        };
                        break;
                    case 'achievements':
                        data = coachingData.achievements;
                        break;
                    case 'next-steps':
                        data = coachingData.nextSteps;
                        break;
                }

                if (data) {
                    socket.emit('coaching-update', {
                        type: dataType,
                        data,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        } catch (error) {
            console.error('❌ Failed to send current coaching data:', error);
            socket.emit('coaching-error', {
                error: 'Failed to retrieve coaching data',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Broadcast coaching data updates to all subscribed clients
     */
    broadcastUpdate(updateType, data) {
        if (this.connectedClients.size === 0) return;

        const updatePayload = {
            type: updateType,
            data,
            timestamp: new Date().toISOString()
        };

        let subscribedClients = 0;
        this.connectedClients.forEach((client, socketId) => {
            if (client.subscriptions.has(updateType) || client.subscriptions.has('all')) {
                const socket = this.namespace.sockets.get(socketId);
                if (socket) {
                    socket.emit('coaching-update', updatePayload);
                    subscribedClients++;
                }
            }
        });

        if (subscribedClients > 0) {
            console.log(`📡 Broadcasted ${updateType} update to ${subscribedClients} clients`);
        }
    }

    /**
     * Send achievement notification to all connected clients
     */
    broadcastAchievement(achievement) {
        if (this.connectedClients.size === 0) return;

        const achievementPayload = {
            type: 'achievement',
            achievement,
            timestamp: new Date().toISOString()
        };

        this.namespace.emit('new-achievement', achievementPayload);
        console.log(`🎉 Broadcasted achievement to ${this.connectedClients.size} clients:`, achievement.message);
    }

    /**
     * Send error event notification
     */
    broadcastErrorEvent(errorData) {
        if (this.connectedClients.size === 0) return;

        const errorPayload = {
            type: 'error-event',
            ...errorData,
            timestamp: new Date().toISOString()
        };

        this.namespace.emit('error-event', errorPayload);
        console.log(`🔍 Broadcasted error event to ${this.connectedClients.size} clients`);
    }

    /**
     * Send skill level up notification
     */
    broadcastSkillLevelUp(skill, oldLevel, newLevel) {
        if (this.connectedClients.size === 0) return;

        const levelUpPayload = {
            type: 'skill-level-up',
            skill,
            oldLevel,
            newLevel,
            timestamp: new Date().toISOString()
        };

        this.namespace.emit('skill-level-up', levelUpPayload);
        console.log(`⬆️ Broadcasted skill level up to ${this.connectedClients.size} clients: ${skill} ${oldLevel} → ${newLevel}`);
    }

    /**
     * Get dashboard statistics
     */
    getStats() {
        const now = Date.now();
        const activeClients = Array.from(this.connectedClients.values())
            .filter(client => (now - client.lastActivity) < 300000); // Active in last 5 minutes

        return {
            totalConnections: this.connectedClients.size,
            activeConnections: activeClients.length,
            namespace: '/vibe-coach',
            uptime: Math.floor((now - this.startTime) / 1000),
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * Clean up stale connections
     */
    cleanupStaleConnections() {
        const now = Date.now();
        const staleThreshold = 600000; // 10 minutes

        for (const [socketId, client] of this.connectedClients.entries()) {
            if (now - client.lastActivity > staleThreshold) {
                console.log(`🧹 Cleaning up stale VibeCoach connection: ${socketId}`);
                this.connectedClients.delete(socketId);
            }
        }
    }

    /**
     * Set up VibeCoach service event listeners
     */
    connectToVibeCoach(vibeCoachService) {
        if (!vibeCoachService) {
            console.warn('⚠️ No VibeCoach service provided for WebSocket integration');
            return;
        }

        // Listen for VibeCoach events and broadcast them
        vibeCoachService.on('activity', (data) => {
            this.broadcastUpdate('progress', data.projectProgress);
        });

        vibeCoachService.on('error', (data) => {
            this.broadcastErrorEvent(data);
            this.broadcastUpdate('problems', data);
        });

        vibeCoachService.on('achievement', (achievement) => {
            this.broadcastAchievement(achievement);
            this.broadcastUpdate('achievements', [achievement]);
        });

        vibeCoachService.on('update', (coachingData) => {
            // Broadcast general updates to all subscribers
            this.broadcastUpdate('all-data', coachingData);
        });

        console.log('🔗 VibeCoach WebSocket connected to service events');
    }
}

module.exports = VibeCoachWebSocket;