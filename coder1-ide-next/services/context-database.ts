/**
 * Context Database Service
 * Manages SQLite database for automatic session memory
 */

import Database from 'better-sqlite3';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';

export interface ContextFolder {
  id: string;
  project_path: string;
  name: string;
  auto_created: boolean;
  created_at: Date;
  updated_at: Date;
  total_conversations: number;
  total_patterns: number;
}

export interface ContextSession {
  id: string;
  folder_id: string;
  start_time: Date;
  end_time?: Date;
  summary?: string;
  embedding?: string; // JSON vector
  total_conversations: number;
  files_modified?: string; // JSON array
  terminal_commands?: string; // JSON array
  success_rating?: number;
}

export interface ClaudeConversation {
  id: string;
  session_id: string;
  user_input: string;
  claude_reply: string;
  timestamp: Date;
  embedding?: string; // JSON vector
  success?: boolean;
  error_type?: string;
  context_used?: string; // JSON
  files_involved?: string; // JSON array
  tokens_used: number;
}

export interface DetectedPattern {
  id: string;
  session_id: string;
  pattern_type: string;
  description: string;
  frequency: number;
  confidence: number;
  first_seen: Date;
  last_seen: Date;
  metadata?: string; // JSON
}

export interface LearnedInsight {
  id: string;
  folder_id: string;
  insight_type: string;
  content: string;
  confidence: number;
  usage_count: number;
  created_at: Date;
  last_used: Date;
  source_sessions?: string; // JSON array
}

class ContextDatabase {
  private db: Database.Database | null = null;
  private dbPath: string;
  private schemaPath: string;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'db', 'context-memory.db');
    this.schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  }

  /**
   * Initialize database and create tables
   */
  async initialize(): Promise<void> {
    try {
      // Ensure db directory exists
      const dbDir = path.dirname(this.dbPath);
      await fs.mkdir(dbDir, { recursive: true });

      // Open database connection
      this.db = new Database(this.dbPath);
      
      // Enable WAL mode for better performance
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('temp_store = MEMORY');
      
      // Run schema creation
      const schema = await fs.readFile(this.schemaPath, 'utf-8');
      this.db.exec(schema);
      
      logger.debug('✅ Context database initialized:', this.dbPath);
    } catch (error) {
      logger.error('❌ Failed to initialize context database:', error);
      throw error;
    }
  }

  /**
   * Get or create context folder for project path
   */
  async getOrCreateFolder(projectPath: string, name?: string): Promise<ContextFolder> {
    if (!this.db) await this.initialize();
    
    try {
      // Try to find existing folder
      const existing = this.db!.prepare(
        'SELECT * FROM context_folders WHERE project_path = ?'
      ).get(projectPath) as ContextFolder | undefined;
      
      if (existing) {
        return existing;
      }
      
      // Create new folder
      const id = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const folderName = name || path.basename(projectPath);
      
      this.db!.prepare(`
        INSERT INTO context_folders (id, project_path, name, auto_created)
        VALUES (?, ?, ?, ?)
      `).run(id, projectPath, folderName, true);
      
      logger.debug(`📁 Created context folder: ${folderName} (${id})`);
      
      return this.db!.prepare(
        'SELECT * FROM context_folders WHERE id = ?'
      ).get(id) as ContextFolder;
    } catch (error) {
      logger.error('❌ Failed to get/create context folder:', error);
      throw error;
    }
  }

  /**
   * Create new session
   */
  async createSession(folderId: string): Promise<ContextSession> {
    if (!this.db) await this.initialize();
    
    try {
      const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.db!.prepare(`
        INSERT INTO context_sessions (id, folder_id)
        VALUES (?, ?)
      `).run(id, folderId);
      
      logger.debug(`🎯 Created context session: ${id}`);
      
      return this.db!.prepare(
        'SELECT * FROM context_sessions WHERE id = ?'
      ).get(id) as ContextSession;
    } catch (error) {
      logger.error('❌ Failed to create context session:', error);
      throw error;
    }
  }

  /**
   * End session with summary
   */
  async endSession(sessionId: string, summary?: string, successRating?: number): Promise<void> {
    if (!this.db) await this.initialize();
    
    try {
      const conversationCount = this.db!.prepare(
        'SELECT COUNT(*) as count FROM claude_conversations WHERE session_id = ?'
      ).get(sessionId) as { count: number };
      
      this.db!.prepare(`
        UPDATE context_sessions 
        SET end_time = CURRENT_TIMESTAMP, 
            summary = ?, 
            success_rating = ?,
            total_conversations = ?
        WHERE id = ?
      `).run(summary, successRating, conversationCount.count, sessionId);
      
      logger.debug(`🏁 Ended context session: ${sessionId}`);
    } catch (error) {
      logger.error('❌ Failed to end context session:', error);
      throw error;
    }
  }

  /**
   * Store Claude conversation
   */
  async storeConversation(conversation: Omit<ClaudeConversation, 'id' | 'timestamp'>): Promise<ClaudeConversation> {
    if (!this.db) await this.initialize();
    
    try {
      const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.db!.prepare(`
        INSERT INTO claude_conversations 
        (id, session_id, user_input, claude_reply, embedding, success, error_type, context_used, files_involved, tokens_used)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        conversation.session_id,
        conversation.user_input,
        conversation.claude_reply,
        conversation.embedding,
        conversation.success,
        conversation.error_type,
        conversation.context_used,
        conversation.files_involved,
        conversation.tokens_used
      );
      
      logger.debug(`💬 Stored conversation: ${id}`);
      
      return this.db!.prepare(
        'SELECT * FROM claude_conversations WHERE id = ?'
      ).get(id) as ClaudeConversation;
    } catch (error) {
      logger.error('❌ Failed to store conversation:', error);
      throw error;
    }
  }

  /**
   * Get recent conversations for context
   */
  async getRecentConversations(folderId: string, limit: number = 10): Promise<ClaudeConversation[]> {
    if (!this.db) await this.initialize();
    
    try {
      const conversations = this.db!.prepare(`
        SELECT cc.* FROM claude_conversations cc
        JOIN context_sessions cs ON cc.session_id = cs.id
        WHERE cs.folder_id = ?
        ORDER BY cc.timestamp DESC
        LIMIT ?
      `).all(folderId, limit) as ClaudeConversation[];
      
      return conversations;
    } catch (error) {
      logger.error('❌ Failed to get recent conversations:', error);
      return [];
    }
  }

  /**
   * Store detected pattern
   */
  async storePattern(pattern: Omit<DetectedPattern, 'id' | 'first_seen' | 'last_seen'>): Promise<DetectedPattern> {
    if (!this.db) await this.initialize();
    
    try {
      // Check if similar pattern exists
      const existing = this.db!.prepare(`
        SELECT * FROM detected_patterns 
        WHERE session_id = ? AND pattern_type = ? AND description = ?
      `).get(pattern.session_id, pattern.pattern_type, pattern.description) as DetectedPattern | undefined;
      
      if (existing) {
        // Update frequency and last_seen
        this.db!.prepare(`
          UPDATE detected_patterns 
          SET frequency = frequency + ?, last_seen = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(pattern.frequency, existing.id);
        
        return this.db!.prepare(
          'SELECT * FROM detected_patterns WHERE id = ?'
        ).get(existing.id) as DetectedPattern;
      }
      
      // Create new pattern
      const id = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.db!.prepare(`
        INSERT INTO detected_patterns 
        (id, session_id, pattern_type, description, frequency, confidence, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        pattern.session_id,
        pattern.pattern_type,
        pattern.description,
        pattern.frequency,
        pattern.confidence,
        pattern.metadata
      );
      
      logger.debug(`🔍 Stored pattern: ${pattern.pattern_type} - ${pattern.description}`);
      
      return this.db!.prepare(
        'SELECT * FROM detected_patterns WHERE id = ?'
      ).get(id) as DetectedPattern;
    } catch (error) {
      logger.error('❌ Failed to store pattern:', error);
      throw error;
    }
  }

  /**
   * Get context statistics
   */
  async getStats(folderId?: string): Promise<{
    totalConversations: number;
    totalSessions: number;
    totalPatterns: number;
    totalInsights: number;
    successRate: number;
  }> {
    if (!this.db) await this.initialize();
    
    try {
      const folderFilter = folderId ? 'WHERE cs.folder_id = ?' : '';
      const params = folderId ? [folderId] : [];
      
      const result = this.db!.prepare(`
        SELECT 
          COUNT(DISTINCT cc.id) as total_conversations,
          COUNT(DISTINCT cs.id) as total_sessions,
          COUNT(DISTINCT dp.id) as total_patterns,
          COUNT(DISTINCT li.id) as total_insights,
          COALESCE(AVG(CASE WHEN cc.success = 1 THEN 1.0 ELSE 0.0 END), 0) as success_rate
        FROM context_sessions cs
        LEFT JOIN claude_conversations cc ON cs.id = cc.session_id
        LEFT JOIN detected_patterns dp ON cs.id = dp.session_id
        LEFT JOIN learned_insights li ON cs.folder_id = li.folder_id
        ${folderFilter}
      `).get(...params) as any;
      
      return {
        totalConversations: result.total_conversations || 0,
        totalSessions: result.total_sessions || 0,
        totalPatterns: result.total_patterns || 0,
        totalInsights: result.total_insights || 0,
        successRate: result.success_rate || 0
      };
    } catch (error) {
      logger.error('❌ Failed to get context stats:', error);
      return {
        totalConversations: 0,
        totalSessions: 0,
        totalPatterns: 0,
        totalInsights: 0,
        successRate: 0
      };
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.debug('📴 Context database closed');
    }
  }
}

// Export singleton instance
export const contextDatabase = new ContextDatabase();
export default contextDatabase;