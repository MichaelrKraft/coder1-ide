'use client';

import React from 'react';
import { DiffEditor } from '@monaco-editor/react';

// ============================================================================
// Types
// ============================================================================

interface MonacoDiffViewerProps {
  /** The original (left-side) content */
  original: string;
  /** The modified (right-side) content */
  modified: string;
  /** Monaco language ID. Default: 'markdown' */
  language?: string;
  /** CSS height value. Default: '400px' */
  height?: string;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function MonacoDiffViewer({
  original,
  modified,
  language = 'markdown',
  height = '400px',
  className = '',
}: MonacoDiffViewerProps): React.ReactElement {
  return (
    <div className={`rounded border border-border overflow-hidden ${className}`} style={{ height }}>
      <DiffEditor
        original={original}
        modified={modified}
        language={language}
        height={height}
        theme="vs-dark"
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          fontSize: 13,
          lineNumbers: 'on',
          folding: false,
        }}
      />
    </div>
  );
}
