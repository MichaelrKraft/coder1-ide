/**
 * FlightRecorderStorage — Hybrid SQLite + JSONL storage layer.
 * SQLite holds the event index and metadata. JSONL files hold bulk event data.
 * Server-side only (uses better-sqlite3 and fs).
 */

import type {
  FlightEvent,
  FlightSession,
  FlightSessionRow,
  FlightEventQuery,
  FlightRecorderStats,
  FlightSessionStatus,
} from './types';

// Node modules loaded lazily to prevent client-side bundling
function getNodeModules() {
  const Database = require('better-sqlite3');
  const fs = require('fs');
  const path = require('path');
  const zlib = require('zlib');
  return { Database, fs, path, zlib };
}

const DATA_DIR = 'data/flight-recorder';
const DB_NAME = 'recorder.db';
const MAX_JSONL_SIZE = 10 * 1024 * 1024; // 10MB rotation
const TERMINAL_CHUNK_THRESHOLD = 10 * 1024; // 10KB

let instance: FlightRecorderStorage | null = null;

export class FlightRecorderStorage {
  private db: ReturnType<typeof require>;
  private basePath: string;

  private constructor(basePath: string) {
    const { Database, fs, path } = getNodeModules();
    this.basePath = basePath;
    fs.mkdirSync(path.join(basePath, 'sessions'), { recursive: true });

    const dbPath = path.join(basePath, DB_NAME);
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.runMigration();
  }

  static getInstance(): FlightRecorderStorage {
    if (!instance) {
      const { path } = getNodeModules();
      const base = path.resolve(process.cwd(), DATA_DIR);
      instance = new FlightRecorderStorage(base);
    }
    return instance;
  }

  // --- Session management ---

  initSession(flightSessionId: string, sessionId: string): void {
    const { fs, path } = getNodeModules();
    const sessionDir = path.join(this.basePath, 'sessions', flightSessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    this.db.prepare(`
      INSERT INTO flight_sessions (id, session_id, status, started_at)
      VALUES (?, ?, 'recording', ?)
    `).run(flightSessionId, sessionId, Date.now());
  }

  endSession(flightSessionId: string, status: FlightSessionStatus = 'completed'): void {
    this.db.prepare(`
      UPDATE flight_sessions SET status = ?, ended_at = ? WHERE id = ?
    `).run(status, Date.now(), flightSessionId);
  }

  getSessions(limit = 50, offset = 0, starred?: boolean): FlightSession[] {
    let query = 'SELECT * FROM flight_sessions';
    const params: unknown[] = [];

    if (starred !== undefined) {
      query += ' WHERE starred = ?';
      params.push(starred ? 1 : 0);
    }
    query += ' ORDER BY started_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows: FlightSessionRow[] = this.db.prepare(query).all(params);
    return rows.map(this.rowToSession);
  }

  getSession(flightSessionId: string): FlightSession | null {
    const row: FlightSessionRow | undefined = this.db.prepare(
      'SELECT * FROM flight_sessions WHERE id = ?'
    ).get(flightSessionId);
    return row ? this.rowToSession(row) : null;
  }

  deleteSession(flightSessionId: string): void {
    const { fs, path } = getNodeModules();
    this.db.prepare('DELETE FROM flight_sessions WHERE id = ?').run(flightSessionId);
    const sessionDir = path.join(this.basePath, 'sessions', flightSessionId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }

  updateSession(flightSessionId: string, updates: { starred?: boolean; metadata?: string }): void {
    if (updates.starred !== undefined) {
      this.db.prepare('UPDATE flight_sessions SET starred = ? WHERE id = ?')
        .run(updates.starred ? 1 : 0, flightSessionId);
    }
    if (updates.metadata !== undefined) {
      this.db.prepare('UPDATE flight_sessions SET metadata = ? WHERE id = ?')
        .run(updates.metadata, flightSessionId);
    }
  }

  // --- Event storage ---

  appendEvents(flightSessionId: string, events: FlightEvent[]): number {
    const { fs, path } = getNodeModules();
    if (events.length === 0) return 0;

    const sessionDir = path.join(this.basePath, 'sessions', flightSessionId);
    const jsonlPath = this.getCurrentJsonlPath(flightSessionId);
    const now = Date.now();

    const insertEvent = this.db.prepare(`
      INSERT INTO flight_events (flight_session_id, event_type, client_timestamp, server_timestamp, searchable_text, metadata, data_offset, data_length)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const batchInsert = this.db.transaction((evts: FlightEvent[]) => {
      let totalBytes = 0;

      for (const event of evts) {
        // Handle large terminal output as separate chunk BEFORE serializing
        if (event.type === 'terminal:output' && typeof event.data.output === 'string' && event.data.output.length > TERMINAL_CHUNK_THRESHOLD) {
          this.storeTerminalChunk(sessionDir, event);
          event.data.output = `[chunk:${event.id}]`;
        }

        const line = JSON.stringify(event) + '\n';
        const lineBytes = Buffer.byteLength(line, 'utf8');

        const stat = fs.existsSync(jsonlPath) ? fs.statSync(jsonlPath) : { size: 0 };
        const offset = stat.size;

        fs.appendFileSync(jsonlPath, line, 'utf8');

        insertEvent.run(
          flightSessionId,
          event.type,
          event.clientTimestamp,
          now,
          event.searchableText || null,
          event.data ? JSON.stringify(event.data) : null,
          offset,
          lineBytes
        );

        totalBytes += lineBytes;
      }

      // Update session counters
      this.db.prepare(`
        UPDATE flight_sessions
        SET total_events = total_events + ?, total_size_bytes = total_size_bytes + ?
        WHERE id = ?
      `).run(evts.length, totalBytes, flightSessionId);

      return totalBytes;
    });

    return batchInsert(events);
  }

  getEvents(query: FlightEventQuery): Array<{ event: FlightEvent; serverTimestamp: number }> {
    const { fs, path } = getNodeModules();
    const conditions = ['flight_session_id = ?'];
    const params: unknown[] = [query.sessionId];

    if (query.startTimestamp) {
      conditions.push('client_timestamp >= ?');
      params.push(query.startTimestamp);
    }
    if (query.endTimestamp) {
      conditions.push('client_timestamp <= ?');
      params.push(query.endTimestamp);
    }
    if (query.eventTypes?.length) {
      conditions.push(`event_type IN (${query.eventTypes.map(() => '?').join(',')})`);
      params.push(...query.eventTypes);
    }

    const limit = query.limit || 100;
    const offset = query.offset || 0;
    params.push(limit, offset);

    const sql = `
      SELECT * FROM flight_events
      WHERE ${conditions.join(' AND ')}
      ORDER BY client_timestamp ASC
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(sql).all(params) as Array<{
      flight_session_id: string;
      data_offset: number;
      data_length: number;
      server_timestamp: number;
    }>;

    const jsonlPath = this.getCurrentJsonlPath(query.sessionId);
    if (!fs.existsSync(jsonlPath)) return [];

    const fd = fs.openSync(jsonlPath, 'r');
    const results: Array<{ event: FlightEvent; serverTimestamp: number }> = [];

    try {
      for (const row of rows) {
        const buf = Buffer.alloc(row.data_length);
        fs.readSync(fd, buf, 0, row.data_length, row.data_offset);
        const event: FlightEvent = JSON.parse(buf.toString('utf8'));
        results.push({ event, serverTimestamp: row.server_timestamp });
      }
    } finally {
      fs.closeSync(fd);
    }

    return results;
  }

  searchEvents(searchText: string, sessionId?: string, limit = 50): Array<{ flightSessionId: string; eventType: string; snippet: string; timestamp: number }> {
    let sql = `
      SELECT fe.flight_session_id, fe.event_type, fe.client_timestamp,
             snippet(flight_events_fts, 2, '<mark>', '</mark>', '...', 30) as snippet
      FROM flight_events_fts
      JOIN flight_events fe ON fe.id = flight_events_fts.rowid
      WHERE flight_events_fts MATCH ?
    `;
    const params: unknown[] = [searchText];

    if (sessionId) {
      sql += ' AND flight_events_fts.flight_session_id = ?';
      params.push(sessionId);
    }
    sql += ' ORDER BY rank LIMIT ?';
    params.push(limit);

    return this.db.prepare(sql).all(params) as Array<{
      flightSessionId: string;
      eventType: string;
      snippet: string;
      timestamp: number;
    }>;
  }

  // --- Terminal snapshots ---

  saveTerminalSnapshot(flightSessionId: string, timestamp: number, buffer: string): void {
    this.db.prepare(`
      INSERT INTO flight_terminal_snapshots (flight_session_id, timestamp, terminal_buffer)
      VALUES (?, ?, ?)
    `).run(flightSessionId, timestamp, buffer);
  }

  // --- Cleanup ---

  cleanup(retentionDays = 30): number {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const sessions: FlightSessionRow[] = this.db.prepare(
      'SELECT * FROM flight_sessions WHERE started_at < ? AND starred = 0'
    ).all(cutoff);

    let cleaned = 0;
    for (const session of sessions) {
      this.deleteSession(session.id);
      cleaned++;
    }
    return cleaned;
  }

  // --- Stats ---

  getStats(): FlightRecorderStats {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) as totalSessions,
        COALESCE(SUM(total_events), 0) as totalEvents,
        COALESCE(SUM(total_size_bytes), 0) as totalSizeBytes,
        MIN(started_at) as oldestSession,
        MAX(started_at) as newestSession
      FROM flight_sessions
    `).get() as Record<string, number>;

    return {
      totalSessions: row.totalSessions,
      totalEvents: row.totalEvents,
      totalSizeBytes: row.totalSizeBytes,
      oldestSession: row.oldestSession || undefined,
      newestSession: row.newestSession || undefined,
    };
  }

  getEventCountByType(flightSessionId: string): Record<string, number> {
    const rows = this.db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM flight_events WHERE flight_session_id = ?
      GROUP BY event_type
    `).all(flightSessionId) as Array<{ event_type: string; count: number }>;

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.event_type] = row.count;
    }
    return result;
  }

  integrityCheck(): { ok: boolean; details: string } {
    try {
      const result = this.db.pragma('integrity_check') as Array<{ integrity_check: string }>;
      const ok = result[0]?.integrity_check === 'ok';
      return { ok, details: result[0]?.integrity_check || 'unknown' };
    } catch (error) {
      return { ok: false, details: String(error) };
    }
  }

  // --- Private helpers ---

  private runMigration(): void {
    const { fs, path } = getNodeModules();
    const migrationPath = path.resolve(process.cwd(), 'db/migrations/flight-recorder-v1.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      this.db.exec(sql);
    }
  }

  private getCurrentJsonlPath(flightSessionId: string): string {
    const { path } = getNodeModules();
    // No rotation in Phase 1 — single JSONL per session.
    // Rotation would orphan SQLite data_offset values since we don't track which file an event is in.
    return path.join(this.basePath, 'sessions', flightSessionId, 'events.jsonl');
  }

  private storeTerminalChunk(sessionDir: string, event: FlightEvent): void {
    const { fs, path, zlib } = getNodeModules();
    const chunksDir = path.join(sessionDir, 'terminal-chunks');
    fs.mkdirSync(chunksDir, { recursive: true });

    const chunkPath = path.join(chunksDir, `chunk-${event.id}.gz`);
    const output = typeof event.data.output === 'string' ? event.data.output : '';
    const compressed = zlib.gzipSync(Buffer.from(output, 'utf8'));
    fs.writeFileSync(chunkPath, compressed);
  }

  private rowToSession(row: FlightSessionRow): FlightSession {
    return {
      id: row.id,
      sessionId: row.session_id,
      status: row.status as FlightSessionStatus,
      startedAt: row.started_at,
      endedAt: row.ended_at || undefined,
      totalEvents: row.total_events,
      totalSizeBytes: row.total_size_bytes,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      starred: row.starred === 1,
    };
  }
}
