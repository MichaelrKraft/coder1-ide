'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useTeamAssets } from '@/hooks/useTeamAssets';
import { SyncStatusBadge } from '@/components/shared/SyncStatusBadge';
import type { SyncStatus } from '@/components/shared/SyncStatusBadge';
import { CommandSearch } from './CommandSearch';
import { CommandCategoryFilter } from './CommandCategoryFilter';
import { CommandsList } from './CommandsList';
import { CommandEditor } from './CommandEditor';
import type { TeamRole } from '@/lib/team-permission';
import type {
  SlashCommand,
  SlashCommandAssetData,
  CommandCategory,
} from '@/types/slash-command';
import type { TeamAsset } from '@/hooks/useTeamAssets';

// ============================================================================
// Types
// ============================================================================

interface CommandsPanelProps {
  teamId: string | null;
  userRole?: TeamRole | null;
}

// ============================================================================
// Helpers
// ============================================================================

function assetToCommand(asset: TeamAsset<SlashCommandAssetData>): SlashCommand {
  const data = asset.data;
  return {
    id: asset.id,
    teamId: asset.teamId,
    slug: data.slug,
    name: data.name,
    description: data.description,
    content: data.content,
    category: data.category,
    scope: data.scope,
    hasArguments: data.hasArguments,
    argumentsDescription: data.argumentsDescription,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    version: asset.version,
    isInstalled: false,
    tags: data.tags ?? [],
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

// ============================================================================
// Component
// ============================================================================

export function CommandsPanel({
  teamId,
  userRole = null,
}: CommandsPanelProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CommandCategory | 'all'>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<SlashCommand | undefined>(undefined);
  const [installingSlug, setInstallingSlug] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(undefined);

  // Load assets from team-assets service
  const { assets, isLoading, refresh } = useTeamAssets<SlashCommandAssetData>({
    teamId,
    assetType: 'slash_command',
    enabled: !!teamId,
  });

  // Convert assets to SlashCommand objects, track installed state
  const [installedSlugs, setInstalledSlugs] = useState<Set<string>>(new Set());

  const allCommands = useMemo((): SlashCommand[] => {
    return assets.map((asset) => {
      const cmd = assetToCommand(asset);
      cmd.isInstalled = installedSlugs.has(cmd.slug);
      return cmd;
    });
  }, [assets, installedSlugs]);

  // Filter commands by search + category
  const filteredCommands = useMemo((): SlashCommand[] => {
    return allCommands.filter((cmd) => {
      const matchesSearch =
        !search ||
        cmd.name.toLowerCase().includes(search.toLowerCase()) ||
        cmd.description.toLowerCase().includes(search.toLowerCase()) ||
        cmd.slug.toLowerCase().includes(search.toLowerCase()) ||
        cmd.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory = categoryFilter === 'all' || cmd.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [allCommands, search, categoryFilter]);

  const teamCommands = filteredCommands.filter((c) => c.scope === 'team');
  const personalCommands = filteredCommands.filter((c) => c.scope === 'personal');

  // ---- Install single command ----
  const handleInstall = useCallback(async (command: SlashCommand) => {
    setInstallingSlug(command.slug);
    try {
      const res = await fetch('/api/commands/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId: command.slug,
          content: command.content,
          name: command.name,
        }),
      });

      if (res.ok) {
        setInstalledSlugs((prev) => new Set([...prev, command.slug]));
      }
    } catch (err) {
      console.error('[CommandsPanel] Install error:', err);
    } finally {
      setInstallingSlug(null);
    }
  }, []);

  // ---- Edit command ----
  const handleEdit = useCallback((command: SlashCommand) => {
    setEditingCommand(command);
    setEditorOpen(true);
  }, []);

  // ---- Delete command ----
  const handleDelete = useCallback(
    async (command: SlashCommand) => {
      if (!teamId) return;
      if (!window.confirm(`Delete "${command.name}"? This cannot be undone.`)) return;

      try {
        const params = new URLSearchParams({ teamId, deletedBy: 'user' });
        await fetch(`/api/commands/team/${command.slug}?${params.toString()}`, {
          method: 'DELETE',
        });
        await refresh();
      } catch (err) {
        console.error('[CommandsPanel] Delete error:', err);
      }
    },
    [teamId, refresh]
  );

  // ---- Save from editor ----
  const handleSave = useCallback(
    async (command: SlashCommand) => {
      setEditorOpen(false);
      setEditingCommand(undefined);
      await refresh();
    },
    [refresh]
  );

  // ---- Sync all ----
  const handleSyncAll = useCallback(async () => {
    if (!teamId) return;

    setSyncStatus('syncing');
    try {
      const res = await fetch(`/api/commands/sync?teamId=${encodeURIComponent(teamId)}`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = (await res.json()) as {
          installed: string[];
          skipped: string[];
          errors: string[];
        };

        setInstalledSlugs((prev) => new Set([...prev, ...data.installed]));
        setSyncStatus(data.errors.length > 0 ? 'error' : 'synced');
        setLastSyncedAt(new Date().toISOString());
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
  }, [teamId]);

  // ---- Render editor when open ----
  if (editorOpen && teamId) {
    return (
      <div className="h-full flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
          <span className="text-xs font-semibold text-text-primary">
            {editingCommand ? 'Edit Command' : 'New Command'}
          </span>
        </div>
        <CommandEditor
          initial={editingCommand}
          teamId={teamId}
          onSave={handleSave}
          onCancel={() => {
            setEditorOpen(false);
            setEditingCommand(undefined);
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar: search + new button */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <CommandSearch value={search} onChange={setSearch} />
        <button
          onClick={() => {
            setEditingCommand(undefined);
            setEditorOpen(true);
          }}
          disabled={!teamId}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-coder1-cyan/20 text-coder1-cyan border border-coder1-cyan/30 rounded text-xs font-medium hover:bg-coder1-cyan/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={!teamId ? 'Team required to create commands' : 'New command'}
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {/* Category filter */}
      <div className="px-3 pb-2">
        <CommandCategoryFilter selected={categoryFilter} onChange={setCategoryFilter} />
      </div>

      {/* Sync status bar */}
      <div className="flex items-center justify-between px-3 pb-2">
        <SyncStatusBadge status={syncStatus} lastSyncedAt={lastSyncedAt} />
        <button
          onClick={handleSyncAll}
          disabled={!teamId || syncStatus === 'syncing'}
          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
          title="Sync all team commands to ~/.claude/commands/"
        >
          <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
          Sync All
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-border-default mx-3 mb-2" />

      {/* Commands list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {!teamId ? (
          <p className="text-text-muted text-xs text-center py-8 italic">
            Connect a team to view shared commands.
          </p>
        ) : isLoading ? (
          <p className="text-text-muted text-xs text-center py-8">Loading commands…</p>
        ) : (
          <CommandsList
            teamCommands={teamCommands}
            personalCommands={personalCommands}
            onInstall={handleInstall}
            onEdit={handleEdit}
            onDelete={handleDelete}
            installingSlug={installingSlug}
            userRole={userRole}
          />
        )}
      </div>
    </div>
  );
}
