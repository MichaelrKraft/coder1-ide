'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  Loader2,
  Info,
  AlertCircle,
  Search,
  FileText,
  MessageSquare,
  User,
  Trash2,
  HardDriveDownload,
} from 'lucide-react';
import { useJohnny5Store } from '@/stores/useJohnny5Store';
import { useIDEStore } from '@/stores/useIDEStore';
import ContextUsageBar from './ContextUsageBar';
import ContextPieChart from './ContextPieChart';
import FileContextList from './FileContextList';

interface ContextTabProps {
  className?: string;
}

interface MemorySearchResult {
  chunk_id: string;
  content: string;
  source_type: string;
  source_id: string;
  start_line: number | null;
  end_line: number | null;
  combined_score: number;
}

interface MemoryStats {
  total_chunks: number;
  manuslive_chunks: number;
  session_chunks: number;
  last_indexed: string | null;
  embedding_model: string | null;
}

/**
 * ContextTab - Main context visualizer view for Johnny5
 *
 * Shows what the AI currently "remembers":
 * - Memory search across indexed content
 * - Overall context usage with warning thresholds
 * - Breakdown by type (system, conversation, files, tools)
 * - List of files in context with token counts
 */
export default function ContextTab({ className = '' }: ContextTabProps) {
  const {
    contextComposition,
    contextLoading,
    setContextComposition,
    setContextLoading,
  } = useJohnny5Store();

  const aiState = useIDEStore((state) => state.aiState);

  // Memory search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemorySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    performSearch(debouncedQuery);
  }, [debouncedQuery]);

  // Load memory stats on mount
  useEffect(() => {
    loadMemoryStats();
    if (!contextComposition) {
      loadContext();
    }
  }, []);

  // Wire real token data from IDE store into context composition
  useEffect(() => {
    const total = aiState?.tokenUsage?.total;
    if (!total || total <= 0) return;

    const limit = 200000;
    const usagePercentage = Math.round((total / limit) * 100);

    setContextComposition({
      total,
      limit,
      usagePercentage,
      breakdown: {
        system: Math.round(total * 0.05),
        conversation: Math.round(total * 0.60),
        files: [],
        tools: Math.round(total * 0.25),
      },
    });
  }, [aiState?.tokenUsage?.total]);

  const loadMemoryStats = async () => {
    try {
      const response = await fetch('/api/johnny5/context/memory-stats');
      if (response.ok) {
        const data = await response.json();
        setMemoryStats(data);
      }
    } catch (err) {
      console.error('Failed to load memory stats:', err);
    }
  };

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch('/api/johnny5/context/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, topK: 10 }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Memory search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRebuildIndex = async () => {
    setIsRebuildingIndex(true);
    try {
      const response = await fetch('/api/johnny5/context/rebuild-index', {
        method: 'POST',
      });

      if (response.ok) {
        await loadMemoryStats();
      }
    } catch (err) {
      console.error('Failed to rebuild index:', err);
    } finally {
      setIsRebuildingIndex(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Clear all indexed memories? This cannot be undone.')) return;

    try {
      const response = await fetch('/api/johnny5/context/clear-cache', {
        method: 'POST',
      });

      if (response.ok) {
        setSearchResults([]);
        await loadMemoryStats();
      }
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  };

  const loadContext = async () => {
    setContextLoading(true);

    try {
      const response = await fetch('/api/johnny5/context');
      if (response.ok) {
        const data = await response.json();
        setContextComposition(data);
      } else {
        // Fall back to mock data if API not available
        loadMockContext();
      }
    } catch (err) {
      // Fall back to mock data
      loadMockContext();
    }

    setContextLoading(false);
  };

  const loadMockContext = () => {
    const mockFiles = [
      { path: '/src/components/Johnny5Panel.tsx', tokens: 2450, addedAt: new Date(Date.now() - 300000) },
      { path: '/src/stores/useJohnny5Store.ts', tokens: 3200, addedAt: new Date(Date.now() - 600000) },
      { path: '/src/types/johnny5.ts', tokens: 1800, addedAt: new Date(Date.now() - 900000) },
      { path: '/CLAUDE.md', tokens: 4500, addedAt: new Date(Date.now() - 1200000) },
    ];

    const fileTokens = mockFiles.reduce((sum, f) => sum + f.tokens, 0);
    const systemTokens = 8500;
    const conversationTokens = 15000 + Math.random() * 10000;
    const toolTokens = 4200;
    const totalTokens = systemTokens + conversationTokens + fileTokens + toolTokens;

    setContextComposition({
      total: Math.round(totalTokens),
      limit: 200000,
      usagePercentage: (totalTokens / 200000) * 100,
      breakdown: {
        system: systemTokens,
        conversation: Math.round(conversationTokens),
        files: mockFiles,
        tools: toolTokens,
      },
    });
  };

  const handleRefresh = () => {
    loadContext();
    loadMemoryStats();
  };

  const handleRemoveFile = (path: string) => {
    if (!contextComposition?.breakdown?.files) return;

    const updatedFiles = contextComposition.breakdown.files.filter(f => f.path !== path);
    const removedFile = contextComposition.breakdown.files.find(f => f.path === path);
    const removedTokens = removedFile?.tokens || 0;

    const newTotal = contextComposition.total - removedTokens;

    setContextComposition({
      ...contextComposition,
      total: newTotal,
      usagePercentage: (newTotal / contextComposition.limit) * 100,
      breakdown: {
        ...contextComposition.breakdown,
        files: updatedFiles,
      },
    });
  };

  // Calculate file tokens for pie chart
  const fileTokens = contextComposition?.breakdown?.files?.reduce((sum, f) => sum + f.tokens, 0) || 0;

  // Get icon for source type
  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'session':
        return <MessageSquare className="w-3 h-3 text-purple-400" />;
      case 'manuslive_user':
        return <User className="w-3 h-3 text-green-400" />;
      case 'manuslive_memory':
        return <FileText className="w-3 h-3 text-blue-400" />;
      default:
        return <FileText className="w-3 h-3 text-text-muted" />;
    }
  };

  // Format source for display
  const formatSource = (result: MemorySearchResult) => {
    if (result.source_type === 'session') {
      return `Session`;
    }
    const fileName = result.source_id.split('/').pop() || result.source_id;
    const lineInfo = result.start_line ? `:${result.start_line}-${result.end_line}` : '';
    return `${fileName}${lineInfo}`;
  };

  // Format last indexed time
  const formatLastIndexed = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-coder1-cyan" />
          <h3 className="text-sm font-semibold text-text-primary">Context & Memory</h3>
        </div>

        <button
          onClick={handleRefresh}
          disabled={contextLoading}
          className="p-1.5 rounded-md text-text-muted hover:text-text-primary
            hover:bg-bg-tertiary transition-all disabled:opacity-50"
          title="Refresh context"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${contextLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Memory Search Section */}
      <div className="bg-bg-tertiary rounded-lg p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-coder1-cyan" />
          <h4 className="text-xs font-semibold text-text-primary">Memory Search</h4>
          {isSearching && <Loader2 className="w-3 h-3 animate-spin text-coder1-cyan" />}
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="w-full px-3 py-2 pl-8 bg-bg-secondary border border-border-primary
              rounded-md text-sm text-text-primary placeholder:text-text-muted
              focus:outline-none focus:border-coder1-cyan transition-colors"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              {searchResults.length} results
            </div>
            {searchResults.map((result) => (
              <div
                key={result.chunk_id}
                className="p-2 bg-bg-secondary rounded-md border border-border-primary
                  hover:border-coder1-cyan/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  {getSourceIcon(result.source_type)}
                  <span className="text-[10px] text-text-secondary font-medium">
                    {formatSource(result)}
                  </span>
                  <span className="text-[10px] text-coder1-cyan ml-auto">
                    {Math.round(result.combined_score * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-text-muted line-clamp-2">
                  {result.content.slice(0, 150)}
                  {result.content.length > 150 ? '...' : ''}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {debouncedQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
          <div className="text-center py-4 text-text-muted">
            <p className="text-xs">No memories found for &quot;{debouncedQuery}&quot;</p>
          </div>
        )}

        {/* Memory Stats */}
        {memoryStats && (
          <div className="pt-2 border-t border-border-primary">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-coder1-cyan">
                  {memoryStats.total_chunks}
                </div>
                <div className="text-[9px] text-text-muted uppercase">Chunks</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-400">
                  {memoryStats.session_chunks}
                </div>
                <div className="text-[9px] text-text-muted uppercase">Sessions</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">
                  {memoryStats.manuslive_chunks}
                </div>
                <div className="text-[9px] text-text-muted uppercase">ManusLive</div>
              </div>
            </div>
            <div className="text-[10px] text-text-muted text-center mt-2">
              Last indexed: {formatLastIndexed(memoryStats.last_indexed)}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleRebuildIndex}
            disabled={isRebuildingIndex}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5
              bg-coder1-cyan/20 text-coder1-cyan text-[10px] font-semibold
              rounded-md hover:bg-coder1-cyan/30 transition-all disabled:opacity-50"
          >
            {isRebuildingIndex ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <HardDriveDownload className="w-3 h-3" />
            )}
            Rebuild Index
          </button>
          <button
            onClick={handleClearCache}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5
              bg-red-500/20 text-red-400 text-[10px] font-semibold
              rounded-md hover:bg-red-500/30 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Loading State */}
      {contextLoading && !contextComposition && (
        <div className="flex flex-col items-center justify-center py-12 text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-coder1-cyan mb-3" />
          <p className="text-sm">Analyzing context...</p>
        </div>
      )}

      {/* Context Content */}
      {contextComposition && (
        <>
          {/* Info banner */}
          <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-purple-300">
              <span className="font-semibold">What AI Remembers:</span>
              {' '}This shows everything in the current conversation context.
              The AI can only access information within this window.
            </div>
          </div>

          {/* Context Usage Bar */}
          <ContextUsageBar
            used={contextComposition.total || 0}
            limit={contextComposition.limit || 200000}
            className={contextLoading ? 'opacity-50' : ''}
          />

          {/* Estimated data info banner */}
          <div className="flex items-start gap-2 p-2 bg-coder1-cyan/5 border border-coder1-cyan/20 rounded-lg">
            <Info className="w-3.5 h-3.5 text-coder1-cyan flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-coder1-cyan/80">
              <span className="font-semibold">Estimated:</span>{' '}
              Breakdown is approximated from total token usage. Actual distribution may vary.
            </p>
          </div>

          {/* Context Pie Chart */}
          <ContextPieChart
            breakdown={{
              system: contextComposition.breakdown?.system || 0,
              conversation: contextComposition.breakdown?.conversation || 0,
              files: fileTokens,
              tools: contextComposition.breakdown?.tools || 0,
            }}
            total={contextComposition.total || 0}
            className={contextLoading ? 'opacity-50' : ''}
          />

          {/* File Context List */}
          <FileContextList
            files={contextComposition.breakdown?.files || []}
            onRemoveFile={handleRemoveFile}
            className={contextLoading ? 'opacity-50' : ''}
          />

          {/* Context Tips */}
          <div className="bg-bg-tertiary rounded-lg p-3">
            <h5 className="text-[10px] font-semibold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-coder1-cyan" />
              Context Tips
            </h5>
            <ul className="space-y-1.5 text-[10px] text-text-muted">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-coder1-cyan mt-1.5 flex-shrink-0" />
                <span>Large files consume more tokens. Consider removing unused files.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                <span>Conversation history grows with each message. Start new sessions for unrelated tasks.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                <span>At 80% usage, consider summarizing the conversation to free up space.</span>
              </li>
            </ul>
          </div>
        </>
      )}

      {/* Empty State */}
      {!contextLoading && !contextComposition && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Database className="w-12 h-12 text-text-muted opacity-50 mb-3" />
          <h4 className="text-sm font-semibold text-text-secondary mb-1">
            No Context Data
          </h4>
          <p className="text-xs text-text-muted max-w-xs">
            Start a conversation to see what the AI remembers.
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-coder1-cyan/20 text-coder1-cyan text-xs font-semibold
              rounded-lg hover:bg-coder1-cyan/30 transition-all"
          >
            Load Sample Data
          </button>
        </div>
      )}
    </div>
  );
}
