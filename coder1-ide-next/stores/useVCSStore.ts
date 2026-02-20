'use client';

import { create } from 'zustand';
import type {
  TeamPullRequest,
  VCSConnectionStatus,
  FileConflict,
  PRFilterOptions,
} from '@/types/vcs';

interface VCSStore {
  // Connection state
  connectionStatus: VCSConnectionStatus | null;
  isConnecting: boolean;
  connectionError: string | null;

  // PR data
  pullRequests: TeamPullRequest[];
  prsLoading: boolean;
  prsError: string | null;
  prsCachedAt: string | null;
  prsStale: boolean;

  // Filters
  prFilters: PRFilterOptions;

  // Conflicts (referenced but primarily owned by Agent 3)
  conflicts: FileConflict[];

  // Actions
  setConnectionStatus: (status: VCSConnectionStatus | null) => void;
  setConnectionError: (error: string | null) => void;
  setPRs: (prs: TeamPullRequest[], cachedAt: string) => void;
  setPRsLoading: (loading: boolean) => void;
  setPRsError: (error: string | null) => void;
  setPRFilter: (filter: Partial<PRFilterOptions>) => void;
  resetPRFilters: () => void;
  updatePR: (pr: TeamPullRequest) => void;
  removePR: (prId: string) => void;
  addConflict: (conflict: FileConflict) => void;
  removeConflict: (filePath: string) => void;

  // Fetch action
  fetchPullRequests: (teamId: string) => Promise<void>;
  checkConnection: () => Promise<void>;
}

const DEFAULT_FILTERS: PRFilterOptions = {
  author: null,
  status: 'all',
  search: '',
  sortBy: 'updated',
};

export const useVCSStore = create<VCSStore>()((set, get) => ({
  // Initial state
  connectionStatus: null,
  isConnecting: false,
  connectionError: null,
  pullRequests: [],
  prsLoading: false,
  prsError: null,
  prsCachedAt: null,
  prsStale: false,
  prFilters: { ...DEFAULT_FILTERS },
  conflicts: [],

  // Connection
  setConnectionStatus: (status) => set({ connectionStatus: status, connectionError: null }),
  setConnectionError: (error) => set({ connectionError: error, isConnecting: false }),

  // PRs
  setPRs: (prs, cachedAt) => set({
    pullRequests: prs,
    prsCachedAt: cachedAt,
    prsStale: false,
    prsError: null,
    prsLoading: false,
  }),
  setPRsLoading: (loading) => set({ prsLoading: loading }),
  setPRsError: (error) => set({ prsError: error, prsLoading: false }),

  // Filters
  setPRFilter: (filter) => set((state) => ({
    prFilters: { ...state.prFilters, ...filter },
  })),
  resetPRFilters: () => set({ prFilters: { ...DEFAULT_FILTERS } }),

  // Real-time updates
  updatePR: (pr) => set((state) => {
    const index = state.pullRequests.findIndex(p => p.id === pr.id);
    if (index >= 0) {
      const updated = [...state.pullRequests];
      updated[index] = pr;
      return { pullRequests: updated };
    }
    // New PR - add to front
    return { pullRequests: [pr, ...state.pullRequests] };
  }),

  removePR: (prId) => set((state) => ({
    pullRequests: state.pullRequests.filter(p => p.id !== prId),
  })),

  // Conflicts
  addConflict: (conflict) => set((state) => {
    const existing = state.conflicts.findIndex(c => c.filePath === conflict.filePath);
    if (existing >= 0) {
      const updated = [...state.conflicts];
      updated[existing] = conflict;
      return { conflicts: updated };
    }
    return { conflicts: [...state.conflicts, conflict] };
  }),

  removeConflict: (filePath) => set((state) => ({
    conflicts: state.conflicts.filter(c => c.filePath !== filePath),
  })),

  // Fetch PRs from API
  fetchPullRequests: async (teamId: string) => {
    const { prsLoading } = get();
    if (prsLoading) return;

    set({ prsLoading: true, prsError: null });

    try {
      const response = await fetch(`/api/vcs/team/${teamId}/prs`);

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to fetch PRs' }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      set({
        pullRequests: data.prs ?? [],
        prsCachedAt: data.cachedAt ?? new Date().toISOString(),
        prsStale: data.stale ?? false,
        prsError: null,
        prsLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch PRs';
      set({ prsError: message, prsLoading: false });
    }
  },

  // Check VCS connection status
  checkConnection: async () => {
    set({ isConnecting: true });
    try {
      const response = await fetch('/api/vcs/status');
      if (response.ok) {
        const data = await response.json();
        set({
          connectionStatus: data,
          isConnecting: false,
          connectionError: null,
        });
      } else {
        set({
          connectionStatus: { connected: false, provider: 'github' },
          isConnecting: false,
        });
      }
    } catch {
      set({
        connectionStatus: { connected: false, provider: 'github' },
        isConnecting: false,
      });
    }
  },
}));

// Selector helpers for filtered/sorted PRs
export function getFilteredPRs(state: VCSStore): TeamPullRequest[] {
  const { pullRequests, prFilters } = state;
  let filtered = [...pullRequests];

  // Filter by author
  if (prFilters.author) {
    filtered = filtered.filter(pr => pr.author.login === prFilters.author);
  }

  // Filter by status
  switch (prFilters.status) {
    case 'open':
      filtered = filtered.filter(pr => pr.state === 'open' && !pr.isDraft);
      break;
    case 'draft':
      filtered = filtered.filter(pr => pr.isDraft);
      break;
    case 'review_required':
      filtered = filtered.filter(pr => pr.reviewDecision === 'review_required');
      break;
    // 'all' - no filter
  }

  // Filter by search text
  if (prFilters.search.trim()) {
    const search = prFilters.search.toLowerCase();
    filtered = filtered.filter(pr =>
      pr.title.toLowerCase().includes(search) ||
      pr.author.login.toLowerCase().includes(search) ||
      pr.headBranch.toLowerCase().includes(search) ||
      pr.repository.fullName.toLowerCase().includes(search)
    );
  }

  // Sort
  switch (prFilters.sortBy) {
    case 'created':
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'title':
      filtered.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'updated':
    default:
      filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      break;
  }

  return filtered;
}
