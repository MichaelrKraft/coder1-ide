'use client';

import React, { useState, useCallback } from 'react';
import { X, FolderOpen } from 'lucide-react';
import Terminal from './Terminal';

export interface SandboxSession {
  id: string;
  name: string;
  checkpointData: any;
  terminalHistory?: string;
  createdAt: Date;
}

interface TerminalContainerProps {
  onAgentsSpawn?: () => void;
  onTerminalClick?: () => void;
  onClaudeTyped?: () => void;
  onTerminalData?: (data: string) => void;
  onTerminalCommand?: (command: string) => void;
  onTerminalReady?: (sessionId: any, ready: any) => void;
}

export default function TerminalContainer({
  onAgentsSpawn,
  onTerminalClick,
  onClaudeTyped,
  onTerminalData,
  onTerminalCommand,
  onTerminalReady
}: TerminalContainerProps) {
  const [activeTab, setActiveTab] = useState<'main' | 'sandbox'>('main');
  const [sandboxSession, setSandboxSession] = useState<SandboxSession | null>(null);

  // Handle creating a sandbox from checkpoint data
  const createSandbox = useCallback((checkpointData: any) => {
    const sandbox: SandboxSession = {
      id: `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: checkpointData.name || `Checkpoint ${new Date().toLocaleDateString('en-US')} ${new Date().toLocaleTimeString()}`,
      checkpointData: checkpointData.checkpointData || checkpointData, // Handle nested structure
      terminalHistory: checkpointData.terminalHistory || '', // Store terminal history
      createdAt: new Date()
    };
    
    setSandboxSession(sandbox);
    setActiveTab('sandbox');
    
    console.log('🏖️ Sandbox created:', sandbox.id, 'with terminal history length:', sandbox.terminalHistory?.length);
  }, []);

  // Handle closing the sandbox
  const closeSandbox = useCallback(() => {
    if (sandboxSession) {
      console.log('🗑️ Closing sandbox:', sandboxSession.id);
      setSandboxSession(null);
      setActiveTab('main');
    }
  }, [sandboxSession]);

  // Handle copying commands from sandbox to main terminal
  const handleCopyToMain = useCallback((command: string) => {
    console.log('📋 Copying command to main terminal:', command);
    
    // Create a custom event to send the command to the main terminal
    const copyEvent = new CustomEvent('terminal:copyFromSandbox', {
      detail: { command, from: sandboxSession?.id }
    });
    window.dispatchEvent(copyEvent);
    
    // Optionally switch to main tab to show the command
    setActiveTab('main');
  }, [sandboxSession]);

  // Listen for sandbox creation and action events
  React.useEffect(() => {
    const handleCreateSandbox = (event: CustomEvent) => {
      createSandbox(event.detail);
    };
    
    // Removed handleCopyToMainFromSandbox - Copy to Main button removed to prevent server crashes
    // Users can manually copy/paste instead
    
    const handleExtractCommands = (event: CustomEvent) => {
      const { commands } = event.detail;
      if (commands && commands.length > 0) {
        // Show commands in a modal or inject them for replay
        console.log('📝 Extracted Claude commands:', commands);
        // For now, we'll inject the first command as an example
        // In a full implementation, you might show a modal to select which commands to run
        if (commands.length > 0) {
          window.dispatchEvent(new CustomEvent('terminal:injectCommand', {
            detail: { command: commands[0].command }
          }));
          setActiveTab('main');
        }
      }
    };
    
    const handleCloseSandbox = () => {
      closeSandbox();
    };

    window.addEventListener('terminal:createSandbox', handleCreateSandbox as EventListener);
    window.addEventListener('sandbox:extractCommands', handleExtractCommands as EventListener);
    window.addEventListener('sandbox:close', handleCloseSandbox as EventListener);
    
    return () => {
      window.removeEventListener('terminal:createSandbox', handleCreateSandbox as EventListener);
      window.removeEventListener('sandbox:extractCommands', handleExtractCommands as EventListener);
      window.removeEventListener('sandbox:close', handleCloseSandbox as EventListener);
    };
  }, [createSandbox, closeSandbox]);

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="flex border-b border-border-default bg-bg-secondary">
        {/* Main Terminal Tab */}
        <button
          className={`px-4 py-2 text-sm transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'main'
              ? 'bg-bg-primary text-text-primary border-b-2 border-coder1-cyan'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          }`}
          onClick={() => setActiveTab('main')}
          title="Main Terminal - Your active development environment"
        >
          <span className="text-xs">📟</span>
          <span>Main Terminal</span>
        </button>

        {/* Sandbox Terminal Tab (only shown when sandbox exists) */}
        {sandboxSession && (
          <div
            className={`flex items-center gap-2 text-sm transition-all duration-200 relative ${
              activeTab === 'sandbox'
                ? 'bg-bg-primary text-text-primary border-b-2 border-orange-400'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <button
              className="px-4 py-2 flex items-center gap-2 flex-1"
              onClick={() => setActiveTab('sandbox')}
              title={`Checkpoint Sandbox - ${sandboxSession.name}`}
            >
              <FolderOpen className="w-3 h-3 text-orange-400" />
              <span className="truncate max-w-40">Sandbox Terminal</span>
            </button>
            
            {/* Close button - separate from main tab button */}
            <button
              className="p-1.5 mr-2 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                closeSandbox();
              }}
              title="Close sandbox"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Tab bar spacer */}
        <div className="flex-1 bg-bg-secondary"></div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'main' && (
          <Terminal
            key="main-terminal"
            onAgentsSpawn={onAgentsSpawn}
            onTerminalClick={onTerminalClick}
            onClaudeTyped={onClaudeTyped}
            onTerminalData={onTerminalData}
            onTerminalCommand={onTerminalCommand}
            onTerminalReady={onTerminalReady}
          />
        )}
        
        {activeTab === 'sandbox' && sandboxSession && (
          <Terminal
            key={`sandbox-${sandboxSession.id}`}
            onAgentsSpawn={onAgentsSpawn}
            onTerminalClick={onTerminalClick}
            onClaudeTyped={onClaudeTyped}
            onTerminalData={onTerminalData}
            onTerminalCommand={onTerminalCommand}
            onTerminalReady={onTerminalReady}
            sandboxMode={true}
            sandboxSession={sandboxSession}
          />
        )}
      </div>
    </div>
  );
}