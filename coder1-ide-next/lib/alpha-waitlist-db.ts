import Database from 'better-sqlite3';
import path from 'path';
import { readFileSync } from 'fs';

let db: Database.Database | null = null;

export function getAlphaWaitlistDB(): Database.Database {
  if (!db) {
    // Use same data directory logic as auth database
    const dataDir = process.env.NODE_ENV === 'production'
      ? '/data'
      : path.join(process.cwd(), 'data');
    const dbPath = path.join(dataDir, 'alpha-waitlist.db');

    db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
    });

    // Enable WAL mode for concurrent access
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA busy_timeout = 5000');

    // Initialize schema
    initializeSchema();
  }

  return db;
}

function initializeSchema() {
  if (!db) throw new Error('Database not initialized');

  try {
    // Check if table exists
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='alpha_waitlist'"
    ).get();

    if (!tableExists) {
      // Read and execute schema
      const schemaPath = path.join(process.cwd(), 'db', 'alpha-waitlist-schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');

      const statements = schema
        .split(';')
        .filter(stmt => stmt.trim())
        .map(stmt => stmt.trim() + ';');

      for (const statement of statements) {
        db.exec(statement);
      }

      console.log('✅ Alpha waitlist database initialized');
    }
  } catch (error) {
    console.error('❌ FATAL: Alpha waitlist schema initialization failed:', error);
    throw new Error(`Failed to initialize alpha waitlist database: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export interface AlphaWaitlistEntry {
  id: number;
  email: string;
  name: string | null;
  reddit_username: string | null;
  signup_date: string;
  invite_sent: boolean;
  invite_sent_date: string | null;
  invite_code: string | null;
  source: string;
  notes: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface CreateAlphaWaitlistInput {
  email: string;
  name?: string | null;
  reddit_username?: string | null;
  source?: string;
  ip_address?: string;
  user_agent?: string;
}

export function addToWaitlist(input: CreateAlphaWaitlistInput): AlphaWaitlistEntry {
  const db = getAlphaWaitlistDB();

  const stmt = db.prepare(`
    INSERT INTO alpha_waitlist (email, name, reddit_username, source, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *
  `);

  return stmt.get(
    input.email.toLowerCase().trim(),
    input.name || null,
    input.reddit_username || null,
    input.source || 'website',
    input.ip_address || null,
    input.user_agent || null
  ) as AlphaWaitlistEntry;
}

export function getWaitlistByEmail(email: string): AlphaWaitlistEntry | undefined {
  const db = getAlphaWaitlistDB();

  const stmt = db.prepare('SELECT * FROM alpha_waitlist WHERE email = ?');
  return stmt.get(email.toLowerCase().trim()) as AlphaWaitlistEntry | undefined;
}

export function getWaitlistCount(): number {
  const db = getAlphaWaitlistDB();

  const result = db.prepare('SELECT COUNT(*) as count FROM alpha_waitlist').get() as { count: number };
  return result.count;
}

export function deleteFromWaitlist(email: string): boolean {
  const db = getAlphaWaitlistDB();

  const stmt = db.prepare('DELETE FROM alpha_waitlist WHERE email = ?');
  const result = stmt.run(email.toLowerCase().trim());
  return result.changes > 0;
}
