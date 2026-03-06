/**
 * Enhanced Audit Log Service
 *
 * Adds user_id attribution to the existing audit_log table and provides
 * filtered queries with pagination and CSV export.
 */

import { randomUUID } from 'crypto';
import { getDb } from './johnny5-db';

// ---------------------------------------------------------------------------
// Migration: add user_id column (safe to re-run)
// ---------------------------------------------------------------------------

let migrated = false;

function ensureUserIdColumn(): void {
  if (migrated) return;
  try {
    const db = getDb();
    db.exec('ALTER TABLE audit_log ADD COLUMN user_id TEXT');
  } catch {
    // Column already exists — expected after first run
  }
  migrated = true;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource: string | null;
  details: string | null;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function logAuditEvent(
  userId: string,
  action: string,
  resource?: string,
  details?: Record<string, unknown>,
): void {
  ensureUserIdColumn();
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const detailsJson = details ? JSON.stringify({ resource, ...details }) : resource ? JSON.stringify({ resource }) : null;

  db.prepare(
    'INSERT INTO audit_log (id, user_id, action, details, timestamp) VALUES (?, ?, ?, ?, ?)',
  ).run(id, userId, action, detailsJson, now);
}

// ---------------------------------------------------------------------------
// Read (paginated)
// ---------------------------------------------------------------------------

export function getAuditLogs(filters: AuditLogFilters = {}): { rows: AuditLogEntry[]; total: number } {
  ensureUserIdColumn();
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.userId) {
    conditions.push('user_id = ?');
    params.push(filters.userId);
  }
  if (filters.action) {
    conditions.push('action = ?');
    params.push(filters.action);
  }
  if (filters.startDate) {
    conditions.push('timestamp >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push('timestamp <= ?');
    params.push(filters.endDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const total = (db.prepare(`SELECT COUNT(*) as count FROM audit_log ${where}`).get(...params) as { count: number }).count;
  const rows = db.prepare(
    `SELECT id, user_id, action, details, timestamp FROM audit_log ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
  ).all(...params, limit, offset) as AuditLogEntry[];

  return { rows, total };
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

export function exportAuditLogsCSV(filters: Omit<AuditLogFilters, 'limit' | 'offset'> = {}): string {
  const { rows } = getAuditLogs({ ...filters, limit: 10000, offset: 0 });

  const escape = (v: string | null): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = 'id,user_id,action,details,timestamp';
  const lines = rows.map(
    (r) => `${escape(r.id)},${escape(r.user_id)},${escape(r.action)},${escape(r.details)},${escape(r.timestamp)}`,
  );

  return [header, ...lines].join('\n');
}
