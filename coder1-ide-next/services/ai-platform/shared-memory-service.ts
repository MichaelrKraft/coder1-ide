/**
 * Shared Memory Service Layer
 * Provides unified memory management across all AI platforms
 */

// import { contextDatabase } from '@/services/context-database'; // Server-only
import { universalAIWrapper } from './universal-ai-wrapper';
import { logger } from '@/lib/logger';
import { EventEmitter } from 'events';

export interface MemoryEntry {
  id: string;
  platform: string;
  sessionId: string;
  timestamp: Date;
  input: string;
  output: string;
  context?: string;
  files?: string[];
  tokensUsed?: number;
  success: boolean;
  tags?: string[];
  embedding?: number[]; // Vector for semantic search
}

export interface MemoryQuery {
  platforms?: string[]; // Filter by platforms
  sessionIds?: string[]; // Filter by sessions
  tags?: string[]; // Filter by tags
  dateRange?: {
    start: Date;
    end: Date;
  };
  similarTo?: string; // Semantic search query
  limit?: number;
  relevanceThreshold?: number;
}

export interface MemoryStats {
  totalEntries: number;
  platformBreakdown: Record<string, number>;
  totalTokens: number;
  avgTokensPerEntry: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  topTags: Array<{ tag: string; count: number }>;
}

export interface PlatformMemorySync {
  sourcePlatform: string;
  targetPlatform: string;
  entries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

class SharedMemoryService extends EventEmitter {
  private readonly MAX_MEMORY_ENTRIES = 10000;
  private readonly MEMORY_RETENTION_DAYS = 30;
  private readonly RELEVANCE_THRESHOLD = 0.7;
  private memoryCache: Map<string, MemoryEntry> = new Map();
  private platformMemoryIndex: Map<string, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private syncQueue: PlatformMemorySync[] = [];

  constructor() {
    super();
    this.initializeService();
  }

  /**
   * Initialize the shared memory service
   */
  private async initializeService(): Promise<void> {
    try {
      await contextDatabase.initialize();
      await this.loadRecentMemory();
      this.startMemoryMaintenance();
      logger.info('🧠 Shared Memory Service initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Shared Memory Service:', error);
    }
  }

  /**
   * Store a memory entry from any AI platform
   */
  async store(entry: Omit<MemoryEntry, 'id'>): Promise<string> {
    const id = this.generateMemoryId();
    const memoryEntry: MemoryEntry = {
      ...entry,
      id,
      timestamp: new Date()
    };

    try {
      // Store in database through context system
      const projectPath = '/Users/michaelkraft/autonomous_vibe_interface';
      const folder = await contextDatabase.getOrCreateFolder(projectPath);
      
      // Get or create session
      const sessionId = entry.sessionId || 'shared';
      const session = await contextDatabase.getOrCreateSession(folder.id, sessionId);

      // Add conversation to database
      await contextDatabase.addConversation({
        folder_id: folder.id,
        session_id: session.id,
        user_input: entry.input,
        claude_reply: entry.output, // Works for any AI platform
        model: entry.platform,
        success: entry.success,
        tokens_used: entry.tokensUsed || 0,
        files_involved: entry.files,
        metadata: {
          platform: entry.platform,
          context: entry.context,
          tags: entry.tags
        }
      });

      // Update memory cache
      this.memoryCache.set(id, memoryEntry);
      
      // Update indexes
      this.updateIndexes(memoryEntry);

      // Emit event for real-time updates
      this.emit('memory-stored', memoryEntry);

      logger.debug(`💾 Stored memory entry ${id} from ${entry.platform}`);
      
      return id;
    } catch (error) {
      logger.error('❌ Failed to store memory entry:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant memories based on query
   */
  async retrieve(query: MemoryQuery): Promise<MemoryEntry[]> {
    try {
      let results: MemoryEntry[] = [];

      // If semantic search requested
      if (query.similarTo) {
        results = await this.semanticSearch(query.similarTo, query.limit || 10);
      } else {
        // Filter from cache first (faster)
        results = Array.from(this.memoryCache.values());
      }

      // Apply filters
      if (query.platforms && query.platforms.length > 0) {
        results = results.filter(m => query.platforms!.includes(m.platform));
      }

      if (query.sessionIds && query.sessionIds.length > 0) {
        results = results.filter(m => query.sessionIds!.includes(m.sessionId));
      }

      if (query.tags && query.tags.length > 0) {
        results = results.filter(m => 
          m.tags?.some(tag => query.tags!.includes(tag))
        );
      }

      if (query.dateRange) {
        results = results.filter(m => {
          const timestamp = new Date(m.timestamp);
          return timestamp >= query.dateRange!.start && 
                 timestamp <= query.dateRange!.end;
        });
      }

      // Apply relevance threshold for semantic search
      if (query.similarTo && query.relevanceThreshold) {
        // This would require actual similarity scores from semantic search
        // For now, we'll use the top N results
      }

      // Apply limit
      if (query.limit) {
        results = results.slice(0, query.limit);
      }

      // Sort by timestamp (most recent first)
      results.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      logger.debug(`🔍 Retrieved ${results.length} memory entries`);
      
      return results;
    } catch (error) {
      logger.error('❌ Failed to retrieve memories:', error);
      return [];
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const entries = Array.from(this.memoryCache.values());
    
    // Platform breakdown
    const platformBreakdown: Record<string, number> = {};
    entries.forEach(entry => {
      platformBreakdown[entry.platform] = (platformBreakdown[entry.platform] || 0) + 1;
    });

    // Token statistics
    const totalTokens = entries.reduce((sum, e) => sum + (e.tokensUsed || 0), 0);
    const avgTokensPerEntry = entries.length > 0 ? totalTokens / entries.length : 0;

    // Date range
    const dates = entries.map(e => new Date(e.timestamp));
    const earliest = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    const latest = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

    // Top tags
    const tagCounts: Record<string, number> = {};
    entries.forEach(entry => {
      entry.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEntries: entries.length,
      platformBreakdown,
      totalTokens,
      avgTokensPerEntry,
      dateRange: { earliest, latest },
      topTags
    };
  }

  /**
   * Sync memory between platforms
   */
  async syncPlatforms(sourcePlatform: string, targetPlatform: string): Promise<PlatformMemorySync> {
    const sync: PlatformMemorySync = {
      sourcePlatform,
      targetPlatform,
      entries: 0,
      status: 'pending',
      progress: 0
    };

    this.syncQueue.push(sync);
    this.emit('sync-started', sync);

    try {
      sync.status = 'syncing';
      
      // Get entries from source platform
      const sourceEntries = await this.retrieve({
        platforms: [sourcePlatform],
        limit: 100 // Sync last 100 entries
      });

      sync.entries = sourceEntries.length;

      // Process each entry for target platform
      for (let i = 0; i < sourceEntries.length; i++) {
        const entry = sourceEntries[i];
        
        // Transform for target platform (platform-specific adjustments)
        const transformedEntry = await this.transformForPlatform(entry, targetPlatform);
        
        // Store as new entry for target platform
        await this.store({
          ...transformedEntry,
          platform: targetPlatform,
          tags: [...(transformedEntry.tags || []), 'synced', `from-${sourcePlatform}`]
        });

        sync.progress = ((i + 1) / sourceEntries.length) * 100;
        this.emit('sync-progress', sync);
      }

      sync.status = 'completed';
      sync.progress = 100;
      
      this.emit('sync-completed', sync);
      logger.info(`✅ Synced ${sync.entries} entries from ${sourcePlatform} to ${targetPlatform}`);
      
      return sync;
    } catch (error) {
      sync.status = 'failed';
      sync.error = error instanceof Error ? error.message : String(error);
      
      this.emit('sync-failed', sync);
      logger.error(`❌ Sync failed from ${sourcePlatform} to ${targetPlatform}:`, error);
      
      return sync;
    }
  }

  /**
   * Clear memory for a specific platform or session
   */
  async clear(options?: { platform?: string; sessionId?: string }): Promise<number> {
    let cleared = 0;

    if (options?.platform) {
      const platformEntries = this.platformMemoryIndex.get(options.platform);
      if (platformEntries) {
        platformEntries.forEach(id => {
          this.memoryCache.delete(id);
          cleared++;
        });
        this.platformMemoryIndex.delete(options.platform);
      }
    } else if (options?.sessionId) {
      const toDelete: string[] = [];
      this.memoryCache.forEach((entry, id) => {
        if (entry.sessionId === options.sessionId) {
          toDelete.push(id);
        }
      });
      toDelete.forEach(id => {
        this.memoryCache.delete(id);
        cleared++;
      });
    } else {
      // Clear all
      cleared = this.memoryCache.size;
      this.memoryCache.clear();
      this.platformMemoryIndex.clear();
      this.tagIndex.clear();
    }

    logger.info(`🗑️ Cleared ${cleared} memory entries`);
    this.emit('memory-cleared', { cleared, options });
    
    return cleared;
  }

  /**
   * Export memory for backup or analysis
   */
  async export(format: 'json' | 'markdown' = 'json'): Promise<string> {
    const entries = Array.from(this.memoryCache.values());
    
    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    } else {
      // Markdown format
      let markdown = '# Shared AI Memory Export\n\n';
      markdown += `Generated: ${new Date().toISOString()}\n\n`;
      markdown += `Total Entries: ${entries.length}\n\n`;
      
      // Group by platform
      const byPlatform = new Map<string, MemoryEntry[]>();
      entries.forEach(entry => {
        const platform = entry.platform;
        if (!byPlatform.has(platform)) {
          byPlatform.set(platform, []);
        }
        byPlatform.get(platform)!.push(entry);
      });

      byPlatform.forEach((platformEntries, platform) => {
        markdown += `## ${platform} (${platformEntries.length} entries)\n\n`;
        
        platformEntries.forEach(entry => {
          markdown += `### ${new Date(entry.timestamp).toLocaleString()}\n`;
          markdown += `**Input**: ${entry.input}\n\n`;
          markdown += `**Output**: ${entry.output.substring(0, 500)}${entry.output.length > 500 ? '...' : ''}\n\n`;
          if (entry.tags && entry.tags.length > 0) {
            markdown += `**Tags**: ${entry.tags.join(', ')}\n\n`;
          }
          markdown += '---\n\n';
        });
      });

      return markdown;
    }
  }

  /**
   * Import memory from backup
   */
  async import(data: string, format: 'json' | 'markdown' = 'json'): Promise<number> {
    try {
      if (format !== 'json') {
        throw new Error('Only JSON import is currently supported');
      }

      const entries = JSON.parse(data) as MemoryEntry[];
      let imported = 0;

      for (const entry of entries) {
        await this.store(entry);
        imported++;
      }

      logger.info(`📥 Imported ${imported} memory entries`);
      this.emit('memory-imported', { count: imported });
      
      return imported;
    } catch (error) {
      logger.error('❌ Failed to import memory:', error);
      throw error;
    }
  }

  // Private helper methods

  private async loadRecentMemory(): Promise<void> {
    try {
      const projectPath = '/Users/michaelkraft/autonomous_vibe_interface';
      const folder = await contextDatabase.getOrCreateFolder(projectPath);
      
      // Load recent conversations (last 7 days)
      const conversations = await contextDatabase.getRecentConversations(folder.id, 100);
      
      conversations.forEach(conv => {
        const memoryEntry: MemoryEntry = {
          id: this.generateMemoryId(),
          platform: conv.model || 'unknown',
          sessionId: conv.session_id,
          timestamp: new Date(conv.timestamp),
          input: conv.user_input,
          output: conv.claude_reply,
          tokensUsed: conv.tokens_used,
          success: Boolean(conv.success),
          files: conv.files_involved ? JSON.parse(conv.files_involved) : undefined
        };
        
        this.memoryCache.set(memoryEntry.id, memoryEntry);
        this.updateIndexes(memoryEntry);
      });

      logger.info(`📚 Loaded ${conversations.length} recent memory entries`);
    } catch (error) {
      logger.warn('⚠️ Failed to load recent memory:', error);
    }
  }

  private updateIndexes(entry: MemoryEntry): void {
    // Update platform index
    if (!this.platformMemoryIndex.has(entry.platform)) {
      this.platformMemoryIndex.set(entry.platform, new Set());
    }
    this.platformMemoryIndex.get(entry.platform)!.add(entry.id);

    // Update tag index
    entry.tags?.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(entry.id);
    });
  }

  private async semanticSearch(query: string, limit: number): Promise<MemoryEntry[]> {
    // Simplified semantic search - in production, use embeddings
    const queryLower = query.toLowerCase();
    const scored: Array<{ entry: MemoryEntry; score: number }> = [];

    this.memoryCache.forEach(entry => {
      let score = 0;
      
      // Check input similarity
      if (entry.input.toLowerCase().includes(queryLower)) {
        score += 2;
      }
      
      // Check output similarity
      if (entry.output.toLowerCase().includes(queryLower)) {
        score += 1;
      }
      
      // Check tag matches
      entry.tags?.forEach(tag => {
        if (tag.toLowerCase().includes(queryLower)) {
          score += 1.5;
        }
      });

      if (score > 0) {
        scored.push({ entry, score });
      }
    });

    // Sort by score and return top results
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.entry);
  }

  private async transformForPlatform(entry: MemoryEntry, targetPlatform: string): Promise<MemoryEntry> {
    // Platform-specific transformations
    const transformed = { ...entry };

    // Example transformations
    if (targetPlatform === 'OpenAI CLI' && entry.platform === 'Claude Code') {
      // Adjust prompt format for OpenAI
      transformed.input = `System: You are a helpful assistant.\nUser: ${entry.input}`;
    } else if (targetPlatform === 'Aider' && entry.platform !== 'Aider') {
      // Aider prefers file context
      if (entry.files && entry.files.length > 0) {
        transformed.input = `/add ${entry.files.join(' ')}\n${entry.input}`;
      }
    }

    return transformed;
  }

  private startMemoryMaintenance(): void {
    // Run maintenance every hour
    setInterval(() => {
      this.performMaintenance();
    }, 60 * 60 * 1000);
  }

  private async performMaintenance(): Promise<void> {
    try {
      const now = new Date();
      const retentionCutoff = new Date(now.getTime() - this.MEMORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      
      let removed = 0;
      const toRemove: string[] = [];

      // Remove old entries
      this.memoryCache.forEach((entry, id) => {
        if (new Date(entry.timestamp) < retentionCutoff) {
          toRemove.push(id);
        }
      });

      toRemove.forEach(id => {
        this.memoryCache.delete(id);
        removed++;
      });

      // Enforce max entries limit
      if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
        const entries = Array.from(this.memoryCache.entries())
          .sort((a, b) => new Date(b[1].timestamp).getTime() - new Date(a[1].timestamp).getTime());
        
        const toKeep = entries.slice(0, this.MAX_MEMORY_ENTRIES);
        this.memoryCache = new Map(toKeep);
        removed += entries.length - toKeep.length;
      }

      if (removed > 0) {
        logger.info(`🧹 Memory maintenance: removed ${removed} old entries`);
        this.emit('maintenance-completed', { removed });
      }
    } catch (error) {
      logger.error('❌ Memory maintenance failed:', error);
    }
  }

  private generateMemoryId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export singleton instance
export const sharedMemoryService = new SharedMemoryService();

export default sharedMemoryService;