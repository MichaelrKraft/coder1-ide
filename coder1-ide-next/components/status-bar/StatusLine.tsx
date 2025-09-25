/**
 * StatusLine - Displays current AI model, token usage, and date
 * Shows at the bottom of the IDE with real-time updates
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Bot, Clock, Hash } from 'lucide-react';
import { useIDEStore } from '@/stores/useIDEStore';

type AIModel = 
  | 'claude-opus-4.1'
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
  { id: 'claude-opus-4.1', name: 'Claude Opus 4.1', icon: '👑', color: 'text-purple-400' },
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
      'claude-opus-4.1': 0.015,     // Premium model
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
    <div className="h-7 bg-bg-tertiary border-t border-border-default flex items-center px-4 text-xs select-none">
      <div className="flex items-center gap-6">
        {/* Model Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-bg-secondary transition-colors"
          >
            <span className={currentModelInfo.color}>{currentModelInfo.icon}</span>
            <span className="text-text-secondary font-medium">{currentModelInfo.name}</span>
            <ChevronDown className="w-3 h-3 text-text-muted" />
          </button>
          
          {/* Model Dropdown */}
          {showModelDropdown && (
            <div className="absolute bottom-full left-0 mb-1 w-56 bg-bg-secondary border border-border-default rounded-lg shadow-xl z-50">
              <div className="p-2">
                <div className="text-text-muted text-[10px] uppercase tracking-wider px-2 py-1">
                  Select AI Model
                </div>
                {AI_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-primary transition-colors ${
                      model.id === aiState.currentModel ? 'bg-bg-primary' : ''
                    }`}
                  >
                    <span className={model.color}>{model.icon}</span>
                    <span className="text-text-primary text-xs">{model.name}</span>
                    {model.id === aiState.currentModel && (
                      <span className="ml-auto text-coder1-cyan text-[10px]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Token Usage */}
        <div className="flex items-center gap-4 text-text-muted">
          <div className="flex items-center gap-1" title="Input tokens">
            <Hash className="w-3 h-3 text-blue-400" />
            <span>{formatTokens(aiState.tokenUsage.input)}</span>
            <span className="text-[10px] text-text-tertiary">in</span>
          </div>
          
          <div className="flex items-center gap-1" title="Output tokens">
            <Hash className="w-3 h-3 text-green-400" />
            <span>{formatTokens(aiState.tokenUsage.output)}</span>
            <span className="text-[10px] text-text-tertiary">out</span>
          </div>
          
          <div className="flex items-center gap-1" title="Total tokens">
            <Hash className="w-3 h-3 text-orange-400" />
            <span className="text-text-secondary font-medium">
              {formatTokens(aiState.tokenUsage.total)}
            </span>
            <span className="text-[10px] text-text-tertiary">total</span>
          </div>
          
          {/* Estimated Cost */}
          {aiState.tokenUsage.total > 0 && (
            <div className="flex items-center gap-1 text-yellow-400" title="Estimated cost">
              <span className="text-[10px]">≈</span>
              <span className="font-medium">
                {calculateCost(aiState.currentModel, aiState.tokenUsage.total)}
              </span>
            </div>
          )}
        </div>
        
        {/* Separator */}
        <div className="h-4 w-px bg-border-default" />
        
        {/* Current Date/Time */}
        <div className="flex items-center gap-1 text-text-muted">
          <Clock className="w-3 h-3" />
          <span>{currentDate ? formatDate(currentDate) : '--'}</span>
        </div>
      </div>
    </div>
  );
}