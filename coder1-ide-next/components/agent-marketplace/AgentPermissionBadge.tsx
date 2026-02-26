'use client';

import React from 'react';
import type { AgentPermissionLevel } from '@/types/agent-marketplace';

// ============================================================================
// Types
// ============================================================================

interface AgentPermissionBadgeProps {
  level: AgentPermissionLevel;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const LEVEL_CONFIG: Record<
  AgentPermissionLevel,
  { label: string; className: string; icon: React.ReactElement }
> = {
  'read-only': {
    label: 'Read Only',
    className: 'bg-green-500/20 text-green-400 border border-green-500/30',
    icon: (
      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  'file-write': {
    label: 'File Write',
    className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    icon: (
      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  terminal: {
    label: 'Terminal',
    className: 'bg-red-500/20 text-red-400 border border-red-500/30',
    icon: (
      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  full: {
    label: 'Full Access',
    className: 'bg-red-600/30 text-red-300 border border-red-600/40 font-semibold',
    icon: (
      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
};

// ============================================================================
// Component
// ============================================================================

export function AgentPermissionBadge({
  level,
  className = '',
}: AgentPermissionBadgeProps): React.ReactElement {
  const config = LEVEL_CONFIG[level];

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${config.className} ${className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
