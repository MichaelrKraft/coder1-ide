'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useMissionControlStore, DashboardMode } from '@/stores/useMissionControlStore';
import ParallelExplorationModal from '@/components/sandbox/ParallelExplorationModal';
import AgentKanbanBoard from './AgentKanbanBoard';
import { getSocket } from '@/lib/socket';
import { extractTerminalContext } from '@/lib/terminal-context';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'thinking' | 'working' | 'completed' | 'error';
  progress: number;
  currentTask: string;
  icon: string;
}

// Agent role to icon mapping
const AGENT_ICONS: Record<string, string> = {
  frontend: '🎨',
  backend: '⚙️',
  fullstack: '🔧',
  testing: '🧪',
  devops: '🚀',
  architect: '📐',
  default: '🤖'
};

/**
 * Agent Dashboard Panel - The PRIMARY Mission Control feature
 *
 * 3 Modes:
 * - SETUP: Shows two cards (AI Team / Parallel Exploration)
 * - MONITORING: Real-time agent progress and activity
 * - RESULTS: Preview variations and adopt button
 */
export default function AgentDashboardPanel() {
  const {
    dashboardMode,
    activeAgents,
    explorationResults,
    setDashboardMode,
    startMonitoring,
    completeExploration
  } = useMissionControlStore();

  // State for modals and inline config
  const [showParallelModal, setShowParallelModal] = useState(false);
  const [showAITeamConfig, setShowAITeamConfig] = useState(false);
  const [aiTeamTask, setAiTeamTask] = useState('');
  const [isSpawning, setIsSpawning] = useState(false);
  const [spawnError, setSpawnError] = useState<string | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);

  // Handle parallel exploration start
  const handleParallelStart = (config: { task: string; count: number; budget: string }) => {
    console.log('[AgentDashboard] Starting parallel exploration:', config);
    setShowParallelModal(false);

    // Create mock agents for demo
    const agents = Array.from({ length: config.count }, (_, i) => ({
      id: `agent-${i + 1}`,
      name: `Variation ${i + 1}`,
      role: `Strategy ${i + 1}`,
      status: 'working' as const,
      progress: 0,
      currentTask: `Exploring approach ${i + 1}...`,
      icon: ['🎨', '🔧', '📐', '⚡', '🌟'][i % 5]
    }));

    startMonitoring(agents);
  };

  // Handle AI Team start - calls real /api/claude-bridge/spawn endpoint
  // NOW WITH CONTEXT BRIDGE: Extracts terminal history and passes to agents
  const handleAITeamStart = async () => {
    if (!aiTeamTask.trim()) return;

    console.log('[AgentDashboard] Starting AI Team:', aiTeamTask);
    setIsSpawning(true);
    setSpawnError(null);
    setShowAITeamConfig(false);

    // CONTEXT BRIDGE: Extract terminal context from localStorage
    // This reads from localStorage.mainTerminalHistory which Terminal.tsx already populates
    const conversationContext = extractTerminalContext();

    console.log('📝 [CONTEXT BRIDGE] Captured context:', {
      hasContext: conversationContext.hasContext,
      historyLength: conversationContext.historyLength,
      commandCount: conversationContext.commandCount
    });

    try {
      const response = await fetch('/api/claude-bridge/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: aiTeamTask,
          sessionId: `team-${Date.now()}`,
          // ORCHESTRATOR PATTERN: Pass terminal context to agents
          conversationContext: conversationContext
        })
      });

      const data = await response.json();
      console.log('[AgentDashboard] Spawn response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to spawn AI team');
      }

      // Check if setup is required (OAuth token missing)
      if (data.setupRequired || data.fallbackMode) {
        setSpawnError(data.message || 'OAuth setup required - see terminal for instructions');
        setIsSpawning(false);
        return;
      }

      // Store team ID for WebSocket event filtering
      setCurrentTeamId(data.teamId);

      // Convert API response agents to our Agent format
      const agents: Agent[] = (data.agents || []).map((agent: any) => ({
        id: agent.id || agent.agentId,
        name: agent.name,
        role: agent.role,
        status: agent.status === 'running' ? 'working' : agent.status,
        progress: agent.progress || 0,
        currentTask: agent.currentTask || 'Starting...',
        icon: AGENT_ICONS[agent.role] || AGENT_ICONS.default
      }));

      // Start monitoring with real agent data
      startMonitoring(agents);
      setIsSpawning(false);

    } catch (error) {
      console.error('[AgentDashboard] Spawn error:', error);
      setSpawnError(error instanceof Error ? error.message : 'Failed to spawn AI team');
      setIsSpawning(false);
    }
  };

  // Activity stream state for real-time logs
  const [activityStream, setActivityStream] = useState<string[]>([]);

  // View mode state for Cards vs Kanban toggle
  const [viewMode, setViewMode] = useState<'cards' | 'kanban'>('cards');

  // WebSocket event listeners for REAL agent progress
  useEffect(() => {
    if (dashboardMode !== 'monitoring') return;

    let socket: any = null;
    let isActive = true;

    const setupSocket = async () => {
      try {
        socket = await getSocket();
        if (!socket || !isActive) return;

        // Listen for team progress updates (forwarded from WebSocketEventBridge)
        socket.on('ai-team:progress', (data: { teamId: string; agents: any[]; progress: number; activeAgents?: number }) => {
          if (currentTeamId && data.teamId !== currentTeamId) return;

          const store = useMissionControlStore.getState();
          const updatedAgents = data.agents.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            role: agent.role,
            status: agent.status === 'working' ? 'working' : agent.status === 'completed' ? 'completed' : 'idle',
            progress: agent.progress || 0,
            currentTask: agent.currentTask || 'Working...',
            icon: AGENT_ICONS[agent.role] || AGENT_ICONS.default
          }));
          store.setActiveAgents(updatedAgents);
          setActivityStream(prev => [...prev.slice(-9), `📊 Team progress: ${Math.round(data.progress)}%`]);
        });

        // Also listen for individual agent progress (direct events)
        socket.on('agent:progress', (data: { agentId: string; progress: number; currentTask: string; teamId?: string }) => {
          if (currentTeamId && data.teamId && data.teamId !== currentTeamId) return;

          const store = useMissionControlStore.getState();
          const updatedAgents = store.activeAgents.map(agent =>
            agent.id === data.agentId
              ? { ...agent, progress: data.progress, currentTask: data.currentTask }
              : agent
          );
          store.setActiveAgents(updatedAgents);
          setActivityStream(prev => [...prev.slice(-9), `[${data.agentId}] ${data.currentTask}`]);
        });

        // Listen for agent output streaming
        socket.on('agent:output', (data: { agentId: string; output: string; teamId?: string }) => {
          if (currentTeamId && data.teamId && data.teamId !== currentTeamId) return;
          setActivityStream(prev => [...prev.slice(-9), `[${data.agentId}] ${data.output.slice(0, 100)}`]);
        });

        // Listen for team completion (forwarded from WebSocketEventBridge)
        socket.on('ai-team:completed', (data: { teamId: string; agents: any[]; duration?: number; generatedFiles?: number }) => {
          if (currentTeamId && data.teamId !== currentTeamId) return;

          setActivityStream(prev => [...prev.slice(-9), `🎉 AI Team completed! ${data.generatedFiles || 0} files generated`]);
          completeExploration(data.agents.map((a: any) => ({
            agentId: a.id,
            name: a.name,
            preview: `/api/preview/${a.id}`
          })));
        });

        // Also listen for direct team:completed events
        socket.on('team:completed', (data: { teamId: string; summary?: string; agents?: any[] }) => {
          if (currentTeamId && data.teamId !== currentTeamId) return;
          if (!data.agents) return; // Skip if no agents data

          setActivityStream(prev => [...prev.slice(-9), `🎉 AI Team completed!`]);
          completeExploration(data.agents.map((a: any) => ({
            agentId: a.id || a.agentId,
            name: a.name,
            preview: `/api/preview/${a.id || a.agentId}`
          })));
        });

        // Listen for agent errors
        socket.on('agent:error', (data: { agentId: string; error: string; teamId?: string }) => {
          if (currentTeamId && data.teamId && data.teamId !== currentTeamId) return;

          const store = useMissionControlStore.getState();
          const updatedAgents = store.activeAgents.map(agent =>
            agent.id === data.agentId
              ? { ...agent, status: 'error' as const, currentTask: `❌ ${data.error}` }
              : agent
          );
          store.setActiveAgents(updatedAgents);
          setActivityStream(prev => [...prev.slice(-9), `❌ [${data.agentId}] Error: ${data.error}`]);
        });

        console.log('[AgentDashboard] WebSocket listeners attached for team:', currentTeamId);

      } catch (error) {
        console.error('[AgentDashboard] Failed to setup WebSocket:', error);
      }
    };

    setupSocket();

    return () => {
      isActive = false;
      if (socket) {
        socket.off('ai-team:progress');
        socket.off('agent:progress');
        socket.off('agent:output');
        socket.off('ai-team:completed');
        socket.off('team:completed');
        socket.off('agent:error');
        console.log('[AgentDashboard] WebSocket listeners removed');
      }
    };
  }, [dashboardMode, currentTeamId, completeExploration]);

  // ============================================================================
  // SETUP MODE - Show two option cards
  // ============================================================================
  const renderSetupMode = () => (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-coder1-cyan mb-2">Agent Dashboard</h2>
        <p className="text-text-secondary">Choose how to spawn AI agents for your project</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
        {/* AI Team Card */}
        <div
          className={`bg-bg-secondary border rounded-lg p-6 cursor-pointer transition-all hover:border-coder1-cyan/50 hover:shadow-glow-cyan ${
            showAITeamConfig ? 'border-coder1-cyan' : 'border-border-default'
          }`}
          onClick={() => !showAITeamConfig && setShowAITeamConfig(true)}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🤖</span>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">AI Team</h3>
              <p className="text-sm text-text-muted">Specialized agents working together</p>
            </div>
          </div>

          <p className="text-text-secondary text-sm mb-4">
            Spawn Frontend, Backend, and other specialized agents to build your project collaboratively.
          </p>

          {showAITeamConfig ? (
            <div className="space-y-4" onClick={e => e.stopPropagation()}>
              <textarea
                value={aiTeamTask}
                onChange={e => setAiTeamTask(e.target.value)}
                placeholder="Describe your project..."
                className="w-full h-24 px-3 py-2 bg-bg-primary border border-border-default rounded text-text-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-coder1-cyan/50"
                disabled={isSpawning}
              />
              {spawnError && (
                <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
                  {spawnError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAITeamConfig(false); setSpawnError(null); }}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                  disabled={isSpawning}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAITeamStart}
                  disabled={!aiTeamTask.trim() || isSpawning}
                  className="px-4 py-2 bg-coder1-cyan text-black text-sm font-medium rounded disabled:opacity-50 flex items-center gap-2"
                >
                  {isSpawning ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Spawning...
                    </>
                  ) : (
                    'Start AI Team'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button className="text-coder1-cyan text-sm font-medium hover:underline">
              Configure →
            </button>
          )}
        </div>

        {/* Parallel Exploration Card */}
        <div
          className="bg-bg-secondary border border-border-default rounded-lg p-6 cursor-pointer transition-all hover:border-coder1-cyan/50 hover:shadow-glow-cyan"
          onClick={() => setShowParallelModal(true)}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔀</span>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Parallel Exploration</h3>
              <p className="text-sm text-text-muted">Multiple variations of the same thing</p>
            </div>
          </div>

          <p className="text-text-secondary text-sm mb-4">
            Spawn 2-5 agents to explore different approaches to your task. Compare and choose the best one.
          </p>

          <button className="text-coder1-cyan text-sm font-medium hover:underline">
            Configure →
          </button>
        </div>
      </div>

      {/* Parallel Exploration Modal */}
      <ParallelExplorationModal
        isOpen={showParallelModal}
        onClose={() => setShowParallelModal(false)}
        onStart={handleParallelStart}
      />
    </div>
  );

  // ============================================================================
  // MONITORING MODE - Real-time agent progress
  // ============================================================================
  const renderMonitoringMode = () => (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-coder1-cyan mb-1">Agents Working</h2>
          <p className="text-text-secondary text-sm">
            {activeAgents.filter(a => a.status === 'working').length} of {activeAgents.length} agents active
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border-default">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-coder1-cyan text-black'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-coder1-cyan text-black'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              Kanban
            </button>
          </div>
          <div className="text-right">
            <div className="text-sm text-text-muted">Overall Progress</div>
            <div className="text-2xl font-bold text-coder1-cyan">
              {Math.round(activeAgents.reduce((sum, a) => sum + a.progress, 0) / activeAgents.length || 0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Agent View - Cards or Kanban */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto">
          {activeAgents.map(agent => (
            <div
              key={agent.id}
              className="bg-bg-secondary border border-border-default rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{agent.icon}</span>
                  <div>
                    <h4 className="font-medium text-text-primary">{agent.name}</h4>
                    <p className="text-xs text-text-muted">{agent.role}</p>
                  </div>
                </div>
                <div className={`text-xs font-medium px-2 py-1 rounded ${
                  agent.status === 'completed'
                    ? 'bg-green-500/20 text-green-400'
                    : agent.status === 'working'
                    ? 'bg-coder1-cyan/20 text-coder1-cyan'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {agent.status === 'completed' ? '✓ Done' : 'Working'}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    agent.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-gradient-to-r from-coder1-cyan to-blue-500'
                  }`}
                  style={{ width: `${agent.progress}%` }}
                />
              </div>

              <p className="text-xs text-text-secondary">{agent.currentTask}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <AgentKanbanBoard agents={activeAgents} />
        </div>
      )}

      {/* Activity Stream */}
      <div className="mt-4 p-4 bg-bg-tertiary rounded-lg border border-border-default">
        <h4 className="text-sm font-medium text-text-primary mb-2">Activity Stream</h4>
        <div className="text-xs text-text-muted font-mono space-y-1 max-h-32 overflow-y-auto">
          {activityStream.length > 0 ? (
            activityStream.map((line, idx) => (
              <div key={idx} className={line.startsWith('✅') ? 'text-green-400' : line.startsWith('❌') ? 'text-red-400' : 'text-coder1-cyan/80'}>
                {line}
              </div>
            ))
          ) : (
            <div className="text-green-400">▶ Waiting for agent activity...</div>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RESULTS MODE - Preview and adopt
  // ============================================================================
  const renderResultsMode = () => (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-green-400 mb-2">✓ Exploration Complete</h2>
        <p className="text-text-secondary">Review the variations and adopt your favorite</p>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto">
        {explorationResults.map((result, index) => (
          <div
            key={result.agentId}
            className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden hover:border-coder1-cyan/50 transition-all"
          >
            {/* Preview Thumbnail */}
            <div className="h-32 bg-bg-tertiary flex items-center justify-center">
              <span className="text-4xl opacity-50">📄</span>
            </div>

            <div className="p-4">
              <h4 className="font-medium text-text-primary mb-2">{result.name}</h4>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-coder1-cyan text-black text-sm font-medium rounded hover:bg-coder1-cyan/80">
                  Adopt This
                </button>
                <button className="px-3 py-2 border border-border-default text-text-secondary text-sm rounded hover:border-coder1-cyan/50">
                  Preview
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 flex justify-between items-center p-4 bg-bg-tertiary rounded-lg border border-border-default">
        <button
          onClick={() => setDashboardMode('setup')}
          className="text-text-secondary hover:text-text-primary text-sm"
        >
          ← Start New Exploration
        </button>
        <button className="px-4 py-2 border border-coder1-cyan text-coder1-cyan text-sm font-medium rounded hover:bg-coder1-cyan/10">
          Compare All
        </button>
      </div>
    </div>
  );

  // Render based on mode
  return (
    <div className="h-full bg-bg-primary overflow-hidden" data-testid="agent-dashboard-panel">
      {dashboardMode === 'setup' && renderSetupMode()}
      {dashboardMode === 'monitoring' && renderMonitoringMode()}
      {dashboardMode === 'results' && renderResultsMode()}
    </div>
  );
}
