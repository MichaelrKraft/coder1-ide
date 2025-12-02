'use client';

import React from 'react';
import { X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CategoryPillsProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategoryPills({ categories, selectedCategory, onSelect }: CategoryPillsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-full font-semibold transition-all ${
          selectedCategory === null
            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/30'
            : 'bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50'
        }`}
      >
        All Categories
      </button>

      {categories.map(category => (
        <button
          key={category.id}
          onClick={() => onSelect(category.name)}
          className={`px-4 py-2 rounded-full font-semibold transition-all flex items-center gap-2 ${
            selectedCategory === category.name
              ? 'text-white shadow-lg shadow-cyan-500/30'
              : 'bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50'
          }`}
          style={{
            backgroundColor: selectedCategory === category.name ? category.color : undefined
          }}
        >
          {category.name}
          {selectedCategory === category.name && (
            <X className="w-4 h-4" onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
            }} />
          )}
        </button>
      ))}
    </div>
  );
}
