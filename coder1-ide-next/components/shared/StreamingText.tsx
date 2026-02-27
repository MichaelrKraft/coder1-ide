'use client';

import React from 'react';

// ============================================================================
// Types
// ============================================================================

interface StreamingTextProps {
  /** Accumulated text content managed by the parent */
  text: string;
  /** When true, a blinking cursor is rendered after the text */
  isStreaming: boolean;
  className?: string;
  /** HTML element to render as. Default: 'div' */
  as?: 'p' | 'div' | 'span';
}

// ============================================================================
// Component
// ============================================================================

export function StreamingText({
  text,
  isStreaming,
  className = '',
  as: Tag = 'div',
}: StreamingTextProps): React.ReactElement {
  // Split on newlines to preserve line breaks without using dangerouslySetInnerHTML
  const lines = text.split('\n');

  return (
    <Tag className={`whitespace-pre-wrap break-words ${className}`}>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
      {isStreaming && (
        <span
          className="inline-block w-[2px] h-[1em] bg-current align-middle ml-px animate-pulse"
          aria-hidden="true"
        />
      )}
    </Tag>
  );
}
