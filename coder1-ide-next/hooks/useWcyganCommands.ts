/**
 * React hook for wcygan commands integration
 * Provides easy access to command library and execution functionality
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { wcyganCommandManager, type WcyganCommand, type CommandSuggestion, type CommandCategory, type CommandExecutionResult } from '@/lib/wcygan-commands';

interface UseWcyganCommandsOptions {
  autoInitialize?: boolean;
  enableContextSuggestions?: boolean;
  currentFile?: string;
  terminalOutput?: string;
  recentCommands?: string[];
}

export function useWcyganCommands(options: UseWcyganCommandsOptions = {}) {
  const {
    autoInitialize = true,
    enableContextSuggestions = true,
    currentFile,
    terminalOutput,
    recentCommands = []
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commands, setCommands] = useState<WcyganCommand[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);

  // Initialize command manager
  const initialize = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      await wcyganCommandManager.initialize(forceRefresh);
      setCommands(wcyganCommandManager.getCommands());
      setCategories(wcyganCommandManager.getCategories());
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize commands');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-initialize on mount - fixed to prevent infinite loop
  useEffect(() => {
    if (autoInitialize && !isReady && !isLoading) {
      initialize();
    }
  }, [autoInitialize]);

  // Update context suggestions - optimized to prevent excessive updates
  useEffect(() => {
    if (!isReady || !enableContextSuggestions) return;

    const context = {
      currentFile,
      terminalOutput: terminalOutput?.slice(-1000), // Only use last 1000 chars to prevent constant updates
      recentCommands
    };

    const newSuggestions = wcyganCommandManager.getSuggestionsForContext(context);
    setSuggestions(newSuggestions);
  }, [isReady, enableContextSuggestions, currentFile, recentCommands]);

  // Search commands
  const searchCommands = useCallback((query: string, category?: CommandCategory) => {
    if (!isReady) return [];
    return wcyganCommandManager.searchCommands(query, category);
  }, [isReady]);

  // Get commands by category
  const getCommandsByCategory = useCallback((category: CommandCategory) => {
    if (!isReady) return [];
    return wcyganCommandManager.getCommandsByCategory(category);
  }, [isReady]);

  // Get single command
  const getCommand = useCallback((name: string) => {
    if (!isReady) return undefined;
    return wcyganCommandManager.getCommand(name);
  }, [isReady]);

  // Execute template mode
  const executeTemplate = useCallback(async (
    commandName: string,
    parameters: Record<string, any> = {},
    context: Record<string, any> = {}
  ): Promise<CommandExecutionResult> => {
    if (!isReady) {
      return {
        success: false,
        mode: 'template',
        error: 'Commands not ready'
      };
    }

    return wcyganCommandManager.executeTemplate(commandName, parameters, context);
  }, [isReady]);

  // Execute with agent
  const executeWithAgent = useCallback(async (
    commandName: string,
    parameters: Record<string, any> = {},
    context: Record<string, any> = {},
    agentName?: string
  ): Promise<CommandExecutionResult> => {
    if (!isReady) {
      return {
        success: false,
        mode: 'agent',
        error: 'Commands not ready'
      };
    }

    return wcyganCommandManager.executeWithAgent(commandName, parameters, context, agentName);
  }, [isReady]);

  // Execute hybrid mode
  const executeHybrid = useCallback(async (
    commandName: string,
    parameters: Record<string, any> = {},
    context: Record<string, any> = {}
  ): Promise<CommandExecutionResult> => {
    if (!isReady) {
      return {
        success: false,
        mode: 'hybrid',
        error: 'Commands not ready'
      };
    }

    return wcyganCommandManager.executeHybrid(commandName, parameters, context);
  }, [isReady]);

  // Process template without execution
  const processTemplate = useCallback((
    commandName: string,
    parameters: Record<string, any> = {},
    context: Record<string, any> = {}
  ): string | null => {
    if (!isReady) return null;
    return wcyganCommandManager.processTemplate(commandName, parameters, context);
  }, [isReady]);

  // Refresh library
  const refresh = useCallback(async () => {
    await initialize(true);
  }, [initialize]);

  // Get statistics
  const stats = useMemo(() => {
    if (!isReady) return null;
    return wcyganCommandManager.getStats();
  }, [isReady, commands]);

  // Get library info
  const libraryInfo = useMemo(() => {
    if (!isReady) return null;
    return wcyganCommandManager.getLibraryInfo();
  }, [isReady]);

  return {
    // State
    isLoading,
    isReady,
    error,
    commands,
    categories,
    suggestions,
    stats,
    libraryInfo,

    // Actions
    initialize,
    refresh,
    searchCommands,
    getCommandsByCategory,
    getCommand,
    executeTemplate,
    executeWithAgent,
    executeHybrid,
    processTemplate
  };
}