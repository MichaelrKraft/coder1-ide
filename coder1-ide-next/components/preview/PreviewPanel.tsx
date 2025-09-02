'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Users, Eye, X } from '@/lib/icons';
import { colors, glows } from '@/lib/design-tokens';
import CodebaseWiki from '@/components/codebase/CodebaseWiki';

type PreviewMode = 'dashboard' | 'wiki' | 'preview' | 'terminal';

interface PreviewPanelProps {
  agentsActive?: boolean;
  fileOpen?: boolean;
  isPreviewable?: boolean;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'thinking' | 'working' | 'completed' | 'error';
  progress: number;
  currentTask: string;
  completedTasks: string[];
}

interface TeamData {
  teamId: string;
  status: string;
  agents: Agent[];
  progress: {
    overall: number;
  };
  generatedFiles: number;
  requirement: string;
}

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

  // Auto-switch based on context
  useEffect(() => {
    if (agentsActive) {
      setMode('dashboard');
    } else if (fileOpen && isPreviewable) {
      setMode('preview');
    }
  }, [agentsActive, fileOpen, isPreviewable]);

  const fetchTeamData = useCallback(async () => {
    // Don't show loading spinner during polling updates to prevent blinking
    const isFirstLoad = !teamData && !error;
    
    try {
      if (isFirstLoad) {
        setIsLoading(true);
        setError(null);
      }
      
      // Call the Next.js API route which proxies to Express backend
      const teamsResponse = await fetch('/api/ai-team/');
      const teamsData = await teamsResponse.json();
      
      if (teamsData.success && teamsData.teams.length > 0) {
        // Get the most recent active team
        const activeTeam = teamsData.teams[0];
        
        // Get detailed status for this team
        const statusResponse = await fetch(`/api/ai-team/${activeTeam.teamId}/status`);
        const statusData = await statusResponse.json();
        
        if (statusData.success) {
          // Batch state updates to prevent blinking
          setError(null);
          setTeamData(statusData.team);
        } else {
          if (isFirstLoad) setError('Failed to fetch team status');
        }
      } else {
        // Only clear team data if this is the first load or there was an error
        if (isFirstLoad || error) {
          setTeamData(null);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch team data:', err);
      // Only show connection error on first load to prevent blinking
      if (!teamData) {
        setError('Connection error - using offline mode');
        setTeamData(null);
      }
    } finally {
      if (isFirstLoad) {
        setIsLoading(false);
      }
    }
  }, [teamData, error]);

  // Fetch real team data when dashboard is active
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (mode === 'dashboard') {
      // TEMPORARILY DISABLED: AI team polling causing timeouts
      // TODO: Fix Express backend /api/ai-team endpoint performance
      // fetchTeamData();
      // interval = setInterval(fetchTeamData, 5000);
      
      // For now, just set mock data to prevent loading spinner
      setTeamData(null);
      setIsLoading(false);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, fetchTeamData]);

  const renderTabButton = useCallback((
    tabMode: PreviewMode,
    icon: React.ReactNode,
    label: string
  ) => (
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
  ), [mode]);

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
                
                {teamData ? (
                  <div className="space-y-4">
                    {/* Team Overview - Clickable to navigate to full dashboard */}
                    <div 
                      className="glass-card p-4 rounded-lg border border-border-default hover:border-coder1-cyan/70 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-coder1-cyan/20"
                      onClick={() => {
                        // Navigate to full agent dashboard
                        window.open('/agent-dashboard', '_blank');
                      }}
                      title="Click to open full Agent Dashboard"
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
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="mb-4">
                      <Users className="w-16 h-16 text-text-muted mx-auto mb-2" />
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        No AI Team Active
                      </h3>
                      <p className="text-text-muted text-sm max-w-xs">
                        Start a new AI development team to see real-time agent status here.
                      </p>
                    </div>
                    
                    <button 
                      className="px-4 py-2 bg-coder1-cyan hover:bg-coder1-cyan/80 text-black font-medium rounded-lg transition-colors"
                      onClick={() => {
                        // Navigate to team creation - could emit event or use router
                        window.dispatchEvent(new CustomEvent('navigate-to-team-creation'));
                      }}
                    >
                      Spawn AI Team
                    </button>
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
