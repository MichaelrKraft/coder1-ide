/**
 * Context Bridge Types
 *
 * Enables terminal session context to flow from user's Claude Code session
 * to AI Team agents when spawned.
 */

export interface ContextBridge {
  /** Whether meaningful context exists */
  hasContext: boolean;

  /** Total length of terminal history in characters */
  historyLength: number;

  /** Number of commands detected in history */
  commandCount: number;

  /** Truncated terminal history (last 5000 chars) */
  history: string;

  /** Last 10 commands extracted from history */
  recentCommands: string[];

  /** Current working directory if available */
  currentWorkingDirectory?: string;
}
