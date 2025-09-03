'use client';

import React, { useState } from 'react';
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
import AboutModal from '@/components/AboutModal';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import SettingsModal from '@/components/SettingsModal';
import EnhancedAgentsOnboarding from '@/components/onboarding/EnhancedAgentsOnboarding';
import type { IDEFile, FileType } from '@/types';
import { logger } from '@/lib/logger';

// Dynamic imports for heavy components with optimized lazy loading
const MonacoEditor = dynamic(() => import('@/components/editor/LazyMonacoEditor'), {
  ssr: false
});

const Terminal = dynamic(() => import('@/components/terminal/Terminal'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center">
    <div className="text-text-muted">Initializing Terminal...</div>
  </div>
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Session tracking for Session Summary feature
  const [openFiles, setOpenFiles] = useState<IDEFile[]>([]);
  const [terminalHistory, setTerminalHistory] = useState<string>('');
  const [terminalCommands, setTerminalCommands] = useState<string[]>([]);

  // Add swipe navigation prevention for MacBook trackpad
  React.useEffect(() => {
    let isActive = false;
    
    // Prevent horizontal swipe navigation
    const preventSwipeNavigation = (e: WheelEvent) => {
      // Check if it's a horizontal swipe (trackpad gesture)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        return false;
      }
    };
    
    // Prevent touch-based swipe navigation
    const preventTouchSwipe = (e: TouchEvent) => {
      // If more than one finger, likely a gesture
      if (e.touches.length > 1) {
        e.preventDefault();
        return false;
      }
    };
    
    // Add warning before leaving page if terminal is active
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (showTerminal && terminalHistory.length > 0) {
        const message = 'You have an active terminal session. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };
    
    // Activate protection
    const activateProtection = () => {
      if (!isActive) {
        window.addEventListener('wheel', preventSwipeNavigation, { passive: false });
        window.addEventListener('touchstart', preventTouchSwipe, { passive: false });
        window.addEventListener('beforeunload', handleBeforeUnload);
        isActive = true;
        logger.debug('🛡️ Swipe navigation protection activated');
      }
    };
    
    // Activate immediately
    activateProtection();
    
    // Show toast notification that protection is active (only once on mount)
    setToast('🛡️ Trackpad swipe protection enabled');
    
    return () => {
      window.removeEventListener('wheel', preventSwipeNavigation);
      window.removeEventListener('touchstart', preventTouchSwipe);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      isActive = false;
    };
  }, [showTerminal, terminalHistory.length]);

  // Check for first-time users and show onboarding
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenOnboarding = localStorage.getItem('coder1-onboarding-seen');
      if (!hasSeenOnboarding) {
        // Show onboarding after a short delay to let the page load
        const timer = setTimeout(() => {
          setShowOnboarding(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('coder1-onboarding-seen', 'true');
    }
  };

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

  // Helper to show toast
  const showToast = (message: string) => {
    setToast(message);
  };

  // Menu handlers
  const handleNewFile = () => {
    logger.debug('New file');
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
    logger.debug('Opening file dialog');
    
    // Create a hidden file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.js,.jsx,.ts,.tsx,.css,.html,.json,.md,.py,.java,.cpp,.c,.h,.php,.rb,.go,.rs,.vue,.svelte,.xml,.yaml,.yml';
    fileInput.style.display = 'none';
    
    // Handle file selection
    fileInput.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // Read file content
          const content = await file.text();
          
          // Determine file language based on extension
          const extension = file.name.split('.').pop()?.toLowerCase();
          let language = 'text';
          
          const languageMap: { [key: string]: string } = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'css': 'css',
            'html': 'html',
            'json': 'json',
            'md': 'markdown',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'h': 'c',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'vue': 'vue',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml'
          };
          
          if (extension && languageMap[extension]) {
            language = languageMap[extension];
          }
          
          // Update editor state
          setActiveFile(file.name);
          setEditorContent(content);
          setShowHero(false); // Hide hero when file is opened
          
          // Map language to FileType
          const getFileType = (lang: string): FileType => {
            const typeMap: Record<string, FileType> = {
              'javascript': 'javascript',
              'typescript': 'typescript',
              'json': 'json',
              'css': 'css',
              'html': 'html',
              'markdown': 'markdown',
              'text': 'text'
            };
            return typeMap[lang] || 'unknown';
          };
          
          // Create new IDEFile object
          const newFile: IDEFile = {
            id: `file_${Date.now()}`,
            path: file.name,
            name: file.name,
            content: content,
            isDirty: false,
            isOpen: true,
            language: language,
            type: getFileType(language),
            lastModified: new Date(file.lastModified)
          };
          
          // Add to openFiles if not already there
          setOpenFiles(prev => {
            const existing = prev.find(f => f.path === file.name);
            if (existing) {
              // Update existing file
              return prev.map(f => f.path === file.name ? newFile : f);
            } else {
              // Add new file
              return [...prev, newFile];
            }
          });
          
          showToast(`Opened ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
          logger.debug('File opened successfully:', file.name);
          
        } catch (error) {
          logger.error('Error reading file:', error);
          showToast('Error reading file');
        }
      }
      
      // Cleanup
      document.body.removeChild(fileInput);
    };
    
    // Add to DOM and trigger click
    document.body.appendChild(fileInput);
    fileInput.click();
  };

  const handleSave = () => {
    logger.debug('Save file:', activeFile);
    if (activeFile) {
      // Save to localStorage for demo
      localStorage.setItem(`file_${activeFile}`, editorContent);
      logger.debug('File saved to localStorage');
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
      logger.debug('File saved as:', fileName);
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
    logger.debug('Stopping execution...');
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
      logger.debug('Pasting:', text);
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
    logger.debug('Toggle output panel');
  };

  const handleRunCode = () => {
    logger.debug('Running code:', activeFile);
    // Would execute code in terminal
    showToast(activeFile ? `Running ${activeFile}...` : 'No file to run');
  };

  const handleDebug = () => {
    logger.debug('Debug mode:', activeFile);
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
    logger.debug('Find in editor');
  };

  const handleReplace = () => {
    // Trigger Monaco editor replace
    logger.debug('Replace in editor');
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
            const newHeight = Math.max(20, Math.min(80, startHeight - (deltaY / window.innerHeight * 100)));
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
      <div className="bg-green-600/20 border-b border-green-500/30 px-4 py-1 text-center">
        <span className="text-green-400 text-sm font-medium">
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
      
      <EnhancedAgentsOnboarding
        isVisible={showOnboarding}
        onClose={handleOnboardingClose}
      />
      </div>
    </EnhancedSupervisionProvider>
  );
}