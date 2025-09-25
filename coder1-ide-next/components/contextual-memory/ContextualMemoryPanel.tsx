/**
 * Contextual Memory Panel Component
 * Displays relevant past conversations and solutions when user needs context
 * The holy grail - making users feel like the IDE truly remembers and learns
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RelevantMemory } from '@/services/contextual-retrieval';
import { extractClaudeContent } from '@/lib/terminal-cleaner';

interface ContextualMemoryPanelProps {
  userInput: string;
  currentFiles?: string[];
  recentCommands?: string[];
  errorContext?: string;
  onUseMemory?: (memory: RelevantMemory) => void;
  onExpandMemory?: (memory: RelevantMemory) => void;
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

export const ContextualMemoryPanel: React.FC<ContextualMemoryPanelProps> = ({
  userInput,
  currentFiles = [],
  recentCommands = [],
  errorContext,
  onUseMemory,
  onExpandMemory,
  className = ''
}) => {
  const [memories, setMemories] = useState<RelevantMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalFound: number; processingTimeMs: number } | null>(null);

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
          setMemories(data.memories);
          setStats(data.stats);
        } else {
          throw new Error('Failed to retrieve memories');
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

    fetchRelevantMemories();
  }, [userInput, currentFiles, recentCommands, errorContext]);

  const handleMemoryExpand = (memory: RelevantMemory) => {
    setExpandedMemoryId(expandedMemoryId === memory.id ? null : memory.id);
    onExpandMemory?.(memory);
  };

  const handleUseMemory = (memory: RelevantMemory) => {
    onUseMemory?.(memory);
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

  if (!userInput || userInput.trim().length < 1) {
    return (
      <div className="contextual-memory-panel bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-4">
        <div className="text-center text-gray-500">
          <span className="text-lg">🧠</span>
          <p className="text-sm mt-2">Contextual Memory is ready</p>
          <p className="text-xs text-gray-600 mt-1">
            Type commands in the terminal to see relevant past conversations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`contextual-memory-panel bg-gray-900 border border-gray-700 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-200">I Remember This!</h3>
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
        
        {stats && (
          <div className="text-xs text-gray-400">
            Found {stats.totalFound} similar {stats.totalFound === 1 ? 'conversation' : 'conversations'} • Super fast ({stats.processingTimeMs}ms)
          </div>
        )}
      </div>

      {/* Content */}
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
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{memory.matchReason}</p>
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