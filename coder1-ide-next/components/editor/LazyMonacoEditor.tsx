'use client';

import React, { Suspense, lazy, useState } from 'react';
import { Loader2 } from '@/lib/icons';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load the Monaco Editor with better error handling
const MonacoEditor = lazy(() => 
  import('./MonacoEditor').catch(() => ({
    default: () => <div className="h-full w-full bg-bg-secondary flex items-center justify-center">
      <p className="text-text-muted">Editor temporarily unavailable</p>
    </div>
  }))
);

interface LazyMonacoEditorProps {
  file: string | null;
  theme?: string;
  fontSize?: number;
  onChange?: (value: string | undefined) => void;
}

// Loading fallback component
function EditorSkeleton() {
  return (
    <div className="h-full w-full bg-bg-secondary flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-coder1-cyan" />
        <p className="text-sm text-text-muted">Loading Monaco Editor...</p>
      </div>
    </div>
  );
}

export default function LazyMonacoEditor(props: LazyMonacoEditorProps) {
  const [hasInteracted, setHasInteracted] = useState(false);

  // Only load Monaco when user actually needs to edit
  if (!hasInteracted && !props.file) {
    return (
      <div 
        className="h-full w-full bg-bg-secondary flex items-center justify-center cursor-pointer hover:bg-bg-tertiary transition-colors"
        onClick={() => setHasInteracted(true)}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-coder1-purple/10 rounded-full">
            <svg 
              className="w-8 h-8 text-coder1-purple" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM11 7h2v6h-2V7zm0 8h2v2h-2v-2z"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-text-primary font-medium">Monaco Editor</p>
            <p className="text-sm text-text-muted mt-1">Click to activate code editor</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={
      <div className="h-full w-full bg-bg-secondary border border-border-default rounded flex items-center justify-center">
        <div className="text-center">
          <svg 
            className="w-12 h-12 text-text-muted mx-auto mb-4" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM11 7h2v6h-2V7zm0 8h2v2h-2v-2z"/>
          </svg>
          <p className="text-text-primary font-medium">Editor Error</p>
          <p className="text-sm text-text-muted">Failed to load Monaco Editor</p>
        </div>
      </div>
    }>
      <Suspense fallback={<EditorSkeleton />}>
        <MonacoEditor {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}