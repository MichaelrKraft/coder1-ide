'use client';

import React, { useState } from 'react';

// Import core IDE components  
import TerminalContainer from '@/components/terminal/TerminalContainer';

// Import required providers
import { EnhancedSupervisionProvider } from '@/contexts/EnhancedSupervisionContext';

export default function IDEPage() {
  // Terminal state
  const [agentsActive, setAgentsActive] = useState(false);

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

  return (
    <EnhancedSupervisionProvider>
      <div className="h-screen w-full flex flex-col bg-bg-primary">
        {/* Header */}
        <div className="bg-bg-secondary border-b border-border-default p-4">
          <h1 className="text-text-primary text-lg font-semibold">Coder1 IDE - Phase 2 Agent Terminals</h1>
          <p className="text-text-muted text-sm">Agent terminal tabs implementation - Step 1: Basic terminal rendering</p>
        </div>
        
        {/* Terminal Container */}
        <div className="flex-1 min-h-0">
          <TerminalContainer
            onAgentsSpawn={handleAgentsSpawn}
            onTerminalClick={handleTerminalClick}
            onClaudeTyped={handleClaudeTyped}
            onTerminalData={handleTerminalData}
            onTerminalCommand={handleTerminalCommand}
            onTerminalReady={handleTerminalReady}
          />
        </div>
      </div>
    </EnhancedSupervisionProvider>
  );
}