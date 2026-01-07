/**
 * Terminal State Store (Zustand)
 *
 * Dedicated store for terminal state management - the SINGLE source of truth
 * for terminal history and related data.
 *
 * Architecture:
 * - terminalHistoryRef in components: Used for real-time accumulation (performance)
 * - useTerminalStore: Canonical source of truth, synced every 500ms
 * - Zustand persist: Handles localStorage automatically
 *
 * This replaces the scattered terminal state that was previously in:
 * - useIDEStore.terminal
 * - localStorage['terminalHistory']
 * - localStorage['mainTerminalHistory']
 * - IDE page component state
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface TerminalSession {
  id: string;
  type: 'main' | 'sandbox' | 'agent';
  name: string;
  createdAt: number;
  lastActiveAt: number;
}

export interface TerminalState {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;
  reconnectAttempts: number;

  // Session state
  currentSessionId: string | null;
  sessions: TerminalSession[];

  // History - THE canonical source of truth
  history: string;
  lastOutput: string;

  // Command history
  commands: string[];
  lastCommand: string;
  commandHistoryIndex: number;

  // Working state
  workingDirectory: string;
  isProcessing: boolean;

  // Settings (synced from terminal settings)
  fontSize: number;
  fontFamily: string;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
}

export interface TerminalActions {
  // Connection
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;

  // Session
  setCurrentSession: (sessionId: string | null) => void;
  addSession: (session: TerminalSession) => void;
  removeSession: (sessionId: string) => void;
  updateSessionActivity: (sessionId: string) => void;

  // History - these are the ONLY methods that should modify history
  appendHistory: (output: string) => void;
  setHistory: (history: string) => void;
  clearHistory: () => void;

  // Commands
  addCommand: (command: string) => void;
  clearCommands: () => void;
  setCommandHistoryIndex: (index: number) => void;
  getPreviousCommand: () => string | null;
  getNextCommand: () => string | null;

  // Working state
  setWorkingDirectory: (path: string) => void;
  setProcessing: (isProcessing: boolean) => void;

  // Settings
  updateSettings: (settings: Partial<Pick<TerminalState, 'fontSize' | 'fontFamily' | 'cursorStyle' | 'cursorBlink'>>) => void;

  // Bulk operations
  reset: () => void;
  hydrateFromLegacy: () => void;
}

export type TerminalStore = TerminalState & TerminalActions;

// ============================================================================
// Constants
// ============================================================================

const MAX_HISTORY_LENGTH = 500000; // 500KB max history
const MAX_COMMANDS = 100;
const TRIM_HISTORY_THRESHOLD = 400000; // Trim when approaching max
const TRIM_HISTORY_TARGET = 300000; // Trim down to this size

// ============================================================================
// Initial State
// ============================================================================

const initialState: TerminalState = {
  // Connection
  isConnected: false,
  connectionError: null,
  reconnectAttempts: 0,

  // Session
  currentSessionId: null,
  sessions: [],

  // History
  history: '',
  lastOutput: '',

  // Commands
  commands: [],
  lastCommand: '',
  commandHistoryIndex: -1,

  // Working state
  workingDirectory: process.cwd?.() || '/Users/michaelkraft',
  isProcessing: false,

  // Settings
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  cursorStyle: 'block',
  cursorBlink: true,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Trim history if it exceeds threshold
 * Keeps the most recent content
 */
function trimHistory(history: string): string {
  if (history.length > TRIM_HISTORY_THRESHOLD) {
    // Find a good break point (newline) near the target size
    const startIndex = history.length - TRIM_HISTORY_TARGET;
    const newlineIndex = history.indexOf('\n', startIndex);

    if (newlineIndex !== -1) {
      return history.substring(newlineIndex + 1);
    }

    // Fallback: just trim from target position
    return history.substring(startIndex);
  }

  return history;
}

/**
 * Filter out Claude thinking/status lines from history
 * Used when restoring checkpoints to avoid duplicate status displays
 */
export function filterThinkingFromHistory(history: string): string {
  if (!history) return '';

  const patterns = [
    /^\s*⠋.*$/gm,
    /^\s*⠙.*$/gm,
    /^\s*⠹.*$/gm,
    /^\s*⠸.*$/gm,
    /^\s*⠼.*$/gm,
    /^\s*⠴.*$/gm,
    /^\s*⠦.*$/gm,
    /^\s*⠧.*$/gm,
    /^\s*⠇.*$/gm,
    /^\s*⠏.*$/gm,
    /\[Thinking\.\.\.\].*$/gm,
    /^.*Claude is thinking.*$/gm,
    /^.*Analyzing.*\.{3,}$/gm,
  ];

  let filtered = history;
  for (const pattern of patterns) {
    filtered = filtered.replace(pattern, '');
  }

  // Clean up multiple consecutive newlines
  filtered = filtered.replace(/\n{3,}/g, '\n\n');

  return filtered.trim();
}

// ============================================================================
// Store
// ============================================================================

export const useTerminalStore = create<TerminalStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ================================================================
        // Connection Actions
        // ================================================================

        setConnected: (connected) => set(
          { isConnected: connected, connectionError: connected ? null : get().connectionError },
          false,
          'setConnected'
        ),

        setConnectionError: (error) => set(
          { connectionError: error },
          false,
          'setConnectionError'
        ),

        incrementReconnectAttempts: () => set(
          (state) => ({ reconnectAttempts: state.reconnectAttempts + 1 }),
          false,
          'incrementReconnectAttempts'
        ),

        resetReconnectAttempts: () => set(
          { reconnectAttempts: 0 },
          false,
          'resetReconnectAttempts'
        ),

        // ================================================================
        // Session Actions
        // ================================================================

        setCurrentSession: (sessionId) => set(
          { currentSessionId: sessionId },
          false,
          'setCurrentSession'
        ),

        addSession: (session) => set(
          (state) => ({
            sessions: [...state.sessions.filter(s => s.id !== session.id), session]
          }),
          false,
          'addSession'
        ),

        removeSession: (sessionId) => set(
          (state) => ({
            sessions: state.sessions.filter(s => s.id !== sessionId),
            currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId
          }),
          false,
          'removeSession'
        ),

        updateSessionActivity: (sessionId) => set(
          (state) => ({
            sessions: state.sessions.map(s =>
              s.id === sessionId ? { ...s, lastActiveAt: Date.now() } : s
            )
          }),
          false,
          'updateSessionActivity'
        ),

        // ================================================================
        // History Actions - THE canonical source of truth
        // ================================================================

        appendHistory: (output) => {
          if (!output) return;

          set(
            (state) => {
              const newHistory = trimHistory(state.history + output);
              return {
                history: newHistory,
                lastOutput: output,
              };
            },
            false,
            'appendHistory'
          );
        },

        setHistory: (history) => set(
          { history: trimHistory(history), lastOutput: '' },
          false,
          'setHistory'
        ),

        clearHistory: () => set(
          { history: '', lastOutput: '' },
          false,
          'clearHistory'
        ),

        // ================================================================
        // Command Actions
        // ================================================================

        addCommand: (command) => {
          if (!command.trim()) return;

          set(
            (state) => {
              // Don't add duplicate consecutive commands
              if (state.commands[state.commands.length - 1] === command) {
                return { lastCommand: command, commandHistoryIndex: -1 };
              }

              const newCommands = [...state.commands, command];
              // Keep only last MAX_COMMANDS
              const trimmedCommands = newCommands.slice(-MAX_COMMANDS);

              return {
                commands: trimmedCommands,
                lastCommand: command,
                commandHistoryIndex: -1,
              };
            },
            false,
            'addCommand'
          );
        },

        clearCommands: () => set(
          { commands: [], lastCommand: '', commandHistoryIndex: -1 },
          false,
          'clearCommands'
        ),

        setCommandHistoryIndex: (index) => set(
          { commandHistoryIndex: index },
          false,
          'setCommandHistoryIndex'
        ),

        getPreviousCommand: () => {
          const state = get();
          const newIndex = state.commandHistoryIndex === -1
            ? state.commands.length - 1
            : Math.max(0, state.commandHistoryIndex - 1);

          if (newIndex >= 0 && newIndex < state.commands.length) {
            set({ commandHistoryIndex: newIndex });
            return state.commands[newIndex];
          }
          return null;
        },

        getNextCommand: () => {
          const state = get();
          if (state.commandHistoryIndex === -1) return null;

          const newIndex = state.commandHistoryIndex + 1;

          if (newIndex >= state.commands.length) {
            set({ commandHistoryIndex: -1 });
            return '';
          }

          set({ commandHistoryIndex: newIndex });
          return state.commands[newIndex];
        },

        // ================================================================
        // Working State Actions
        // ================================================================

        setWorkingDirectory: (path) => set(
          { workingDirectory: path },
          false,
          'setWorkingDirectory'
        ),

        setProcessing: (isProcessing) => set(
          { isProcessing },
          false,
          'setProcessing'
        ),

        // ================================================================
        // Settings Actions
        // ================================================================

        updateSettings: (settings) => set(
          (state) => ({ ...state, ...settings }),
          false,
          'updateSettings'
        ),

        // ================================================================
        // Bulk Operations
        // ================================================================

        reset: () => set(initialState, false, 'reset'),

        /**
         * Migrate data from legacy localStorage keys
         * Call this once on startup if needed
         */
        hydrateFromLegacy: () => {
          if (typeof window === 'undefined') return;

          const legacyHistory =
            localStorage.getItem('mainTerminalHistory') ||
            localStorage.getItem('terminalHistory');

          if (legacyHistory && !get().history) {
            const filtered = filterThinkingFromHistory(legacyHistory);
            set({ history: trimHistory(filtered) }, false, 'hydrateFromLegacy');

            // Clean up legacy keys
            localStorage.removeItem('mainTerminalHistory');
            localStorage.removeItem('terminalHistory');

            console.log('[TerminalStore] Migrated legacy terminal history');
          }
        },
      }),
      {
        name: 'coder1-terminal-store',
        // Only persist essential data
        partialize: (state) => ({
          history: state.history,
          commands: state.commands,
          workingDirectory: state.workingDirectory,
          fontSize: state.fontSize,
          fontFamily: state.fontFamily,
          cursorStyle: state.cursorStyle,
          cursorBlink: state.cursorBlink,
        }),
        version: 1,
        // Handle migration from old storage format
        migrate: (persistedState, version) => {
          if (version === 0) {
            // Migration from v0 to v1
            return { ...initialState, ...persistedState };
          }
          return persistedState as TerminalState;
        },
      }
    ),
    { name: 'Terminal Store' }
  )
);

// ============================================================================
// Hooks for common patterns
// ============================================================================

/**
 * Hook for syncing terminal ref to store (debounced)
 * Use in TerminalContainer to sync real-time history to store
 */
export function useSyncTerminalHistory() {
  const appendHistory = useTerminalStore((state) => state.appendHistory);

  let syncTimeout: NodeJS.Timeout | null = null;
  let pendingOutput = '';

  const scheduleSync = (output: string) => {
    pendingOutput += output;

    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    // Debounce sync by 500ms for performance
    syncTimeout = setTimeout(() => {
      if (pendingOutput) {
        appendHistory(pendingOutput);
        pendingOutput = '';
      }
    }, 500);
  };

  const flushSync = () => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
    if (pendingOutput) {
      appendHistory(pendingOutput);
      pendingOutput = '';
    }
  };

  return { scheduleSync, flushSync };
}

// ============================================================================
// Selectors
// ============================================================================

export const selectTerminalHistory = (state: TerminalStore) => state.history;
export const selectIsConnected = (state: TerminalStore) => state.isConnected;
export const selectCurrentSession = (state: TerminalStore) => state.currentSessionId;
export const selectCommands = (state: TerminalStore) => state.commands;
export const selectWorkingDirectory = (state: TerminalStore) => state.workingDirectory;
