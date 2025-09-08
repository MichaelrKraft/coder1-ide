'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Session {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

interface SessionContextType {
  currentSession: Session | null;
  sessionId: string;
  sessions: Session[];
  refreshSessions: () => Promise<void>;
  createSession: (name?: string, description?: string) => Promise<void>;
  switchSession: (session: Session) => void;
  endSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<Session[]>([]);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    // Check for existing session in localStorage
    let storedSessionId = localStorage.getItem('currentSessionId');
    
    if (!storedSessionId) {
      // Create a new session automatically
      await createSession();
      return;
    }

    setSessionId(storedSessionId);
    
    // Load all sessions and find the current one
    await refreshSessions();
  };

  const refreshSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      
      if (data.success) {
        setSessions(data.sessions || []);
        
        // Update current session if we have a sessionId
        const currentSessionId = sessionId || localStorage.getItem('currentSessionId');
        if (currentSessionId) {
          const activeSession = data.sessions.find((s: Session) => s.id === currentSessionId);
          if (activeSession) {
            setCurrentSession(activeSession);
          }
        }
      }
    } catch (error) {
      logger?.error('Failed to load sessions:', error);
    }
  };

  const createSession = async (name?: string, description?: string) => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || `IDE Session ${new Date().toLocaleString()}`,
          description: description || 'CoderOne IDE development session',
          metadata: {
            ide: true,
            version: '1.0.0',
            createdFrom: 'coder1-ide'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const newSession = data.session;
          setCurrentSession(newSession);
          setSessionId(newSession.id);
          localStorage.setItem('currentSessionId', newSession.id);
          
          // Refresh sessions list
          await refreshSessions();
          
          // Dispatch custom event for other components
          window.dispatchEvent(new CustomEvent('sessionChanged', { 
            detail: { session: newSession } 
          }));
          
          // REMOVED: // REMOVED: console.log('✨ Created new session:', newSession.name);
        }
      }
    } catch (error) {
      logger?.error('Failed to create session:', error);
    }
  };

  const switchSession = (session: Session) => {
    setCurrentSession(session);
    setSessionId(session.id);
    localStorage.setItem('currentSessionId', session.id);
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('sessionChanged', { 
      detail: { session } 
    }));
    
    // REMOVED: // REMOVED: console.log('🔄 Switched to session:', session.name);
  };

  const endSession = () => {
    setCurrentSession(null);
    setSessionId('');
    localStorage.removeItem('currentSessionId');
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('sessionEnded'));
    
    // REMOVED: // REMOVED: console.log('🏁 Session ended');
  };

  const value: SessionContextType = {
    currentSession,
    sessionId,
    sessions,
    refreshSessions,
    createSession,
    switchSession,
    endSession
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}