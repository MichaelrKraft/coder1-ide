/**
 * Contextual Memory Panel Component
 * Displays relevant past conversations and solutions when user needs context
 * The holy grail - making users feel like the IDE truly remembers and learns
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RelevantMemory } from '@/services/contextual-retrieval';
import { extractClaudeContent } from '@/lib/terminal-cleaner';
import { getEvolutionaryMemoryManager, type SandboxExperiment } from '@/services/evolutionary-memory-manager';
import { getConfidenceScoringEngine, type ConfidenceAnalysis } from '@/services/confidence-scoring-engine';
import { useMemoryStore } from '@/stores/useMemoryStore';
import { MemoryIntelligenceDashboard } from './premium/MemoryIntelligenceDashboard';
import { PremiumUpsellOverlay } from './free/PremiumUpsellOverlay';
import { AILearningFeed } from './premium/AILearningFeed';
import { SessionHandoffVisualizer } from './premium/SessionHandoffVisualizer';

interface ContextualMemoryPanelProps {
  userInput: string;
  currentFiles?: string[];
  recentCommands?: string[];
  errorContext?: string;
  onUseMemory?: (memory: RelevantMemory) => void;
  onExpandMemory?: (memory: RelevantMemory) => void;
  onCreateExperiment?: (suggestion: string, confidence: ConfidenceAnalysis) => void;
  showExperimentFeatures?: boolean;
  className?: string;
}

interface MemoryResponse {
  success: boolean;
  memories: RelevantMemory[];
  stats: {
    totalFound: number;
    processingTimeMs: number;
  };
}

interface EnhancedMemory extends RelevantMemory {
  experimentSource?: {
    id: string;
    confidence: number;
    outcome: string;
    graduated: boolean;
  };
  memorySource: 'production' | 'experiment' | 'graduated';
}

export const ContextualMemoryPanel: React.FC<ContextualMemoryPanelProps> = ({
  userInput,
  currentFiles = [],
  recentCommands = [],
  errorContext,
  onUseMemory,
  onExpandMemory,
  onCreateExperiment,
  showExperimentFeatures = true,
  className = ''
}) => {
  const [memories, setMemories] = useState<EnhancedMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalFound: number; processingTimeMs: number } | null>(null);
  const [confidenceAnalysis, setConfidenceAnalysis] = useState<ConfidenceAnalysis | null>(null);
  const [loadingConfidence, setLoadingConfidence] = useState(false);
  const [similarExperiments, setSimilarExperiments] = useState<SandboxExperiment[]>([]);
  
  // Premium status from store
  const { isPremium, addLearningEvent } = useMemoryStore();

  // Debounce user input to avoid excessive API calls
  const debouncedUserInput = useMemo(() => {
    const timeoutId = setTimeout(() => userInput, 500);
    return () => clearTimeout(timeoutId);
  }, [userInput]);

  useEffect(() => {
    if (!userInput || userInput.trim().length < 1) {
      setMemories([]);
      setStats(null);
      return;
    }

    const fetchRelevantMemories = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch regular contextual memories
        const response = await fetch('/api/contextual-memory/relevant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userInput: userInput.trim(),
            currentFiles,
            recentCommands,
            errorContext,
            projectContext: 'Coder1 IDE Development'
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: MemoryResponse = await response.json();
        
        if (data.success) {
          // Enhance memories with experiment context
          const enhancedMemories: EnhancedMemory[] = data.memories.map(memory => ({
            ...memory,
            memorySource: 'production' as const
          }));
          
          setMemories(enhancedMemories);
          setStats(data.stats);
        } else {
          throw new Error('Failed to retrieve memories');
        }

        // If experiment features are enabled, fetch additional experiment data
        if (showExperimentFeatures) {
          await fetchExperimentData();
        }
        
      } catch (err) {
        console.error('Failed to fetch contextual memories:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setMemories([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    const fetchExperimentData = async () => {
      try {
        // Fetch confidence analysis for current suggestion
        setLoadingConfidence(true);
        
        const confidenceResponse = await fetch('/api/sandbox/evolutionary/confidence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suggestionText: userInput.trim(),
            currentFiles,
            recentCommands,
            errorContext
          })
        });
        
        if (confidenceResponse.ok) {
          const confidenceData = await confidenceResponse.json();
          setConfidenceAnalysis(confidenceData.analysis);
        }

        // Fetch similar experiments
        const experimentsResponse = await fetch('/api/sandbox/evolutionary/similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suggestionText: userInput.trim() })
        });
        
        if (experimentsResponse.ok) {
          const experimentsData = await experimentsResponse.json();
          setSimilarExperiments(experimentsData.experiments || []);
        }
        
      } catch (error) {
        console.error('Failed to fetch experiment data:', error);
        // Don't set error state for experiment features - they're optional
      } finally {
        setLoadingConfidence(false);
      }
    };

    fetchRelevantMemories();
  }, [userInput, currentFiles, recentCommands, errorContext, showExperimentFeatures]);

  const handleMemoryExpand = (memory: EnhancedMemory) => {
    setExpandedMemoryId(expandedMemoryId === memory.id ? null : memory.id);
    onExpandMemory?.(memory);
  };

  const handleUseMemory = (memory: EnhancedMemory) => {
    onUseMemory?.(memory);
  };

  const handleCreateExperiment = () => {
    if (confidenceAnalysis && onCreateExperiment) {
      onCreateExperiment(userInput.trim(), confidenceAnalysis);
    }
  };

  const getConfidenceColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    if (score >= 0.4) return 'text-orange-400';
    return 'text-red-400';
  };

  const getConfidenceBadge = (level: string): { color: string; icon: string } => {
    switch (level) {
      case 'very_high': return { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: '🚀' };
      case 'high': return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '✅' };
      case 'medium': return { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '⚡' };
      case 'low': return { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '⚠️' };
      case 'very_low': return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '🚨' };
      default: return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: '❓' };
    }
  };

  const getMemorySourceBadge = (source: EnhancedMemory['memorySource']): { color: string; label: string; icon: string } => {
    switch (source) {
      case 'production': return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Production', icon: '🏭' };
      case 'experiment': return { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Experiment', icon: '🧪' };
      case 'graduated': return { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Graduated', icon: '🎓' };
      default: return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Unknown', icon: '❓' };
    }
  };

  const getRelevanceColor = (score: number): string => {
    // Use Math.round to handle scores like 0.795 that round to 80%
    const percentage = Math.round(score * 100);
    if (percentage >= 80) return 'text-coder1-cyan'; // Match Contextual Memory title color
    if (percentage >= 60) return 'text-yellow-400';
    if (percentage >= 40) return 'text-orange-400';
    return 'text-gray-400';
  };

  const getRelevanceIcon = (score: number): string => {
    // Removed emojis - return empty string
    return '';
  };

  // Handle upgrade click
  const handleUpgradeClick = () => {
    // This would open the upgrade modal or navigate to pricing page
    window.open('/pricing', '_blank');
  };

  // Track learning events when memories are used
  useEffect(() => {
    if (memories.length > 0 && isPremium) {
      addLearningEvent({
        type: 'pattern',
        description: `Found ${memories.length} relevant memories for: ${userInput.slice(0, 50)}...`,
        confidenceGain: 0.1
      });
    }
  }, [memories, userInput, isPremium, addLearningEvent]);

  if (!userInput || userInput.trim().length < 1) {
    return (
      <div className="contextual-memory-panel bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
        {/* Show premium dashboard or initial state */}
        {isPremium ? (
          <>
            <MemoryIntelligenceDashboard />
            <div className="p-4">
              <AILearningFeed />
              <SessionHandoffVisualizer />
            </div>
          </>
        ) : (
          <div className="p-4">
            <div className="text-center text-gray-500">
              <p className="text-sm mt-2">Contextual Memory is ready</p>
              <p className="text-xs text-gray-600 mt-1">
                Type commands in the terminal to see relevant past conversations
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show upsell overlay for free users
  if (!isPremium) {
    return (
      <div className={`contextual-memory-panel bg-gray-900 border border-gray-700 rounded-lg shadow-lg ${className}`}>
        <PremiumUpsellOverlay 
          memoriesCount={memories.length || 12847}
          onUpgradeClick={handleUpgradeClick}
        />
      </div>
    );
  }

  return (
    <div className={`contextual-memory-panel bg-gray-900 border border-gray-700 rounded-lg shadow-lg ${className}`}>
      {/* Premium Intelligence Dashboard */}
      <MemoryIntelligenceDashboard />
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-200">Contextual Memory</h3>
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
        
        {stats && (
          <div className="text-xs text-gray-400">
            Found {stats.totalFound} similar {stats.totalFound === 1 ? 'memory' : 'memories'} • {stats.processingTimeMs}ms
          </div>
        )}
      </div>

      {/* Evolutionary Features - Confidence Analysis */}
      {showExperimentFeatures && confidenceAnalysis && (
        <div className="p-3 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-300">🧪 AI Suggestion Analysis</h4>
            {loadingConfidence && (
              <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
          
          <div className="space-y-2">
            {/* Confidence Score */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Confidence:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-medium ${getConfidenceColor(confidenceAnalysis.confidenceScore)}`}>
                  {Math.round(confidenceAnalysis.confidenceScore * 100)}%
                </span>
                <span className={`px-2 py-1 text-xs rounded border ${getConfidenceBadge(confidenceAnalysis.confidenceLevel).color}`}>
                  {getConfidenceBadge(confidenceAnalysis.confidenceLevel).icon} {confidenceAnalysis.confidenceLevel.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Risk Level */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Risk Level:</span>
              <span className={`px-2 py-1 text-xs rounded border ${
                confidenceAnalysis.riskLevel === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                confidenceAnalysis.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                'bg-green-500/20 text-green-400 border-green-500/30'
              }`}>
                {confidenceAnalysis.riskLevel}
              </span>
            </div>

            {/* Similar Experiments */}
            {similarExperiments.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Similar Experiments:</span>
                <span className="text-xs text-purple-400">
                  {similarExperiments.length} found ({similarExperiments.filter(e => e.outcome === 'success').length} successful)
                </span>
              </div>
            )}

            {/* Create Experiment Button */}
            {onCreateExperiment && (
              <button
                onClick={handleCreateExperiment}
                className="w-full mt-2 px-3 py-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center justify-center space-x-1"
                title="Create safe sandbox experiment based on this suggestion"
              >
                <span>🧪</span>
                <span>Create Safe Experiment</span>
                <span className="text-purple-200">({Math.round(confidenceAnalysis.confidenceScore * 100)}% confidence)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Memory Content */}
      <div className="max-h-96 overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-900/20 border-l-4 border-red-500">
            <div className="flex items-center space-x-2">
              <span className="text-red-400">⚠️</span>
              <span className="text-sm text-red-300">Failed to load memories</span>
            </div>
            <p className="text-xs text-red-400 mt-1">{error}</p>
          </div>
        )}

        {loading && !error && (
          <div className="p-4 text-center">
            <div className="inline-flex items-center space-x-2 text-gray-400">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Searching memories...</span>
            </div>
          </div>
        )}

        {!loading && !error && memories.length === 0 && userInput.trim().length >= 1 && (
          <div className="p-4 text-center">
            <span className="text-gray-500 text-sm">This looks like something new!</span>
            <p className="text-xs text-gray-600 mt-1">
              I haven't seen a question quite like this before.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              But don't worry - I'm learning and will remember our conversation!
            </p>
          </div>
        )}

        {memories.length > 0 && (
          <div className="divide-y divide-gray-700">
            {memories.map((memory) => (
              <div key={memory.id} className="p-3 hover:bg-gray-800/50 transition-colors">
                {/* Memory Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-medium ${getRelevanceColor(memory.relevanceScore)}`}>
                          {Math.round(memory.relevanceScore * 100)}% match
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">{memory.timeAgo}</span>
                        {/* Memory Source Badge */}
                        {showExperimentFeatures && (
                          <span className={`px-2 py-0.5 text-xs rounded border ${getMemorySourceBadge(memory.memorySource).color}`}>
                            {getMemorySourceBadge(memory.memorySource).icon} {getMemorySourceBadge(memory.memorySource).label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 mt-0.5">
                        <p className="text-xs text-gray-500">{memory.matchReason}</p>
                        {/* Experiment Context */}
                        {memory.experimentSource && (
                          <span className="text-xs text-purple-400">
                            • From experiment (confidence: {Math.round(memory.experimentSource.confidence * 100)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleUseMemory(memory)}
                      className="px-2 py-1 text-xs text-white border border-coder1-purple hover:bg-coder1-purple/20 rounded transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                      title="Apply this solution to your current work"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => handleMemoryExpand(memory)}
                      className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-gray-200 rounded transition-colors"
                      title={expandedMemoryId === memory.id ? "Hide details" : "See the full conversation"}
                    >
                      {expandedMemoryId === memory.id ? '↑' : '↓'}
                    </button>
                  </div>
                </div>

                {/* Memory Preview */}
                <div className="mb-2">
                  <p className="text-sm text-gray-300 leading-relaxed">{memory.quickPreview}</p>
                </div>

                {/* Expanded Content */}
                {expandedMemoryId === memory.id && (
                  <div className="mt-3 pt-3 border-t border-gray-700 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    {/* Original User Input */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 mb-1">What you asked:</h4>
                      <p className="text-sm text-gray-300 bg-gray-800 rounded p-2">
                        {extractClaudeContent(memory.conversation.user_input)}
                      </p>
                    </div>

                    {/* Claude's Response */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 mb-1">What Claude said:</h4>
                      <div className="text-sm text-gray-300 bg-gray-800 rounded p-3 max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                          {extractClaudeContent(memory.conversation.claude_reply)}
                        </pre>
                      </div>
                    </div>

                    {/* Files Involved */}
                    {memory.conversation.files_involved && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-400 mb-1">Files Involved:</h4>
                        <div className="flex flex-wrap gap-1">
                          {JSON.parse(memory.conversation.files_involved).map((file: string, index: number) => (
                            <span
                              key={index}
                              className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
                            >
                              {file}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Experiment Context */}
                    {memory.experimentSource && (
                      <div>
                        <h4 className="text-xs font-medium text-purple-400 mb-1">🧪 Experiment Context:</h4>
                        <div className="bg-purple-900/20 border border-purple-500/30 rounded p-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Experiment ID:</span>
                            <span className="text-xs text-purple-300 font-mono">{memory.experimentSource.id.slice(0, 8)}...</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Original Confidence:</span>
                            <span className={`text-xs font-medium ${getConfidenceColor(memory.experimentSource.confidence)}`}>
                              {Math.round(memory.experimentSource.confidence * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Outcome:</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              memory.experimentSource.outcome === 'success' ? 'bg-green-500/20 text-green-400' :
                              memory.experimentSource.outcome === 'failure' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {memory.experimentSource.outcome}
                            </span>
                          </div>
                          {memory.experimentSource.graduated && (
                            <div className="text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">
                              🎓 This memory graduated from sandbox to production
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Session Summary */}
                    {memory.sessionSummary && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-400 mb-1">Session Context:</h4>
                        <p className="text-xs text-gray-500 bg-gray-800 rounded p-2">
                          {memory.sessionSummary}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={() => handleUseMemory(memory)}
                        className="flex-1 px-3 py-1.5 text-xs text-white border border-coder1-purple hover:bg-coder1-purple/20 rounded transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                      >
                        Use This Solution
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(extractClaudeContent(memory.conversation.claude_reply));
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-gray-200 rounded transition-colors"
                        title="Copy clean version to clipboard"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {memories.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-700 bg-gray-800/50">
          <p className="text-xs text-gray-500 text-center">
            Click "Use" to apply any solution or expand to see details
          </p>
        </div>
      )}
    </div>
  );
};

// Custom hook for easier usage
export const useContextualMemory = (
  userInput: string,
  currentFiles?: string[],
  recentCommands?: string[],
  errorContext?: string
) => {
  const [memories, setMemories] = useState<RelevantMemory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userInput || userInput.trim().length < 1) {
      setMemories([]);
      return;
    }

    const fetchMemories = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/contextual-memory/relevant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userInput: userInput.trim(),
            currentFiles,
            recentCommands,
            errorContext,
          }),
        });

        if (response.ok) {
          const data: MemoryResponse = await response.json();
          if (data.success) {
            setMemories(data.memories);
          }
        }
      } catch (error) {
        console.error('Failed to fetch contextual memories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMemories();
  }, [userInput, currentFiles, recentCommands, errorContext]);

  return { memories, loading };
};

export default ContextualMemoryPanel;