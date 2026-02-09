/**
 * Team Sync Service
 *
 * Singleton service that synchronizes local Johnny5 knowledge (extracted_facts,
 * learned_patterns, memory_chunks) with Supabase cloud for team-wide sharing.
 *
 * Follows the singleton pattern from services/memory-detection-service.ts.
 */

import 'server-only';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// ============================================================================
// Types
// ============================================================================

interface SyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastPushAt: string | null;
  lastPullAt: string | null;
  pendingCount: number;
  skippedCount: number;
  error: string | null;
}

interface TeamKnowledgeRow {
  id: string;
  team_id: string;
  source_table: string;
  source_id: string;
  content_hash: string;
  data: Record<string, unknown>;
  contributed_by: string;
  contributed_by_name: string | null;
  contributor_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const VALID_SOURCE_TABLES = ['extracted_facts', 'learned_patterns', 'memory_chunks'] as const;
type SourceTable = typeof VALID_SOURCE_TABLES[number];

const MAX_PUSH_ROW_SIZE_BYTES = 50 * 1024; // 50KB per row (E4-2)
const BATCH_SIZE = 50; // Process 50 rows at a time (E5-1)
const PAGE_SIZE = 100; // Supabase pagination size (E5-4)
const REALTIME_DEBOUNCE_MS = 3000; // 3s debounce for realtime events (E5-10)
const SYNC_LOG_RETENTION_DAYS = 7; // Clean up sync_log older than 7 days (E1-6)

// ============================================================================
// TeamSyncService
// ============================================================================

class TeamSyncService {
  private static instance: TeamSyncService | null = null;
  private supabase: SupabaseClient | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private teamId: string | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  private lastSyncTime: string | null = null;
  private isSyncing = false;
  private status: SyncStatus = {
    isConnected: false,
    isSyncing: false,
    lastPushAt: null,
    lastPullAt: null,
    pendingCount: 0,
    skippedCount: 0,
    error: null,
  };
  private retryCount = 0;
  private maxRetries = 5;
  private retryTimeouts: ReturnType<typeof setTimeout>[] = [];
  private realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isInitialSync = true;

  static getInstance(): TeamSyncService {
    // Store on globalThis to survive HMR (edge case E5-15)
    const g = globalThis as Record<string, unknown>;
    if (!g.__teamSyncService) {
      g.__teamSyncService = new TeamSyncService();
    }
    return g.__teamSyncService as TeamSyncService;
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  initialize(teamId: string, userId: string, userName: string): void {
    // Stop existing instance first (edge case E5-17)
    this.stop();

    this.teamId = teamId;
    this.userId = userId;
    this.userName = userName;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[TeamSync] Supabase not configured — sync disabled');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.status.isConnected = true;
    this.status.error = null;
    this.retryCount = 0;
    this.isInitialSync = true;

    // Ensure local team_sync_log table exists in johnny5.db
    this.ensureSyncLogTable();

    // Subscribe to Realtime for instant pull notifications
    this.subscribeToRealtime();

    // Start poll interval (callers should trigger initial sync via syncCycle())
    const intervalMs = parseInt(process.env.TEAM_SYNC_INTERVAL_MS || '30000', 10);
    this.pollInterval = setInterval(() => this.syncCycle(), intervalMs);

    console.log(`[TeamSync] Initialized for team=${teamId} user=${userId}`);
  }

  stop(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.realtimeDebounceTimer) clearTimeout(this.realtimeDebounceTimer);
    for (const timeout of this.retryTimeouts) clearTimeout(timeout);
    this.retryTimeouts = [];

    if (this.realtimeChannel && this.supabase) {
      this.supabase.removeChannel(this.realtimeChannel);
    }
    this.realtimeChannel = null;
    this.pollInterval = null;
    this.supabase = null;
    this.status.isConnected = false;
    this.status.error = null;
    this.teamId = null;

    console.log('[TeamSync] Stopped');
  }

  // --------------------------------------------------------------------------
  // Public accessors
  // --------------------------------------------------------------------------

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  getNewKnowledgeSummary(): { count: number; contributorName: string | null } {
    try {
      const db = this.getJohnny5Db();
      if (!db) return { count: 0, contributorName: null };

      const tableCheck = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='team_sync_log'"
      ).get();
      if (!tableCheck) return { count: 0, contributorName: null };

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const row = db.prepare(`
        SELECT COUNT(*) as count, synced_by as contributor
        FROM team_sync_log
        WHERE direction = 'pull' AND synced_at > ?
        GROUP BY synced_by
        ORDER BY count DESC
        LIMIT 1
      `).get(since) as { count: number; contributor: string } | undefined;

      return {
        count: row?.count ?? 0,
        contributorName: row?.contributor ?? null,
      };
    } catch {
      return { count: 0, contributorName: null };
    }
  }

  // --------------------------------------------------------------------------
  // Internal: DB helpers
  // --------------------------------------------------------------------------

  private getJohnny5Db() {
    try {
      // Dynamic require to avoid circular imports at module load time
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getDb } = require('@/lib/johnny5-db');
      return getDb();
    } catch (err) {
      console.warn('[TeamSync] Could not access johnny5.db:', err);
      return null;
    }
  }

  private ensureSyncLogTable(): void {
    const db = this.getJohnny5Db();
    if (!db) return;

    db.exec(`
      CREATE TABLE IF NOT EXISTS team_sync_log (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        record_id TEXT NOT NULL,
        source_table TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        direction TEXT NOT NULL CHECK(direction IN ('push', 'pull')),
        synced_by TEXT,
        synced_at TEXT DEFAULT (datetime('now')),
        UNIQUE(team_id, content_hash, direction)
      );

      CREATE INDEX IF NOT EXISTS idx_tsl_team_hash
        ON team_sync_log(team_id, content_hash);
      CREATE INDEX IF NOT EXISTS idx_tsl_synced_at
        ON team_sync_log(synced_at);
    `);
  }

  // --------------------------------------------------------------------------
  // Hashing utilities
  // --------------------------------------------------------------------------

  private normalizeForHash(text: string): string {
    return text
      .normalize('NFC')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  private generateContentHash(content: string): string {
    const normalized = this.normalizeForHash(content);
    return createHash('sha256').update(normalized).digest('hex');
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  private validatePulledRow(row: TeamKnowledgeRow): { valid: boolean; reason?: string } {
    // Check source_table
    if (!VALID_SOURCE_TABLES.includes(row.source_table as SourceTable)) {
      return { valid: false, reason: `Invalid source_table: ${row.source_table}` };
    }

    // Check content_hash
    if (!row.content_hash || typeof row.content_hash !== 'string' || row.content_hash.trim() === '') {
      return { valid: false, reason: 'Empty content_hash' };
    }

    // Check contributed_by
    if (!row.contributed_by || typeof row.contributed_by !== 'string' || row.contributed_by.trim() === '') {
      return { valid: false, reason: 'Empty contributed_by' };
    }

    const data = row.data;
    if (!data || typeof data !== 'object') {
      return { valid: false, reason: 'Missing or invalid data object' };
    }

    // Per-table validation
    switch (row.source_table) {
      case 'extracted_facts': {
        if (!data.fact_key || typeof data.fact_key !== 'string' || (data.fact_key as string).trim() === '') {
          return { valid: false, reason: 'extracted_facts: missing fact_key' };
        }
        if (!data.fact_value || typeof data.fact_value !== 'string' || (data.fact_value as string).trim() === '') {
          return { valid: false, reason: 'extracted_facts: missing fact_value' };
        }
        if (typeof data.fact_type !== 'string') {
          return { valid: false, reason: 'extracted_facts: missing fact_type' };
        }
        if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
          return { valid: false, reason: 'extracted_facts: invalid confidence' };
        }
        // Enforce max lengths
        if ((data.fact_key as string).length > 500) {
          return { valid: false, reason: 'extracted_facts: fact_key too long' };
        }
        if ((data.fact_value as string).length > 5000) {
          return { valid: false, reason: 'extracted_facts: fact_value too long' };
        }
        break;
      }
      case 'learned_patterns': {
        if (typeof data.pattern_type !== 'string') {
          return { valid: false, reason: 'learned_patterns: missing pattern_type' };
        }
        if (!data.pattern_description || typeof data.pattern_description !== 'string' || (data.pattern_description as string).trim() === '') {
          return { valid: false, reason: 'learned_patterns: missing pattern_description' };
        }
        if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
          return { valid: false, reason: 'learned_patterns: invalid confidence' };
        }
        if ((data.pattern_description as string).length > 5000) {
          return { valid: false, reason: 'learned_patterns: pattern_description too long' };
        }
        break;
      }
      case 'memory_chunks': {
        if (!data.content || typeof data.content !== 'string' || (data.content as string).trim() === '') {
          return { valid: false, reason: 'memory_chunks: missing content' };
        }
        if ((data.content as string).length > 10000) {
          return { valid: false, reason: 'memory_chunks: content exceeds 10000 chars' };
        }
        if (typeof data.source_type !== 'string') {
          return { valid: false, reason: 'memory_chunks: missing source_type' };
        }
        break;
      }
    }

    return { valid: true };
  }

  // --------------------------------------------------------------------------
  // Push: Local -> Supabase
  // --------------------------------------------------------------------------

  private async pushChanges(): Promise<void> {
    if (!this.supabase || !this.teamId || !this.userId) return;

    const db = this.getJohnny5Db();
    if (!db) return;

    // Ensure sync log table exists
    const tableCheck = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='team_sync_log'"
    ).get();
    if (!tableCheck) {
      this.ensureSyncLogTable();
    }

    let pushed = 0;

    for (const table of VALID_SOURCE_TABLES) {
      let rows: Record<string, unknown>[];
      try {
        rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
      } catch {
        // Table may not exist
        continue;
      }

      // Process in batches of BATCH_SIZE (E5-1)
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        for (const row of batch) {
          try {
            // Compute content hash
            let contentForHash: string;
            if (table === 'extracted_facts') {
              contentForHash = `${row.fact_key}:${row.fact_value}`;
            } else if (table === 'learned_patterns') {
              contentForHash = `${row.pattern_type}:${row.pattern_description}`;
            } else {
              contentForHash = row.content as string;
            }

            const contentHash = this.generateContentHash(contentForHash);

            // Check if already synced
            const alreadySynced = db.prepare(
              'SELECT id FROM team_sync_log WHERE team_id = ? AND content_hash = ? AND direction = ?'
            ).get(this.teamId, contentHash, 'push');

            if (alreadySynced) continue;

            // Build data payload
            const data: Record<string, unknown> = {};
            if (table === 'extracted_facts') {
              data.fact_key = row.fact_key;
              data.fact_value = row.fact_value;
              data.fact_type = row.fact_type;
              data.confidence = row.confidence;
            } else if (table === 'learned_patterns') {
              data.pattern_type = row.pattern_type;
              data.pattern_description = row.pattern_description;
              data.confidence = row.confidence;
              data.evidence_count = row.evidence_count;
            } else {
              data.content = row.content;
              data.source_type = row.source_type;
              data.source_id = row.source_id;
              data.content_hash = row.content_hash;
              data.heading = row.heading;
              data.section_type = row.section_type;
            }

            // Validate push data size < 50KB (E4-2)
            const dataStr = JSON.stringify(data);
            if (Buffer.byteLength(dataStr, 'utf8') > MAX_PUSH_ROW_SIZE_BYTES) {
              console.warn(`[TeamSync] Skipping oversized row in ${table}: ${(row.id as string).slice(0, 8)}...`);
              continue;
            }

            // Upsert to Supabase with ON CONFLICT handling (E5-13, E5-14)
            const { error } = await this.supabase
              .from('team_knowledge')
              .upsert({
                team_id: this.teamId,
                source_table: table,
                source_id: row.id as string,
                content_hash: contentHash,
                data,
                contributed_by: this.userId,
                contributed_by_name: this.userName,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'team_id,source_table,content_hash',
              });

            if (error) {
              console.warn(`[TeamSync] Push error for ${table}:`, error.message);
              continue;
            }

            // Record in team_sync_log
            const { randomUUID } = require('crypto');
            db.prepare(`
              INSERT OR IGNORE INTO team_sync_log (id, team_id, record_id, source_table, content_hash, direction, synced_by, synced_at)
              VALUES (?, ?, ?, ?, ?, 'push', ?, datetime('now'))
            `).run(randomUUID(), this.teamId, row.id as string, table, contentHash, this.userId);

            pushed++;
          } catch (err) {
            console.warn(`[TeamSync] Push row error:`, err);
          }
        }

        // Yield between batches to avoid blocking the event loop (E5-1)
        if (i + BATCH_SIZE < rows.length) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    }

    // Clean up sync_log older than 7 days (E1-6)
    try {
      const cutoff = new Date(Date.now() - SYNC_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      db.prepare('DELETE FROM team_sync_log WHERE synced_at < ?').run(cutoff);
    } catch {
      // Cleanup is best-effort
    }

    if (pushed > 0) {
      console.log(`[TeamSync] Pushed ${pushed} items to Supabase`);
    }
    this.status.lastPushAt = new Date().toISOString();
  }

  // --------------------------------------------------------------------------
  // Pull: Supabase -> Local
  // --------------------------------------------------------------------------

  private async pullChanges(): Promise<void> {
    if (!this.supabase || !this.teamId || !this.userId) return;

    const db = this.getJohnny5Db();
    if (!db) return;

    let totalPulled = 0;
    let skipped = 0;
    let from = 0;

    // Paginate through Supabase results (E5-4)
    while (true) {
      let query = this.supabase
        .from('team_knowledge')
        .select('*')
        .eq('team_id', this.teamId)
        .eq('is_active', true)
        .neq('contributed_by', this.userId) // Don't pull own changes
        .order('updated_at', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      // Only pull changes since last sync if we have a lastSyncTime
      if (this.lastSyncTime) {
        query = query.gt('updated_at', this.lastSyncTime);
      }

      const { data: rows, error } = await query;

      if (error) {
        console.warn('[TeamSync] Pull error:', error.message);
        break;
      }

      if (!rows || rows.length === 0) break;

      // Process pulled rows in a transaction (E5-9)
      const insertRows: TeamKnowledgeRow[] = [];
      for (const row of rows as TeamKnowledgeRow[]) {
        const validation = this.validatePulledRow(row);
        if (!validation.valid) {
          console.warn(`[TeamSync] Skipping invalid row ${row.id}: ${validation.reason}`);
          skipped++;
          continue;
        }

        // Check if already pulled
        const alreadyPulled = db.prepare(
          'SELECT id FROM team_sync_log WHERE team_id = ? AND content_hash = ? AND direction = ?'
        ).get(this.teamId, row.content_hash, 'pull');

        if (alreadyPulled) {
          skipped++;
          continue;
        }

        insertRows.push(row);
      }

      // Batch insert into local DB using transaction (E5-9)
      if (insertRows.length > 0) {
        const transaction = db.transaction(() => {
          for (const row of insertRows) {
            try {
              this.insertPulledRow(db, row);
              totalPulled++;
            } catch (err) {
              console.warn(`[TeamSync] Failed to insert pulled row ${row.id}:`, err);
              skipped++;
            }
          }
        });
        transaction();
      }

      // If we got fewer results than page size, we're done
      if (rows.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    this.status.skippedCount = skipped;
    this.status.lastPullAt = new Date().toISOString();
    this.lastSyncTime = new Date().toISOString();

    if (totalPulled > 0) {
      console.log(`[TeamSync] Pulled ${totalPulled} items from Supabase (skipped ${skipped})`);
    }

    // After initial sync completes, mark it done (E6-6)
    if (this.isInitialSync) {
      this.isInitialSync = false;
    }
  }

  // Valid types for CHECK constraints in local johnny5.db tables (E5-7)
  private static readonly VALID_FACT_TYPES = ['personal', 'preference', 'project', 'technical', 'goal'];
  private static readonly VALID_PATTERN_TYPES = ['workflow', 'coding_style', 'preference', 'time_pattern', 'communication'];

  private insertPulledRow(db: ReturnType<typeof this.getJohnny5Db>, row: TeamKnowledgeRow): void {
    if (!db || !this.teamId) return;

    const { randomUUID } = require('crypto');
    const data = row.data;
    const localId = randomUUID();
    const contributorName = row.contributed_by_name || row.contributed_by;

    switch (row.source_table) {
      case 'extracted_facts': {
        // Map unknown fact_type to 'project' to satisfy CHECK constraint (E5-7)
        const factType = TeamSyncService.VALID_FACT_TYPES.includes(data.fact_type as string)
          ? data.fact_type as string
          : 'project';

        // Use INSERT OR IGNORE to avoid duplicates on fact_key
        db.prepare(`
          INSERT OR IGNORE INTO extracted_facts
            (id, session_id, fact_type, fact_key, fact_value, confidence, created_at, last_referenced, reference_count)
          VALUES (?, NULL, ?, ?, ?, ?, datetime('now'), datetime('now'), 0)
        `).run(
          localId,
          factType,
          data.fact_key as string,
          data.fact_value as string,
          data.confidence as number
        );
        break;
      }
      case 'learned_patterns': {
        // Map unknown pattern_type to 'workflow' to satisfy CHECK constraint (E5-7)
        const patternType = TeamSyncService.VALID_PATTERN_TYPES.includes(data.pattern_type as string)
          ? data.pattern_type as string
          : 'workflow';

        db.prepare(`
          INSERT OR IGNORE INTO learned_patterns
            (id, pattern_type, pattern_description, evidence_count, first_observed, last_observed, confidence)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?)
        `).run(
          localId,
          patternType,
          data.pattern_description as string,
          (data.evidence_count as number) || 1,
          data.confidence as number
        );
        break;
      }
      case 'memory_chunks': {
        // Use synthetic source_id for team content (E5-8)
        const syntheticSourceId = `team:${this.teamId}:${row.source_id}`;
        const contentHash = (data.content_hash as string) || this.generateContentHash(data.content as string);

        db.prepare(`
          INSERT OR IGNORE INTO memory_chunks
            (id, source_type, source_id, content, content_hash, heading, section_type, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          localId,
          data.source_type as string,
          syntheticSourceId,
          data.content as string,
          contentHash,
          (data.heading as string) || null,
          (data.section_type as string) || null
        );
        break;
      }
    }

    // Record in team_sync_log
    db.prepare(`
      INSERT OR IGNORE INTO team_sync_log
        (id, team_id, record_id, source_table, content_hash, direction, synced_by, synced_at)
      VALUES (?, ?, ?, ?, ?, 'pull', ?, datetime('now'))
    `).run(randomUUID(), this.teamId, localId, row.source_table, row.content_hash, contributorName);
  }

  // --------------------------------------------------------------------------
  // Realtime subscription
  // --------------------------------------------------------------------------

  private subscribeToRealtime(): void {
    if (!this.supabase || !this.teamId) return;

    this.realtimeChannel = this.supabase
      .channel(`team-knowledge-${this.teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_knowledge',
          filter: `team_id=eq.${this.teamId}`,
        },
        () => {
          // Debounce: collapse multiple events into a single pullChanges() (E5-10)
          if (this.realtimeDebounceTimer) clearTimeout(this.realtimeDebounceTimer);
          this.realtimeDebounceTimer = setTimeout(() => {
            console.log('[TeamSync] Realtime event received — triggering pull');
            this.pullChanges().catch(err =>
              console.warn('[TeamSync] Realtime pull error:', err)
            );
          }, REALTIME_DEBOUNCE_MS);
        }
      )
      .subscribe((status) => {
        console.log(`[TeamSync] Realtime status: ${status}`);
      });
  }

  // --------------------------------------------------------------------------
  // Sync cycle
  // --------------------------------------------------------------------------

  async syncCycle(): Promise<void> {
    // Mutex: skip if already running (E5-2)
    if (this.isSyncing) {
      console.log('[TeamSync] Sync already in progress — skipping');
      return;
    }

    if (!this.supabase || !this.teamId) return;

    this.isSyncing = true;
    this.status.isSyncing = true;

    try {
      await this.pushChanges();
      await this.pullChanges();

      // Reset retry count on success
      this.retryCount = 0;
      this.status.error = null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[TeamSync] Sync cycle error:', message);
      this.status.error = message;

      // Exponential backoff with max retries (E5-11)
      this.retryCount++;
      if (this.retryCount >= this.maxRetries) {
        console.warn(`[TeamSync] Max retries (${this.maxRetries}) reached — pausing sync`);
        if (this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
        }
      } else {
        const backoffMs = Math.min(1000 * Math.pow(2, this.retryCount - 1), 60000);
        console.log(`[TeamSync] Retry ${this.retryCount}/${this.maxRetries} in ${backoffMs}ms`);
        const timeout = setTimeout(() => this.syncCycle(), backoffMs);
        this.retryTimeouts.push(timeout);
      }
    } finally {
      this.isSyncing = false;
      this.status.isSyncing = false;
    }
  }
}

// ============================================================================
// Export
// ============================================================================

export function getTeamSyncService(): TeamSyncService {
  return TeamSyncService.getInstance();
}
