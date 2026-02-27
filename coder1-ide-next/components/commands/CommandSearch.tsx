'use client';

import React from 'react';
import { Search } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface CommandSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CommandSearch({
  value,
  onChange,
  placeholder = 'Search commands…',
}: CommandSearchProps): React.ReactElement {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-tertiary border border-border-default rounded-md pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 transition-colors"
      />
    </div>
  );
}
