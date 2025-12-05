/**
 * Terminal Context Utility
 *
 * Extracts terminal session context from localStorage for passing to AI Team agents.
 * Reads from localStorage.mainTerminalHistory which is already populated by Terminal.tsx.
 */

import { ContextBridge } from '@/types/context-bridge';

/**
 * Extract terminal context from localStorage
 * Returns structured context for AI Team agents
 */
export function extractTerminalContext(): ContextBridge {
  // Check if we're in browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {
      hasContext: false,
      historyLength: 0,
      commandCount: 0,
      history: '',
      recentCommands: []
    };
  }

  // Read from localStorage (already stored by Terminal.tsx)
  const history = localStorage.getItem('mainTerminalHistory') || '';

  // Need at least 50 chars to be meaningful context
  if (!history || history.length < 50) {
    return {
      hasContext: false,
      historyLength: 0,
      commandCount: 0,
      history: '',
      recentCommands: []
    };
  }

  // Extract recent commands from history
  // Common shell prompt patterns: $ command, > command, % command
  const commandPattern = /(?:^|\n)\s*[\$%>]\s*(.+?)(?=\n|$)/g;
  const matches = [...history.matchAll(commandPattern)];
  const recentCommands = matches
    .slice(-10)
    .map(m => m[1]?.trim())
    .filter(cmd => cmd && cmd.length > 0);

  // Truncate history to last 5000 chars (user's choice)
  const truncatedHistory = history.slice(-5000);

  return {
    hasContext: true,
    historyLength: history.length,
    commandCount: recentCommands.length,
    history: truncatedHistory,
    recentCommands
  };
}

/**
 * Strip ANSI escape codes from terminal output
 * Useful for cleaner context in AI prompts
 */
export function stripAnsiCodes(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}
