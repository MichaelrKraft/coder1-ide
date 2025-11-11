/**
 * Memory Exporter Service
 * 
 * Exports data from all 5 Coder1 memory systems to JSON files for Claude Skills consumption.
 * Skills cannot make HTTP requests, so we pre-export data to files they can read.
 * 
 * Memory Systems Exported:
 * 1. Eternal Memory - Recent session summaries
 * 2. Semantic Search - Topic-based similar conversations  
 * 3. Contextual Database - Recent conversation history
 * 4. Session Memory - Current session state
 * 5. Memory Store - Learning statistics
 * 
 * Export Location: ~/.coder1/skills/memory-orchestrator/data/
 * Update Frequency: Every 30 seconds (configurable)
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { EternalMemorySearch } from './eternal-memory-search';
import { contextDatabase } from './context-database';
import { embeddingService } from '@/lib/embedding-service';
import { vectorSearchService } from '@/lib/vector-search';

interface ExportedEternalMemory {
  lastSession: {
    sessionId: string;
    summary: string;
    filesWorked: string[];
    keyDecisions: string[];
    nextSteps: string[];
    timestamp: string;
    age: string;
  } | null;
  recentSessions: Array<{
    sessionId: string;
    summary: string;
    timestamp: string;
  }>;
  exported: string;
}

interface ExportedSemanticSearch {
  topic: string;
  matches: Array<{
    id: string;
    userInput: string;
    claudeReply: string;
    similarity: number;
    timestamp: string;
  }>;
  exported: string;
}

interface ExportedContextual {
  conversations: Array<{
    id: string;
    userInput: string;
    claudeReply: string;
    timestamp: string;
    success: boolean;
    filesInvolved: string[];
  }>;
  count: number;
  exported: string;
}

interface ExportedSession {
  sessionId: string | null;
  filesOpen: string[];
  recentCommands: string[];
  currentDirectory: string;
  activeTerminal: boolean;
  exported: string;
}

interface ExportedStats {
  totalPatterns: number;
  successRate: number;
  timeSavedMinutes: number;
  sessionsConnected: number;
  aiIntelligenceLevel: number;
  learningEvents: number;
  exported: string;
}

export class MemoryExporter {
  private static instance: MemoryExporter;
  private exportDir: string;
  private isExporting: boolean = false;
  private lastExportTime: number = 0;
  private exportIntervalMs: number = 30000; // 30 seconds
  
  // Topics for semantic search export
  private readonly semanticTopics = [
    'terminal',
    'react', 
    'typescript',
    'errors',
    'general'
  ];

  constructor() {
    const homeDir = os.homedir();
    this.exportDir = path.join(homeDir, '.coder1', 'skills', 'memory-orchestrator', 'data');
  }

  public static getInstance(): MemoryExporter {
    if (!MemoryExporter.instance) {
      MemoryExporter.instance = new MemoryExporter();
    }
    return MemoryExporter.instance;
  }

  /**
   * Initialize exporter - create directory structure
   */
  public async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
      console.log(`✅ [MemoryExporter] Initialized: ${this.exportDir}`);
      
      // Do initial export
      await this.exportAll();
    } catch (error) {
      console.error('❌ [MemoryExporter] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Export all memory systems to JSON files
   */
  public async exportAll(): Promise<void> {
    // Prevent concurrent exports
    if (this.isExporting) {
      console.log('⏭️  [MemoryExporter] Export already in progress, skipping');
      return;
    }

    try {
      this.isExporting = true;
      const startTime = Date.now();

      // Ensure export directory exists
      await fs.mkdir(this.exportDir, { recursive: true });

      console.log('🔄 [MemoryExporter] Starting export of all memory systems...');

      // Export all systems in parallel for speed
      await Promise.allSettled([
        this.exportEternalMemory(),
        this.exportSemanticSearchResults(),
        this.exportContextualConversations(),
        this.exportSessionMemory(),
        this.exportMemoryStats()
      ]);

      const duration = Date.now() - startTime;
      this.lastExportTime = Date.now();

      console.log(`✅ [MemoryExporter] Export complete in ${duration}ms`);
    } catch (error) {
      console.error('❌ [MemoryExporter] Export failed:', error);
    } finally {
      this.isExporting = false;
    }
  }

  /**
   * Export eternal memory (recent sessions)
   */
  private async exportEternalMemory(): Promise<void> {
    try {
      const search = new EternalMemorySearch();
      
      // Get last 10 sessions
      const { results } = await search.search({
        text: 'session',
        limit: 10,
        minRelevance: 0.0
      });

      const exported: ExportedEternalMemory = {
        lastSession: null,
        recentSessions: [],
        exported: new Date().toISOString()
      };

      if (results.length > 0) {
        // Most recent session
        const latest = results[0];
        const ageMs = Date.now() - latest.timestamp;
        const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
        const ageDays = Math.floor(ageHours / 24);
        
        exported.lastSession = {
          sessionId: latest.sessionId,
          summary: latest.summary.substring(0, 500), // Limit length
          filesWorked: latest.filesWorked || [],
          keyDecisions: latest.keyDecisions || [],
          nextSteps: latest.nextSteps || [],
          timestamp: new Date(latest.timestamp).toISOString(),
          age: ageDays > 0 ? `${ageDays} days ago` : `${ageHours} hours ago`
        };

        // Recent sessions (up to 5)
        exported.recentSessions = results.slice(0, 5).map(r => ({
          sessionId: r.sessionId,
          summary: r.summary.substring(0, 200),
          timestamp: new Date(r.timestamp).toISOString()
        }));
      }

      search.close();

      await this.writeJsonFile('eternal.json', exported);
      console.log('  ✓ Eternal memory exported');
    } catch (error) {
      console.error('  ✗ Failed to export eternal memory:', error);
    }
  }

  /**
   * Export semantic search results by topic
   */
  private async exportSemanticSearchResults(): Promise<void> {
    // Check if semantic search is configured
    if (!embeddingService.isConfigured()) {
      console.log('  ⚠️  Semantic search not configured, skipping export');
      return;
    }

    try {
      // Ensure vector index is built
      await this.ensureVectorIndex();

      // Export for each topic
      for (const topic of this.semanticTopics) {
        try {
          await this.exportSemanticTopic(topic);
        } catch (error) {
          console.error(`  ✗ Failed to export semantic topic "${topic}":`, error);
        }
      }
    } catch (error) {
      console.error('  ✗ Failed to export semantic search:', error);
    }
  }

  /**
   * Export semantic search results for a specific topic
   */
  private async exportSemanticTopic(topic: string): Promise<void> {
    try {
      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(topic);
      
      if (!queryEmbedding) {
        console.warn(`  ⚠️  Failed to generate embedding for topic "${topic}"`);
        return;
      }

      // Search for top 5 matches
      const searchResults = await vectorSearchService.search(
        queryEmbedding,
        5,  // topK
        0.7 // threshold
      );

      // Get conversation details
      const conversations = await this.getConversationDetails(
        searchResults.map(r => r.id)
      );

      const exported: ExportedSemanticSearch = {
        topic,
        matches: searchResults.map(result => {
          const conv = conversations.find(c => c.id === result.id);
          return {
            id: result.id,
            userInput: conv?.userInput?.substring(0, 200) || '',
            claudeReply: conv?.claudeReply?.substring(0, 400) || '',
            similarity: result.similarity,
            timestamp: conv?.timestamp || ''
          };
        }),
        exported: new Date().toISOString()
      };

      await this.writeJsonFile(`semantic-${topic}.json`, exported);
      console.log(`  ✓ Semantic search exported for "${topic}" (${exported.matches.length} matches)`);
    } catch (error) {
      console.error(`  ✗ Failed to export semantic topic "${topic}":`, error);
    }
  }

  /**
   * Export contextual conversations (recent history)
   */
  private async exportContextualConversations(): Promise<void> {
    try {
      await contextDatabase.initialize();

      const db = (contextDatabase as any).db;
      if (!db) {
        console.warn('  ⚠️  Context database not initialized');
        return;
      }

      // Get last 10 conversations
      const conversations = db.prepare(`
        SELECT 
          id,
          user_input,
          claude_reply,
          timestamp,
          success,
          files_involved
        FROM claude_conversations 
        ORDER BY timestamp DESC 
        LIMIT 10
      `).all();

      const exported: ExportedContextual = {
        conversations: conversations.map((conv: any) => ({
          id: conv.id,
          userInput: conv.user_input?.substring(0, 200) || '',
          claudeReply: conv.claude_reply?.substring(0, 400) || '',
          timestamp: conv.timestamp,
          success: conv.success === 1,
          filesInvolved: conv.files_involved ? JSON.parse(conv.files_involved) : []
        })),
        count: conversations.length,
        exported: new Date().toISOString()
      };

      await this.writeJsonFile('contextual.json', exported);
      console.log(`  ✓ Contextual conversations exported (${exported.count} conversations)`);
    } catch (error) {
      console.error('  ✗ Failed to export contextual conversations:', error);
    }
  }

  /**
   * Export current session memory
   */
  private async exportSessionMemory(): Promise<void> {
    try {
      // This would ideally come from server-side session tracking
      // For now, export minimal session info
      const exported: ExportedSession = {
        sessionId: null, // TODO: Get from actual session manager
        filesOpen: [], // TODO: Get from file manager
        recentCommands: [], // TODO: Get from terminal history
        currentDirectory: process.cwd(),
        activeTerminal: true,
        exported: new Date().toISOString()
      };

      await this.writeJsonFile('session.json', exported);
      console.log('  ✓ Session memory exported');
    } catch (error) {
      console.error('  ✗ Failed to export session memory:', error);
    }
  }

  /**
   * Export memory store statistics
   */
  private async exportMemoryStats(): Promise<void> {
    try {
      // These stats would come from the actual memory store
      // For now, query from database
      await contextDatabase.initialize();

      const db = (contextDatabase as any).db;
      if (!db) {
        console.warn('  ⚠️  Context database not initialized for stats');
        return;
      }

      const conversationCount = db.prepare('SELECT COUNT(*) as count FROM claude_conversations').get();
      const patternCount = db.prepare('SELECT COUNT(*) as count FROM detected_patterns').get();

      const exported: ExportedStats = {
        totalPatterns: patternCount?.count || 0,
        successRate: 0.85, // TODO: Calculate from actual data
        timeSavedMinutes: 0, // TODO: Calculate from actual data
        sessionsConnected: conversationCount?.count || 0,
        aiIntelligenceLevel: 1.0, // TODO: Get from actual calculation
        learningEvents: patternCount?.count || 0,
        exported: new Date().toISOString()
      };

      await this.writeJsonFile('stats.json', exported);
      console.log('  ✓ Memory stats exported');
    } catch (error) {
      console.error('  ✗ Failed to export memory stats:', error);
    }
  }

  /**
   * Ensure vector index is built for semantic search
   */
  private async ensureVectorIndex(): Promise<void> {
    const stats = vectorSearchService.getIndexStats();

    if (stats.documentCount === 0) {
      await contextDatabase.initialize();

      const db = (contextDatabase as any).db;
      if (!db) {
        throw new Error('Database not initialized');
      }

      const conversations = db.prepare(`
        SELECT id, embedding 
        FROM claude_conversations 
        WHERE embedding IS NOT NULL 
        ORDER BY timestamp DESC 
        LIMIT 1000
      `).all();

      const documents: Array<{ id: string; embedding: number[] }> = [];

      for (const conv of conversations) {
        try {
          const embedding = JSON.parse(conv.embedding);
          if (Array.isArray(embedding) && embedding.length > 0) {
            documents.push({ id: conv.id, embedding });
          }
        } catch (e) {
          // Skip invalid embeddings
        }
      }

      await vectorSearchService.addDocuments(documents);
    }
  }

  /**
   * Get conversation details by IDs
   */
  private async getConversationDetails(ids: string[]): Promise<any[]> {
    if (ids.length === 0) {
      return [];
    }

    await contextDatabase.initialize();

    const db = (contextDatabase as any).db;
    if (!db) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(',');
    const conversations = db.prepare(`
      SELECT 
        id,
        user_input,
        claude_reply,
        timestamp
      FROM claude_conversations 
      WHERE id IN (${placeholders})
    `).all(...ids);

    return conversations.map((conv: any) => ({
      id: conv.id,
      userInput: conv.user_input,
      claudeReply: conv.claude_reply,
      timestamp: conv.timestamp
    }));
  }

  /**
   * Write JSON file safely
   */
  private async writeJsonFile(filename: string, data: any): Promise<void> {
    const filepath = path.join(this.exportDir, filename);
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filepath, jsonString, 'utf-8');
  }

  /**
   * Get export statistics
   */
  public getStats(): { lastExportTime: number; exportDir: string; isExporting: boolean } {
    return {
      lastExportTime: this.lastExportTime,
      exportDir: this.exportDir,
      isExporting: this.isExporting
    };
  }
}

// Export singleton instance
export const memoryExporter = MemoryExporter.getInstance();
export default memoryExporter;
