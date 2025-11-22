'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ArrowRight, Info } from 'lucide-react';
import { useIDEStore } from '@/stores/useIDEStore';

interface HandoffWarningBannerProps {
  onCreateHandoff?: () => void;
}

export default function HandoffWarningBanner({ onCreateHandoff }: HandoffWarningBannerProps) {
  const { aiState } = useIDEStore();
  const [dismissed, setDismissed] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);
  
  // Thresholds
  const WARNING_THRESHOLD = 100000;
  const CONTEXT_LIMIT = 200000;
  
  // Calculate usage
  const contextUsage = aiState?.tokenUsage?.total || 0;
  const contextPercentage = Math.round((contextUsage / CONTEXT_LIMIT) * 100);
  
  // Determine if banner should be shown
  const shouldShow = contextUsage >= WARNING_THRESHOLD && !dismissed;
  
  // Reset dismissed state when usage drops below threshold
  useEffect(() => {
    if (contextUsage < WARNING_THRESHOLD) {
      setDismissed(false);
    }
  }, [contextUsage]);
  
  // Don't render if not needed
  if (!shouldShow) return null;
  
  const handleCreateHandoff = () => {
    setDismissed(true);
    if (onCreateHandoff) {
      onCreateHandoff();
    }
  };
  
  const handleDismiss = () => {
    setDismissed(true);
  };
  
  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Warning Content */}
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-text-primary font-medium text-sm">
                  Session Context: {contextUsage.toLocaleString()} / {CONTEXT_LIMIT.toLocaleString()} tokens ({contextPercentage}%)
                </span>
              </div>
              <p className="text-text-muted text-xs mt-0.5">
                Consider creating a handoff to maintain quality and prevent session degradation.
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowLearnMore(!showLearnMore)}
              className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-secondary rounded transition-colors flex items-center gap-1"
              title="Learn more about handoffs"
            >
              <Info className="w-3 h-3" />
              Learn More
            </button>
            
            <button
              onClick={handleCreateHandoff}
              className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black font-medium text-sm rounded transition-colors flex items-center gap-1.5"
            >
              Create Handoff
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleDismiss}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-secondary rounded transition-colors"
              title="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Learn More Section (Expandable) */}
        {showLearnMore && (
          <div className="mt-3 pt-3 border-t border-yellow-500/20 text-xs text-text-muted space-y-2">
            <p className="font-medium text-text-secondary">What is a handoff?</p>
            <p>
              A handoff creates a comprehensive session summary that captures:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>What you've accomplished in this session</li>
              <li>Current state of your project</li>
              <li>Any blockers or issues encountered</li>
              <li>Prioritized next steps</li>
            </ul>
            <p className="mt-2">
              <span className="font-medium">Why create a handoff?</span> When context usage is high, 
              starting a fresh session with a handoff document ensures the next agent (or you) can 
              continue seamlessly without loss of context or quality degradation.
            </p>
            <p className="mt-2 text-text-tertiary italic">
              Tip: You can skip the Q&A process for simple sessions and continue directly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
