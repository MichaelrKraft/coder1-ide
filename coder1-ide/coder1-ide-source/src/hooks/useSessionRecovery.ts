/**
 * useSessionRecovery Hook
 * 
 * React hook that integrates with SessionManager and NavigationProtection
 * to provide automatic session backup and recovery functionality.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { sessionManager, IDESessionData } from '../services/SessionManager';
import { navigationProtection } from '../services/NavigationProtection';

interface SessionRecoveryState {
  hasRecentSession: boolean;
  sessionAge: number;
  isRecoveryPromptVisible: boolean;
  isAutoSaveActive: boolean;
  lastSaveTime: number | null;
}

export interface SessionRecoveryActions {
  startProtection: () => void;
  stopProtection: () => void;
  restoreSession: () => IDESessionData | null;
  dismissRecoveryPrompt: () => void;
  exportSession: () => string;
  importSession: (jsonData: string) => boolean;
  clearSession: () => void;
  saveNow: () => void;
}

export interface UseSessionRecoveryReturn {
  state: SessionRecoveryState;
  actions: SessionRecoveryActions;
}

export const useSessionRecovery = (): UseSessionRecoveryReturn => {
  const [state, setState] = useState<SessionRecoveryState>({
    hasRecentSession: false,
    sessionAge: -1,
    isRecoveryPromptVisible: false,
    isAutoSaveActive: false,
    lastSaveTime: null
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restore session data
  const restoreSession = useCallback((): IDESessionData | null => {
    try {
      const sessionData = sessionManager.restoreSession();
      
      if (sessionData) {
        setState(prev => ({
          ...prev,
          isRecoveryPromptVisible: false,
          hasRecentSession: false
        }));
        
        console.log('🔄 Session restored successfully');
      }
      
      return sessionData;
    } catch (error) {
      console.error('🔄 Failed to restore session:', error);
      return null;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const hasSession = sessionManager.hasRecentSession();
    const age = sessionManager.getSessionAge();
    
    setState(prev => ({
      ...prev,
      hasRecentSession: hasSession,
      sessionAge: age,
      isRecoveryPromptVisible: hasSession && age > 1 // Show prompt if session exists and is older than 1 minute
    }));
    
    console.log('🔄 Session recovery initialized', { hasSession, age });
  }, []);

  // Auto-restore effect (disabled - now using recovery prompt)
  useEffect(() => {
    // Auto-restore disabled in favor of recovery prompt
    // if (state.hasRecentSession && state.sessionAge < 60 && state.sessionAge !== -1) {
    //   console.log('🔄 Auto-restoring session without prompt');
    //   setTimeout(() => {
    //     restoreSession();
    //   }, 500);
    // }
  }, [state.hasRecentSession, state.sessionAge, restoreSession]);

  // Start protection and auto-save
  const startProtection = useCallback(() => {
    try {
      // Activate navigation protection
      navigationProtection.activate();
      
      // Start auto-save
      sessionManager.startAutoSave();
      
      setState(prev => ({
        ...prev,
        isAutoSaveActive: true,
        lastSaveTime: Date.now()
      }));
      
      console.log('🛡️ Full session protection activated');
    } catch (error) {
      console.error('🛡️ Failed to start protection:', error);
    }
  }, []);

  // Stop protection and auto-save
  const stopProtection = useCallback(() => {
    try {
      // Deactivate navigation protection
      navigationProtection.deactivate();
      
      // Stop auto-save
      sessionManager.stopAutoSave();
      
      setState(prev => ({
        ...prev,
        isAutoSaveActive: false
      }));
      
      console.log('🛡️ Session protection deactivated');
    } catch (error) {
      console.error('🛡️ Failed to stop protection:', error);
    }
  }, []);


  // Dismiss recovery prompt
  const dismissRecoveryPrompt = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRecoveryPromptVisible: false
    }));
    
    // Start protection for new session
    startProtection();
    
    console.log('🔄 Recovery prompt dismissed, starting fresh session');
  }, [startProtection]);

  // Export session for manual backup
  const exportSession = useCallback((): string => {
    try {
      return sessionManager.exportSession();
    } catch (error) {
      console.error('📤 Failed to export session:', error);
      return '{}';
    }
  }, []);

  // Import session from manual backup
  const importSession = useCallback((jsonData: string): boolean => {
    try {
      const success = sessionManager.importSession(jsonData);
      
      if (success) {
        setState(prev => ({
          ...prev,
          hasRecentSession: true,
          isRecoveryPromptVisible: true
        }));
      }
      
      return success;
    } catch (error) {
      console.error('📤 Failed to import session:', error);
      return false;
    }
  }, []);

  // Clear all session data
  const clearSession = useCallback(() => {
    try {
      sessionManager.clearSession();
      
      setState(prev => ({
        ...prev,
        hasRecentSession: false,
        isRecoveryPromptVisible: false,
        sessionAge: -1
      }));
      
      console.log('🗑️ Session data cleared');
    } catch (error) {
      console.error('🗑️ Failed to clear session:', error);
    }
  }, []);

  // Save current session immediately
  const saveNow = useCallback(() => {
    try {
      sessionManager.saveCurrentSession();
      
      setState(prev => ({
        ...prev,
        lastSaveTime: Date.now()
      }));
      
      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Schedule next automatic save
      saveTimeoutRef.current = setTimeout(() => {
        if (state.isAutoSaveActive) {
          saveNow();
        }
      }, 10000);
      
      console.log('💾 Session saved manually');
    } catch (error) {
      console.error('💾 Failed to save session:', error);
    }
  }, [state.isAutoSaveActive]);

  // Update navigation protection based on session activity
  useEffect(() => {
    const hasWork = state.isAutoSaveActive && state.lastSaveTime !== null;
    navigationProtection.setHasUnsavedWork(hasWork);
  }, [state.isAutoSaveActive, state.lastSaveTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const actions: SessionRecoveryActions = {
    startProtection,
    stopProtection,
    restoreSession,
    dismissRecoveryPrompt,
    exportSession,
    importSession,
    clearSession,
    saveNow
  };

  return {
    state,
    actions
  };
};