/**
 * useSessionSummary Hook
 * 
 * React hook for managing session summary functionality
 * Handles loading states, error management, and session data collection
 */

import { useState, useCallback } from 'react';
import { sessionSummaryService } from '../services/SessionSummaryService';

interface UseSessionSummaryState {
  isGenerating: boolean;
  summary: string | null;
  error: string | null;
  hasGenerated: boolean;
}

interface UseSessionSummaryActions {
  generateSummary: (sessionData: SessionSummaryData) => Promise<void>;
  clearSummary: () => void;
  copySummaryToClipboard: () => Promise<boolean>;
  exportSummary: (format: 'markdown' | 'json' | 'html' | 'all') => Promise<void>;
}

interface SessionSummaryData {
  openFiles: any[];
  activeFile: string | null;
  terminalHistory: string;
  terminalCommands: string[];
}

interface UseSessionSummaryReturn extends UseSessionSummaryState, UseSessionSummaryActions {}

export const useSessionSummary = (): UseSessionSummaryReturn => {
  const [state, setState] = useState<UseSessionSummaryState>({
    isGenerating: false,
    summary: null,
    error: null,
    hasGenerated: false
  });
  const [lastSessionData, setLastSessionData] = useState<any>(null);

  /**
   * Generate session summary using the service
   */
  const generateSummary = useCallback(async (sessionData: SessionSummaryData) => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      summary: null
    }));

    try {
      // Store session start time if not already stored
      if (!sessionStorage.getItem('session_start_time')) {
        sessionStorage.setItem('session_start_time', Date.now().toString());
      }

      // Collect and process session data
      const processedSessionData = sessionSummaryService.collectSessionData(
        sessionData.openFiles,
        sessionData.activeFile,
        sessionData.terminalHistory,
        sessionData.terminalCommands
      );
      
      // Store for export
      setLastSessionData(processedSessionData);

      // Generate summary
      const result = await sessionSummaryService.generateSessionSummary(processedSessionData);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        summary: result.summary || null,
        error: result.success ? null : (result.error || 'Failed to generate summary'),
        hasGenerated: true
      }));

      // Log success/failure for debugging
      if (result.success) {
        console.log('✅ Session summary generated successfully');
      } else {
        console.warn('⚠️ Session summary generated with fallback:', result.error);
      }

    } catch (error) {
      console.error('❌ Failed to generate session summary:', error);
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        summary: null,
        hasGenerated: true
      }));
    }
  }, []);

  /**
   * Clear current summary and reset state
   */
  const clearSummary = useCallback(() => {
    setState({
      isGenerating: false,
      summary: null,
      error: null,
      hasGenerated: false
    });
  }, []);

  /**
   * Export session summary in specified format
   */
  const exportSummary = useCallback(async (format: 'markdown' | 'json' | 'html' | 'all'): Promise<void> => {
    if (!state.summary || !lastSessionData) {
      console.warn('No summary or session data available to export');
      return;
    }

    try {
      const exportOptions = {
        format,
        saveToFile: true,
        includeMetadata: true
      };
      
      const result = await sessionSummaryService.exportSessionSummary(
        state.summary,
        lastSessionData,
        exportOptions
      );
      
      if (result.success) {
        console.log(`✅ Summary exported as ${format}`);
      } else {
        console.error('Export failed:', result.error);
      }
    } catch (error) {
      console.error('Failed to export summary:', error);
    }
  }, [state.summary, lastSessionData]);

  /**
   * Copy summary to clipboard
   */
  const copySummaryToClipboard = useCallback(async (): Promise<boolean> => {
    if (!state.summary) {
      console.warn('No summary available to copy');
      return false;
    }

    try {
      await navigator.clipboard.writeText(state.summary);
      console.log('📋 Summary copied to clipboard');
      return true;
    } catch (error) {
      console.error('Failed to copy summary to clipboard:', error);
      
      // Fallback: try using older method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = state.summary;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        console.log('📋 Summary copied using fallback method');
        return true;
      } catch (fallbackError) {
        console.error('Fallback copy method also failed:', fallbackError);
        return false;
      }
    }
  }, [state.summary]);

  return {
    // State
    isGenerating: state.isGenerating,
    summary: state.summary,
    error: state.error,
    hasGenerated: state.hasGenerated,
    
    // Actions
    generateSummary,
    clearSummary,
    copySummaryToClipboard,
    exportSummary
  };
};

export default useSessionSummary;