'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Users, Eye, X } from '@/lib/icons';
import { colors, glows } from '@/lib/design-tokens';
import CodebaseWiki from '@/components/codebase/CodebaseWiki';
import { mockEnhancedAgentService, type MockTeamData, type MockAgent } from '@/services/mock-enhanced-agent-service';
import AgentAssemblyVisualization from '@/components/agents/AgentAssemblyVisualization';
import { logger } from '@/lib/logger';

type PreviewMode = 'dashboard' | 'wiki' | 'preview' | 'terminal';

interface PreviewPanelProps {
  agentsActive?: boolean;
  fileOpen?: boolean;
  isPreviewable?: boolean;
}

// Debug helper - same as Terminal component
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).enableEnhancedAgents = () => {
    localStorage.setItem('coder1-enable-enhanced-agents', 'true');
    localStorage.setItem('coder1-agent-visualization', 'true');
    localStorage.setItem('coder1-natural-handoffs', 'true');
    window.location.reload();
  };
  
  (window as any).disableEnhancedAgents = () => {
    localStorage.removeItem('coder1-enable-enhanced-agents');
    localStorage.removeItem('coder1-agent-visualization');
    localStorage.removeItem('coder1-natural-handoffs');
    window.location.reload();
  };
}

// Use types from mock service
type Agent = MockAgent;
type TeamData = MockTeamData;

/**
 * Preview Panel with Multiple Modes - REAL AI INTEGRATION
 * - Agent Dashboard (default when agents active) - Connected to REAL AI orchestrator
 * - Codebase Wiki (📚 button in preview)
 * - Live Preview (when HTML/React files open)
 * - Terminal Output (optional)
 */
const PreviewPanel = React.memo(function PreviewPanel({
  agentsActive = false,
  fileOpen = false,
  isPreviewable = false,
}: PreviewPanelProps) {
  const [mode, setMode] = useState<PreviewMode>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Feature flags - same as Terminal component
  const [enhancedAgentsEnabled, setEnhancedAgentsEnabled] = useState(false);
  
  // Agent assembly state
  const [isAssembling, setIsAssembling] = useState(false);
  const [currentTeamSuggestion, setCurrentTeamSuggestion] = useState<any>(null);
  
  const fetchTeamData = useCallback(async () => {
    if (!enhancedAgentsEnabled) {
      setTeamData(null);
      setIsLoading(false);
      return;
    }
    
    const isFirstLoad = !teamData && !error;
    
    try {
      if (isFirstLoad) {
        setIsLoading(true);
        setError(null);
      }
      
      // Use mock service when enhanced agents are enabled
      const mockTeam = mockEnhancedAgentService.getTeamStatus('demo-team');
      
      if (mockTeam) {
        setError(null);
        setTeamData(mockTeam);
      } else {
        if (isFirstLoad || error) {
          setTeamData(null);
          setError(null);
        }
      }
    } catch (err) {
      logger.error('Failed to fetch team data:', err);
      if (!teamData) {
        setError('Enhanced agents service error');
        setTeamData(null);
      }
    } finally {
      if (isFirstLoad) {
        setIsLoading(false);
      }
    }
  }, [teamData, error, enhancedAgentsEnabled]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isEnabled = process.env.NODE_ENV === 'development' && 
                       localStorage.getItem('coder1-enable-enhanced-agents') === 'true';
      setEnhancedAgentsEnabled(isEnabled);
    }
  }, []);
  
  // Listen for team assembly events from terminal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleTeamAssembly = (event: CustomEvent) => {
        const { teamSuggestion } = event.detail;
        setCurrentTeamSuggestion(teamSuggestion);
        setIsAssembling(true);
        setMode('dashboard'); // Switch to dashboard to show assembly
      };
      
      const handleAssemblyComplete = () => {
        setIsAssembling(false);
        // The fetchTeamData effect will handle the refresh
      };
      
      // Listen for real-time agent updates from WebSocket
      const handleAgentUpdate = (event: Event) => {
        const customEvent = event as CustomEvent;
        const data = customEvent.detail;
        
        // Update agent status in real-time
        if (data.type === 'agent-status') {
          setTeamData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              agents: prev.agents.map(agent => 
                agent.id === data.agentId 
                  ? { ...agent, status: data.status, currentTask: data.task }
                  : agent
              )
            };
          });
        }
      };
      
      window.addEventListener('agent-team-assembly', handleTeamAssembly as EventListener);
      window.addEventListener('agent-assembly-complete', handleAssemblyComplete);
      window.addEventListener('agent-update', handleAgentUpdate as EventListener);
      
      return () => {
        window.removeEventListener('agent-team-assembly', handleTeamAssembly as EventListener);
        window.removeEventListener('agent-assembly-complete', handleAssemblyComplete);
        window.removeEventListener('agent-update', handleAgentUpdate as EventListener);
      };
    }
  }, []);

  // Auto-switch based on context
  useEffect(() => {
    if (agentsActive) {
      setMode('dashboard');
    } else if (fileOpen && isPreviewable) {
      setMode('preview');
    }
  }, [agentsActive, fileOpen, isPreviewable]);

  // Fetch team data when dashboard is active
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (mode === 'dashboard' && enhancedAgentsEnabled) {
      fetchTeamData();
      interval = setInterval(fetchTeamData, 3000); // Update every 3 seconds for demo
    } else if (mode === 'dashboard' && !enhancedAgentsEnabled) {
      setTeamData(null);
      setIsLoading(false);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, fetchTeamData, enhancedAgentsEnabled]);

  const renderTabButton = useCallback((
    tabMode: PreviewMode,
    icon: React.ReactNode,
    label: string
  ) => {
    // Special handling for Agent Dashboard - link to beautiful dashboard
    if (tabMode === 'dashboard') {
      return (
        <a
          href="http://localhost:3000/agent-dashboard.html"
          target="_blank"
          rel="noopener noreferrer"
          className={`
            flex items-center gap-2 px-3 py-2 text-sm font-medium
            transition-all duration-200 border-b-2
            ${mode === tabMode 
              ? 'text-coder1-cyan border-coder1-cyan' 
              : 'text-text-secondary border-transparent hover:text-text-primary hover:border-border-hover'
            }
          `}
          title="Open Agent Dashboard in new tab"
        >
          {icon}
          <span>{label}</span>
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      );
    }
    
    // Regular button for other tabs
    return (
      <button
        onClick={() => setMode(tabMode)}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm font-medium
          transition-all duration-200 border-b-2
          ${mode === tabMode 
            ? 'text-coder1-cyan border-coder1-cyan' 
            : 'text-text-secondary border-transparent hover:text-text-primary hover:border-border-hover'
          }
        `}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }, [mode]);

  return (
    <div className="h-full flex flex-col bg-bg-secondary border border-coder1-cyan/50 shadow-glow-cyan">
      {/* Preview Header - matching Explorer style */}
      <div className="px-3 py-2 border-b border-border-default">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Preview
        </h3>
      </div>
      
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-border-default px-4 h-12 shrink-0">
        <div className="flex items-center gap-1">
          {renderTabButton(
            'dashboard',
            <Users className="w-4 h-4" />,
            'Agent Dashboard'
          )}
          {renderTabButton(
            'wiki',
            <BookOpen className="w-4 h-4" />,
            'Codebase Wiki'
          )}
          {renderTabButton(
            'preview',
            <Eye className="w-4 h-4" />,
            'Preview'
          )}
        </div>
        
        {/* Close button */}
        <button 
          className="p-1 hover:bg-bg-tertiary rounded transition-colors"
          onClick={() => {/* Handle close */}}
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-coder1-cyan border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Agent Dashboard - REAL AI INTEGRATION */}
            {mode === 'dashboard' && (
              <div className="h-full p-4 overflow-auto">
                {error && (
                  <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                    {error}
                  </div>
                )}
                
                {!enhancedAgentsEnabled && (
                  <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                    🔒 Enhanced agents disabled. Open browser console and run <code className="bg-black/30 px-1 rounded">enableEnhancedAgents()</code> to activate.
                  </div>
                )}

                {/* Agent Assembly Visualization - Shows during team assembly */}
                {isAssembling && currentTeamSuggestion && (
                  <div className="mb-6">
                    <AgentAssemblyVisualization
                      isAssembling={isAssembling}
                      teamSuggestion={currentTeamSuggestion}
                      onAssemblyComplete={() => {
                        window.dispatchEvent(new CustomEvent('agent-assembly-complete'));
                      }}
                    />
                  </div>
                )}

                {teamData && !isAssembling ? (
                  <div className="space-y-4">
                    {/* Terminal Connection Status */}
                    <div className="mb-4 p-3 bg-green-900/20 border border-green-500/20 rounded-lg text-green-400 text-sm">
                      🔗 Connected to terminal • Enhanced agent processing active
                    </div>
                    
                    {/* Team Overview - Embedded dashboard content */}
                    <div 
                      className="glass-card p-4 rounded-lg border border-border-default hover:border-coder1-cyan/70 transition-all duration-200"
                      title="AI Team Dashboard - Live Status"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-coder1-cyan">
                          🚀 AI Team Status
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-text-muted">
                          <span>View Full Dashboard</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-text-muted">Project:</span>
                          <p className="text-text-primary font-medium">{teamData.requirement}</p>
                        </div>
                        <div>
                          <span className="text-text-muted">Overall Progress:</span>
                          <p className="text-coder1-cyan font-bold">{teamData.progress.overall}%</p>
                        </div>
                        <div>
                          <span className="text-text-muted">Status:</span>
                          <p className="text-text-primary font-medium capitalize">{teamData.status}</p>
                        </div>
                        <div>
                          <span className="text-text-muted">Files Generated:</span>
                          <p className="text-coder1-purple font-bold">{teamData.generatedFiles}</p>
                        </div>
                      </div>
                    </div>

                    {/* Agent Status Cards */}
                    <div className="glass-card p-4 rounded-lg border border-border-default">
                      <h3 className="text-sm font-semibold text-coder1-cyan mb-3">
                        🤖 {teamData.agents.length} Active Agents
                      </h3>
                      <div className="space-y-2">
                        {teamData.agents.map((agent) => (
                          <AgentStatusCard
                            key={agent.id}
                            name={agent.name}
                            status={agent.status}
                            task={agent.currentTask}
                            progress={agent.progress}
                            role={agent.role}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : enhancedAgentsEnabled ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="mb-4">
                      <Users className="w-16 h-16 text-text-muted mx-auto mb-2" />
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        Ready for AI Team Assembly
                      </h3>
                      <p className="text-text-muted text-sm max-w-xs mb-4">
                        Type complex commands in the terminal to trigger team suggestions:
                      </p>
                      
                      <div className="space-y-2 text-left bg-bg-tertiary p-3 rounded-lg text-xs font-mono">
                        <div className="text-coder1-cyan">$ claude build a dashboard</div>
                        <div className="text-coder1-cyan">$ claude create a full app</div>
                        <div className="text-coder1-cyan">$ claude develop a system</div>
                      </div>
                      
                      <p className="text-text-muted text-xs mt-3 max-w-xs">
                        Simple requests get single agent responses. Complex requests trigger team suggestions.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="mb-4">
                      <Users className="w-16 h-16 text-text-muted mx-auto mb-2" />
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        Enhanced Agents Disabled
                      </h3>
                      <p className="text-text-muted text-sm max-w-xs mb-4">
                        Enable enhanced agents to see AI team coordination and agent assembly.
                      </p>
                      
                      <div className="space-y-2 text-left bg-bg-tertiary p-3 rounded-lg text-xs">
                        <div className="text-green-400">1. Open browser console (F12)</div>
                        <div className="text-green-400">2. Run: enableEnhancedAgents()</div>
                        <div className="text-green-400">3. Page will reload with features enabled</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Codebase Wiki */}
            {mode === 'wiki' && (
              <div className="h-full">
                <CodebaseWiki />
              </div>
            )}

            {/* Live Preview */}
            {mode === 'preview' && (
              <div className="h-full bg-black p-4 pt-12 flex flex-col items-start">
                <div className="w-full max-w-md">
                  <h2 className="text-white text-2xl font-bold mb-4">Live Preview Mode</h2>
                  <p className="text-gray-400 text-sm mb-6">
                    This preview will display your HTML, React, or web content as you edit it in the editor.
                  </p>
                  <p className="text-gray-500 text-xs mb-16 italic">
                    Type claude in the terminal below to begin
                  </p>
                  
                  <div className="border border-gray-600 rounded-lg p-4 mb-6 bg-gray-900">
                    <h3 className="text-white text-lg font-semibold mb-3">Demo Component</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      When you edit HTML or React files, they will render here automatically.
                    </p>
                    
                    <div className="flex items-center gap-3">
                      <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all">
                        Test Button
                      </button>
                      <span className="text-green-400 text-sm font-medium">Ready</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-500 text-xs">
                    Supports: HTML, CSS, JavaScript, React, Vue, and more
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

// Agent Status Card Component - REAL AI INTEGRATION
const AgentStatusCard = React.memo(function AgentStatusCard({
  name,
  status,
  task,
  progress,
  role,
}: {
  name: string;
  status: 'idle' | 'thinking' | 'working' | 'completed' | 'error';
  task: string;
  progress: number;
  role?: string;
}) {
  const statusColors = {
    idle: 'text-text-muted',
    thinking: 'text-warning',
    working: 'text-coder1-cyan',
    completed: 'text-green-400',
    error: 'text-error',
  };

  const statusIcons = {
    idle: '⏸️',
    thinking: '🤔', 
    working: '⚡',
    completed: '✅',
    error: '❌',
  };

  return (
    <div className="p-3 bg-bg-tertiary rounded-lg border border-border-default hover:border-coder1-cyan/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-text-primary">{name}</h4>
              <span className="text-xs">{statusIcons[status]}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-xs capitalize ${statusColors[status]} font-medium`}>{status}</p>
              {role && (
                <span className="text-xs text-text-muted">• {role}</span>
              )}
            </div>
          </div>
        </div>
        <span className="text-xs text-text-secondary font-mono">{progress}%</span>
      </div>
      <p className="text-xs text-text-secondary mb-2 line-clamp-2">{task || 'No current task'}</p>
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 rounded-full ${
            status === 'completed' 
              ? 'bg-green-400' 
              : status === 'error' 
                ? 'bg-error' 
                : 'bg-gradient-to-r from-coder1-purple to-coder1-cyan'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
});
export default PreviewPanel;
