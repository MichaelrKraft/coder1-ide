'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, FolderOpen, Code2, Server, Database, CheckCircle, Cloud, Monitor } from 'lucide-react';
import Terminal from './Terminal';

export interface SandboxSession {
  id: string;
  name: string;
  checkpointData: any;
  terminalHistory?: string;
  createdAt: Date;
}

// Agent Terminal Tab Types - New feature (Phase 1)
export type AgentRole = 'frontend' | 'backend' | 'database' | 'testing' | 'devops' | 'fullstack';

export interface AgentSession {
  id: string;
  name: string;
  role: AgentRole;
  teamId: string;
  workTreePath?: string;
  terminalHistory?: string;
  status: 'initializing' | 'working' | 'waiting' | 'completed' | 'error';
  progress: number;
  currentTask: string;
  createdAt: Date;
  processId?: number;
}

export interface TerminalSession {
  id: string;
  type: 'main' | 'sandbox' | 'agent';
  name: string;
  data?: SandboxSession | AgentSession;
  isActive: boolean;
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
  
  // Track created sandboxes to prevent duplicates
  const createdSandboxesRef = useRef<Set<string>>(new Set());
  
  // Agent Tabs Feature (Phase 1) - Only active when feature flag enabled
  // Initialize to false, will be set in useEffect to avoid SSR issues
  const [agentTabsEnabled, setAgentTabsEnabled] = useState(false);
  const [agentSessions, setAgentSessions] = useState<Map<string, AgentSession>>(new Map());
  // Initialize activeSessionId to 'main' to ensure terminal always renders
  const [activeSessionId, setActiveSessionId] = useState<string>('main');
  
  // Set agent tabs enabled on client side only
  // Enable multi-Claude tabs (simplified from agent tabs)
  useEffect(() => {
    // Always enable for multi-Claude functionality
    setAgentTabsEnabled(true);
  }, []);

  // Agent role styling helper (Phase 1)
  const getAgentRoleStyle = (role: AgentRole) => {
    const styles = {
      frontend: { icon: Monitor, color: 'blue-500', borderColor: 'border-blue-400' },
      backend: { icon: Server, color: 'green-500', borderColor: 'border-green-400' },
      database: { icon: Database, color: 'purple-500', borderColor: 'border-purple-400' },
      testing: { icon: CheckCircle, color: 'yellow-500', borderColor: 'border-yellow-400' },
      devops: { icon: Cloud, color: 'orange-500', borderColor: 'border-orange-400' },
      fullstack: { icon: Code2, color: 'gray-500', borderColor: 'border-gray-400' }
    };
    return styles[role] || styles.fullstack;
  };

  // Handle creating a sandbox from checkpoint data
  const createSandbox = useCallback((checkpointData: any) => {
    // Generate a unique ID for this checkpoint based on its data
    const checkpointId = checkpointData.originalCheckpoint?.id || 
                        checkpointData.checkpointData?.timestamp || 
                        checkpointData.timestamp || 
                        JSON.stringify(checkpointData).substring(0, 100);
    
    // Check if we've already created a sandbox for this checkpoint
    if (createdSandboxesRef.current.has(checkpointId)) {
      console.log('⚠️ Sandbox already created for checkpoint:', checkpointId);
      // Just switch to the existing sandbox tab
      setActiveTab('sandbox');
      return;
    }
    
    // Mark this checkpoint as having a sandbox
    createdSandboxesRef.current.add(checkpointId);
    
    // Extract terminal history from multiple possible locations for backward compatibility
    const extractTerminalHistory = (data: any): string => {
      // New format: top-level terminalHistory field
      if (data.terminalHistory && typeof data.terminalHistory === 'string') {
        console.log('📋 Found terminal history in top-level field, length:', data.terminalHistory.length);
        return data.terminalHistory;
      }
      
      // New format: data.terminalHistory field
      if (data.data?.terminalHistory && typeof data.data.terminalHistory === 'string') {
        console.log('📋 Found terminal history in data.terminalHistory field, length:', data.data.terminalHistory.length);
        return data.data.terminalHistory;
      }
      
      // Legacy format: data.snapshot.terminal field
      if (data.data?.snapshot?.terminal && typeof data.data.snapshot.terminal === 'string') {
        console.log('📋 Found terminal history in legacy data.snapshot.terminal field, length:', data.data.snapshot.terminal.length);
        return data.data.snapshot.terminal;
      }
      
      // Direct snapshot.terminal (for older checkpoints)
      if (data.snapshot?.terminal && typeof data.snapshot.terminal === 'string') {
        console.log('📋 Found terminal history in direct snapshot.terminal field, length:', data.snapshot.terminal.length);
        return data.snapshot.terminal;
      }
      
      console.log('⚠️ No terminal history found in checkpoint data. Available fields:', Object.keys(data));
      if (data.data) {
        console.log('📋 Data fields available:', Object.keys(data.data));
        if (data.data.snapshot) {
          console.log('📋 Snapshot fields available:', Object.keys(data.data.snapshot));
        }
      }
      return '';
    };
    
    const terminalHistory = extractTerminalHistory(checkpointData);
    
    const sandbox: SandboxSession = {
      id: `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: checkpointData.name || `Checkpoint ${new Date().toLocaleDateString('en-US')} ${new Date().toLocaleTimeString()}`,
      checkpointData: checkpointData.checkpointData || checkpointData, // Handle nested structure
      terminalHistory: terminalHistory, // Store extracted terminal history
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
      
      // Clear the checkpoint ID from our tracking set
      const checkpointId = sandboxSession.checkpointData?.originalCheckpoint?.id || 
                          sandboxSession.checkpointData?.timestamp || 
                          JSON.stringify(sandboxSession.checkpointData).substring(0, 100);
      createdSandboxesRef.current.delete(checkpointId);
      
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

  // Agent Session Management (Phase 1) - Feature flagged
  const createAgentSession = useCallback((agentData: any) => {
    if (!agentTabsEnabled) return;
    
    const agentSession: AgentSession = {
      id: agentData.id || `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: agentData.name || `${agentData.role} Agent`,
      role: agentData.role || 'fullstack',
      teamId: agentData.teamId,
      workTreePath: agentData.workTreePath,
      terminalHistory: agentData.terminalHistory || '',
      status: agentData.status || 'initializing',
      progress: agentData.progress || 0,
      currentTask: agentData.currentTask || 'Setting up workspace...',
      createdAt: new Date(),
      processId: agentData.processId
    };
    
    setAgentSessions(prev => new Map(prev).set(agentSession.id, agentSession));
    console.log('🤖 Agent session created:', agentSession.id, agentSession.role);
  }, [agentTabsEnabled]);

  const closeAgentSession = useCallback((agentId: string) => {
    if (!agentTabsEnabled) return;
    
    setAgentSessions(prev => {
      const newSessions = new Map(prev);
      newSessions.delete(agentId);
      return newSessions;
    });
    
    // Switch to main if this was the active agent
    if (activeSessionId === agentId) {
      setActiveSessionId('main');
    }
    
    console.log('🗑️ Agent session closed:', agentId);
  }, [agentTabsEnabled, activeSessionId]);

  // Create a new Claude tab - simple multi-Claude implementation
  const createNewClaudeTab = useCallback(async () => {
    const claudeNumber = Array.from(agentSessions.values()).filter(
      s => s && s.name && s.name.startsWith('Claude')
    ).length + 1;
    
    const claudeSession: AgentSession = {
      id: `claude_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Claude ${claudeNumber}`,
      role: 'fullstack', // Use fullstack as default for Claude tabs
      teamId: 'claude-multi',
      terminalHistory: '',
      status: 'initializing',
      progress: 0,
      currentTask: 'Starting Claude CLI...',
      createdAt: new Date()
    };
    
    // Add the session to our tabs
    setAgentSessions(prev => new Map(prev).set(claudeSession.id, claudeSession));
    setActiveSessionId(claudeSession.id);
    
    console.log('✨ New Claude tab created:', claudeSession.name);
    
    // The Terminal component will handle creating the actual terminal session
    // and auto-running the 'claude' command when it mounts
  }, [agentSessions]);

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

    // Agent session event handlers (Phase 1)
    const handleCreateAgentSession = (event: CustomEvent) => {
      if (agentTabsEnabled) {
        createAgentSession(event.detail);
      }
    };

    const handleCloseAgentSession = (event: CustomEvent) => {
      if (agentTabsEnabled && event.detail.agentId) {
        closeAgentSession(event.detail.agentId);
      }
    };

    window.addEventListener('terminal:createSandbox', handleCreateSandbox as EventListener);
    window.addEventListener('sandbox:extractCommands', handleExtractCommands as EventListener);
    window.addEventListener('sandbox:close', handleCloseSandbox as EventListener);
    
    // Agent session event listeners (Phase 1)
    if (agentTabsEnabled) {
      window.addEventListener('terminal:createAgentSession', handleCreateAgentSession as EventListener);
      window.addEventListener('agent:close', handleCloseAgentSession as EventListener);
    }
    
    return () => {
      window.removeEventListener('terminal:createSandbox', handleCreateSandbox as EventListener);
      window.removeEventListener('sandbox:extractCommands', handleExtractCommands as EventListener);
      window.removeEventListener('sandbox:close', handleCloseSandbox as EventListener);
      
      if (agentTabsEnabled) {
        window.removeEventListener('terminal:createAgentSession', handleCreateAgentSession as EventListener);
        window.removeEventListener('agent:close', handleCloseAgentSession as EventListener);
      }
    };
  }, [createSandbox, closeSandbox, agentTabsEnabled, createAgentSession, closeAgentSession]);

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="flex border-b border-border-default bg-bg-secondary">
        {/* Main Terminal Tab */}
        <button
          className={`px-4 py-2 text-sm transition-all duration-200 flex items-center gap-2 ${
            (!agentTabsEnabled && activeTab === 'main') || (agentTabsEnabled && activeSessionId === 'main')
              ? 'bg-bg-primary text-text-primary border-b-2 border-coder1-cyan'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          }`}
          onClick={() => {
            if (agentTabsEnabled) {
              setActiveSessionId('main');
            } else {
              setActiveTab('main');
            }
          }}
          title="Main Terminal - Your active development environment"
        >
          <span className="text-xs">📟</span>
          <span>Main Terminal</span>
        </button>

        {/* Sandbox Terminal Tab (only shown when sandbox exists) */}
        {sandboxSession && (
          <div
            className={`flex items-center gap-2 text-sm transition-all duration-200 relative ${
              (!agentTabsEnabled && activeTab === 'sandbox') || (agentTabsEnabled && activeSessionId === 'sandbox')
                ? 'bg-bg-primary text-text-primary border-b-2 border-orange-400'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <button
              className="px-4 py-2 flex items-center gap-2 flex-1"
              onClick={() => {
                if (agentTabsEnabled) {
                  setActiveSessionId('sandbox');
                } else {
                  setActiveTab('sandbox');
                }
              }}
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

        {/* Agent Terminal Tabs (Phase 1) - Only shown when feature flag enabled */}
        {agentTabsEnabled && Array.from(agentSessions.values()).map((agent) => {
          const roleStyle = getAgentRoleStyle(agent.role);
          const IconComponent = roleStyle.icon;
          const isActive = activeSessionId === agent.id;
          
          return (
            <div
              key={agent.id}
              className={`flex items-center gap-2 text-sm transition-all duration-200 relative ${
                isActive
                  ? `bg-bg-primary text-text-primary border-b-2 ${roleStyle.borderColor}`
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <button
                className="px-4 py-2 flex items-center gap-2 flex-1"
                onClick={() => setActiveSessionId(agent.id)}
                title={`${agent.role} Agent - ${agent.currentTask}`}
              >
                <IconComponent className={`w-3 h-3 text-${roleStyle.color}`} />
                <span className="truncate max-w-32">{agent.name}</span>
                {agent.status === 'working' && (
                  <div className={`w-2 h-2 rounded-full bg-${roleStyle.color} animate-pulse`} />
                )}
              </button>
              
              {/* Close button */}
              <button
                className="p-1.5 mr-2 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  closeAgentSession(agent.id);
                }}
                title="Close agent"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* New Claude Tab Button */}
        <button
          className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 flex items-center gap-2 border-l border-border-default"
          onClick={createNewClaudeTab}
          title="Open a new Claude CLI session"
        >
          <span className="text-xs">➕</span>
          <span>New Claude Tab</span>
        </button>

        {/* Tab bar spacer */}
        <div className="flex-1 bg-bg-secondary"></div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 min-h-0">
        {/* Main Terminal - Always mounted, visibility controlled by CSS */}
        <div style={{ display: activeSessionId === 'main' ? 'block' : 'none', height: '100%' }}>
          <Terminal
            key="main-terminal"
            onAgentsSpawn={onAgentsSpawn}
            onTerminalClick={onTerminalClick}
            onClaudeTyped={onClaudeTyped}
            onTerminalData={onTerminalData}
            onTerminalCommand={onTerminalCommand}
            onTerminalReady={onTerminalReady}
            isVisible={activeSessionId === 'main'}
          />
        </div>
        
        {/* Sandbox Terminal - Mounted when exists, visibility controlled by CSS */}
        {sandboxSession && (
          <div style={{ display: activeSessionId === 'sandbox' ? 'block' : 'none', height: '100%' }}>
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
              isVisible={activeSessionId === 'sandbox'}
            />
          </div>
        )}
        
        {/* Agent Terminals - Interactive mode (Phase 2) */}
        {agentTabsEnabled && Array.from(agentSessions.values()).map((agent) => (
          <div 
            key={`agent-container-${agent.id}`}
            style={{ display: activeSessionId === agent.id ? 'block' : 'none', height: '100%' }}
          >
            <Terminal
              key={`agent-${agent.id}`}
              onAgentsSpawn={onAgentsSpawn}
              onTerminalClick={onTerminalClick}
              onClaudeTyped={onClaudeTyped}
              onTerminalData={onTerminalData}
              onTerminalCommand={onTerminalCommand}
              onTerminalReady={onTerminalReady}
              sandboxMode={false} // Phase 2: Enable interactive mode for agent terminals
              agentMode={true} // New prop to indicate this is an agent terminal
              agentSession={{
                id: agent.id,
                name: agent.name,
                role: agent.role,
                teamId: agent.teamId,
                terminalHistory: agent.terminalHistory,
                status: agent.status,
                progress: agent.progress,
                currentTask: agent.currentTask,
                createdAt: agent.createdAt
              }}
              isVisible={activeSessionId === agent.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}