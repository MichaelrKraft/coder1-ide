import React, { useState, useEffect } from 'react';
import './App.css';
import ThreePanelLayout from './components/layout/ThreePanelLayout';
import EditorTerminalSplit from './components/layout/EditorTerminalSplit';
import Terminal, { TerminalSessionData } from './components/Terminal';
import FileExplorer from './components/FileExplorer';
import Preview from './components/Preview';
import HivemindDashboard from './components/HivemindDashboard';
import FileSearch from './components/FileSearch';
import ThinkingModeToggle, { ThinkingMode } from './components/ThinkingModeToggle';
import CheckpointTimeline from './components/CheckpointTimeline';
import CodeEditor from './components/CodeEditor';
import FileTabs from './components/FileTabs';
import MenuBar from './components/MenuBar';
import Documentation from './components/Documentation';
import SessionSummaryButton from './components/SessionSummaryButton';
import MagicCommandBar from './components/magic/MagicCommandBar';
import MagicFloatingWand from './components/magic/MagicFloatingWand';
import GitIntegration from './components/git/GitIntegration';
import Sidebar from './components/Sidebar';
import CodebaseWiki from './components/CodebaseWiki';
import IDEHeroSection from './components/IDEHeroSection';
import { useFeatureFlag } from './hooks/useFeatureFlag';
import { useCheckpoints, useAutoCheckpoints } from './hooks/useCheckpoints';
import { CheckpointData } from './services/checkpoints';
import { fileSystemService } from './services/fileSystem';
import magicUIService, { MagicProgress, MagicComponent } from './services/magic/MagicUIService';
// Removed performance monitoring hooks - they were breaking terminal

function App() {
  // Force rebuild - timestamp: 1234567890
  const [activeView, setActiveView] = useState<'explorer' | 'terminal' | 'preview' | 'discover' | 'codebase'>('terminal');
  
  // Removed memory monitoring and garbage collection - they were causing performance issues
  
  // Removed memory cleanup - was causing issues
  const [isSleepMode, setIsSleepMode] = useState(false);
  const [isSupervisionOn, setIsSupervisionOn] = useState(false);
  const [isInfiniteLoop, setIsInfiniteLoop] = useState(false);
  const [isParallelAgents, setIsParallelAgents] = useState(false);
  const [showHivemind, setShowHivemind] = useState(false);
  const [hivemindSessionId, setHivemindSessionId] = useState<string | null>(null);
  const [activeAgentCount] = useState(0);
  
  // New feature states
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [showCheckpointTimeline, setShowCheckpointTimeline] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>('normal');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [terminalRef, setTerminalRef] = useState<HTMLElement | null>(null);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  
  // View states for menu toggles
  const [showExplorer, setShowExplorer] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showOutput, setShowOutput] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // Magic MCP states
  const [showMagicCommandBar, setShowMagicCommandBar] = useState(false);
  const [showMagicFloatingWand, setShowMagicFloatingWand] = useState(true);
  const [magicGeneratedComponent, setMagicGeneratedComponent] = useState<MagicComponent | null>(null);
  
  // Git integration state
  const [gitIntegrationEnabled, setGitIntegrationEnabled] = useState(true);
  
  // Hero section state
  const [showHero, setShowHero] = useState(true);
  
  // Debug Magic initialization
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Magic Debug: App mounted, showMagicFloatingWand =', showMagicFloatingWand);
      console.log('🎯 Magic Debug: MagicFloatingWand component exists?', typeof MagicFloatingWand);
      console.log('🎯 Magic Debug: MagicCommandBar component exists?', typeof MagicCommandBar);
      console.log('🎯 Magic Debug: Initial showMagicCommandBar state:', showMagicCommandBar);
    }
  }, [showMagicFloatingWand, showMagicCommandBar]);
  
  // Removed memory monitoring - was causing console spam and performance issues
  
  // Track showMagicCommandBar state changes
  React.useEffect(() => {
    console.log('🚨 showMagicCommandBar changed to:', showMagicCommandBar);
  }, [showMagicCommandBar]);

  // Listen for clear preview messages
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'CLEAR_PREVIEW') {
        console.log('🗑️ Clearing preview');
        setPreviewCode('');
        setMagicGeneratedComponent(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  
  // Terminal session data for session summary
  const [terminalSessionData, setTerminalSessionData] = useState<TerminalSessionData>({
    terminalHistory: '',
    terminalCommands: []
  });
  
  // Editor state
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('// Welcome to Coder1 IDE\n// Open a file to start coding');
  const [isDirty, setIsDirty] = useState(false);
  
  // File tabs state
  interface OpenFile {
    path: string;
    name: string;
    content: string;
    isDirty: boolean;
  }
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  
  // Feature flags
  const fileSearchEnabled = useFeatureFlag('FILE_SEARCH');
  const thinkingModeEnabled = useFeatureFlag('THINKING_MODE_TOGGLE');
  const checkpointEnabled = useFeatureFlag('SESSION_CHECKPOINTS');
  
  // Checkpoint management
  const { createCheckpoint } = useCheckpoints(sessionId);

  // Get current application state for checkpoints
  const getCurrentState = (): CheckpointData => {
    return {
      messages: [], // TODO: Get from actual chat/conversation state
      currentContext: '',
      activeFiles: [], // TODO: Get from file explorer/editor
      thinkingMode,
      activeView,
      sidebarCollapsed: false,
      terminalVisible: activeView === 'terminal',
      projectFiles: [],
      modifiedFiles: [],
    };
  };

  // Auto-checkpoints every 10 minutes
  useAutoCheckpoints(sessionId, getCurrentState, { 
    interval: 10, 
    enabled: checkpointEnabled 
  });

  // Check for PRD transfer on mount
  React.useEffect(() => {
    const checkPRDTransfer = async () => {
      // Check localStorage first (PRD generator uses localStorage), then sessionStorage as fallback
      const transferData = localStorage.getItem('prd_transfer_data') || sessionStorage.getItem('prd_transfer_data');
      if (transferData) {
        try {
          const data = JSON.parse(transferData);
          console.log('📋 PRD Transfer detected:', data.prd?.title);
          
          // Clear the transfer data from both storages
          localStorage.removeItem('prd_transfer_data');
          sessionStorage.removeItem('prd_transfer_data');
          
          // Create CLAUDE.md file with the PRD context
          const claudeMdContent = data.prd?.technical_specs?.[0] || data.prd?.description || `# ${data.prd?.title || 'Project'} - PRD Context\n\n${JSON.stringify(data, null, 2)}`;
          
          try {
            await fileSystemService.writeFile('/CLAUDE.md', claudeMdContent);
            console.log('✅ CLAUDE.md file created successfully');
            
            // Open CLAUDE.md in the editor
            handleFileSelect('/CLAUDE.md', 'CLAUDE.md');
            
            // Show success banner
            const banner = document.createElement('div');
            banner.className = 'prd-success-banner';
            banner.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #10b981; color: white; padding: 12px; text-align: center; z-index: 9999; font-family: Inter, sans-serif;';
            banner.innerHTML = '✅ PRD loaded from Smart Generator - CLAUDE.md ready for Claude Code';
            document.body.appendChild(banner);
            setTimeout(() => banner.remove(), 5000);
            
            console.log('✅ PRD successfully transferred and CLAUDE.md created');
          } catch (fileError) {
            console.error('Failed to create CLAUDE.md file:', fileError);
            // Fallback: open content in editor directly
            setFileContent(claudeMdContent);
            setActiveFile('CLAUDE.md');
            setActiveFilePath('/CLAUDE.md');
            setOpenFiles(prev => [...prev, { path: '/CLAUDE.md', name: 'CLAUDE.md', content: claudeMdContent, isDirty: false }]);
          }
        } catch (error) {
          console.error('Failed to process PRD transfer:', error);
        }
      }
      
      // Also check server for stored transfer
      try {
        const response = await fetch('/api/prd-v2/transfer/retrieve', {
          credentials: 'same-origin'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.prd) {
            console.log('📋 PRD Transfer retrieved from server');
            
            // Create CLAUDE.md file
            const claudeMdContent = data.claudeMd || `# ${data.prd.metadata?.projectName || 'Project'} - PRD Context\n\n${JSON.stringify(data.prd, null, 2)}`;
            await fileSystemService.writeFile('/CLAUDE.md', claudeMdContent);
            
            // Open CLAUDE.md in the editor
            handleFileSelect('/CLAUDE.md', 'CLAUDE.md');
            
            // Clear server transfer
            await fetch('/api/prd-v2/transfer/clear', {
              method: 'POST',
              credentials: 'same-origin'
            });
          }
        }
      } catch (error) {
        console.error('Failed to check server for PRD transfer:', error);
      }
    };
    
    checkPRDTransfer();
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 - Open documentation
      if (e.key === 'F1') {
        e.preventDefault();
        setShowDocumentation(true);
      }
      
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux) - Open Magic Command Bar
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        console.log('🎯 Keyboard: Cmd+K detected! Setting showMagicCommandBar to true');
        setShowMagicCommandBar(true);
      }
      
      // Escape - Close Magic Command Bar
      if (e.key === 'Escape' && showMagicCommandBar) {
        setShowMagicCommandBar(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showMagicCommandBar]);

  // Hero section handler
  const handleHeroDismiss = () => {
    setShowHero(false);
  };

  // Handlers
  const handleFileSelect = async (filePath: string, fileName: string) => {
    // Dismiss hero when opening a file
    setShowHero(false);
    
    // Check if file is already open
    const existingFile = openFiles.find(f => f.path === filePath);
    if (existingFile) {
      // Switch to existing tab
      setActiveFilePath(filePath);
      setActiveFile(fileName);
      setFileContent(existingFile.content);
      setIsDirty(existingFile.isDirty);
      return;
    }

    try {
      const content = await fileSystemService.readFile(filePath);
      
      // Add new file to open files
      const newFile: OpenFile = {
        path: filePath,
        name: fileName,
        content,
        isDirty: false
      };
      
      setOpenFiles(prev => [...prev, newFile]);
      setActiveFilePath(filePath);
      setActiveFile(fileName);
      setFileContent(content);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  };

  const handleTabClick = (filePath: string) => {
    const file = openFiles.find(f => f.path === filePath);
    if (file) {
      setActiveFilePath(filePath);
      setActiveFile(file.name);
      setFileContent(file.content);
      setIsDirty(file.isDirty);
    }
  };

  const handleTabClose = (filePath: string) => {
    const fileIndex = openFiles.findIndex(f => f.path === filePath);
    if (fileIndex === -1) return;

    const newOpenFiles = openFiles.filter(f => f.path !== filePath);
    setOpenFiles(newOpenFiles);

    // If closing the active file, switch to another file or show welcome
    if (filePath === activeFilePath) {
      if (newOpenFiles.length > 0) {
        const nextFile = newOpenFiles[Math.max(0, fileIndex - 1)];
        setActiveFilePath(nextFile.path);
        setActiveFile(nextFile.name);
        setFileContent(nextFile.content);
        setIsDirty(nextFile.isDirty);
      } else {
        setActiveFilePath(null);
        setActiveFile(null);
        setFileContent('// Welcome to Coder1 IDE\n// Open a file to start coding');
        setIsDirty(false);
      }
    }
  };

  const handleSaveFile = async () => {
    if (!activeFilePath || !isDirty) return;
    
    try {
      const success = await fileSystemService.writeFile(activeFilePath, fileContent);
      if (success) {
        setIsDirty(false);
        setOpenFiles(prev => prev.map(file => 
          file.path === activeFilePath 
            ? { ...file, isDirty: false }
            : file
        ));
        console.log('File saved successfully:', activeFilePath);
      } else {
        console.error('Failed to save file');
        alert('Failed to save file. Please try again.');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Error saving file. Please check console for details.');
    }
  };

  const handleContentChange = (value: string | undefined) => {
    // Dismiss hero when user starts typing
    setShowHero(false);
    
    const newContent = value || '';
    setFileContent(newContent);
    setIsDirty(true);

    // Update the content in openFiles
    if (activeFilePath) {
      setOpenFiles(prev => prev.map(file => 
        file.path === activeFilePath 
          ? { ...file, content: newContent, isDirty: true }
          : file
      ));
    }

    // Update preview if it's a React/JSX file or no file is open (untitled)
    console.log('handleContentChange - activeFilePath:', activeFilePath, 'content length:', newContent.length);
    if (!activeFilePath || activeFilePath.endsWith('.jsx') || activeFilePath.endsWith('.tsx') || activeFilePath.endsWith('.js')) {
      console.log('Setting preview code for file:', activeFilePath || 'untitled');
      setPreviewCode(newContent);
      // Add to history with debouncing
      const now = Date.now();
      setPreviewHistory(prev => {
        const lastEntry = prev[prev.length - 1];
        if (!lastEntry || now - lastEntry.timestamp > 2000) {
          return [...prev.slice(-9), { code: newContent, timestamp: now }];
        }
        return prev;
      });
    }
  };

  const handleCreateCheckpoint = async () => {
    const name = `Manual Checkpoint ${new Date().toLocaleTimeString()}`;
    const state = getCurrentState();
    await createCheckpoint(name, state, 'User-created checkpoint', ['manual']);
  };

  const handleCheckpointRestore = (checkpoint: any) => {
    // TODO: Implement state restoration
    console.log('Restoring checkpoint:', checkpoint);
    setThinkingMode(checkpoint.data.thinkingMode);
    setActiveView(checkpoint.data.activeView);
  };

  // Export session handlers
  const handleExportSession = (format: 'txt' | 'md' | 'code' | 'clipboard') => {
    try {
      // Get terminal content - this would need to be passed from Terminal component
      const terminalContent = terminalRef?.innerText || 'No terminal content available';
      
      let exportContent = '';
      let filename = '';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      switch (format) {
        case 'txt':
          exportContent = terminalContent;
          filename = `terminal-session-${timestamp}.txt`;
          break;
          
        case 'md':
          exportContent = `# Terminal Session Export\n\n` +
            `**Date:** ${new Date().toLocaleString()}\n` +
            `**Session ID:** ${sessionId}\n\n` +
            `## Terminal Output\n\n` +
            '```\n' + terminalContent + '\n```';
          filename = `terminal-session-${timestamp}.md`;
          break;
          
        case 'code':
          // Extract only code blocks from terminal content
          const codeMatches = terminalContent.match(/```[\s\S]*?```/g) || [];
          exportContent = codeMatches.join('\n\n');
          filename = `code-export-${timestamp}.txt`;
          break;
          
        case 'clipboard':
          navigator.clipboard.writeText(terminalContent);
          // Show notification that content was copied
          alert('Terminal session copied to clipboard!');
          setShowExportDropdown(false);
          return;
      }
      
      // Download file
      const blob = new Blob([exportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export session: ' + error);
    }
  };


  const handleEditorMount = (editor: any) => {
    console.log('Editor mounted:', editor);
    setEditorInstance(editor);
  };

  // Menu action handlers
  const handleNewFile = () => {
    // Dismiss hero when creating new file
    setShowHero(false);
    
    const fileName = prompt('Enter file name:');
    if (fileName) {
      const newFile: OpenFile = {
        path: `/new/${fileName}`,
        name: fileName,
        content: '',
        isDirty: true
      };
      setOpenFiles(prev => [...prev, newFile]);
      setActiveFilePath(newFile.path);
      setActiveFile(newFile.name);
      setFileContent(newFile.content);
      setIsDirty(true);
      
      // Initialize preview for React files
      console.log('handleNewFile - created file:', fileName, 'path:', newFile.path);
      if (fileName.endsWith('.jsx') || fileName.endsWith('.tsx') || fileName.endsWith('.js')) {
        console.log('Initializing preview for new React file:', fileName);
        setPreviewCode('');
      }
    }
  };

  const handleOpenFile = () => {
    // Toggle file explorer and focus on search
    setShowExplorer(true);
    setTimeout(() => {
      const searchInput = document.querySelector('.file-search-input') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    }, 100);
  };

  const handleSaveAs = async () => {
    if (!activeFilePath) return;
    const newName = prompt('Save as:', activeFile || 'untitled.js');
    if (newName) {
      const newPath = activeFilePath.replace(/[^/]+$/, newName);
      const success = await fileSystemService.writeFile(newPath, fileContent);
      if (success) {
        // Update the file in open files
        setOpenFiles(prev => prev.map(file => 
          file.path === activeFilePath 
            ? { ...file, path: newPath, name: newName, isDirty: false }
            : file
        ));
        setActiveFilePath(newPath);
        setActiveFile(newName);
        setIsDirty(false);
      }
    }
  };

  const handleCloseEditor = () => {
    if (activeFilePath) {
      handleTabClose(activeFilePath);
    }
  };

  // Magic MCP handlers
  const handleMagicGeneration = async (prompt: string, onProgress?: (progress: MagicProgress) => void) => {
    try {
      console.log('🪄 Magic generation started:', prompt);
      console.log('   Current component source:', process.env.REACT_APP_COMPONENT_SOURCE || 'local');
      
      // Generate component using Magic MCP service
      const result = await magicUIService.generateComponent(
        {
          message: prompt,
          searchQuery: prompt,
          currentFilePath: activeFilePath || '/src/components/NewComponent.tsx',
          projectDirectory: '/workspace'
        },
        onProgress
      );

      console.log('🎉 Magic generation completed:', result);
      console.log('   Source:', result.metadata?.source || 'Unknown');
      console.log('   Component name:', result.name);

      // Set the generated component for preview
      setMagicGeneratedComponent(result);
      
      // Update preview with the generated code
      setPreviewCode(result.componentCode);
      
      // Update file name if generated
      if (result.name) {
        const fileName = result.name.endsWith('.tsx') ? result.name : `${result.name}.tsx`;
        setActiveFile(fileName);
        setFileContent(result.componentCode);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Magic generation failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      onProgress?.({
        status: 'error',
        message: `Generation failed: ${errorMessage}`
      });
      
      throw error;
    }
  };

  // Simple direct function without useCallback
  const handleMagicWandClick = () => {
    console.log('🎯 handleMagicWandClick called!');
    setShowMagicCommandBar(true);
  };

  const handleUndo = () => {
    if (editorInstance) {
      editorInstance.trigger('keyboard', 'undo', null);
    }
  };

  const handleRedo = () => {
    if (editorInstance) {
      editorInstance.trigger('keyboard', 'redo', null);
    }
  };

  const handleCut = () => {
    if (editorInstance) {
      editorInstance.focus();
      document.execCommand('cut');
    }
  };

  const handleCopy = () => {
    if (editorInstance) {
      editorInstance.focus();
      document.execCommand('copy');
    }
  };

  const handlePaste = () => {
    if (editorInstance) {
      editorInstance.focus();
      document.execCommand('paste');
    }
  };

  const handleReplace = () => {
    if (editorInstance) {
      editorInstance.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
    }
  };

  const handleToggleExplorer = () => {
    setShowExplorer(!showExplorer);
  };

  const handleToggleTerminal = () => {
    setShowTerminal(!showTerminal);
  };

  const handleToggleOutput = () => {
    setShowOutput(!showOutput);
    if (showOutput) {
      // Show output panel in terminal area
      console.log('Output panel toggled');
    }
  };

  const handleZoomIn = () => {
    const currentZoom = parseFloat((document.body.style as any).zoom || '100');
    (document.body.style as any).zoom = `${Math.min(currentZoom + 10, 200)}%`;
  };

  const handleZoomOut = () => {
    const currentZoom = parseFloat((document.body.style as any).zoom || '100');
    (document.body.style as any).zoom = `${Math.max(currentZoom - 10, 50)}%`;
  };

  const handleZoomReset = () => {
    (document.body.style as any).zoom = '100%';
  };

  // Missing handler functions
  const handleRunCode = () => {
    console.log('Run code');
    // TODO: Implement code execution
  };

  const handleDebug = () => {
    console.log('Debug code');
    // TODO: Implement debugging
  };

  const handleStop = () => {
    console.log('Stop execution');
    // TODO: Implement stop functionality
  };

  const handleAbout = () => {
    alert('Coder1 IDE v2 - AI-Powered Development Environment');
  };

  const handleKeyboardShortcuts = () => {
    setShowKeyboardShortcuts(true);
  };

  // Preview state for enhanced features
  const [previewCode, setPreviewCode] = useState<string>('');
  const [previewHistory, setPreviewHistory] = useState<Array<{code: string, timestamp: number}>>([]);
  const [consoleOutput, setConsoleOutput] = useState<Array<{type: string, message: string, timestamp: number}>>([]);

  
  return (
    <div className="app-container">
      
      {/* Header Bar */}
      <div className="header-bar">
        <div className="header-left">
          <div className="logo-container">
            <img 
              src="/ide/logo_newest.svg" 
              alt="Coder1 Logo" 
              className="logo-image"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                document.getElementById('logo-fallback')!.style.display = 'block';
              }}
            />
            <span id="logo-fallback" className="logo-text" style={{display: 'none'}}>Coder1</span>
          </div>
          <MenuBar
            onNewFile={handleNewFile}
            onOpenFile={handleOpenFile}
            onSave={handleSaveFile}
            onSaveAs={handleSaveAs}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onCut={handleCut}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onFind={() => setShowFileSearch(true)}
            onReplace={handleReplace}
            onToggleExplorer={handleToggleExplorer}
            onToggleTerminal={handleToggleTerminal}
            onToggleOutput={handleToggleOutput}
            onRunCode={handleRunCode}
            onDebug={handleDebug}
            onStop={handleStop}
            onAbout={handleAbout}
            onDocumentation={() => setShowDocumentation(true)}
            onKeyboardShortcuts={handleKeyboardShortcuts}
          />
        </div>
        <div className="header-center">
        </div>
        <div className="header-right">
          <div className="menu-button" onClick={() => setShowMenuDropdown(!showMenuDropdown)}>
            <span>Menu</span>
            <span className="menu-arrow">▼</span>
            {showMenuDropdown && (
              <div className="menu-dropdown ide-menu-fixed">
                <a href="/" className="menu-item">
                  <span className="menu-item-icon">🏠</span>
                  <span>Coder One Dashboard</span>
                </a>
                <a href="/agent-dashboard.html" className="menu-item">
                  <span className="menu-item-icon">🤖</span>
                  <span>Agent Dashboard</span>
                </a>
                <div className="menu-separator"></div>
                <a href="/vibe-dashboard.html" className="menu-item">
                  <span className="menu-item-icon">📊</span>
                  <span>Dashboard</span>
                </a>
                <a href="/features.html" className="menu-item">
                  <span className="menu-item-icon">✨</span>
                  <span>Features</span>
                </a>
                <a href="/smart-prd-generator.html" className="menu-item">
                  <span className="menu-item-icon">📝</span>
                  <span>PRD Generator</span>
                </a>
                <a href="/templates.html" className="menu-item">
                  <span className="menu-item-icon">🧩</span>
                  <span>Templates</span>
                </a>
                <a href="/hooks.html" className="menu-item">
                  <span className="menu-item-icon">🔗</span>
                  <span>Hooks</span>
                </a>
                <a href="/components.html" className="menu-item">
                  <span className="menu-item-icon">🎨</span>
                  <span>Components</span>
                </a>
                <a href="/workflows.html" className="menu-item">
                  <span className="menu-item-icon">⚡</span>
                  <span>Workflows</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', height: 'calc(100% - 40px)' }}>
        <Sidebar 
          activeView={activeView}
          setActiveView={setActiveView}
        />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <ThreePanelLayout
        leftPanel={
          activeView === 'explorer' ? (
            <div className="explorer-content">
              <div className="file-explorer-wrapper">
                <FileExplorer 
                  onFileSelect={handleFileSelect}
                  onSearchClick={fileSearchEnabled ? () => setShowFileSearch(true) : undefined}
                />
              </div>
              <div className="explorer-future-component">
                {/* Magic wand in sidebar */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%',
                  gap: '16px',
                  padding: '16px'
                }}>
                  <div style={{
                    textAlign: 'center',
                    color: '#E5E7EB',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    AI Magic
                  </div>
                  <MagicFloatingWand 
                    visible={true}
                    onActivate={handleMagicWandClick}
                    position="static"
                  />
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#9CA3AF',
                    opacity: 0.7,
                    textAlign: 'center'
                  }}>
                    Cmd+K to create
                  </div>
                </div>
              </div>
            </div>
          ) : activeView === 'discover' ? (
            <div className="discover-content" style={{
              padding: '20px',
              color: '#cccccc',
              height: '100%',
              overflowY: 'auto'
            }}>
              <h2 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>🔍 Discover</h2>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#e5e7eb' }}>Templates</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="discover-item" style={{ 
                    background: '#2d2d30', 
                    border: '1px solid #454545', 
                    padding: '10px', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#cccccc'
                  }}>
                    📄 React Component Template
                  </button>
                  <button className="discover-item" style={{ 
                    background: '#2d2d30', 
                    border: '1px solid #454545', 
                    padding: '10px', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#cccccc'
                  }}>
                    🎨 Landing Page Template
                  </button>
                  <button className="discover-item" style={{ 
                    background: '#2d2d30', 
                    border: '1px solid #454545', 
                    padding: '10px', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#cccccc'
                  }}>
                    🔧 API Endpoint Template
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#e5e7eb' }}>AI Tools</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="discover-item" style={{ 
                    background: '#2d2d30', 
                    border: '1px solid #454545', 
                    padding: '10px', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#cccccc'
                  }}>
                    🤖 Code Generator
                  </button>
                  <button className="discover-item" style={{ 
                    background: '#2d2d30', 
                    border: '1px solid #454545', 
                    padding: '10px', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#cccccc'
                  }}>
                    🔄 Code Refactor Assistant
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#e5e7eb' }}>Extensions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="discover-item" style={{ 
                    background: '#2d2d30', 
                    border: '1px solid #454545', 
                    padding: '10px', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#cccccc'
                  }}>
                    📦 Theme Manager
                  </button>
                  <button className="discover-item" style={{ 
                    background: '#2d2d30', 
                    border: '1px solid #454545', 
                    padding: '10px', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#cccccc'
                  }}>
                    ⚡ Performance Optimizer
                  </button>
                </div>
              </div>
            </div>
          ) : activeView === 'terminal' ? (
            <div style={{ 
              padding: '20px', 
              color: '#cccccc',
              textAlign: 'center'
            }}>
              <p>Terminal view active</p>
              <p style={{ fontSize: '12px', marginTop: '10px', color: '#999' }}>
                Use the sidebar to switch views
              </p>
            </div>
          ) : activeView === 'preview' ? (
            <div style={{ 
              padding: '20px', 
              color: '#cccccc',
              textAlign: 'center'
            }}>
              <p>Preview view active</p>
              <p style={{ fontSize: '12px', marginTop: '10px', color: '#999' }}>
                Use the sidebar to switch views
              </p>
            </div>
          ) : activeView === 'codebase' ? (
            <CodebaseWiki />
          ) : null
        }
        centerPanel={
          <EditorTerminalSplit
            editor={
              <div className="editor-with-tabs">
                <FileTabs
                  tabs={openFiles.map(file => ({
                    path: file.path,
                    name: file.name,
                    isDirty: file.isDirty,
                    language: file.name.split('.').pop()
                  }))}
                  activeTab={activeFilePath}
                  onTabClick={handleTabClick}
                  onTabClose={handleTabClose}
                />
                <div className="editor-container" style={{ position: 'relative', height: 'calc(100% - 40px)' }}>
                  {showHero && openFiles.length === 0 ? (
                    <IDEHeroSection 
                      onDismiss={handleHeroDismiss}
                      className="fade-in-hero"
                    />
                  ) : (
                    <CodeEditor
                      value={fileContent}
                      fileName={activeFile || 'untitled.js'}
                      onChange={handleContentChange}
                      onEditorMount={handleEditorMount}
                      onSave={handleSaveFile}
                    />
                  )}
                </div>
              </div>
            }
            terminal={
              showTerminal ? (
                <Terminal 
                  thinkingMode={thinkingMode}
                  onThinkingModeChange={thinkingModeEnabled ? setThinkingMode : undefined}
                  onTerminalDataChange={setTerminalSessionData}
                  onShowTaskDelegation={setShowHivemind}
                  onSetTaskDelegationSessionId={setHivemindSessionId}
                />
              ) : null
            }
          />
        }
        rightPanel={
          <div className="right-panel-content">
            <div className="preview-section">
              <Preview 
                code={previewCode}
                fileName={activeFile || 'untitled.jsx'}
                history={previewHistory}
                consoleOutput={consoleOutput}
                onConsoleOutput={(output) => setConsoleOutput(prev => [...prev, output])}
                onClearConsole={() => setConsoleOutput([])}
              />
            </div>
          </div>
        }
      />
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-left">
          <span className="status-text">Ready</span>
        </div>
        
        <div className="status-center">
          {checkpointEnabled && (
            <div className="status-checkpoint-buttons">
              <button 
                className="status-button"
                onClick={handleCreateCheckpoint}
                title="Create checkpoint"
              >
                Checkpoint
              </button>
              <button 
                className="status-button"
                onClick={() => setShowCheckpointTimeline(true)}
                title="View timeline"
              >
                Timeline
              </button>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button 
                  className="status-button"
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  title="Export terminal session in various formats"
                >
                  Export
                </button>
                {showExportDropdown && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '5px',
                    background: 'var(--tokyo-bg-dark)',
                    border: '1px solid var(--tokyo-fg-gutter)',
                    borderRadius: '4px',
                    padding: '4px 0',
                    minWidth: '150px',
                    zIndex: 1000,
                    boxShadow: '0 -2px 8px rgba(0,0,0,0.3)'
                  }}>
                    <button
                      onClick={() => handleExportSession('txt')}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '6px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--tokyo-fg)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tokyo-bg-highlight)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      📄 Export as Text
                    </button>
                    <button
                      onClick={() => handleExportSession('md')}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '6px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--tokyo-fg)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tokyo-bg-highlight)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      📝 Export as Markdown
                    </button>
                    <button
                      onClick={() => handleExportSession('code')}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '6px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--tokyo-fg)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tokyo-bg-highlight)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      💻 Export Code Only
                    </button>
                    <div style={{ borderTop: '1px solid var(--tokyo-fg-gutter)', margin: '4px 0' }}></div>
                    <button
                      onClick={() => handleExportSession('clipboard')}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '6px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--tokyo-fg)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tokyo-bg-highlight)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      📋 Copy to Clipboard
                    </button>
                  </div>
                )}
              </div>
              
              <SessionSummaryButton
                openFiles={openFiles}
                activeFile={activeFile}
                terminalHistory={terminalSessionData.terminalHistory}
                terminalCommands={terminalSessionData.terminalCommands}
              />
            </div>
          )}
        </div>
        
        <div className="status-right">
        </div>
      </div>
      
      {/* Feature overlays */}
      {showFileSearch && fileSearchEnabled && (
        <FileSearch 
          onFileSelect={(filePath: string) => {
            const fileName = filePath.split('/').pop() || filePath;
            handleFileSelect(filePath, fileName);
          }}
          onClose={() => setShowFileSearch(false)}
        />
      )}
      
      {showCheckpointTimeline && checkpointEnabled && (
        <CheckpointTimeline
          sessionId={sessionId}
          onCheckpointRestore={handleCheckpointRestore}
          onClose={() => setShowCheckpointTimeline(false)}
        />
      )}
      
      {showHivemind && (
        <HivemindDashboard 
          onClose={() => setShowHivemind(false)}
          sessionId={hivemindSessionId || undefined}
        />
      )}
      
      {showDocumentation && (
        <Documentation 
          onClose={() => setShowDocumentation(false)}
        />
      )}
      
      {showKeyboardShortcuts && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowKeyboardShortcuts(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1a1b26',
              border: '2px solid #bb9af7',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
              zIndex: 10001
            }}
          >
            <h2 style={{ color: '#bb9af7', marginBottom: '16px' }}>Keyboard Shortcuts</h2>
            <div style={{ color: '#a9b1d6' }}>
              <h3 style={{ color: '#7aa2f7', marginTop: '16px' }}>File</h3>
              <div>Ctrl+N - New File</div>
              <div>Ctrl+O - Open File</div>
              <div>Ctrl+S - Save</div>
              <div>Ctrl+Shift+S - Save As</div>
              <div>Ctrl+W - Close Editor</div>
              
              <h3 style={{ color: '#7aa2f7', marginTop: '16px' }}>Edit</h3>
              <div>Ctrl+Z - Undo</div>
              <div>Ctrl+Y - Redo</div>
              <div>Ctrl+X - Cut</div>
              <div>Ctrl+C - Copy</div>
              <div>Ctrl+V - Paste</div>
              <div>Ctrl+F - Find</div>
              <div>Ctrl+H - Replace</div>
              
              <h3 style={{ color: '#7aa2f7', marginTop: '16px' }}>View</h3>
              <div>Ctrl+Shift+E - Toggle Explorer</div>
              <div>Ctrl+` - Toggle Terminal</div>
              <div>Ctrl+Shift+G - Open Git Panel</div>
              <div>Ctrl+= - Zoom In</div>
              <div>Ctrl+- - Zoom Out</div>
              <div>Ctrl+0 - Reset Zoom</div>
              
              <h3 style={{ color: '#7aa2f7', marginTop: '16px' }}>Run</h3>
              <div>F5 - Run Code</div>
              <div>F9 - Debug</div>
              <div>Shift+F5 - Stop</div>
              
              <h3 style={{ color: '#7aa2f7', marginTop: '16px' }}>Help</h3>
              <div>F1 - Documentation</div>
              <div>Ctrl+K Ctrl+S - Keyboard Shortcuts</div>
            </div>
            <button 
              className="modal-close" 
              onClick={() => setShowKeyboardShortcuts(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: '#bb9af7',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Git Integration */}
      <GitIntegration 
        enabled={gitIntegrationEnabled}
      />
      
      {/* Magic MCP Components */}
      {/* Magic wand is now in the sidebar, not floating */}
      <MagicCommandBar 
        isVisible={showMagicCommandBar}
        onGenerate={handleMagicGeneration}
        onClose={() => setShowMagicCommandBar(false)}
      />
      
      
    </div>
  );
}

export default App;
