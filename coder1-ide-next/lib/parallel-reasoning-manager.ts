/**
 * Global Singleton Manager for Parallel Reasoning Sessions
 * 
 * This manager ensures that parallel reasoning sessions persist across
 * Next.js API route invocations by using Node.js global object.
 * 
 * Problem: Next.js API routes can create new instances on each request,
 * causing session data to be lost between the analyze and status endpoints.
 * 
 * Solution: Use a global singleton pattern to maintain session state.
 */

import type { ParallelReasoningSession } from '@/services/beta/parallel-reasoning-service';

interface SessionStore {
  sessions: Map<string, ParallelReasoningSession>;
  activeAgents: Map<string, AbortController>;
  lastCleanup: number;
}

// Time-to-live for sessions (30 minutes)
const SESSION_TTL = 30 * 60 * 1000;

// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

class ParallelReasoningManager {
  private store: SessionStore;

  constructor() {
    // Initialize or retrieve existing store from global
    if (!global.parallelReasoningStore) {
      global.parallelReasoningStore = {
        sessions: new Map<string, ParallelReasoningSession>(),
        activeAgents: new Map<string, AbortController>(),
        lastCleanup: Date.now()
      };
    }
    this.store = global.parallelReasoningStore;
  }

  /**
   * Add a new session to the store
   */
  addSession(session: ParallelReasoningSession): void {
    this.store.sessions.set(session.id, session);
    this.performCleanupIfNeeded();
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): ParallelReasoningSession | undefined {
    this.performCleanupIfNeeded();
    return this.store.sessions.get(sessionId);
  }

  /**
   * Update an existing session
   */
  updateSession(sessionId: string, updates: Partial<ParallelReasoningSession>): void {
    const session = this.store.sessions.get(sessionId);
    if (session) {
      this.store.sessions.set(sessionId, { ...session, ...updates });
    }
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    this.store.sessions.delete(sessionId);
    
    // Also cancel any active agents
    const controller = this.store.activeAgents.get(sessionId);
    if (controller) {
      controller.abort();
      this.store.activeAgents.delete(sessionId);
    }
  }

  /**
   * Get all sessions
   */
  getAllSessions(): ParallelReasoningSession[] {
    this.performCleanupIfNeeded();
    return Array.from(this.store.sessions.values());
  }

  /**
   * Register an abort controller for a session
   */
  registerAbortController(sessionId: string, controller: AbortController): void {
    this.store.activeAgents.set(sessionId, controller);
  }

  /**
   * Get abort controller for a session
   */
  getAbortController(sessionId: string): AbortController | undefined {
    return this.store.activeAgents.get(sessionId);
  }

  /**
   * Cancel a session's active agents
   */
  cancelSession(sessionId: string): void {
    const controller = this.store.activeAgents.get(sessionId);
    if (controller) {
      controller.abort();
      this.store.activeAgents.delete(sessionId);
    }
    
    // Update session status
    const session = this.store.sessions.get(sessionId);
    if (session) {
      this.updateSession(sessionId, {
        status: 'failed',
        endTime: new Date()
      });
    }
  }

  /**
   * Perform cleanup of old sessions
   */
  private performCleanupIfNeeded(): void {
    const now = Date.now();
    
    // Only cleanup every CLEANUP_INTERVAL
    if (now - this.store.lastCleanup < CLEANUP_INTERVAL) {
      return;
    }
    
    this.store.lastCleanup = now;
    
    // Remove sessions older than TTL
    const cutoffTime = now - SESSION_TTL;
    
    for (const [sessionId, session] of this.store.sessions.entries()) {
      const sessionTime = session.endTime?.getTime() || session.startTime.getTime();
      
      // Remove if session is completed/failed and older than TTL
      if ((session.status === 'completed' || session.status === 'failed') && 
          sessionTime < cutoffTime) {
        this.deleteSession(sessionId);
      }
      
      // Also remove if session is stuck in reasoning for too long (1 hour)
      if (session.status === 'reasoning' && 
          session.startTime.getTime() < now - 60 * 60 * 1000) {
        this.cancelSession(sessionId);
        this.deleteSession(sessionId);
      }
    }
  }

  /**
   * Clear all sessions (useful for testing)
   */
  clearAll(): void {
    // Cancel all active agents
    for (const controller of this.store.activeAgents.values()) {
      controller.abort();
    }
    
    this.store.sessions.clear();
    this.store.activeAgents.clear();
    this.store.lastCleanup = Date.now();
  }

  /**
   * Get statistics about stored sessions
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
  } {
    const sessions = Array.from(this.store.sessions.values());
    
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'reasoning' || s.status === 'voting').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      failedSessions: sessions.filter(s => s.status === 'failed').length
    };
  }
}

// Create singleton instance
export const parallelReasoningManager = new ParallelReasoningManager();

// Type augmentation for global
declare global {
  var parallelReasoningStore: SessionStore | undefined;
}