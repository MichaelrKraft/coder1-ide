/**
 * Walk-Away Supervision Hook
 * 
 * React hook for managing walk-away supervision sessions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WalkAwaySupervisionService } from '@/services/WalkAwaySupervisionService';
import { logger } from '../logger';
import { 
  WalkAwaySession, 
  WalkAwayReport, 
  WalkAwayConfig, 
  SessionActivity, 
  CriticalIssue,
  SupervisionAlert 
} from '@/types/walk-away-supervision';

interface UseWalkAwaySupervisionOptions {
  autoStartMonitoring?: boolean;
  checkInterval?: number; // milliseconds
}

export function useWalkAwaySupervision(options: UseWalkAwaySupervisionOptions = {}) {
  const { autoStartMonitoring = true, checkInterval = 30000 } = options; // 30 seconds default
  
  const [activeSession, setActiveSession] = useState<WalkAwaySession | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastReport, setLastReport] = useState<WalkAwayReport | null>(null);
  const [currentIssues, setCurrentIssues] = useState<CriticalIssue[]>([]);
  const [alerts, setAlerts] = useState<SupervisionAlert[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const supervisionService = useRef(WalkAwaySupervisionService.getInstance());
  const monitoringInterval = useRef<NodeJS.Timeout | null>(null);

  // Load existing session on mount
  useEffect(() => {
    const existingSession = supervisionService.current.getActiveSession();
    if (existingSession) {
      setActiveSession(existingSession);
      if (autoStartMonitoring && existingSession.status === 'active') {
        startMonitoring();
      }
    }
  }, [autoStartMonitoring]);

  // Start a new walk-away session
  const startSession = useCallback(async (task: string, config?: WalkAwayConfig) => {
    try {
      const sessionId = await supervisionService.current.startWalkAwaySession(task, config);
      const session = supervisionService.current.getActiveSession();
      setActiveSession(session);
      
      if (autoStartMonitoring) {
        startMonitoring();
      }
      
      return sessionId;
    } catch (error) {
      logger.error('Failed to start walk-away session:', error);
      throw error;
    }
  }, [autoStartMonitoring]);

  // End the current session and get report
  const endSession = useCallback(async () => {
    if (!activeSession) return null;
    
    try {
      stopMonitoring();
      const report = await supervisionService.current.endSession(activeSession.id);
      
      setLastReport(report);
      setActiveSession(null);
      setCurrentIssues([]);
      
      // Show report modal automatically when session ends
      setShowReportModal(true);
      
      return report;
    } catch (error) {
      logger.error('Failed to end walk-away session:', error);
      throw error;
    }
  }, [activeSession]);

  // Pause the current session
  const pauseSession = useCallback(async () => {
    if (!activeSession) return;
    
    try {
      await supervisionService.current.pauseSession(activeSession.id);
      stopMonitoring();
      
      // Update local state
      setActiveSession(prev => prev ? { ...prev, status: 'paused' } : null);
    } catch (error) {
      logger.error('Failed to pause session:', error);
      throw error;
    }
  }, [activeSession]);

  // Resume the current session
  const resumeSession = useCallback(async () => {
    if (!activeSession) return;
    
    try {
      await supervisionService.current.resumeSession(activeSession.id);
      
      // Update local state and restart monitoring
      setActiveSession(prev => prev ? { ...prev, status: 'active' } : null);
      startMonitoring();
    } catch (error) {
      logger.error('Failed to resume session:', error);
      throw error;
    }
  }, [activeSession]);

  // Record activity (called by IDE components)
  const recordActivity = useCallback((activity: Omit<SessionActivity, 'timestamp'>) => {
    if (!activeSession || activeSession.status !== 'active') return;
    
    supervisionService.current.recordActivity(activeSession.id, activity);
  }, [activeSession]);

  // Start monitoring for issues
  const startMonitoring = useCallback(() => {
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
    }
    
    setIsMonitoring(true);
    
    monitoringInterval.current = setInterval(async () => {
      if (activeSession?.status === 'active') {
        try {
          const issues = await supervisionService.current.checkForIssues(activeSession.id);
          setCurrentIssues(issues);
        } catch (error) {
          logger.error('Error checking for issues:', error);
        }
      }
    }, checkInterval);
  }, [activeSession, checkInterval]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = null;
    }
    setIsMonitoring(false);
  }, []);

  // Generate current report without ending session
  const generateCurrentReport = useCallback(async () => {
    if (!activeSession) return null;
    
    try {
      const report = await supervisionService.current.generateReport(activeSession.id);
      setLastReport(report);
      return report;
    } catch (error) {
      logger.error('Failed to generate current report:', error);
      throw error;
    }
  }, [activeSession]);

  // Dismiss an alert
  const dismissAlert = useCallback((alertId: string) => {
    supervisionService.current.dismissAlert(alertId);
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // Convenience functions for common activities
  const trackFileChange = useCallback((filePath: string, linesChanged?: number) => {
    recordActivity({
      type: 'file-change',
      description: `Modified ${filePath}`,
      details: { filePath, linesChanged }
    });
  }, [recordActivity]);

  const trackTerminalCommand = useCallback((command: string, success?: boolean) => {
    recordActivity({
      type: 'terminal-command',
      description: `Executed: ${command}`,
      details: { command, success }
    });
  }, [recordActivity]);

  const trackCommit = useCallback((message: string, files: string[] = []) => {
    recordActivity({
      type: 'commit',
      description: `Committed: ${message}`,
      details: { filePath: files.join(', ') }
    });
  }, [recordActivity]);

  const trackError = useCallback((error: string, source?: string) => {
    recordActivity({
      type: 'error',
      description: `Error: ${error}`,
      details: { errorMessage: error, filePath: source }
    });
  }, [recordActivity]);

  const trackClaudeAction = useCallback((action: string, details?: any) => {
    recordActivity({
      type: 'claude-action',
      description: `Claude: ${action}`,
      details
    });
  }, [recordActivity]);

  return {
    // Session state
    activeSession,
    isMonitoring,
    lastReport,
    currentIssues,
    alerts: alerts.filter(a => !a.dismissed),
    showReportModal,
    setShowReportModal,
    
    // Session control
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    
    // Monitoring control
    startMonitoring,
    stopMonitoring,
    
    // Activity tracking
    recordActivity,
    trackFileChange,
    trackTerminalCommand,
    trackCommit,
    trackError,
    trackClaudeAction,
    
    // Reporting
    generateCurrentReport,
    
    // Alert management
    dismissAlert,
    
    // Computed state
    isSessionActive: activeSession?.status === 'active',
    isSessionPaused: activeSession?.status === 'paused',
    hasCriticalIssues: currentIssues.some(issue => issue.severity === 'high'),
    criticalIssueCount: currentIssues.filter(issue => issue.severity === 'high').length,
    totalIssueCount: currentIssues.length
  };
}