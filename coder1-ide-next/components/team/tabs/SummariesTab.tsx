'use client';

import React from 'react';
import { Search, Pin, ChevronDown, ChevronUp } from 'lucide-react';
import type { TeamSummary } from '@/types/team';
import { SESSION_TYPE_ICONS } from './types';

interface SummariesTabProps {
  syncTeam: { id: string; name: string };
  summaries: Omit<TeamSummary, 'summary'>[];
  summariesLoading: boolean;
  summariesError: string | null;
  summariesHasMore: boolean;
  summarySearch: string;
  setSummarySearch: (search: string) => void;
  expandedId: string | null;
  expandedText: string | null;
  expandedLoading: boolean;
  handleExpandSummary: (summaryId: string) => void;
  handleTogglePin: (summary: Omit<TeamSummary, 'summary'>) => void;
  handleLoadMoreSummaries: () => void;
  setSummariesError: (error: string | null) => void;
  setSummaries: React.Dispatch<React.SetStateAction<Omit<TeamSummary, 'summary'>[]>>;
  setSummariesOffset: React.Dispatch<React.SetStateAction<number>>;
  setSummariesHasMore: React.Dispatch<React.SetStateAction<boolean>>;
  setSummariesLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function SummariesTab({
  syncTeam,
  summaries,
  summariesLoading,
  summariesError,
  summariesHasMore,
  summarySearch,
  setSummarySearch,
  expandedId,
  expandedText,
  expandedLoading,
  handleExpandSummary,
  handleTogglePin,
  handleLoadMoreSummaries,
  setSummariesError,
  setSummaries,
  setSummariesOffset,
  setSummariesHasMore,
  setSummariesLoading,
}: SummariesTabProps) {
  const filteredSummaries = summarySearch.trim()
    ? summaries.filter(s =>
        s.title.toLowerCase().includes(summarySearch.toLowerCase()) ||
        s.excerpt.toLowerCase().includes(summarySearch.toLowerCase())
      )
    : summaries;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
        <input
          type="text"
          value={summarySearch}
          onChange={(e) => setSummarySearch(e.target.value)}
          placeholder="Search summaries..."
          className="w-full bg-bg-tertiary border border-border-default rounded pl-7 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan"
        />
      </div>

      {/* Loading */}
      {summariesLoading && summaries.length === 0 && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-bg-tertiary rounded p-3 animate-pulse space-y-2">
              <div className="h-3 bg-bg-secondary rounded w-2/3" />
              <div className="h-2.5 bg-bg-secondary rounded w-full" />
              <div className="h-2.5 bg-bg-secondary rounded w-4/5" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {summariesError && (
        <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2 flex items-center justify-between">
          <span>{summariesError}</span>
          <button
            onClick={() => {
              setSummariesError(null);
              setSummaries([]);
              setSummariesOffset(0);
              setSummariesLoading(true);
              fetch(`/api/team/${syncTeam.id}/summaries`)
                .then(r => r.json())
                .then(data => {
                  if (data.success) {
                    setSummaries(data.summaries || []);
                    setSummariesHasMore(data.hasMore ?? false);
                    setSummariesOffset(data.summaries?.length ?? 0);
                  }
                  setSummariesLoading(false);
                })
                .catch(() => { setSummariesError('Couldn\'t load summaries. Click retry to try again.'); setSummariesLoading(false); });
            }}
            className="text-coder1-cyan hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!summariesLoading && !summariesError && filteredSummaries.length === 0 && (
        <p className="text-text-muted text-xs">
          {summarySearch ? 'No summaries match your search.' : `No summaries shared yet. Generate a session summary and click 'Share to ${syncTeam.name}' to add one.`}
        </p>
      )}

      {/* Summary Cards */}
      <div className="space-y-2">
        {filteredSummaries.map(s => (
          <div
            key={s.id}
            className={`bg-bg-tertiary rounded p-3 text-xs space-y-1.5 ${s.is_pinned ? 'border-l-2 border-amber-500' : ''}`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <span className="font-medium text-text-primary">
                {SESSION_TYPE_ICONS[s.session_type || ''] || '\uD83D\uDCDD'} {s.title}
              </span>
              <button
                onClick={() => handleTogglePin(s)}
                title={s.is_pinned ? 'Unpin' : 'Pin to top'}
                className={`p-0.5 rounded transition-colors ${s.is_pinned ? 'text-amber-500' : 'text-text-muted/40 hover:text-amber-400'}`}
              >
                <Pin className="w-3 h-3" />
              </button>
            </div>

            {/* Card Meta */}
            <div className="flex items-center gap-1.5 text-text-muted">
              <span className="text-coder1-cyan">@{s.user_name}</span>
              {s.branch && <><span>·</span><span className="font-mono">{s.branch}</span></>}
              {s.files_modified_count > 0 && <><span>·</span><span>{s.files_modified_count} files</span></>}
            </div>

            {/* Excerpt */}
            <p className="text-text-muted leading-relaxed">&ldquo;{s.excerpt}&rdquo;</p>

            {/* Expand / Collapse */}
            <button
              onClick={() => handleExpandSummary(s.id)}
              className="flex items-center gap-1 text-coder1-cyan/70 hover:text-coder1-cyan transition-colors mt-1"
            >
              {expandedId === s.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expandedId === s.id ? 'Collapse' : 'View full'}
            </button>

            {/* Expanded full summary */}
            {expandedId === s.id && (
              <div className="mt-2 border-t border-border-default pt-2">
                {expandedLoading ? (
                  <div className="h-3 bg-bg-secondary rounded w-full animate-pulse" />
                ) : expandedText ? (
                  <div className="max-h-96 overflow-y-auto">
                    <pre className="text-text-muted whitespace-pre-wrap font-sans text-[11px] leading-relaxed">{expandedText}</pre>
                  </div>
                ) : (
                  <p className="text-text-muted italic">Could not load full summary.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load More */}
      {summariesHasMore && !summarySearch && (
        <button
          onClick={handleLoadMoreSummaries}
          disabled={summariesLoading}
          className="w-full text-xs text-text-muted hover:text-text-primary py-1.5 border border-border-default rounded hover:border-coder1-cyan/50 transition-colors disabled:opacity-50"
        >
          {summariesLoading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
