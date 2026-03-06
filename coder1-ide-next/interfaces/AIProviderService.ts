/**
 * AIProviderService — Common interface for all AI CLI providers.
 *
 * Each provider (Claude Code, Codex, Aider, Gemini CLI, etc.) implements
 * this interface so the API layer can dispatch to any provider without
 * knowing the implementation details.
 *
 * The interface is intentionally minimal — it matches the public API that
 * `claude-cli-service.ts` already exposes, so existing code can adopt it
 * without a rewrite.
 */

export interface ProviderDetection {
  command: string;
  version: string | null;
  available: boolean;
  authenticated: boolean;
  error?: string;
}

export interface ProviderSession {
  id: string;
  projectPath?: string;
  lastActivity: Date;
}

export interface ProviderStatus {
  name: string;
  available: boolean;
  activeSessions: number;
  command: string | null;
}

export interface AIProviderService {
  /** Human-readable provider name (e.g., "Claude Code", "Codex CLI") */
  readonly name: string;

  /** Detect whether this provider's CLI is installed and authenticated */
  detect(): Promise<ProviderDetection>;

  /** Check if provider is available for use (fast, cached check) */
  isAvailable(): boolean;

  /** Get the shell command for this provider (e.g., "claude", "codex") */
  getCommand(): string | null;

  /** Create a new session for conversation tracking */
  createSession(sessionId: string, projectPath?: string): ProviderSession;

  /** Send a message and get a response. Throws on failure. */
  sendMessage(sessionId: string, message: string, context?: string): Promise<string>;

  /** Process a terminal command through the provider. Throws on failure. */
  processTerminalCommand(sessionId: string, command: string, workingDir?: string): Promise<string>;

  /** Get provider status summary */
  getStatus(): ProviderStatus;

  /**
   * Path to this provider's commands/skills directory.
   * Used by Discover Panel to know where to install slash commands.
   * Returns null if the provider doesn't support commands.
   */
  getCommandsPath(): string | null;

  /**
   * Path to this provider's skills directory.
   * Returns null if the provider doesn't support skills.
   */
  getSkillsPath(): string | null;
}
