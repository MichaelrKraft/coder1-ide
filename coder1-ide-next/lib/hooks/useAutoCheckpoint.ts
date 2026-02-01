import { useEffect, useCallback, useRef, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { useIDEStore } from '@/stores/useIDEStore';
import { usePollingHealthStore } from '@/stores/usePollingHealthStore';
import { createLogger } from '@/lib/utils/limited-logger';

/**
 * Automatic Checkpoint Hook
 * 
 * Creates automatic checkpoints every 10 minutes when changes are detected.
 * Checkpoints are saved to the auto/ subdirectory and cleaned up after 7 days.
 * 
 * Features:
 * - Timer-based checkpoints (configurable interval)
 * - Change detection (skips if no changes)
 * - Error handling with retry logic
 * - Automatic cleanup of old checkpoints
 * 
 * @param options Configuration options
 */

interface AutoCheckpointOptions {
  enabled?: boolean;
  interval?: number; // milliseconds
  sessionId?: string; // Optional explicit session ID (overrides context)
  onSuccess?: (checkpointId: string) => void;
  onError?: (error: Error) => void;
  isConnected?: boolean; // Pause checking if disconnected
  isRestoring?: boolean; // Pause checking if restoring session
}

interface CheckpointState {
  lastCheckpointTime: number | null;
  lastTerminalLength: number;
  lastFileCount: number;
  lastActiveFile: string | null;
}

const DEFAULT_INTERVAL = 10 * 60 * 1000; // 10 minutes
const CHANGE_DETECTION_ENABLED = true;
const MAX_CONSECUTIVE_FAILURES = 3; // Circuit breaker threshold
const logger = createLogger({ maxLogsPerKey: 10, prefix: 'AutoCheckpoint' });

export function useAutoCheckpoint(options: AutoCheckpointOptions = {}) {
  const {
    enabled = true,
    interval = DEFAULT_INTERVAL,
    sessionId: explicitSessionId,
    onSuccess,
    onError,
    isConnected = true, // Default to true if not provided (backward compatibility)
    isRestoring = false // Default to false if not provided
  } = options;

  const { currentSession, sessionId: contextSessionId } = useSession();
  const reportStatus = usePollingHealthStore((state) => state.reportStatus);
  const reportHealthy = usePollingHealthStore((state) => state.reportHealthy);

  const stateRef = useRef<CheckpointState>({
    lastCheckpointTime: null,
    lastTerminalLength: 0,
    lastFileCount: 0,
    lastActiveFile: null
  });

  // Circuit breaker state
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [isCircuitOpen, setIsCircuitOpen] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  /**
   * Detect if there have been meaningful changes since last checkpoint
   */
  const hasChanges = useCallback((): boolean => {
    const state = useIDEStore.getState();
    const lastState = stateRef.current;

    // Always create first checkpoint
    if (lastState.lastCheckpointTime === null) {
      return true;
    }

    // Check for file changes
    const currentFileCount = state.openFiles?.length || 0;
    if (currentFileCount !== lastState.lastFileCount) {
      return true;
    }

    // Check for active file change
    if (state.activeFile !== lastState.lastActiveFile) {
      return true;
    }

    // Check for terminal activity (rough heuristic)
    const currentTerminalLength = state.terminalHistory?.length || 0;
    if (currentTerminalLength > lastState.lastTerminalLength) {
      return true;
    }

    return false;
  }, []);

  /**
   * Update state tracking after successful checkpoint
   */
  const updateState = useCallback(() => {
    const state = useIDEStore.getState();
    stateRef.current = {
      lastCheckpointTime: Date.now(),
      lastTerminalLength: state.terminalHistory?.length || 0,
      lastFileCount: state.openFiles?.length || 0,
      lastActiveFile: state.activeFile || null
    };
  }, []);

  /**
   * Create an automatic checkpoint (with circuit breaker protection)
   */
  const createAutoCheckpoint = useCallback(async () => {
    // Circuit breaker check - don't attempt if circuit is open
    if (isCircuitOpen) {
      return;
    }

    // 🔒 PAUSE CHECKPOINTING during connection instability
    // Trying to read state or hit API during reconnection/restoration can cause freezing
    if (!isConnected) {
      console.log('⏸️ Auto-checkpoint paused: Terminal disconnected');
      return;
    }
    if (isRestoring) {
      console.log('⏸️ Auto-checkpoint paused: Session restoring in progress');
      return;
    }

    // Priority: explicit > currentSession > contextSessionId
    const activeSessionId = explicitSessionId || currentSession?.id || contextSessionId;

    if (!activeSessionId) {
      console.log('⏭️ No active session, skipping auto-checkpoint');
      return;
    }

    // Change detection
    if (CHANGE_DETECTION_ENABLED && !hasChanges()) {
      console.log('⏭️ No changes detected, skipping auto-checkpoint');
      return;
    }

    try {
      const state = useIDEStore.getState();

      // Get terminal history from state or session
      const terminalHistory = state.terminalHistory || '';

      // Prepare checkpoint data
      const checkpointData = {
        sessionId: activeSessionId,
        autoGenerated: true,
        snapshot: {
          files: state.files || {},
          editor: {
            activeFile: state.activeFile,
            openFiles: state.openFiles || []
          }
        },
        terminalHistory,
        activeFile: state.activeFile
      };

      // Create checkpoint via API
      const response = await fetch('/api/checkpoint/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkpointData)
      });

      if (!response.ok) {
        throw new Error(`Checkpoint API failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Auto-checkpoint created: ${result.checkpoint.id}`);
        updateState();
        onSuccess?.(result.checkpoint.id);

        // Reset circuit breaker on success
        if (consecutiveFailures > 0) {
          setConsecutiveFailures(0);
          setLastError(null);
          reportHealthy('auto-checkpoint');
          logger.reset('failure');
        }

        // Trigger cleanup (async, non-blocking)
        cleanupOldCheckpoints(activeSessionId).catch(err => {
          console.warn('⚠️ Cleanup failed:', err);
        });
      } else {
        throw new Error('Checkpoint creation failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const newFailureCount = consecutiveFailures + 1;

      setConsecutiveFailures(newFailureCount);
      setLastError(errorMsg);

      // Use limited logger to prevent console spam
      logger.error('failure', `Auto-checkpoint failed (attempt ${newFailureCount}/${MAX_CONSECUTIVE_FAILURES}):`, error);

      // Check if circuit should open
      if (newFailureCount >= MAX_CONSECUTIVE_FAILURES) {
        setIsCircuitOpen(true);
        console.warn(`🔴 Auto-checkpoint circuit breaker opened after ${newFailureCount} failures`);
        reportStatus({
          id: 'auto-checkpoint',
          name: 'Auto-Checkpoint',
          isCircuitOpen: true,
          consecutiveFailures: newFailureCount,
          lastError: errorMsg,
        });
      } else {
        reportStatus({
          id: 'auto-checkpoint',
          name: 'Auto-Checkpoint',
          isCircuitOpen: false,
          consecutiveFailures: newFailureCount,
          lastError: errorMsg,
        });
      }

      onError?.(error as Error);
    }
  }, [isCircuitOpen, explicitSessionId, currentSession, contextSessionId, hasChanges, updateState, onSuccess, onError, consecutiveFailures, reportStatus, reportHealthy]);

  /**
   * Cleanup old auto-checkpoints
   * - Keep last 50 checkpoints
   * - Delete anything older than 7 days
   */
  const cleanupOldCheckpoints = async (sessionId: string) => {
    try {
      const response = await fetch('/api/checkpoint/cleanup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.deleted > 0) {
          console.log(`🧹 Cleaned up ${result.deleted} old auto-checkpoints, kept ${result.kept}`);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  /**
   * Set up interval timer
   */
  useEffect(() => {
    // Priority: explicit > currentSession > contextSessionId
    const activeSessionId = explicitSessionId || currentSession?.id || contextSessionId;
    
    if (!enabled || !activeSessionId) {
      console.log(`⏭️ Auto-checkpoint disabled: enabled=${enabled}, sessionId=${activeSessionId}`);
      return;
    }

    // Don't start timer if we're in a bad state
    if (!isConnected || isRestoring) {
      console.log('⏳ Auto-checkpoint timer delayed until connection stable');
      return;
    }

    console.log(`⏰ Auto-checkpoint timer started (interval: ${interval / 1000 / 60} minutes, sessionId: ${activeSessionId})`);

    // Create first checkpoint after 1 minute (not immediately)
    const initialTimeout = setTimeout(createAutoCheckpoint, 60 * 1000);

    // Then create on interval
    const intervalId = setInterval(createAutoCheckpoint, interval);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
      console.log('⏰ Auto-checkpoint timer stopped');
    };
  }, [enabled, explicitSessionId, currentSession, contextSessionId, interval, createAutoCheckpoint, isConnected, isRestoring]);

  /**
   * Retry checkpoint creation - resets circuit breaker
   */
  const retryCheckpoint = useCallback(() => {
    setIsCircuitOpen(false);
    setConsecutiveFailures(0);
    setLastError(null);
    logger.reset('failure');
    reportHealthy('auto-checkpoint');
    // Trigger immediate checkpoint attempt
    createAutoCheckpoint();
  }, [createAutoCheckpoint, reportHealthy]);

  // Clean up health status on unmount
  useEffect(() => {
    return () => {
      reportHealthy('auto-checkpoint');
    };
  }, [reportHealthy]);

  return {
    createNow: createAutoCheckpoint,
    enabled: enabled && !!(explicitSessionId || currentSession?.id || contextSessionId),
    isCircuitOpen,
    consecutiveFailures,
    lastError,
    retry: retryCheckpoint,
  };
}
