'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, Save, FileText, DollarSign, RefreshCw } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

interface Session {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: any;
}

interface Checkpoint {
  id: string;
  sessionId: string;
  name: string;
  description: string;
  timestamp: number;
  data: any;
  metadata?: any;
}

export default function SessionsPanel() {
  const { currentSession, sessions, refreshSessions, createSession, switchSession, endSession } = useSession();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionTime, setSessionTime] = useState('00:00:00');
  
  // Load real sessions from API
  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sessions');
      const data = await response.json();
      
      if (data.success) {
        // Refresh sessions via context
        await refreshSessions();
        
        // Check for active session from localStorage
        const currentSessionId = localStorage.getItem('currentSessionId');
        if (currentSessionId) {
          const activeSession = data.sessions.find((s: Session) => s.id === currentSessionId);
          if (activeSession) {
            switchSession(activeSession);
            loadCheckpoints(activeSession.id);
          }
        } else if (data.sessions.length > 0) {
          // Use most recent session as current
          const mostRecent = data.sessions[0];
          switchSession(mostRecent);
          localStorage.setItem('currentSessionId', mostRecent.id);
          loadCheckpoints(mostRecent.id);
        }
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load checkpoints for a session
  const loadCheckpoints = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/checkpoint?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setCheckpoints(data.checkpoints || []);
      }
    } catch (error) {
      console.error('Failed to load checkpoints:', error);
    }
  };
  
  // Load sessions on component mount
  useEffect(() => {
    loadSessions();
  }, []);
  
  // Update session timer for current session
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentSession) {
        const elapsed = Date.now() - currentSession.createdAt;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setSessionTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentSession]);
  
  const handleStartSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `IDE Session ${new Date().toLocaleString()}`,
          description: 'CoderOne IDE development session',
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
          switchSession(newSession);
          localStorage.setItem('currentSessionId', newSession.id);
          // Refresh sessions list
          loadSessions();
        }
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  // Handle session restoration
  const handleRestoreSession = async (session: Session) => {
    try {
      // Load checkpoints for this session
      const checkpointsResponse = await fetch(`/api/checkpoint?sessionId=${session.id}`);
      const checkpointsData = await checkpointsResponse.json();
      
      if (checkpointsData.success && checkpointsData.checkpoints.length > 0) {
        // Get the latest checkpoint
        const latestCheckpoint = checkpointsData.checkpoints[0];
        
        // Restore checkpoint data
        const restoreResponse = await fetch(`/api/sessions/${session.id}/checkpoints/${latestCheckpoint.id}/restore`, {
          method: 'POST'
        });
        
        if (restoreResponse.ok) {
          const restoreData = await restoreResponse.json();
          
          // Apply the restored state to the IDE
          if (restoreData.checkpoint.data) {
            const snapshot = restoreData.checkpoint.data.snapshot;
            
            // Restore localStorage data
            if (snapshot.files) localStorage.setItem('openFiles', snapshot.files);
            if (snapshot.terminal) localStorage.setItem('terminalHistory', snapshot.terminal);
            if (snapshot.editor) localStorage.setItem('editorContent', snapshot.editor);
            
            // Set as current session
            switchSession(session);
            localStorage.setItem('currentSessionId', session.id);
            loadCheckpoints(session.id);
            
            // Notify user
            console.log('✅ Session restored:', session.name);
            
            // Trigger a page reload to fully restore the IDE state
            window.location.reload();
          }
        }
      } else {
        // No checkpoints, just switch to this session
        switchSession(session);
        localStorage.setItem('currentSessionId', session.id);
        console.log('📄 Switched to session (no checkpoints):', session.name);
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  };
  
  const handleEndSession = () => {
    endSession();
    localStorage.removeItem('currentSessionId');
  };
  
  const getSessionStatus = (session: Session): 'active' | 'completed' => {
    return currentSession?.id === session.id ? 'active' : 'completed';
  };
  
  const formatDuration = (createdAt: number, updatedAt: number): string => {
    const duration = updatedAt - createdAt;
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  };
  
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-text-muted">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading sessions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Current Session */}
      {currentSession && (
        <div className="p-3 bg-bg-tertiary border-b border-border-default">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-text-primary">Active Session</h4>
            <span className="text-xs text-coder1-cyan font-mono">{sessionTime}</span>
          </div>
          
          <div className="text-xs text-text-secondary mb-2 truncate" title={currentSession.name}>
            {currentSession.name}
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-text-secondary">
              {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="flex gap-1">
            <button
              onClick={handleEndSession}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-bg-primary hover:bg-bg-secondary rounded transition-colors"
              title="End current session"
            >
              <Save className="w-3 h-3" />
              End
            </button>
            <button
              onClick={() => loadSessions()}
              className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-bg-primary hover:bg-bg-secondary rounded transition-colors"
              title="Refresh sessions"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
      
      {/* Start New Session */}
      {!currentSession && (
        <div className="p-3 border-b border-border-default">
          <button
            onClick={handleStartSession}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-coder1-cyan/10 hover:bg-coder1-cyan/20 text-coder1-cyan rounded transition-colors"
          >
            <Play className="w-4 h-4" />
            <span className="text-sm font-medium">Start New Session</span>
          </button>
        </div>
      )}
      
      {/* Previous Sessions */}
      <div className="flex-1 overflow-auto">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Previous Sessions ({sessions.filter(s => s.id !== currentSession?.id).length})
            </h4>
            <button
              onClick={() => loadSessions()}
              className="text-text-muted hover:text-text-primary transition-colors"
              title="Refresh sessions"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          
          <div className="space-y-2">
            {sessions.filter(s => s.id !== currentSession?.id).map(session => (
              <div
                key={session.id}
                className="p-2 bg-bg-primary rounded hover:bg-bg-tertiary transition-colors cursor-pointer"
                onClick={() => handleRestoreSession(session)}
                title={`Click to restore session: ${session.name}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm text-text-primary font-medium truncate" title={session.name}>
                    {session.name}
                  </span>
                  <span className="text-xs text-text-muted whitespace-nowrap ml-2">
                    {formatDuration(session.createdAt, session.updatedAt)}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                  </div>
                  {session.metadata?.ide && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>IDE</span>
                    </div>
                  )}
                </div>
                
                {session.description && (
                  <div className="mt-1 text-xs text-text-muted truncate" title={session.description}>
                    {session.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Total Stats */}
      <div className="p-3 bg-bg-tertiary border-t border-border-default">
        <div className="flex justify-between items-center text-xs">
          <span className="text-text-muted">Total Sessions:</span>
          <span className="text-text-primary font-medium">
            {sessions.length}
          </span>
        </div>
        {currentSession && (
          <div className="flex justify-between items-center text-xs mt-1">
            <span className="text-text-muted">Current Checkpoints:</span>
            <span className="text-text-primary font-medium">
              {checkpoints.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}