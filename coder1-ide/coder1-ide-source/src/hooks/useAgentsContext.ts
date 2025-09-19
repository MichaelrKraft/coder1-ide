/**
 * useAgentsContext Hook
 * 
 * React hook for integrating AGENTS.md context with CoderOne IDE components.
 * Provides context status, command interception, and automatic enhancement.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AgentsContextService } from '../services/AgentsContextService';

interface ContextStatus {
  hasContext: boolean;
  projectName: string;
  framework: string;
  commandsCount: number;
  statusMessage: string;
  statusColor: string;
  isLoading: boolean;
}

interface UseAgentsContextOptions {
  workingDirectory?: string;
  autoInterceptClaudeCommands?: boolean;
  showNotifications?: boolean;
  enableContextStatus?: boolean;
  pollInterval?: number; // in milliseconds
}

interface UseAgentsContextReturn {
  contextStatus: ContextStatus;
  enhancePrompt: (prompt: string) => Promise<{ prompt: string; enhanced: boolean; context: any }>;
  interceptCommand: (command: string) => Promise<{ shouldIntercept: boolean; enhancedCommand?: string; context?: any }>;
  refreshContext: () => Promise<void>;
  clearCache: () => void;
  isHealthy: boolean;
}

const DEFAULT_OPTIONS: UseAgentsContextOptions = {
  workingDirectory: undefined,
  autoInterceptClaudeCommands: true,
  showNotifications: true,
  enableContextStatus: true,
  pollInterval: 30000 // 30 seconds
};

export const useAgentsContext = (options: UseAgentsContextOptions = {}): UseAgentsContextReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const agentsService = useRef(AgentsContextService.getInstance());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [contextStatus, setContextStatus] = useState<ContextStatus>({
    hasContext: false,
    projectName: 'Loading...',
    framework: 'Unknown',
    commandsCount: 0,
    statusMessage: 'Checking for AGENTS.md context...',
    statusColor: '#6B7280',
    isLoading: true
  });

  const [isHealthy, setIsHealthy] = useState<boolean>(true);

  // ==========================================
  // CORE FUNCTIONALITY
  // ==========================================

  /**
   * Enhance a prompt with AGENTS.md context
   */
  const enhancePrompt = useCallback(async (prompt: string) => {
    try {
      console.log('[useAgentsContext] Enhancing prompt with AGENTS.md context');
      
      const result = await agentsService.current.enhanceClaudeCodePrompt(
        prompt, 
        opts.workingDirectory
      );

      if (result.enhanced && result.context && opts.showNotifications) {
        agentsService.current.showContextNotification(result.context);
      }

      return {
        prompt: result.prompt,
        enhanced: result.enhanced,
        context: result.context
      };

    } catch (error) {
      console.error('[useAgentsContext] Error enhancing prompt:', error);
      return {
        prompt,
        enhanced: false,
        context: null
      };
    }
  }, [opts.workingDirectory, opts.showNotifications]);

  /**
   * Intercept and enhance Claude Code commands
   */
  const interceptCommand = useCallback(async (command: string) => {
    if (!opts.autoInterceptClaudeCommands) {
      return { shouldIntercept: false };
    }

    try {
      console.log('[useAgentsContext] Intercepting command:', command);
      
      const result = await agentsService.current.interceptClaudeCodeCommand(
        command,
        opts.workingDirectory
      );

      if (result.shouldIntercept && result.context && opts.showNotifications) {
        agentsService.current.showContextNotification(result.context);
      }

      return result;

    } catch (error) {
      console.error('[useAgentsContext] Error intercepting command:', error);
      return { shouldIntercept: false };
    }
  }, [opts.autoInterceptClaudeCommands, opts.workingDirectory, opts.showNotifications]);

  /**
   * Refresh context status
   */
  const refreshContext = useCallback(async () => {
    if (!opts.enableContextStatus) {
      return;
    }

    try {
      setContextStatus(prev => ({ ...prev, isLoading: true }));

      const status = await agentsService.current.getContextStatus(opts.workingDirectory);

      setContextStatus({
        ...status,
        isLoading: false
      });

      console.log('[useAgentsContext] Context status updated:', {
        hasContext: status.hasContext,
        projectName: status.projectName,
        framework: status.framework
      });

    } catch (error) {
      console.error('[useAgentsContext] Error refreshing context:', error);
      setContextStatus({
        hasContext: false,
        projectName: 'Error',
        framework: 'Unknown',
        commandsCount: 0,
        statusMessage: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        statusColor: '#EF4444',
        isLoading: false
      });
    }
  }, [opts.enableContextStatus, opts.workingDirectory]);

  /**
   * Clear service cache
   */
  const clearCache = useCallback(() => {
    agentsService.current.clearCache();
    console.log('[useAgentsContext] Cache cleared, refreshing context...');
    refreshContext();
  }, [refreshContext]);

  // ==========================================
  // HEALTH CHECK
  // ==========================================

  const checkHealth = useCallback(async () => {
    try {
      const healthy = await agentsService.current.healthCheck();
      setIsHealthy(healthy);

      if (!healthy) {
        console.warn('[useAgentsContext] Service health check failed');
      }

      return healthy;
    } catch (error) {
      console.error('[useAgentsContext] Health check error:', error);
      setIsHealthy(false);
      return false;
    }
  }, []);

  // ==========================================
  // EFFECTS
  // ==========================================

  /**
   * Initial setup and polling
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) return;

      // Initial health check
      await checkHealth();

      // Initial context refresh
      await refreshContext();

      // Set up polling if enabled
      if (opts.pollInterval && opts.pollInterval > 0) {
        pollIntervalRef.current = setInterval(async () => {
          if (!mounted) return;
          await refreshContext();
          await checkHealth();
        }, opts.pollInterval);

        console.log(`[useAgentsContext] Polling enabled (${opts.pollInterval}ms interval)`);
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [opts.pollInterval, refreshContext, checkHealth]);

  /**
   * Refresh context when working directory changes
   */
  useEffect(() => {
    refreshContext();
  }, [opts.workingDirectory, refreshContext]);

  // ==========================================
  // DEBUG LOGGING
  // ==========================================

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useAgentsContext] Hook initialized with options:', {
        workingDirectory: opts.workingDirectory,
        autoInterceptClaudeCommands: opts.autoInterceptClaudeCommands,
        showNotifications: opts.showNotifications,
        enableContextStatus: opts.enableContextStatus,
        pollInterval: opts.pollInterval
      });
    }
  }, []); // Only log once

  return {
    contextStatus,
    enhancePrompt,
    interceptCommand,
    refreshContext,
    clearCache,
    isHealthy
  };
};

export default useAgentsContext;