/**
 * React Hook for Session Memory Integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { sessionMemoryService } from '@/services/memory/session-memory-service';
import type { MemoryContext, MemoryInteraction } from '@/services/memory/session-memory-service';
import { logger } from '@/lib/logger';

export interface UseSessionMemoryOptions {
  enabled: boolean;
  sessionId?: string;
  platform?: string;
  autoInject?: boolean;
}

export interface UseSessionMemoryReturn {
  isEnabled: boolean;
  isActive: boolean;
  memoryContext: MemoryContext | null;
  stats: {
    interactions: number;
    tokens: number;
    sessions: number;
  };
  addInteraction: (input: string, output: string, type?: 'command' | 'response' | 'error') => Promise<void>;
  getInjectionContext: () => Promise<string>;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  toggleMemory: () => void;
}

export function useSessionMemory(options: UseSessionMemoryOptions): UseSessionMemoryReturn {
  const {
    enabled: initialEnabled = true,
    sessionId = `session_${Date.now()}`,
    platform = 'Claude Code',
    autoInject = true
  } = options;

  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isActive, setIsActive] = useState(false);
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null);
  const [stats, setStats] = useState({
    interactions: 0,
    tokens: 0,
    sessions: 0
  });

  const sessionStartedRef = useRef(false);

  // Initialize memory service
  useEffect(() => {
    if (!isEnabled) return;

    const initMemory = async () => {
      try {
        // Start a new session if not already started
        if (!sessionStartedRef.current) {
          await sessionMemoryService.startSession(sessionId, platform);
          sessionStartedRef.current = true;
          setIsActive(true);
          logger.info('🧠 Memory session started');
        }

        // Load initial context
        const context = await sessionMemoryService.getSmartContext();
        setMemoryContext(context);
        setStats({
          interactions: sessionMemoryService.getStats().currentSessionInteractions || 0,
          tokens: context.totalTokens,
          sessions: context.sessionCount
        });
      } catch (error) {
        logger.error('Failed to initialize memory:', error);
      }
    };

    initMemory();

    // Listen for memory events
    const handleInteractionAdded = () => {
      const memStats = sessionMemoryService.getStats();
      setStats(prev => ({
        ...prev,
        interactions: memStats.currentSessionInteractions || 0,
        tokens: memStats.currentSessionTokens || 0
      }));
    };

    sessionMemoryService.on('interaction-added', handleInteractionAdded);

    return () => {
      sessionMemoryService.off('interaction-added', handleInteractionAdded);
    };
  }, [isEnabled, sessionId, platform]);

  // Add interaction to memory
  const addInteraction = useCallback(async (
    input: string,
    output: string,
    type: 'command' | 'response' | 'error' = 'command'
  ) => {
    if (!isEnabled || !isActive) return;

    try {
      await sessionMemoryService.addInteraction({
        platform,
        input,
        output,
        type
      });

      // Update context after adding interaction
      const context = await sessionMemoryService.getSmartContext(input);
      setMemoryContext(context);
    } catch (error) {
      logger.error('Failed to add interaction:', error);
    }
  }, [isEnabled, isActive, platform]);

  // Get formatted context for injection
  const getInjectionContext = useCallback(async (): Promise<string> => {
    if (!isEnabled || !memoryContext) return '';

    try {
      return sessionMemoryService.formatContextForInjection(memoryContext);
    } catch (error) {
      logger.error('Failed to get injection context:', error);
      return '';
    }
  }, [isEnabled, memoryContext]);

  // Start a new session
  const startSession = useCallback(async () => {
    if (!isEnabled) return;

    try {
      await sessionMemoryService.startSession(sessionId, platform);
      sessionStartedRef.current = true;
      setIsActive(true);
      
      const context = await sessionMemoryService.getSmartContext();
      setMemoryContext(context);
    } catch (error) {
      logger.error('Failed to start session:', error);
    }
  }, [isEnabled, sessionId, platform]);

  // End current session
  const endSession = useCallback(async () => {
    if (!isActive) return;

    try {
      await sessionMemoryService.endSession();
      sessionStartedRef.current = false;
      setIsActive(false);
      setMemoryContext(null);
      setStats({
        interactions: 0,
        tokens: 0,
        sessions: 0
      });
    } catch (error) {
      logger.error('Failed to end session:', error);
    }
  }, [isActive]);

  // Toggle memory on/off
  const toggleMemory = useCallback(() => {
    setIsEnabled(prev => {
      const newState = !prev;
      
      if (!newState && isActive) {
        // End session when disabling
        endSession();
      } else if (newState && !isActive) {
        // Start session when enabling
        startSession();
      }
      
      return newState;
    });
  }, [isActive, startSession, endSession]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (sessionStartedRef.current) {
        sessionMemoryService.endSession().catch(error => {
          logger.error('Failed to end session on unmount:', error);
        });
      }
    };
  }, []);

  return {
    isEnabled,
    isActive,
    memoryContext,
    stats,
    addInteraction,
    getInjectionContext,
    startSession,
    endSession,
    toggleMemory
  };
}