/**
 * StatusBarActions - Action Buttons Component
 * 
 * Contains all the action buttons: CheckPoint, TimeLine, Session Summary, Docs
 * Extracted from the original StatusBar for better separation of concerns
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Save, Clock, FileText, BookOpen, Loader2, Brain, Link, Sparkles, Download, Eye } from '@/lib/icons';
import StatusBarModals from './StatusBarModals';
import CheckpointNameModal from '@/components/modals/CheckpointNameModal';
import DownloadProjectModal from '@/components/modals/DownloadProjectModal';
import PreviewModal from '@/components/modals/PreviewModal';
import { useIDEStore } from '@/stores/useIDEStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useUIStore } from '@/stores/useUIStore';
import { useContextActivation } from '@/lib/hooks/useContextActivation';
import { glows } from '@/lib/design-tokens';
import type { IDEFile } from '@/types';
import { memoryDetectionService, type MemoryDetectionResult } from '@/lib/memory-detection-client';
import { getSocket } from '@/lib/socket';

interface StatusBarActionsProps {
  activeFile?: string | null;
  isConnected?: boolean;
  openFiles?: IDEFile[];
  getTerminalHistory?: () => string; // ⚡ CHANGED: Callback to get terminal history without re-renders
  terminalCommands?: string[];
  terminalSessionId?: string | null; // 🔧 CRITICAL: Actual terminal session ID from IDE page
}

const StatusBarActions = React.memo(function StatusBarActions({
  activeFile,
  isConnected = false,
  openFiles = [],
  getTerminalHistory, // ⚡ CHANGED: Callback instead of string
  terminalCommands = [],
  terminalSessionId // 🔧 CRITICAL: Use this instead of guessing from localStorage
}: StatusBarActionsProps) {
  // Get Next.js router for navigation
  const router = useRouter();
  
  // Get state from stores
  const { loading } = useIDEStore();
  const { currentSession, createCheckpoint } = useSessionStore();
  const { addToast, openModal, isModalOpen } = useUIStore();
  
  // PHASE 3: Context activation for AI features
  const { activateContext, isContextActive } = useContextActivation();
  
  // Get current session ID
  const [sessionId, setSessionId] = React.useState<string>('');
  
  // Checkpoint naming modal state
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = React.useState(false);
  
  // Download modal state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
  const [shouldPulseDownload, setShouldPulseDownload] = React.useState(false);
  
  // Preview modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = React.useState(false);
  const [currentTeamId, setCurrentTeamId] = React.useState<string | null>(null);
  
  // Memory detection state
  const [memoryDetection, setMemoryDetection] = React.useState<MemoryDetectionResult | null>(null);
  const [isAnalyzingMemory, setIsAnalyzingMemory] = React.useState(false);
  
  React.useEffect(() => {
    // 🔧 CRITICAL FIX: Use terminalSessionId prop (ACTUAL value from IDE page state)
    // Previous bug: Tried to guess from localStorage which was stale/wrong
    // This caused Timeline button to pass wrong session ID, breaking "Back to IDE" navigation
    
    let effectiveSessionId: string;
    
    if (terminalSessionId) {
      // Use the ACTUAL terminal session ID passed from IDE page
      effectiveSessionId = terminalSessionId;
      console.log('📊 [STATUSBAR] Using ACTUAL terminal session ID from prop:', effectiveSessionId);
    } else {
      // Fallback only if no session ID provided (shouldn't happen normally)
      const storedId = typeof window !== 'undefined' ? localStorage.getItem('ide-terminalSessionId') : null;
      effectiveSessionId = currentSession?.metadata.sessionId || 
                          storedId || 
                          `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.warn('⚠️ [STATUSBAR] No terminalSessionId prop! Falling back to localStorage/generated:', effectiveSessionId);
    }
    
    setSessionId(effectiveSessionId);
    
    // Keep localStorage in sync with actual session ID
    if (typeof window !== 'undefined') {
      localStorage.setItem('ide-terminalSessionId', effectiveSessionId);
    }
  }, [currentSession, terminalSessionId]);
  
  // Memory detection effect - analyze session for memory-worthy events
  React.useEffect(() => {
    const analyzeSession = async () => {
      const currentHistory = getTerminalHistory ? getTerminalHistory() : '';
      console.log('🧠 [MEMORY] Analyzing session...', {
        openFilesCount: openFiles.length,
        activeFile,
        terminalHistoryLength: currentHistory?.length || 0,
        terminalCommandsCount: terminalCommands?.length || 0,
        isAnalyzing: isAnalyzingMemory
      });
      
      if (isAnalyzingMemory) {
        console.log('🧠 [MEMORY] Skip - already analyzing');
        return;
      }
      
      // Allow detection even with no files for testing
      // if (!openFiles.length) {
      //   console.log('🧠 [MEMORY] Skip - no open files');
      //   return;
      // }
      
      setIsAnalyzingMemory(true);
      
      try {
        console.log('🧠 [MEMORY] Calling detection service...');
        const result = memoryDetectionService.analyzeSession(
          openFiles,
          activeFile,
          currentHistory,
          terminalCommands
        );
        
        console.log('🧠 [MEMORY] Detection result:', {
          isMemoryWorthy: result.isMemoryWorthy,
          confidence: result.confidence,
          eventsCount: result.events.length,
          events: result.events.map(e => ({ type: e.type, confidence: e.confidence })),
          autoGenRecommended: result.autoGenerationRecommended
        });
        
        setMemoryDetection(result);
      } catch (error) {
        console.error('🧠 [MEMORY] Detection failed:', error);
      } finally {
        setIsAnalyzingMemory(false);
        console.log('🧠 [MEMORY] Analysis complete');
      }
    };
    
    // Debounce to avoid excessive analysis
    const timeoutId = setTimeout(analyzeSession, 2000);
    return () => clearTimeout(timeoutId);
  }, [openFiles, activeFile, terminalCommands, isAnalyzingMemory]); // ⚡ Removed terminalHistory - now using callback

  // Listen for AI Team completion to trigger download button pulse
  React.useEffect(() => {
    let cleanup: (() => void) | null = null;
    
    const setupSocketListeners = async () => {
      try {
        const socket = await getSocket();
        if (!socket) {
          console.warn('⚠️ Socket not available - AI Team events will not be received');
          return;
        }
        
        // Verify socket has required methods
        if (typeof socket.on !== 'function') {
          console.error('❌ Socket object is invalid - missing .on() method');
          return;
        }
        
        const handleAITeamCompleted = () => {
          console.log('🎉 AI Team completed - pulsing download button');
          setShouldPulseDownload(true);
        };
        
        const handleTeamSummary = (data: any) => {
          console.log('📊 Team summary received - storing teamId:', data.teamId);
          setCurrentTeamId(data.teamId);
        };
        
        socket.on('ai-team:completed', handleAITeamCompleted);
        socket.on('team:summary', handleTeamSummary);
        
        cleanup = () => {
          if (typeof socket.off === 'function') {
            socket.off('ai-team:completed', handleAITeamCompleted);
            socket.off('team:summary', handleTeamSummary);
          }
        };
      } catch (error) {
        console.error('❌ Failed to setup socket listeners:', error);
        // Don't throw - this is non-critical functionality
      }
    };
    
    setupSocketListeners();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Button hover effects
  const applyHoverEffect = (e: React.MouseEvent<HTMLButtonElement>, isLoading: boolean) => {
    if (isLoading) return;
    e.currentTarget.style.boxShadow = glows.orange.medium;
    e.currentTarget.parentElement!.style.background = 'linear-gradient(135deg, #FB923C, #F97316)';
  };

  const removeHoverEffect = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.boxShadow = 'none';
    e.currentTarget.parentElement!.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
  };

  // Action handlers
  const handleCheckpoint = () => {
    // Show the naming modal first
    setIsCheckpointModalOpen(true);
  };

  const handleCheckpointSave = async (customName: string, createMemory?: boolean, memoryData?: { title: string; description: string; tags: string[] }) => {
    console.log('💾 [CHECKPOINT] Saving checkpoint with memory:', { customName, createMemory, memoryData });
    setIsCheckpointModalOpen(false);
    
    try {
      // Import companion client
      const { getCompanionClient } = await import('@/lib/companion-client');
      const companionClient = getCompanionClient();
      
      // Check if companion is connected for enhanced checkpoints
      if (companionClient.isConnected()) {
        // Enhanced checkpoint via companion service with Claude intelligence
        const result = await companionClient.executeClaudeCommand('checkpoint:create', {
          sessionId,
          projectPath: process.cwd(), // TODO: Get actual project path
          files: openFiles.reduce((acc, file) => {
            acc[file.path] = file.content || '';
            return acc;
          }, {}),
          terminal: getTerminalHistory ? getTerminalHistory() : '',
          metadata: {
            activeFile,
            timestamp: new Date().toISOString(),
            autoGenerated: false,
            customName: customName || undefined
          }
        });
        
        addToast({
          message: `✅ Smart checkpoint: ${result.checkpoint?.name || 'Saved successfully'}`,
          type: 'success'
        });
        
      } else {
        // Fallback to original checkpoint system with custom name support
        createCheckpoint(customName || 'Manual checkpoint', false);
        
        console.log('📝 Creating checkpoint with sessionId:', sessionId, 'customName:', customName);
        const response = await fetch('/api/checkpoint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            timestamp: new Date().toISOString(),
            activeFile,
            customName: customName || undefined,
            snapshot: {
              files: JSON.stringify(openFiles),
              terminal: getTerminalHistory ? getTerminalHistory() : '', // ⚡ Call callback to get fresh data
              editor: localStorage.getItem('editorContent') || ''
            },
            autoGenerated: false
          })
        });
        
        console.log('📡 Checkpoint API response:', response.ok, response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📦 Checkpoint response data:', data);
          
          // Dispatch event to notify Sessions panel to refresh
          console.log('🚀 Dispatching checkpointCreated event with:', { 
            checkpoint: data.checkpoint,
            sessionId: data.sessionId 
          });
          
          window.dispatchEvent(new CustomEvent('checkpointCreated', { 
            detail: { 
              checkpoint: data.checkpoint,
              sessionId: data.sessionId 
            } 
          }));
          
          const checkpointName = customName 
            ? `"${customName}" saved! You're crushing it 🚀` 
            : 'Checkpoint saved! Keep up the great work 🎉';
          
          addToast({
            message: `✅ ${checkpointName}`,
            type: 'success'
          });
        } else {
          const errorText = await response.text();
          console.error('❌ Checkpoint API error:', errorText);
          throw new Error('Failed to save checkpoint');
        }
      }
    } catch (error) {
      // logger?.error('Failed to save checkpoint:', error);
      addToast({
        message: '⚠️ Failed to save checkpoint',
        type: 'error'
      });
    }
  };

  const handleTimeline = async () => {
    // 🔧 FIX (Nov 17, 2025): Use window.location.href as fallback
    // After checkpoint restore, Next.js router may not work properly
    // Use native navigation which always works
    console.log('📊 [TIMELINE] Navigating to timeline with sessionId:', sessionId);
    
    try {
      // Try router first (client-side navigation, faster)
      router.push(`/timeline?sessionId=${sessionId}`);
      
      // Fallback to native navigation if router doesn't work after 500ms
      setTimeout(() => {
        if (window.location.pathname === '/ide' || window.location.pathname === '/ide/') {
          console.log('⚠️ [TIMELINE] Router failed, using window.location fallback');
          window.location.href = `/timeline?sessionId=${sessionId}`;
        }
      }, 500);
      
      addToast({
        message: '📊 Opening timeline view',
        type: 'info'
      });
    } catch (error) {
      console.error('❌ [TIMELINE] Navigation error:', error);
      // Direct fallback if router.push throws
      window.location.href = `/timeline?sessionId=${sessionId}`;
    }
  };


  const handleSessionSummary = async () => {
    const currentHistory = getTerminalHistory ? getTerminalHistory() : '';
    console.log('🔍 [SESSION SUMMARY] Button clicked - starting handleSessionSummary', {
      sessionId,
      activeFile,
      openFilesCount: openFiles.length,
      terminalHistoryLength: currentHistory.length
    });
    
    try {
      // PHASE 3: Enhanced session summary with companion service integration
      console.log('🔍 [SESSION SUMMARY] Activating context...');
      await activateContext('Session Summary');
      console.log('🔍 [SESSION SUMMARY] Context activated successfully');
      
      // Check if companion service is available for enhanced summaries
      console.log('🔍 [SESSION SUMMARY] Importing companion client...');
      const { getCompanionClient } = await import('@/lib/companion-client');
      const companionClient = getCompanionClient();
      console.log('🔍 [SESSION SUMMARY] Companion client imported, checking connection...');
      
      if (companionClient.isConnected()) {
        console.log('🔍 [SESSION SUMMARY] Companion service is connected, using enhanced path');
        // Use companion service for AI-powered session analysis via headless Claude
        const sessionData = {
          sessionId,
          activeFile,
          terminalHistory: currentHistory,
          terminalCommands,
          openFiles: openFiles.reduce((acc, file) => {
            acc[file.path] = file.content || '';
            return acc;
          }, {}),
          startTime: localStorage.getItem('sessionStartTime'),
          endTime: new Date().toISOString()
        };
        
        const result = await fetch('http://localhost:57132/session-summary/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectPath: '/Users/michaelkraft/autonomous_vibe_interface', // TODO: Get from project context
            sessionData
          })
        });
        
        if (result.ok) {
          const summaryData = await result.json();
          
          // Store summary data for modal display
          localStorage.setItem('latestSessionSummary', JSON.stringify(summaryData));
          
          addToast({
            message: `🤖 AI Session Summary generated: ${summaryData.template} (${summaryData.context.filesChanged} files, ${summaryData.context.linesAdded}+ lines)`,
            type: 'success'
          });
        } else {
          throw new Error('Failed to generate AI session summary');
        }
      } else {
        console.log('🔍 [SESSION SUMMARY] Companion service NOT connected, using modal path');
      }
      
      // Always open the modal for display
      console.log('🔍 [SESSION SUMMARY] Opening sessionSummary modal...');
      openModal('sessionSummary');
      console.log('🔍 [SESSION SUMMARY] Modal open command sent');
      
    } catch (error) {
      // Fallback to original session summary system
      console.error('🔍 [SESSION SUMMARY] Error in handleSessionSummary:', error);
      console.log('🔍 [SESSION SUMMARY] Falling back to basic session summary');
      
      await activateContext('Session Summary');
      openModal('sessionSummary');
      
      addToast({
        message: '⚠️ Using basic session summary (companion service unavailable)',
        type: 'warning'
      });
    }
  };

  const handleDocs = () => {
    // Dispatch custom event to open the integrated DocumentationPanel
    window.dispatchEvent(new CustomEvent('openDocumentationPanel'));
  };


  const handleConnectBridge = async () => {
    try {
      // Generate pairing code through the bridge manager
      const response = await fetch('/api/bridge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: sessionId // Use session ID as user ID
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Show pairing code to user
        addToast({
          message: `🔑 Pairing code: ${data.code}`,
          type: 'info',
          duration: 60000 // Show for 1 minute
        });
        
        // Also show in modal
        alert(`🌉 Connect Coder1 Bridge\n\nPairing Code: ${data.code}\n\n1. Run: coder1-bridge start\n2. Enter this code when prompted\n3. Bridge will connect automatically\n\nCode expires in 5 minutes.`);
        
      } else {
        throw new Error('Failed to generate pairing code');
      }
    } catch (error) {
      addToast({
        message: '⚠️ Failed to generate pairing code',
        type: 'error'
      });
    }
  };

  // ParaThinker handler - Only for Beta IDE
  const handleParaThinker = async () => {
    try {
      // Check if we have a problem context (from terminal errors or current code)
      const problemContext = localStorage.getItem('lastTerminalError') || 
                            localStorage.getItem('currentProblem') || 
                            'Help me solve the current coding problem';

      // Start parallel reasoning
      const response = await fetch('/api/beta/parallel-reasoning/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: problemContext,
          metadata: {
            triggeredBy: 'manual',
            activeFile,
            terminalHistory: terminalHistory?.slice(-1000) // Last 1000 chars
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store session ID for tracking
        localStorage.setItem('activeParaThinkSession', data.sessionId);
        
        // Open dashboard in preview panel
        window.dispatchEvent(new CustomEvent('openParaThinkerDashboard', {
          detail: { sessionId: data.sessionId }
        }));
        
        addToast({
          message: `🧠 ParaThinker started with ${data.strategies.length} strategies`,
          type: 'success'
        });
      } else {
        throw new Error('Failed to start ParaThinker');
      }
    } catch (error) {
      addToast({
        message: '⚠️ Failed to start ParaThinker',
        type: 'error'
      });
    }
  };

  const isLoadingState = (state: string) => loading === state;
  
  // Check if we're in Beta environment (hydration-safe)
  const [isBetaEnvironment, setIsBetaEnvironment] = React.useState(false);
  
  React.useEffect(() => {
    setIsBetaEnvironment(window.location.pathname.includes('ide-beta'));
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* CheckPoint Button - Enhanced with memory detection */}
        <div 
          data-tour="checkpoint-timeline" 
          className="p-[1px] rounded-md" 
          style={{
            background: memoryDetection?.isMemoryWorthy && memoryDetection.confidence > 0.6
              ? 'linear-gradient(135deg, #FB923C, #F97316)' // Orange gradient for memory-worthy sessions
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)', // Default purple
            boxShadow: memoryDetection?.isMemoryWorthy && memoryDetection.confidence > 0.6
              ? glows.orange.intense
              : glows.purple.intense
          }}
        >
          <button
            onClick={handleCheckpoint}
            disabled={isLoadingState('checkpoint')}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded transition-all duration-200 disabled:opacity-50 bg-bg-secondary w-full"
            onMouseEnter={(e) => applyHoverEffect(e, isLoadingState('checkpoint'))}
            onMouseLeave={removeHoverEffect}
            title={memoryDetection?.isMemoryWorthy 
              ? `CheckPoint - Memory-worthy session detected! Save with memory creation (${Math.round(memoryDetection.confidence * 100)}% confidence)`
              : "CheckPoint - Save a snapshot of your current work state for easy rollback (Ctrl+Shift+S)"
            }
          >
            {isLoadingState('checkpoint') ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>CheckPoint</span>
          </button>
        </div>

        {/* TimeLine Button */}
        <div data-tour="timeline-button" className="p-[1px] rounded-md" style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: glows.purple.intense}}>
          <button
            onClick={handleTimeline}
            disabled={isLoadingState('timeline')}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded transition-all duration-200 disabled:opacity-50 bg-bg-secondary w-full"
            onMouseEnter={(e) => applyHoverEffect(e, isLoadingState('timeline'))}
            onMouseLeave={removeHoverEffect}
            title="TimeLine - View chronological history of your development session and changes"
          >
            {isLoadingState('timeline') ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            <span>TimeLine</span>
          </button>
        </div>


        {/* Session Summary Button */}
        <div data-tour="session-summary" className="p-[1px] rounded-md" style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: glows.purple.intense}}>
          <button
            onClick={handleSessionSummary}
            disabled={isLoadingState('session')}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded transition-all duration-200 disabled:opacity-50 bg-bg-secondary w-full"
            onMouseEnter={(e) => applyHoverEffect(e, isLoadingState('session'))}
            onMouseLeave={removeHoverEffect}
            title="Session Summary - Generate AI-powered summary of your coding session for handoffs and documentation"
          >
            {isLoadingState('session') ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>Session Summary</span>
          </button>
        </div>


        {/* Docs Button */}
        <div className="p-[1px] rounded-md" style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: glows.purple.intense}}>
          <button
            data-tour="docs-button"
            onClick={handleDocs}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded transition-all duration-200 bg-bg-secondary w-full"
            onMouseEnter={(e) => applyHoverEffect(e, false)}
            onMouseLeave={removeHoverEffect}
            title="Docs - Open documentation manager with intelligent search and AI-powered content"
          >
            <BookOpen className="w-4 h-4" />
            <span>Docs</span>
          </button>
        </div>

        {/* Preview Button */}
        <div 
          className="p-[1px] rounded-md"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
            boxShadow: glows.purple?.intense || '0 0 12px rgba(139, 92, 246, 0.5)'
          }}
        >
          <button
            onClick={() => {
              if (currentTeamId) {
                setIsPreviewModalOpen(true);
              }
            }}
            disabled={!currentTeamId}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded transition-all duration-200 w-full bg-[#1a1a1a]"
            style={{
              color: !currentTeamId ? '#a0a0a0' : undefined,
              cursor: !currentTeamId ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!currentTeamId) return;
              e.currentTarget.style.color = '#ffffff';
              applyHoverEffect(e, false);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = !currentTeamId ? '#a0a0a0' : '#a0a0a0';
              removeHoverEffect(e);
            }}
            title={currentTeamId ? "Preview AI Team Output - Browse files and preview code" : "No AI Team output to preview"}
          >
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </button>
        </div>

        {/* Download Button */}
        <div 
          className={`p-[1px] rounded-md ${shouldPulseDownload ? 'animate-pulse' : ''}`}
          style={{
            background: 'linear-gradient(135deg, #10b981, #14b8a6)', 
            boxShadow: shouldPulseDownload 
              ? '0 0 20px rgba(16, 185, 129, 0.8), 0 0 40px rgba(16, 185, 129, 0.4)' 
              : glows.green?.intense || '0 0 12px rgba(16, 185, 129, 0.5)'
          }}
        >
          <button
            onClick={() => {
              setShouldPulseDownload(false);
              setIsDownloadModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded transition-all duration-200 bg-bg-secondary w-full"
            onMouseEnter={(e) => applyHoverEffect(e, false)}
            onMouseLeave={removeHoverEffect}
            title="Download Project - Export project as ZIP or JSON with configurable options"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>

        {/* ParaThinker Button - Beta Only */}
        {isBetaEnvironment && (
          <div className="p-[1px] rounded-md" style={{background: 'linear-gradient(135deg, #9333ea, #ec4899)'}}>
            <button
              onClick={handleParaThinker}
              disabled={isLoadingState('parathink')}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded transition-all duration-200 disabled:opacity-50 bg-bg-secondary w-full relative"
              onMouseEnter={(e) => {
                if (!isLoadingState('parathink')) {
                  e.currentTarget.style.boxShadow = glows.purple.medium;
                  e.currentTarget.parentElement!.style.background = 'linear-gradient(135deg, #a855f7, #f472b6)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.parentElement!.style.background = 'linear-gradient(135deg, #9333ea, #ec4899)';
              }}
              title="ParaThinker - Advanced parallel AI reasoning system for complex problem solving (Beta feature)"
            >
              {isLoadingState('parathink') ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              <span>ParaThinker</span>
              <span className="text-[9px] absolute -top-1 -right-1 bg-purple-600 text-white px-1 rounded">β</span>
            </button>
          </div>
        )}
      </div>

      {/* Session Summary Modal */}
      {isModalOpen('sessionSummary') && (
        <StatusBarModals
          activeFile={activeFile}
          openFiles={openFiles}
          getTerminalHistory={getTerminalHistory}
          terminalCommands={terminalCommands}
        />
      )}

      {/* Checkpoint Name Modal */}
      <CheckpointNameModal
        isOpen={isCheckpointModalOpen}
        onClose={() => setIsCheckpointModalOpen(false)}
        onSave={handleCheckpointSave}
        isLoading={isLoadingState('checkpoint')}
        memoryDetection={memoryDetection}
      />

      {/* Download Project Modal */}
      <DownloadProjectModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />
      
      {/* Preview AI Team Output Modal */}
      {currentTeamId && (
        <PreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          teamId={currentTeamId}
        />
      )}
    </>
  );
});

export default StatusBarActions;