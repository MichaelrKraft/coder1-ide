'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Play, Pause, Save, FileText, DollarSign, RefreshCw, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { sessionEnhancementService } from '@/services/session-enhancement-service';
import { getSessionTypeById } from '@/lib/session-types';

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

interface SessionsPanelProps {
  isVisible?: boolean;
}

export default function SessionsPanel({ isVisible = true }: SessionsPanelProps) {
  const { currentSession, sessions, refreshSessions, createSession, switchSession, endSession } = useSession();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionTime, setSessionTime] = useState('00:00:00');
  const [restoringSessionId, setRestoringSessionId] = useState<string | null>(null);
  const [restoringCheckpointId, setRestoringCheckpointId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Enhanced session loading with deduplication and intelligent naming
  const loadSessions = async () => {
    try {
      setLoading(true);
      // Just refresh via context - it handles all the complex logic
      await refreshSessions();
      
      // Load checkpoints for current session if available
      if (currentSession) {
        loadCheckpoints(currentSession.id);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Get enhanced session display data with session type information
  const getEnhancedSession = (session: Session) => {
    // For now, add some basic enhancements
    // This will be expanded with real activity tracking
    const enhanced = sessionEnhancementService.formatSessionForDisplay({
      ...session,
      filesModified: [],
      terminalHistory: '',
      claudeInteractions: 0
    });
    
    // Add session type information from metadata
    const sessionType = session.metadata?.sessionType 
      ? getSessionTypeById(session.metadata.sessionType)
      : null;
    
    return {
      ...enhanced,
      sessionType,
      isEnhanced: !!session.metadata?.sessionType
    };
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
  
  // Memoize event handlers to prevent unnecessary re-registration
  const handleCheckpointCreated = useCallback((event: CustomEvent) => {
    // REMOVED: // REMOVED: console.log('📍 Checkpoint created event received:', event.detail);
    // Only reload checkpoints if this is the current session
    if (currentSession && event.detail.sessionId === currentSession.id) {
      loadCheckpoints(currentSession.id);
    }
    // Don&apos;t call refreshSessions here - causes infinite loop
  }, [currentSession]);
  
  const handleSessionChanged = useCallback((event: CustomEvent) => {
    // REMOVED: // REMOVED: console.log('🔄 Session changed event received:', event.detail);
    // Only reload checkpoints for the new session
    if (event.detail.session) {
      loadCheckpoints(event.detail.session.id);
    }
    // No need to call loadSessions - context already handles this
  }, []);
  
  // Load sessions on component mount and set up event listeners
  useEffect(() => {
    // Only load sessions once on mount
    const loadOnce = async () => {
      if (!loading) return; // Prevent multiple loads
      await loadSessions();
    };
    loadOnce();
  }, []); // Empty dependency array - only run once on mount
  
  // Separate effect for event listeners to avoid recreation
  useEffect(() => {
    window.addEventListener('checkpointCreated', handleCheckpointCreated as EventListener);
    window.addEventListener('sessionChanged', handleSessionChanged as EventListener);
    
    return () => {
      window.removeEventListener('checkpointCreated', handleCheckpointCreated as EventListener);
      window.removeEventListener('sessionChanged', handleSessionChanged as EventListener);
    };
  }, []); // Empty dependency array - set up once, never recreate
  
  // Update session timer for current session - only when visible
  useEffect(() => {
    if (!isVisible || !currentSession) return;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - currentSession.createdAt;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      setSessionTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentSession, isVisible]);
  
  const handleStartSession = async () => {
    // Use context method - it already handles session refresh internally
    await createSession();
  };

  // Handle checkpoint restoration
  const handleRestoreCheckpoint = async (checkpoint: Checkpoint) => {
    // REMOVED: // REMOVED: console.log('🔄 Starting checkpoint restoration for:', checkpoint.name, 'ID:', checkpoint.id);
    setRestoringCheckpointId(checkpoint.id);
    setLastAction(null);
    
    try {
      // REMOVED: // REMOVED: console.log('📡 Calling API: /api/sessions/' + checkpoint.sessionId + '/checkpoints/' + checkpoint.id + '/restore');
      
      // Restore checkpoint data
      const restoreResponse = await fetch(`/api/sessions/${checkpoint.sessionId}/checkpoints/${checkpoint.id}/restore`, {
        method: 'POST'
      });
      
      // REMOVED: // REMOVED: console.log('📊 Checkpoint API Response Status:', restoreResponse.status, restoreResponse.ok);
      
      if (restoreResponse.ok) {
        const restoreData = await restoreResponse.json();
        // REMOVED: // REMOVED: console.log('📦 Checkpoint API Response Data:', restoreData);
        
        // Apply the restored state to the IDE with smooth transitions
        if (restoreData.checkpoint && restoreData.checkpoint.data) {
          const snapshot = restoreData.checkpoint.data.snapshot;
          // REMOVED: // REMOVED: console.log('📸 Applying checkpoint snapshot:', snapshot);
          
          // Restore localStorage data
          if (snapshot.files) localStorage.setItem('openFiles', snapshot.files);
          if (snapshot.terminal) localStorage.setItem('terminalHistory', snapshot.terminal);
          if (snapshot.editor) localStorage.setItem('editorContent', snapshot.editor);
          
          // Switch to the checkpoint's session smoothly
          const checkpointSession = sessions.find(s => s.id === checkpoint.sessionId);
          if (checkpointSession) {
            // REMOVED: // REMOVED: console.log('🔄 Switching to checkpoint session:', checkpointSession.name);
            switchSession(checkpointSession);
          }
          
          // Dispatch restoration events for other components
          window.dispatchEvent(new CustomEvent('checkpointRestored', {
            detail: { checkpoint, snapshot }
          }));
          
          window.dispatchEvent(new CustomEvent('ideStateChanged', {
            detail: { type: 'checkpoint-restored', data: snapshot }
          }));
          
          // Notify user with success
          // REMOVED: // REMOVED: console.log('✅ Checkpoint restored successfully:', checkpoint.name);
          setLastAction({ type: 'success', message: `Checkpoint "${checkpoint.name}" restored successfully` });
        } else {
          // REMOVED: // REMOVED: console.log('⚠️ Checkpoint data missing or invalid structure');
          setLastAction({ type: 'error', message: 'Checkpoint data not found or invalid' });
        }
      } else {
        const errorText = await restoreResponse.text();
        console.error('❌ Checkpoint API failed:', restoreResponse.status, errorText);
        setLastAction({ type: 'error', message: `Failed to restore checkpoint: ${restoreResponse.status} ${errorText}` });
      }
    } catch (error) {
      console.error('💥 Checkpoint restoration error:', error);
      setLastAction({ type: 'error', message: `Error restoring checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setRestoringCheckpointId(null);
      // Clear success message after 3 seconds
      if (lastAction?.type === 'success') {
        setTimeout(() => setLastAction(null), 3000);
      }
    }
  };

  // Handle session restoration - simplified to use context
  const handleRestoreSession = async (session: Session) => {
    // REMOVED: // REMOVED: console.log('🎯 Starting session restoration for:', session.name, 'ID:', session.id);
    setRestoringSessionId(session.id);
    setLastAction(null);
    
    try {
      // REMOVED: // REMOVED: console.log('📡 Fetching checkpoints for session:', session.id);
      
      // Load checkpoints for this session
      const checkpointsResponse = await fetch(`/api/checkpoint?sessionId=${session.id}`);
      // REMOVED: // REMOVED: console.log('📊 Checkpoints API Response Status:', checkpointsResponse.status, checkpointsResponse.ok);
      
      if (!checkpointsResponse.ok) {
        const errorText = await checkpointsResponse.text();
        console.error('❌ Checkpoints API failed:', checkpointsResponse.status, errorText);
        setLastAction({ type: 'error', message: `Failed to load session checkpoints: ${checkpointsResponse.status}` });
        return;
      }
      
      const checkpointsData = await checkpointsResponse.json();
      // REMOVED: // REMOVED: console.log('📦 Checkpoints API Response Data:', checkpointsData);
      
      if (checkpointsData.success && checkpointsData.checkpoints && checkpointsData.checkpoints.length > 0) {
        // REMOVED: // REMOVED: console.log('📍 Found', checkpointsData.checkpoints.length, 'checkpoints, restoring latest');
        
        // Get the latest checkpoint and restore it
        const latestCheckpoint = checkpointsData.checkpoints[0];
        // REMOVED: // REMOVED: console.log('🔄 Restoring latest checkpoint:', latestCheckpoint.name);
        await handleRestoreCheckpoint(latestCheckpoint);
      } else {
        // REMOVED: // REMOVED: console.log('📄 No checkpoints found, switching to session directly');
        
        // No checkpoints, just switch to this session via context
        switchSession(session);
        // REMOVED: // REMOVED: console.log('✅ Switched to session (no checkpoints):', session.name);
        setLastAction({ type: 'success', message: `Switched to session "${session.name}"` });
      }
    } catch (error) {
      console.error('💥 Session restoration error:', error);
      setLastAction({ type: 'error', message: `Error restoring session: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setRestoringSessionId(null);
      // Clear success message after 3 seconds
      if (lastAction?.type === 'success') {
        setTimeout(() => setLastAction(null), 3000);
      }
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
      {currentSession && (() => {
        const enhanced = getEnhancedSession(currentSession);
        return (
          <div className="p-3 bg-bg-tertiary border-b border-border-default">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-text-primary">Active Session</h4>
              <span className="text-xs text-coder1-cyan font-mono">{sessionTime}</span>
            </div>
            
            <div className="flex items-center gap-2 mb-1">
              {enhanced.sessionType && (
                <span className="text-sm" title={enhanced.sessionType.name}>
                  {enhanced.sessionType.emoji}
                </span>
              )}
              <div className="text-sm font-medium text-text-primary truncate flex-1" title={enhanced.title}>
                {enhanced.title}
              </div>
            </div>
            
            {enhanced.projectName && enhanced.projectName !== 'Development Project' && (
              <div className="text-xs text-text-secondary mb-2">
                📁 {enhanced.projectName}
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-text-secondary">
                {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''}
              </span>
            </div>
          
          {/* Show checkpoints list if available */}
          {checkpoints.length > 0 && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {checkpoints.slice(0, 3).map((checkpoint, index) => {
                const isRestoring = restoringCheckpointId === checkpoint.id;
                return (
                  <div 
                    key={checkpoint.id}
                    className={`text-xs rounded p-1 transition-all ${
                      isRestoring 
                        ? 'bg-coder1-cyan/10 border border-coder1-cyan/20' 
                        : 'bg-bg-primary hover:bg-bg-secondary cursor-pointer'
                    }`}
                    onClick={() => !isRestoring && handleRestoreCheckpoint(checkpoint)}
                    title={isRestoring ? 'Restoring checkpoint...' : `Restore checkpoint: ${checkpoint.name}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {isRestoring && <Loader2 className="w-3 h-3 animate-spin text-coder1-cyan" />}
                        <span className={`truncate ${
                          isRestoring ? 'text-coder1-cyan' : 'text-text-secondary'
                        }`}>
                          {checkpoint.name}
                        </span>
                      </div>
                      <span className="text-text-muted text-[10px]">
                        {isRestoring ? 'Restoring...' : new Date(checkpoint.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
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
              onClick={() => refreshSessions()}
              className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-bg-primary hover:bg-bg-secondary rounded transition-colors"
              title="Refresh sessions"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
        );
      })()}
      
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
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Previous Sessions ({sessions.filter(s => s.id !== currentSession?.id).length})
            </h4>
            <button
              onClick={() => refreshSessions()}
              className="text-text-muted hover:text-text-primary transition-colors"
              title="Refresh sessions"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          
          <div className="space-y-2">
            {sessions.filter(s => s.id !== currentSession?.id).map(session => {
              const isRestoring = restoringSessionId === session.id;
              const enhanced = getEnhancedSession(session);
              return (
                <div
                  key={session.id}
                  className={`p-2 rounded transition-all ${
                    isRestoring 
                      ? 'bg-coder1-cyan/10 border border-coder1-cyan/20' 
                      : 'bg-bg-primary hover:bg-bg-tertiary cursor-pointer'
                  }`}
                  onClick={() => !isRestoring && switchSession(session)}
                  title={isRestoring ? 'Restoring session...' : `Click to switch to: ${enhanced.title}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isRestoring && <Loader2 className="w-4 h-4 animate-spin text-coder1-cyan flex-shrink-0" />}
                      {enhanced.sessionType && (
                        <span className="text-sm flex-shrink-0" title={enhanced.sessionType.name}>
                          {enhanced.sessionType.emoji}
                        </span>
                      )}
                      <span className={`text-sm font-medium truncate ${
                        isRestoring ? 'text-coder1-cyan' : 'text-text-primary'
                      }`} title={enhanced.title}>
                        {enhanced.title}
                      </span>
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap ml-2">
                      {isRestoring ? 'Restoring...' : enhanced.duration}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                    </div>
                    {enhanced.sessionType ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs" style={{ color: enhanced.sessionType.color }}>
                          {enhanced.sessionType.name}
                        </span>
                      </div>
                    ) : session.metadata?.ide ? (
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>IDE</span>
                      </div>
                    ) : null}
                  </div>
                  
                  {session.description && (
                    <div className="mt-1 text-xs text-text-muted truncate" title={session.description}>
                      {session.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Action Status & Total Stats */}
      <div className="p-3 bg-bg-tertiary border-t border-border-default">
        {/* Action Status */}
        {lastAction && (
          <div className={`mb-2 p-2 rounded text-xs flex items-center gap-2 ${
            lastAction.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {lastAction.type === 'success' ? (
              <CheckCircle className="w-3 h-3 flex-shrink-0" />
            ) : (
              <XCircle className="w-3 h-3 flex-shrink-0" />
            )}
            <span className="flex-1">{lastAction.message}</span>
          </div>
        )}
        
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