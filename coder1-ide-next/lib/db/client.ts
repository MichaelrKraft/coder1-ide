// Second Brain Database Client
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync } from 'fs';

// Ensure ~/.johnny5 directory exists
const johnny5Dir = join(homedir(), '.johnny5');
try {
  mkdirSync(johnny5Dir, { recursive: true });
} catch (err) {
  // Directory already exists, ignore
}

// SQLite database location
const dbPath = join(johnny5Dir, 'second-brain.db');

// Create SQLite connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Run migrations on first startup
export function initializeDatabase() {
  // Create memories table if it doesn't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      category TEXT,
      source TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      tags TEXT,
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_content ON memories(content);
    CREATE INDEX IF NOT EXISTS idx_category ON memories(category);
    CREATE INDEX IF NOT EXISTS idx_created_at ON memories(created_at DESC);
  `);

  console.log('✅ Second Brain database initialized at:', dbPath);
}

// Initialize on import
initializeDatabase();
