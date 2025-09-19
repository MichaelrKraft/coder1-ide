import { useState, useEffect, useCallback } from 'react';
import { Checkpoint, CheckpointData, checkpointService } from '../services/checkpoints';
import { useFeatureFlag } from './useFeatureFlag';

export interface UseCheckpointsResult {
  checkpoints: Checkpoint[];
  loading: boolean;
  error: string | null;
  createCheckpoint: (name: string, data: CheckpointData, description?: string, tags?: string[]) => Promise<Checkpoint | null>;
  createAutoCheckpoint: (data: CheckpointData) => Promise<Checkpoint | null>;
  deleteCheckpoint: (checkpointId: string) => Promise<boolean>;
  restoreCheckpoint: (checkpointId: string) => Promise<CheckpointData | null>;
  exportCheckpoints: () => Promise<string | null>;
  importCheckpoints: (jsonData: string) => Promise<boolean>;
  refreshCheckpoints: () => Promise<void>;
}

/**
 * React hook for managing session checkpoints
 */
export function useCheckpoints(sessionId: string): UseCheckpointsResult {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isEnabled = useFeatureFlag('SESSION_CHECKPOINTS');

  // Load checkpoints on mount and when sessionId changes
  useEffect(() => {
    if (isEnabled && sessionId) {
      refreshCheckpoints();
    }
  }, [sessionId, isEnabled]);

  const refreshCheckpoints = useCallback(async () => {
    if (!isEnabled || !sessionId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await checkpointService.getCheckpoints(sessionId);
      setCheckpoints(data.sort((a, b) => b.timestamp - a.timestamp)); // Most recent first
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load checkpoints';
      setError(errorMessage);
      console.error('Failed to load checkpoints:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, isEnabled]);

  const createCheckpoint = useCallback(async (
    name: string,
    data: CheckpointData,
    description?: string,
    tags: string[] = []
  ): Promise<Checkpoint | null> => {
    if (!isEnabled || !sessionId) return null;
    
    try {
      setError(null);
      
      const checkpoint = await checkpointService.createCheckpoint(
        sessionId,
        name,
        data,
        description,
        tags
      );
      
      // Add to local state
      setCheckpoints(prev => [checkpoint, ...prev]);
      
      return checkpoint;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create checkpoint';
      setError(errorMessage);
      console.error('Failed to create checkpoint:', err);
      return null;
    }
  }, [sessionId, isEnabled]);

  const createAutoCheckpoint = useCallback(async (
    data: CheckpointData
  ): Promise<Checkpoint | null> => {
    if (!isEnabled || !sessionId) return null;
    
    try {
      const checkpoint = await checkpointService.createAutoCheckpoint(sessionId, data);
      
      // Add to local state
      setCheckpoints(prev => [checkpoint, ...prev]);
      
      return checkpoint;
      
    } catch (err) {
      console.error('Failed to create auto checkpoint:', err);
      // Don't set error for auto checkpoints as they're background operations
      return null;
    }
  }, [sessionId, isEnabled]);

  const deleteCheckpoint = useCallback(async (checkpointId: string): Promise<boolean> => {
    if (!isEnabled || !sessionId) return false;
    
    try {
      setError(null);
      
      await checkpointService.deleteCheckpoint(sessionId, checkpointId);
      
      // Remove from local state
      setCheckpoints(prev => prev.filter(cp => cp.id !== checkpointId));
      
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete checkpoint';
      setError(errorMessage);
      console.error('Failed to delete checkpoint:', err);
      return false;
    }
  }, [sessionId, isEnabled]);

  const restoreCheckpoint = useCallback(async (checkpointId: string): Promise<CheckpointData | null> => {
    if (!isEnabled || !sessionId) return null;
    
    try {
      setError(null);
      
      const checkpoint = await checkpointService.getCheckpoint(sessionId, checkpointId);
      
      if (!checkpoint) {
        throw new Error('Checkpoint not found');
      }
      
      return checkpoint.data;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore checkpoint';
      setError(errorMessage);
      console.error('Failed to restore checkpoint:', err);
      return null;
    }
  }, [sessionId, isEnabled]);

  const exportCheckpoints = useCallback(async (): Promise<string | null> => {
    if (!isEnabled || !sessionId) return null;
    
    try {
      setError(null);
      
      const exportData = await checkpointService.exportCheckpoints(sessionId);
      return exportData;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export checkpoints';
      setError(errorMessage);
      console.error('Failed to export checkpoints:', err);
      return null;
    }
  }, [sessionId, isEnabled]);

  const importCheckpoints = useCallback(async (jsonData: string): Promise<boolean> => {
    if (!isEnabled || !sessionId) return false;
    
    try {
      setError(null);
      
      const importedCheckpoints = await checkpointService.importCheckpoints(jsonData);
      
      // Refresh the list to include imported checkpoints
      await refreshCheckpoints();
      
      return importedCheckpoints.length > 0;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import checkpoints';
      setError(errorMessage);
      console.error('Failed to import checkpoints:', err);
      return false;
    }
  }, [sessionId, isEnabled, refreshCheckpoints]);

  return {
    checkpoints,
    loading,
    error,
    createCheckpoint,
    createAutoCheckpoint,
    deleteCheckpoint,
    restoreCheckpoint,
    exportCheckpoints,
    importCheckpoints,
    refreshCheckpoints,
  };
}

/**
 * Hook for automatic checkpoint creation
 */
export function useAutoCheckpoints(
  sessionId: string,
  getCurrentState: () => CheckpointData,
  options: {
    interval?: number; // minutes
    maxCheckpoints?: number;
    enabled?: boolean;
  } = {}
) {
  const {
    interval = 10, // 10 minutes
    maxCheckpoints = 20,
    enabled = true,
  } = options;

  const { createAutoCheckpoint, checkpoints } = useCheckpoints(sessionId);
  const isFeatureEnabled = useFeatureFlag('SESSION_CHECKPOINTS');

  useEffect(() => {
    // DISABLED: Checkpoint system causing 429 errors and flooding browser
    // This was making 12,000+ requests and preventing IDE from loading
    // Disabled on Aug 28 to fix IDE functionality
    console.warn('Auto-checkpoints disabled due to 429 flooding issue');
    return;
    
    /*
    if (!isFeatureEnabled || !enabled || !sessionId) return;

    const intervalMs = interval * 60 * 1000; // Convert to milliseconds
    
    const createAuto = async () => {
      try {
        const currentState = getCurrentState();
        
        // Always create checkpoint - even empty sessions are worth saving
        // This ensures session continuity and recovery
        console.log('Creating auto-checkpoint for session:', sessionId);
        await createAutoCheckpoint(currentState);
        
        // Clean up old auto checkpoints if we exceed the limit
        const autoCheckpoints = checkpoints.filter(cp => cp.metadata.autoGenerated);
        if (autoCheckpoints.length > maxCheckpoints) {
          // Could implement cleanup here
        }
      } catch (error) {
        console.error('Auto checkpoint creation failed:', error);
      }
    };

    // Create initial checkpoint
    createAuto();
    
    // Set up interval
    const intervalId = setInterval(createAuto, intervalMs);
    
    return () => clearInterval(intervalId);
    */
  }, [
    sessionId,
    interval,
    maxCheckpoints,
    enabled,
    isFeatureEnabled,
    createAutoCheckpoint,
    getCurrentState,
    checkpoints.length // Re-run when checkpoints change
  ]);
}

/**
 * Hook for keyboard shortcuts
 */
export function useCheckpointShortcuts(
  sessionId: string,
  getCurrentState: () => CheckpointData,
  onRestore?: (data: CheckpointData) => void
) {
  const { createCheckpoint, checkpoints, restoreCheckpoint } = useCheckpoints(sessionId);
  const isEnabled = useFeatureFlag('SESSION_CHECKPOINTS');

  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + S: Quick save checkpoint
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        
        const name = `Quick Save ${new Date().toLocaleTimeString()}`;
        const state = getCurrentState();
        createCheckpoint(name, state, 'Quick save checkpoint', ['quick-save']);
      }
      
      // Cmd/Ctrl + Shift + R: Restore last checkpoint
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        
        if (checkpoints.length > 0 && onRestore) {
          const lastCheckpoint = checkpoints[0]; // Most recent
          restoreCheckpoint(lastCheckpoint.id).then(data => {
            if (data) {
              onRestore(data);
            }
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, sessionId, createCheckpoint, restoreCheckpoint, checkpoints, getCurrentState, onRestore]);
}