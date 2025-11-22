import path from 'path';

export async function getDatabase() {
  const BetterSqlite3 = await import('better-sqlite3');
  const Database = BetterSqlite3.default || BetterSqlite3;
  const dbPath = path.join(process.cwd(), 'db', 'context-memory.db');
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
