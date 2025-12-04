'use client';

import React from 'react';

type ArtifactType = 'all' | 'video' | 'screenshot' | 'trace' | 'document' | 'code';
type SortOption = 'newest' | 'oldest' | 'largest' | 'name';

interface ArtifactFiltersProps {
  selectedType: string;
  onTypeChange: (type: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const filterOptions: Array<{ value: ArtifactType; label: string; icon: string }> = [
  { value: 'all', label: 'All', icon: '📦' },
  { value: 'video', label: 'Videos', icon: '🎬' },
  { value: 'screenshot', label: 'Screenshots', icon: '📸' },
  { value: 'trace', label: 'Traces', icon: '🔍' },
  { value: 'document', label: 'Documents', icon: '📄' },
  { value: 'code', label: 'Code', icon: '💻' },
];

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'largest', label: 'Largest' },
  { value: 'name', label: 'Name' },
];

const ArtifactFilters: React.FC<ArtifactFiltersProps> = ({
  selectedType,
  onTypeChange,
  sortBy,
  onSortChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      {/* Type filters */}
      <div className="flex flex-wrap gap-2" data-testid="artifact-type-filters">
        {filterOptions.map(option => (
          <button
            key={option.value}
            onClick={() => onTypeChange(option.value)}
            className={`px-3 py-2 rounded-lg border transition-all duration-200 text-sm font-medium flex items-center gap-2 ${
              selectedType === option.value
                ? 'bg-coder1-cyan text-black border-coder1-cyan shadow-lg shadow-coder1-cyan/20'
                : 'bg-bg-secondary text-text-secondary border-border-subtle hover:border-coder1-cyan/50 hover:text-text-primary'
            }`}
            data-testid={`artifact-filter-${option.value}`}
          >
            <span>{option.icon}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {/* Sort dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="text-sm text-text-secondary whitespace-nowrap">
          Sort by:
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="px-3 py-2 bg-bg-secondary text-text-primary border border-border-subtle rounded-lg text-sm font-medium focus:outline-none focus:border-coder1-cyan transition-colors cursor-pointer hover:border-coder1-cyan/50"
          data-testid="artifact-sort-select"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ArtifactFilters;
