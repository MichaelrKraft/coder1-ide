'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ================================================================================
// Types
// ================================================================================

interface SyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastPushAt: string | null;
  lastPullAt: string | null;
  pendingCount: number;
  error: string | null;
}

interface SyncTeam {
  id: string;
  name: string;
  slug: string;
  memberCount?: number;
  factCount?: number;
}

// ================================================================================
// Team Store Interface
// ================================================================================

interface TeamStore {
  // State — uses "syncTeam" to avoid collision with useSessionStore.activeTeam
  syncTeam: SyncTeam | null;
  teams: SyncTeam[];
  syncStatus: SyncStatus;
  hasReceivedBriefing: boolean;
  onlineMembers: { userId: string; username: string }[];

  // Actions
  setSyncTeam: (team: SyncTeam | null) => void;
  updateSyncStatus: (status: Partial<SyncStatus>) => void;
  markBriefingReceived: () => void;
  fetchTeams: () => Promise<void>;
  createTeam: (name: string) => Promise<SyncTeam>;
  inviteMember: (email: string) => Promise<string | null>;
  triggerSync: () => Promise<boolean>;
  selectTeam: (teamId: string) => void;
  setOnlineMembers: (members: { userId: string; username: string }[]) => void;
}

// ================================================================================
// Store Implementation
// ================================================================================

export const useTeamStore = create<TeamStore>()(
  persist(
    (set, get) => ({
      syncTeam: null,
      teams: [],
      syncStatus: {
        isConnected: false,
        isSyncing: false,
        lastPushAt: null,
        lastPullAt: null,
        pendingCount: 0,
        error: null,
      },
      hasReceivedBriefing: false,
      onlineMembers: [],

      setSyncTeam: (team) => set({ syncTeam: team }),

      updateSyncStatus: (status) => set((state) => ({
        syncStatus: { ...state.syncStatus, ...status },
      })),

      markBriefingReceived: () => set({ hasReceivedBriefing: true }),

      fetchTeams: async () => {
        try {
          const res = await fetch('/api/team/mine');
          const data = await res.json();
          if (data.success && data.data?.length > 0) {
            const allTeams: SyncTeam[] = data.data.map((t: Record<string, string>) => ({
              id: t.id, name: t.name, slug: t.slug,
            }));
            const current = get().syncTeam;
            const stillValid = current && allTeams.some((t) => t.id === current.id);
            set({
              teams: allTeams,
              syncTeam: stillValid ? current : allTeams[0],
            });
          }
        } catch (err) {
          console.warn('[TeamStore] Failed to fetch teams:', err);
        }
      },

      createTeam: async (name) => {
        try {
          const res = await fetch('/api/team/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
          });
          const data = await res.json();
          if (data.success) {
            const team: SyncTeam = { id: data.data.id, name: data.data.name, slug: data.data.slug };
            set({ syncTeam: team });
            return team;
          }
          throw new Error(data.error || 'Failed to create team');
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to create team';
          throw new Error(message);
        }
      },

      inviteMember: async (email) => {
        const { syncTeam } = get();
        if (!syncTeam) return null;
        try {
          const res = await fetch(`/api/team/${syncTeam.id}/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          if (data.success) return data.data.invite_link;
          return null;
        } catch {
          return null;
        }
      },

      triggerSync: async () => {
        const { syncTeam, syncStatus } = get();
        if (!syncTeam || syncStatus.isSyncing) return false;

        set((state) => ({
          syncStatus: { ...state.syncStatus, isSyncing: true, error: null },
        }));

        try {
          const res = await fetch('/api/team/sync/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId: syncTeam.id }),
          });
          const data = await res.json();
          if (data.ok && data.status) {
            set((state) => ({
              syncStatus: {
                ...state.syncStatus,
                isConnected: data.status.isConnected ?? state.syncStatus.isConnected,
                lastPushAt: data.status.lastPushAt ?? state.syncStatus.lastPushAt,
                lastPullAt: data.status.lastPullAt ?? state.syncStatus.lastPullAt,
                pendingCount: data.status.pendingCount ?? 0,
                isSyncing: false,
                error: null,
              },
            }));
            return true;
          }
          set((state) => ({
            syncStatus: { ...state.syncStatus, isSyncing: false, error: data.error || 'Sync failed' },
          }));
          return false;
        } catch (err) {
          set((state) => ({
            syncStatus: {
              ...state.syncStatus,
              isSyncing: false,
              error: err instanceof Error ? err.message : 'Sync failed',
            },
          }));
          return false;
        }
      },

      selectTeam: (teamId) => {
        const { teams } = get();
        const found = teams.find((t) => t.id === teamId);
        if (found) set({ syncTeam: found });
      },

      setOnlineMembers: (members) => set({ onlineMembers: members }),
    }),
    {
      name: 'coder1-team-store',
      partialize: (state) => ({
        syncTeam: state.syncTeam,
        teams: state.teams,
        hasReceivedBriefing: state.hasReceivedBriefing,
      }),
    }
  )
);
