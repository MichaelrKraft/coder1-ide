'use client';

import React from 'react';
import { DollarSign, TrendingDown } from 'lucide-react';
import { costCalculator } from '@/lib/claude-config';

interface CostEstimateProps {
  estimate: number;
  model?: string;
}

export function CostEstimate({ estimate, model = 'claude-sonnet-4-5-20250929' }: CostEstimateProps) {
  const formatted = costCalculator.formatCost(estimate);
  const tier = costCalculator.getCostTier(estimate);

  return (
    <div className="space-y-4">
      {/* Cost Display */}
      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Estimated Cost per Use:</span>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-2xl font-bold text-white">{formatted}</span>
          </div>
        </div>
        
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium`}
          style={{ backgroundColor: tier.color + '20', color: tier.color }}
        >
          {tier.label}
        </div>
      </div>

      {/* Cost Breakdown */}
      {estimate > 0 && (
        <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
          <div className="flex items-start gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">Cost Savings</p>
              <p className="text-xs text-blue-300/80">
                This config automates tasks that typically take 30-60 minutes. 
                At $50/hour developer time, each use saves approximately $25-50 in labor costs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Free Indicator */}
      {estimate === 0 && (
        <div className="p-4 bg-green-900/20 border border-green-700/30 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-green-300">Completely Free</p>
              <p className="text-xs text-green-400/80">
                This config doesn't use any AI API calls and has zero cost
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Model Info */}
      {estimate > 0 && (
        <div className="text-xs text-gray-500">
          <p>Using model: <code className="text-gray-400">{model}</code></p>
          <p className="mt-1">Actual costs may vary based on usage patterns and content length</p>
        </div>
      )}
    </div>
  );
}
