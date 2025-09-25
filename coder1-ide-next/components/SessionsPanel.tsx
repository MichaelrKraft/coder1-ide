'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Play, Pause, Save, FileText, DollarSign, RefreshCw, Loader2, CheckCircle, XCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { sessionEnhancementService } from '@/services/session-enhancement-service';
import { getSessionTypeById } from '@/lib/session-types';
import { filterThinkingAnimations } from '@/lib/checkpoint-utils';

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
  const [restorationStage, setRestorationStage] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{type: 'success' | 'error' | 'info', message: string, details?: string} | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  
  // Guard against concurrent checkpoint restorations
  const restorationInProgressRef = useRef<boolean>(false);
  
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
    // Check if restoration is already in progress
    if (restorationInProgressRef.current) {
      console.log('⚠️ Checkpoint restoration already in progress, ignoring request');
      return;
    }
    
    // Set the guard flag
    restorationInProgressRef.current = true;
    
    // REMOVED: // REMOVED: console.log('🔄 Starting checkpoint restoration for:', checkpoint.name, 'ID:', checkpoint.id);
    setRestoringCheckpointId(checkpoint.id);
    setLastAction(null);
    setRestorationStage('Loading checkpoint data...');
    
    try {
      // REMOVED: // REMOVED: console.log('📡 Calling API: /api/sessions/' + checkpoint.sessionId + '/checkpoints/' + checkpoint.id + '/restore');
      
      // Restore checkpoint data
      setRestorationStage('Fetching checkpoint from server...');
      const restoreResponse = await fetch(`/api/sessions/${checkpoint.sessionId}/checkpoints/${checkpoint.id}/restore`, {
        method: 'POST'
      });
      
      // REMOVED: // REMOVED: console.log('📊 Checkpoint API Response Status:', restoreResponse.status, restoreResponse.ok);
      
      if (restoreResponse.ok) {
        const restoreData = await restoreResponse.json();
        // REMOVED: // REMOVED: console.log('📦 Checkpoint API Response Data:', restoreData);
        
        // Apply the restored state to the IDE with smooth transitions
        console.log('🎯 Restore data structure:', JSON.stringify(restoreData, null, 2));
        if (restoreData.checkpoint && restoreData.checkpoint.data) {
          const snapshot = restoreData.checkpoint.data.snapshot;
          const conversationHistory = restoreData.checkpoint.data.conversationHistory;
          
          // 🚨 DIAGNOSTIC: Log raw terminal data before filtering
          if (snapshot?.terminal) {
            console.log('🔍 DIAGNOSTIC: Raw terminal data length:', snapshot.terminal.length);
            console.log('🔍 DIAGNOSTIC: Raw terminal first 500 chars:', snapshot.terminal.substring(0, 500));
            console.log('🔍 DIAGNOSTIC: Raw terminal last 500 chars:', snapshot.terminal.substring(snapshot.terminal.length - 500));
            
            // Check for "plan mode on" pattern in raw data
            const planModeMatches = snapshot.terminal.match(/plan mode on/gi);
            const pauseSymbolMatches = snapshot.terminal.match(/⏸/g);
            const shiftTabMatches = snapshot.terminal.match(/shift\+tab/gi);
            
            console.log('🔍 DIAGNOSTIC: "plan mode on" occurrences in raw data:', planModeMatches?.length || 0);
            console.log('🔍 DIAGNOSTIC: "⏸" symbol occurrences in raw data:', pauseSymbolMatches?.length || 0);
            console.log('🔍 DIAGNOSTIC: "shift+tab" occurrences in raw data:', shiftTabMatches?.length || 0);
            
            if (planModeMatches && planModeMatches.length > 10) {
              console.log('🚨 DIAGNOSTIC: FOUND HIGH REPETITION in raw checkpoint data!');
              console.log('🔍 DIAGNOSTIC: Sample repetitive lines:');
              const lines = snapshot.terminal.split('\n');
              const planModeLines = lines.filter(line => line.toLowerCase().includes('plan mode on'));
              console.log('🔍 DIAGNOSTIC: Plan mode lines (first 5):', planModeLines.slice(0, 5));
              console.log('🔍 DIAGNOSTIC: Total plan mode lines:', planModeLines.length);
            }
          }
          
          console.log('📸 Snapshot data keys:', Object.keys(snapshot || {}));
          console.log('💬 Conversation history length:', conversationHistory?.length || 0);
          
          // Count what we're restoring
          const conversationCount = conversationHistory?.length || 0;
          const hasTerminalData = !!snapshot?.terminal;
          const hasFileData = !!snapshot?.files;
          const hasEditorData = !!snapshot?.editor;
          
          // REMOVED: // REMOVED: console.log('📸 Applying checkpoint snapshot:', snapshot);
          
          // Stage 1: Restore localStorage data
          setRestorationStage('Restoring workspace data...');
          console.log('🏪 DIAGNOSTIC: Setting localStorage data...');
          
          if (snapshot.files) {
            localStorage.setItem('openFiles', snapshot.files);
            console.log('🏪 DIAGNOSTIC: Set openFiles to localStorage');
          }
          
          if (snapshot.terminal) {
            console.log('🏪 DIAGNOSTIC: About to set terminalHistory to localStorage');
            console.log('🏪 DIAGNOSTIC: Terminal data being stored length:', snapshot.terminal.length);
            console.log('🏪 DIAGNOSTIC: Terminal data contains "plan mode on":', 
              (snapshot.terminal.match(/plan mode on/gi) || []).length, 'times');
            localStorage.setItem('terminalHistory', snapshot.terminal);
            console.log('🏪 DIAGNOSTIC: Set terminalHistory to localStorage');
          }
          
          if (snapshot.editor) {
            localStorage.setItem('editorContent', snapshot.editor);
            console.log('🏪 DIAGNOSTIC: Set editorContent to localStorage');
          }
          
          console.log('🏪 DIAGNOSTIC: localStorage restoration complete');
          
          // Stage 2: Switch to the checkpoint's session
          setRestorationStage('Switching to checkpoint session...');
          const checkpointSession = sessions.find(s => s.id === checkpoint.sessionId);
          if (checkpointSession) {
            // REMOVED: // REMOVED: console.log('🔄 Switching to checkpoint session:', checkpointSession.name);
            switchSession(checkpointSession);
          }
          
          // Stage 3: Dispatch restoration events for terminal and conversation history
          setRestorationStage('Restoring terminal and conversation history...');
          console.log('📢 DIAGNOSTIC: About to dispatch restoration events...');
          
          console.log('📢 DIAGNOSTIC: Dispatching checkpointRestored event...');
          window.dispatchEvent(new CustomEvent('checkpointRestored', {
            detail: { checkpoint: restoreData.checkpoint, snapshot }
          }));
          console.log('📢 DIAGNOSTIC: checkpointRestored event dispatched');
          
          console.log('📢 DIAGNOSTIC: Dispatching ideStateChanged event...');
          window.dispatchEvent(new CustomEvent('ideStateChanged', {
            detail: { type: 'checkpoint-restored', data: snapshot, checkpoint: restoreData.checkpoint }
          }));
          console.log('📢 DIAGNOSTIC: ideStateChanged event dispatched');
          
          console.log('📢 DIAGNOSTIC: All restoration events dispatched');
          
          // Stage 4: Create sandbox for checkpoint exploration
          setRestorationStage('Creating checkpoint sandbox...');
          // Parse files data properly
          let filesArray = [];
          if (snapshot?.files) {
            try {
              const parsed = JSON.parse(snapshot.files);
              filesArray = Array.isArray(parsed) ? parsed : [];
              // Ensure we have file names
              filesArray = filesArray.map((f: any) => 
                typeof f === 'string' ? f : (f.name || f.path || 'unknown file')
              );
            } catch (e) {
              console.log('Failed to parse files:', e);
              filesArray = [];
            }
          }
          
          // Parse commands from terminal history if no conversation history
          let commandsArray = [];
          if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
            commandsArray = conversationHistory
              .slice(-10) // Get last 10 commands
              .filter((conv: any) => conv && conv.input)
              .map((conv: any) => conv.input);
          } else if (snapshot?.terminal) {
            // Extract commands from terminal history
            const terminalLines = snapshot.terminal.split('\n');
            // Look for bash prompt lines (bash-3.2$) followed by commands
            const promptRegex = /(?:bash-\d+\.\d+\$|╰─\$|\$)\s+(.+)/;
            commandsArray = terminalLines
              .map(line => {
                const match = line.match(promptRegex);
                return match ? match[1].trim() : null;
              })
              .filter(cmd => cmd && cmd.length > 0)
              .slice(-5); // Get last 5 commands
          }
          
          // Don't use fallback text - show actual state
          if (filesArray.length === 0 && snapshot?.files === '[]') {
            filesArray = ['No files were open at checkpoint'];
          } else if (filesArray.length === 0) {
            filesArray = ['Workspace state preserved'];
          }
          
          if (commandsArray.length === 0 && snapshot?.terminal) {
            commandsArray = ['Session in progress (see terminal below)'];
          } else if (commandsArray.length === 0) {
            commandsArray = ['No command history'];
          }
          
          // Clean the terminal history from thinking animations
          let cleanedTerminalHistory = '';
          if (snapshot?.terminal) {
            console.log('🧽 DIAGNOSTIC: Applying filterThinkingAnimations...');
            const beforeLength = snapshot.terminal.length;
            const beforePlanModeCount = (snapshot.terminal.match(/plan mode on/gi) || []).length;
            const beforePauseCount = (snapshot.terminal.match(/⏸/g) || []).length;
            
            cleanedTerminalHistory = filterThinkingAnimations(snapshot.terminal);
            
            const afterLength = cleanedTerminalHistory.length;
            const afterPlanModeCount = (cleanedTerminalHistory.match(/plan mode on/gi) || []).length;
            const afterPauseCount = (cleanedTerminalHistory.match(/⏸/g) || []).length;
            
            console.log('🧽 DIAGNOSTIC: Filter Results:');
            console.log('  📏 Length: ', beforeLength, '→', afterLength, '(', beforeLength - afterLength, 'chars removed)');
            console.log('  📝 "plan mode on": ', beforePlanModeCount, '→', afterPlanModeCount, '(', beforePlanModeCount - afterPlanModeCount, 'instances removed)');
            console.log('  ⏸ Pause symbols: ', beforePauseCount, '→', afterPauseCount, '(', beforePauseCount - afterPauseCount, 'symbols removed)');
            
            if (afterPlanModeCount > 0) {
              console.log('🚨 DIAGNOSTIC: FILTERING FAILED - "plan mode on" still present after filtering!');
              console.log('🔍 DIAGNOSTIC: Remaining plan mode lines:');
              const remainingLines = cleanedTerminalHistory.split('\n').filter(line => 
                line.toLowerCase().includes('plan mode on')
              ).slice(0, 3);
              remainingLines.forEach((line, i) => {
                console.log(`  ${i + 1}. "${line}"`);
              });
            } else {
              console.log('✅ DIAGNOSTIC: Filtering successful - all "plan mode on" text removed');
            }
          }
          
          const sandboxData = {
            name: restoreData.checkpoint.name || `Checkpoint ${new Date(restoreData.checkpoint.timestamp).toLocaleDateString('en-US')} ${new Date(restoreData.checkpoint.timestamp).toLocaleTimeString()}`,
            files: filesArray,
            commands: commandsArray,
            timestamp: restoreData.checkpoint.timestamp,
            description: restoreData.checkpoint.description || 'Restored checkpoint for safe exploration',
            originalCheckpoint: restoreData.checkpoint,
            terminalHistory: cleanedTerminalHistory, // Use cleaned terminal content
            checkpointData: {
              files: filesArray,
              commands: commandsArray,
              timestamp: restoreData.checkpoint.timestamp,
              terminalHistory: cleanedTerminalHistory // Use cleaned here too
            }
          };
          
          console.log('🏖️ Creating sandbox with data:', {
            name: sandboxData.name,
            filesCount: filesArray.length,
            files: filesArray,
            commandsCount: commandsArray.length,
            commands: commandsArray,
            terminalHistoryLength: sandboxData.terminalHistory?.length || 0,
            hasTerminalHistory: !!sandboxData.terminalHistory
          });
          
          // Dispatch sandbox creation event for terminal container
          console.log('🏖️ DIAGNOSTIC: About to dispatch terminal:createSandbox event...');
          console.log('🏖️ DIAGNOSTIC: Sandbox terminal history length:', sandboxData.terminalHistory?.length || 0);
          console.log('🏖️ DIAGNOSTIC: Sandbox terminal contains "plan mode on":', 
            (sandboxData.terminalHistory?.match(/plan mode on/gi) || []).length, 'times');
          console.log('🏖️ DIAGNOSTIC: Sandbox data structure:', {
            name: sandboxData.name,
            filesCount: sandboxData.files?.length,
            commandsCount: sandboxData.commands?.length,
            terminalHistoryLength: sandboxData.terminalHistory?.length,
            hasTerminalHistory: !!sandboxData.terminalHistory
          });
          
          window.dispatchEvent(new CustomEvent('terminal:createSandbox', {
            detail: sandboxData
          }));
          
          console.log('🏖️ DIAGNOSTIC: terminal:createSandbox event dispatched');
          
          // Final stage: Show detailed success message
          setRestorationStage('Finalizing restoration...');
          
          // Build detailed success message
          const restoredItems = [];
          if (conversationCount > 0) restoredItems.push(`${conversationCount} conversation${conversationCount !== 1 ? 's' : ''}`);
          if (hasTerminalData) restoredItems.push('terminal session');
          if (hasFileData) restoredItems.push('open files');
          if (hasEditorData) restoredItems.push('editor content');
          
          const detailsText = restoredItems.length > 0 
            ? `Restored: ${restoredItems.join(', ')}` 
            : 'Basic checkpoint data restored';
          
          // Notify user with enhanced success message
          // REMOVED: // REMOVED: console.log('✅ Checkpoint restored successfully:', checkpoint.name);
          setLastAction({ 
            type: 'success', 
            message: `Checkpoint "${checkpoint.name}" restored successfully`,
            details: detailsText
          });
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
      setRestorationStage(null);
      // Clear the restoration guard flag
      restorationInProgressRef.current = false;
      // Clear success message after 5 seconds (longer for enhanced message)
      if (lastAction?.type === 'success') {
        setTimeout(() => setLastAction(null), 5000);
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

  const handleDeleteSession = async (sessionId: string) => {
    try {
      setLastAction({ type: 'info', message: 'Deleting session...' });
      
      const response = await fetch(`/api/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete session');
      }
      
      // Refresh sessions list
      await refreshSessions();
      setLastAction({ type: 'success', message: 'Session deleted successfully' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setLastAction(null), 3000);
    } catch (error) {
      console.error('Failed to delete session:', error);
      setLastAction({ 
        type: 'error', 
        message: 'Failed to delete session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
  const getSessionStatus = (session: Session): 'active' | 'completed' => {
    return currentSession?.id === session.id ? 'active' : 'completed';
  };
  
  const formatDuration = (createdAt: number | null | undefined, updatedAt: number | null | undefined): string => {
    try {
      // Handle null or undefined inputs
      if (!createdAt || !updatedAt) {
        return '00:00:00';
      }
      
      // Ensure we have valid numbers
      const start = Number(createdAt);
      const end = Number(updatedAt);
      
      // Check for invalid numbers (NaN)
      if (isNaN(start) || isNaN(end)) {
        console.warn('Invalid timestamps in formatDuration:', { createdAt, updatedAt });
        return '00:00:00';
      }
      
      // Calculate duration (ensure non-negative)
      const duration = Math.max(0, end - start);
      
      // If duration is 0 or very small, return minimum
      if (duration < 1000) {
        return '00:00:00';
      }
      
      const hours = Math.floor(duration / 3600000);
      const minutes = Math.floor((duration % 3600000) / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      
      // Handle very long durations
      if (hours > 999) {
        return '999:59:59'; // Cap at maximum displayable
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error formatting duration:', error, { createdAt, updatedAt });
      return '00:00:00'; // Always return a valid string
    }
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
                    className={`text-xs rounded p-2 transition-all border ${
                      isRestoring 
                        ? 'bg-coder1-cyan/10 border-coder1-cyan/30' 
                        : 'bg-bg-primary hover:bg-bg-secondary border-border-default hover:border-coder1-cyan/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1 flex-1">
                        {isRestoring && <Loader2 className="w-3 h-3 animate-spin text-coder1-cyan" />}
                        <span className={`truncate ${
                          isRestoring ? 'text-coder1-cyan font-medium' : 'text-text-primary'
                        }`}>
                          📌 {checkpoint.name}
                        </span>
                      </div>
                      <span className="text-text-muted text-[10px] ml-2">
                        {new Date(checkpoint.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <button
                      onClick={() => !isRestoring && handleRestoreCheckpoint(checkpoint)}
                      disabled={isRestoring}
                      className={`w-full mt-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                        isRestoring 
                          ? 'bg-coder1-cyan/20 text-coder1-cyan cursor-not-allowed'
                          : 'bg-coder1-cyan/10 hover:bg-coder1-cyan/20 text-coder1-cyan cursor-pointer active:scale-95'
                      }`}
                      title={isRestoring ? (restorationStage || 'Restoring checkpoint...') : 'Click to restore this checkpoint'}
                    >
                      {isRestoring ? (
                        <span className="flex items-center justify-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Restoring...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          ↩️ Restore Checkpoint
                        </span>
                      )}
                    </button>
                    {isRestoring && restorationStage && (
                      <div className="mt-1 text-[10px] text-coder1-cyan/80 truncate text-center">
                        {restorationStage}
                      </div>
                    )}
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
        <div className="p-3 pb-1">
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
          
          <div className="space-y-2 pb-2">
            {sessions
              .filter(s => s.id !== currentSession?.id)
              .slice(0, showAllSessions ? undefined : 6)
              .map(session => {
              const isRestoring = restoringSessionId === session.id;
              const enhanced = getEnhancedSession(session);
              return (
                <div
                  key={session.id}
                  className={`group relative p-2 rounded transition-all ${
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
                  
                  {/* Delete button - visible on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-all"
                    title="Delete session"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  
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
          
          {/* Show more/less button if there are more than 6 sessions */}
          {sessions.filter(s => s.id !== currentSession?.id).length > 6 && (
            <button
              onClick={() => setShowAllSessions(!showAllSessions)}
              className="w-full px-3 py-2 flex items-center justify-center gap-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors rounded"
            >
              {showAllSessions ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show {sessions.filter(s => s.id !== currentSession?.id).length - 6} more
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Action Status & Total Stats */}
      <div className="p-3 bg-bg-tertiary border-t border-border-default">
        {/* Action Status */}
        {lastAction && (
          <div className={`mb-2 p-2 rounded text-xs ${
            lastAction.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : lastAction.type === 'info'
              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            <div className="flex items-center gap-2">
              {lastAction.type === 'success' ? (
                <CheckCircle className="w-3 h-3 flex-shrink-0" />
              ) : lastAction.type === 'info' ? (
                <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" />
              ) : (
                <XCircle className="w-3 h-3 flex-shrink-0" />
              )}
              <span className="flex-1">{lastAction.message}</span>
            </div>
            {lastAction.details && (
              <div className={`mt-1 text-[10px] ${
                lastAction.type === 'success' 
                  ? 'text-green-400/80'
                  : lastAction.type === 'info'
                  ? 'text-blue-400/80'
                  : 'text-red-400/80'
              }`}>
                {lastAction.details}
              </div>
            )}
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