'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TeamAsset, AssetType } from '@/services/team-assets-service';

// Re-export types so consumers don't need to import from service directly
export type { TeamAsset, AssetType };

// ============================================================================
// Types
// ============================================================================

interface UseTeamAssetsOptions {
  teamId: string | null;
  assetType: AssetType;
  /** Set false to skip the initial fetch and disable polling. Default: true */
  enabled?: boolean;
  /** Polling interval in ms. Default 0 (no polling — use realtime instead) */
  pollIntervalMs?: number;
}

interface UseTeamAssetsReturn<T> {
  assets: TeamAsset<T>[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  upsert: (
    assetKey: string,
    data: T,
    meta?: { createdByName?: string; contentHash?: string }
  ) => Promise<TeamAsset<T> | null>;
  remove: (assetKey: string) => Promise<boolean>;
}

// ============================================================================
// Hook
// ============================================================================

export function useTeamAssets<T = unknown>(
  options: UseTeamAssetsOptions
): UseTeamAssetsReturn<T> {
  const { teamId, assetType, enabled = true, pollIntervalMs = 0 } = options;

  const [assets, setAssets] = useState<TeamAsset<T>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref to avoid stale closures in the interval
  const teamIdRef = useRef(teamId);
  const assetTypeRef = useRef(assetType);
  teamIdRef.current = teamId;
  assetTypeRef.current = assetType;

  // --------------------------------------------------------------------------
  // Fetch
  // --------------------------------------------------------------------------

  const fetchAssets = useCallback(async (): Promise<void> => {
    const currentTeamId = teamIdRef.current;
    if (!currentTeamId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        teamId: currentTeamId,
        assetType: assetTypeRef.current,
      });
      const res = await fetch(`/api/team-assets?${params.toString()}`);

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const body = (await res.json()) as { assets: TeamAsset<T>[] };
      setAssets(body.assets);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch assets';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  // --------------------------------------------------------------------------
  // Initial fetch + optional polling
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!enabled || !teamId) return;

    fetchAssets();

    if (pollIntervalMs > 0) {
      const id = setInterval(fetchAssets, pollIntervalMs);
      return () => clearInterval(id);
    }
  }, [teamId, assetType, enabled, pollIntervalMs, fetchAssets]);

  // --------------------------------------------------------------------------
  // Upsert
  // --------------------------------------------------------------------------

  const upsert = useCallback(
    async (
      assetKey: string,
      data: T,
      meta?: { createdByName?: string; contentHash?: string }
    ): Promise<TeamAsset<T> | null> => {
      if (!teamId) return null;

      try {
        const res = await fetch('/api/team-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId,
            assetType,
            assetKey,
            data,
            createdBy: 'client', // callers can override via meta or extend later
            ...meta,
          }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }

        const body = (await res.json()) as { asset: TeamAsset<T> };

        // Optimistically update local state
        setAssets((prev) => {
          const index = prev.findIndex((a) => a.assetKey === assetKey);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = body.asset;
            return updated;
          }
          return [body.asset, ...prev];
        });

        return body.asset;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upsert asset';
        setError(message);
        return null;
      }
    },
    [teamId, assetType]
  );

  // --------------------------------------------------------------------------
  // Remove (soft-delete)
  // --------------------------------------------------------------------------

  const remove = useCallback(
    async (assetKey: string): Promise<boolean> => {
      if (!teamId) return false;

      try {
        const params = new URLSearchParams({ teamId, assetType, assetKey });
        const res = await fetch(`/api/team-assets?${params.toString()}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }

        // Optimistically remove from local state
        setAssets((prev) => prev.filter((a) => a.assetKey !== assetKey));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove asset';
        setError(message);
        return false;
      }
    },
    [teamId, assetType]
  );

  // --------------------------------------------------------------------------

  return {
    assets,
    isLoading,
    error,
    refresh: fetchAssets,
    upsert,
    remove,
  };
}
