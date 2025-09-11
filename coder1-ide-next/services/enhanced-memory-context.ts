/**
 * Enhanced Memory Context Service
 * RAG system for AI Agent Orchestrator to learn from session history and memory patterns
 */

import fs from 'fs/promises';
import path from 'path';
import type { AIProjectContext } from '@/types/session';
import { logger } from '../lib/logger';

export interface MemoryInsight {
  id: string;
  agentType: string;
  insightType: string;
  content: string;
  confidence: number;
  usageCount: number;
  createdAt: number;
  lastUsed: number;
  metadata: Record<string, any>;
}

export interface TaskOutcome {
  id: string;
  taskDescription: string;
  agentType: string;
  outcome: string;
  successRating: number | null;
  timeTaken: number | null;
  approachUsed: string;
  filesModified: string[];
  createdAt: number;
  metadata: Record<string, any>;
}

export interface SessionSummary {
  sessionId: string;
  timestamp: Date;
  content: string;
  filePath: string;
  terminal: string[];
  fileChanges: string[];
  commits: string[];
  metadata?: Record<string, any>;
}

export interface MemoryContext {
  relevantPatterns: MemoryInsight[];
  relatedOutcomes: TaskOutcome[];
  sessionHistory: SessionSummary[];
  commonIssues: MemoryInsight[];
  successfulApproaches: TaskOutcome[];
}

export interface RAGQuery {
  projectType?: string;
  framework?: string;
  features?: string[];
  agentType?: string;
  taskDescription?: string;
  timeframe?: string; // 'last_7_days', 'last_30_days', 'all'
  limit?: number;
}

class EnhancedMemoryContext {
  private memoryPath: string;
  private summariesPath: string;
  private memoryCache: Map<string, any> = new Map();
  private lastCacheUpdate: number = 0;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.memoryPath = path.join(process.cwd(), '..', '.coder1', 'memory');
    this.summariesPath = path.join(process.cwd(), 'summaries');
    this.initializeCache();
  }

  /**
   * Initialize memory cache with existing data
   */
  private async initializeCache(): Promise<void> {
    try {
      await this.refreshCache();
      logger.debug('✅ Enhanced Memory Context initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize memory context:', error);
    }
  }

  /**
   * Refresh memory cache from disk
   */
  private async refreshCache(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate < this.cacheTimeout && this.memoryCache.size > 0) {
      return; // Cache still fresh
    }

    try {
      // Load memory files
      const memoryFiles = [
        'agent-insights.json',
        'task-outcomes.json', 
        'code-patterns.json',
        'error-patterns.json',
        'project-knowledge.json',
        'user-preferences.json'
      ];

      for (const file of memoryFiles) {
        try {
          const filePath = path.join(this.memoryPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          this.memoryCache.set(file, data);
        } catch (error) {
          logger.warn(`⚠️ Could not load ${file}:`, error);
          this.memoryCache.set(file, []);
        }
      }

      this.lastCacheUpdate = now;
      logger.debug(`🧠 Memory cache refreshed: ${this.memoryCache.size} files loaded`);
    } catch (error) {
      logger.error('❌ Failed to refresh memory cache:', error);
    }
  }

  /**
   * Get memory context for AI agent based on project requirements
   */
  async getMemoryContext(query: RAGQuery): Promise<MemoryContext> {
    await this.refreshCache();

    const context: MemoryContext = {
      relevantPatterns: await this.findRelevantPatterns(query),
      relatedOutcomes: await this.findRelatedOutcomes(query),
      sessionHistory: await this.findRelevantSessions(query),
      commonIssues: await this.findCommonIssues(query),
      successfulApproaches: await this.findSuccessfulApproaches(query)
    };

    return context;
  }

  /**
   * Find relevant patterns based on project context
   */
  private async findRelevantPatterns(query: RAGQuery): Promise<MemoryInsight[]> {
    const agentInsights = this.memoryCache.get('agent-insights.json') || [];
    const codePatterns = this.memoryCache.get('code-patterns.json') || [];
    
    return this.scoreAndRankInsights([...agentInsights, ...codePatterns], query)
      .slice(0, query.limit || 5);
  }

  /**
   * Find related task outcomes
   */
  private async findRelatedOutcomes(query: RAGQuery): Promise<TaskOutcome[]> {
    const taskOutcomes = this.memoryCache.get('task-outcomes.json') || [];
    
    return this.scoreAndRankOutcomes(taskOutcomes, query)
      .slice(0, query.limit || 5);
  }

  /**
   * Find relevant session summaries
   */
  private async findRelevantSessions(query: RAGQuery): Promise<SessionSummary[]> {
    try {
      const summaryFiles = await fs.readdir(this.summariesPath);
      const sessions: SessionSummary[] = [];

      // Apply timeframe filter
      const timeframeCutoff = this.getTimeframeCutoff(query.timeframe || 'last_7_days');

      for (const file of summaryFiles.slice(0, 50)) { // Limit file reads for performance
        if (!file.endsWith('.md')) continue;

        try {
          const filePath = path.join(this.summariesPath, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < timeframeCutoff) continue;

          const content = await fs.readFile(filePath, 'utf-8');
          const sessionId = this.extractSessionId(content);
          
          sessions.push({
            sessionId: sessionId || file,
            timestamp: stats.mtime,
            content,
            filePath,
            terminal: this.extractTerminalCommands(content),
            fileChanges: this.extractFileChanges(content),
            commits: this.extractCommits(content)
          });
        } catch (error) {
          logger.warn(`⚠️ Could not process session file ${file}:`, error);
        }
      }

      return this.scoreAndRankSessions(sessions, query)
        .slice(0, query.limit || 3);
    } catch (error) {
      logger.error('❌ Failed to load session summaries:', error);
      return [];
    }
  }

  /**
   * Find common issues matching the query
   */
  private async findCommonIssues(query: RAGQuery): Promise<MemoryInsight[]> {
    const errorPatterns = this.memoryCache.get('error-patterns.json') || [];
    const agentInsights = this.memoryCache.get('agent-insights.json') || [];
    
    const issues = [...errorPatterns, ...agentInsights]
      .filter(item => 
        item.insightType === 'error' || 
        item.metadata?.category === 'error' ||
        item.metadata?.type === 'error_analysis'
      );

    return this.scoreAndRankInsights(issues, query)
      .slice(0, query.limit || 3);
  }

  /**
   * Find successful approaches matching the query
   */
  private async findSuccessfulApproaches(query: RAGQuery): Promise<TaskOutcome[]> {
    const taskOutcomes = this.memoryCache.get('task-outcomes.json') || [];
    
    const successful = taskOutcomes.filter((outcome: TaskOutcome) => 
      outcome.outcome === 'success' || 
      outcome.outcome === 'completed' ||
      (outcome.successRating && outcome.successRating > 0.7)
    );

    return this.scoreAndRankOutcomes(successful, query)
      .slice(0, query.limit || 3);
  }

  /**
   * Score and rank insights based on query relevance
   */
  private scoreAndRankInsights(insights: MemoryInsight[], query: RAGQuery): MemoryInsight[] {
    return insights
      .map(insight => ({
        ...insight,
        relevanceScore: this.calculateInsightRelevance(insight, query)
      }))
      .filter(insight => insight.relevanceScore > 0.1)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Score and rank outcomes based on query relevance
   */
  private scoreAndRankOutcomes(outcomes: TaskOutcome[], query: RAGQuery): TaskOutcome[] {
    return outcomes
      .map(outcome => ({
        ...outcome,
        relevanceScore: this.calculateOutcomeRelevance(outcome, query)
      }))
      .filter(outcome => outcome.relevanceScore > 0.1)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Score and rank sessions based on query relevance
   */
  private scoreAndRankSessions(sessions: SessionSummary[], query: RAGQuery): SessionSummary[] {
    return sessions
      .map(session => ({
        ...session,
        relevanceScore: this.calculateSessionRelevance(session, query)
      }))
      .filter(session => session.relevanceScore > 0.1)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate relevance score for memory insights
   */
  private calculateInsightRelevance(insight: MemoryInsight, query: RAGQuery): number {
    let score = 0;

    // Agent type match
    if (query.agentType && insight.agentType === query.agentType) {
      score += 0.4;
    }

    // Content similarity (basic keyword matching)
    const searchTerms = [
      query.projectType,
      query.framework,
      query.taskDescription,
      ...(query.features || [])
    ].filter(Boolean).map(term => term?.toLowerCase());

    const contentLower = insight.content.toLowerCase();
    const matchingTerms = searchTerms.filter(term => contentLower.includes(term!));
    score += (matchingTerms.length / searchTerms.length) * 0.3;

    // Usage frequency (more used = more reliable)
    score += Math.min(insight.usageCount / 100, 0.2);

    // Recency (more recent = more relevant)
    const daysSinceUsed = (Date.now() - insight.lastUsed) / (1000 * 60 * 60 * 24);
    score += Math.max(0, (30 - daysSinceUsed) / 30) * 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate relevance score for task outcomes
   */
  private calculateOutcomeRelevance(outcome: TaskOutcome, query: RAGQuery): number {
    let score = 0;

    // Agent type match
    if (query.agentType && outcome.agentType === query.agentType) {
      score += 0.4;
    }

    // Task description similarity
    if (query.taskDescription && outcome.taskDescription) {
      const similarity = this.calculateStringSimilarity(
        query.taskDescription.toLowerCase(),
        outcome.taskDescription.toLowerCase()
      );
      score += similarity * 0.3;
    }

    // Success rating
    if (outcome.successRating) {
      score += outcome.successRating * 0.2;
    }

    // Recency
    const daysSinceCreated = (Date.now() - outcome.createdAt) / (1000 * 60 * 60 * 24);
    score += Math.max(0, (30 - daysSinceCreated) / 30) * 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate relevance score for session summaries
   */
  private calculateSessionRelevance(session: SessionSummary, query: RAGQuery): number {
    let score = 0;

    // Content similarity
    const searchTerms = [
      query.projectType,
      query.framework,
      query.taskDescription,
      ...(query.features || [])
    ].filter(Boolean).map(term => term?.toLowerCase());

    const contentLower = session.content.toLowerCase();
    const matchingTerms = searchTerms.filter(term => contentLower.includes(term!));
    score += (matchingTerms.length / searchTerms.length) * 0.4;

    // Framework mentions
    if (query.framework) {
      const frameworkMentions = (session.content.match(new RegExp(query.framework, 'gi')) || []).length;
      score += Math.min(frameworkMentions / 5, 0.2);
    }

    // Recency
    const daysSinceCreated = (Date.now() - session.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, (7 - daysSinceCreated) / 7) * 0.2;

    // File activity (more files = more substantial session)
    score += Math.min(session.fileChanges.length / 10, 0.1);

    // Terminal activity
    score += Math.min(session.terminal.length / 20, 0.1);

    return Math.min(score, 1.0);
  }

  /**
   * Simple string similarity calculation (Jaccard similarity)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set(Array.from(words1).filter(word => words2.has(word)));
    const union = new Set(Array.from(words1).concat(Array.from(words2)));
    
    return intersection.size / union.size;
  }

  /**
   * Get timeframe cutoff date
   */
  private getTimeframeCutoff(timeframe: string): Date {
    const now = new Date();
    const cutoff = new Date(now);

    switch (timeframe) {
      case 'last_7_days':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'last_30_days':
        cutoff.setDate(now.getDate() - 30);
        break;
      case 'all':
        cutoff.setFullYear(2020); // Far in the past
        break;
      default:
        cutoff.setDate(now.getDate() - 7);
    }

    return cutoff;
  }

  /**
   * Extract session ID from session summary content
   */
  private extractSessionId(content: string): string | null {
    const match = content.match(/\*\*Session ID:\*\*\s*(.+)/);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract terminal commands from session content
   */
  private extractTerminalCommands(content: string): string[] {
    const terminalSection = content.match(/### Terminal Commands\s*```bash\s*([\s\S]*?)\s*```/);
    if (!terminalSection) return [];
    
    return terminalSection[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.includes('Michaels-MacBook-Air'))
      .slice(0, 10); // Limit for performance
  }

  /**
   * Extract file changes from session content
   */
  private extractFileChanges(content: string): string[] {
    const changesSection = content.match(/### File Changes\s*([\s\S]*?)\s*(?:###|$)/);
    if (!changesSection) return [];
    
    return changesSection[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && (line.includes('Modified:') || line.includes('Created:') || line.includes('Deleted:')))
      .slice(0, 10);
  }

  /**
   * Extract git commits from session content
   */
  private extractCommits(content: string): string[] {
    const commitsSection = content.match(/### Git Commits\s*```\s*([\s\S]*?)\s*```/);
    if (!commitsSection) return [];
    
    return commitsSection[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .slice(0, 5);
  }

  /**
   * Clear memory cache (useful for testing)
   */
  clearCache(): void {
    this.memoryCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): Record<string, number> {
    const stats: Record<string, number> = {
      cacheSize: this.memoryCache.size,
      lastUpdate: this.lastCacheUpdate,
      agentInsights: 0,
      taskOutcomes: 0,
      codePatterns: 0
    };

    const agentInsights = this.memoryCache.get('agent-insights.json');
    if (Array.isArray(agentInsights)) {
      stats.agentInsights = agentInsights.length;
    }

    const taskOutcomes = this.memoryCache.get('task-outcomes.json');
    if (Array.isArray(taskOutcomes)) {
      stats.taskOutcomes = taskOutcomes.length;
    }

    const codePatterns = this.memoryCache.get('code-patterns.json');
    if (Array.isArray(codePatterns)) {
      stats.codePatterns = codePatterns.length;
    }

    return stats;
  }
}

// Export singleton instance
export const enhancedMemoryContext = new EnhancedMemoryContext();
export default enhancedMemoryContext;