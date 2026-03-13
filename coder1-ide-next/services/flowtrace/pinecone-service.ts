/**
 * FlowTrace Pinecone Service
 *
 * Manages the vector index for developer session frames.
 * Index: "flowtrace-dev-sessions", 1536-dim, cosine, serverless aws/us-east-1
 */

import { Pinecone, Index } from '@pinecone-database/pinecone';
import { createHash } from 'crypto';
import { join } from 'path';
import { EMBEDDING_DIMENSIONS } from './embedding-service';

const INDEX_NAME = process.env.FLOWTRACE_PINECONE_INDEX || 'flowtrace-dev-sessions';
const NAMESPACE = 'dev-sessions';

// ============================================================================
// Mode detection: Pinecone (cloud) vs local SQLite fallback
// ============================================================================

function isLocalMode(): boolean {
  return !process.env.PINECONE_API_KEY;
}

// ============================================================================
// Types
// ============================================================================

export interface FrameMetadata {
  session_id: string;
  timestamp: number;          // Unix int — REQUIRED for range queries
  timestamp_iso: string;      // Human-readable, display only
  frame_id: string;           // Join key to Screenpipe SQLite
  ocr_text_preview: string;   // First 500 chars of OCR
  app_name: string;
  window_title: string;
  url: string;                // Browser URL if applicable, else ''
  screenshot_path: string;    // ~/.screenpipe/frames/... — path only, never bytes
  content_type: 'code' | 'terminal' | 'browser' | 'design' | 'other';
  phash: string;              // Perceptual hash for dedup tracking
  ambient_session_id: string; // FK to ambient activity_sessions, else ''
}

export interface QueryOptions {
  topK?: number;
  dateRange?: { start: number; end: number };  // Unix timestamps
  apps?: string[];
  contentTypes?: string[];
}

export interface QueryMatch {
  id: string;
  score: number;
  metadata: FrameMetadata;
}

// ============================================================================
// Pinecone Client
// ============================================================================

let _pinecone: Pinecone | null = null;
let _index: Index | null = null;

function getPineconeClient(): Pinecone {
  if (_pinecone) return _pinecone;

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'PINECONE_API_KEY is not set. Add it to your .env.local to enable FlowTrace cloud storage.'
    );
  }

  _pinecone = new Pinecone({ apiKey });
  return _pinecone;
}

async function getIndex(): Promise<Index> {
  if (_index) return _index;
  const pc = getPineconeClient();
  _index = pc.index(INDEX_NAME);
  return _index;
}

// ============================================================================
// Local SQLite vector store (no Pinecone key required)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _localDb: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLocalDb(): any {
  if (_localDb) return _localDb;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const dbPath = join(process.cwd(), 'db', 'flowtrace-local.db');
  _localDb = new Database(dbPath);

  _localDb.exec(`
    CREATE TABLE IF NOT EXISTS flowtrace_local (
      id TEXT PRIMARY KEY,
      embedding BLOB NOT NULL,
      session_id TEXT,
      timestamp INTEGER,
      app_name TEXT,
      content_type TEXT,
      metadata TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ft_session ON flowtrace_local(session_id);
    CREATE INDEX IF NOT EXISTS idx_ft_ts ON flowtrace_local(timestamp);
  `);

  return _localDb;
}

function cosineSimilarity(a: number[], b: Float32Array): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-9);
}

async function upsertFrameLocal(embedding: number[], metadata: FrameMetadata): Promise<void> {
  const db = getLocalDb();
  const id = makeVectorId(metadata.session_id, metadata.timestamp, metadata.phash);
  const buf = Buffer.from(new Float32Array(embedding).buffer);
  db.prepare(`
    INSERT OR REPLACE INTO flowtrace_local
      (id, embedding, session_id, timestamp, app_name, content_type, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, buf, metadata.session_id, metadata.timestamp, metadata.app_name, metadata.content_type, JSON.stringify(metadata));
}

async function queryFramesLocal(
  queryEmbedding: number[],
  options: QueryOptions = {}
): Promise<QueryMatch[]> {
  const db = getLocalDb();
  const { topK = 10, dateRange, apps, contentTypes } = options;

  let sql = 'SELECT id, embedding, metadata FROM flowtrace_local WHERE 1=1';
  const params: (string | number)[] = [];

  if (dateRange) {
    sql += ' AND timestamp >= ? AND timestamp <= ?';
    params.push(dateRange.start, dateRange.end);
  }
  if (apps && apps.length > 0) {
    sql += ` AND app_name IN (${apps.map(() => '?').join(',')})`;
    params.push(...apps);
  }
  if (contentTypes && contentTypes.length > 0) {
    sql += ` AND content_type IN (${contentTypes.map(() => '?').join(',')})`;
    params.push(...contentTypes);
  }

  const rows = db.prepare(sql).all(...params) as { id: string; embedding: Buffer; metadata: string }[];

  const scored = rows.map((row) => {
    const vec = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4);
    return {
      id: row.id,
      score: cosineSimilarity(queryEmbedding, vec),
      metadata: JSON.parse(row.metadata) as FrameMetadata,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// ============================================================================
// Index Initialization (one-time setup)
// ============================================================================

export async function ensureIndexExists(): Promise<void> {
  if (isLocalMode()) {
    getLocalDb(); // ensure table exists
    console.log('[FlowTrace] Local mode — skipping Pinecone index creation.');
    return;
  }
  const pc = getPineconeClient();

  const existing = await pc.listIndexes();
  const indexNames = existing.indexes?.map((i) => i.name) ?? [];

  if (indexNames.includes(INDEX_NAME)) {
    return; // Already exists
  }

  console.log(`[FlowTrace] Creating Pinecone index "${INDEX_NAME}"...`);

  await pc.createIndex({
    name: INDEX_NAME,
    dimension: EMBEDDING_DIMENSIONS,
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1', // Only region available on free tier
      },
    },
  });

  // Wait for index to be ready (serverless indexes initialize quickly)
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log(`[FlowTrace] Index "${INDEX_NAME}" ready.`);
}

// ============================================================================
// Storage
// ============================================================================

/**
 * Deterministic vector ID from session + timestamp + phash.
 * Same input = same ID → upsert is idempotent, no duplicates.
 */
function makeVectorId(sessionId: string, timestamp: number, phash: string): string {
  return createHash('sha256')
    .update(`${sessionId}:${timestamp}:${phash}`)
    .digest('hex')
    .slice(0, 32);
}

export async function upsertFrame(
  embedding: number[],
  metadata: FrameMetadata
): Promise<void> {
  if (isLocalMode()) {
    return upsertFrameLocal(embedding, metadata);
  }

  const index = await getIndex();
  const id = makeVectorId(metadata.session_id, metadata.timestamp, metadata.phash);
  await index.namespace(NAMESPACE).upsert([
    {
      id,
      values: embedding,
      metadata: metadata as unknown as Record<string, string | number | boolean | string[]>,
    },
  ]);
}

// ============================================================================
// Query
// ============================================================================

export async function queryFrames(
  queryEmbedding: number[],
  options: QueryOptions = {}
): Promise<QueryMatch[]> {
  if (isLocalMode()) {
    return queryFramesLocal(queryEmbedding, options);
  }

  const index = await getIndex();

  const { topK = 10, dateRange, apps, contentTypes } = options;

  // Build metadata filter — only timestamp is indexed as number, others as string
  const filter: Record<string, unknown> = {};

  if (dateRange) {
    filter.timestamp = { $gte: dateRange.start, $lte: dateRange.end };
  }

  if (apps && apps.length > 0) {
    filter.app_name = { $in: apps };
  }

  if (contentTypes && contentTypes.length > 0) {
    filter.content_type = { $in: contentTypes };
  }

  const results = await index.namespace(NAMESPACE).query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });

  return (results.matches ?? []).map((match) => ({
    id: match.id,
    score: match.score ?? 0,
    metadata: match.metadata as unknown as FrameMetadata,
  }));
}

// ============================================================================
// Retention / Deletion
// ============================================================================

/**
 * Deletes all vectors older than N days. Run on a schedule for retention control.
 */
export async function pruneOldFrames(retentionDays: number): Promise<number> {
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 86400;

  if (isLocalMode()) {
    const db = getLocalDb();
    const result = db.prepare('DELETE FROM flowtrace_local WHERE timestamp <= ?').run(cutoff);
    return (result as { changes: number }).changes;
  }

  const index = await getIndex();

  // Fetch IDs to delete via query with date filter
  const toDelete = await index.namespace(NAMESPACE).query({
    vector: new Array(EMBEDDING_DIMENSIONS).fill(0), // dummy vector
    topK: 1000,
    includeMetadata: false,
    filter: { timestamp: { $lte: cutoff } },
  });

  const ids = (toDelete.matches ?? []).map((m) => m.id);
  if (ids.length > 0) {
    await index.namespace(NAMESPACE).deleteMany(ids);
  }

  return ids.length;
}

/**
 * Deletes all vectors from a specific app (e.g., "Forget Chrome").
 */
export async function deleteByApp(appName: string): Promise<number> {
  if (isLocalMode()) {
    const db = getLocalDb();
    const result = db.prepare('DELETE FROM flowtrace_local WHERE app_name = ?').run(appName);
    return (result as { changes: number }).changes;
  }

  const index = await getIndex();

  const matches = await index.namespace(NAMESPACE).query({
    vector: new Array(EMBEDDING_DIMENSIONS).fill(0),
    topK: 1000,
    includeMetadata: false,
    filter: { app_name: { $eq: appName } },
  });

  const ids = (matches.matches ?? []).map((m) => m.id);
  if (ids.length > 0) {
    await index.namespace(NAMESPACE).deleteMany(ids);
  }

  return ids.length;
}

/**
 * Deletes all vectors within a time range (e.g., "Forget this session").
 */
export async function deleteByTimeRange(start: number, end: number): Promise<number> {
  if (isLocalMode()) {
    const db = getLocalDb();
    const result = db.prepare('DELETE FROM flowtrace_local WHERE timestamp >= ? AND timestamp <= ?').run(start, end);
    return (result as { changes: number }).changes;
  }

  const index = await getIndex();

  const matches = await index.namespace(NAMESPACE).query({
    vector: new Array(EMBEDDING_DIMENSIONS).fill(0),
    topK: 1000,
    includeMetadata: false,
    filter: { timestamp: { $gte: start, $lte: end } },
  });

  const ids = (matches.matches ?? []).map((m) => m.id);
  if (ids.length > 0) {
    await index.namespace(NAMESPACE).deleteMany(ids);
  }

  return ids.length;
}
