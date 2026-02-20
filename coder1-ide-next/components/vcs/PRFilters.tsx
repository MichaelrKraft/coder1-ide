'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import type { PRFilterOptions } from '@/types/vcs';

interface PRFiltersProps {
  filters: PRFilterOptions;
  onFilterChange: (filter: Partial<PRFilterOptions>) => void;
  onReset: () => void;
  /** Unique author logins from current PR list for the dropdown */
  authorOptions: string[];
  totalCount: number;
  filteredCount: number;
}

export default function PRFilters({
  filters,
  onFilterChange,
  onReset,
  authorOptions,
  totalCount,
  filteredCount,
}: PRFiltersProps) {
  const hasActiveFilters = filters.author !== null
    || filters.status !== 'all'
    || filters.search.trim() !== '';

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          placeholder="Search PRs..."
          className="w-full bg-bg-tertiary border border-border-default rounded pl-7 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan"
          aria-label="Search pull requests"
        />
        {filters.search && (
          <button
            onClick={() => onFilterChange({ search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Author filter */}
        <select
          value={filters.author ?? ''}
          onChange={(e) => onFilterChange({ author: e.target.value || null })}
          className="bg-bg-tertiary border border-border-default rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan"
          aria-label="Filter by author"
        >
          <option value="">All authors</option>
          {authorOptions.map(author => (
            <option key={author} value={author}>{author}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ status: e.target.value as PRFilterOptions['status'] })}
          className="bg-bg-tertiary border border-border-default rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan"
          aria-label="Filter by status"
        >
          <option value="all">All status</option>
          <option value="open">Open</option>
          <option value="draft">Draft</option>
          <option value="review_required">Needs review</option>
        </select>

        {/* Sort */}
        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ sortBy: e.target.value as PRFilterOptions['sortBy'] })}
          className="bg-bg-tertiary border border-border-default rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan"
          aria-label="Sort by"
        >
          <option value="updated">Recently updated</option>
          <option value="created">Newest</option>
          <option value="title">Title</option>
        </select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-coder1-cyan hover:text-coder1-cyan/80 transition-colors"
          >
            Clear filters
          </button>
        )}

        {/* Count */}
        <span className="text-[10px] text-text-muted ml-auto">
          {hasActiveFilters
            ? `${filteredCount} of ${totalCount} PRs`
            : `${totalCount} PRs`
          }
        </span>
      </div>
    </div>
  );
}
