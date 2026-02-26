'use client';

import React from 'react';
import { TokenCounter } from '@/components/shared/TokenCounter';

// ============================================================================
// Types
// ============================================================================

interface CommandPreviewProps {
  content: string;
  isVisible: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function CommandPreview({
  content,
  isVisible,
}: CommandPreviewProps): React.ReactElement | null {
  if (!isVisible) return null;

  return (
    <div className="border border-border-default rounded-md bg-bg-secondary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-default">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Preview
        </span>
        <TokenCounter content={content} warnAt={2000} errorAt={4000} />
      </div>

      {/* Content */}
      <pre className="p-3 text-xs text-text-secondary whitespace-pre-wrap break-words font-mono leading-relaxed overflow-auto max-h-48">
        {content || (
          <span className="text-text-muted italic">No content yet…</span>
        )}
      </pre>
    </div>
  );
}
