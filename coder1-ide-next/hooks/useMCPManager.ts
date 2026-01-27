/**
 * MCP Manager Hook
 *
 * High-level hook for managing MCP servers, profiles, and optimization
 * Wraps the Zustand store with additional conveniences
 */

'use client';

import { useCallback, useEffect } from 'react';
import { useMCPStore } from '@/stores/useMCPStore';

/**
 * Main MCP Manager hook
 * Provides all MCP management functionality with auto-loading
 */
export function useMCPManager(options: { autoLoad?: boolean } = {}) {
  const { autoLoad = true } = options;

  const store = useMCPStore();

  // Auto-load servers and profiles on mount
  useEffect(() => {
    // Only fetch if we haven't initialized yet, aren't loading, AND haven't already failed
    const shouldFetchServers = 
      autoLoad && 
      !store.isServersInitialized && 
      !store.isLoadingServers;
      
    const shouldFetchProfiles = 
      autoLoad && 
      !store.isProfilesInitialized && 
      !store.isLoadingProfiles;

    if (shouldFetchServers) {
      store.fetchServers();
    }
    
    if (shouldFetchProfiles) {
      store.fetchProfiles();
    }
  }, [
    autoLoad, 
    store.isServersInitialized, 
    store.isLoadingServers,
    store.isProfilesInitialized,
    store.isLoadingProfiles,
  ]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([
      store.fetchServers(),
      store.fetchProfiles(),
      store.analyzeUsage(),
    ]);
  }, [store]);

  // Quick actions
  const disableAll = useCallback(async () => {
    for (const server of store.servers) {
      if (server.enabled) {
        await store.toggleServer(server.name, false);
      }
    }
  }, [store]);

  const enableAll = useCallback(async () => {
    for (const server of store.servers) {
      if (!server.enabled) {
        await store.toggleServer(server.name, true);
      }
    }
  }, [store]);

  return {
    // State
    servers: store.servers,
    profiles: store.profiles,
    activeProfileId: store.activeProfileId,
    tokenUsage: store.tokenUsage,
    suggestions: store.suggestions,

    // Loading states
    isLoadingServers: store.isLoadingServers,
    isLoadingProfiles: store.isLoadingProfiles,
    isAnalyzing: store.isAnalyzing,
    isOptimizing: store.isOptimizing,
    isServersInitialized: store.isServersInitialized,
    isProfilesInitialized: store.isProfilesInitialized,

    // Errors
    serversError: store.serversError,
    profilesError: store.profilesError,
    analysisError: store.analysisError,
    optimizeError: store.optimizeError,

    // UI state
    isOverlayOpen: store.isOverlayOpen,
    filterTab: store.filterTab,
    searchQuery: store.searchQuery,
    selectedServers: store.selectedServers,

    // Computed
    filteredServers: store.getFilteredServers(),
    enabledCount: store.getEnabledCount(),
    totalTokens: store.getTotalTokens(),

    // Server actions
    toggleServer: store.toggleServer,
    toggleSelectedServers: store.toggleSelectedServers,

    // Profile actions
    createProfile: store.createProfile,
    applyProfile: store.applyProfile,
    deleteProfile: store.deleteProfile,
    saveCurrentAsProfile: store.saveCurrentAsProfile,
    createDefaultProfiles: store.createDefaultProfiles,

    // Analysis actions
    analyzeUsage: store.analyzeUsage,
    optimizeForTask: store.optimizeForTask,
    applySuggestion: store.applySuggestion,
    applyAllSuggestions: store.applyAllSuggestions,

    // UI actions
    openOverlay: store.openOverlay,
    closeOverlay: store.closeOverlay,
    toggleOverlay: store.toggleOverlay,
    setFilterTab: store.setFilterTab,
    setSearchQuery: store.setSearchQuery,
    toggleServerSelection: store.toggleServerSelection,
    selectAllServers: store.selectAllServers,
    clearSelection: store.clearSelection,

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
