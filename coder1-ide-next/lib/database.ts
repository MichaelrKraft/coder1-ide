import path from 'path';

// 🔧 CONFIGURATION (Refactored Feb 2, 2026)
// Single source of truth for database path resolution
export function getDatabasePath(): string {
  // SUPPORT PERSISTENT DISK (render.yaml)
  // If DATABASE_URL is set (e.g. sqlite:///data/coder1-sessions.db), use it
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('sqlite://')) {
    const dbPath = process.env.DATABASE_URL.replace('sqlite://', '');
    // Only log once per process start/import to reduce noise, or log every time if debugging needed
    return dbPath;
  }
  
  // Default to local project directory (dev mode)
  return path.join(process.cwd(), 'db', 'context-memory.db');
}

export async function getDatabase() {
  const BetterSqlite3 = await import('better-sqlite3');
  const Database = BetterSqlite3.default || BetterSqlite3;

  const dbPath = getDatabasePath();
  return new Database(dbPath);
}

export function closeDatabaseSafely(db: any) {
  try {
    if (db && typeof db.close === 'function') {
      db.close();
    }
  } catch (error) {
    console.warn('⚠️ Failed to close database safely:', error);
  }
}
