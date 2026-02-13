'use client';

import { Search } from 'lucide-react';

interface MemoryFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'technical', label: 'Technical' },
  { value: 'project', label: 'Project' },
  { value: 'preference', label: 'Preference' },
  { value: 'decision', label: 'Decision' },
  { value: 'insight', label: 'Insight' },
  { value: 'other', label: 'Other' },
];

export function MemoryFilters({
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: MemoryFiltersProps) {
  return (
    <div className="mb-6 space-y-4">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(category => (
          <button
            key={category.value}
            onClick={() => onCategoryChange(category.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedCategory === category.value
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
        <input
          type="text"
          placeholder="Search memories by content or tags..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>
    </div>
  );
}
