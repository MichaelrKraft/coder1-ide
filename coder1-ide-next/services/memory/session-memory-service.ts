/**
 * Session Memory Service
 * Provides persistent memory across AI sessions with smart context management
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';

export interface MemoryInteraction {
  timestamp: Date;
  platform: string;
  input: string;
  output: string;
  tokens: number;
  type: 'command' | 'response' | 'error';
}

export interface SessionMemory {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  platform: string;
  interactions: MemoryInteraction[];
  summary?: string;
  totalTokens: number;
  metadata?: Record<string, any>;
}

export interface MemoryContext {
  recentSummary: string;
  relevantContext: string[];
  totalTokens: number;
  sessionCount: number;
}

interface MemoryServiceConfig {
  maxContextTokens: number;
  maxStoredSessions: number;
  compressionRatio: number;
  autoSaveInterval: number;
}

class SessionMemoryService extends EventEmitter {
  private currentSession: SessionMemory | null = null;
  private recentSessions: SessionMemory[] = [];
  private config: MemoryServiceConfig;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private memoryPath = '/data/memory/sessions';

  constructor(config?: Partial<MemoryServiceConfig>) {
    super();
    
    this.config = {
      maxContextTokens: 1000,
      maxStoredSessions: 100,
      compressionRatio: 0.1, // Compress to 10% of original
      autoSaveInterval: 30000, // 30 seconds
      ...config
    };

    this.initialize();
  }

  private async initialize() {
    try {
      // Load recent sessions on startup
      await this.loadRecentSessions();
      
      // Start auto-save timer
      this.startAutoSave();
      
      logger.info('🧠 Session Memory Service initialized');
      logger.info(`📊 Loaded ${this.recentSessions.length} recent sessions`);
    } catch (error) {
      logger.error('❌ Failed to initialize memory service:', error);
    }
  }

  /**
   * Start a new memory session
   */
  async startSession(sessionId: string, platform: string = 'Claude Code'): Promise<void> {
    // Save current session if exists
    if (this.currentSession) {
      await this.saveSession(this.currentSession);
    }

    this.currentSession = {
      sessionId,
      startTime: new Date(),
      platform,
      interactions: [],
      totalTokens: 0
    };

    this.emit('session-started', { sessionId, platform });
    logger.debug(`🧠 Started memory session: ${sessionId}`);
  }

  /**
   * Add an interaction to current session
   */
  async addInteraction(interaction: Omit<MemoryInteraction, 'timestamp'>): Promise<void> {
    if (!this.currentSession) {
      logger.warn('⚠️ No active session for memory interaction');
      return;
    }

    const fullInteraction: MemoryInteraction = {
      ...interaction,
      timestamp: new Date(),
      tokens: this.estimateTokens(interaction.input + interaction.output)
    };

    this.currentSession.interactions.push(fullInteraction);
    this.currentSession.totalTokens += fullInteraction.tokens;

    this.emit('interaction-added', fullInteraction);
    logger.debug(`💾 Added interaction: ${fullInteraction.tokens} tokens`);
  }

  /**
   * Get smart context for injection
   */
  async getSmartContext(currentInput?: string): Promise<MemoryContext> {
    const context: MemoryContext = {
      recentSummary: '',
      relevantContext: [],
      totalTokens: 0,
      sessionCount: 0
    };

    // Add current session summary if exists
    if (this.currentSession && this.currentSession.interactions.length > 0) {
      const currentSummary = this.summarizeSession(this.currentSession);
      context.recentSummary = currentSummary;
      context.totalTokens += this.estimateTokens(currentSummary);
    }

    // Add relevant recent sessions
    const relevantSessions = await this.findRelevantSessions(currentInput);
    for (const session of relevantSessions) {
      if (context.totalTokens >= this.config.maxContextTokens) break;
      
      const summary = this.summarizeSession(session);
      const tokens = this.estimateTokens(summary);
      
      if (context.totalTokens + tokens <= this.config.maxContextTokens) {
        context.relevantContext.push(summary);
        context.totalTokens += tokens;
        context.sessionCount++;
      }
    }

    return context;
  }

  /**
   * Format context for injection into prompts
   */
  formatContextForInjection(context: MemoryContext): string {
    if (context.totalTokens === 0) return '';

    const lines: string[] = [
      `[SESSION MEMORY - ${context.totalTokens} tokens]`
    ];

    if (context.recentSummary) {
      lines.push('Current Session:');
      lines.push(context.recentSummary);
    }

    if (context.relevantContext.length > 0) {
      lines.push(`Previous Sessions (${context.sessionCount}):`);
      context.relevantContext.forEach((ctx, i) => {
        lines.push(`- Session ${i + 1}: ${ctx}`);
      });
    }

    lines.push('[Say "load memory N" for session details]');

    return lines.join('\n');
  }

  /**
   * Save current session to storage
   */
  private async saveSession(session: SessionMemory): Promise<void> {
    try {
      // Generate summary if not exists
      if (!session.summary) {
        session.summary = this.summarizeSession(session);
      }

      // Save to file system via API
      const response = await fetch('/api/memory/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });

      if (!response.ok) {
        throw new Error('Failed to save session');
      }

      logger.debug(`💾 Saved session: ${session.sessionId}`);
      this.emit('session-saved', session);
    } catch (error) {
      logger.error('❌ Failed to save session:', error);
    }
  }

  /**
   * Load recent sessions from storage
   */
  private async loadRecentSessions(): Promise<void> {
    try {
      const response = await fetch('/api/memory/recent?limit=10');
      
      if (response.ok) {
        const sessions = await response.json();
        this.recentSessions = sessions;
      }
    } catch (error) {
      logger.warn('⚠️ Failed to load recent sessions:', error);
      this.recentSessions = [];
    }
  }

  /**
   * Find sessions relevant to current input
   */
  private async findRelevantSessions(input?: string): Promise<SessionMemory[]> {
    if (!input) {
      // Return most recent sessions
      return this.recentSessions.slice(0, 3);
    }

    // Simple keyword matching for MVP
    const keywords = this.extractKeywords(input);
    const relevant = this.recentSessions.filter(session => {
      const sessionText = JSON.stringify(session.interactions).toLowerCase();
      return keywords.some(keyword => sessionText.includes(keyword.toLowerCase()));
    });

    return relevant.slice(0, 3);
  }

  /**
   * Summarize a session for context injection
   */
  private summarizeSession(session: SessionMemory): string {
    if (session.summary) return session.summary;

    const interactions = session.interactions.slice(-5); // Last 5 interactions
    const commands = interactions
      .filter(i => i.type === 'command')
      .map(i => i.input.slice(0, 50))
      .join(', ');

    const summary = `${session.platform} session (${session.interactions.length} interactions): ${commands}`;
    return summary.slice(0, 200); // Max 200 chars
  }

  /**
   * Extract keywords from input for relevance matching
   */
  private extractKeywords(input: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but'];
    const words = input.toLowerCase().split(/\W+/);
    return words.filter(word => 
      word.length > 3 && !stopWords.includes(word)
    );
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(() => {
      if (this.currentSession && this.currentSession.interactions.length > 0) {
        this.saveSession(this.currentSession);
      }
    }, this.config.autoSaveInterval);
  }

  /**
   * Stop auto-save timer
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * End current session
   */
  async endSession(): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.endTime = new Date();
    await this.saveSession(this.currentSession);
    
    // Add to recent sessions
    this.recentSessions.unshift(this.currentSession);
    if (this.recentSessions.length > this.config.maxStoredSessions) {
      this.recentSessions = this.recentSessions.slice(0, this.config.maxStoredSessions);
    }

    this.emit('session-ended', this.currentSession);
    logger.debug(`🧠 Ended session: ${this.currentSession.sessionId}`);
    
    this.currentSession = null;
  }

  /**
   * Get memory statistics
   */
  getStats(): Record<string, any> {
    return {
      hasActiveSession: !!this.currentSession,
      currentSessionInteractions: this.currentSession?.interactions.length || 0,
      currentSessionTokens: this.currentSession?.totalTokens || 0,
      recentSessionsCount: this.recentSessions.length,
      totalStoredTokens: this.recentSessions.reduce((sum, s) => sum + s.totalTokens, 0)
    };
  }

  /**
   * Clean up service
   */
  async cleanup(): Promise<void> {
    this.stopAutoSave();
    
    if (this.currentSession) {
      await this.endSession();
    }

    this.removeAllListeners();
    logger.info('🧠 Memory service cleaned up');
  }
}

// Export singleton instance
export const sessionMemoryService = new SessionMemoryService();
export default sessionMemoryService;