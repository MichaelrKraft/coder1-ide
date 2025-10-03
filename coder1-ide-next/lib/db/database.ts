/**
 * Database Service for Memory Detection System
 * Uses better-sqlite3 for persistence
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '@/lib/logger';

let db: Database.Database | null = null;

const DB_PATH = path.join(process.cwd(), 'data', 'memories.db');
const SCHEMA_PATH = path.join(process.cwd(), 'lib', 'db', 'schema.sql');

/**
 * Initialize database and apply schema
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  try {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info('📁 Created data directory:', dataDir);
    }

    // Open database connection
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better performance
    db.pragma('foreign_keys = ON'); // Enable foreign key constraints

    logger.info('✅ Database connected:', DB_PATH);

    // Apply schema
    if (fs.existsSync(SCHEMA_PATH)) {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      db.exec(schema);
      logger.info('✅ Database schema applied');
    } else {
      logger.warn('⚠️ Schema file not found:', SCHEMA_PATH);
    }

    return db;
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Get database instance (creates if doesn't exist)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('🔒 Database connection closed');
  }
}

/**
 * Execute a database query with error handling
 */
export function executeQuery<T>(
  query: string,
  params?: any[]
): T | null {
  try {
    const database = getDatabase();
    const stmt = database.prepare(query);
    return stmt.get(...(params || [])) as T;
  } catch (error) {
    logger.error('❌ Query execution failed:', error);
    return null;
  }
}

/**
 * Execute multiple queries (for inserts, updates, deletes)
 */
export function executeAll<T>(
  query: string,
  params?: any[]
): T[] {
  try {
    const database = getDatabase();
    const stmt = database.prepare(query);
    return stmt.all(...(params || [])) as T[];
  } catch (error) {
    logger.error('❌ Query execution failed:', error);
    return [];
  }
}

/**
 * Run a query (for inserts, updates, deletes)
 */
export function executeRun(
  query: string,
  params?: any[]
): Database.RunResult {
  const database = getDatabase();
  const stmt = database.prepare(query);
  return stmt.run(...(params || []));
}

/**
 * Transaction support
 */
export function transaction<T>(fn: () => T): T {
  const database = getDatabase();
  const trx = database.transaction(fn);
  return trx();
}

/**
 * Backup database
 */
export function backupDatabase(backupPath: string): void {
  const database = getDatabase();
  database.backup(backupPath)
    .then(() => {
      logger.info('✅ Database backed up to:', backupPath);
    })
    .catch((error) => {
      logger.error('❌ Database backup failed:', error);
    });
}

// Export types
export type { Database };
