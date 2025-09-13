/**
 * Parallel Reasoning Dashboard Component
 * 
 * Displays the real-time progress and results of multiple AI agents
 * reasoning about the same problem from different angles.
 * Shows voting results and allows user interaction with the reasoning process.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Brain, CheckCircle, XCircle, Loader2, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import type { ParallelReasoningSession, ReasoningPath, VotingResult } from '@/services/beta/parallel-reasoning-service';

interface ParallelReasoningDashboardProps {
  sessionId: string;
  onClose?: () => void;
}

export default function ParallelReasoningDashboard({ sessionId, onClose }: ParallelReasoningDashboardProps) {
  const [session, setSession] = useState<ParallelReasoningSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timer | null>(null);

  // Fetch session status
  const fetchSessionStatus = async () => {
    try {
      const response = await fetch(`/api/beta/parallel-reasoning/status/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session status');
      }
      const data = await response.json();
      
      // If completed, fetch full results
      if (data.status === 'completed' || data.status === 'failed') {
        const resultsResponse = await fetch(`/api/beta/parallel-reasoning/results/${sessionId}`);
        if (resultsResponse.ok) {
          const resultsData = await resultsResponse.json();
          setSession(resultsData);
          
          // Clear refresh interval when done
          if (refreshInterval) {
            clearInterval(refreshInterval);
            setRefreshInterval(null);
          }
        }
      } else {
        setSession(data);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  // Set up polling for updates
  useEffect(() => {
    fetchSessionStatus();
    
    // Poll every 2 seconds while reasoning is active
    const interval = setInterval(fetchSessionStatus, 2000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionId]);

  // Get strategy icon
  const getStrategyIcon = (strategyId: string): string => {
    const icons: Record<string, string> = {
      analytical: '',
      pattern_matching: '',
      first_principles: '',
      reverse_engineering: '',
      lateral_thinking: '',
      domain_expert: '',
      error_analysis: '',
      performance_first: '',
      user_centric: '',
      security_focused: ''
    };
    return icons[strategyId] || '';
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'thinking': return 'text-blue-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Calculate overall progress
  const calculateOverallProgress = (): number => {
    if (!session?.paths) return 0;
    const total = session.paths.reduce((sum, path) => sum + (path.progress || 0), 0);
    return Math.round(total / session.paths.length);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading parallel reasoning session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchSessionStatus();
            }}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 rounded-lg">
        <p className="text-gray-400">No session data available</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">ParaThinker Dashboard</h2>
            <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">Beta</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-sm font-medium ${getStatusColor(session.status)}`}>
              {session.status === 'reasoning' ? 'Reasoning...' : session.status}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
                title="Close dashboard"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        {session.status === 'reasoning' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Overall Progress</span>
              <span>{calculateOverallProgress()}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${calculateOverallProgress()}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Problem Statement */}
      <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-1">Problem:</h3>
        <p className="text-sm text-gray-200 line-clamp-3">{session.problem}</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Reasoning Paths Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Reasoning Paths</h3>
          <div className="grid grid-cols-2 gap-3">
            {session.paths?.map((path) => (
              <div
                key={path.id}
                onClick={() => setSelectedPath(path.id)}
                className={`
                  bg-gray-800 rounded-lg p-3 cursor-pointer transition-all
                  ${selectedPath === path.id ? 'ring-2 ring-purple-500' : 'hover:bg-gray-750'}
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getStrategyIcon(path.strategyId)}</span>
                    <span className="text-sm font-medium text-gray-200">
                      {path.strategyName}
                    </span>
                  </div>
                  <div className="flex items-center">
                    {path.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-400" />}
                    {path.status === 'thinking' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                    {path.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
                    {path.status === 'pending' && <div className="w-4 h-4 rounded-full bg-gray-600" />}
                  </div>
                </div>
                
                {/* Progress bar for this path */}
                <div className="mb-2">
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        path.status === 'failed' ? 'bg-red-500' :
                        path.status === 'completed' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${path.progress}%` }}
                    />
                  </div>
                </div>
                
                {/* Confidence score */}
                {path.confidence > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Confidence</span>
                    <span className={`font-medium ${
                      path.confidence >= 80 ? 'text-green-400' :
                      path.confidence >= 60 ? 'text-yellow-400' :
                      'text-orange-400'
                    }`}>
                      {path.confidence}%
                    </span>
                  </div>
                )}
                
                {/* Error message */}
                {path.error && (
                  <p className="text-xs text-red-400 mt-1 line-clamp-2">{path.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Path Details */}
        {selectedPath && (
          <div className="w-96 border-l border-gray-700 p-4 overflow-y-auto bg-gray-850">
            {(() => {
              const path = session.paths?.find(p => p.id === selectedPath);
              if (!path) return null;
              
              return (
                <>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Path Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">Strategy</h4>
                      <p className="text-sm text-gray-200 flex items-center gap-2">
                        <span>{getStrategyIcon(path.strategyId)}</span>
                        {path.strategyName}
                      </p>
                    </div>
                    
                    {path.solution && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Solution</h4>
                        <p className="text-sm text-gray-200 bg-gray-800 rounded p-2">
                          {path.solution}
                        </p>
                      </div>
                    )}
                    
                    {path.reasoning && path.reasoning.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Reasoning Steps</h4>
                        <ol className="list-decimal list-inside space-y-1">
                          {path.reasoning.map((step, idx) => (
                            <li key={idx} className="text-sm text-gray-300">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    
                    {path.tokensUsed && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Tokens Used</h4>
                        <p className="text-sm text-gray-200">{path.tokensUsed.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Voting Results Footer */}
      {session.status === 'completed' && session.votingResults && (
        <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Final Solution</h3>
              <p className="text-sm text-green-400 font-medium">
                {session.finalSolution ? 
                  (session.finalSolution.length > 100 ? 
                    session.finalSolution.substring(0, 100) + '...' : 
                    session.finalSolution) : 
                  'No solution found'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Overall Confidence</p>
              <p className="text-lg font-bold text-purple-400">
                {session.votingResults.confidence.toFixed(0)}%
              </p>
            </div>
          </div>
          
          {/* Voting breakdown */}
          {session.votingResults.votes && session.votingResults.votes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Voting Results</h4>
              <div className="space-y-1">
                {session.votingResults.votes.map(([solution, votes], idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 truncate max-w-xs">{solution}</span>
                    <span className="text-gray-400">{votes.toFixed(2)} votes</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}