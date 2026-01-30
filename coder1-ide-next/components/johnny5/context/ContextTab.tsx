'use client';

import React, { useEffect } from 'react';
import { Database, RefreshCw, Loader2, Info, AlertCircle } from 'lucide-react';
import { useJohnny5Store } from '@/stores/useJohnny5Store';
import ContextUsageBar from './ContextUsageBar';
import ContextPieChart from './ContextPieChart';
import FileContextList from './FileContextList';

interface ContextTabProps {
  className?: string;
}

/**
 * ContextTab - Main context visualizer view for Johnny5
 *
 * Shows what the AI currently "remembers":
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

  // Load mock data on mount
  useEffect(() => {
    if (!contextComposition) {
      loadContext();
    }
  }, []);

  const loadContext = async () => {
    setContextLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate mock data
    const mockFiles = [
      { path: '/src/components/Johnny5Panel.tsx', tokens: 2450, addedAt: new Date(Date.now() - 300000) },
      { path: '/src/stores/useJohnny5Store.ts', tokens: 3200, addedAt: new Date(Date.now() - 600000) },
      { path: '/src/types/johnny5.ts', tokens: 1800, addedAt: new Date(Date.now() - 900000) },
      { path: '/CLAUDE.md', tokens: 4500, addedAt: new Date(Date.now() - 1200000) },
      { path: '/src/lib/claude-service.ts', tokens: 1200, addedAt: new Date(Date.now() - 1500000) },
      { path: '/package.json', tokens: 350, addedAt: new Date(Date.now() - 1800000) },
    ];

    const fileTokens = mockFiles.reduce((sum, f) => sum + f.tokens, 0);
    const systemTokens = 8500;
    const conversationTokens = 15000 + Math.random() * 10000;
    const toolTokens = 4200;
    const totalTokens = systemTokens + conversationTokens + fileTokens + toolTokens;

    setContextComposition({
      total: Math.round(totalTokens),
      limit: 128000, // Claude's context window
      usagePercentage: (totalTokens / 128000) * 100,
      breakdown: {
        system: systemTokens,
        conversation: Math.round(conversationTokens),
        files: mockFiles,
        tools: toolTokens,
      },
    });

    setContextLoading(false);
  };

  const handleRefresh = () => {
    loadContext();
  };

  const handleRemoveFile = (path: string) => {
    if (!contextComposition) return;

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
  const fileTokens = contextComposition?.breakdown.files.reduce((sum, f) => sum + f.tokens, 0) || 0;

  return (
    <div className={`p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-coder1-cyan" />
          <h3 className="text-sm font-semibold text-text-primary">Context Visualizer</h3>
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
            used={contextComposition.total}
            limit={contextComposition.limit}
            className={contextLoading ? 'opacity-50' : ''}
          />

          {/* Context Pie Chart */}
          <ContextPieChart
            breakdown={{
              system: contextComposition.breakdown.system,
              conversation: contextComposition.breakdown.conversation,
              files: fileTokens,
              tools: contextComposition.breakdown.tools,
            }}
            total={contextComposition.total}
            className={contextLoading ? 'opacity-50' : ''}
          />

          {/* File Context List */}
          <FileContextList
            files={contextComposition.breakdown.files}
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
