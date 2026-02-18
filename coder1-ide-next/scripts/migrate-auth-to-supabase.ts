#!/usr/bin/env npx ts-node
/**
 * Auth Migration Script: SQLite → Supabase PostgreSQL
 *
 * This script migrates all auth data from the local SQLite database
 * to Supabase PostgreSQL for persistent storage.
 *
 * Features:
 * - UUID format conversion (32 hex → 36 with hyphens)
 * - Timestamp format conversion (SQLite → ISO 8601)
 * - Upsert for idempotent re-runs
 * - Row count verification
 * - Detailed progress logging
 *
 * Usage:
 *   npx ts-node scripts/migrate-auth-to-supabase.ts
 *
 * Environment:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Supabase service role key (NOT anon key)
 */

import Database from 'better-sqlite3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

// =============================================
// Configuration
// =============================================

const SQLITE_PATH = path.join(__dirname, '..', 'data', 'auth.db');
const TABLES = [
  'users',
  'auth_sessions',
  'projects',
  'oauth_accounts',
  'password_resets',
  'email_verifications',
  'usage_metrics',
  'teams',
  'team_members',
  'team_invitations',
  'team_sync_log',
] as const;

// =============================================
// Helpers
// =============================================

/**
 * Convert SQLite 32-char hex UUID to PostgreSQL 36-char UUID with hyphens
 * Example: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6 → a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6
 */
function convertUuid(sqliteUuid: string | null): string | null {
  if (!sqliteUuid) return null;

  // If already has hyphens, return as-is
  if (sqliteUuid.includes('-')) return sqliteUuid;

  // Remove any existing hyphens and validate length
  const hex = sqliteUuid.replace(/-/g, '');
  if (hex.length !== 32) {
    console.warn(`⚠️ Invalid UUID length (${hex.length}): ${sqliteUuid}`);
    return sqliteUuid; // Return original, let Supabase handle it
  }

  // Insert hyphens at correct positions: 8-4-4-4-12
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Convert SQLite datetime to ISO 8601 for PostgreSQL TIMESTAMPTZ
 * SQLite format: "2025-02-17 10:30:00" or already ISO "2025-02-17T10:30:00.000Z"
 */
function convertTimestamp(sqliteTs: string | null): string | null {
  if (!sqliteTs) return null;

  // If already ISO format, return as-is
  if (sqliteTs.includes('T')) return sqliteTs;

  // Convert "YYYY-MM-DD HH:MM:SS" to ISO
  try {
    const date = new Date(sqliteTs.replace(' ', 'T') + 'Z');
    return date.toISOString();
  } catch {
    console.warn(`⚠️ Failed to parse timestamp: ${sqliteTs}`);
    return sqliteTs;
  }
}

/**
 * Convert boolean from SQLite (0/1) to PostgreSQL (true/false)
 */
function convertBoolean(value: number | boolean | null): boolean {
  if (value === null || value === undefined) return false;
  return value === 1 || value === true;
}

// =============================================
// Table-specific transformers
// =============================================

type RowTransformer = (row: Record<string, unknown>) => Record<string, unknown>;

const transformers: Record<string, RowTransformer> = {
  users: (row) => ({
    id: convertUuid(row.id as string),
    email: row.email,
    username: row.username,
    password_hash: row.password_hash,
    subscription_tier: row.subscription_tier || 'free',
    subscription_status: row.subscription_status || 'active',
    stripe_customer_id: row.stripe_customer_id,
    email_verified: convertBoolean(row.email_verified as number),
    claude_subscription_tier: row.claude_subscription_tier || 'free',
    coder1_pro_active: convertBoolean(row.coder1_pro_active as number),
    johnny5_message_count: row.johnny5_message_count || 0,
    message_count_reset_at: convertTimestamp(row.message_count_reset_at as string) || new Date().toISOString(),
    created_at: convertTimestamp(row.created_at as string),
    updated_at: convertTimestamp(row.updated_at as string),
    last_login: convertTimestamp(row.last_login as string),
  }),

  auth_sessions: (row) => ({
    id: convertUuid(row.id as string),
    user_id: convertUuid(row.user_id as string),
    token: row.token,
    refresh_token: row.refresh_token,
    expires_at: convertTimestamp(row.expires_at as string),
    created_at: convertTimestamp(row.created_at as string),
    last_used: convertTimestamp(row.last_used as string),
    user_agent: row.user_agent,
    ip_address: row.ip_address,
  }),

  projects: (row) => ({
    id: convertUuid(row.id as string),
    user_id: convertUuid(row.user_id as string),
    name: row.name,
    description: row.description,
    files_data: row.files_data,
    thumbnail: row.thumbnail,
    is_public: convertBoolean(row.is_public as number),
    last_opened: convertTimestamp(row.last_opened as string),
    created_at: convertTimestamp(row.created_at as string),
    updated_at: convertTimestamp(row.updated_at as string),
  }),

  oauth_accounts: (row) => ({
    id: convertUuid(row.id as string),
    user_id: convertUuid(row.user_id as string),
    provider: row.provider,
    provider_account_id: row.provider_account_id,
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: convertTimestamp(row.expires_at as string),
    token_type: row.token_type,
    scope: row.scope,
    id_token: row.id_token,
    session_state: row.session_state,
    created_at: convertTimestamp(row.created_at as string),
    updated_at: convertTimestamp(row.updated_at as string),
  }),

  password_resets: (row) => ({
    id: convertUuid(row.id as string),
    user_id: convertUuid(row.user_id as string),
    token: row.token,
    expires_at: convertTimestamp(row.expires_at as string),
    used: convertBoolean(row.used as number),
    created_at: convertTimestamp(row.created_at as string),
  }),

  email_verifications: (row) => ({
    id: convertUuid(row.id as string),
    user_id: convertUuid(row.user_id as string),
    token: row.token,
    expires_at: convertTimestamp(row.expires_at as string),
    verified_at: convertTimestamp(row.verified_at as string),
    created_at: convertTimestamp(row.created_at as string),
  }),

  usage_metrics: (row) => ({
    id: convertUuid(row.id as string),
    user_id: convertUuid(row.user_id as string),
    action_type: row.action_type,
    action_details: row.action_details,
    timestamp: convertTimestamp(row.timestamp as string),
  }),

  teams: (row) => ({
    id: convertUuid(row.id as string),
    name: row.name,
    slug: row.slug,
    owner_id: convertUuid(row.owner_id as string),
    created_at: convertTimestamp(row.created_at as string),
    updated_at: convertTimestamp(row.updated_at as string),
  }),

  team_members: (row) => ({
    id: convertUuid(row.id as string),
    team_id: convertUuid(row.team_id as string),
    user_id: convertUuid(row.user_id as string),
    role: row.role || 'member',
    joined_at: convertTimestamp(row.joined_at as string),
  }),

  team_invitations: (row) => ({
    id: convertUuid(row.id as string),
    team_id: convertUuid(row.team_id as string),
    email: row.email,
    invited_by: convertUuid(row.invited_by as string),
    token: row.token,
    status: row.status || 'pending',
    expires_at: convertTimestamp(row.expires_at as string),
    created_at: convertTimestamp(row.created_at as string),
  }),

  team_sync_log: (row) => ({
    id: convertUuid(row.id as string),
    team_id: convertUuid(row.team_id as string),
    direction: row.direction,
    table_name: row.table_name,
    record_id: row.record_id,
    content_hash: row.content_hash,
    synced_at: convertTimestamp(row.synced_at as string),
    synced_by: row.synced_by,
  }),
};

// =============================================
// Migration Functions
// =============================================

interface MigrationResult {
  table: string;
  sqliteCount: number;
  supabaseCount: number;
  inserted: number;
  errors: string[];
}

async function migrateTable(
  sqlite: Database.Database,
  supabase: SupabaseClient,
  table: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    table,
    sqliteCount: 0,
    supabaseCount: 0,
    inserted: 0,
    errors: [],
  };

  try {
    // Check if table exists in SQLite
    const tableCheck = sqlite.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
    ).get(table);

    if (!tableCheck) {
      console.log(`  ⏭️  Table ${table} doesn't exist in SQLite, skipping`);
      return result;
    }

    // Read all rows from SQLite
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    result.sqliteCount = rows.length;

    if (rows.length === 0) {
      console.log(`  ⏭️  Table ${table} is empty, skipping`);
      return result;
    }

    // Transform rows
    const transformer = transformers[table];
    if (!transformer) {
      result.errors.push(`No transformer defined for table ${table}`);
      return result;
    }

    const transformedRows = rows.map(transformer);

    // Upsert in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < transformedRows.length; i += BATCH_SIZE) {
      const batch = transformedRows.slice(i, i + BATCH_SIZE);

      const { error } = await supabase
        .from(table)
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        result.errors.push(`Batch ${Math.floor(i / BATCH_SIZE)}: ${error.message}`);
        console.error(`  ❌ Batch error: ${error.message}`);
      } else {
        result.inserted += batch.length;
      }
    }

    // Verify count in Supabase
    const { count, error: countError } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      result.errors.push(`Count verification failed: ${countError.message}`);
    } else {
      result.supabaseCount = count ?? 0;
    }

  } catch (err) {
    result.errors.push(`Exception: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
}

// =============================================
// Main
// =============================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Auth Migration: SQLite → Supabase PostgreSQL');
  console.log('═══════════════════════════════════════════════════════════');
  console.log();

  // Validate environment
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables:');
    if (!supabaseUrl) console.error('   - SUPABASE_URL');
    if (!supabaseKey) console.error('   - SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  // Check SQLite database exists
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`❌ SQLite database not found: ${SQLITE_PATH}`);
    process.exit(1);
  }

  console.log(`📂 SQLite: ${SQLITE_PATH}`);
  console.log(`☁️  Supabase: ${supabaseUrl}`);
  console.log();

  // Connect to databases
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test Supabase connection
  const { error: testError } = await supabase.from('users').select('count').limit(1);
  if (testError && testError.code !== 'PGRST116') {
    console.error(`❌ Supabase connection failed: ${testError.message}`);
    console.error('   Make sure the schema has been applied first!');
    console.error('   Run: npx ts-node scripts/apply-supabase-schema.ts');
    process.exit(1);
  }

  console.log('✅ Database connections established');
  console.log();

  // Migrate each table
  const results: MigrationResult[] = [];

  for (const table of TABLES) {
    console.log(`📋 Migrating ${table}...`);
    const result = await migrateTable(sqlite, supabase, table);
    results.push(result);

    if (result.errors.length > 0) {
      console.log(`  ❌ Errors: ${result.errors.length}`);
    } else if (result.sqliteCount === 0) {
      // Already logged as skipped
    } else {
      console.log(`  ✅ ${result.inserted}/${result.sqliteCount} rows migrated`);
    }
  }

  // Close SQLite
  sqlite.close();

  // Summary
  console.log();
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Migration Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log();
  console.log('Table                  | SQLite | Supabase | Status');
  console.log('-----------------------|--------|----------|--------');

  let allSuccess = true;
  for (const r of results) {
    const status = r.errors.length > 0
      ? '❌ ERRORS'
      : r.sqliteCount === r.supabaseCount
        ? '✅ OK'
        : '⚠️ MISMATCH';

    if (r.errors.length > 0 || r.sqliteCount !== r.supabaseCount) {
      allSuccess = false;
    }

    console.log(
      `${r.table.padEnd(22)} | ${String(r.sqliteCount).padStart(6)} | ${String(r.supabaseCount).padStart(8)} | ${status}`
    );
  }

  console.log();

  // Error details
  const tablesWithErrors = results.filter(r => r.errors.length > 0);
  if (tablesWithErrors.length > 0) {
    console.log('Error Details:');
    for (const r of tablesWithErrors) {
      console.log(`  ${r.table}:`);
      for (const err of r.errors) {
        console.log(`    - ${err}`);
      }
    }
    console.log();
  }

  if (allSuccess) {
    console.log('🎉 Migration completed successfully!');
    console.log();
    console.log('Next steps:');
    console.log('  1. Set AUTH_BACKEND=supabase in environment');
    console.log('  2. Deploy to Render');
    console.log('  3. Verify login still works');
  } else {
    console.log('⚠️ Migration completed with issues. Review errors above.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
