'use client';

import React from 'react';
import { useGLMCostStore } from '@/stores/useGLMCostStore';
import { useModelStore } from '@/stores/useModelStore';
import { DollarSign, TrendingUp, RefreshCw, X } from 'lucide-react';

export default function CostDisplay() {
  const { sessionTokens, sessionCost, totalTokens, totalCost, resetSession } = useGLMCostStore();
  const currentModel = useModelStore(state => state.selectedModel);
  
  // Only show if using GLM or Gemini models
  const isGLM = currentModel.startsWith('glm-');
  const isGemini = currentModel.startsWith('gemini-');
  
  if (!isGLM && !isGemini) {
    return null;
  }
  
  // Determine display label
  const providerLabel = isGemini ? 'Gemini Usage' : 'GLM Usage';
  
  const formatCost = (cost: number): string => {
    if (cost < 0.0001) return '$0.0000';
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    if (cost < 1) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };
  
  const formatTokens = (tokens: number): string => {
    if (tokens < 1000) return tokens.toString();
    if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
    return `${(tokens / 1000000).toFixed(2)}M`;
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <DollarSign className="w-3 h-3 text-green-400" />
        <span className="text-[10px] font-medium text-text-tertiary">{providerLabel}</span>
      </div>
      
      {/* Session Cost */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-text-tertiary">S:</span>
        <span className="text-[10px] font-mono text-green-400">
          {formatCost(sessionCost)}
        </span>
        <span className="text-[9px] text-text-tertiary">
          ({formatTokens(sessionTokens)})
        </span>
      </div>
      
      <div className="h-3 w-px bg-border-default/50" />
      
      {/* Total Cost */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-text-tertiary">T:</span>
        <span className="text-[10px] font-mono text-blue-400">
          {formatCost(totalCost)}
        </span>
        <span className="text-[9px] text-text-tertiary">
          ({formatTokens(totalTokens)})
        </span>
      </div>
      
      {/* Reset Session Button */}
      {sessionCost > 0 && (
        <button
          onClick={() => {
            if (confirm('Reset session costs? (Total costs will be preserved)')) {
              resetSession();
            }
          }}
          className="flex items-center p-0.5 rounded hover:bg-bg-hover transition-colors text-text-tertiary hover:text-text-primary"
          title="Reset session costs"
        >
          <RefreshCw className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}
