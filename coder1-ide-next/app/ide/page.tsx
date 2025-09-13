'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ThreePanelLayout from '@/components/layout/ThreePanelLayout';
import PreviewPanel from '@/components/preview/PreviewPanel';
import MenuBar from '@/components/MenuBar';
import LeftPanel from '@/components/LeftPanel';
import Toast from '@/components/Toast';
import StatusBarCore from '@/components/status-bar/StatusBarCore';
import HeroSection from '@/components/HeroSection';
import InteractiveTour from '../../components/InteractiveTour';
// import { SessionProvider } from '@/contexts/SessionContext'; // Already provided by layout
import { EnhancedSupervisionProvider } from '../../contexts/EnhancedSupervisionContext';
import { TerminalCommandProvider } from '../../contexts/TerminalCommandContext';
import AboutModal from '@/components/AboutModal';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import SettingsModal from '@/components/SettingsModal';
import FileOpenDialog from '../../components/FileOpenDialog';
import { getSocket } from '@/lib/socket';
import { browserSessionManager } from '@/services/browser-session-manager';
import type { IDEFile } from '@/types';

// Dynamic imports for heavy components with optimized lazy loading
const MonacoEditor = dynamic(() => import('../../components/editor/LazyMonacoEditor'), {
  ssr: false
});

const Terminal = dynamic(() => import('@/components/terminal/LazyTerminal'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center">Loading Terminal...</div>
});

export default function IDEPage() {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [agentsActive, setAgentsActive] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(52); // 52% (increased by 30% from 40%)
  const [showExplorer, setShowExplorer] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showOutput, setShowOutput] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [toast, setToast] = useState<string | null>(null);
  const [showHero, setShowHero] = useState(true); // Show hero initially in editor area
  const [showTour, setShowTour] = useState(false); // State for interactive tour
  
  // Example code to show when tour starts
  const tourExampleCode = `// Welcome to Coder1 IDE! 🚀
// This is where you write code with AI assistance

import React from 'react';
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  
  // Type 'claude' in the terminal below to get AI help
  const handleClick = () => {
    setCount(count + 1);
    // REMOVED: // REMOVED: console.log('Button clicked!', count + 1);
  };
  
  return (
    <div className="app">
      <h1>Welcome to Coder1</h1>
      <p>Count: {count}</p>
      <button onClick={handleClick}>
        Click me!
      </button>
    </div>
  );
}

export default App;

// Pro tip: Use Ctrl+Space for IntelliSense
// Pro tip: Use Ctrl+Shift+P for command palette
// Pro tip: Type 'claude' in terminal for AI assistance`;
  
  // Modal states
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showKeyboardShortcutsModal, setShowKeyboardShortcutsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFileOpenDialog, setShowFileOpenDialog] = useState(false);
  
  // Session tracking for Session Summary feature
  const [openFiles, setOpenFiles] = useState<IDEFile[]>([]);
  const [terminalHistory, setTerminalHistory] = useState<string>('');
  const [terminalCommands, setTerminalCommands] = useState<string[]>([]);
  
  // Terminal session tracking for command bridge
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [terminalReady, setTerminalReady] = useState<boolean>(false);
  
  // Phase 2: Browser session management
  const [browserSessionInfo, setBrowserSessionInfo] = useState<any>(null);
  const [contextActive, setContextActive] = useState<boolean>(false);
  
  // Component capture integration (ultrathin)
  useEffect(() => {
    let mounted = true;

    const initializeSocket = async () => {
      try {
        const socket = await getSocket();
        
        if (!mounted) return;
        
        const handleComponentCapture = (data: any) => {
          if (!mounted) return;
          console.log('📦 Component captured:', data.title);
          
          // Load directly into editor
          setEditorContent(data.code);
          setActiveFile(`${data.title.toLowerCase().replace(/\s+/g, '-')}.html`);
          setShowHero(false);
          
          // Show toast
          setToast(`📦 Captured: ${data.title}`);
          setTimeout(() => setToast(null), 3000);
        };
        
        socket.on('component:captured', handleComponentCapture);
        
        return socket;
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        return null;
      }
    };

    let socketPromise = initializeSocket();

    return () => {
      mounted = false;
      socketPromise.then(socket => {
        if (socket) {
          socket.off('component:captured');
        }
      });
    };
  }, []);
  
  // Handler for when tour starts
  const handleTourStart = React.useCallback(() => {
    setShowTour(true);
    // Keep hero visible for the first steps
    setShowHero(true);
    // Don't set a non-existent file - let preview show default demo
    // setActiveFile('demo.tsx'); // Removed - file doesn't exist
    setEditorContent(tourExampleCode);
  }, [tourExampleCode]);

  // Add keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd key detection
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl) {
        switch(e.key) {
          case 'n':
            e.preventDefault();
            handleNewFile();
            break;
          case 'o':
            e.preventDefault();
            handleOpenFile();
            break;
          case 's':
            e.preventDefault();
            if (e.shiftKey) {
              handleSaveAs();
            } else {
              handleSave();
            }
            break;
          case '`':
            e.preventDefault();
            handleToggleTerminal();
            break;
          case '=':
            e.preventDefault();
            handleZoomIn();
            break;
          case '-':
            e.preventDefault();
            handleZoomOut();
            break;
          case '0':
            e.preventDefault();
            handleResetZoom();
            break;
          case 'e':
            if (e.shiftKey) {
              e.preventDefault();
              handleToggleExplorer();
            }
            break;
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleRunCode();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleDebug();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Note: Handler functions are stable and don't need to be dependencies

  // PHASE 2: Browser Session Detection - Web-Native Context System
  React.useEffect(() => {
    const initializeBrowserSession = async () => {
      try {
        console.log('🌐 Initializing browser session detection...');
        
        // Initialize browser session (does NOT create context sessions automatically)
        const sessionInfo = browserSessionManager.initialize();
        setBrowserSessionInfo(sessionInfo);
        
        // Register session with server (still no context creation)
        await fetch('/api/browser-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'init',
            browserSessionId: sessionInfo.browserSessionId,
            userSessionId: sessionInfo.userSessionId,
            projectPath: '/Users/michaelkraft/autonomous_vibe_interface'
          })
        });
        
        // Check if context is already active for this session
        const hasContext = browserSessionManager.hasActiveContext();
        setContextActive(hasContext);
        
        // Show session status to user
        if (sessionInfo.isNewUser) {
          showToast('🎉 Welcome to Coder1 IDE! Context system ready for AI assistance');
        } else if (sessionInfo.isNewSession) {
          showToast('🌐 Browser session detected - Context system ready when needed');
        } else {
          showToast(hasContext ? 
            '🧠 Context system active - AI assistance available' : 
            '⚡ Session restored - Context will activate when you use AI features'
          );
        }
        
      } catch (error) {
        console.error('Browser session initialization failed:', error);
        showToast('⚠️ Session detection failed - AI features may be limited');
      }
    };
    
    const initializeUsageTracking = async () => {
      try {
        // REMOVED: // REMOVED: console.log('📊 Starting usage tracking...');
        
        // Start periodic usage data collection
        const sessionId = localStorage.getItem('contextSessionId') || `session_${Date.now()}`;
        
        // Initial collection
        await fetch('/api/claude/usage/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, model: 'claude-3-5-sonnet' })
        });
        
        // Set up periodic collection (every 60 seconds)
        const intervalId = setInterval(async () => {
          try {
            await fetch('/api/claude/usage/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, model: 'claude-3-5-sonnet' })
            });
          } catch (error) {
            // logger?.error('Failed to track usage:', error);
          }
        }, 60000); // 1 minute
        
        // Store interval ID for cleanup
        (window as any).__usageTrackingInterval = intervalId;
        
        // REMOVED: // REMOVED: console.log('✅ Usage tracking started');
      } catch (error) {
        // logger?.error('❌ Failed to start usage tracking:', error);
      }
    };
    
    // Initialize browser session detection
    initializeBrowserSession();
    
    // Initialize usage tracking
    initializeUsageTracking();
    
    // Cleanup on unmount
    return () => {
      const sessionId = localStorage.getItem('contextSessionId');
      if (sessionId) {
        // Log session ending (no endpoint needed as sessions auto-expire)
        // REMOVED: // REMOVED: console.log('🔚 Context session ending:', sessionId);
        localStorage.removeItem('contextSessionId');
      }
      
      // Clean up usage tracking interval
      const intervalId = (window as any).__usageTrackingInterval;
      if (intervalId) {
        clearInterval(intervalId);
        delete (window as any).__usageTrackingInterval;
        // REMOVED: // REMOVED: console.log('🔚 Usage tracking stopped');
      }
    };
  }, []);

  // Helper to show toast
  const showToast = (message: string) => {
    setToast(message);
  };

  // Menu handlers
  const handleNewFile = () => {
    // REMOVED: // REMOVED: console.log('New file');
    const newFileName = 'untitled.tsx';
    setActiveFile(newFileName);
    setEditorContent('// New file\n');
    
    // Create new IDEFile object
    const newFile: IDEFile = {
      id: `file_${Date.now()}`,
      path: newFileName,
      name: newFileName,
      content: '// New file\n',
      isDirty: false,
      isOpen: true,
      language: 'typescript',
      type: 'typescript',
      lastModified: new Date()
    };
    
    // Track in openFiles if not already there
    if (!openFiles.some(f => f.path === newFileName)) {
      setOpenFiles([...openFiles, newFile]);
    }
    
    showToast('New file created');
  };

  const handleOpenFile = () => {
    setShowFileOpenDialog(true);
  };
  
  const handleFileSelectFromDialog = async (filePath: string) => {
    try {
      // Fetch file content from API
      const response = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();
      
      if (data.success) {
        const fileName = filePath.split('/').pop() || filePath;
        setActiveFile(filePath);
        setEditorContent(data.content);
        setShowHero(false); // Hide hero section when file is opened
        
        // Create IDEFile object
        const newFile: IDEFile = {
          id: `file_${Date.now()}`,
          path: filePath,
          name: fileName,
          content: data.content,
          isDirty: false,
          isOpen: true,
          language: getLanguageFromFileName(fileName),
          type: getLanguageFromFileName(fileName) as any,
          lastModified: new Date()
        };
        
        // Track in openFiles if not already there
        if (!openFiles.some(f => f.path === filePath)) {
          setOpenFiles([...openFiles, newFile]);
        }
        
        showToast(`Opened ${fileName}`);
      } else {
        showToast(`Failed to open file: ${data.error}`);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      showToast('Failed to open file');
    }
  };
  
  const getLanguageFromFileName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'cpp':
      case 'c':
        return 'cpp';
      default:
        return 'text';
    }
  };

  const handleSave = async () => {
    if (!activeFile) {
      showToast('No file to save');
      return;
    }
    
    try {
      // Save to backend
      const response = await fetch('/api/files/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: activeFile,
          content: editorContent
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Also save to localStorage as backup
        localStorage.setItem(`file_${activeFile}`, editorContent);
        
        // Update file in openFiles to mark as not dirty
        setOpenFiles(prev => prev.map(file => 
          file.path === activeFile 
            ? { ...file, isDirty: false, content: editorContent }
            : file
        ));
        
        const fileName = activeFile.split('/').pop() || activeFile;
        showToast(`✅ Saved ${fileName}`);
      } else {
        showToast(`Failed to save: ${data.error}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      // Fallback to localStorage
      localStorage.setItem(`file_${activeFile}`, editorContent);
      showToast('Saved locally (server unavailable)');
    }
  };

  const handleSaveAs = () => {
    const fileName = prompt('Enter filename:');
    if (fileName) {
      setActiveFile(fileName);
      localStorage.setItem(`file_${fileName}`, editorContent);
      // REMOVED: // REMOVED: console.log('File saved as:', fileName);
      showToast(`Saved as ${fileName}`);
    }
  };
  
  const handleCloseFile = () => {
    if (activeFile) {
      setActiveFile(null);
      setEditorContent('');
      showToast('File closed');
    } else {
      showToast('No file to close');
    }
  };
  
  const handleExit = () => {
    if (confirm('Are you sure you want to exit? Any unsaved changes will be lost.')) {
      showToast('Exiting...');
      // In a real app, this would close the application or navigate away
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    }
  };
  
  const handleStop = () => {
    // In a real implementation, this would stop running processes
    // REMOVED: // REMOVED: console.log('Stopping execution...');
    showToast('Execution stopped');
  };
  
  const handleCopy = async () => {
    try {
      const selection = window.getSelection()?.toString();
      if (selection) {
        await navigator.clipboard.writeText(selection);
        showToast('Copied to clipboard');
      } else {
        showToast('Nothing to copy');
      }
    } catch (err) {
      showToast('Failed to copy');
    }
  };
  
  const handleCut = async () => {
    try {
      const selection = window.getSelection()?.toString();
      if (selection) {
        await navigator.clipboard.writeText(selection);
        // In a real editor, we would delete the selected text
        document.execCommand('delete');
        showToast('Cut to clipboard');
      } else {
        showToast('Nothing to cut');
      }
    } catch (err) {
      showToast('Failed to cut');
    }
  };
  
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // In a real editor, we would insert the text at cursor position
      // REMOVED: // REMOVED: console.log('Pasting:', text);
      showToast('Pasted from clipboard');
    } catch (err) {
      showToast('Failed to paste - clipboard access denied');
    }
  };

  const handleToggleExplorer = () => {
    setShowExplorer(!showExplorer);
    showToast(showExplorer ? 'Explorer hidden' : 'Explorer shown');
  };

  const handleToggleTerminal = () => {
    setShowTerminal(!showTerminal);
    if (!showTerminal) {
      setTerminalHeight(40);
    } else {
      setTerminalHeight(0);
    }
    showToast(showTerminal ? 'Terminal hidden' : 'Terminal shown');
  };

  const handleToggleOutput = () => {
    setShowOutput(!showOutput);
    // REMOVED: // REMOVED: console.log('Toggle output panel');
  };

  const handleRunCode = () => {
    if (!activeFile) {
      showToast('No file to run. Open a file first.');
      return;
    }
    
    const fileName = activeFile.split('/').pop() || activeFile;
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    // Determine run command based on file type
    let runCommand = '';
    switch (ext) {
      case 'js':
        runCommand = `node ${activeFile}`;
        break;
      case 'ts':
      case 'tsx':
        runCommand = `npx ts-node ${activeFile}`;
        break;
      case 'py':
        runCommand = `python ${activeFile}`;
        break;
      case 'java':
        runCommand = `javac ${activeFile} && java ${fileName.replace('.java', '')}`;
        break;
      case 'html':
        showToast('HTML files are previewed in the Preview panel');
        return;
      case 'css':
        showToast('CSS files are applied in the Preview panel');
        return;
      default:
        showToast(`Cannot run .${ext} files directly`);
        return;
    }
    
    showToast(`To run: Type "${runCommand}" in the terminal below`);
    
    // Optionally, we could auto-type the command in the terminal
    // This would require terminal integration
  };

  const handleDebug = () => {
    if (!activeFile) {
      showToast('No file to debug. Open a file first.');
      return;
    }
    
    const fileName = activeFile.split('/').pop() || activeFile;
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    // Provide debug guidance based on file type
    switch (ext) {
      case 'js':
      case 'ts':
      case 'tsx':
        showToast('Add "debugger;" statements or use Chrome DevTools');
        break;
      case 'py':
        showToast('Use "import pdb; pdb.set_trace()" for debugging');
        break;
      case 'java':
        showToast('Use IDE debugger or jdb command-line debugger');
        break;
      default:
        showToast(`Debug support for .${ext} files coming soon`);
    }
  };

  const handleZoomIn = () => {
    const newSize = Math.min(fontSize + 2, 24);
    setFontSize(newSize);
    showToast(`Font size: ${newSize}px`);
  };

  const handleZoomOut = () => {
    const newSize = Math.max(fontSize - 2, 10);
    setFontSize(newSize);
    showToast(`Font size: ${newSize}px`);
  };

  const handleResetZoom = () => {
    setFontSize(14);
    showToast('Font size reset to 14px');
  };

  const handleFind = () => {
    // Trigger Monaco editor find
    if (activeFile) {
      // Monaco editor has built-in find functionality triggered by Ctrl+F
      // We can show a toast to guide the user
      showToast('Press Ctrl+F (or Cmd+F on Mac) to search in editor');
      // Programmatically trigger the find dialog
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'f',
        code: 'KeyF',
        ctrlKey: true,
        bubbles: true
      }));
    } else {
      showToast('Open a file first to use find');
    }
  };

  const handleReplace = () => {
    // Trigger Monaco editor replace
    if (activeFile) {
      showToast('Press Ctrl+H (or Cmd+H on Mac) to find and replace');
      // Programmatically trigger the replace dialog
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'h',
        code: 'KeyH',
        ctrlKey: true,
        bubbles: true
      }));
    } else {
      showToast('Open a file first to use replace');
    }
  };

  // Handle file selection from explorer
  const handleFileSelect = (fileName: string) => {
    setActiveFile(fileName);
    
    // Create IDEFile object if not already in openFiles
    if (!openFiles.some(f => f.path === fileName)) {
      const newFile: IDEFile = {
        id: `file_${Date.now()}`,
        path: fileName,
        name: fileName,
        content: localStorage.getItem(`file_${fileName}`) || '',
        isDirty: false,
        isOpen: true,
        language: fileName.endsWith('.tsx') ? 'typescript' : fileName.endsWith('.js') ? 'javascript' : 'text',
        type: fileName.endsWith('.tsx') ? 'typescript' : fileName.endsWith('.js') ? 'javascript' : 'text',
        lastModified: new Date()
      };
      setOpenFiles([...openFiles, newFile]);
    }
  };

  // Left Panel - Explorer and Discover tabs
  const leftPanel = showExplorer ? (
    <div data-tour="file-explorer">
      <LeftPanel 
      onFileSelect={handleFileSelect}
      activeFile={activeFile}
      />
    </div>
  ) : null;

  // Center Panel - Editor + Terminal Split
  const centerPanel = (
    <div className="h-full flex flex-col">
      {/* Editor or Hero Section */}
      <div style={{ height: `${100 - terminalHeight}%` }} className="border-b border-border-default">
        {showHero ? (
          <div 
            className="h-full w-full bg-bg-primary cursor-pointer flex items-center justify-center"
            onClick={(e) => {
              // Only close hero if clicking the background, not buttons
              if (e.target === e.currentTarget) {
                setShowHero(false);
              }
            }}
          >
            <div data-tour="ide-interface" className="h-full w-full">
            <HeroSection onTourStart={handleTourStart} />
          </div>
          </div>
        ) : (
          <div data-tour="monaco-editor" className="h-full w-full">
            <MonacoEditor
              file={activeFile}
              theme="vs-dark"
              fontSize={fontSize}
              onChange={(value) => setEditorContent(value || '')}
            />
          </div>
        )}
      </div>
      
      {/* Resize Handle */}
      <div 
        className="group h-1 bg-bg-secondary hover:bg-orange-400/20 cursor-ns-resize transition-all duration-300 relative"
        style={{
          boxShadow: '0 0 0 0 rgba(251, 146, 60, 0)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(251, 146, 60, 0.8), inset 0 0 10px rgba(251, 146, 60, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 0 rgba(251, 146, 60, 0)';
        }}
        onMouseDown={(e) => {
          const startY = e.clientY;
          const startHeight = terminalHeight;
          
          const handleMouseMove = (e: MouseEvent) => {
            const deltaY = e.clientY - startY;
            const newHeight = Math.max(20, Math.min(90, startHeight - (deltaY / window.innerHeight * 100)));
            setTerminalHeight(newHeight);
          };
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      />
      
      {/* Terminal */}
      {showTerminal && (
        <div style={{ height: `${terminalHeight}%` }} data-tour="terminal">
          <Terminal 
            onAgentsSpawn={() => setAgentsActive(true)}
            onClaudeTyped={() => setShowHero(false)}
            onTerminalData={(data) => {
              // Capture terminal output (limit to last 10KB to avoid memory issues)
              setTerminalHistory(prev => {
                const newHistory = prev + data;
                return newHistory.length > 10000 ? newHistory.slice(-10000) : newHistory;
              });
            }}
            onTerminalCommand={async (command) => {
              // Track executed commands (limit to last 100 commands)
              setTerminalCommands(prev => {
                const newCommands = [...prev, command];
                return newCommands.length > 100 ? newCommands.slice(-100) : newCommands;
              });
              
              // PHASE 2: Lazy Context Activation on AI Commands
              // Activate context session only when user actually needs AI features
              const aiCommands = ['claude', 'cld', 'claude-code', 'cc'];
              const isAICommand = aiCommands.some(cmd => command.toLowerCase().startsWith(cmd));
              
              if (isAICommand && !contextActive) {
                try {
                  console.log(`🧠 AI command detected: "${command}" - Activating context session...`);
                  showToast('🧠 Activating AI context session...');
                  
                  // Activate context session via browser session manager
                  const contextSessionId = await browserSessionManager.activateContextSession();
                  setContextActive(true);
                  
                  console.log(`✅ Context session activated: ${contextSessionId.substring(0, 8)}...`);
                  showToast('✅ AI context activated - Claude is now learning from your session');
                  
                } catch (error) {
                  console.error('Context activation failed:', error);
                  showToast('⚠️ AI context activation failed - features may be limited');
                }
              } else if (isAICommand && contextActive) {
                console.log(`🧠 AI command detected: "${command}" - Context already active`);
              }
            }}
            onTerminalReady={(sessionId, ready) => {
              // Performance-safe session tracking - no intervals
              setTerminalSessionId(sessionId);
              setTerminalReady(ready);
            }}
          />
        </div>
      )}
    </div>
  );

  // Right Panel - Preview with Agent Dashboard, Codebase Wiki, etc.
  const rightPanel = (
    <PreviewPanel
      agentsActive={agentsActive}
      fileOpen={!!activeFile}
      activeFile={activeFile}
      editorContent={editorContent}
      isPreviewable={activeFile?.endsWith('.html') || activeFile?.endsWith('.tsx') || activeFile?.endsWith('.jsx') || activeFile?.endsWith('.css') || activeFile?.endsWith('.js') || activeFile?.endsWith('.ts')}
    />
  );

  return (
    <EnhancedSupervisionProvider>
      <TerminalCommandProvider 
        sessionId={terminalSessionId} 
        terminalReady={terminalReady}
      >
        <div className="h-screen w-full flex flex-col bg-bg-primary">
      {/* Menu Bar */}
      <MenuBar 
        onNewFile={handleNewFile}
        onOpenFile={handleOpenFile}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onToggleExplorer={handleToggleExplorer}
        onToggleTerminal={handleToggleTerminal}
        onToggleOutput={handleToggleOutput}
        onRunCode={handleRunCode}
        onDebug={handleDebug}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFind={handleFind}
        onReplace={handleReplace}
        onCloseFile={handleCloseFile}
        onExit={handleExit}
        onStop={handleStop}
        onShowAbout={() => setShowAboutModal(true)}
        onShowKeyboardShortcuts={() => setShowKeyboardShortcutsModal(true)}
        onShowSettings={() => setShowSettingsModal(true)}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
      />

      {/* Version Banner - Current Active IDE */}
      <div className="bg-coder1-cyan/20 border-b border-coder1-cyan/30 px-4 py-1 text-center">
        <span className="text-coder1-cyan text-lg font-semibold">
          The world's most advanced AI-native development environment
        </span>
      </div>
      
      {/* Main IDE Layout */}
      <div className="flex-1 overflow-hidden">
        <ThreePanelLayout
          leftPanel={leftPanel}
          centerPanel={centerPanel}
          rightPanel={rightPanel}
        />
      </div>

      {/* Status Bar */}
      <div data-tour="status-bar">
        <StatusBarCore 
        activeFile={activeFile}
        isConnected={agentsActive}
        openFiles={openFiles}
        terminalHistory={terminalHistory}
        terminalCommands={terminalCommands}
        />
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Modals */}
      <AboutModal 
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />
      
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcutsModal}
        onClose={() => setShowKeyboardShortcutsModal(false)}
      />
      
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
      />
      
      <FileOpenDialog
        isOpen={showFileOpenDialog}
        onClose={() => setShowFileOpenDialog(false)}
        onFileSelect={handleFileSelectFromDialog}
      />
      
      {/* Interactive Tour Overlay - at root level */}
      {showTour && (
        <InteractiveTour 
          onClose={() => setShowTour(false)}
          onStepChange={(stepId) => {
            // Keep hero section visible for steps that need it
            if (stepId === 'welcome-overview' || stepId === 'prd-generator') {
              setShowHero(true);
            } else {
              setShowHero(false);
            }
          }}
          onTourComplete={() => {
            // Clean up tour artifacts
            console.log('[IDE] Tour completed, cleaning up editor content and discover menu');
            setEditorContent(''); // Clear dummy code from editor state
            setActiveFile(null); // Reset active file
            setShowHero(false); // Hide hero section after tour
            
            // Clear Monaco editor content directly
            window.dispatchEvent(new Event('tour:clearCode'));
            
            // Close discover menu if it's open - dispatch multiple times to ensure closure
            window.dispatchEvent(new Event('tour:closeDiscoverPanel'));
            setTimeout(() => {
              window.dispatchEvent(new Event('tour:closeDiscoverPanel'));
            }, 150);
          }}
        />
      )}
        </div>
      </TerminalCommandProvider>
    </EnhancedSupervisionProvider>
  );
}