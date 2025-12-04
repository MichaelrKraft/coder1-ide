'use client';

import React, { useState, useEffect } from 'react';
import { useMissionControlStore, DashboardMode } from '@/stores/useMissionControlStore';
import ParallelExplorationModal from '@/components/sandbox/ParallelExplorationModal';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'thinking' | 'working' | 'completed' | 'error';
  progress: number;
  currentTask: string;
  icon: string;
}

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

  // Handle AI Team start
  const handleAITeamStart = () => {
    if (!aiTeamTask.trim()) return;

    console.log('[AgentDashboard] Starting AI Team:', aiTeamTask);
    setShowAITeamConfig(false);

    // Create specialized agents
    const agents: Agent[] = [
      { id: 'frontend', name: 'Frontend Engineer', role: 'React, UI/UX', status: 'working', progress: 0, currentTask: 'Analyzing UI requirements...', icon: '🎨' },
      { id: 'backend', name: 'Backend Engineer', role: 'APIs, Database', status: 'working', progress: 0, currentTask: 'Setting up API structure...', icon: '⚙️' },
    ];

    startMonitoring(agents);
  };

  // Simulate agent progress (for demo)
  useEffect(() => {
    if (dashboardMode !== 'monitoring' || activeAgents.length === 0) return;

    const interval = setInterval(() => {
      const updatedAgents = activeAgents.map(agent => {
        if (agent.progress >= 100) return { ...agent, status: 'completed' };
        const increment = Math.random() * 15 + 5;
        const newProgress = Math.min(agent.progress + increment, 100);
        return {
          ...agent,
          progress: newProgress,
          status: newProgress >= 100 ? 'completed' : 'working',
          currentTask: newProgress >= 100 ? '✅ Complete!' : agent.currentTask
        };
      });

      // Check if all complete
      const allComplete = updatedAgents.every(a => a.progress >= 100);
      if (allComplete) {
        completeExploration(updatedAgents.map(a => ({
          agentId: a.id,
          name: a.name,
          preview: `/api/preview/${a.id}`
        })));
      } else {
        useMissionControlStore.getState().setActiveAgents(updatedAgents);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [dashboardMode, activeAgents.length]);

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
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAITeamConfig(false)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAITeamStart}
                  disabled={!aiTeamTask.trim()}
                  className="px-4 py-2 bg-coder1-cyan text-black text-sm font-medium rounded disabled:opacity-50"
                >
                  Start AI Team
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
          <div className="text-right">
            <div className="text-sm text-text-muted">Overall Progress</div>
            <div className="text-2xl font-bold text-coder1-cyan">
              {Math.round(activeAgents.reduce((sum, a) => sum + a.progress, 0) / activeAgents.length || 0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Agent Cards Grid */}
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

      {/* Activity Stream */}
      <div className="mt-4 p-4 bg-bg-tertiary rounded-lg border border-border-default">
        <h4 className="text-sm font-medium text-text-primary mb-2">Activity Stream</h4>
        <div className="text-xs text-text-muted font-mono">
          <div className="text-green-400">▶ Agents are working on your task...</div>
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
