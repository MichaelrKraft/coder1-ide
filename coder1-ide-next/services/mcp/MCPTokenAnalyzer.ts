/**
 * MCP Token Analyzer Service
 *
 * Estimates token usage for MCP servers and provides optimization suggestions
 */

import type {
  MCPServer,
  MCPServerWithStatus,
  MCPServerCategory,
  TokenEstimate,
  TokenUsage,
  OptimizationSuggestion,
} from '../../shared/types/mcp.types';

// Token estimation constants
const TOKEN_ESTIMATES: Record<MCPServerCategory, { base: number; perTool: number }> = {
  filesystem: { base: 2000, perTool: 500 },
  code: { base: 3000, perTool: 800 },
  web: { base: 4000, perTool: 1000 },
  ai: { base: 5000, perTool: 1200 },
  database: { base: 3500, perTool: 700 },
  custom: { base: 2500, perTool: 600 },
};

const DEFAULT_CONTEXT_WINDOW = 200000;
const USAGE_WARNING_THRESHOLD = 0.7;
const USAGE_CRITICAL_THRESHOLD = 0.9;

export class MCPTokenAnalyzer {
  private contextWindowSize: number;

  constructor(contextWindowSize: number = DEFAULT_CONTEXT_WINDOW) {
    this.contextWindowSize = contextWindowSize;
  }

  /**
   * Estimate tokens for a single server
   */
  estimateServerTokens(server: MCPServer | MCPServerWithStatus): TokenEstimate {
    const categoryEstimates = TOKEN_ESTIMATES[server.category] || TOKEN_ESTIMATES.custom;
    const toolCount = server.toolCount || 5; // Default tool count if unknown

    const baseTokens = categoryEstimates.base;
    const toolTokens = toolCount * categoryEstimates.perTool;
    const totalTokens = baseTokens + toolTokens;

    // Confidence based on whether we have actual tool count
    const confidence: TokenEstimate['confidence'] = server.toolCount
      ? 'high'
      : server.category !== 'custom'
      ? 'medium'
      : 'low';

    return {
      serverName: server.name,
      baseTokens,
      toolTokens,
      totalTokens,
      confidence,
    };
  }

  /**
   * Analyze token usage for all enabled servers
   */
  analyzeUsage(servers: MCPServerWithStatus[]): TokenUsage {
    const enabledServers = servers.filter(s => s.enabled !== false);
    const estimates: TokenEstimate[] = [];
    const byCategory: Record<MCPServerCategory, number> = {
      filesystem: 0,
      code: 0,
      web: 0,
      ai: 0,
      database: 0,
      custom: 0,
    };

    let totalEstimated = 0;

    for (const server of enabledServers) {
      const estimate = this.estimateServerTokens(server);
      estimates.push(estimate);
      totalEstimated += estimate.totalTokens;
      byCategory[server.category] += estimate.totalTokens;
    }

    const usagePercentage = totalEstimated / this.contextWindowSize;
    const status: TokenUsage['status'] =
      usagePercentage >= USAGE_CRITICAL_THRESHOLD
        ? 'critical'
        : usagePercentage >= USAGE_WARNING_THRESHOLD
        ? 'warning'
        : 'healthy';

    return {
      totalEstimated,
      byServer: estimates.sort((a, b) => b.totalTokens - a.totalTokens),
      byCategory,
      contextWindowSize: this.contextWindowSize,
      usagePercentage,
      status,
    };
  }

  /**
   * Generate optimization suggestions based on usage and optional task context
   */
  generateOptimizations(
    servers: MCPServerWithStatus[],
    usage: TokenUsage,
    options: {
      taskContext?: string;
      maxTokens?: number;
      preserveServers?: string[];
    } = {}
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const preserveSet = new Set(options.preserveServers || []);
    const maxTokens = options.maxTokens || this.contextWindowSize * 0.5; // Default to 50% of context

    // Parse task context for relevant keywords
    const taskKeywords = this.extractTaskKeywords(options.taskContext || '');

    // Sort servers by token usage (highest first)
    const serversByTokens = [...usage.byServer].sort((a, b) => b.totalTokens - a.totalTokens);

    for (const serverEstimate of serversByTokens) {
      const server = servers.find(s => s.name === serverEstimate.serverName);
      if (!server || preserveSet.has(server.name)) continue;

      // Check if server is relevant to task
      const relevanceScore = this.calculateRelevance(server, taskKeywords);

      // Suggest disabling low-relevance, high-token servers
      if (relevanceScore < 0.3 && serverEstimate.totalTokens > 3000) {
        const percentageSaved = (serverEstimate.totalTokens / usage.totalEstimated) * 100;

        suggestions.push({
          id: `disable-${server.name}-${Date.now()}`,
          type: 'disable',
          serverName: server.name,
          reason: this.getDisableReason(server, relevanceScore, taskKeywords),
          impact: {
            tokensSaved: serverEstimate.totalTokens,
            percentageSaved: Math.round(percentageSaved * 10) / 10,
          },
          priority: this.calculatePriority(serverEstimate.totalTokens, relevanceScore),
          autoApplicable: true,
        });
      }

      // Web servers often have high token counts - suggest if not doing web work
      if (server.category === 'web' && !taskKeywords.web && serverEstimate.totalTokens > 5000) {
        const percentageSaved = (serverEstimate.totalTokens / usage.totalEstimated) * 100;

        // Don't duplicate if already suggested
        if (!suggestions.find(s => s.serverName === server.name)) {
          suggestions.push({
            id: `disable-web-${server.name}-${Date.now()}`,
            type: 'disable',
            serverName: server.name,
            reason: `Web automation server not needed for current task. Saves significant context.`,
            impact: {
              tokensSaved: serverEstimate.totalTokens,
              percentageSaved: Math.round(percentageSaved * 10) / 10,
            },
            priority: 'medium',
            autoApplicable: true,
          });
        }
      }
    }

    // Sort by priority and impact
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.impact.tokensSaved - a.impact.tokensSaved;
    });
  }

  /**
   * Find optimal set of servers given a token budget
   */
  findOptimalSet(
    servers: MCPServerWithStatus[],
    maxTokens: number,
    requiredServers: string[] = []
  ): { servers: string[]; totalTokens: number; droppedServers: string[] } {
    const requiredSet = new Set(requiredServers);
    const selectedServers: string[] = [];
    const droppedServers: string[] = [];
    let totalTokens = 0;

    // First, add required servers
    for (const server of servers) {
      if (requiredSet.has(server.name)) {
        const estimate = this.estimateServerTokens(server);
        selectedServers.push(server.name);
        totalTokens += estimate.totalTokens;
      }
    }

    // If we're already over budget with required servers, return just those
    if (totalTokens >= maxTokens) {
      return {
        servers: selectedServers,
        totalTokens,
        droppedServers: servers
          .filter(s => !requiredSet.has(s.name))
          .map(s => s.name),
      };
    }

    // Sort non-required servers by efficiency (lower tokens = more efficient)
    const optionalServers = servers
      .filter(s => !requiredSet.has(s.name))
      .map(s => ({
        server: s,
        estimate: this.estimateServerTokens(s),
      }))
      .sort((a, b) => a.estimate.totalTokens - b.estimate.totalTokens);

    // Greedy: add servers until we hit the budget
    for (const { server, estimate } of optionalServers) {
      if (totalTokens + estimate.totalTokens <= maxTokens) {
        selectedServers.push(server.name);
        totalTokens += estimate.totalTokens;
      } else {
        droppedServers.push(server.name);
      }
    }

    return { servers: selectedServers, totalTokens, droppedServers };
  }

  /**
   * Calculate projected usage after applying suggestions
   */
  calculateProjectedUsage(
    currentUsage: TokenUsage,
    suggestions: OptimizationSuggestion[]
  ): TokenUsage {
    let projectedTotal = currentUsage.totalEstimated;
    const projectedByCategory = { ...currentUsage.byCategory };

    for (const suggestion of suggestions) {
      if (suggestion.type === 'disable') {
        projectedTotal -= suggestion.impact.tokensSaved;
      }
    }

    const usagePercentage = projectedTotal / this.contextWindowSize;
    const status: TokenUsage['status'] =
      usagePercentage >= USAGE_CRITICAL_THRESHOLD
        ? 'critical'
        : usagePercentage >= USAGE_WARNING_THRESHOLD
        ? 'warning'
        : 'healthy';

    return {
      ...currentUsage,
      totalEstimated: projectedTotal,
      usagePercentage,
      status,
      // Note: byServer and byCategory won't be fully accurate, but total is
    };
  }

  /**
   * Extract task-relevant keywords from context
   */
  private extractTaskKeywords(taskContext: string): Record<string, boolean> {
    const lower = taskContext.toLowerCase();

    return {
      filesystem: /file|read|write|directory|folder|path/.test(lower),
      git: /git|commit|branch|merge|repo|version/.test(lower),
      web: /browser|web|scrape|http|url|chrome|playwright/.test(lower),
      database: /database|sql|query|table|db/.test(lower),
      code: /code|function|class|refactor|implement|build/.test(lower),
      ai: /ai|intelligence|analyze|think|reason/.test(lower),
    };
  }

  /**
   * Calculate relevance of a server to the task
   */
  private calculateRelevance(
    server: MCPServerWithStatus,
    taskKeywords: Record<string, boolean>
  ): number {
    // If no task context, assume all servers are relevant
    const hasAnyKeywords = Object.values(taskKeywords).some(v => v);
    if (!hasAnyKeywords) return 0.5;

    // Check category relevance
    if (taskKeywords[server.category]) return 1.0;

    // Check name-based relevance
    const serverNameLower = server.name.toLowerCase();
    for (const [keyword, isRelevant] of Object.entries(taskKeywords)) {
      if (isRelevant && serverNameLower.includes(keyword)) return 0.8;
    }

    // Check for cross-category usefulness
    if (server.category === 'filesystem' && taskKeywords.code) return 0.7;
    if (server.category === 'code' && taskKeywords.git) return 0.7;

    return 0.2;
  }

  /**
   * Generate a human-readable reason for disabling
   */
  private getDisableReason(
    server: MCPServerWithStatus,
    relevance: number,
    taskKeywords: Record<string, boolean>
  ): string {
    const taskCategories = Object.entries(taskKeywords)
      .filter(([_, v]) => v)
      .map(([k]) => k);

    if (taskCategories.length === 0) {
      return `High token usage (${server.category} server). Consider disabling if not needed.`;
    }

    return `${server.category} server likely not needed for ${taskCategories.join('/')} tasks. Low relevance score.`;
  }

  /**
   * Calculate priority based on impact and relevance
   */
  private calculatePriority(
    tokensSaved: number,
    relevance: number
  ): 'high' | 'medium' | 'low' {
    if (tokensSaved > 10000 && relevance < 0.2) return 'high';
    if (tokensSaved > 5000 && relevance < 0.3) return 'medium';
    return 'low';
  }
}

// Export singleton instance
export const mcpTokenAnalyzer = new MCPTokenAnalyzer();
