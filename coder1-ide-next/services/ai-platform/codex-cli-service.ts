/**
 * CodexCliService — OpenAI Codex CLI provider for Coder1 IDE.
 *
 * Implements AIProviderService by wrapping `codex exec --json` calls.
 * Codex CLI streams JSONL events; we parse them to extract the response.
 *
 * Installation: npm i -g @openai/codex  (or brew install --cask codex)
 * Auth: Set CODEX_API_KEY or OPENAI_API_KEY env var
 * Docs: https://developers.openai.com/codex/cli/reference/
 */

import { execSync, spawn } from 'child_process';
import type {
  AIProviderService,
  ProviderDetection,
  ProviderSession,
  ProviderStatus,
} from '@/interfaces/AIProviderService';

// ============================================================================
// Types
// ============================================================================

interface CodexJSONLEvent {
  type: string;
  thread_id?: string;
  item?: {
    id: string;
    type: string;
    text?: string;
    command?: string;
    status?: string;
  };
  usage?: {
    input_tokens: number;
    cached_input_tokens?: number;
    output_tokens: number;
  };
}

interface CodexSession {
  id: string;
  projectPath?: string;
  lastActivity: Date;
}

// ============================================================================
// Service
// ============================================================================

class CodexCliService implements AIProviderService {
  readonly name = 'Codex CLI';

  private codexCommand: string | null = null;
  private codexVersion: string | null = null;
  private available = false;
  private sessions = new Map<string, CodexSession>();

  constructor() {
    // Run initial detection (non-blocking)
    this.detectSync();
  }

  private detectSync(): void {
    try {
      const which = execSync('which codex 2>/dev/null || echo ""', { encoding: 'utf-8' }).trim();
      if (!which) {
        this.available = false;
        return;
      }
      this.codexCommand = 'codex';
      try {
        this.codexVersion = execSync('codex --version 2>/dev/null', { encoding: 'utf-8' }).trim();
      } catch {
        this.codexVersion = null;
      }
      this.available = this.hasAuth();
    } catch {
      this.available = false;
    }
  }

  private hasAuth(): boolean {
    return !!(process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY);
  }

  // ============================================================================
  // AIProviderService implementation
  // ============================================================================

  async detect(): Promise<ProviderDetection> {
    this.detectSync();
    return {
      command: this.codexCommand || 'codex',
      version: this.codexVersion,
      available: !!this.codexCommand,
      authenticated: this.hasAuth(),
      error: !this.hasAuth() ? 'Set CODEX_API_KEY or OPENAI_API_KEY environment variable' : undefined,
    };
  }

  isAvailable(): boolean {
    return this.available;
  }

  getCommand(): string | null {
    return this.codexCommand;
  }

  createSession(sessionId: string, projectPath?: string): ProviderSession {
    const session: CodexSession = {
      id: sessionId,
      projectPath,
      lastActivity: new Date(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async sendMessage(sessionId: string, message: string, context?: string): Promise<string> {
    if (!this.available) {
      throw new Error('Codex CLI not available. Install with: npm i -g @openai/codex');
    }

    const session = this.sessions.get(sessionId);
    const projectPath = session?.projectPath || process.cwd();

    // Build the prompt with context
    const fullPrompt = context ? `${context}\n\n${message}` : message;

    // Execute codex in non-interactive mode with JSONL output
    const response = await this.executeCodex(fullPrompt, projectPath);

    // Update session activity
    if (session) {
      session.lastActivity = new Date();
    }

    return response;
  }

  async processTerminalCommand(sessionId: string, command: string, workingDir?: string): Promise<string> {
    // For Codex, terminal commands are just prompts
    return this.sendMessage(sessionId, command, workingDir ? `Working directory: ${workingDir}` : undefined);
  }

  getStatus(): ProviderStatus {
    return {
      name: this.name,
      available: this.available,
      activeSessions: this.sessions.size,
      command: this.codexCommand,
    };
  }

  getCommandsPath(): string | null {
    // Codex has no commands concept equivalent to Claude Code's ~/.claude/commands/
    return null;
  }

  getSkillsPath(): string | null {
    // Codex has no skills concept equivalent to Claude Code's ~/.claude/skills/
    return null;
  }

  // ============================================================================
  // Codex execution
  // ============================================================================

  private executeCodex(prompt: string, cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        'exec',
        '--json',
        '--full-auto',
        '--ephemeral',
        '--path', cwd,
        prompt,
      ];

      const child = spawn('codex', args, {
        cwd,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('Codex CLI timed out after 60 seconds'));
      }, 60_000);

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeout);

        if (code !== 0 && !stdout.trim()) {
          reject(new Error(`Codex CLI exited with code ${code}: ${stderr.trim()}`));
          return;
        }

        try {
          const response = this.parseJSONLResponse(stdout);
          resolve(response);
        } catch (parseError) {
          // If JSONL parsing fails, return raw stdout as fallback
          resolve(stdout.trim() || `Codex completed with exit code ${code}`);
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn Codex CLI: ${err.message}`));
      });
    });
  }

  /**
   * Parse JSONL output from `codex exec --json`.
   * Extracts agent_message text from item.completed events.
   */
  private parseJSONLResponse(jsonlOutput: string): string {
    const lines = jsonlOutput.split('\n').filter(Boolean);
    const agentMessages: string[] = [];

    for (const line of lines) {
      try {
        const event: CodexJSONLEvent = JSON.parse(line);

        if (
          event.type === 'item.completed' &&
          event.item?.type === 'agent_message' &&
          event.item.text
        ) {
          agentMessages.push(event.item.text);
        }
      } catch {
        // Skip malformed JSON lines
      }
    }

    if (agentMessages.length === 0) {
      // Fallback: look for any text in completed items
      for (const line of lines) {
        try {
          const event: CodexJSONLEvent = JSON.parse(line);
          if (event.type === 'item.completed' && event.item?.text) {
            agentMessages.push(event.item.text);
          }
        } catch {
          // Skip
        }
      }
    }

    return agentMessages.join('\n') || 'No response from Codex CLI';
  }
}

// Singleton
export const codexCliService = new CodexCliService();
export default codexCliService;
