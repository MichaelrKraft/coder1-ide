'use client';

import React from 'react';
import { Hash, DollarSign } from 'lucide-react';
import { useIDEStore } from '@/stores/useIDEStore';

type AIModel = 
  | 'claude-opus-4.1'
  | 'claude-sonnet-4'
  | 'claude-sonnet-3.7'
  | 'claude-3.5-haiku';

export default function TerminalTokenStats() {
  const { aiState } = useIDEStore();
  
  // Format token count
  const formatTokens = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };
  
  // Calculate estimated cost (same logic as StatusLine)
  const calculateCost = (model: AIModel, tokens: number) => {
    const costPer1kTokens: Record<AIModel, number> = {
      'claude-opus-4.1': 0.015,     // Premium model
      'claude-sonnet-4': 0.003,      // Balanced model
      'claude-sonnet-3.7': 0.003,    // Hybrid reasoning model
      'claude-3.5-haiku': 0.00025    // Fast & economical
    };
    
    const cost = (tokens / 1000) * costPer1kTokens[model];
    return cost < 0.01 ? '<$0.01' : `$${cost.toFixed(2)}`;
  };

  // Show placeholder when no token usage yet
  const hasUsage = aiState?.tokenUsage?.total > 0;

  return (
    <div className="h-7 bg-bg-primary/90 border-t border-border-primary flex items-center justify-center px-4 text-xs backdrop-blur-sm">
      {hasUsage ? (
        <div className="flex items-center gap-4 text-text-muted">
          {/* CLAUDE CODE Activity Label */}
          <span className="text-text-secondary font-medium">CLAUDE CODE activity</span>
          
          {/* Input Tokens */}
          <div className="flex items-center gap-1" title="Input tokens">
            <Hash className="w-3 h-3 text-blue-400" />
            <span>{formatTokens(aiState?.tokenUsage?.input || 0)}</span>
            <span className="text-[10px] text-text-tertiary">in</span>
          </div>
          
          {/* Output Tokens */}
          <div className="flex items-center gap-1" title="Output tokens">
            <Hash className="w-3 h-3 text-green-400" />
            <span>{formatTokens(aiState?.tokenUsage?.output || 0)}</span>
            <span className="text-[10px] text-text-tertiary">out</span>
          </div>
          
          {/* Total Tokens */}
          <div className="flex items-center gap-1" title="Total tokens">
            <Hash className="w-3 h-3 text-orange-400" />
            <span className="text-text-secondary font-medium">
              {formatTokens(aiState?.tokenUsage?.total || 0)}
            </span>
            <span className="text-[10px] text-text-tertiary">total</span>
          </div>
          
          {/* Estimated Cost */}
          <div className="flex items-center gap-1 text-yellow-400" title="Estimated cost">
            <DollarSign className="w-3 h-3" />
            <span className="font-medium">
              {calculateCost(aiState?.currentModel || 'claude-3.5-haiku', aiState?.tokenUsage?.total || 0)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-text-muted">
          <span className="text-text-secondary font-medium">CLAUDE CODE activity</span>
          <span className="text-text-tertiary">• Token usage will appear here during AI interactions</span>
        </div>
      )}
    </div>
  );
}