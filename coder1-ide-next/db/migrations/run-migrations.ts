/**
 * Database Migration System
 * 
 * Automatically applies SQL schema files to the database in order.
 * Tracks which migrations have been applied to avoid duplicates.
 * 
 * This ensures every developer and deployment gets the correct database schema
 * without manual intervention.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getDatabasePath } from '../../lib/database';

interface Migration {
  filename: string;
  applied_at: string;
}

export class DatabaseMigrationManager {
  private db: Database.Database;
  private dbPath: string;
  private migrationsDir: string;

  constructor(dbPath?: string) {
    if (dbPath) {
      this.dbPath = dbPath;
    } else {
      this.dbPath = getDatabasePath();
      // Only log if we are resolving from env/default (not explicit arg)
      if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('sqlite://')) {
        console.log(`📂 Migrating persistent database at: ${this.dbPath}`);
      }
    }
    this.migrationsDir = path.join(process.cwd(), 'db');
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL'); // Enable Write-Ahead Logging for better performance
  }

  /**
   * Initialize the migrations tracking table
   */
  private initializeMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT NULL,
        execution_time_ms INTEGER DEFAULT 0
      );
    `);
  }

  /**
   * Get list of all applied migrations
   */
  private getAppliedMigrations(): Set<string> {
    const migrations = this.db.prepare('SELECT filename FROM schema_migrations').all() as Migration[];
    return new Set(migrations.map(m => m.filename));
  }

  /**
   * Calculate MD5 checksum of file content
   */
  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Apply a single migration file
   */
  private applyMigration(filename: string): void {
    const filepath = path.join(this.migrationsDir, filename);
    
    if (!fs.existsSync(filepath)) {
      console.warn(`⚠️  Migration file not found: ${filename}`);
      return;
    }

    const sql = fs.readFileSync(filepath, 'utf-8');
    const checksum = this.calculateChecksum(sql);
    const startTime = Date.now();

    try {
      console.log(`🔄 Applying migration: ${filename}`);

      // Execute the SQL file
      this.db.exec(sql);

      const executionTime = Date.now() - startTime;

      // Record the migration
      this.db.prepare(`
        INSERT INTO schema_migrations (filename, checksum, execution_time_ms)
        VALUES (?, ?, ?)
      `).run(filename, checksum, executionTime);

      console.log(`✅ Applied ${filename} in ${executionTime}ms`);
    } catch (error) {
      // SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS.
      // If the column already exists (e.g. schema.sql was updated to include it
      // before this ALTER TABLE migration ran), treat it as a no-op and mark
      // the migration applied so it doesn't block future server starts.
      const isDuplicateColumn =
        error instanceof Error &&
        error.message.includes('duplicate column name');

      if (isDuplicateColumn) {
        const executionTime = Date.now() - startTime;
        console.warn(`⚠️  ${filename}: column already exists — marking as applied`);
        this.db.prepare(`
          INSERT INTO schema_migrations (filename, checksum, execution_time_ms)
          VALUES (?, ?, ?)
        `).run(filename, checksum, executionTime);
        return;
      }

      console.error(`❌ Failed to apply migration ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations in order
   */
  public runMigrations(): void {
    console.log('\n📦 Database Migration System');
    console.log(`📍 Database: ${this.dbPath}\n`);

    // Initialize migrations table
    this.initializeMigrationsTable();

    // Get list of applied migrations
    const appliedMigrations = this.getAppliedMigrations();

    // Define migration order (important!)
    const migrationOrder = [
      'schema.sql',                           // Core context memory tables
      'evolutionary-sandbox-schema.sql',      // Evolutionary sandbox system
      'oauth-schema.sql',                     // OAuth authentication
      'auth-schema.sql',                      // Additional auth tables
      'bridge-schema.sql',                    // Bridge pairing persistence
      'time-capsules-schema.sql',             // Time Capsules: AI session -> Git commit linking
      'add-checkpoint-type.sql',              // Add type column (manual|auto) to checkpoints
      'migrations/004_commit_contexts.sql',   // Commit Context: automatic session context at each git commit
    ];

    let appliedCount = 0;
    let skippedCount = 0;

    for (const migration of migrationOrder) {
      if (appliedMigrations.has(migration)) {
        console.log(`⏭️  Skipping ${migration} (already applied)`);
        skippedCount++;
      } else {
        this.applyMigration(migration);
        appliedCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Applied: ${appliedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   📋 Total migrations: ${migrationOrder.length}`);
    
    if (appliedCount > 0) {
      console.log('\n🎉 Database schema updated successfully!\n');
    } else {
      console.log('\n✨ Database schema is up to date!\n');
    }
  }

  /**
   * Verify database schema integrity
   */
  public verifySchema(): boolean {
    console.log('\n🔍 Verifying database schema...\n');

    const requiredTables = [
      // Core tables
      'checkpoints',
      'claude_conversations',
      'context_folders',
      'context_sessions',
      'session_summaries',
      
      // Evolutionary sandbox tables
      'sandbox_experiments',
      'experiment_memories',
      'memory_graduation',
      'confidence_patterns',
      'sandbox_sessions',
      'outcome_analysis',
    ];

    let allTablesExist = true;

    for (const table of requiredTables) {
      const exists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name = ?
      `).get(table);

      if (exists) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.log(`❌ Table '${table}' MISSING`);
        allTablesExist = false;
      }
    }

    console.log('\n');
    
    if (allTablesExist) {
      console.log('✨ All required tables exist!\n');
      return true;
    } else {
      console.log('⚠️  Some tables are missing. Run migrations to fix.\n');
      return false;
    }
  }

  /**
   * Get migration history
   */
  public getMigrationHistory(): Migration[] {
    return this.db.prepare(`
      SELECT filename, applied_at, execution_time_ms
      FROM schema_migrations
      ORDER BY applied_at ASC
    `).all() as Migration[];
  }

  /**
   * Close database connection
   */
  public close(): void {
    this.db.close();
  }
}

/**
 * Run migrations (called from server startup or CLI)
 */
export function runMigrations(dbPath?: string): void {
  const manager = new DatabaseMigrationManager(dbPath);
  
  try {
    manager.runMigrations();
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    manager.close();
  }
}

/**
 * Verify schema (useful for health checks)
 */
export function verifySchema(dbPath?: string): boolean {
  const manager = new DatabaseMigrationManager(dbPath);
  
  try {
    return manager.verifySchema();
  } finally {
    manager.close();
  }
}

// Allow running directly from command line
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';
  
  switch (command) {
    case 'migrate':
      runMigrations();
      break;
    case 'verify':
      const isValid = verifySchema();
      process.exit(isValid ? 0 : 1);
      break;
    case 'history':
      const manager = new DatabaseMigrationManager();
      const history = manager.getMigrationHistory();
      console.log('\n📜 Migration History:\n');
      history.forEach(m => {
        console.log(`   ${m.filename}`);
        console.log(`   └─ Applied: ${m.applied_at}\n`);
      });
      manager.close();
      break;
    default:
      console.log('Usage: ts-node run-migrations.ts [migrate|verify|history]');
      process.exit(1);
  }
}
