/**
 * Token Cost Attribution Service
 *
 * Tracks per-user token usage with estimated cost and provides
 * aggregated views for user-level and team-level reporting.
 */

import { randomUUID } from 'crypto';
import { getDb } from './johnny5-db';

// ---------------------------------------------------------------------------
// Table initialization (idempotent)
// ---------------------------------------------------------------------------

let initialized = false;

function ensureTable(): void {
  if (initialized) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS token_usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      estimated_cost_usd REAL NOT NULL DEFAULT 0,
      session_id TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_token_usage_user ON token_usage(user_id);
    CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp);
    CREATE INDEX IF NOT EXISTS idx_token_usage_provider ON token_usage(provider);
  `);
  initialized = true;
}

// ---------------------------------------------------------------------------
// Pricing (per 1M tokens) — input / output
// ---------------------------------------------------------------------------

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet': { input: 3, output: 15 },
  'claude-3.5-sonnet': { input: 3, output: 15 },
  'claude-4-sonnet': { input: 3, output: 15 },
  'claude-opus': { input: 15, output: 75 },
  'claude-4-opus': { input: 15, output: 75 },
  'codex': { input: 5, output: 15 },
  'gpt-5': { input: 5, output: 15 },
};

const DEFAULT_PRICING = { input: 3, output: 15 };

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const key = Object.keys(PRICING).find((k) => model.toLowerCase().includes(k));
  const pricing = key ? PRICING[key] : DEFAULT_PRICING;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export interface TrackTokenUsageInput {
  userId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  sessionId?: string;
}

export function trackTokenUsage(data: TrackTokenUsageInput): void {
  ensureTable();
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const cost = estimateCost(data.model, data.inputTokens, data.outputTokens);

  db.prepare(
    `INSERT INTO token_usage (id, user_id, provider, model, input_tokens, output_tokens, estimated_cost_usd, session_id, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, data.userId, data.provider, data.model, data.inputTokens, data.outputTokens, cost, data.sessionId ?? null, now);
}

// ---------------------------------------------------------------------------
// Read — per user (aggregated by provider/model)
// ---------------------------------------------------------------------------

export interface TokenUsageRow {
  provider: string;
  model: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  request_count: number;
}

export function getUserTokenUsage(userId: string, startDate?: string, endDate?: string): TokenUsageRow[] {
  ensureTable();
  const db = getDb();
  const conditions = ['user_id = ?'];
  const params: unknown[] = [userId];

  if (startDate) { conditions.push('timestamp >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('timestamp <= ?'); params.push(endDate); }

  const where = conditions.join(' AND ');
  return db.prepare(
    `SELECT provider, model,
            SUM(input_tokens) as total_input_tokens,
            SUM(output_tokens) as total_output_tokens,
            SUM(estimated_cost_usd) as total_cost_usd,
            COUNT(*) as request_count
     FROM token_usage WHERE ${where}
     GROUP BY provider, model
     ORDER BY total_cost_usd DESC`,
  ).all(...params) as TokenUsageRow[];
}

// ---------------------------------------------------------------------------
// Read — team-wide (aggregated by user)
// ---------------------------------------------------------------------------

export interface TeamUsageRow {
  user_id: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  request_count: number;
}

export function getTeamTokenUsage(startDate?: string, endDate?: string): TeamUsageRow[] {
  ensureTable();
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (startDate) { conditions.push('timestamp >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('timestamp <= ?'); params.push(endDate); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(
    `SELECT user_id,
            SUM(input_tokens) as total_input_tokens,
            SUM(output_tokens) as total_output_tokens,
            SUM(estimated_cost_usd) as total_cost_usd,
            COUNT(*) as request_count
     FROM token_usage ${where}
     GROUP BY user_id
     ORDER BY total_cost_usd DESC`,
  ).all(...params) as TeamUsageRow[];
}
