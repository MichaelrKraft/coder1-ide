'use client';

import React, { useState } from 'react';
import { UserPlus, Trash2, Check, Monitor, Copy, Clock } from 'lucide-react';
import { useSpectatorStore } from '@/stores/useSpectatorStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { getSocket } from '@/lib/socket';
import type { TeamMember, TeamFact, CodeEvent } from './types';
import { timeAgo } from './types';

interface PendingInvitation {
  id: string;
  email: string;
  token: string;
  expires_at: string;
}

interface TeamTabProps {
  syncTeam: { id: string; name: string };
  members: TeamMember[];
  pendingInvitations: PendingInvitation[];
  facts: TeamFact[];
  recentActivity: CodeEvent[];
  onlineMembers: { userId: string; username: string }[];
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  copied: boolean;
  handleInvite: () => void;
  handleDeleteFact: (factId: string) => void;
}

export default function TeamTab({
  syncTeam,
  members,
  pendingInvitations,
  facts,
  recentActivity,
  onlineMembers,
  inviteEmail,
  setInviteEmail,
  copied,
  handleInvite,
  handleDeleteFact,
}: TeamTabProps) {
  const { sharedTerminals } = useSpectatorStore();

  return (
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

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Pending ({pendingInvitations.length})</h4>
          <div className="space-y-1">
            {pendingInvitations.map(inv => (
              <div key={inv.id} className="flex items-center gap-2 text-sm text-text-muted">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs text-amber-400">
                  <Clock className="w-3 h-3" />
                </div>
                <span className="flex-1 truncate">{inv.email}</span>
                <button
                  onClick={async () => {
                    const link = `${window.location.origin}/api/team/join?token=${inv.token}`;
                    await navigator.clipboard.writeText(link);
                  }}
                  className="text-text-muted/60 hover:text-coder1-cyan transition-colors p-0.5"
                  title="Copy invite link"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <span>{event.type === 'commit' ? '\uD83D\uDCDD' : event.type === 'push' ? '\uD83D\uDE80' : '\uD83C\uDF3F'}</span>
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
  );
}
