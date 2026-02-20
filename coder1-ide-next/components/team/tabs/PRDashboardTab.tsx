'use client';

import React, { useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, GitPullRequest, AlertCircle, ExternalLink } from 'lucide-react';
import { useVCSStore, getFilteredPRs } from '@/stores/useVCSStore';
import PRCard from '@/components/vcs/PRCard';
import PRFilters from '@/components/vcs/PRFilters';

interface PRDashboardTabProps {
  syncTeam: { id: string; name: string };
}

export default function PRDashboardTab({ syncTeam }: PRDashboardTabProps) {
  const isEnabled = process.env.NEXT_PUBLIC_PR_DASHBOARD_ENABLED === 'true';

  const {
    pullRequests,
    prsLoading,
    prsError,
    prsCachedAt,
    prsStale,
    prFilters,
    connectionStatus,
    fetchPullRequests,
    setPRFilter,
    resetPRFilters,
    checkConnection,
  } = useVCSStore();

  const teamId = syncTeam.id;

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch PRs when team changes and GitHub is connected
  useEffect(() => {
    if (teamId && connectionStatus?.connected) {
      fetchPullRequests(teamId);
    }
  }, [teamId, connectionStatus?.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for updates every 60s when tab is visible
  useEffect(() => {
    if (!teamId || !connectionStatus?.connected) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPullRequests(teamId);
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [teamId, connectionStatus?.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply filters using the store's current state
  const storeState = useVCSStore();
  const filteredPRs = useMemo(
    () => getFilteredPRs(storeState),
    [pullRequests, prFilters] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Unique author logins for the filter dropdown
  const authorOptions = useMemo(
    () => [...new Set(pullRequests.map(pr => pr.author.login))].sort(),
    [pullRequests]
  );

  const handleRefresh = useCallback(() => {
    fetchPullRequests(teamId);
  }, [teamId, fetchPullRequests]);

  // Feature flag disabled
  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-text-muted/60">
        <AlertCircle className="w-8 h-8 mb-3 opacity-40" />
        <p className="text-xs text-center">
          PR Dashboard is not enabled.<br />
          Set NEXT_PUBLIC_PR_DASHBOARD_ENABLED=true
        </p>
      </div>
    );
  }

  // Not connected state - show CTA
  if (connectionStatus && !connectionStatus.connected) {
    return (
      <div className="space-y-4 text-center py-6">
        <GitPullRequest className="w-10 h-10 mx-auto text-text-muted/30" />
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-1">Connect GitHub</h4>
          <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
            Connect your GitHub account to see your team&apos;s pull requests,
            CI status, and review assignments.
          </p>
        </div>
        <button
          onClick={() => {
            window.location.href = '/api/vcs/github/connect';
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-coder1-cyan/20 text-coder1-cyan text-sm rounded-lg hover:bg-coder1-cyan/30 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Connect GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide">
            Pull Requests
          </h4>
          {prsCachedAt && (
            <span className="text-[10px] text-text-muted/50">
              {prsStale ? 'Stale - ' : ''}
              Updated {new Date(prsCachedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={prsLoading}
          className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-coder1-cyan transition-colors disabled:opacity-50"
          title="Refresh PRs"
          aria-label="Refresh pull requests"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${prsLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <PRFilters
        filters={prFilters}
        onFilterChange={setPRFilter}
        onReset={resetPRFilters}
        authorOptions={authorOptions}
        totalCount={pullRequests.length}
        filteredCount={filteredPRs.length}
      />

      {/* Error state */}
      {prsError && (
        <div className="flex items-center justify-between gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{prsError}</span>
          </div>
          <button
            onClick={handleRefresh}
            className="text-coder1-cyan hover:underline flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {prsLoading && pullRequests.length === 0 && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-bg-tertiary rounded-lg p-3 animate-pulse space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-bg-secondary rounded-full" />
                <div className="h-3.5 bg-bg-secondary rounded w-2/3" />
              </div>
              <div className="h-3 bg-bg-secondary rounded w-1/2" />
              <div className="flex gap-2">
                <div className="h-4 bg-bg-secondary rounded w-16" />
                <div className="h-4 bg-bg-secondary rounded w-14" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!prsLoading && !prsError && filteredPRs.length === 0 && pullRequests.length === 0 && (
        <div className="text-center py-8">
          <GitPullRequest className="w-8 h-8 mx-auto text-text-muted/20 mb-2" />
          <p className="text-xs text-text-muted">
            No open pull requests from your team.
          </p>
        </div>
      )}

      {/* No results after filter */}
      {!prsLoading && filteredPRs.length === 0 && pullRequests.length > 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-text-muted">
            No PRs match your filters.
          </p>
          <button
            onClick={resetPRFilters}
            className="text-xs text-coder1-cyan hover:underline mt-1"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* PR list */}
      <div className="space-y-2">
        {filteredPRs.map(pr => (
          <PRCard key={pr.id} pr={pr} />
        ))}
      </div>
    </div>
  );
}
