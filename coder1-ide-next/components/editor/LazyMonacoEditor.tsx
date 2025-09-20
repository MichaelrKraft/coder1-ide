'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from '@/lib/icons';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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

// Use Next.js dynamic import with better error handling
const MonacoEditor = dynamic(() => 
  import('./MonacoEditor').catch((error) => {
    console.error('Failed to load MonacoEditor:', error);
    return {
      default: () => <div className="h-full w-full bg-bg-secondary flex items-center justify-center">
        <p className="text-text-muted">Editor temporarily unavailable</p>
      </div>
    };
  }),
  { 
    ssr: false,
    loading: () => <EditorSkeleton />
  }
);

interface LazyMonacoEditorProps {
  file: string | null;
  theme?: string;
  fontSize?: number;
  onChange?: (value: string | undefined) => void;
}

export default function LazyMonacoEditor(props: LazyMonacoEditorProps) {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [forceLoad, setForceLoad] = useState(false);

  // Listen for tour events to force Monaco to load
  React.useEffect(() => {
    const handleTourStart = () => {
      console.log('[LazyMonacoEditor] Tour started, forcing Monaco load');
      setIsTourActive(true);
      setHasInteracted(true); // Force Monaco to load during tour
      setForceLoad(true); // Extra flag to ensure loading
    };
    
    const handleTourEnd = () => {
      console.log('[LazyMonacoEditor] Tour ended');
      setIsTourActive(false);
    };

    // Check if tour is already active or about to start
    const tourElement = document.querySelector('[data-tour-active="true"]');
    const tourButton = document.querySelector('[data-tour="start-tour-button"]');
    
    if (tourElement || tourButton) {
      console.log('[LazyMonacoEditor] Tour detected on mount, preloading Monaco');
      setIsTourActive(true);
      setHasInteracted(true);
      setForceLoad(true);
    }

    window.addEventListener('tour:start', handleTourStart);
    window.addEventListener('tour:end', handleTourEnd);
    
    return () => {
      window.removeEventListener('tour:start', handleTourStart);
      window.removeEventListener('tour:end', handleTourEnd);
    };
  }, []);

  // Always load Monaco if force load is true, or load normally based on interaction
  if (!forceLoad && !hasInteracted && !props.file && !isTourActive) {
    return (
      <div 
        data-tour="monaco-editor"
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
    <div data-tour="monaco-editor" className="h-full w-full">
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
        <MonacoEditor {...props} />
      </ErrorBoundary>
    </div>
  );
}