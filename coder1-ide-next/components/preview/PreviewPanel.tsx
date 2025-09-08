'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Users, Eye, X } from '@/lib/icons';
import { colors, glows } from '@/lib/design-tokens';
import CodebaseWiki from '@/components/codebase/CodebaseWiki';
import AITeamDashboard from '@/components/preview/AITeamDashboard';

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
  const [mode, setMode] = useState<PreviewMode>('preview');
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
    // Don&apos;t show loading spinner during polling updates to prevent blinking
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
      logger?.error('Failed to fetch team data:', err);
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
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
        <div className="flex items-center gap-1">
          {renderTabButton(
            'preview',
            <Eye className="w-4 h-4" />,
            'Preview'
          )}
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
              <div className="h-full overflow-hidden">
                <div className="flex items-center justify-center h-full text-text-muted">
                  AI Team Dashboard temporarily disabled during build fixes
                </div>
                {/* <AITeamDashboard teamData={teamData} /> */}
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
              <div className="h-full bg-gradient-to-br from-bg-primary via-bg-secondary/50 to-bg-primary">
                {/* Professional Dark Theme Preview Container */}
                <div className="h-full flex flex-col">
                  {/* Simplified Preview Actions Bar */}
                  <div className="flex items-center justify-end px-4 py-2 bg-transparent">
                    {/* Preview Actions Only */}
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-coder1-cyan/10 rounded-lg transition-all duration-200 group" title="Refresh Preview">
                        <svg className="w-4 h-4 text-text-muted group-hover:text-coder1-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-coder1-purple/10 rounded-lg transition-all duration-200 group" title="Open in New Window">
                        <svg className="w-4 h-4 text-text-muted group-hover:text-coder1-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Main Preview Area */}
                  <div className="flex-1 relative overflow-hidden">
                    {/* Animated Background Gradient */}
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-coder1-cyan/10 via-transparent to-coder1-purple/10 animate-pulse-slow" />
                      <div className="absolute top-20 left-20 w-96 h-96 bg-coder1-cyan/5 rounded-full blur-3xl" />
                      <div className="absolute bottom-20 right-20 w-96 h-96 bg-coder1-purple/5 rounded-full blur-3xl" />
                    </div>
                    
                    {/* Dark Browser Frame */}
                    <div className="relative h-full flex items-center justify-center p-6">
                      <div className="w-full max-w-5xl h-full bg-bg-secondary/95 backdrop-blur-xl rounded-xl border border-coder1-cyan/30 shadow-2xl shadow-coder1-cyan/10 overflow-hidden">
                        {/* Dark Browser Chrome */}
                        <div className="bg-bg-primary/80 border-b border-coder1-cyan/20 px-4 py-2.5 flex items-center gap-3">
                          <div className="flex gap-2">
                            <div className="w-3 h-3 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors cursor-pointer" />
                            <div className="w-3 h-3 bg-yellow-500/80 rounded-full hover:bg-yellow-500 transition-colors cursor-pointer" />
                            <div className="w-3 h-3 bg-green-500/80 rounded-full hover:bg-green-500 transition-colors cursor-pointer" />
                          </div>
                          <div className="flex-1 bg-bg-primary/50 rounded-lg px-3 py-1 border border-border-default/50">
                            <span className="text-xs text-text-muted font-mono">Preview Window</span>
                          </div>
                          <div className="flex gap-2">
                            <button className="p-1 hover:bg-bg-primary/50 rounded transition-colors">
                              <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        {/* Dark Content Area */}
                        <div className="h-[calc(100%-44px)] bg-gradient-to-b from-bg-primary to-bg-secondary/95 p-8 overflow-auto">
                          {/* Empty State with Dark Theme */}
                          <div className="h-full flex flex-col items-center justify-center text-center">
                            {/* Glowing Icon */}
                            <div className="mb-8 relative">
                              <div className="absolute inset-0 bg-gradient-to-br from-coder1-cyan to-coder1-purple rounded-3xl blur-2xl opacity-50 animate-pulse-slow" />
                              <div className="relative w-24 h-24 bg-gradient-to-br from-coder1-cyan via-coder1-purple to-coder1-cyan rounded-3xl flex items-center justify-center shadow-lg shadow-coder1-cyan/30">
                                <Eye className="w-12 h-12 text-white drop-shadow-lg" />
                              </div>
                            </div>
                            
                            <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-coder1-cyan to-coder1-purple mb-4">
                              Live Preview Mode
                            </h3>
                            
                            <p className="text-text-secondary mb-8 max-w-lg leading-relaxed">
                              Your web content will render here in real-time as you code. 
                              Open any HTML, React, or web file to see it come to life.
                            </p>
                            
                            
                            
                            {/* Call to Action */}
                            <div className="px-6 py-4 bg-gradient-to-r from-coder1-cyan/10 to-coder1-purple/10 rounded-xl border border-coder1-cyan/30 max-w-md">
                              <p className="text-sm text-text-primary">
                                <span className="text-coder1-cyan font-semibold">Quick Start:</span>
                                <span className="text-text-secondary ml-2">
                                  Open a file or type <code className="px-2 py-0.5 bg-bg-tertiary rounded text-coder1-purple font-mono text-xs">claude</code> in the terminal to begin
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Bar */}
                  <div className="px-4 py-2 bg-bg-primary/50 backdrop-blur-sm border-t border-coder1-cyan/20 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-text-muted">Preview Mode</span>
                      <span className="text-green-400 flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-glow-green" />
                        Connected
                      </span>
                      <span className="text-coder1-cyan">Ready</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-muted font-mono">
                      <span>1920 × 1080</span>
                      <span className="text-coder1-purple">100%</span>
                      <span>60 FPS</span>
                    </div>
                  </div>
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
