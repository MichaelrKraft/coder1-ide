'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';

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
  createEnhancedSession: (sessionType: string, name: string, description?: string, context?: any) => Promise<any>;
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
  
  // Add mutex to prevent race conditions during session creation
  const isCreatingSession = useRef(false);
  const hasInitialized = useRef(false);
  const initializationPromise = useRef<Promise<void> | null>(null);

  // Initialize session on mount
  useEffect(() => {
    // Prevent multiple initializations (including React StrictMode double-invocation)
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      
      // Use promise-based approach to prevent race conditions
      if (!initializationPromise.current) {
        initializationPromise.current = initializeSession();
      }
      
      // Don't return the promise - React expects either undefined or a cleanup function
      // The promise will handle itself asynchronously
    }
  }, []);

  const initializeSession = async () => {
    // Prevent concurrent initialization with immediate return if already running
    if (isCreatingSession.current) {
      console.log('🔒 Session initialization already in progress, waiting...');
      return;
    }
    
    // Set the mutex immediately to prevent race conditions
    isCreatingSession.current = true;
    
    try {
      console.log('🔄 Starting atomic session initialization...');
      
      // Check for existing session in localStorage
      let storedSessionId = localStorage.getItem('currentSessionId');
      
      if (storedSessionId) {
        console.log('📂 Found stored session:', storedSessionId);
        setSessionId(storedSessionId);
        
        // Load all sessions and find the current one
        const loadedSessions = await refreshSessions();
        
        // Verify the stored session still exists
        const sessionExists = loadedSessions.some(s => s.id === storedSessionId);
        if (!sessionExists) {
          console.log('⚠️ Stored session no longer exists, clearing...');
          localStorage.removeItem('currentSessionId');
          storedSessionId = null;
        } else {
          console.log('✅ Valid session found, initialization complete');
          return; // Valid session found, we're done
        }
      }
      
      // No valid session, need to create one atomically
      if (!storedSessionId) {
        console.log('🆕 No valid session found, creating new session...');
        
        // Load sessions first to check if any exist
        const existingSessions = await refreshSessions();
        
        // Double-check localStorage one more time after the await
        const finalCheck = localStorage.getItem('currentSessionId');
        if (!finalCheck && existingSessions.length === 0) {
          console.log('🔨 Creating new session atomically...');
          await createSession();
        } else if (finalCheck) {
          console.log('🔄 Session was created by another process:', finalCheck);
          setSessionId(finalCheck);
        }
      }
      
      console.log('✅ Session initialization completed successfully');
      
    } catch (error) {
      console.error('❌ Error during session initialization:', error);
    } finally {
      // Always release the mutex
      isCreatingSession.current = false;
    }
  };

  const refreshSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      
      if (data.success) {
        const loadedSessions = data.sessions || [];
        
        // Automatically clean up old sessions (keep only last 10)
        await cleanupOldSessions(loadedSessions);
        
        setSessions(loadedSessions);
        
        // Update current session if we have a sessionId
        const currentSessionId = sessionId || localStorage.getItem('currentSessionId');
        if (currentSessionId) {
          const activeSession = loadedSessions.find((s: Session) => s.id === currentSessionId);
          if (activeSession) {
            setCurrentSession(activeSession);
          }
        }
        
        return loadedSessions; // Return sessions for coordination
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
    return []; // Return empty array on error
  };

  const cleanupOldSessions = async (sessions: Session[]) => {
    const SESSION_LIMIT = 10; // Keep only 10 most recent sessions
    
    if (sessions.length > SESSION_LIMIT) {
      // Sort by creation date and get sessions to delete
      const sortedSessions = sessions.sort((a, b) => {
        const timeA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt;
        const timeB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt;
        return timeB - timeA; // Most recent first
      });
      
      const sessionsToDelete = sortedSessions.slice(SESSION_LIMIT);
      const currentSessionId = localStorage.getItem('currentSessionId');
      
      console.log(`🧹 Cleaning up ${sessionsToDelete.length} old sessions (keeping ${SESSION_LIMIT} most recent)`);
      
      for (const session of sessionsToDelete) {
        // Don't delete the current session
        if (session.id !== currentSessionId) {
          try {
            console.log('🗑️ Deleting old session:', session.name, session.id);
            await fetch(`/api/sessions?sessionId=${session.id}`, {
              method: 'DELETE'
            });
          } catch (error) {
            console.error('❌ Failed to delete session:', session.id, error);
          }
        }
      }
    }
  };

  const createSession = async (name?: string, description?: string) => {
    // Atomic session creation - don't use mutex here since initializeSession already handles it
    console.log('🔨 Starting atomic session creation...');
    
    // Track session creation time for baseline metrics
    const startTime = performance.now();
    
    try {
      // Generate unique session name with timestamp and counter
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const sessionCount = sessions.length + 1;
      const sessionName = name || `Session ${sessionCount} - ${dateStr} ${timeStr}`;
      const sessionDescription = description || 'Coder1 IDE development session';
      
      console.log('📝 Creating session with name:', sessionName);
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName,
          description: sessionDescription,
          metadata: {
            ide: true,
            version: '1.0.0',
            createdFrom: 'coder1-ide',
            createdAt: new Date().toISOString(),
            preventDuplicates: true
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const newSession = data.session;
          console.log('✨ Session created successfully:', newSession.name, newSession.id);
          
          // Atomically set all session state
          setCurrentSession(newSession);
          setSessionId(newSession.id);
          localStorage.setItem('currentSessionId', newSession.id);
          
          // Refresh sessions list
          await refreshSessions();
          
          // Dispatch custom event for other components
          window.dispatchEvent(new CustomEvent('sessionChanged', { 
            detail: { session: newSession } 
          }));
          
          // Track session creation time for monitoring
          const duration = performance.now() - startTime;
          console.log('⏱️ Session creation took:', Math.round(duration), 'ms');
          
          fetch('/api/metrics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'session-creation',
              value: duration,
              sessionId: newSession.id
            })
          }).catch(() => {}); // Fire and forget
          
        } else {
          console.error('❌ Session creation failed:', data.error);
        }
      } else {
        console.error('❌ Session creation request failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Session creation error:', error);
      
      // Track error for monitoring
      fetch('/api/metrics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'session-creation-error',
          error: error.message 
        })
      }).catch(() => {});
    }
  };

  const createEnhancedSession = async (sessionType: string, name: string, description?: string, context?: any) => {
    // Enhanced session creation with contextual metadata
    console.log('✨ Starting enhanced session creation...', { sessionType, name, description });
    
    // Track session creation time for monitoring
    const startTime = performance.now();
    
    try {
      // Create enhanced metadata structure
      const enhancedMetadata = {
        ide: true,
        version: '1.0.0',
        createdFrom: 'coder1-ide-enhanced',
        createdAt: new Date().toISOString(),
        preventDuplicates: true,
        
        // Enhanced contextual data
        sessionType,
        context: context || {
          workingDirectory: process.cwd(),
          recentFiles: [],
          terminalCommands: [],
          lastActivity: new Date().toISOString()
        },
        
        // Additional session organization data
        tags: [sessionType],
        progress: {
          status: 'planning',
          completionPercentage: 0,
          milestones: []
        }
      };
      
      console.log('📝 Creating enhanced session with metadata:', enhancedMetadata);
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description?.trim() || `Enhanced ${sessionType} session`,
          metadata: enhancedMetadata
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const newSession = data.session;
          console.log('✨ Enhanced session created successfully:', newSession.name, newSession.id);
          
          // Atomically set all session state
          setCurrentSession(newSession);
          setSessionId(newSession.id);
          localStorage.setItem('currentSessionId', newSession.id);
          
          // Refresh sessions list
          await refreshSessions();
          
          // Dispatch custom event for other components
          window.dispatchEvent(new CustomEvent('sessionChanged', { 
            detail: { session: newSession, enhanced: true } 
          }));
          
          // Show success notification
          window.dispatchEvent(new CustomEvent('showToast', {
            detail: {
              message: `✅ Session "${newSession.name}" created successfully!`,
              type: 'success'
            }
          }));
          
          // Track session creation time for monitoring
          const duration = performance.now() - startTime;
          console.log('⏱️ Enhanced session creation took:', Math.round(duration), 'ms');
          
          fetch('/api/metrics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'enhanced-session-creation',
              value: duration,
              sessionId: newSession.id,
              sessionType,
              metadata: { enhanced: true }
            })
          }).catch(() => {}); // Fire and forget
          
          // Return success
          return newSession;
          
        } else {
          console.error('❌ Enhanced session creation failed:', data.error);
          throw new Error(data.error || 'Failed to create enhanced session');
        }
      } else {
        console.error('❌ Enhanced session creation request failed:', response.status, response.statusText);
        throw new Error(`Session creation failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Enhanced session creation error:', error);
      
      // Track error for monitoring
      fetch('/api/metrics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'enhanced-session-creation-error',
          error: error instanceof Error ? error.message : 'Unknown error',
          sessionType
        })
      }).catch(() => {});
      
      // Re-throw to let the UI handle the error
      throw error;
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
    createEnhancedSession,
    switchSession,
    endSession
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}