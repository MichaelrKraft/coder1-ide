/**
 * MCP Manager Hook
 *
 * High-level hook for managing MCP servers, profiles, and optimization
 * Wraps the Zustand store with additional conveniences
 */

'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useMCPStore } from '@/stores/useMCPStore';

/**
 * Main MCP Manager hook
 * Provides all MCP management functionality with auto-loading.
 *
 * Uses individual Zustand selectors to avoid render loops caused by
 * subscribing to the entire store object (which creates unstable references).
 */
export function useMCPManager(options: { autoLoad?: boolean } = {}) {
  const { autoLoad = true } = options;

  // State — individual selectors (stable, only re-render when specific value changes)
  const servers = useMCPStore(s => s.servers);
  const profiles = useMCPStore(s => s.profiles);
  const activeProfileId = useMCPStore(s => s.activeProfileId);
  const tokenUsage = useMCPStore(s => s.tokenUsage);
  const suggestions = useMCPStore(s => s.suggestions);

  // Loading states
  const isLoadingServers = useMCPStore(s => s.isLoadingServers);
  const isLoadingProfiles = useMCPStore(s => s.isLoadingProfiles);
  const isAnalyzing = useMCPStore(s => s.isAnalyzing);
  const isOptimizing = useMCPStore(s => s.isOptimizing);
  const isServersInitialized = useMCPStore(s => s.isServersInitialized);
  const isProfilesInitialized = useMCPStore(s => s.isProfilesInitialized);

  // Errors
  const serversError = useMCPStore(s => s.serversError);
  const profilesError = useMCPStore(s => s.profilesError);
  const analysisError = useMCPStore(s => s.analysisError);
  const optimizeError = useMCPStore(s => s.optimizeError);

  // UI state
  const isOverlayOpen = useMCPStore(s => s.isOverlayOpen);
  const filterTab = useMCPStore(s => s.filterTab);
  const searchQuery = useMCPStore(s => s.searchQuery);
  const selectedServers = useMCPStore(s => s.selectedServers);

  // Actions — Zustand actions are stable references (never change between renders)
  const fetchServers = useMCPStore(s => s.fetchServers);
  const fetchProfiles = useMCPStore(s => s.fetchProfiles);
  const analyzeUsage = useMCPStore(s => s.analyzeUsage);
  const toggleServer = useMCPStore(s => s.toggleServer);
  const toggleSelectedServers = useMCPStore(s => s.toggleSelectedServers);
  const createProfile = useMCPStore(s => s.createProfile);
  const applyProfile = useMCPStore(s => s.applyProfile);
  const deleteProfile = useMCPStore(s => s.deleteProfile);
  const saveCurrentAsProfile = useMCPStore(s => s.saveCurrentAsProfile);
  const createDefaultProfiles = useMCPStore(s => s.createDefaultProfiles);
  const optimizeForTask = useMCPStore(s => s.optimizeForTask);
  const applySuggestion = useMCPStore(s => s.applySuggestion);
  const applyAllSuggestions = useMCPStore(s => s.applyAllSuggestions);
  const openOverlay = useMCPStore(s => s.openOverlay);
  const closeOverlay = useMCPStore(s => s.closeOverlay);
  const toggleOverlay = useMCPStore(s => s.toggleOverlay);
  const setFilterTab = useMCPStore(s => s.setFilterTab);
  const setSearchQuery = useMCPStore(s => s.setSearchQuery);
  const toggleServerSelection = useMCPStore(s => s.toggleServerSelection);
  const selectAllServers = useMCPStore(s => s.selectAllServers);
  const clearSelection = useMCPStore(s => s.clearSelection);
  const getFilteredServers = useMCPStore(s => s.getFilteredServers);
  const getEnabledCount = useMCPStore(s => s.getEnabledCount);
  const getTotalTokens = useMCPStore(s => s.getTotalTokens);

  // Auto-load servers and profiles on mount
  useEffect(() => {
    if (autoLoad && !isServersInitialized && !isLoadingServers) {
      fetchServers();
    }
    if (autoLoad && !isProfilesInitialized && !isLoadingProfiles) {
      fetchProfiles();
    }
  }, [autoLoad, isServersInitialized, isLoadingServers, isProfilesInitialized, isLoadingProfiles, fetchServers, fetchProfiles]);

  // Stable refresh callback
  const refresh = useCallback(async () => {
    await Promise.all([fetchServers(), fetchProfiles(), analyzeUsage()]);
  }, [fetchServers, fetchProfiles, analyzeUsage]);

  // Stable disable/enable all callbacks
  const disableAll = useCallback(async () => {
    for (const server of servers) {
      if (server.enabled) {
        await toggleServer(server.name, false);
      }
    }
  }, [servers, toggleServer]);

  const enableAll = useCallback(async () => {
    for (const server of servers) {
      if (!server.enabled) {
        await toggleServer(server.name, true);
      }
    }
  }, [servers, toggleServer]);

  // Computed values — memoized to avoid creating new arrays/values each render
  const filteredServers = useMemo(() => getFilteredServers(), [getFilteredServers, servers, filterTab, searchQuery]);
  const enabledCount = useMemo(() => getEnabledCount(), [getEnabledCount, servers]);
  const totalTokens = useMemo(() => getTotalTokens(), [getTotalTokens, tokenUsage]);

  return {
    // State
    servers,
    profiles,
    activeProfileId,
    tokenUsage,
    suggestions,

    // Loading states
    isLoadingServers,
    isLoadingProfiles,
    isAnalyzing,
    isOptimizing,
    isServersInitialized,
    isProfilesInitialized,

    // Errors
    serversError,
    profilesError,
    analysisError,
    optimizeError,

    // UI state
    isOverlayOpen,
    filterTab,
    searchQuery,
    selectedServers,

    // Computed
    filteredServers,
    enabledCount,
    totalTokens,

    // Server actions
    toggleServer,
    toggleSelectedServers,

    // Profile actions
    createProfile,
    applyProfile,
    deleteProfile,
    saveCurrentAsProfile,
    createDefaultProfiles,

    // Analysis actions
    analyzeUsage,
    optimizeForTask,
    applySuggestion,
    applyAllSuggestions,

    // UI actions
    openOverlay,
    closeOverlay,
    toggleOverlay,
    setFilterTab,
    setSearchQuery,
    toggleServerSelection,
    selectAllServers,
    clearSelection,

    // Convenience actions
    refresh,
    disableAll,
    enableAll,
  };
}

/**
 * Hook for just the overlay state
 */
export function useMCPOverlay() {
  const isOpen = useMCPStore(state => state.isOverlayOpen);
  const open = useMCPStore(state => state.openOverlay);
  const close = useMCPStore(state => state.closeOverlay);
  const toggle = useMCPStore(state => state.toggleOverlay);

  return { isOpen, open, close, toggle };
}

/**
 * Hook for token usage data
 */
export function useMCPTokens() {
  const tokenUsage = useMCPStore(state => state.tokenUsage);
  const isAnalyzing = useMCPStore(state => state.isAnalyzing);
  const analyzeUsage = useMCPStore(state => state.analyzeUsage);
  const error = useMCPStore(state => state.analysisError);

  useEffect(() => {
    // Prevent infinite loop: only analyze if not analyzing AND no previous error
    if (!tokenUsage && !isAnalyzing && !error) {
      analyzeUsage();
    }
  }, [tokenUsage, isAnalyzing, analyzeUsage, error]);

  return {
    usage: tokenUsage,
    isAnalyzing,
    refresh: analyzeUsage,
  };
}

/**
 * Hook for profile management
 */
export function useMCPProfiles() {
  const profiles = useMCPStore(state => state.profiles);
  const activeProfileId = useMCPStore(state => state.activeProfileId);
  const isLoading = useMCPStore(state => state.isLoadingProfiles);
  const error = useMCPStore(state => state.profilesError);
  const isInitialized = useMCPStore(state => state.isProfilesInitialized);

  const fetchProfiles = useMCPStore(state => state.fetchProfiles);
  const createProfile = useMCPStore(state => state.createProfile);
  const applyProfile = useMCPStore(state => state.applyProfile);
  const deleteProfile = useMCPStore(state => state.deleteProfile);
  const saveCurrentAsProfile = useMCPStore(state => state.saveCurrentAsProfile);

  useEffect(() => {
    // Prevent infinite loop: check for initialized
    if (!isInitialized && !isLoading && !error) {
      fetchProfiles();
    }
  }, [isInitialized, isLoading, fetchProfiles, error]);

  const activeProfile = profiles.find(p => p.id === activeProfileId);

  return {
    profiles,
    activeProfile,
    activeProfileId,
    isLoading,
    isInitialized,
    error,
    createProfile,
    applyProfile,
    deleteProfile,
    saveCurrentAsProfile,
    refresh: fetchProfiles,
  };
}

/**
 * Hook for server list with filtering
 */
export function useMCPServers() {
  const servers = useMCPStore(state => state.servers);
  const isLoading = useMCPStore(state => state.isLoadingServers);
  const error = useMCPStore(state => state.serversError);
  const isInitialized = useMCPStore(state => state.isServersInitialized);
  const filterTab = useMCPStore(state => state.filterTab);
  const searchQuery = useMCPStore(state => state.searchQuery);
  const selectedServers = useMCPStore(state => state.selectedServers);

  const fetchServers = useMCPStore(state => state.fetchServers);
  const toggleServer = useMCPStore(state => state.toggleServer);
  const setFilterTab = useMCPStore(state => state.setFilterTab);
  const setSearchQuery = useMCPStore(state => state.setSearchQuery);
  const toggleServerSelection = useMCPStore(state => state.toggleServerSelection);
  const selectAllServers = useMCPStore(state => state.selectAllServers);
  const clearSelection = useMCPStore(state => state.clearSelection);
  const getFilteredServers = useMCPStore(state => state.getFilteredServers);

  useEffect(() => {
    // Prevent infinite loop: check for initialized
    if (!isInitialized && !isLoading && !error) {
      fetchServers();
    }
  }, [isInitialized, isLoading, fetchServers, error]);

  return {
    servers,
    filteredServers: getFilteredServers(),
    isLoading,
    isInitialized,
    error,
    filterTab,
    searchQuery,
    selectedServers,
    toggleServer,
    setFilterTab,
    setSearchQuery,
    toggleServerSelection,
    selectAllServers,
    clearSelection,
    refresh: fetchServers,
  };
}
