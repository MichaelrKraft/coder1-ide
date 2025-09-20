'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// Import core IDE components
import { ThreePanelLayout } from '@/components/layout/ThreePanelLayout';
import LeftPanel from '@/components/LeftPanel';
import MonacoEditor from '@/components/editor/MonacoEditor';
import TerminalContainer from '@/components/terminal/TerminalContainer';
import StatusBarCore from '@/components/status-bar/StatusBarCore';

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
                  {/* Editor Area */}
                  <div className="flex-1 min-h-0">
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
                  
                  {/* Terminal Area */}
                  {terminalVisible && (
                    <div className="h-[300px] border-t border-border-default">
                      <TerminalContainer
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
                <div className="h-full p-4 bg-bg-secondary">
                  <h3 className="text-text-primary text-sm font-semibold mb-2">AI Assistant</h3>
                  <p className="text-text-muted text-xs">
                    Type "claude" in the terminal to connect your Claude CLI via the bridge.
                  </p>
                </div>
              }
            />
          </div>

          {/* Status Bar */}
          <StatusBarCore 
            onToggleTerminal={() => setTerminalVisible(!terminalVisible)}
          />
        </div>
      </EnhancedSupervisionProvider>
    </SessionProvider>
  );
}