/**
 * Terminal State Persistence
 * 
 * Handles saving and restoring terminal state across sessions
 * Includes command history, session data, and user preferences
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';

interface TerminalState {
  sessionId: string | null;
  commandHistory: string[];
  workingDirectory: string;
  environment: Record<string, string>;
  scrollPosition: number;
  bufferLines: string[];
  lastActivity: number;
  userPreferences: {
    theme: string;
    fontSize: number;
    fontFamily: string;
    cursorStyle: string;
    scrollback: number;
  };
  activeConnections: {
    socket: boolean;
    backend: boolean;
  };
}

interface TerminalPersistenceConfig {
  enabled: boolean;
  storageKey: string;
  maxHistorySize: number;
  maxBufferLines: number;
  saveInterval: number; // milliseconds
  autoRestore: boolean;
}

const DEFAULT_CONFIG: TerminalPersistenceConfig = {
  enabled: true,
  storageKey: 'coder1_terminal_state',
  maxHistorySize: 1000,
  maxBufferLines: 500,
  saveInterval: 5000, // 5 seconds
  autoRestore: true
};

export class TerminalStatePersistenceManager {
  private config: TerminalPersistenceConfig;
  private saveTimeoutId: NodeJS.Timeout | null = null;
  private currentState: Partial<TerminalState> = {};
  private isRestoring = false;

  constructor(config: Partial<TerminalPersistenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Save current terminal state to localStorage
   */
  saveState(terminalRef: XTerm | null, additionalState: Partial<TerminalState> = {}) {
    if (!this.config.enabled || this.isRestoring) {
      return;
    }

    try {
      const state: TerminalState = {
        sessionId: this.currentState.sessionId || null,
        commandHistory: this.currentState.commandHistory || [],
        workingDirectory: this.currentState.workingDirectory || process.env.HOME || '~',
        environment: this.currentState.environment || {},
        scrollPosition: 0,
        bufferLines: [],
        lastActivity: Date.now(),
        userPreferences: {
          theme: 'dark',
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, monospace',
          cursorStyle: 'block',
          scrollback: 1000,
          ...this.currentState.userPreferences
        },
        activeConnections: {
          socket: false,
          backend: false,
          ...this.currentState.activeConnections
        },
        ...additionalState
      };

      // Extract buffer content if terminal is available
      if (terminalRef) {
        state.bufferLines = this.extractBufferLines(terminalRef);
        state.scrollPosition = this.getScrollPosition(terminalRef);
      }

      // Limit history size
      if (state.commandHistory.length > this.config.maxHistorySize) {
        state.commandHistory = state.commandHistory.slice(-this.config.maxHistorySize);
      }

      // Limit buffer lines
      if (state.bufferLines.length > this.config.maxBufferLines) {
        state.bufferLines = state.bufferLines.slice(-this.config.maxBufferLines);
      }

      // Save to localStorage
      localStorage.setItem(this.config.storageKey, JSON.stringify(state));
      
      console.log('[Terminal Persistence] State saved', {
        sessionId: state.sessionId,
        historyItems: state.commandHistory.length,
        bufferLines: state.bufferLines.length,
        lastActivity: new Date(state.lastActivity).toLocaleTimeString()
      });

    } catch (error) {
      console.warn('[Terminal Persistence] Failed to save state:', error);
    }
  }

  /**
   * Load terminal state from localStorage
   */
  loadState(): TerminalState | null {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const savedState = localStorage.getItem(this.config.storageKey);
      if (!savedState) {
        return null;
      }

      const state: TerminalState = JSON.parse(savedState);
      
      // Validate state structure
      if (!this.validateState(state)) {
        console.warn('[Terminal Persistence] Invalid state found, clearing');
        this.clearState();
        return null;
      }

      // Check if state is too old (older than 24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - state.lastActivity > maxAge) {
        console.log('[Terminal Persistence] State too old, clearing');
        this.clearState();
        return null;
      }

      console.log('[Terminal Persistence] State loaded', {
        sessionId: state.sessionId,
        historyItems: state.commandHistory.length,
        bufferLines: state.bufferLines.length,
        age: Math.round((Date.now() - state.lastActivity) / 1000 / 60) + ' minutes'
      });

      return state;

    } catch (error) {
      console.warn('[Terminal Persistence] Failed to load state:', error);
      return null;
    }
  }

  /**
   * Restore terminal state to XTerm instance
   */
  async restoreState(terminalRef: XTerm, state: TerminalState): Promise<boolean> {
    if (!this.config.enabled || !this.config.autoRestore) {
      return false;
    }

    this.isRestoring = true;

    try {
      console.log('[Terminal Persistence] Restoring state...');

      // Restore user preferences
      if (state.userPreferences) {
        this.applyUserPreferences(terminalRef, state.userPreferences);
      }

      // Restore buffer content
      if (state.bufferLines && state.bufferLines.length > 0) {
        await this.restoreBufferContent(terminalRef, state.bufferLines);
      }

      // Restore scroll position
      if (state.scrollPosition) {
        this.restoreScrollPosition(terminalRef, state.scrollPosition);
      }

      // Update current state
      this.currentState = { ...state };

      console.log('[Terminal Persistence] State restored successfully');
      return true;

    } catch (error) {
      console.error('[Terminal Persistence] Failed to restore state:', error);
      return false;
    } finally {
      this.isRestoring = false;
    }
  }

  /**
   * Update state with new data
   */
  updateState(updates: Partial<TerminalState>) {
    this.currentState = { ...this.currentState, ...updates };
    
    // Schedule save
    this.scheduleSave();
  }

  /**
   * Add command to history
   */
  addToHistory(command: string) {
    if (!command.trim()) return;

    const history = this.currentState.commandHistory || [];
    
    // Don't add duplicate consecutive commands
    if (history[history.length - 1] === command) return;

    history.push(command);
    this.updateState({ commandHistory: history });
  }

  /**
   * Get command history
   */
  getHistory(): string[] {
    return this.currentState.commandHistory || [];
  }

  /**
   * Clear all saved state
   */
  clearState() {
    try {
      localStorage.removeItem(this.config.storageKey);
      this.currentState = {};
      console.log('[Terminal Persistence] State cleared');
    } catch (error) {
      console.warn('[Terminal Persistence] Failed to clear state:', error);
    }
  }

  /**
   * Schedule a save operation (debounced)
   */
  private scheduleSave() {
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
    }

    this.saveTimeoutId = setTimeout(() => {
      this.saveState(null, this.currentState);
      this.saveTimeoutId = null;
    }, this.config.saveInterval);
  }

  /**
   * Extract buffer lines from terminal
   */
  private extractBufferLines(terminal: XTerm): string[] {
    try {
      const buffer = terminal.buffer.active;
      const lines: string[] = [];
      
      // Extract last N lines
      const startLine = Math.max(0, buffer.length - this.config.maxBufferLines);
      for (let i = startLine; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          lines.push(line.translateToString(true));
        }
      }
      
      return lines;
    } catch (error) {
      console.warn('[Terminal Persistence] Failed to extract buffer lines:', error);
      return [];
    }
  }

  /**
   * Get current scroll position
   */
  private getScrollPosition(terminal: XTerm): number {
    try {
      const buffer = terminal.buffer.active;
      return buffer.viewportY;
    } catch (error) {
      console.warn('[Terminal Persistence] Failed to get scroll position:', error);
      return 0;
    }
  }

  /**
   * Apply user preferences to terminal
   */
  private applyUserPreferences(terminal: XTerm, preferences: TerminalState['userPreferences']) {
    try {
      // Apply options that can be changed dynamically
      if (preferences.fontSize) {
        terminal.options.fontSize = preferences.fontSize;
      }
      if (preferences.fontFamily) {
        terminal.options.fontFamily = preferences.fontFamily;
      }
      if (preferences.scrollback) {
        terminal.options.scrollback = preferences.scrollback;
      }
      
      console.log('[Terminal Persistence] User preferences applied');
    } catch (error) {
      console.warn('[Terminal Persistence] Failed to apply preferences:', error);
    }
  }

  /**
   * Restore buffer content to terminal
   */
  private async restoreBufferContent(terminal: XTerm, bufferLines: string[]): Promise<void> {
    try {
      // Clear current content
      terminal.clear();
      
      // Write restored content
      for (const line of bufferLines) {
        terminal.writeln(line);
      }
      
      console.log('[Terminal Persistence] Buffer content restored');
    } catch (error) {
      console.warn('[Terminal Persistence] Failed to restore buffer content:', error);
    }
  }

  /**
   * Restore scroll position
   */
  private restoreScrollPosition(terminal: XTerm, scrollPosition: number) {
    try {
      // Restore scroll position after content is loaded
      setTimeout(() => {
        if (scrollPosition > 0) {
          terminal.scrollToLine(scrollPosition);
        }
      }, 100);
    } catch (error) {
      console.warn('[Terminal Persistence] Failed to restore scroll position:', error);
    }
  }

  /**
   * Validate state structure
   */
  private validateState(state: any): state is TerminalState {
    return (
      typeof state === 'object' &&
      state !== null &&
      typeof state.lastActivity === 'number' &&
      Array.isArray(state.commandHistory) &&
      typeof state.userPreferences === 'object'
    );
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = null;
    }
  }
}

/**
 * Hook for using terminal state persistence
 */
export function useTerminalStatePersistence(
  terminalRef: React.RefObject<XTerm>,
  config: Partial<TerminalPersistenceConfig> = {}
) {
  const managerRef = useRef<TerminalStatePersistenceManager | null>(null);
  const [isRestored, setIsRestored] = React.useState(false);

  // Initialize persistence manager
  useEffect(() => {
    managerRef.current = new TerminalStatePersistenceManager(config);
    
    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
      }
    };
  }, []);

  // Auto-save state periodically
  useEffect(() => {
    if (!managerRef.current || !terminalRef.current) return;

    const interval = setInterval(() => {
      if (managerRef.current && terminalRef.current) {
        managerRef.current.saveState(terminalRef.current);
      }
    }, config.saveInterval || DEFAULT_CONFIG.saveInterval);

    return () => clearInterval(interval);
  }, [terminalRef.current, config.saveInterval]);

  // Load and restore state on mount
  useEffect(() => {
    if (!managerRef.current || !terminalRef.current || isRestored) return;

    const loadState = async () => {
      const savedState = managerRef.current?.loadState();
      if (savedState && terminalRef.current) {
        const restored = await managerRef.current?.restoreState(terminalRef.current, savedState);
        setIsRestored(!!restored);
      } else {
        setIsRestored(true);
      }
    };

    // Delay to ensure terminal is fully initialized
    setTimeout(loadState, 1000);
  }, [terminalRef.current]);

  const saveState = useCallback((additionalState?: Partial<TerminalState>) => {
    if (managerRef.current && terminalRef.current) {
      managerRef.current.saveState(terminalRef.current, additionalState);
    }
  }, []);

  const updateState = useCallback((updates: Partial<TerminalState>) => {
    if (managerRef.current) {
      managerRef.current.updateState(updates);
    }
  }, []);

  const addToHistory = useCallback((command: string) => {
    if (managerRef.current) {
      managerRef.current.addToHistory(command);
    }
  }, []);

  const getHistory = useCallback((): string[] => {
    return managerRef.current?.getHistory() || [];
  }, []);

  const clearState = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.clearState();
    }
  }, []);

  return {
    isRestored,
    saveState,
    updateState,
    addToHistory,
    getHistory,
    clearState,
    manager: managerRef.current
  };
}

export default TerminalStatePersistenceManager;