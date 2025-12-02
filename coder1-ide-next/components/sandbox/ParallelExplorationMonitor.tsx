/**
 * Parallel Exploration Monitor
 * 
 * Real-time monitoring of parallel exploration session progress
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader, CheckCircle, XCircle, Cpu, BarChart3, X, Minimize2, Maximize2, ChevronDown, GitCompare, AlertTriangle, RefreshCw } from 'lucide-react';
import ExplorationResultsViewer from './ExplorationResultsViewer';
import { useResilientPolling } from '@/lib/hooks/useResilientPolling';
import { usePollingHealthStore } from '@/stores/usePollingHealthStore';

interface Agent {
  id: string;
  strategy: string;
  status: 'spawning' | 'researching' | 'implementing' | 'evaluating' | 'completed' | 'failed';
  progress: number;
  sandboxId: string;
}

interface Session {
  id: string;
  status: string;
  domain: string;
  domainConfidence: number;
  strategyCount: number;
  agents: Agent[];
  results?: any[];
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface ParallelExplorationMonitorProps {
  sessionId: string;
  onClose: () => void;
  onComplete: (results: any[]) => void;
  position?: 'corner' | 'fullscreen';
}

export default function ParallelExplorationMonitor({
  sessionId,
  onClose,
  onComplete,
  position = 'corner'
}: ParallelExplorationMonitorProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showResultsViewer, setShowResultsViewer] = useState(false);

  const reportStatus = usePollingHealthStore((state) => state.reportStatus);
  const reportHealthy = usePollingHealthStore((state) => state.reportHealthy);

  // Initial render log
  useEffect(() => {
    console.log('[ParallelExplorationMonitor] 🎬 Component mounted with sessionId:', sessionId);
    return () => {
      // Clean up health status when component unmounts
      reportHealthy('parallel-exploration');
    };
  }, [reportHealthy]);

  // Polling function
  const pollFn = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/parallel-exploration/status/${sessionId}`);
      const data = await response.json();

      if (data.success) {
        console.log('[Monitor] 📊 Session data received:', {
          status: data.session.status,
          hasResults: !!data.session.results,
          resultsCount: data.session.results?.length,
        });
        setSession(data.session);

        // If completed, notify parent
        if (data.session.status === 'completed' && data.session.results) {
          onComplete(data.session.results);
        }
        return true;
      } else if (response.status === 404) {
        // Session not found yet - still being created
        console.log('[Monitor] Session not found yet, waiting...');
        return true; // Don't count as failure during creation
      } else {
        setError(data.error || 'Failed to fetch session status');
        return false;
      }
    } catch (err) {
      // Don't set error immediately - let circuit breaker handle it
      return false;
    }
  }, [sessionId, onComplete]);

  // Use resilient polling with circuit breaker
  const {
    isCircuitOpen,
    consecutiveFailures,
    retry: retryPolling,
    lastError,
  } = useResilientPolling({
    pollFn,
    pollerId: 'parallel-exploration',
    initialInterval: 2000,
    maxInterval: 30000,
    backoffMultiplier: 2,
    maxConsecutiveFailures: 5,
    maxErrorLogs: 10,
    enabled: !error && !session?.status?.includes('completed') && !session?.status?.includes('failed'),
    onCircuitOpen: () => {
      setError('Connection lost. The exploration service is not responding.');
      reportStatus({
        id: 'parallel-exploration',
        name: 'Parallel Exploration',
        isCircuitOpen: true,
        consecutiveFailures: 5,
        lastError: 'Service not responding',
      });
    },
    onRecovery: () => {
      setError(null);
      reportHealthy('parallel-exploration');
    },
  });

  // Update health store on failure changes
  useEffect(() => {
    if (consecutiveFailures > 0 && !isCircuitOpen) {
      reportStatus({
        id: 'parallel-exploration',
        name: 'Parallel Exploration',
        isCircuitOpen: false,
        consecutiveFailures,
        lastError,
      });
    }
  }, [consecutiveFailures, isCircuitOpen, lastError, reportStatus]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Loader className="w-4 h-4 text-coder1-cyan animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'spawning':
        return 'text-yellow-400';
      case 'researching':
        return 'text-blue-400';
      case 'implementing':
        return 'text-purple-400';
      case 'evaluating':
        return 'text-orange-400';
      default:
        return 'text-text-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
  };

  const overallProgress = session 
    ? Math.round(session.agents.reduce((sum, a) => sum + a.progress, 0) / session.agents.length)
    : 0;

  // Determine positioning classes
  const getContainerClasses = () => {
    if (isMaximized || position === 'fullscreen') {
      return 'fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-60 p-4';
    }
    return 'fixed bottom-4 right-4 z-60';
  };

  const getModalClasses = () => {
    if (isMaximized || position === 'fullscreen') {
      return 'bg-bg-secondary border border-border-default rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col';
    }
    if (isMinimized) {
      return 'bg-bg-secondary border border-border-default rounded-lg shadow-2xl w-80 overflow-hidden';
    }
    return 'bg-bg-secondary border border-border-default rounded-lg shadow-2xl w-96 max-h-[600px] overflow-hidden flex flex-col';
  };

  if (error) {
    return (
      <div className={getContainerClasses()}>
        <div className="bg-bg-secondary border border-border-default rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            {isCircuitOpen ? (
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
            <h3 className="text-lg font-semibold text-text-primary">
              {isCircuitOpen ? 'Connection Issue' : 'Error'}
            </h3>
          </div>
          <p className="text-text-secondary mb-4">{error}</p>
          <div className="flex gap-2">
            {isCircuitOpen && (
              <button
                onClick={() => {
                  setError(null);
                  retryPolling();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-coder1-cyan text-bg-primary rounded hover:bg-coder1-cyan/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            )}
            <button
              onClick={onClose}
              className={`${isCircuitOpen ? 'flex-1' : 'w-full'} px-4 py-2 bg-bg-tertiary text-text-primary rounded hover:bg-bg-primary transition-colors`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={getContainerClasses()}>
        <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
          <Loader className="w-8 h-8 text-coder1-cyan animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={getContainerClasses()}>
      <div className={getModalClasses()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default bg-bg-tertiary">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-coder1-cyan" />
            {!isMinimized && (
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Exploration in Progress
                </h2>
                <div className="text-xs text-text-muted">
                  {session.domain} • {session.agents.length} agents
                </div>
              </div>
            )}
            {isMinimized && (
              <div className="text-sm font-medium text-text-primary">
                {overallProgress}% Complete
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Minimize/Expand Button (only in corner mode) */}
            {position === 'corner' && !isMaximized && (
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-bg-primary rounded transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? (
                  <ChevronDown className="w-5 h-5 text-text-secondary" />
                ) : (
                  <Minimize2 className="w-5 h-5 text-text-secondary" />
                )}
              </button>
            )}
            
            {/* Maximize/Restore Button (only in corner mode) */}
            {position === 'corner' && !isMinimized && (
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1 hover:bg-bg-primary rounded transition-colors"
                title={isMaximized ? 'Restore to corner' : 'Maximize'}
              >
                <Maximize2 className="w-5 h-5 text-text-secondary" />
              </button>
            )}
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1 hover:bg-bg-primary rounded transition-colors"
              disabled={session.status !== 'completed' && session.status !== 'failed'}
              title={session.status === 'completed' || session.status === 'failed' ? 'Close' : 'Cannot close while in progress'}
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Overall Progress - Always show, but compact when minimized */}
        {!isMinimized && (
          <div className="p-4 border-b border-border-default bg-bg-tertiary">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">Overall Progress</span>
              <span className="text-sm text-coder1-cyan">{overallProgress}%</span>
            </div>
            <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-coder1-cyan to-blue-500 transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Minimized Progress Bar */}
        {isMinimized && (
          <div className="px-4 py-2 border-b border-border-default bg-bg-tertiary">
            <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-coder1-cyan to-blue-500 transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Agent List - Hide when minimized */}
        {!isMinimized && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {session.agents.map((agent) => (
            <div
              key={agent.id}
              className="p-4 bg-bg-tertiary border border-border-default rounded"
            >
              {/* Agent Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(agent.status)}
                  <span className="text-sm font-medium text-text-primary">
                    {agent.strategy}
                  </span>
                </div>
                <span className={`text-xs font-medium ${getStatusColor(agent.status)}`}>
                  {getStatusLabel(agent.status)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Progress</span>
                  <span className="text-text-secondary">{agent.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      agent.status === 'completed'
                        ? 'bg-green-400'
                        : agent.status === 'failed'
                        ? 'bg-red-400'
                        : 'bg-coder1-cyan'
                    }`}
                    style={{ width: `${agent.progress}%` }}
                  />
                </div>
              </div>

              {/* Sandbox ID */}
              <div className="mt-2 text-xs text-text-muted">
                Sandbox: {agent.sandboxId.slice(-8)}
              </div>
            </div>
          ))}
          </div>
        )}

        {/* Results Display - Show when completed */}
        {!isMinimized && session.status === 'completed' && session.results && session.results.length > 0 && (
          <div className="p-4 border-t border-border-default bg-bg-tertiary max-h-60 overflow-y-auto">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Results</h3>
            <div className="space-y-2">
              {session.results.map((result: any, index: number) => (
                <div key={index} className="p-3 bg-bg-primary rounded border border-border-default">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">{result.strategy}</span>
                    <span className="text-xs px-2 py-0.5 bg-coder1-cyan/20 text-coder1-cyan rounded">
                      Score: {Math.round(result.selfEvaluation?.totalScore || 0)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-text-muted">
                    <span>Quality: {Math.round(result.selfEvaluation?.quality || 0)}%</span>
                    <span>Unique: {Math.round(result.selfEvaluation?.uniqueness || 0)}%</span>
                    <span>Feasible: {Math.round(result.selfEvaluation?.feasibility || 0)}%</span>
                    <span>Best Practice: {Math.round(result.selfEvaluation?.bestPractices || 0)}%</span>
                  </div>
                  {result.output?.files?.length > 0 && (
                    <div className="mt-2 text-xs text-text-muted">
                      {result.output.files.length} file(s) generated
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer - Hide when minimized */}
        {!isMinimized && (
        <div className="p-4 border-t border-border-default bg-bg-tertiary">
          {session.status === 'completed' ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Exploration complete!</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowResultsViewer(true)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs bg-coder1-cyan text-bg-primary rounded hover:bg-coder1-cyan/90 transition-colors"
                >
                  <GitCompare className="w-3 h-3" />
                  Compare & Adopt
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1 text-xs bg-bg-primary text-text-secondary rounded hover:bg-bg-tertiary transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : session.status === 'failed' ? (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <XCircle className="w-4 h-4" />
              <span>Exploration failed: {session.error}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Loader className="w-4 h-4 animate-spin" />
              <span>Agents are working in parallel...</span>
            </div>
          )}
        </div>
        )}
      </div>
      
      {showResultsViewer && session?.results && (
        <ExplorationResultsViewer
          sessionId={sessionId}
          results={session.results}
          onClose={() => setShowResultsViewer(false)}
          onAdopt={(strategyId, files) => {
            console.log(`[Monitor] Adopted ${strategyId} with ${files.length} files`);
          }}
        />
      )}
    </div>
  );
}
