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
import { SessionProvider } from '@/contexts/SessionContext';
import { EnhancedSupervisionProvider } from '@/contexts/EnhancedSupervisionContext';
import { TerminalCommandProvider } from '@/contexts/TerminalCommandContext';
import AboutModal from '@/components/AboutModal';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import SettingsModal from '@/components/SettingsModal';
import type { IDEFile } from '@/types';

// Dynamic imports for heavy components with optimized lazy loading
const MonacoEditor = dynamic(() => import('@/components/editor/LazyMonacoEditor'), {
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
  
  // Modal states
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showKeyboardShortcutsModal, setShowKeyboardShortcutsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Session tracking for Session Summary feature
  const [openFiles, setOpenFiles] = useState<IDEFile[]>([]);
  const [terminalHistory, setTerminalHistory] = useState<string>('');
  const [terminalCommands, setTerminalCommands] = useState<string[]>([]);
  
  // Terminal session tracking for command bridge
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [terminalReady, setTerminalReady] = useState<boolean>(false);

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

  // Auto-initialize Context system on IDE startup
  React.useEffect(() => {
    const initializeContext = async () => {
      try {
        console.log('🧠 Initializing Context Folders system...');
        
        // Initialize the Context system
        const initResponse = await fetch('http://localhost:3001/api/context/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectPath: '/Users/michaelkraft/autonomous_vibe_interface',
            autoStart: true  // Enable file watcher
          })
        });
        
        if (!initResponse.ok) {
          throw new Error(`Context init failed: ${initResponse.status}`);
        }
        
        const initData = await initResponse.json();
        console.log('✅ Context system initialized:', initData);
        
        // Store the session ID returned from init
        if (initData.stats?.currentSession) {
          localStorage.setItem('contextSessionId', initData.stats.currentSession);
          console.log('✅ Context session active:', initData.stats.currentSession);
        }
        
        // Log stats from initialization
        console.log('📊 Context stats:', {
          sessions: initData.stats?.totalSessions || 0,
          conversations: initData.stats?.totalConversations || 0,
          patterns: initData.stats?.totalPatterns || 0,
          fileWatcher: initData.fileWatcherActive ? 'active' : 'inactive'
        });
        
        showToast('Context Folders initialized - Your sessions are now being saved!');
      } catch (error) {
        console.error('❌ Failed to initialize Context system:', error);
        showToast('Context Folders unavailable - Sessions will not be saved');
      }
    };
    
    const initializeUsageTracking = async () => {
      try {
        console.log('📊 Starting usage tracking...');
        
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
            console.error('Failed to track usage:', error);
          }
        }, 60000); // 1 minute
        
        // Store interval ID for cleanup
        (window as any).__usageTrackingInterval = intervalId;
        
        console.log('✅ Usage tracking started');
      } catch (error) {
        console.error('❌ Failed to start usage tracking:', error);
      }
    };
    
    // Initialize Context system
    initializeContext();
    
    // Initialize usage tracking
    initializeUsageTracking();
    
    // Cleanup on unmount
    return () => {
      const sessionId = localStorage.getItem('contextSessionId');
      if (sessionId) {
        // Log session ending (no endpoint needed as sessions auto-expire)
        console.log('🔚 Context session ending:', sessionId);
        localStorage.removeItem('contextSessionId');
      }
      
      // Clean up usage tracking interval
      const intervalId = (window as any).__usageTrackingInterval;
      if (intervalId) {
        clearInterval(intervalId);
        delete (window as any).__usageTrackingInterval;
        console.log('🔚 Usage tracking stopped');
      }
    };
  }, []);

  // Helper to show toast
  const showToast = (message: string) => {
    setToast(message);
  };

  // Menu handlers
  const handleNewFile = () => {
    console.log('New file');
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
    console.log('Open file dialog');
    // Would open file dialog
    showToast('Open file dialog (not implemented)');
  };

  const handleSave = () => {
    console.log('Save file:', activeFile);
    if (activeFile) {
      // Save to localStorage for demo
      localStorage.setItem(`file_${activeFile}`, editorContent);
      console.log('File saved to localStorage');
      showToast(`Saved ${activeFile}`);
    } else {
      showToast('No file to save');
    }
  };

  const handleSaveAs = () => {
    const fileName = prompt('Enter filename:');
    if (fileName) {
      setActiveFile(fileName);
      localStorage.setItem(`file_${fileName}`, editorContent);
      console.log('File saved as:', fileName);
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
    console.log('Stopping execution...');
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
      console.log('Pasting:', text);
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
    console.log('Toggle output panel');
  };

  const handleRunCode = () => {
    console.log('Running code:', activeFile);
    // Would execute code in terminal
    showToast(activeFile ? `Running ${activeFile}...` : 'No file to run');
  };

  const handleDebug = () => {
    console.log('Debug mode:', activeFile);
    showToast(activeFile ? `Debugging ${activeFile}...` : 'No file to debug');
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
    console.log('Find in editor');
  };

  const handleReplace = () => {
    // Trigger Monaco editor replace
    console.log('Replace in editor');
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
    <LeftPanel 
      onFileSelect={handleFileSelect}
      activeFile={activeFile}
    />
  ) : null;

  // Center Panel - Editor + Terminal Split
  const centerPanel = (
    <div className="h-full flex flex-col">
      {/* Editor or Hero Section */}
      <div style={{ height: `${100 - terminalHeight}%` }} className="border-b border-border-default">
        {showHero ? (
          <div 
            className="h-full w-full bg-black cursor-pointer flex items-center justify-center"
            onClick={() => setShowHero(false)}
          >
            <HeroSection />
          </div>
        ) : (
          <MonacoEditor
            file={activeFile}
            theme="vs-dark"
            fontSize={fontSize}
          />
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
        <div style={{ height: `${terminalHeight}%` }}>
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
            onTerminalCommand={(command) => {
              // Track executed commands (limit to last 100 commands)
              setTerminalCommands(prev => {
                const newCommands = [...prev, command];
                return newCommands.length > 100 ? newCommands.slice(-100) : newCommands;
              });
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
      isPreviewable={activeFile?.endsWith('.html') || activeFile?.endsWith('.tsx')}
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
        <span className="text-coder1-cyan text-sm font-medium">
          ✅ CURRENT IDE - Coder1 v2.0 (Next.js) | Terminal Connected | Status Line Ready ✅
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
      <StatusBarCore 
        activeFile={activeFile}
        isConnected={agentsActive}
        openFiles={openFiles}
        terminalHistory={terminalHistory}
        terminalCommands={terminalCommands}
      />

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
        </div>
      </TerminalCommandProvider>
    </EnhancedSupervisionProvider>
  );
}