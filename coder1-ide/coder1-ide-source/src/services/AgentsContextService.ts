/**
 * AGENTS.md Context Service for CoderOne IDE
 * 
 * This service provides client-side integration for automatically enhancing
 * Claude Code sessions with AGENTS.md context from the current project.
 */

interface AgentsContext {
  filePath: string;
  overview: {
    projectName: string;
    description: string;
    framework: string;
    language: string;
    type: string;
  };
  buildCommands: Array<{
    command: string;
    type: string;
  }>;
  guidelines: string[];
  projectStructure: string;
  sections: Record<string, string>;
  metadata: {
    parsedAt: number;
    contentLength: number;
    hasOverview: boolean;
    hasBuildCommands: boolean;
    hasGuidelines: boolean;
  };
}

interface ContextSummary {
  hasContext: boolean;
  projectName?: string;
  framework?: string;
  language?: string;
  buildCommandsCount?: number;
  guidelinesCount?: number;
  filePath?: string;
  sections?: string[];
  message?: string;
  error?: string;
}

interface EnhancedPromptResult {
  prompt: string;
  enhanced: boolean;
  context: AgentsContext | null;
  metadata?: {
    agentsFilePath: string;
    projectName: string;
    framework: string;
    contextSections: number;
    buildCommands: number;
  };
  error?: string;
}

export class AgentsContextService {
  private static instance: AgentsContextService;
  private baseUrl: string = '/api/agents-context';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): AgentsContextService {
    if (!AgentsContextService.instance) {
      AgentsContextService.instance = new AgentsContextService();
    }
    return AgentsContextService.instance;
  }

  // ==========================================
  // MAIN INTEGRATION METHODS
  // ==========================================

  /**
   * Enhance a Claude Code prompt with AGENTS.md context
   */
  public async enhanceClaudeCodePrompt(originalPrompt: string, workingDirectory?: string): Promise<EnhancedPromptResult> {
    try {
      console.log('[AgentsContextService] Enhancing Claude Code prompt with AGENTS.md context');

      const response = await fetch(`${this.baseUrl}/enhance-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: originalPrompt,
          workingDirectory: workingDirectory || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to enhance prompt');
      }

      console.log('[AgentsContextService] Prompt enhancement result:', {
        enhanced: result.enhanced,
        hasContext: !!result.context,
        projectName: result.metadata?.projectName
      });

      return {
        prompt: result.prompt,
        enhanced: result.enhanced,
        context: result.context,
        metadata: result.metadata,
        error: result.error
      };

    } catch (error) {
      console.error('[AgentsContextService] Error enhancing prompt:', error);
      return {
        prompt: originalPrompt,
        enhanced: false,
        context: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get context summary for the current project
   */
  public async getContextSummary(directory?: string): Promise<ContextSummary> {
    try {
      const cacheKey = `summary_${directory || 'current'}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached as ContextSummary;
      }

      console.log('[AgentsContextService] Getting AGENTS.md context summary');

      const url = new URL(`${window.location.origin}${this.baseUrl}/summary`);
      if (directory) {
        url.searchParams.set('directory', directory);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to get context summary');
      }

      const summary = result.summary;
      this.setCachedData(cacheKey, summary);

      return summary;

    } catch (error) {
      console.error('[AgentsContextService] Error getting context summary:', error);
      return {
        hasContext: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if AGENTS.md file exists in project hierarchy
   */
  public async hasAgentsFile(directory?: string): Promise<boolean> {
    try {
      const summary = await this.getContextSummary(directory);
      return summary.hasContext;
    } catch (error) {
      console.error('[AgentsContextService] Error checking for AGENTS.md file:', error);
      return false;
    }
  }

  // ==========================================
  // CLAUDE CODE COMMAND DETECTION
  // ==========================================

  /**
   * Detect if a command is a Claude Code command
   */
  public isClaudeCodeCommand(command: string): boolean {
    const trimmed = command.trim().toLowerCase();
    return trimmed === 'claude' || 
           trimmed.startsWith('claude ') ||
           trimmed === 'claude-code' ||
           trimmed.startsWith('claude-code ');
  }

  /**
   * Extract the actual prompt from a Claude Code command
   */
  public extractPromptFromCommand(command: string): string {
    const trimmed = command.trim();
    
    // Handle direct 'claude' command (interactive mode)
    if (trimmed.toLowerCase() === 'claude' || trimmed.toLowerCase() === 'claude-code') {
      return '';
    }

    // Handle 'claude [prompt]' or 'claude-code [prompt]'
    const claudeMatch = trimmed.match(/^claude(?:-code)?\s+(.+)$/i);
    if (claudeMatch) {
      return claudeMatch[1];
    }

    return '';
  }

  /**
   * Intercept and enhance Claude Code commands with AGENTS.md context
   */
  public async interceptClaudeCodeCommand(command: string, workingDirectory?: string): Promise<{
    shouldIntercept: boolean;
    enhancedCommand?: string;
    originalPrompt?: string;
    context?: AgentsContext | null;
  }> {
    if (!this.isClaudeCodeCommand(command)) {
      return { shouldIntercept: false };
    }

    try {
      const originalPrompt = this.extractPromptFromCommand(command);
      
      // If it's just 'claude' with no prompt, we can't enhance it
      if (!originalPrompt) {
        return { shouldIntercept: false };
      }

      console.log('[AgentsContextService] Intercepting Claude Code command:', command);

      const result = await this.enhanceClaudeCodePrompt(originalPrompt, workingDirectory);

      if (!result.enhanced) {
        // No AGENTS.md context available, let command proceed normally
        return { shouldIntercept: false };
      }

      // Create enhanced command with AGENTS.md context
      const enhancedCommand = this.buildEnhancedClaudeCommand(result.prompt);

      return {
        shouldIntercept: true,
        enhancedCommand,
        originalPrompt,
        context: result.context
      };

    } catch (error) {
      console.error('[AgentsContextService] Error intercepting Claude command:', error);
      return { shouldIntercept: false };
    }
  }

  /**
   * Build an enhanced Claude Code command with context
   */
  private buildEnhancedClaudeCommand(enhancedPrompt: string): string {
    // For now, we'll use a simple approach - create a temporary file with the enhanced prompt
    // In a more sophisticated implementation, we could use Claude CLI's --input-file option
    return `claude`;
  }

  // ==========================================
  // CONTEXT DISPLAY HELPERS
  // ==========================================

  /**
   * Get context status for UI display
   */
  public async getContextStatus(directory?: string): Promise<{
    hasContext: boolean;
    projectName: string;
    framework: string;
    commandsCount: number;
    statusMessage: string;
    statusColor: string;
  }> {
    try {
      const summary = await this.getContextSummary(directory);

      if (!summary.hasContext) {
        return {
          hasContext: false,
          projectName: 'No Project Context',
          framework: 'Unknown',
          commandsCount: 0,
          statusMessage: 'No AGENTS.md file found',
          statusColor: '#6B7280' // gray
        };
      }

      return {
        hasContext: true,
        projectName: summary.projectName || 'Unknown Project',
        framework: summary.framework || 'Unknown',
        commandsCount: summary.buildCommandsCount || 0,
        statusMessage: `AGENTS.md loaded from ${summary.filePath}`,
        statusColor: '#10B981' // green
      };

    } catch (error) {
      return {
        hasContext: false,
        projectName: 'Error',
        framework: 'Unknown',
        commandsCount: 0,
        statusMessage: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        statusColor: '#EF4444' // red
      };
    }
  }

  /**
   * Show a notification about context enhancement
   */
  public showContextNotification(context: AgentsContext): void {
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>🤖</span>
        <div>
          <strong>AGENTS.md Context Loaded</strong><br/>
          <small>${context.overview.projectName} (${context.overview.framework})</small>
        </div>
      </div>
    `;
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: linear-gradient(135deg, rgba(187, 154, 247, 0.95), rgba(139, 92, 246, 0.95));
      color: white; padding: 14px 20px; border-radius: 8px;
      font-size: 14px; box-shadow: 0 4px 12px rgba(187, 154, 247, 0.3);
      font-family: -apple-system, system-ui, sans-serif;
      max-width: 300px; line-height: 1.4;
      animation: slideInFade 0.3s ease-out;
    `;

    // Add animation keyframes
    if (!document.querySelector('#agents-notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'agents-notification-styles';
      styles.textContent = `
        @keyframes slideInFade {
          0% { opacity: 0; transform: translateX(100px); }
          100% { opacity: 1; transform: translateX(0); }
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
  }

  // ==========================================
  // CACHE MANAGEMENT
  // ==========================================

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  public clearCache(): void {
    this.cache.clear();
    console.log('[AgentsContextService] Cache cleared');
  }

  // ==========================================
  // HEALTH CHECK
  // ==========================================

  /**
   * Check if the service is healthy and API is available
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const result = await response.json();
      return result.success && result.status === 'healthy';
    } catch (error) {
      console.error('[AgentsContextService] Health check failed:', error);
      return false;
    }
  }
}

export default AgentsContextService;