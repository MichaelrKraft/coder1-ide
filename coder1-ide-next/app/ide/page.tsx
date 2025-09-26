"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from 'next/navigation';
import { loadComponentForEditor } from '@/lib/component-formatter';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import InteractiveTour from "@/components/InteractiveTour";
import SettingsModal from "@/components/SettingsModal";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import { MenuActionsService, FileInfo } from '@/lib/services/menu-actions';
import type { editor } from 'monaco-editor';

// Import core IDE components - using correct default exports
import ThreePanelLayout from "@/components/layout/ThreePanelLayout";
import LeftPanel from "@/components/LeftPanel";
import MonacoEditor from "@/components/editor/MonacoEditor";
import StatusBarCore from "@/components/status-bar/StatusBarCore";
import StatusLine from "@/components/status-bar/StatusLine";
import MenuBar from "@/components/MenuBar";
import DragDropOverlay from "@/components/terminal/DragDropOverlay";
import DocumentationPanel from "@/components/documentation/DocumentationPanel";

// Conductor components removed - using simple multi-Claude tabs instead

// Use LazyTerminalContainer to avoid SSR issues
const LazyTerminalContainer = dynamic(
  () => import("@/components/terminal/TerminalContainer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-bg-primary">
        <span className="text-text-muted">Loading terminal...</span>
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
        <span className="text-text-muted">Loading preview...</span>
      </div>
    ),
  },
);

// Import required providers
import { EnhancedSupervisionProvider } from "@/contexts/EnhancedSupervisionContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { TerminalCommandProvider } from "@/contexts/TerminalCommandContext";

function IDEPageContent() {
  // Tour state
  const [showTour, setShowTour] = useState(false);
  
  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  
  // Editor state
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  
  // Panel visibility state
  const [explorerVisible, setExplorerVisible] = useState(true);
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [outputVisible, setOutputVisible] = useState(false);
  
  // Terminal state
  const [agentsActive, setAgentsActive] = useState(false);
  const [runningProcesses, setRunningProcesses] = useState<string[]>([]);

  // Terminal history for checkpoint creation
  const [terminalHistory, setTerminalHistory] = useState<string>("");
  const [terminalCommands, setTerminalCommands] = useState<string[]>([]);
  const [recentTerminalInput, setRecentTerminalInput] = useState<string>("");
  
  // Track recentTerminalInput state changes for contextual memory
  useEffect(() => {
    if (recentTerminalInput) {
      console.log('🧠 [MEMORY-STATE] Contextual memory updated with:', recentTerminalInput);
    }
  }, [recentTerminalInput]);

  // Terminal session tracking for TerminalCommandProvider
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(
    null,
  );
  const [terminalReady, setTerminalReady] = useState<boolean>(false);

  // File drop handling
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
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
            const errorMsg = '\r\n❌ Failed to copy to clipboard. Please try again.\r\n';
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
      const errorMessage = `\n❌ Error: ${error instanceof Error ? error.message : 'Failed to process files'}\n`;
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
    console.log("📊 Terminal data:", data.slice(0, 50) + "...");
    // Accumulate terminal history for checkpoint creation
    setTerminalHistory((prev) => prev + data);
  };

  const handleTerminalCommand = (command: string) => {
    console.log("⌨️ Terminal command:", command);
    
    // Simple logging for contextual memory troubleshooting
    
    // Track commands for checkpoint creation
    setTerminalCommands((prev) => [...prev.slice(-49), command]); // Keep last 50 commands
    
    // Extract user input for contextual memory (commands starting with user input)
    if (command.trim().length > 0 && !command.startsWith('$') && !command.startsWith('#')) {
      console.log('🎯 [MEMORY] Setting contextual memory input:', command);
      setRecentTerminalInput(command);
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
      console.log(`📁 Opening file: ${path}${line ? ` at line ${line}` : ''}`);
      
      // Clear any previous errors for this file
      setFileErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[path];
        return newErrors;
      });
      
      // Check if file is already loaded
      if (files[path]) {
        console.log('📁 File already loaded, switching to it');
        setActiveFile(path);
        return;
      }

      // Set loading state
      setLoadingFiles(prev => new Set(prev).add(path));

      // Clean path - remove leading "/" to make it relative for the file API
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      console.log(`📁 Cleaned path: "${path}" → "${cleanPath}"`);

      // Fetch file content from API
      console.log('📁 Fetching file content from API...');
      const encodedPath = encodeURIComponent(cleanPath);
      const response = await fetch(`/api/files/read?path=${encodedPath}`);

      if (!response.ok) {
        let errorMessage = `Failed to read file: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // Use default error message if response isn't JSON
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('📁 File loaded successfully');
      
      // Add to files state and set as active
      setFiles(prev => ({ ...prev, [path]: data.content || '' }));
      setActiveFile(path);

      // TODO: Handle line positioning in Monaco editor
      if (line) {
        console.log(`📁 TODO: Navigate to line ${line} in Monaco editor`);
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
          data: `\n❌ Failed to open ${path}: ${errorMessage}\n`
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
    menuActionsRef.current?.newFile();
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
    handleToggleOutput, handleZoomIn, handleZoomOut, handleResetZoom,
    handleRunCode, handleDebug, handleStop
  ]);

  // Get search params for component loading
  const searchParams = useSearchParams();
  
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

  return (
    <SessionProvider>
      <EnhancedSupervisionProvider>
        <TerminalCommandProvider
          sessionId={terminalSessionId}
          terminalReady={terminalReady}
        >
          {/* Global Drag Drop Overlay - Must be at root level */}
          <DragDropOverlay
            onFileDrop={handleFileDrop}
            onTextInsert={handleTextInsert}
            isProcessing={isProcessingFiles}
          />
          
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
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
              onRunCode={handleRunCode}
              onDebug={handleDebug}
              onStop={handleStop}
              onShowAbout={handleShowAbout}
              onShowKeyboardShortcuts={handleShowKeyboardShortcuts}
              onShowSettings={() => setShowSettingsModal(true)}
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

            {/* Main IDE Layout */}
            <div className="flex-1 flex flex-col min-h-0">
              <ThreePanelLayout
                leftPanel={
                  explorerVisible ? (
                    <LeftPanel
                      onFileSelect={handleFileSelect}
                      activeFile={activeFile}
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
                      <div className="h-full overflow-hidden">
                        <MonacoEditor
                          value={
                            activeFile ? (
                              loadingFiles.has(activeFile) ? 
                                `// Loading ${activeFile}...\n// Please wait while the file is being loaded.` :
                              fileErrors[activeFile] ? 
                                `// Error loading ${activeFile}\n// ${fileErrors[activeFile]}\n// \n// Please check:\n// 1. File exists and is accessible\n// 2. You have permission to read the file\n// 3. The file path is correct\n// \n// Try refreshing the file explorer or check the terminal for more details.` :
                              files[activeFile] || ""
                            ) : undefined
                          }
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
                          <div className="h-full bg-bg-primary">
                            <LazyTerminalContainer
                              onAgentsSpawn={handleAgentsSpawn}
                              onTerminalClick={handleTerminalClick}
                              onClaudeTyped={handleClaudeTyped}
                              onTerminalData={handleTerminalData}
                              onTerminalCommand={handleTerminalCommand}
                              onTerminalReady={handleTerminalReady}
                            />
                          </div>
                        </Panel>
                      </>
                    )}
                  </PanelGroup>
                }
                rightPanel={
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
                  />
                }
              />
            </div>

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
              terminalHistory={terminalHistory}
              terminalCommands={terminalCommands}
            />
            
            {/* Status Line - Shows Model, Tokens, Date */}
            <StatusLine />
            
            {/* Interactive Tour Overlay */}
            {showTour && (
              <InteractiveTour
                onClose={() => setShowTour(false)}
                onStepChange={(stepId) => console.log('Tour step:', stepId)}
                onTourComplete={() => {
                  console.log('Tour completed');
                  setShowTour(false);
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
