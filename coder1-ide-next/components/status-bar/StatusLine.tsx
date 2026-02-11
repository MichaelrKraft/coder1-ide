/**
 * StatusLine - Displays current AI model, token usage, and date
 * Shows at the bottom of the IDE with real-time updates
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Bot, Clock, Hash, Brain } from 'lucide-react';
import { useIDEStore } from '@/stores/useIDEStore';

type AIModel =
  | 'claude-opus-4.6'
  | 'claude-sonnet-4'
  | 'claude-sonnet-3.7'
  | 'claude-3.5-haiku';

interface ModelInfo {
  id: AIModel;
  name: string;
  icon: string;
  color: string;
}

const AI_MODELS: ModelInfo[] = [
  { id: 'claude-opus-4.6', name: 'Claude Opus 4.6', icon: '👑', color: 'text-purple-400' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', icon: '🎭', color: 'text-indigo-400' },
  { id: 'claude-sonnet-3.7', name: 'Claude Sonnet 3.7', icon: '🎼', color: 'text-blue-400' },
  { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', icon: '🌸', color: 'text-pink-400' }
];

export default function StatusLine() {
  // Get state from store
  const { aiState, setAIModel, updateTokenUsage } = useIDEStore();
  
  // Local state
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Current model info
  const currentModelInfo = AI_MODELS.find(m => m.id === aiState.currentModel) || AI_MODELS[0];
  
  // Update date every minute and set initial date client-side only
  useEffect(() => {
    // Set initial date on client-side mount
    setCurrentDate(new Date());
    
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Format date
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
  };
  
  // Format token count
  const formatTokens = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };
  
  // Calculate estimated cost (updated pricing for current Claude models)
  const calculateCost = (model: AIModel, tokens: number) => {
    const costPer1kTokens: Record<AIModel, number> = {
      'claude-opus-4.6': 0.015,     // Premium model
      'claude-sonnet-4': 0.003,      // Balanced model
      'claude-sonnet-3.7': 0.003,    // Hybrid reasoning model
      'claude-3.5-haiku': 0.00025    // Fast & economical
    };
    
    const cost = (tokens / 1000) * costPer1kTokens[model];
    return cost < 0.01 ? '<$0.01' : `$${cost.toFixed(2)}`;
  };
  
  const handleModelSelect = (modelId: AIModel) => {
    setAIModel(modelId);
    setShowModelDropdown(false);
    
    // Save preference to localStorage
    localStorage.setItem('preferredAIModel', modelId);
    
    // Show toast notification
    const modelInfo = AI_MODELS.find(m => m.id === modelId);
    if (modelInfo) {
      // Dispatch custom event for toast
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: {
          message: `Switched to ${modelInfo.name}`,
          type: 'info'
        }
      }));
    }
  };
  
  return (
    <div className="h-6 bg-bg-tertiary border-t border-border-default flex items-center justify-end px-4 pr-20 text-xs select-none">
      {/* Alpha Status Indicator and Time Display - Right side with padding for Team button */}
      <div className="flex items-center gap-3 text-text-muted">
        {/* Alpha Status */}
        <div className="flex items-center gap-1 text-orange-400/60" title="Enhanced StatusLine features temporarily disabled during alpha">
          <Brain className="w-3 h-3" />
          <span>Alpha</span>
        </div>

        {/* Time Display */}
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{currentDate ? formatDate(currentDate) : '--'}</span>
        </div>
      </div>
    </div>
  );
}