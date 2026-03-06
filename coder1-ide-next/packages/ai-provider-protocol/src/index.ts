/**
 * @coder1/ai-provider-protocol
 *
 * Open protocol for AI CLI provider integration with Coder1 IDE.
 * Implement AIProviderService to make any AI coding CLI work with Coder1.
 *
 * @example
 * ```typescript
 * import { AIProviderService } from '@coder1/ai-provider-protocol';
 *
 * class MyCustomProvider implements AIProviderService {
 *   readonly name = 'My Custom AI';
 *   // ... implement all methods
 * }
 * ```
 */

// ============================================================================
// CLI Detection Types
// ============================================================================

/** Information about a detected AI CLI tool */
export interface CLIInfo {
  name: string;
  command: string;
  version: string | null;
  installed: boolean;
  authenticated: boolean;
  description: string;
  icon: string;
  features: string[];
  contextCommand?: string;
  sessionCommand?: string;
}

/** Result of scanning for installed AI CLIs */
export interface CLIDetectionResult {
  platforms: CLIInfo[];
  primary: CLIInfo | null;
  timestamp: Date;
}

// ============================================================================
// Provider Types
// ============================================================================

/** Result of detecting a specific provider */
export interface ProviderDetection {
  command: string;
  version: string | null;
  available: boolean;
  authenticated: boolean;
  error?: string;
}

/** A tracked conversation session */
export interface ProviderSession {
  id: string;
  projectPath?: string;
  lastActivity: Date;
}

/** Provider status summary */
export interface ProviderStatus {
  name: string;
  available: boolean;
  activeSessions: number;
  command: string | null;
}

// ============================================================================
// Command & Response Types
// ============================================================================

/** A command to send to an AI provider */
export interface AICommand {
  platform?: string;
  prompt: string;
  context?: string;
  files?: string[];
  sessionId?: string;
  stream?: boolean;
}

/** Response from an AI provider */
export interface AIResponse {
  platform: string;
  response: string;
  sessionId: string;
  tokensUsed?: number;
  timestamp: Date;
  error?: string;
}

// ============================================================================
// Provider Service Interface
// ============================================================================

/**
 * The interface every AI CLI provider must implement to work with Coder1 IDE.
 *
 * Implement this interface and register your provider with:
 * ```typescript
 * import { registerProvider } from '@/services/ai-platform/provider-factory';
 * registerProvider('my-provider', new MyProvider());
 * ```
 */
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

  /** Path to this provider's commands directory. Null if unsupported. */
  getCommandsPath(): string | null;

  /** Path to this provider's skills directory. Null if unsupported. */
  getSkillsPath(): string | null;
}
