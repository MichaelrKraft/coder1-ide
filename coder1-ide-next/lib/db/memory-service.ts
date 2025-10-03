/**
 * Memory Service - CRUD operations for memories
 * Phase II Implementation
 */

import { getDatabase, executeQuery, executeAll, executeRun, transaction } from './database';
import { logger } from '@/lib/logger';

export type MemoryEventType = 
  | 'bug-fix' 
  | 'feature' 
  | 'breakthrough' 
  | 'refactor' 
  | 'optimization' 
  | 'learning' 
  | 'milestone';

export interface Memory {
  id: number;
  title: string;
  description: string;
  type: MemoryEventType;
  confidence: number;
  tags: string[];
  context: {
    files: string[];
    commands: string[];
    errors?: string[];
    breakthroughs?: string[];
  };
  checkpointId?: string;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface MemoryInput {
  title: string;
  description: string;
  type: MemoryEventType;
  confidence: number;
  tags?: string[];
  context: {
    files: string[];
    commands: string[];
    errors?: string[];
    breakthroughs?: string[];
  };
  checkpointId?: string;
  sessionId?: string;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  type?: MemoryEventType;
  includeDeleted?: boolean;
  sortBy?: 'created_at' | 'confidence' | 'updated_at';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface SearchQuery {
  query: string;
  type?: MemoryEventType;
  minConfidence?: number;
  tags?: string[];
}

export interface MemoryStats {
  total: number;
  byType: Record<MemoryEventType, number>;
  avgConfidence: number;
  recentCount: number;
}

class MemoryService {
  /**
   * Create a new memory
   */
  create(input: MemoryInput): Memory | null {
    try {
      const result = executeRun(
        `INSERT INTO memories (title, description, type, confidence, tags, context, checkpoint_id, session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.title,
          input.description,
          input.type,
          input.confidence,
          JSON.stringify(input.tags || []),
          JSON.stringify(input.context),
          input.checkpointId || null,
          input.sessionId || null
        ]
      );

      if (result.lastInsertRowid) {
        logger.info(`✅ Memory created: ${input.title} (ID: ${result.lastInsertRowid})`);
        return this.get(Number(result.lastInsertRowid));
      }

      return null;
    } catch (error) {
      logger.error('❌ Failed to create memory:', error);
      return null;
    }
  }

  /**
   * Get memory by ID
   */
  get(id: number): Memory | null {
    const row = executeQuery<any>(
      `SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    return row ? this.parseMemory(row) : null;
  }

  /**
   * Update memory
   */
  update(id: number, updates: Partial<MemoryInput>): Memory | null {
    try {
      const existing = this.get(id);
      if (!existing) {
        logger.warn(`⚠️ Memory not found for update: ${id}`);
        return null;
      }

      const fields: string[] = [];
      const values: any[] = [];

      if (updates.title) {
        fields.push('title = ?');
        values.push(updates.title);
      }
      if (updates.description) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.type) {
        fields.push('type = ?');
        values.push(updates.type);
      }
      if (updates.confidence !== undefined) {
        fields.push('confidence = ?');
        values.push(updates.confidence);
      }
      if (updates.tags) {
        fields.push('tags = ?');
        values.push(JSON.stringify(updates.tags));
      }
      if (updates.context) {
        fields.push('context = ?');
        values.push(JSON.stringify(updates.context));
      }

      if (fields.length === 0) {
        return existing;
      }

      values.push(id);
      executeRun(
        `UPDATE memories SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      logger.info(`✅ Memory updated: ${id}`);
      return this.get(id);
    } catch (error) {
      logger.error('❌ Failed to update memory:', error);
      return null;
    }
  }

  /**
   * Soft delete memory
   */
  delete(id: number): boolean {
    try {
      const result = executeRun(
        `UPDATE memories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
        [id]
      );

      if (result.changes > 0) {
        logger.info(`✅ Memory deleted: ${id}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('❌ Failed to delete memory:', error);
      return false;
    }
  }

  /**
   * Permanently delete memory
   */
  hardDelete(id: number): boolean {
    try {
      const result = executeRun(`DELETE FROM memories WHERE id = ?`, [id]);
      return result.changes > 0;
    } catch (error) {
      logger.error('❌ Failed to hard delete memory:', error);
      return false;
    }
  }

  /**
   * List memories with pagination
   */
  list(options: ListOptions = {}): PaginatedResult<Memory> {
    const {
      limit = 20,
      offset = 0,
      type,
      includeDeleted = false,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    try {
      const conditions: string[] = [];
      const params: any[] = [];

      if (!includeDeleted) {
        conditions.push('deleted_at IS NULL');
      }

      if (type) {
        conditions.push('type = ?');
        params.push(type);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = executeQuery<{ count: number }>(
        `SELECT COUNT(*) as count FROM memories ${whereClause}`,
        params
      );
      const total = countResult?.count || 0;

      // Get paginated results
      const rows = executeAll<any>(
        `SELECT * FROM memories ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const items = rows.map(row => this.parseMemory(row));

      return {
        items,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      };
    } catch (error) {
      logger.error('❌ Failed to list memories:', error);
      return { items: [], total: 0, limit, offset, hasMore: false };
    }
  }

  /**
   * Search memories
   */
  search(query: SearchQuery): Memory[] {
    try {
      const conditions: string[] = ['deleted_at IS NULL'];
      const params: any[] = [];

      // Full-text search on title and description
      if (query.query) {
        conditions.push('(title LIKE ? OR description LIKE ?)');
        params.push(`%${query.query}%`, `%${query.query}%`);
      }

      if (query.type) {
        conditions.push('type = ?');
        params.push(query.type);
      }

      if (query.minConfidence !== undefined) {
        conditions.push('confidence >= ?');
        params.push(query.minConfidence);
      }

      if (query.tags && query.tags.length > 0) {
        const tagConditions = query.tags.map(() => 'tags LIKE ?').join(' OR ');
        conditions.push(`(${tagConditions})`);
        query.tags.forEach(tag => params.push(`%"${tag}"%`));
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      const rows = executeAll<any>(
        `SELECT * FROM memories ${whereClause} ORDER BY confidence DESC, created_at DESC LIMIT 100`,
        params
      );

      return rows.map(row => this.parseMemory(row));
    } catch (error) {
      logger.error('❌ Failed to search memories:', error);
      return [];
    }
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    try {
      const total = executeQuery<{ count: number }>(
        'SELECT COUNT(*) as count FROM memories WHERE deleted_at IS NULL',
        []
      )?.count || 0;

      const byTypeRows = executeAll<{ type: MemoryEventType; count: number }>(
        'SELECT type, COUNT(*) as count FROM memories WHERE deleted_at IS NULL GROUP BY type',
        []
      );

      const byType: Record<string, number> = {};
      byTypeRows.forEach(row => {
        byType[row.type] = row.count;
      });

      const avgResult = executeQuery<{ avg: number }>(
        'SELECT AVG(confidence) as avg FROM memories WHERE deleted_at IS NULL',
        []
      );

      const recentResult = executeQuery<{ count: number }>(
        'SELECT COUNT(*) as count FROM memories WHERE deleted_at IS NULL AND created_at >= datetime("now", "-7 days")',
        []
      );

      return {
        total,
        byType: byType as Record<MemoryEventType, number>,
        avgConfidence: avgResult?.avg || 0,
        recentCount: recentResult?.count || 0
      };
    } catch (error) {
      logger.error('❌ Failed to get stats:', error);
      return {
        total: 0,
        byType: {} as Record<MemoryEventType, number>,
        avgConfidence: 0,
        recentCount: 0
      };
    }
  }

  /**
   * Parse database row to Memory object
   */
  private parseMemory(row: any): Memory {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      confidence: row.confidence,
      tags: JSON.parse(row.tags || '[]'),
      context: JSON.parse(row.context || '{}'),
      checkpointId: row.checkpoint_id,
      sessionId: row.session_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined
    };
  }
}

// Export singleton instance
export const memoryService = new MemoryService();
export default memoryService;
