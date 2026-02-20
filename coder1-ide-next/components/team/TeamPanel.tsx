'use client';

import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, Trash2, GitBranch } from 'lucide-react';
import { useTeamStore } from '@/stores/useTeamStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { getSocket } from '@/lib/socket';
import { useSpectatorStore } from '@/stores/useSpectatorStore';
import type { TeamSummary } from '@/types/team';
import type { TeamMember, TeamFact, CodeEvent } from './tabs/types';
import { mapAndSortKnowledge } from './tabs/types';

// Extracted tab components
import TeamTab from './tabs/TeamTab';
import SummariesTab from './tabs/SummariesTab';
import BriefingTab from './tabs/BriefingTab';
import PRDashboardTab from './tabs/PRDashboardTab';
import ConflictsTab from './tabs/ConflictsTab';
import ChatTab from './tabs/ChatTab';
import CallNotificationBanner from './CallNotificationBanner';
import { useVoiceCallStore } from '@/stores/useVoiceCallStore';

export default function TeamPanel() {
  const {
    syncTeam, syncStatus, createTeam, triggerSync,
    teams, selectTeam, onlineMembers, fetchTeams,
    openToSummariesTab, setOpenToSummariesTab,
  } = useTeamStore();
  const { sharedTerminals } = useSpectatorStore();

  // Panel tabs
  const [activePanel, setActivePanel] = useState<'main' | 'summaries' | 'briefing' | 'prs' | 'conflicts' | 'chat'>('main');
  const { joinCall, callStatus } = useVoiceCallStore();
  const isVoiceEnabled = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_VOICE_CALLS === 'true';

  // Existing state
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [facts, setFacts] = useState<TeamFact[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [gitSuggestion, setGitSuggestion] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<CodeEvent[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [copied, setCopied] = useState(false);

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

  // Briefing state
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [briefingGeneratedAt, setBriefingGeneratedAt] = useState<string | null>(null);

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
        .catch(() => {});
    }
  }, [syncTeam, teams.length]);

  // Load cached briefing from localStorage when team changes
  useEffect(() => {
    if (!syncTeam?.id) return;
    const cached = localStorage.getItem(`coder1:team:${syncTeam.id}:briefing`);
    if (cached) {
      try {
        const { text, generatedAt } = JSON.parse(cached) as { text: string; generatedAt: string };
        setBriefing(text);
        setBriefingGeneratedAt(generatedAt);
      } catch {
        localStorage.removeItem(`coder1:team:${syncTeam.id}:briefing`);
      }
    } else {
      setBriefing(null);
      setBriefingGeneratedAt(null);
    }
  }, [syncTeam?.id]);

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

      let user = useAuthStore.getState().user;
      emitPresence(user);

      const unsubscribeAuth = useAuthStore.subscribe((state) => {
        if (state.user && !user) {
          user = state.user;
          emitPresence(user);
        }
      });

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

  const generateBriefing = async () => {
    if (!syncTeam?.id) return;
    setBriefingLoading(true);
    setBriefingError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch(`/api/team/${syncTeam.id}/briefing`, {
        method: 'POST',
        signal: controller.signal,
      });
      const data = await res.json() as { briefing?: string; generatedAt?: string; error?: string; waitSecs?: number };

      if (!res.ok) {
        setBriefingError(data.error ?? 'Failed to generate briefing.');
      } else if (data.briefing && data.generatedAt) {
        setBriefing(data.briefing);
        setBriefingGeneratedAt(data.generatedAt);
        localStorage.setItem(
          `coder1:team:${syncTeam.id}:briefing`,
          JSON.stringify({ text: data.briefing, generatedAt: data.generatedAt })
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setBriefingError('Request timed out. Please try again.');
      } else {
        setBriefingError('Network error. Please try again.');
      }
    } finally {
      clearTimeout(timeoutId);
      setBriefingLoading(false);
    }
  };

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
    const { inviteMember } = useTeamStore.getState();
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
      const sock = await getSocket();
      const user = useAuthStore.getState().user;
      if (sock && user) {
        sock.emit('team:presence:join', {
          teamId: syncTeam.id,
          userId: user.id,
          username: user.username,
        });
      }
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

  const handleRetrySummaries = () => {
    if (!syncTeam) return;
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
  };

  // No team -- show creation form
  if (!syncTeam) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-text-primary">
          <Users className="w-5 h-5 text-coder1-cyan" />
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

  // Has team -- show management with tabs
  return (
    <div className="p-4 space-y-4">
      {/* Header with connection status */}
      <div className="space-y-2">
        {/* Row 1: Team name, selector, and connection status */}
        <div className="flex items-center gap-2 text-text-primary">
          <Users className="w-5 h-5 text-coder1-cyan" />
          <h3 className="font-semibold">{syncTeam.name}</h3>
          {/* Connection status indicator inline */}
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${syncStatus.isConnected ? 'bg-green-400' : 'bg-yellow-400'}`} title={syncStatus.isConnected ? 'Connected' : 'Disconnected'} />
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
            title="Sync team knowledge"
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

      {/* Compact connection status line */}
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
          Summaries
          {unreadCount > 0 && (
            <span className="ml-1 px-1 py-0.5 bg-coder1-cyan text-bg-primary text-[10px] font-bold rounded-full leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActivePanel('briefing')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
            activePanel === 'briefing'
              ? 'border-coder1-cyan text-coder1-cyan'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Briefing
        </button>
        {isVoiceEnabled && (
          <button
            onClick={() => setActivePanel('chat')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activePanel === 'chat'
                ? 'border-coder1-cyan text-coder1-cyan'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Chat
          </button>
        )}
        <button
          onClick={() => setActivePanel('prs')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
            activePanel === 'prs'
              ? 'border-coder1-cyan text-coder1-cyan'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          PRs
        </button>
        <button
          onClick={() => setActivePanel('conflicts')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
            activePanel === 'conflicts'
              ? 'border-orange-400 text-orange-400'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Conflicts
        </button>
      </div>

      {/* Tab Content */}
      {/* Voice call notification banner + start button */}
      {isVoiceEnabled && activePanel === 'main' && (
        <>
          <CallNotificationBanner teamId={syncTeam.id} />
          {callStatus === 'idle' && (
            <div className="px-3 mb-2">
              <button
                onClick={() => joinCall(syncTeam.id)}
                className="w-full py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                Start Voice Call
              </button>
            </div>
          )}
        </>
      )}

      {activePanel === 'main' && (
        <TeamTab
          syncTeam={{ id: syncTeam.id, name: syncTeam.name }}
          members={members}
          facts={facts}
          recentActivity={recentActivity}
          onlineMembers={onlineMembers}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          copied={copied}
          handleInvite={handleInvite}
          handleDeleteFact={handleDeleteFact}
        />
      )}

      {activePanel === 'summaries' && (
        <SummariesTab
          syncTeam={{ id: syncTeam.id, name: syncTeam.name }}
          summaries={summaries}
          summariesLoading={summariesLoading}
          summariesError={summariesError}
          summariesHasMore={summariesHasMore}
          summarySearch={summarySearch}
          setSummarySearch={setSummarySearch}
          expandedId={expandedId}
          expandedText={expandedText}
          expandedLoading={expandedLoading}
          handleExpandSummary={handleExpandSummary}
          handleTogglePin={handleTogglePin}
          handleLoadMoreSummaries={handleLoadMoreSummaries}
          setSummariesError={setSummariesError}
          setSummaries={setSummaries}
          setSummariesOffset={setSummariesOffset}
          setSummariesHasMore={setSummariesHasMore}
          setSummariesLoading={setSummariesLoading}
        />
      )}

      {activePanel === 'briefing' && (
        <BriefingTab
          briefing={briefing}
          briefingLoading={briefingLoading}
          briefingError={briefingError}
          briefingGeneratedAt={briefingGeneratedAt}
          generateBriefing={generateBriefing}
        />
      )}

      {activePanel === 'prs' && (
        <PRDashboardTab syncTeam={{ id: syncTeam.id, name: syncTeam.name }} />
      )}

      {activePanel === 'conflicts' && (
        <ConflictsTab syncTeam={{ id: syncTeam.id, name: syncTeam.name }} />
      )}

      {activePanel === 'chat' && isVoiceEnabled && (
        <ChatTab teamId={syncTeam.id} />
      )}
    </div>
  );
}
