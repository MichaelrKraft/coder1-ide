'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { TeamPermissionGate } from '@/components/shared/TeamPermissionGate';
import { AgentPermissionBadge } from './AgentPermissionBadge';
import type { AgentTemplateAssetData } from '@/types/agent-marketplace';
import type { TeamRole } from '@/lib/team-permission';

// ============================================================================
// Types
// ============================================================================

interface AgentActivatedListProps {
  teamId: string | null;
  userRole?: TeamRole | null;
}

// ============================================================================
// Component
// ============================================================================

export function AgentActivatedList({
  teamId,
  userRole = null,
}: AgentActivatedListProps): React.ReactElement {
  const [agents, setAgents] = useState<AgentTemplateAssetData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!teamId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/agent-marketplace/team-agents?teamId=${encodeURIComponent(teamId)}`
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { agents: AgentTemplateAssetData[] };
      setAgents(data.agents.filter((a) => a.isEnabled));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleRemove = useCallback(
    async (templateId: string) => {
      if (!teamId) return;
      setRemovingId(templateId);
      try {
        const res = await fetch(
          `/api/agent-marketplace/activate/${encodeURIComponent(templateId)}?teamId=${encodeURIComponent(teamId)}`,
          { method: 'DELETE' }
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        setAgents((prev) => prev.filter((a) => a.templateId !== templateId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove agent');
      } finally {
        setRemovingId(null);
      }
    },
    [teamId]
  );

  if (!teamId) {
    return (
      <div className="p-4 text-xs text-text-muted">
        No team selected. Agents are team-scoped.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-xs text-text-muted">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading activated agents…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-xs text-red-400">{error}</div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="p-4 text-xs text-text-muted">
        No agents activated yet. Open the Agent Marketplace to add agents.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {agents.map((agent) => (
        <div
          key={agent.templateId}
          className="flex items-center justify-between gap-2 p-2.5 bg-bg-tertiary rounded border border-border-default"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: agent.agentConfig.color }}
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-text-primary truncate">
              {agent.agentConfig.name}
            </span>
            <AgentPermissionBadge level={agent.permissionLevel} />
          </div>

          <TeamPermissionGate requiredRole="admin" userRole={userRole}>
            <button
              onClick={() => handleRemove(agent.templateId)}
              disabled={removingId === agent.templateId}
              className="p-1 rounded text-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
              title="Remove agent"
            >
              {removingId === agent.templateId ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          </TeamPermissionGate>
        </div>
      ))}
    </div>
  );
}
