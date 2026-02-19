'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, UserPlus, RefreshCw, Trash2, Copy, Check, GitBranch, X, Monitor, Pin, Search, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useTeamStore } from '@/stores/useTeamStore';
import { useSpectatorStore } from '@/stores/useSpectatorStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { getSocket } from '@/lib/socket';
import type { TeamSummary } from '@/types/team';

interface TeamMember {
  id: string;
  email: string;
  username: string;
  role: string;
  avatar_url?: string;
}

interface TeamFact {
  id: string;
  fact_key: string;
  fact_value: string;
  contributed_by_name: string;
  contributor_count: number;
  is_active: boolean;
}

/** Map Supabase team_knowledge row (data JSONB) into flat TeamFact.
 *  Handles three source_table types:
 *  - extracted_facts:   { fact_key, fact_value }
 *  - learned_patterns:  { pattern_type, pattern_description }
 *  - memory_chunks:     { heading, section_type, content }
 */
function mapKnowledgeRow(row: Record<string, unknown>): TeamFact {
  const data = (row.data || {}) as Record<string, unknown>;
  const sourceTable = row.source_table as string;

  let factKey = '';
  let rawValue = '';

  if (sourceTable === 'extracted_facts') {
    factKey = (data.fact_key as string) || '';
    rawValue = (data.fact_value as string) || '';
  } else if (sourceTable === 'learned_patterns') {
    factKey = (data.pattern_type as string) || '';
    rawValue = (data.pattern_description as string) || '';
  } else {
    // memory_chunks — use heading if descriptive, otherwise label as "session memory"
    const heading = (data.heading as string) || '';
    const genericHeadings = ['assistant', 'user', 'system', ''];
    factKey = genericHeadings.includes(heading.toLowerCase()) ? 'session memory' : heading;
    rawValue = (data.content as string) || '';
  }

  // Truncate long content for display
  const factValue = rawValue.length > 200 ? rawValue.substring(0, 200) + '...' : rawValue;

  return {
    id: row.id as string,
    fact_key: factKey,
    fact_value: factValue,
    contributed_by_name: (row.contributed_by_name as string) || 'Unknown',
    contributor_count: (row.contributor_count as number) || 1,
    is_active: row.is_active !== false,
  };
}

/** Map and sort team knowledge rows: specific facts first, generic session memory last */
function mapAndSortKnowledge(rows: Record<string, unknown>[]): TeamFact[] {
  return rows
    .filter(row => row.source_table !== 'memory_chunks')  // exclude raw session dumps — not actionable knowledge
    .map(mapKnowledgeRow)
    .sort((a, b) => {
      const aIsGeneric = a.fact_key === 'session memory' ? 1 : 0;
      const bIsGeneric = b.fact_key === 'session memory' ? 1 : 0;
      return aIsGeneric - bIsGeneric;
    });
}

interface CodeEvent {
  id: string;
  type: string;
  branch?: string;
  sha?: string;
  message?: string;
  remote?: string;
  userId: string;
  username: string;
  timestamp: string;
}

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const SESSION_TYPE_ICONS: Record<string, string> = {
  'bug-fix': '🔧',
  'feature-dev': '✨',
  'refactoring': '♻️',
  'exploration': '🔍',
  'general': '📝',
};

export default function TeamPanel() {
  const {
    syncTeam, syncStatus, createTeam, inviteMember, triggerSync,
    teams, selectTeam, onlineMembers, fetchTeams,
    openToSummariesTab, setOpenToSummariesTab,
  } = useTeamStore();
  const { sharedTerminals } = useSpectatorStore();

  // Panel tabs
  const [activePanel, setActivePanel] = useState<'main' | 'summaries'>('main');

  // Existing state
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [facts, setFacts] = useState<TeamFact[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [gitSuggestion, setGitSuggestion] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<CodeEvent[]>([]);

  // Summaries state
  const [summaries, setSummaries] = useState<Omit<TeamSummary, 'summary'>[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [summariesError, setSummariesError] = useState<string | null>(null);
  const [summariesHasMore, setSummariesHasMore] = useState(false);
  const [summariesOffset, setSummariesOffset] = useState(0);
  const [summarySearch, setSummarySearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedText, setExpandedText] = useState<string | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // On mount, fetch existing teams the user belongs to
  useEffect(() => {
    if (!syncTeam) {
      fetchTeams();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-detect git remote for team name suggestion
  useEffect(() => {
    if (!syncTeam && teams.length === 0) {
      fetch('/api/git/context')
        .then(r => r.json())
        .then(data => {
          if (data.success && data.data?.repo) {
            const suggestion = `${data.data.org}/${data.data.repo}`;
            setGitSuggestion(suggestion);
            setNewTeamName(suggestion);
          }
        })
        .catch(() => {}); // Silent fail
    }
  }, [syncTeam, teams.length]);

  // Fetch members and facts when team is selected
  useEffect(() => {
    if (!syncTeam) return;

    fetch(`/api/team/${syncTeam.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setMembers(data.data.members || []);
        }
      })
      .catch(() => {});

    fetch(`/api/team/${syncTeam.id}/knowledge`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setFacts(mapAndSortKnowledge(data.data || []));
        }
      })
      .catch(() => {});
  }, [syncTeam]);

  // Fetch summaries when team is selected
  useEffect(() => {
    if (!syncTeam) return;
    setSummariesLoading(true);
    setSummariesError(null);
    setSummariesOffset(0);

    fetch(`/api/team/${syncTeam.id}/summaries`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setSummaries(data.summaries || []);
          setSummariesHasMore(data.hasMore ?? false);
          setSummariesOffset(data.summaries?.length ?? 0);

          // Compute unread badge
          const lastVisited = localStorage.getItem(`coder1:team:${syncTeam.id}:lastVisitedSummaries`);
          if (lastVisited) {
            const count = (data.summaries || []).filter(
              (s: Omit<TeamSummary, 'summary'>) => new Date(s.created_at) > new Date(lastVisited)
            ).length;
            setUnreadCount(count);
          } else {
            setUnreadCount(data.summaries?.length ?? 0);
          }
        } else if (!data.migrationRequired) {
          setSummariesError(data.error || 'Failed to load summaries');
        }
        setSummariesLoading(false);
      })
      .catch(() => {
        setSummariesError('Failed to load summaries');
        setSummariesLoading(false);
      });
  }, [syncTeam?.id]);

  // Handle openToSummariesTab flag from toast click
  useEffect(() => {
    if (openToSummariesTab) {
      setActivePanel('summaries');
      setOpenToSummariesTab(false);
    }
  }, [openToSummariesTab, setOpenToSummariesTab]);

  // Clear unread badge when summaries tab is opened
  useEffect(() => {
    if (activePanel === 'summaries' && syncTeam) {
      localStorage.setItem(`coder1:team:${syncTeam.id}:lastVisitedSummaries`, new Date().toISOString());
      setUnreadCount(0);
    }
  }, [activePanel, syncTeam?.id]);

  // Socket presence: join room, listen for updates, leave on cleanup
  useEffect(() => {
    if (!syncTeam) return;
    let sock: any = null;
    let cleanup: (() => void) | null = null;

    const setup = async () => {
      const { getSocket } = await import('@/lib/socket');
      const { useAuthStore } = await import('@/stores/useAuthStore');
      sock = await getSocket();
      if (!sock) return;

      const emitPresence = (user: { id: string; username: string } | null) => {
        if (!user || !sock) return;
        sock.emit('team:presence:join', {
          teamId: syncTeam.id,
          userId: user.id,
          username: user.username,
        });
        sock.emit('team:presence:request', { teamId: syncTeam.id });
        sock.emit('spectator:list', { teamId: syncTeam.id, userId: user.id });
      };

      // Emit immediately if user is already loaded
      let user = useAuthStore.getState().user;
      emitPresence(user);

      // Subscribe to auth store: emit presence when user logs in (fixes timing race
      // where syncTeam is persisted but user is not loaded yet on page mount)
      const unsubscribeAuth = useAuthStore.subscribe((state) => {
        if (state.user && !user) {
          user = state.user;
          emitPresence(user);
        }
      });

      // Re-emit on socket reconnect
      const handleConnect = () => {
        emitPresence(useAuthStore.getState().user);
      };
      sock.on('connect', handleConnect);

      const handlePresence = (data: { online: { userId: string; username: string }[] }) => {
        useTeamStore.getState().setOnlineMembers(data.online);
      };
      sock.on('team:presence:update', handlePresence);

      const handleSpectatorList = (data: { teamId: string; terminals: any[] }) => {
        const spectatorStore = useSpectatorStore.getState();
        for (const terminal of data.terminals || []) {
          spectatorStore.addSharedTerminal(terminal);
        }
      };
      sock.on('spectator:list:response', handleSpectatorList);

      cleanup = () => {
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          sock.emit('team:presence:leave', { teamId: syncTeam.id, userId: currentUser.id });
        }
        sock.off('team:presence:update', handlePresence);
        sock.off('spectator:list:response', handleSpectatorList);
        sock.off('connect', handleConnect);
        unsubscribeAuth();
      };
    };

    setup();
    return () => { cleanup?.(); };
  }, [syncTeam?.id]);

  // Socket listener for team code events (activity feed) + summaryShared
  useEffect(() => {
    if (!syncTeam) return;
    let sock: any = null;
    let cleanupFn: (() => void) | null = null;

    const setup = async () => {
      const { getSocket } = await import('@/lib/socket');
      const { useAuthStore } = await import('@/stores/useAuthStore');
      sock = await getSocket();
      if (!sock) return;

      const handleCodeEvent = (event: CodeEvent) => {
        setRecentActivity(prev => [event, ...prev].slice(0, 10));
      };
      sock.on('team:codeEvent', handleCodeEvent);

      const handleSummaryShared = (payload: { summary: Omit<TeamSummary, 'summary'>; teamId: string }) => {
        const currentUser = useAuthStore.getState().user;
        // Skip own events (already reflected locally)
        if (payload.summary.user_id === currentUser?.id) return;

        setSummaries(prev => [payload.summary, ...prev.filter(s => !s.is_pinned)].sort((a, b) =>
          a.is_pinned === b.is_pinned ? 0 : a.is_pinned ? -1 : 1
        ));
        setUnreadCount(prev => prev + 1);
      };
      sock.on('team:summaryShared', handleSummaryShared);

      cleanupFn = () => {
        sock?.off('team:codeEvent', handleCodeEvent);
        sock?.off('team:summaryShared', handleSummaryShared);
      };
    };

    setup();
    return () => { cleanupFn?.(); };
  }, [syncTeam?.id]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await createTeam(newTeamName.trim());
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    const link = await inviteMember(inviteEmail.trim());
    if (link) {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setInviteEmail('');
    }
  };

  const handleSyncNow = async () => {
    const ok = await triggerSync();
    if (ok && syncTeam) {
      // Ensure we're in team presence (re-emit in case initial emit was missed due to auth timing)
      const sock = await getSocket();
      const user = useAuthStore.getState().user;
      if (sock && user) {
        sock.emit('team:presence:join', {
          teamId: syncTeam.id,
          userId: user.id,
          username: user.username,
        });
      }
      // Refresh knowledge feed after successful sync
      fetch(`/api/team/${syncTeam.id}/knowledge`)
        .then(r => r.json())
        .then(data => { if (data.success) setFacts(mapAndSortKnowledge(data.data || [])); })
        .catch(() => {});
    }
  };

  const handleDeleteTeam = async () => {
    if (!syncTeam) return;
    if (!window.confirm(`Delete team "${syncTeam.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/team/${syncTeam.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        // Handle specific error cases
        if (res.status === 401) {
          alert('Please log in to delete the team.');
        } else if (res.status === 403) {
          alert('You do not have permission to delete this team.');
        } else {
          alert(`Failed to delete team: ${data.error || 'Unknown error'}`);
        }
        return;
      }

      if (data.success) {
        // Clear local state
        useTeamStore.getState().setSyncTeam(null);
        setMembers([]);
        setFacts([]);
      } else {
        alert(`Failed to delete team: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to delete team:', err);
      alert('Failed to delete team. Please try again.');
    }
  };

  const handleDeleteFact = async (factId: string) => {
    if (!syncTeam) return;
    if (!window.confirm('Remove this fact from team knowledge?')) return;
    await fetch(`/api/team/${syncTeam.id}/knowledge`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factId }),
    });
    setFacts(prev => prev.filter(f => f.id !== factId));
  };

  const handleLoadMoreSummaries = async () => {
    if (!syncTeam || summariesLoading) return;
    setSummariesLoading(true);
    try {
      const r = await fetch(`/api/team/${syncTeam.id}/summaries?offset=${summariesOffset}`);
      const data = await r.json();
      if (data.success) {
        setSummaries(prev => [...prev, ...(data.summaries || [])]);
        setSummariesHasMore(data.hasMore ?? false);
        setSummariesOffset(prev => prev + (data.summaries?.length ?? 0));
      }
    } catch {
      // silent
    } finally {
      setSummariesLoading(false);
    }
  };

  const handleTogglePin = async (summary: Omit<TeamSummary, 'summary'>) => {
    if (!syncTeam) return;
    const newPinned = !summary.is_pinned;
    // Optimistic update
    setSummaries(prev =>
      prev
        .map(s => s.id === summary.id ? { ...s, is_pinned: newPinned } : s)
        .sort((a, b) => a.is_pinned === b.is_pinned ? 0 : a.is_pinned ? -1 : 1)
    );
    try {
      await fetch(`/api/team/${syncTeam.id}/summaries`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryId: summary.id, is_pinned: newPinned }),
      });
    } catch {
      // Revert on failure
      setSummaries(prev =>
        prev
          .map(s => s.id === summary.id ? { ...s, is_pinned: summary.is_pinned } : s)
          .sort((a, b) => a.is_pinned === b.is_pinned ? 0 : a.is_pinned ? -1 : 1)
      );
    }
  };

  const handleExpandSummary = async (summaryId: string) => {
    if (!syncTeam) return;
    if (expandedId === summaryId) {
      setExpandedId(null);
      setExpandedText(null);
      return;
    }
    setExpandedId(summaryId);
    setExpandedText(null);
    setExpandedLoading(true);
    try {
      const r = await fetch(`/api/team/${syncTeam.id}/summaries/${summaryId}`);
      const data = await r.json();
      setExpandedText(data.summary?.summary || null);
    } catch {
      setExpandedText(null);
    } finally {
      setExpandedLoading(false);
    }
  };

  // No team -- show creation form
  if (!syncTeam) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-text-primary">
          <Cloud className="w-5 h-5 text-coder1-cyan" />
          <h3 className="font-semibold">Team Knowledge Sync</h3>
        </div>

        <p className="text-sm text-text-muted">
          Create a team to sync Johnny5&apos;s knowledge across your team members.
        </p>

        {gitSuggestion && (
          <div className="flex items-center gap-2 text-xs text-coder1-cyan/70 bg-coder1-cyan/5 p-2 rounded">
            <GitBranch className="w-3.5 h-3.5" />
            <span>Detected: {gitSuggestion}</span>
          </div>
        )}

        {createError && (
          <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
            {createError}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => { setNewTeamName(e.target.value); setCreateError(null); }}
            placeholder="Team name"
            className="flex-1 bg-bg-tertiary border border-border-default rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
          />
          <button
            onClick={handleCreateTeam}
            disabled={isCreating || !newTeamName.trim()}
            className="px-3 py-1.5 bg-coder1-cyan/20 text-coder1-cyan text-sm rounded hover:bg-coder1-cyan/30 disabled:opacity-50 transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    );
  }

  // Filtered summaries for search
  const filteredSummaries = summarySearch.trim()
    ? summaries.filter(s =>
        s.title.toLowerCase().includes(summarySearch.toLowerCase()) ||
        s.excerpt.toLowerCase().includes(summarySearch.toLowerCase())
      )
    : summaries;

  // Has team -- show management
  return (
    <div className="p-4 space-y-4">
      {/* Header — right padding for slide-out close button */}
      <div className="space-y-2">
        {/* Row 1: Team name and selector */}
        <div className="flex items-center gap-2 text-text-primary pr-8">
          <Cloud className="w-5 h-5 text-coder1-cyan" />
          <h3 className="font-semibold">{syncTeam.name}</h3>
          {teams.length > 1 && (
            <select
              value={syncTeam?.id}
              onChange={(e) => selectTeam(e.target.value)}
              className="bg-bg-tertiary border border-border-default rounded px-2 py-1 text-xs text-text-primary"
            >
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
        {/* Row 2: Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSyncNow();
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-coder1-cyan hover:bg-coder1-cyan/10 rounded transition-colors"
            title="Sync team knowledge - Push your Johnny5 insights to the team and pull insights from team members"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleDeleteTeam();
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-red-400/10 rounded transition-colors cursor-pointer"
            title="Delete Team"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Sync Status */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span className={`w-2 h-2 rounded-full ${syncStatus.isConnected ? 'bg-green-400' : 'bg-yellow-400'}`} />
        <span>{syncStatus.isConnected ? 'Connected' : 'Disconnected'}</span>
        {syncStatus.lastPushAt && (
          <span className="text-text-muted/60">Last sync: {new Date(syncStatus.lastPushAt).toLocaleTimeString()}</span>
        )}
      </div>

      {syncStatus.error && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded px-2 py-1.5 text-xs text-yellow-300">
          Team sync unavailable: {syncStatus.error}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex border-b border-border-default -mx-4 px-4">
        <button
          onClick={() => setActivePanel('main')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
            activePanel === 'main'
              ? 'border-coder1-cyan text-coder1-cyan'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Team
        </button>
        <button
          onClick={() => setActivePanel('summaries')}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
            activePanel === 'summaries'
              ? 'border-coder1-cyan text-coder1-cyan'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          📝 Summaries
          {unreadCount > 0 && (
            <span className="ml-1 px-1 py-0.5 bg-coder1-cyan text-bg-primary text-[10px] font-bold rounded-full leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Team Panel */}
      {activePanel === 'main' && (
        <>
          {/* Members */}
          <div>
            <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Members ({members.length})</h4>
            <div className="space-y-1">
              {members.map(m => {
                const isOnline = onlineMembers.some(om => om.userId === m.id);
                return (
                <div key={m.id} className="flex items-center gap-2 text-sm text-text-primary">
                  <div className="relative w-6 h-6">
                    <div className="w-6 h-6 rounded-full bg-coder1-cyan/20 flex items-center justify-center text-xs text-coder1-cyan">
                      {m.username[0]?.toUpperCase()}
                    </div>
                    {isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-bg-secondary" />
                    )}
                  </div>
                  <span>{m.username}</span>
                  {m.role !== 'member' && (
                    <span className="text-[10px] text-coder1-cyan/60 bg-coder1-cyan/10 px-1 rounded">{m.role}</span>
                  )}
                </div>
              );
              })}
            </div>
          </div>

          {/* Live Terminals (Spectator Mode) */}
          {(() => {
            const currentUser = useAuthStore.getState().user;
            const viewableTerminals = sharedTerminals.filter(st => st.userId !== currentUser?.id);
            if (viewableTerminals.length === 0) return null;
            return (
              <div>
                <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                  Live Terminals ({viewableTerminals.length})
                </h4>
                <div className="space-y-1.5">
                  {viewableTerminals.map(st => (
                    <button
                      key={st.sessionId}
                      onClick={async () => {
                        const user = useAuthStore.getState().user;
                        if (!user || !syncTeam) return;
                        const socket = await getSocket();
                        socket?.emit('spectator:join', {
                          sessionId: st.sessionId,
                          teamId: syncTeam.id,
                          userId: user.id,
                          username: user.username,
                        });
                        // Start spectating immediately so the UI updates
                        const { useSpectatorStore } = await import('@/stores/useSpectatorStore');
                        useSpectatorStore.getState().startSpectating(st.sessionId, st.username);
                      }}
                      className="w-full flex items-center gap-2 p-2 text-sm bg-bg-tertiary rounded hover:bg-orange-500/10 border border-transparent hover:border-orange-500/30 transition-colors"
                    >
                      <Monitor className="w-4 h-4 text-orange-400" />
                      <span className="text-text-primary">{st.username}&apos;s terminal</span>
                      <span className="ml-auto text-[10px] text-orange-400 font-medium spectator-live-pulse">LIVE</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Invite */}
          <div>
            <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Invite Member</h4>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 bg-bg-tertiary border border-border-default rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan"
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-coder1-cyan/20 text-coder1-cyan text-sm rounded hover:bg-coder1-cyan/30 disabled:opacity-50 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Invite'}
              </button>
            </div>
          </div>

          {/* Knowledge Feed */}
          <div>
            <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
              Team Knowledge ({facts.length})
            </h4>
            <div className="space-y-2">
              {facts.slice(0, 10).map(f => (
                <div key={f.id} className="bg-bg-tertiary rounded p-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-coder1-cyan font-medium">@{f.contributed_by_name}</span>
                    <div className="flex items-center gap-1">
                      {f.contributor_count > 1 && (
                        <span className="text-text-muted">{f.contributor_count}x confirmed</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFact(f.id);
                        }}
                        className="text-text-muted/40 hover:text-red-400 transition-colors p-0.5"
                        title="Remove fact"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-text-primary">
                    <span className="font-medium">{f.fact_key}:</span> {f.fact_value}
                  </div>
                </div>
              ))}
              {facts.length === 0 && (
                <p className="text-text-muted text-xs">No insights extracted yet. Johnny5 distills facts and patterns from your team&apos;s sessions automatically.</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
              Recent Activity
            </h4>
            <div className="space-y-1.5">
              {recentActivity.map(event => (
                <div key={event.id} className="flex items-center gap-2 text-xs text-text-muted">
                  <span>{event.type === 'commit' ? '\u{1F4DD}' : event.type === 'push' ? '\u{1F680}' : '\u{1F33F}'}</span>
                  <span className="text-coder1-cyan">@{event.username}</span>
                  <span>
                    {event.type === 'commit' && `committed to ${event.branch}`}
                    {event.type === 'push' && 'pushed to remote'}
                    {event.type === 'branch' && `switched to ${event.branch}`}
                  </span>
                  <span className="ml-auto text-text-muted/50 whitespace-nowrap">{timeAgo(event.timestamp)}</span>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-text-muted text-xs">No recent activity</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Summaries Panel */}
      {activePanel === 'summaries' && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              value={summarySearch}
              onChange={(e) => setSummarySearch(e.target.value)}
              placeholder="Search summaries..."
              className="w-full bg-bg-tertiary border border-border-default rounded pl-7 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan"
            />
          </div>

          {/* Loading */}
          {summariesLoading && summaries.length === 0 && (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-bg-tertiary rounded p-3 animate-pulse space-y-2">
                  <div className="h-3 bg-bg-secondary rounded w-2/3" />
                  <div className="h-2.5 bg-bg-secondary rounded w-full" />
                  <div className="h-2.5 bg-bg-secondary rounded w-4/5" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {summariesError && (
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2 flex items-center justify-between">
              <span>{summariesError}</span>
              <button
                onClick={() => {
                  setSummariesError(null);
                  setSummaries([]);
                  setSummariesOffset(0);
                  setSummariesLoading(true);
                  fetch(`/api/team/${syncTeam.id}/summaries`)
                    .then(r => r.json())
                    .then(data => {
                      if (data.success) {
                        setSummaries(data.summaries || []);
                        setSummariesHasMore(data.hasMore ?? false);
                        setSummariesOffset(data.summaries?.length ?? 0);
                      }
                      setSummariesLoading(false);
                    })
                    .catch(() => { setSummariesError('Failed to load'); setSummariesLoading(false); });
                }}
                className="text-coder1-cyan hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!summariesLoading && !summariesError && filteredSummaries.length === 0 && (
            <p className="text-text-muted text-xs">
              {summarySearch ? 'No summaries match your search.' : 'No summaries shared yet. Generate a session summary and click \'Share to ' + syncTeam.name + '\' to add one.'}
            </p>
          )}

          {/* Summary Cards */}
          <div className="space-y-2">
            {filteredSummaries.map(s => (
              <div
                key={s.id}
                className={`bg-bg-tertiary rounded p-3 text-xs space-y-1.5 ${s.is_pinned ? 'border-l-2 border-amber-500' : ''}`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text-primary">
                    {SESSION_TYPE_ICONS[s.session_type || ''] || '📝'} {s.title}
                  </span>
                  <button
                    onClick={() => handleTogglePin(s)}
                    title={s.is_pinned ? 'Unpin' : 'Pin to top'}
                    className={`p-0.5 rounded transition-colors ${s.is_pinned ? 'text-amber-500' : 'text-text-muted/40 hover:text-amber-400'}`}
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                </div>

                {/* Card Meta */}
                <div className="flex items-center gap-1.5 text-text-muted">
                  <span className="text-coder1-cyan">@{s.user_name}</span>
                  {s.branch && <><span>·</span><span className="font-mono">{s.branch}</span></>}
                  {s.files_modified_count > 0 && <><span>·</span><span>{s.files_modified_count} files</span></>}
                </div>

                {/* Excerpt */}
                <p className="text-text-muted leading-relaxed">&ldquo;{s.excerpt}&rdquo;</p>

                {/* Expand / Collapse */}
                <button
                  onClick={() => handleExpandSummary(s.id)}
                  className="flex items-center gap-1 text-coder1-cyan/70 hover:text-coder1-cyan transition-colors mt-1"
                >
                  {expandedId === s.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expandedId === s.id ? 'Collapse' : 'View full'}
                </button>

                {/* Expanded full summary */}
                {expandedId === s.id && (
                  <div className="mt-2 border-t border-border-default pt-2">
                    {expandedLoading ? (
                      <div className="h-3 bg-bg-secondary rounded w-full animate-pulse" />
                    ) : expandedText ? (
                      <div className="max-h-96 overflow-y-auto">
                        <pre className="text-text-muted whitespace-pre-wrap font-sans text-[11px] leading-relaxed">{expandedText}</pre>
                      </div>
                    ) : (
                      <p className="text-text-muted italic">Could not load full summary.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Load More */}
          {summariesHasMore && !summarySearch && (
            <button
              onClick={handleLoadMoreSummaries}
              disabled={summariesLoading}
              className="w-full text-xs text-text-muted hover:text-text-primary py-1.5 border border-border-default rounded hover:border-coder1-cyan/50 transition-colors disabled:opacity-50"
            >
              {summariesLoading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
