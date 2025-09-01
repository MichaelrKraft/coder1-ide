'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import ThreePanelLayout from '@/components/layout/ThreePanelLayout';
import PreviewPanel from '@/components/preview/PreviewPanel';
import MenuBar from '@/components/MenuBar';
import LeftPanel from '@/components/LeftPanel';
import Toast from '@/components/Toast';
import StatusBar from '@/components/StatusBar';
import HeroSection from '@/components/HeroSection';
import { SessionProvider } from '@/contexts/SessionContext';

// Dynamic imports for heavy components
const MonacoEditor = dynamic(() => import('@/components/editor/MonacoEditor'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center">Loading Editor...</div>
});

const Terminal = dynamic(() => import('@/components/terminal/Terminal'), {
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
  }, []);

  // Helper to show toast
  const showToast = (message: string) => {
    setToast(message);
  };

  // Menu handlers
  const handleNewFile = () => {
    console.log('New file');
    setActiveFile('untitled.tsx');
    setEditorContent('// New file\n');
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

  // Left Panel - Explorer and Discover tabs
  const leftPanel = showExplorer ? (
    <LeftPanel 
      onFileSelect={setActiveFile}
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
      />

      {/* Version Banner - Current Active IDE */}
      <div className="bg-green-600/20 border-b border-green-500/30 px-4 py-1 text-center">
        <span className="text-green-400 text-sm font-medium">
          ✅ CURRENT IDE - Coder1 v2.0 (Next.js) | Terminal Connected to Backend ✅
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
      <StatusBar 
        activeFile={activeFile}
        isConnected={agentsActive}
      />

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}