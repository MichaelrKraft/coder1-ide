'use client';

import React, { Suspense, lazy, useState } from 'react';
import { Loader2, Terminal as TerminalIcon } from '@/lib/icons';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load the heavy Terminal component
const Terminal = lazy(() => import('./Terminal'));

interface LazyTerminalProps {
  onAgentsSpawn?: () => void;
  onClaudeTyped?: () => void;
  onTerminalData?: (data: string) => void;
  onTerminalCommand?: (command: string) => void;
  onTerminalReady?: (sessionId: any, ready: any) => void;
}

// Lightweight loading component with enhanced states
function TerminalSkeleton() {
  const [loadingPhase, setLoadingPhase] = React.useState(1);
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    // Animate loading phases
    const phaseInterval = setInterval(() => {
      setLoadingPhase(prev => (prev >= 4 ? 1 : prev + 1));
    }, 2000);

    // Animate dots
    const dotInterval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => {
      clearInterval(phaseInterval);
      clearInterval(dotInterval);
    };
  }, []);

  const getPhaseMessage = () => {
    switch (loadingPhase) {
      case 1: return `Initializing XTerm Terminal${dots}`;
      case 2: return `Connecting to Backend Server${dots}`;
      case 3: return `Establishing WebSocket Connection${dots}`;
      case 4: return `Loading Terminal Session${dots}`;
      default: return `Loading XTerm Terminal${dots}`;
    }
  };

  const getPhaseIcon = () => {
    switch (loadingPhase) {
      case 1: return '🖥️';
      case 2: return '🔌';
      case 3: return '🌐';
      case 4: return '⚡';
      default: return '🖥️';
    }
  };

  return (
    <div className="h-full w-full bg-bg-primary border border-border-default rounded">
      <div className="h-10 bg-bg-secondary border-b border-border-default flex items-center px-4">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-text-muted" />
          <span className="text-sm text-text-muted">Terminal</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-coder1-cyan animate-pulse"></div>
          <span className="text-xs text-coder1-cyan">Connecting...</span>
        </div>
      </div>
      <div className="h-[calc(100%-2.5rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-coder1-cyan" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl" style={{ animationDelay: '0.5s' }}>
                {getPhaseIcon()}
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-text-primary">
              {getPhaseMessage()}
            </p>
            <p className="text-sm text-text-muted mt-1">
              Phase {loadingPhase} of 4
            </p>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4].map(phase => (
                <div 
                  key={phase}
                  className={`h-1 w-8 rounded-full transition-colors ${
                    phase <= loadingPhase ? 'bg-coder1-cyan' : 'bg-bg-tertiary'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 p-3 bg-bg-tertiary rounded-lg text-xs text-text-muted max-w-md">
            <p className="flex items-center gap-2 mb-1">
              <span className="text-coder1-cyan">ℹ️</span>
              If terminal takes more than 10 seconds to load:
            </p>
            <ul className="ml-6 space-y-1 text-xs">
              <li>• Check that backend server is running on port 3001</li>
              <li>• Verify WebSocket connection in browser console</li>
              <li>• Try refreshing the page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Placeholder for inactive terminal  
function TerminalPlaceholder({ onActivate }: { onActivate: () => void }) {
  return (
    <div className="h-full w-full bg-bg-primary border border-border-default rounded">
      <div className="h-10 bg-bg-secondary border-b border-border-default flex items-center px-4">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-text-muted" />
          <span className="text-sm text-text-muted">Terminal</span>
        </div>
      </div>
      <div 
        className="h-[calc(100%-2.5rem)] flex items-center justify-center cursor-pointer hover:bg-bg-secondary/50 transition-colors"
        onClick={onActivate}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 bg-coder1-cyan/10 rounded-full">
            <TerminalIcon className="w-8 h-8 text-coder1-cyan" />
          </div>
          <div className="text-center">
            <p className="text-text-primary font-medium">Terminal Ready</p>
            <p className="text-sm text-text-muted mt-1">Click to activate XTerm</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LazyTerminal(props: LazyTerminalProps) {
  return (
    <ErrorBoundary fallback={
      <div className="h-full w-full bg-bg-primary border border-border-default rounded flex items-center justify-center">
        <div className="text-center">
          <TerminalIcon className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-primary font-medium">Terminal Error</p>
          <p className="text-sm text-text-muted">Failed to load terminal component</p>
        </div>
      </div>
    }>
      <Suspense fallback={<TerminalSkeleton />}>
        <Terminal {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}