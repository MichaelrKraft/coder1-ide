/**
 * Supervision Engine - Real-time Project Collaboration System
 * 
 * Enables multiple team members to collaborate on project creation
 * with real-time updates, role-based permissions, and shared intelligence
 */

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'collaborator' | 'viewer';
    avatar?: string;
    lastSeen: string;
    permissions: TeamPermissions;
}

interface TeamPermissions {
    canEditProject: boolean;
    canInviteMembers: boolean;
    canAccessConsultation: boolean;
    canExportDocuments: boolean;
    canManageSettings: boolean;
}

interface CollaborationSession {
    projectId: string;
    sessionId: string;
    participants: TeamMember[];
    currentActivity: {
        step: number;
        activeUser: string;
        lastUpdate: string;
        activityType: 'questioning' | 'prd-generation' | 'consultation' | 'wireframes' | 'review';
    };
    sharedState: {
        questions: any[];
        answers: any[];
        prdDocument: any;
        consultationResults: any;
        wireframes: any;
    };
    chatHistory: CollaborationMessage[];
    version: number;
}

interface CollaborationMessage {
    id: string;
    userId: string;
    userName: string;
    timestamp: string;
    type: 'chat' | 'system' | 'activity';
    content: string;
    metadata?: any;
}

interface RealTimeUpdate {
    sessionId: string;
    projectId: string;
    updateType: 'user-joined' | 'user-left' | 'step-changed' | 'document-updated' | 'chat-message' | 'consultation-started';
    data: any;
    timestamp: string;
    userId: string;
}

class SupervisionEngine {
    private activeSessions: Map<string, CollaborationSession>;
    private userConnections: Map<string, Set<string>>; // userId -> Set of sessionIds
    private sessionSubscribers: Map<string, Set<Function>>; // sessionId -> Set of callbacks
    private rolePermissions: Map<string, TeamPermissions>;

    constructor() {
        this.activeSessions = new Map();
        this.userConnections = new Map();
        this.sessionSubscribers = new Map();
        this.initializeRolePermissions();
    }

    private initializeRolePermissions(): void {
        this.rolePermissions = new Map([
            ['owner', {
                canEditProject: true,
                canInviteMembers: true,
                canAccessConsultation: true,
                canExportDocuments: true,
                canManageSettings: true
            }],
            ['admin', {
                canEditProject: true,
                canInviteMembers: true,
                canAccessConsultation: true,
                canExportDocuments: true,
                canManageSettings: false
            }],
            ['collaborator', {
                canEditProject: true,
                canInviteMembers: false,
                canAccessConsultation: true,
                canExportDocuments: true,
                canManageSettings: false
            }],
            ['viewer', {
                canEditProject: false,
                canInviteMembers: false,
                canAccessConsultation: true,
                canExportDocuments: false,
                canManageSettings: false
            }]
        ]);
    }

    /**
     * Start a new collaboration session
     */
    public startCollaborationSession(projectId: string, owner: TeamMember): CollaborationSession {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const session: CollaborationSession = {
            projectId,
            sessionId,
            participants: [owner],
            currentActivity: {
                step: 1,
                activeUser: owner.id,
                lastUpdate: new Date().toISOString(),
                activityType: 'questioning'
            },
            sharedState: {
                questions: [],
                answers: [],
                prdDocument: null,
                consultationResults: null,
                wireframes: null
            },
            chatHistory: [{
                id: `msg-${Date.now()}`,
                userId: 'system',
                userName: 'System',
                timestamp: new Date().toISOString(),
                type: 'system',
                content: `${owner.name} started a new collaboration session`
            }],
            version: 1
        };

        this.activeSessions.set(sessionId, session);
        this.addUserConnection(owner.id, sessionId);

        return session;
    }

    /**
     * Join an existing collaboration session
     */
    public joinSession(sessionId: string, user: TeamMember): CollaborationSession | null {
        const session = this.activeSessions.get(sessionId);
        if (!session) return null;

        // Check if user is already in session
        const existingUser = session.participants.find(p => p.id === user.id);
        if (existingUser) {
            // Update last seen
            existingUser.lastSeen = new Date().toISOString();
        } else {
            // Add new participant
            session.participants.push(user);
            
            // Add system message
            this.addChatMessage(sessionId, {
                id: `msg-${Date.now()}`,
                userId: 'system',
                userName: 'System',
                timestamp: new Date().toISOString(),
                type: 'system',
                content: `${user.name} joined the session`
            });
        }

        this.addUserConnection(user.id, sessionId);
        this.broadcastUpdate(sessionId, {
            sessionId,
            projectId: session.projectId,
            updateType: 'user-joined',
            data: { user },
            timestamp: new Date().toISOString(),
            userId: user.id
        });

        return session;
    }

    /**
     * Leave a collaboration session
     */
    public leaveSession(sessionId: string, userId: string): void {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;

        const user = session.participants.find(p => p.id === userId);
        if (user) {
            // Update last seen instead of removing (for session history)
            user.lastSeen = new Date().toISOString();
            
            // Add system message
            this.addChatMessage(sessionId, {
                id: `msg-${Date.now()}`,
                userId: 'system',
                userName: 'System',
                timestamp: new Date().toISOString(),
                type: 'system',
                content: `${user.name} left the session`
            });

            this.removeUserConnection(userId, sessionId);
            this.broadcastUpdate(sessionId, {
                sessionId,
                projectId: session.projectId,
                updateType: 'user-left',
                data: { userId },
                timestamp: new Date().toISOString(),
                userId
            });
        }
    }

    /**
     * Update project step and activity
     */
    public updateProjectStep(
        sessionId: string, 
        userId: string, 
        step: number, 
        activityType: CollaborationSession['currentActivity']['activityType']
    ): boolean {
        const session = this.activeSessions.get(sessionId);
        if (!session) return false;

        const user = session.participants.find(p => p.id === userId);
        if (!user || !user.permissions.canEditProject) return false;

        session.currentActivity = {
            step,
            activeUser: userId,
            lastUpdate: new Date().toISOString(),
            activityType
        };
        session.version++;

        this.broadcastUpdate(sessionId, {
            sessionId,
            projectId: session.projectId,
            updateType: 'step-changed',
            data: { step, activityType, activeUser: userId },
            timestamp: new Date().toISOString(),
            userId
        });

        return true;
    }

    /**
     * Update shared project state
     */
    public updateSharedState(
        sessionId: string,
        userId: string,
        stateType: keyof CollaborationSession['sharedState'],
        data: any
    ): boolean {
        const session = this.activeSessions.get(sessionId);
        if (!session) return false;

        const user = session.participants.find(p => p.id === userId);
        if (!user || !user.permissions.canEditProject) return false;

        session.sharedState[stateType] = data;
        session.version++;

        this.broadcastUpdate(sessionId, {
            sessionId,
            projectId: session.projectId,
            updateType: 'document-updated',
            data: { stateType, data },
            timestamp: new Date().toISOString(),
            userId
        });

        return true;
    }

    /**
     * Add chat message to session
     */
    public addChatMessage(sessionId: string, message: CollaborationMessage): boolean {
        const session = this.activeSessions.get(sessionId);
        if (!session) return false;

        session.chatHistory.push(message);
        session.version++;

        if (message.type === 'chat') {
            this.broadcastUpdate(sessionId, {
                sessionId,
                projectId: session.projectId,
                updateType: 'chat-message',
                data: { message },
                timestamp: new Date().toISOString(),
                userId: message.userId
            });
        }

        return true;
    }

    /**
     * Get session participants with online status
     */
    public getSessionParticipants(sessionId: string): (TeamMember & { isOnline: boolean })[] {
        const session = this.activeSessions.get(sessionId);
        if (!session) return [];

        const now = Date.now();
        const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

        return session.participants.map(participant => ({
            ...participant,
            isOnline: (now - new Date(participant.lastSeen).getTime()) < ONLINE_THRESHOLD
        }));
    }

    /**
     * Get session chat history
     */
    public getChatHistory(sessionId: string, limit: number = 50): CollaborationMessage[] {
        const session = this.activeSessions.get(sessionId);
        if (!session) return [];

        return session.chatHistory.slice(-limit);
    }

    /**
     * Check user permissions for specific action
     */
    public hasPermission(sessionId: string, userId: string, action: keyof TeamPermissions): boolean {
        const session = this.activeSessions.get(sessionId);
        if (!session) return false;

        const user = session.participants.find(p => p.id === userId);
        if (!user) return false;

        return user.permissions[action];
    }

    /**
     * Invite user to session
     */
    public async inviteUserToSession(
        sessionId: string,
        inviterId: string,
        inviteeEmail: string,
        role: TeamMember['role']
    ): Promise<{ success: boolean; inviteId?: string; error?: string }> {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            return { success: false, error: 'Session not found' };
        }

        const inviter = session.participants.find(p => p.id === inviterId);
        if (!inviter || !inviter.permissions.canInviteMembers) {
            return { success: false, error: 'Permission denied' };
        }

        // For MVP, we'll generate a simple invite ID
        const inviteId = `invite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Add system message
        this.addChatMessage(sessionId, {
            id: `msg-${Date.now()}`,
            userId: 'system',
            userName: 'System',
            timestamp: new Date().toISOString(),
            type: 'system',
            content: `${inviter.name} invited ${inviteeEmail} as ${role}`
        });

        return { success: true, inviteId };
    }

    /**
     * Get session state for synchronization
     */
    public getSessionState(sessionId: string): CollaborationSession | null {
        return this.activeSessions.get(sessionId) || null;
    }

    /**
     * Subscribe to real-time updates
     */
    public subscribeToUpdates(sessionId: string, callback: (update: RealTimeUpdate) => void): () => void {
        if (!this.sessionSubscribers.has(sessionId)) {
            this.sessionSubscribers.set(sessionId, new Set());
        }

        this.sessionSubscribers.get(sessionId)!.add(callback);

        // Return unsubscribe function
        return () => {
            const subscribers = this.sessionSubscribers.get(sessionId);
            if (subscribers) {
                subscribers.delete(callback);
                if (subscribers.size === 0) {
                    this.sessionSubscribers.delete(sessionId);
                }
            }
        };
    }

    /**
     * Get active sessions for a user
     */
    public getUserActiveSessions(userId: string): CollaborationSession[] {
        const userSessions = this.userConnections.get(userId) || new Set();
        return Array.from(userSessions)
            .map(sessionId => this.activeSessions.get(sessionId))
            .filter(session => session !== undefined) as CollaborationSession[];
    }

    /**
     * Clean up inactive sessions
     */
    public cleanupInactiveSessions(): void {
        const now = Date.now();
        const INACTIVE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

        for (const [sessionId, session] of this.activeSessions.entries()) {
            const lastActivity = Math.max(
                ...session.participants.map(p => new Date(p.lastSeen).getTime()),
                new Date(session.currentActivity.lastUpdate).getTime()
            );

            if (now - lastActivity > INACTIVE_THRESHOLD) {
                this.activeSessions.delete(sessionId);
                this.sessionSubscribers.delete(sessionId);
                
                // Clean up user connections
                for (const participant of session.participants) {
                    this.removeUserConnection(participant.id, sessionId);
                }
            }
        }
    }

    /**
     * Export collaboration session data
     */
    public exportSessionData(sessionId: string): any {
        const session = this.activeSessions.get(sessionId);
        if (!session) return null;

        return {
            sessionId: session.sessionId,
            projectId: session.projectId,
            participants: session.participants,
            timeline: session.chatHistory.filter(msg => msg.type === 'system'),
            finalState: session.sharedState,
            collaborationMetrics: {
                totalMessages: session.chatHistory.length,
                activeDuration: this.calculateSessionDuration(session),
                participantCount: session.participants.length,
                version: session.version
            }
        };
    }

    // Private helper methods
    private addUserConnection(userId: string, sessionId: string): void {
        if (!this.userConnections.has(userId)) {
            this.userConnections.set(userId, new Set());
        }
        this.userConnections.get(userId)!.add(sessionId);
    }

    private removeUserConnection(userId: string, sessionId: string): void {
        const userSessions = this.userConnections.get(userId);
        if (userSessions) {
            userSessions.delete(sessionId);
            if (userSessions.size === 0) {
                this.userConnections.delete(userId);
            }
        }
    }

    private broadcastUpdate(sessionId: string, update: RealTimeUpdate): void {
        const subscribers = this.sessionSubscribers.get(sessionId);
        if (subscribers) {
            subscribers.forEach(callback => {
                try {
                    callback(update);
                } catch (error) {
                    console.error('Error broadcasting update:', error);
                }
            });
        }
    }

    private calculateSessionDuration(session: CollaborationSession): number {
        const startTime = new Date(session.chatHistory[0]?.timestamp || session.currentActivity.lastUpdate).getTime();
        const endTime = new Date(session.currentActivity.lastUpdate).getTime();
        return Math.round((endTime - startTime) / 1000 / 60); // Duration in minutes
    }
}

export { 
    SupervisionEngine, 
    TeamMember, 
    CollaborationSession, 
    CollaborationMessage, 
    RealTimeUpdate, 
    TeamPermissions 
};