'use client';

import React from 'react';
import type { CommandCategory } from '@/types/slash-command';

// ============================================================================
// Types
// ============================================================================

interface CommandCategoryFilterProps {
  selected: CommandCategory | 'all';
  onChange: (category: CommandCategory | 'all') => void;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES: Array<{ value: CommandCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'review', label: 'Review' },
  { value: 'testing', label: 'Testing' },
  { value: 'docs', label: 'Docs' },
  { value: 'git', label: 'Git' },
  { value: 'deployment', label: 'Deploy' },
  { value: 'debugging', label: 'Debug' },
  { value: 'general', label: 'General' },
];

// ============================================================================
// Component
// ============================================================================

export function CommandCategoryFilter({
  selected,
  onChange,
}: CommandCategoryFilterProps): React.ReactElement {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
      {CATEGORIES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
            selected === value
              ? 'bg-coder1-cyan text-bg-primary'
              : 'bg-bg-tertiary text-text-muted border border-border-default hover:text-text-secondary hover:border-border-hover'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
