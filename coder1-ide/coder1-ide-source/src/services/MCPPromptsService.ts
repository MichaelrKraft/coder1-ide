/**
 * MCP Prompts Service
 * Handles communication with the MCP prompts API for the IDE
 */

export interface MCPPrompt {
  id: string;
  command: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  examples?: string[];
  contextTriggers?: string[];
  priority?: number;
}

export interface MCPPromptLibrary {
  version: string;
  prompts: MCPPrompt[];
  total: number;
}

export interface PromptContext {
  fileType?: string;
  hasErrors?: boolean;
  idleTime?: number;
  timeOfDay?: string;
  recentPrompts?: string[];
  sessionType?: string;
}

class MCPPromptsService {
  private apiBase: string;
  private cachedPrompts: MCPPrompt[] | null = null;
  private lastFetch: number = 0;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  constructor() {
    // Handle different environments - IDE runs on 3001, main server on 3000
    const isIDE = window.location.port === '3001';
    this.apiBase = isIDE ? 'http://localhost:3000/api/mcp-prompts' : '/api/mcp-prompts';
    console.log(`[MCPPromptsService] Using API base: ${this.apiBase}`);
  }

  /**
   * Get the full prompt library
   */
  async getPromptLibrary(context?: PromptContext, category?: string): Promise<MCPPromptLibrary> {
    try {
      // Check cache
      if (this.cachedPrompts && Date.now() - this.lastFetch < this.cacheTimeout) {
        console.log('[MCPPromptsService] Using cached prompts');
        return {
          version: '1.0.0',
          prompts: this.cachedPrompts,
          total: this.cachedPrompts.length
        };
      }

      const params = new URLSearchParams();
      if (context?.fileType) params.append('context', context.fileType);
      if (category) params.append('category', category);

      const url = `${this.apiBase}/library?${params.toString()}`;
      console.log(`[MCPPromptsService] Fetching prompts from: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch prompts: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[MCPPromptsService] Successfully loaded ${data.prompts?.length || 0} prompts`);
      
      // Cache the results
      this.cachedPrompts = data.prompts;
      this.lastFetch = Date.now();
      
      return data;
    } catch (error) {
      console.error('[MCPPromptsService] Failed to load prompt library:', error);
      console.log('[MCPPromptsService] Falling back to default prompts');
      return this.getDefaultPrompts();
    }
  }

  /**
   * Get contextual suggestions based on current IDE state
   */
  async getSuggestions(context: PromptContext): Promise<MCPPrompt[]> {
    try {
      const params = new URLSearchParams();
      if (context.fileType) params.append('fileType', context.fileType);
      if (context.hasErrors !== undefined) params.append('hasErrors', String(context.hasErrors));
      if (context.idleTime !== undefined) params.append('idleTime', String(context.idleTime));
      if (context.timeOfDay) params.append('timeOfDay', context.timeOfDay);
      if (context.recentPrompts?.length) {
        params.append('recentPrompts', context.recentPrompts.join(','));
      }

      const response = await fetch(`${this.apiBase}/suggestions?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      // Return cached prompts as fallback
      if (this.cachedPrompts) {
        return this.cachedPrompts.slice(0, 10);
      }
      return this.getDefaultPrompts().prompts.slice(0, 5);
    }
  }

  /**
   * Execute a prompt command
   */
  async executePrompt(command: string, context?: any): Promise<any> {
    try {
      const url = `${this.apiBase}/execute`;
      console.log(`[MCPPromptsService] Executing prompt: ${command} at ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, context })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[MCPPromptsService] Execute failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to execute prompt: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[MCPPromptsService] Execute result:', result);
      return result;
    } catch (error) {
      console.error('[MCPPromptsService] Failed to execute prompt:', error);
      throw error;
    }
  }

  /**
   * Track prompt usage for analytics
   */
  async trackUsage(promptId: string, event: string, metadata?: any): Promise<void> {
    try {
      await fetch(`${this.apiBase}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId, event, metadata })
      });
    } catch (error) {
      // Silently fail for analytics
      console.debug('Failed to track usage:', error);
    }
  }

  /**
   * Get default prompts for offline/fallback mode
   */
  private getDefaultPrompts(): MCPPromptLibrary {
    return {
      version: '1.0.0',
      total: 5,
      prompts: [
        {
          id: 'quick-start',
          command: '/coder1/quick-start',
          title: 'Quick Start',
          description: 'Learn available commands',
          icon: '🚀',
          category: 'getting-started',
          examples: ['Shows all commands', 'Interactive help'],
          contextTriggers: ['general'],
          priority: 10
        },
        {
          id: 'find-bugs',
          command: '/coder1/find-bugs',
          title: 'Find Bugs',
          description: 'Detect issues automatically',
          icon: '🐛',
          category: 'debugging',
          examples: ['Syntax errors', 'Logic issues'],
          contextTriggers: ['has-errors'],
          priority: 9
        },
        {
          id: 'optimize',
          command: '/coder1/optimize',
          title: 'Optimize Code',
          description: 'Improve performance',
          icon: '⚡',
          category: 'performance',
          examples: ['Reduce complexity', 'Speed up'],
          contextTriggers: ['general'],
          priority: 7
        },
        {
          id: 'generate-tests',
          command: '/coder1/generate-tests',
          title: 'Generate Tests',
          description: 'Create test suites',
          icon: '🧪',
          category: 'testing',
          examples: ['Unit tests', 'Integration tests'],
          contextTriggers: ['no-tests'],
          priority: 8
        },
        {
          id: 'explain-code',
          command: '/coder1/explain',
          title: 'Explain Code',
          description: 'Understand complex code',
          icon: '💡',
          category: 'learning',
          examples: ['Line-by-line', 'Architecture'],
          contextTriggers: ['general'],
          priority: 6
        }
      ]
    };
  }

  /**
   * Get time of day for context
   */
  getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }
}

// Export singleton instance
const mcpPromptsService = new MCPPromptsService();
export default mcpPromptsService;