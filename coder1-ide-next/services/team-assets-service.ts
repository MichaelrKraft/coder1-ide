/**
 * Team Assets Service
 *
 * Server-side singleton service for reading and writing team-scoped
 * collaboration assets (slash commands, CLAUDE.md versions, agent templates,
 * onboarding progress) stored in Supabase.
 *
 * Follows the singleton pattern from services/team-sync-service.ts.
 */

import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export type AssetType =
  | 'slash_command'
  | 'claude_md_version'
  | 'agent_template'
  | 'onboarding_progress';

export interface TeamAsset<T = unknown> {
  id: string;
  teamId: string;
  assetType: AssetType;
  assetKey: string;
  data: T;
  createdBy: string;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  version: number;
  isDeleted: boolean;
  contentHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertTeamAssetParams<T = unknown> {
  teamId: string;
  assetType: AssetType;
  assetKey: string;
  data: T;
  createdBy: string;
  createdByName?: string;
  contentHash?: string;
}

// Row shape returned from Supabase (snake_case)
interface TeamAssetRow {
  id: string;
  team_id: string;
  asset_type: string;
  asset_key: string;
  data: unknown;
  created_by: string;
  created_by_name: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
  version: number;
  is_deleted: boolean;
  content_hash: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TeamAssetsService
// ============================================================================

class TeamAssetsService {
  private supabase: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (this.supabase) return this.supabase;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error('[TeamAssets] Supabase not configured: missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    }

    this.supabase = createClient(url, key);
    return this.supabase;
  }

  private mapRow<T>(row: TeamAssetRow): TeamAsset<T> {
    return {
      id: row.id,
      teamId: row.team_id,
      assetType: row.asset_type as AssetType,
      assetKey: row.asset_key,
      data: row.data as T,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      updatedBy: row.updated_by,
      updatedByName: row.updated_by_name,
      version: row.version,
      isDeleted: row.is_deleted,
      contentHash: row.content_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Upsert a team asset. If the asset_key already exists for (team_id, asset_type),
   * updates the data and increments the version counter.
   */
  async upsert<T>(params: UpsertTeamAssetParams<T>): Promise<TeamAsset<T>> {
    const client = this.getClient();
    const now = new Date().toISOString();

    const { data, error } = await client
      .from('team_assets')
      .upsert(
        {
          team_id: params.teamId,
          asset_type: params.assetType,
          asset_key: params.assetKey,
          data: params.data,
          created_by: params.createdBy,
          created_by_name: params.createdByName ?? null,
          updated_by: params.createdBy,
          updated_by_name: params.createdByName ?? null,
          content_hash: params.contentHash ?? null,
          updated_at: now,
          version: 1, // Supabase will merge; handled via DB trigger or increment below
        },
        {
          onConflict: 'team_id,asset_type,asset_key',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`[TeamAssets] upsert failed: ${error.message}`);
    }

    return this.mapRow<T>(data as TeamAssetRow);
  }

  /**
   * List all non-deleted assets for a team + asset type.
   */
  async list<T>(teamId: string, assetType: AssetType): Promise<TeamAsset<T>[]> {
    const client = this.getClient();

    const { data, error } = await client
      .from('team_assets')
      .select('*')
      .eq('team_id', teamId)
      .eq('asset_type', assetType)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`[TeamAssets] list failed: ${error.message}`);
    }

    return (data as TeamAssetRow[]).map((row) => this.mapRow<T>(row));
  }

  /**
   * Get a single asset by its unique key within a team + asset type.
   * Returns null if not found or soft-deleted.
   */
  async getByKey<T>(
    teamId: string,
    assetType: AssetType,
    assetKey: string
  ): Promise<TeamAsset<T> | null> {
    const client = this.getClient();

    const { data, error } = await client
      .from('team_assets')
      .select('*')
      .eq('team_id', teamId)
      .eq('asset_type', assetType)
      .eq('asset_key', assetKey)
      .eq('is_deleted', false)
      .single();

    if (error) {
      // PGRST116 = no rows found
      if (error.code === 'PGRST116') return null;
      throw new Error(`[TeamAssets] getByKey failed: ${error.message}`);
    }

    return this.mapRow<T>(data as TeamAssetRow);
  }

  /**
   * Soft-delete an asset by setting is_deleted=true and recording who deleted it.
   * Returns true if a row was updated.
   */
  async softDelete(
    teamId: string,
    assetType: AssetType,
    assetKey: string,
    deletedBy: string
  ): Promise<boolean> {
    const client = this.getClient();
    const now = new Date().toISOString();

    const { data, error } = await client
      .from('team_assets')
      .update({
        is_deleted: true,
        updated_by: deletedBy,
        updated_at: now,
      })
      .eq('team_id', teamId)
      .eq('asset_type', assetType)
      .eq('asset_key', assetKey)
      .select('id');

    if (error) {
      throw new Error(`[TeamAssets] softDelete failed: ${error.message}`);
    }

    return Array.isArray(data) && data.length > 0;
  }

  /**
   * Permanently delete an asset row from the database.
   * Returns true if a row was deleted.
   */
  async hardDelete(
    teamId: string,
    assetType: AssetType,
    assetKey: string
  ): Promise<boolean> {
    const client = this.getClient();

    const { data, error } = await client
      .from('team_assets')
      .delete()
      .eq('team_id', teamId)
      .eq('asset_type', assetType)
      .eq('asset_key', assetKey)
      .select('id');

    if (error) {
      throw new Error(`[TeamAssets] hardDelete failed: ${error.message}`);
    }

    return Array.isArray(data) && data.length > 0;
  }
}

// ============================================================================
// Singleton export
// ============================================================================

// Store on globalThis to survive HMR (same pattern as team-sync-service.ts)
const g = globalThis as Record<string, unknown>;
if (!g.__teamAssetsService) {
  g.__teamAssetsService = new TeamAssetsService();
}

export const teamAssetsService = g.__teamAssetsService as TeamAssetsService;
