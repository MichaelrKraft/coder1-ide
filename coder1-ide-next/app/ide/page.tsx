'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

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
                <div className="h-full flex flex-col">
                  {/* Editor Area - takes remaining space after terminal */}
                  <div className={terminalVisible ? "flex-1 min-h-0 overflow-hidden" : "h-full"}>
                    <MonacoEditor
                      value={activeFile ? (files[activeFile] || '') : '// Welcome to Coder1 IDE\n// Type "claude" in the terminal below to get started!'}
                      onChange={(value) => {
                        if (activeFile && value !== undefined) {
                          handleFileChange(activeFile, value);
                        }
                      }}
                      language="typescript"
                      theme="tokyo-night"
                    />
                  </div>
                  
                  {/* Terminal Area - fixed height at bottom */}
                  {terminalVisible && (
                    <div className="h-[350px] min-h-[200px] border-t-2 border-coder1-cyan/50 bg-bg-primary">
                      <LazyTerminalContainer
                        onAgentsSpawn={handleAgentsSpawn}
                        onTerminalClick={handleTerminalClick}
                        onClaudeTyped={handleClaudeTyped}
                        onTerminalData={handleTerminalData}
                        onTerminalCommand={handleTerminalCommand}
                        onTerminalReady={handleTerminalReady}
                      />
                    </div>
                  )}
                </div>
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