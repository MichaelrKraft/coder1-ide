'use client';

import React, { Suspense, lazy } from 'react';
import { Loader2, Terminal as TerminalIcon, FolderOpen } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load the heavy TerminalContainer component
const TerminalContainer = lazy(() => import('./TerminalContainer'));

interface LazyTerminalContainerProps {
  onAgentsSpawn?: () => void;
  onTerminalClick?: () => void;
  onClaudeTyped?: () => void;
  onTerminalData?: (data: string) => void;
  onTerminalCommand?: (command: string) => void;
  onTerminalReady?: (sessionId: any, ready: any) => void;
}

// Enhanced loading component for terminal container
function TerminalContainerSkeleton() {
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
      case 1: return `Initializing Terminal System${dots}`;
      case 2: return `Loading Tab Interface${dots}`;
      case 3: return `Connecting to Backend${dots}`;
      case 4: return `Preparing Sandbox Environment${dots}`;
      default: return `Loading Terminal Container${dots}`;
    }
  };

  const getPhaseIcon = () => {
    switch (loadingPhase) {
      case 1: return '🖥️';
      case 2: return '📑';
      case 3: return '🔌';
      case 4: return '🏖️';
      default: return '🖥️';
    }
  };

  return (
    <div className="h-full w-full bg-bg-primary border border-border-default rounded">
      {/* Tab Bar Skeleton */}
      <div className="h-10 bg-bg-secondary border-b border-border-default flex items-center px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-text-muted" />
            <div className="w-20 h-4 bg-bg-tertiary rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2 opacity-50">
            <FolderOpen className="w-4 h-4 text-text-muted" />
            <div className="w-16 h-4 bg-bg-tertiary rounded animate-pulse"></div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-coder1-cyan animate-pulse"></div>
          <span className="text-xs text-coder1-cyan">Loading...</span>
        </div>
      </div>
      
      {/* Loading Content */}
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
              <span className="text-coder1-cyan">🏖️</span>
              New: Sandbox terminal for checkpoint exploration
            </p>
            <ul className="ml-6 space-y-1 text-xs">
              <li>• Isolated environments for each checkpoint</li>
              <li>• Switch between main work and historical states</li>
              <li>• Safe exploration without affecting current session</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LazyTerminalContainer(props: LazyTerminalContainerProps) {
  return (
    <ErrorBoundary fallback={
      <div className="h-full w-full bg-bg-primary border border-border-default rounded flex items-center justify-center">
        <div className="text-center">
          <TerminalIcon className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-primary font-medium">Terminal Container Error</p>
          <p className="text-sm text-text-muted">Failed to load terminal system</p>
        </div>
      </div>
    }>
      <Suspense fallback={<TerminalContainerSkeleton />}>
        <TerminalContainer {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}