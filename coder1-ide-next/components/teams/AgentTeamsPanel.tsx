'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Check, AlertCircle, X } from '@/lib/icons';
import { getSocket } from '@/lib/socket';
import { useSessionStore } from '@/stores/useSessionStore';
import TeamSpawnInput from './TeamSpawnInput';
import AgentCard from './AgentCard';

// Agent color map (from agent definitions)
const AGENT_COLORS: Record<string, string> = {
  'Frontend Engineer': '#00D9FF',
  'Backend Engineer': '#fb923c',
  'QA Testing': '#4ade80',
};

interface ActivityEntry {
  time: string;
  agent: string;
  message: string;
}

interface RecentTeam {
  requirement: string;
  status: string;
  filesCount: number;
  duration: string;
  timestamp: number;
}

type TeamUIState = 'idle' | 'spawning' | 'active' | 'completed';

interface AgentData {
  agentId: string;
  agentName: string;
  status: 'initializing' | 'thinking' | 'working' | 'waiting' | 'completed' | 'error';
  progress: number;
  currentTask: string;
  filesCount: number;
  output: string[];
  files?: { path: string }[];
}

interface TeamStatusUpdate {
  type: string;
  team: {
    teamId: string;
    status: string;
    requirement: string;
    overallProgress: number;
  };
  agents: AgentData[];
}

interface AgentTeamsPanelProps {
  onOpenFile?: (path: string) => void;
}

export default function AgentTeamsPanel({ onOpenFile }: AgentTeamsPanelProps) {
  const [uiState, setUiState] = useState<TeamUIState>('idle');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [requirement, setRequirement] = useState('');
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [spawnError, setSpawnError] = useState<string | null>(null);
  const [isSpawning, setIsSpawning] = useState(false);
  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([]);
  const [recentTeams, setRecentTeams] = useState<RecentTeam[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [duration, setDuration] = useState('');
  const [totalFiles, setTotalFiles] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);

  const prevAgentsRef = useRef<AgentData[]>([]);
  const { activeTeam, updateTeamStatus } = useSessionStore();

  // Load recent teams from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('coder1-recent-teams');
      if (stored) setRecentTeams(JSON.parse(stored).slice(0, 5));
    } catch { /* ignore */ }
  }, []);

  // Socket.IO listener for real-time updates
  useEffect(() => {
    let socket: ReturnType<typeof getSocket> extends Promise<infer T> ? T : never;
    let mounted = true;

    const connectSocket = async () => {
      try {
        socket = await getSocket();

        const handleUpdate = (data: TeamStatusUpdate) => {
          if (!mounted || data.type !== 'orchestrator') return;

          const { team, agents: agentUpdates } = data;

          setTeamId(team.teamId);
          setRequirement(team.requirement);
          setOverallProgress(team.overallProgress);
          setAgents(agentUpdates);

          // Determine UI state from team status
          if (team.status === 'completed') {
            setUiState('completed');
            const elapsed = startTime ? formatDuration(Date.now() - startTime) : '';
            setDuration(elapsed);
            const files = agentUpdates.reduce((s, a) => s + a.filesCount, 0);
            setTotalFiles(files);

            // Save to recent teams
            const entry: RecentTeam = {
              requirement: team.requirement,
              status: 'completed',
              filesCount: files,
              duration: elapsed,
              timestamp: Date.now(),
            };
            setRecentTeams(prev => {
              const updated = [entry, ...prev].slice(0, 5);
              try { localStorage.setItem('coder1-recent-teams', JSON.stringify(updated)); } catch {}
              return updated;
            });
          } else if (team.status === 'error') {
            setUiState('active'); // Show error state in agent cards
          } else if (team.status === 'spawning') {
            setUiState('spawning');
          } else {
            setUiState('active');
          }

          // Build activity feed from agent changes
          const prevMap = new Map(prevAgentsRef.current.map(a => [a.agentId, a]));
          for (const agent of agentUpdates) {
            const prev = prevMap.get(agent.agentId);
            if (prev && prev.currentTask !== agent.currentTask && agent.currentTask) {
              setActivityFeed(feed => [
                { time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), agent: agent.agentName, message: agent.currentTask },
                ...feed,
              ].slice(0, 20));
            }
          }
          prevAgentsRef.current = agentUpdates;
        };

        const handleDisconnect = () => { if (mounted) setReconnecting(true); };
        const handleReconnect = () => { if (mounted) setReconnecting(false); };

        socket.on('team:status:update', handleUpdate);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect', handleReconnect);

        return () => {
          socket.off('team:status:update', handleUpdate);
          socket.off('disconnect', handleDisconnect);
          socket.off('connect', handleReconnect);
        };
      } catch {
        // Socket not available
      }
    };

    connectSocket();
    return () => { mounted = false; };
  }, [startTime]);

  // Warn on unload if team is active
  useEffect(() => {
    if (uiState !== 'active' && uiState !== 'spawning') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Agent team is still running.';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [uiState]);

  // Handle spawn
  const handleSpawn = useCallback(async (req: string) => {
    setSpawnError(null);
    setIsSpawning(true);
    setActivityFeed([]);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement: req }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSpawnError(data.error || 'Failed to spawn team');
        setIsSpawning(false);
        return;
      }
      setTeamId(data.teamId);
      setRequirement(req);
      setStartTime(Date.now());
      setUiState('spawning');
      // Map initial agents
      if (data.agents) {
        setAgents(data.agents.map((a: any) => ({
          agentId: a.agentId || a.sessionId,
          agentName: a.agentName,
          status: a.status || 'initializing',
          progress: a.progress || 0,
          currentTask: a.currentTask || '',
          filesCount: 0,
          output: [],
        })));
      }
    } catch (err: any) {
      setSpawnError(err.message || 'Network error');
    } finally {
      setIsSpawning(false);
    }
  }, []);

  // Handle stop
  const handleStop = useCallback(async () => {
    if (!teamId) return;
    try {
      await fetch('/api/teams/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
    } catch { /* best effort */ }
  }, [teamId]);

  // Handle agent message
  const handleAgentMessage = useCallback(async (agentId: string, message: string) => {
    await fetch('/api/teams/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, agentId, message }),
    });
  }, [teamId]);

  // Reset to idle
  const handleNewTeam = useCallback(() => {
    setUiState('idle');
    setTeamId(null);
    setRequirement('');
    setAgents([]);
    setOverallProgress(0);
    setActivityFeed([]);
    setStartTime(0);
    setDuration('');
    setTotalFiles(0);
    prevAgentsRef.current = [];
  }, []);

  // ── Idle State ──
  if (uiState === 'idle') {
    return (
      <div className="h-full flex flex-col p-4">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-6 pt-6">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-coder1-cyan/20 rounded-2xl blur-xl" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-coder1-cyan/20 to-coder1-purple/20 rounded-2xl flex items-center justify-center border border-coder1-cyan/30">
              <Users className="w-8 h-8 text-coder1-cyan" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">Agent Teams</h2>
          <p className="text-xs text-text-secondary max-w-[260px]">
            Spawn a team of AI agents to work on your project in parallel.
          </p>
        </div>

        {/* Spawn Input */}
        <TeamSpawnInput onSpawn={handleSpawn} isSpawning={isSpawning} error={spawnError} />

        {/* Recent Teams */}
        {recentTeams.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs text-text-muted mb-2 uppercase tracking-wider">Recent Teams</h3>
            <div className="space-y-1.5">
              {recentTeams.map((t, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-bg-primary text-xs">
                  <span className="text-text-secondary truncate flex-1 mr-2">{t.requirement}</span>
                  <div className="flex items-center gap-2 shrink-0 text-text-muted">
                    <span>{t.filesCount} files</span>
                    <span>{t.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Spawning / Active / Completed States ──
  const isCompleted = uiState === 'completed';
  const isActive = uiState === 'active' || uiState === 'spawning';
  const activeCount = agents.filter(a => a.status === 'working' || a.status === 'thinking').length;

  return (
    <div className="h-full flex flex-col">
      {/* Reconnection banner */}
      {reconnecting && (
        <div className="px-3 py-1.5 bg-yellow-500/20 border-b border-yellow-500/30 text-xs text-yellow-400 text-center">
          Reconnecting...
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-coder1-cyan animate-pulse" />
            )}
            <span className="text-sm font-medium text-text-primary">
              {isCompleted ? 'Team Completed' : uiState === 'spawning' ? 'Spawning Team...' : 'Team Active'}
            </span>
            {!isCompleted && (
              <span className="text-xs text-text-secondary font-mono">{overallProgress}%</span>
            )}
          </div>
          {isCompleted ? (
            <button onClick={handleNewTeam} className="text-xs text-coder1-cyan hover:text-coder1-cyan/80 transition-colors">
              New Team
            </button>
          ) : (
            <button onClick={handleStop} className="text-xs text-red-400 hover:text-red-300 transition-colors">
              Stop
            </button>
          )}
        </div>
        <p className="text-xs text-text-muted truncate">{requirement}</p>
        {isCompleted && (
          <div className="flex gap-3 mt-1.5 text-xs text-text-secondary">
            <span>{duration}</span>
            <span>{totalFiles} files</span>
          </div>
        )}
      </div>

      {/* Agent Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agents.map((agent, i) => (
          <div key={agent.agentId} style={{ animation: `fadeIn 300ms ease-out ${i * 100}ms both` }}>
            <AgentCard
              agentId={agent.agentId}
              agentName={agent.agentName}
              status={agent.status}
              progress={agent.progress}
              currentTask={agent.currentTask}
              output={agent.output || []}
              filesCount={agent.filesCount}
              files={agent.files}
              color={AGENT_COLORS[agent.agentName] || '#00D9FF'}
              onMessage={isActive ? handleAgentMessage : undefined}
              onOpenFile={onOpenFile}
            />
          </div>
        ))}

        {/* Activity Feed (active/spawning only) */}
        {isActive && activityFeed.length > 0 && (
          <div className="mt-3">
            <h3 className="text-xs text-text-muted mb-1.5 uppercase tracking-wider">Activity</h3>
            <div className="space-y-1">
              {activityFeed.slice(0, 10).map((entry, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="text-text-muted font-mono shrink-0">{entry.time}</span>
                  <span className="text-text-secondary">
                    <span className="text-text-primary">{entry.agent}:</span> {entry.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed: file list + actions */}
        {isCompleted && (
          <div className="mt-3 space-y-3">
            {/* Generated files from all agents */}
            {agents.some(a => a.files && a.files.length > 0) && (
              <div>
                <h3 className="text-xs text-text-muted mb-1.5 uppercase tracking-wider">Generated Files</h3>
                <div className="space-y-0.5">
                  {agents.flatMap(a => (a.files || []).map(f => (
                    <button
                      key={f.path}
                      onClick={() => onOpenFile?.(f.path)}
                      className="flex items-center gap-1.5 w-full text-left px-2 py-1 text-xs rounded hover:bg-coder1-cyan/10 hover:text-coder1-cyan transition-colors text-text-secondary"
                    >
                      <span>📄</span>
                      <span className="truncate">{f.path}</span>
                    </button>
                  )))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {agents.some(a => a.files && a.files.length > 0) && (
                <button
                  onClick={() => {
                    const firstFile = agents.flatMap(a => a.files || []).find(f => f.path);
                    if (firstFile) onOpenFile?.(firstFile.path);
                  }}
                  className="flex-1 py-2 text-xs font-medium rounded-lg bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 transition-colors"
                >
                  View Files in Editor
                </button>
              )}
              <button
                onClick={handleNewTeam}
                className="flex-1 py-2 text-xs font-medium rounded-lg bg-bg-primary text-text-secondary hover:text-text-primary border border-border-default hover:border-border-hover transition-colors"
              >
                New Team
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}
