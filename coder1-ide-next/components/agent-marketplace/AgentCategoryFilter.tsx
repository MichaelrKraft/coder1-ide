'use client';

import React from 'react';
import type { AgentCategory } from '@/types/agent-marketplace';

// ============================================================================
// Types
// ============================================================================

type FilterValue = AgentCategory | 'all' | 'activated';

interface AgentCategoryFilterProps {
  selected: FilterValue;
  onChange: (cat: FilterValue) => void;
}

// ============================================================================
// Constants
// ============================================================================

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'activated', label: 'Activated' },
  { value: 'code-review', label: 'Code Review' },
  { value: 'testing', label: 'Testing' },
  { value: 'documentation', label: 'Docs' },
  { value: 'security', label: 'Security' },
  { value: 'deployment', label: 'Deploy' },
  { value: 'performance', label: 'Performance' },
  { value: 'accessibility', label: 'A11y' },
  { value: 'custom', label: 'Custom' },
];

// ============================================================================
// Component
// ============================================================================

export function AgentCategoryFilter({
  selected,
  onChange,
}: AgentCategoryFilterProps): React.ReactElement {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {FILTER_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            selected === value
              ? 'bg-coder1-cyan text-bg-primary'
              : 'bg-bg-tertiary text-text-muted border border-border-default hover:border-coder1-cyan/40 hover:text-text-secondary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
