"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from 'next/navigation';
import { loadComponentForEditor } from '@/lib/component-formatter';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import InteractiveTour from "@/components/InteractiveTour";
import SettingsModal from "@/components/SettingsModal";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import { MenuActionsService, FileInfo } from '@/lib/services/menu-actions';
import type { editor } from 'monaco-editor';
import { filterThinkingAnimations } from '@/lib/checkpoint-utils';

// Import core IDE components - using correct default exports
import ThreePanelLayout from "@/components/layout/ThreePanelLayout";
import LeftPanel from "@/components/LeftPanel";
import MonacoEditor from "@/components/editor/MonacoEditor";
import StatusBarCore from "@/components/status-bar/StatusBarCore";
import StatusLine from "@/components/status-bar/StatusLine";
import MenuBar from "@/components/MenuBar";
import HandoffWarningBanner from "@/components/HandoffWarningBanner";
// import DragDropOverlay from "@/components/terminal/DragDropOverlay"; // Disabled - conflicts with StagedComposer
import DocumentationPanel from "@/components/documentation/DocumentationPanel";

// Conductor components removed - using simple multi-Claude tabs instead

// Use LazyTerminalContainer to avoid SSR issues
const LazyTerminalContainer = dynamic(
  () => import("@/components/terminal/TerminalContainer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-bg-primary">
        <span className="text-text-muted">Spinning up your terminal magic... ✨</span>
      </div>
    ),
  },
);

// Dynamic import for PreviewPanel
const PreviewPanel = dynamic(
  () => import("@/components/preview/PreviewPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-bg-secondary">
        <span className="text-text-muted">Brewing up the preview... ☕</span>
      </div>
    ),
  },
);

// Import required providers
import { EnhancedSupervisionProvider } from "@/contexts/EnhancedSupervisionContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { TerminalCommandProvider } from "@/contexts/TerminalCommandContext";

// Import auto-checkpoint hook
import { useAutoCheckpoint } from "@/lib/hooks/useAutoCheckpoint";

function IDEPageContent() {
  // Feature flags
  const FOCUS_MODE_ENABLED = true; // ✅ ENABLED: Focus mode feature is now active
  
  // Tour state
  const [showTour, setShowTour] = useState(false);
  const [showOnboardingOverlay, setShowOnboardingOverlay] = useState(false);
  
  // Show onboarding overlay for first-time users
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 🔧 FIX (Feb 2, 2025): Use better heuristics for "first-time user"
    // Don't rely solely on tour completion - check if they've USED the IDE
    
    // 1. Check if they came from Timeline (has sessionId in URL) - NOT first-time
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('sessionId') || urlParams.has('restored')) {
      console.log('🚫 Skipping onboarding - user came from Timeline');
      return;
    }
    
    // 2. Check if they have any IDE usage history in localStorage - NOT first-time
    const hasUsageHistory = 
      localStorage.getItem('ide-terminalSessionId') ||
      localStorage.getItem('ide-activeFile') ||
      localStorage.getItem('ide-openFiles') ||
      localStorage.getItem('coder1-tour-status') === 'completed' ||
      localStorage.getItem('coder1-tour-status') === 'dismissed';
    
    if (hasUsageHistory) {
      console.log('🚫 Skipping onboarding - user has IDE usage history');
      return;
    }
    
    // 3. Only NOW show overlay if truly first-time (no history at all)
    console.log('👋 First-time user detected - showing onboarding overlay');
    setShowOnboardingOverlay(true);
  }, []);
  
  // 🛟 SESSION RESCUE: Detect unexpected shutdowns on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const lastExitInfo = localStorage.getItem('ide-lastExit');
    if (!lastExitInfo) {
      console.log('🛟 No previous session exit info found');
      return;
    }
    
    try {
      const exitData = JSON.parse(lastExitInfo);
      const timeSinceExit = Date.now() - exitData.timestamp;
      const hoursAgo = (timeSinceExit / (1000 * 60 * 60)).toFixed(1);
      
      // If last exit was NOT clean, or was very recent (< 5 min), might be crash
      if (exitData.type !== 'clean' && timeSinceExit < 5 * 60 * 1000) {
        console.warn(`🛟 Unexpected shutdown detected (${hoursAgo}h ago) - recovery may be available`);
        // Store this for RecoveryModal to detect
        sessionStorage.setItem('recovery-available', 'true');
        sessionStorage.setItem('recovery-timestamp', String(exitData.timestamp));
      } else {
        console.log(`✅ Last exit was clean (${hoursAgo}h ago)`);
      }
    } catch (e) {
      console.warn('Failed to parse last exit info:', e);
    }
  }, []);
  
  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  
  // Editor state
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [fileTreeRefresh, setFileTreeRefresh] = useState(0);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  
  // Panel visibility state
  const [explorerVisible, setExplorerVisible] = useState(true);
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [outputVisible, setOutputVisible] = useState(false);
  
  // Focus mode state
  const [focusMode, setFocusMode] = useState(false);
  
  // Terminal state
  const [agentsActive, setAgentsActive] = useState(false);
  const [runningProcesses, setRunningProcesses] = useState<string[]>([]);

  // Terminal history for checkpoint creation
  const [terminalHistory, setTerminalHistory] = useState<string>("");
  // ⚡ PERFORMANCE FIX (Feb 2, 2025): Use ref for real-time accumulation (no re-renders)
  const terminalHistoryRef = useRef<string>('');
  const [terminalCommands, setTerminalCommands] = useState<string[]>([]);
  const [recentTerminalInput, setRecentTerminalInput] = useState<string>("");
  const [claudeActive, setClaudeActive] = useState<boolean>(false); // 🔧 FIX (Feb 1, 2025): Track when Claude is responding
  
  // Track recentTerminalInput state changes for contextual memory
  useEffect(() => {
    if (recentTerminalInput) {
      console.log('🧠 [MEMORY-STATE] Contextual memory updated with:', recentTerminalInput);
    }
  }, [recentTerminalInput]);

  // Terminal history from checkpoint restore
  const [restoredTerminalHistory, setRestoredTerminalHistory] = useState<string | null>(null);
  
  // Debounce timer for memory API calls (performance optimization)
  const memoryDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 🔧 FIX: Persist and restore session state on navigation
  // Restore state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('🔄 IDE: Restoring session state from localStorage...');
    
    // Restore files
    const savedFiles = localStorage.getItem('ide-openFiles');
    if (savedFiles) {
      try {
        const parsedFiles = JSON.parse(savedFiles);
        setFiles(parsedFiles);
        console.log('✅ Restored', Object.keys(parsedFiles).length, 'open files');
      } catch (e) {
        console.warn('Failed to parse saved files:', e);
      }
    }
    
    // Restore active file
    const savedActiveFile = localStorage.getItem('ide-activeFile');
    if (savedActiveFile && savedActiveFile !== 'null') {
      setActiveFile(savedActiveFile);
      console.log('✅ Restored active file:', savedActiveFile);
    }
    
    // Restore terminal history (if not from checkpoint restore)
    const urlParams = new URLSearchParams(window.location.search);
    const isFromCheckpoint = urlParams.get('restored') === 'true';
    if (!isFromCheckpoint) {
      const savedTerminalHistory = localStorage.getItem('terminalHistory');
      if (savedTerminalHistory) {
        // 🔧 CRITICAL FIX: Filter statuslines when LOADING from localStorage
        // This retroactively cleans up old unfiltered data (Jan 2025)
        const filteredHistory = filterThinkingAnimations(savedTerminalHistory);
        // ⚡ PERFORMANCE FIX: Initialize ref with saved data
        terminalHistoryRef.current = filteredHistory;
        setTerminalHistory(filteredHistory);
        setRestoredTerminalHistory(filteredHistory);
        console.log('✅ Restored terminal history (filtered):', filteredHistory.length, 'characters', 
                    '(original:', savedTerminalHistory.length, ')');
      }
    }
    
    // Restore panel visibility
    const savedExplorerVisible = localStorage.getItem('ide-explorerVisible');
    if (savedExplorerVisible !== null) {
      setExplorerVisible(savedExplorerVisible === 'true');
    }
    
    const savedTerminalVisible = localStorage.getItem('ide-terminalVisible');
    if (savedTerminalVisible !== null) {
      setTerminalVisible(savedTerminalVisible === 'true');
    }
    
    // Terminal session ID is now initialized directly in useState (line 245)
    // No need to restore it here - avoids race condition
  }, []); // Run only once on mount

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ide-openFiles', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ide-activeFile', activeFile || '');
  }, [activeFile]);

  // ⚡ PERFORMANCE FIX (Feb 2, 2025): Save terminal history on page unload instead of every keystroke
  // 🛟 SESSION RESCUE: Track clean exits for crash detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const saveTerminalHistory = () => {
      if (terminalHistoryRef.current) {
        const filteredHistory = filterThinkingAnimations(terminalHistoryRef.current);
        localStorage.setItem('terminalHistory', filteredHistory);
        console.log('💾 Saved terminal history to localStorage on page unload');
      }
      
      // 🛟 Mark clean exit for Session Rescue
      const exitInfo = {
        type: 'clean',
        timestamp: Date.now(),
        sessionId: localStorage.getItem('ide-terminalSessionId'),
      };
      localStorage.setItem('ide-lastExit', JSON.stringify(exitInfo));
      console.log('🛟 Marked clean exit for Session Rescue');
    };
    
    // Save on page unload
    window.addEventListener('beforeunload', saveTerminalHistory);
    
    return () => {
      window.removeEventListener('beforeunload', saveTerminalHistory);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ide-explorerVisible', String(explorerVisible));
  }, [explorerVisible]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ide-terminalVisible', String(terminalVisible));
  }, [terminalVisible]);

  // Handle checkpoint restore from timeline page
  const searchParams = useSearchParams();
  useEffect(() => {
    const restored = searchParams.get('restored');
    const checkpointId = searchParams.get('checkpointId');
    const sessionId = searchParams.get('sessionId');
    
    // 🔧 CRITICAL FIX (Oct 29, 2025): Clear terminal session AND history on hard refresh
    // If there's NO sessionId in URL (hard refresh), clear localStorage to start fresh
    // Timeline → Back to IDE will have sessionId in URL and will restore properly
    // Bug: We were only clearing session ID but not the history itself
    if (!sessionId && typeof window !== 'undefined') {
      console.log('🔄 Hard refresh detected (no sessionId in URL) - clearing terminal session AND history from localStorage');
      localStorage.removeItem('ide-terminalSessionId');
      localStorage.removeItem('mainTerminalHistory');  // CRITICAL: Also clear the history!
    }
    
    if (restored === 'true' && checkpointId) {
      console.log('🔄 Checkpoint restore detected:', { checkpointId, sessionId });
      
      // Load terminal history from localStorage
      if (typeof window !== 'undefined') {
        const terminalHistory = localStorage.getItem('terminalHistory');
        if (terminalHistory) {
          // 🔧 CRITICAL FIX: Filter statuslines when LOADING from localStorage
          // This retroactively cleans up old unfiltered data (Jan 2025)
          const filteredHistory = filterThinkingAnimations(terminalHistory);
          console.log('📜 IDE PAGE: Restored terminal history from localStorage (filtered)');
          console.log('📜 IDE PAGE: Original length:', terminalHistory.length, '→ Filtered length:', filteredHistory.length);
          console.log('📜 IDE PAGE: First 200 chars:', filteredHistory.substring(0, 200));
          
          // ⚡ PERFORMANCE FIX: Initialize ref with restored data
          terminalHistoryRef.current = filteredHistory;
          setRestoredTerminalHistory(filteredHistory);
          
          // 🔧 FIX: Also set terminalHistory state to preserve content for future checkpoints
          // This ensures that if user creates a checkpoint immediately after restore,
          // it will include the restored terminal history instead of being empty
          setTerminalHistory(filteredHistory);
          console.log('📜 IDE PAGE: terminalHistoryRef, restoredTerminalHistory, and terminalHistory state all updated');
          console.log('📜 IDE PAGE: Future checkpoints will include this restored content');
        } else {
          console.warn('⚠️ IDE PAGE: No terminal history found in localStorage');
        }
      }
      
      // Show success notification
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          // Create a temporary toast notification
          const toast = document.createElement('div');
          toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
          toast.innerHTML = `✅ Time travel complete! Welcome back 🚀 (${checkpointId.substring(0, 8)}...)`;
          document.body.appendChild(toast);
          
          // Remove toast after 4 seconds
          setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => document.body.removeChild(toast), 300);
          }, 4000);
        }
      }, 500);
      
      // Clean up URL parameters
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('restored');
        url.searchParams.delete('checkpointId');
        url.searchParams.delete('sessionId');
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [searchParams]);

  // Terminal session tracking for TerminalCommandProvider
  // 🔧 FIX (Oct 24, 2025): Check URL params FIRST for Timeline navigation persistence
  // Initialize directly from URL or localStorage to avoid race condition
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    
    // 🔧 ONE-TIME MIGRATION (Oct 24, 2025): Migrate old 'terminalHistory' key to 'mainTerminalHistory'
    // This fixes the localStorage key mismatch that caused terminal corruption
    // 🛟 RECOVERY FIX (Nov 19, 2025): Don't overwrite checkpoint recovery data during migration!
    const oldHistory = localStorage.getItem('terminalHistory');
    if (oldHistory) {
      const existingMain = localStorage.getItem('mainTerminalHistory');
      const existingMainLength = existingMain?.length || 0;
      
      // Only migrate if mainTerminalHistory doesn't exist OR has less data than terminalHistory
      // This prevents overwriting large checkpoint data (454KB) with small prompts (10 chars)
      if (!existingMain || oldHistory.length > existingMainLength) {
        console.log('🔄 [MIGRATION] Migrating old terminalHistory key to mainTerminalHistory');
        localStorage.setItem('mainTerminalHistory', oldHistory);
        localStorage.removeItem('terminalHistory');
      } else {
        console.log(`🛟 [MIGRATION] Skipping migration - mainTerminalHistory (${existingMainLength} chars) already has more data than terminalHistory (${oldHistory.length} chars)`);
        localStorage.removeItem('terminalHistory'); // Still remove the old key
      }
    }
    
    // 1. Check URL params first (for Timeline → IDE navigation)
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('sessionId');
    
    console.log('🔍 [INIT-URL] window.location.search:', window.location.search);
    console.log('🔍 [INIT-URL] urlSessionId:', urlSessionId);
    
    // 🔧 CRITICAL FIX (Oct 29, 2025): Clear localStorage on hard refresh BEFORE reading it
    // If there's NO sessionId in URL (hard refresh), clear EVERYTHING to start fresh
    // This must happen HERE in useState initializer, NOT in useEffect (which runs too late)
    if (!urlSessionId) {
      console.log('🔄 Hard refresh detected (no sessionId in URL) - clearing ALL terminal data from localStorage');
      localStorage.removeItem('ide-terminalSessionId');
      localStorage.removeItem('mainTerminalHistory');
      console.log('🔍 [INIT-FINAL] Hard refresh - returning null for fresh session');
      return null;
    }
    
    if (urlSessionId && urlSessionId !== 'null') {
      console.log('🔄 [INIT] Restored terminal session ID from URL:', urlSessionId);
      // Store in localStorage so it persists after URL cleanup
      localStorage.setItem('ide-terminalSessionId', urlSessionId);
      console.log('🔍 [INIT-FINAL] Returning sessionId from URL:', urlSessionId);
      return urlSessionId;
    }
    
    console.log('🔍 [INIT-FINAL] No sessionId found, returning null');
    return null;
  });
  const [terminalReady, setTerminalReady] = useState<boolean>(false);

  // Save terminal session ID whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (terminalSessionId) {
      localStorage.setItem('ide-terminalSessionId', terminalSessionId);
      console.log('💾 Saved terminal session ID:', terminalSessionId);
    }
  }, [terminalSessionId]);
  
  // 🔧 FIX (Oct 24, 2025): Update terminalSessionId when URL params change
  // This handles Timeline → IDE navigation where URL has ?sessionId=xyz
  // useState initializer only runs once, so we need useEffect for navigation updates
  // 🐛 CRITICAL FIX: Removed terminalSessionId from deps to prevent circular dependency
  useEffect(() => {
    const urlSessionId = searchParams.get('sessionId');
    console.log('🔄 [URL-EFFECT] searchParams.sessionId:', urlSessionId);
    console.log('🔄 [URL-EFFECT] current terminalSessionId:', terminalSessionId);
    
    if (urlSessionId && urlSessionId !== 'null') {
      console.log('🔄 [URL-UPDATE] Setting sessionId from URL:', urlSessionId);
      setTerminalSessionId(urlSessionId);
      // Also update localStorage so it persists
      localStorage.setItem('ide-terminalSessionId', urlSessionId);
    }
  }, [searchParams]); // ✅ FIX: Removed terminalSessionId from deps

  // ⏰ AUTO-CHECKPOINT: Create automatic checkpoints every 10 minutes
  useAutoCheckpoint({
    enabled: true,
    sessionId: terminalSessionId || undefined, // Pass terminal session ID explicitly
    onSuccess: (checkpointId) => {
      console.log(`✅ Auto-checkpoint created: ${checkpointId}`);
    },
    onError: (error) => {
      console.error('❌ Auto-checkpoint failed:', error);
    }
  });

  // File drop handling
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  
  // Composer visibility state  
  const [composerVisible, setComposerVisible] = useState(false);
  const terminalRef = useRef<any>(null);

  // Initialize menu actions service
  const menuActionsRef = useRef<MenuActionsService | null>(null);
  
  useEffect(() => {
    menuActionsRef.current = new MenuActionsService({
      onNewFile: () => {
        console.log('New file created');
      },
      onOpenFile: (file: FileInfo) => {
        setFiles(prev => ({ ...prev, [file.path]: file.content }));
        setActiveFile(file.path);
      },
      onSaveFile: (file: FileInfo) => {
        console.log('File saved:', file.path);
      },
      onFileChange: (file: FileInfo) => {
        if (file.path === '') {
          setActiveFile(null);
        } else {
          setFiles(prev => ({ ...prev, [file.path]: file.content }));
        }
      },
      getEditorInstance: () => editorRef.current
    });
  }, []);

  const handleFileDrop = async (files: File[]) => {
    console.log(`📎 Handling ${files.length} file(s) via drag-and-drop`);
    
    // If composer is visible, don't auto-process - let composer handle it
    if (composerVisible) {
      console.log('🎯 Composer visible - skipping auto-processing');
      return;
    }
    
    setIsProcessingFiles(true);
    
    try {
      // Bridge files to temporary location for Claude CLI access
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Send files to API for bridging
      const response = await fetch('/api/claude/bridge-files', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (parseError) {
          // If we can't parse as JSON, use the response text
          try {
            const textError = await response.text();
            console.error('Non-JSON error response:', textError.substring(0, 200));
          } catch (textError) {
            console.error('Failed to read error response');
          }
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      const { bridgedFiles, claudeMessage, displayMessage } = result;
      
      console.log(`✅ Processed ${bridgedFiles.length} files for Claude Code`);
      
      // Use Claude message for clipboard (includes base64 for proper AI processing)
      const claudeCopyText = claudeMessage || generateFallbackMessage(bridgedFiles);
      
      // Use display message for terminal (user-friendly, hides base64)
      const terminalDisplayContent = displayMessage || `Files processed: ${bridgedFiles.map((f: any) => f.originalName).join(', ')}`;
      
      // Auto-copy to clipboard immediately (no button needed!)
      let terminalDisplay: string;
      let autoCopySuccess = false;
      
      try {
        await navigator.clipboard.writeText(claudeCopyText);
        // Show minimal success message with file info
        terminalDisplay = `\r\n${terminalDisplayContent}\r\n✅ Content copied to clipboard → Paste in Claude Code\r\n`;
        autoCopySuccess = true;
        console.log(`📋 Auto-copied ${bridgedFiles.length} files to clipboard for Claude Code`);
      } catch (clipboardError) {
        console.warn('⚠️ Auto-copy failed, will show copy button as fallback:', clipboardError);
        // Show file info and that it's ready (button will appear)
        terminalDisplay = `\r\n${terminalDisplayContent}\r\n✅ Ready for Claude - Click copy button below\r\n`;
        autoCopySuccess = false;
      }
      
      // Helper function for fallback message generation
      function generateFallbackMessage(files: any[]): string {
        let message = '# Files Shared via Coder1 IDE\n\n';
        files.forEach((file: any, index: number) => {
          message += `## File ${index + 1}: ${file.originalName}\n\n`;
          if (file.content) {
            if (file.type?.startsWith('image/')) {
              message += `[This is an image file - ${file.type}. Please upload it directly to Claude]\n\n`;
            } else {
              const ext = file.originalName.split('.').pop() || 'txt';
              message += `\`\`\`${ext}\n${file.content}\n\`\`\`\n\n`;
            }
          }
        });
        return message;
      }
      
      // Store for clipboard access
      if (typeof window !== 'undefined') {
        (window as any).lastUploadedFiles = claudeCopyText;
        (window as any).lastUploadedFilesData = bridgedFiles;
        
        // Add copy button functionality
        (window as any).copyFilesForClaude = async () => {
          try {
            await navigator.clipboard.writeText(claudeCopyText);
            const successMsg = '\r\n✅ FILES COPIED TO CLIPBOARD!\r\n';
            const instructMsg = '   Now paste into your Claude Code conversation.\r\n\r\n';
            const globalSocket = (window as any).terminalSocket;
            const globalSessionId = (window as any).terminalSessionId;
            if (globalSocket && globalSessionId) {
              globalSocket.emit('terminal:input', {
                sessionId: globalSessionId,
                data: successMsg + instructMsg
              });
            }
            return true;
          } catch (err) {
            console.error('Failed to copy:', err);
            const errorMsg = '\r\n❌ Clipboard got shy! Mind trying again? 🤔\r\n';
            const manualMsg = '   Try pressing Ctrl+Shift+C or typing: copy-files\r\n\r\n';
            const globalSocket = (window as any).terminalSocket;
            const globalSessionId = (window as any).terminalSessionId;
            if (globalSocket && globalSessionId) {
              globalSocket.emit('terminal:input', {
                sessionId: globalSessionId,
                data: errorMsg + manualMsg
              });
            }
            return false;
          }
        };
      }
      
      // No additional UI text - keeping it minimal
      
      // Send to terminal - use globally exposed socket and session from Terminal component
      const globalSocket = (window as any).terminalSocket;
      const globalSessionId = (window as any).terminalSessionId;
      
      if (globalSocket && globalSessionId) {
        console.log('📤 Sending file info to terminal:', globalSessionId);
        globalSocket.emit('terminal:input', {
          sessionId: globalSessionId,
          data: terminalDisplay
        });
        
        // Pass the copy content to Terminal component via window object
        (window as any).claudeFilesToCopy = claudeCopyText;
        (window as any).claudeFilesReady = true;
        
        // Only trigger copy button event if auto-copy failed
        if (!autoCopySuccess) {
          window.dispatchEvent(new CustomEvent('claudeFilesReady', { 
            detail: { content: claudeCopyText, fileCount: bridgedFiles.length }
          }));
        }
      } else {
        console.warn('⚠️ Terminal socket or session not available:', {
          socket: !!globalSocket,
          session: globalSessionId
        });
      }
      
    } catch (error) {
      console.error('❌ Error processing files:', error);
      
      // Show error in terminal
      const errorMessage = `\n❌ Oops! ${error instanceof Error ? error.message : 'Something went sideways with those files'}\n`;
      const globalSocket = (window as any).terminalSocket;
      const globalSessionId = (window as any).terminalSessionId;
      if (globalSocket && globalSessionId) {
        globalSocket.emit('terminal:input', {
          sessionId: globalSessionId,
          data: errorMessage
        });
      }
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleTextInsert = (text: string) => {
    console.log('📝 Inserting text into terminal:', text);
    
    // Send text to terminal if connected
    const globalSocket = (window as any).terminalSocket;
    const globalSessionId = (window as any).terminalSessionId;
    if (globalSocket && globalSessionId) {
      globalSocket.emit('terminal:input', {
        sessionId: globalSessionId,
        data: `\n${text}\n`
      });
    }
  };
  
  // Terminal socket and session ID are now exposed globally by Terminal component
  // No need to search for socket - Terminal component handles this reliably
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔌 Terminal integration ready - socket and session available via Terminal component');
    }
  }, []);
  
  // Add keyboard shortcut for copying files
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+C or Cmd+Shift+C for copying files
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        const copyFunction = (window as any).copyFilesForClaude;
        if (copyFunction && typeof copyFunction === 'function') {
          copyFunction().then((success: boolean) => {
            if (success) {
              console.log('✅ Files copied to clipboard via keyboard shortcut');
            } else {
              console.log('❌ Failed to copy files via keyboard shortcut');
            }
          });
        } else {
          // Show message in terminal if no files uploaded
          const globalSocket = (window as any).terminalSocket;
          const globalSessionId = (window as any).terminalSessionId;
          if (globalSocket && globalSessionId) {
            const msg = '\r\n⚠️ No files to copy. Drag and drop files first.\r\n\r\n';
            globalSocket.emit('terminal:input', {
              sessionId: globalSessionId,
              data: msg
            });
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [terminalSessionId]);

  // Terminal callbacks
  const handleAgentsSpawn = () => {
    console.log("🤖 Agents spawning...");
    setAgentsActive(true);
  };

  const handleTerminalClick = () => {
    console.log("🖱️ Terminal clicked");
  };

  const handleClaudeTyped = () => {
    console.log("✨ Claude typed");
  };

  const handleTerminalData = (data: string) => {
    // ⚡ PERFORMANCE FIX (Feb 2, 2025): Use ref instead of state to prevent re-renders
    // Browser diagnostic revealed setState on every keystroke caused:
    //   1. Page component re-render (30-100ms cascade)
    //   2. EnhancedSessionCreationModal re-render (even when closed)
    //   3. Progressive lag as string grows
    //
    // Solution: Accumulate in ref (no re-renders), read via callback when needed
    terminalHistoryRef.current += data;
  };

  const handleTerminalCommand = (command: string) => {
    console.log("⌨️ Terminal command:", command);
    
    // Track commands for checkpoint creation (immediate - no debouncing needed)
    setTerminalCommands((prev) => [...prev.slice(-49), command]); // Keep last 50 commands
    
    // 🚀 PERFORMANCE FIX: Debounce memory API calls (3-second delay)
    // Clear existing timer on new commands
    if (memoryDebounceRef.current) {
      clearTimeout(memoryDebounceRef.current);
      console.log('⏱️ [MEMORY] Clearing previous debounce timer');
    }
    
    // Extract user input for contextual memory (commands starting with user input)
    if (command.trim().length > 0 && !command.startsWith('$') && !command.startsWith('#')) {
      console.log('⏱️ [MEMORY] Scheduling contextual memory update (3s delay)');
      
      // Set new timer - only update after 3 seconds of inactivity
      memoryDebounceRef.current = setTimeout(() => {
        console.log('🎯 [MEMORY] Debounce complete - setting contextual memory input:', command);
        setRecentTerminalInput(command);
        memoryDebounceRef.current = null;
      }, 3000); // 3 second delay
    } else {
      console.log('🚫 [MEMORY] Command filtered out (starts with $ or #)');
    }
  };

  const handleTerminalReady = (sessionId: any, ready: any) => {
    console.log("✅ Terminal ready:", { sessionId, ready });
    setTerminalSessionId(sessionId);
    setTerminalReady(ready);
  };

  // File operations
  const handleFileSelect = (path: string) => {
    handleOpenFileFromPath(path);
  };

  const handleOpenFileFromPath = useCallback(async (path: string, line?: number) => {
    try {
      setFileErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[path];
        return newErrors;
      });
      
      if (files[path]) {
        setActiveFile(path);
        return;
      }

      setLoadingFiles(prev => new Set(prev).add(path));

      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      const encodedPath = encodeURIComponent(cleanPath);
      const apiUrl = `/api/files/read/?path=${encodedPath}`;
      
      const response = await fetch(apiUrl);

      if (!response.ok) {
        let errorMessage = `Hmm, trouble reading that file (error ${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // Use default error message if response isn't JSON
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      setFiles(prev => ({ ...prev, [path]: data.content || '' }));
      setActiveFile(path);

      // TODO: Handle line positioning in Monaco editor
      if (line) {
        // Future enhancement: editor.revealLineInCenter(line);
        // Future enhancement: editor.setPosition({lineNumber: line, column: 1});
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('📁 Failed to open file:', error);
      
      // Set error state for this file
      setFileErrors(prev => ({ ...prev, [path]: errorMessage }));
      
      // Still set as active file to show error state in editor
      setActiveFile(path);
      
      // Show error in terminal if available
      const globalSocket = (window as any).terminalSocket;
      const globalSessionId = (window as any).terminalSessionId;
      if (globalSocket && globalSessionId) {
        globalSocket.emit('terminal:input', {
          sessionId: globalSessionId,
          data: `\n❌ That file got shy! ${path}: ${errorMessage}\n`
        });
      }
    } finally {
      // Clear loading state
      setLoadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(path);
        return newSet;
      });
    }
  }, [files]);

  const handleFileChange = (path: string, content: string) => {
    setFiles((prev) => ({ ...prev, [path]: content }));
  };

  // Menu action handlers
  const handleNewFile = useCallback(() => {
    // Generate unique filename with extension
    const timestamp = Date.now();
    const newFileName = `Untitled-${timestamp}.txt`;
    
    // Add starter content so editor isn't empty
    const starterContent = `// New File: ${newFileName}\n// Created: ${new Date().toLocaleString()}\n\n`;
    
    // Add file to state with starter content
    setFiles(prev => ({ ...prev, [newFileName]: starterContent }));
    
    // Set as active file
    setActiveFile(newFileName);
    
    // Visual feedback - alert user
    alert(`✅ New file created: ${newFileName}\n\nThe editor is ready. Start typing!`);
    
    // Focus editor so user can immediately type
    setTimeout(() => {
      editorRef.current?.focus();
    }, 100);
    
    console.log('✅ New file created:', newFileName);
  }, []);

  const handleOpenFile = useCallback(() => {
    menuActionsRef.current?.openFile();
  }, []);

  const handleSaveFile = useCallback(() => {
    menuActionsRef.current?.saveFile();
  }, []);

  const handleSaveAs = useCallback(() => {
    menuActionsRef.current?.saveFileAs();
  }, []);

  const handleCloseFile = useCallback(() => {
    menuActionsRef.current?.closeFile();
  }, []);

  const handleUndo = useCallback(() => {
    menuActionsRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    menuActionsRef.current?.redo();
  }, []);

  const handleCut = useCallback(() => {
    menuActionsRef.current?.cut();
  }, []);

  const handleCopy = useCallback(() => {
    menuActionsRef.current?.copy();
  }, []);

  const handlePaste = useCallback(() => {
    menuActionsRef.current?.paste();
  }, []);

  const handleFind = useCallback(() => {
    menuActionsRef.current?.find();
  }, []);

  const handleReplace = useCallback(() => {
    menuActionsRef.current?.replace();
  }, []);

  const handleToggleExplorer = useCallback(() => {
    setExplorerVisible(prev => !prev);
  }, []);

  const handleToggleTerminal = useCallback(() => {
    setTerminalVisible(prev => !prev);
  }, []);

  const handleToggleOutput = useCallback(() => {
    setOutputVisible(prev => !prev);
  }, []);

  const handleToggleFocusMode = useCallback(() => {
    if (!FOCUS_MODE_ENABLED) {
      console.log('🚫 Focus mode is disabled by feature flag');
      return;
    }
    setFocusMode(prev => {
      const newState = !prev;
      console.log(`🎯 Focus mode ${newState ? 'ENABLED' : 'DISABLED'}`);
      console.log(`   Left panel will be: ${explorerVisible && !newState ? 'visible' : 'hidden'}`);
      console.log(`   Right panel will be: ${!newState ? 'visible' : 'hidden'}`);
      return newState;
    });
  }, [FOCUS_MODE_ENABLED, explorerVisible]);

  const handleZoomIn = useCallback(() => {
    setFontSize(prev => Math.min(prev + 2, 30));
    menuActionsRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    setFontSize(prev => Math.max(prev - 2, 10));
    menuActionsRef.current?.zoomOut();
  }, []);

  const handleResetZoom = useCallback(() => {
    setFontSize(14);
    menuActionsRef.current?.resetZoom();
  }, []);

  const handleRunCode = useCallback(() => {
    if (!activeFile || !terminalSessionId) {
      console.log('Cannot run: no active file or terminal session');
      return;
    }
    
    const ext = activeFile.split('.').pop()?.toLowerCase();
    let command = '';
    
    switch (ext) {
      case 'js':
      case 'jsx':
        command = `node ${activeFile}`;
        break;
      case 'ts':
      case 'tsx':
        command = `npx ts-node ${activeFile}`;
        break;
      case 'py':
        command = `python ${activeFile}`;
        break;
      case 'sh':
        command = `bash ${activeFile}`;
        break;
      case 'html':
        command = `open ${activeFile}`;
        break;
      default:
        command = `echo "Don't know how to run .${ext} files"`;
    }

    // Send command to terminal
    const globalSocket = (window as any).terminalSocket;
    const globalSessionId = (window as any).terminalSessionId;
    if (globalSocket && globalSessionId) {
      globalSocket.emit('terminal:input', {
        sessionId: globalSessionId,
        data: command + '\n'
      });
      setRunningProcesses(prev => [...prev, activeFile]);
    }
  }, [activeFile, terminalSessionId]);

  const handleDebug = useCallback(() => {
    console.log('Debug mode not yet implemented');
    // TODO: Implement debug mode with breakpoints
  }, []);

  const handleStop = useCallback(() => {
    // Send Ctrl+C to terminal to stop running process
    const globalSocket = (window as any).terminalSocket;
    const globalSessionId = (window as any).terminalSessionId;
    if (globalSocket && globalSessionId) {
      globalSocket.emit('terminal:input', {
        sessionId: globalSessionId,
        data: '\x03' // Ctrl+C
      });
      setRunningProcesses([]);
    }
  }, [terminalSessionId]);

  const handleShowAbout = useCallback(() => {
    alert('Coder1 IDE v2.0.0\n\nBuilt for Claude Code and vibe coders\n\nThe first IDE designed specifically for AI pair programming.');
  }, []);

  const handleShowKeyboardShortcuts = useCallback(() => {
    setShowKeyboardShortcuts(true);
  }, []);

  const handleExit = useCallback(() => {
    if (confirm('Are you sure you want to exit? Any unsaved changes will be lost.')) {
      window.close();
    }
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Debug logging for focus mode
      if (ctrlKey && e.shiftKey) {
        console.log(`⌨️ Keyboard: Ctrl+Shift+${e.key} pressed`);
      }
      
      // File shortcuts
      if (ctrlKey && e.key === 'n') {
        e.preventDefault();
        handleNewFile();
      } else if (ctrlKey && e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if (ctrlKey && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSaveAs();
        } else {
          handleSaveFile();
        }
      } else if (ctrlKey && e.key === 'w') {
        e.preventDefault();
        handleCloseFile();
      }
      
      // Edit shortcuts
      else if (ctrlKey && e.key === 'f') {
        e.preventDefault();
        handleFind();
      } else if (ctrlKey && e.key === 'h') {
        e.preventDefault();
        handleReplace();
      }
      
      // View shortcuts
      else if (ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        handleToggleExplorer();
      } else if (ctrlKey && e.key === '`') {
        e.preventDefault();
        handleToggleTerminal();
      } else if (ctrlKey && e.shiftKey && e.key === 'U') {
        e.preventDefault();
        handleToggleOutput();
      } else if (ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        console.log('🎯 Focus mode keyboard shortcut triggered!');
        e.preventDefault();
        e.stopPropagation();
        handleToggleFocusMode();
      } else if (ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        console.log('🎯 Focus mode alternate shortcut (Ctrl+Shift+D) triggered!');
        e.preventDefault();
        e.stopPropagation();
        handleToggleFocusMode();
      } else if (ctrlKey && e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (ctrlKey && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (ctrlKey && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
      
      // Run shortcuts
      else if (e.key === 'F5') {
        e.preventDefault();
        handleRunCode();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleDebug();
      } else if (e.shiftKey && e.key === 'F5') {
        e.preventDefault();
        handleStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleNewFile, handleOpenFile, handleSaveFile, handleSaveAs, handleCloseFile,
    handleFind, handleReplace, handleToggleExplorer, handleToggleTerminal,
    handleToggleOutput, handleToggleFocusMode, handleZoomIn, handleZoomOut, handleResetZoom,
    handleRunCode, handleDebug, handleStop
  ]);

  // Load component from query params if present
  useEffect(() => {
    const componentId = searchParams.get('loadComponent');
    
    if (componentId) {
      // Load the component and set it in the editor
      loadComponentForEditor(componentId).then((content) => {
        if (content) {
          // Create a virtual file for the component
          const fileName = `component-${componentId}.html`;
          setFiles((prev) => ({ ...prev, [fileName]: content }));
          setActiveFile(fileName);
        }
      }).catch((error) => {
        console.error(`Error loading component ${componentId}:`, error);
      });
    }
  }, [searchParams]); // Only run when search params change

  // Handle PRD handoff from Smart PRD Generator
  useEffect(() => {
    const prdHandoffId = searchParams.get('prdHandoff');
    
    if (prdHandoffId) {
      console.log('🤝 PRD Handoff detected:', prdHandoffId);
      
      // Fetch handoff data and set up session
      (async () => {
        try {
          const response = await fetch(`/api/coder1-handoff/${prdHandoffId}`);
          const data = await response.json();
          
          if (data.success) {
            const { handoff } = data;
            console.log('✅ Handoff loaded:', handoff.productName);
            
            // Import PRD prompt injector
            const { formatPRDPrompt, createPRDSessionMetadata } = await import('@/lib/prd-prompt-injector');
            
            // Format the PRD into an optimal Claude prompt
            const formattedPrompt = formatPRDPrompt({
              prdContent: handoff.prdContent,
              productName: handoff.productName,
              patterns: handoff.patterns,
              sessionId: handoff.sessionId
            });
            
            // Create session metadata
            const sessionMetadata = createPRDSessionMetadata({
              prdContent: handoff.prdContent,
              productName: handoff.productName,
              patterns: handoff.patterns,
              sessionId: handoff.sessionId
            });
            
            // Store the formatted prompt for terminal injection
            (window as any).prdPromptToInject = formattedPrompt;
            
            // Show success notification
            window.dispatchEvent(new CustomEvent('showToast', {
              detail: {
                message: `✅ PRD loaded: "${handoff.productName}"`,
                type: 'success'
              }
            }));
            
            console.log('📋 PRD ready for implementation:', {
              productName: handoff.productName,
              promptLength: formattedPrompt.prompt.length,
              steps: formattedPrompt.recommendedFirstSteps
            });
            
          } else {
            console.error('❌ Failed to load handoff:', data.error);
            window.dispatchEvent(new CustomEvent('showToast', {
              detail: {
                message: '❌ Failed to load PRD handoff',
                type: 'error'
              }
            }));
          }
        } catch (error) {
          console.error('❌ Handoff error:', error);
          window.dispatchEvent(new CustomEvent('showToast', {
            detail: {
              message: '❌ Error loading PRD',
              type: 'error'
            }
          }));
        }
      })();
    }
  }, [searchParams]);

  // Handle pending sandbox from Timeline checkpoint restoration
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const pendingSandbox = sessionStorage.getItem('pendingSandbox');
    if (pendingSandbox) {
      try {
        const sandboxData = JSON.parse(pendingSandbox);
        console.log('🏖️ IDE: Found pending sandbox from Timeline:', sandboxData.name);
        
        // Wait for terminal to be ready before dispatching
        const dispatchSandbox = () => {
          window.dispatchEvent(new CustomEvent('terminal:createSandbox', {
            detail: sandboxData
          }));
          console.log('✅ IDE: Sandbox creation event dispatched');
        };
        
        // Check if terminal is already ready
        if ((window as any).terminalSessionId) {
          dispatchSandbox();
        } else {
          // Wait for terminal ready event
          const handleTerminalReady = () => {
            dispatchSandbox();
            window.removeEventListener('terminalReady', handleTerminalReady);
          };
          window.addEventListener('terminalReady', handleTerminalReady);
          
          // Fallback timeout
          setTimeout(() => {
            if (!document.querySelector('[data-sandbox-tab]')) {
              dispatchSandbox();
            }
          }, 2000);
        }
        
        // Clear the pending sandbox
        sessionStorage.removeItem('pendingSandbox');
      } catch (error) {
        console.error('❌ IDE: Failed to restore pending sandbox:', error);
        sessionStorage.removeItem('pendingSandbox');
      }
    }
  }, []);

  return (
    <SessionProvider>
      <EnhancedSupervisionProvider>
        <TerminalCommandProvider
          sessionId={terminalSessionId}
          terminalReady={terminalReady}
        >
          {/* Global Drag Drop Overlay - DISABLED to prevent conflict with StagedComposer
          <DragDropOverlay
            onFileDrop={handleFileDrop}
            onTextInsert={handleTextInsert}
            isProcessing={isProcessingFiles}
            isComposerVisible={composerVisible}
          /> */}
          
          <div className="h-screen w-full flex flex-col bg-bg-primary">
            {/* Menu Bar */}
            <MenuBar
              onNewFile={handleNewFile}
              onOpenFile={handleOpenFile}
              onSave={handleSaveFile}
              onSaveAs={handleSaveAs}
              onCloseFile={handleCloseFile}
              onExit={handleExit}
              onCopy={handleCopy}
              onCut={handleCut}
              onPaste={handlePaste}
              onFind={handleFind}
              onReplace={handleReplace}
              onToggleExplorer={handleToggleExplorer}
              onToggleTerminal={handleToggleTerminal}
              onToggleOutput={handleToggleOutput}
              onToggleFocusMode={handleToggleFocusMode}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
              onRunCode={handleRunCode}
              onDebug={handleDebug}
              onStop={handleStop}
              onShowAbout={handleShowAbout}
              onShowKeyboardShortcuts={handleShowKeyboardShortcuts}
              onShowSettings={() => setShowSettingsModal(true)}
              onFilesUploaded={(paths) => {
                setFileTreeRefresh(prev => prev + 1);
                if (paths.length > 0) {
                  handleFileSelect(paths[0]);
                }
              }}
            />
            
            {/* Handoff Warning Banner - Auto-shows at 100k tokens */}
            <HandoffWarningBanner
              onCreateHandoff={() => {
                // Emit event to open SessionsPanel in handoff mode
                window.dispatchEvent(new CustomEvent('openHandoffMode'));
              }}
            />

            {/* Blue Banner - Agentic Development Environment */}
            <div 
              className="w-full h-12 flex items-center justify-center bg-bg-secondary border-b border-bg-tertiary"
              style={{ 
                color: 'var(--primary-cyan)',
                background: 'linear-gradient(90deg, var(--bg-secondary) 0%, rgba(0, 217, 255, 0.05) 50%, var(--bg-secondary) 100%)'
              }}
            >
              <p 
                className="text-sm font-semibold tracking-wide"
                style={{
                  textShadow: '0 0 10px rgba(0, 217, 255, 0.5), 0 0 20px rgba(0, 217, 255, 0.3), 0 0 30px rgba(0, 217, 255, 0.2)'
                }}
              >
                The World's First Fully Agentic Development Environment
              </p>
            </div>

            {/* Active File Display Bar */}
            {activeFile && (
              <div className="w-full h-8 flex items-center px-4 bg-bg-tertiary border-b border-border-default">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-coder1-cyan animate-pulse"></span>
                  <span className="text-text-muted">Currently editing:</span>
                  <span className="text-text-primary font-medium">{activeFile}</span>
                </div>
              </div>
            )}

            {/* Main IDE Layout */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 flex flex-col min-h-0">
                <ThreePanelLayout
                  leftPanel={
                    explorerVisible && !focusMode ? (
                      <LeftPanel
                        onFileSelect={handleFileSelect}
                        activeFile={activeFile}
                        refreshTrigger={fileTreeRefresh}
                      />
                    ) : null
                  }
                  centerPanel={
                    <PanelGroup direction="vertical" className="h-full">
                      {/* Editor Panel */}
                      <Panel
                        defaultSize={terminalVisible ? 65 : 100}
                        minSize={5}
                      >
                        <div className="h-full overflow-hidden" data-tour="monaco-editor">
                          <MonacoEditor
                            value={activeFile ? files[activeFile] : undefined}
                            onChange={(value) => {
                              if (activeFile && value !== undefined && !loadingFiles.has(activeFile) && !fileErrors[activeFile]) {
                                handleFileChange(activeFile, value);
                              }
                            }}
                            onMount={(editor) => {
                              editorRef.current = editor;
                            }}
                            file={activeFile}
                            language="typescript"
                            theme="tokyo-night"
                            fontSize={fontSize}
                            onTourStart={() => setShowTour(true)}
                          />
                        </div>
                      </Panel>

                      {/* Resize Handle between Editor and Terminal */}
                      {terminalVisible && (
                        <>
                          <PanelResizeHandle
                            className="group h-1 bg-bg-secondary hover:bg-orange-400/20 transition-all duration-200 cursor-row-resize relative"
                            style={{
                              boxShadow: "0 0 0 0 rgba(251, 146, 60, 0)",
                              transition: "all 0.3s ease",
                            }}
                            onMouseEnter={(e) => {
                              (
                                e.currentTarget as unknown as HTMLElement
                              ).style.boxShadow =
                                "0 0 20px rgba(251, 146, 60, 0.8), inset 0 0 10px rgba(251, 146, 60, 0.4)";
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as unknown as HTMLElement
                              ).style.boxShadow = "0 0 0 0 rgba(251, 146, 60, 0)";
                            }}
                          >
                            <div className="h-full w-full flex items-center justify-center">
                              <div
                                className="h-0.5 w-8 bg-orange-400/50 group-hover:bg-orange-400 rounded-full transition-all duration-200"
                                style={{
                                  boxShadow: "0 0 10px rgba(251, 146, 60, 0.6)",
                                }}
                              />
                            </div>
                          </PanelResizeHandle>

                          {/* Terminal Panel */}
                          <Panel defaultSize={35} minSize={15} maxSize={95}>
                            <div className="h-full bg-bg-primary" data-tour="terminal">
                              <LazyTerminalContainer
                                onAgentsSpawn={handleAgentsSpawn}
                                onTerminalClick={handleTerminalClick}
                                onClaudeTyped={handleClaudeTyped}
                                onTerminalData={handleTerminalData}
                                onTerminalCommand={handleTerminalCommand}
                                onTerminalReady={handleTerminalReady}
                                onComposerVisibilityChange={setComposerVisible}
                                onClaudeActiveChange={setClaudeActive}
                                restoredTerminalHistory={restoredTerminalHistory}
                                restoredSessionId={terminalSessionId}
                              />
                            </div>
                          </Panel>
                        </>
                      )}
                    </PanelGroup>
                  }
                  rightPanel={
                    !focusMode ? (
                      <PreviewPanel 
                        activeFile={activeFile}
                        editorContent={activeFile ? files[activeFile] || "" : ""}
                        fileOpen={!!activeFile}
                        isPreviewable={
                          // SAFETY: Mark files as previewable based on extension
                          activeFile ? 
                          /\.(html|htm|tsx|jsx|css|js|ts)$/i.test(activeFile) : 
                          false
                        }
                        onOpenFile={handleOpenFileFromPath}
                        recentTerminalInput={recentTerminalInput}
                        terminalCommands={terminalCommands}
                        claudeActive={claudeActive}
                      />
                    ) : null
                  }
                />
              </div>

              {/* 🔧 FIX (Oct 24, 2025): Moved StatusBars INSIDE flex-1 container */}
              {/* This allows terminal selection to extend to actual bottom of viewport */}
              {/* Status Bar */}
              <StatusBarCore
                activeFile={activeFile}
                isConnected={true} // Connected to terminal
                openFiles={Object.keys(files).map((path) => ({
                  path,
                  name: path.split("/").pop() || path,
                  content: files[path],
                  isDirty: false, // TODO: Track dirty state properly
                }))}
                getTerminalHistory={() => terminalHistoryRef.current}
                terminalCommands={terminalCommands}
                terminalSessionId={terminalSessionId}
              />
              
              {/* Status Line - Simple Time Display Only */}
              <StatusLine />
            </div>
            
            {/* Onboarding Overlay - Forces user to click Start Interactive Tour */}
            {showOnboardingOverlay && (
              <div 
                className="fixed inset-0 z-[100] flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(1px)'
                }}
              >
                {/* Spotlight effect around button area */}
                <div className="relative">
                  {/* Glow effect */}
                  <div 
                    className="absolute inset-0 rounded-lg"
                    style={{
                      boxShadow: '0 0 40px 20px rgba(0, 217, 255, 0.3), 0 0 80px 40px rgba(0, 217, 255, 0.15)',
                      filter: 'blur(15px)'
                    }}
                  />
                  
                  {/* The actual button with highlight */}
                  <button
                    onClick={() => {
                      setShowOnboardingOverlay(false);
                      setShowTour(true);
                    }}
                    className="relative px-8 py-4 bg-coder1-cyan text-black font-bold text-lg rounded-lg transition-all duration-300 hover:scale-105"
                    style={{
                      boxShadow: '0 0 20px rgba(0, 217, 255, 0.6), 0 0 40px rgba(0, 217, 255, 0.3)',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    🚀 Start Interactive Tour
                  </button>
                  
                  {/* Helpful text below button */}
                  <p className="text-center mt-6 text-coder1-cyan text-sm font-medium">
                    Click to begin your journey • Takes ~3 minutes
                  </p>
                </div>
              </div>
            )}
            
            {/* Interactive Tour Overlay */}
            {showTour && (
              <InteractiveTour
                onClose={() => setShowTour(false)}
                onStepChange={(stepId) => console.log('Tour step:', stepId)}
                onTourComplete={() => {
                  console.log('Tour completed');
                  setShowTour(false);
                  
                  // Trigger a custom event to tell StatusLine to refresh
                  window.dispatchEvent(new Event('tour:completed'));
                }}
              />
            )}
          
            
            {/* Settings Modal */}
            <SettingsModal
              isOpen={showSettingsModal}
              onClose={() => setShowSettingsModal(false)}
              fontSize={fontSize}
              onFontSizeChange={setFontSize}
            />
            
            {/* Keyboard Shortcuts Modal */}
            <KeyboardShortcutsModal
              isOpen={showKeyboardShortcuts}
              onClose={() => setShowKeyboardShortcuts(false)}
            />
            
            {/* Documentation Panel */}
            <DocumentationPanel />
          </div>
        </TerminalCommandProvider>
      </EnhancedSupervisionProvider>
    </SessionProvider>
  );
}

export default function IDEPage() {
  return (
    <Suspense fallback={<div>Loading IDE...</div>}>
      <IDEPageContent />
    </Suspense>
  );
}
