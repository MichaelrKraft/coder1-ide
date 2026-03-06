/**
 * Provider Factory — Returns the right AIProviderService for a given platform.
 *
 * Supports:
 *   - Claude Code (default, always available)
 *   - Codex CLI (OpenAI, requires CODEX_API_KEY or OPENAI_API_KEY)
 */

import type { AIProviderService, ProviderDetection, ProviderSession, ProviderStatus } from '@/interfaces/AIProviderService';
import { claudeCliService } from '@/services/claude-cli-service';
import { codexCliService } from '@/services/ai-platform/codex-cli-service';
import { homedir } from 'os';
import { join } from 'path';

// ============================================================================
// Claude Code Adapter — wraps claudeCliService to AIProviderService interface
// ============================================================================

class ClaudeCodeProvider implements AIProviderService {
  readonly name = 'Claude Code';

  async detect(): Promise<ProviderDetection> {
    const result = await claudeCliService.detectClaude();
    return {
      command: result.command,
      version: result.version,
      available: result.available,
      authenticated: result.authenticated,
      error: result.authError,
    };
  }

  isAvailable(): boolean {
    return claudeCliService.isClaudeAvailable();
  }

  getCommand(): string | null {
    return claudeCliService.getClaudeCommand();
  }

  createSession(sessionId: string, projectPath?: string): ProviderSession {
    const session = claudeCliService.createSession(sessionId, projectPath);
    return {
      id: session.id,
      projectPath: session.projectPath,
      lastActivity: session.lastActivity,
    };
  }

  async sendMessage(sessionId: string, message: string, context?: string): Promise<string> {
    return claudeCliService.sendMessage(sessionId, message, context);
  }

  async processTerminalCommand(sessionId: string, command: string, workingDir?: string): Promise<string> {
    return claudeCliService.processTerminalCommand(sessionId, command, workingDir);
  }

  getStatus(): ProviderStatus {
    const status = claudeCliService.getStatus();
    return {
      name: this.name,
      available: status.claudeAvailable,
      activeSessions: status.activeSessions,
      command: status.claudeCommand,
    };
  }

  getCommandsPath(): string | null {
    return join(homedir(), '.claude', 'commands');
  }

  getSkillsPath(): string | null {
    return join(homedir(), '.claude', 'skills');
  }
}

// ============================================================================
// Provider Registry
// ============================================================================

const providers = new Map<string, AIProviderService>();
const claudeProvider = new ClaudeCodeProvider();
providers.set('claude-code', claudeProvider);
providers.set('Claude Code', claudeProvider);

// Codex CLI (OpenAI)
providers.set('codex', codexCliService);
providers.set('codex-cli', codexCliService);
providers.set('Codex CLI', codexCliService);

/**
 * Get provider by name. Returns Claude Code as default.
 */
export function getProvider(name?: string): AIProviderService {
  if (!name || name === 'primary') {
    return claudeProvider;
  }

  const provider = providers.get(name);
  if (provider) return provider;

  // Fuzzy match: case-insensitive prefix
  const lowerName = name.toLowerCase();
  for (const [key, value] of providers.entries()) {
    if (key.toLowerCase().startsWith(lowerName)) {
      return value;
    }
  }

  // Fallback to default
  return claudeProvider;
}

/**
 * Get all registered providers.
 */
export function getAllProviders(): AIProviderService[] {
  // Deduplicate (Claude is registered under two names)
  return [...new Set(providers.values())];
}

/**
 * Register a new provider. Used when adding providers in Phase 3+.
 */
export function registerProvider(key: string, provider: AIProviderService): void {
  providers.set(key, provider);
}

/**
 * Get the default (primary) provider.
 */
export function getDefaultProvider(): AIProviderService {
  return claudeProvider;
}
