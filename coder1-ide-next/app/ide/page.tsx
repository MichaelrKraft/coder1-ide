'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// Import core IDE components - using correct default exports
import ThreePanelLayout from '@/components/layout/ThreePanelLayout';
import LeftPanel from '@/components/LeftPanel';
import MonacoEditor from '@/components/editor/MonacoEditor';
import StatusBarCore from '@/components/status-bar/StatusBarCore';
import MenuBar from '@/components/MenuBar';

// Use LazyTerminalContainer to avoid SSR issues
const LazyTerminalContainer = dynamic(
  () => import('@/components/terminal/TerminalContainer'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-bg-primary"><span>Loading terminal...</span></div>
  }
);

// Dynamic import for PreviewPanel
const PreviewPanel = dynamic(
  () => import('@/components/preview/PreviewPanel'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-bg-secondary"><span>Loading preview...</span></div>
  }
);

// Import required providers
import { EnhancedSupervisionProvider } from '@/contexts/EnhancedSupervisionContext';
import { SessionProvider } from '@/contexts/SessionContext';

export default function IDEPage() {
  // Editor state
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  
  // Terminal state
  const [agentsActive, setAgentsActive] = useState(false);
  const [terminalVisible, setTerminalVisible] = useState(true);

  // Terminal callbacks
  const handleAgentsSpawn = () => {
    console.log('🤖 Agents spawning...');
    setAgentsActive(true);
  };

  const handleTerminalClick = () => {
    console.log('🖱️ Terminal clicked');
  };

  const handleClaudeTyped = () => {
    console.log('✨ Claude typed');
  };

  const handleTerminalData = (data: string) => {
    console.log('📊 Terminal data:', data.slice(0, 50) + '...');
  };

  const handleTerminalCommand = (command: string) => {
    console.log('⌨️ Terminal command:', command);
  };

  const handleTerminalReady = (sessionId: any, ready: any) => {
    console.log('✅ Terminal ready:', { sessionId, ready });
  };

  // File operations
  const handleFileSelect = (path: string) => {
    setActiveFile(path);
  };

  const handleFileChange = (path: string, content: string) => {
    setFiles(prev => ({ ...prev, [path]: content }));
  };

  return (
    <SessionProvider>
      <EnhancedSupervisionProvider>
        <div className="h-screen w-full flex flex-col bg-bg-primary">
          {/* Menu Bar */}
          <MenuBar 
            onToggleTerminal={() => setTerminalVisible(!terminalVisible)}
          />
          
          {/* Main IDE Layout */}
          <div className="flex-1 flex flex-col min-h-0">
            <ThreePanelLayout
              leftPanel={
                <LeftPanel 
                  onFileSelect={handleFileSelect}
                  activeFile={activeFile}
                />
              }
              centerPanel={
                <PanelGroup direction="vertical" className="h-full">
                  {/* Editor Panel */}
                  <Panel defaultSize={terminalVisible ? 65 : 100} minSize={30}>
                    <div className="h-full overflow-hidden">
                      <MonacoEditor
                        value={activeFile ? (files[activeFile] || '') : undefined}
                        onChange={(value) => {
                          if (activeFile && value !== undefined) {
                            handleFileChange(activeFile, value);
                          }
                        }}
                        file={activeFile}
                        language="typescript"
                        theme="tokyo-night"
                      />
                    </div>
                  </Panel>
                  
                  {/* Resize Handle between Editor and Terminal */}
                  {terminalVisible && (
                    <>
                      <PanelResizeHandle 
                        className="group h-1 bg-bg-secondary hover:bg-orange-400/20 transition-all duration-200 cursor-row-resize relative"
                        style={{
                          boxShadow: '0 0 0 0 rgba(251, 146, 60, 0)',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as unknown as HTMLElement).style.boxShadow = '0 0 20px rgba(251, 146, 60, 0.8), inset 0 0 10px rgba(251, 146, 60, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as unknown as HTMLElement).style.boxShadow = '0 0 0 0 rgba(251, 146, 60, 0)';
                        }}
                      >
                        <div className="h-full w-full flex items-center justify-center">
                          <div 
                            className="h-0.5 w-8 bg-orange-400/50 group-hover:bg-orange-400 rounded-full transition-all duration-200"
                            style={{
                              boxShadow: '0 0 10px rgba(251, 146, 60, 0.6)',
                            }}
                          />
                        </div>
                      </PanelResizeHandle>
                      
                      {/* Terminal Panel */}
                      <Panel defaultSize={35} minSize={15}>
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
                <PreviewPanel />
              }
            />
          </div>
          
          {/* Status Bar */}
          <StatusBarCore />
        </div>
      </EnhancedSupervisionProvider>
    </SessionProvider>
  );
}