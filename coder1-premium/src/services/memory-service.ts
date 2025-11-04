/**
 * Memory Service - Eternal Memory Implementation
 * Stores and retrieves session context across unlimited sessions
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/error-handler';

interface SessionData {
  files?: Record<string, string>;
  terminalHistory?: string[];
  openFiles?: string[];
  editorState?: any;
  metadata?: Record<string, any>;
}

interface MemorySession {
  id: string;
  userId: string;
  sessionId: string;
  sessionData: SessionData;
  createdAt: Date;
  updatedAt: Date;
}

interface PreservedMemory {
  userId: string;
  sessionData: SessionData;
  preservedAt: Date;
  expiresAt: Date;
}

class MemoryService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error', err);
    });
  }

  /**
   * Initialize database tables
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS memory_sessions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          session_id VARCHAR(255) NOT NULL UNIQUE,
          session_data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_memory_user_id ON memory_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_memory_session_id ON memory_sessions(session_id);

        CREATE TABLE IF NOT EXISTS memory_archive (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          session_data JSONB NOT NULL,
          preserved_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_archive_user_id ON memory_archive(user_id);
        CREATE INDEX IF NOT EXISTS idx_archive_expires_at ON memory_archive(expires_at);
      `);

      logger.info('Memory service database tables initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Store session data in Eternal Memory
   */
  async store(userId: string, sessionId: string, sessionData: SessionData): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO memory_sessions (user_id, session_id, session_data, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (session_id)
         DO UPDATE SET session_data = $3, updated_at = NOW()`,
        [userId, sessionId, JSON.stringify(sessionData)]
      );

      logger.info(`Memory stored for user ${userId}, session ${sessionId}`);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieve memory context for a session
   */
  async getContext(userId: string, sessionId: string): Promise<SessionData | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT session_data FROM memory_sessions
         WHERE user_id = $1 AND session_id = $2`,
        [userId, sessionId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].session_data;
    } finally {
      client.release();
    }
  }

  /**
   * List all sessions for a user
   */
  async listSessions(userId: string): Promise<MemorySession[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT id, user_id, session_id, session_data, created_at, updated_at
         FROM memory_sessions
         WHERE user_id = $1
         ORDER BY updated_at DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id.toString(),
        userId: row.user_id,
        sessionId: row.session_id,
        sessionData: row.session_data,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Delete a session from memory
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM memory_sessions
         WHERE user_id = $1 AND session_id = $2`,
        [userId, sessionId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('Session');
      }

      logger.info(`Memory deleted for user ${userId}, session ${sessionId}`);
    } finally {
      client.release();
    }
  }

  /**
   * Preserve memory data after trial expiry (30-day freeze)
   */
  async preserveMemoryData(userId: string): Promise<Date> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const sessionsResult = await client.query(
        `SELECT session_data FROM memory_sessions WHERE user_id = $1`,
        [userId]
      );

      if (sessionsResult.rows.length === 0) {
        await client.query('ROLLBACK');
        logger.warn(`No memory to preserve for user ${userId}`);
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      const allSessionData = sessionsResult.rows.map(row => row.session_data);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await client.query(
        `INSERT INTO memory_archive (user_id, session_data, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, JSON.stringify(allSessionData), expiresAt]
      );

      await client.query(
        `DELETE FROM memory_sessions WHERE user_id = $1`,
        [userId]
      );

      await client.query('COMMIT');

      logger.info(`Memory preserved for user ${userId} until ${expiresAt.toISOString()}`);
      return expiresAt;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Restore memory data on upgrade
   */
  async restoreMemoryData(userId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const archiveResult = await client.query(
        `SELECT session_data FROM memory_archive
         WHERE user_id = $1 AND expires_at > NOW()
         ORDER BY preserved_at DESC
         LIMIT 1`,
        [userId]
      );

      if (archiveResult.rows.length === 0) {
        await client.query('ROLLBACK');
        logger.warn(`No preserved memory found for user ${userId}`);
        return 0;
      }

      const archivedSessions = archiveResult.rows[0].session_data;
      let restoredCount = 0;

      for (const sessionData of archivedSessions) {
        const sessionId = `restored_${Date.now()}_${restoredCount}`;
        await client.query(
          `INSERT INTO memory_sessions (user_id, session_id, session_data)
           VALUES ($1, $2, $3)`,
          [userId, sessionId, JSON.stringify(sessionData)]
        );
        restoredCount++;
      }

      await client.query(
        `DELETE FROM memory_archive WHERE user_id = $1`,
        [userId]
      );

      await client.query('COMMIT');

      logger.info(`Restored ${restoredCount} sessions for user ${userId}`);
      return restoredCount;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Clean up expired preserved memory
   */
  async cleanupExpiredMemory(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM memory_archive WHERE expires_at < NOW()`
      );

      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired memory archives`);
      }

      return deletedCount;
    } finally {
      client.release();
    }
  }

  /**
   * Get statistics for a user's memory usage
   */
  async getMemoryStats(userId: string): Promise<{
    activeSessions: number;
    totalSize: number;
    oldestSession: Date | null;
    newestSession: Date | null;
    isPreserved: boolean;
    preservationExpiry: Date | null;
  }> {
    const client = await this.pool.connect();
    try {
      const sessionsResult = await client.query(
        `SELECT COUNT(*) as count,
                MIN(created_at) as oldest,
                MAX(updated_at) as newest
         FROM memory_sessions
         WHERE user_id = $1`,
        [userId]
      );

      const archiveResult = await client.query(
        `SELECT expires_at FROM memory_archive
         WHERE user_id = $1 AND expires_at > NOW()
         ORDER BY preserved_at DESC
         LIMIT 1`,
        [userId]
      );

      const stats = sessionsResult.rows[0];
      const isPreserved = archiveResult.rows.length > 0;

      return {
        activeSessions: parseInt(stats.count),
        totalSize: 0,
        oldestSession: stats.oldest,
        newestSession: stats.newest,
        isPreserved,
        preservationExpiry: isPreserved ? archiveResult.rows[0].expires_at : null
      };
    } finally {
      client.release();
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Memory service database pool closed');
  }
}

export const memoryService = new MemoryService();
