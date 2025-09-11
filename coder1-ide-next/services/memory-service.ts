/**
 * Memory Persistence Service
 * Manages conversation history and context using SQLite
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  lastOpened: Date;
}

export interface Conversation {
  id: string;
  projectId: string;
  contextSnapshot: string;
  timestamp: Date;
}

export interface Interaction {
  id: string;
  conversationId: string;
  type: 'user' | 'claude' | 'terminal' | 'file';
  content: string;
  metadata?: any;
  timestamp: Date;
}

export interface MemorySearchResult {
  conversationId: string;
  projectName: string;
  content: string;
  timestamp: Date;
  relevanceScore: number;
}

class MemoryService {
  private db: Database.Database | null = null;
  private dbPath: string;
  private initialized: boolean = false;

  constructor(dbPath?: string) {
    // Default to ~/.coder1/memory.db
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    this.dbPath = dbPath || path.join(homeDir, '.coder1', 'memory.db');
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure directory exists
      const dbDir = path.dirname(this.dbPath);
      await fs.mkdir(dbDir, { recursive: true });

      // Open database connection
      this.db = new Database(this.dbPath);

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Create tables
      this.createTables();
      
      this.initialized = true;
      console.log(`✅ Memory database initialized at ${this.dbPath}`);
    } catch (error) {
      console.error('Failed to initialize memory database:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_opened DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(path)
      )
    `);

    // Conversations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        context_snapshot TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Interactions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('user', 'claude', 'terminal', 'file')),
        content TEXT NOT NULL,
        metadata TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better search performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_conversation ON interactions(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp);
    `);
  }

  /**
   * Create or get a project
   */
  async upsertProject(name: string, projectPath: string): Promise<Project> {
    if (!this.db) await this.initialize();

    const id = uuidv4();
    const now = new Date();

    // Try to insert, if exists update last_opened
    const stmt = this.db!.prepare(`
      INSERT INTO projects (id, name, path, created_at, last_opened)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        name = excluded.name,
        last_opened = excluded.last_opened
      RETURNING *
    `);

    const result = stmt.get(id, name, projectPath, now.toISOString(), now.toISOString()) as any;
    
    return {
      id: result.id,
      name: result.name,
      path: result.path,
      createdAt: new Date(result.created_at),
      lastOpened: new Date(result.last_opened)
    };
  }

  /**
   * Get project by path
   */
  async getProjectByPath(projectPath: string): Promise<Project | null> {
    if (!this.db) await this.initialize();

    const stmt = this.db!.prepare('SELECT * FROM projects WHERE path = ?');
    const result = stmt.get(projectPath) as any;

    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      path: result.path,
      createdAt: new Date(result.created_at),
      lastOpened: new Date(result.last_opened)
    };
  }

  /**
   * Create a new conversation
   */
  async createConversation(projectId: string, contextSnapshot?: string): Promise<Conversation> {
    if (!this.db) await this.initialize();

    const id = uuidv4();
    const now = new Date();

    const stmt = this.db!.prepare(`
      INSERT INTO conversations (id, project_id, context_snapshot, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, projectId, contextSnapshot || '', now.toISOString());

    return {
      id,
      projectId,
      contextSnapshot: contextSnapshot || '',
      timestamp: now
    };
  }

  /**
   * Add an interaction to a conversation
   */
  async addInteraction(
    conversationId: string,
    type: 'user' | 'claude' | 'terminal' | 'file',
    content: string,
    metadata?: any
  ): Promise<Interaction> {
    if (!this.db) await this.initialize();

    const id = uuidv4();
    const now = new Date();

    const stmt = this.db!.prepare(`
      INSERT INTO interactions (id, conversation_id, type, content, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      conversationId,
      type,
      content,
      metadata ? JSON.stringify(metadata) : null,
      now.toISOString()
    );

    return {
      id,
      conversationId,
      type,
      content,
      metadata,
      timestamp: now
    };
  }

  /**
   * Get all conversations for a project
   */
  async getProjectConversations(projectId: string): Promise<Conversation[]> {
    if (!this.db) await this.initialize();

    const stmt = this.db!.prepare(`
      SELECT * FROM conversations 
      WHERE project_id = ? 
      ORDER BY timestamp DESC
    `);

    const results = stmt.all(projectId) as any[];

    return results.map(r => ({
      id: r.id,
      projectId: r.project_id,
      contextSnapshot: r.context_snapshot,
      timestamp: new Date(r.timestamp)
    }));
  }

  /**
   * Get all interactions for a conversation
   */
  async getConversationInteractions(conversationId: string): Promise<Interaction[]> {
    if (!this.db) await this.initialize();

    const stmt = this.db!.prepare(`
      SELECT * FROM interactions 
      WHERE conversation_id = ? 
      ORDER BY timestamp ASC
    `);

    const results = stmt.all(conversationId) as any[];

    return results.map(r => ({
      id: r.id,
      conversationId: r.conversation_id,
      type: r.type,
      content: r.content,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
      timestamp: new Date(r.timestamp)
    }));
  }

  /**
   * Search across all conversations (Pro feature)
   */
  async searchMemory(query: string, projectId?: string): Promise<MemorySearchResult[]> {
    if (!this.db) await this.initialize();

    // Simple text search - in production, use FTS5 or vector search
    let sql = `
      SELECT 
        i.conversation_id,
        i.content,
        i.timestamp,
        p.name as project_name,
        c.project_id
      FROM interactions i
      JOIN conversations c ON i.conversation_id = c.id
      JOIN projects p ON c.project_id = p.id
      WHERE i.content LIKE ?
    `;

    const params: any[] = [`%${query}%`];

    if (projectId) {
      sql += ' AND c.project_id = ?';
      params.push(projectId);
    }

    sql += ' ORDER BY i.timestamp DESC LIMIT 100';

    const stmt = this.db!.prepare(sql);
    const results = stmt.all(...params) as any[];

    return results.map(r => ({
      conversationId: r.conversation_id,
      projectName: r.project_name,
      content: r.content,
      timestamp: new Date(r.timestamp),
      relevanceScore: this.calculateRelevance(query, r.content)
    }));
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevance(query: string, content: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Simple scoring based on occurrence count
    const occurrences = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
    
    // Boost if query appears at start
    const startsWithBonus = contentLower.startsWith(queryLower) ? 0.5 : 0;
    
    // Normalize to 0-1 range
    const score = Math.min(1, (occurrences * 0.2) + startsWithBonus);
    
    return score;
  }

  /**
   * Get recent sessions across all projects
   */
  async getRecentSessions(limit: number = 10): Promise<Array<{
    conversation: Conversation;
    project: Project;
    interactionCount: number;
  }>> {
    if (!this.db) await this.initialize();

    const stmt = this.db!.prepare(`
      SELECT 
        c.*,
        p.name as project_name,
        p.path as project_path,
        COUNT(i.id) as interaction_count
      FROM conversations c
      JOIN projects p ON c.project_id = p.id
      LEFT JOIN interactions i ON c.id = i.conversation_id
      GROUP BY c.id
      ORDER BY c.timestamp DESC
      LIMIT ?
    `);

    const results = stmt.all(limit) as any[];

    return results.map(r => ({
      conversation: {
        id: r.id,
        projectId: r.project_id,
        contextSnapshot: r.context_snapshot,
        timestamp: new Date(r.timestamp)
      },
      project: {
        id: r.project_id,
        name: r.project_name,
        path: r.project_path,
        createdAt: new Date(r.timestamp), // Approximation
        lastOpened: new Date(r.timestamp)
      },
      interactionCount: r.interaction_count
    }));
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<{
    totalProjects: number;
    totalConversations: number;
    totalInteractions: number;
    databaseSizeMB: number;
  }> {
    if (!this.db) await this.initialize();

    const projectCount = this.db!.prepare('SELECT COUNT(*) as count FROM projects').get() as any;
    const conversationCount = this.db!.prepare('SELECT COUNT(*) as count FROM conversations').get() as any;
    const interactionCount = this.db!.prepare('SELECT COUNT(*) as count FROM interactions').get() as any;

    // Get database file size
    const stats = await fs.stat(this.dbPath);
    const sizeMB = stats.size / (1024 * 1024);

    return {
      totalProjects: projectCount.count,
      totalConversations: conversationCount.count,
      totalInteractions: interactionCount.count,
      databaseSizeMB: parseFloat(sizeMB.toFixed(2))
    };
  }

  /**
   * Clean up old sessions (for free tier)
   */
  async cleanupOldSessions(daysToKeep: number = 1): Promise<number> {
    if (!this.db) await this.initialize();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const stmt = this.db!.prepare(`
      DELETE FROM conversations 
      WHERE timestamp < ?
    `);

    const result = stmt.run(cutoffDate.toISOString());
    
    return result.changes;
  }

  /**
   * Export conversation as JSON
   */
  async exportConversation(conversationId: string): Promise<any> {
    if (!this.db) await this.initialize();

    const conversation = this.db!.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as any;
    if (!conversation) throw new Error('Conversation not found');

    const interactions = await this.getConversationInteractions(conversationId);
    const project = this.db!.prepare('SELECT * FROM projects WHERE id = ?').get(conversation.project_id) as any;

    return {
      conversation: {
        id: conversation.id,
        timestamp: conversation.timestamp,
        contextSnapshot: conversation.context_snapshot
      },
      project: {
        name: project.name,
        path: project.path
      },
      interactions
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}

// Export singleton instance
export const memoryService = new MemoryService();
export default memoryService;