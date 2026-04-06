'use client';

import React from 'react';

interface PriorityChipProps {
  priority: 'low' | 'medium' | 'high';
}

const CONFIG = {
  low: { label: 'Low', className: 'bg-bg-secondary text-text-muted border border-border-default' },
  medium: { label: 'Medium', className: 'bg-amber-500/10 text-amber-400 border border-amber-500/30' },
  high: { label: 'High', className: 'bg-red-500/10 text-red-400 border border-red-500/30' },
} as const;

export function PriorityChip({ priority }: PriorityChipProps) {
  const { label, className } = CONFIG[priority];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
