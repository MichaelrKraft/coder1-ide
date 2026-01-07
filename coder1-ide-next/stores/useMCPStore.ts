/**
 * MCP Manager Zustand Store
 *
 * Central state management for MCP server management
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  MCPServerWithStatus,
  MCPProfile,
  TokenUsage,
  OptimizationSuggestion,
  MCPFilterTab,
  MCPListResponse,
  MCPToggleResponse,
  MCPAnalyzeResponse,
  MCPOptimizeResponse,
  MCPProfileListResponse,
  MCPProfileApplyResponse,
} from '@/shared/types/mcp.types';

interface MCPState {
  // Server state
  servers: MCPServerWithStatus[];
  isLoadingServers: boolean;
  serversError: string | null;

  // Profile state
  profiles: (MCPProfile & { matchPercentage?: number })[];
  activeProfileId: string | null;
  isLoadingProfiles: boolean;
  profilesError: string | null;

  // Token analysis state
  tokenUsage: TokenUsage | null;
  suggestions: OptimizationSuggestion[];
  isAnalyzing: boolean;
  analysisError: string | null;

  // Optimization state
  isOptimizing: boolean;
  optimizeError: string | null;

  // UI state
  isOverlayOpen: boolean;
  filterTab: MCPFilterTab;
  searchQuery: string;
  selectedServers: Set<string>;

  // Actions - Servers
  fetchServers: () => Promise<void>;
  toggleServer: (serverName: string, enabled: boolean) => Promise<boolean>;
  toggleSelectedServers: (enabled: boolean) => Promise<void>;

  // Actions - Profiles
  fetchProfiles: () => Promise<void>;
  createProfile: (name: string, description?: string) => Promise<MCPProfile | null>;
  applyProfile: (profileId: string) => Promise<boolean>;
  deleteProfile: (profileId: string) => Promise<boolean>;
  saveCurrentAsProfile: (name: string, description?: string) => Promise<MCPProfile | null>;
  createDefaultProfiles: () => Promise<void>;

  // Actions - Analysis & Optimization
  analyzeUsage: () => Promise<void>;
  optimizeForTask: (taskContext: string, maxTokens?: number) => Promise<void>;
  applySuggestion: (suggestionId: string) => Promise<boolean>;
  applyAllSuggestions: () => Promise<void>;

  // Actions - UI
  openOverlay: () => void;
  closeOverlay: () => void;
  toggleOverlay: () => void;
  setFilterTab: (tab: MCPFilterTab) => void;
  setSearchQuery: (query: string) => void;
  toggleServerSelection: (serverName: string) => void;
  selectAllServers: () => void;
  clearSelection: () => void;

  // Computed getters
  getFilteredServers: () => MCPServerWithStatus[];
  getEnabledCount: () => number;
  getTotalTokens: () => number;
}

export const useMCPStore = create<MCPState>()(
  devtools(
    (set, get) => ({
      // Initial state
      servers: [],
      isLoadingServers: false,
      serversError: null,

      profiles: [],
      activeProfileId: null,
      isLoadingProfiles: false,
      profilesError: null,

      tokenUsage: null,
      suggestions: [],
      isAnalyzing: false,
      analysisError: null,

      isOptimizing: false,
      optimizeError: null,

      isOverlayOpen: false,
      filterTab: 'all',
      searchQuery: '',
      selectedServers: new Set(),

      // === Server Actions ===
      fetchServers: async () => {
        set({ isLoadingServers: true, serversError: null });
        try {
          const response = await fetch('/api/mcp/servers');
          if (!response.ok) throw new Error('Failed to fetch servers');

          const data: MCPListResponse = await response.json();
          set({ servers: data.servers, isLoadingServers: false });
        } catch (error) {
          set({
            serversError: (error as Error).message,
            isLoadingServers: false,
          });
        }
      },

      toggleServer: async (serverName: string, enabled: boolean) => {
        // Optimistic update
        const previousServers = get().servers;
        set({
          servers: previousServers.map(s =>
            s.name === serverName ? { ...s, enabled } : s
          ),
        });

        try {
          const response = await fetch('/api/mcp/servers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverName, enabled }),
          });

          if (!response.ok) {
            // Revert on error
            set({ servers: previousServers });
            return false;
          }

          const data: MCPToggleResponse = await response.json();
          // Refresh servers to get accurate state
          await get().fetchServers();
          return data.success;
        } catch (error) {
          set({ servers: previousServers });
          return false;
        }
      },

      toggleSelectedServers: async (enabled: boolean) => {
        const selected = get().selectedServers;
        for (const serverName of selected) {
          await get().toggleServer(serverName, enabled);
        }
        set({ selectedServers: new Set() });
      },

      // === Profile Actions ===
      fetchProfiles: async () => {
        set({ isLoadingProfiles: true, profilesError: null });
        try {
          const response = await fetch('/api/mcp/profiles');
          if (!response.ok) throw new Error('Failed to fetch profiles');

          const data: MCPProfileListResponse & { profiles: (MCPProfile & { matchPercentage?: number })[] } =
            await response.json();
          set({
            profiles: data.profiles,
            activeProfileId: data.activeProfileId || null,
            isLoadingProfiles: false,
          });
        } catch (error) {
          set({
            profilesError: (error as Error).message,
            isLoadingProfiles: false,
          });
        }
      },

      createProfile: async (name: string, description?: string) => {
        try {
          const response = await fetch('/api/mcp/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', name, description }),
          });

          if (!response.ok) throw new Error('Failed to create profile');

          const data = await response.json();
          await get().fetchProfiles();
          return data.profile;
        } catch (error) {
          console.error('Failed to create profile:', error);
          return null;
        }
      },

      applyProfile: async (profileId: string) => {
        try {
          const response = await fetch('/api/mcp/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'apply', profileId }),
          });

          if (!response.ok) throw new Error('Failed to apply profile');

          const data: MCPProfileApplyResponse = await response.json();

          // Refresh both servers and profiles
          await Promise.all([get().fetchServers(), get().fetchProfiles()]);

          return data.success;
        } catch (error) {
          console.error('Failed to apply profile:', error);
          return false;
        }
      },

      deleteProfile: async (profileId: string) => {
        try {
          const response = await fetch(`/api/mcp/profiles?id=${profileId}`, {
            method: 'DELETE',
          });

          if (!response.ok) throw new Error('Failed to delete profile');

          await get().fetchProfiles();
          return true;
        } catch (error) {
          console.error('Failed to delete profile:', error);
          return false;
        }
      },

      saveCurrentAsProfile: async (name: string, description?: string) => {
        try {
          const response = await fetch('/api/mcp/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save-current', name, description }),
          });

          if (!response.ok) throw new Error('Failed to save profile');

          const data = await response.json();
          await get().fetchProfiles();
          return data.profile;
        } catch (error) {
          console.error('Failed to save profile:', error);
          return null;
        }
      },

      createDefaultProfiles: async () => {
        try {
          await fetch('/api/mcp/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create-defaults' }),
          });
          await get().fetchProfiles();
        } catch (error) {
          console.error('Failed to create default profiles:', error);
        }
      },

      // === Analysis & Optimization Actions ===
      analyzeUsage: async () => {
        set({ isAnalyzing: true, analysisError: null });
        try {
          const response = await fetch('/api/mcp/analyze');
          if (!response.ok) throw new Error('Failed to analyze usage');

          const data: MCPAnalyzeResponse = await response.json();
          set({
            tokenUsage: data.usage,
            suggestions: data.suggestions,
            isAnalyzing: false,
          });
        } catch (error) {
          set({
            analysisError: (error as Error).message,
            isAnalyzing: false,
          });
        }
      },

      optimizeForTask: async (taskContext: string, maxTokens?: number) => {
        set({ isOptimizing: true, optimizeError: null });
        try {
          const response = await fetch('/api/mcp/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskContext, maxTokens }),
          });

          if (!response.ok) throw new Error('Failed to optimize');

          const data: MCPOptimizeResponse = await response.json();
          set({
            suggestions: data.suggestions,
            tokenUsage: data.currentUsage,
            isOptimizing: false,
          });
        } catch (error) {
          set({
            optimizeError: (error as Error).message,
            isOptimizing: false,
          });
        }
      },

      applySuggestion: async (suggestionId: string) => {
        const suggestion = get().suggestions.find(s => s.id === suggestionId);
        if (!suggestion) return false;

        if (suggestion.type === 'disable') {
          return await get().toggleServer(suggestion.serverName, false);
        } else if (suggestion.type === 'enable') {
          return await get().toggleServer(suggestion.serverName, true);
        }

        return false;
      },

      applyAllSuggestions: async () => {
        const suggestions = get().suggestions.filter(s => s.autoApplicable);
        for (const suggestion of suggestions) {
          await get().applySuggestion(suggestion.id);
        }
        // Refresh analysis
        await get().analyzeUsage();
      },

      // === UI Actions ===
      openOverlay: () => {
        console.log('[MCP Store] openOverlay called');
        set({ isOverlayOpen: true });
      },
      closeOverlay: () => {
        console.log('[MCP Store] closeOverlay called');
        set({ isOverlayOpen: false });
      },
      toggleOverlay: () => {
        const current = get().isOverlayOpen;
        console.log('[MCP Store] toggleOverlay called, current:', current, '-> new:', !current);
        set(state => ({ isOverlayOpen: !state.isOverlayOpen }));
      },

      setFilterTab: (tab: MCPFilterTab) => set({ filterTab: tab }),
      setSearchQuery: (query: string) => set({ searchQuery: query }),

      toggleServerSelection: (serverName: string) => {
        const selected = new Set(get().selectedServers);
        if (selected.has(serverName)) {
          selected.delete(serverName);
        } else {
          selected.add(serverName);
        }
        set({ selectedServers: selected });
      },

      selectAllServers: () => {
        const filtered = get().getFilteredServers();
        set({ selectedServers: new Set(filtered.map(s => s.name)) });
      },

      clearSelection: () => set({ selectedServers: new Set() }),

      // === Computed Getters ===
      getFilteredServers: () => {
        const { servers, filterTab, searchQuery } = get();

        return servers.filter(server => {
          // Filter by tab
          if (filterTab === 'enabled' && !server.enabled) return false;
          if (filterTab === 'disabled' && server.enabled) return false;

          // Filter by search
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = server.name.toLowerCase().includes(query);
            const matchesCategory = server.category.toLowerCase().includes(query);
            const matchesDescription = server.description?.toLowerCase().includes(query);
            if (!matchesName && !matchesCategory && !matchesDescription) return false;
          }

          return true;
        });
      },

      getEnabledCount: () => get().servers.filter(s => s.enabled).length,

      getTotalTokens: () => get().tokenUsage?.totalEstimated || 0,
    }),
    { name: 'mcp-store' }
  )
);
